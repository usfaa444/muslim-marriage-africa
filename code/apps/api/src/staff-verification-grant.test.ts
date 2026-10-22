import { readFileSync } from 'node:fs'
import type { AddressInfo } from 'node:net'
import { fileURLToPath } from 'node:url'
import type { INestApplication } from '@nestjs/common'
import { newId } from '@ankanu/kernel'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { memoryAccountStore, setAccountStore } from './account-store.js'
import { memoryAuditPort, setAuditPort, type AuditRow } from './audit-port.js'
import { setAuthClock } from './auth-clock.js'
import { setAuthLimitReader } from './auth-limit.js'
import { resetAuthRateWindow } from './auth-rate.js'
import { setBrowseLimitReader } from './browse-rate.js'
import { createApp } from './create-app.js'
import { memoryEmailVerificationStore, setEmailVerificationStore } from './email-verification-store.js'
import { memoryCaptureStore, setCaptureStore } from './id-liveness-store.js'
import { memoryMediaStore, setMediaStore } from './media-store.js'
import { memoryPhoneOtpStore, setPhoneOtpStore, type PhoneOtpRow } from './phone-otp-store.js'
import { memoryPinLockStore, setPinLockStore } from './pin-lock-store.js'
import { resetPinEntries } from './pin-lock-state.js'
import { setFreeReviewSlaReader } from './profile-review.js'
import { getProfileStore, memoryProfileStore, setProfileStore } from './profile-store.js'
import { SESSION_COOKIE } from './session-cookie.js'
import { memorySessionStore, setSessionStore } from './session-store.js'
import { grantStagingVerification } from './staff-verification-grant.js'
import { entryLocation } from '../../web/src/entry-guard.js'

const memory = memoryAccountStore()
const sessions = memorySessionStore(memory)
const otp = memoryPhoneOtpStore()
const captures = memoryCaptureStore({
  accounts: memory.accounts,
  profiles: memory.profiles,
  phoneRows: [],
})
const audits: AuditRow[] = []
const composeFile = fileURLToPath(new URL('../../../compose.yaml', import.meta.url))
let now = new Date('2026-10-14T12:00:00.000Z')
let serial = 0
const previousEnv = {
  flag: process.env.STAGING_STAFF_VERIFICATION_GRANT,
  origin: process.env.ANKANU_PUBLIC_ORIGIN,
  nodeEnv: process.env.NODE_ENV,
}

function enableStaging(): void {
  process.env.STAGING_STAFF_VERIFICATION_GRANT = '1'
  process.env.ANKANU_PUBLIC_ORIGIN = 'https://staging.ankanu.com'
  delete process.env.NODE_ENV
}

function insertPhone(accountId: string, status: 'pending' | 'granted'): PhoneOtpRow {
  now = new Date(now.getTime() + 1)
  const row: PhoneOtpRow = {
    id: newId(now),
    account_id: accountId,
    kind: 'phone_otp',
    status,
    vendor: null,
    evidence_uri: null,
    phone_e164: '+22670111222',
    hash: null,
    expires_at: new Date(now.getTime() + 60_000),
  }
  otp.rows.push(row)
  return row
}

describe('staging staff verification grant', () => {
  let app: INestApplication
  let base: string

  beforeAll(async () => {
    setAuthClock(() => now)
    setAuthLimitReader(async () => 1000)
    resetAuthRateWindow()
    setBrowseLimitReader(async () => 1000)
    setAccountStore(memory)
    setSessionStore(sessions)
    setProfileStore(memoryProfileStore(memory.accounts, memory.profiles))
    setPhoneOtpStore(otp)
    setCaptureStore(captures)
    setMediaStore(memoryMediaStore())
    setPinLockStore(memoryPinLockStore())
    resetPinEntries()
    setFreeReviewSlaReader(async () => 24)
    setEmailVerificationStore(memoryEmailVerificationStore(memory))
    setAuditPort(memoryAuditPort(audits))
    app = await createApp()
    await app.listen(0, '127.0.0.1')
    const address = app.getHttpServer().address() as AddressInfo | string | null
    if (address === null || typeof address === 'string') {
      throw new Error('expected the api test server to bind a TCP port')
    }
    base = `http://127.0.0.1:${address.port}`
  })

  afterEach(() => {
    if (previousEnv.flag === undefined) {
      delete process.env.STAGING_STAFF_VERIFICATION_GRANT
    } else {
      process.env.STAGING_STAFF_VERIFICATION_GRANT = previousEnv.flag
    }
    if (previousEnv.origin === undefined) {
      delete process.env.ANKANU_PUBLIC_ORIGIN
    } else {
      process.env.ANKANU_PUBLIC_ORIGIN = previousEnv.origin
    }
    if (previousEnv.nodeEnv === undefined) {
      delete process.env.NODE_ENV
    } else {
      process.env.NODE_ENV = previousEnv.nodeEnv
    }
  })

  afterAll(async () => {
    setAuthClock(undefined)
    setAuthLimitReader(undefined)
    resetAuthRateWindow()
    setBrowseLimitReader(undefined)
    setAccountStore(undefined)
    setSessionStore(undefined)
    setProfileStore(undefined)
    setPhoneOtpStore(undefined)
    setCaptureStore(undefined)
    setMediaStore(undefined)
    setPinLockStore(undefined)
    resetPinEntries()
    setFreeReviewSlaReader(undefined)
    setEmailVerificationStore(undefined)
    setAuditPort(undefined)
    if (app) {
      await app.close()
    }
  })

  async function createAccount(gender: 'sister' | 'brother' = 'sister'): Promise<{ id: string; email: string }> {
    serial += 1
    const email = `grant${serial}@example.bf`
    const response = await fetch(`${base}/v1/accounts`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email,
        password: 'phrase avec espaces',
        pseudonym: `Grant_${serial}`,
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

  function asStaff(accountId: string, role: 'moderator' | 'operator'): void {
    const row = memory.accounts.find((item) => item.id === accountId)
    expect(row).toBeTruthy()
    ;(row as { roles: string[] }).roles = [role]
  }

  function verifyEmail(accountId: string): void {
    const row = memory.credentials.find((item) => item.account_id === accountId && item.kind === 'password')
    expect(row).toBeTruthy()
    if (row) {
      row.email_verified_at = now.toISOString()
    }
  }

  async function saveProfile(cookie: string): Promise<void> {
    const saved = await fetch(`${base}/v1/me/profile`, {
      method: 'PUT',
      headers: { cookie, 'content-type': 'application/json' },
      body: JSON.stringify({ dob: '1990-01-15' }),
    })
    expect(saved.status).toBe(200)
  }

  async function allowReview(staffCookie: string, accountId: string): Promise<void> {
    const allowed = await fetch(`${base}/v1/staff/cases`, {
      method: 'POST',
      headers: { cookie: staffCookie, 'content-type': 'application/json' },
      body: JSON.stringify({
        kind: 'profile_review',
        account_id: accountId,
        profile: 'allow',
        photos: [],
      }),
    })
    expect(allowed.status).toBe(200)
  }

  function grant(cookie: string | undefined, accountId: string): Promise<Response> {
    return fetch(`${base}/v1/staff/verifications/grant`, {
      method: 'POST',
      headers: {
        ...(cookie ? { cookie } : {}),
        'content-type': 'application/json',
      },
      body: JSON.stringify({ account_id: accountId }),
    })
  }

  it('keeps the flag on the staging api service only', () => {
    const text = readFileSync(composeFile, 'utf8')
    const web = text.split('\n  api:')[0] ?? ''
    const api = text.split('\n  api:')[1]?.split('\n  worker:')[0] ?? ''
    const worker = text.split('\n  worker:')[1]?.split('\n  postgres:')[0] ?? ''
    expect(text.match(/STAGING_STAFF_VERIFICATION_GRANT/g)).toEqual(['STAGING_STAFF_VERIFICATION_GRANT'])
    expect(web).not.toContain('STAGING_STAFF_VERIFICATION_GRANT')
    expect(api).toContain('STAGING_STAFF_VERIFICATION_GRANT: "1"')
    expect(worker).not.toContain('STAGING_STAFF_VERIFICATION_GRANT')
  })

  it('returns 404 when the flag is off or the origin is not staging', async () => {
    const staff = await createAccount()
    const staffCookie = await signIn(staff.email)
    asStaff(staff.id, 'moderator')
    const member = await createAccount()
    delete process.env.STAGING_STAFF_VERIFICATION_GRANT
    process.env.ANKANU_PUBLIC_ORIGIN = 'https://staging.ankanu.com'
    process.env.NODE_ENV = 'production'
    const off = await grant(staffCookie, member.id)
    expect(off.status).toBe(404)
    expect(await off.json()).toMatchObject({ error: { code: 'NOT_FOUND' } })

    process.env.STAGING_STAFF_VERIFICATION_GRANT = '1'
    process.env.ANKANU_PUBLIC_ORIGIN = 'https://ankanu.com'
    const production = await grant(staffCookie, member.id)
    expect(production.status).toBe(404)
    process.env.ANKANU_PUBLIC_ORIGIN = 'https://staging.ankanu.com/'
    const slash = await grant(staffCookie, member.id)
    expect(slash.status).toBe(404)
    process.env.ANKANU_PUBLIC_ORIGIN = 'HTTPS://staging.ankanu.com'
    const upper = await grant(staffCookie, member.id)
    expect(upper.status).toBe(404)
    delete process.env.STAGING_STAFF_VERIFICATION_GRANT
    process.env.ANKANU_PUBLIC_ORIGIN = 'https://staging.ankanu.com'
    const direct = await grantStagingVerification(staff.id, { account_id: member.id })
    expect(direct.ok).toBe(false)
    expect(audits.some((row) => row.action === 'staff_verification_grant' && row.payload.account_id === member.id)).toBe(
      false,
    )
    expect(captures.rows.some((row) => row.account_id === member.id)).toBe(false)
  })

  it('rejects anonymous callers and members, then grants only id and liveness', async () => {
    enableStaging()
    const operator = await createAccount()
    const operatorCookie = await signIn(operator.email)
    asStaff(operator.id, 'operator')
    const member = await createAccount()
    const memberCookie = await signIn(member.email)
    await saveProfile(memberCookie)
    verifyEmail(member.id)
    const pendingPhone = insertPhone(member.id, 'pending')
    const grantedPhone = insertPhone(member.id, 'granted')
    now = new Date(now.getTime() + 1)
    const olderId = {
      id: newId(now),
      account_id: member.id,
      kind: 'id_document' as const,
      status: 'pending' as const,
      vendor: null,
      evidence_uri: 'memory-old',
      phone_e164: null,
      hash: null,
      expires_at: null,
    }
    now = new Date(now.getTime() + 1)
    const idRow = {
      id: newId(now),
      account_id: member.id,
      kind: 'id_document' as const,
      status: 'pending' as const,
      vendor: null,
      evidence_uri: 'memory-doc',
      phone_e164: null,
      hash: null,
      expires_at: null,
    }
    now = new Date(now.getTime() + 1)
    const liveRow = {
      id: newId(now),
      account_id: member.id,
      kind: 'liveness' as const,
      status: 'rejected' as const,
      vendor: null,
      evidence_uri: 'memory-live',
      phone_e164: null,
      hash: null,
      expires_at: null,
    }
    captures.rows.push(olderId, idRow, liveRow)
    const beforeCount = captures.rows.filter((row) => row.account_id === member.id).length
    setAuditPort({
      async append() {
        throw new Error('audit down')
      },
    })
    try {
      const rolled = await grant(operatorCookie, member.id)
      expect(rolled.status).toBe(500)
      expect(captures.rows.find((row) => row.id === olderId.id)?.status).toBe('pending')
      expect(captures.rows.find((row) => row.id === idRow.id)?.status).toBe('pending')
      expect(captures.rows.find((row) => row.id === liveRow.id)?.status).toBe('rejected')
    } finally {
      setAuditPort(memoryAuditPort(audits))
    }
    const before = await getProfileStore().read(member.id)
    expect(before?.review_passed_at).toBeNull()
    expect(before?.visibility).toBe('unpublished')

    const anonymous = await grant(undefined, member.id)
    expect(anonymous.status).toBe(401)
    expect(await anonymous.json()).toMatchObject({ error: { code: 'UNAUTHENTICATED' } })
    const denied = await grant(memberCookie, member.id)
    expect(denied.status).toBe(403)
    expect(await denied.json()).toMatchObject({ error: { code: 'FORBIDDEN' } })
    const bad = await fetch(`${base}/v1/staff/verifications/grant`, {
      method: 'POST',
      headers: { cookie: operatorCookie, 'content-type': 'application/json' },
      body: JSON.stringify({ account_id: 'not-a-uuid' }),
    })
    expect(bad.status).toBe(400)
    expect(await bad.json()).toMatchObject({ error: { code: 'UNHANDLED', details: { field: 'account_id' } } })
    const missing = await grant(operatorCookie, newId(now))
    expect(missing.status).toBe(404)
    expect(await missing.json()).toMatchObject({ error: { code: 'NOT_FOUND', message: 'Ce compte est introuvable.' } })

    const granted = await grant(operatorCookie, member.id)
    expect(granted.status).toBe(200)
    expect(granted.headers.get('cache-control')).toBe('no-store')
    const body = (await granted.json()) as { account_id: string; visibility: string | null }
    expect(body).toEqual({
      account_id: member.id,
      id_document: 'granted',
      liveness: 'granted',
      visibility: 'unpublished',
    })
    const storedOlder = captures.rows.find((row) => row.id === olderId.id)
    const storedId = captures.rows.find((row) => row.id === idRow.id)
    const storedLive = captures.rows.find((row) => row.id === liveRow.id)
    expect(storedOlder?.status).toBe('pending')
    expect(storedOlder?.evidence_uri).toBe('memory-old')
    expect(storedId?.status).toBe('granted')
    expect(storedLive?.status).toBe('granted')
    expect(storedId?.evidence_uri).toBe('memory-doc')
    expect(storedLive?.evidence_uri).toBe('memory-live')
    expect(captures.rows.filter((row) => row.account_id === member.id)).toHaveLength(beforeCount)
    expect(pendingPhone.status).toBe('pending')
    expect(grantedPhone.status).toBe('granted')
    expect(grantedPhone.phone_e164).toBe('+22670111222')
    expect(otp.rows.filter((row) => row.account_id === member.id).map((row) => row.id)).toEqual([
      pendingPhone.id,
      grantedPhone.id,
    ])
    const after = await getProfileStore().read(member.id)
    expect(after?.review_passed_at).toBeNull()
    expect(after?.visibility).toBe('unpublished')
    const audit = audits.filter((row) => row.action === 'staff_verification_grant' && row.payload.account_id === member.id)
    expect(audit).toHaveLength(1)
    expect(audit[0]?.actor_id).toBe(operator.id)
    expect(audit[0]?.payload).toEqual({
      account_id: member.id,
      action: 'staff_verification_grant',
      id_document: 'granted',
      id_document_id: idRow.id,
      liveness: 'granted',
      liveness_id: liveRow.id,
      reason: 'staging_staff_grant',
    })
    expect(JSON.stringify(audit[0]?.payload)).not.toContain('phone')
    const held = await fetch(`${base}/v1/browse`, { headers: { cookie: memberCookie } })
    expect(held.status).toBe(403)
    expect(await held.json()).toMatchObject({ error: { details: { reason: 'viewer_not_listable' } } })
  })

  it('publishes a reviewed member and lets that member open discover', async () => {
    enableStaging()
    const moderator = await createAccount()
    const moderatorCookie = await signIn(moderator.email)
    asStaff(moderator.id, 'moderator')
    const member = await createAccount()
    const memberCookie = await signIn(member.email)
    await saveProfile(memberCookie)
    await allowReview(moderatorCookie, member.id)
    verifyEmail(member.id)
    insertPhone(member.id, 'granted')
    const reviewed = await getProfileStore().read(member.id)
    expect(reviewed?.review_passed_at).toBeTruthy()
    expect(reviewed?.visibility).toBe('unpublished')
    const passedAt = reviewed?.review_passed_at

    const blocked = await fetch(`${base}/v1/accounts/gate`, { headers: { cookie: memberCookie } })
    expect(await blocked.json()).toEqual({ step: 'identity' })
    expect(entryLocation('/decouvrir', 'identity')).toBe('/id-liveness')
    const hidden = await fetch(`${base}/v1/browse`, { headers: { cookie: memberCookie } })
    expect(hidden.status).toBe(403)

    const granted = await grant(moderatorCookie, member.id)
    expect(granted.status).toBe(200)
    const after = await getProfileStore().read(member.id)
    expect(after?.review_passed_at).toBe(passedAt)
    expect(after?.visibility).toBe('public')
    expect(captures.rows.filter((row) => row.account_id === member.id).map((row) => row.kind).sort()).toEqual([
      'id_document',
      'liveness',
    ])
    expect(captures.rows.filter((row) => row.account_id === member.id).every((row) => row.status === 'granted')).toBe(true)
    expect(captures.rows.filter((row) => row.account_id === member.id).every((row) => row.evidence_uri === '')).toBe(true)

    const gate = await fetch(`${base}/v1/accounts/gate`, { headers: { cookie: memberCookie } })
    expect(await gate.json()).toEqual({ step: 'account' })
    expect(entryLocation('/decouvrir', 'account')).toBeNull()
    const browse = await fetch(`${base}/v1/browse`, { headers: { cookie: memberCookie } })
    expect(browse.status).toBe(200)
    expect(await browse.json()).toMatchObject({ view: 'card' })

    const again = await grant(moderatorCookie, member.id)
    expect(again.status).toBe(200)
    expect(await getProfileStore().read(member.id)).toMatchObject({
      review_passed_at: passedAt,
      visibility: 'public',
    })
    expect(captures.rows.filter((row) => row.account_id === member.id)).toHaveLength(2)
    expect(
      audits.filter((row) => row.action === 'staff_verification_grant' && row.payload.account_id === member.id),
    ).toHaveLength(2)
  })
})
