import type { AddressInfo } from 'node:net'
import { execFile } from 'node:child_process'
import { createHash, randomBytes } from 'node:crypto'
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { Client } from 'pg'
import { closeAccountStore, setAccountStore } from './account-store.js'
import { createStaffAccount, disableStaffAccount, resetStaffMfa } from './staff-accounts.js'
import { setStaffMfaKey } from './staff-mfa-key.js'
import { changeStaffPassword, loadStaffSessionById, readEnrollment, signInStaff, verifyStaffCode } from './staff-session.js'
import { getStaffStore } from './staff-store.js'
import { totpCode } from './staff-totp.js'
import { getCaptureStore } from './id-liveness-store.js'
import { nextRecordId } from './id-liveness.js'
import { decideVerification } from './staff-review.js'
import { newId } from '@ankanu/kernel'
import { setAuthClock } from './auth-clock.js'
import { readRlAuthPerMin } from './auth-limit.js'
import { resetAuthRateWindow } from './auth-rate.js'
import { createApp } from './create-app.js'
import { setEmailPort } from './email-port.js'
import { setEmailVerificationStore } from './email-verification-store.js'
import { free_unlimited, same_quota_as_brothers } from './operator-config.js'
import { getChatPort, setChatPort } from './chat.js'
import { getInviteStore, readInviteConfig, setInviteConfigReader, setInviteStore, type InviteRow } from './invites.js'
import { PASSWORD_RESET_SESSION_MS, PASSWORD_RESET_TTL_MS } from './password-reset.js'
import { resetPasswordResetRateWindow } from './password-reset-rate.js'
import { setPasswordResetStore } from './password-reset-store.js'

const apiRoot = fileURLToPath(new URL('..', import.meta.url))
const kitBin = join(dirname(fileURLToPath(import.meta.resolve('drizzle-kit'))), 'bin.cjs')

const founderValues = {
  flag_threshold: '3',
  pack_prices_xof: '1=4900,3=14700,6=29400',
  rl_auth_per_min: '10',
  rl_otp_per_hour: '5',
  rl_verification_upload_per_hour: '10',
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
  rl_password_reset_per_min: '5',
} as const

/**
 * Live values after every migration. Fay, 2026-10-23: the Free Invite quota applies to Sisters too, so 0021 moves
 * `sister_reach_mode` from the 0000 seed `free_unlimited` to `same_quota_as_brothers`. The seed stays as history.
 */
const liveValues = { ...founderValues, sister_reach_mode: same_quota_as_brothers } as const

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
  expect(sqlFiles).toEqual([
    '0000_operator_config.sql',
    '0001_account_credential.sql',
    '0002_session.sql',
    '0003_email_verification.sql',
    '0004_password_reset.sql',
    '0005_profile.sql',
    '0006_verification_otp.sql',
    '0007_rl_verification_upload.sql',
    '0008_pin_lock.sql',
    '0009_cil_ticket.sql',
    '0010_account_civil_name.sql',
    '0011_photo_asset.sql',
    '0012_profile_review.sql',
    '0013_photo_replaced.sql',
    '0014_strike.sql',
    '0015_profile_photo_gallery.sql',
    '0016_favourite.sql',
    '0017_profile_visit.sql',
    '0018_discovery_exclusion.sql',
    '0019_staff_mfa.sql',
    '0020_review_console.sql',
    '0021_invite.sql',
    '0022_conversation.sql',
  ])
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

  const previousPublicOrigin = process.env['ANKANU_PUBLIC_ORIGIN']

  beforeAll(async () => {
    process.env['ANKANU_PUBLIC_ORIGIN'] = 'http://ankanu.test'
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
    if (previousPublicOrigin === undefined) {
      delete process.env['ANKANU_PUBLIC_ORIGIN']
    } else {
      process.env['ANKANU_PUBLIC_ORIGIN'] = previousPublicOrigin
    }
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

    expect(await publicTables(db())).toEqual([
      'account',
      'audit_event',
      'cil_ticket',
      'conversation',
      'credential',
      'derivative',
      'discovery_exclusion',
      'email_verification',
      'favourite',
      'invite',
      'invite_quota',
      'liveness_challenge',
      'operator_config',
      'password_reset',
      'photo_asset',
      'pin_lock',
      'profile',
      'profile_visit',
      'session',
      'signed_grant',
      'sms_dispatch',
      'staff_credential',
      'strike',
      'verification_record',
    ])
    expect(await userTables(db())).toEqual([
      'drizzle.__drizzle_migrations',
      'public.account',
      'public.audit_event',
      'public.cil_ticket',
      'public.conversation',
      'public.credential',
      'public.derivative',
      'public.discovery_exclusion',
      'public.email_verification',
      'public.favourite',
      'public.invite',
      'public.invite_quota',
      'public.liveness_challenge',
      'public.operator_config',
      'public.password_reset',
      'public.photo_asset',
      'public.pin_lock',
      'public.profile',
      'public.profile_visit',
      'public.session',
      'public.signed_grant',
      'public.sms_dispatch',
      'public.staff_credential',
      'public.strike',
      'public.verification_record',
    ])

    const applied = await db().query<{ count: string }>(
      `select count(*)::text as count from "drizzle"."__drizzle_migrations"`,
    )
    expect(applied.rows[0]?.count).toBe('23')

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

  it('inserts through getAccountStore on migrated Postgres 17 and returns 409 for a duplicate email', async () => {
    expect(migrated).toBe(true)
    const previousDatabaseUrl = process.env['DATABASE_URL']
    process.env['DATABASE_URL'] = databaseUrl
    setAccountStore(undefined)
    const app = await createApp()
    await app.listen(0, '127.0.0.1')
    try {
      const address = app.getHttpServer().address() as AddressInfo | string | null
      if (address === null || typeof address === 'string') {
        throw new Error('expected the api test server to bind a TCP port')
      }
      expect(await readRlAuthPerMin()).toBe(10)
      const payload = {
        email: 'fatim@example.bf',
        password: 'phrase avec espaces',
        pseudonym: 'Fatim_Ouaga',
        gender: 'brother',
        pledge_accepted: true,
        civil_given_name: 'Fatim',
        civil_family_name: 'Sawadogo',
        recaptcha_token: 'test-ok',
        coc_version: 'FR-089',
        dob: '1990-01-15',
      }
      const created = await fetch(`http://127.0.0.1:${address.port}/v1/accounts`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const createdBody = (await created.json()) as { gender: string; status: string; age_attested: boolean }
      expect(created.status).toBe(201)
      expect(createdBody.gender).toBe('brother')
      expect(createdBody.status).toBe('Active')
      expect(createdBody.age_attested).toBe(true)
      expect(createdBody).not.toHaveProperty('dob')
      const storedProfile = await db().query<{ dob: string; city: string | null; country: string | null; visibility: string | null }>(
        `select "dob"::text as dob, "city", "country", "visibility" from "profile"`,
      )
      expect(storedProfile.rows).toEqual([{ dob: '1990-01-15', city: null, country: null, visibility: null }])

      const stored = await db().query<{ gender: string; count: string }>(
        `select "gender", count(*)::text as count from "account" group by "gender"`,
      )
      expect(stored.rows).toEqual([{ gender: 'brother', count: '1' }])

      const duplicate = await fetch(`http://127.0.0.1:${address.port}/v1/accounts`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...payload, pseudonym: 'Autre_Nom' }),
      })
      const duplicateBody = (await duplicate.json()) as { error: { details: { field: string } } }
      expect(duplicate.status).toBe(409)
      expect(duplicateBody.error.details.field).toBe('email')
      const after = await db().query<{ count: string }>(`select count(*)::text as count from "account"`)
      expect(after.rows[0]?.count).toBe('1')

      const signedIn = await fetch(`http://127.0.0.1:${address.port}/v1/sessions`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          identifier: 'Fatim@example.bf',
          password: 'phrase avec espaces',
          remember_me: false,
          recaptcha_token: 'test-ok',
        }),
      })
      const signedBody = (await signedIn.json()) as { id: string; kind: string }
      expect(signedIn.status).toBe(201)
      expect(signedBody.kind).toBe('web')
      const cookie = signedIn.headers.get('set-cookie') ?? ''
      expect(cookie).toContain(`ankanu_session=${signedBody.id}`)
      expect(cookie).not.toMatch(/Max-Age/i)
      const storedSession = await db().query<{ kind: string; column_name: string }>(
        `select "kind", '' as column_name from "session"`,
      )
      expect(storedSession.rows).toEqual([
        { kind: 'web', column_name: '' },
        { kind: 'web', column_name: '' },
      ])
      const sessionColumns = await db().query<{ column_name: string }>(
        `select column_name from information_schema.columns
         where table_schema = 'public' and table_name = 'session'
         order by column_name`,
      )
      expect(sessionColumns.rows.map((row) => row.column_name)).toEqual([
        'account_id',
        'expires_at',
        'id',
        'kind',
        'last_seen_at',
        // Story 12.1: set on staff sessions only.
        'mfa_state',
      ])
      const memberStates = await db().query<{ mfa_state: string | null }>(`select "mfa_state" from "session"`)
      expect(memberStates.rows.every((row) => row.mfa_state === null)).toBe(true)

      const junkCookie = await fetch(`http://127.0.0.1:${address.port}/v1/health`, {
        headers: { cookie: 'ankanu_session=nope' },
      })
      expect(junkCookie.status).toBe(200)

      const rememberedAt = new Date('2026-10-04T12:00:00.000Z')
      setAuthClock(() => rememberedAt)
      resetAuthRateWindow()
      const remembered = await fetch(`http://127.0.0.1:${address.port}/v1/sessions`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          identifier: 'Fatim_Ouaga',
          password: 'phrase avec espaces',
          remember_me: true,
          recaptcha_token: 'test-ok',
        }),
      })
      const rememberedBody = (await remembered.json()) as { id: string }
      expect(remembered.status).toBe(201)
      expect(remembered.headers.get('set-cookie') ?? '').toContain('Max-Age=1209600')
      const later = new Date(rememberedAt.getTime() + 24 * 60 * 60 * 1000)
      setAuthClock(() => later)
      const slid = await fetch(`http://127.0.0.1:${address.port}/v1/health`, {
        headers: { cookie: `ankanu_session=${rememberedBody.id}` },
      })
      expect(slid.status).toBe(200)
      expect(slid.headers.get('set-cookie') ?? '').toContain('Max-Age=1209600')
      const slidRow = await db().query<{ expires_at: Date; last_seen_at: Date }>(
        `select "expires_at", "last_seen_at" from "session" where "id" = $1`,
        [rememberedBody.id],
      )
      expect(new Date(slidRow.rows[0]?.last_seen_at ?? 0).toISOString()).toBe(later.toISOString())
      expect(new Date(slidRow.rows[0]?.expires_at ?? 0).toISOString()).toBe(
        new Date(later.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      )

      await db().query(`update "operator_config" set "value" = '2' where "key" = 'rl_auth_per_min'`)
      resetAuthRateWindow()
      const limitA = await fetch(`http://127.0.0.1:${address.port}/v1/sessions`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ identifier: 'nobody@example.bf', password: 'phrase avec espaces', remember_me: false, recaptcha_token: 'test-ok' }),
      })
      const limitB = await fetch(`http://127.0.0.1:${address.port}/v1/sessions`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ identifier: 'nobody@example.bf', password: 'phrase avec espaces', remember_me: false, recaptcha_token: 'test-ok' }),
      })
      const sessionsBeforeLimit = await db().query<{ count: string }>(`select count(*)::text as count from "session"`)
      const limitC = await fetch(`http://127.0.0.1:${address.port}/v1/sessions`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ identifier: 'Fatim_Ouaga', password: 'phrase avec espaces', remember_me: false, recaptcha_token: 'test-ok' }),
      })
      const limitBody = (await limitC.json()) as { error: { code: string } }
      const sessionsAfterLimit = await db().query<{ count: string }>(`select count(*)::text as count from "session"`)
      expect(limitA.status).toBe(401)
      expect(limitB.status).toBe(401)
      expect(limitC.status).toBe(429)
      expect(limitBody.error.code).toBe('RATE_LIMITED')
      expect(sessionsAfterLimit.rows[0]?.count).toBe(sessionsBeforeLimit.rows[0]?.count)

      await db().query(`update "operator_config" set "value" = 'nope' where "key" = 'rl_auth_per_min'`)
      resetAuthRateWindow()
      const badLimit = await fetch(`http://127.0.0.1:${address.port}/v1/sessions`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ identifier: 'Fatim_Ouaga', password: 'phrase avec espaces', remember_me: false, recaptcha_token: 'test-ok' }),
      })
      const badLimitBody = (await badLimit.json()) as { error: { code: string } }
      const sessionsAfterBad = await db().query<{ count: string }>(`select count(*)::text as count from "session"`)
      expect(badLimit.status).toBe(500)
      expect(badLimitBody.error.code).toBe('UNHANDLED')
      expect(sessionsAfterBad.rows[0]?.count).toBe(sessionsBeforeLimit.rows[0]?.count)
    } finally {
      setAuthClock(undefined)
      resetAuthRateWindow()
      await db().query(`update "operator_config" set "value" = '10' where "key" = 'rl_auth_per_min'`)
      await app.close()
      await closeAccountStore()
      if (previousDatabaseUrl === undefined) {
        delete process.env['DATABASE_URL']
      } else {
        process.env['DATABASE_URL'] = previousDatabaseUrl
      }
    }
  }, 60_000)

  it('issues and consumes an email link on migrated Postgres', async () => {
    expect(migrated).toBe(true)
    const previousDatabaseUrl = process.env['DATABASE_URL']
    process.env['DATABASE_URL'] = databaseUrl
    setAccountStore(undefined)
    setEmailVerificationStore(undefined)
    const sent: Array<{ to: string; link: string }> = []
    setEmailPort({
      async send(message) {
        sent.push(message)
      },
    })
    const stamped = new Date('2026-10-04T18:00:00.000Z')
    setAuthClock(() => stamped)
    resetAuthRateWindow()
    const app = await createApp()
    await app.listen(0, '127.0.0.1')
    try {
      const address = app.getHttpServer().address() as AddressInfo | string | null
      if (address === null || typeof address === 'string') {
        throw new Error('expected the api test server to bind a TCP port')
      }
      const base = `http://127.0.0.1:${address.port}`
      const columns = await db().query<{ column_name: string }>(
        `select column_name from information_schema.columns
         where table_schema = 'public' and table_name = 'email_verification'
         order by column_name`,
      )
      expect(columns.rows.map((row) => row.column_name)).toEqual([
        'account_id',
        'consumed_at',
        'created_at',
        'expires_at',
        'id',
        'superseded_at',
        'token_hash',
      ])
      const created = await fetch(`${base}/v1/accounts`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email: 'aminata@example.bf',
          password: 'phrase avec espaces',
          pseudonym: 'Aminata_Bobo',
          gender: 'sister',
          pledge_accepted: true,
          civil_given_name: 'Fatim',
          civil_family_name: 'Sawadogo',
          recaptcha_token: 'test-ok',
          coc_version: 'FR-089',
          dob: '1990-01-15',
        }),
      })
      expect(created.status).toBe(201)
      const signed = await fetch(`${base}/v1/sessions`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          identifier: 'Aminata_Bobo',
          password: 'phrase avec espaces',
          remember_me: false,
          recaptcha_token: 'test-ok',
        }),
      })
      expect(signed.status).toBe(201)
      const sessionId = ((await signed.json()) as { id: string }).id
      const issued = await fetch(`${base}/v1/accounts/email-verifications`, {
        method: 'POST',
        headers: { cookie: `ankanu_session=${sessionId}`, origin: 'http://ankanu.test' },
      })
      expect(issued.status).toBe(201)
      const token = new URL(sent[0]?.link ?? '').searchParams.get('token') ?? ''
      const stored = await db().query<{ token_hash: string; consumed_at: Date | null }>(
        `select "token_hash", "consumed_at" from "email_verification"`,
      )
      expect(stored.rows).toHaveLength(1)
      expect(stored.rows[0]?.token_hash).toBe(createHash('sha256').update(token).digest('hex'))
      expect(stored.rows[0]?.token_hash).not.toBe(token)
      expect(stored.rows[0]?.consumed_at).toBeNull()
      const consumed = await fetch(`${base}/v1/accounts/email-verifications/consume`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      const consumedBody = (await consumed.json()) as { email_verified_at: string }
      expect(consumed.status).toBe(200)
      expect(consumedBody.email_verified_at).toBe(stamped.toISOString())
      const after = await db().query<{ consumed_at: Date; email_verified_at: Date }>(
        `select v."consumed_at", c."email_verified_at"
         from "email_verification" v
         join "credential" c on c."account_id" = v."account_id" and c."kind" = 'password'
         join "account" a on a."id" = v."account_id"
         where a."email" = $1`,
        ['aminata@example.bf'],
      )
      expect(new Date(after.rows[0]?.consumed_at ?? 0).toISOString()).toBe(stamped.toISOString())
      expect(new Date(after.rows[0]?.email_verified_at ?? 0).toISOString()).toBe(stamped.toISOString())
    } finally {
      setAuthClock(undefined)
      setEmailPort(undefined)
      setEmailVerificationStore(undefined)
      resetAuthRateWindow()
      await app.close()
      await closeAccountStore()
      if (previousDatabaseUrl === undefined) {
        delete process.env['DATABASE_URL']
      } else {
        process.env['DATABASE_URL'] = previousDatabaseUrl
      }
    }
  }, 60_000)

  it('issues and consumes a password reset on migrated Postgres, including a link at 15 minutes', async () => {
    expect(migrated).toBe(true)
    const previousDatabaseUrl = process.env['DATABASE_URL']
    process.env['DATABASE_URL'] = databaseUrl
    setAccountStore(undefined)
    setEmailVerificationStore(undefined)
    setPasswordResetStore(undefined)
    const sent: Array<{ to: string; link: string }> = []
    setEmailPort({
      async send(message) {
        sent.push(message)
      },
    })
    let stamped = new Date('2026-10-04T19:00:00.000Z')
    setAuthClock(() => stamped)
    resetAuthRateWindow()
    resetPasswordResetRateWindow()
    const app = await createApp()
    await app.listen(0, '127.0.0.1')
    try {
      const address = app.getHttpServer().address() as AddressInfo | string | null
      if (address === null || typeof address === 'string') {
        throw new Error('expected the api test server to bind a TCP port')
      }
      const base = `http://127.0.0.1:${address.port}`
      const created = await fetch(`${base}/v1/accounts`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email: 'salimata@example.bf',
          password: 'phrase avec espaces',
          pseudonym: 'Salimata_Ouaga',
          gender: 'sister',
          pledge_accepted: true,
          civil_given_name: 'Fatim',
          civil_family_name: 'Sawadogo',
          recaptcha_token: 'test-ok',
          coc_version: 'FR-089',
          dob: '1990-01-15',
        }),
      })
      expect(created.status).toBe(201)
      const signed = await fetch(`${base}/v1/sessions`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          identifier: 'salimata@example.bf',
          password: 'phrase avec espaces',
          remember_me: false,
          recaptcha_token: 'test-ok',
        }),
      })
      expect(signed.status).toBe(201)
      const sessionId = ((await signed.json()) as { id: string }).id
      const issuedMail = await fetch(`${base}/v1/accounts/email-verifications`, {
        method: 'POST',
        headers: { cookie: `ankanu_session=${sessionId}`, origin: 'http://ankanu.test' },
      })
      expect(issuedMail.status).toBe(201)
      const verifyToken = new URL(sent[0]?.link ?? '').searchParams.get('token') ?? ''
      const verified = await fetch(`${base}/v1/accounts/email-verifications/consume`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token: verifyToken }),
      })
      expect(verified.status).toBe(200)
      const requested = await fetch(`${base}/v1/password-resets`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', origin: 'http://ankanu.test' },
        body: JSON.stringify({ email: 'salimata@example.bf' }),
      })
      expect(requested.status).toBe(201)
      const resetToken = new URL(sent[1]?.link ?? '').searchParams.get('token') ?? ''
      const stored = await db().query<{ token_hash: string; created_at: Date; expires_at: Date; consumed_at: Date | null }>(
        `select r."token_hash", r."created_at", r."expires_at", r."consumed_at"
         from "password_reset" r
         join "account" a on a."id" = r."account_id"
         where a."email" = $1`,
        ['salimata@example.bf'],
      )
      expect(stored.rows).toHaveLength(1)
      expect(stored.rows[0]?.token_hash).toBe(createHash('sha256').update(resetToken).digest('hex'))
      expect(stored.rows[0]?.token_hash).not.toBe(resetToken)
      expect(new Date(stored.rows[0]?.expires_at ?? 0).getTime()).toBe(
        new Date(stored.rows[0]?.created_at ?? 0).getTime() + PASSWORD_RESET_TTL_MS,
      )
      const consumed = await fetch(`${base}/v1/password-resets/consume`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token: resetToken, password: 'une phrase plus longue' }),
      })
      const consumedBody = (await consumed.json()) as { id: string; kind: string; expires_at: string }
      expect(consumed.status).toBe(200)
      expect(consumedBody.kind).toBe('web')
      expect(consumedBody.expires_at).toBe(new Date(stamped.getTime() + PASSWORD_RESET_SESSION_MS).toISOString())
      const oldPassword = await fetch(`${base}/v1/sessions`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          identifier: 'salimata@example.bf',
          password: 'phrase avec espaces',
          remember_me: false,
          recaptcha_token: 'test-ok',
        }),
      })
      expect(oldPassword.status).toBe(401)
      const nextPassword = await fetch(`${base}/v1/sessions`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          identifier: 'salimata@example.bf',
          password: 'une phrase plus longue',
          remember_me: false,
          recaptcha_token: 'test-ok',
        }),
      })
      expect(nextPassword.status).toBe(201)
      const again = await fetch(`${base}/v1/password-resets`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', origin: 'http://ankanu.test' },
        body: JSON.stringify({ email: 'salimata@example.bf' }),
      })
      expect(again.status).toBe(201)
      const expiringToken = new URL(sent[2]?.link ?? '').searchParams.get('token') ?? ''
      stamped = new Date(stamped.getTime() + PASSWORD_RESET_TTL_MS)
      const late = await fetch(`${base}/v1/password-resets/consume`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token: expiringToken, password: 'encore une phrase longue' }),
      })
      const lateBody = (await late.json()) as { error: { code: string } }
      expect(late.status).toBe(400)
      expect(lateBody.error.code).toBe('PASSWORD_RESET_INVALID')
      const after = await db().query<{ token_hash: string; consumed_at: Date | null }>(
        `select r."token_hash", r."consumed_at"
         from "password_reset" r
         join "account" a on a."id" = r."account_id"
         where a."email" = $1
         order by r."created_at"`,
        ['salimata@example.bf'],
      )
      expect(after.rows).toHaveLength(2)
      expect(after.rows[0]?.consumed_at).not.toBeNull()
      expect(after.rows[1]?.token_hash).toBe(createHash('sha256').update(expiringToken).digest('hex'))
      expect(after.rows[1]?.consumed_at).toBeNull()
    } finally {
      setAuthClock(undefined)
      setEmailPort(undefined)
      setEmailVerificationStore(undefined)
      setPasswordResetStore(undefined)
      resetAuthRateWindow()
      resetPasswordResetRateWindow()
      await app.close()
      await closeAccountStore()
      if (previousDatabaseUrl === undefined) {
        delete process.env['DATABASE_URL']
      } else {
        process.env['DATABASE_URL'] = previousDatabaseUrl
      }
    }
  }, 60_000)

  it('reads every founder value by key, with both reach-mode strings in the migration and in api code', async () => {
    expect(migrated).toBe(true)
    expect(free_unlimited).toBe('free_unlimited')
    expect(same_quota_as_brothers).toBe('same_quota_as_brothers')

    const sql = migrationSql()
    expect(sql).toContain(free_unlimited)
    expect(sql).toContain(same_quota_as_brothers)
    expect(sql).not.toContain(`('brother_invite_quota_premium', '15')`)
    const everySql = readdirSync(join(apiRoot, 'drizzle'))
      .filter((name) => name.endsWith('.sql'))
      .sort()
      .map((name) => readFileSync(join(apiRoot, 'drizzle', name), 'utf8'))
      .join('\n')
    for (const [key, value] of Object.entries(founderValues)) {
      expect(everySql).toContain(`('${key}', '${value}')`)
    }

    const result = await db().query<{ key: string; value: string }>(
      `select "key", "value" from "operator_config"`,
    )
    const actual = new Map(result.rows.map((row) => [row.key, row.value]))
    expect(actual.size).toBe(Object.keys(liveValues).length)
    for (const [key, value] of Object.entries(liveValues)) {
      expect(actual.get(key)).toBe(value)
    }
    // Decision 2026-10-23 (Fay): every Free-tier limit applies the same to Sisters and Brothers.
    expect(actual.get('sister_reach_mode')).toBe(same_quota_as_brothers)
    const invitesSql = readFileSync(join(apiRoot, 'drizzle', '0021_invite.sql'), 'utf8')
    expect(invitesSql).toContain(
      `UPDATE "operator_config" SET "value" = 'same_quota_as_brothers' WHERE "key" = 'sister_reach_mode' AND "value" = 'free_unlimited'`,
    )
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
    expect(await publicTables(db())).toEqual([
      'account',
      'audit_event',
      'cil_ticket',
      'conversation',
      'credential',
      'derivative',
      'discovery_exclusion',
      'email_verification',
      'favourite',
      'invite',
      'invite_quota',
      'liveness_challenge',
      'operator_config',
      'password_reset',
      'photo_asset',
      'pin_lock',
      'profile',
      'profile_visit',
      'session',
      'signed_grant',
      'sms_dispatch',
      'staff_credential',
      'strike',
      'verification_record',
    ])
    expect(await userTables(db())).toEqual([
      'drizzle.__drizzle_migrations',
      'public.account',
      'public.audit_event',
      'public.cil_ticket',
      'public.conversation',
      'public.credential',
      'public.derivative',
      'public.discovery_exclusion',
      'public.email_verification',
      'public.favourite',
      'public.invite',
      'public.invite_quota',
      'public.liveness_challenge',
      'public.operator_config',
      'public.password_reset',
      'public.photo_asset',
      'public.pin_lock',
      'public.profile',
      'public.profile_visit',
      'public.session',
      'public.signed_grant',
      'public.sms_dispatch',
      'public.staff_credential',
      'public.strike',
      'public.verification_record',
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
    // Both values stay valid after the 2026-10-23 default change (the Story 4.7 switch writes either).
    await db().query(`update "operator_config" set "value" = $1 where "key" = 'sister_reach_mode'`, [free_unlimited])
    const freeAllowed = await db().query<{ value: string }>(
      `select "value" from "operator_config" where "key" = 'sister_reach_mode'`,
    )
    expect(freeAllowed.rows).toEqual([{ value: free_unlimited }])
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
      same_quota_as_brothers,
    ])
    await db().query(`update "operator_config" set "value" = '10' where "key" = 'daily_message_cap'`)
  })

  it('keeps 0013 as history and allows many live photos with one main', async () => {
    expect(migrated).toBe(true)
    const historical = readFileSync(join(apiRoot, 'drizzle/0013_photo_replaced.sql'), 'utf8')
    expect(historical.indexOf('CREATE UNIQUE INDEX')).toBeGreaterThan(historical.indexOf("SET \"moderation_state\" = 'replaced'"))
    const gallery = readFileSync(join(apiRoot, 'drizzle/0015_profile_photo_gallery.sql'), 'utf8')
    expect(gallery).toContain('DROP INDEX "photo_asset_one_live_profile_photo"')
    expect(gallery).toContain('photo_asset_one_main_profile_photo')
    expect(gallery).toContain('"photo_blur" boolean DEFAULT true NOT NULL')

    const owner = '018f3a40-7c2a-7000-8000-0000000000a1'
    const older = '018f3a40-7c2a-7000-8000-0000000000a2'
    const newer = '018f3a40-7c2a-7000-8000-0000000000a3'
    await db().query(
      `insert into "account" ("id", "email", "pseudonym", "gender", "roles", "status", "age_attested", "coc_version", "civil_given_name", "civil_family_name")
       values ($1, 'replaced-probe@example.bf', 'ReplacedProbe', 'sister', '{member}', 'Active', true, 'FR-089', 'Amina', 'Sawadogo')`,
      [owner],
    )
    await db().query(
      `insert into "profile" ("account_id", "dob") values ($1, '1990-01-15')`,
      [owner],
    )
    const blur = await db().query<{ photo_blur: boolean }>(
      `select "photo_blur" from "profile" where "account_id" = $1`,
      [owner],
    )
    expect(blur.rows).toEqual([{ photo_blur: true }])
    await db().query(
      `insert into "photo_asset" ("id", "owner_id", "kind", "original_key", "moderation_state", "is_main") values ($1, $2, 'profile_photo', 'older', 'live', true)`,
      [older, owner],
    )
    await db().query(
      `insert into "photo_asset" ("id", "owner_id", "kind", "original_key", "moderation_state") values ($1, $2, 'profile_photo', 'newer', 'live')`,
      [newer, owner],
    )
    const rows = await db().query<{ id: string; moderation_state: string; is_main: boolean }>(
      `select "id", "moderation_state", "is_main" from "photo_asset" where "owner_id" = $1 order by "id"`,
      [owner],
    )
    expect(rows.rows).toEqual([
      { id: older, moderation_state: 'live', is_main: true },
      { id: newer, moderation_state: 'live', is_main: false },
    ])
    let secondMain = false
    try {
      await db().query(`update "photo_asset" set "is_main" = true where "id" = $1`, [newer])
    } catch (error) {
      secondMain = true
      expect(postgresCode(error)).toBe('23505')
    }
    expect(secondMain).toBe(true)
    let pendingMain = false
    try {
      await db().query(
        `insert into "photo_asset" ("id", "owner_id", "kind", "original_key", "moderation_state", "is_main") values ($1, $2, 'profile_photo', 'pending', 'pending', true)`,
        ['018f3a40-7c2a-7000-8000-0000000000a4', owner],
      )
    } catch (error) {
      pendingMain = true
      expect(postgresCode(error)).toBe('23514')
    }
    expect(pendingMain).toBe(true)
    await db().query('begin')
    const locked = await db().query<{ locked: string }>(
      `select pg_advisory_xact_lock(('x' || substr(md5($1), 1, 16))::bit(64)::bigint) as locked`,
      [owner],
    )
    expect(locked.rows).toHaveLength(1)
    await db().query('commit')
    await db().query(`delete from "photo_asset" where "owner_id" = $1`, [owner])
    await db().query(`delete from "profile" where "account_id" = $1`, [owner])
    await db().query(`delete from "account" where "id" = $1`, [owner])
  })

  it('stores one photo_floor strike when the same evidence is inserted twice', async () => {
    expect(migrated).toBe(true)
    const accountId = '018f3a40-7c2a-7000-8000-0000000000b1'
    const first = '018f3a40-7c2a-7000-8000-0000000000b2'
    const second = '018f3a40-7c2a-7000-8000-0000000000b3'
    const evidence = 'photo_asset:018f3a40-7c2a-7000-8000-0000000000b4'
    await db().query(
      `insert into "account" ("id", "email", "pseudonym", "gender", "roles", "status", "age_attested", "coc_version", "civil_given_name", "civil_family_name")
       values ($1, 'strike-floor@example.bf', 'Strike_Floor', 'sister', $2, 'Active', true, 'FR-089', 'Awa', 'Sawadogo')`,
      [accountId, ['member']],
    )
    const insert = `insert into "strike" ("id", "account_id", "case_id", "ladder", "evidence")
       values ($1, $2, null, 'photo_floor', $3)
       on conflict ("evidence") where "ladder" = 'photo_floor' do nothing`
    await db().query(insert, [first, accountId, evidence])
    await db().query(insert, [second, accountId, evidence])
    const rows = await db().query<{ id: string; case_id: string | null }>(
      `select "id", "case_id" from "strike" where "account_id" = $1`,
      [accountId],
    )
    expect(rows.rows).toEqual([{ id: first, case_id: null }])
    await db().query(`delete from "strike" where "account_id" = $1`, [accountId])
    await db().query(`delete from "account" where "id" = $1`, [accountId])
  })

  it('keeps one favourite grain, orders by created_at then target_id, and deletes the row', async () => {
    expect(migrated).toBe(true)
    const owner = '018f3a40-7c2a-7000-8000-0000000000c1'
    const older = '018f3a40-7c2a-7000-8000-0000000000c2'
    const newer = '018f3a40-7c2a-7000-8000-0000000000c3'
    const insertAccount = `insert into "account" ("id", "email", "pseudonym", "gender", "roles", "status", "age_attested", "coc_version", "civil_given_name", "civil_family_name")
       values ($1, $2, $3, 'sister', $4, 'Active', true, 'FR-089', 'Awa', 'Sawadogo')`
    await db().query(insertAccount, [owner, 'fav-owner@example.bf', 'Fav_Owner', ['member']])
    await db().query(insertAccount, [older, 'fav-older@example.bf', 'Fav_Older', ['member']])
    await db().query(insertAccount, [newer, 'fav-newer@example.bf', 'Fav_Newer', ['member']])
    await db().query(
      `insert into "favourite" ("account_id", "target_id", "created_at") values ($1, $2, $3)`,
      [owner, older, '2026-10-13T12:00:00.000Z'],
    )
    await db().query(
      `insert into "favourite" ("account_id", "target_id", "created_at") values ($1, $2, $3)`,
      [owner, newer, '2026-10-13T12:00:01.000Z'],
    )
    let duplicate = false
    try {
      await db().query(
        `insert into "favourite" ("account_id", "target_id", "created_at") values ($1, $2, $3)`,
        [owner, older, '2026-10-13T12:00:02.000Z'],
      )
    } catch (error) {
      duplicate = true
      expect(postgresCode(error)).toBe('23505')
    }
    expect(duplicate).toBe(true)
    const listed = await db().query<{ target_id: string }>(
      `select "target_id" from "favourite" where "account_id" = $1 order by "created_at" desc, "target_id" desc`,
      [owner],
    )
    expect(listed.rows.map((row) => row.target_id)).toEqual([newer, older])
    await db().query(`update "favourite" set "created_at" = '2026-10-13T12:00:00.000Z' where "account_id" = $1`, [owner])
    const tied = await db().query<{ target_id: string }>(
      `select "target_id" from "favourite" where "account_id" = $1 order by "created_at" desc, "target_id" desc`,
      [owner],
    )
    expect(tied.rows.map((row) => row.target_id)).toEqual([newer, older])
    await db().query(`delete from "favourite" where "account_id" = $1 and "target_id" = $2`, [owner, newer])
    const left = await db().query<{ target_id: string }>(
      `select "target_id" from "favourite" where "account_id" = $1`,
      [owner],
    )
    expect(left.rows).toEqual([{ target_id: older }])
    await db().query(`delete from "favourite" where "account_id" = $1`, [owner])
    await db().query(`delete from "account" where "id" = any($1::uuid[])`, [[owner, older, newer]])
  })
  it('stores invites with one pending per pair and a guarded Ouaga-day quota on migrated Postgres (Stories 4.1, 4.2)', async () => {
    expect(migrated).toBe(true)
    const previousDatabaseUrl = process.env['DATABASE_URL']
    process.env['DATABASE_URL'] = databaseUrl
    setAccountStore(undefined)
    setInviteStore(undefined)
    setInviteConfigReader(undefined)
    const at = new Date('2026-10-23T10:00:00.000Z')
    const brother = newId(at)
    const sisters = Array.from({ length: 6 }, () => newId(at))
    const insertAccount = `insert into "account" ("id", "email", "pseudonym", "gender", "roles", "status", "age_attested", "coc_version", "civil_given_name", "civil_family_name")
       values ($1, $2, $3, $4, $5, 'Active', true, 'FR-089', 'Awa', 'Sawadogo')`
    await db().query(insertAccount, [brother, 'inv-b@example.bf', 'Inv_B', 'brother', ['member']])
    for (const [index, id] of sisters.entries()) {
      await db().query(insertAccount, [id, `inv-s${index}@example.bf`, `Inv_S${index}`, 'sister', ['member']])
    }
    const row = (to: string, offset = 0): InviteRow => {
      const when = new Date(at.getTime() + offset)
      return { id: newId(when), from_id: brother, to_id: to, state: 'pending', created_at: when.toISOString() }
    }
    try {
      expect(await readInviteConfig()).toEqual({ sisterReachMode: same_quota_as_brothers, freeCap: 3, premiumCap: null })
      const store = getInviteStore()
      const charge = { day: '2026-10-23', cap: 3 }
      const first = await store.send(row(sisters[0] ?? '', 1), charge)
      expect(first).toMatchObject({ ok: true, sentCount: 1 })
      const duplicate = await store.send(row(sisters[0] ?? '', 2), charge)
      expect(duplicate).toMatchObject({ ok: false, reason: 'duplicate' })
      expect(await store.quotaCount(brother, '2026-10-23')).toBe(1)
      expect((await store.send(row(sisters[1] ?? '', 3), charge)).ok).toBe(true)
      const raced = await Promise.all([
        store.send(row(sisters[2] ?? '', 4), charge),
        store.send(row(sisters[3] ?? '', 5), charge),
      ])
      expect(raced.filter((item) => item.ok)).toHaveLength(1)
      expect(raced.filter((item) => !item.ok && item.reason === 'quota')).toHaveLength(1)
      expect(await store.quotaCount(brother, '2026-10-23')).toBe(3)
      const counted = await db().query<{ count: string }>(
        `select count(*)::text as count from "invite" where "from_id" = $1`,
        [brother],
      )
      expect(counted.rows[0]?.count).toBe('3')
      expect(await store.send(row(sisters[4] ?? '', 6), { day: '2026-10-23', cap: null })).toMatchObject({ ok: true, sentCount: 4 })
      expect(await store.send(row(sisters[5] ?? '', 7), { day: '2026-10-24', cap: 3 })).toMatchObject({ ok: true, sentCount: 1 })
      expect(await store.countSentSince(brother, at)).toBe(5)
      expect(await store.countSentSince(brother, new Date(at.getTime() + 6))).toBe(2)
      const received = await store.list(sisters[0] ?? '', 'received')
      expect(received.map((item) => item.from_id)).toEqual([brother])
      const sent = await store.list(brother, 'sent')
      expect(sent).toHaveLength(5)
      expect(sent.map((item) => item.id)).toEqual(sent.map((item) => item.id).sort().reverse())

      let selfRefused = false
      try {
        await db().query(`insert into "invite" ("id", "from_id", "to_id", "state", "created_at") values ($1, $2, $2, 'pending', now())`, [
          newId(at),
          brother,
        ])
      } catch (error) {
        selfRefused = true
        expect(postgresCode(error)).toBe('23514')
      }
      expect(selfRefused).toBe(true)
      await db().query(`update "operator_config" set "value" = 'abc' where "key" = 'brother_invite_quota_free'`)
      expect(await readInviteConfig()).toBeNull()
      await db().query(`update "operator_config" set "value" = '3' where "key" = 'brother_invite_quota_free'`)
      await db().query(`update "operator_config" set "value" = $1 where "key" = 'sister_reach_mode'`, [free_unlimited])
      expect((await readInviteConfig())?.sisterReachMode).toBe(free_unlimited)
      await db().query(`update "operator_config" set "value" = $1 where "key" = 'sister_reach_mode'`, [same_quota_as_brothers])
    } finally {
      await db().query(`delete from "invite_quota" where "account_id" = $1`, [brother])
      await db().query(`delete from "invite" where "from_id" = $1`, [brother])
      await db().query(`delete from "account" where "id" = any($1::uuid[])`, [[brother, ...sisters]])
      await closeAccountStore()
      if (previousDatabaseUrl === undefined) {
        delete process.env['DATABASE_URL']
      } else {
        process.env['DATABASE_URL'] = previousDatabaseUrl
      }
    }
  }, 60_000)

  it('accepts in one transaction with ChatPort.openFromInvite, declines quietly, and keeps one conversation per invite on migrated Postgres (Stories 4.4, 4.5)', async () => {
    expect(migrated).toBe(true)
    const previousDatabaseUrl = process.env['DATABASE_URL']
    process.env['DATABASE_URL'] = databaseUrl
    setAccountStore(undefined)
    setInviteStore(undefined)
    setChatPort(undefined)
    const at = new Date('2026-10-23T10:00:00.000Z')
    const brother = newId(at)
    const sisters = Array.from({ length: 3 }, () => newId(at))
    const insertAccount = `insert into "account" ("id", "email", "pseudonym", "gender", "roles", "status", "age_attested", "coc_version", "civil_given_name", "civil_family_name")
       values ($1, $2, $3, $4, $5, 'Active', true, 'FR-089', 'Awa', 'Sawadogo')`
    await db().query(insertAccount, [brother, 'inbox-b@example.bf', 'Inbox_B', 'brother', ['member']])
    for (const [index, id] of sisters.entries()) {
      await db().query(insertAccount, [id, `inbox-s${index}@example.bf`, `Inbox_S${index}`, 'sister', ['member']])
    }
    const rows = sisters.map((to, index): InviteRow => {
      const when = new Date(at.getTime() + index + 1)
      return { id: newId(when), from_id: brother, to_id: to, state: 'pending', created_at: when.toISOString() }
    })
    try {
      const store = getInviteStore()
      for (const row of rows) {
        expect((await store.send(row, { day: '2026-10-23', cap: null })).ok).toBe(true)
      }
      const [first, second, third] = rows as [InviteRow, InviteRow, InviteRow]
      expect(await store.quotaCount(brother, '2026-10-23')).toBe(3)
      const acceptedAt = '2026-10-23T11:00:00.000Z'

      // Only the recipient can move the row: the sender's id matches nothing.
      expect(await store.accept(first.id, brother, acceptedAt, at)).toEqual({ ok: false, reason: 'missing' })
      const raced = await Promise.all([
        store.accept(first.id, first.to_id, acceptedAt, at),
        store.accept(first.id, first.to_id, acceptedAt, at),
      ])
      expect(raced.every((item) => item.ok)).toBe(true)
      expect(raced.filter((item) => item.ok && item.changed)).toHaveLength(1)
      const opened = raced[0]?.ok ? raced[0].conversation : null
      expect(opened).toMatchObject({ invite_id: first.id, stage: 'chat' })
      expect(raced[1]?.ok ? raced[1].conversation?.id : null).toBe(opened?.id)
      const conversations = await db().query<{ invite_id: string; stage: string }>(
        `select "invite_id", "stage" from "conversation" where "invite_id" = any($1::uuid[])`,
        [rows.map((row) => row.id)],
      )
      expect(conversations.rows).toEqual([{ invite_id: first.id, stage: 'chat' }])
      const stored = await db().query<{ state: string; sister_accepted_at: Date }>(
        `select "state", "sister_accepted_at" from "invite" where "id" = $1`,
        [first.id],
      )
      expect(stored.rows[0]?.state).toBe('accepted')
      expect(stored.rows[0]?.sister_accepted_at.toISOString()).toBe(acceptedAt)

      // Decline: no conversation, idempotent, then accept refused. An accepted invite cannot be declined.
      expect(await store.decline(second.id, second.to_id)).toMatchObject({ ok: true, changed: true, row: { state: 'declined' } })
      expect(await store.decline(second.id, second.to_id)).toMatchObject({ ok: true, changed: false })
      expect(await store.accept(second.id, second.to_id, acceptedAt, at)).toMatchObject({ ok: false, reason: 'not_pending' })
      expect(await store.decline(first.id, first.to_id)).toMatchObject({ ok: false, reason: 'not_pending', row: { state: 'accepted' } })

      // A parallel accept and decline leave exactly one outcome, with a conversation only for accepted.
      const mixed = await Promise.all([store.accept(third.id, third.to_id, acceptedAt, at), store.decline(third.id, third.to_id)])
      expect(mixed.filter((item) => item.ok)).toHaveLength(1)
      const thirdState = (await store.find(third.id))?.state
      const thirdConversations = await db().query(`select 1 from "conversation" where "invite_id" = $1`, [third.id])
      expect(thirdConversations.rowCount).toBe(thirdState === 'accepted' ? 1 : 0)

      expect((await store.list(brother, 'accepted')).map((row) => row.id)).toEqual(
        thirdState === 'accepted' ? [third.id, first.id] : [first.id],
      )
      expect((await store.list(first.to_id, 'accepted')).map((row) => row.id)).toEqual([first.id])
      expect((await store.between(brother, second.to_id)).map((row) => row.state)).toEqual(['declined'])
      expect((await getChatPort().conversationsForInvites([first.id, second.id])).map((row) => row.invite_id)).toEqual([first.id])

      // The schema keeps one conversation per invite and the four stages only.
      let duplicate = false
      try {
        await db().query(`insert into "conversation" ("id", "invite_id", "stage") values ($1, $2, 'chat')`, [newId(at), first.id])
      } catch (error) {
        duplicate = true
        expect(postgresCode(error)).toBe('23505')
      }
      expect(duplicate).toBe(true)
      let badStage = false
      try {
        await db().query(`insert into "conversation" ("id", "invite_id", "stage") values ($1, $2, 'pending')`, [newId(at), second.id])
      } catch (error) {
        badStage = true
        expect(postgresCode(error)).toBe('23514')
      }
      expect(badStage).toBe(true)
      // The quota is never touched by accept or decline (no count, no refund).
      expect(await store.quotaCount(brother, '2026-10-23')).toBe(3)
    } finally {
      await db().query(`delete from "conversation" where "invite_id" = any($1::uuid[])`, [rows.map((row) => row.id)])
      await db().query(`delete from "invite_quota" where "account_id" = $1`, [brother])
      await db().query(`delete from "invite" where "from_id" = $1`, [brother])
      await db().query(`delete from "account" where "id" = any($1::uuid[])`, [[brother, ...sisters]])
      await closeAccountStore()
      if (previousDatabaseUrl === undefined) {
        delete process.env['DATABASE_URL']
      } else {
        process.env['DATABASE_URL'] = previousDatabaseUrl
      }
    }
  }, 60_000)

  it('provisions a staff account and signs it in with TOTP on migrated Postgres (Story 12.1)', async () => {
    expect(migrated).toBe(true)
    const previousDatabaseUrl = process.env['DATABASE_URL']
    process.env['DATABASE_URL'] = databaseUrl
    setStaffMfaKey({ key: Buffer.alloc(32, 0x5a), kid: 'test-staff-mfa' })
    const cookieId = (cookie: string) => /ankanu_session=([^;]+)/.exec(cookie)?.[1] ?? ''
    try {
      const created = await createStaffAccount({ email: 'Staff.Pg@Example.bf', role: 'moderator' })
      expect(created.ok).toBe(true)
      if (!created.ok) return
      expect((await createStaffAccount({ email: 'staff.pg@example.bf', role: 'operator' })).ok).toBe(false)
      const row = await db().query<{ gender: string; roles: string[]; status: string }>(
        `select "gender", "roles", "status" from "account" where "id" = $1`,
        [created.accountId],
      )
      expect(row.rows[0]).toEqual({ gender: 'none', roles: ['moderator'], status: 'Active' })
      // A gender-less account must be staff-only; a member stays sister or brother.
      let refused = ''
      try {
        await db().query(
          `insert into "account" ("id", "email", "pseudonym", "gender", "roles", "status", "age_attested", "coc_version", "civil_given_name", "civil_family_name")
           values ('018f3a40-7c2a-7000-8000-0000000000d1', 'none-member@example.bf', 'None_Member', 'none', $1, 'Active', true, 'FR-089', 'A', 'B')`,
          [['member']],
        )
      } catch (error) {
        refused = postgresCode(error) ?? ''
      }
      expect(refused).toBe('23514')

      const opened = await signInStaff({ email: 'staff.pg@example.bf', password: created.oneTimePassword })
      expect(opened.ok).toBe(true)
      if (!opened.ok) return
      expect(opened.body.mfa_state).toBe('password_change')
      const pendingId = cookieId(opened.cookie)
      let pending = await loadStaffSessionById(pendingId)
      expect(pending?.mfa_state).toBe('password_change')
      const kind = await db().query<{ kind: string; mfa_state: string }>(`select "kind", "mfa_state" from "session" where "id" = $1`, [pendingId])
      expect(kind.rows[0]).toEqual({ kind: 'staff', mfa_state: 'password_change' })
      let badState = ''
      try {
        await db().query(`update "session" set "kind" = 'web' where "id" = $1`, [pendingId])
      } catch (error) {
        badState = postgresCode(error) ?? ''
      }
      expect(badState).toBe('23514')

      if (!pending) return
      expect((await changeStaffPassword(pending, { new_password: 'phrase staff postgres' })).ok).toBe(true)
      pending = await loadStaffSessionById(pendingId)
      if (!pending) return
      const enrollment = await readEnrollment(pending)
      expect(enrollment.ok).toBe(true)
      if (!enrollment.ok) return
      const secret = enrollment.body.secret.replace(/\s/g, '')
      const verified = await verifyStaffCode(pending, { code: totpCode(secret, new Date()) })
      expect(verified.ok).toBe(true)
      if (!verified.ok) return
      const factors = await db().query<{ totp_sealed: string; totp_pending_sealed: string | null; totp_last_step: string }>(
        `select "totp_sealed", "totp_pending_sealed", "totp_last_step"::text from "staff_credential" where "account_id" = $1`,
        [created.accountId],
      )
      expect(factors.rows[0]?.totp_pending_sealed).toBeNull()
      expect(factors.rows[0]?.totp_sealed).not.toContain(secret)
      const lastStep = Number(factors.rows[0]?.totp_last_step)
      expect(await getStaffStore().consumeStep(created.accountId, lastStep, {}, [])).toBe(false)
      expect((await loadStaffSessionById(cookieId(verified.cookie)))?.mfa_state).toBe('done')
      expect(await loadStaffSessionById(pendingId)).toBeNull()

      expect((await resetStaffMfa({ email: 'staff.pg@example.bf' })).ok).toBe(true)
      expect(await loadStaffSessionById(cookieId(verified.cookie))).toBeNull()
      expect((await disableStaffAccount({ email: 'staff.pg@example.bf' })).ok).toBe(true)
      const disabled = await signInStaff({ email: 'staff.pg@example.bf', password: 'phrase staff postgres' })
      expect(disabled.ok).toBe(false)

      const actions = await db().query<{ action: string; payload: Record<string, string> }>(
        `select "action", "payload" from "audit_event" where "action" like 'staff_%'`,
      )
      expect(new Set(actions.rows.map((item) => item.action))).toEqual(
        new Set([
          'staff_account_created',
          'staff_password_changed',
          'staff_mfa_enrolled',
          'staff_sign_in',
          'staff_mfa_reset',
          'staff_account_disabled',
          'staff_sign_in_failure',
        ]),
      )
      const text = JSON.stringify(actions.rows)
      expect(text).not.toContain(created.oneTimePassword)
      expect(text).not.toContain(secret)
      expect(text).not.toContain('phrase staff postgres')
    } finally {
      setStaffMfaKey(undefined)
      await closeAccountStore()
      if (previousDatabaseUrl === undefined) {
        delete process.env['DATABASE_URL']
      } else {
        process.env['DATABASE_URL'] = previousDatabaseUrl
      }
    }
  }, 60_000)

  it('counts staff code attempts atomically, refuses a staff session without a step, and a duplicate create (Story 12.1, QA round 1)', async () => {
    expect(migrated).toBe(true)
    const previousDatabaseUrl = process.env['DATABASE_URL']
    process.env['DATABASE_URL'] = databaseUrl
    setStaffMfaKey({ key: Buffer.alloc(32, 0x5a), kid: 'test-staff-mfa' })
    try {
      // F9: two creates of one email at the same time. One wins; the other is a clean refusal.
      const raced = await Promise.all([
        createStaffAccount({ email: 'race.pg@example.bf', role: 'moderator' }),
        createStaffAccount({ email: 'race.pg@example.bf', role: 'operator' }),
      ])
      expect(raced.filter((item) => item.ok)).toHaveLength(1)
      const loser = raced.find((item) => !item.ok)
      expect(loser).toEqual({ ok: false, message: 'An account already uses this email. Nothing was changed.' })
      const winner = raced.find((item) => item.ok)
      if (!winner?.ok) return
      const rows = await db().query(`select "id" from "account" where "email" = 'race.pg@example.bf'`)
      expect(rows.rows).toHaveLength(1)

      // F3: a staff session always carries its MFA step.
      let nullState = ''
      try {
        await db().query(
          `insert into "session" ("id", "account_id", "kind", "expires_at", "last_seen_at", "mfa_state") values ($1, $2, 'staff', now() + interval '1 hour', now(), null)`,
          [newId(new Date()), winner.accountId],
        )
      } catch (error) {
        nullState = postgresCode(error) ?? ''
      }
      expect(nullState).toBe('23514')

      // F1: 40 wrong codes at once on 40 pending sessions of one account. At most 5 are checked; one lock event.
      await db().query(`update "staff_credential" set "must_change_password" = false where "account_id" = $1`, [winner.accountId])
      const enrollmentPending = newId(new Date())
      await getStaffStore().insertSession({
        id: enrollmentPending,
        account_id: winner.accountId,
        expires_at: new Date(Date.now() + 3_600_000),
        last_seen_at: new Date(),
        mfa_state: 'enroll',
      })
      const enrolling = await loadStaffSessionById(enrollmentPending)
      if (!enrolling) throw new Error('pending session')
      const enrollment = await readEnrollment(enrolling)
      if (!enrollment.ok) throw new Error('enrollment')
      const secret = enrollment.body.secret.replace(/\s/g, '')
      await db().query(`update "staff_credential" set "totp_sealed" = "totp_pending_sealed", "totp_pending_sealed" = null where "account_id" = $1`, [winner.accountId])
      const ids: string[] = []
      for (let index = 0; index < 40; index += 1) {
        const id = newId(new Date())
        ids.push(id)
        await getStaffStore().insertSession({
          id,
          account_id: winner.accountId,
          expires_at: new Date(Date.now() + 3_600_000),
          last_seen_at: new Date(),
          mfa_state: 'verify',
        })
      }
      const views = await Promise.all(ids.map((id) => loadStaffSessionById(id)))
      const now = new Date()
      const valid = new Set([-1, 0, 1].map((offset) => totpCode(secret, now, offset)))
      const wrong = ['000000', '111111', '222222', '333333'].find((item) => !valid.has(item)) ?? '444444'
      const results = await Promise.all(views.map((view) => (view ? verifyStaffCode(view, { code: wrong }, now) : null)))
      const statuses = results.map((item) => (item === null ? 0 : item.ok ? 200 : item.status))
      expect(statuses.filter((item) => item === 401)).toHaveLength(4)
      expect(statuses.filter((item) => item === 429)).toHaveLength(36)
      const audit = await db().query<{ action: string; n: string }>(
        `select "action", count(*)::text as n from "audit_event" where "action" in ('staff_sign_in_failure', 'staff_sign_in_locked') and "payload"->>'account_id' = $1 group by "action"`,
        [winner.accountId],
      )
      expect(Object.fromEntries(audit.rows.map((row) => [row.action, row.n]))).toEqual({
        staff_sign_in_failure: '5',
        staff_sign_in_locked: '1',
      })
      const lock = await db().query<{ failed_codes: number; locked: boolean }>(
        `select "failed_codes", "locked_until" > now() as locked from "staff_credential" where "account_id" = $1`,
        [winner.accountId],
      )
      expect(lock.rows[0]).toEqual({ failed_codes: 5, locked: true })
      const live = await db().query(`select 1 from "session" where "account_id" = $1 and "expires_at" > now()`, [winner.accountId])
      expect(live.rows).toHaveLength(0)
    } finally {
      setStaffMfaKey(undefined)
      await closeAccountStore()
      if (previousDatabaseUrl === undefined) {
        delete process.env['DATABASE_URL']
      } else {
        process.env['DATABASE_URL'] = previousDatabaseUrl
      }
    }
  }, 60_000)

  it('lets staff sign in over a PIN-locked member cookie on migrated Postgres (Story 12.1, round 3)', async () => {
    expect(migrated).toBe(true)
    const previousDatabaseUrl = process.env['DATABASE_URL']
    process.env['DATABASE_URL'] = databaseUrl
    setAccountStore(undefined)
    setStaffMfaKey({ key: Buffer.alloc(32, 0x5a), kid: 'test-staff-mfa' })
    resetAuthRateWindow()
    let clock = new Date()
    setAuthClock(() => clock)
    const app = await createApp()
    await app.listen(0, '127.0.0.1')
    try {
      const address = app.getHttpServer().address() as AddressInfo | string | null
      if (address === null || typeof address === 'string') throw new Error('expected a TCP port')
      const base = `http://127.0.0.1:${address.port}`
      const post = (path: string, body: unknown, cookie = '') =>
        fetch(`${base}${path}`, {
          method: 'POST',
          headers: { 'content-type': 'application/json', ...(cookie ? { cookie } : {}) },
          body: JSON.stringify(body),
        })
      const member = await post('/v1/accounts', {
        email: 'pin.member@example.bf',
        password: 'phrase avec espaces',
        pseudonym: 'Pin_Member',
        gender: 'sister',
        pledge_accepted: true,
        civil_given_name: 'Awa',
        civil_family_name: 'Ouedraogo',
        recaptcha_token: 'test-ok',
        coc_version: 'FR-089',
        dob: '1991-02-03',
      })
      expect(member.status).toBe(201)
      const signed = await post('/v1/sessions', {
        identifier: 'pin.member@example.bf',
        password: 'phrase avec espaces',
        remember_me: false,
        recaptcha_token: 'test-ok',
      })
      expect(signed.status).toBe(201)
      const memberCookie = /ankanu_session=[^;]+/.exec(signed.headers.get('set-cookie') ?? '')?.[0] ?? ''
      const pin = await fetch(`${base}/v1/pin`, {
        method: 'PUT',
        headers: { cookie: memberCookie, 'content-type': 'application/json' },
        body: JSON.stringify({ pin: '246813' }),
      })
      expect(pin.status).toBeLessThan(300)
      clock = new Date(clock.getTime() + 16 * 60_000)
      const locked = await fetch(`${base}/v1/health`, { headers: { cookie: memberCookie } })
      expect(locked.status).toBe(401)
      expect(await locked.json()).toMatchObject({ error: { code: 'PIN_REQUIRED' } })

      const probe = await fetch(`${base}/v1/staff/sessions/current`, { headers: { cookie: memberCookie } })
      expect(probe.status).toBe(403)
      const created = await createStaffAccount({ email: 'pin.staff@example.bf', role: 'operator' })
      if (!created.ok) throw new Error(created.message)
      const opened = await post(
        '/v1/staff/sessions',
        { email: 'pin.staff@example.bf', password: created.oneTimePassword, recaptcha_token: 'test-ok' },
        memberCookie,
      )
      expect(opened.status).toBe(201)
      expect(await opened.json()).toMatchObject({ kind: 'staff', mfa_state: 'password_change' })
      const staffCookie = /ankanu_session=[^;]+/.exec(opened.headers.get('set-cookie') ?? '')?.[0] ?? ''
      expect(staffCookie).not.toBe(memberCookie)
      const current = await fetch(`${base}/v1/staff/sessions/current`, { headers: { cookie: staffCookie } })
      expect(current.status).toBe(200)
      // The member session row stays as it was: still there, still locked.
      expect((await fetch(`${base}/v1/health`, { headers: { cookie: memberCookie } })).status).toBe(401)
    } finally {
      setAuthClock(undefined)
      resetAuthRateWindow()
      setStaffMfaKey(undefined)
      await app.close()
      await closeAccountStore()
      if (previousDatabaseUrl === undefined) {
        delete process.env['DATABASE_URL']
      } else {
        process.env['DATABASE_URL'] = previousDatabaseUrl
      }
    }
  }, 60_000)

  it('keeps the liveness challenge single-use and the Moderator decision atomic on migrated Postgres (staff review console)', async () => {
    expect(migrated).toBe(true)
    const previousDatabaseUrl = process.env['DATABASE_URL']
    process.env['DATABASE_URL'] = databaseUrl
    const member = '018f3a40-7c2a-7000-8000-0000000000e1'
    const minor = '018f3a40-7c2a-7000-8000-0000000000e2'
    const staff = '018f3a40-7c2a-7000-8000-0000000000e3'
    const insertAccount = `insert into "account" ("id", "email", "pseudonym", "gender", "roles", "status", "age_attested", "coc_version", "civil_given_name", "civil_family_name")
       values ($1, $2, $3, $4, $5, 'Active', true, 'FR-089', 'Awa', 'Sawadogo')`
    try {
      await db().query(insertAccount, [member, 'review-pg@example.bf', 'Review_Pg', 'sister', ['member']])
      await db().query(insertAccount, [minor, 'minor-pg@example.bf', 'Minor_Pg', 'sister', ['member']])
      await db().query(insertAccount, [staff, 'moderator-pg@example.bf', 'Moderator_Pg', 'none', ['moderator']])
      for (const id of [member, minor]) {
        await db().query(
          `insert into "profile" ("account_id", "dob", "visibility", "review_passed_at") values ($1, '1995-03-02', 'unpublished', now())`,
          [id],
        )
        await db().query(
          `insert into "verification_record" ("id", "account_id", "kind", "status") values ($1, $2, 'phone_otp', 'granted')`,
          [newId(new Date()), id],
        )
      }
      const store = getCaptureStore()
      const soon = new Date(Date.now() + 600_000)
      await store.issueChallenge({ id: newId(new Date()), account_id: member, pose: 'look_left', expires_at: soon })
      const challengeId = newId(new Date(Date.now() + 1))
      await store.issueChallenge({ id: challengeId, account_id: member, pose: 'thumbs_up', expires_at: soon })
      expect(await store.challenge(member)).toMatchObject({ id: challengeId, pose: 'thumbs_up' })
      const selfie = (id: string, accountId = member) => ({
        id,
        account_id: accountId,
        kind: 'liveness' as const,
        status: 'pending' as const,
        vendor: null,
        evidence_uri: `s3://ankanu/verification/${accountId}/${id}.json`,
        phone_e164: null,
        hash: null,
        expires_at: null,
        pose: 'thumbs_up' as const,
      })
      const firstId = nextRecordId(new Date())
      const secondId = nextRecordId(new Date())
      const raced = await Promise.all([
        store.save(selfie(firstId), { challengeId, now: new Date() }),
        store.save(selfie(secondId), { challengeId, now: new Date() }),
      ])
      expect([...raced].sort()).toEqual(['challenge_gone', 'saved'])
      const kept = raced[0] === 'saved' ? firstId : secondId
      expect(await store.challenge(member)).toBeNull()
      const expiredId = newId(new Date())
      await store.issueChallenge({ id: expiredId, account_id: member, pose: 'look_left', expires_at: new Date(Date.now() - 1) })
      expect(await store.save(selfie(nextRecordId(new Date())), { challengeId: expiredId, now: new Date() })).toBe('challenge_gone')
      const stored = await db().query<{ pose: string; status: string }>(
        `select "pose", "status" from "verification_record" where "account_id" = $1 and "kind" = 'liveness'`,
        [member],
      )
      expect(stored.rows).toEqual([{ pose: 'thumbs_up', status: 'pending' }])
      let refused = ''
      try {
        await db().query(
          `insert into "verification_record" ("id", "account_id", "kind", "status", "pose") values ($1, $2, 'id_document', 'pending', 'look_left')`,
          [newId(new Date()), member],
        )
      } catch (error) {
        refused = postgresCode(error) ?? ''
      }
      expect(refused, 'a pose only on a liveness row').toBe('23514')

      const idId = nextRecordId(new Date())
      expect(await store.save({ ...selfie(idId), kind: 'id_document', pose: null })).toBe('saved')
      const pending = await store.pendingLatest()
      expect(pending.filter((row) => row.account_id === member).map((row) => [row.kind, row.id, row.pseudonym]).sort()).toEqual(
        [['id_document', idId, 'Review_Pg'], ['liveness', kept, 'Review_Pg']].sort(),
      )

      const moderator = { account_id: staff, roles: ['moderator'], session_id: 'pg-session' }
      const decisions = await Promise.all([
        decideVerification(moderator, { kind: 'id_document', account_id: member, record_id: idId, decision: 'approve' }),
        decideVerification(moderator, { kind: 'id_document', account_id: member, record_id: idId, decision: 'reject', reason: 'expired' }),
      ])
      expect(decisions.map((item) => (item.ok ? 200 : item.status)).sort()).toEqual([200, 409])

      const retakeId = nextRecordId(new Date())
      expect(await store.save(selfie(retakeId))).toBe('saved')
      const stale = await decideVerification(moderator, { kind: 'liveness', account_id: member, record_id: kept, decision: 'approve' })
      expect(stale).toMatchObject({ ok: false, status: 409, code: 'REVIEW_STALE' })
      const idStatus = await db().query<{ status: string }>(`select "status" from "verification_record" where "id" = $1`, [idId])
      if (idStatus.rows[0]?.status === 'rejected') {
        const again = nextRecordId(new Date())
        await store.save({ ...selfie(again), kind: 'id_document', pose: null })
        expect((await decideVerification(moderator, { kind: 'id_document', account_id: member, record_id: again, decision: 'approve' })).ok).toBe(true)
      }
      const approved = await decideVerification(moderator, { kind: 'liveness', account_id: member, record_id: retakeId, decision: 'approve' })
      expect(approved).toMatchObject({ ok: true, result: { status: 'granted', visibility: 'public' } })

      const minorId = nextRecordId(new Date())
      await store.save({ ...selfie(minorId, minor), kind: 'id_document', pose: null })
      const held = await decideVerification(moderator, { kind: 'id_document', account_id: minor, record_id: minorId, decision: 'suspected_minor' })
      expect(held).toMatchObject({ ok: true, result: { status: 'held', visibility: 'held', account_status: 'held' } })

      const audit = await db().query<{ action: string; payload: Record<string, string> }>(
        `select "action", "payload" from "audit_event" where "actor_id" = $1 order by "id"`,
        [staff],
      )
      expect(audit.rows.every((row) => row.action === 'moderator_verification_decision')).toBe(true)
      expect(audit.rows.length).toBeGreaterThanOrEqual(3)
      expect(JSON.stringify(audit.rows)).not.toMatch(/s3:\/\/|verification\//)
    } finally {
      await closeAccountStore()
      if (previousDatabaseUrl === undefined) {
        delete process.env['DATABASE_URL']
      } else {
        process.env['DATABASE_URL'] = previousDatabaseUrl
      }
    }
  }, 60_000)
})
