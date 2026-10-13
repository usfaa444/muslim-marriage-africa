import { createRequire } from 'node:module'
import type { AddressInfo } from 'node:net'
import type { INestApplication } from '@nestjs/common'
import { newId } from '@ankanu/kernel'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { memoryAccountStore, setAccountStore } from './account-store.js'
import { setAuthClock } from './auth-clock.js'
import { setAuthLimitReader } from './auth-limit.js'
import { resetAuthRateWindow } from './auth-rate.js'
import { setBillingPort } from './billing-port.js'
import { setBrowseLimitReader } from './browse-rate.js'
import { createApp } from './create-app.js'
import { memoryCaptureStore, setCaptureStore } from './id-liveness-store.js'
import { setMediaClock, setSignedTtlReader } from './media.js'
import { setPhotoStrikeConfigReader } from './photo-strike.js'
import { memoryMediaStore, setMediaStore } from './media-store.js'
import { setMahramPort } from './mahram-port.js'
import { memoryPhoneOtpStore, setPhoneOtpStore, type PhoneOtpRow } from './phone-otp-store.js'
import { memoryPinLockStore, setPinLockStore } from './pin-lock-store.js'
import { resetPinEntries } from './pin-lock-state.js'
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

type ErrorBody = {
  error: { code: string; message: string; details: unknown; request_id: string; retryable: boolean }
}

function sameError(body: ErrorBody): unknown {
  return { ...body.error, request_id: 'same' }
}

describe('public profile read', () => {
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
    billingCalls = 0
    setBillingPort({
      async isEntitled() {
        billingCalls += 1
        return true
      },
    })
    resetAuthRateWindow()
    setAccountStore(memory)
    setSessionStore(sessions)
    setProfileStore(memoryProfileStore(memory.accounts, memory.profiles))
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
    setMediaStore(undefined)
    setPinLockStore(undefined)
    resetPinEntries()
    if (app) {
      await app.close()
    }
  })

  async function createAccount(gender: 'sister' | 'brother'): Promise<{ id: string; email: string }> {
    serial += 1
    const email = `public${serial}@example.bf`
    const response = await fetch(`${base}/v1/accounts`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email,
        password: 'phrase avec espaces',
        pseudonym: `Public_${serial}`,
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

  async function publish(id: string, cookie: string, fields: Record<string, unknown> = {}): Promise<void> {
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
        ...fields,
      }),
    })
    expect(saved.status).toBe(200)
    const row = memory.profiles.find((item) => item.account_id === id)
    expect(row).toBeTruthy()
    if (row) {
      row.visibility = 'public'
    }
  }

  function grant(accountId: string, kind: 'phone_otp' | 'liveness' | 'id_document', status: 'pending' | 'granted' | 'rejected'): void {
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

  async function read(cookie: string, id: string): Promise<Response> {
    return fetch(`${base}/v1/profiles/${id}`, { headers: { cookie } })
  }

  it('returns phone only, then identity, and never a premium or phone number', async () => {
    const sister = await createAccount('sister')
    const brother = await createAccount('brother')
    const sisterCookie = await signIn(sister.email)
    const brotherCookie = await signIn(brother.email)
    await publish(sister.id, sisterCookie)
    await publish(brother.id, brotherCookie)
    grant(brother.id, 'phone_otp', 'granted')
    grant(brother.id, 'id_document', 'pending')
    grant(brother.id, 'liveness', 'granted')
    billingCalls = 0

    const phoneOnly = await read(sisterCookie, brother.id)
    expect(phoneOnly.status).toBe(200)
    expect(phoneOnly.headers.get('cache-control')).toBe('no-store')
    const phoneJson = (await phoneOnly.json()) as {
      profile: Record<string, unknown>
      verification: { phone: boolean; id: boolean; mahram: boolean }
      photo_blur: boolean
      photos: unknown[]
    }
    expect(phoneJson.verification).toEqual({ phone: true, id: false, mahram: false })
    expect(phoneJson.profile).toMatchObject({
      id: brother.id,
      pseudonym: expect.stringMatching(/^Public_/),
      age: 36,
      city: 'ouagadougou',
      country: 'BF',
      profession: 'ingenierie',
      marital_status: 'single',
      polygamy_intent: 'no',
      madhhab: 'maliki',
      practice: 'assidue',
      life_plans: 'tf:6months\nUnion stable',
    })
    expect(phoneJson.photo_blur).toBe(true)
    expect(phoneJson.photos).toEqual([])
    const serialized = JSON.stringify(phoneJson)
    expect(serialized).not.toContain('premium')
    expect(serialized).not.toContain('entitlement')
    expect(serialized).not.toContain('dob')
    expect(serialized).not.toContain('@example.bf')
    expect(serialized).not.toContain('+226')
    expect(serialized).not.toContain('Sawadogo')
    expect(billingCalls).toBe(0)

    grant(brother.id, 'id_document', 'granted')
    const identified = await read(sisterCookie, brother.id)
    expect(identified.status).toBe(200)
    expect(((await identified.json()) as { verification: { id: boolean } }).verification.id).toBe(true)
  })

  it('keeps mahram false for a brother and true only through the wali port', async () => {
    const sister = await createAccount('sister')
    const brother = await createAccount('brother')
    const sisterCookie = await signIn(sister.email)
    const brotherCookie = await signIn(brother.email)
    await publish(sister.id, sisterCookie)
    await publish(brother.id, brotherCookie)
    setMahramPort({
      async verifiedWali() {
        return true
      },
    })
    const brotherTarget = await read(sisterCookie, brother.id)
    expect(((await brotherTarget.json()) as { verification: { mahram: boolean } }).verification.mahram).toBe(false)
    const sisterTarget = await read(brotherCookie, sister.id)
    expect(((await sisterTarget.json()) as { verification: { mahram: boolean } }).verification.mahram).toBe(true)
    setMahramPort(undefined)
    const stubbed = await read(brotherCookie, sister.id)
    expect(((await stubbed.json()) as { verification: { mahram: boolean } }).verification.mahram).toBe(false)
  })

  it('uses one 404 body for every hidden target', async () => {
    const sister = await createAccount('sister')
    const brother = await createAccount('brother')
    const otherSister = await createAccount('sister')
    const sisterCookie = await signIn(sister.email)
    const brotherCookie = await signIn(brother.email)
    await publish(sister.id, sisterCookie)
    await publish(brother.id, brotherCookie)
    await publish(otherSister.id, await signIn(otherSister.email))

    const held = memory.profiles.find((row) => row.account_id === brother.id)
    expect(held).toBeTruthy()
    if (held) {
      held.visibility = 'held'
    }
    const deactivated = await createAccount('brother')
    const deactivatedCookie = await signIn(deactivated.email)
    await publish(deactivated.id, deactivatedCookie)
    const deactivatedAccount = memory.accounts.find((row) => row.id === deactivated.id)
    expect(deactivatedAccount).toBeTruthy()
    if (deactivatedAccount) {
      deactivatedAccount.status = 'deactivated'
    }
    const mahramOnly = await createAccount('brother')
    const mahramCookie = await signIn(mahramOnly.email)
    await publish(mahramOnly.id, mahramCookie)
    const mahramAccount = memory.accounts.find((row) => row.id === mahramOnly.id)
    expect(mahramAccount).toBeTruthy()
    if (mahramAccount) {
      mahramAccount.roles = ['mahram']
    }

    const missing = newId(now)
    const reads = await Promise.all([
      read(sisterCookie, 'not-a-uuid'),
      read(sisterCookie, '11111111-1111-4111-8111-111111111111'),
      read(sisterCookie, missing),
      read(sisterCookie, sister.id),
      read(sisterCookie, otherSister.id),
      read(sisterCookie, brother.id),
      read(sisterCookie, deactivated.id),
      read(sisterCookie, mahramOnly.id),
    ])
    const bodies = (await Promise.all(reads.map((response) => response.json()))) as ErrorBody[]
    for (const response of reads) {
      expect(response.status).toBe(404)
      expect(response.headers.get('cache-control')).toBe('no-store')
    }
    const expected = sameError(bodies[0]!)
    expect(expected).toMatchObject({
      code: 'NOT_FOUND',
      message: "Ce profil n'est pas disponible.",
      details: null,
      retryable: false,
    })
    for (const body of bodies) {
      expect(sameError(body)).toEqual(expected)
      expect(JSON.stringify(body)).not.toContain('REVEAL_DENIED')
      expect(JSON.stringify(body)).not.toContain('QUOTA_EXCEEDED')
    }
    if (held) {
      held.visibility = 'public'
    }
  })

  it('refuses staff, mahram, and a viewer who is not listable', async () => {
    const sister = await createAccount('sister')
    const brother = await createAccount('brother')
    const sisterCookie = await signIn(sister.email)
    const brotherCookie = await signIn(brother.email)
    await publish(brother.id, brotherCookie)
    const unpublished = await read(sisterCookie, brother.id)
    expect(unpublished.status).toBe(403)
    expect(await unpublished.json()).toMatchObject({
      error: {
        code: 'FORBIDDEN',
        message: "Votre profil doit être validé avant de consulter d'autres profils.",
        details: { reason: 'viewer_not_listable' },
        retryable: false,
      },
    })
    await publish(sister.id, sisterCookie)

    const staff = memory.accounts.find((row) => row.id === sister.id)
    expect(staff).toBeTruthy()
    if (staff) {
      staff.roles = ['moderator']
    }
    const staffRead = await read(sisterCookie, brother.id)
    expect(staffRead.status).toBe(403)
    expect(await staffRead.json()).toMatchObject({
      error: {
        code: 'FORBIDDEN',
        message: "Cette session d'équipe ne peut pas ouvrir un espace membre.",
        details: { reason: 'staff_session' },
        retryable: false,
      },
    })
    if (staff) {
      staff.roles = ['mahram']
    }
    const mahramRead = await read(sisterCookie, brother.id)
    expect(mahramRead.status).toBe(403)
    expect(await mahramRead.json()).toMatchObject({
      error: {
        code: 'FORBIDDEN',
        message: 'Une session mahram ne peut pas ouvrir cet espace.',
        details: { reason: 'mahram_session' },
        retryable: false,
      },
    })
  })

  it('limits browse reads and lists only live photos', async () => {
    const sister = await createAccount('sister')
    const brother = await createAccount('brother')
    const sisterCookie = await signIn(sister.email)
    const brotherCookie = await signIn(brother.email)
    await publish(sister.id, sisterCookie)
    await publish(brother.id, brotherCookie)
    const pending = await fetch(`${base}/v1/media`, {
      method: 'POST',
      headers: { cookie: brotherCookie, 'content-type': 'application/json' },
      body: JSON.stringify({ kind: 'profile_photo', image: png.toString('base64') }),
    })
    expect(pending.status).toBe(201)
    const pendingJson = (await pending.json()) as { id: string }
    const live = await fetch(`${base}/v1/media`, {
      method: 'POST',
      headers: { cookie: brotherCookie, 'content-type': 'application/json' },
      body: JSON.stringify({ kind: 'profile_photo', image: png.toString('base64') }),
    })
    expect(live.status).toBe(201)
    const liveJson = (await live.json()) as { id: string }
    const asset = media.assets.find((row) => row.id === liveJson.id)
    expect(asset).toBeTruthy()
    if (asset) {
      asset.moderation_state = 'live'
      asset.is_main = true
    }
    const shown = await read(sisterCookie, brother.id)
    expect(shown.status).toBe(200)
    const shownJson = (await shown.json()) as { photos: Array<{ id: string; is_main: boolean; url: string }> }
    expect(shownJson.photos).toHaveLength(1)
    expect(shownJson.photos[0]).toMatchObject({ id: liveJson.id, is_main: true })
    expect(shownJson.photos[0]?.url).toMatch(/^\/v1\/media\/get\?token=/)
    expect(JSON.stringify(shownJson)).not.toContain(pendingJson.id)
    expect(JSON.stringify(shownJson)).not.toContain('original_key')

    await getProfileStore().setPhotoBlur(brother.id, false)
    const clear = await read(sisterCookie, brother.id)
    expect(clear.status).toBe(200)
    const clearJson = (await clear.json()) as { photo_blur: boolean; photos: Array<{ url: string }> }
    expect(clearJson.photo_blur).toBe(false)
    expect(clearJson.photos[0]?.url).toMatch(/^\/v1\/media\/get\?token=/)
    expect(JSON.stringify(clearJson)).not.toContain('REVEAL_DENIED')
    const mdIndex = media.derivatives.findIndex((row) => row.photo_asset_id === liveJson.id && row.size === 'md')
    expect(mdIndex).toBeGreaterThanOrEqual(0)
    media.derivatives.splice(mdIndex, 1)
    const clearDenied = await read(sisterCookie, brother.id)
    expect(clearDenied.status).toBe(503)
    const deniedJson = await clearDenied.json()
    expect(deniedJson).toMatchObject({
      error: { code: 'UNHANDLED', message: 'Request failed', retryable: true },
    })
    expect(JSON.stringify(deniedJson)).not.toContain('REVEAL_DENIED')
    await getProfileStore().setPhotoBlur(brother.id, true)

    setBrowseLimitReader(async () => 1)
    resetAuthRateWindow()
    const first = await read(sisterCookie, brother.id)
    expect(first.status).toBe(200)
    const limited = await read(sisterCookie, brother.id)
    expect(limited.status).toBe(429)
    expect(limited.headers.get('cache-control')).toBe('no-store')
    expect(await limited.json()).toMatchObject({
      error: { code: 'RATE_LIMITED', message: 'Cadence de requêtes régulée.', details: null, retryable: true },
    })
    setBrowseLimitReader(async () => 1000)
    resetAuthRateWindow()

    const missing = await fetch(`${base}/v1/profiles/${brother.id}`)
    expect(missing.status).toBe(401)
    expect(missing.headers.get('cache-control')).toBe('no-store')
    expect(await missing.json()).toMatchObject({ error: { code: 'UNAUTHENTICATED', retryable: false } })
  })
})
