import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import type { AddressInfo } from 'node:net'
import type { INestApplication } from '@nestjs/common'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { memoryAccountStore, setAccountStore } from './account-store.js'
import { setAuthClock } from './auth-clock.js'
import { setAuthLimitReader } from './auth-limit.js'
import { resetAuthRateWindow } from './auth-rate.js'
import { createApp } from './create-app.js'
import { PhotoDecodeError, blurProfilePhoto } from './media-blur.js'
import {
  PHOTO_CAPTION,
  applyModerationAllowed,
  discoveryPhoto,
  setMediaClock,
  setSignedTtlReader,
  signMedia,
} from './media.js'
import { memoryMediaStore, getMediaStore, setMediaStore } from './media-store.js'
import { setPhotoStrikeConfigReader } from './photo-strike.js'
import { memoryPinLockStore, setPinLockStore } from './pin-lock-store.js'
import { resetPinEntries } from './pin-lock-state.js'
import { memoryProfileStore, setProfileStore } from './profile-store.js'
import { setFreeReviewSlaReader } from './profile-review.js'
import { SESSION_COOKIE } from './session-cookie.js'
import { memorySessionStore, setSessionStore } from './session-store.js'

const require = createRequire(import.meta.url)
const { PNG } = require('pngjs') as {
  PNG: {
    new (options: { width: number; height: number }): { data: Buffer; width: number; height: number }
    sync: { write(png: { data: Buffer; width: number; height: number }): Buffer }
  }
}
const jpeg = require('jpeg-js') as {
  decode(buffer: Buffer, options?: { useTArray?: boolean }): { width: number; height: number; data: Uint8Array }
  encode(image: { width: number; height: number; data: Uint8Array }, quality: number): { data: Uint8Array }
}

const memory = memoryAccountStore()
const sessions = memorySessionStore(memory)
const pins = memoryPinLockStore()
const media = memoryMediaStore()
let now = new Date('2026-10-13T02:00:00.000Z')
let serial = 0

function samplePng(): Buffer {
  const png = new PNG({ width: 8, height: 8 })
  for (let y = 0; y < 8; y += 1) {
    for (let x = 0; x < 8; x += 1) {
      const index = (y * 8 + x) * 4
      const left = x < 4
      png.data[index] = left ? 255 : 0
      png.data[index + 1] = 0
      png.data[index + 2] = left ? 0 : 255
      png.data[index + 3] = 255
    }
  }
  return PNG.sync.write(png)
}

describe('profile photo upload stays unpublished and blurred', () => {
  let app: INestApplication
  let base: string
  const png = samplePng()

  beforeAll(async () => {
    setAuthClock(() => now)
    setFreeReviewSlaReader(async () => 24)
    setMediaClock(() => now)
    setSignedTtlReader(async () => 60)
    setPhotoStrikeConfigReader(async () => ({ count: '3', hours: '24' }))
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
    setFreeReviewSlaReader(undefined)
    setMediaClock(undefined)
    setSignedTtlReader(undefined)
    setPhotoStrikeConfigReader(undefined)
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
    const email = `photo${serial}@example.bf`
    const response = await fetch(`${base}/v1/accounts`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email,
        password: 'phrase avec espaces',
        pseudonym: `Photo_${serial}`,
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

  async function upload(cookie: string, body: unknown): Promise<{ status: number; json: Record<string, unknown> }> {
    const response = await fetch(`${base}/v1/media`, {
      method: 'POST',
      headers: { cookie, 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
    return { status: response.status, json: (await response.json()) as Record<string, unknown> }
  }

  it('stores original plus blur, omits the original key, and shows the pending caption to the owner', async () => {
    const stitch = readFileSync(
      fileURLToPath(new URL('../../../design-stitch/ankanu-v2/12-profile-not-yet-public/screen.html', import.meta.url)),
      'utf8',
    )
    expect(stitch).toContain(PHOTO_CAPTION)
    expect(applyModerationAllowed('profile_photo')).toBe(true)
    expect(applyModerationAllowed('bio')).toBe(true)
    expect(applyModerationAllowed('chat_photo')).toBe(false)
    expect(applyModerationAllowed('voice_note')).toBe(false)

    const missing = await fetch(`${base}/v1/media`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ kind: 'profile_photo', image: png.toString('base64') }),
    })
    expect(missing.status).toBe(401)

    const created = await createAccount()
    const cookie = await signIn(created.email)
    const before = media.assets.length
    const chat = await upload(cookie, { kind: 'chat_photo', image: png.toString('base64') })
    expect(chat.status).toBe(400)
    expect(chat.json).toMatchObject({ error: { details: { field: 'kind' } } })
    expect(media.assets.length).toBe(before)

    const bad = await upload(cookie, { kind: 'profile_photo', image: Buffer.from('not-a-photo').toString('base64') })
    expect(bad.status).toBe(400)
    expect(bad.json).toMatchObject({ error: { details: { field: 'image' } } })
    expect(media.assets.length).toBe(before)

    const saved = await upload(cookie, { kind: 'profile_photo', image: png.toString('base64') })
    expect(saved.status).toBe(201)
    expect(saved.json).toMatchObject({
      kind: 'profile_photo',
      moderation_state: 'pending',
      caption: PHOTO_CAPTION,
    })
    expect(String(saved.json.blur_url)).toMatch(/^\/v1\/media\/get\?token=/)
    const serialized = JSON.stringify(saved.json)
    expect(serialized).not.toContain('original_key')
    expect(serialized).not.toContain('blur_key')
    expect(serialized).not.toContain('/original')
    expect(Object.keys(saved.json).sort()).toEqual(['blur_url', 'caption', 'id', 'kind', 'moderation_state'])

    const asset = media.assets.find((row) => row.id === saved.json.id)
    const derivative = media.derivatives.find((row) => row.photo_asset_id === saved.json.id)
    expect(asset?.kind).toBe('profile_photo')
    expect(asset?.moderation_state).toBe('pending')
    expect(asset?.blur_key).toBe(derivative?.object_key)
    expect(derivative?.size).toBe('blur')
    expect(asset?.original_key).not.toBe(asset?.blur_key)
    const original = media.blobs.get(asset?.original_key ?? '')
    const blur = media.blobs.get(asset?.blur_key ?? '')
    expect(original).toBeTruthy()
    expect(blur).toBeTruthy()
    expect(Buffer.from(blur ?? []).equals(Buffer.from(original ?? []))).toBe(false)
    const decoded = jpeg.decode(Buffer.from(blur ?? []), { useTArray: true })
    let mixed = false
    for (let index = 0; index < decoded.data.length; index += 4) {
      const red = decoded.data[index] ?? 0
      const blue = decoded.data[index + 2] ?? 0
      if (red > 20 && blue > 20) {
        mixed = true
      }
    }
    expect(mixed).toBe(true)
    expect(discoveryPhoto(asset ?? null)).toBeNull()

    const profile = await fetch(`${base}/v1/me/profile`, { headers: { cookie } })
    const profileJson = (await profile.json()) as { photo: Record<string, unknown> }
    expect(profile.status).toBe(200)
    expect(profileJson.photo).toMatchObject({
      id: saved.json.id,
      moderation_state: 'pending',
      caption: PHOTO_CAPTION,
    })
    expect(JSON.stringify(profileJson)).not.toContain('original_key')
    expect(JSON.stringify(profileJson)).not.toContain(asset?.original_key ?? 'missing-key')

    const token = String(saved.json.blur_url).split('token=')[1] ?? ''
    const bytes = await fetch(`${base}/v1/media/get?token=${token}`, { headers: { cookie } })
    expect(bytes.status).toBe(200)
    expect(bytes.headers.get('content-type')).toContain('image/jpeg')
    const served = Buffer.from(await bytes.arrayBuffer())
    expect(served.equals(Buffer.from(original ?? []))).toBe(false)
    expect(served.equals(Buffer.from(blur ?? []))).toBe(true)

    const other = await createAccount()
    const otherCookie = await signIn(other.email)
    const grants = media.grants.length
    const denied = await signMedia(media, String(saved.json.id), 'blur', other.id)
    expect(denied.ok).toBe(false)
    if (!denied.ok) {
      expect(denied.code).toBe('FORBIDDEN')
    }
    expect(media.grants.length).toBe(grants)
    const stolen = await fetch(`${base}/v1/media/get?token=${token}`, { headers: { cookie: otherCookie } })
    expect(stolen.status).toBe(403)

    const clear = await signMedia(media, String(saved.json.id), 'original', created.id)
    expect(clear.ok).toBe(false)
    if (!clear.ok) {
      expect(clear.code).toBe('REVEAL_DENIED')
    }
    const medium = await signMedia(media, String(saved.json.id), 'md', created.id)
    expect(medium.ok).toBe(false)
    if (!medium.ok) {
      expect(medium.code).toBe('REVEAL_DENIED')
    }

    const grant = media.grants.find((row) => row.id === token)
    expect(grant).toBeTruthy()
    await media.revokeGrant(token, now.toISOString())
    const revoked = await fetch(`${base}/v1/media/get?token=${token}`, { headers: { cookie } })
    expect(revoked.status).toBe(403)
    grant!.revoked_at = null

    now = new Date(now.getTime() + 61_000)
    const expired = await fetch(`${base}/v1/media/get?token=${token}`, { headers: { cookie } })
    expect(expired.status).toBe(403)
    now = new Date(now.getTime() - 61_000)

    if (asset) {
      asset.moderation_state = 'live'
    }
    expect(discoveryPhoto(asset ?? null)).toEqual({
      id: saved.json.id,
      kind: 'profile_photo',
      moderation_state: 'live',
    })
    const revealed = await signMedia(media, String(saved.json.id), 'blur', other.id)
    expect(revealed.ok).toBe(true)
    if (revealed.ok) {
      const otherToken = revealed.url.split('token=')[1] ?? ''
      const otherBytes = await fetch(`${base}/v1/media/get?token=${otherToken}`, { headers: { cookie: otherCookie } })
      expect(otherBytes.status).toBe(200)
      const body = Buffer.from(await otherBytes.arrayBuffer())
      expect(body.equals(Buffer.from(original ?? []))).toBe(false)
      expect(body.equals(Buffer.from(blur ?? []))).toBe(true)
    }
    const stillClear = await signMedia(media, String(saved.json.id), 'md', other.id)
    expect(stillClear.ok).toBe(false)
    if (asset) {
      asset.moderation_state = 'pending'
    }
  })

  it('accepts a 4032 by 3024 jpeg under the byte cap', async () => {
    const width = 4032
    const height = 3024
    const raster = { width, height, data: Buffer.alloc(width * height * 4, 255) }
    const image = Buffer.from(jpeg.encode(raster, 30).data)
    expect(image.length).toBeLessThanOrEqual(5_242_880)
    expect(image.length).toBeGreaterThan(100)
    const created = await createAccount()
    const cookie = await signIn(created.email)
    const saved = await upload(cookie, { kind: 'profile_photo', image: image.toString('base64') })
    expect(saved.status).toBe(201)
    expect(saved.json).toMatchObject({
      kind: 'profile_photo',
      moderation_state: 'pending',
      caption: PHOTO_CAPTION,
    })
    expect(Object.keys(saved.json).sort()).toEqual(['blur_url', 'caption', 'id', 'kind', 'moderation_state'])
  }, 60_000)

  it('refuses a png header that would allocate a huge bitmap', () => {
    const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    const length = Buffer.alloc(4)
    length.writeUInt32BE(13, 0)
    const data = Buffer.alloc(13)
    data.writeUInt32BE(100_000, 0)
    data.writeUInt32BE(100_000, 4)
    data[8] = 8
    const header = Buffer.concat([signature, length, Buffer.from('IHDR'), data, Buffer.alloc(4)])
    expect(() => blurProfilePhoto(header)).toThrow(PhotoDecodeError)
  })

  it('rejects a token that is not a uuid before querying', async () => {
    const created = await createAccount()
    const cookie = await signIn(created.email)
    const response = await fetch(`${base}/v1/media/get?token=not-a-uuid`, { headers: { cookie } })
    expect(response.status).toBe(403)
    expect(await response.json()).toMatchObject({
      error: { code: 'FORBIDDEN', message: 'Accès au média refusé.' },
    })
    setMediaStore(undefined)
    try {
      await expect(getMediaStore().grant('not-a-uuid')).resolves.toBeNull()
    } finally {
      setMediaStore(media)
    }
  })

  it('caps the gateway token at 60 seconds', async () => {
    setSignedTtlReader(async () => 900)
    const created = await createAccount()
    const cookie = await signIn(created.email)
    const saved = await upload(cookie, { kind: 'profile_photo', image: png.toString('base64') })
    expect(saved.status).toBe(201)
    const token = String(saved.json.blur_url).split('token=')[1] ?? ''
    const grant = media.grants.find((row) => row.id === token)
    expect(Date.parse(grant?.expires_at ?? '') - now.getTime()).toBe(60_000)
    setSignedTtlReader(async () => 60)
  })
})
