import { civilDayOuagadougou, isUuidV7, newId, toOuagadougouDisplay } from '@ankanu/kernel'
import type { BillingAnswer } from '@ankanu/ports'
import { and, count, desc, eq, gte, sql } from 'drizzle-orm'
import { invite, inviteQuota } from './account-schema.js'
import { accountStoreIsMemory, getIdentityDatabase } from './account-store.js'
import { authNow } from './auth-clock.js'
import { getBillingPort } from './billing-port.js'
import { discoveryPhoto } from './media.js'
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
  type BrowseViewer,
  type PublicDetails,
  type PublicProfileFailure,
} from './public-profile.js'
import type { ResolvedSession } from './session-store.js'

export const TO_ID_MESSAGE = 'to_id : valeur non reconnue.'
export const BOX_MESSAGE = 'box : valeur non reconnue.'
export const PHOTO_REQUIRED_MESSAGE = 'Ajoutez une photo de profil pour envoyer une invitation.'
export const PROFILE_INCOMPLETE_MESSAGE = 'Complétez votre profil pour envoyer une invitation.'
export const QUOTA_EXCEEDED_MESSAGE = 'Envoi refusé. Quota du jour atteint.'

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

export type InviteStore = {
  findPending(fromId: string, toId: string): Promise<InviteRow | null>
  quotaCount(accountId: string, day: string): Promise<number>
  /** One unit of work: guarded quota increment, then the invite. Either both are stored or neither. */
  send(row: InviteRow, charge: QuotaCharge | null): Promise<SendOutcome>
  list(accountId: string, box: 'received' | 'sent'): Promise<InviteRow[]>
  countSentSince(accountId: string, since: Date): Promise<number>
}

type QuotaRow = { account_id: string; civil_day_ouaga: string; sent_count: number }

/** Lowest UUID v7 for an instant: every id minted at or after `since` sorts at or above it. */
export function uuidV7Floor(since: Date): string {
  const hex = since.getTime().toString(16).padStart(12, '0')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-7000-8000-000000000000`
}

export function memoryInviteStore(): InviteStore & { rows: InviteRow[]; quota: QuotaRow[] } {
  const rows: InviteRow[] = []
  const quota: QuotaRow[] = []
  return {
    rows,
    quota,
    async findPending(fromId, toId) {
      return rows.find((row) => row.from_id === fromId && row.to_id === toId && row.state === 'pending') ?? null
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
        .filter((row) => (box === 'received' ? row.to_id === accountId : row.from_id === accountId))
        .sort((left, right) => right.id.localeCompare(left.id))
    },
    async countSentSince(accountId, since) {
      const floor = uuidV7Floor(since)
      return rows.filter((row) => row.from_id === accountId && row.id >= floor).length
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
      const found = await getIdentityDatabase()
        .select(columns)
        .from(invite)
        .where(box === 'received' ? eq(invite.to_id, accountId) : eq(invite.from_id, accountId))
        .orderBy(desc(invite.id))
        .limit(200)
      return found.map(toRow)
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
  status: 400 | 403 | 404 | 429 | 500
  code: 'UNHANDLED' | 'FORBIDDEN' | 'NOT_FOUND' | 'QUOTA_EXCEEDED'
  message: string
  details: PublicDetails | { reason: string; missing?: string[]; cap?: number; remaining?: number; resets_at?: string }
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
  if (!recipient) {
    return fail(404, 'NOT_FOUND', PROFILE_UNAVAILABLE, null)
  }
  const config = await readInviteConfig()
  if (!config) {
    return fail(500, 'UNHANDLED', 'Request failed', null)
  }
  const now = authNow()
  const state = await quotaState(sender, config, now)
  const pending = await getInviteStore().findPending(sender.id, recipient.id)
  if (pending) {
    return { ok: true, status: 200, body: { invite: view(pending), quota: state.body } }
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

export type InviteListItem = {
  id: string
  state: InviteRow['state']
  created_at: string
  from_id?: string
  to_id?: string
  pseudonym: string | null
}

/** `GET /v1/invites?box=received|sent`. Own rows only. The full inbox is Story 4.4. No BillingPort. */
export async function listInvites(
  session: ResolvedSession,
  boxParam: unknown,
): Promise<{ ok: true; body: { box: 'received' | 'sent'; count: number; items: InviteListItem[] } } | InviteFailure> {
  const gate = await assertBrowseViewer(session)
  if (!gate.ok) {
    return fromViewer(gate)
  }
  const box = boxParam === undefined || boxParam === '' ? 'received' : boxParam
  if (box !== 'received' && box !== 'sent') {
    return fail(400, 'UNHANDLED', BOX_MESSAGE, { field: 'box' })
  }
  const rows = await getInviteStore().list(gate.account.id, box)
  const items: InviteListItem[] = []
  for (const row of rows) {
    const otherId = box === 'received' ? row.from_id : row.to_id
    const other = await loadAccount(otherId)
    items.push({
      id: row.id,
      state: row.state,
      created_at: row.created_at,
      ...(box === 'received' ? { from_id: row.from_id } : { to_id: row.to_id }),
      pseudonym: other?.pseudonym ?? null,
    })
  }
  return { ok: true, body: { box, count: items.length, items } }
}
