import { newId } from '@ankanu/kernel'
import type { VoiceLanguage } from '@ankanu/ports'
import { PhotoDecodeError, blurProfilePhoto, imageSize, isJpeg, isPng } from './media-blur.js'
import {
  audioContentType,
  chatGrantDenied,
  chatTtlFailure,
  mediaNow,
  signedUrlTtlSeconds,
  type MediaFailure,
} from './media.js'
import type { MediaStore, StoredAsset, StoredDerivative } from './media-store.js'

/**
 * Chat media for the media module (Stories 5.3, 5.4). A Chat Photo is stored as `photo_asset.kind = chat_photo` with
 * its server `blur` derivative and a clear `md` derivative; a Voice note as `photo_asset.kind = voice_note` (AD-10: not
 * `content.audio_asset`). Neither has a moderation state: `applyModeration` never applies to them and signing never
 * waits on a review. Only `signChatMedia` mints their URLs, and only Chat calls it, after its participant check, for
 * the caller themself; the media gateway re-checks that the grant belongs to the caller (non-transferable token).
 */

/** A Chat Photo after client compression is far below this; the server refuses anything heavier. */
export const CHAT_PHOTO_MAX_BYTES = 2_097_152
/** Longest edge accepted, checked from the header before any decode (a small file can hide a huge raster). */
export const CHAT_PHOTO_MAX_EDGE = 6000
/** Voice note limits: 2 minutes, 1 MiB (Opus at 32 kbit/s is about 480 KB for 2 minutes). */
export const VOICE_MAX_MS = 120_000
export const VOICE_MIN_MS = 1_000
export const VOICE_MAX_BYTES = 1_048_576
export const VOICE_LANGUAGES: readonly VoiceLanguage[] = ['fr', 'mos', 'dyu']

export const PHOTO_REQUIRED_MESSAGE = 'Une photo JPEG ou PNG est requise.'
export const PHOTO_HEAVY_MESSAGE = 'Photo trop lourde (2 Mo au plus).'
export const PHOTO_LARGE_MESSAGE = `Photo trop grande (${CHAT_PHOTO_MAX_EDGE} pixels de côté au plus).`
export const VOICE_REQUIRED_MESSAGE = 'Une note vocale est requise.'
export const VOICE_HEAVY_MESSAGE = 'Note vocale trop lourde (1 Mo au plus).'
export const VOICE_LONG_MESSAGE = 'Note vocale trop longue (2 minutes au plus).'
export const VOICE_SHORT_MESSAGE = 'Note vocale trop courte (1 seconde au moins).'

export type ChatPhotoInput = {
  bytes: Buffer
  blur: Buffer
  contentType: 'image/jpeg' | 'image/png'
  width: number
  height: number
}

export type VoiceNoteInput = {
  bytes: Buffer
  contentType: 'audio/webm' | 'audio/ogg' | 'audio/mp4'
  durationMs: number
  language: VoiceLanguage | null
}

export type MediaInputFailure = { ok: false; field: string; message: string; max?: number }

function decodeBase64(value: unknown, maxBytes: number): Buffer | 'heavy' | null {
  if (typeof value !== 'string' || value.length < 1) {
    return null
  }
  // Refuse before decoding: base64 is 4 characters for 3 bytes.
  if (value.length > Math.ceil(maxBytes / 3) * 4 + 4) {
    return 'heavy'
  }
  const bytes = Buffer.from(value, 'base64')
  if (bytes.length < 1) {
    return null
  }
  if (bytes.toString('base64').replace(/=+$/, '') !== value.replace(/=+$/, '')) {
    return null
  }
  return bytes.length > maxBytes ? 'heavy' : bytes
}

/** JPEG without APP1–APP15 (EXIF, XMP: GPS position, device) and comments. Null when the segments do not parse. */
export function stripJpegMetadata(bytes: Buffer): Buffer | null {
  const parts: Buffer[] = [bytes.subarray(0, 2)]
  let offset = 2
  while (offset + 1 < bytes.length) {
    if (bytes[offset] !== 0xff) {
      return null
    }
    const marker = bytes[offset + 1] ?? 0
    if (marker === 0xff) {
      offset += 1
      continue
    }
    if (marker === 0xda) {
      parts.push(bytes.subarray(offset))
      return Buffer.concat(parts)
    }
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      parts.push(bytes.subarray(offset, offset + 2))
      offset += 2
      continue
    }
    if (marker === 0xd9 || offset + 4 > bytes.length) {
      return null
    }
    const length = bytes.readUInt16BE(offset + 2)
    if (length < 2 || offset + 2 + length > bytes.length) {
      return null
    }
    const metadata = (marker >= 0xe1 && marker <= 0xef) || marker === 0xfe
    if (!metadata) {
      parts.push(bytes.subarray(offset, offset + 2 + length))
    }
    offset += 2 + length
  }
  return null
}

const PNG_KEEP = new Set(['IHDR', 'PLTE', 'tRNS', 'IDAT', 'IEND', 'gAMA', 'cHRM', 'sRGB', 'iCCP', 'sBIT', 'pHYs'])

/** PNG with only image chunks: no `eXIf`, `tEXt`, `zTXt`, `iTXt` or `tIME`. Null when the chunks do not parse. */
export function stripPngMetadata(bytes: Buffer): Buffer | null {
  const parts: Buffer[] = [bytes.subarray(0, 8)]
  let offset = 8
  while (offset + 12 <= bytes.length) {
    const length = bytes.readUInt32BE(offset)
    const type = bytes.toString('latin1', offset + 4, offset + 8)
    const end = offset + 12 + length
    if (end > bytes.length) {
      return null
    }
    if (PNG_KEEP.has(type)) {
      parts.push(bytes.subarray(offset, end))
    }
    offset = end
    if (type === 'IEND') {
      return Buffer.concat(parts)
    }
  }
  return null
}

/** `image` of `POST …/messages` with `kind: 'photo'`: a JPEG or PNG, at most 2 MiB, metadata removed, blur made. */
export function readChatPhoto(image: unknown): { ok: true; photo: ChatPhotoInput } | MediaInputFailure {
  const decoded = decodeBase64(image, CHAT_PHOTO_MAX_BYTES)
  if (decoded === 'heavy') {
    return { ok: false, field: 'image', message: PHOTO_HEAVY_MESSAGE, max: CHAT_PHOTO_MAX_BYTES }
  }
  if (!decoded || (!isJpeg(decoded) && !isPng(decoded))) {
    return { ok: false, field: 'image', message: PHOTO_REQUIRED_MESSAGE }
  }
  const size = imageSize(decoded)
  if (!size || size.width < 1 || size.height < 1) {
    return { ok: false, field: 'image', message: PHOTO_REQUIRED_MESSAGE }
  }
  if (size.width > CHAT_PHOTO_MAX_EDGE || size.height > CHAT_PHOTO_MAX_EDGE) {
    return { ok: false, field: 'image', message: PHOTO_LARGE_MESSAGE, max: CHAT_PHOTO_MAX_EDGE }
  }
  const png = isPng(decoded)
  const clean = png ? stripPngMetadata(decoded) : stripJpegMetadata(decoded)
  if (!clean) {
    return { ok: false, field: 'image', message: PHOTO_REQUIRED_MESSAGE }
  }
  let blur: Buffer
  try {
    blur = blurProfilePhoto(clean)
  } catch (error) {
    if (error instanceof PhotoDecodeError) {
      return { ok: false, field: 'image', message: PHOTO_REQUIRED_MESSAGE }
    }
    throw error
  }
  return { ok: true, photo: { bytes: clean, blur, contentType: png ? 'image/png' : 'image/jpeg', width: size.width, height: size.height } }
}

/** `audio`, `duration_ms` and `language` of `POST …/messages` with `kind: 'voice'`. */
export function readVoiceNote(
  audio: unknown,
  durationMs: unknown,
  language: unknown,
): { ok: true; voice: VoiceNoteInput } | MediaInputFailure {
  const decoded = decodeBase64(audio, VOICE_MAX_BYTES)
  if (decoded === 'heavy') {
    return { ok: false, field: 'audio', message: VOICE_HEAVY_MESSAGE, max: VOICE_MAX_BYTES }
  }
  const contentType = decoded ? audioContentType(decoded) : null
  if (!decoded || !contentType) {
    return { ok: false, field: 'audio', message: VOICE_REQUIRED_MESSAGE }
  }
  if (typeof durationMs !== 'number' || !Number.isInteger(durationMs) || durationMs < 0) {
    return { ok: false, field: 'duration_ms', message: 'duration_ms : valeur non reconnue.' }
  }
  if (durationMs > VOICE_MAX_MS) {
    return { ok: false, field: 'duration_ms', message: VOICE_LONG_MESSAGE, max: VOICE_MAX_MS }
  }
  if (durationMs < VOICE_MIN_MS) {
    return { ok: false, field: 'duration_ms', message: VOICE_SHORT_MESSAGE }
  }
  if (language !== undefined && language !== null && !VOICE_LANGUAGES.includes(language as VoiceLanguage)) {
    return { ok: false, field: 'language', message: 'language : valeur non reconnue.' }
  }
  return {
    ok: true,
    voice: { bytes: decoded, contentType, durationMs, language: (language as VoiceLanguage | null | undefined) ?? null },
  }
}

/** Writes the objects and the `photo_asset` row; throws `MediaStorageError` when object storage is missing. */
export async function storeChatPhoto(store: MediaStore, ownerId: string, photo: ChatPhotoInput): Promise<string> {
  const id = newId(mediaNow())
  const originalKey = `chat-photo/${id}/original`
  const mdKey = `chat-photo/${id}/md`
  const blurKey = `chat-photo/${id}/blur`
  const asset: StoredAsset = {
    id,
    owner_id: ownerId,
    kind: 'chat_photo',
    original_key: originalKey,
    blur_key: blurKey,
    moderation_state: null,
    is_main: false,
  }
  const derivatives: StoredDerivative[] = [
    { id: newId(mediaNow()), photo_asset_id: id, size: 'blur', object_key: blurKey },
    { id: newId(mediaNow()), photo_asset_id: id, size: 'md', object_key: mdKey },
  ]
  await store.saveAsset(asset, derivatives, [
    { key: originalKey, bytes: photo.bytes },
    { key: mdKey, bytes: photo.bytes },
    { key: blurKey, bytes: photo.blur },
  ])
  return id
}

export async function storeVoiceNote(store: MediaStore, ownerId: string, voice: VoiceNoteInput): Promise<string> {
  const id = newId(mediaNow())
  const originalKey = `voice-note/${id}/original`
  await store.saveAsset(
    { id, owner_id: ownerId, kind: 'voice_note', original_key: originalKey, blur_key: null, moderation_state: null, is_main: false },
    [],
    [{ key: originalKey, bytes: voice.bytes }],
  )
  return id
}

/**
 * The only signer of Chat media. `blur` is the Chat Photo's server blur; `clear` is its `md` derivative, or the audio
 * of a Voice note. Never `original`. The caller (Chat) has checked that `viewerId` takes part in the conversation.
 * No moderation state is read or awaited (AD-10: sign must not wait on applyModeration).
 */
export async function signChatMedia(
  store: MediaStore,
  assetId: string,
  variant: 'blur' | 'clear',
  viewerId: string,
): Promise<{ ok: true; url: string; expires_at: string } | MediaFailure> {
  const asset = await store.asset(assetId)
  if (!asset || (asset.kind !== 'chat_photo' && asset.kind !== 'voice_note')) {
    return chatGrantDenied()
  }
  let derivative: 'blur' | 'md' | 'voice'
  if (asset.kind === 'voice_note') {
    if (variant !== 'clear') {
      return chatGrantDenied()
    }
    derivative = 'voice'
  } else {
    derivative = variant === 'blur' ? 'blur' : 'md'
    if (derivative === 'blur' ? !asset.blur_key : !(await store.derivative(asset.id, 'md'))) {
      return chatGrantDenied()
    }
  }
  let seconds: number
  try {
    seconds = await signedUrlTtlSeconds()
  } catch {
    return chatTtlFailure()
  }
  const now = mediaNow()
  const expires = new Date(now.getTime() + seconds * 1000).toISOString()
  const id = newId(now)
  await store.saveGrant({ id, photo_asset_id: asset.id, viewer_id: viewerId, derivative, expires_at: expires, revoked_at: null })
  return { ok: true, url: `/v1/media/get?token=${id}`, expires_at: expires }
}

/**
 * Bytes for the Epic 8 scan worker (AD-10 `MediaPort.fetchForScan`): the Chat Photo's clear `md` or the Voice note's
 * audio. Moderation reads media through this, never `message`.
 */
export async function fetchChatMediaForScan(
  store: MediaStore,
  mediaId: string,
): Promise<{ kind: 'chat_photo' | 'voice_note'; bytes: Uint8Array } | null> {
  const asset = await store.asset(mediaId)
  if (!asset || (asset.kind !== 'chat_photo' && asset.kind !== 'voice_note')) {
    return null
  }
  const key = asset.kind === 'voice_note' ? asset.original_key : ((await store.derivative(asset.id, 'md'))?.object_key ?? null)
  const bytes = key ? await store.bytes(key) : null
  return bytes ? { kind: asset.kind, bytes } : null
}
