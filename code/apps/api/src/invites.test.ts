import { createRequire } from 'node:module'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { AddressInfo } from 'node:net'
import type { INestApplication } from '@nestjs/common'
import { newId } from '@ankanu/kernel'
import type { BillingAnswer } from '@ankanu/ports'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { memoryAccountStore, setAccountStore } from './account-store.js'
import { setAuthClock } from './auth-clock.js'
import { setAuthLimitReader } from './auth-limit.js'
import { resetAuthRateWindow } from './auth-rate.js'
import { setBillingPort } from './billing-port.js'
import { setBrowseLimitReader } from './browse-rate.js'
import { createApp } from './create-app.js'
import { memoryFavouriteStore, setFavouriteStore } from './favourites.js'
import { memoryCaptureStore, setCaptureStore } from './id-liveness-store.js'
import { getInvitesPort, setInvitesPort } from './invites-port.js'
import {
  memoryInviteStore,
  nextOuagadougouMidnight,
  readInviteConfig,
  setInviteConfigReader,
  setInviteStore,
  uuidV7Floor,
  type InviteConfig,
} from './invites.js'
import { setMediaClock, setSignedTtlReader } from './media.js'
import { memoryMediaStore, setMediaStore } from './media-store.js'
import { setMahramPort } from './mahram-port.js'
import { DEFAULT_SISTER_REACH_MODE, free_unlimited, same_quota_as_brothers } from './operator-config.js'
import { memoryPhoneOtpStore, setPhoneOtpStore } from './phone-otp-store.js'
import { memoryPinLockStore, setPinLockStore } from './pin-lock-store.js'
import { resetPinEntries } from './pin-lock-state.js'
import { setPhotoStrikeConfigReader } from './photo-strike.js'
import { setFreeReviewSlaReader } from './profile-review.js'
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

const srcDir = fileURLToPath(new URL('.', import.meta.url))
const memory = memoryAccountStore()
const sessions = memorySessionStore(memory)
const pins = memoryPinLockStore()
const media = memoryMediaStore()
const otp = memoryPhoneOtpStore()
const favourites = memoryFavouriteStore()
const invites = memoryInviteStore()
const captures = memoryCaptureStore({ accounts: memory.accounts, profiles: memory.profiles, phoneRows: [] })

// 10:00 in Ouagadougou (UTC+0) on 2026-10-23.
let now = new Date('2026-10-23T10:00:00.000Z')
let serial = 0
let billingCalls = 0
let billingAnswer: BillingAnswer | 'throw' = false
let config: InviteConfig = { sisterReachMode: same_quota_as_brothers, freeCap: 3, premiumCap: null }

function samplePng(): Buffer {
  const png = new PNG({ width: 8, height: 8 })
  for (let index = 0; index < png.data.length; index += 4) {
    png.data[index] = 40
    png.data[index + 1] = 80
    png.data[index + 2] = 120
    png.data[index + 3] = 255
  }
  return PNG.sync.write(png)
}

type Member = { id: string; email: string; cookie: string }

describe('send an Invite and the daily Invite quota (Stories 4.1, 4.2)', { timeout: 60_000 }, () => {
  let app: INestApplication
  let base: string
  const png = samplePng()

  beforeAll(async () => {
    setAuthClock(() => now)
    setMediaClock(() => now)
    setSignedTtlReader(async () => 60)
    setPhotoStrikeConfigReader(async () => ({ count: '3', hours: '24' }))
    setFreeReviewSlaReader(async () => 24)
    setAuthLimitReader(async () => 1000)
    setBrowseLimitReader(async () => 1000)
    setMahramPort(undefined)
    setBillingPort({
      async isEntitled() {
        billingCalls += 1
        if (billingAnswer === 'throw') {
          throw new Error('billing adapter down')
        }
        return billingAnswer
      },
    })
    setInviteConfigReader(async () => config)
    setAccountStore(memory)
    setSessionStore(sessions)
    setProfileStore(memoryProfileStore(memory.accounts, memory.profiles))
    setFavouriteStore(favourites)
    setInviteStore(invites)
    setInvitesPort(undefined)
    setMediaStore(media)
    setPhoneOtpStore(otp)
    setCaptureStore(captures)
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
    favourites.rows.length = 0
    invites.rows.length = 0
    invites.quota.length = 0
    billingCalls = 0
    billingAnswer = false
    config = { sisterReachMode: same_quota_as_brothers, freeCap: 3, premiumCap: null }
    now = new Date('2026-10-23T10:00:00.000Z')
    resetAuthRateWindow()
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
    setInviteConfigReader(undefined)
    setInviteStore(undefined)
    setInvitesPort(undefined)
    setPhoneOtpStore(undefined)
    setCaptureStore(undefined)
    resetAuthRateWindow()
    setAccountStore(undefined)
    setSessionStore(undefined)
    setProfileStore(undefined)
    setFavouriteStore(undefined)
    setMediaStore(undefined)
    setPinLockStore(undefined)
    resetPinEntries()
    if (app) {
      await app.close()
    }
  })

  function call(path: string, cookie: string | undefined, method = 'GET', body?: unknown): Promise<Response> {
    const headers: Record<string, string> = {}
    if (cookie) {
      headers.cookie = cookie
    }
    if (body !== undefined) {
      headers['content-type'] = 'application/json'
    }
    const init: RequestInit = { method, headers }
    if (body !== undefined) {
      init.body = JSON.stringify(body)
    }
    return fetch(`${base}${path}`, init)
  }

  async function createAccount(gender: 'sister' | 'brother'): Promise<{ id: string; email: string }> {
    serial += 1
    const email = `inv${serial}@example.bf`
    const response = await call('/v1/accounts', undefined, 'POST', {
      email,
      password: 'phrase avec espaces',
      pseudonym: `Inv_${serial}`,
      gender,
      pledge_accepted: true,
      civil_given_name: 'Awa',
      civil_family_name: 'Sawadogo',
      recaptcha_token: 'test-ok',
      coc_version: 'FR-089',
      dob: '1990-01-15',
    })
    expect(response.status).toBe(201)
    const json = (await response.json()) as { id: string }
    return { id: json.id, email }
  }

  async function signIn(email: string): Promise<string> {
    const response = await call('/v1/sessions', undefined, 'POST', {
      identifier: email,
      password: 'phrase avec espaces',
      remember_me: false,
      recaptcha_token: 'test-ok',
    })
    expect(response.status).toBe(201)
    const cookie = response.headers.getSetCookie().join('\n')
    const match = new RegExp(`${SESSION_COOKIE}=([^;]+)`).exec(cookie)
    return `${SESSION_COOKIE}=${match?.[1] ?? ''}`
  }

  async function publish(id: string, cookie: string): Promise<void> {
    const saved = await call('/v1/me/profile', cookie, 'PUT', {
      dob: '1990-01-15',
      city: 'ouagadougou',
      country: 'BF',
      profession: 'ingenierie',
      marital_status: 'single',
      polygamy_intent: 'no',
      madhhab: 'maliki',
      practice: 'assidue',
      life_plans: 'tf:6months\nUnion stable',
    })
    expect(saved.status).toBe(200)
    const row = memory.profiles.find((item) => item.account_id === id)
    if (row) {
      row.visibility = 'public'
    }
  }

  async function liveMain(ownerCookie: string): Promise<void> {
    const posted = await call('/v1/media', ownerCookie, 'POST', { kind: 'profile_photo', image: png.toString('base64') })
    expect(posted.status).toBe(201)
    const json = (await posted.json()) as { id: string }
    const asset = media.assets.find((row) => row.id === json.id)
    if (asset) {
      asset.moderation_state = 'live'
      asset.is_main = true
    }
  }

  /** A listable member. `photo: false` leaves her without a live MAIN Profile Photo. */
  async function member(gender: 'sister' | 'brother', photo = true): Promise<Member> {
    const created = await createAccount(gender)
    const cookie = await signIn(created.email)
    await publish(created.id, cookie)
    if (photo) {
      await liveMain(cookie)
    }
    return { ...created, cookie }
  }

  async function members(gender: 'sister' | 'brother', total: number): Promise<Member[]> {
    const list: Member[] = []
    for (let index = 0; index < total; index += 1) {
      list.push(await member(gender))
    }
    return list
  }

  function send(from: Member, to: { id: string }): Promise<Response> {
    return call('/v1/invites', from.cookie, 'POST', { to_id: to.id })
  }

  it('AC 4.1-1: a ready Brother sends an Invite and it is on the Sister’s received list', async () => {
    const brother = await member('brother')
    const sister = await member('sister')
    billingCalls = 0

    const sent = await send(brother, sister)
    expect(sent.status).toBe(201)
    expect(sent.headers.get('cache-control')).toBe('no-store')
    const body = (await sent.json()) as {
      invite: { id: string; to_id: string; state: string; created_at: string }
      quota: Record<string, unknown>
    }
    expect(body.invite).toEqual({ id: body.invite.id, to_id: sister.id, state: 'pending', created_at: now.toISOString() })
    expect(body.quota).toEqual({ capped: true, cap: 3, remaining: 2, resets_at: '2026-10-24T00:00:00.000Z' })
    expect(body.quota).not.toHaveProperty('sister_reach_mode')
    expect(invites.rows).toHaveLength(1)
    expect(invites.quota).toEqual([{ account_id: brother.id, civil_day_ouaga: '2026-10-23', sent_count: 1 }])

    const received = await call('/v1/invites?box=received', sister.cookie)
    expect(received.status).toBe(200)
    expect(received.headers.get('cache-control')).toBe('no-store')
    expect(await received.json()).toEqual({
      box: 'received',
      count: 1,
      items: [
        {
          id: body.invite.id,
          state: 'pending',
          created_at: now.toISOString(),
          from_id: brother.id,
          pseudonym: expect.stringMatching(/^Inv_/),
          // Story 4.4 grows each row with the inbox fields; the 4.1 fields above are unchanged.
          direction: 'received',
          other_id: brother.id,
          conversation_id: null,
          other: expect.objectContaining({ available: true, marital_status: 'single', polygamy_intent: 'no' }),
        },
      ],
    })
    const byDefault = (await (await call('/v1/invites', sister.cookie)).json()) as { box: string; count: number }
    expect(byDefault).toMatchObject({ box: 'received', count: 1 })

    const sentList = (await (await call('/v1/invites?box=sent', brother.cookie)).json()) as {
      items: Array<{ to_id: string }>
    }
    expect(sentList.items).toEqual([expect.objectContaining({ id: body.invite.id, to_id: sister.id })])
    const brotherReceived = (await (await call('/v1/invites?box=received', brother.cookie)).json()) as { count: number }
    expect(brotherReceived.count).toBe(0)

    const badBox = await call('/v1/invites?box=all', sister.cookie)
    expect(badBox.status).toBe(400)
    expect(await badBox.json()).toMatchObject({ error: { details: { field: 'box' } } })
  })

  it('a double submit to the same recipient keeps one pending Invite and counts once', async () => {
    const brother = await member('brother')
    const sister = await member('sister')
    const first = await send(brother, sister)
    expect(first.status).toBe(201)
    const firstBody = (await first.json()) as { invite: { id: string } }
    const again = await send(brother, sister)
    expect(again.status).toBe(200)
    const againBody = (await again.json()) as { invite: { id: string }; quota: { remaining: number } }
    expect(againBody.invite.id).toBe(firstBody.invite.id)
    expect(againBody.quota.remaining).toBe(2)
    expect(invites.rows).toHaveLength(1)
    expect(invites.quota[0]?.sent_count).toBe(1)

    const parallel = await member('sister')
    const both = await Promise.all([send(brother, parallel), send(brother, parallel)])
    expect(both.map((item) => item.status).sort()).toEqual([200, 201])
    expect(invites.rows.filter((row) => row.to_id === parallel.id)).toHaveLength(1)
    expect(invites.quota[0]?.sent_count).toBe(2)
  })

  it('AC 4.1-2: no Profile Photo blocks the send with a prompt to add one, and writes nothing', async () => {
    const brother = await member('brother', false)
    const sister = await member('sister')
    billingCalls = 0
    const refused = await send(brother, sister)
    expect(refused.status).toBe(403)
    expect(await refused.json()).toMatchObject({
      error: {
        code: 'FORBIDDEN',
        message: 'Ajoutez une photo de profil pour envoyer une invitation.',
        details: { reason: 'photo_required' },
        retryable: false,
      },
    })
    expect(invites.rows).toHaveLength(0)
    expect(invites.quota).toHaveLength(0)
    expect(billingCalls).toBe(0)

    const quota = await call('/v1/invites/quota', brother.cookie)
    expect(quota.status).toBe(200)
    expect(await quota.json()).toMatchObject({ sender: { photo: false, profile_ready: true } })

    const pending = media.assets.find((row) => row.owner_id === sister.id)
    if (pending) {
      pending.moderation_state = 'pending'
    }
    const sisterRefused = await send(sister, brother)
    expect(sisterRefused.status).toBe(403)
    expect(await sisterRefused.json()).toMatchObject({ error: { details: { reason: 'photo_required' } } })
  })

  it('refuses a sender whose Invite-ready fields are incomplete', async () => {
    const brother = await member('brother')
    const created = await createAccount('sister')
    const cookie = await signIn(created.email)
    const saved = await call('/v1/me/profile', cookie, 'PUT', { dob: '1990-01-15', city: 'ouagadougou', country: 'BF' })
    expect(saved.status).toBe(200)
    setVisibility(created.id, 'public')
    await liveMain(cookie)
    const sister = { ...created, cookie }
    const refused = await send(sister, brother)
    expect(refused.status).toBe(403)
    expect(await refused.json()).toMatchObject({
      error: {
        message: 'Complétez votre profil pour envoyer une invitation.',
        details: { reason: 'profile_incomplete', missing: ['madhhab', 'pratique', 'intentions'] },
      },
    })
    expect(invites.rows).toHaveLength(0)
  })

  it('AC 4.1-3: a deactivated, held, deleted, hidden or unpublished recipient is rejected with one 404', async () => {
    const brother = await member('brother')
    const states: Array<(id: string) => void> = [
      (id) => setStatus(id, 'deactivated'),
      (id) => setStatus(id, 'held'),
      (id) => setStatus(id, 'pending_deletion'),
      (id) => setVisibility(id, 'emergency_hidden'),
      (id) => setVisibility(id, 'held'),
      (id) => setVisibility(id, 'unpublished'),
    ]
    for (const apply of states) {
      const sister = await member('sister')
      apply(sister.id)
      const refused = await send(brother, sister)
      expect(refused.status).toBe(404)
      expect(await refused.json()).toMatchObject({
        error: { code: 'NOT_FOUND', message: "Ce profil n'est pas disponible.", details: null },
      })
    }
    const sameGender = await member('brother')
    expect((await send(brother, sameGender)).status).toBe(404)
    expect((await send(brother, { id: newId(now) })).status).toBe(404)

    const self = await send(brother, brother)
    expect(self.status).toBe(400)
    expect(await self.json()).toMatchObject({ error: { details: { field: 'to_id' } } })
    for (const body of [{}, { to_id: 'abc' }, { to_id: 12 }, [], null]) {
      const bad = await call('/v1/invites', brother.cookie, 'POST', body)
      expect(bad.status).toBe(400)
    }
    expect(invites.rows).toHaveLength(0)
    expect(invites.quota).toHaveLength(0)
  })

  function setStatus(id: string, status: string): void {
    const row = memory.accounts.find((item) => item.id === id)
    if (row) {
      ;(row as { status: string }).status = status
    }
  }

  function setVisibility(id: string, visibility: string): void {
    const row = memory.profiles.find((item) => item.account_id === id)
    if (row) {
      row.visibility = visibility
    }
  }

  it('AC 4.1-4 and 4.2-3: a Sister in free_unlimited sends her Nth Invite with no quota and no BillingPort call', async () => {
    config = { ...config, sisterReachMode: free_unlimited }
    for (const answer of [false, 'unavailable', 'throw'] as const) {
      billingAnswer = answer
      const sister = await member('sister')
      const brothers = await members('brother', 6)
      billingCalls = 0
      for (const brother of brothers) {
        const sent = await send(sister, brother)
        expect(sent.status).toBe(201)
        expect(((await sent.json()) as { quota: unknown }).quota).toEqual({ capped: false, sister_reach_mode: 'free_unlimited' })
      }
      const quota = await call('/v1/invites/quota', sister.cookie)
      expect(await quota.json()).toEqual({
        capped: false,
        sister_reach_mode: 'free_unlimited',
        sender: { photo: true, profile_ready: true },
      })
      expect(billingCalls).toBe(0)
      expect(invites.quota.filter((row) => row.account_id === sister.id)).toHaveLength(0)
    }
  })

  it('AC 4.1-5: a Sister in same_quota_as_brothers with no pack gets QUOTA_EXCEEDED on her 4th Invite that Ouaga day', async () => {
    const sister = await member('sister')
    const brothers = await members('brother', 4)
    billingCalls = 0
    for (const brother of brothers.slice(0, 3)) {
      expect((await send(sister, brother)).status).toBe(201)
    }
    const fourth = await send(sister, brothers[3] as Member)
    expect(fourth.status).toBe(429)
    expect(await fourth.json()).toMatchObject({
      error: {
        code: 'QUOTA_EXCEEDED',
        message: 'Envoi refusé. Quota du jour atteint.',
        details: { reason: 'invite_quota', cap: 3, remaining: 0, resets_at: '2026-10-24T00:00:00.000Z' },
        retryable: false,
      },
    })
    expect(invites.rows.filter((row) => row.from_id === sister.id)).toHaveLength(3)
    expect(billingCalls).toBeGreaterThan(0)
    const quota = await call('/v1/invites/quota', sister.cookie)
    expect(await quota.json()).toEqual({
      capped: true,
      cap: 3,
      remaining: 0,
      resets_at: '2026-10-24T00:00:00.000Z',
      sister_reach_mode: 'same_quota_as_brothers',
      sender: { photo: true, profile_ready: true },
    })
  })

  it('AC 4.2-1: a Free Brother gets QUOTA_EXCEEDED on the 4th, and a new Ouaga day resets it', async () => {
    now = new Date('2026-10-23T23:50:00.000Z')
    const brother = await member('brother')
    const sisters = await members('sister', 5)
    now = new Date('2026-10-23T23:58:00.000Z')
    for (const sister of sisters.slice(0, 3)) {
      expect((await send(brother, sister)).status).toBe(201)
    }
    const fourth = await send(brother, sisters[3] as Member)
    expect(fourth.status).toBe(429)
    const body = (await fourth.json()) as { error: { code: string; details: { resets_at: string } } }
    expect(body.error.code).toBe('QUOTA_EXCEEDED')
    // Fay, 2026-10-23: the refusal carries the reset time and nothing pack-specific (Premium is the only offer).
    expect(body.error.details).toEqual({ reason: 'invite_quota', cap: 3, remaining: 0, resets_at: '2026-10-24T00:00:00.000Z' })
    expect(JSON.stringify(body)).not.toMatch(/pack|price|prix|xof/i)
    expect(body.error.details.resets_at).toBe('2026-10-24T00:00:00.000Z')

    now = new Date('2026-10-24T00:00:00.000Z')
    const nextDay = await send(brother, sisters[3] as Member)
    expect(nextDay.status).toBe(201)
    expect(((await nextDay.json()) as { quota: { remaining: number } }).quota.remaining).toBe(2)
    expect(invites.quota).toEqual([
      { account_id: brother.id, civil_day_ouaga: '2026-10-23', sent_count: 3 },
      { account_id: brother.id, civil_day_ouaga: '2026-10-24', sent_count: 1 },
    ])
  })

  it('two parallel sends cannot both take the last free slot', async () => {
    const brother = await member('brother')
    const sisters = await members('sister', 4)
    for (const sister of sisters.slice(0, 2)) {
      expect((await send(brother, sister)).status).toBe(201)
    }
    const raced = await Promise.all([send(brother, sisters[2] as Member), send(brother, sisters[3] as Member)])
    expect(raced.map((item) => item.status).sort()).toEqual([201, 429])
    expect(invites.quota[0]?.sent_count).toBe(3)
    expect(invites.rows).toHaveLength(3)
  })

  it('AC 4.2-2: Premium has no daily Invite cap (the 4th and the 16th succeed), Brother and Sister alike', async () => {
    billingAnswer = true
    const brother = await member('brother')
    const sisters = await members('sister', 16)
    for (const sister of sisters) {
      const sent = await send(brother, sister)
      expect(sent.status).toBe(201)
      expect(((await sent.json()) as { quota: unknown }).quota).toEqual({ capped: false, unlimited: true })
    }
    expect(invites.quota).toEqual([{ account_id: brother.id, civil_day_ouaga: '2026-10-23', sent_count: 16 }])

    const premiumSister = await member('sister')
    const brothers = await members('brother', 5)
    for (const target of brothers) {
      expect((await send(premiumSister, target)).status).toBe(201)
    }
    const quota = (await (await call('/v1/invites/quota', premiumSister.cookie)).json()) as Record<string, unknown>
    expect(quota).toMatchObject({ capped: false, unlimited: true, sister_reach_mode: 'same_quota_as_brothers' })
  })

  it('AC 4.2-4: billing unavailable means the Free cap for a Sister in same_quota_as_brothers, and safety still works', async () => {
    for (const answer of ['unavailable', 'throw'] as const) {
      billingAnswer = answer
      const sister = await member('sister')
      const brothers = await members('brother', 4)
      for (const brother of brothers.slice(0, 3)) {
        expect((await send(sister, brother)).status).toBe(201)
      }
      expect((await send(sister, brothers[3] as Member)).status).toBe(429)
      const profile = await call(`/v1/profiles/${brothers[3]?.id ?? ''}`, sister.cookie)
      expect(profile.status).toBe(200)
      const saved = await call('/v1/favourites', sister.cookie, 'POST', { target_id: brothers[3]?.id })
      expect(saved.status).toBe(201)
    }
  })

  it('decision 2026-10-23: with no operator row the default is same_quota_as_brothers, so a Free Sister is capped', async () => {
    expect(DEFAULT_SISTER_REACH_MODE).toBe(same_quota_as_brothers)
    setInviteConfigReader(undefined)
    const previous = process.env['DATABASE_URL']
    delete process.env['DATABASE_URL']
    try {
      expect(await readInviteConfig()).toEqual({ sisterReachMode: same_quota_as_brothers, freeCap: 3, premiumCap: null })
      const sister = await member('sister')
      const brothers = await members('brother', 4)
      for (const brother of brothers.slice(0, 3)) {
        expect((await send(sister, brother)).status).toBe(201)
      }
      expect((await send(sister, brothers[3] as Member)).status).toBe(429)
    } finally {
      if (previous !== undefined) {
        process.env['DATABASE_URL'] = previous
      }
      setInviteConfigReader(async () => config)
    }
  })

  it('a switch to same_quota_as_brothers binds the next send; earlier free_unlimited sends that day do not count', async () => {
    config = { ...config, sisterReachMode: free_unlimited }
    const sister = await member('sister')
    const brothers = await members('brother', 6)
    for (const brother of brothers.slice(0, 2)) {
      expect((await send(sister, brother)).status).toBe(201)
    }
    config = { ...config, sisterReachMode: same_quota_as_brothers }
    for (const brother of brothers.slice(2, 5)) {
      expect((await send(sister, brother)).status).toBe(201)
    }
    expect((await send(sister, brothers[5] as Member)).status).toBe(429)
    expect(invites.rows.filter((row) => row.from_id === sister.id)).toHaveLength(5)
  })

  it('a broken cap in operator_config is a 500, never a free pass', async () => {
    const brother = await member('brother')
    const sister = await member('sister')
    setInviteConfigReader(async () => null)
    try {
      const sent = await send(brother, sister)
      expect(sent.status).toBe(500)
      expect(invites.rows).toHaveLength(0)
    } finally {
      setInviteConfigReader(async () => config)
    }
  })

  it('refuses no session, staff, mahram and a sender who is not listable', async () => {
    const sister = await member('sister')
    const brother = await member('brother')
    for (const [path, method] of [
      ['/v1/invites', 'POST'],
      ['/v1/invites', 'GET'],
      ['/v1/invites/quota', 'GET'],
    ] as const) {
      const anon = await call(path, undefined, method, method === 'POST' ? { to_id: sister.id } : undefined)
      expect(anon.status).toBe(401)
    }
    const account = memory.accounts.find((item) => item.id === brother.id)
    ;(account as { roles: string[] }).roles = ['moderator']
    const staff = await send(brother, sister)
    expect(staff.status).toBe(403)
    expect(await staff.json()).toMatchObject({ error: { details: { reason: 'staff_session' } } })
    ;(account as { roles: string[] }).roles = ['mahram']
    expect((await call('/v1/invites/quota', brother.cookie)).status).toBe(403)
    ;(account as { roles: string[] }).roles = ['member']
    setVisibility(brother.id, 'unpublished')
    const hidden = await send(brother, sister)
    expect(hidden.status).toBe(403)
    expect(await hidden.json()).toMatchObject({ error: { details: { reason: 'viewer_not_listable' } } })
    expect(invites.rows).toHaveLength(0)
  })

  it('InvitesPort counts real invite rows in the window (T&S visit signals)', async () => {
    const brother = await member('brother')
    const sister = await member('sister')
    expect(await getInvitesPort().sentCountSince(brother.id, new Date(now.getTime() - 1000))).toBe(0)
    expect((await send(brother, sister)).status).toBe(201)
    expect(await getInvitesPort().sentCountSince(brother.id, new Date(now.getTime() - 1000))).toBe(1)
    expect(await getInvitesPort().sentCountSince(brother.id, new Date(now.getTime() + 1000))).toBe(0)
    expect(await getInvitesPort().sentCountSince(sister.id, new Date(0))).toBe(0)
  })
})

describe('invite helpers', () => {
  it('resets on the next Africa/Ouagadougou midnight', () => {
    expect(nextOuagadougouMidnight(new Date('2026-10-23T00:00:00.000Z'))).toBe('2026-10-24T00:00:00.000Z')
    expect(nextOuagadougouMidnight(new Date('2026-10-23T23:59:59.999Z'))).toBe('2026-10-24T00:00:00.000Z')
    expect(nextOuagadougouMidnight(new Date('2026-12-31T12:00:00.000Z'))).toBe('2027-01-01T00:00:00.000Z')
  })

  it('floors a UUID v7 at the instant', () => {
    const at = new Date('2026-10-23T10:00:00.000Z')
    const floor = uuidV7Floor(at)
    expect(newId(at) >= floor).toBe(true)
    expect(newId(new Date(at.getTime() - 1)) < floor).toBe(true)
  })

  it('AC 4.2-1: QUOTA_EXCEEDED is Invite-only in api code', () => {
    const users = readdirSync(srcDir)
      .filter((name) => name.endsWith('.ts') && !name.endsWith('.test.ts'))
      .filter((name) => readFileSync(join(srcDir, name), 'utf8').includes('QUOTA_EXCEEDED'))
    expect(users).toEqual(['invites.ts'])
  })

  it('AC 4.2-5: browse and discovery never read BillingPort, so Premium buys no ranking boost (FR-111 off)', () => {
    const discovery = readdirSync(srcDir).filter(
      (name) =>
        name.endsWith('.ts') &&
        !name.endsWith('.test.ts') &&
        /^(browse|public-profile|favourites|discovery|filters|profiles\.controller|visit-signals)/.test(name),
    )
    expect(discovery.length).toBeGreaterThan(5)
    for (const name of discovery) {
      const source = readFileSync(join(srcDir, name), 'utf8')
      expect(source, name).not.toMatch(/billing-port|isEntitled/)
    }
  })
})
