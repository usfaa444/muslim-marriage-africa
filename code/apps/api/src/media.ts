import { eq } from 'drizzle-orm'
import { newId } from '@ankanu/kernel'
import { getIdentityDatabase } from './account-store.js'
import { operatorConfig } from './operator-config.js'
import { PhotoDecodeError, blurProfilePhoto, isJpeg, isPng } from './media-blur.js'
import {
  MediaStorageError,
  type MediaStore,
  type ModerationState,
  type StoredAsset,
  type StoredDerivative,
} from './media-store.js'

/** Stitch screen 12 heading. Pending profile photos use this sentence and no other. */
export const PHOTO_CAPTION = 'Photo en revue — pas encore publique.'

/** Same byte cap as the ID and liveness capture already accepted by this API. */
export const MAX_PROFILE_PHOTO_BYTES = 5_242_880

const TTL_CAP_SECONDS = 60
const IMAGE_MESSAGE = 'image : une image JPEG ou PNG est requise.'
const KIND_MESSAGE = 'kind : seule une photo de profil peut être envoyée.'
const OMIT_MESSAGE = 'Photo non publique.'
const REVEAL_MESSAGE = 'Révélation refusée.'
const GRANT_MESSAGE = 'Accès au média refusé.'
const STORAGE_MESSAGE = 'Request failed'
const TTL_MESSAGE = 'signed_url_ttl_seconds : la configuration est illisible.'

export type MediaFailure = {
  ok: false
  status: 400 | 403 | 503
  code: 'FORBIDDEN' | 'REVEAL_DENIED' | 'UNHANDLED'
  message: string
  details: { field?: string } | null
  retryable: boolean
}

export type OwnerPhotoCard = {
  id: string
  kind: 'profile_photo'
  moderation_state: ModerationState
  caption: string | null
  blur_url: string
}

export type DiscoveryPhoto = {
  id: string
  kind: 'profile_photo'
  moderation_state: 'live'
}

let clock: () => Date = () => new Date()
let ttlReader: (() => Promise<number>) | undefined

export function setMediaClock(next: (() => Date) | undefined): void {
  clock = next ?? (() => new Date())
}

export function setSignedTtlReader(next: (() => Promise<number>) | undefined): void {
  ttlReader = next
}

/** Profile publish-gate and bio only. Chat photo and voice note are never legal targets. */
export function applyModerationAllowed(target: string): boolean {
  return target === 'profile_photo' || target === 'bio'
}

/** Public and discovery projections omit a profile photo until it is `live`. */
export function discoveryPhoto(asset: StoredAsset | null): DiscoveryPhoto | null {
  if (!asset || asset.kind !== 'profile_photo' || asset.moderation_state !== 'live') {
    return null
  }
  return { id: asset.id, kind: 'profile_photo', moderation_state: 'live' }
}

export async function uploadProfilePhoto(
  store: MediaStore,
  ownerId: string,
  body: unknown,
): Promise<{ ok: true; photo: OwnerPhotoCard } | MediaFailure> {
  const parsed = readBody(body)
  if (!parsed.ok) {
    return parsed.failure
  }
  const blurred = blurBytes(parsed.bytes)
  if (!blurred.ok) {
    return blurred.failure
  }
  const id = newId(clock())
  const derivativeId = newId(clock())
  const originalKey = `profile-photo/${id}/original`
  const blurKey = `profile-photo/${id}/blur`
  const asset: StoredAsset = {
    id,
    owner_id: ownerId,
    kind: 'profile_photo',
    original_key: originalKey,
    blur_key: blurKey,
    moderation_state: 'pending',
  }
  const derivative: StoredDerivative = {
    id: derivativeId,
    photo_asset_id: id,
    size: 'blur',
    object_key: blurKey,
  }
  try {
    await store.saveAsset(asset, derivative, parsed.bytes, blurred.bytes)
  } catch (error) {
    if (error instanceof MediaStorageError) {
      return storageFailure()
    }
    throw error
  }
  const signed = await signMedia(store, id, 'blur', ownerId)
  if (!signed.ok) {
    return signed
  }
  return { ok: true, photo: card(asset, signed.url) }
}

export async function ownerPhotoCard(
  store: MediaStore,
  ownerId: string,
): Promise<{ ok: true; photo: OwnerPhotoCard | null } | MediaFailure> {
  const asset = await store.latestProfilePhoto(ownerId)
  if (!asset) {
    return { ok: true, photo: null }
  }
  const signed = await signMedia(store, asset.id, 'blur', ownerId)
  if (!signed.ok) {
    return signed
  }
  return { ok: true, photo: card(asset, signed.url) }
}

export async function signMedia(
  store: MediaStore,
  assetId: string,
  derivative: string,
  viewerId: string,
): Promise<{ ok: true; url: string; expires_at: string } | MediaFailure> {
  if (derivative !== 'blur') {
    return revealDenied()
  }
  const asset = await store.asset(assetId)
  if (!asset || !asset.blur_key) {
    return grantDenied()
  }
  if (asset.kind === 'profile_photo' && asset.moderation_state !== 'live' && viewerId !== asset.owner_id) {
    return omitted()
  }
  let seconds: number
  try {
    seconds = await ttlSeconds()
  } catch {
    return ttlFailure()
  }
  const now = clock()
  const expires = new Date(now.getTime() + seconds * 1000).toISOString()
  const id = newId(now)
  await store.saveGrant({
    id,
    photo_asset_id: asset.id,
    viewer_id: viewerId,
    derivative: 'blur',
    expires_at: expires,
    revoked_at: null,
  })
  return { ok: true, url: `/v1/media/get?token=${id}`, expires_at: expires }
}

export async function readGrantedMedia(
  store: MediaStore,
  token: string,
  viewerId: string,
): Promise<{ ok: true; bytes: Uint8Array } | MediaFailure> {
  const grant = await store.grant(token)
  if (!grant || grant.viewer_id !== viewerId || grant.revoked_at !== null) {
    return grantDenied()
  }
  if (Date.parse(grant.expires_at) <= clock().getTime()) {
    return grantDenied()
  }
  if (grant.derivative !== 'blur') {
    return revealDenied()
  }
  const asset = await store.asset(grant.photo_asset_id)
  if (!asset || !asset.blur_key) {
    return grantDenied()
  }
  if (asset.kind === 'profile_photo' && asset.moderation_state !== 'live' && viewerId !== asset.owner_id) {
    return omitted()
  }
  let bytes: Uint8Array | null
  try {
    bytes = await store.bytes(asset.blur_key)
  } catch (error) {
    if (error instanceof MediaStorageError) {
      return storageFailure()
    }
    throw error
  }
  if (!bytes) {
    return storageFailure()
  }
  return { ok: true, bytes }
}

function card(asset: StoredAsset, blurUrl: string): OwnerPhotoCard {
  const state = asset.moderation_state === 'live' || asset.moderation_state === 'blocked' ? asset.moderation_state : 'pending'
  return {
    id: asset.id,
    kind: 'profile_photo',
    moderation_state: state,
    caption: state === 'pending' ? PHOTO_CAPTION : null,
    blur_url: blurUrl,
  }
}

function readBody(body: unknown): { ok: true; bytes: Buffer } | { ok: false; failure: MediaFailure } {
  if (typeof body !== 'object' || body === null) {
    return { ok: false, failure: fieldFailure('kind', KIND_MESSAGE) }
  }
  const record = body as Record<string, unknown>
  if (record.kind !== 'profile_photo') {
    return { ok: false, failure: fieldFailure('kind', KIND_MESSAGE) }
  }
  if (typeof record.image !== 'string') {
    return { ok: false, failure: fieldFailure('image', IMAGE_MESSAGE) }
  }
  const decoded = decodeImage(record.image)
  if (!decoded) {
    return { ok: false, failure: fieldFailure('image', IMAGE_MESSAGE) }
  }
  return { ok: true, bytes: decoded }
}

function decodeImage(image: string): Buffer | null {
  if (image.length < 1) {
    return null
  }
  const bytes = Buffer.from(image, 'base64')
  if (bytes.length < 1 || bytes.length > MAX_PROFILE_PHOTO_BYTES) {
    return null
  }
  if (bytes.toString('base64').replace(/=+$/, '') !== image.replace(/=+$/, '')) {
    return null
  }
  if (!isJpeg(bytes) && !isPng(bytes)) {
    return null
  }
  return bytes
}

function blurBytes(bytes: Buffer): { ok: true; bytes: Buffer } | { ok: false; failure: MediaFailure } {
  try {
    return { ok: true, bytes: blurProfilePhoto(bytes) }
  } catch (error) {
    if (error instanceof PhotoDecodeError) {
      return { ok: false, failure: fieldFailure('image', IMAGE_MESSAGE) }
    }
    throw error
  }
}

async function ttlSeconds(): Promise<number> {
  const raw = ttlReader ? await ttlReader() : await readSignedTtl()
  if (!Number.isInteger(raw) || raw < 1) {
    throw new Error('ttl')
  }
  return Math.min(TTL_CAP_SECONDS, raw)
}

async function readSignedTtl(): Promise<number> {
  const rows = await getIdentityDatabase()
    .select({ value: operatorConfig.value })
    .from(operatorConfig)
    .where(eq(operatorConfig.key, 'signed_url_ttl_seconds'))
    .limit(1)
  const value = rows[0]?.value
  if (value === undefined || !/^[0-9]+$/.test(value)) {
    throw new Error('ttl')
  }
  return Number(value)
}

function fieldFailure(field: string, message: string): MediaFailure {
  return { ok: false, status: 400, code: 'UNHANDLED', message, details: { field }, retryable: false }
}

function revealDenied(): MediaFailure {
  return { ok: false, status: 403, code: 'REVEAL_DENIED', message: REVEAL_MESSAGE, details: null, retryable: false }
}

function omitted(): MediaFailure {
  return { ok: false, status: 403, code: 'FORBIDDEN', message: OMIT_MESSAGE, details: null, retryable: false }
}

function grantDenied(): MediaFailure {
  return { ok: false, status: 403, code: 'FORBIDDEN', message: GRANT_MESSAGE, details: null, retryable: false }
}

function storageFailure(): MediaFailure {
  return { ok: false, status: 503, code: 'UNHANDLED', message: STORAGE_MESSAGE, details: null, retryable: true }
}

function ttlFailure(): MediaFailure {
  return { ok: false, status: 503, code: 'UNHANDLED', message: TTL_MESSAGE, details: { field: 'signed_url_ttl_seconds' }, retryable: true }
}
