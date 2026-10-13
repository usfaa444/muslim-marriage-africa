import { isUuidV7 } from '@ankanu/kernel'
import { eq } from 'drizzle-orm'
import { verificationRecord } from './account-schema.js'
import { accountStoreIsMemory, getIdentityDatabase } from './account-store.js'
import type { AuditAppend } from '@ankanu/ports'
import { getAuditPort } from './audit-port.js'
import { authNow } from './auth-clock.js'
import { getBillingPort } from './billing-port.js'
import { getCaptureStore } from './id-liveness-store.js'
import { applyPhotoModeration, signMedia } from './media.js'
import { getMediaStore, type ModerationState } from './media-store.js'
import { operatorConfig } from './operator-config.js'
import { getPhoneOtpStore, type PhoneOtpRow } from './phone-otp-store.js'
import { getProfileStore, profileStoreIsMemory, type ProfileDb, type StoredProfile } from './profile-store.js'
import { capturePassed } from './signup-gate.js'

const STAFF_FORBIDDEN = 'Accès réservé au personnel de modération.'
const NOT_FOUND_MESSAGE = "Ce profil n'est pas dans la file."
const STALE_MESSAGE = 'La file a changé. Rechargez avant de décider.'
const SLA_MESSAGE = 'free_review_sla_hours : la configuration est illisible.'

export type ReviewFailure = {
  ok: false
  status: 400 | 403 | 404 | 409 | 503
  code: 'FORBIDDEN' | 'NOT_FOUND' | 'REVIEW_STALE' | 'UNHANDLED'
  message: string
  details: { field?: string } | null
  retryable: boolean
}

export type ReviewPhoto = {
  asset_id: string
  moderation_state: ModerationState
  blur_url?: string
}

export type ReviewDecisionResult = {
  account_id: string
  visibility: string | null
  review_passed_at: string | null
  review_queued_at: string | null
  profile: 'allow' | 'block' | null
  bio: 'allow' | 'block' | null
  bio_live: string | null
  bio_pending: string | null
  photos: Array<{ asset_id: string; moderation_state: ModerationState }>
}

export type ReviewQueueRow = {
  account_id: string
  pseudonym: string
  priority: 'premium' | 'free'
  review_queued_at: string
  sla_breach: boolean
  dob: string
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
  bio_pending: string | null
  bio_live: string | null
  photos: Array<{ asset_id: string; blur_url: string }>
}

let slaReader: (() => Promise<number | null>) | undefined
let gateReader: ((accountId: string) => Promise<boolean>) | undefined

export function setFreeReviewSlaReader(next: (() => Promise<number | null>) | undefined): void {
  slaReader = next
}

export function setVerificationGateReader(next: ((accountId: string) => Promise<boolean>) | undefined): void {
  gateReader = next
}

/** Other-member browse uses this single predicate. Stories 3.7, 3.8, and 3.13 call it. */
export function isListableProfile(visibility: string | null, accountStatus: string): boolean {
  return visibility === 'public' && accountStatus === 'Active'
}

export function slaBreach(queuedAt: string, now: Date, hours: number): boolean {
  const start = Date.parse(queuedAt)
  if (Number.isNaN(start)) {
    return false
  }
  return now.getTime() - start > hours * 60 * 60 * 1000
}

export async function readFreeReviewSlaHours(): Promise<number | null> {
  if (slaReader) {
    return slaReader()
  }
  if (profileStoreIsMemory()) {
    return null
  }
  const rows = await getIdentityDatabase()
    .select({ value: operatorConfig.value })
    .from(operatorConfig)
    .where(eq(operatorConfig.key, 'free_review_sla_hours'))
    .limit(1)
  const value = rows[0]?.value
  if (value === undefined || !/^[1-9]\d*$/.test(value)) {
    return null
  }
  const parsed = Number(value)
  if (!Number.isSafeInteger(parsed)) {
    return null
  }
  return parsed
}

export async function queueAfterProfileSave(row: StoredProfile, at: string): Promise<StoredProfile | null> {
  if (row.review_passed_at !== null && row.bio_pending === null) {
    return row
  }
  return getProfileStore().noteQueued(row.account_id, at)
}

export async function publishIfEligible(accountId: string, tx?: unknown): Promise<void> {
  if (accountStoreIsMemory() && !profileStoreIsMemory()) {
    return
  }
  const db = sqlHandle(tx)
  const row = db ? await getProfileStore().read(accountId, db) : await getProfileStore().read(accountId)
  if (!row?.review_passed_at || row.visibility !== 'unpublished') {
    return
  }
  const open = db ? await gatesPassed(accountId, db) : await gatesPassed(accountId)
  if (!open) {
    return
  }
  if (db) {
    await getProfileStore().patchReview(accountId, { visibility: 'public' }, 'unpublished', db)
    return
  }
  await getProfileStore().patchReview(accountId, { visibility: 'public' }, 'unpublished')
}

export async function listProfileReviews(staffId: string): Promise<{ ok: true; rows: ReviewQueueRow[] } | ReviewFailure> {
  const hours = await readFreeReviewSlaHours()
  if (hours === null) {
    return slaFailure()
  }
  const queued = await getProfileStore().queued()
  const now = authNow()
  const ranked: Array<ReviewQueueRow & { sort: number }> = []
  const signedIds: string[] = []
  for (const row of queued) {
    if (!row.review_queued_at) {
      continue
    }
    const entitled = await getBillingPort().isEntitled(row.account_id)
    const photos = await getMediaStore().pendingProfilePhotos(row.account_id)
    const signed: Array<{ asset_id: string; blur_url: string }> = []
    for (const photo of photos) {
      const grant = await signMedia(getMediaStore(), photo.id, 'blur', staffId, { staffReview: true })
      if (!grant.ok) {
        return {
          ok: false,
          status: grant.status === 503 ? 503 : grant.status === 400 ? 400 : 403,
          code: grant.code === 'UNHANDLED' ? 'UNHANDLED' : 'FORBIDDEN',
          message: grant.message,
          details: grant.details,
          retryable: grant.retryable,
        }
      }
      signed.push({ asset_id: photo.id, blur_url: grant.url })
      signedIds.push(photo.id)
    }
    ranked.push({
      sort: entitled === true ? 0 : 1,
      account_id: row.account_id,
      pseudonym: row.pseudonym,
      priority: entitled === true ? 'premium' : 'free',
      review_queued_at: row.review_queued_at,
      sla_breach: slaBreach(row.review_queued_at, now, hours),
      dob: row.dob,
      city: row.city,
      country: row.country,
      origin: row.origin,
      marital_status: row.marital_status,
      polygamy_intent: row.polygamy_intent,
      education: row.education,
      profession: row.profession,
      madhhab: row.madhhab,
      practice: row.practice,
      life_plans: row.life_plans,
      bio_pending: row.bio_pending,
      bio_live: row.bio_live,
      photos: signed,
    })
  }
  ranked.sort((left, right) => {
    if (left.sort !== right.sort) {
      return left.sort - right.sort
    }
    return left.review_queued_at.localeCompare(right.review_queued_at)
  })
  if (signedIds.length > 0) {
    await inCallerUnit(async (tx) => {
      await appendAudit(tx, {
        actorId: staffId,
        action: 'moderator_profile_review_view',
        payload: { asset_ids: signedIds.join(',') },
      })
    })
  }
  return { ok: true, rows: ranked.map(({ sort: _sort, ...row }) => row) }
}

export async function readReviewMetrics(): Promise<
  { ok: true; free_review: { sla_hours: number; waiting: number; sla_breach: number } } | ReviewFailure
> {
  const hours = await readFreeReviewSlaHours()
  if (hours === null) {
    return slaFailure()
  }
  const queued = await getProfileStore().queued()
  const now = authNow()
  let breach = 0
  for (const row of queued) {
    if (row.review_queued_at && slaBreach(row.review_queued_at, now, hours)) {
      breach += 1
    }
  }
  return { ok: true, free_review: { sla_hours: hours, waiting: queued.length, sla_breach: breach } }
}

export async function decideProfileReview(
  staffId: string,
  body: unknown,
): Promise<{ ok: true; result: ReviewDecisionResult } | ReviewFailure> {
  const parsed = parseDecision(body)
  if (!parsed.ok) {
    return parsed.failure
  }
  const row = await getProfileStore().read(parsed.accountId)
  if (!row?.review_queued_at) {
    return notFound()
  }
  const pending = await getMediaStore().pendingProfilePhotos(row.account_id)
  const pendingIds = pending.map((photo) => photo.id).sort()
  const bodyIds = parsed.photos.map((photo) => photo.asset_id).sort()
  const profileRequired = row.review_passed_at === null
  const bioRequired = row.bio_pending !== null
  if (profileRequired !== (parsed.profile !== null) || bioRequired !== (parsed.bio !== null)) {
    return stale()
  }
  if (pendingIds.join(',') !== bodyIds.join(',')) {
    return stale()
  }
  const blocked = parsed.profile === 'block' || parsed.bio === 'block' || parsed.photos.some((photo) => photo.decision === 'block')
  if (blocked && parsed.reason === null) {
    return fieldFailure('reason', 'reason : un motif est requis lorsqu’un élément est refusé.')
  }
  const patch: {
    bio_live?: string | null
    bio_pending?: string | null
    review_passed_at?: string | null
    review_queued_at: null
  } = { review_queued_at: null }
  if (parsed.bio === 'allow') {
    patch.bio_live = row.bio_pending
    patch.bio_pending = null
  } else if (parsed.bio === 'block') {
    patch.bio_pending = null
  }
  if (parsed.profile === 'allow') {
    patch.review_passed_at = authNow().toISOString()
  }
  try {
    const decidedAt = authNow().toISOString()
    return await inCallerUnit(async (tx) => {
      const db = sqlHandle(tx)
      for (const photo of parsed.photos) {
        if (photo.decision === 'allow') {
          const replaced = await getMediaStore().replaceLiveProfilePhotos(row.account_id, db)
          await getMediaStore().revokeUnrevokedGrants(replaced, decidedAt, db)
        }
        const changed = await applyPhotoModeration(getMediaStore(), photo.asset_id, photo.decision, db)
        if (!changed) {
          throw new StaleWrite()
        }
      }
      const saved = db
        ? await getProfileStore().patchReview(row.account_id, patch, 'queued', db)
        : await getProfileStore().patchReview(row.account_id, patch, 'queued')
      if (!saved) {
        throw new StaleWrite()
      }
      await publishIfEligible(row.account_id, db ?? tx)
      const after = db ? await getProfileStore().read(row.account_id, db) : await getProfileStore().read(row.account_id)
      if (!after) {
        throw new StaleWrite()
      }
      await appendAudit(tx, {
        actorId: staffId,
        action: 'moderator_profile_review_decision',
        payload: {
          account_id: row.account_id,
          profile: parsed.profile ?? 'none',
          bio: parsed.bio ?? 'none',
          photo_ids: parsed.photos.map((photo) => photo.asset_id).join(','),
          photo_decisions: parsed.photos.map((photo) => photo.decision).join(','),
          reason: parsed.reason ?? '',
        },
      })
      return {
        ok: true as const,
        result: {
          account_id: after.account_id,
          visibility: after.visibility,
          review_passed_at: after.review_passed_at,
          review_queued_at: after.review_queued_at,
          profile: parsed.profile,
          bio: parsed.bio,
          bio_live: after.bio_live,
          bio_pending: after.bio_pending,
          photos: parsed.photos.map((photo) => ({
            asset_id: photo.asset_id,
            moderation_state: photo.decision === 'allow' ? ('live' as const) : ('blocked' as const),
          })),
        },
      }
    })
  } catch (error) {
    if (error instanceof StaleWrite) {
      return stale()
    }
    throw error
  }
}

const MEMORY_TX = Symbol('memory-review-tx')

class StaleWrite extends Error {
  constructor() {
    super('stale')
    this.name = 'StaleWrite'
  }
}

function callerTransaction(): object {
  const unused = (): never => {
    throw new Error('memory review transaction is not a SQL handle')
  }
  return Object.assign(
    { insert: unused, select: unused, execute: unused, update: unused },
    { [MEMORY_TX]: true },
  )
}

function sqlHandle(tx: unknown): ProfileDb | undefined {
  if (typeof tx !== 'object' || tx === null || MEMORY_TX in tx) {
    return undefined
  }
  if (!('update' in tx) || !('select' in tx) || !('execute' in tx) || !('insert' in tx)) {
    return undefined
  }
  return tx as ProfileDb
}

async function appendAudit(tx: unknown, input: AuditAppend): Promise<void> {
  await getAuditPort().append(tx, input)
}

type Restorable = { snapshot(): unknown; restore(value: unknown): void }

function restorable(value: object): Restorable | null {
  if (!('snapshot' in value) || !('restore' in value)) {
    return null
  }
  const store = value as { snapshot?: unknown; restore?: unknown }
  if (typeof store.snapshot !== 'function' || typeof store.restore !== 'function') {
    return null
  }
  return value as Restorable
}

async function inCallerUnit<T>(work: (tx: unknown) => Promise<T>): Promise<T> {
  if (profileStoreIsMemory()) {
    const profiles = restorable(getProfileStore())
    const media = restorable(getMediaStore())
    const profileSnap = profiles?.snapshot() ?? null
    const mediaSnap = media?.snapshot() ?? null
    try {
      return await work(callerTransaction())
    } catch (error) {
      if (profileSnap !== null) {
        profiles?.restore(profileSnap)
      }
      if (mediaSnap !== null) {
        media?.restore(mediaSnap)
      }
      throw error
    }
  }
  return getIdentityDatabase().transaction(async (tx) => work(tx))
}

type ParsedDecision = {
  ok: true
  accountId: string
  profile: 'allow' | 'block' | null
  bio: 'allow' | 'block' | null
  photos: Array<{ asset_id: string; decision: 'allow' | 'block' }>
  reason: string | null
}

function parseDecision(body: unknown): ParsedDecision | { ok: false; failure: ReviewFailure } {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return { ok: false, failure: fieldFailure('kind', 'kind : profile_review est requis.') }
  }
  const record = body as Record<string, unknown>
  if (record.kind !== 'profile_review') {
    return { ok: false, failure: fieldFailure('kind', 'kind : profile_review est requis.') }
  }
  if (typeof record.account_id !== 'string' || !isUuidV7(record.account_id)) {
    return { ok: false, failure: fieldFailure('account_id', 'account_id : un identifiant est requis.') }
  }
  const profile = optionalDecision(record.profile)
  if (profile === 'bad') {
    return { ok: false, failure: fieldFailure('profile', 'profile : allow ou block.') }
  }
  const bio = optionalDecision(record.bio)
  if (bio === 'bad') {
    return { ok: false, failure: fieldFailure('bio', 'bio : allow ou block.') }
  }
  if (record.photos !== undefined && !Array.isArray(record.photos)) {
    return { ok: false, failure: fieldFailure('photos', 'photos : la liste des photos en revue est requise.') }
  }
  const photos: Array<{ asset_id: string; decision: 'allow' | 'block' }> = []
  for (const item of Array.isArray(record.photos) ? record.photos : []) {
    if (typeof item !== 'object' || item === null) {
      return { ok: false, failure: fieldFailure('photos', 'photos : chaque photo a un asset_id et une décision.') }
    }
    const photo = item as { asset_id?: unknown; decision?: unknown }
    if (typeof photo.asset_id !== 'string' || !isUuidV7(photo.asset_id)) {
      return { ok: false, failure: fieldFailure('photos', 'photos : asset_id invalide.') }
    }
    if (photo.decision !== 'allow' && photo.decision !== 'block') {
      return { ok: false, failure: fieldFailure('photos', 'photos : decision doit être allow ou block.') }
    }
    photos.push({ asset_id: photo.asset_id, decision: photo.decision })
  }
  let reason: string | null = null
  if (record.reason !== undefined && record.reason !== null) {
    if (typeof record.reason !== 'string' || record.reason.trim() === '') {
      return { ok: false, failure: fieldFailure('reason', 'reason : un motif est requis lorsqu’un élément est refusé.') }
    }
    reason = record.reason.trim()
  }
  return { ok: true, accountId: record.account_id, profile, bio, photos, reason }
}

function optionalDecision(value: unknown): 'allow' | 'block' | null | 'bad' {
  if (value === undefined || value === null) {
    return null
  }
  if (value === 'allow' || value === 'block') {
    return value
  }
  return 'bad'
}

async function gatesPassed(accountId: string, db?: ProfileDb): Promise<boolean> {
  if (gateReader) {
    return gateReader(accountId)
  }
  const latest = db ? await latestVerification(accountId, db) : await latestVerification(accountId)
  return (
    latest.get('phone_otp') === 'granted' &&
    capturePassed(latest.get('liveness')) &&
    capturePassed(latest.get('id_document'))
  )
}

async function latestVerification(accountId: string, db?: ProfileDb): Promise<Map<string, string>> {
  if (profileStoreIsMemory() && !db) {
    const latest = new Map<string, string>()
    const idRow = await getCaptureStore().latest(accountId, 'id_document')
    const liveRow = await getCaptureStore().latest(accountId, 'liveness')
    if (idRow) {
      latest.set('id_document', idRow.status)
    }
    if (liveRow) {
      latest.set('liveness', liveRow.status)
    }
    const phone = latestPhone(accountId)
    if (phone) {
      latest.set('phone_otp', phone)
    }
    return latest
  }
  const rows = await (db ?? getIdentityDatabase())
    .select({ id: verificationRecord.id, kind: verificationRecord.kind, status: verificationRecord.status })
    .from(verificationRecord)
    .where(eq(verificationRecord.account_id, accountId))
  const latest = new Map<string, { id: string; status: string }>()
  for (const row of rows) {
    const current = latest.get(row.kind)
    if (!current || row.id > current.id) {
      latest.set(row.kind, { id: row.id, status: row.status })
    }
  }
  return new Map([...latest.entries()].map(([kind, row]) => [kind, row.status]))
}

function latestPhone(accountId: string): string | undefined {
  const store = getPhoneOtpStore() as PhoneOtpStoreRows
  if (!store.rows) {
    return undefined
  }
  let chosen: PhoneOtpRow | undefined
  for (const row of store.rows) {
    if (row.account_id !== accountId) {
      continue
    }
    if (!chosen || row.id > chosen.id) {
      chosen = row
    }
  }
  return chosen?.status
}

type PhoneOtpStoreRows = { rows?: PhoneOtpRow[] }

function fieldFailure(field: string, message: string): ReviewFailure {
  return { ok: false, status: 400, code: 'UNHANDLED', message, details: { field }, retryable: false }
}

function notFound(): ReviewFailure {
  return { ok: false, status: 404, code: 'NOT_FOUND', message: NOT_FOUND_MESSAGE, details: null, retryable: false }
}

function stale(): ReviewFailure {
  return { ok: false, status: 409, code: 'REVIEW_STALE', message: STALE_MESSAGE, details: null, retryable: false }
}

function slaFailure(): ReviewFailure {
  return { ok: false, status: 503, code: 'UNHANDLED', message: SLA_MESSAGE, details: { field: 'free_review_sla_hours' }, retryable: true }
}

export function staffForbidden(): ReviewFailure {
  return { ok: false, status: 403, code: 'FORBIDDEN', message: STAFF_FORBIDDEN, details: null, retryable: false }
}
