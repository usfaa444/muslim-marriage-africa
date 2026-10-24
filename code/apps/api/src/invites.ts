import { civilDayOuagadougou, isUuidV7, newId, toOuagadougouDisplay } from '@ankanu/kernel'
import type { BillingAnswer, OpenedConversation } from '@ankanu/ports'
import { and, count, desc, eq, gte, or, sql } from 'drizzle-orm'
import { invite, inviteQuota } from './account-schema.js'
import { accountStoreIsMemory, getIdentityDatabase } from './account-store.js'
import { authNow } from './auth-clock.js'
import { getBillingPort } from './billing-port.js'
import { getChatPort } from './chat.js'
import { ageOn } from './create-account.js'
import { discoveryPhoto, signMedia } from './media.js'
import { getMediaStore } from './media-store.js'
import {
  DEFAULT_SISTER_REACH_MODE,
  free_unlimited,
  operatorConfig,
  same_quota_as_brothers,
  type SisterReachMode,
} from './operator-config.js'
import { completenessFor } from './profile-fields.js'
import { isListableProfile } from './profile-review.js'
import { getProfileStore } from './profile-store.js'
import {
  assertBrowseViewer,
  loadAccount,
  PROFILE_UNAVAILABLE,
  verificationFlags,
  type BrowseViewer,
  type PublicDetails,
  type PublicProfileFailure,
} from './public-profile.js'
import type { ResolvedSession } from './session-store.js'
import { getTrustPort } from './trust-port.js'

export const TO_ID_MESSAGE = 'to_id : valeur non reconnue.'
export const BOX_MESSAGE = 'box : valeur non reconnue.'
export const PHOTO_REQUIRED_MESSAGE = 'Ajoutez une photo de profil pour envoyer une invitation.'
export const PROFILE_INCOMPLETE_MESSAGE = 'Complétez votre profil pour envoyer une invitation.'
export const QUOTA_EXCEEDED_MESSAGE = 'Envoi refusé. Quota du jour atteint.'
export const INVITE_MISSING_MESSAGE = "Cette invitation n'existe pas."
export const NOT_RECIPIENT_MESSAGE = 'Seule la personne invitée peut répondre à cette invitation.'
export const NOT_PENDING_MESSAGE = "Cette invitation n'est plus en attente."
export const DECLINED_RESEND_MESSAGE = "Vous ne pouvez plus envoyer d'invitation à ce profil."
export const INVITE_RECEIVED_MESSAGE = 'Cette personne vous a déjà invité. Répondez à son invitation.'

export type InviteBox = 'received' | 'sent' | 'accepted'

/** One invite row. `id` is UUID v7, so it carries the send instant. */
export type InviteRow = {
  id: string
  from_id: string
  to_id: string
  state: 'pending' | 'accepted' | 'declined'
  created_at: string
}

/** Present when the send counts toward `invite_quota`. `cap` null means Premium unlimited (count, never refuse). */
export type QuotaCharge = {
  day: string
  cap: number | null
}

export type SendOutcome =
  | { ok: true; row: InviteRow; sentCount: number | null }
  | { ok: false; reason: 'quota' }
  | { ok: false; reason: 'duplicate'; row: InviteRow }

/**
 * Result of an accept or decline. `changed` is false when the invite already had the asked state (double tap).
 * `conversation` is set on accept only.
 */
export type DecideOutcome =
  | { ok: true; row: InviteRow; changed: boolean; conversation: OpenedConversation | null }
  | { ok: false; reason: 'missing' }
  | { ok: false; reason: 'not_pending'; row: InviteRow }

export type InviteStore = {
  findPending(fromId: string, toId: string): Promise<InviteRow | null>
  find(id: string): Promise<InviteRow | null>
  /** Every invite between two members, in either direction. */
  between(left: string, right: string): Promise<InviteRow[]>
  quotaCount(accountId: string, day: string): Promise<number>
  /** One unit of work: guarded quota increment, then the invite. Either both are stored or neither. */
  send(row: InviteRow, charge: QuotaCharge | null): Promise<SendOutcome>
  list(accountId: string, box: InviteBox): Promise<InviteRow[]>
  countSentSince(accountId: string, since: Date): Promise<number>
  /**
   * One unit of work: the guarded `pending -> accepted` update by the recipient, then `ChatPort.openFromInvite` in the
   * same transaction. An invite already accepted returns its conversation. Never writes `invite_quota`.
   */
  accept(id: string, recipientId: string, sisterAcceptedAt: string, now: Date): Promise<DecideOutcome>
  /** Guarded `pending -> declined` by the recipient. No conversation, no quota refund. */
  decline(id: string, recipientId: string): Promise<DecideOutcome>
}

function inBox(row: InviteRow, accountId: string, box: InviteBox): boolean {
  if (box === 'received') {
    return row.to_id === accountId
  }
  if (box === 'sent') {
    return row.from_id === accountId
  }
  return row.state === 'accepted' && (row.from_id === accountId || row.to_id === accountId)
}

type QuotaRow = { account_id: string; civil_day_ouaga: string; sent_count: number }

/** Lowest UUID v7 for an instant: every id minted at or after `since` sorts at or above it. */
export function uuidV7Floor(since: Date): string {
  const hex = since.getTime().toString(16).padStart(12, '0')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-7000-8000-000000000000`
}

export function memoryInviteStore(): InviteStore & { rows: InviteRow[]; quota: QuotaRow[]; sisterAcceptedAt: Map<string, string> } {
  const rows: InviteRow[] = []
  const quota: QuotaRow[] = []
  const sisterAcceptedAt = new Map<string, string>()
  return {
    rows,
    quota,
    sisterAcceptedAt,
    async findPending(fromId, toId) {
      return rows.find((row) => row.from_id === fromId && row.to_id === toId && row.state === 'pending') ?? null
    },
    async find(id) {
      return rows.find((row) => row.id === id) ?? null
    },
    async between(left, right) {
      return rows.filter(
        (row) => (row.from_id === left && row.to_id === right) || (row.from_id === right && row.to_id === left),
      )
    },
    async quotaCount(accountId, day) {
      return quota.find((row) => row.account_id === accountId && row.civil_day_ouaga === day)?.sent_count ?? 0
    },
    async send(row, charge) {
      const existing = await this.findPending(row.from_id, row.to_id)
      if (existing) {
        return { ok: false, reason: 'duplicate', row: existing }
      }
      let sentCount: number | null = null
      if (charge) {
        const current = quota.find((item) => item.account_id === row.from_id && item.civil_day_ouaga === charge.day)
        const used = current?.sent_count ?? 0
        if (charge.cap !== null && used >= charge.cap) {
          return { ok: false, reason: 'quota' }
        }
        if (current) {
          current.sent_count = used + 1
        } else {
          quota.push({ account_id: row.from_id, civil_day_ouaga: charge.day, sent_count: 1 })
        }
        sentCount = used + 1
      }
      rows.push(row)
      return { ok: true, row, sentCount }
    },
    async list(accountId, box) {
      return rows
        .filter((row) => inBox(row, accountId, box))
        .sort((left, right) => right.id.localeCompare(left.id))
        .slice(0, 200)
    },
    async countSentSince(accountId, since) {
      const floor = uuidV7Floor(since)
      return rows.filter((row) => row.from_id === accountId && row.id >= floor).length
    },
    async accept(id, recipientId, acceptedAt, now) {
      const row = rows.find((item) => item.id === id && item.to_id === recipientId)
      if (!row) {
        return { ok: false, reason: 'missing' }
      }
      if (row.state === 'declined') {
        return { ok: false, reason: 'not_pending', row: { ...row } }
      }
      const changed = row.state === 'pending'
      if (changed) {
        row.state = 'accepted'
        sisterAcceptedAt.set(row.id, acceptedAt)
      }
      const conversation = await getChatPort().openFromInvite(null, { inviteId: row.id, now })
      return { ok: true, row: { ...row }, changed, conversation }
    },
    async decline(id, recipientId) {
      const row = rows.find((item) => item.id === id && item.to_id === recipientId)
      if (!row) {
        return { ok: false, reason: 'missing' }
      }
      if (row.state === 'accepted') {
        return { ok: false, reason: 'not_pending', row: { ...row } }
      }
      const changed = row.state === 'pending'
      row.state = 'declined'
      return { ok: true, row: { ...row }, changed, conversation: null }
    },
  }
}

class QuotaRefused extends Error {}
class PendingExists extends Error {}

function toRow(value: { id: string; from_id: string; to_id: string; state: string; created_at: string }): InviteRow {
  const state = value.state === 'accepted' || value.state === 'declined' ? value.state : 'pending'
  return { id: value.id, from_id: value.from_id, to_id: value.to_id, state, created_at: new Date(value.created_at).toISOString() }
}

function postgresInviteStore(): InviteStore {
  const columns = {
    id: invite.id,
    from_id: invite.from_id,
    to_id: invite.to_id,
    state: invite.state,
    created_at: invite.created_at,
  }
  return {
    async findPending(fromId, toId) {
      const found = await getIdentityDatabase()
        .select(columns)
        .from(invite)
        .where(and(eq(invite.from_id, fromId), eq(invite.to_id, toId), eq(invite.state, 'pending')))
        .limit(1)
      return found[0] ? toRow(found[0]) : null
    },
    async find(id) {
      const found = await getIdentityDatabase().select(columns).from(invite).where(eq(invite.id, id)).limit(1)
      return found[0] ? toRow(found[0]) : null
    },
    async between(left, right) {
      const found = await getIdentityDatabase()
        .select(columns)
        .from(invite)
        .where(
          or(
            and(eq(invite.from_id, left), eq(invite.to_id, right)),
            and(eq(invite.from_id, right), eq(invite.to_id, left)),
          ),
        )
      return found.map(toRow)
    },
    async quotaCount(accountId, day) {
      const found = await getIdentityDatabase()
        .select({ sent_count: inviteQuota.sent_count })
        .from(inviteQuota)
        .where(and(eq(inviteQuota.account_id, accountId), eq(inviteQuota.civil_day_ouaga, day)))
        .limit(1)
      return found[0]?.sent_count ?? 0
    },
    async send(row, charge) {
      try {
        return await getIdentityDatabase().transaction(async (tx) => {
          let sentCount: number | null = null
          if (charge) {
            if (charge.cap !== null && charge.cap < 1) {
              throw new QuotaRefused()
            }
            const counted = await tx
              .insert(inviteQuota)
              .values({ account_id: row.from_id, civil_day_ouaga: charge.day, sent_count: 1 })
              .onConflictDoUpdate({
                target: [inviteQuota.account_id, inviteQuota.civil_day_ouaga],
                set: { sent_count: sql`${inviteQuota.sent_count} + 1` },
                ...(charge.cap === null ? {} : { setWhere: sql`${inviteQuota.sent_count} < ${charge.cap}` }),
              })
              .returning({ sent_count: inviteQuota.sent_count })
            if (!counted[0]) {
              throw new QuotaRefused()
            }
            sentCount = counted[0].sent_count
          }
          const inserted = await tx.insert(invite).values(row).onConflictDoNothing().returning(columns)
          if (!inserted[0]) {
            throw new PendingExists()
          }
          return { ok: true as const, row: toRow(inserted[0]), sentCount }
        })
      } catch (error) {
        if (error instanceof QuotaRefused) {
          return { ok: false, reason: 'quota' }
        }
        if (error instanceof PendingExists) {
          const existing = await this.findPending(row.from_id, row.to_id)
          if (existing) {
            return { ok: false, reason: 'duplicate', row: existing }
          }
        }
        throw error
      }
    },
    async list(accountId, box) {
      const where =
        box === 'received'
          ? eq(invite.to_id, accountId)
          : box === 'sent'
            ? eq(invite.from_id, accountId)
            : and(eq(invite.state, 'accepted'), or(eq(invite.from_id, accountId), eq(invite.to_id, accountId)))
      const found = await getIdentityDatabase().select(columns).from(invite).where(where).orderBy(desc(invite.id)).limit(200)
      return found.map(toRow)
    },
    async accept(id, recipientId, acceptedAt, now) {
      return getIdentityDatabase().transaction(async (tx) => {
        const updated = await tx
          .update(invite)
          .set({ state: 'accepted', sister_accepted_at: acceptedAt })
          .where(and(eq(invite.id, id), eq(invite.to_id, recipientId), eq(invite.state, 'pending')))
          .returning(columns)
        let row = updated[0] ? toRow(updated[0]) : null
        const changed = row !== null
        if (!row) {
          const found = await tx
            .select(columns)
            .from(invite)
            .where(and(eq(invite.id, id), eq(invite.to_id, recipientId)))
            .for('update')
            .limit(1)
          if (!found[0]) {
            return { ok: false as const, reason: 'missing' as const }
          }
          row = toRow(found[0])
          if (row.state !== 'accepted') {
            return { ok: false as const, reason: 'not_pending' as const, row }
          }
        }
        const conversation = await getChatPort().openFromInvite(tx, { inviteId: row.id, now })
        return { ok: true as const, row, changed, conversation }
      })
    },
    async decline(id, recipientId) {
      const db = getIdentityDatabase()
      const updated = await db
        .update(invite)
        .set({ state: 'declined' })
        .where(and(eq(invite.id, id), eq(invite.to_id, recipientId), eq(invite.state, 'pending')))
        .returning(columns)
      if (updated[0]) {
        return { ok: true, row: toRow(updated[0]), changed: true, conversation: null }
      }
      const found = await db
        .select(columns)
        .from(invite)
        .where(and(eq(invite.id, id), eq(invite.to_id, recipientId)))
        .limit(1)
      if (!found[0]) {
        return { ok: false, reason: 'missing' }
      }
      const row = toRow(found[0])
      if (row.state === 'declined') {
        return { ok: true, row, changed: false, conversation: null }
      }
      return { ok: false, reason: 'not_pending', row }
    },
    async countSentSince(accountId, since) {
      const found = await getIdentityDatabase()
        .select({ value: count() })
        .from(invite)
        .where(and(eq(invite.from_id, accountId), gte(invite.id, uuidV7Floor(since))))
      return Number(found[0]?.value ?? 0)
    },
  }
}

let override: InviteStore | undefined
let memoryFallback: ReturnType<typeof memoryInviteStore> | undefined

export function setInviteStore(store: InviteStore | undefined): void {
  override = store
}

/** The override, else memory beside a memory account store (tests), else Postgres. */
export function getInviteStore(): InviteStore {
  if (override) {
    return override
  }
  if (accountStoreIsMemory()) {
    memoryFallback ??= memoryInviteStore()
    return memoryFallback
  }
  return postgresInviteStore()
}

/** Live operator values for Invite reach. Read on every send and quota read (AD-27: no process cache). */
export type InviteConfig = {
  sisterReachMode: SisterReachMode
  freeCap: number
  /** Null is `unlimited`. */
  premiumCap: number | null
}

let configReader: (() => Promise<InviteConfig | null>) | undefined

export function setInviteConfigReader(next: (() => Promise<InviteConfig | null>) | undefined): void {
  configReader = next
}

function parseCap(raw: string | undefined, allowUnlimited: boolean): number | null | undefined {
  if (raw === undefined) {
    return undefined
  }
  if (allowUnlimited && raw === 'unlimited') {
    return null
  }
  if (!/^(0|[1-9]\d*)$/.test(raw)) {
    return undefined
  }
  const parsed = Number(raw)
  return Number.isSafeInteger(parsed) ? parsed : undefined
}

/** Null when a cap row is missing or broken: that is a 500, never a free pass. */
export async function readInviteConfig(): Promise<InviteConfig | null> {
  if (configReader) {
    return configReader()
  }
  if (!process.env['DATABASE_URL']) {
    return { sisterReachMode: DEFAULT_SISTER_REACH_MODE, freeCap: 3, premiumCap: null }
  }
  const found = await getIdentityDatabase()
    .select({ key: operatorConfig.key, value: operatorConfig.value })
    .from(operatorConfig)
    .where(sql`${operatorConfig.key} in ('sister_reach_mode', 'brother_invite_quota_free', 'brother_invite_quota_premium')`)
  const values = new Map(found.map((row) => [row.key, row.value]))
  const mode = values.get('sister_reach_mode')
  const sisterReachMode: SisterReachMode | undefined =
    mode === undefined ? DEFAULT_SISTER_REACH_MODE : mode === free_unlimited || mode === same_quota_as_brothers ? mode : undefined
  const freeCap = parseCap(values.get('brother_invite_quota_free'), false)
  const premiumCap = parseCap(values.get('brother_invite_quota_premium'), true)
  if (sisterReachMode === undefined || freeCap === undefined || freeCap === null || premiumCap === undefined) {
    return null
  }
  return { sisterReachMode, freeCap, premiumCap }
}

export type QuotaBody =
  | { capped: false; sister_reach_mode: typeof free_unlimited }
  | { capped: false; unlimited: true; sister_reach_mode?: typeof same_quota_as_brothers }
  | { capped: true; cap: number; remaining: number; resets_at: string; sister_reach_mode?: typeof same_quota_as_brothers }

type QuotaState = { body: QuotaBody; charge: QuotaCharge | null }

/** Next Africa/Ouagadougou midnight, as a UTC ISO instant. */
export function nextOuagadougouMidnight(now: Date): string {
  const day = civilDayOuagadougou(now)
  const offset = /([+-])(\d{2}):(\d{2})$/.exec(toOuagadougouDisplay(now))
  const [year, month, date] = day.split('-').map(Number)
  const sign = offset?.[1] === '-' ? -1 : 1
  const minutes = offset ? Number(offset[2]) * 60 + Number(offset[3]) : 0
  const midnight = Date.UTC(year ?? 1970, (month ?? 1) - 1, (date ?? 1) + 1) - sign * minutes * 60_000
  return new Date(midnight).toISOString()
}

async function entitlement(accountId: string): Promise<BillingAnswer> {
  try {
    return await getBillingPort().isEntitled(accountId)
  } catch {
    return 'unavailable'
  }
}

/**
 * AD-27 predicate, one for send and read. A Sister in `free_unlimited` never reaches BillingPort. Everyone else is
 * quota-class: live `isEntitled`, where `false` and `unavailable` both mean the Free cap.
 */
async function quotaState(sender: BrowseViewer, config: InviteConfig, now: Date): Promise<QuotaState> {
  if (sender.gender === 'sister' && config.sisterReachMode === free_unlimited) {
    return { body: { capped: false, sister_reach_mode: free_unlimited }, charge: null }
  }
  const mode: { sister_reach_mode?: typeof same_quota_as_brothers } =
    sender.gender === 'sister' ? { sister_reach_mode: same_quota_as_brothers } : {}
  const day = civilDayOuagadougou(now)
  const entitled = (await entitlement(sender.id)) === true
  const cap = entitled ? config.premiumCap : config.freeCap
  if (cap === null) {
    return { body: { capped: false, unlimited: true, ...mode }, charge: { day, cap: null } }
  }
  const used = await getInviteStore().quotaCount(sender.id, day)
  return {
    body: { capped: true, cap, remaining: Math.max(0, cap - used), resets_at: nextOuagadougouMidnight(now), ...mode },
    charge: { day, cap },
  }
}

function afterSend(state: QuotaState, sentCount: number | null): QuotaBody {
  const body = state.body
  if (body.capped && sentCount !== null) {
    return { ...body, remaining: Math.max(0, body.cap - sentCount) }
  }
  return body
}

export type InviteFailure = {
  ok: false
  status: 400 | 403 | 404 | 409 | 429 | 500
  code: 'UNHANDLED' | 'FORBIDDEN' | 'NOT_FOUND' | 'QUOTA_EXCEEDED'
  message: string
  details:
    | PublicDetails
    | { reason: string; missing?: string[]; cap?: number; remaining?: number; resets_at?: string; state?: string }
  retryable: boolean
}

function fail(
  status: InviteFailure['status'],
  code: InviteFailure['code'],
  message: string,
  details: InviteFailure['details'],
  retryable = false,
): InviteFailure {
  return { ok: false, status, code, message, details, retryable }
}

function fromViewer(error: PublicProfileFailure): InviteFailure {
  if (error.status === 403 && error.code === 'FORBIDDEN') {
    return fail(403, 'FORBIDDEN', error.message, error.details)
  }
  return fail(500, 'UNHANDLED', 'Request failed', null)
}

type Readiness = { photo: boolean; profile_ready: boolean; missing: string[] }

/** FR-016 and FR-038: a live MAIN Profile Photo and the Invite-ready fields. */
async function senderReadiness(sender: BrowseViewer): Promise<Readiness> {
  const mains = await getMediaStore().liveMainProfilePhotos([sender.id])
  const photo = discoveryPhoto(mains.find((asset) => asset.owner_id === sender.id) ?? null) !== null
  const profile = await getProfileStore().read(sender.id)
  const completeness = profile ? completenessFor(profile, sender.gender) : { ready: false, missing: [] as string[] }
  return { photo, profile_ready: completeness.ready, missing: completeness.missing }
}

/** Opposite gender, member, Active account, public profile. Every other target is the same 404. */
async function eligibleRecipient(sender: BrowseViewer, toId: string): Promise<BrowseViewer | null> {
  const target = await loadAccount(toId)
  if (!target || !target.roles.includes('member') || target.gender === sender.gender) {
    return null
  }
  const profile = await getProfileStore().read(toId)
  if (!profile || !isListableProfile(profile.visibility, target.status)) {
    return null
  }
  return target
}

function readToId(body: unknown): string | null {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return null
  }
  const value = (body as { to_id?: unknown }).to_id
  return typeof value === 'string' && isUuidV7(value) ? value : null
}

export type InviteView = {
  id: string
  to_id: string
  state: InviteRow['state']
  created_at: string
}

export type SendBody = { invite: InviteView; quota: QuotaBody }

function view(row: InviteRow): InviteView {
  return { id: row.id, to_id: row.to_id, state: row.state, created_at: row.created_at }
}

function quotaExceeded(body: QuotaBody, now: Date, cap: number | null): InviteFailure {
  const limit = body.capped ? body.cap : cap ?? 0
  return fail(429, 'QUOTA_EXCEEDED', QUOTA_EXCEEDED_MESSAGE, {
    reason: 'invite_quota',
    cap: limit,
    remaining: 0,
    resets_at: nextOuagadougouMidnight(now),
  })
}

/** `POST /v1/invites`. Nothing is written unless every check passes. */
export async function sendInvite(
  session: ResolvedSession,
  body: unknown,
): Promise<{ ok: true; status: 200 | 201; body: SendBody } | InviteFailure> {
  const gate = await assertBrowseViewer(session)
  if (!gate.ok) {
    return fromViewer(gate)
  }
  const sender = gate.account
  const toId = readToId(body)
  if (toId === null || toId === sender.id) {
    return fail(400, 'UNHANDLED', TO_ID_MESSAGE, { field: 'to_id' })
  }
  const ready = await senderReadiness(sender)
  if (!ready.photo) {
    return fail(403, 'FORBIDDEN', PHOTO_REQUIRED_MESSAGE, { reason: 'photo_required' })
  }
  if (!ready.profile_ready) {
    return fail(403, 'FORBIDDEN', PROFILE_INCOMPLETE_MESSAGE, { reason: 'profile_incomplete', missing: ready.missing })
  }
  const recipient = await eligibleRecipient(sender, toId)
  // A Block either way (Story 8.6) is the same 404 as any unavailable profile: nothing says who blocked whom.
  if (!recipient || (await getTrustPort().blockedBetween(sender.id, recipient.id))) {
    return fail(404, 'NOT_FOUND', PROFILE_UNAVAILABLE, null)
  }
  const config = await readInviteConfig()
  if (!config) {
    return fail(500, 'UNHANDLED', 'Request failed', null)
  }
  const now = authNow()
  const history = await getInviteStore().between(sender.id, recipient.id)
  const state = await quotaState(sender, config, now)
  // Already pending from me, or already connected either way: the same invite again, no new row, no quota.
  const existing =
    history.find((row) => row.from_id === sender.id && row.state === 'pending') ?? history.find((row) => row.state === 'accepted')
  if (existing) {
    return { ok: true, status: 200, body: { invite: view(existing), quota: state.body } }
  }
  // FR-043: after a decline the same sender cannot invite that recipient again. Checked before the quota.
  if (history.some((row) => row.from_id === sender.id && row.state === 'declined')) {
    return fail(403, 'FORBIDDEN', DECLINED_RESEND_MESSAGE, { reason: 'invite_declined' })
  }
  // A pending invite from the recipient: answer it instead, so two crossing invites never open two conversations.
  if (history.some((row) => row.from_id === recipient.id && row.state === 'pending')) {
    return fail(409, 'UNHANDLED', INVITE_RECEIVED_MESSAGE, { reason: 'invite_received' })
  }
  if (state.body.capped && state.body.remaining <= 0) {
    return quotaExceeded(state.body, now, state.charge?.cap ?? null)
  }
  const row: InviteRow = {
    id: newId(now),
    from_id: sender.id,
    to_id: recipient.id,
    state: 'pending',
    created_at: now.toISOString(),
  }
  const saved = await getInviteStore().send(row, state.charge)
  if (!saved.ok) {
    if (saved.reason === 'duplicate') {
      return { ok: true, status: 200, body: { invite: view(saved.row), quota: state.body } }
    }
    return quotaExceeded(state.body, now, state.charge?.cap ?? null)
  }
  tellInvite(saved.row.id, [recipient.id])
  return { ok: true, status: 201, body: { invite: view(saved.row), quota: afterSend(state, saved.sentCount) } }
}

export type QuotaReadBody = QuotaBody & { sender: { photo: boolean; profile_ready: boolean } }

/** `GET /v1/invites/quota`. Same predicate as send, plus the sender's photo and field readiness. */
export async function readInviteQuota(
  session: ResolvedSession,
): Promise<{ ok: true; body: QuotaReadBody } | InviteFailure> {
  const gate = await assertBrowseViewer(session)
  if (!gate.ok) {
    return fromViewer(gate)
  }
  const config = await readInviteConfig()
  if (!config) {
    return fail(500, 'UNHANDLED', 'Request failed', null)
  }
  const ready = await senderReadiness(gate.account)
  const state = await quotaState(gate.account, config, authNow())
  return { ok: true, body: { ...state.body, sender: { photo: ready.photo, profile_ready: ready.profile_ready } } }
}

/** The other member as the inbox shows them. Field values only while their profile is listable. */
export type InviteOther =
  | {
      available: true
      age: number | null
      city: string | null
      marital_status: string | null
      polygamy_intent: string | null
      verified: boolean
      photo: { id: string; url: string } | null
    }
  | { available: false }

export type InviteListItem = {
  id: string
  state: InviteRow['state']
  created_at: string
  direction: 'received' | 'sent'
  from_id?: string
  to_id?: string
  other_id: string
  pseudonym: string | null
  conversation_id: string | null
  other: InviteOther
}

/**
 * Before accept, a Sister sees his marital status and polygamy intent (FR-037). The photo is always the blur
 * derivative. No read time, decision time or `sister_accepted_at` is ever exposed (FR-042, no read receipt).
 */
async function presentOther(viewerId: string, other: BrowseViewer | null, blocked = false): Promise<InviteOther> {
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
  return {
    available: true,
    age: ageOn(profile.dob, authNow()),
    city: profile.city,
    marital_status: profile.marital_status,
    polygamy_intent: profile.polygamy_intent,
    verified: verification.id,
    photo,
  }
}

/**
 * Story chat-polish (bottom nav badges): realtime seam, registered by `chat-realtime.ts`. `invite.changed` (ids only)
 * goes to the recipient of an invite that arrived, and to the recipient's own sockets after her accept or decline, so
 * the « Invitations » badge stays right on every screen. Never to the sender of a declined invite (decline is quiet).
 */
export type InviteEvents = { inviteChanged(input: { inviteId: string; recipients: readonly string[] }): void }

let inviteEvents: InviteEvents | undefined

export function setInviteEvents(next: InviteEvents | undefined): void {
  inviteEvents = next
}

function tellInvite(inviteId: string, recipients: readonly string[]): void {
  try {
    inviteEvents?.inviteChanged({ inviteId, recipients })
  } catch {
    // Realtime is best effort; the badge reloads on focus and on the next page.
  }
}

/** The « Invitations » badge: invites received and still pending, from members not hidden by a Block. */
export async function pendingReceivedCount(me: string): Promise<number> {
  const rows = await getInviteStore().list(me, 'received')
  const hidden = new Set(await getTrustPort().hiddenFor(me))
  return rows.filter((row) => row.to_id === me && row.state === 'pending' && !hidden.has(row.from_id)).length
}

/** `GET /v1/invites?box=received|sent|accepted`. Own rows only. No BillingPort. */
export async function listInvites(
  session: ResolvedSession,
  boxParam: unknown,
): Promise<{ ok: true; body: { box: InviteBox; count: number; items: InviteListItem[] } } | InviteFailure> {
  const gate = await assertBrowseViewer(session)
  if (!gate.ok) {
    return fromViewer(gate)
  }
  const box = boxParam === undefined || boxParam === '' ? 'received' : boxParam
  if (box !== 'received' && box !== 'sent' && box !== 'accepted') {
    return fail(400, 'UNHANDLED', BOX_MESSAGE, { field: 'box' })
  }
  const me = gate.account.id
  const rows = await getInviteStore().list(me, box)
  const accepted = rows.filter((row) => row.state === 'accepted').map((row) => row.id)
  const conversations = new Map(
    (await getChatPort().conversationsForInvites(accepted)).map((item) => [item.invite_id, item.id]),
  )
  const hidden = new Set(await getTrustPort().hiddenFor(me))
  const items: InviteListItem[] = []
  for (const row of rows) {
    const direction = row.to_id === me ? 'received' : 'sent'
    const otherId = direction === 'received' ? row.from_id : row.to_id
    const other = await loadAccount(otherId)
    items.push({
      id: row.id,
      state: row.state,
      created_at: row.created_at,
      direction,
      ...(direction === 'received' ? { from_id: row.from_id } : { to_id: row.to_id }),
      other_id: otherId,
      pseudonym: other?.pseudonym ?? null,
      conversation_id: conversations.get(row.id) ?? null,
      other: await presentOther(me, other, hidden.has(otherId)),
    })
  }
  return { ok: true, body: { box, count: items.length, items } }
}

export type DecisionBody = {
  invite: { id: string; state: InviteRow['state']; created_at: string }
  conversation?: { id: string; stage: OpenedConversation['stage'] }
}

type Decision = { ok: true; body: DecisionBody } | InviteFailure

/** Steps shared by accept and decline: viewer gate, then the invite seen by its recipient only. */
async function recipientInvite(
  session: ResolvedSession,
  id: unknown,
): Promise<{ ok: true; viewer: BrowseViewer; row: InviteRow } | InviteFailure> {
  const gate = await assertBrowseViewer(session)
  if (!gate.ok) {
    return fromViewer(gate)
  }
  const row = typeof id === 'string' && isUuidV7(id) ? await getInviteStore().find(id) : null
  if (!row || (row.from_id !== gate.account.id && row.to_id !== gate.account.id)) {
    return fail(404, 'NOT_FOUND', INVITE_MISSING_MESSAGE, null)
  }
  if (row.to_id !== gate.account.id) {
    return fail(403, 'FORBIDDEN', NOT_RECIPIENT_MESSAGE, { reason: 'not_recipient' })
  }
  return { ok: true, viewer: gate.account, row }
}

function notPending(row: InviteRow): InviteFailure {
  return fail(409, 'UNHANDLED', NOT_PENDING_MESSAGE, { reason: 'invite_not_pending', state: row.state })
}

function decided(row: InviteRow): DecisionBody['invite'] {
  return { id: row.id, state: row.state, created_at: row.created_at }
}

/**
 * `POST /v1/invites/:id/accept`. Recipient only. Her accept, or his accept of an invite she sent, is the Sister's
 * consent (FR-039): the invite becomes accepted and `ChatPort.openFromInvite` opens the conversation at stage `chat`
 * in the same transaction. No BillingPort, no `invite_quota` write.
 */
export async function acceptInvite(session: ResolvedSession, id: unknown): Promise<Decision> {
  const found = await recipientInvite(session, id)
  if (!found.ok) {
    return found
  }
  const { viewer, row } = found
  if (row.state === 'declined') {
    return notPending(row)
  }
  if (row.state === 'pending') {
    const sender = await loadAccount(row.from_id)
    const profile = sender ? await getProfileStore().read(sender.id) : null
    if (
      !sender ||
      !profile ||
      !sender.roles.includes('member') ||
      !isListableProfile(profile.visibility, sender.status) ||
      (await getTrustPort().blockedBetween(viewer.id, sender.id))
    ) {
      return fail(404, 'NOT_FOUND', PROFILE_UNAVAILABLE, null)
    }
  }
  const now = authNow()
  const sisterAcceptedAt = viewer.gender === 'sister' ? now.toISOString() : row.created_at
  const saved = await getInviteStore().accept(row.id, viewer.id, sisterAcceptedAt, now)
  if (!saved.ok) {
    return saved.reason === 'missing' ? fail(404, 'NOT_FOUND', INVITE_MISSING_MESSAGE, null) : notPending(saved.row)
  }
  const conversation = saved.conversation
  if (saved.changed) tellInvite(saved.row.id, [viewer.id])
  return {
    ok: true,
    body: {
      invite: decided(saved.row),
      ...(conversation ? { conversation: { id: conversation.id, stage: conversation.stage } } : {}),
    },
  }
}

/** `POST /v1/invites/:id/decline`. Recipient only. Quiet: no conversation, nothing sent to the sender, no refund. */
export async function declineInvite(session: ResolvedSession, id: unknown): Promise<Decision> {
  const found = await recipientInvite(session, id)
  if (!found.ok) {
    return found
  }
  if (found.row.state === 'accepted') {
    return notPending(found.row)
  }
  const saved = await getInviteStore().decline(found.row.id, found.viewer.id)
  if (!saved.ok) {
    return saved.reason === 'missing' ? fail(404, 'NOT_FOUND', INVITE_MISSING_MESSAGE, null) : notPending(saved.row)
  }
  tellInvite(saved.row.id, [found.viewer.id])
  return { ok: true, body: { invite: decided(saved.row) } }
}
