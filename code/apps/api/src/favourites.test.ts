import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import type { AddressInfo } from 'node:net'
import type { INestApplication } from '@nestjs/common'
import { newId } from '@ankanu/kernel'
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
import { setMediaClock, setSignedTtlReader } from './media.js'
import { memoryMediaStore, setMediaStore } from './media-store.js'
import { setMahramPort } from './mahram-port.js'
import { memoryPhoneOtpStore, setPhoneOtpStore } from './phone-otp-store.js'
import { memoryPinLockStore, setPinLockStore } from './pin-lock-store.js'
import { resetPinEntries } from './pin-lock-state.js'
import { setPhotoStrikeConfigReader } from './photo-strike.js'
import { setFreeReviewSlaReader } from './profile-review.js'
import { getProfileStore, memoryProfileStore, setProfileStore } from './profile-store.js'
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
const otp = memoryPhoneOtpStore()
const favourites = memoryFavouriteStore()
const captures = memoryCaptureStore({
  accounts: memory.accounts,
  profiles: memory.profiles,
  phoneRows: [],
})
let now = new Date('2026-10-13T12:00:00.000Z')
let serial = 0
let billingCalls = 0

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

type FavouriteItem = {
  target_id: string
  created_at: string
  pseudonym: string
  age: number
  city: string | null
  profession: string | null
  madhhab: string | null
  practice: string | null
  marital_status: string | null
  polygamy_intent: string | null
  verified: boolean
  photo_blur: boolean
  photo: { id: string; url: string } | null
  bio: string | null
}

describe('private favourites', () => {
  let app: INestApplication
  let base: string
  const png = samplePng()

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
        billingCalls += 1
        return true
      },
    })
    setAccountStore(memory)
    setSessionStore(sessions)
    setProfileStore(memoryProfileStore(memory.accounts, memory.profiles))
    setFavouriteStore(favourites)
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
    billingCalls = 0
    resetAuthRateWindow()
    setBrowseLimitReader(async () => 1000)
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

  async function createAccount(gender: 'sister' | 'brother'): Promise<{ id: string; email: string }> {
    serial += 1
    now = new Date(now.getTime() + 1)
    const email = `fav${serial}@example.bf`
    const response = await fetch(`${base}/v1/accounts`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email,
        password: 'phrase avec espaces',
        pseudonym: `Fav_${serial}`,
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

  async function liveMain(ownerCookie: string): Promise<string> {
    const posted = await fetch(`${base}/v1/media`, {
      method: 'POST',
      headers: { cookie: ownerCookie, 'content-type': 'application/json' },
      body: JSON.stringify({ kind: 'profile_photo', image: png.toString('base64') }),
    })
    expect(posted.status).toBe(201)
    const json = (await posted.json()) as { id: string }
    const asset = media.assets.find((row) => row.id === json.id)
    expect(asset).toBeTruthy()
    if (asset) {
      asset.moderation_state = 'live'
      asset.is_main = true
    }
    return json.id
  }

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

  it('saves a private list and does not expose who favourited a member', async () => {
    const sister = await createAccount('sister')
    const brother = await createAccount('brother')
    const other = await createAccount('sister')
    const sisterCookie = await signIn(sister.email)
    const brotherCookie = await signIn(brother.email)
    const otherCookie = await signIn(other.email)
    await publish(sister.id, sisterCookie)
    await publish(brother.id, brotherCookie)
    await publish(other.id, otherCookie)
    await getProfileStore().patchReview(brother.id, { bio_live: '  Foyer posé.  ' })
    grant(brother.id, 'id_document')
    grant(brother.id, 'liveness')
    const photoId = await liveMain(brotherCookie)

    const created = await call('/v1/favourites', sisterCookie, 'POST', { target_id: brother.id })
    expect(created.status).toBe(201)
    expect(created.headers.get('cache-control')).toBe('no-store')
    const createdBody = (await created.json()) as { account_id: string; target_id: string; created_at: string }
    expect(createdBody).toEqual({
      account_id: sister.id,
      target_id: brother.id,
      created_at: createdBody.created_at,
    })
    expect(favourites.rows).toHaveLength(1)

    const again = await call('/v1/favourites', sisterCookie, 'POST', { target_id: brother.id })
    expect(again.status).toBe(200)
    expect(await again.json()).toEqual(createdBody)
    expect(favourites.rows).toHaveLength(1)

    const listed = await call('/v1/favourites', sisterCookie)
    expect(listed.status).toBe(200)
    expect(listed.headers.get('cache-control')).toBe('no-store')
    const list = (await listed.json()) as { count: number; items: FavouriteItem[] }
    expect(list.count).toBe(1)
    expect(list.items).toEqual([
      {
        target_id: brother.id,
        created_at: createdBody.created_at,
        pseudonym: 'Fav_2',
        age: 36,
        city: 'Ouagadougou',
        profession: 'ingenierie',
        madhhab: 'Maliki',
        practice: 'Pratique assidue',
        marital_status: 'Célibataire',
        polygamy_intent: 'Non',
        verified: true,
        photo_blur: true,
        photo: { id: photoId, url: expect.stringMatching(/^\/v1\/media\/get\?token=/) },
        bio: 'Foyer posé.',
      },
    ])
    expect(JSON.stringify(list)).not.toContain('Secteur')
    expect(JSON.stringify(list)).not.toContain('quartier')

    const own = await call('/v1/favourites', brotherCookie)
    expect(own.status).toBe(200)
    expect(await own.json()).toEqual({ count: 0, items: [] })
    const absent = await call('/v1/who-favourited-me', sisterCookie)
    expect(absent.status).toBe(404)
    expect(billingCalls).toBe(0)
  })

  it('orders by created_at descending and removes one row', async () => {
    const sister = await createAccount('sister')
    const first = await createAccount('brother')
    const second = await createAccount('brother')
    const sisterCookie = await signIn(sister.email)
    await publish(sister.id, sisterCookie)
    await publish(first.id, await signIn(first.email))
    await publish(second.id, await signIn(second.email))
    const older = await call('/v1/favourites', sisterCookie, 'POST', { target_id: first.id })
    expect(older.status).toBe(201)
    now = new Date(now.getTime() + 1000)
    const newer = await call('/v1/favourites', sisterCookie, 'POST', { target_id: second.id })
    expect(newer.status).toBe(201)
    const listed = (await (await call('/v1/favourites', sisterCookie)).json()) as { items: FavouriteItem[] }
    expect(listed.items.map((item) => item.target_id)).toEqual([second.id, first.id])

    const removed = await call(`/v1/favourites/${second.id}`, sisterCookie, 'DELETE')
    expect(removed.status).toBe(200)
    expect(await removed.json()).toEqual({})
    const after = (await (await call('/v1/favourites', sisterCookie)).json()) as { count: number; items: FavouriteItem[] }
    expect(after.count).toBe(1)
    expect(after.items.map((item) => item.target_id)).toEqual([first.id])
    const missing = await call(`/v1/favourites/${second.id}`, sisterCookie, 'DELETE')
    expect(missing.status).toBe(404)
    expect(await missing.json()).toMatchObject({ error: { code: 'NOT_FOUND', retryable: false } })
    expect(billingCalls).toBe(0)
  })

  it('rejects a bad target, a hidden target, and a viewer who cannot browse', async () => {
    const sister = await createAccount('sister')
    const brother = await createAccount('brother')
    const sisterCookie = await signIn(sister.email)
    const brotherCookie = await signIn(brother.email)
    await publish(brother.id, brotherCookie)

    const anon = await call('/v1/favourites', undefined, 'POST', { target_id: brother.id })
    expect(anon.status).toBe(401)
    expect(await anon.json()).toMatchObject({ error: { code: 'UNAUTHENTICATED', retryable: false } })

    const unpublished = await call('/v1/favourites', sisterCookie, 'POST', { target_id: brother.id })
    expect(unpublished.status).toBe(403)
    expect(await unpublished.json()).toMatchObject({
      error: { code: 'FORBIDDEN', details: { reason: 'viewer_not_listable' }, retryable: false },
    })

    await publish(sister.id, sisterCookie)
    const self = await call('/v1/favourites', sisterCookie, 'POST', { target_id: sister.id })
    expect(self.status).toBe(400)
    expect(await self.json()).toMatchObject({
      error: { code: 'UNHANDLED', details: { field: 'target_id' }, retryable: false },
    })
    const missingField = await call('/v1/favourites', sisterCookie, 'POST', {})
    expect(missingField.status).toBe(400)
    const badId = await call('/v1/favourites', sisterCookie, 'POST', { target_id: 'not-a-uuid' })
    expect(badId.status).toBe(400)
    const unknown = await call('/v1/favourites', sisterCookie, 'POST', {
      target_id: '01990000-0000-7000-8000-000000000099',
    })
    expect(unknown.status).toBe(404)
    expect(await unknown.json()).toMatchObject({ error: { code: 'NOT_FOUND', message: "Ce profil n'est pas disponible." } })

    const hidden = await createAccount('brother')
    const hiddenCookie = await signIn(hidden.email)
    await publish(hidden.id, hiddenCookie)
    const row = memory.profiles.find((item) => item.account_id === hidden.id)
    if (row) {
      row.visibility = 'unpublished'
    }
    const hiddenPost = await call('/v1/favourites', sisterCookie, 'POST', { target_id: hidden.id })
    expect(hiddenPost.status).toBe(404)

    const same = await call('/v1/favourites', sisterCookie, 'POST', { target_id: brother.id })
    expect(same.status).toBe(201)
    const sisterTwo = await createAccount('sister')
    await publish(sisterTwo.id, await signIn(sisterTwo.email))
    const sameGender = await call('/v1/favourites', sisterCookie, 'POST', { target_id: sisterTwo.id })
    expect(sameGender.status).toBe(404)

    const staff = memory.accounts.find((item) => item.id === sister.id)
    if (staff) {
      ;(staff as { roles: string[] }).roles = ['moderator']
    }
    const staffRead = await call('/v1/favourites', sisterCookie)
    expect(staffRead.status).toBe(403)
    expect(await staffRead.json()).toMatchObject({ error: { details: { reason: 'staff_session' } } })
    if (staff) {
      ;(staff as { roles: string[] }).roles = ['mahram']
    }
    const mahramRead = await call('/v1/favourites', sisterCookie, 'DELETE')
    expect(mahramRead.status).toBe(404)
    const mahramDelete = await call(`/v1/favourites/${brother.id}`, sisterCookie, 'DELETE')
    expect(mahramDelete.status).toBe(403)
    expect(await mahramDelete.json()).toMatchObject({ error: { details: { reason: 'mahram_session' } } })
    const otherMethod = await call('/v1/favourites', sisterCookie, 'PUT', { target_id: brother.id })
    expect(otherMethod.status).toBe(404)
    expect(billingCalls).toBe(0)
  })

  it('does not take a browse rate slot and keeps a null photo when no live main exists', async () => {
    const sister = await createAccount('sister')
    const brother = await createAccount('brother')
    const sisterCookie = await signIn(sister.email)
    await publish(sister.id, sisterCookie)
    await publish(brother.id, await signIn(brother.email))
    setBrowseLimitReader(async () => 1)
    const browse = await fetch(`${base}/v1/browse?view=grid`, { headers: { cookie: sisterCookie } })
    expect(browse.status).toBe(200)
    const saved = await call('/v1/favourites', sisterCookie, 'POST', { target_id: brother.id })
    expect(saved.status).toBe(201)
    const listed = await call('/v1/favourites', sisterCookie)
    expect(listed.status).toBe(200)
    const body = (await listed.json()) as { items: FavouriteItem[] }
    expect(body.items[0]?.photo).toBeNull()
    expect(body.items[0]?.photo_blur).toBe(false)
    expect(body.items[0]?.bio).toBeNull()
    expect(body.items[0]?.verified).toBe(false)
    expect(billingCalls).toBe(0)
  })

  it('creates the favourite table in the migration', () => {
    const sql = readFileSync(new URL('../drizzle/0016_favourite.sql', import.meta.url), 'utf8')
    expect(sql).toContain('CREATE TABLE "favourite"')
    expect(sql).toContain('"account_id" uuid NOT NULL')
    expect(sql).toContain('"target_id" uuid NOT NULL')
    expect(sql).toContain('"created_at" timestamp with time zone NOT NULL')
    expect(sql).toContain('PRIMARY KEY("account_id","target_id")')
  })
})
