import { execFile } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const codeRoot = fileURLToPath(new URL('../../../', import.meta.url))
const composeFile = join(codeRoot, 'compose.yaml')
const emptyEnvDir = mkdtempSync(join(tmpdir(), 'ankanu-compose-'))
const emptyEnvFile = join(emptyEnvDir, 'empty.env')
writeFileSync(emptyEnvFile, '')
const projectArgs = ['compose', '-p', 'ankanu', '--env-file', emptyEnvFile, '-f', composeFile] as const
const ignoredEnv = join(codeRoot, 'apps/web/app/.env.local')

type EnvSnapshot = { existed: false } | { existed: true; bytes: Buffer }

function snapshotEnvFile(path: string): EnvSnapshot {
  if (!existsSync(path)) {
    return { existed: false }
  }
  return { existed: true, bytes: readFileSync(path) }
}

function restoreEnvFile(path: string, snapshot: EnvSnapshot): void {
  if (snapshot.existed) {
    writeFileSync(path, snapshot.bytes)
    return
  }
  rmSync(path, { force: true })
}

const services = ['web', 'api', 'worker', 'postgres', 'redis', 'bucket'] as const

type PortBinding = { HostPort?: string }

type Inspect = {
  Image: string
  Config: { Image: string; Cmd: string[] | null; Env: string[] | null }
  State: { Status: string; ExitCode: number; Health?: { Status: string } }
  HostConfig: { PortBindings: Record<string, PortBinding[] | null> | null }
  NetworkSettings: { Ports: Record<string, PortBinding[] | null> | null }
}

function run(
  args: string[],
  options?: { env?: NodeJS.ProcessEnv; allowFailure?: boolean },
): Promise<{ stdout: string; stderr: string; code: number }> {
  return new Promise((resolve, reject) => {
    execFile(
      'docker',
      args,
      {
        cwd: codeRoot,
        env: options?.env ?? process.env,
        encoding: 'utf8',
        maxBuffer: 32 * 1024 * 1024,
      },
      (error, stdout, stderr) => {
        const code = error === null ? 0 : typeof error.code === 'number' ? error.code : 1
        if (error && options?.allowFailure !== true) {
          reject(new Error(`docker ${args.join(' ')} failed (${code})\n${stderr.slice(-8000)}`))
          return
        }
        resolve({ stdout, stderr, code })
      },
    )
  })
}

function composeEnv(overrides: Record<string, string | undefined>): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = { ...process.env, COMPOSE_PROJECT_NAME: 'ankanu' }
  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) {
      delete env[key]
    } else {
      env[key] = value
    }
  }
  return env
}

function tagged(actual: string, tag: string): boolean {
  const normalized = actual.replace(/^docker.io\//, '').replace(/^library\//, '')
  return normalized === tag || normalized === `${tag}:latest`
}

function hostPorts(info: Inspect): string[] {
  const published: string[] = []
  for (const [port, bindings] of Object.entries(info.NetworkSettings.Ports ?? {})) {
    for (const binding of bindings ?? []) {
      if (binding.HostPort) {
        published.push(`${port}:${binding.HostPort}`)
      }
    }
  }
  for (const [port, bindings] of Object.entries(info.HostConfig.PortBindings ?? {})) {
    for (const binding of bindings ?? []) {
      if (binding.HostPort) {
        published.push(`${port}:${binding.HostPort}`)
      }
    }
  }
  return published
}

async function inspectService(service: string): Promise<Inspect> {
  const listed = await run([...projectArgs, 'ps', '-aq', service])
  const id = listed.stdout.trim().split('\n').filter((line) => line !== '').at(-1)
  if (id === undefined) {
    throw new Error(`service ${service} has no container`)
  }
  const inspected = await run(['inspect', id])
  const parsed = JSON.parse(inspected.stdout) as Inspect[]
  const info = parsed[0]
  if (info === undefined) {
    throw new Error(`inspect returned nothing for ${service}`)
  }
  return info
}

async function composeDown(): Promise<void> {
  await run([...projectArgs, 'down', '--remove-orphans', '-v'])
}

describe('compose file', () => {
  const text = readFileSync(composeFile, 'utf8')

  it('names the project ankanu and does not publish host ports or default credentials', () => {
    expect(text).toContain('name: ankanu')
    expect(text).not.toMatch(/^\s*ports\s*:/m)
    expect(text).not.toMatch(/\$\{S3_ACCESS_KEY_ID[:-]/)
    expect(text).not.toMatch(/\$\{S3_SECRET_ACCESS_KEY[:-]/)
    expect(text).not.toContain(['minio', 'admin'].join(''))
    expect(text).not.toMatch(/POSTGRES_PASSWORD/)
    expect(text).not.toMatch(/REDIS_PASSWORD/)
    expect(text).toContain('postgres:17.11')
    expect(text).toContain('redis:8.6.3')
    expect(text).toContain('minio/minio:RELEASE.2025-07-23T15-54-02Z')
    expect(text).toContain('image: api')
    expect(text).toContain('image: web')
    expect(text).toContain('PROCESS_ROLE=worker')
    expect(text).toContain('POSTGRES_HOST_AUTH_METHOD: trust')
    expect(text).toContain('POSTGRES_USER: ankanu')
    expect(text).toContain('POSTGRES_DB: ankanu')
    expect(text).toContain('DATABASE_URL: postgres://ankanu@postgres:5432/ankanu')
  })
})

describe('bucket credentials missing', () => {
  afterAll(async () => {
    await composeDown()
  }, 120_000)

  async function expectBucketUnhealthy(overrides: Record<string, string | undefined>): Promise<void> {
    await composeDown()
    const env = composeEnv(overrides)
    const up = await run(
      [...projectArgs, 'up', '-d', '--no-build', '--wait', '--wait-timeout', '25', 'bucket'],
      { env, allowFailure: true },
    )
    expect(up.code).not.toBe(0)
    const info = await inspectService('bucket')
    expect(info.State.Status).toBe('exited')
    expect(info.State.ExitCode).not.toBe(0)
    expect(info.State.Health?.Status).not.toBe('healthy')
    expect(hostPorts(info)).toEqual([])
  }

  it('does not become healthy when S3_ACCESS_KEY_ID is unset', async () => {
    await expectBucketUnhealthy({
      S3_ACCESS_KEY_ID: undefined,
      S3_SECRET_ACCESS_KEY: randomBytes(18).toString('hex'),
    })
  }, 90_000)

  it('does not become healthy when S3_SECRET_ACCESS_KEY is unset', async () => {
    await expectBucketUnhealthy({
      S3_ACCESS_KEY_ID: randomBytes(8).toString('hex'),
      S3_SECRET_ACCESS_KEY: undefined,
    })
  }, 90_000)

  it('does not become healthy when both bucket credentials are unset', async () => {
    await expectBucketUnhealthy({
      S3_ACCESS_KEY_ID: undefined,
      S3_SECRET_ACCESS_KEY: undefined,
    })
  }, 90_000)
})

describe('web env file fixture', () => {
  it('deletes the web env file only when this test created it', () => {
    const dir = mkdtempSync(join(tmpdir(), 'ankanu-env-'))
    const path = join(dir, '.env.local')
    const created = snapshotEnvFile(path)
    writeFileSync(path, 'IGNORED=1\n')
    restoreEnvFile(path, created)
    expect(existsSync(path)).toBe(false)

    const canary = 'QA_CANARY=ankanu-34\n'
    writeFileSync(path, canary)
    const existing = snapshotEnvFile(path)
    writeFileSync(path, 'IGNORED=1\n')
    restoreEnvFile(path, existing)
    expect(readFileSync(path, 'utf8')).toBe(canary)
    rmSync(dir, { recursive: true, force: true })
  })
})

describe('docker compose up', () => {
  const env = composeEnv({
    S3_ACCESS_KEY_ID: randomBytes(8).toString('hex'),
    S3_SECRET_ACCESS_KEY: randomBytes(18).toString('hex'),
  })
  let webEnvSnapshot: EnvSnapshot | undefined

  beforeAll(async () => {
    webEnvSnapshot = snapshotEnvFile(ignoredEnv)
    writeFileSync(ignoredEnv, 'IGNORED=1\n')
    await composeDown()
    await run(
      [...projectArgs, 'up', '-d', '--build', '--wait', '--wait-timeout', '600'],
      { env },
    )
  }, 1_200_000)

  afterAll(async () => {
    if (webEnvSnapshot !== undefined) {
      restoreEnvFile(ignoredEnv, webEnvSnapshot)
    }
    await composeDown()
    rmSync(emptyEnvDir, { recursive: true, force: true })
  }, 180_000)

  it('makes web, api, worker, postgres, redis, and the bucket healthy with no host ports', async () => {
    for (const service of services) {
      const info = await inspectService(service)
      expect(info.State.Status, service).toBe('running')
      expect(info.State.Health?.Status, service).toBe('healthy')
      expect(hostPorts(info), service).toEqual([])
    }

    await run([
      ...projectArgs,
      'exec',
      '-T',
      'api',
      'node',
      '-e',
      "fetch('http://127.0.0.1:3000/v1/health').then(async (response) => { const body = await response.json(); const keys = Object.keys(body).sort().join(','); if (!response.ok || body.status !== 'ok' || body.role !== 'api' || typeof body.request_id !== 'string' || keys !== 'request_id,role,status') process.exit(1); }).catch(() => process.exit(1))",
    ])
    await run([
      ...projectArgs,
      'exec',
      '-T',
      'api',
      'node',
      '-e',
      "fetch('http://web:3000/').then((response) => process.exit(response.ok ? 0 : 1)).catch(() => process.exit(1))",
    ])
    await run([
      ...projectArgs,
      'exec',
      '-T',
      'api',
      'node',
      '-e',
      "const { Client } = require('pg'); const client = new Client({ host: 'postgres', user: 'ankanu', database: 'ankanu', port: 5432 }); client.connect().then(() => client.query('select current_user as user')).then((result) => { if (result.rows[0].user !== 'ankanu') process.exit(1); return client.end(); }).catch(() => process.exit(1))",
    ])
    await run([...projectArgs, 'exec', '-T', 'postgres', 'pg_isready', '-U', 'ankanu', '-d', 'ankanu'])
    const redisPing = await run([...projectArgs, 'exec', '-T', 'redis', 'redis-cli', 'ping'])
    expect(redisPing.stdout.trim()).toBe('PONG')
    await run([
      ...projectArgs,
      'exec',
      '-T',
      'api',
      'node',
      '-e',
      "const net = require('net'); const socket = net.connect(6379, 'redis'); socket.on('connect', () => socket.write('*1\\r\\n$4\\r\\nPING\\r\\n')); socket.on('data', (buf) => process.exit(buf.toString().includes('PONG') ? 0 : 1)); socket.on('error', () => process.exit(1)); setTimeout(() => process.exit(1), 5000);",
    ])
    const apiNode = await run([...projectArgs, 'exec', '-T', 'api', 'node', '-v'])
    const webNode = await run([...projectArgs, 'exec', '-T', 'web', 'node', '-v'])
    expect(apiNode.stdout.trim()).toBe('v24.21.0')
    expect(webNode.stdout.trim()).toBe('v24.21.0')
    await run([
      ...projectArgs,
      'exec',
      '-T',
      'web',
      'node',
      '-e',
      "process.exit(require('fs').existsSync('/app/apps/web/app/.env.local') ? 1 : 0)",
    ])
    await run([...projectArgs, 'exec', '-T', 'bucket', 'curl', '-f', 'http://127.0.0.1:9000/minio/health/live'])
    await run([
      ...projectArgs,
      'exec',
      '-T',
      'api',
      'node',
      '-e',
      "fetch('http://bucket:9000/minio/health/live').then((response) => process.exit(response.ok ? 0 : 1)).catch(() => process.exit(1))",
    ])

    const workerLogs = await run([...projectArgs, 'logs', '--no-color', 'worker'])
    expect(`${workerLogs.stdout}\n${workerLogs.stderr}`).not.toContain('redis=unavailable')
    await run([
      ...projectArgs,
      'exec',
      '-T',
      'worker',
      'node',
      '-e',
      'const fs = require("fs"); const net = require("net"); if (process.env.PROCESS_ROLE !== "worker") process.exit(1); const dockerDns = "0B00007F"; const listening = (path) => fs.readFileSync(path, "utf8").trim().split("\\n").slice(1).filter((line) => { const cols = line.trim().split(/\\s+/); if (cols[3] !== "0A") return false; const addr = (cols[1] || "").split(":")[0]; return addr !== dockerDns; }); if (listening("/proc/net/tcp").concat(listening("/proc/net/tcp6")).length) process.exit(1); const socket = net.connect({ host: "127.0.0.1", port: 3000 }); socket.once("connect", () => process.exit(1)); socket.once("error", () => process.exit(0)); setTimeout(() => process.exit(1), 1000);',
    ])
  }, 120_000)

  it('runs api and worker from image api with different commands', async () => {
    const api = await inspectService('api')
    const worker = await inspectService('worker')
    const web = await inspectService('web')
    const postgres = await inspectService('postgres')
    const redis = await inspectService('redis')
    const bucket = await inspectService('bucket')
    expect(api.Image).toBe(worker.Image)
    expect(tagged(api.Config.Image, 'api')).toBe(true)
    expect(tagged(worker.Config.Image, 'api')).toBe(true)
    expect(tagged(web.Config.Image, 'web')).toBe(true)
    expect(tagged(postgres.Config.Image, 'postgres:17.11')).toBe(true)
    expect(tagged(redis.Config.Image, 'redis:8.6.3')).toBe(true)
    expect(tagged(bucket.Config.Image, 'minio/minio:RELEASE.2025-07-23T15-54-02Z')).toBe(true)
    expect(api.Config.Cmd).not.toEqual(worker.Config.Cmd)
    const workerCommand = (worker.Config.Cmd ?? []).join(' ')
    const apiCommand = (api.Config.Cmd ?? []).join(' ')
    expect(workerCommand).toContain('PROCESS_ROLE=worker')
    expect(apiCommand).not.toContain('PROCESS_ROLE')
    expect(worker.Config.Env ?? []).toContain('PROCESS_ROLE=worker')
    expect(api.Config.Env ?? []).not.toContain('PROCESS_ROLE=worker')
    expect(api.Config.Env ?? []).toContain('DATABASE_URL=postgres://ankanu@postgres:5432/ankanu')
    expect(api.Config.Env ?? []).toEqual(
      expect.arrayContaining([
        'REDIS_HOST=redis',
        'REDIS_PORT=6379',
        'S3_ENDPOINT=http://bucket:9000',
        'S3_BUCKET=ankanu',
        `S3_ACCESS_KEY_ID=${env.S3_ACCESS_KEY_ID}`,
        `S3_SECRET_ACCESS_KEY=${env.S3_SECRET_ACCESS_KEY}`,
      ]),
    )
    expect(bucket.Config.Env ?? []).toEqual(
      expect.arrayContaining([
        `MINIO_ROOT_USER=${env.S3_ACCESS_KEY_ID}`,
        `MINIO_ROOT_PASSWORD=${env.S3_SECRET_ACCESS_KEY}`,
      ]),
    )
  })
})
