import { execFile } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { Client } from 'pg'
import { free_unlimited, same_quota_as_brothers } from './operator-config.js'

const apiRoot = fileURLToPath(new URL('..', import.meta.url))
const kitBin = join(dirname(fileURLToPath(import.meta.resolve('drizzle-kit'))), 'bin.cjs')

const founderValues = {
  flag_threshold: '3',
  pack_prices_xof: '1=4900,3=14700,6=29400',
  rl_auth_per_min: '10',
  rl_otp_per_hour: '5',
  rl_invite_per_day: '30',
  rl_report_per_hour: '10',
  rl_pay_per_min: '5',
  rl_browse_per_min: '60',
  brother_invite_quota_premium: 'unlimited',
  min_age: '19',
  brother_invite_quota_free: '3',
  daily_message_cap: '10',
  free_review_sla_hours: '24',
  report_sla_hours: '24',
  photo_strike_count: '3',
  photo_strike_block_hours: '24',
  signed_url_ttl_seconds: '60',
  sister_reach_mode: free_unlimited,
} as const

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

function run(
  command: string,
  args: string[],
  options?: { cwd?: string; env?: NodeJS.ProcessEnv },
): Promise<{ stdout: string; stderr: string }> {
  const execOptions: { cwd?: string; env: NodeJS.ProcessEnv; encoding: 'utf8' } = {
    env: options?.env ?? process.env,
    encoding: 'utf8',
  }
  if (options?.cwd !== undefined) {
    execOptions.cwd = options.cwd
  }
  return new Promise((resolve, reject) => {
    execFile(command, args, execOptions, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(`${command} ${args.join(' ')} failed: ${error.message}\n${stderr}`))
        return
      }
      resolve({ stdout, stderr })
    })
  })
}

function postgresCode(error: unknown): string | undefined {
  if (typeof error === 'object' && error !== null && 'code' in error && typeof error.code === 'string') {
    return error.code
  }
  return undefined
}

async function publishedPort(container: string): Promise<string> {
  const deadline = Date.now() + 30_000
  while (Date.now() < deadline) {
    try {
      const { stdout } = await run('docker', ['port', container, '5432'])
      const port = stdout.trim().split('\n')[0]?.split(':').at(-1)
      if (port !== undefined && /^\d+$/.test(port)) {
        return port
      }
    } catch {
      // The container is still publishing its port.
    }
    await delay(200)
  }
  throw new Error(`postgres container ${container} did not publish port 5432`)
}

async function connect(connectionString: string): Promise<Client> {
  const deadline = Date.now() + 30_000
  let last: unknown
  while (Date.now() < deadline) {
    const candidate = new Client({ connectionString })
    try {
      await candidate.connect()
      return candidate
    } catch (error) {
      last = error
      await candidate.end().catch(() => undefined)
      await delay(300)
    }
  }
  throw last
}

async function publicTables(client: Client): Promise<string[]> {
  const result = await client.query<{ table_name: string }>(
    `select table_name
     from information_schema.tables
     where table_schema = 'public' and table_type = 'BASE TABLE'
     order by table_name`,
  )
  return result.rows.map((row) => row.table_name)
}

async function userTables(client: Client): Promise<string[]> {
  const result = await client.query<{ table_schema: string; table_name: string }>(
    `select table_schema, table_name
     from information_schema.tables
     where table_type = 'BASE TABLE'
       and table_schema not in ('pg_catalog', 'information_schema')
     order by table_schema, table_name`,
  )
  return result.rows.map((row) => `${row.table_schema}.${row.table_name}`)
}

function typescriptSources(dir: string): string[] {
  const files: string[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...typescriptSources(path))
    } else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts')) {
      files.push(path)
    }
  }
  return files
}

function migrationSql(): string {
  const drizzleDir = join(apiRoot, 'drizzle')
  const sqlFiles = readdirSync(drizzleDir).filter((name) => name.endsWith('.sql')).sort()
  expect(sqlFiles).toEqual(['0000_operator_config.sql', '0001_account_credential.sql'])
  const accountSql = readFileSync(join(drizzleDir, '0001_account_credential.sql'), 'utf8')
  expect(accountSql).toContain('"coc_version" text NOT NULL')
  expect(accountSql).toContain('"age_attested" boolean NOT NULL')
  expect(accountSql).not.toContain('profile')
  return readFileSync(join(drizzleDir, '0000_operator_config.sql'), 'utf8')
}

describe('operator_config migration', () => {
  let container = ''
  let databaseUrl = ''
  let client: Client | undefined
  let migrated = false

  function db(): Client {
    if (!client) {
      throw new Error('postgres client is not connected')
    }
    return client
  }

  beforeAll(async () => {
    container = `ankanu-oc-${randomBytes(4).toString('hex')}`
    await run('docker', [
      'run',
      '-d',
      '--rm',
      '--name',
      container,
      '-e',
      'POSTGRES_USER=ankanu',
      '-e',
      'POSTGRES_PASSWORD=ankanu',
      '-e',
      'POSTGRES_DB=ankanu',
      '-p',
      '127.0.0.1::5432',
      'postgres:17',
    ])
    const port = await publishedPort(container)
    const readyDeadline = Date.now() + 30_000
    let ready = false
    while (Date.now() < readyDeadline) {
      try {
        await run('docker', ['exec', container, 'pg_isready', '-U', 'ankanu', '-d', 'ankanu'])
        ready = true
        break
      } catch {
        await delay(300)
      }
    }
    if (!ready) {
      throw new Error('postgres did not become ready')
    }
    databaseUrl = `postgres://ankanu:ankanu@127.0.0.1:${port}/ankanu`
    client = await connect(databaseUrl)
  }, 120_000)

  afterAll(async () => {
    if (client) {
      await client.end()
    }
    if (container !== '') {
      await run('docker', ['rm', '-f', container]).catch(() => undefined)
    }
  }, 60_000)

  it('drizzle-kit migrate on an empty Postgres 17 creates operator_config and the seeded keys', async () => {
    const version = await db().query<{ server_version: string }>('show server_version')
    expect(version.rows[0]?.server_version).toMatch(/^17\./)
    expect(kitBin).toMatch(/drizzle-kit\/bin\.cjs$/)
    expect(await publicTables(db())).toEqual([])

    const schemata = await db().query<{ schema_name: string }>(
      `select schema_name from information_schema.schemata where schema_name = 'drizzle'`,
    )
    expect(schemata.rows).toEqual([])

    await run(process.execPath, [kitBin, 'migrate'], {
      cwd: apiRoot,
      env: { ...process.env, DATABASE_URL: databaseUrl },
    })
    migrated = true

    expect(await publicTables(db())).toEqual(['account', 'credential', 'operator_config'])
    expect(await userTables(db())).toEqual([
      'drizzle.__drizzle_migrations',
      'public.account',
      'public.credential',
      'public.operator_config',
    ])

    const applied = await db().query<{ count: string }>(
      `select count(*)::text as count from "drizzle"."__drizzle_migrations"`,
    )
    expect(applied.rows[0]?.count).toBe('2')

    const columns = await db().query<{ column_name: string }>(
      `select column_name
       from information_schema.columns
       where table_schema = 'drizzle' and table_name = '__drizzle_migrations'
       order by column_name`,
    )
    expect(columns.rows.map((row) => row.column_name)).toEqual(['created_at', 'hash', 'id'])

    const seeded = await db().query<{ key: string }>(`select "key" from "operator_config" order by "key"`)
    expect(seeded.rows.map((row) => row.key)).toEqual(Object.keys(founderValues).sort())
  }, 60_000)

  it('reads every founder value by key, with both reach-mode strings in the migration and in api code', async () => {
    expect(migrated).toBe(true)
    expect(free_unlimited).toBe('free_unlimited')
    expect(same_quota_as_brothers).toBe('same_quota_as_brothers')

    const sql = migrationSql()
    expect(sql).toContain(free_unlimited)
    expect(sql).toContain(same_quota_as_brothers)
    expect(sql).not.toContain(`('brother_invite_quota_premium', '15')`)
    for (const [key, value] of Object.entries(founderValues)) {
      expect(sql).toContain(`('${key}', '${value}')`)
    }

    const result = await db().query<{ key: string; value: string }>(
      `select "key", "value" from "operator_config"`,
    )
    const actual = new Map(result.rows.map((row) => [row.key, row.value]))
    expect(actual.size).toBe(Object.keys(founderValues).length)
    for (const [key, value] of Object.entries(founderValues)) {
      expect(actual.get(key)).toBe(value)
    }
    expect(actual.get('sister_reach_mode')).toBe(free_unlimited)
    expect(actual.get('brother_invite_quota_premium')).toBe('unlimited')

    const migratorImport = /from\s+['"]drizzle-orm\/(?:[^'"]*\/)?migrator(?:\.js)?['"]/
    const prismaImport = /from\s+['"](?:@prisma\/client|prisma)['"]/
    for (const path of typescriptSources(join(apiRoot, 'src'))) {
      const source = readFileSync(path, 'utf8')
      expect(source, path).not.toMatch(migratorImport)
      expect(source, path).not.toMatch(prismaImport)
    }
  })

  it('keeps a later value edit in operator_config and nowhere else', async () => {
    expect(migrated).toBe(true)
    await db().query(`update "operator_config" set "value" = $1 where "key" = 'flag_threshold'`, ['4'])

    const read = await db().query<{ value: string }>(
      `select "value" from "operator_config" where "key" = 'flag_threshold'`,
    )
    expect(read.rows).toEqual([{ value: '4' }])
    expect(await publicTables(db())).toEqual(['account', 'credential', 'operator_config'])
    expect(await userTables(db())).toEqual([
      'drizzle.__drizzle_migrations',
      'public.account',
      'public.credential',
      'public.operator_config',
    ])

    const keyColumns = await db().query<{ table_schema: string; table_name: string }>(
      `select table_schema, table_name
       from information_schema.columns
       where column_name = 'key'
         and table_schema not in ('pg_catalog', 'information_schema')
       order by table_schema, table_name`,
    )
    expect(keyColumns.rows).toEqual([{ table_schema: 'public', table_name: 'operator_config' }])
  })

  it('rejects a sister_reach_mode other than the two locked strings', async () => {
    expect(migrated).toBe(true)
    await db().query(`update "operator_config" set "value" = $1 where "key" = 'sister_reach_mode'`, [
      same_quota_as_brothers,
    ])
    const allowed = await db().query<{ value: string }>(
      `select "value" from "operator_config" where "key" = 'sister_reach_mode'`,
    )
    expect(allowed.rows).toEqual([{ value: same_quota_as_brothers }])

    let rejected = false
    try {
      await db().query(`update "operator_config" set "value" = $1 where "key" = 'sister_reach_mode'`, [
        'not_a_locked_mode',
      ])
    } catch (error) {
      rejected = true
      expect(postgresCode(error)).toBe('23514')
    }
    expect(rejected).toBe(true)

    const unchanged = await db().query<{ value: string }>(
      `select "value" from "operator_config" where "key" = 'sister_reach_mode'`,
    )
    expect(unchanged.rows).toEqual([{ value: same_quota_as_brothers }])

    await db().query(`update "operator_config" set "value" = $1 where "key" = 'daily_message_cap'`, [
      'not_a_locked_mode',
    ])
    const otherKey = await db().query<{ value: string }>(
      `select "value" from "operator_config" where "key" = 'daily_message_cap'`,
    )
    expect(otherKey.rows).toEqual([{ value: 'not_a_locked_mode' }])

    await db().query(`insert into "operator_config" ("key", "value") values ('story_probe', 'not_a_locked_mode')`)
    await db().query(`delete from "operator_config" where "key" = 'story_probe'`)

    await db().query(`update "operator_config" set "value" = $1 where "key" = 'sister_reach_mode'`, [
      free_unlimited,
    ])
  })
})
