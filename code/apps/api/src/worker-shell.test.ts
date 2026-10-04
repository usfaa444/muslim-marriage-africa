import { execFileSync, spawn, type ChildProcess } from 'node:child_process'
import { once } from 'node:events'
import net from 'node:net'
import { fileURLToPath } from 'node:url'
import { beforeAll, describe, expect, it } from 'vitest'
import { processRole, runWorkerShell } from './worker-shell.js'

const BANNED = /dating|rencontre romantique/i
const appRoot = fileURLToPath(new URL('..', import.meta.url))
const tsc = fileURLToPath(new URL('../../../node_modules/typescript/bin/tsc', import.meta.url))

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

function childEnv(port: number, role: string | undefined): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = { ...process.env, PORT: String(port) }
  for (const key of [
    'REDIS_HOST',
    'REDIS_PORT',
    'REDIS_PASSWORD',
    'REDIS_URL',
    'S3_ENDPOINT',
    'S3_BUCKET',
    'S3_REGION',
    'S3_ACCESS_KEY_ID',
    'S3_SECRET_ACCESS_KEY',
  ]) {
    delete env[key]
  }
  if (role === undefined) {
    delete env.PROCESS_ROLE
  } else {
    env.PROCESS_ROLE = role
  }
  return env
}

function spawnMain(port: number, role: string | undefined): ChildProcess {
  return spawn(process.execPath, ['dist/main.js'], {
    cwd: appRoot,
    env: childEnv(port, role),
    stdio: ['ignore', 'ignore', 'pipe'],
  })
}

async function stopChild(child: ChildProcess): Promise<void> {
  if (child.exitCode === null && child.signalCode === null) {
    child.kill('SIGTERM')
    await once(child, 'exit')
  }
}

async function expectNoListener(port: number, child: ChildProcess): Promise<void> {
  const started = Date.now()
  do {
    await expect(connect(port)).rejects.toThrow(/ECONNREFUSED/)
    if (child.exitCode !== null) {
      return
    }
    await new Promise((resolve) => {
      setTimeout(resolve, 5)
    })
  } while (Date.now() - started < 5000)
}

async function expectWorkerProcess(role: string): Promise<void> {
  const port = await freePort()
  const child = spawnMain(port, role)
  let stderr = ''
  child.stderr?.setEncoding('utf8')
  child.stderr?.on('data', (chunk: string) => {
    stderr += chunk
  })
  try {
    await expectNoListener(port, child)
    if (child.exitCode === null) {
      throw new Error('worker did not exit')
    }
    expect(child.exitCode).not.toBe(0)
    expect(stderr).toContain('role=worker redis=unavailable')
    expect(stderr).not.toMatch(BANNED)
  } finally {
    await stopChild(child)
  }
}

async function expectApiHealth(role: string | undefined): Promise<void> {
  const port = await freePort()
  const child = spawnMain(port, role)
  try {
    const body = await waitForHealth(port)
    expect(Object.keys(body).sort()).toEqual(['request_id', 'role', 'status'])
    expect(body.status).toBe('ok')
    expect(body.role).toBe('api')
    expect(JSON.stringify(body)).not.toMatch(BANNED)
  } finally {
    await stopChild(child)
  }
}

describe('worker shell', () => {
  beforeAll(() => {
    execFileSync(process.execPath, [tsc, '-p', 'tsconfig.json'], { cwd: appRoot, stdio: 'inherit' })
  })

  it('keeps Story 1.2 unless PROCESS_ROLE is worker', () => {
    expect(processRole({})).toBe('api')
    expect(processRole({ PROCESS_ROLE: '' })).toBe('api')
    expect(processRole({ PROCESS_ROLE: '   ' })).toBe('api')
    expect(processRole({ PROCESS_ROLE: 'api' })).toBe('api')
    expect(processRole({ PROCESS_ROLE: ' worker ' })).toBe('worker')
  })

  it('exits non-zero with a visible line and no connection setting', () => {
    const result = runWorkerShell()

    expect(result.exitCode).not.toBe(0)
    expect(result.message).toBe('role=worker redis=unavailable\n')
    expect(result.message).not.toMatch(BANNED)
    expect(result.message).not.toMatch(/REDIS_|redis:\/\//)
  })

  it('does not bind an HTTP port when the worker process starts', async () => {
    await expectWorkerProcess('worker')
    await expectWorkerProcess(' worker ')
  })

  it('still serves GET /v1/health for the api role', async () => {
    await expectApiHealth(undefined)
    await expectApiHealth('')
    await expectApiHealth('   ')
    await expectApiHealth('api')
  })
})

async function waitForHealth(port: number): Promise<Record<string, unknown>> {
  const deadline = Date.now() + 5000
  let lastError: unknown
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/v1/health`, {
        signal: AbortSignal.timeout(200),
      })
      if (response.status === 200) {
        return (await response.json()) as Record<string, unknown>
      }
      lastError = new Error(`health status ${response.status}`)
    } catch (error) {
      lastError = error
    }
    await new Promise((resolve) => {
      setTimeout(resolve, 50)
    })
  }
  throw lastError instanceof Error ? lastError : new Error('api health did not respond')
}
