import { createRequire } from 'node:module'
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
import { memoryCaptureStore, setCaptureStore } from './id-liveness-store.js'
import { setMediaClock, setSignedTtlReader } from './media.js'
import { memoryMediaStore, setMediaStore } from './media-store.js'
import { setMahramPort } from './mahram-port.js'
import { memoryPhoneOtpStore, setPhoneOtpStore, type PhoneOtpRow } from './phone-otp-store.js'
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

type GridItem = {
  id: string
  pseudonym: string
  age: number
  city: string | null
  marital_status: string | null
  polygamy_intent: string | null
  madhhab: string | null
  practice: string | null
  verified: boolean
  photo_blur: boolean
  photo: { id: string; url: string } | null
}

type GridBody = {
  view: string
  items: GridItem[]
  next_cursor: string | null
}

describe('browse grid', () => {
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
    const email = `grid${serial}@example.bf`
    const response = await fetch(`${base}/v1/accounts`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email,
        password: 'phrase avec espaces',
        pseudonym: `Grid_${serial}`,
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

  function grant(accountId: string, kind: 'phone_otp' | 'liveness' | 'id_document'): void {
    now = new Date(now.getTime() + 1)
    const id = newId(now)
    if (kind === 'phone_otp') {
      const row: PhoneOtpRow = {
        id,
        account_id: accountId,
        kind: 'phone_otp',
        status: 'granted',
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
      status: 'granted',
      vendor: null,
      evidence_uri: 'memory',
      phone_e164: null,
      hash: null,
      expires_at: null,
    })
  }

  async function browse(cookie: string | undefined, query: string): Promise<Response> {
    return fetch(`${base}/v1/browse${query}`, { headers: cookie ? { cookie } : {} })
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

  it('keeps card and a missing view at 404 and rejects a bad view or cursor', async () => {
    const sister = await createAccount('sister')
    const brother = await createAccount('brother')
    const sisterCookie = await signIn(sister.email)
    await publish(sister.id, sisterCookie)
    await publish(brother.id, await signIn(brother.email))

    const missing = await browse(sisterCookie, '')
    const card = await browse(sisterCookie, '?view=card')
    expect(missing.status).toBe(404)
    expect(card.status).toBe(404)
    expect(missing.headers.get('cache-control')).toBe('no-store')
    expect(await missing.json()).toMatchObject({
      error: {
        code: 'NOT_FOUND',
        message: "Ce profil n'est pas disponible.",
        details: null,
        retryable: false,
      },
    })
    expect(await card.json()).toMatchObject({ error: { code: 'NOT_FOUND', retryable: false } })

    const badView = await browse(sisterCookie, '?view=list')
    expect(badView.status).toBe(400)
    expect(await badView.json()).toMatchObject({
      error: { code: 'UNHANDLED', details: { field: 'view' }, retryable: false },
    })
    const badCursor = await browse(sisterCookie, '?view=grid&cursor=not-a-uuid')
    expect(badCursor.status).toBe(400)
    expect(await badCursor.json()).toMatchObject({
      error: { code: 'UNHANDLED', details: { field: 'cursor' }, retryable: false },
    })
    expect(billingCalls).toBe(0)
  })

  it('returns an empty page and never invents a profile', async () => {
    const sister = await createAccount('sister')
    const cookie = await signIn(sister.email)
    await publish(sister.id, cookie)
    const response = await browse(cookie, '?view=grid')
    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(await response.json()).toEqual({ view: 'grid', items: [], next_cursor: null })
    expect(billingCalls).toBe(0)
  })

  it('lists only the opposite-gender public member and uses French labels', async () => {
    const sister = await createAccount('sister')
    const otherSister = await createAccount('sister')
    const hidden = await createAccount('brother')
    const held = await createAccount('brother')
    const emergency = await createAccount('brother')
    const deactivated = await createAccount('brother')
    const deleting = await createAccount('brother')
    const staff = await createAccount('brother')
    const mahram = await createAccount('brother')
    const shown = await createAccount('brother')
    const sisterCookie = await signIn(sister.email)
    await publish(sister.id, sisterCookie)
    await publish(otherSister.id, await signIn(otherSister.email))
    await publish(hidden.id, await signIn(hidden.email))
    const hiddenRow = memory.profiles.find((row) => row.account_id === hidden.id)
    if (hiddenRow) {
      hiddenRow.visibility = 'unpublished'
    }
    await publish(held.id, await signIn(held.email))
    const heldRow = memory.profiles.find((row) => row.account_id === held.id)
    if (heldRow) {
      heldRow.visibility = 'held'
    }
    await publish(emergency.id, await signIn(emergency.email))
    const emergencyRow = memory.profiles.find((row) => row.account_id === emergency.id)
    if (emergencyRow) {
      emergencyRow.visibility = 'emergency_hidden'
    }
    await publish(deactivated.id, await signIn(deactivated.email))
    const deactivatedAccount = memory.accounts.find((row) => row.id === deactivated.id)
    if (deactivatedAccount) {
      deactivatedAccount.status = 'deactivated'
    }
    await publish(deleting.id, await signIn(deleting.email))
    const deletingAccount = memory.accounts.find((row) => row.id === deleting.id)
    if (deletingAccount) {
      deletingAccount.status = 'pending_deletion'
    }
    await publish(staff.id, await signIn(staff.email))
    const staffAccount = memory.accounts.find((row) => row.id === staff.id)
    if (staffAccount) {
      staffAccount.roles = ['moderator']
    }
    await publish(mahram.id, await signIn(mahram.email))
    const mahramAccount = memory.accounts.find((row) => row.id === mahram.id)
    if (mahramAccount) {
      mahramAccount.roles = ['mahram']
    }
    await publish(shown.id, await signIn(shown.email))
    grant(shown.id, 'phone_otp')
    grant(shown.id, 'id_document')

    const response = await browse(sisterCookie, '?view=grid')
    expect(response.status).toBe(200)
    const body = (await response.json()) as GridBody
    expect(body.view).toBe('grid')
    expect(body.next_cursor).toBeNull()
    expect(body.items.map((item) => item.id)).toEqual([shown.id])
    expect(body.items[0]).toMatchObject({
      pseudonym: expect.stringMatching(/^Grid_/),
      age: 36,
      city: 'Ouagadougou',
      marital_status: 'Célibataire',
      polygamy_intent: 'Non',
      madhhab: 'Maliki',
      practice: 'Pratique assidue',
      verified: false,
      photo_blur: true,
      photo: null,
    })
    expect(Object.keys(body).sort()).toEqual(['items', 'next_cursor', 'view'])
    expect(Object.keys(body.items[0] ?? {}).sort()).toEqual([
      'age',
      'city',
      'id',
      'madhhab',
      'marital_status',
      'photo',
      'photo_blur',
      'polygamy_intent',
      'practice',
      'pseudonym',
      'verified',
    ])
    const text = JSON.stringify(body)
    expect(text).not.toContain('example.bf')
    expect(text).not.toContain('1990-01-15')
    expect(text).not.toContain('Sawadogo')
    expect(text).not.toContain('life_plans')
    expect(text).not.toContain('profession')
    expect(text).not.toContain('online')
    expect(text).not.toContain('total')
    expect(billingCalls).toBe(0)
  })

  it('signs blur for a blurred main photo and sm when blur is off', async () => {
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
    const mainId = await liveMain(brotherCookie)
    grant(brother.id, 'id_document')
    grant(brother.id, 'liveness')

    const blurred = await browse(sisterCookie, '?view=grid')
    expect(blurred.status).toBe(200)
    const blurredBody = (await blurred.json()) as GridBody
    expect(blurredBody.items[0]).toMatchObject({
      id: brother.id,
      verified: true,
      photo_blur: true,
      photo: { id: mainId },
    })
    expect(blurredBody.items[0]?.photo?.url).toMatch(/^\/v1\/media\/get\?token=/)
    expect(media.grants.at(-1)?.derivative).toBe('blur')
    expect(JSON.stringify(blurredBody)).not.toContain(pendingJson.id)

    await getProfileStore().setPhotoBlur(brother.id, false)
    const clear = await browse(sisterCookie, '?view=grid')
    expect(clear.status).toBe(200)
    const clearBody = (await clear.json()) as GridBody
    expect(clearBody.items[0]?.photo_blur).toBe(false)
    expect(clearBody.items[0]?.photo?.id).toBe(mainId)
    expect(media.grants.at(-1)?.derivative).toBe('sm')

    const smIndex = media.derivatives.findIndex((row) => row.photo_asset_id === mainId && row.size === 'sm')
    expect(smIndex).toBeGreaterThanOrEqual(0)
    media.derivatives.splice(smIndex, 1)
    const denied = await browse(sisterCookie, '?view=grid')
    expect(denied.status).toBe(503)
    const deniedJson = await denied.json()
    expect(deniedJson).toMatchObject({
      error: { code: 'UNHANDLED', message: 'Request failed', retryable: true },
    })
    expect(JSON.stringify(deniedJson)).not.toContain('REVEAL_DENIED')
  })

  it('pages 25 profiles as 12, 12, and 1 with no gap', async () => {
    const sister = await createAccount('sister')
    const sisterCookie = await signIn(sister.email)
    await publish(sister.id, sisterCookie)
    const ids: string[] = []
    for (let index = 0; index < 25; index += 1) {
      const brother = await createAccount('brother')
      ids.push(brother.id)
      await publish(brother.id, await signIn(brother.email))
    }
    const expected = [...ids].sort((left, right) => (left < right ? 1 : left > right ? -1 : 0))
    const seen: string[] = []
    let cursor = ''
    const sizes: number[] = []
    let firstPageBytes = 0
    for (let page = 0; page < 3; page += 1) {
      const response = await browse(sisterCookie, `?view=grid${cursor}`)
      expect(response.status).toBe(200)
      const text = await response.text()
      if (page === 0) {
        firstPageBytes = Buffer.byteLength(text)
      }
      const body = JSON.parse(text) as GridBody
      sizes.push(body.items.length)
      seen.push(...body.items.map((item) => item.id))
      cursor = body.next_cursor ? `&cursor=${body.next_cursor}` : ''
      if (page < 2) {
        expect(body.next_cursor).toBe(body.items[11]?.id ?? null)
      } else {
        expect(body.next_cursor).toBeNull()
      }
    }
    expect(sizes).toEqual([12, 12, 1])
    expect(seen).toEqual(expected)
    expect(new Set(seen).size).toBe(25)
    expect(firstPageBytes).toBeLessThan(150 * 1024)
  }, 180000)

  it('continues a well-formed cursor that matches nobody', async () => {
    const sister = await createAccount('sister')
    const brother = await createAccount('brother')
    const sisterCookie = await signIn(sister.email)
    await publish(sister.id, sisterCookie)
    await publish(brother.id, await signIn(brother.email))
    const response = await browse(sisterCookie, '?view=grid&cursor=00000000-0000-4000-8000-000000000000')
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ view: 'grid', items: [], next_cursor: null })
  })

  it('refuses staff, mahram, and a non-listable viewer without a rate slot', async () => {
    const sister = await createAccount('sister')
    const brother = await createAccount('brother')
    const sisterCookie = await signIn(sister.email)
    const brotherCookie = await signIn(brother.email)
    await publish(brother.id, brotherCookie)
    setBrowseLimitReader(async () => 1)
    const unpublished = await browse(sisterCookie, '?view=grid')
    const unpublishedAgain = await browse(sisterCookie, '?view=grid')
    expect(unpublished.status).toBe(403)
    expect(unpublishedAgain.status).toBe(403)
    expect(await unpublishedAgain.json()).toMatchObject({
      error: {
        code: 'FORBIDDEN',
        message: "Votre profil doit être validé avant de consulter d'autres profils.",
        details: { reason: 'viewer_not_listable' },
        retryable: false,
      },
    })
    setBrowseLimitReader(async () => 1000)
    resetAuthRateWindow()
    await publish(sister.id, sisterCookie)

    const staff = memory.accounts.find((row) => row.id === sister.id)
    if (staff) {
      staff.roles = ['moderator']
    }
    const staffRead = await browse(sisterCookie, '?view=grid')
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
    const mahramRead = await browse(sisterCookie, '?view=grid')
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

  it('limits a grid page and rejects a missing session', async () => {
    const sister = await createAccount('sister')
    const brother = await createAccount('brother')
    const sisterCookie = await signIn(sister.email)
    await publish(sister.id, sisterCookie)
    await publish(brother.id, await signIn(brother.email))
    setBrowseLimitReader(async () => 1)
    const first = await browse(sisterCookie, '?view=grid')
    expect(first.status).toBe(200)
    const limited = await browse(sisterCookie, '?view=grid')
    expect(limited.status).toBe(429)
    expect(limited.headers.get('cache-control')).toBe('no-store')
    expect(await limited.json()).toMatchObject({
      error: { code: 'RATE_LIMITED', message: 'Cadence de requêtes régulée.', details: null, retryable: true },
    })
    const anon = await browse(undefined, '?view=grid')
    expect(anon.status).toBe(401)
    expect(anon.headers.get('cache-control')).toBe('no-store')
    expect(await anon.json()).toMatchObject({ error: { code: 'UNAUTHENTICATED', retryable: false } })
    expect(billingCalls).toBe(0)
  })
})
