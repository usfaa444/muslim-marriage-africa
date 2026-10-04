import { execFile } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { ObjectStorageAdapter, objectStorageSettings } from './object-storage-adapter.js'

const minioImage = 'minio/minio:RELEASE.2025-07-23T15-54-02Z'

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

function run(args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile('docker', args, { encoding: 'utf8' }, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(`docker ${args.join(' ')} failed\n${stderr}`))
        return
      }
      resolve(stdout)
    })
  })
}

describe('object versions', () => {
  const accessKeyId = randomBytes(8).toString('hex')
  const secretAccessKey = randomBytes(18).toString('hex')
  const bucket = `versions${randomBytes(4).toString('hex')}`
  const container = `ankanu-versions-${randomBytes(4).toString('hex')}`
  let port = ''

  beforeAll(async () => {
    await run([
      'run',
      '-d',
      '--rm',
      '--name',
      container,
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
    const mapped = await run(['port', container, '9000'])
    const hostPort = mapped.trim().split(':').at(-1)
    if (hostPort === undefined || hostPort === '') {
      throw new Error('object storage did not publish a port')
    }
    port = hostPort
    const deadline = Date.now() + 30_000
    while (Date.now() < deadline) {
      try {
        const response = await fetch(`http://127.0.0.1:${port}/minio/health/live`)
        if (response.ok) {
          return
        }
      } catch {
        // MinIO is still starting.
      }
      await delay(300)
    }
    throw new Error('object storage did not become ready')
  }, 60_000)

  afterAll(async () => {
    await run(['rm', '-f', container]).catch(() => undefined)
  }, 30_000)

  it('brings an overwritten object version back', async () => {
    const settings = objectStorageSettings({
      S3_ENDPOINT: `http://127.0.0.1:${port}`,
      S3_BUCKET: bucket,
      S3_REGION: 'us-east-1',
      S3_ACCESS_KEY_ID: accessKeyId,
      S3_SECRET_ACCESS_KEY: secretAccessKey,
    })
    if (settings === null) {
      throw new Error('object storage settings missing')
    }
    const adapter = ObjectStorageAdapter.fromSettings(settings)
    await adapter.createPrivateBucket()
    await adapter.createPrivateBucket()
    expect(await adapter.bucketVersioning()).toBe('Enabled')

    const key = `restore/${randomBytes(4).toString('hex')}`
    const first = Uint8Array.from([9, 8, 7])
    const second = Uint8Array.from([1, 2, 3])
    await adapter.writeObject(key, first)
    const versions = await adapter.listObjectVersionIds(key)
    const firstId = versions[0]
    if (firstId === undefined) {
      throw new Error('first object version is missing')
    }
    await adapter.writeObject(key, second)
    expect(Buffer.from(await adapter.readObject(key))).toEqual(Buffer.from(second))

    await adapter.restoreObjectVersion(key, firstId)
    expect(Buffer.from(await adapter.readObject(key))).toEqual(Buffer.from(first))
    expect(Buffer.from(await adapter.readObjectVersion(key, firstId))).toEqual(Buffer.from(first))
  }, 30_000)
})
