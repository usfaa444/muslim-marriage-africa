import { isUuidV7, newId } from '@ankanu/kernel'
import type { ConversationStage, ScanPayload } from '@ankanu/ports'
import { and, desc, eq, gt, inArray, lt, sql } from 'drizzle-orm'
import { message } from './account-schema.js'
import { accountStoreIsMemory, getIdentityDatabase } from './account-store.js'
import { authNow } from './auth-clock.js'
import { getChatStore, type ConversationRow } from './chat.js'
import { openChatText, readChatKey, sealChatText, type ChatEnvelope } from './chat-key.js'
import { ageOn } from './create-account.js'
import { getInvitesPort } from './invites-port.js'
import { discoveryPhoto, signMedia } from './media.js'
import { getMediaStore } from './media-store.js'
import { getModerationPort } from './moderation.js'
import { isListableProfile } from './profile-review.js'
import { getProfileStore } from './profile-store.js'
import {
  assertBrowseViewer,
  loadAccount,
  verificationFlags,
  type BrowseViewer,
  type PublicProfileFailure,
} from './public-profile.js'
import type { ResolvedSession } from './session-store.js'

/**
 * Chat messages (Stories 5.1, 5.2). A text is persisted `delivered` (the only state), pushed to both members as
 * `message.delivered` with ids only, and only then handed to `ModerationPort.enqueueScan`. Nothing here waits on AI,
 * and nothing here reads an entitlement: the Free-tier cap (Story 5.11) plugs in at `checkMessageCap`.
 */

export const TEXT_MAX = 2000
export const PAGE_DEFAULT = 30
export const PAGE_MAX = 50
export const PREVIEW_MAX = 120
/** The send acknowledgement never waits longer than this on the scan enqueue (NFR-005 send ack ≤ 2 s). */
export const SCAN_ENQUEUE_WAIT_MS = 1000

export const CONVERSATION_MISSING_MESSAGE = "Cette discussion n'existe pas."
export const KIND_MESSAGE = 'kind : valeur non reconnue.'
export const TEXT_EMPTY_MESSAGE = 'Écrivez un message.'
export const TEXT_LONG_MESSAGE = `Message trop long (${TEXT_MAX} caractères au plus).`
export const CLOSED_MESSAGE = 'Cette discussion est fermée.'
export const OTHER_UNAVAILABLE_MESSAGE = "Ce profil n'est plus disponible."
export const KEY_MISSING_MESSAGE = 'Envoi indisponible pour le moment. Réessayez plus tard.'
export const MESSAGE_CAP_MESSAGE = 'Limite de messages du jour atteinte.'

export type MessageKind = 'text' | 'photo' | 'voice'

export type StoredMessage = {
  id: string
  conversation_id: string
  sender_id: string
  kind: MessageKind
  state: 'delivered'
  body: ChatEnvelope
  media_id: string | null
  created_at: string
}

export type MessagePage = { rows: StoredMessage[]; hasMore: boolean }

export type MessageStore = {
  insert(row: StoredMessage): Promise<void>
  /**
   * Oldest first. Without `after`: the newest page (before `before` when given); `hasMore` says older rows exist.
   * With `after`: the next rows after it; `hasMore` says newer rows exist past this page.
   */
  page(conversationId: string, cursor: { before?: string; after?: string }, limit: number): Promise<MessagePage>
  lastFor(conversationIds: readonly string[]): Promise<Map<string, StoredMessage>>
}

function kindOf(value: string): MessageKind {
  return value === 'photo' || value === 'voice' ? value : 'text'
}

export function memoryMessageStore(): MessageStore & { rows: StoredMessage[] } {
  const rows: StoredMessage[] = []
  return {
    rows,
    async insert(row) {
      rows.push({ ...row, body: { ...row.body } })
    },
    async page(conversationId, cursor, limit) {
      const mine = rows
        .filter((row) => row.conversation_id === conversationId)
        .sort((left, right) => left.id.localeCompare(right.id))
      if (cursor.after) {
        const after = cursor.after
        const newer = mine.filter((row) => row.id > after)
        return { rows: newer.slice(0, limit), hasMore: newer.length > limit }
      }
      const before = cursor.before
      const older = before ? mine.filter((row) => row.id < before) : mine
      const slice = older.slice(Math.max(0, older.length - limit))
      return { rows: slice, hasMore: older.length > slice.length }
    },
    async lastFor(conversationIds) {
      const wanted = new Set(conversationIds)
      const last = new Map<string, StoredMessage>()
      for (const row of rows) {
        if (!wanted.has(row.conversation_id)) {
          continue
        }
        const current = last.get(row.conversation_id)
        if (!current || row.id > current.id) {
          last.set(row.conversation_id, row)
        }
      }
      return last
    },
  }
}

const columns = {
  id: message.id,
  conversation_id: message.conversation_id,
  sender_id: message.sender_id,
  kind: message.kind,
  state: message.state,
  body: message.body,
  media_id: message.media_id,
  created_at: message.created_at,
}

type SelectedMessage = {
  id: string
  conversation_id: string
  sender_id: string
  kind: string
  state: string
  body: unknown
  media_id: string | null
  created_at: string
}

function toStored(row: SelectedMessage): StoredMessage {
  return {
    id: row.id,
    conversation_id: row.conversation_id,
    sender_id: row.sender_id,
    kind: kindOf(row.kind),
    state: 'delivered',
    body: row.body as ChatEnvelope,
    media_id: row.media_id,
    created_at: new Date(row.created_at).toISOString(),
  }
}

function postgresMessageStore(): MessageStore {
  return {
    async insert(row) {
      await getIdentityDatabase().insert(message).values(row)
    },
    async page(conversationId, cursor, limit) {
      const db = getIdentityDatabase()
      if (cursor.after) {
        const newer = await db
          .select(columns)
          .from(message)
          .where(and(eq(message.conversation_id, conversationId), gt(message.id, cursor.after)))
          .orderBy(message.id)
          .limit(limit + 1)
        return { rows: newer.slice(0, limit).map(toStored), hasMore: newer.length > limit }
      }
      const where = cursor.before
        ? and(eq(message.conversation_id, conversationId), lt(message.id, cursor.before))
        : eq(message.conversation_id, conversationId)
      const found = await db.select(columns).from(message).where(where).orderBy(desc(message.id)).limit(limit + 1)
      const hasMore = found.length > limit
      return { rows: found.slice(0, limit).reverse().map(toStored), hasMore }
    },
    async lastFor(conversationIds) {
      const last = new Map<string, StoredMessage>()
      if (conversationIds.length === 0) {
        return last
      }
      const found = await getIdentityDatabase()
        .selectDistinctOn([message.conversation_id], columns)
        .from(message)
        .where(inArray(message.conversation_id, [...conversationIds]))
        .orderBy(message.conversation_id, sql`${message.id} desc`)
      for (const row of found) {
        last.set(row.conversation_id, toStored(row))
      }
      return last
    },
  }
}

let storeOverride: MessageStore | undefined
let memoryFallback: ReturnType<typeof memoryMessageStore> | undefined

export function setMessageStore(next: MessageStore | undefined): void {
  storeOverride = next
}

export function getMessageStore(): MessageStore {
  if (storeOverride) {
    return storeOverride
  }
  if (accountStoreIsMemory()) {
    memoryFallback ??= memoryMessageStore()
    return memoryFallback
  }
  return postgresMessageStore()
}

/** Realtime fan-out, registered by `chat-realtime.ts` when the Socket.IO server is attached. Ids only. */
export type ChatEvents = {
  messageDelivered(input: { conversationId: string; messageId: string; senderId: string; recipients: readonly string[] }): void
}

let events: ChatEvents | undefined

export function setChatEvents(next: ChatEvents | undefined): void {
  events = next
}

/**
 * Story 5.11 seam (FR-146, AD-29). Today every send is allowed and nothing is read: no entitlement read, no
 * `message_quota`. Story 5.11 replaces the body with the live `daily_message_cap` + entitlement check and
 * the atomic `message_quota` increment; a refusal must make `sendText` answer `MESSAGE_CAP_EXCEEDED` before anything is
 * stored or enqueued.
 */
export type CapDecision = { allowed: true } | { allowed: false; cap: number; resets_at: string }

let capCheck: (input: { senderId: string; kind: MessageKind; now: Date }) => Promise<CapDecision> = async () => ({ allowed: true })

export function setMessageCapCheck(next: ((input: { senderId: string; kind: MessageKind; now: Date }) => Promise<CapDecision>) | undefined): void {
  capCheck = next ?? (async () => ({ allowed: true }))
}

export function checkMessageCap(input: { senderId: string; kind: MessageKind; now: Date }): Promise<CapDecision> {
  return capCheck(input)
}

export type ChatFailure = {
  ok: false
  status: 400 | 403 | 404 | 409 | 429 | 500 | 503
  code: 'FORBIDDEN' | 'NOT_FOUND' | 'UNHANDLED' | 'MESSAGE_CAP_EXCEEDED'
  message: string
  details: PublicProfileFailure['details'] | { field: string; max?: number } | { reason: string } | { cap: number; resets_at: string }
  retryable: boolean
}

function fail(
  status: ChatFailure['status'],
  code: ChatFailure['code'],
  message: string,
  details: ChatFailure['details'],
  retryable = false,
): ChatFailure {
  return { ok: false, status, code, message, details, retryable }
}

function fromViewer(error: PublicProfileFailure): ChatFailure {
  if (error.status === 403 && error.code === 'FORBIDDEN') {
    return fail(403, 'FORBIDDEN', error.message, error.details)
  }
  return fail(500, 'UNHANDLED', 'Request failed', null)
}

const notFound = (): ChatFailure => fail(404, 'NOT_FOUND', CONVERSATION_MISSING_MESSAGE, null)

/** The other member as Chat shows them: blur photo only, field values only while their profile is listable. */
export type ChatOther =
  | { available: true; age: number | null; city: string | null; verified: boolean; photo: { id: string; url: string } | null }
  | { available: false }

async function presentOther(viewerId: string, other: BrowseViewer | null): Promise<ChatOther> {
  if (!other || !other.roles.includes('member')) {
    return { available: false }
  }
  const profile = await getProfileStore().read(other.id)
  if (!profile || !isListableProfile(profile.visibility, other.status)) {
    return { available: false }
  }
  const mains = await getMediaStore().liveMainProfilePhotos([other.id])
  const asset = mains.find((item) => item.owner_id === other.id) ?? null
  let photo: { id: string; url: string } | null = null
  if (asset && discoveryPhoto(asset)) {
    const signed = await signMedia(getMediaStore(), asset.id, 'blur', viewerId)
    photo = signed.ok ? { id: asset.id, url: signed.url } : null
  }
  const verification = await verificationFlags(other.id, other.gender)
  return { available: true, age: ageOn(profile.dob, authNow()), city: profile.city, verified: verification.id, photo }
}

/** A conversation the viewer takes part in, with the other member's id. Null for any other id (one 404). */
export async function participantConversation(
  viewerId: string,
  conversationId: unknown,
): Promise<{ row: ConversationRow; otherId: string } | null> {
  if (typeof conversationId !== 'string' || !isUuidV7(conversationId)) {
    return null
  }
  const row = await getChatStore().find(conversationId)
  if (!row) {
    return null
  }
  const accepted = await getInvitesPort().acceptedFor(viewerId)
  const match = accepted.find((item) => item.inviteId === row.invite_id)
  return match ? { row, otherId: match.otherId } : null
}

export type MessageItem = {
  id: string
  conversation_id: string
  sender_id: string
  mine: boolean
  kind: MessageKind
  state: 'delivered'
  text: string | null
  created_at: string
}

function present(row: StoredMessage, viewerId: string): MessageItem {
  return {
    id: row.id,
    conversation_id: row.conversation_id,
    sender_id: row.sender_id,
    mine: row.sender_id === viewerId,
    kind: row.kind,
    state: 'delivered',
    text: openChatText(row.body, readChatKey(), row.conversation_id, row.id),
    created_at: row.created_at,
  }
}

export type ConversationItem = {
  id: string
  invite_id: string
  stage: ConversationStage
  other_id: string
  pseudonym: string | null
  other: ChatOther
  last_message: { id: string; mine: boolean; kind: MessageKind; preview: string | null; created_at: string } | null
}

function preview(text: string | null): string | null {
  if (text === null) {
    return null
  }
  const flat = text.replace(/\s+/g, ' ').trim()
  return flat.length > PREVIEW_MAX ? `${flat.slice(0, PREVIEW_MAX - 1)}…` : flat
}

/**
 * `GET /v1/conversations`. The viewer's conversations, found through the accepted invites invites reports for them
 * (chat never reads the invite table), newest activity first. A pending or declined invite has none. No entitlement read.
 */
export async function listConversations(
  session: ResolvedSession,
): Promise<{ ok: true; body: { count: number; items: ConversationItem[] } } | ChatFailure> {
  const gate = await assertBrowseViewer(session)
  if (!gate.ok) {
    return fromViewer(gate)
  }
  const me = gate.account.id
  const accepted = await getInvitesPort().acceptedFor(me)
  const otherByInvite = new Map(accepted.map((row) => [row.inviteId, row.otherId]))
  const rows = (await getChatStore().conversationsForInvites([...otherByInvite.keys()])).filter((row) =>
    otherByInvite.has(row.invite_id),
  )
  const last = await getMessageStore().lastFor(rows.map((row) => row.id))
  const items: ConversationItem[] = []
  for (const row of rows) {
    const otherId = otherByInvite.get(row.invite_id) ?? ''
    const other = await loadAccount(otherId)
    const latest = last.get(row.id)
    const item = latest ? present(latest, me) : null
    items.push({
      id: row.id,
      invite_id: row.invite_id,
      stage: row.stage,
      other_id: otherId,
      pseudonym: other?.pseudonym ?? null,
      other: await presentOther(me, other),
      last_message: item
        ? { id: item.id, mine: item.mine, kind: item.kind, preview: preview(item.text), created_at: item.created_at }
        : null,
    })
  }
  const activity = (item: ConversationItem) => item.last_message?.id ?? item.id
  items.sort((left, right) => activity(right).localeCompare(activity(left)))
  return { ok: true, body: { count: items.length, items } }
}

/** `GET /v1/conversations/:id`. Participants only; any other id is the same 404. */
export async function readConversation(
  session: ResolvedSession,
  id: unknown,
): Promise<
  | {
      ok: true
      body: {
        conversation: { id: string; stage: ConversationStage; other_id: string; pseudonym: string | null; other: ChatOther }
        me: { id: string }
      }
    }
  | ChatFailure
> {
  const gate = await assertBrowseViewer(session)
  if (!gate.ok) {
    return fromViewer(gate)
  }
  const found = await participantConversation(gate.account.id, id)
  if (!found) {
    return notFound()
  }
  const other = await loadAccount(found.otherId)
  return {
    ok: true,
    body: {
      conversation: {
        id: found.row.id,
        stage: found.row.stage,
        other_id: found.otherId,
        pseudonym: other?.pseudonym ?? null,
        other: await presentOther(gate.account.id, other),
      },
      me: { id: gate.account.id },
    },
  }
}

function readCursor(value: unknown, field: string): { ok: true; value: string | undefined } | ChatFailure {
  if (value === undefined || value === '') {
    return { ok: true, value: undefined }
  }
  if (typeof value !== 'string' || !isUuidV7(value)) {
    return fail(400, 'UNHANDLED', `${field} : valeur non reconnue.`, { field })
  }
  return { ok: true, value }
}

/** `GET /v1/conversations/:id/messages?limit&before|after`. Participants only. Oldest first. */
export async function listMessages(
  session: ResolvedSession,
  id: unknown,
  query: { limit?: unknown; before?: unknown; after?: unknown },
): Promise<{ ok: true; body: { items: MessageItem[]; has_more: boolean } } | ChatFailure> {
  const gate = await assertBrowseViewer(session)
  if (!gate.ok) {
    return fromViewer(gate)
  }
  const found = await participantConversation(gate.account.id, id)
  if (!found) {
    return notFound()
  }
  let limit = PAGE_DEFAULT
  if (query.limit !== undefined && query.limit !== '') {
    const parsed = typeof query.limit === 'string' && /^\d{1,3}$/.test(query.limit) ? Number(query.limit) : NaN
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > PAGE_MAX) {
      return fail(400, 'UNHANDLED', 'limit : valeur non reconnue.', { field: 'limit', max: PAGE_MAX })
    }
    limit = parsed
  }
  const before = readCursor(query.before, 'before')
  if (!before.ok) {
    return before
  }
  const after = readCursor(query.after, 'after')
  if (!after.ok) {
    return after
  }
  if (before.value && after.value) {
    return fail(400, 'UNHANDLED', 'before : valeur non reconnue.', { field: 'before' })
  }
  const cursor: { before?: string; after?: string } = {}
  if (before.value) {
    cursor.before = before.value
  }
  if (after.value) {
    cursor.after = after.value
  }
  const page = await getMessageStore().page(found.row.id, cursor, limit)
  return { ok: true, body: { items: page.rows.map((row) => present(row, gate.account.id)), has_more: page.hasMore } }
}

function readText(body: unknown): { ok: true; text: string } | ChatFailure {
  const record = typeof body === 'object' && body !== null && !Array.isArray(body) ? (body as Record<string, unknown>) : {}
  if (record['kind'] !== 'text') {
    return fail(400, 'UNHANDLED', KIND_MESSAGE, { field: 'kind' })
  }
  const raw = record['text']
  const text = typeof raw === 'string' ? raw.trim() : ''
  if (text.length === 0) {
    return fail(400, 'UNHANDLED', TEXT_EMPTY_MESSAGE, { field: 'text' })
  }
  if ([...text].length > TEXT_MAX) {
    return fail(400, 'UNHANDLED', TEXT_LONG_MESSAGE, { field: 'text', max: TEXT_MAX })
  }
  return { ok: true, text }
}

function logScanEnqueueFailed(messageId: string): void {
  process.stderr.write(`chat scan_enqueue_failed message=${messageId}\n`)
}

/**
 * After persist (AD-10). Awaited at most `SCAN_ENQUEUE_WAIT_MS`; a throw, a rejection or a slow call never changes the
 * send answer. Recording scan-deferred is Epic 8.
 */
async function enqueueAfterPersist(input: { itemId: string; accountId: string; payload: ScanPayload }): Promise<void> {
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<'timeout'>((resolve) => {
    timer = setTimeout(() => resolve('timeout'), SCAN_ENQUEUE_WAIT_MS)
  })
  const enqueue = (async () => {
    try {
      await getModerationPort().enqueueScan({ itemId: input.itemId, itemKind: 'message', accountId: input.accountId, payload: input.payload })
      return 'ok' as const
    } catch {
      return 'failed' as const
    }
  })()
  const outcome = await Promise.race([enqueue, timeout])
  if (timer !== undefined) {
    clearTimeout(timer)
  }
  if (outcome !== 'ok') {
    logScanEnqueueFailed(input.itemId)
  }
}

/** `POST /v1/conversations/:id/messages` with `kind: 'text'`. See the story spec for the order of the checks. */
export async function sendText(
  session: ResolvedSession,
  id: unknown,
  body: unknown,
): Promise<{ ok: true; body: { message: MessageItem } } | ChatFailure> {
  const gate = await assertBrowseViewer(session)
  if (!gate.ok) {
    return fromViewer(gate)
  }
  const me = gate.account.id
  const found = await participantConversation(me, id)
  if (!found) {
    return notFound()
  }
  const input = readText(body)
  if (!input.ok) {
    return input
  }
  if (found.row.ended_at !== null || found.row.paused_by !== null) {
    return fail(409, 'UNHANDLED', CLOSED_MESSAGE, { reason: 'conversation_closed' })
  }
  const other = await loadAccount(found.otherId)
  const otherProfile = other ? await getProfileStore().read(other.id) : null
  if (!other || !other.roles.includes('member') || !otherProfile || !isListableProfile(otherProfile.visibility, other.status)) {
    return fail(409, 'UNHANDLED', OTHER_UNAVAILABLE_MESSAGE, { reason: 'other_unavailable' })
  }
  const now = authNow()
  const cap = await checkMessageCap({ senderId: me, kind: 'text', now })
  if (!cap.allowed) {
    return fail(429, 'MESSAGE_CAP_EXCEEDED', MESSAGE_CAP_MESSAGE, { cap: cap.cap, resets_at: cap.resets_at })
  }
  const key = readChatKey()
  if (!key) {
    return fail(503, 'UNHANDLED', KEY_MISSING_MESSAGE, null, true)
  }
  const messageId = newId(now)
  const row: StoredMessage = {
    id: messageId,
    conversation_id: found.row.id,
    sender_id: me,
    kind: 'text',
    state: 'delivered',
    body: sealChatText(input.text, key, found.row.id, messageId),
    media_id: null,
    created_at: now.toISOString(),
  }
  await getMessageStore().insert(row)
  try {
    events?.messageDelivered({ conversationId: row.conversation_id, messageId, senderId: me, recipients: [me, found.otherId] })
  } catch {
    // Realtime is best effort; the reader catches up over HTTP.
  }
  await enqueueAfterPersist({ itemId: messageId, accountId: me, payload: { kind: 'text', text: input.text } })
  return { ok: true, body: { message: { ...present(row, me), text: input.text } } }
}

/** Typing relay check: the viewer may type in this conversation. Returns the other member, or null. */
export async function typingTarget(session: ResolvedSession, conversationId: unknown): Promise<string | null> {
  const gate = await assertBrowseViewer(session)
  if (!gate.ok) {
    return null
  }
  const found = await participantConversation(gate.account.id, conversationId)
  return found ? found.otherId : null
}
