import { execFile } from 'node:child_process'
import { existsSync, readdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const codeRoot = fileURLToPath(new URL('../../../', import.meta.url))
const composeFile = join(codeRoot, 'compose.yaml')
const projectArgs = ['compose', '-p', 'ankanu', '-f', composeFile] as const

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

function shell(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    execFile('sh', args, { cwd: codeRoot, encoding: 'utf8' }, (error, _stdout, stderr) => {
      if (error) {
        reject(new Error(`sh ${args.join(' ')} failed\n${stderr.slice(-4000)}`))
        return
      }
      resolve()
    })
  })
}

function run(args: string[]): Promise<{ stdout: string; stderr: string; code: number }> {
  return new Promise((resolve, reject) => {
    execFile(
      'docker',
      args,
      { cwd: codeRoot, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 },
      (error, stdout, stderr) => {
        const code = error === null ? 0 : typeof error.code === 'number' ? error.code : 1
        if (error && code !== 0) {
          reject(new Error(`docker ${args.join(' ')} failed (${code})\n${stderr.slice(-4000)}`))
          return
        }
        resolve({ stdout, stderr, code })
      },
    )
  })
}

async function psql(sql: string): Promise<string> {
  const result = await run([
    ...projectArgs,
    'exec',
    '-T',
    '-u',
    'postgres',
    'postgres',
    'psql',
    '-U',
    'ankanu',
    '-d',
    'ankanu',
    '-h',
    '127.0.0.1',
    '-v',
    'ON_ERROR_STOP=1',
    '-tAc',
    sql,
  ])
  return result.stdout.trim()
}

function walNames(): string[] {
  const dir = join(codeRoot, 'pg-wal')
  return existsSync(dir) ? readdirSync(dir) : []
}

async function waitForNewWal(previous: readonly string[]): Promise<string[]> {
  const seen = new Set(previous)
  const deadline = Date.now() + 20_000
  while (Date.now() < deadline) {
    const names = walNames()
    if (names.some((name) => !seen.has(name))) {
      return names
    }
    await delay(300)
  }
  throw new Error('WAL archive did not gain a file')
}

async function clearBindMounts(): Promise<void> {
  await run([
    'run',
    '--rm',
    '-v',
    `${join(codeRoot, 'pg-data')}:/clear/pg-data`,
    '-v',
    `${join(codeRoot, 'pg-wal')}:/clear/pg-wal`,
    '-v',
    `${join(codeRoot, 'pg-base')}:/clear/pg-base`,
    '--entrypoint',
    'sh',
    'postgres:17.11',
    '-c',
    'find /clear/pg-data /clear/pg-wal /clear/pg-base -mindepth 1 -delete',
  ]).catch(() => undefined)
  for (const name of ['pg-data', 'pg-wal', 'pg-base']) {
    try {
      rmSync(join(codeRoot, name), { recursive: true, force: true })
    } catch {
      // The mount can be owned by the container user. The contents are already gone.
    }
  }
}

describe('quarterly restore drill', () => {
  beforeAll(async () => {
    await clearBindMounts()
    await run([...projectArgs, 'down', '--remove-orphans', '-v']).catch(() => undefined)
    await run([...projectArgs, 'up', '-d', '--wait', '--wait-timeout', '90', 'postgres'])
  }, 120_000)

  afterAll(async () => {
    await run([...projectArgs, 'down', '--remove-orphans', '-v']).catch(() => undefined)
    await clearBindMounts()
  }, 60_000)

  it('restores a row from WAL that the base backup did not contain', async () => {
    expect(await psql('show wal_level')).toBe('replica')
    expect(await psql('show archive_mode')).toBe('on')
    await psql('create table probe (id int primary key)')
    await shell([join(codeRoot, 'scripts/postgres-base-backup.sh')])
    await psql('insert into probe (id) values (1)')
    const stamp = await psql("select to_char(clock_timestamp() at time zone 'UTC', 'YYYY-MM-DD HH24:MI:SS.US')")
    const target = `${stamp}+00`
    const beforeInsertWal = walNames()
    await psql('select pg_switch_wal()')
    const afterInsert = await waitForNewWal(beforeInsertWal)
    await delay(1100)
    await psql('delete from probe')
    expect(await psql('select count(*) from probe')).toBe('0')
    await psql('select pg_switch_wal()')
    await waitForNewWal(afterInsert)
    await shell([join(codeRoot, 'scripts/postgres-pitr-restore.sh'), target])

    const deadline = Date.now() + 60_000
    let count = ''
    let lastError = 'restore did not become readable'
    while (Date.now() < deadline) {
      try {
        count = await psql('select count(*) from probe')
        break
      } catch (error) {
        lastError = error instanceof Error ? error.message : 'query failed'
        await delay(500)
      }
    }
    if (count !== '1') {
      const logs = await run([...projectArgs, 'logs', '--tail', '80', 'postgres']).catch((error: unknown) => ({
        stdout: error instanceof Error ? error.message : 'no logs',
        stderr: '',
        code: 1,
      }))
      throw new Error(`probe count ${count || 'unread'} (${lastError})\n${logs.stdout}\n${logs.stderr}`)
    }
  }, 180_000)
})
