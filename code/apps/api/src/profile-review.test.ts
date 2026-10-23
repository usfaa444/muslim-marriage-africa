import { createRequire } from 'node:module'
import type { AddressInfo } from 'node:net'
import type { INestApplication } from '@nestjs/common'
import { newId } from '@ankanu/kernel'
import type { AuditAppend } from '@ankanu/ports'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { memoryAccountStore, setAccountStore } from './account-store.js'
import { memoryAuditPort, setAuditPort, type AuditRow } from './audit-port.js'
import { setAuthClock } from './auth-clock.js'
import { setAuthLimitReader } from './auth-limit.js'
import { setOtpLimitReader } from './otp-limit.js'
import { resetAuthRateWindow } from './auth-rate.js'
import { setBillingPort } from './billing-port.js'
import { createApp } from './create-app.js'
import { setMediaClock, setSignedTtlReader, signMedia } from './media.js'
import { memoryMediaStore, setMediaStore } from './media-store.js'
import { setPhotoStrikeConfigReader } from './photo-strike.js'
import { memoryPinLockStore, setPinLockStore } from './pin-lock-store.js'
import { resetPinEntries } from './pin-lock-state.js'
import { memoryCaptureStore, setCaptureStore } from './id-liveness-store.js'
import { memoryPhoneOtpStore, setPhoneOtpStore, type PhoneOtpRow } from './phone-otp-store.js'
import { isListableProfile, publishIfEligible, setFreeReviewSlaReader } from './profile-review.js'
import { getProfileStore, memoryProfileStore, setProfileStore } from './profile-store.js'
import { SESSION_COOKIE } from './session-cookie.js'
import { setSmsPort } from './sms-port.js'
import { memorySessionStore, setSessionStore } from './session-store.js'
import { memoryStaffStore } from './staff-store.js'
import { installTestStaff, openTestStaff, signInTestStaff } from './test-staff-session.js'

const require = createRequire(import.meta.url)
const { PNG } = require('pngjs') as {
  PNG: {
    new (options: { width: number; height: number }): { data: Buffer; width: number; height: number }
    sync: { write(png: { data: Buffer; width: number; height: number }): Buffer }
  }
}

const memory = memoryAccountStore()
const staffStore = memoryStaffStore({ memberEmailTaken: (email) => memory.emailTaken(email) })
const sessions = memorySessionStore(memory)
const pins = memoryPinLockStore()
const media = memoryMediaStore()
const otp = memoryPhoneOtpStore()
const captures = memoryCaptureStore({
  accounts: memory.accounts,
  profiles: memory.profiles,
  phoneRows: [],
})
const audits: AuditRow[] = []
const auditTxs: unknown[] = []
let now = new Date('2026-10-13T00:00:00.000Z')
let slaHours = 24
let billingCalls = 0
const premium = new Set<string>()
let serial = 0

function requireCallerTx(tx: unknown): void {
  if (typeof tx !== 'object' || tx === null || !('insert' in tx) || !('select' in tx) || !('execute' in tx)) {
    throw new Error('AuditPort.append requires the caller transaction')
  }
}

function installAudit(port: { append(tx: unknown, input: AuditAppend): Promise<void> } = memoryAuditPort(audits)): void {
  setAuditPort({
    async append(tx, input) {
      requireCallerTx(tx)
      auditTxs.push(tx)
      await port.append(tx, input)
    },
  })
}

function insertVerification(
  accountId: string,
  kind: 'phone_otp' | 'liveness' | 'id_document',
  status: 'pending' | 'granted' | 'rejected',
): void {
  const id = newId(now)
  if (kind === 'phone_otp') {
    const row: PhoneOtpRow = {
      id,
      account_id: accountId,
      kind: 'phone_otp',
      status,
      vendor: null,
      evidence_uri: null,
      phone_e164: '+22670000000',
      hash: null,
      expires_at: null,
    }
    otp.rows.push(row)
    return
  }
  captures.rows.push({
    id,
    account_id: accountId,
    kind,
    status,
    vendor: null,
    evidence_uri: 'memory',
    phone_e164: null,
    hash: null,
    expires_at: null,
  })
}

function samplePng(): Buffer {
  const png = new PNG({ width: 8, height: 8 })
  png.data.fill(255)
  return PNG.sync.write(png)
}

describe('human review before anyone else sees a profile', () => {
  let app: INestApplication
  let base: string
  const png = samplePng()

  beforeAll(async () => {
    installTestStaff(staffStore)
    setAuthClock(() => now)
    setMediaClock(() => now)
    setSignedTtlReader(async () => 60)
    setPhotoStrikeConfigReader(async () => ({ count: '3', hours: '24' }))
    setFreeReviewSlaReader(async () => slaHours)
    setPhoneOtpStore(otp)
    setCaptureStore(captures)
    setBillingPort({
      async isEntitled(accountId) {
        billingCalls += 1
        return premium.has(accountId) ? true : 'unavailable'
      },
    })
    installAudit()
    setAuthLimitReader(async () => 100)
    resetAuthRateWindow()
    setAccountStore(memory)
    setSessionStore(sessions)
    setProfileStore(memoryProfileStore(memory.accounts, memory.profiles))
    setMediaStore(media)
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

  afterAll(async () => {
    installTestStaff(undefined)
    setAuthClock(undefined)
    setMediaClock(undefined)
    setSignedTtlReader(undefined)
    setPhotoStrikeConfigReader(undefined)
    setFreeReviewSlaReader(undefined)
    setPhoneOtpStore(undefined)
    setCaptureStore(undefined)
    setBillingPort(undefined)
    setAuditPort(undefined)
    setAuthLimitReader(undefined)
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

  async function createAccount(): Promise<{ id: string; email: string }> {
    serial += 1
    const email = `revue${serial}@example.bf`
    const response = await fetch(`${base}/v1/accounts`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email,
        password: 'phrase avec espaces',
        pseudonym: `Revue_${serial}`,
        gender: 'sister',
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

  /** A real staff session: server-command account, password change, enrollment and a TOTP code (Story 12.1). */
  async function openStaff(role: 'moderator' | 'operator') {
    const staff = await openTestStaff(base, staffStore, role)
    return { ...staff, id: staff.accountId }
  }

  async function saveProfile(cookie: string, body: Record<string, unknown> = {}): Promise<Response> {
    return fetch(`${base}/v1/me/profile`, {
      method: 'PUT',
      headers: { cookie, 'content-type': 'application/json' },
      body: JSON.stringify({ dob: '1990-01-15', ...body }),
    })
  }

  it('keeps an unapproved profile off the listable predicate and out of a member staff call', async () => {
    expect(isListableProfile(null, 'Active')).toBe(false)
    expect(isListableProfile('unpublished', 'Active')).toBe(false)
    expect(isListableProfile('public', 'deactivated')).toBe(false)
    expect(isListableProfile('public', 'Active')).toBe(true)
    expect(isListableProfile('held', 'Active')).toBe(false)

    const operator = await openStaff('operator')
    const operatorCookie = operator.cookie
    billingCalls = 0
    const empty = await fetch(`${base}/v1/staff/metrics`, { headers: { cookie: operatorCookie } })
    expect(empty.status).toBe(200)
    expect(await empty.json()).toEqual({
      free_review: { sla_hours: 24, waiting: 0, sla_breach: 0 },
      reports: { sla_hours: 24, open: 0, sla_breach: 0, oldest_open_started_at: null },
    })
    expect(billingCalls).toBe(0)

    const member = await createAccount()
    const memberCookie = await signIn(member.email)
    const denied = await fetch(`${base}/v1/staff/cases?kind=profile_review`, { headers: { cookie: memberCookie } })
    expect(denied.status).toBe(403)
  })

  it('queues a first save, sorts Premium ahead of an unavailable billing read, and flags the SLA', async () => {
    const free = await createAccount()
    const freeCookie = await signIn(free.email)
    const saved = await saveProfile(freeCookie, { bio_pending: 'Une présentation sobre.' })
    expect(saved.status).toBe(200)
    const savedJson = (await saved.json()) as { review_sla_hours: number; visibility?: string }
    expect(savedJson.review_sla_hours).toBe(24)
    expect(savedJson).not.toHaveProperty('visibility')
    expect(memory.profiles.find((row) => row.account_id === free.id)?.visibility).toBe('unpublished')
    expect(isListableProfile('unpublished', 'Active')).toBe(false)

    now = new Date('2026-10-13T02:00:00.000Z')
    const paid = await createAccount()
    premium.add(paid.id)
    const paidCookie = await signIn(paid.email)
    expect((await saveProfile(paidCookie)).status).toBe(200)

    const moderator = await openStaff('moderator')
    const moderatorCookie = moderator.cookie
    const listed = await fetch(`${base}/v1/staff/cases?kind=profile_review`, { headers: { cookie: moderatorCookie } })
    expect(listed.status).toBe(200)
    const body = (await listed.json()) as {
      rows: Array<{ account_id: string; priority: string; sla_breach: boolean; pseudonym: string; photos: unknown[] }>
    }
    const ids = body.rows.map((row) => row.account_id)
    expect(ids.indexOf(paid.id)).toBeLessThan(ids.indexOf(free.id))
    expect(body.rows.find((row) => row.account_id === paid.id)?.priority).toBe('premium')
    expect(body.rows.find((row) => row.account_id === free.id)?.priority).toBe('free')
    expect(JSON.stringify(body)).not.toContain('original_key')
    expect(JSON.stringify(body)).not.toContain('phone_e164')

    now = new Date('2026-10-14T03:00:00.000Z')
    const laterCookie = await signInTestStaff(base, staffStore, moderator)
    const breached = await fetch(`${base}/v1/staff/metrics`, { headers: { cookie: laterCookie } })
    expect(breached.status).toBe(200)
    const metrics = (await breached.json()) as { free_review: { waiting: number; sla_breach: number; sla_hours: number } }
    expect(metrics.free_review.sla_hours).toBe(24)
    expect(metrics.free_review.waiting).toBeGreaterThanOrEqual(2)
    expect(metrics.free_review.sla_breach).toBeGreaterThanOrEqual(2)
    const callsBefore = billingCalls
    slaHours = 1000
    const calm = await fetch(`${base}/v1/staff/metrics`, { headers: { cookie: laterCookie } })
    expect(await calm.json()).toMatchObject({ free_review: { sla_hours: 1000, sla_breach: 0 } })
    expect(billingCalls).toBe(callsBefore)
    slaHours = 24
  })

  it('requires an explicit decision, publishes only when the gates and unpublished visibility allow it, and retries after a later grant', async () => {
    now = new Date('2026-10-15T00:00:00.000Z')
    slaHours = 24
    const member = await createAccount()
    const cookie = await signIn(member.email)
    expect((await saveProfile(cookie, { bio_pending: 'Bio en attente.' })).status).toBe(200)
    const uploaded = await fetch(`${base}/v1/media`, {
      method: 'POST',
      headers: { cookie, 'content-type': 'application/json' },
      body: JSON.stringify({ kind: 'profile_photo', image: png.toString('base64') }),
    })
    expect(uploaded.status).toBe(201)
    const photo = (await uploaded.json()) as { id: string }
    const asset = media.assets.find((row) => row.id === photo.id)
    expect(asset?.moderation_state).toBe('pending')

    const moderator = await openStaff('moderator')
    const moderatorCookie = moderator.cookie
    const queue = await fetch(`${base}/v1/staff/cases?kind=profile_review`, { headers: { cookie: moderatorCookie } })
    const queued = (await queue.json()) as { rows: Array<{ account_id: string; photos: Array<{ asset_id: string; blur_url: string }> }> }
    const mine = queued.rows.find((row) => row.account_id === member.id)
    expect(mine?.photos.map((item) => item.asset_id)).toEqual([photo.id])
    const token = mine?.photos[0]?.blur_url.split('token=')[1] ?? ''
    const seen = await fetch(`${base}/v1/media/get?token=${token}`, { headers: { cookie: moderatorCookie } })
    expect(seen.status).toBe(200)
    expect(audits.some((row) => row.action === 'moderator_profile_review_view' && row.payload.asset_ids?.includes(photo.id))).toBe(true)

    const missing = await fetch(`${base}/v1/staff/cases`, {
      method: 'POST',
      headers: { cookie: moderatorCookie, 'content-type': 'application/json' },
      body: JSON.stringify({
        kind: 'profile_review',
        account_id: member.id,
        profile: 'block',
        bio: 'block',
        photos: [{ asset_id: photo.id, decision: 'block' }],
      }),
    })
    expect(missing.status).toBe(400)
    expect(media.assets.find((row) => row.id === photo.id)?.moderation_state).toBe('pending')

    const stale = await fetch(`${base}/v1/staff/cases`, {
      method: 'POST',
      headers: { cookie: moderatorCookie, 'content-type': 'application/json' },
      body: JSON.stringify({
        kind: 'profile_review',
        account_id: member.id,
        profile: 'allow',
        bio: 'allow',
        photos: [{ asset_id: newId(now), decision: 'allow' }],
        reason: 'hors sujet',
      }),
    })
    expect(stale.status).toBe(409)
    expect(media.assets.find((row) => row.id === photo.id)?.moderation_state).toBe('pending')

    const absent = await fetch(`${base}/v1/staff/cases`, {
      method: 'POST',
      headers: { cookie: moderatorCookie, 'content-type': 'application/json' },
      body: JSON.stringify({ kind: 'profile_review', account_id: newId(now), profile: 'allow', photos: [] }),
    })
    expect(absent.status).toBe(404)

    const allowed = await fetch(`${base}/v1/staff/cases`, {
      method: 'POST',
      headers: { cookie: moderatorCookie, 'content-type': 'application/json' },
      body: JSON.stringify({
        kind: 'profile_review',
        account_id: member.id,
        profile: 'allow',
        bio: 'allow',
        photos: [{ asset_id: photo.id, decision: 'allow' }],
      }),
    })
    expect(allowed.status).toBe(200)
    const decision = (await allowed.json()) as {
      visibility: string | null
      bio_live: string | null
      bio_pending: string | null
      review_queued_at: string | null
      photos: Array<{ asset_id: string; moderation_state: string }>
    }
    expect(decision.bio_live).toBe('Bio en attente.')
    expect(decision.bio_pending).toBeNull()
    expect(decision.review_queued_at).toBeNull()
    expect(decision.visibility).toBe('unpublished')
    expect(decision.photos).toEqual([{ asset_id: photo.id, moderation_state: 'live' }])
    expect(media.assets.find((row) => row.id === photo.id)?.moderation_state).toBe('live')
    expect(isListableProfile(decision.visibility, 'Active')).toBe(false)
    expect(audits.some((row) => row.action === 'moderator_profile_review_decision' && row.actor_id === moderator.id)).toBe(true)
    expect(auditTxs.length).toBeGreaterThan(0)
    expect(auditTxs.every((tx) => typeof tx === 'object' && tx !== null && 'insert' in tx && 'select' in tx && 'execute' in tx)).toBe(true)

    insertVerification(member.id, 'phone_otp', 'pending')
    insertVerification(member.id, 'id_document', 'granted')
    insertVerification(member.id, 'liveness', 'granted')
    await publishIfEligible(member.id)
    expect(memory.profiles.find((row) => row.account_id === member.id)?.visibility).toBe('unpublished')

    now = new Date('2026-10-15T00:00:01.000Z')
    insertVerification(member.id, 'phone_otp', 'granted')
    insertVerification(member.id, 'id_document', 'pending')
    insertVerification(member.id, 'liveness', 'pending')
    await publishIfEligible(member.id)
    // Staff review console: a pending ID or selfie is not a grant; a Moderator must approve both.
    expect(memory.profiles.find((row) => row.account_id === member.id)?.visibility).toBe('unpublished')
    now = new Date('2026-10-15T00:00:02.000Z')
    insertVerification(member.id, 'id_document', 'granted')
    await publishIfEligible(member.id)
    expect(memory.profiles.find((row) => row.account_id === member.id)?.visibility).toBe('unpublished')
    insertVerification(member.id, 'liveness', 'granted')
    await publishIfEligible(member.id)
    expect(memory.profiles.find((row) => row.account_id === member.id)?.visibility).toBe('public')
    expect(isListableProfile('public', 'Active')).toBe(true)

    const quiet = await saveProfile(cookie, { dob: '1991-01-15' })
    expect(quiet.status).toBe(200)
    const afterQuiet = await fetch(`${base}/v1/staff/cases?kind=profile_review`, { headers: { cookie: moderatorCookie } })
    const still = (await afterQuiet.json()) as { rows: Array<{ account_id: string }> }
    expect(still.rows.some((row) => row.account_id === member.id)).toBe(false)
  })

  it('leaves held in place and blocks a photo without publishing', async () => {
    now = new Date('2026-10-16T00:00:00.000Z')
    const member = await createAccount()
    const stored = memory.profiles.find((row) => row.account_id === member.id)
    expect(stored).toBeTruthy()
    if (stored) {
      stored.visibility = 'held'
    }
    const cookie = await signIn(member.email)
    expect((await saveProfile(cookie)).status).toBe(200)
    expect(memory.profiles.find((row) => row.account_id === member.id)?.visibility).toBe('held')
    const uploaded = await fetch(`${base}/v1/media`, {
      method: 'POST',
      headers: { cookie, 'content-type': 'application/json' },
      body: JSON.stringify({ kind: 'profile_photo', image: png.toString('base64') }),
    })
    expect(uploaded.status).toBe(201)
    const photo = (await uploaded.json()) as { id: string }
    const moderator = await openStaff('moderator')
    const moderatorCookie = moderator.cookie
    const blocked = await fetch(`${base}/v1/staff/cases`, {
      method: 'POST',
      headers: { cookie: moderatorCookie, 'content-type': 'application/json' },
      body: JSON.stringify({
        kind: 'profile_review',
        account_id: member.id,
        profile: 'block',
        photos: [{ asset_id: photo.id, decision: 'block' }],
        reason: 'La photo ne respecte pas les règles publiées.',
      }),
    })
    expect(blocked.status).toBe(200)
    expect(((await blocked.json()) as { photos: Array<{ asset_id: string; moderation_state: string }> }).photos).toEqual([
      { asset_id: photo.id, moderation_state: 'blocked' },
    ])
    expect(media.assets.find((row) => row.id === photo.id)?.moderation_state).toBe('blocked')
    expect(memory.profiles.find((row) => row.account_id === member.id)?.visibility).toBe('held')
    expect(isListableProfile('held', 'Active')).toBe(false)

    const allowed = await createAccount()
    const allowedRow = memory.profiles.find((row) => row.account_id === allowed.id)
    if (allowedRow) {
      allowedRow.visibility = 'held'
    }
    const allowedCookie = await signIn(allowed.email)
    expect((await saveProfile(allowedCookie)).status).toBe(200)
    const second = await fetch(`${base}/v1/media`, {
      method: 'POST',
      headers: { cookie: allowedCookie, 'content-type': 'application/json' },
      body: JSON.stringify({ kind: 'profile_photo', image: png.toString('base64') }),
    })
    expect(second.status).toBe(201)
    const secondPhoto = (await second.json()) as { id: string }
    now = new Date('2026-10-16T00:00:02.000Z')
    insertVerification(allowed.id, 'phone_otp', 'granted')
    insertVerification(allowed.id, 'id_document', 'pending')
    insertVerification(allowed.id, 'liveness', 'granted')
    const kept = await fetch(`${base}/v1/staff/cases`, {
      method: 'POST',
      headers: { cookie: moderatorCookie, 'content-type': 'application/json' },
      body: JSON.stringify({
        kind: 'profile_review',
        account_id: allowed.id,
        profile: 'allow',
        photos: [{ asset_id: secondPhoto.id, decision: 'allow' }],
      }),
    })
    expect(kept.status).toBe(200)
    expect(memory.profiles.find((row) => row.account_id === allowed.id)?.visibility).toBe('held')
    const hidden = memory.profiles.find((row) => row.account_id === allowed.id)
    if (hidden) {
      hidden.visibility = 'emergency_hidden'
    }
    await publishIfEligible(allowed.id)
    expect(memory.profiles.find((row) => row.account_id === allowed.id)?.visibility).toBe('emergency_hidden')
  })

  it('rolls the decision back when the audit write fails', async () => {
    now = new Date('2026-10-17T00:00:00.000Z')
    const member = await createAccount()
    const cookie = await signIn(member.email)
    expect((await saveProfile(cookie, { bio_pending: 'Toujours en file.' })).status).toBe(200)
    const queuedAt = memory.profiles.find((row) => row.account_id === member.id)
    expect(queuedAt?.visibility).toBe('unpublished')
    const uploaded = await fetch(`${base}/v1/media`, {
      method: 'POST',
      headers: { cookie, 'content-type': 'application/json' },
      body: JSON.stringify({ kind: 'profile_photo', image: png.toString('base64') }),
    })
    expect(uploaded.status).toBe(201)
    const photo = (await uploaded.json()) as { id: string }
    const moderator = await openStaff('moderator')
    const moderatorCookie = moderator.cookie
    const inner = memoryAuditPort(audits)
    setAuditPort({
      async append(tx, input) {
        requireCallerTx(tx)
        if (input.action === 'moderator_profile_review_decision') {
          throw new Error('audit down')
        }
        await inner.append(tx, input)
      },
    })
    try {
      const failed = await fetch(`${base}/v1/staff/cases`, {
        method: 'POST',
        headers: { cookie: moderatorCookie, 'content-type': 'application/json' },
        body: JSON.stringify({
          kind: 'profile_review',
          account_id: member.id,
          profile: 'allow',
          bio: 'allow',
          photos: [{ asset_id: photo.id, decision: 'allow' }],
        }),
      })
      expect(failed.status).toBe(500)
    } finally {
      installAudit()
    }
    expect(media.assets.find((row) => row.id === photo.id)?.moderation_state).toBe('pending')
    const profile = await fetch(`${base}/v1/me/profile`, { headers: { cookie } })
    const body = (await profile.json()) as { bio_pending: string | null; bio_live: string | null }
    expect(body.bio_pending).toBe('Toujours en file.')
    expect(body.bio_live).toBeNull()
    const moderatorAgain = await fetch(`${base}/v1/staff/cases?kind=profile_review`, { headers: { cookie: moderatorCookie } })
    const listed = (await moderatorAgain.json()) as { rows: Array<{ account_id: string }> }
    expect(listed.rows.some((row) => row.account_id === member.id)).toBe(true)
  })

  it('publishes from the decision when the gates already pass, and from a later OTP verify when they do not', async () => {
    now = new Date('2026-10-18T00:00:00.000Z')
    const ready = await createAccount()
    const readyCookie = await signIn(ready.email)
    expect((await saveProfile(readyCookie)).status).toBe(200)
    insertVerification(ready.id, 'phone_otp', 'granted')
    now = new Date('2026-10-18T00:00:01.000Z')
    insertVerification(ready.id, 'id_document', 'granted')
    now = new Date('2026-10-18T00:00:02.000Z')
    insertVerification(ready.id, 'liveness', 'granted')
    const moderator = await openStaff('moderator')
    const moderatorCookie = moderator.cookie
    const published = await fetch(`${base}/v1/staff/cases`, {
      method: 'POST',
      headers: { cookie: moderatorCookie, 'content-type': 'application/json' },
      body: JSON.stringify({ kind: 'profile_review', account_id: ready.id, profile: 'allow', photos: [] }),
    })
    expect(published.status).toBe(200)
    expect(((await published.json()) as { visibility: string | null }).visibility).toBe('public')

    now = new Date('2026-10-18T01:00:00.000Z')
    const waiting = await createAccount()
    const waitingCookie = await signIn(waiting.email)
    expect((await saveProfile(waitingCookie)).status).toBe(200)
    insertVerification(waiting.id, 'id_document', 'granted')
    now = new Date('2026-10-18T01:00:01.000Z')
    insertVerification(waiting.id, 'liveness', 'granted')
    // An hour later the staff session is past its 30-minute idle clock (Story 12.1): sign in again.
    const moderatorLater = await signInTestStaff(base, staffStore, moderator)
    const heldBack = await fetch(`${base}/v1/staff/cases`, {
      method: 'POST',
      headers: { cookie: moderatorLater, 'content-type': 'application/json' },
      body: JSON.stringify({ kind: 'profile_review', account_id: waiting.id, profile: 'allow', photos: [] }),
    })
    expect(heldBack.status).toBe(200)
    expect(((await heldBack.json()) as { visibility: string | null }).visibility).toBe('unpublished')

    const codes: string[] = []
    setOtpLimitReader(async () => 100)
    setSmsPort({
      async sendOtp(message) {
        codes.push(message.code)
      },
    })
    try {
      const sent = await fetch(`${base}/v1/verifications/otp`, {
        method: 'POST',
        headers: { cookie: waitingCookie, 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'send', phone_e164: '+22670999001' }),
      })
      expect(sent.status).toBe(201)
      const verified = await fetch(`${base}/v1/verifications/otp`, {
        method: 'POST',
        headers: { cookie: waitingCookie, 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'verify', code: codes[0] }),
      })
      expect(verified.status).toBe(200)
    } finally {
      setSmsPort(undefined)
      setOtpLimitReader(undefined)
    }
    expect(memory.profiles.find((row) => row.account_id === waiting.id)?.visibility).toBe('public')
  })

  it('keeps every live photo when a later photo is allowed and leaves the first one main', async () => {
    now = new Date('2026-10-19T00:00:00.000Z')
    const member = await createAccount()
    const cookie = await signIn(member.email)
    expect((await saveProfile(cookie, { bio_pending: 'Première bio.' })).status).toBe(200)
    const firstUpload = await fetch(`${base}/v1/media`, {
      method: 'POST',
      headers: { cookie, 'content-type': 'application/json' },
      body: JSON.stringify({ kind: 'profile_photo', image: png.toString('base64') }),
    })
    expect(firstUpload.status).toBe(201)
    const first = (await firstUpload.json()) as { id: string; blur_url: string }
    const firstToken = first.blur_url.split('token=')[1] ?? ''
    const moderator = await openStaff('moderator')
    const moderatorCookie = moderator.cookie
    const allowed = await fetch(`${base}/v1/staff/cases`, {
      method: 'POST',
      headers: { cookie: moderatorCookie, 'content-type': 'application/json' },
      body: JSON.stringify({
        kind: 'profile_review',
        account_id: member.id,
        profile: 'allow',
        bio: 'allow',
        photos: [{ asset_id: first.id, decision: 'allow' }],
      }),
    })
    expect(allowed.status).toBe(200)
    const passedAt = (await getProfileStore().read(member.id))?.review_passed_at
    expect(passedAt).toBeTruthy()
    insertVerification(member.id, 'phone_otp', 'granted')
    insertVerification(member.id, 'id_document', 'granted')
    insertVerification(member.id, 'liveness', 'granted')
    await publishIfEligible(member.id)
    expect(memory.profiles.find((row) => row.account_id === member.id)?.visibility).toBe('public')

    now = new Date('2026-10-19T00:00:02.000Z')
    const secondUpload = await fetch(`${base}/v1/media`, {
      method: 'POST',
      headers: { cookie, 'content-type': 'application/json' },
      body: JSON.stringify({ kind: 'profile_photo', image: png.toString('base64') }),
    })
    expect(secondUpload.status).toBe(201)
    const second = (await secondUpload.json()) as { id: string }
    expect(media.assets.find((row) => row.id === first.id)?.moderation_state).toBe('live')
    expect(media.assets.find((row) => row.id === second.id)?.moderation_state).toBe('pending')
    const whilePending = await fetch(`${base}/v1/me/profile`, { headers: { cookie } })
    const pendingBody = (await whilePending.json()) as {
      photo: { id: string; moderation_state: string }
      pending_photo: { id: string; moderation_state: string }
      bio_live: string | null
    }
    expect(pendingBody.photo).toMatchObject({ id: first.id, moderation_state: 'live' })
    expect(pendingBody.pending_photo).toMatchObject({ id: second.id, moderation_state: 'pending' })
    expect(pendingBody.bio_live).toBe('Première bio.')

    const replaced = await fetch(`${base}/v1/staff/cases`, {
      method: 'POST',
      headers: { cookie: moderatorCookie, 'content-type': 'application/json' },
      body: JSON.stringify({
        kind: 'profile_review',
        account_id: member.id,
        photos: [{ asset_id: second.id, decision: 'allow' }],
      }),
    })
    expect(replaced.status).toBe(200)
    const replacedBody = (await replaced.json()) as {
      photos: Array<{ asset_id: string; moderation_state: string }>
      review_passed_at: string | null
      visibility: string | null
    }
    expect(replacedBody.photos).toEqual([{ asset_id: second.id, moderation_state: 'live' }])
    expect(media.assets.find((row) => row.id === first.id)?.moderation_state).toBe('live')
    expect(media.assets.find((row) => row.id === first.id)?.is_main).toBe(true)
    expect(media.assets.find((row) => row.id === second.id)?.moderation_state).toBe('live')
    expect(media.assets.find((row) => row.id === second.id)?.is_main).toBe(false)
    expect(media.assets.filter((row) => row.owner_id === member.id && row.moderation_state === 'live')).toHaveLength(2)
    expect(replacedBody.review_passed_at).toBe(passedAt)
    expect(replacedBody.visibility).toBe('public')
    expect(media.grants.filter((row) => row.photo_asset_id === first.id).every((row) => row.revoked_at !== null)).toBe(false)
    const oldBytes = await fetch(`${base}/v1/media/get?token=${firstToken}`, { headers: { cookie } })
    expect(oldBytes.status).toBe(200)
    const kept = await signMedia(media, first.id, 'blur', member.id)
    expect(kept.ok).toBe(true)
    const liveSigned = await signMedia(media, second.id, 'blur', member.id)
    expect(liveSigned.ok).toBe(true)

    now = new Date('2026-10-19T00:00:04.000Z')
    const thirdUpload = await fetch(`${base}/v1/media`, {
      method: 'POST',
      headers: { cookie, 'content-type': 'application/json' },
      body: JSON.stringify({ kind: 'profile_photo', image: png.toString('base64') }),
    })
    const third = (await thirdUpload.json()) as { id: string }
    const blocked = await fetch(`${base}/v1/staff/cases`, {
      method: 'POST',
      headers: { cookie: moderatorCookie, 'content-type': 'application/json' },
      body: JSON.stringify({
        kind: 'profile_review',
        account_id: member.id,
        photos: [{ asset_id: third.id, decision: 'block' }],
        reason: 'La photo ne respecte pas les règles publiées.',
      }),
    })
    expect(blocked.status).toBe(200)
    expect(media.assets.find((row) => row.id === second.id)?.moderation_state).toBe('live')
    expect(media.assets.find((row) => row.id === third.id)?.moderation_state).toBe('blocked')
    expect(media.assets.find((row) => row.id === first.id)?.moderation_state).toBe('live')
    expect(media.assets.find((row) => row.id === first.id)?.is_main).toBe(true)
    const afterBlock = (await (await fetch(`${base}/v1/me/profile`, { headers: { cookie } })).json()) as {
      photo: { id: string }
      pending_photo?: { id: string }
    }
    expect(afterBlock.photo.id).toBe(first.id)
    expect(afterBlock.pending_photo).toBeUndefined()

    now = new Date('2026-10-19T00:00:06.000Z')
    expect((await saveProfile(cookie, { bio_pending: 'Nouvelle bio.' })).status).toBe(200)
    const bioBlocked = await fetch(`${base}/v1/staff/cases`, {
      method: 'POST',
      headers: { cookie: moderatorCookie, 'content-type': 'application/json' },
      body: JSON.stringify({
        kind: 'profile_review',
        account_id: member.id,
        bio: 'block',
        photos: [],
        reason: 'La présentation ne peut pas être publiée.',
      }),
    })
    expect(bioBlocked.status).toBe(200)
    const bioBody = (await bioBlocked.json()) as { bio_live: string | null; bio_pending: string | null }
    expect(bioBody.bio_live).toBe('Première bio.')
    expect(bioBody.bio_pending).toBeNull()
    expect((await getProfileStore().read(member.id))?.review_passed_at).toBe(passedAt)
  })
})
