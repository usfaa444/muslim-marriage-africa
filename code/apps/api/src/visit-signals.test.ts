import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import type { AddressInfo } from 'node:net'
import type { INestApplication } from '@nestjs/common'
import { newId, uuidV7Instant } from '@ankanu/kernel'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { memoryAccountStore, setAccountStore } from './account-store.js'
import { setAuthClock } from './auth-clock.js'
import { setAuthLimitReader } from './auth-limit.js'
import { resetAuthRateWindow } from './auth-rate.js'
import { setBillingPort } from './billing-port.js'
import { setBrowseLimitReader } from './browse-rate.js'
import { ACTIVE_STATUS, type CreatedAccount } from './create-account.js'
import { createApp } from './create-app.js'
import { memoryCaptureStore, setCaptureStore } from './id-liveness-store.js'
import { setInvitesPort } from './invites-port.js'
import { setMediaClock, setSignedTtlReader } from './media.js'
import { memoryMediaStore, setMediaStore } from './media-store.js'
import { setMahramPort } from './mahram-port.js'
import { memoryPhoneOtpStore, setPhoneOtpStore } from './phone-otp-store.js'
import { memoryPinLockStore, setPinLockStore } from './pin-lock-store.js'
import { resetPinEntries } from './pin-lock-state.js'
import { setPhotoStrikeConfigReader } from './photo-strike.js'
import { setFreeReviewSlaReader } from './profile-review.js'
import { memoryProfileStore, setProfileStore } from './profile-store.js'
import { SESSION_COOKIE } from './session-cookie.js'
import { memorySessionStore, setSessionStore } from './session-store.js'
import { memoryProfileVisitStore, qualifyVisitAccounts, setProfileVisitStore, toVisitIso, type VisitRow } from './visit-signals.js'

const memory = memoryAccountStore()
const sessions = memorySessionStore(memory)
const pins = memoryPinLockStore()
const media = memoryMediaStore()
const otp = memoryPhoneOtpStore()
const captures = memoryCaptureStore({
  accounts: memory.accounts,
  profiles: memory.profiles,
  phoneRows: [],
})
const visits = memoryProfileVisitStore()
let now = new Date('2026-10-13T12:00:00.000Z')
let serial = 0

const targets = Array.from({ length: 80 }, (_, index) => newId(new Date(Date.UTC(2026, 0, 1, 0, 0, index))))

function targetId(index: number): string {
  const id = targets[index]
  if (!id) {
    throw new Error(`missing target ${index}`)
  }
  return id
}

describe('visit qualification', () => {
  it('keeps the migration to the three visit columns', () => {
    const sql = readFileSync(fileURLToPath(new URL('../drizzle/0017_profile_visit.sql', import.meta.url)), 'utf8')
    expect(sql).toContain('CREATE TABLE "profile_visit"')
    expect(sql).toContain('"account_id" uuid NOT NULL')
    expect(sql).toContain('"target_id" uuid NOT NULL')
    expect(sql).toContain('"created_at" timestamp with time zone NOT NULL')
    expect(sql).toContain('PRIMARY KEY("account_id","target_id","created_at")')
    expect(sql).toContain('REFERENCES "public"."account"("id")')
    expect(sql).toContain('CREATE INDEX "profile_visit_account_id_created_at"')
    expect(sql).not.toMatch(/"id" uuid/)
  })

  it('counts distinct targets and marks the 51st first open', () => {
    const accountId = 'aaaaaaaa-aaaa-7aaa-8aaa-aaaaaaaaaaaa'
    const rows: VisitRow[] = []
    for (let index = 0; index < 50; index += 1) {
      rows.push({
        account_id: accountId,
        target_id: targetId(index),
        created_at: new Date(Date.UTC(2026, 9, 13, 10, 0, index)).toISOString(),
      })
    }
    expect(qualifyVisitAccounts(rows)).toEqual([])
    rows.push({
      account_id: accountId,
      target_id: targetId(0),
      created_at: new Date(Date.UTC(2026, 9, 13, 11, 0, 0)).toISOString(),
    })
    expect(qualifyVisitAccounts(rows)).toEqual([])
    const crossed = new Date(Date.UTC(2026, 9, 13, 10, 0, 50)).toISOString()
    rows.push({ account_id: accountId, target_id: targetId(50), created_at: crossed })
    expect(qualifyVisitAccounts(rows)).toEqual([
      { account_id: accountId, profiles_viewed_24h: 51, over_threshold_at: crossed },
    ])
  })

  it('turns a drizzle timestamp into ISO', () => {
    expect(toVisitIso('2026-05-24 14:00:00.000+00')).toBe('2026-05-24T14:00:00.000Z')
    expect(toVisitIso('2026-05-24T14:00:00.000Z')).toBe('2026-05-24T14:00:00.000Z')
  })

  it('orders a later crossing first and breaks ties by account id', () => {
    const early = 'bbbbbbbb-bbbb-7bbb-8bbb-bbbbbbbbbbbb'
    const late = 'aaaaaaaa-aaaa-7aaa-8aaa-aaaaaaaaaaaa'
    const rows: VisitRow[] = []
    for (const accountId of [early, late]) {
      for (let index = 0; index < 51; index += 1) {
        rows.push({
          account_id: accountId,
          target_id: targetId(index),
          created_at: new Date(Date.UTC(2026, 9, 13, 10, accountId === late ? 30 : 0, index)).toISOString(),
        })
      }
    }
    const qualified = qualifyVisitAccounts(rows)
    expect(qualified.map((row) => row.account_id)).toEqual([late, early])
  })

  it('turns a drizzle timestamp into ISO', () => {
    const accountId = 'aaaaaaaa-aaaa-7aaa-8aaa-aaaaaaaaaaaa'
    const rows: VisitRow[] = []
    for (let index = 0; index < 51; index += 1) {
      rows.push({
        account_id: accountId,
        target_id: targetId(index),
        created_at: `2026-10-13 10:${String(index).padStart(2, '0')}:00.000+00`,
      })
    }
    expect(qualifyVisitAccounts(rows)[0]?.over_threshold_at).toBe('2026-10-13T10:50:00.000Z')
    expect(toVisitIso('2026-05-24 14:00:00.000+00')).toBe('2026-05-24T14:00:00.000Z')
  })
})

describe('staff visit signals', () => {
  let app: INestApplication
  let base: string

  beforeAll(async () => {
    setAuthClock(() => now)
    setMediaClock(() => now)
    setSignedTtlReader(async () => 60)
    setPhotoStrikeConfigReader(async () => ({ count: '3', hours: '24' }))
    setFreeReviewSlaReader(async () => 24)
    setAuthLimitReader(async () => 100)
    setBrowseLimitReader(async () => 1000)
    setMahramPort(undefined)
    setBillingPort({
      async isEntitled() {
        return true
      },
    })
    setAccountStore(memory)
    setSessionStore(sessions)
    setProfileStore(memoryProfileStore(memory.accounts, memory.profiles))
    setMediaStore(media)
    setPhoneOtpStore(otp)
    setCaptureStore(captures)
    setProfileVisitStore(visits)
    setInvitesPort(undefined)
    pins.rows.length = 0
    resetPinEntries()
    setPinLockStore(pins)
    app = await createApp()
    await app.listen(0, '127.0.0.1')
    const address = app.getHttpServer().address() as AddressInfo | string | null
    if (address === null || typeof address === 'string') {
      throw new Error('expected the api test server to bind a TCP port')
    }
    base = `http://127.0.0.1:${address.port}`
  })

  beforeEach(() => {
    memory.accounts.length = 0
    memory.credentials.length = 0
    memory.profiles.length = 0
    media.assets.length = 0
    media.derivatives.length = 0
    media.grants.length = 0
    otp.rows.length = 0
    captures.rows.length = 0
    visits.rows.length = 0
    resetAuthRateWindow()
    setBrowseLimitReader(async () => 1000)
    setProfileVisitStore(visits)
    setInvitesPort(undefined)
  })

  afterAll(async () => {
    setAuthClock(undefined)
    setMediaClock(undefined)
    setSignedTtlReader(undefined)
    setPhotoStrikeConfigReader(undefined)
    setFreeReviewSlaReader(undefined)
    setAuthLimitReader(undefined)
    setBrowseLimitReader(undefined)
    setMahramPort(undefined)
    setBillingPort(undefined)
    setPhoneOtpStore(undefined)
    setCaptureStore(undefined)
    setProfileVisitStore(undefined)
    setInvitesPort(undefined)
    resetAuthRateWindow()
    setAccountStore(undefined)
    setSessionStore(undefined)
    setProfileStore(undefined)
    setMediaStore(undefined)
    setPinLockStore(undefined)
    resetPinEntries()
    if (app) {
      await app.close()
    }
  })

  async function createAccount(gender: 'sister' | 'brother'): Promise<{ id: string; email: string }> {
    serial += 1
    now = new Date(now.getTime() + 1)
    const email = `visit${serial}@example.bf`
    const response = await fetch(`${base}/v1/accounts`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email,
        password: 'phrase avec espaces',
        pseudonym: `Vis_${serial}`,
        gender,
        pledge_accepted: true,
        civil_given_name: 'Awa',
        civil_family_name: 'Sawadogo',
        recaptcha_token: 'test-ok',
        coc_version: 'FR-089',
        dob: '1990-01-15',
      }),
    })
    expect(response.status).toBe(201)
    const json = (await response.json()) as { id: string }
    return { id: json.id, email }
  }

  async function signIn(email: string): Promise<string> {
    const response = await fetch(`${base}/v1/sessions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        identifier: email,
        password: 'phrase avec espaces',
        remember_me: false,
        recaptcha_token: 'test-ok',
      }),
    })
    expect(response.status).toBe(201)
    const cookie = response.headers.getSetCookie().join('\n')
    const match = new RegExp(`${SESSION_COOKIE}=([^;]+)`).exec(cookie)
    expect(match?.[1]).toBeTruthy()
    return `${SESSION_COOKIE}=${match?.[1] ?? ''}`
  }

  async function publish(id: string, cookie: string): Promise<void> {
    const saved = await fetch(`${base}/v1/me/profile`, {
      method: 'PUT',
      headers: { cookie, 'content-type': 'application/json' },
      body: JSON.stringify({
        dob: '1990-01-15',
        city: 'ouagadougou',
        country: 'BF',
        profession: 'ingenierie',
        marital_status: 'single',
        polygamy_intent: 'no',
        madhhab: 'maliki',
        practice: 'assidue',
        life_plans: 'tf:6months\nUnion stable',
      }),
    })
    expect(saved.status).toBe(200)
    const row = memory.profiles.find((item) => item.account_id === id)
    expect(row).toBeTruthy()
    if (row) {
      row.visibility = 'public'
    }
  }

  function grant(accountId: string, kind: 'liveness' | 'id_document'): void {
    now = new Date(now.getTime() + 1)
    captures.rows.push({
      id: newId(now),
      account_id: accountId,
      kind,
      status: 'granted',
      vendor: null,
      evidence_uri: 'memory',
      phone_e164: null,
      hash: null,
      expires_at: null,
    })
  }

  function staffRole(accountId: string, role: 'moderator' | 'operator'): void {
    const row = memory.accounts.find((item) => item.id === accountId)
    expect(row).toBeTruthy()
    if (row) {
      ;(row as { roles: string[] }).roles = [role]
    }
  }

  function seedVisits(accountId: string, distinct: number, repeats = 0, start = new Date('2026-10-13T11:00:00.000Z')): string {
    let crossed = ''
    for (let index = 0; index < distinct; index += 1) {
      const created = new Date(start.getTime() + index * 1000).toISOString()
      if (index === 50) {
        crossed = created
      }
      visits.rows.push({ account_id: accountId, target_id: targetId(index), created_at: created })
    }
    for (let index = 0; index < repeats; index += 1) {
      visits.rows.push({
        account_id: accountId,
        target_id: targetId(0),
        created_at: new Date(start.getTime() + (distinct + index) * 1000).toISOString(),
      })
    }
    return crossed
  }

  function pushMember(index: number): CreatedAccount {
    const row: CreatedAccount = {
      id: newId(new Date(Date.UTC(2024, 0, 1, 0, 0, index))),
      email: `pushed${index}@example.bf`,
      pseudonym: `Pushed_${index}`,
      gender: 'brother',
      roles: ['member'],
      status: ACTIVE_STATUS,
      age_attested: true,
      coc_version: 'FR-089',
      civil_given_name: 'Awa',
      civil_family_name: 'Sawadogo',
    }
    memory.accounts.push(row)
    return row
  }

  it('writes one row only when the profile read returns 200', async () => {
    const sister = await createAccount('sister')
    const brother = await createAccount('brother')
    const sisterCookie = await signIn(sister.email)
    const brotherCookie = await signIn(brother.email)
    await publish(sister.id, sisterCookie)
    await publish(brother.id, brotherCookie)
    const opened = await fetch(`${base}/v1/profiles/${brother.id}`, { headers: { cookie: sisterCookie } })
    expect(opened.status).toBe(200)
    expect(visits.rows).toEqual([
      expect.objectContaining({ account_id: sister.id, target_id: brother.id, created_at: now.toISOString() }),
    ])
    const again = await fetch(`${base}/v1/profiles/${brother.id}`, { headers: { cookie: sisterCookie } })
    expect(again.status).toBe(200)
    expect(visits.rows).toHaveLength(2)
    const self = await fetch(`${base}/v1/profiles/${sister.id}`, { headers: { cookie: sisterCookie } })
    expect(self.status).toBe(404)
    expect(visits.rows).toHaveLength(2)
    staffRole(brother.id, 'moderator')
    const staffRead = await fetch(`${base}/v1/profiles/${sister.id}`, { headers: { cookie: brotherCookie } })
    expect(staffRead.status).toBe(403)
    expect(visits.rows).toHaveLength(2)
  })

  it('keeps the profile body when the visit insert fails', async () => {
    const sister = await createAccount('sister')
    const brother = await createAccount('brother')
    const sisterCookie = await signIn(sister.email)
    const brotherCookie = await signIn(brother.email)
    await publish(sister.id, sisterCookie)
    await publish(brother.id, brotherCookie)
    setProfileVisitStore({
      async insert() {
        throw new Error('disk')
      },
      async listInWindow() {
        return []
      },
    })
    const opened = await fetch(`${base}/v1/profiles/${brother.id}`, { headers: { cookie: sisterCookie } })
    expect(opened.status).toBe(200)
    const body = (await opened.json()) as { profile: { pseudonym: string } }
    expect(body.profile.pseudonym).toBe(memory.accounts.find((row) => row.id === brother.id)?.pseudonym)
  })

  it('refuses members and anonymous callers', async () => {
    const sister = await createAccount('sister')
    const cookie = await signIn(sister.email)
    const member = await fetch(`${base}/v1/staff/signals/visits`, { headers: { cookie } })
    expect(member.status).toBe(403)
    expect(await member.json()).toMatchObject({
      error: { code: 'FORBIDDEN', message: 'Accès réservé au personnel de modération.', retryable: false },
    })
    const anon = await fetch(`${base}/v1/staff/signals/visits`)
    expect(anon.status).toBe(401)
    expect(await anon.json()).toMatchObject({
      error: { code: 'UNAUTHENTICATED', message: 'Authentification requise.', retryable: false },
    })
  })

  it('lists a member only after 51 distinct opens and zero invites', async () => {
    const member = await createAccount('brother')
    const staff = await createAccount('sister')
    const staffCookie = await signIn(staff.email)
    staffRole(staff.id, 'moderator')
    const profile = await fetch(`${base}/v1/me/profile`, {
      method: 'PUT',
      headers: { cookie: await signIn(member.email), 'content-type': 'application/json' },
      body: JSON.stringify({
        dob: '1990-01-15',
        city: 'ouagadougou',
        country: 'BF',
        profession: 'ingenierie',
        marital_status: 'single',
        polygamy_intent: 'no',
        madhhab: 'maliki',
        practice: 'assidue',
        life_plans: 'tf:6months\nUnion stable',
      }),
    })
    expect(profile.status).toBe(200)
    grant(member.id, 'id_document')
    grant(member.id, 'liveness')
    seedVisits(member.id, 50, 10)
    const under = await fetch(`${base}/v1/staff/signals/visits?unused=1`, { headers: { cookie: staffCookie } })
    expect(under.status).toBe(200)
    expect(under.headers.get('cache-control')).toContain('no-store')
    expect(await under.json()).toMatchObject({ count: 0, truncated: false, rows: [], threshold: 50, window_hours: 24 })
    const crossed = seedVisits(member.id, 51)
    const listed = await fetch(`${base}/v1/staff/signals/visits`, { headers: { cookie: staffCookie } })
    expect(listed.status).toBe(200)
    const body = (await listed.json()) as {
      count: number
      truncated: boolean
      rows: Array<Record<string, unknown>>
    }
    expect(body.count).toBe(1)
    expect(body.truncated).toBe(false)
    expect(body.rows).toEqual([
      {
        account_id: member.id,
        pseudonym: memory.accounts.find((row) => row.id === member.id)?.pseudonym,
        gender: 'brother',
        age: 36,
        city: 'ouagadougou',
        member_since: uuidV7Instant(member.id).toISOString(),
        id_verified: true,
        profiles_viewed_24h: 51,
        invites_sent_24h: 0,
        over_threshold_at: crossed,
      },
    ])
    expect(JSON.stringify(body)).not.toContain('example.bf')
    expect(JSON.stringify(body)).not.toContain('phone')
    expect(JSON.stringify(body)).not.toContain('whatsapp')
    setInvitesPort({
      async sentCountSince() {
        return 1
      },
    })
    const invited = await fetch(`${base}/v1/staff/signals/visits`, { headers: { cookie: staffCookie } })
    expect(await invited.json()).toMatchObject({ count: 0, rows: [] })
  })

  it('drops opens older than 24h and keeps a single grant unverified', async () => {
    const member = await createAccount('brother')
    const staff = await createAccount('sister')
    const staffCookie = await signIn(staff.email)
    staffRole(staff.id, 'moderator')
    seedVisits(member.id, 51, 0, new Date(now.getTime() - 25 * 60 * 60 * 1000))
    const stale = await fetch(`${base}/v1/staff/signals/visits`, { headers: { cookie: staffCookie } })
    expect(await stale.json()).toMatchObject({ count: 0, rows: [] })
    visits.rows.length = 0
    grant(member.id, 'id_document')
    for (let index = 0; index < 51; index += 1) {
      visits.rows.push({
        account_id: member.id,
        target_id: targetId(index),
        created_at: `2026-10-13 10:${String(index).padStart(2, '0')}:00.000+00`,
      })
    }
    const listed = await fetch(`${base}/v1/staff/signals/visits`, { headers: { cookie: staffCookie } })
    const body = (await listed.json()) as { count: number; rows: Array<{ over_threshold_at: string; id_verified: boolean }> }
    expect(body.count).toBe(1)
    expect(body.rows[0]?.over_threshold_at).toBe('2026-10-13T10:50:00.000Z')
    expect(body.rows[0]?.id_verified).toBe(false)
  })

  it('returns a retryable store failure and caps the list at 100', async () => {
    const staff = await createAccount('sister')
    const staffCookie = await signIn(staff.email)
    staffRole(staff.id, 'operator')
    for (let index = 0; index < 101; index += 1) {
      const row = pushMember(index)
      seedVisits(row.id, 51, 0, new Date(Date.UTC(2026, 9, 13, 8, 0, index)))
    }
    const listed = await fetch(`${base}/v1/staff/signals/visits`, { headers: { cookie: staffCookie } })
    const body = (await listed.json()) as { count: number; truncated: boolean; rows: Array<{ account_id: string }> }
    expect(body.count).toBe(101)
    expect(body.truncated).toBe(true)
    expect(body.rows).toHaveLength(100)
    expect(body.rows[0]?.account_id).toBe(memory.accounts.find((row) => row.pseudonym === 'Pushed_100')?.id)
    setProfileVisitStore({
      async insert() {
        return undefined
      },
      async listInWindow() {
        throw new Error('disk')
      },
    })
    const failed = await fetch(`${base}/v1/staff/signals/visits`, { headers: { cookie: staffCookie } })
    expect(failed.status).toBe(500)
    expect(await failed.json()).toMatchObject({
      error: { code: 'UNHANDLED', message: 'Les signaux de visite sont indisponibles.', retryable: true },
    })
  })

  it('drops opens older than 24 hours and keeps a single grant unverified', async () => {
    const member = await createAccount('brother')
    const staff = await createAccount('sister')
    const staffCookie = await signIn(staff.email)
    staffRole(staff.id, 'moderator')
    seedVisits(member.id, 51, 0, new Date('2026-10-11T11:00:00.000Z'))
    const stale = await fetch(`${base}/v1/staff/signals/visits`, { headers: { cookie: staffCookie } })
    expect(await stale.json()).toMatchObject({ count: 0, rows: [] })
    const crossed = seedVisits(member.id, 51)
    grant(member.id, 'id_document')
    const listed = await fetch(`${base}/v1/staff/signals/visits`, { headers: { cookie: staffCookie } })
    const body = (await listed.json()) as { rows: Array<{ id_verified: boolean; over_threshold_at: string }> }
    expect(body.rows[0]?.id_verified).toBe(false)
    expect(body.rows[0]?.over_threshold_at).toBe(crossed)
  })

  it('emits ISO when the stored timestamp is not ISO', async () => {
    const member = await createAccount('brother')
    const staff = await createAccount('sister')
    const staffCookie = await signIn(staff.email)
    staffRole(staff.id, 'moderator')
    const rows: VisitRow[] = []
    for (let index = 0; index < 51; index += 1) {
      const iso = new Date(Date.UTC(2026, 9, 13, 11, 0, index)).toISOString()
      rows.push({
        account_id: member.id,
        target_id: targetId(index),
        created_at: iso.replace('T', ' ').replace('Z', '+00'),
      })
    }
    setProfileVisitStore({
      async insert() {
        return undefined
      },
      async listInWindow() {
        return rows
      },
    })
    const listed = await fetch(`${base}/v1/staff/signals/visits`, { headers: { cookie: staffCookie } })
    const body = (await listed.json()) as { rows: Array<{ over_threshold_at: string }> }
    expect(body.rows[0]?.over_threshold_at).toBe('2026-10-13T11:00:50.000Z')
  })

  it('does not record visits from browse or favourites', () => {
    const browse = readFileSync(fileURLToPath(new URL('./browse.controller.ts', import.meta.url)), 'utf8')
    const favourites = readFileSync(fileURLToPath(new URL('./favourites.controller.ts', import.meta.url)), 'utf8')
    expect(browse).not.toContain('recordProfileVisit')
    expect(favourites).not.toContain('recordProfileVisit')
  })
})
