import { isUuidV7, newId } from '@ankanu/kernel'
import { openEvidence, sealEvidence, type EvidenceKey } from './evidence-seal.js'
import type { CaptureKind, CaptureRow, CaptureStore } from './id-liveness-store.js'
import { CHALLENGE_TTL_MS, pickPose, POSE_LABEL, type LivenessPose } from './liveness-pose.js'

export const UPLOAD_HOUR_MS = 60 * 60 * 1000
export const MAX_IMAGE_BYTES = 5_242_880

const UNAUTHENTICATED_MESSAGE = 'Authentification requise.'
const PHONE_MESSAGE = 'Vérification du téléphone requise.'
const RETAKE_MESSAGE = 'Reprenez la capture.'
const RATE_MESSAGE = 'Cadence de requêtes régulée.'
const CONFIG_MESSAGE = 'Request failed'
const STORAGE_MESSAGE = 'Request failed'

export type CaptureFailure = {
  ok: false
  status: 400 | 401 | 403 | 429 | 500 | 503
  code: 'UNAUTHENTICATED' | 'FORBIDDEN' | 'VERIFICATION_RETAKE' | 'RATE_LIMITED' | 'UNHANDLED'
  message: string
  details: unknown
  retryable: boolean
}

export type CaptureBody = {
  id: string
  kind: CaptureKind
  status: 'pending' | 'held' | 'rejected' | 'granted'
  /** Only on a rejected row: the Moderator's reason category (no note, no staff id). */
  reason?: string
}

export type ChallengeBody = {
  challenge_id: string
  pose: LivenessPose
  pose_label: string
  expires_at: string
}

export type CaptureSuccess = {
  ok: true
  status: 200 | 201
  body: CaptureBody | { status: 'none' }
}

let lastRecordMs = 0

export function resetRecordClock(): void {
  lastRecordMs = 0
}

export function nextRecordId(now: Date): string {
  let ms = now.getTime()
  if (!Number.isFinite(ms)) {
    ms = 0
  }
  if (ms <= lastRecordMs) {
    ms = lastRecordMs + 1
  }
  lastRecordMs = ms
  return newId(new Date(ms))
}

export function unauthenticatedCapture(): CaptureFailure {
  return failure(401, 'UNAUTHENTICATED', UNAUTHENTICATED_MESSAGE, null, false)
}

export function decodeCaptureImage(body: unknown):
  | { ok: true; bytes: Buffer }
  | { ok: false; reason: 'missing' | 'unreadable' | 'too_large' } {
  if (typeof body !== 'object' || body === null || Array.isArray(body) || !('image' in body)) {
    return { ok: false, reason: 'missing' }
  }
  const image = (body as { image?: unknown }).image
  if (image === '' || image === undefined || image === null) {
    return { ok: false, reason: 'missing' }
  }
  if (typeof image !== 'string' || !/^[A-Za-z0-9+/]+={0,2}$/.test(image) || image.length % 4 !== 0) {
    return { ok: false, reason: 'unreadable' }
  }
  const bytes = Buffer.from(image, 'base64')
  if (bytes.length < 1 || bytes.toString('base64').replace(/=+$/, '') !== image.replace(/=+$/, '')) {
    return { ok: false, reason: 'unreadable' }
  }
  if (bytes.length > MAX_IMAGE_BYTES) {
    return { ok: false, reason: 'too_large' }
  }
  if (!isJpeg(bytes) && !isPng(bytes)) {
    return { ok: false, reason: 'unreadable' }
  }
  return { ok: true, bytes }
}

export async function readCapture(input: {
  accountId: string
  kind: CaptureKind
  store: CaptureStore
}): Promise<CaptureSuccess> {
  const row = await input.store.latest(input.accountId, input.kind)
  if (!row) {
    return { ok: true, status: 200, body: { status: 'none' } }
  }
  return { ok: true, status: 200, body: publicRow(row) }
}

export async function submitCapture(input: {
  accountId: string
  kind: CaptureKind
  body: unknown
  now: Date
  limit: number | null
  evidence: EvidenceKey | null
  store: CaptureStore
  writeObject: ((key: string, body: Uint8Array) => Promise<void>) | null
  bucket: string | null
}): Promise<CaptureSuccess | CaptureFailure> {
  const granted = await input.store.hasGrantedPhone(input.accountId)
  if (!granted) {
    return failure(403, 'FORBIDDEN', PHONE_MESSAGE, { required: 'phone_otp' }, false)
  }
  const image = decodeCaptureImage(input.body)
  if (!image.ok) {
    return failure(400, 'VERIFICATION_RETAKE', RETAKE_MESSAGE, { field: 'image', reason: image.reason }, true)
  }
  if (input.limit === null) {
    return failure(500, 'UNHANDLED', CONFIG_MESSAGE, null, false)
  }
  let challengeId: string | null = null
  let pose: LivenessPose | null = null
  if (input.kind === 'liveness') {
    const live = await liveChallenge(input.accountId, input.body, input.now, input.store)
    if (!live) {
      return failure(400, 'VERIFICATION_RETAKE', RETAKE_MESSAGE, { field: 'challenge_id', reason: 'challenge' }, true)
    }
    challengeId = live.id
    pose = live.pose
  }
  const recent = await input.store.countRecent(input.accountId, input.now.getTime() - UPLOAD_HOUR_MS)
  if (recent >= input.limit) {
    return failure(429, 'RATE_LIMITED', RATE_MESSAGE, null, false)
  }
  if (!input.evidence || !input.writeObject || !input.bucket) {
    return failure(503, 'UNHANDLED', STORAGE_MESSAGE, null, true)
  }
  const id = nextRecordId(input.now)
  const sealed = sealEvidence(image.bytes, input.evidence)
  const objectKey = `verification/${input.accountId}/${id}.json`
  try {
    await input.writeObject(objectKey, sealed)
  } catch {
    return failure(503, 'UNHANDLED', STORAGE_MESSAGE, null, true)
  }
  const accountStatus = await input.store.accountStatus(input.accountId)
  const status = accountStatus === 'held' ? 'held' : 'pending'
  const row: CaptureRow = {
    id,
    account_id: input.accountId,
    kind: input.kind,
    status,
    vendor: null,
    evidence_uri: `s3://${input.bucket}/${objectKey}`,
    phone_e164: null,
    hash: null,
    expires_at: null,
    ...(input.kind === 'liveness' ? { pose } : {}),
  }
  let saved: Awaited<ReturnType<CaptureStore['save']>>
  try {
    saved = await input.store.save(row, challengeId ? { challengeId, now: input.now } : undefined)
  } catch {
    return failure(503, 'UNHANDLED', STORAGE_MESSAGE, null, true)
  }
  if (saved === 'challenge_gone') {
    return failure(400, 'VERIFICATION_RETAKE', RETAKE_MESSAGE, { field: 'challenge_id', reason: 'challenge' }, true)
  }
  return { ok: true, status: 201, body: publicRow(row) }
}

/**
 * The selfie step: a fresh random pose for this member, valid 10 minutes and once. It replaces any earlier one.
 * Phone OTP must be granted first, like the uploads.
 */
export async function issueLivenessChallenge(input: {
  accountId: string
  now: Date
  store: CaptureStore
  pick?: (max: number) => number
}): Promise<{ ok: true; status: 201; body: ChallengeBody } | CaptureFailure> {
  const granted = await input.store.hasGrantedPhone(input.accountId)
  if (!granted) {
    return failure(403, 'FORBIDDEN', PHONE_MESSAGE, { required: 'phone_otp' }, false)
  }
  const pose = pickPose(input.pick)
  const row = {
    id: newId(input.now),
    account_id: input.accountId,
    pose,
    expires_at: new Date(input.now.getTime() + CHALLENGE_TTL_MS),
  }
  try {
    await input.store.issueChallenge(row)
  } catch {
    return failure(503, 'UNHANDLED', STORAGE_MESSAGE, null, true)
  }
  return {
    ok: true,
    status: 201,
    body: { challenge_id: row.id, pose, pose_label: POSE_LABEL[pose], expires_at: row.expires_at.toISOString() },
  }
}

/** The member's live challenge named by `challenge_id`, or null when it is missing, another one, or expired. */
async function liveChallenge(
  accountId: string,
  body: unknown,
  now: Date,
  store: CaptureStore,
): Promise<{ id: string; pose: LivenessPose } | null> {
  const value =
    typeof body === 'object' && body !== null && !Array.isArray(body)
      ? (body as { challenge_id?: unknown }).challenge_id
      : undefined
  if (typeof value !== 'string' || !isUuidV7(value)) {
    return null
  }
  const found = await store.challenge(accountId)
  if (!found || found.id !== value || found.expires_at.getTime() <= now.getTime()) {
    return null
  }
  return { id: found.id, pose: found.pose }
}

export function storedObjectIsPlaintext(stored: Buffer, plain: Buffer): boolean {
  if (stored.equals(plain)) {
    return true
  }
  return stored.includes(plain)
}

export function roundTripEvidence(stored: Buffer, key: Buffer): Buffer {
  return openEvidence(stored, key)
}

function publicRow(row: CaptureRow): CaptureBody {
  if (row.status === 'rejected' && row.decision_reason) {
    return { id: row.id, kind: row.kind, status: row.status, reason: row.decision_reason }
  }
  return { id: row.id, kind: row.kind, status: row.status }
}

function failure(
  status: CaptureFailure['status'],
  code: CaptureFailure['code'],
  message: string,
  details: unknown,
  retryable: boolean,
): CaptureFailure {
  return { ok: false, status, code, message, details, retryable }
}

function isJpeg(bytes: Buffer): boolean {
  return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
}

function isPng(bytes: Buffer): boolean {
  const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
  return bytes.length >= signature.length && signature.every((byte, index) => bytes[index] === byte)
}
