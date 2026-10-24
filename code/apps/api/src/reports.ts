import { isReportReason, isUuidV7, newId, REPORT_DETAILS_MAX, type ReportReason, type ReportTargetKind } from '@ankanu/kernel'
import { authNow } from './auth-clock.js'
import { messageForReport } from './chat-messages.js'
import { discoveryPhoto, signMedia } from './media.js'
import { getMediaStore } from './media-store.js'
import {
  assertMemberViewer,
  loadAccount,
  PROFILE_UNAVAILABLE,
  type BrowseViewer,
  type PublicDetails,
  type PublicProfileFailure,
} from './public-profile.js'
import type { ResolvedSession } from './session-store.js'
import {
  getTrustStore,
  newReportIds,
  readReportRatePerHour,
  readReportSlaHours,
  type BlockRow,
} from './trust.js'

/**
 * Member Report and Block commands (Stories 8.5, 8.6). Safety paths: no BillingPort, no entitlement, no quota
 * (AD-21), and no listable-profile requirement on the viewer (`assertMemberViewer`): a member whose own profile is not
 * public can still Report, Block, see her Blocks and Unblock. Every target the viewer may not act on is one 404, so a refusal never says why a member is out of reach.
 */

export const TARGET_KIND_MESSAGE = 'target_kind : valeur non reconnue.'
export const TARGET_ID_MESSAGE = 'target_id : valeur non reconnue.'
export const REASON_MESSAGE = 'Choisissez un motif.'
export const DETAILS_MESSAGE = 'details : valeur non reconnue.'
export const DETAILS_LONG_MESSAGE = `Précisions trop longues (${REPORT_DETAILS_MAX} caractères au plus).`
export const BLOCK_FLAG_MESSAGE = 'block : valeur non reconnue.'
export const BLOCKED_ID_MESSAGE = 'blocked_id : valeur non reconnue.'
export const MESSAGE_MISSING = 'Ce message est introuvable.'
export const BLOCK_MISSING = "Ce blocage n'existe pas."
export const REPORT_RATE_MESSAGE = 'Trop de signalements en peu de temps. Réessayez plus tard.'

export type TrustFailure = {
  ok: false
  status: 400 | 403 | 404 | 429 | 500 | 503
  code: 'UNHANDLED' | 'FORBIDDEN' | 'NOT_FOUND' | 'RATE_LIMITED'
  message: string
  details: PublicDetails | { field: string; max?: number }
  retryable: boolean
}

function fail(
  status: TrustFailure['status'],
  code: TrustFailure['code'],
  message: string,
  details: TrustFailure['details'],
  retryable = false,
): TrustFailure {
  return { ok: false, status, code, message, details, retryable }
}

function fromViewer(error: PublicProfileFailure): TrustFailure {
  if (error.status === 403 && error.code === 'FORBIDDEN') {
    return fail(403, 'FORBIDDEN', error.message, error.details)
  }
  return fail(500, 'UNHANDLED', 'Request failed', null)
}

function record(body: unknown): Record<string, unknown> {
  return typeof body === 'object' && body !== null && !Array.isArray(body) ? (body as Record<string, unknown>) : {}
}

/** A member of the other gender, any status: a member who left or was blocked can still be reported or blocked. */
async function reachableMember(viewer: BrowseViewer, accountId: string): Promise<BrowseViewer | null> {
  if (accountId === viewer.id) {
    return null
  }
  const target = await loadAccount(accountId)
  if (!target || !target.roles.includes('member') || target.gender === viewer.gender) {
    return null
  }
  return target
}

export type ReportBody = {
  report: { id: string; target_kind: ReportTargetKind; reason: ReportReason; sla_started_at: string }
  case: { id: string; sla_started_at: string; sla_state: 'open' }
  /** True when this submit asked for a Block (new or already there). */
  blocked: boolean
  /** `operator_config.report_sla_hours`, or null when the row is unreadable (the Report is still filed). */
  sla_hours: number | null
}

type Parsed = {
  kind: ReportTargetKind
  targetId: string
  reason: ReportReason
  details: string | null
  block: boolean
}

function parseReport(body: unknown): { ok: true; value: Parsed } | TrustFailure {
  const input = record(body)
  const kind = input['target_kind']
  if (kind !== 'profile' && kind !== 'message') {
    return fail(400, 'UNHANDLED', TARGET_KIND_MESSAGE, { field: 'target_kind' })
  }
  const targetId = input['target_id']
  if (typeof targetId !== 'string' || !isUuidV7(targetId)) {
    return fail(400, 'UNHANDLED', TARGET_ID_MESSAGE, { field: 'target_id' })
  }
  const reason = input['reason']
  if (!isReportReason(reason)) {
    return fail(400, 'UNHANDLED', REASON_MESSAGE, { field: 'reason' })
  }
  const rawDetails = input['details']
  let details: string | null = null
  if (rawDetails !== undefined && rawDetails !== null) {
    if (typeof rawDetails !== 'string') {
      return fail(400, 'UNHANDLED', DETAILS_MESSAGE, { field: 'details' })
    }
    const trimmed = rawDetails.trim()
    if ([...trimmed].length > REPORT_DETAILS_MAX) {
      return fail(400, 'UNHANDLED', DETAILS_LONG_MESSAGE, { field: 'details', max: REPORT_DETAILS_MAX })
    }
    details = trimmed.length > 0 ? trimmed : null
  }
  const blockFlag = input['block']
  if (blockFlag !== undefined && typeof blockFlag !== 'boolean') {
    return fail(400, 'UNHANDLED', BLOCK_FLAG_MESSAGE, { field: 'block' })
  }
  return { ok: true, value: { kind, targetId: targetId.toLowerCase(), reason, details, block: blockFlag === true } }
}

/**
 * `POST /v1/reports`. Order: viewer gate, body, target (404), rate limit (429), then one transaction that writes the
 * `report`, its `moderation_case` (`sla_started_at` = submit time, `first_human_at` null) and, with `block: true`,
 * the `block`. Nothing is written when a step fails.
 */
export async function submitReport(
  session: ResolvedSession,
  body: unknown,
): Promise<{ ok: true; body: ReportBody } | TrustFailure> {
  const gate = await assertMemberViewer(session)
  if (!gate.ok) {
    return fromViewer(gate)
  }
  const viewer = gate.account
  const parsed = parseReport(body)
  if (!parsed.ok) {
    return parsed
  }
  const input = parsed.value
  let reportedId: string
  let conversationId: string | null = null
  if (input.kind === 'profile') {
    const target = await reachableMember(viewer, input.targetId)
    if (!target) {
      return fail(404, 'NOT_FOUND', PROFILE_UNAVAILABLE, null)
    }
    reportedId = target.id
  } else {
    const found = await messageForReport(viewer.id, input.targetId)
    if (!found) {
      return fail(404, 'NOT_FOUND', MESSAGE_MISSING, null)
    }
    reportedId = found.senderId
    conversationId = found.conversationId
  }
  const now = authNow()
  const limit = await readReportRatePerHour()
  if (limit === null) {
    return fail(503, 'UNHANDLED', 'Request failed', null, true)
  }
  const store = getTrustStore()
  const since = new Date(now.getTime() - 60 * 60 * 1000).toISOString()
  if ((await store.reportsSince(viewer.id, since)) >= limit) {
    return fail(429, 'RATE_LIMITED', REPORT_RATE_MESSAGE, null, true)
  }
  const submittedAt = now.toISOString()
  const ids = newReportIds(now)
  const blockRow: BlockRow | null = input.block
    ? { id: newId(now), blocker_id: viewer.id, blocked_id: reportedId, created_at: submittedAt }
    : null
  await store.fileReport({
    report: {
      id: ids.reportId,
      reporter_id: viewer.id,
      target_kind: input.kind,
      target_id: input.targetId,
      reported_account_id: reportedId,
      conversation_id: conversationId,
      reason: input.reason,
      details: input.details,
      sla_started_at: submittedAt,
      first_human_at: null,
    },
    case: { id: ids.caseId, report_id: ids.reportId, flag_queue_id: null, sla_started_at: submittedAt, first_human_at: null },
    block: blockRow,
  })
  return {
    ok: true,
    body: {
      report: { id: ids.reportId, target_kind: input.kind, reason: input.reason, sla_started_at: submittedAt },
      case: { id: ids.caseId, sla_started_at: submittedAt, sla_state: 'open' },
      blocked: input.block,
      sla_hours: await readReportSlaHours(),
    },
  }
}

export type BlockBody = { block: { blocked_id: string; created_at: string } }

/** `POST /v1/blocks` `{ blocked_id }`. First Block 201, the same pair again 200 with the existing row. */
export async function blockMember(
  session: ResolvedSession,
  body: unknown,
): Promise<{ ok: true; status: 200 | 201; body: BlockBody } | TrustFailure> {
  const gate = await assertMemberViewer(session)
  if (!gate.ok) {
    return fromViewer(gate)
  }
  const raw = record(body)['blocked_id']
  if (typeof raw !== 'string' || !isUuidV7(raw) || raw.toLowerCase() === gate.account.id.toLowerCase()) {
    return fail(400, 'UNHANDLED', BLOCKED_ID_MESSAGE, { field: 'blocked_id' })
  }
  const target = await reachableMember(gate.account, raw.toLowerCase())
  if (!target) {
    return fail(404, 'NOT_FOUND', PROFILE_UNAVAILABLE, null)
  }
  const now = authNow()
  const saved = await getTrustStore().insertBlock({
    id: newId(now),
    blocker_id: gate.account.id,
    blocked_id: target.id,
    created_at: now.toISOString(),
  })
  return {
    ok: true,
    status: saved.created ? 201 : 200,
    body: { block: { blocked_id: saved.row.blocked_id, created_at: saved.row.created_at } },
  }
}

export type BlockedItem = {
  blocked_id: string
  pseudonym: string
  created_at: string
  /** Always the blurred derivative, whatever Reveal the pair once had; null without a live main photo. */
  photo: { id: string; url: string } | null
}

export type BlockedListBody = { count: number; items: BlockedItem[]; has_more: boolean }

/** At most this many Blocks per `GET /v1/blocks` (newest first); `has_more` says when older ones exist. */
export const BLOCK_LIST_MAX = 100

/**
 * `GET /v1/blocks`: the Blocks I placed, newest first, with the pseudonym and the blurred main photo only. A Block
 * placed on me is never listed (no one learns who blocked them). A member whose account is gone is left out. One
 * read of the Blocks and one batch read of the main photos; the accounts and the blur grants are then read in
 * parallel, bounded by `BLOCK_LIST_MAX` (QA round 2, F-3).
 */
export async function listMyBlocks(
  session: ResolvedSession,
): Promise<{ ok: true; body: BlockedListBody } | TrustFailure> {
  const gate = await assertMemberViewer(session)
  if (!gate.ok) {
    return fromViewer(gate)
  }
  const viewerId = gate.account.id
  const fetched = await getTrustStore().blocksBy(viewerId, BLOCK_LIST_MAX + 1)
  const rows = fetched.slice(0, BLOCK_LIST_MAX)
  const ids = rows.map((row) => row.blocked_id)
  const mains = ids.length > 0 ? await getMediaStore().liveMainProfilePhotos(ids) : []
  const built = await Promise.all(
    rows.map(async (row): Promise<BlockedItem | null | TrustFailure> => {
      const target = await loadAccount(row.blocked_id)
      if (!target) {
        return null
      }
      const asset = mains.find((item) => item.owner_id === row.blocked_id) ?? null
      let photo: BlockedItem['photo'] = null
      if (asset && discoveryPhoto(asset)) {
        const signed = await signMedia(getMediaStore(), asset.id, 'blur', viewerId)
        if (!signed.ok) {
          return fail(500, 'UNHANDLED', 'Request failed', null, signed.retryable)
        }
        photo = { id: asset.id, url: signed.url }
      }
      return { blocked_id: row.blocked_id, pseudonym: target.pseudonym, created_at: row.created_at, photo }
    }),
  )
  const items: BlockedItem[] = []
  for (const entry of built) {
    if (entry === null) {
      continue
    }
    if ('ok' in entry) {
      return entry
    }
    items.push(entry)
  }
  return { ok: true, body: { count: items.length, items, has_more: fetched.length > BLOCK_LIST_MAX } }
}

/**
 * `DELETE /v1/blocks/:blocked_id`: removes my own Block on that member, never theirs on me. Visibility, Invites and
 * Chat come back only when no Block is left in either direction (the other member's Block still hides both).
 */
export async function unblockMember(
  session: ResolvedSession,
  blockedId: string,
): Promise<{ ok: true; body: Record<string, never> } | TrustFailure> {
  const gate = await assertMemberViewer(session)
  if (!gate.ok) {
    return fromViewer(gate)
  }
  if (!isUuidV7(blockedId)) {
    return fail(404, 'NOT_FOUND', BLOCK_MISSING, null)
  }
  const removed = await getTrustStore().removeBlock(gate.account.id, blockedId.toLowerCase())
  if (!removed) {
    return fail(404, 'NOT_FOUND', BLOCK_MISSING, null)
  }
  return { ok: true, body: {} }
}

export type ReportMetrics = { sla_hours: number; open: number; sla_breach: number; oldest_open_started_at: string | null }

/** Operator metrics (FR-083, NFR-003): open cases and those past `report_sla_hours` with no first human touch. */
export async function readReportMetrics(): Promise<{ ok: true; reports: ReportMetrics } | TrustFailure> {
  const hours = await readReportSlaHours()
  if (hours === null) {
    return fail(503, 'UNHANDLED', 'report_sla_hours : la configuration est illisible.', { field: 'report_sla_hours' }, true)
  }
  const now = authNow()
  const summary = await getTrustStore().openCases(new Date(now.getTime() - hours * 60 * 60 * 1000).toISOString())
  return {
    ok: true,
    reports: { sla_hours: hours, open: summary.open, sla_breach: summary.slaBreach, oldest_open_started_at: summary.oldestOpenStartedAt },
  }
}
