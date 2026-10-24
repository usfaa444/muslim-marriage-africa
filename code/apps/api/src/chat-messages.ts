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
import {
  readChatPhoto,
  readVoiceNote,
  signChatMedia,
  storeChatPhoto,
  storeVoiceNote,
  type ChatPhotoInput,
  type VoiceNoteInput,
} from './media-chat.js'
import { getMediaStore, MediaStorageError } from './media-store.js'
import { getModerationPort } from './moderation.js'
import { isListableProfile } from './profile-review.js'
import { getProfileStore } from './profile-store.js'
import { getTrustPort } from './trust-port.js'
import {
  assertBrowseViewer,
  loadAccount,
  verificationFlags,
  type BrowseViewer,
  type PublicProfileFailure,
} from './public-profile.js'
import type { ResolvedSession } from './session-store.js'

/**
 * Chat messages (Stories 5.1 to 5.4). A text, a Chat Photo or a Voice note is persisted `delivered` (the only state),
 * pushed to both members as `message.delivered` with ids only, and only then handed to `ModerationPort.enqueueScan`.
 * Nothing here waits on AI, and nothing here reads an entitlement: the Free-tier cap (Story 5.11) plugs in at
 * `checkMessageCap`, which every kind goes through before anything is stored.
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
export const MEDIA_MISSING_MESSAGE = 'Ce média est introuvable.'

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
  /** One message by id, for a Report (Story 8.5). */
  find(id: string): Promise<StoredMessage | null>
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
    async find(id) {
      return rows.find((row) => row.id === id) ?? null
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
    async find(id) {
      const found = await getIdentityDatabase().select(columns).from(message).where(eq(message.id, id)).limit(1)
      return found[0] ? toStored(found[0]) : null
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
 * the atomic `message_quota` increment; a refusal must make `sendMessage` answer (text, photo and voice alike) `MESSAGE_CAP_EXCEEDED` before anything is
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

async function presentOther(viewerId: string, other: BrowseViewer | null, blocked = false): Promise<ChatOther> {
  // A Block hides both members from each other (Story 8.6): the thread shows « Profil indisponible », like a member who left.
  if (blocked || !other || !other.roles.includes('member')) {
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

/**
 * A Chat Photo or a Voice note as a reader sees it (Stories 5.3, 5.4). Ids and display facts only: the Photo's blur is
 * signed for this reader at read time; its clear image and the Voice note's audio come from
 * `GET …/messages/:messageId/media`, signed for the caller on demand (no autoplay, no URL in an event).
 */
export type MessageMedia =
  | { id: string; kind: 'photo'; width: number | null; height: number | null; blur_url: string | null }
  | { id: string; kind: 'voice'; duration_ms: number | null }

export type MessageItem = {
  id: string
  conversation_id: string
  sender_id: string
  mine: boolean
  kind: MessageKind
  state: 'delivered'
  text: string | null
  created_at: string
  /** Present on `photo` and `voice` only. */
  media?: MessageMedia
}

/** Sealed with the message like a text, so a Photo's size or a note's language is not readable at rest either. */
type MediaMeta = { w?: number; h?: number; d?: number; l?: string | null }

function readMeta(row: StoredMessage): MediaMeta {
  const raw = openChatText(row.body, readChatKey(), row.conversation_id, row.id)
  if (raw === null) {
    return {}
  }
  try {
    const parsed: unknown = JSON.parse(raw)
    return typeof parsed === 'object' && parsed !== null ? (parsed as MediaMeta) : {}
  } catch {
    return {}
  }
}

function positive(value: unknown): number | null {
  return typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : null
}

function present(row: StoredMessage, viewerId: string): MessageItem {
  return {
    id: row.id,
    conversation_id: row.conversation_id,
    sender_id: row.sender_id,
    mine: row.sender_id === viewerId,
    kind: row.kind,
    state: 'delivered',
    text: row.kind === 'text' ? openChatText(row.body, readChatKey(), row.conversation_id, row.id) : null,
    created_at: row.created_at,
  }
}

/** `present` plus the media facts; the Photo blur is signed for this viewer now (a failed sign is `blur_url: null`). */
async function presentFull(row: StoredMessage, viewerId: string): Promise<MessageItem> {
  const item = present(row, viewerId)
  if (row.kind === 'text' || !row.media_id) {
    return item
  }
  const meta = readMeta(row)
  if (row.kind === 'voice') {
    return { ...item, media: { id: row.media_id, kind: 'voice', duration_ms: positive(meta.d) } }
  }
  const signed = await signChatMedia(getMediaStore(), row.media_id, 'blur', viewerId)
  return {
    ...item,
    media: { id: row.media_id, kind: 'photo', width: positive(meta.w), height: positive(meta.h), blur_url: signed.ok ? signed.url : null },
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
  // Cut on user-perceived characters (graphemes), never inside a surrogate pair or an emoji sequence.
  const graphemes = Array.from(new Intl.Segmenter('fr', { granularity: 'grapheme' }).segment(flat), (part) => part.segment)
  return graphemes.length > PREVIEW_MAX ? `${graphemes.slice(0, PREVIEW_MAX - 1).join('')}…` : flat
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
  const hidden = new Set(await getTrustPort().hiddenFor(me))
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
      other: await presentOther(me, other, hidden.has(otherId)),
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
        conversation: {
          id: string
          stage: ConversationStage
          other_id: string
          pseudonym: string | null
          other: ChatOther
          closed: boolean
        }
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
  const blocked = await getTrustPort().blockedBetween(gate.account.id, found.otherId)
  return {
    ok: true,
    body: {
      conversation: {
        id: found.row.id,
        stage: found.row.stage,
        other_id: found.otherId,
        pseudonym: other?.pseudonym ?? null,
        other: await presentOther(gate.account.id, other, blocked),
        // Paused, ended, or a Block either way (Story 8.6): the thread stays readable, and a send is refused with
        // `conversation_closed`. The blocked member sees the same answer as for any closed thread.
        closed: blocked || found.row.ended_at !== null || found.row.paused_by !== null,
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
  const items = await Promise.all(page.rows.map((row) => presentFull(row, gate.account.id)))
  return { ok: true, body: { items, has_more: page.hasMore } }
}

type SendInput =
  | { kind: 'text'; text: string }
  | { kind: 'photo'; photo: ChatPhotoInput }
  | { kind: 'voice'; voice: VoiceNoteInput }

/** `kind` decides the shape: `text` (5.2), `photo` with `image` (5.3), `voice` with `audio` and `duration_ms` (5.4). */
function readSend(body: unknown): { ok: true; input: SendInput } | ChatFailure {
  const record = typeof body === 'object' && body !== null && !Array.isArray(body) ? (body as Record<string, unknown>) : {}
  const kind = record['kind']
  if (kind === 'photo') {
    const photo = readChatPhoto(record['image'])
    if (!photo.ok) {
      return fail(400, 'UNHANDLED', photo.message, photo.max === undefined ? { field: photo.field } : { field: photo.field, max: photo.max })
    }
    return { ok: true, input: { kind: 'photo', photo: photo.photo } }
  }
  if (kind === 'voice') {
    const voice = readVoiceNote(record['audio'], record['duration_ms'], record['language'])
    if (!voice.ok) {
      return fail(400, 'UNHANDLED', voice.message, voice.max === undefined ? { field: voice.field } : { field: voice.field, max: voice.max })
    }
    return { ok: true, input: { kind: 'voice', voice: voice.voice } }
  }
  const text = readText(record)
  return text.ok ? { ok: true, input: { kind: 'text', text: text.text } } : text
}

function readText(record: Record<string, unknown>): { ok: true; text: string } | ChatFailure {
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

/**
 * `POST /v1/conversations/:id/messages` with `kind: 'text' | 'photo' | 'voice'`. See the story specs (5.2, 5.3, 5.4)
 * for the order of the checks. Every kind goes through the same closed check, Block check and cap seam, and nothing
 * (no object, no `photo_asset`, no `message`, no scan job) is written when one refuses.
 */
export async function sendMessage(
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
  const parsed = readSend(body)
  if (!parsed.ok) {
    return parsed
  }
  const input = parsed.input
  if (found.row.ended_at !== null || found.row.paused_by !== null || (await getTrustPort().blockedBetween(me, found.otherId))) {
    return fail(409, 'UNHANDLED', CLOSED_MESSAGE, { reason: 'conversation_closed' })
  }
  const other = await loadAccount(found.otherId)
  const otherProfile = other ? await getProfileStore().read(other.id) : null
  if (!other || !other.roles.includes('member') || !otherProfile || !isListableProfile(otherProfile.visibility, other.status)) {
    return fail(409, 'UNHANDLED', OTHER_UNAVAILABLE_MESSAGE, { reason: 'other_unavailable' })
  }
  const now = authNow()
  const cap = await checkMessageCap({ senderId: me, kind: input.kind, now })
  if (!cap.allowed) {
    return fail(429, 'MESSAGE_CAP_EXCEEDED', MESSAGE_CAP_MESSAGE, { cap: cap.cap, resets_at: cap.resets_at })
  }
  const key = readChatKey()
  if (!key) {
    return fail(503, 'UNHANDLED', KEY_MISSING_MESSAGE, null, true)
  }
  // Media first (owned by the media module), then the message row that points at it. A storage failure stores no
  // message and enqueues nothing; at worst an unreferenced object is left behind.
  let mediaId: string | null = null
  try {
    if (input.kind === 'photo') {
      mediaId = await storeChatPhoto(getMediaStore(), me, input.photo)
    } else if (input.kind === 'voice') {
      mediaId = await storeVoiceNote(getMediaStore(), me, input.voice)
    }
  } catch (error) {
    if (error instanceof MediaStorageError) {
      return fail(503, 'UNHANDLED', KEY_MISSING_MESSAGE, null, true)
    }
    throw error
  }
  const messageId = newId(now)
  const sealed =
    input.kind === 'text'
      ? input.text
      : JSON.stringify(
          input.kind === 'photo'
            ? { w: input.photo.width, h: input.photo.height }
            : { d: input.voice.durationMs, l: input.voice.language },
        )
  const row: StoredMessage = {
    id: messageId,
    conversation_id: found.row.id,
    sender_id: me,
    kind: input.kind,
    state: 'delivered',
    body: sealChatText(sealed, key, found.row.id, messageId),
    media_id: mediaId,
    created_at: now.toISOString(),
  }
  await getMessageStore().insert(row)
  try {
    events?.messageDelivered({ conversationId: row.conversation_id, messageId, senderId: me, recipients: [me, found.otherId] })
  } catch {
    // Realtime is best effort; the reader catches up over HTTP.
  }
  const payload: ScanPayload =
    input.kind === 'text'
      ? { kind: 'text', text: input.text }
      : input.kind === 'photo'
        ? { kind: 'photo', mediaId: mediaId ?? '', contentType: input.photo.contentType }
        : {
            kind: 'voice',
            mediaId: mediaId ?? '',
            contentType: input.voice.contentType,
            durationMs: input.voice.durationMs,
            language: input.voice.language,
          }
  await enqueueAfterPersist({ itemId: messageId, accountId: me, payload })
  const item = input.kind === 'text' ? { ...present(row, me), text: input.text } : await presentFull(row, me)
  return { ok: true, body: { message: item } }
}

/**
 * `GET /v1/conversations/:id/messages/:messageId/media`: a fresh signed URL, for the caller only, to the clear Chat
 * Photo (`md`) or the Voice note audio. Participants only; a conversation that is closed or blocked stays readable,
 * like its texts. Any other id is a 404. Never the stored original.
 */
export async function mediaAccess(
  session: ResolvedSession,
  id: unknown,
  messageId: unknown,
): Promise<{ ok: true; body: { url: string; expires_at: string } } | ChatFailure> {
  const gate = await assertBrowseViewer(session)
  if (!gate.ok) {
    return fromViewer(gate)
  }
  const found = await participantConversation(gate.account.id, id)
  if (!found) {
    return notFound()
  }
  const missing = () => fail(404, 'NOT_FOUND', MEDIA_MISSING_MESSAGE, null)
  if (typeof messageId !== 'string' || !isUuidV7(messageId)) {
    return missing()
  }
  const row = await getMessageStore().find(messageId)
  if (!row || row.conversation_id !== found.row.id || row.kind === 'text' || !row.media_id) {
    return missing()
  }
  const signed = await signChatMedia(getMediaStore(), row.media_id, 'clear', gate.account.id)
  if (!signed.ok) {
    return signed.status === 503 ? fail(503, 'UNHANDLED', signed.message, null, true) : missing()
  }
  return { ok: true, body: { url: signed.url, expires_at: signed.expires_at } }
}

/** Typing relay check: the viewer may type in this conversation. Returns the other member, or null. */
export async function typingTarget(session: ResolvedSession, conversationId: unknown): Promise<string | null> {
  const gate = await assertBrowseViewer(session)
  if (!gate.ok) {
    return null
  }
  const found = await participantConversation(gate.account.id, conversationId)
  if (!found || (await getTrustPort().blockedBetween(gate.account.id, found.otherId))) {
    return null
  }
  return found.otherId
}

/** A message the viewer may Report (Story 8.5): in one of their conversations and sent by the other member. */
export type ReportableMessage = { messageId: string; conversationId: string; senderId: string }

export async function messageForReport(viewerId: string, messageId: string): Promise<ReportableMessage | null> {
  if (!isUuidV7(messageId)) {
    return null
  }
  const row = await getMessageStore().find(messageId)
  if (!row || row.sender_id === viewerId) {
    return null
  }
  const found = await participantConversation(viewerId, row.conversation_id)
  if (!found || found.otherId !== row.sender_id) {
    return null
  }
  return { messageId: row.id, conversationId: row.conversation_id, senderId: row.sender_id }
}
