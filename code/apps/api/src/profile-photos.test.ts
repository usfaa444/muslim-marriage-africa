import { createRequire } from 'node:module'
import type { AddressInfo } from 'node:net'
import type { INestApplication } from '@nestjs/common'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { memoryAccountStore, setAccountStore } from './account-store.js'
import { setAuthClock } from './auth-clock.js'
import { setAuthLimitReader } from './auth-limit.js'
import { resetAuthRateWindow } from './auth-rate.js'
import { createApp } from './create-app.js'
import { MAX_PROFILE_PHOTOS, livePhotosForMember, signMedia } from './media.js'
import { memoryMediaStore, setMediaStore } from './media-store.js'
import { setMediaClock, setSignedTtlReader } from './media.js'
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

const memory = memoryAccountStore()
const sessions = memorySessionStore(memory)
const pins = memoryPinLockStore()
const media = memoryMediaStore()
let now = new Date('2026-10-13T04:00:00.000Z')
let serial = 0

function samplePng(): Buffer {
  const png = new PNG({ width: 8, height: 8 })
  png.data.fill(255)
  return PNG.sync.write(png)
}

describe('profile photo gallery, main, and one blur', () => {
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
    now = new Date(now.getTime() + 1000)
    const email = `gallery${serial}@example.bf`
    const response = await fetch(`${base}/v1/accounts`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email,
        password: 'phrase avec espaces',
        pseudonym: `Gallery_${serial}`,
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

  async function upload(cookie: string): Promise<{ status: number; json: Record<string, unknown> }> {
    const response = await fetch(`${base}/v1/media`, {
      method: 'POST',
      headers: { cookie, 'content-type': 'application/json' },
      body: JSON.stringify({ kind: 'profile_photo', image: png.toString('base64') }),
    })
    return { status: response.status, json: (await response.json()) as Record<string, unknown> }
  }

  function openCount(ownerId: string): number {
    return media.assets.filter(
      (row) =>
        row.owner_id === ownerId &&
        row.kind === 'profile_photo' &&
        (row.moderation_state === 'pending' || row.moderation_state === 'live'),
    ).length
  }

  it('refuses a seventh photo, keeps six rows, and lets one of two parallel uploads win', async () => {
    const created = await createAccount()
    const cookie = await signIn(created.email)
    const ids: string[] = []
    for (let index = 0; index < MAX_PROFILE_PHOTOS; index += 1) {
      const saved = await upload(cookie)
      expect(saved.status).toBe(201)
      ids.push(String(saved.json.id))
    }
    const refused = await upload(cookie)
    expect(refused.status).toBe(409)
    expect(refused.json).toMatchObject({
      error: {
        code: 'PHOTO_LIMIT_REACHED',
        message: '6 photos maximum. Retirez une photo pour en ajouter une autre.',
        details: { reason: 'profile_photo_cap', cap: 6, count: 6 },
        retryable: false,
      },
    })
    expect(openCount(created.id)).toBe(6)
    expect(ids).toHaveLength(6)
    expect(await media.allowProfilePhoto(ids[0] ?? '')).toBe(true)
    expect(await media.allowProfilePhoto(ids[1] ?? '')).toBe(true)
    const removed = await fetch(`${base}/v1/media/${ids[1] ?? ''}`, { method: 'DELETE', headers: { cookie } })
    expect(removed.status).toBe(200)
    expect(openCount(created.id)).toBe(5)
    const afterRemove = await upload(cookie)
    expect(afterRemove.status).toBe(201)
    expect(openCount(created.id)).toBe(6)

    const racer = await createAccount()
    const raceCookie = await signIn(racer.email)
    for (let index = 0; index < 5; index += 1) {
      expect((await upload(raceCookie)).status).toBe(201)
    }
    const pair = await Promise.all([upload(raceCookie), upload(raceCookie)])
    const statuses = pair.map((item) => item.status).sort()
    expect(statuses).toEqual([201, 409])
    expect(openCount(racer.id)).toBe(6)
  })

  it('switches main without review and removes only a live non-main photo', async () => {
    const created = await createAccount()
    const cookie = await signIn(created.email)
    const first = await upload(cookie)
    const second = await upload(cookie)
    expect(first.status).toBe(201)
    expect(second.status).toBe(201)
    expect(await media.allowProfilePhoto(String(first.json.id))).toBe(true)
    expect(await media.allowProfilePhoto(String(second.json.id))).toBe(true)
    expect(media.assets.find((row) => row.id === first.json.id)?.is_main).toBe(true)
    expect(media.assets.find((row) => row.id === second.json.id)?.moderation_state).toBe('live')

    const profile = await fetch(`${base}/v1/me/profile`, { headers: { cookie } })
    const body = (await profile.json()) as {
      photo_blur: boolean
      photo: { id: string }
      photos: Array<{ id: string; is_main: boolean; moderation_state: string }>
    }
    expect(profile.status).toBe(200)
    expect(body.photo_blur).toBe(true)
    expect(body.photo.id).toBe(first.json.id)
    expect(body.photos.map((row) => row.id)).toEqual([first.json.id, second.json.id])
    expect(body.photos[0]).toMatchObject({ is_main: true, moderation_state: 'live' })

    const pending = await upload(cookie)
    expect(pending.status).toBe(201)
    const pendingMain = await fetch(`${base}/v1/media/${String(pending.json.id)}/main`, {
      method: 'PUT',
      headers: { cookie },
    })
    expect(pendingMain.status).toBe(403)
    expect(await pendingMain.json()).toMatchObject({ error: { code: 'FORBIDDEN', details: { reason: 'not_live' } } })

    const switched = await fetch(`${base}/v1/media/${String(second.json.id)}/main`, {
      method: 'PUT',
      headers: { cookie },
    })
    expect(switched.status).toBe(200)
    const switchedBody = (await switched.json()) as { photos: Array<{ id: string; is_main: boolean }> }
    expect(switchedBody.photos[0]).toMatchObject({ id: second.json.id, is_main: true })
    expect(media.assets.find((row) => row.id === first.json.id)?.moderation_state).toBe('live')
    expect(media.assets.find((row) => row.id === second.json.id)?.is_main).toBe(true)

    const again = await fetch(`${base}/v1/media/${String(second.json.id)}/main`, {
      method: 'PUT',
      headers: { cookie },
    })
    expect(again.status).toBe(200)

    const removePending = await fetch(`${base}/v1/media/${String(pending.json.id)}`, {
      method: 'DELETE',
      headers: { cookie },
    })
    expect(removePending.status).toBe(403)
    expect(await removePending.json()).toMatchObject({ error: { details: { reason: 'pending_photo' } } })

    const removeMain = await fetch(`${base}/v1/media/${String(second.json.id)}`, {
      method: 'DELETE',
      headers: { cookie },
    })
    expect(removeMain.status).toBe(403)
    expect(await removeMain.json()).toMatchObject({ error: { details: { reason: 'main_photo' } } })

    const removed = await fetch(`${base}/v1/media/${String(first.json.id)}`, {
      method: 'DELETE',
      headers: { cookie },
    })
    expect(removed.status).toBe(200)
    expect(media.assets.find((row) => row.id === first.json.id)?.moderation_state).toBe('replaced')
    expect(openCount(created.id)).toBe(2)

    const stranger = await fetch(`${base}/v1/media/${String(second.json.id)}/main`, { method: 'PUT' })
    expect(stranger.status).toBe(401)
    const missing = await fetch(`${base}/v1/media/018f3a40-7c2a-7000-8000-00000000ffff/main`, {
      method: 'PUT',
      headers: { cookie },
    })
    expect(missing.status).toBe(403)
    expect(await missing.json()).toMatchObject({ error: { code: 'FORBIDDEN', details: null } })
  })

  it('signs clear sm and md only while photo_blur is false, then the gateway stops', async () => {
    const owner = await createAccount()
    const ownerCookie = await signIn(owner.email)
    const viewer = await createAccount()
    const viewerCookie = await signIn(viewer.email)
    const uploaded = await upload(ownerCookie)
    expect(await media.allowProfilePhoto(String(uploaded.json.id))).toBe(true)
    const denied = await signMedia(media, String(uploaded.json.id), 'md', viewer.id, { clearForMember: true })
    expect(denied.ok).toBe(false)
    const staff = await signMedia(media, String(uploaded.json.id), 'md', viewer.id, {
      clearForMember: true,
      staffReview: true,
    })
    expect(staff.ok).toBe(false)

    const turnedOff = await fetch(`${base}/v1/me/profile`, {
      method: 'PATCH',
      headers: { cookie: ownerCookie, 'content-type': 'application/json' },
      body: JSON.stringify({ photo_blur: false }),
    })
    expect(turnedOff.status).toBe(200)
    expect(await turnedOff.json()).toMatchObject({ photo_blur: false })

    const listed = await livePhotosForMember(media, owner.id, viewer.id, 'md')
    expect(listed.ok).toBe(true)
    if (!listed.ok) {
      return
    }
    expect(listed.photos).toEqual([expect.objectContaining({ id: uploaded.json.id, is_main: true })])
    const token = listed.photos[0]?.url.split('token=')[1] ?? ''
    const clear = await fetch(`${base}/v1/media/get?token=${token}`, { headers: { cookie: viewerCookie } })
    expect(clear.status).toBe(200)
    const served = Buffer.from(await clear.arrayBuffer())
    const original = media.blobs.get(media.assets.find((row) => row.id === uploaded.json.id)?.original_key ?? '')
    const blur = media.blobs.get(media.assets.find((row) => row.id === uploaded.json.id)?.blur_key ?? '')
    expect(served.equals(Buffer.from(original ?? []))).toBe(true)
    expect(served.equals(Buffer.from(blur ?? []))).toBe(false)

    const card = await livePhotosForMember(media, owner.id, viewer.id, 'sm')
    expect(card.ok).toBe(true)

    const back = await fetch(`${base}/v1/me/profile`, {
      method: 'PATCH',
      headers: { cookie: ownerCookie, 'content-type': 'application/json' },
      body: JSON.stringify({ photo_blur: true }),
    })
    expect(back.status).toBe(200)
    const stopped = await fetch(`${base}/v1/media/get?token=${token}`, { headers: { cookie: viewerCookie } })
    expect(stopped.status).toBe(403)
    const originalSign = await signMedia(media, String(uploaded.json.id), 'original', viewer.id, { clearForMember: true })
    expect(originalSign.ok).toBe(false)
  })

  it('shows the owner a clear photo while blur stays on, and restores a missing clear file', async () => {
    const owner = await createAccount()
    const ownerCookie = await signIn(owner.email)
    const viewer = await createAccount()
    const viewerCookie = await signIn(viewer.email)
    const uploaded = await upload(ownerCookie)
    expect(await media.allowProfilePhoto(String(uploaded.json.id))).toBe(true)
    const asset = media.assets.find((row) => row.id === uploaded.json.id)
    const original = Buffer.from(media.blobs.get(asset?.original_key ?? '') ?? [])
    const blur = Buffer.from(media.blobs.get(asset?.blur_key ?? '') ?? [])
    const md = media.derivatives.find((row) => row.photo_asset_id === uploaded.json.id && row.size === 'md')
    expect(md).toBeTruthy()
    media.derivatives.splice(media.derivatives.indexOf(md!), 1)
    media.blobs.delete(md?.object_key ?? '')

    const profile = await fetch(`${base}/v1/me/profile`, { headers: { cookie: ownerCookie } })
    expect(profile.status).toBe(200)
    const body = (await profile.json()) as { photo_blur: boolean; photos: Array<{ url: string }> }
    expect(body.photo_blur).toBe(true)
    const token = body.photos[0]?.url.split('token=')[1] ?? ''
    const clear = await fetch(`${base}/v1/media/get?token=${token}`, { headers: { cookie: ownerCookie } })
    expect(clear.status).toBe(200)
    expect(clear.headers.get('content-type')).toContain('image/png')
    expect(Buffer.from(await clear.arrayBuffer()).equals(original)).toBe(true)
    expect(media.derivatives.some((row) => row.photo_asset_id === uploaded.json.id && row.size === 'md')).toBe(true)

    const listed = await livePhotosForMember(media, owner.id, viewer.id, 'md')
    expect(listed.ok).toBe(true)
    if (!listed.ok) {
      return
    }
    const memberToken = listed.photos[0]?.url.split('token=')[1] ?? ''
    const hidden = await fetch(`${base}/v1/media/get?token=${memberToken}`, { headers: { cookie: viewerCookie } })
    expect(hidden.status).toBe(200)
    expect(hidden.headers.get('content-type')).toContain('image/jpeg')
    expect(Buffer.from(await hidden.arrayBuffer()).equals(blur)).toBe(true)
  })
})
