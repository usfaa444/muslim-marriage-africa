import { createRequire } from 'node:module'
import { randomBytes } from 'node:crypto'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { AddressInfo } from 'node:net'
import type { INestApplication } from '@nestjs/common'
import { newId } from '@ankanu/kernel'
import type { ModerationPort } from '@ankanu/ports'
import { io as connectSocket, type Socket } from 'socket.io-client'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { memoryAccountStore, setAccountStore } from './account-store.js'
import { memoryAuditPort, setAuditPort } from './audit-port.js'
import { setAuthClock } from './auth-clock.js'
import { setAuthLimitReader } from './auth-limit.js'
import { resetAuthRateWindow } from './auth-rate.js'
import { setBillingPort } from './billing-port.js'
import { setBrowseLimitReader } from './browse-rate.js'
import { memoryChatPort, setChatPort } from './chat.js'
import { setChatKey } from './chat-key.js'
import { memoryMessageStore, setMessageCapCheck, setMessageStore, type CapDecision, type MessageKind } from './chat-messages.js'
import { createApp } from './create-app.js'
import { memoryFavouriteStore, setFavouriteStore } from './favourites.js'
import { memoryCaptureStore, setCaptureStore } from './id-liveness-store.js'
import { setInvitesPort } from './invites-port.js'
import { memoryInviteStore, setInviteConfigReader, setInviteStore, type InviteConfig } from './invites.js'
import { applyModerationAllowed, setMediaClock, setSignedTtlReader, signMedia } from './media.js'
import {
  CHAT_PHOTO_MAX_BYTES,
  fetchChatMediaForScan,
  signChatMedia,
  stripJpegMetadata,
  stripPngMetadata,
  VOICE_MAX_BYTES,
  VOICE_MAX_MS,
} from './media-chat.js'
import { MediaStorageError, memoryMediaStore, setMediaStore, type MediaStore } from './media-store.js'
import { setMahramPort } from './mahram-port.js'
import { memoryModerationPort, setModerationPort } from './moderation.js'
import { same_quota_as_brothers } from './operator-config.js'
import { memoryPhoneOtpStore, setPhoneOtpStore } from './phone-otp-store.js'
import { memoryPinLockStore, setPinLockStore } from './pin-lock-store.js'
import { resetPinEntries } from './pin-lock-state.js'
import { setPhotoStrikeConfigReader } from './photo-strike.js'
import { setFreeReviewSlaReader } from './profile-review.js'
import { memoryProfileStore, setProfileStore } from './profile-store.js'
import { SESSION_COOKIE } from './session-cookie.js'
import { memorySessionStore, setSessionStore } from './session-store.js'
import { memoryTrustStore, setReportRateReader, setReportSlaReader, setTrustStore } from './trust.js'
import { setTrustPort } from './trust-port.js'

/**
 * Stories 5.3 (Chat Photo) and 5.4 (Voice note): delivered at once, then one scan job; signed, short-lived,
 * per-caller access for the two conversation members only; the same closed, Block and cap seam as text.
 */

const require = createRequire(import.meta.url)
const { PNG } = require('pngjs') as {
  PNG: {
    new (options: { width: number; height: number }): { data: Buffer; width: number; height: number }
    sync: { write(png: { data: Buffer; width: number; height: number }): Buffer }
  }
}
const jpeg = require('jpeg-js') as {
  encode(image: { width: number; height: number; data: Uint8Array }, quality: number): { data: Uint8Array }
}

const srcDir = fileURLToPath(new URL('.', import.meta.url))
const memory = memoryAccountStore()
const sessions = memorySessionStore(memory)
const pins = memoryPinLockStore()
const media = memoryMediaStore()
const otp = memoryPhoneOtpStore()
const favourites = memoryFavouriteStore()
const invites = memoryInviteStore()
const chat = memoryChatPort()
const messages = memoryMessageStore()
const moderation = memoryModerationPort()
const trust = memoryTrustStore()
const captures = memoryCaptureStore({ accounts: memory.accounts, profiles: memory.profiles, phoneRows: [] })
const chatKey = { key: randomBytes(32), kid: 'test-chat-1' }

let now = new Date('2026-10-24T10:00:00.000Z')
let serial = 0
let billingCalls = 0
const config: InviteConfig = { sisterReachMode: same_quota_as_brothers, freeCap: 50, premiumCap: null }

/** The moderation adapter the send command sees; a test makes it hang to show nothing waits on it. */
let moderationMode: 'ok' | 'hang' = 'ok'
const switchingModeration: ModerationPort = {
  async enqueueScan(input) {
    if (moderationMode === 'hang') {
      return new Promise(() => undefined)
    }
    // Persist first (AD-10): the message and its media exist when moderation is called.
    const row = messages.rows.find((item) => item.id === input.itemId)
    expect(row).toBeDefined()
    if (row?.media_id) {
      expect(media.assets.some((asset) => asset.id === row.media_id)).toBe(true)
    }
    return moderation.enqueueScan(input)
  },
}

/** The media store the API sees; a test switches object storage off. */
let storageDown = false
const switchingMedia: MediaStore = {
  ...media,
  async saveAsset(asset, derivatives, files) {
    if (storageDown) {
      throw new MediaStorageError()
    }
    return media.saveAsset(asset, derivatives, files)
  },
}

function samplePng(width = 8, height = 8): Buffer {
  const png = new PNG({ width, height })
  for (let index = 0; index < png.data.length; index += 4) {
    png.data[index] = 40
    png.data[index + 1] = 80
    png.data[index + 2] = 120
    png.data[index + 3] = 255
  }
  return PNG.sync.write(png)
}

/** A camera-like JPEG: APP1 EXIF with a GPS marker and a comment, which the server must drop. */
function cameraJpeg(): Buffer {
  const width = 16
  const height = 12
  const data = new Uint8Array(width * height * 4).fill(180)
  const plain = Buffer.from(jpeg.encode({ width, height, data }, 80).data)
  const exifBody = Buffer.from('Exif\0\0GPSLatitude=12.3714;GPSLongitude=-1.5197;Model=Phone', 'latin1')
  const app1 = Buffer.concat([Buffer.from([0xff, 0xe1]), Buffer.alloc(2), exifBody])
  app1.writeUInt16BE(exifBody.length + 2, 2)
  const commentBody = Buffer.from('secret comment', 'latin1')
  const com = Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.alloc(2), commentBody])
  com.writeUInt16BE(commentBody.length + 2, 2)
  return Buffer.concat([plain.subarray(0, 2), app1, com, plain.subarray(2)])
}

/** A PNG header that claims a huge raster: refused from the header, before any decode. */
function hugePngHeader(): Buffer {
  const png = samplePng()
  const copy = Buffer.from(png)
  copy.writeUInt32BE(7000, 16)
  return copy
}

/** Opus-in-WebM bytes as MediaRecorder writes them start with the EBML magic. The rest is opaque here. */
function webmVoice(size = 4096): Buffer {
  return Buffer.concat([Buffer.from([0x1a, 0x45, 0xdf, 0xa3]), randomBytes(size - 4)])
}

function oggVoice(size = 2048): Buffer {
  return Buffer.concat([Buffer.from('OggS', 'latin1'), randomBytes(size - 4)])
}

type Member = { id: string; email: string; cookie: string }

type MediaItem = {
  id: string
  conversation_id: string
  sender_id: string
  mine: boolean
  kind: string
  state: string
  text: string | null
  created_at: string
  media?: { id: string; kind: string; width?: number | null; height?: number | null; blur_url?: string | null; duration_ms?: number | null }
}

describe('Chat Photo and Voice note: delivered, then enqueue scan (Stories 5.3, 5.4)', { timeout: 60_000 }, () => {
  let app: INestApplication
  let base: string
  const png = samplePng()
  const sockets: Socket[] = []

  beforeAll(async () => {
    setAuthClock(() => now)
    setMediaClock(() => now)
    setSignedTtlReader(async () => 60)
    setPhotoStrikeConfigReader(async () => ({ count: '3', hours: '24' }))
    setFreeReviewSlaReader(async () => 24)
    setAuthLimitReader(async () => 1000)
    setBrowseLimitReader(async () => 1000)
    setReportRateReader(async () => 10)
    setReportSlaReader(async () => 24)
    setMahramPort(undefined)
    setBillingPort({
      async isEntitled() {
        billingCalls += 1
        return false
      },
    })
    setInviteConfigReader(async () => config)
    setAccountStore(memory)
    setSessionStore(sessions)
    setProfileStore(memoryProfileStore(memory.accounts, memory.profiles))
    setFavouriteStore(favourites)
    setInviteStore(invites)
    setChatPort(chat)
    setMessageStore(messages)
    setModerationPort(switchingModeration)
    setTrustStore(trust)
    setTrustPort(undefined)
    setChatKey(chatKey)
    setInvitesPort(undefined)
    setMediaStore(switchingMedia)
    setPhoneOtpStore(otp)
    setCaptureStore(captures)
    setAuditPort(memoryAuditPort([]))
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
    for (const socket of sockets.splice(0)) {
      socket.disconnect()
    }
    memory.accounts.length = 0
    memory.credentials.length = 0
    memory.profiles.length = 0
    media.assets.length = 0
    media.derivatives.length = 0
    media.grants.length = 0
    media.blobs.clear()
    otp.rows.length = 0
    captures.rows.length = 0
    favourites.rows.length = 0
    invites.rows.length = 0
    invites.quota.length = 0
    invites.sisterAcceptedAt.clear()
    chat.conversations.length = 0
    messages.rows.length = 0
    moderation.jobs.length = 0
    moderation.calls.length = 0
    trust.reports.length = 0
    trust.cases.length = 0
    trust.blocks.length = 0
    moderationMode = 'ok'
    storageDown = false
    billingCalls = 0
    setChatKey(chatKey)
    setMessageCapCheck(undefined)
    setSignedTtlReader(async () => 60)
    now = new Date('2026-10-24T10:00:00.000Z')
    resetAuthRateWindow()
  })

  afterAll(async () => {
    for (const socket of sockets.splice(0)) {
      socket.disconnect()
    }
    setAuthClock(undefined)
    setMediaClock(undefined)
    setSignedTtlReader(undefined)
    setPhotoStrikeConfigReader(undefined)
    setFreeReviewSlaReader(undefined)
    setAuthLimitReader(undefined)
    setBrowseLimitReader(undefined)
    setReportRateReader(undefined)
    setReportSlaReader(undefined)
    setMahramPort(undefined)
    setBillingPort(undefined)
    setInviteConfigReader(undefined)
    setInviteStore(undefined)
    setChatPort(undefined)
    setMessageStore(undefined)
    setModerationPort(undefined)
    setTrustStore(undefined)
    setTrustPort(undefined)
    setMessageCapCheck(undefined)
    setChatKey(undefined)
    setInvitesPort(undefined)
    setPhoneOtpStore(undefined)
    setCaptureStore(undefined)
    setAuditPort(undefined)
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

  async function member(gender: 'sister' | 'brother'): Promise<Member> {
    serial += 1
    const email = `media${serial}@example.bf`
    const created = await call('/v1/accounts', undefined, 'POST', {
      email,
      password: 'phrase avec espaces',
      pseudonym: `Media_${serial}`,
      gender,
      pledge_accepted: true,
      civil_given_name: 'Awa',
      civil_family_name: 'Sawadogo',
      recaptcha_token: 'test-ok',
      coc_version: 'FR-089',
      dob: '1990-01-15',
    })
    expect(created.status).toBe(201)
    const id = ((await created.json()) as { id: string }).id
    const session = await call('/v1/sessions', undefined, 'POST', {
      identifier: email,
      password: 'phrase avec espaces',
      remember_me: false,
      recaptcha_token: 'test-ok',
    })
    expect(session.status).toBe(201)
    const match = new RegExp(`${SESSION_COOKIE}=([^;]+)`).exec(session.headers.getSetCookie().join('\n'))
    const cookie = `${SESSION_COOKIE}=${match?.[1] ?? ''}`
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
    const profile = memory.profiles.find((item) => item.account_id === id)
    if (profile) {
      profile.visibility = 'public'
    }
    const posted = await call('/v1/media', cookie, 'POST', { kind: 'profile_photo', image: png.toString('base64') })
    expect(posted.status).toBe(201)
    const assetId = ((await posted.json()) as { id: string }).id
    const asset = media.assets.find((row) => row.id === assetId)
    if (asset) {
      asset.moderation_state = 'live'
      asset.is_main = true
    }
    return { id, email, cookie }
  }

  async function connected(): Promise<{ brother: Member; sister: Member; conversationId: string }> {
    const brother = await member('brother')
    const sister = await member('sister')
    now = new Date(now.getTime() + 1000)
    const sent = await call('/v1/invites', brother.cookie, 'POST', { to_id: sister.id })
    expect(sent.status).toBe(201)
    const inviteId = ((await sent.json()) as { invite: { id: string } }).invite.id
    const accepted = await call(`/v1/invites/${inviteId}/accept`, sister.cookie, 'POST')
    expect(accepted.status).toBe(200)
    const conversationId = ((await accepted.json()) as { conversation: { id: string } }).conversation.id
    billingCalls = 0
    return { brother, sister, conversationId }
  }

  function send(who: Member, conversationId: string, body: Record<string, unknown>): Promise<Response> {
    now = new Date(now.getTime() + 1000)
    return call(`/v1/conversations/${conversationId}/messages`, who.cookie, 'POST', body)
  }

  function sendPhoto(who: Member, conversationId: string, bytes: Buffer = cameraJpeg()): Promise<Response> {
    return send(who, conversationId, { kind: 'photo', image: bytes.toString('base64') })
  }

  function sendVoice(who: Member, conversationId: string, extra: Record<string, unknown> = {}, bytes: Buffer = webmVoice()): Promise<Response> {
    return send(who, conversationId, { kind: 'voice', audio: bytes.toString('base64'), duration_ms: 48_000, ...extra })
  }

  async function items(who: Member, conversationId: string): Promise<MediaItem[]> {
    const listed = await call(`/v1/conversations/${conversationId}/messages`, who.cookie)
    expect(listed.status).toBe(200)
    return ((await listed.json()) as { items: MediaItem[] }).items
  }

  async function access(who: Member | undefined, conversationId: string, messageId: string): Promise<Response> {
    return call(`/v1/conversations/${conversationId}/messages/${messageId}/media`, who?.cookie)
  }

  async function gateway(who: Member | undefined, url: string): Promise<Response> {
    return call(url, who?.cookie)
  }

  function connectedSocket(who: Member): Promise<Socket> {
    const socket = connectSocket(base, {
      path: '/v1/realtime',
      addTrailingSlash: false,
      transports: ['websocket'],
      extraHeaders: { cookie: who.cookie },
      reconnection: false,
      forceNew: true,
    })
    sockets.push(socket)
    return new Promise((resolve, reject) => {
      socket.once('connect', () => resolve(socket))
      socket.once('connect_error', (error) => reject(error))
    })
  }

  function nextEvent<T>(socket: Socket, name: string, timeoutMs = 2000): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`no ${name} within ${timeoutMs} ms`)), timeoutMs)
      socket.once(name, (payload: T) => {
        clearTimeout(timer)
        resolve(payload)
      })
    })
  }

  function nothingStored(): void {
    expect(messages.rows).toHaveLength(0)
    expect(media.assets.filter((asset) => asset.kind !== 'profile_photo')).toHaveLength(0)
    expect([...media.blobs.keys()].filter((key) => !key.startsWith('profile-photo/'))).toEqual([])
    expect(moderation.calls).toHaveLength(0)
    expect(moderation.jobs).toHaveLength(0)
  }

  it('AC 5.3-1: a Chat Photo is stored chat_photo and delivered, the recipient sees it at once, then one scan job is enqueued', async () => {
    const { brother, sister, conversationId } = await connected()
    const socket = await connectedSocket(brother)
    const delivered = nextEvent<Record<string, unknown>>(socket, 'message.delivered')
    const started = Date.now()
    const sent = await sendPhoto(sister, conversationId)
    const ackMs = Date.now() - started
    expect(sent.status).toBe(201)
    expect(sent.headers.get('cache-control')).toBe('no-store')
    const body = (await sent.json()) as { message: MediaItem }
    expect(body.message).toEqual({
      id: expect.any(String),
      conversation_id: conversationId,
      sender_id: sister.id,
      mine: true,
      kind: 'photo',
      state: 'delivered',
      text: null,
      created_at: expect.any(String),
      media: { id: expect.any(String), kind: 'photo', width: 16, height: 12, blur_url: expect.stringMatching(/^\/v1\/media\/get\?token=/) },
    })
    expect(ackMs).toBeLessThan(2000)

    // Realtime: ids only, never a URL or the media id.
    expect(await delivered).toEqual({ conversation_id: conversationId, message_id: body.message.id, sender_id: sister.id })

    // Stored: one message row pointing at one chat_photo asset with no moderation state; the body is ciphertext.
    expect(messages.rows).toHaveLength(1)
    const row = messages.rows[0]
    const mediaId = body.message.media?.id ?? ''
    expect(row).toMatchObject({ id: body.message.id, kind: 'photo', state: 'delivered', media_id: mediaId })
    expect(Object.keys(row?.body ?? {}).sort()).toEqual(['alg', 'ct', 'iv', 'kid', 'v'])
    const asset = media.assets.find((item) => item.id === mediaId)
    expect(asset).toMatchObject({ owner_id: sister.id, kind: 'chat_photo', moderation_state: null, is_main: false })
    expect(media.derivatives.filter((item) => item.photo_asset_id === mediaId).map((item) => item.size).sort()).toEqual(['blur', 'md'])

    // The recipient's thread has it now: blur signed for them, the clear image one request away.
    const theirs = await items(brother, conversationId)
    expect(theirs).toEqual([{ ...body.message, mine: false, media: { ...body.message.media, blur_url: expect.stringMatching(/^\/v1\/media\/get\?token=/) } }])
    const blur = await gateway(brother, theirs[0]?.media?.blur_url ?? '')
    expect(blur.status).toBe(200)
    expect(blur.headers.get('content-type')).toBe('image/jpeg')
    const opened = await access(brother, conversationId, body.message.id)
    expect(opened.status).toBe(200)
    expect(opened.headers.get('cache-control')).toBe('no-store')
    const grant = (await opened.json()) as { url: string; expires_at: string }
    expect(grant.url).toMatch(/^\/v1\/media\/get\?token=/)
    expect(Date.parse(grant.expires_at) - now.getTime()).toBe(60_000)
    const clear = await gateway(brother, grant.url)
    expect(clear.status).toBe(200)
    expect(clear.headers.get('content-type')).toBe('image/jpeg')
    const bytes = Buffer.from(await clear.arrayBuffer())
    // Metadata is gone: no EXIF / GPS, no comment; the image itself is the same.
    expect(bytes.toString('latin1')).not.toMatch(/Exif|GPSLatitude|secret comment/)
    expect(bytes.equals(stripJpegMetadata(cameraJpeg()) ?? Buffer.alloc(0))).toBe(true)

    // Then exactly one job, keyed by the message (not a second one by asset), with the media id only.
    expect(moderation.calls).toEqual([
      { itemId: body.message.id, itemKind: 'message', accountId: sister.id, payload: { kind: 'photo', mediaId, contentType: 'image/jpeg' } },
    ])
    expect(moderation.jobs).toEqual([{ id: expect.any(String), message_id: body.message.id, asset_id: null, flash_id: null, outcome: null }])
    // The worker reads the bytes through media, not through message.
    expect((await fetchChatMediaForScan(media, mediaId))?.kind).toBe('chat_photo')

    // The Discussions list shows the kind, never a URL or the text of a photo.
    const list = (await (await call('/v1/conversations', brother.cookie)).json()) as { items: Array<{ last_message: unknown }> }
    expect(list.items[0]?.last_message).toEqual({ id: body.message.id, mine: false, kind: 'photo', preview: null, created_at: body.message.created_at, read: false })

    // AC 5.3-1 « Premium: message_quota not incremented »: no BillingPort read and no quota exists before Story 5.11.
    expect(billingCalls).toBe(0)
  })

  it('AC 5.3-1: unauthorized viewers never get the Photo; tokens are per caller, short-lived, and never the original', async () => {
    const { brother, sister, conversationId } = await connected()
    const stranger = await member('brother')
    const sent = (await (await sendPhoto(sister, conversationId)).json()) as { message: MediaItem }
    const messageId = sent.message.id
    const mediaId = sent.message.media?.id ?? ''

    // Another member, no session: the conversation does not exist for them.
    expect((await access(stranger, conversationId, messageId)).status).toBe(404)
    expect((await access(undefined, conversationId, messageId)).status).toBe(401)
    expect((await call(`/v1/conversations/${conversationId}/messages`, stranger.cookie)).status).toBe(404)
    // A message id from elsewhere, a text message, a malformed id: 404 « Ce média est introuvable. »
    const missing = await access(brother, conversationId, newId(now))
    expect(missing.status).toBe(404)
    expect(await missing.json()).toMatchObject({ error: { code: 'NOT_FOUND', message: 'Ce média est introuvable.' } })
    expect((await access(brother, conversationId, 'pas-un-id')).status).toBe(404)
    const text = (await (await send(brother, conversationId, { kind: 'text', text: 'Bien reçu.' })).json()) as { message: MediaItem }
    expect((await access(brother, conversationId, text.message.id)).status).toBe(404)

    // The recipient's token does not work for anyone else (the gateway rebinds it to the caller).
    const grant = (await (await access(brother, conversationId, messageId)).json()) as { url: string }
    expect((await gateway(stranger, grant.url)).status).toBe(403)
    expect((await gateway(sister, grant.url)).status).toBe(403)
    expect((await gateway(undefined, grant.url)).status).toBe(401)
    expect((await gateway(brother, grant.url)).status).toBe(200)

    // Expired after the capped TTL.
    now = new Date(now.getTime() + 61_000)
    expect((await gateway(brother, grant.url)).status).toBe(403)

    // No signer hands out the original: the generic profile signer refuses chat media, and a forged `original` grant
    // is refused at the gateway.
    expect(await signMedia(media, mediaId, 'blur', brother.id)).toMatchObject({ ok: false, status: 403 })
    expect(await signMedia(media, mediaId, 'original', brother.id)).toMatchObject({ ok: false, status: 403 })
    const forged = newId(now)
    media.grants.push({ id: forged, photo_asset_id: mediaId, viewer_id: brother.id, derivative: 'original', expires_at: new Date(now.getTime() + 60_000).toISOString(), revoked_at: null })
    expect((await gateway(brother, `/v1/media/get?token=${forged}`)).status).toBe(403)
    // The API answers never carry a storage key.
    expect(JSON.stringify(sent)).not.toMatch(/chat-photo\/|original/)
  })

  it('QA F1: a real Photo or Voice note of another conversation is never signed through my conversation (404, no grant)', async () => {
    const mine = await connected()
    const theirs = await connected()
    const photo = (await (await sendPhoto(theirs.sister, theirs.conversationId)).json()) as { message: MediaItem }
    const voice = (await (await sendVoice(theirs.brother, theirs.conversationId)).json()) as { message: MediaItem }
    expect(photo.message.media?.kind).toBe('photo')
    expect(voice.message.media?.kind).toBe('voice')
    const grantsBefore = media.grants.length
    for (const messageId of [photo.message.id, voice.message.id]) {
      // A participant of my conversation asks for their message through my conversation id.
      for (const who of [mine.brother, mine.sister]) {
        const response = await access(who, mine.conversationId, messageId)
        expect(response.status).toBe(404)
        expect(await response.json()).toMatchObject({ error: { code: 'NOT_FOUND', message: 'Ce média est introuvable.' } })
      }
      // Through their conversation id: not a participant, the conversation does not exist for me.
      expect((await access(mine.brother, theirs.conversationId, messageId)).status).toBe(404)
    }
    expect(media.grants.length).toBe(grantsBefore)
    const chatMedia = [photo.message.media?.id, voice.message.media?.id]
    expect(media.grants.filter((grant) => chatMedia.includes(grant.photo_asset_id) && (grant.viewer_id === mine.brother.id || grant.viewer_id === mine.sister.id))).toEqual([])
    // Their own members still get it through their conversation.
    expect((await access(theirs.brother, theirs.conversationId, photo.message.id)).status).toBe(200)
    expect((await access(theirs.sister, theirs.conversationId, voice.message.id)).status).toBe(200)
  })

  it('AC 5.3-3: signing a chat_photo never waits on applyModeration, even while the scan enqueue hangs', async () => {
    const { brother, sister, conversationId } = await connected()
    moderationMode = 'hang'
    const started = Date.now()
    const sent = await sendPhoto(sister, conversationId, samplePng(20, 10))
    expect(sent.status).toBe(201)
    // The ack is capped by the 1 s enqueue wait (NFR-005 ≤ 2 s), not by the scan.
    expect(Date.now() - started).toBeLessThan(2000)
    const message = ((await sent.json()) as { message: MediaItem }).message
    expect(message.media).toMatchObject({ kind: 'photo', width: 20, height: 10 })
    const asset = media.assets.find((item) => item.id === message.media?.id)
    expect(asset?.moderation_state).toBeNull()
    expect(applyModerationAllowed('chat_photo')).toBe(false)
    expect(applyModerationAllowed('voice_note')).toBe(false)
    const signed = await signChatMedia(media, asset?.id ?? '', 'clear', brother.id)
    expect(signed).toMatchObject({ ok: true })
    const clear = await gateway(brother, signed.ok ? signed.url : '')
    expect(clear.status).toBe(200)
    expect(clear.headers.get('content-type')).toBe('image/png')
  })

  it('AC 5.4-1: a Voice note is stored voice_note and delivered, playable at once, with no transcript, then one scan job', async () => {
    const { brother, sister, conversationId } = await connected()
    const audio = webmVoice()
    const sent = await sendVoice(brother, conversationId, { language: 'fr' }, audio)
    expect(sent.status).toBe(201)
    const message = ((await sent.json()) as { message: MediaItem }).message
    expect(message).toEqual({
      id: expect.any(String),
      conversation_id: conversationId,
      sender_id: brother.id,
      mine: true,
      kind: 'voice',
      state: 'delivered',
      text: null,
      created_at: expect.any(String),
      media: { id: expect.any(String), kind: 'voice', duration_ms: 48_000 },
    })
    const mediaId = message.media?.id ?? ''
    expect(media.assets.find((item) => item.id === mediaId)).toMatchObject({ kind: 'voice_note', moderation_state: null, blur_key: null })
    expect(messages.rows[0]).toMatchObject({ kind: 'voice', state: 'delivered', media_id: mediaId })
    // The language hint is sealed with the message, not readable at rest.
    expect(JSON.stringify(messages.rows[0])).not.toMatch(/48000|"fr"/)

    const theirs = await items(sister, conversationId)
    expect(theirs).toEqual([{ ...message, mine: false }])
    const listed = JSON.stringify(theirs)
    expect(listed).not.toMatch(/transcript|transcription/i)
    const grant = (await (await access(sister, conversationId, message.id)).json()) as { url: string }
    const played = await gateway(sister, grant.url)
    expect(played.status).toBe(200)
    expect(played.headers.get('content-type')).toBe('audio/webm')
    expect(Buffer.from(await played.arrayBuffer()).equals(audio)).toBe(true)
    // The sender can play it back too; nobody else can.
    expect((await access(brother, conversationId, message.id)).status).toBe(200)
    expect((await gateway(await member('sister'), grant.url)).status).toBe(403)

    expect(moderation.calls).toEqual([
      {
        itemId: message.id,
        itemKind: 'message',
        accountId: brother.id,
        payload: { kind: 'voice', mediaId, contentType: 'audio/webm', durationMs: 48_000, language: 'fr' },
      },
    ])
    expect(moderation.jobs).toEqual([{ id: expect.any(String), message_id: message.id, asset_id: null, flash_id: null, outcome: null }])
    expect(Buffer.from((await fetchChatMediaForScan(media, mediaId))?.bytes ?? []).equals(audio)).toBe(true)
    expect(billingCalls).toBe(0)
  })

  it('AC 5.4-4: a Mooré or Dioula Voice note is delivered before any scan runs; the language never holds it', async () => {
    const { brother, sister, conversationId } = await connected()
    for (const language of ['mos', 'dyu'] as const) {
      const sent = await sendVoice(sister, conversationId, { language }, oggVoice())
      expect(sent.status).toBe(201)
      const message = ((await sent.json()) as { message: MediaItem }).message
      // The recipient can play it already; `switchingModeration` asserted the row existed before the enqueue.
      const grant = await access(brother, conversationId, message.id)
      expect(grant.status).toBe(200)
      const played = await gateway(brother, ((await grant.json()) as { url: string }).url)
      expect(played.headers.get('content-type')).toBe('audio/ogg')
      expect(moderation.calls.at(-1)?.payload).toMatchObject({ kind: 'voice', language })
    }
    expect(new Set(messages.rows.map((row) => row.state))).toEqual(new Set(['delivered']))
    // Without a language the note is delivered the same way.
    expect((await sendVoice(sister, conversationId)).status).toBe(201)
    expect(moderation.calls.at(-1)?.payload).toMatchObject({ kind: 'voice', language: null })
  })

  it('AC 5.3-2 / AC 5.4-2 seam (Story 5.11): a refusing cap check answers MESSAGE_CAP_EXCEEDED and stores, holds or enqueues nothing', async () => {
    const { sister, conversationId } = await connected()
    const seen: MessageKind[] = []
    const refuse: CapDecision = { allowed: false, cap: 10, resets_at: '2026-10-25T00:00:00.000Z' }
    setMessageCapCheck(async (input) => {
      seen.push(input.kind)
      expect(input.senderId).toBe(sister.id)
      return refuse
    })
    for (const response of [await sendPhoto(sister, conversationId), await sendVoice(sister, conversationId)]) {
      expect(response.status).toBe(429)
      expect(await response.json()).toMatchObject({
        error: { code: 'MESSAGE_CAP_EXCEEDED', message: 'Limite de messages du jour atteinte.', details: { cap: 10, resets_at: '2026-10-25T00:00:00.000Z' } },
      })
    }
    expect(seen).toEqual(['photo', 'voice'])
    nothingStored()
    expect(billingCalls).toBe(0)
  })

  it('AC 5.4-3: a Free member under the cap sends a Voice note without any paywall, and the send still goes through the cap seam', async () => {
    const { sister, conversationId } = await connected()
    const seen: MessageKind[] = []
    setMessageCapCheck(async (input) => {
      seen.push(input.kind)
      return { allowed: true }
    })
    // Billing answers « not entitled » for everyone in this suite: the send still succeeds and never asks it.
    expect((await sendVoice(sister, conversationId)).status).toBe(201)
    expect((await sendPhoto(sister, conversationId)).status).toBe(201)
    expect(seen).toEqual(['voice', 'photo'])
    expect(billingCalls).toBe(0)
  })

  it('validates the Photo and the Voice note and writes nothing on a refusal', async () => {
    const { sister, conversationId } = await connected()
    const gif = Buffer.from('GIF89a\x01\x00\x01\x00', 'latin1')
    const photoCases: Array<[unknown, string, Record<string, unknown>]> = [
      [undefined, 'Une photo JPEG ou PNG est requise.', { field: 'image' }],
      ['%%%', 'Une photo JPEG ou PNG est requise.', { field: 'image' }],
      [gif.toString('base64'), 'Une photo JPEG ou PNG est requise.', { field: 'image' }],
      // QA F3: the bytes decide, never a name or a declared type. A corrupt GIF, a WebP, random bytes, and a GIF whose
      // body claims a JPEG content type are all refused by sniffing.
      [Buffer.concat([Buffer.from('GIF89a', 'latin1'), Buffer.alloc(32, 0x5a)]).toString('base64'), 'Une photo JPEG ou PNG est requise.', { field: 'image' }],
      [Buffer.concat([Buffer.from('RIFF', 'latin1'), Buffer.alloc(4, 0), Buffer.from('WEBPVP8 ', 'latin1'), Buffer.alloc(16, 1)]).toString('base64'), 'Une photo JPEG ou PNG est requise.', { field: 'image' }],
      [randomBytes(64).fill(0x00, 0, 1).toString('base64'), 'Une photo JPEG ou PNG est requise.', { field: 'image' }],
      [`data:image/jpeg;base64,${gif.toString('base64')}`, 'Une photo JPEG ou PNG est requise.', { field: 'image' }],
      [Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00]).toString('base64'), 'Une photo JPEG ou PNG est requise.', { field: 'image' }],
      [Buffer.alloc(CHAT_PHOTO_MAX_BYTES + 1, 1).toString('base64'), 'Photo trop lourde (2 Mo au plus).', { field: 'image', max: CHAT_PHOTO_MAX_BYTES }],
      [hugePngHeader().toString('base64'), 'Photo trop grande (6000 pixels de côté au plus).', { field: 'image', max: 6000 }],
    ]
    for (const [image, message, details] of photoCases) {
      const response = await send(sister, conversationId, { kind: 'photo', image })
      expect(response.status, message).toBe(400)
      expect(await response.json()).toMatchObject({ error: { code: 'UNHANDLED', message, details } })
    }
    const voiceCases: Array<[Record<string, unknown>, string, Record<string, unknown>]> = [
      [{ audio: undefined }, 'Une note vocale est requise.', { field: 'audio' }],
      [{ audio: Buffer.from('RIFF0000WAVE').toString('base64') }, 'Une note vocale est requise.', { field: 'audio' }],
      [{ audio: Buffer.alloc(VOICE_MAX_BYTES + 1, 1).toString('base64') }, 'Note vocale trop lourde (1 Mo au plus).', { field: 'audio', max: VOICE_MAX_BYTES }],
      [{ duration_ms: VOICE_MAX_MS + 1 }, 'Note vocale trop longue (2 minutes au plus).', { field: 'duration_ms', max: VOICE_MAX_MS }],
      [{ duration_ms: 999 }, 'Note vocale trop courte (1 seconde au moins).', { field: 'duration_ms' }],
      [{ duration_ms: '48000' }, 'duration_ms : valeur non reconnue.', { field: 'duration_ms' }],
      [{ duration_ms: 1.5 }, 'duration_ms : valeur non reconnue.', { field: 'duration_ms' }],
      [{ language: 'en' }, 'language : valeur non reconnue.', { field: 'language' }],
    ]
    for (const [extra, message, details] of voiceCases) {
      const body: Record<string, unknown> = { kind: 'voice', audio: webmVoice().toString('base64'), duration_ms: 5000, ...extra }
      const response = await send(sister, conversationId, body)
      expect(response.status, message).toBe(400)
      expect(await response.json()).toMatchObject({ error: { code: 'UNHANDLED', message, details } })
    }
    for (const kind of ['gif', 'sticker', 'video']) {
      const response = await send(sister, conversationId, { kind, image: png.toString('base64') })
      expect(response.status).toBe(400)
      expect(await response.json()).toMatchObject({ error: { message: 'kind : valeur non reconnue.', details: { field: 'kind' } } })
    }
    nothingStored()
    // The limits themselves pass.
    expect((await sendVoice(sister, conversationId, { duration_ms: VOICE_MAX_MS })).status).toBe(201)
    expect((await sendVoice(sister, conversationId, { duration_ms: 1000 })).status).toBe(201)
  })

  it('a closed, blocked or unavailable conversation refuses a Photo and a Voice note; earlier media stays readable to both', async () => {
    const { brother, sister, conversationId } = await connected()
    const earlier = ((await (await sendPhoto(brother, conversationId)).json()) as { message: MediaItem }).message
    moderation.calls.length = 0
    moderation.jobs.length = 0
    const assetsBefore = media.assets.length

    const blocked = await call('/v1/blocks', sister.cookie, 'POST', { blocked_id: brother.id })
    expect(blocked.status).toBe(201)
    for (const [who, response] of [
      [brother, await sendPhoto(brother, conversationId)],
      [sister, await sendVoice(sister, conversationId)],
    ] as const) {
      expect(response.status, who.email).toBe(409)
      expect(await response.json()).toMatchObject({ error: { message: 'Cette discussion est fermée.', details: { reason: 'conversation_closed' } } })
    }
    // History stays readable (evidence for a Report), media included.
    const grant = await access(sister, conversationId, earlier.id)
    expect(grant.status).toBe(200)
    expect((await gateway(sister, ((await grant.json()) as { url: string }).url)).status).toBe(200)
    expect((await call(`/v1/blocks/${brother.id}`, sister.cookie, 'DELETE')).status).toBe(200)

    const row = chat.conversations.find((item) => item.id === conversationId)
    if (row) {
      row.ended_at = '2026-10-24T09:00:00.000Z'
    }
    expect((await sendVoice(sister, conversationId)).status).toBe(409)
    if (row) {
      row.ended_at = null
    }
    const other = memory.accounts.find((item) => item.id === brother.id) as { status: string }
    other.status = 'Suspended'
    const gone = await sendPhoto(sister, conversationId)
    expect(gone.status).toBe(409)
    expect(await gone.json()).toMatchObject({ error: { details: { reason: 'other_unavailable' } } })
    other.status = 'Active'

    expect(messages.rows).toHaveLength(1)
    expect(media.assets).toHaveLength(assetsBefore)
    expect(moderation.calls).toHaveLength(0)
  })

  it('without CHAT_KEY or object storage a media send is 503 and stores no message and no job', async () => {
    const { sister, conversationId } = await connected()
    setChatKey(null)
    const noKey = await sendPhoto(sister, conversationId)
    expect(noKey.status).toBe(503)
    expect(await noKey.json()).toMatchObject({ error: { message: 'Envoi indisponible pour le moment. Réessayez plus tard.', retryable: true } })
    setChatKey(chatKey)
    storageDown = true
    const noStorage = await sendVoice(sister, conversationId)
    expect(noStorage.status).toBe(503)
    expect(await noStorage.json()).toMatchObject({ error: { message: 'Envoi indisponible pour le moment. Réessayez plus tard.', retryable: true } })
    nothingStored()
  })

  it('a signed-URL TTL that cannot be read keeps the Photo delivered and listed; only its URLs are unavailable', async () => {
    const { brother, sister, conversationId } = await connected()
    const sent = (await (await sendPhoto(sister, conversationId)).json()) as { message: MediaItem }
    setSignedTtlReader(async () => {
      throw new Error('config down')
    })
    const theirs = await items(brother, conversationId)
    expect(theirs[0]?.media).toMatchObject({ kind: 'photo', blur_url: null })
    const refused = await access(brother, conversationId, sent.message.id)
    expect(refused.status).toBe(503)
  })

  it('Report (8.5) works on the other member\'s Photo or Voice note, never on my own', async () => {
    const { brother, sister, conversationId } = await connected()
    const photo = ((await (await sendPhoto(brother, conversationId)).json()) as { message: MediaItem }).message
    const voice = ((await (await sendVoice(brother, conversationId)).json()) as { message: MediaItem }).message
    for (const message of [photo, voice]) {
      const filed = await call('/v1/reports', sister.cookie, 'POST', { target_kind: 'message', target_id: message.id, reason: 'indecency' })
      expect(filed.status).toBe(201)
    }
    expect(trust.reports.map((row) => ({ target_id: row.target_id, reported_account_id: row.reported_account_id, conversation_id: row.conversation_id }))).toEqual([
      { target_id: photo.id, reported_account_id: brother.id, conversation_id: conversationId },
      { target_id: voice.id, reported_account_id: brother.id, conversation_id: conversationId },
    ])
    const own = await call('/v1/reports', brother.cookie, 'POST', { target_kind: 'message', target_id: photo.id, reason: 'indecency' })
    expect(own.status).toBe(404)
    // A Report stores ids only: no media bytes, key or URL.
    expect(JSON.stringify(trust.reports)).not.toMatch(/chat-photo|voice-note|token=/)
  })
})

describe('Chat media helpers and boundaries (AD-9, AD-10, AD-21)', () => {
  it('strips EXIF, XMP and comments from a JPEG and text or EXIF chunks from a PNG, keeping the image', () => {
    const camera = cameraJpeg()
    const stripped = stripJpegMetadata(camera)
    expect(stripped).not.toBeNull()
    expect(stripped?.toString('latin1')).not.toMatch(/Exif|GPS|secret comment/)
    expect(stripped?.subarray(0, 2)).toEqual(Buffer.from([0xff, 0xd8]))
    expect(stripJpegMetadata(Buffer.from([0xff, 0xd8, 0x00, 0x00]))).toBeNull()

    const png = samplePng()
    const text = Buffer.from('Comment\0Lieu: Ouagadougou secteur 15', 'latin1')
    const chunk = Buffer.concat([Buffer.alloc(4), Buffer.from('tEXt', 'latin1'), text, Buffer.alloc(4)])
    chunk.writeUInt32BE(text.length, 0)
    const withText = Buffer.concat([png.subarray(0, 33), chunk, png.subarray(33)])
    const cleaned = stripPngMetadata(withText)
    expect(cleaned?.toString('latin1')).not.toContain('Ouagadougou')
    expect(cleaned?.equals(png)).toBe(true)
    expect(stripPngMetadata(png.subarray(0, 40))).toBeNull()
  })

  const srcSources = readdirSync(srcDir).filter((name) => name.endsWith('.ts') && !name.endsWith('.test.ts'))

  it('Chat media never reaches BillingPort and no GIF picker or GIF kind exists (FR-054 is NEXT)', () => {
    for (const name of ['media-chat.ts', 'chat-messages.ts', 'conversations.controller.ts']) {
      const source = readFileSync(join(srcDir, name), 'utf8')
      expect(source, name).not.toMatch(/billing-port|isEntitled|getBillingPort|messageQuota/)
      expect(source, name).not.toMatch(/'gif'|giphy|tenor/i)
    }
  })

  it('only the media module writes photo_asset; Chat stores media through it', () => {
    const writers = srcSources.filter((name) => /\.insert\(\s*photoAsset\b/.test(readFileSync(join(srcDir, name), 'utf8')))
    expect(writers).toEqual(['media-store.ts'])
    expect(readFileSync(join(srcDir, 'chat-messages.ts'), 'utf8')).not.toMatch(/photoAsset|signedGrant/)
  })

  it('the chat_photo and voice_note signer and reader never read a moderation state (sign must not wait on applyModeration)', () => {
    const source = readFileSync(join(srcDir, 'media-chat.ts'), 'utf8')
    expect(source).not.toMatch(/moderation_state ===|applyModeration\(|applyPhotoModeration/)
    const media = readFileSync(join(srcDir, 'media.ts'), 'utf8')
    const reader = media.slice(media.indexOf('async function readChatGrant'), media.indexOf('export function audioContentType'))
    expect(reader).not.toMatch(/moderation_state/)
  })
})
