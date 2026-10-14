import { eq } from 'drizzle-orm'
import { newId } from '@ankanu/kernel'
import { getIdentityDatabase } from './account-store.js'
import { operatorConfig } from './operator-config.js'
import { getProfileStore } from './profile-store.js'
import { PhotoDecodeError, blurProfilePhoto, isJpeg, isPng } from './media-blur.js'
import {
  MediaStorageError,
  type MediaStore,
  type ModerationState,
  type StoredAsset,
  type StoredDerivative,
} from './media-store.js'
import { photoStrikeBlock } from './photo-strike.js'

/** Stitch screen 12 heading. Pending profile photos use this sentence and no other. */
export const PHOTO_CAPTION = 'Photo en revue — pas encore publique.'

/** Same byte cap as the ID and liveness capture already accepted by this API. */
export const MAX_PROFILE_PHOTO_BYTES = 5_242_880

/** Founder product rule. Live and pending profile photos count. Blocked and replaced do not. */
export const MAX_PROFILE_PHOTOS = 6

const PHOTO_LIMIT_MESSAGE = '6 photos maximum. Retirez une photo pour en ajouter une autre.'

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
  status: 400 | 403 | 409 | 429 | 503
  code: 'FORBIDDEN' | 'REVEAL_DENIED' | 'UNHANDLED' | 'RATE_LIMITED' | 'PHOTO_LIMIT_REACHED'
  message: string
  details: { field?: string; reason?: string; blocked_until?: string; cap?: number; count?: number } | null
  retryable: boolean
  retryAfter?: number
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

export type GalleryPhoto = {
  id: string
  moderation_state: 'pending' | 'live'
  is_main: boolean
  caption: string | null
  url: string
}

export type PublicPhoto = {
  id: string
  is_main: boolean
  url: string
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

/** The discovery card shows the live MAIN photo only. */
export function discoveryPhoto(asset: StoredAsset | null): DiscoveryPhoto | null {
  if (!asset || asset.kind !== 'profile_photo' || asset.moderation_state !== 'live' || asset.is_main !== true) {
    return null
  }
  return { id: asset.id, kind: 'profile_photo', moderation_state: 'live' }
}

export async function uploadProfilePhoto(
  store: MediaStore,
  ownerId: string,
  body: unknown,
): Promise<{ ok: true; photo: OwnerPhotoCard } | MediaFailure> {
  const gate = await photoUploadGate(ownerId)
  if (!gate.ok) {
    return gate
  }
  return store.withOwnerPhotoLock(ownerId, async () => {
    const open = await store.countOpenProfilePhotos(ownerId)
    if (open >= MAX_PROFILE_PHOTOS) {
      return photoLimit(open)
    }
    const parsed = readBody(body)
    if (!parsed.ok) {
      return parsed.failure
    }
    const blurred = blurBytes(parsed.bytes)
    if (!blurred.ok) {
      return blurred.failure
    }
    const id = newId(clock())
    const originalKey = `profile-photo/${id}/original`
    const blurKey = `profile-photo/${id}/blur`
    const smKey = `profile-photo/${id}/sm`
    const mdKey = `profile-photo/${id}/md`
    const asset: StoredAsset = {
      id,
      owner_id: ownerId,
      kind: 'profile_photo',
      original_key: originalKey,
      blur_key: blurKey,
      moderation_state: 'pending',
      is_main: false,
    }
    const derivatives: StoredDerivative[] = [
      { id: newId(clock()), photo_asset_id: id, size: 'blur', object_key: blurKey },
      { id: newId(clock()), photo_asset_id: id, size: 'sm', object_key: smKey },
      { id: newId(clock()), photo_asset_id: id, size: 'md', object_key: mdKey },
    ]
    try {
      await store.saveAsset(asset, derivatives, [
        { key: originalKey, bytes: parsed.bytes },
        { key: blurKey, bytes: blurred.bytes },
        { key: smKey, bytes: parsed.bytes },
        { key: mdKey, bytes: parsed.bytes },
      ])
      await getProfileStore().noteQueued(ownerId, clock().toISOString())
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
  })
}

export async function ownerPhotoCard(
  store: MediaStore,
  ownerId: string,
): Promise<{ ok: true; photo: OwnerPhotoCard | null } | MediaFailure> {
  const photos = await store.openProfilePhotos(ownerId)
  const main = photos.find((row) => row.moderation_state === 'live' && row.is_main)
  const asset = main ?? photos.find((row) => row.moderation_state === 'pending') ?? null
  if (!asset || asset.moderation_state === 'replaced' || asset.moderation_state === 'blocked') {
    return { ok: true, photo: null }
  }
  const signed = await signOwnerClear(store, asset.id, ownerId)
  if (!signed.ok) {
    return signed
  }
  return { ok: true, photo: card(asset, signed.url) }
}

/** Pending replacement shown beside the live photo. Absent when the only photo is still the pending one. */
export async function ownerPendingPhotoCard(
  store: MediaStore,
  ownerId: string,
): Promise<{ ok: true; photo: OwnerPhotoCard | null } | MediaFailure> {
  const live = await store.liveProfilePhoto(ownerId)
  if (!live) {
    return { ok: true, photo: null }
  }
  const pending = await store.pendingProfilePhotos(ownerId)
  const asset = pending[pending.length - 1]
  if (!asset) {
    return { ok: true, photo: null }
  }
  const signed = await signOwnerClear(store, asset.id, ownerId)
  if (!signed.ok) {
    return signed
  }
  return { ok: true, photo: card(asset, signed.url) }
}

export async function applyPhotoModeration(
  store: MediaStore,
  assetId: string,
  decision: 'allow' | 'block',
  db?: Parameters<MediaStore['allowProfilePhoto']>[1],
): Promise<boolean> {
  if (decision === 'allow') {
    return store.allowProfilePhoto(assetId, db)
  }
  if (db) {
    return store.setModerationState(assetId, 'blocked', db)
  }
  return store.setModerationState(assetId, 'blocked')
}

export async function ownerGallery(
  store: MediaStore,
  ownerId: string,
): Promise<{ ok: true; photos: GalleryPhoto[] } | MediaFailure> {
  const photos = await store.openProfilePhotos(ownerId)
  const listed: GalleryPhoto[] = []
  for (const asset of photos) {
    const live = asset.moderation_state === 'live'
    let signed = await signOwnerClear(store, asset.id, ownerId)
    if (!signed.ok && live) {
      signed = await signMedia(store, asset.id, 'blur', ownerId)
    }
    if (!signed.ok) {
      return signed
    }
    const state = asset.moderation_state === 'live' ? 'live' : 'pending'
    listed.push({
      id: asset.id,
      moderation_state: state,
      is_main: asset.is_main,
      caption: state === 'pending' ? PHOTO_CAPTION : null,
      url: signed.url,
    })
  }
  return { ok: true, photos: listed }
}

/** Live photos for another member. `sm` is the card and grid. `md` is profile details. */
export async function livePhotosForMember(
  store: MediaStore,
  ownerId: string,
  viewerId: string,
  size: 'sm' | 'md',
): Promise<{ ok: true; photos: PublicPhoto[] } | MediaFailure> {
  const photos = (await store.openProfilePhotos(ownerId)).filter((row) => row.moderation_state === 'live')
  const blurred = await profilePhotoBlur(ownerId)
  const listed: PublicPhoto[] = []
  for (const asset of photos) {
    const signed = await signMedia(
      store,
      asset.id,
      blurred ? 'blur' : size,
      viewerId,
      blurred ? undefined : { clearForMember: true },
    )
    if (!signed.ok) {
      return signed
    }
    listed.push({ id: asset.id, is_main: asset.is_main, url: signed.url })
  }
  return { ok: true, photos: listed }
}

export async function chooseMainPhoto(
  store: MediaStore,
  ownerId: string,
  assetId: string,
): Promise<{ ok: true; photos: GalleryPhoto[] } | MediaFailure> {
  const result = await store.setProfileMain(ownerId, assetId)
  if (result === 'missing') {
    return grantDenied()
  }
  if (result === 'not_live') {
    return reasonDenied('not_live', 'Cette photo n’est pas en ligne.')
  }
  return ownerGallery(store, ownerId)
}

export async function removeGalleryPhoto(
  store: MediaStore,
  ownerId: string,
  assetId: string,
): Promise<{ ok: true; photos: GalleryPhoto[] } | MediaFailure> {
  const result = await store.removeLiveGalleryPhoto(ownerId, assetId, clock().toISOString())
  if (result === 'missing') {
    return grantDenied()
  }
  if (result === 'not_live') {
    return reasonDenied('not_live', 'Cette photo n’est pas en ligne.')
  }
  if (result === 'main_photo') {
    return reasonDenied('main_photo', 'La photo principale ne peut pas être retirée.')
  }
  if (result === 'pending_photo') {
    return reasonDenied('pending_photo', 'Une photo en revue ne peut pas être retirée.')
  }
  return ownerGallery(store, ownerId)
}

export async function signMedia(
  store: MediaStore,
  assetId: string,
  derivative: string,
  viewerId: string,
  options?: { staffReview?: boolean; clearForMember?: boolean; ownerPreview?: boolean },
): Promise<{ ok: true; url: string; expires_at: string } | MediaFailure> {
  if (derivative === 'original' || derivative === 'xs') {
    return revealDenied()
  }
  const clear = derivative === 'sm' || derivative === 'md'
  if (!clear && derivative !== 'blur') {
    return revealDenied()
  }
  if (clear && (options?.clearForMember !== true || options?.staffReview === true)) {
    return revealDenied()
  }
  const asset = await store.asset(assetId)
  if (!asset || !asset.blur_key) {
    return grantDenied()
  }
  if (asset.kind === 'profile_photo' && (asset.moderation_state === 'replaced' || asset.moderation_state === 'blocked')) {
    return omitted()
  }
  if (clear) {
    const ownerPreview = options?.ownerPreview === true && viewerId === asset.owner_id
    const ownerPending = ownerPreview && asset.moderation_state === 'pending'
    if (asset.kind !== 'profile_photo' || (asset.moderation_state !== 'live' && !ownerPending)) {
      return revealDenied()
    }
    if (!ownerPreview && (await profilePhotoBlur(asset.owner_id))) {
      return revealDenied()
    }
    let row = await store.derivative(asset.id, derivative)
    if (!row && ownerPreview && derivative === 'md') {
      row = await backfillClearDerivative(store, asset)
    }
    if (!row) {
      return revealDenied()
    }
  }
  const staffPending = options?.staffReview === true && asset.moderation_state === 'pending'
  if (asset.kind === 'profile_photo' && asset.moderation_state !== 'live' && viewerId !== asset.owner_id && !staffPending) {
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
    derivative: clear ? derivative : 'blur',
    expires_at: expires,
    revoked_at: null,
  })
  return { ok: true, url: `/v1/media/get?token=${id}`, expires_at: expires }
}

export async function readGrantedMedia(
  store: MediaStore,
  token: string,
  viewerId: string,
): Promise<{ ok: true; bytes: Uint8Array; contentType: string } | MediaFailure> {
  const grant = await store.grant(token)
  if (!grant || grant.viewer_id !== viewerId || grant.revoked_at !== null) {
    return grantDenied()
  }
  if (Date.parse(grant.expires_at) <= clock().getTime()) {
    return grantDenied()
  }
  const clear = grant.derivative === 'sm' || grant.derivative === 'md'
  if (!clear && grant.derivative !== 'blur') {
    return revealDenied()
  }
  const asset = await store.asset(grant.photo_asset_id)
  if (!asset || !asset.blur_key) {
    return grantDenied()
  }
  if (asset.kind === 'profile_photo' && asset.moderation_state === 'replaced') {
    return omitted()
  }
  if (clear) {
    const ownerPending = viewerId === asset.owner_id && asset.moderation_state === 'pending'
    if (asset.kind !== 'profile_photo' || (asset.moderation_state !== 'live' && !ownerPending)) {
      return revealDenied()
    }
    if (viewerId !== asset.owner_id && (await profilePhotoBlur(asset.owner_id))) {
      return revealDenied()
    }
  }
  const pendingGrant = asset.moderation_state === 'pending' && grant.derivative === 'blur'
  const ownerBlockedBlur =
    viewerId === asset.owner_id && asset.moderation_state === 'blocked' && grant.derivative === 'blur'
  if (
    asset.kind === 'profile_photo' &&
    asset.moderation_state !== 'live' &&
    !pendingGrant &&
    (viewerId !== asset.owner_id || ownerBlockedBlur)
  ) {
    return omitted()
  }
  let bytes: Uint8Array | null
  try {
    if (clear) {
      const row = await store.derivative(asset.id, grant.derivative === 'sm' ? 'sm' : 'md')
      bytes = row ? await store.bytes(row.object_key) : null
    } else {
      bytes = await store.bytes(asset.blur_key)
    }
  } catch (error) {
    if (error instanceof MediaStorageError) {
      return storageFailure()
    }
    throw error
  }
  if (!bytes) {
    return storageFailure()
  }
  return { ok: true, bytes, contentType: imageContentType(bytes) }
}

/** Clear `md` for this owner only. `photo_blur` does not apply. Never `original`. */
async function signOwnerClear(
  store: MediaStore,
  assetId: string,
  ownerId: string,
): Promise<{ ok: true; url: string; expires_at: string } | MediaFailure> {
  return signMedia(store, assetId, 'md', ownerId, { clearForMember: true, ownerPreview: true })
}

async function backfillClearDerivative(store: MediaStore, asset: StoredAsset): Promise<StoredDerivative | null> {
  const original = await store.bytes(asset.original_key)
  if (!original) {
    return null
  }
  const key = `profile-photo/${asset.id}/md`
  const row: StoredDerivative = {
    id: newId(clock()),
    photo_asset_id: asset.id,
    size: 'md',
    object_key: key,
  }
  try {
    await store.saveDerivative(row, { key, bytes: original })
  } catch (error) {
    if (error instanceof MediaStorageError) {
      return null
    }
    throw error
  }
  return (await store.derivative(asset.id, 'md')) ?? row
}

function imageContentType(bytes: Uint8Array): string {
  const buffer = Buffer.from(bytes)
  if (isPng(buffer)) {
    return 'image/png'
  }
  if (isJpeg(buffer)) {
    return 'image/jpeg'
  }
  return 'application/octet-stream'
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

function reasonDenied(reason: string, message: string): MediaFailure {
  return { ok: false, status: 403, code: 'FORBIDDEN', message, details: { reason }, retryable: false }
}

function photoLimit(count: number): MediaFailure {
  return {
    ok: false,
    status: 409,
    code: 'PHOTO_LIMIT_REACHED',
    message: PHOTO_LIMIT_MESSAGE,
    details: { reason: 'profile_photo_cap', cap: MAX_PROFILE_PHOTOS, count },
    retryable: false,
  }
}

async function profilePhotoBlur(ownerId: string): Promise<boolean> {
  const row = await getProfileStore().read(ownerId)
  return row ? row.photo_blur : true
}

function storageFailure(): MediaFailure {
  return { ok: false, status: 503, code: 'UNHANDLED', message: STORAGE_MESSAGE, details: null, retryable: true }
}

function ttlFailure(): MediaFailure {
  return { ok: false, status: 503, code: 'UNHANDLED', message: TTL_MESSAGE, details: { field: 'signed_url_ttl_seconds' }, retryable: true }
}

/** Strike guard before decode, object write, or a photo_asset row. */
async function photoUploadGate(ownerId: string): Promise<{ ok: true } | MediaFailure> {
  const strike = await photoStrikeBlock(ownerId, clock())
  if (!strike.ok) {
    return {
      ok: false,
      status: 503,
      code: 'UNHANDLED',
      message: `${strike.field} : la configuration est illisible.`,
      details: { field: strike.field },
      retryable: true,
    }
  }
  if (!strike.block) {
    return { ok: true }
  }
  return {
    ok: false,
    status: 429,
    code: 'RATE_LIMITED',
    message: `Envoi de photos suspendu : ${strike.count} photos ont été refusées.`,
    details: { reason: 'photo_strike', blocked_until: strike.block.blocked_until },
    retryable: true,
    retryAfter: strike.retryAfter,
  }
}
