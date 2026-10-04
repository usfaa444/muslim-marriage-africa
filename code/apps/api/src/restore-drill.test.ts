import { execFile } from 'node:child_process'
import { rmSync } from 'node:fs'
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
    await delay(1100)
    await psql('delete from probe')
    expect(await psql('select count(*) from probe')).toBe('0')
    await shell([join(codeRoot, 'scripts/postgres-pitr-restore.sh'), target])
    expect(await psql('select pg_is_in_recovery()')).toBe('f')
    expect(await psql('select count(*) from probe')).toBe('1')
  }, 180_000)
})
