import { execFile, execFileSync, spawn, type ChildProcess } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { once } from 'node:events'
import net from 'node:net'
import { fileURLToPath } from 'node:url'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { ObjectStorageAdapter, objectStorageSettings } from './object-storage-adapter.js'
import {
  cacheSetGet,
  noOpJobState,
  openRedis,
  publishAndReceive,
  redisSettings,
} from './redis-substrate.js'
import { writeTestObjectAndEnqueueNoOp } from './substrate.js'

const apiRoot = fileURLToPath(new URL('..', import.meta.url))
const tsc = fileURLToPath(new URL('../../../node_modules/typescript/bin/tsc', import.meta.url))
const minioImage = 'minio/minio:RELEASE.2025-07-23T15-54-02Z'

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

function run(command: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    execFile(command, args, { encoding: 'utf8' }, (error) => {
      if (error) {
        reject(new Error(`${command} failed`))
        return
      }
      resolve()
    })
  })
}

function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer()
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      if (address === null || typeof address === 'string') {
        reject(new Error('expected a TCP port'))
        return
      }
      const { port } = address
      server.close(() => {
        resolve(port)
      })
    })
    server.on('error', reject)
  })
}

function connect(port: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const socket = net.connect({ host: '127.0.0.1', port })
    socket.once('connect', () => {
      socket.end()
      resolve()
    })
    socket.once('error', reject)
  })
}

async function publishedPort(container: string, containerPort: string): Promise<string> {
  const deadline = Date.now() + 30_000
  while (Date.now() < deadline) {
    try {
      const { stdout } = await new Promise<{ stdout: string }>((resolve, reject) => {
        execFile('docker', ['port', container, containerPort], { encoding: 'utf8' }, (error, stdout) => {
          if (error) {
            reject(error)
            return
          }
          resolve({ stdout })
        })
      })
      const port = stdout.trim().split('\n')[0]?.split(':').at(-1)
      if (port !== undefined && /^\d+$/.test(port)) {
        return port
      }
    } catch {
      // The container is still publishing its port.
    }
    await delay(200)
  }
  throw new Error(`container ${container} did not publish port ${containerPort}`)
}

async function stopChild(child: ChildProcess): Promise<void> {
  if (child.exitCode === null && child.signalCode === null) {
    child.kill('SIGTERM')
    await once(child, 'exit')
  }
}

describe('redis and object storage settings', () => {
  it('stays unset until the host and bucket env are present, and defaults the region to fr-par', () => {
    expect(redisSettings({})).toBeNull()
    expect(redisSettings({ REDIS_HOST: '127.0.0.1' })).toEqual({ host: '127.0.0.1', port: 6379 })
    expect(redisSettings({ REDIS_HOST: '127.0.0.1', REDIS_PORT: '6379', REDIS_PASSWORD: '' })).toEqual({
      host: '127.0.0.1',
      port: 6379,
    })
    expect(objectStorageSettings({})).toBeNull()
    const accessKeyId = randomBytes(4).toString('hex')
    const secretAccessKey = randomBytes(8).toString('hex')
    expect(
      objectStorageSettings({
        S3_ENDPOINT: 'http://127.0.0.1:9',
        S3_BUCKET: 'substrate',
        S3_ACCESS_KEY_ID: accessKeyId,
        S3_SECRET_ACCESS_KEY: secretAccessKey,
      })?.region,
    ).toBe('fr-par')
  })
})

describe('redis and S3-compatible substrate', () => {
  const redisPassword = randomBytes(18).toString('hex')
  const accessKeyId = randomBytes(8).toString('hex')
  const secretAccessKey = randomBytes(18).toString('hex')
  const bucket = `substrate${randomBytes(4).toString('hex')}`
  let redisContainer = ''
  let bucketContainer = ''
  let redisPort = ''
  let bucketPort = ''

  function settings() {
    const redis = redisSettings({
      REDIS_HOST: '127.0.0.1',
      REDIS_PORT: redisPort,
      REDIS_PASSWORD: redisPassword,
    })
    const storage = objectStorageSettings({
      S3_ENDPOINT: `http://127.0.0.1:${bucketPort}`,
      S3_BUCKET: bucket,
      S3_REGION: 'us-east-1',
      S3_ACCESS_KEY_ID: accessKeyId,
      S3_SECRET_ACCESS_KEY: secretAccessKey,
    })
    if (!redis || !storage) {
      throw new Error('substrate settings missing')
    }
    return { redis, storage }
  }

  beforeAll(async () => {
    execFileSync(process.execPath, [tsc, '-p', 'tsconfig.json'], { cwd: apiRoot, stdio: 'inherit' })
    redisContainer = `ankanu-redis-${randomBytes(4).toString('hex')}`
    bucketContainer = `ankanu-s3-${randomBytes(4).toString('hex')}`
    await run('docker', [
      'run',
      '-d',
      '--rm',
      '--name',
      redisContainer,
      '-p',
      '127.0.0.1::6379',
      'redis:8.6.3',
      'redis-server',
      '--requirepass',
      redisPassword,
    ])
    await run('docker', [
      'run',
      '-d',
      '--rm',
      '--name',
      bucketContainer,
      '-e',
      `MINIO_ROOT_USER=${accessKeyId}`,
      '-e',
      `MINIO_ROOT_PASSWORD=${secretAccessKey}`,
      '-p',
      '127.0.0.1::9000',
      minioImage,
      'server',
      '/data',
    ])
    redisPort = await publishedPort(redisContainer, '6379')
    bucketPort = await publishedPort(bucketContainer, '9000')

    const redisDeadline = Date.now() + 30_000
    let redisReady = false
    while (Date.now() < redisDeadline) {
      try {
        const client = await openRedis(settings().redis)
        client.disconnect()
        redisReady = true
        break
      } catch {
        await delay(300)
      }
    }
    if (!redisReady) {
      throw new Error('redis did not become ready')
    }

    const bucketDeadline = Date.now() + 30_000
    let bucketReady = false
    while (Date.now() < bucketDeadline) {
      try {
        const response = await fetch(`http://127.0.0.1:${bucketPort}/minio/health/live`)
        if (response.ok) {
          bucketReady = true
          break
        }
      } catch {
        // MinIO is still starting.
      }
      await delay(300)
    }
    if (!bucketReady) {
      throw new Error('object storage did not become ready')
    }
  }, 120_000)

  afterAll(async () => {
    if (redisContainer !== '') {
      await run('docker', ['rm', '-f', redisContainer]).catch(() => undefined)
    }
    if (bucketContainer !== '') {
      await run('docker', ['rm', '-f', bucketContainer]).catch(() => undefined)
    }
  }, 60_000)

  it('uses one Redis 8.6.3 for cache and pubsub', async () => {
    const { redis } = settings()
    const client = await openRedis(redis)
    const subscriber = await openRedis(redis)
    try {
      const info = await client.info('server')
      expect(info).toMatch(/redis_version:8\.6\.3\b/)
      const key = `substrate-cache-${randomBytes(4).toString('hex')}`
      expect(await cacheSetGet(client, key, 'cache-ok')).toBe('cache-ok')
      const channel = `substrate-pubsub-${randomBytes(4).toString('hex')}`
      expect(await publishAndReceive(client, subscriber, channel, 'pubsub-ok')).toBe('pubsub-ok')
    } finally {
      subscriber.disconnect()
      client.disconnect()
    }
  })

  it('writes a test object and the worker acks the no-op job', async () => {
    const { redis, storage } = settings()
    const adapter = ObjectStorageAdapter.fromSettings(storage)
    await adapter.createPrivateBucket()
    const key = `substrate-test/${randomBytes(4).toString('hex')}`
    const body = Uint8Array.from([1, 2, 3, 4])
    const jobId = await writeTestObjectAndEnqueueNoOp(adapter, redis, key, body)

    expect(Buffer.from(await adapter.readObject(key))).toEqual(Buffer.from(body))
    const unsigned = await fetch(
      `${storage.endpoint}/${storage.bucket}/${key.split('/').map(encodeURIComponent).join('/')}`,
    )
    expect(unsigned.status).toBe(403)
    expect(await noOpJobState(redis, jobId)).toBe('waiting')

    const httpPort = await freePort()
    const child = spawn(process.execPath, ['dist/main.js'], {
      cwd: apiRoot,
      env: {
        ...process.env,
        PROCESS_ROLE: 'worker',
        PORT: String(httpPort),
        REDIS_HOST: '127.0.0.1',
        REDIS_PORT: redisPort,
        REDIS_PASSWORD: redisPassword,
      },
      stdio: ['ignore', 'ignore', 'pipe'],
    })
    let stderr = ''
    child.stderr?.setEncoding('utf8')
    child.stderr?.on('data', (chunk: string) => {
      stderr += chunk
    })
    try {
      const deadline = Date.now() + 15_000
      let state = ''
      while (Date.now() < deadline) {
        await expect(connect(httpPort)).rejects.toThrow(/ECONNREFUSED/)
        if (child.exitCode !== null) {
          throw new Error(`worker exited early: ${stderr.split(redisPassword).join('[redacted]')}`)
        }
        state = await noOpJobState(redis, jobId)
        if (state === 'completed') {
          break
        }
        await delay(100)
      }
      expect(state).toBe('completed')
      expect(stderr).not.toContain(redisPassword)
      expect(stderr).not.toContain(secretAccessKey)
      expect(stderr).not.toContain('role=worker redis=unavailable')
    } finally {
      await stopChild(child)
    }
  }, 60_000)

  it('exits without a retry loop when Redis refuses the connection', async () => {
    const closed = await freePort()
    const httpPort = await freePort()
    const started = Date.now()
    const child = spawn(process.execPath, ['dist/main.js'], {
      cwd: apiRoot,
      env: {
        ...process.env,
        PROCESS_ROLE: 'worker',
        PORT: String(httpPort),
        REDIS_HOST: '127.0.0.1',
        REDIS_PORT: String(closed),
      },
      stdio: ['ignore', 'ignore', 'pipe'],
    })
    let stderr = ''
    child.stderr?.setEncoding('utf8')
    child.stderr?.on('data', (chunk: string) => {
      stderr += chunk
    })
    try {
      await once(child, 'exit')
      expect(Date.now() - started).toBeLessThan(5000)
      expect(child.exitCode).toBe(1)
      expect(stderr).toContain('role=worker redis=unavailable')
      await expect(connect(httpPort)).rejects.toThrow(/ECONNREFUSED/)
    } finally {
      await stopChild(child)
    }
  }, 15_000)
})
