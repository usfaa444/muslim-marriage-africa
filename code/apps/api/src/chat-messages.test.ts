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
import { setAuthClock } from './auth-clock.js'
import { setAuthLimitReader } from './auth-limit.js'
import { resetAuthRateWindow } from './auth-rate.js'
import { setBillingPort } from './billing-port.js'
import { setBrowseLimitReader } from './browse-rate.js'
import { memoryChatPort, setChatPort } from './chat.js'
import { openChatText, sealChatText, setChatKey } from './chat-key.js'
import { memoryPresenceStore, presenceBetween, resetPresence, setPresenceGraceMs, setPresenceStore } from './chat-presence.js'
import { memoryReadStore, setReadStore } from './chat-read.js'
import {
  memoryMessageStore,
  PREVIEW_MAX,
  QUOTE_MAX,
  SCAN_ENQUEUE_WAIT_MS,
  setMessageCapCheck,
  setMessageStore,
  TEXT_MAX,
} from './chat-messages.js'
import { createApp } from './create-app.js'
import { memoryFavouriteStore, setFavouriteStore } from './favourites.js'
import { memoryCaptureStore, setCaptureStore } from './id-liveness-store.js'
import { setInvitesPort } from './invites-port.js'
import { memoryInviteStore, setInviteConfigReader, setInviteStore, type InviteConfig } from './invites.js'
import { setMediaClock, setSignedTtlReader } from './media.js'
import { memoryMediaStore, setMediaStore } from './media-store.js'
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
const chat = memoryChatPort()
const messages = memoryMessageStore()
const reads = memoryReadStore()
const presence = memoryPresenceStore()
/** Story chat-polish-2: a short grace period, so « Vu … » can be waited for. */
const GRACE_MS = 250
const moderation = memoryModerationPort()
const captures = memoryCaptureStore({ accounts: memory.accounts, profiles: memory.profiles, phoneRows: [] })
const chatKey = { key: randomBytes(32), kid: 'test-chat-1' }

let now = new Date('2026-10-23T10:00:00.000Z')
let serial = 0
let billingCalls = 0
const config: InviteConfig = { sisterReachMode: same_quota_as_brothers, freeCap: 50, premiumCap: null }

/** The moderation adapter the send command sees; a test swaps it to simulate AI down or slow. */
let moderationMode: 'ok' | 'throw' | 'hang' = 'ok'
const switchingModeration: ModerationPort = {
  async enqueueScan(input) {
    if (moderationMode === 'throw') {
      throw new Error('moderation vendor 503')
    }
    if (moderationMode === 'hang') {
      return new Promise(() => undefined)
    }
    // The row must already be stored when moderation is called (persist first, AD-10).
    expect(messages.rows.some((row) => row.id === input.itemId)).toBe(true)
    return moderation.enqueueScan(input)
  },
}

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

describe('Text Chat: delivered, then enqueue scan, realtime without a hold state (Stories 5.1, 5.2)', { timeout: 60_000 }, () => {
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
    setReadStore(reads)
    setPresenceStore(presence)
    setPresenceGraceMs(GRACE_MS)
    setModerationPort(switchingModeration)
    setChatKey(chatKey)
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
    for (const socket of sockets.splice(0)) {
      socket.disconnect()
    }
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
    invites.sisterAcceptedAt.clear()
    chat.conversations.length = 0
    messages.rows.length = 0
    reads.rows.length = 0
    reads.settings.clear()
    resetPresence()
    presence.rows.clear()
    moderation.jobs.length = 0
    moderation.calls.length = 0
    moderationMode = 'ok'
    billingCalls = 0
    setChatKey(chatKey)
    setMessageCapCheck(undefined)
    now = new Date('2026-10-23T10:00:00.000Z')
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
    setMahramPort(undefined)
    setBillingPort(undefined)
    setInviteConfigReader(undefined)
    setInviteStore(undefined)
    setChatPort(undefined)
    setMessageStore(undefined)
    setReadStore(undefined)
    setPresenceStore(undefined)
    setPresenceGraceMs(undefined)
    resetPresence()
    setModerationPort(undefined)
    setMessageCapCheck(undefined)
    setChatKey(undefined)
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

  async function member(gender: 'sister' | 'brother'): Promise<Member> {
    serial += 1
    const email = `chat${serial}@example.bf`
    const created = await call('/v1/accounts', undefined, 'POST', {
      email,
      password: 'phrase avec espaces',
      pseudonym: `Chat_${serial}`,
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

  /** Brother invites, Sister accepts: one conversation between them. */
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

  function sendText(who: Member, conversationId: string, text: unknown, kind: unknown = 'text'): Promise<Response> {
    now = new Date(now.getTime() + 1000)
    return call(`/v1/conversations/${conversationId}/messages`, who.cookie, 'POST', { kind, text })
  }

  type Item = { id: string; sender_id: string; mine: boolean; kind: string; state: string; text: string | null; created_at: string }

  async function page(who: Member, conversationId: string, query = ''): Promise<{ items: Item[]; has_more: boolean }> {
    const listed = await call(`/v1/conversations/${conversationId}/messages${query}`, who.cookie)
    expect(listed.status).toBe(200)
    expect(listed.headers.get('cache-control')).toBe('no-store')
    return (await listed.json()) as { items: Item[]; has_more: boolean }
  }

  function socketFor(who: Member | undefined, origin?: string): Socket {
    const extraHeaders: Record<string, string> = {}
    if (who) {
      extraHeaders['cookie'] = who.cookie
    }
    if (origin) {
      extraHeaders['origin'] = origin
    }
    const socket = connectSocket(base, {
      path: '/v1/realtime',
      addTrailingSlash: false,
      transports: ['websocket'],
      extraHeaders,
      reconnection: false,
      forceNew: true,
    })
    sockets.push(socket)
    return socket
  }

  function connectedSocket(who: Member): Promise<Socket> {
    const socket = socketFor(who)
    return new Promise((resolve, reject) => {
      socket.once('connect', () => resolve(socket))
      socket.once('connect_error', (error) => reject(error))
    })
  }

  function refusedWith(socket: Socket): Promise<string> {
    return new Promise((resolve, reject) => {
      socket.once('connect', () => reject(new Error('expected a refused handshake')))
      socket.once('connect_error', (error: Error & { data?: { code?: string } }) => resolve(error.data?.code ?? error.message))
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

  function noEvent(socket: Socket, name: string, waitMs = 600): Promise<void> {
    return new Promise((resolve, reject) => {
      const onEvent = () => reject(new Error(`unexpected ${name}`))
      socket.once(name, onEvent)
      setTimeout(() => {
        socket.off(name, onEvent)
        resolve()
      }, waitMs)
    })
  }

  it('AC 5.2-1: a sent text is stored delivered as ciphertext, the recipient reads it at once, and the scan is enqueued after persist', async () => {
    const { brother, sister, conversationId } = await connected()
    const started = Date.now()
    const sent = await sendText(sister, conversationId, '  As-salāmu ʿalaykum, je vous remercie.  ')
    const ackMs = Date.now() - started
    expect(sent.status).toBe(201)
    expect(sent.headers.get('cache-control')).toBe('no-store')
    const body = (await sent.json()) as { message: Item & { conversation_id: string } }
    expect(body).toEqual({
      message: {
        id: expect.any(String),
        conversation_id: conversationId,
        sender_id: sister.id,
        mine: true,
        kind: 'text',
        state: 'delivered',
        text: 'As-salāmu ʿalaykum, je vous remercie.',
        created_at: expect.any(String),
      },
    })
    // NFR-005: send-text acknowledgement ≤ 2 s (measured here without network latency).
    expect(ackMs).toBeLessThan(2000)

    // Stored: state delivered, body a ciphertext envelope only.
    expect(messages.rows).toHaveLength(1)
    const row = messages.rows[0]
    expect(row).toMatchObject({ id: body.message.id, conversation_id: conversationId, sender_id: sister.id, kind: 'text', state: 'delivered', media_id: null })
    expect(Object.keys(row?.body ?? {}).sort()).toEqual(['alg', 'ct', 'iv', 'kid', 'v'])
    expect(row?.body).toMatchObject({ v: 1, alg: 'A256GCM', kid: 'test-chat-1' })
    expect(JSON.stringify(row)).not.toContain('remercie')

    // The recipient sees it now, with no extra state or flag.
    const theirs = await page(brother, conversationId)
    expect(theirs).toEqual({
      items: [{ ...body.message, mine: false }],
      has_more: false,
    })

    // Then exactly one scan job, keyed by the message, with the decrypted text handed over by Chat.
    expect(moderation.calls).toEqual([
      { itemId: body.message.id, itemKind: 'message', accountId: sister.id, payload: { kind: 'text', text: 'As-salāmu ʿalaykum, je vous remercie.' } },
    ])
    expect(moderation.jobs).toEqual([{ id: expect.any(String), message_id: body.message.id, asset_id: null, flash_id: null, outcome: null }])

    // No BillingPort and no message quota in this story (AC 5.2-1 « Premium does not increment message_quota »).
    expect(billingCalls).toBe(0)
  })

  it('AC 5.1-3: every created message is delivered; no member-facing pending, held or verification state exists', async () => {
    const { brother, sister, conversationId } = await connected()
    for (const [who, text] of [[sister, 'Un'], [brother, 'Deux'], [sister, 'Trois']] as const) {
      expect((await sendText(who, conversationId, text)).status).toBe(201)
    }
    expect(new Set(messages.rows.map((row) => row.state))).toEqual(new Set(['delivered']))
    const raw = JSON.stringify([await page(sister, conversationId), await (await call('/v1/conversations', sister.cookie)).json()])
    expect(raw).not.toMatch(/pending|held|hold|scan|moderation|vérification/i)

    const sql = readFileSync(join(srcDir, '..', 'drizzle', '0023_message.sql'), 'utf8')
    expect(sql).toContain(`CONSTRAINT "message_state_check" CHECK ("message"."state" = 'delivered')`)
  })

  it('AC 5.2-3: when AI is down or slow the send still acknowledges, and nothing else changes', async () => {
    const { brother, sister, conversationId } = await connected()
    const writes: string[] = []
    const original = process.stderr.write.bind(process.stderr)
    process.stderr.write = ((chunk: string | Uint8Array) => {
      writes.push(String(chunk))
      return true
    }) as typeof process.stderr.write
    try {
      moderationMode = 'throw'
      const thrown = await sendText(sister, conversationId, 'Le service est-il disponible ?')
      expect(thrown.status).toBe(201)

      moderationMode = 'hang'
      const started = Date.now()
      const slow = await sendText(brother, conversationId, 'Oui, merci.')
      const ackMs = Date.now() - started
      expect(slow.status).toBe(201)
      expect(ackMs).toBeLessThan(SCAN_ENQUEUE_WAIT_MS + 1000)
      expect(ackMs).toBeLessThan(2000)
    } finally {
      process.stderr.write = original
    }
    expect(messages.rows.map((row) => row.state)).toEqual(['delivered', 'delivered'])
    expect((await page(brother, conversationId)).items.map((item) => item.text)).toEqual(['Le service est-il disponible ?', 'Oui, merci.'])
    // The log line carries the message id only, never the text.
    const logged = writes.filter((line) => line.startsWith('chat scan_enqueue_failed'))
    expect(logged).toEqual(messages.rows.map((row) => `chat scan_enqueue_failed message=${row.id}\n`))
    expect(logged.join('')).not.toMatch(/disponible|merci/)
    expect(moderation.jobs).toHaveLength(0)
  })

  it('AC 5.2-2 seam (deferred to Story 5.11): a refusing cap check stores nothing and enqueues nothing; today it always allows', async () => {
    const { sister, conversationId } = await connected()
    setMessageCapCheck(async () => ({ allowed: false, cap: 10, resets_at: '2026-10-24T00:00:00.000Z' }))
    const refused = await sendText(sister, conversationId, 'Au-delà du plafond')
    expect(refused.status).toBe(429)
    expect(await refused.json()).toMatchObject({ error: { code: 'MESSAGE_CAP_EXCEEDED', details: { cap: 10 } } })
    expect(messages.rows).toHaveLength(0)
    expect(moderation.calls).toHaveLength(0)

    setMessageCapCheck(undefined)
    for (let index = 0; index < 12; index += 1) {
      expect((await sendText(sister, conversationId, `Message ${index}`)).status).toBe(201)
    }
    expect(billingCalls).toBe(0)
  })

  it('validates kind and text, and writes nothing on a refusal', async () => {
    const { sister, conversationId } = await connected()
    const cases: Array<[unknown, unknown, string, Record<string, unknown>]> = [
      ['gif', 'x', 'kind : valeur non reconnue.', { field: 'kind' }],
      [null, 'x', 'kind : valeur non reconnue.', { field: 'kind' }],
      ['text', '   ', 'Écrivez un message.', { field: 'text' }],
      ['text', 42, 'Écrivez un message.', { field: 'text' }],
      ['text', 'é'.repeat(TEXT_MAX + 1), 'Message trop long (2000 caractères au plus).', { field: 'text', max: TEXT_MAX }],
    ]
    for (const [kind, text, message, details] of cases) {
      const response = await sendText(sister, conversationId, text, kind)
      expect(response.status).toBe(400)
      expect(await response.json()).toMatchObject({ error: { code: 'UNHANDLED', message, details } })
    }
    expect(messages.rows).toHaveLength(0)
    expect(moderation.calls).toHaveLength(0)
    expect((await sendText(sister, conversationId, 'é'.repeat(TEXT_MAX))).status).toBe(201)
  })

  it('participants only: no session, staff, mahram, another member and malformed ids are refused on every route and socket', async () => {
    const { sister, conversationId } = await connected()
    const stranger = await member('brother')
    const paths = [`/v1/conversations/${conversationId}`, `/v1/conversations/${conversationId}/messages`]

    for (const path of paths) {
      expect((await call(path, undefined)).status).toBe(401)
      const foreign = await call(path, stranger.cookie)
      expect(foreign.status).toBe(404)
      expect(await foreign.json()).toMatchObject({ error: { code: 'NOT_FOUND', message: "Cette discussion n'existe pas.", details: null } })
    }
    expect((await call(`/v1/conversations/${conversationId}/messages`, undefined, 'POST', { kind: 'text', text: 'x' })).status).toBe(401)
    const foreignSend = await sendText(stranger, conversationId, 'Intrusion')
    expect(foreignSend.status).toBe(404)
    for (const bad of ['not-a-uuid', newId(now), '00000000-0000-0000-0000-000000000000']) {
      expect((await call(`/v1/conversations/${bad}`, sister.cookie)).status).toBe(404)
      expect((await sendText(sister, bad, 'x')).status).toBe(404)
    }
    const strangerList = (await (await call('/v1/conversations', stranger.cookie)).json()) as { count: number }
    expect(strangerList.count).toBe(0)

    const account = memory.accounts.find((item) => item.id === sister.id) as { roles: string[] }
    for (const [roles, reason] of [[['moderator'], 'staff_session'], [['mahram'], 'mahram_session']] as const) {
      account.roles = [...roles]
      for (const path of paths) {
        const refused = await call(path, sister.cookie)
        expect(refused.status).toBe(403)
        expect(await refused.json()).toMatchObject({ error: { code: 'FORBIDDEN', details: { reason } } })
      }
      expect((await sendText(sister, conversationId, 'x')).status).toBe(403)
      expect(await refusedWith(socketFor(sister))).toBe('FORBIDDEN')
    }
    account.roles = ['member']
    expect(messages.rows).toHaveLength(0)
    expect(await refusedWith(socketFor(undefined))).toBe('UNAUTHENTICATED')
    expect(billingCalls).toBe(0)
  })

  it('a pending Invite has no thread; a closed conversation or an unavailable member refuses the send', async () => {
    const brother = await member('brother')
    const sister = await member('sister')
    now = new Date(now.getTime() + 1000)
    expect((await call('/v1/invites', brother.cookie, 'POST', { to_id: sister.id })).status).toBe(201)
    expect(((await (await call('/v1/conversations', brother.cookie)).json()) as { count: number }).count).toBe(0)

    const pair = await connected()
    const row = chat.conversations.find((item) => item.id === pair.conversationId)
    const openThread = (await (await call(`/v1/conversations/${pair.conversationId}`, pair.sister.cookie)).json()) as {
      conversation: { closed: boolean }
    }
    expect(openThread.conversation.closed).toBe(false)
    if (row) {
      row.ended_at = '2026-10-23T09:00:00.000Z'
    }
    // QA F3: the thread says up front that it is closed, so the page can disable the composer before a send.
    const endedThread = (await (await call(`/v1/conversations/${pair.conversationId}`, pair.sister.cookie)).json()) as {
      conversation: { closed: boolean }
    }
    expect(endedThread.conversation.closed).toBe(true)
    const closed = await sendText(pair.sister, pair.conversationId, 'Encore là ?')
    expect(closed.status).toBe(409)
    expect(await closed.json()).toMatchObject({ error: { message: 'Cette discussion est fermée.', details: { reason: 'conversation_closed' } } })
    if (row) {
      row.ended_at = null
      row.paused_by = pair.brother.id
    }
    const pausedThread = (await (await call(`/v1/conversations/${pair.conversationId}`, pair.sister.cookie)).json()) as {
      conversation: { closed: boolean }
    }
    expect(pausedThread.conversation.closed).toBe(true)
    expect((await sendText(pair.sister, pair.conversationId, 'Encore là ?')).status).toBe(409)
    if (row) {
      row.paused_by = null
    }
    const other = memory.accounts.find((item) => item.id === pair.brother.id) as { status: string }
    other.status = 'Suspended'
    const gone = await sendText(pair.sister, pair.conversationId, 'Encore là ?')
    expect(gone.status).toBe(409)
    expect(await gone.json()).toMatchObject({ error: { message: "Ce profil n'est plus disponible.", details: { reason: 'other_unavailable' } } })
    const thread = (await (await call(`/v1/conversations/${pair.conversationId}`, pair.sister.cookie)).json()) as {
      conversation: { other: { available: boolean } }
    }
    expect(thread.conversation.other).toEqual({ available: false })
    other.status = 'Active'
    expect(messages.rows).toHaveLength(0)
  })

  it('without CHAT_KEY a send is 503 and stores nothing; a moved or foreign envelope never decrypts', async () => {
    const { sister, conversationId } = await connected()
    setChatKey(null)
    const refused = await sendText(sister, conversationId, 'Sans clé')
    expect(refused.status).toBe(503)
    expect(await refused.json()).toMatchObject({
      error: { code: 'UNHANDLED', message: 'Envoi indisponible pour le moment. Réessayez plus tard.', retryable: true },
    })
    expect(messages.rows).toHaveLength(0)
    expect(moderation.calls).toHaveLength(0)

    const sealed = sealChatText('secret', chatKey, conversationId, 'message-a')
    expect(openChatText(sealed, chatKey, conversationId, 'message-a')).toBe('secret')
    expect(openChatText(sealed, chatKey, conversationId, 'message-b')).toBeNull()
    expect(openChatText(sealed, { key: randomBytes(32), kid: 'test-chat-1' }, conversationId, 'message-a')).toBeNull()
    expect(openChatText(sealed, { ...chatKey, kid: 'other' }, conversationId, 'message-a')).toBeNull()
    expect(openChatText(sealed, null, conversationId, 'message-a')).toBeNull()
  })

  it('AC 5.1-1: the Discussions list and the thread show the other member blurred, the last message and no hold badge', async () => {
    const { brother, sister, conversationId } = await connected()
    const empty = (await (await call('/v1/conversations', sister.cookie)).json()) as { items: Array<Record<string, unknown>> }
    expect(empty.items).toEqual([
      {
        id: conversationId,
        invite_id: expect.any(String),
        stage: 'chat',
        other_id: brother.id,
        pseudonym: expect.stringMatching(/^Chat_/),
        other: { available: true, age: expect.any(Number), city: 'ouagadougou', verified: false, photo: { id: expect.any(String), url: expect.stringMatching(/^\/v1\/media\/get\?token=/) } },
        last_message: null,
        unread: 0,
      },
    ])
    const firstOther = empty.items[0]?.['other'] as { photo: { url: string } } | undefined
    const token = new URL(firstOther?.photo.url ?? '', 'http://x').searchParams.get('token')
    expect(media.grants.find((row) => row.id === token)).toMatchObject({ viewer_id: sister.id, derivative: 'blur' })

    const long = `Bonjour ${'très '.repeat(60)}`
    expect((await sendText(brother, conversationId, long)).status).toBe(201)
    const listed = (await (await call('/v1/conversations', sister.cookie)).json()) as {
      items: Array<{ last_message: { mine: boolean; preview: string; kind: string } }>
    }
    expect(listed.items[0]?.last_message).toMatchObject({ mine: false, kind: 'text' })
    expect([...(listed.items[0]?.last_message.preview ?? '')].length).toBe(PREVIEW_MAX)
    expect(listed.items[0]?.last_message.preview.endsWith('…')).toBe(true)
    // QA F2: the cut never splits an emoji (surrogate pair) or a joined emoji sequence.
    const family = '👨‍👩‍👧'
    expect((await sendText(brother, conversationId, `a${'🌙'.repeat(300)}`)).status).toBe(201)
    const astral = (await (await call('/v1/conversations', sister.cookie)).json()) as { items: Array<{ last_message: { preview: string } }> }
    const cut = astral.items[0]?.last_message.preview ?? ''
    expect(cut).toBe(`a${'🌙'.repeat(PREVIEW_MAX - 2)}…`)
    expect(cut.isWellFormed()).toBe(true)
    expect((await sendText(brother, conversationId, family.repeat(200))).status).toBe(201)
    const joined = (await (await call('/v1/conversations', sister.cookie)).json()) as { items: Array<{ last_message: { preview: string } }> }
    expect(joined.items[0]?.last_message.preview).toBe(`${family.repeat(PREVIEW_MAX - 1)}…`)
    const mineList = (await (await call('/v1/conversations', brother.cookie)).json()) as { items: Array<{ last_message: { mine: boolean } }> }
    expect(mineList.items[0]?.last_message.mine).toBe(true)

    const thread = await call(`/v1/conversations/${conversationId}`, sister.cookie)
    expect(thread.status).toBe(200)
    expect(await thread.json()).toEqual({
      conversation: { id: conversationId, stage: 'chat', other_id: brother.id, pseudonym: expect.any(String), other: expect.objectContaining({ available: true }), closed: false },
      me: { id: sister.id },
      read: { me: null, other: null, receipts: 'on' },
      // Story chat-polish-2: he has no socket open and was never seen.
      presence: { online: false, last_seen_at: null },
    })
    expect(billingCalls).toBe(0)
  })

  it('orders Discussions by latest activity and pages messages with before, after and limit', async () => {
    const first = await connected()
    const second = await connected()
    expect((await sendText(first.sister, first.conversationId, 'Plus récent')).status).toBe(201)
    // first.conversation now has the latest activity although second was opened later.
    const brotherTwo = second.brother
    const ids = ((await (await call('/v1/conversations', brotherTwo.cookie)).json()) as { items: Array<{ id: string }> }).items.map((item) => item.id)
    expect(ids).toEqual([second.conversationId])

    for (let index = 1; index <= 5; index += 1) {
      expect((await sendText(second.sister, second.conversationId, `M${index}`)).status).toBe(201)
    }
    const latest = await page(second.brother, second.conversationId, '?limit=2')
    expect(latest.items.map((item) => item.text)).toEqual(['M4', 'M5'])
    expect(latest.has_more).toBe(true)
    const older = await page(second.brother, second.conversationId, `?limit=2&before=${latest.items[0]?.id}`)
    expect(older.items.map((item) => item.text)).toEqual(['M2', 'M3'])
    const oldest = await page(second.brother, second.conversationId, `?limit=2&before=${older.items[0]?.id}`)
    expect(oldest).toMatchObject({ items: [expect.objectContaining({ text: 'M1' })], has_more: false })
    const after = await page(second.brother, second.conversationId, `?after=${older.items[1]?.id}`)
    expect(after.items.map((item) => item.text)).toEqual(['M4', 'M5'])
    expect(after.has_more).toBe(false)

    for (const query of ['?limit=0', '?limit=51', '?limit=abc', '?before=nope', '?after=nope', `?before=${latest.items[0]?.id}&after=${latest.items[0]?.id}`]) {
      const bad = await call(`/v1/conversations/${second.conversationId}/messages${query}`, second.brother.cookie)
      expect(bad.status, query).toBe(400)
    }
  })

  it('AC 5.2-1 realtime: the recipient gets message.delivered with ids only, at persist, before any scan', async () => {
    const { brother, sister, conversationId } = await connected()
    const herSocket = await connectedSocket(sister)
    const hisSocket = await connectedSocket(brother)
    const stranger = await member('brother')
    const strangerSocket = await connectedSocket(stranger)
    moderationMode = 'hang'
    const arrived = nextEvent<Record<string, unknown>>(hisSocket, 'message.delivered')
    const echoed = nextEvent<Record<string, unknown>>(herSocket, 'message.delivered')
    const quiet = noEvent(strangerSocket, 'message.delivered')
    const started = Date.now()
    const sending = sendText(sister, conversationId, 'Le texte ne voyage pas dans l’événement.')
    const event = await arrived
    // The event is emitted at persist, while the scan enqueue is still hanging.
    expect(Date.now() - started).toBeLessThan(SCAN_ENQUEUE_WAIT_MS)
    expect(Object.keys(event).sort()).toEqual(['conversation_id', 'message_id', 'sender_id'])
    expect(event).toEqual({ conversation_id: conversationId, message_id: messages.rows[0]?.id, sender_id: sister.id })
    expect(await echoed).toEqual(event)
    expect((await sending).status).toBe(201)
    await quiet
  })

  type ListItem = { id: string; unread: number; last_message: { id: string; mine: boolean; read: boolean | null } | null }

  async function listOf(who: Member): Promise<ListItem[]> {
    const listed = await call('/v1/conversations', who.cookie)
    expect(listed.status).toBe(200)
    return ((await listed.json()) as { items: ListItem[] }).items
  }

  function markRead(who: Member | undefined, conversationId: string, messageId: unknown): Promise<Response> {
    return call(`/v1/conversations/${conversationId}/read`, who?.cookie, 'POST', { message_id: messageId })
  }

  async function sentId(response: Response): Promise<string> {
    expect(response.status).toBe(201)
    return ((await response.json()) as { message: { id: string } }).message.id
  }

  it('chat-polish AC 9-11: unread counts the other member’s messages after my read pointer, and « Lu » follows their pointer', async () => {
    const { brother, sister, conversationId } = await connected()
    const one = await sentId(await sendText(brother, conversationId, 'Un'))
    const two = await sentId(await sendText(brother, conversationId, 'Deux'))
    const three = await sentId(await sendText(brother, conversationId, 'Trois'))

    // Her list: three unread, the last message is theirs and not read. His list: his own message, not read yet, and
    // nothing unread for him (his own messages never count).
    expect(await listOf(sister)).toMatchObject([{ id: conversationId, unread: 3, last_message: { id: three, mine: false, read: false } }])
    expect(await listOf(brother)).toMatchObject([{ id: conversationId, unread: 0, last_message: { id: three, mine: true, read: false } }])

    const marked = await markRead(sister, conversationId, two)
    expect(marked.status).toBe(200)
    expect(marked.headers.get('cache-control')).toBe('no-store')
    expect(await marked.json()).toEqual({ read: { message_id: two } })
    expect(await listOf(sister)).toMatchObject([{ unread: 1, last_message: { read: false } }])
    expect(await listOf(brother)).toMatchObject([{ last_message: { read: false } }])
    const head = (await (await call(`/v1/conversations/${conversationId}`, brother.cookie)).json()) as { read: unknown }
    expect(head.read).toEqual({ me: null, other: two, receipts: 'on' })

    expect((await markRead(sister, conversationId, three)).status).toBe(200)
    expect(await listOf(sister)).toMatchObject([{ unread: 0, last_message: { read: true } }])
    expect(await listOf(brother)).toMatchObject([{ last_message: { mine: true, read: true } }])
    const hers = (await (await call(`/v1/conversations/${conversationId}`, sister.cookie)).json()) as { read: unknown }
    expect(hers.read).toEqual({ me: three, other: null, receipts: 'on' })

    // The pointer never moves back: a late request for an older message keeps the newest one.
    const late = await markRead(sister, conversationId, one)
    expect(await late.json()).toEqual({ read: { message_id: three } })
    expect(reads.rows).toEqual([{ conversation_id: conversationId, account_id: sister.id, message_id: three, read_at: expect.any(String) }])

    // Her reply: his list shows one unread from her, hers shows her own last message not read by him.
    const reply = await sentId(await sendText(sister, conversationId, 'Réponse'))
    expect(await listOf(brother)).toMatchObject([{ unread: 1, last_message: { id: reply, mine: false, read: false } }])
    expect(await listOf(sister)).toMatchObject([{ unread: 0, last_message: { id: reply, mine: true, read: false } }])
    expect(billingCalls).toBe(0)
  })

  it('chat-polish AC 12: conversation.read reaches both members’ sockets with ids only, never a stranger', async () => {
    const { brother, sister, conversationId } = await connected()
    const id = await sentId(await sendText(brother, conversationId, 'Salam'))
    const hisSocket = await connectedSocket(brother)
    const herSocket = await connectedSocket(sister)
    const stranger = await member('brother')
    const strangerSocket = await connectedSocket(stranger)
    const his = nextEvent<Record<string, unknown>>(hisSocket, 'conversation.read')
    const hers = nextEvent<Record<string, unknown>>(herSocket, 'conversation.read')
    const quiet = noEvent(strangerSocket, 'conversation.read')
    expect((await markRead(sister, conversationId, id)).status).toBe(200)
    const event = await his
    expect(event).toEqual({ conversation_id: conversationId, account_id: sister.id, message_id: id })
    expect(await hers).toEqual(event)
    await quiet
  })

  it('chat-polish AC 13: participants only; a bad or foreign message id is refused and nothing is stored', async () => {
    const { brother, sister, conversationId } = await connected()
    const other = await connected()
    const id = await sentId(await sendText(brother, conversationId, 'Salam'))
    const elsewhere = await sentId(await sendText(other.brother, other.conversationId, 'Ailleurs'))
    const stranger = await member('sister')

    expect((await markRead(undefined, conversationId, id)).status).toBe(401)
    const foreign = await markRead(stranger, conversationId, id)
    expect(foreign.status).toBe(404)
    expect(await foreign.json()).toMatchObject({ error: { code: 'NOT_FOUND', message: "Cette discussion n'existe pas." } })
    for (const bad of ['not-a-uuid', newId(now)]) {
      expect((await markRead(sister, bad, id)).status).toBe(404)
    }
    for (const value of [undefined, 'nope', 42, null]) {
      const refused = await markRead(sister, conversationId, value)
      expect(refused.status).toBe(400)
      expect(await refused.json()).toMatchObject({ error: { message: 'message_id : valeur non reconnue.', details: { field: 'message_id' } } })
    }
    const misplaced = await markRead(sister, conversationId, elsewhere)
    expect(misplaced.status).toBe(404)
    expect(await misplaced.json()).toMatchObject({ error: { code: 'NOT_FOUND', message: 'Ce message est introuvable.' } })
    expect((await markRead(sister, conversationId, newId(now))).status).toBe(404)

    const account = memory.accounts.find((item) => item.id === sister.id) as { roles: string[] }
    account.roles = ['mahram']
    expect((await markRead(sister, conversationId, id)).status).toBe(403)
    account.roles = ['member']
    expect(reads.rows).toHaveLength(0)
    // A stranger's list never carries anyone else's read state.
    expect(await listOf(stranger)).toEqual([])
  })

  it('chat-polish AC 14: a Block hides the other member’s read state and sends them no read event; my own state still works', async () => {
    const { brother, sister, conversationId } = await connected()
    const mine = await sentId(await sendText(sister, conversationId, 'Avant'))
    expect((await markRead(brother, conversationId, mine)).status).toBe(200)
    expect(await listOf(sister)).toMatchObject([{ last_message: { mine: true, read: true } }])

    expect((await call('/v1/blocks', sister.cookie, 'POST', { blocked_id: brother.id })).status).toBe(201)
    expect(await listOf(sister)).toMatchObject([{ last_message: { mine: true, read: null } }])
    const head = (await (await call(`/v1/conversations/${conversationId}`, sister.cookie)).json()) as { read: unknown }
    expect(head.read).toEqual({ me: null, other: null, receipts: 'blocked' })
    const theirs = (await (await call(`/v1/conversations/${conversationId}`, brother.cookie)).json()) as { read: unknown }
    expect(theirs.read).toEqual({ me: mine, other: null, receipts: 'blocked' })

    // His read is still kept for him, but she hears nothing of it; his own sockets still sync.
    const herSocket = await connectedSocket(sister)
    const hisSocket = await connectedSocket(brother)
    const quiet = noEvent(herSocket, 'conversation.read')
    const echo = nextEvent<Record<string, unknown>>(hisSocket, 'conversation.read')
    expect((await markRead(brother, conversationId, mine)).status).toBe(200)
    expect(await echo).toMatchObject({ account_id: brother.id })
    await quiet
    expect((await call(`/v1/blocks/${brother.id}`, sister.cookie, 'DELETE')).status).toBe(200)
    expect(await listOf(sister)).toMatchObject([{ last_message: { read: true } }])
  })

  function receipts(who: Member | undefined, body?: unknown): Promise<Response> {
    return body === undefined ? call('/v1/chat/settings', who?.cookie) : call('/v1/chat/settings', who?.cookie, 'PUT', body)
  }

  it('chat-polish AC 18: « Confirmations de lecture » is on by default, stored per member, members only, booleans only', async () => {
    const { brother, sister } = await connected()
    expect((await receipts(undefined)).status).toBe(401)
    expect((await receipts(undefined, { read_receipts: false })).status).toBe(401)
    const fresh = await receipts(sister)
    expect(fresh.status).toBe(200)
    expect(fresh.headers.get('cache-control')).toContain('no-store')
    expect(await fresh.json()).toEqual({ read_receipts: true, presence: true })
    for (const value of ['false', 0, 1, null, undefined, {}]) {
      const refused = await receipts(sister, { read_receipts: value })
      expect(refused.status).toBe(400)
      expect(await refused.json()).toMatchObject({ error: { message: 'read_receipts : valeur non reconnue.', details: { field: 'read_receipts' } } })
    }
    expect(reads.settings.size).toBe(0)
    const off = await receipts(sister, { read_receipts: false })
    expect(off.status).toBe(200)
    expect(await off.json()).toEqual({ read_receipts: false, presence: true })
    expect(await (await receipts(sister)).json()).toEqual({ read_receipts: false, presence: true })
    // Only her own switch: his stays on.
    expect(await (await receipts(brother)).json()).toEqual({ read_receipts: true, presence: true })
    expect([...reads.settings.keys()]).toEqual([sister.id])

    const account = memory.accounts.find((item) => item.id === brother.id) as { roles: string[] }
    for (const roles of [['mahram'], ['moderator']]) {
      account.roles = roles
      expect((await receipts(brother)).status).toBe(403)
      expect((await receipts(brother, { read_receipts: false })).status).toBe(403)
    }
    account.roles = ['member']
    expect(await (await receipts(brother)).json()).toEqual({ read_receipts: true, presence: true })
    expect(billingCalls).toBe(0)
  })

  it('chat-polish AC 19: with receipts off on either side, nobody sees « Lu » and no read event crosses; my own unread still clears', async () => {
    const { brother, sister, conversationId } = await connected()
    expect((await sendText(sister, conversationId, 'De sa part')).status).toBe(201)
    const his = await sentId(await sendText(brother, conversationId, 'De la mienne'))
    expect((await receipts(sister, { read_receipts: false })).status).toBe(200)

    // He reads her message: stored, but she is told nothing and sees no « Lu ».
    const herSocket = await connectedSocket(sister)
    const hisSocket = await connectedSocket(brother)
    const quietForHer = noEvent(herSocket, 'conversation.read')
    const echo = nextEvent<Record<string, unknown>>(hisSocket, 'conversation.read')
    expect((await markRead(brother, conversationId, his)).status).toBe(200)
    expect(await echo).toMatchObject({ account_id: brother.id, message_id: his })
    await quietForHer
    // She reads his message: her badge clears, he is told nothing and sees « Envoyé » only.
    const quietForHim = noEvent(hisSocket, 'conversation.read')
    const ownEcho = nextEvent<Record<string, unknown>>(herSocket, 'conversation.read')
    expect((await markRead(sister, conversationId, his)).status).toBe(200)
    expect(await ownEcho).toMatchObject({ account_id: sister.id })
    await quietForHim
    expect(await listOf(sister)).toMatchObject([{ unread: 0, last_message: { id: his, mine: false, read: true } }])
    expect(await listOf(brother)).toMatchObject([{ unread: 0, last_message: { id: his, mine: true, read: false } }])
    const herHead = (await (await call(`/v1/conversations/${conversationId}`, sister.cookie)).json()) as { read: unknown }
    const hisHead = (await (await call(`/v1/conversations/${conversationId}`, brother.cookie)).json()) as { read: unknown }
    expect(herHead.read).toEqual({ me: his, other: null, receipts: 'off' })
    expect(hisHead.read).toEqual({ me: his, other: null, receipts: 'off' })

    // Back on: the reads made meanwhile show as « Lu » again (the pointers were kept).
    expect((await receipts(sister, { read_receipts: true })).status).toBe(200)
    expect(await listOf(brother)).toMatchObject([{ last_message: { id: his, mine: true, read: true } }])
    expect(((await (await call(`/v1/conversations/${conversationId}`, brother.cookie)).json()) as { read: unknown }).read).toEqual({ me: his, other: his, receipts: 'on' })
    // His switch off hides his reads from her too, and hers from him.
    expect((await receipts(brother, { read_receipts: false })).status).toBe(200)
    expect(((await (await call(`/v1/conversations/${conversationId}`, sister.cookie)).json()) as { read: unknown }).read).toEqual({ me: his, other: null, receipts: 'off' })
    expect(await listOf(brother)).toMatchObject([{ last_message: { mine: true, read: false } }])
  })

  it('chat-polish AC 20: a change reaches my other tabs and my chat partners live (ids only), never a stranger or across a Block', async () => {
    const { brother, sister, conversationId } = await connected()
    const stranger = await member('sister')
    const herSocket = await connectedSocket(sister)
    const hisSocket = await connectedSocket(brother)
    const strangerSocket = await connectedSocket(stranger)
    const toHim = nextEvent<Record<string, unknown>>(hisSocket, 'chat.receipts')
    const toHer = nextEvent<Record<string, unknown>>(herSocket, 'chat.receipts')
    const leak = noEvent(strangerSocket, 'chat.receipts')
    expect((await receipts(sister, { read_receipts: false })).status).toBe(200)
    expect(await toHim).toEqual({ account_id: sister.id })
    expect(await toHer).toEqual({ account_id: sister.id })
    await leak
    expect(conversationId).not.toBe('')

    expect((await call('/v1/blocks', sister.cookie, 'POST', { blocked_id: brother.id })).status).toBe(201)
    const blocked = noEvent(hisSocket, 'chat.receipts')
    const own = nextEvent<Record<string, unknown>>(herSocket, 'chat.receipts')
    expect((await receipts(sister, { read_receipts: true })).status).toBe(200)
    expect(await own).toEqual({ account_id: sister.id })
    await blocked
  })

  async function badges(who: Member | undefined): Promise<Response> {
    return call('/v1/me/badges', who?.cookie)
  }

  async function badgeCounts(who: Member): Promise<{ invitations: number; discussions: number }> {
    const answered = await badges(who)
    expect(answered.status).toBe(200)
    expect(answered.headers.get('cache-control')).toContain('no-store')
    return (await answered.json()) as { invitations: number; discussions: number }
  }

  it('chat-polish AC 21: the bottom-nav badges count pending received invites and conversations with unread messages, members only', async () => {
    const { brother, sister, conversationId } = await connected()
    expect((await badges(undefined)).status).toBe(401)
    expect(await badgeCounts(sister)).toEqual({ invitations: 0, discussions: 0 })

    // Two messages from him in one conversation: one conversation unread, not two.
    expect((await sendText(brother, conversationId, 'Un')).status).toBe(201)
    const two = await sentId(await sendText(brother, conversationId, 'Deux'))
    expect(await badgeCounts(sister)).toEqual({ invitations: 0, discussions: 1 })
    // My own messages never count for me.
    expect(await badgeCounts(brother)).toEqual({ invitations: 0, discussions: 0 })
    expect((await markRead(sister, conversationId, two)).status).toBe(200)
    expect(await badgeCounts(sister)).toEqual({ invitations: 0, discussions: 0 })

    // Two pending invites to her; one she declines, one stays; sent invites never count for the sender.
    const second = await member('brother')
    const third = await member('brother')
    const pending: string[] = []
    for (const from of [second, third]) {
      now = new Date(now.getTime() + 1000)
      const sent = await call('/v1/invites', from.cookie, 'POST', { to_id: sister.id })
      expect(sent.status).toBe(201)
      pending.push(((await sent.json()) as { invite: { id: string } }).invite.id)
    }
    // Sending an invite reads the quota (BillingPort); reading badges never does.
    billingCalls = 0
    expect(await badgeCounts(sister)).toEqual({ invitations: 2, discussions: 0 })
    expect(await badgeCounts(second)).toEqual({ invitations: 0, discussions: 0 })
    expect((await call(`/v1/invites/${pending[0]}/decline`, sister.cookie, 'POST')).status).toBe(200)
    expect(await badgeCounts(sister)).toEqual({ invitations: 1, discussions: 0 })
    // A Block hides the blocked member's invite and conversation from the counts.
    expect((await call('/v1/blocks', sister.cookie, 'POST', { blocked_id: third.id })).status).toBe(201)
    expect(await badgeCounts(sister)).toEqual({ invitations: 0, discussions: 0 })
    expect((await sendText(brother, conversationId, 'Trois')).status).toBe(201)
    expect(await badgeCounts(sister)).toEqual({ invitations: 0, discussions: 1 })
    expect((await call('/v1/blocks', sister.cookie, 'POST', { blocked_id: brother.id })).status).toBe(201)
    expect(await badgeCounts(sister)).toEqual({ invitations: 0, discussions: 0 })

    const account = memory.accounts.find((item) => item.id === sister.id) as { roles: string[] }
    for (const roles of [['mahram'], ['moderator']]) {
      account.roles = roles
      expect((await badges(sister)).status).toBe(403)
    }
    account.roles = ['member']
    expect(billingCalls).toBe(0)
  })

  it('chat-polish AC 22: a new invite reaches only its recipient live (ids only); her decline tells only her own tabs', async () => {
    const sister = await member('sister')
    const brother = await member('brother')
    const stranger = await member('sister')
    const herSocket = await connectedSocket(sister)
    const hisSocket = await connectedSocket(brother)
    const strangerSocket = await connectedSocket(stranger)
    const arrived = nextEvent<Record<string, unknown>>(herSocket, 'invite.changed')
    const notToSender = noEvent(hisSocket, 'invite.changed')
    const notLeaked = noEvent(strangerSocket, 'invite.changed')
    now = new Date(now.getTime() + 1000)
    const sent = await call('/v1/invites', brother.cookie, 'POST', { to_id: sister.id })
    expect(sent.status).toBe(201)
    const inviteId = ((await sent.json()) as { invite: { id: string } }).invite.id
    expect(await arrived).toEqual({ invite_id: inviteId })
    await Promise.all([notToSender, notLeaked])

    const answered = nextEvent<Record<string, unknown>>(herSocket, 'invite.changed')
    const quiet = noEvent(hisSocket, 'invite.changed')
    expect((await call(`/v1/invites/${inviteId}/decline`, sister.cookie, 'POST')).status).toBe(200)
    expect(await answered).toEqual({ invite_id: inviteId })
    await quiet
  })

  it('AC 5.1-2: typing reaches the other member within 2 s, only the other member, at most once a second', async () => {
    const { brother, sister, conversationId } = await connected()
    const herSocket = await connectedSocket(sister)
    const hisSocket = await connectedSocket(brother)
    const stranger = await member('sister')
    const strangerSocket = await connectedSocket(stranger)

    const seen = nextEvent<Record<string, unknown>>(hisSocket, 'conversation.typing', 2000)
    const notEchoed = noEvent(herSocket, 'conversation.typing')
    const notLeaked = noEvent(strangerSocket, 'conversation.typing')
    const started = Date.now()
    herSocket.emit('conversation.typing', { conversation_id: conversationId })
    expect(await seen).toEqual({ conversation_id: conversationId, account_id: sister.id })
    expect(Date.now() - started).toBeLessThan(2000)
    await Promise.all([notEchoed, notLeaked])

    // Within a second a second signal is not relayed.
    const throttled = noEvent(hisSocket, 'conversation.typing', 500)
    herSocket.emit('conversation.typing', { conversation_id: conversationId })
    await throttled

    // A non-participant's typing reaches nobody.
    const blocked = noEvent(hisSocket, 'conversation.typing')
    strangerSocket.emit('conversation.typing', { conversation_id: conversationId })
    await blocked
    expect(billingCalls).toBe(0)
  })

  it('refuses a socket from another origin, without a session, or behind a PIN lock', async () => {
    const { sister } = await connected()
    const previous = process.env['ANKANU_ALLOWED_ORIGINS']
    process.env['ANKANU_ALLOWED_ORIGINS'] = 'http://localhost:4012'
    try {
      const foreign = socketFor(sister, 'https://evil.example')
      await expect(refusedWith(foreign)).resolves.toBeTruthy()
      const same = await connectedSocket(sister)
      expect(same.connected).toBe(true)
    } finally {
      if (previous === undefined) {
        delete process.env['ANKANU_ALLOWED_ORIGINS']
      } else {
        process.env['ANKANU_ALLOWED_ORIGINS'] = previous
      }
    }
    expect(await refusedWith(socketFor({ id: '', email: '', cookie: `${SESSION_COOKIE}=unknown` }))).toBe('UNAUTHENTICATED')

    // A shared-device PIN that this session has not unlocked: the handshake stops like an HTTP call would.
    pins.rows.push({ id: newId(now), account_id: sister.id, pin_hash: 'not-a-real-hash' })
    resetPinEntries()
    try {
      expect(await refusedWith(socketFor(sister))).toBe('PIN_REQUIRED')
      expect((await call('/v1/conversations', sister.cookie)).status).toBe(401)
    } finally {
      pins.rows.length = 0
      resetPinEntries()
    }
  })

  it('serves the Socket.IO client script on the realtime path', async () => {
    const script = await fetch(`${base}/v1/realtime/socket.io.min.js`)
    expect(script.status).toBe(200)
    expect(script.headers.get('content-type')).toMatch(/javascript/)
    expect((await script.text()).length).toBeGreaterThan(1000)
    // The polling transport answers without a trailing slash, the only form the web's Next rewrite passes unchanged.
    const polling = await fetch(`${base}/v1/realtime?EIO=4&transport=polling`)
    expect(polling.status).toBe(200)
    expect(await polling.text()).toMatch(/^0\{"sid":/)
  })

  // ---- Story chat-polish-2: replies (« Répondre », the quoted card) ----

  type Quote = { id: string; available: boolean; sender_id?: string; mine?: boolean; kind?: string; text?: string | null }

  function reply(who: Member, conversationId: string, text: string, target: unknown): Promise<Response> {
    now = new Date(now.getTime() + 1000)
    return call(`/v1/conversations/${conversationId}/messages`, who.cookie, 'POST', { kind: 'text', text, reply_to_message_id: target })
  }

  it('chat-polish-2 AC 20: a reply stores its target and both members see the quoted card, mine or theirs, with the text start', async () => {
    const { brother, sister, conversationId } = await connected()
    const long = 'Bismillah. ' + 'Notre famille souhaite vous rencontrer après la prière. '.repeat(6)
    const asked = await sentId(await sendText(brother, conversationId, long))
    const answered = await reply(sister, conversationId, 'Avec plaisir.', asked)
    expect(answered.status).toBe(201)
    const sent = ((await answered.json()) as { message: { id: string; reply_to: Quote } }).message
    const quote = { id: asked, available: true, sender_id: brother.id, kind: 'text' }
    expect(sent.reply_to).toMatchObject({ ...quote, mine: false })
    expect([...(sent.reply_to.text ?? '')].length).toBe(QUOTE_MAX + 1)
    expect(sent.reply_to.text?.endsWith('…')).toBe(true)
    expect(long.startsWith((sent.reply_to.text ?? '').slice(0, -1))).toBe(true)
    expect(messages.rows.find((row) => row.id === sent.id)?.reply_to_message_id).toBe(asked)
    // The quote is never stored in clear: the reply row keeps the target id only.
    expect(JSON.stringify(messages.rows.find((row) => row.id === sent.id))).not.toContain('Notre famille')
    const his = (await page(brother, conversationId)).items as Array<Item & { reply_to?: Quote }>
    expect(his.find((item) => item.id === sent.id)?.reply_to).toMatchObject({ ...quote, mine: true })
    expect(his.find((item) => item.id === asked)?.reply_to).toBeUndefined()
    // A short target is quoted whole; a reply to a reply quotes the reply.
    const short = await reply(brother, conversationId, 'Parfait.', sent.id)
    expect(((await short.json()) as { message: { reply_to: Quote } }).message.reply_to).toMatchObject({ id: sent.id, mine: false, text: 'Avec plaisir.' })
    // Paging: a target outside the page is still quoted.
    const older = (await page(sister, conversationId, '?limit=1')).items as Array<Item & { reply_to?: Quote }>
    expect(older[0]?.reply_to).toMatchObject({ id: sent.id, available: true, mine: true, text: 'Avec plaisir.' })
    expect(billingCalls).toBe(0)
  })

  it('chat-polish-2 AC 21: a reply target from another conversation, unknown or malformed is refused and nothing is stored', async () => {
    const { brother, sister, conversationId } = await connected()
    const elsewhere = await connected()
    const foreign = await sentId(await sendText(elsewhere.brother, elsewhere.conversationId, 'Message privé ailleurs'))
    const before = messages.rows.length
    const jobs = moderation.calls.length
    const leaked = await reply(sister, conversationId, 'Intrusion', foreign)
    expect(leaked.status).toBe(404)
    const body = await leaked.text()
    expect(body).not.toContain('Message privé')
    expect(JSON.parse(body)).toMatchObject({ error: { code: 'NOT_FOUND', message: 'Ce message est introuvable.', details: { field: 'reply_to_message_id' } } })
    expect((await reply(sister, conversationId, 'Inconnu', '01990000-0000-7000-8000-00000000dead')).status).toBe(404)
    for (const bad of ['abc', 42, {}, ['x'], true]) {
      const refused = await reply(brother, conversationId, 'Mauvais', bad)
      expect(refused.status).toBe(400)
      expect(await refused.json()).toMatchObject({ error: { message: 'reply_to_message_id : valeur non reconnue.', details: { field: 'reply_to_message_id' } } })
    }
    expect(messages.rows.length).toBe(before)
    expect(moderation.calls.length).toBe(jobs)
    // null or absent is a plain message.
    const plain = await reply(brother, conversationId, 'Normal', null)
    expect(plain.status).toBe(201)
    expect(((await plain.json()) as { message: Record<string, unknown> }).message).not.toHaveProperty('reply_to')
  })

  it('chat-polish-2 AC 22: a target that cannot be read shows « indisponible » only, and a stored foreign id never leaks its text', async () => {
    const { brother, sister, conversationId } = await connected()
    const elsewhere = await connected()
    const foreign = await sentId(await sendText(elsewhere.sister, elsewhere.conversationId, 'Secret ailleurs'))
    const target = await sentId(await sendText(brother, conversationId, 'Cible'))
    const answer = await sentId(await reply(sister, conversationId, 'Réponse', target))
    // A target that no longer opens (moved envelope) is unavailable, with no text, sender or kind.
    const row = messages.rows.find((item) => item.id === target)
    if (row) row.body = sealChatText('Cible', chatKey, conversationId, 'another-id')
    const listed = (await page(brother, conversationId)).items as Array<Item & { reply_to?: Quote }>
    expect(listed.find((item) => item.id === answer)?.reply_to).toEqual({ id: target, available: false })
    // A row that somehow points into another conversation (never written by send) shows nothing of it.
    const stored = messages.rows.find((item) => item.id === answer)
    if (stored) stored.reply_to_message_id = foreign
    const again = (await page(sister, conversationId)).items as Array<Item & { reply_to?: Quote }>
    expect(again.find((item) => item.id === answer)?.reply_to).toEqual({ id: foreign, available: false })
    expect(JSON.stringify(again)).not.toContain('Secret ailleurs')
  })

  it('chat-polish-2 AC 23: no reply into a closed or blocked conversation, and only members of it may reply', async () => {
    const { brother, sister, conversationId } = await connected()
    const stranger = await member('brother')
    const target = await sentId(await sendText(brother, conversationId, 'Bonjour'))
    expect((await reply(stranger, conversationId, 'Moi aussi', target)).status).toBe(404)
    expect((await call('/v1/blocks', sister.cookie, 'POST', { blocked_id: brother.id })).status).toBe(201)
    const refused = await reply(sister, conversationId, 'Après blocage', target)
    expect(refused.status).toBe(409)
    expect(messages.rows.filter((row) => row.reply_to_message_id === target)).toHaveLength(0)
  })

  // ---- Story chat-polish-2: presence (« En ligne », « Vu pour la dernière fois … ») ----

  type Presence = { online: boolean; last_seen_at: string | null } | null

  async function presenceSeenBy(viewer: Member, conversationId: string): Promise<Presence> {
    const head = await call(`/v1/conversations/${conversationId}`, viewer.cookie)
    expect(head.status).toBe(200)
    return ((await head.json()) as { presence: Presence }).presence
  }

  function closed(socket: Socket): Promise<void> {
    return new Promise((resolve) => {
      if (!socket.connected) return resolve()
      socket.once('disconnect', () => resolve())
      socket.disconnect()
    })
  }

  it('chat-polish-2 AC 8: presence follows her sockets (several tabs count once), survives a short reconnect, then stores « Vu … »', async () => {
    const { brother, sister, conversationId } = await connected()
    expect(await presenceSeenBy(brother, conversationId)).toEqual({ online: false, last_seen_at: null })
    const first = await connectedSocket(sister)
    const second = await connectedSocket(sister)
    await expect.poll(() => presenceSeenBy(brother, conversationId)).toEqual({ online: true, last_seen_at: null })
    // One tab closes: still online, well past the grace period, and no « Vu » is stored.
    await closed(first)
    await new Promise((resolve) => setTimeout(resolve, GRACE_MS * 2))
    expect(await presenceSeenBy(brother, conversationId)).toEqual({ online: true, last_seen_at: null })
    expect(presence.rows.get(sister.id)?.last_seen_at ?? null).toBeNull()
    // The last tab closes: still online during the grace period; a reconnect inside it never shows « hors ligne ».
    const leftAt = now.toISOString()
    await closed(second)
    expect(await presenceSeenBy(brother, conversationId)).toEqual({ online: true, last_seen_at: null })
    const back = await connectedSocket(sister)
    await new Promise((resolve) => setTimeout(resolve, GRACE_MS * 2))
    expect(await presenceSeenBy(brother, conversationId)).toEqual({ online: true, last_seen_at: null })
    expect(presence.rows.get(sister.id)?.last_seen_at ?? null).toBeNull()
    // Gone for good: after the grace period she is offline, seen when her last socket closed.
    now = new Date(now.getTime() + 5000)
    const goneAt = now.toISOString()
    await closed(back)
    await expect.poll(() => presenceSeenBy(brother, conversationId), { timeout: 3000 }).toEqual({ online: false, last_seen_at: goneAt })
    expect(goneAt).not.toBe(leftAt)
    expect(presence.rows.get(sister.id)?.last_seen_at).toBe(goneAt)
    expect(billingCalls).toBe(0)
  })

  it('chat-polish-2 AC 8: presence.changed reaches her chat partner (ids only), never a stranger, across a Block, or when either hides it', async () => {
    const { brother, sister, conversationId } = await connected()
    const stranger = await member('brother')
    const hisSocket = await connectedSocket(brother)
    const strangerSocket = await connectedSocket(stranger)
    const toHim = nextEvent<Record<string, unknown>>(hisSocket, 'presence.changed')
    const leak = noEvent(strangerSocket, 'presence.changed')
    const herSocket = await connectedSocket(sister)
    expect(await toHim).toEqual({ account_id: sister.id })
    await leak
    // She goes offline: told once the grace period is over.
    const offline = nextEvent<Record<string, unknown>>(hisSocket, 'presence.changed', GRACE_MS + 2000)
    await closed(herSocket)
    expect(await offline).toEqual({ account_id: sister.id })

    // She hides hers: her coming and going is never announced (nobody can time it from the events).
    expect((await receipts(sister, { presence: false })).status).toBe(200)
    const hiddenHers = noEvent(hisSocket, 'presence.changed', GRACE_MS + 600)
    const again = await connectedSocket(sister)
    await closed(again)
    await hiddenHers
    expect(await presenceSeenBy(brother, conversationId)).toBeNull()
    expect(await presenceSeenBy(sister, conversationId)).toBeNull()
    expect((await receipts(sister, { presence: true })).status).toBe(200)

    // He hides his: she is not announced to him either (reciprocal), and he sees nothing.
    expect((await receipts(brother, { presence: false })).status).toBe(200)
    const hiddenHis = noEvent(hisSocket, 'presence.changed', GRACE_MS + 600)
    const third = await connectedSocket(sister)
    expect(await presenceSeenBy(brother, conversationId)).toBeNull()
    await closed(third)
    await hiddenHis
    expect((await receipts(brother, { presence: true })).status).toBe(200)

    // A Block either way: nothing crosses, and the head says nothing.
    expect((await call('/v1/blocks', sister.cookie, 'POST', { blocked_id: brother.id })).status).toBe(201)
    const blocked = noEvent(hisSocket, 'presence.changed', GRACE_MS + 600)
    const fourth = await connectedSocket(sister)
    expect(await presenceSeenBy(brother, conversationId)).toBeNull()
    // The presence rule itself refuses a Block, whatever the caller already hid.
    expect(await presenceBetween(brother.id, sister.id, true)).toBeNull()
    expect(await presenceBetween(brother.id, sister.id, false)).toEqual({ online: true, last_seen_at: null })
    await closed(fourth)
    await blocked
  })

  it('chat-polish-2 AC 9: « Statut en ligne et dernière connexion » is on by default, per member, booleans only, members only', async () => {
    const { brother, sister } = await connected()
    expect(await (await receipts(sister)).json()).toEqual({ read_receipts: true, presence: true })
    for (const value of ['false', 0, 1, null, {}]) {
      const refused = await receipts(sister, { presence: value })
      expect(refused.status).toBe(400)
      expect(await refused.json()).toMatchObject({ error: { message: 'presence : valeur non reconnue.', details: { field: 'presence' } } })
    }
    // A bad value next to a good one stores neither.
    const mixed = await receipts(sister, { read_receipts: false, presence: 'non' })
    expect(mixed.status).toBe(400)
    expect(reads.settings.has(sister.id)).toBe(false)
    expect(presence.rows.has(sister.id)).toBe(false)
    const off = await receipts(sister, { presence: false })
    expect(off.status).toBe(200)
    expect(await off.json()).toEqual({ read_receipts: true, presence: false })
    expect(await (await receipts(brother)).json()).toEqual({ read_receipts: true, presence: true })
    const both = await receipts(brother, { read_receipts: false, presence: false })
    expect(await both.json()).toEqual({ read_receipts: false, presence: false })
    expect((await receipts(undefined, { presence: false })).status).toBe(401)
    const account = memory.accounts.find((item) => item.id === brother.id) as { roles: string[] }
    for (const roles of [['mahram'], ['moderator']]) {
      account.roles = roles
      expect((await receipts(brother, { presence: true })).status).toBe(403)
    }
    account.roles = ['member']
    expect(billingCalls).toBe(0)
  })

  it('chat-polish-2 AC 9: a presence change tells my tabs and my unblocked partners to reload (chat.receipts), never a stranger', async () => {
    const { brother, sister } = await connected()
    const stranger = await member('brother')
    const hisSocket = await connectedSocket(brother)
    const herSocket = await connectedSocket(sister)
    const strangerSocket = await connectedSocket(stranger)
    const toHim = nextEvent<Record<string, unknown>>(hisSocket, 'chat.receipts')
    const toHer = nextEvent<Record<string, unknown>>(herSocket, 'chat.receipts')
    const leak = noEvent(strangerSocket, 'chat.receipts')
    expect((await receipts(sister, { presence: false })).status).toBe(200)
    expect(await toHim).toEqual({ account_id: sister.id })
    expect(await toHer).toEqual({ account_id: sister.id })
    await leak
  })

})

describe('chat and moderation boundaries (AD-10, AD-21, AD-15)', () => {
  const sources = readdirSync(srcDir).filter((name) => name.endsWith('.ts') && !name.endsWith('.test.ts'))

  it('only moderation.ts inserts moderation_job, and moderation never reads message', () => {
    const writers = sources.filter((name) => /\.insert\(\s*moderationJob\b/.test(readFileSync(join(srcDir, name), 'utf8')))
    expect(writers).toEqual(['moderation.ts'])
    expect(readFileSync(join(srcDir, 'moderation.ts'), 'utf8')).not.toMatch(/\bmessage\b\s*[,}]|from\(\s*message\b|chat-messages/)
  })

  it('only chat-messages.ts inserts message', () => {
    const writers = sources.filter((name) => /\.insert\(\s*message\b/.test(readFileSync(join(srcDir, name), 'utf8')))
    expect(writers).toEqual(['chat-messages.ts'])
  })

  it('chat routes, send, typing and the socket never reach BillingPort in this story', () => {
    for (const name of ['chat.ts', 'chat-messages.ts', 'chat-realtime.ts', 'conversations.controller.ts', 'moderation.ts']) {
      expect(readFileSync(join(srcDir, name), 'utf8'), name).not.toMatch(/billing-port|isEntitled|getBillingPort/)
    }
  })

  it('no pending, held or blocked Chat event or state exists in the chat sources', () => {
    for (const name of ['chat-messages.ts', 'chat-realtime.ts']) {
      const source = readFileSync(join(srcDir, name), 'utf8')
      expect(source, name).not.toMatch(/'message\.(pending|held|blocked)'|state: '(pending|held)'/)
      expect(source, name).not.toMatch(/En cours de vérification/)
    }
  })
})
