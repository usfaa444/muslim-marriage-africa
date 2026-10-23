import { isUuidV7, newId } from '@ankanu/kernel'
import type { AuditAppend } from '@ankanu/ports'
import { getIdentityDatabase } from './account-store.js'
import { getAuditPort } from './audit-port.js'
import { authNow } from './auth-clock.js'
import { takeAuthSlot } from './auth-rate.js'
import { getBillingPort } from './billing-port.js'
import { ageOn } from './create-account.js'
import { openEvidence, readEvidenceKey } from './evidence-seal.js'
import { getEvidenceWriter } from './evidence-writer.js'
import {
  captureStoreIsMemory,
  getCaptureStore,
  recordTimeMs,
  type CaptureKind,
  type CaptureRow,
} from './id-liveness-store.js'
import { POSE_LABEL, isLivenessPose } from './liveness-pose.js'
import { signMedia } from './media.js'
import { getMediaStore, MediaStorageError, type StoredAsset } from './media-store.js'
import { publishIfEligible, readFreeReviewSlaHours, slaBreach } from './profile-review.js'
import { getProfileStore, type ProfileDb } from './profile-store.js'

/**
 * Staff review console (Stories 2.8, 3.3, 2.6, 12.1): one case per member with anything pending, the ID and
 * liveness evidence streamed from the server, audited views, photo unblur with a typed reason, and the ID and
 * liveness decisions. Profile and photo decisions stay on `POST /v1/staff/cases` (Story 3.3).
 */

export const MODERATOR_ONLY_MESSAGE = 'Réservé aux modérateurs.'
const NOT_FOUND_MESSAGE = "Ce dossier n'est pas dans la file."
const STALE_MESSAGE = 'La file a changé. Rechargez avant de décider.'
const RATE_MESSAGE = 'Trop de consultations. Réessayez dans une minute.'
const EVIDENCE_UNAVAILABLE = 'La pièce est indisponible.'
const UNBLUR_REASON_MESSAGE = 'Saisissez un motif de 10 à 300 caractères.'

/** Evidence views and photo unblurs per staff session per minute (AD-17 rate limit on `/v1/staff/*`). */
export const EVIDENCE_VIEWS_PER_MINUTE = 30
export const UNBLUR_TTL_SECONDS = 60
export const UNBLUR_REASON_MIN = 10
export const UNBLUR_REASON_MAX = 300
export const DECISION_NOTE_MAX = 500
const UNBLUR_DERIVATIVE = 'staff_unblur'

export const ID_REJECT_REASONS = ['unreadable', 'not_an_id', 'mismatch', 'expired'] as const
export const LIVENESS_REJECT_REASONS = ['pose_not_done', 'not_same_person', 'photo_of_photo', 'unclear'] as const

export const REVIEW_AUDIT = {
  caseView: 'moderator_review_case_view',
  evidenceView: 'moderator_evidence_view',
  unblur: 'moderator_photo_unblur',
  decision: 'moderator_verification_decision',
} as const

export type StaffCaller = { account_id: string; roles: string[]; session_id: string }

export type ReviewConsoleFailure = {
  ok: false
  status: 400 | 403 | 404 | 409 | 429 | 503
  code: 'FORBIDDEN' | 'NOT_FOUND' | 'REVIEW_STALE' | 'RATE_LIMITED' | 'UNHANDLED'
  message: string
  details: Record<string, string> | null
  retryable: boolean
}

export type QueueRow = {
  account_id: string
  pseudonym: string
  priority: 'premium' | 'free'
  since: string
  sla_breach: boolean
  pending: { profile: boolean; bio: boolean; photos: number; id_document: boolean; liveness: boolean }
}

export type QueueCounts = { waiting: number; sla_breach: number; premium: number }

export type QueueView =
  | { role: 'operator'; sla_hours: number; counts: QueueCounts }
  | { role: 'moderator'; sla_hours: number; counts: QueueCounts; rows: QueueRow[] }

export type EvidenceCard = {
  record_id: string
  status: string
  captured_at: string | null
  evidence_url: string
  pose?: string | null
  pose_label?: string | null
}

export type CaseView = {
  account_id: string
  pseudonym: string
  account_status: string
  gender: string
  dob: string
  age: number | null
  priority: 'premium' | 'free'
  profile: {
    city: string | null
    country: string | null
    origin: string | null
    marital_status: string | null
    polygamy_intent: string | null
    education: string | null
    profession: string | null
    madhhab: string | null
    practice: string | null
    life_plans: string | null
    bio_live: string | null
    bio_pending: string | null
    visibility: string | null
    review_queued_at: string | null
    review_passed_at: string | null
  }
  profile_review: { queued: boolean; profile_required: boolean; bio_required: boolean; photo_ids: string[] }
  photos: Array<{ asset_id: string; moderation_state: string | null; is_main: boolean; blur_url: string }>
  id_document: EvidenceCard | null
  liveness: EvidenceCard | null
  history: Array<{
    kind: CaptureKind
    record_id: string
    status: string
    reason: string | null
    captured_at: string | null
    decided_at: string | null
  }>
}

function failure(
  status: ReviewConsoleFailure['status'],
  code: ReviewConsoleFailure['code'],
  message: string,
  details: Record<string, string> | null = null,
  retryable = false,
): ReviewConsoleFailure {
  return { ok: false, status, code, message, details, retryable }
}

const moderatorOnly = () => failure(403, 'FORBIDDEN', MODERATOR_ONLY_MESSAGE, { reason: 'moderator_required' })
const notFound = () => failure(404, 'NOT_FOUND', NOT_FOUND_MESSAGE)
const stale = () => failure(409, 'REVIEW_STALE', STALE_MESSAGE)
const fieldFailure = (field: string, message: string) => failure(400, 'UNHANDLED', message, { field })

export function isModerator(caller: StaffCaller): boolean {
  return caller.roles.includes('moderator')
}

/** AD-8: decisions, evidence, unblur and the case file are Moderator-only. Operators see counts. */
export function moderatorGate(caller: StaffCaller): ReviewConsoleFailure | null {
  return isModerator(caller) ? null : moderatorOnly()
}

/** Counted synchronously before any await, so parallel requests of one session cannot overrun the limit. */
export function takeEvidenceSlot(sessionId: string, now = authNow()): ReviewConsoleFailure | null {
  if (takeAuthSlot(`staff-evidence:${sessionId}`, EVIDENCE_VIEWS_PER_MINUTE, now)) {
    return null
  }
  return failure(429, 'RATE_LIMITED', RATE_MESSAGE, null, true)
}

function iso(ms: number | null): string | null {
  return ms === null ? null : new Date(ms).toISOString()
}

type Building = {
  account_id: string
  pseudonym: string
  since: number
  profile: boolean
  bio: boolean
  photos: number
  id_document: boolean
  liveness: boolean
}

async function collectQueue(): Promise<Building[]> {
  const byAccount = new Map<string, Building>()
  const entry = (accountId: string, pseudonym: string): Building => {
    let found = byAccount.get(accountId)
    if (!found) {
      found = {
        account_id: accountId,
        pseudonym,
        since: Number.POSITIVE_INFINITY,
        profile: false,
        bio: false,
        photos: 0,
        id_document: false,
        liveness: false,
      }
      byAccount.set(accountId, found)
    }
    if (!found.pseudonym && pseudonym) {
      found.pseudonym = pseudonym
    }
    return found
  }
  for (const row of await getProfileStore().queued()) {
    if (!row.review_queued_at) {
      continue
    }
    const item = entry(row.account_id, row.pseudonym)
    item.profile = row.review_passed_at === null
    item.bio = row.bio_pending !== null
    item.photos = (await getMediaStore().pendingProfilePhotos(row.account_id)).length
    const queued = Date.parse(row.review_queued_at)
    if (!Number.isNaN(queued)) {
      item.since = Math.min(item.since, queued)
    }
  }
  for (const row of await getCaptureStore().pendingLatest()) {
    const item = entry(row.account_id, row.pseudonym)
    if (row.kind === 'id_document') {
      item.id_document = true
    } else {
      item.liveness = true
    }
    const at = recordTimeMs(row.id)
    if (at !== null) {
      item.since = Math.min(item.since, at)
    }
  }
  return [...byAccount.values()].filter(
    (item) => item.profile || item.bio || item.photos > 0 || item.id_document || item.liveness,
  )
}

/** One case per member with anything pending: Premium first, then oldest first; SLA from `free_review_sla_hours`. */
export async function readReviewQueue(caller: StaffCaller): Promise<{ ok: true; view: QueueView } | ReviewConsoleFailure> {
  const hours = await readFreeReviewSlaHours()
  if (hours === null) {
    return failure(503, 'UNHANDLED', 'free_review_sla_hours : la configuration est illisible.', {
      field: 'free_review_sla_hours',
    }, true)
  }
  const now = authNow()
  const items = await collectQueue()
  const rows: Array<QueueRow & { rank: number; sinceMs: number }> = []
  for (const item of items) {
    const entitled = (await getBillingPort().isEntitled(item.account_id)) === true
    const sinceMs = Number.isFinite(item.since) ? item.since : now.getTime()
    const since = new Date(sinceMs).toISOString()
    rows.push({
      rank: entitled ? 0 : 1,
      sinceMs,
      account_id: item.account_id,
      pseudonym: item.pseudonym,
      priority: entitled ? 'premium' : 'free',
      since,
      sla_breach: slaBreach(since, now, hours),
      pending: {
        profile: item.profile,
        bio: item.bio,
        photos: item.photos,
        id_document: item.id_document,
        liveness: item.liveness,
      },
    })
  }
  rows.sort((left, right) => left.rank - right.rank || left.sinceMs - right.sinceMs || (left.account_id < right.account_id ? -1 : 1))
  const counts: QueueCounts = {
    waiting: rows.length,
    sla_breach: rows.filter((row) => row.sla_breach).length,
    premium: rows.filter((row) => row.priority === 'premium').length,
  }
  if (!isModerator(caller)) {
    return { ok: true, view: { role: 'operator', sla_hours: hours, counts } }
  }
  return {
    ok: true,
    view: { role: 'moderator', sla_hours: hours, counts, rows: rows.map(({ rank: _rank, sinceMs: _since, ...row }) => row) },
  }
}

function evidenceCard(row: CaptureRow | null): EvidenceCard | null {
  if (!row) {
    return null
  }
  const card: EvidenceCard = {
    record_id: row.id,
    status: row.status,
    captured_at: iso(recordTimeMs(row.id)),
    evidence_url: `/v1/staff/review/evidence/${row.id}`,
  }
  if (row.kind === 'liveness') {
    card.pose = row.pose ?? null
    card.pose_label = row.pose && isLivenessPose(row.pose) ? POSE_LABEL[row.pose] : null
  }
  return card
}

/** The case file. Moderator only; the open is audited with the photo grants it signed. */
export async function openReviewCase(
  caller: StaffCaller,
  accountId: string,
): Promise<{ ok: true; view: CaseView } | ReviewConsoleFailure> {
  const gate = moderatorGate(caller)
  if (gate) {
    return gate
  }
  if (!isUuidV7(accountId)) {
    return notFound()
  }
  const card = await getCaptureStore().accountCard(accountId)
  const stored = await getProfileStore().read(accountId)
  if (!card || !stored) {
    return notFound()
  }
  const now = authNow()
  const photos: CaseView['photos'] = []
  const open = (await getMediaStore().openProfilePhotos(accountId)).filter(
    (asset) => asset.moderation_state === 'pending' || asset.moderation_state === 'live',
  )
  for (const asset of open) {
    const grant = await signMedia(getMediaStore(), asset.id, 'blur', caller.account_id, { staffReview: true })
    if (!grant.ok) {
      continue
    }
    photos.push({ asset_id: asset.id, moderation_state: asset.moderation_state, is_main: asset.is_main, blur_url: grant.url })
  }
  const pendingPhotoIds = (await getMediaStore().pendingProfilePhotos(accountId)).map((asset) => asset.id).sort()
  const idRow = await getCaptureStore().latest(accountId, 'id_document')
  const liveRow = await getCaptureStore().latest(accountId, 'liveness')
  const current = new Set([idRow?.id, liveRow?.id].filter((id): id is string => typeof id === 'string'))
  const history = (await getCaptureStore().history(accountId))
    .filter((row) => !current.has(row.id))
    .map((row) => ({
      kind: row.kind,
      record_id: row.id,
      // A capture replaced by a retake before anyone decided it is not waiting any more (QA round 1, F3).
      status: row.status === 'pending' ? 'superseded' : row.status,
      reason: row.decision_reason ?? null,
      captured_at: iso(recordTimeMs(row.id)),
      decided_at: row.decided_at ? row.decided_at.toISOString() : null,
    }))
  const entitled = (await getBillingPort().isEntitled(accountId)) === true
  const view: CaseView = {
    account_id: accountId,
    pseudonym: card.pseudonym,
    account_status: card.status,
    gender: stored.gender,
    dob: stored.dob,
    age: ageOn(stored.dob, now),
    priority: entitled ? 'premium' : 'free',
    profile: {
      city: stored.city,
      country: stored.country,
      origin: stored.origin,
      marital_status: stored.marital_status,
      polygamy_intent: stored.polygamy_intent,
      education: stored.education,
      profession: stored.profession,
      madhhab: stored.madhhab,
      practice: stored.practice,
      life_plans: stored.life_plans,
      bio_live: stored.bio_live,
      bio_pending: stored.bio_pending,
      visibility: stored.visibility,
      review_queued_at: stored.review_queued_at,
      review_passed_at: stored.review_passed_at,
    },
    profile_review: {
      queued: stored.review_queued_at !== null,
      profile_required: stored.review_queued_at !== null && stored.review_passed_at === null,
      bio_required: stored.review_queued_at !== null && stored.bio_pending !== null,
      photo_ids: pendingPhotoIds,
    },
    photos,
    id_document: evidenceCard(idRow),
    liveness: evidenceCard(liveRow),
    history,
  }
  await inReviewUnit(async (tx) => {
    await appendAudit(tx, {
      actorId: caller.account_id,
      action: REVIEW_AUDIT.caseView,
      payload: { account_id: accountId, asset_ids: photos.map((photo) => photo.asset_id).join(',') },
    })
  })
  return { ok: true, view }
}

export type EvidenceBytes = { ok: true; bytes: Buffer; contentType: 'image/jpeg' | 'image/png' }

function imageType(bytes: Buffer): 'image/jpeg' | 'image/png' | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'image/jpeg'
  }
  const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
  if (bytes.length >= png.length && png.every((byte, index) => bytes[index] === byte)) {
    return 'image/png'
  }
  return null
}

function objectKey(uri: string, bucket: string): string | null {
  const prefix = `s3://${bucket}/`
  if (!uri.startsWith(prefix)) {
    return null
  }
  const key = uri.slice(prefix.length)
  return /^verification\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.json$/.test(key) ? key : null
}

/**
 * Decrypts one ID or liveness image on the server. Moderator only, rate limited per staff session, and audited
 * (staff id, record id, time) before a byte leaves. The audit payload never holds image data.
 */
export async function readEvidence(
  caller: StaffCaller,
  recordId: string,
): Promise<EvidenceBytes | ReviewConsoleFailure> {
  const gate = moderatorGate(caller)
  if (gate) {
    return gate
  }
  const limited = takeEvidenceSlot(caller.session_id)
  if (limited) {
    return limited
  }
  if (!isUuidV7(recordId)) {
    return notFound()
  }
  const row = await getCaptureStore().record(recordId)
  if (!row || (row.kind !== 'id_document' && row.kind !== 'liveness')) {
    return notFound()
  }
  const writer = getEvidenceWriter()
  const evidence = readEvidenceKey()
  const key = writer ? objectKey(row.evidence_uri, writer.bucket) : null
  if (!writer || !evidence || !key) {
    return failure(503, 'UNHANDLED', EVIDENCE_UNAVAILABLE, null, true)
  }
  let plain: Buffer
  try {
    plain = openEvidence(Buffer.from(await writer.readObject(key)), evidence.key)
  } catch {
    return failure(503, 'UNHANDLED', EVIDENCE_UNAVAILABLE, null, true)
  }
  const contentType = imageType(plain)
  if (!contentType) {
    return failure(503, 'UNHANDLED', EVIDENCE_UNAVAILABLE, null, true)
  }
  const at = authNow().toISOString()
  await inReviewUnit(async (tx) => {
    await appendAudit(tx, {
      actorId: caller.account_id,
      action: REVIEW_AUDIT.evidenceView,
      payload: { account_id: row.account_id, record_id: row.id, kind: row.kind, at },
    })
  })
  return { ok: true, bytes: plain, contentType }
}

/**
 * AD-9 moderator unblur: an audited, 60-second media grant for this Moderator, minted only after a typed reason.
 * The grant is readable only on the staff photo endpoint, never on the member media gateway.
 */
export async function unblurPhoto(
  caller: StaffCaller,
  body: unknown,
): Promise<{ ok: true; url: string; expires_at: string } | ReviewConsoleFailure> {
  const gate = moderatorGate(caller)
  if (gate) {
    return gate
  }
  const record = typeof body === 'object' && body !== null && !Array.isArray(body) ? (body as Record<string, unknown>) : {}
  const accountId = record['account_id']
  const assetId = record['asset_id']
  if (typeof accountId !== 'string' || !isUuidV7(accountId)) {
    return fieldFailure('account_id', 'account_id : un identifiant est requis.')
  }
  if (typeof assetId !== 'string' || !isUuidV7(assetId)) {
    return fieldFailure('asset_id', 'asset_id : un identifiant est requis.')
  }
  const reason = typeof record['reason'] === 'string' ? record['reason'].trim() : ''
  if (Array.from(reason).length < UNBLUR_REASON_MIN || Array.from(reason).length > UNBLUR_REASON_MAX) {
    return fieldFailure('reason', UNBLUR_REASON_MESSAGE)
  }
  const limited = takeEvidenceSlot(caller.session_id)
  if (limited) {
    return limited
  }
  const asset = await getMediaStore().asset(assetId)
  if (!reviewablePhoto(asset, accountId)) {
    return notFound()
  }
  const now = authNow()
  const expires = new Date(now.getTime() + UNBLUR_TTL_SECONDS * 1000).toISOString()
  const id = newId(now)
  await inReviewUnit(async (tx) => {
    await appendAudit(tx, {
      actorId: caller.account_id,
      action: REVIEW_AUDIT.unblur,
      payload: { account_id: accountId, asset_id: assetId, grant_id: id, reason },
    })
  })
  await getMediaStore().saveGrant({
    id,
    photo_asset_id: assetId,
    viewer_id: caller.account_id,
    derivative: UNBLUR_DERIVATIVE,
    expires_at: expires,
    revoked_at: null,
  })
  return { ok: true, url: `/v1/staff/review/photo?token=${id}`, expires_at: expires }
}

function reviewablePhoto(asset: StoredAsset | null, accountId: string): asset is StoredAsset {
  return (
    asset !== null &&
    asset.kind === 'profile_photo' &&
    asset.owner_id === accountId &&
    (asset.moderation_state === 'pending' || asset.moderation_state === 'live')
  )
}

/** Serves an unblur grant to the Moderator who holds it, while it lives. */
export async function readUnblurredPhoto(
  caller: StaffCaller,
  token: unknown,
): Promise<EvidenceBytes | ReviewConsoleFailure> {
  const gate = moderatorGate(caller)
  if (gate) {
    return gate
  }
  if (typeof token !== 'string' || !isUuidV7(token)) {
    return notFound()
  }
  const grant = await getMediaStore().grant(token)
  if (
    !grant ||
    grant.viewer_id !== caller.account_id ||
    grant.derivative !== UNBLUR_DERIVATIVE ||
    grant.revoked_at !== null ||
    Date.parse(grant.expires_at) <= authNow().getTime()
  ) {
    return failure(403, 'FORBIDDEN', 'Accès au média refusé.')
  }
  const asset = await getMediaStore().asset(grant.photo_asset_id)
  if (!asset || !reviewablePhoto(asset, asset.owner_id)) {
    return notFound()
  }
  let bytes: Uint8Array | null
  try {
    const md = await getMediaStore().derivative(asset.id, 'md')
    bytes = await getMediaStore().bytes(md ? md.object_key : asset.original_key)
  } catch (error) {
    if (error instanceof MediaStorageError) {
      return failure(503, 'UNHANDLED', EVIDENCE_UNAVAILABLE, null, true)
    }
    throw error
  }
  const buffer = bytes ? Buffer.from(bytes) : null
  const contentType = buffer ? imageType(buffer) : null
  if (!buffer || !contentType) {
    return failure(503, 'UNHANDLED', EVIDENCE_UNAVAILABLE, null, true)
  }
  return { ok: true, bytes: buffer, contentType }
}

type Decision = {
  accountId: string
  kind: CaptureKind
  recordId: string
  decision: 'approve' | 'reject' | 'suspected_minor'
  reason: string | null
  note: string | null
}

function parseDecision(body: unknown): Decision | ReviewConsoleFailure {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return fieldFailure('kind', 'kind : id_document ou liveness.')
  }
  const record = body as Record<string, unknown>
  const kind = record['kind']
  if (kind !== 'id_document' && kind !== 'liveness') {
    return fieldFailure('kind', 'kind : id_document ou liveness.')
  }
  const accountId = record['account_id']
  if (typeof accountId !== 'string' || !isUuidV7(accountId)) {
    return fieldFailure('account_id', 'account_id : un identifiant est requis.')
  }
  const recordId = record['record_id']
  if (typeof recordId !== 'string' || !isUuidV7(recordId)) {
    return fieldFailure('record_id', 'record_id : un identifiant est requis.')
  }
  const decision = record['decision']
  if (decision !== 'approve' && decision !== 'reject' && decision !== 'suspected_minor') {
    return fieldFailure('decision', 'decision : approve, reject ou suspected_minor.')
  }
  let reason: string | null = null
  if (decision === 'reject') {
    const allowed: readonly string[] = kind === 'id_document' ? ID_REJECT_REASONS : LIVENESS_REJECT_REASONS
    if (typeof record['reason'] !== 'string' || !allowed.includes(record['reason'])) {
      return fieldFailure('reason', 'reason : choisissez un motif de la liste.')
    }
    reason = record['reason']
  } else if (decision === 'suspected_minor') {
    reason = 'suspected_minor'
  } else if (record['reason'] !== undefined && record['reason'] !== null) {
    return fieldFailure('reason', 'reason : aucun motif pour une approbation.')
  }
  let note: string | null = null
  if (record['note'] !== undefined && record['note'] !== null) {
    if (typeof record['note'] !== 'string' || Array.from(record['note']).length > DECISION_NOTE_MAX) {
      return fieldFailure('note', 'note : 500 caractères au plus.')
    }
    note = record['note'].trim() === '' ? null : record['note'].trim()
  }
  return { accountId, kind, recordId, decision, reason, note }
}

const STATUS = { approve: 'granted', reject: 'rejected', suspected_minor: 'held' } as const

export type DecisionResult = {
  account_id: string
  kind: CaptureKind
  record_id: string
  status: 'granted' | 'rejected' | 'held'
  reason: string | null
  visibility: string | null
  account_status: string | null
}

/**
 * ID or liveness decision. Writes only while that row is still the pending, newest one of its kind (else 409
 * REVIEW_STALE). Approve can publish through `publishIfEligible`; suspected minor puts the age hold on; reject
 * asks the member to retake. One unit of work with the AD-18 audit event (ids, decision, reason category).
 */
export async function decideVerification(
  caller: StaffCaller,
  body: unknown,
): Promise<{ ok: true; result: DecisionResult } | ReviewConsoleFailure> {
  const gate = moderatorGate(caller)
  if (gate) {
    return gate
  }
  const parsed = parseDecision(body)
  if ('ok' in parsed) {
    return parsed
  }
  const row = await getCaptureStore().record(parsed.recordId)
  if (!row || row.account_id !== parsed.accountId || row.kind !== parsed.kind) {
    return notFound()
  }
  const status = STATUS[parsed.decision]
  try {
    await inReviewUnit(async (tx) => {
      const db = sqlHandle(tx)
      const written = await getCaptureStore().decide(
        {
          recordId: parsed.recordId,
          accountId: parsed.accountId,
          kind: parsed.kind,
          status,
          reason: parsed.reason,
          note: parsed.note,
          decidedBy: caller.account_id,
          at: authNow(),
        },
        db,
      )
      if (!written) {
        throw new StaleDecision()
      }
      if (status === 'held') {
        await getCaptureStore().holdAccount(parsed.accountId, db)
      }
      if (status === 'granted') {
        await publishIfEligible(parsed.accountId, db)
      }
      await appendAudit(tx, {
        actorId: caller.account_id,
        action: REVIEW_AUDIT.decision,
        payload: {
          account_id: parsed.accountId,
          record_id: parsed.recordId,
          kind: parsed.kind,
          decision: parsed.decision,
          reason: parsed.reason ?? '',
          note: parsed.note === null ? 'no' : 'yes',
        },
      })
    })
  } catch (error) {
    if (error instanceof StaleDecision) {
      return stale()
    }
    throw error
  }
  const after = await getProfileStore().read(parsed.accountId)
  return {
    ok: true,
    result: {
      account_id: parsed.accountId,
      kind: parsed.kind,
      record_id: parsed.recordId,
      status,
      reason: parsed.reason,
      visibility: after?.visibility ?? null,
      account_status: await getCaptureStore().accountStatus(parsed.accountId),
    },
  }
}

class StaleDecision extends Error {
  constructor() {
    super('stale')
    this.name = 'StaleDecision'
  }
}

const MEMORY_TX = Symbol('memory-review-console-tx')

function memoryTransaction(): object {
  const unused = (): never => {
    throw new Error('memory review console transaction is not a SQL handle')
  }
  return Object.assign({ insert: unused, select: unused, execute: unused, update: unused }, { [MEMORY_TX]: true })
}

function sqlHandle(tx: unknown): ProfileDb | undefined {
  if (typeof tx !== 'object' || tx === null || MEMORY_TX in tx) {
    return undefined
  }
  return tx as ProfileDb
}

type Restorable = { snapshot(): unknown; restore(value: unknown): void }

function restorable(value: object): Restorable | null {
  const candidate = value as { snapshot?: unknown; restore?: unknown }
  return typeof candidate.snapshot === 'function' && typeof candidate.restore === 'function' ? (value as Restorable) : null
}

/** One unit of work: a Postgres transaction, or (unit tests) a memory snapshot restored on error. */
async function inReviewUnit<T>(work: (tx: unknown) => Promise<T>): Promise<T> {
  if (captureStoreIsMemory()) {
    const stores = [restorable(getCaptureStore()), restorable(getProfileStore())]
    const snaps = stores.map((store) => store?.snapshot() ?? null)
    try {
      return await work(memoryTransaction())
    } catch (error) {
      stores.forEach((store, index) => {
        const snap = snaps[index]
        if (store && snap !== null) {
          store.restore(snap)
        }
      })
      throw error
    }
  }
  return getIdentityDatabase().transaction(async (tx) => work(tx))
}

async function appendAudit(tx: unknown, input: AuditAppend): Promise<void> {
  await getAuditPort().append(tx, input)
}
