import { createRequire } from 'node:module'
import type { AddressInfo } from 'node:net'
import type { INestApplication } from '@nestjs/common'
import { newId } from '@ankanu/kernel'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { memoryAccountStore, setAccountStore } from './account-store.js'
import { memoryAuditPort, setAuditPort, type AuditRow } from './audit-port.js'
import { setAuthClock } from './auth-clock.js'
import { setAuthLimitReader } from './auth-limit.js'
import { resetAuthRateWindow } from './auth-rate.js'
import { setBillingPort } from './billing-port.js'
import { createApp } from './create-app.js'
import { setMediaClock, setSignedTtlReader } from './media.js'
import { memoryMediaStore, setMediaStore } from './media-store.js'
import { memoryPinLockStore, setPinLockStore } from './pin-lock-store.js'
import { resetPinEntries } from './pin-lock-state.js'
import { isListableProfile, publishIfEligible, setFreeReviewSlaReader, setVerificationGateReader } from './profile-review.js'
import { memoryProfileStore, setProfileStore } from './profile-store.js'
import { SESSION_COOKIE } from './session-cookie.js'
import { memorySessionStore, setSessionStore } from './session-store.js'

const require = createRequire(import.meta.url)
const { PNG } = require('pngjs') as {
  PNG: {
    new (options: { width: number; height: number }): { data: Buffer; width: number; height: number }
    sync: { write(png: { data: Buffer; width: number; height: number }): Buffer }
  }
}

const memory = memoryAccountStore()
const sessions = memorySessionStore(memory)
const pins = memoryPinLockStore()
const media = memoryMediaStore()
const audits: AuditRow[] = []
let now = new Date('2026-10-13T00:00:00.000Z')
let slaHours = 24
let gatesOpen = false
let billingCalls = 0
const premium = new Set<string>()
let serial = 0

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
    setAuthClock(() => now)
    setMediaClock(() => now)
    setSignedTtlReader(async () => 60)
    setFreeReviewSlaReader(async () => slaHours)
    setVerificationGateReader(async () => gatesOpen)
    setBillingPort({
      async isEntitled(accountId) {
        billingCalls += 1
        return premium.has(accountId) ? true : 'unavailable'
      },
    })
    setAuditPort(memoryAuditPort(audits))
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
    setAuthClock(undefined)
    setMediaClock(undefined)
    setSignedTtlReader(undefined)
    setFreeReviewSlaReader(undefined)
    setVerificationGateReader(undefined)
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

  function asStaff(accountId: string, role: 'moderator' | 'operator'): void {
    const row = memory.accounts.find((item) => item.id === accountId)
    expect(row).toBeTruthy()
    ;(row as { roles: string[] }).roles = [role]
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

    const operator = await createAccount()
    const operatorCookie = await signIn(operator.email)
    asStaff(operator.id, 'operator')
    billingCalls = 0
    const empty = await fetch(`${base}/v1/staff/metrics`, { headers: { cookie: operatorCookie } })
    expect(empty.status).toBe(200)
    expect(await empty.json()).toEqual({ free_review: { sla_hours: 24, waiting: 0, sla_breach: 0 } })
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

    const moderator = await createAccount()
    const moderatorCookie = await signIn(moderator.email)
    asStaff(moderator.id, 'moderator')
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
    const laterCookie = await signIn(moderator.email)
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
    gatesOpen = false
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

    const moderator = await createAccount()
    const moderatorCookie = await signIn(moderator.email)
    asStaff(moderator.id, 'moderator')
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
    const decision = (await allowed.json()) as { visibility: string | null; bio_live: string | null; bio_pending: string | null; review_queued_at: string | null }
    expect(decision.bio_live).toBe('Bio en attente.')
    expect(decision.bio_pending).toBeNull()
    expect(decision.review_queued_at).toBeNull()
    expect(decision.visibility).toBe('unpublished')
    expect(media.assets.find((row) => row.id === photo.id)?.moderation_state).toBe('live')
    expect(isListableProfile(decision.visibility, 'Active')).toBe(false)
    expect(audits.some((row) => row.action === 'moderator_profile_review_decision' && row.actor_id === moderator.id)).toBe(true)

    gatesOpen = true
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
    gatesOpen = true
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
    const moderator = await createAccount()
    const moderatorCookie = await signIn(moderator.email)
    asStaff(moderator.id, 'moderator')
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
    expect(media.assets.find((row) => row.id === photo.id)?.moderation_state).toBe('blocked')
    expect(memory.profiles.find((row) => row.account_id === member.id)?.visibility).toBe('held')
    expect(isListableProfile('held', 'Active')).toBe(false)
  })
})
