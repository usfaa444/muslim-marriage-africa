import { and, desc, eq } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import { isUuidV7 } from '@ankanu/kernel'
import { getIdentityDatabase } from './account-store.js'
import { photoAsset, photoDerivative, signedGrant } from './account-schema.js'
import { getEvidenceWriter } from './evidence-writer.js'

export type PhotoKind = 'profile_photo' | 'chat_photo' | 'voice_note'
export type ModerationState = 'pending' | 'live' | 'blocked'
export type DerivativeSize = 'xs' | 'sm' | 'md' | 'blur'

export type StoredAsset = {
  id: string
  owner_id: string
  kind: PhotoKind
  original_key: string
  blur_key: string | null
  moderation_state: ModerationState | null
}

export type StoredDerivative = {
  id: string
  photo_asset_id: string
  size: DerivativeSize
  object_key: string
}

export type StoredGrant = {
  id: string
  photo_asset_id: string
  viewer_id: string
  derivative: string
  expires_at: string
  revoked_at: string | null
}

export class MediaStorageError extends Error {
  constructor() {
    super('storage')
    this.name = 'MediaStorageError'
  }
}

export type MediaStore = {
  saveAsset(
    asset: StoredAsset,
    derivative: StoredDerivative,
    original: Uint8Array,
    blur: Uint8Array,
  ): Promise<void>
  latestProfilePhoto(ownerId: string): Promise<StoredAsset | null>
  pendingProfilePhotos(ownerId: string): Promise<StoredAsset[]>
  setModerationState(id: string, state: ModerationState, db?: Pick<NodePgDatabase, 'update'>): Promise<boolean>
  asset(id: string): Promise<StoredAsset | null>
  bytes(key: string): Promise<Uint8Array | null>
  saveGrant(grant: StoredGrant): Promise<void>
  grant(id: string): Promise<StoredGrant | null>
  revokeGrant(id: string, at: string): Promise<void>
}

let override: MediaStore | undefined

export function setMediaStore(store: MediaStore | undefined): void {
  override = store
}

export function getMediaStore(): MediaStore {
  if (override) {
    return override
  }
  return postgresMediaStore()
}

export function memoryMediaStore(): MediaStore & {
  assets: StoredAsset[]
  derivatives: StoredDerivative[]
  grants: StoredGrant[]
  blobs: Map<string, Uint8Array>
  snapshot(): Array<{ id: string; moderation_state: ModerationState | null }>
  restore(rows: Array<{ id: string; moderation_state: ModerationState | null }>): void
} {
  const assets: StoredAsset[] = []
  const derivatives: StoredDerivative[] = []
  const grants: StoredGrant[] = []
  const blobs = new Map<string, Uint8Array>()
  return {
    assets,
    derivatives,
    grants,
    blobs,
    async saveAsset(asset, derivative, original, blur) {
      blobs.set(asset.original_key, original)
      blobs.set(derivative.object_key, blur)
      assets.push(asset)
      derivatives.push(derivative)
    },
    async latestProfilePhoto(ownerId) {
      const rows = assets.filter((row) => row.owner_id === ownerId && row.kind === 'profile_photo')
      return rows[rows.length - 1] ?? null
    },
    async pendingProfilePhotos(ownerId) {
      return assets.filter(
        (row) => row.owner_id === ownerId && row.kind === 'profile_photo' && row.moderation_state === 'pending',
      )
    },
    snapshot() {
      return assets.map((row) => ({ id: row.id, moderation_state: row.moderation_state }))
    },
    restore(rows: Array<{ id: string; moderation_state: ModerationState | null }>) {
      for (const item of rows) {
        const row = assets.find((asset) => asset.id === item.id)
        if (row) {
          row.moderation_state = item.moderation_state
        }
      }
    },
    async setModerationState(id, state) {
      const row = assets.find((item) => item.id === id)
      if (!row || row.moderation_state !== 'pending') {
        return false
      }
      row.moderation_state = state
      return true
    },
    async asset(id) {
      return assets.find((row) => row.id === id) ?? null
    },
    async bytes(key) {
      return blobs.get(key) ?? null
    },
    async saveGrant(grant) {
      grants.push(grant)
    },
    async grant(id) {
      return grants.find((row) => row.id === id) ?? null
    },
    async revokeGrant(id, at) {
      const row = grants.find((item) => item.id === id)
      if (row) {
        row.revoked_at = at
      }
    },
  }
}

function postgresMediaStore(): MediaStore {
  return {
    saveAsset: saveAsset,
    latestProfilePhoto: latestProfilePhoto,
    pendingProfilePhotos: pendingProfilePhotos,
    setModerationState: setModerationState,
    asset: readAsset,
    bytes: readBytes,
    saveGrant: saveGrant,
    grant: readGrant,
    revokeGrant: revokeGrant,
  }
}

async function saveAsset(
  asset: StoredAsset,
  derivative: StoredDerivative,
  original: Uint8Array,
  blur: Uint8Array,
): Promise<void> {
  const writer = getEvidenceWriter()
  if (!writer) {
    throw new MediaStorageError()
  }
  await writer.writeObject(asset.original_key, original)
  await writer.writeObject(derivative.object_key, blur)
  const database = getIdentityDatabase()
  await database.insert(photoAsset).values({
    id: asset.id,
    owner_id: asset.owner_id,
    kind: asset.kind,
    original_key: asset.original_key,
    blur_key: asset.blur_key,
    moderation_state: asset.moderation_state,
  })
  await database.insert(photoDerivative).values({
    id: derivative.id,
    photo_asset_id: derivative.photo_asset_id,
    size: derivative.size,
    object_key: derivative.object_key,
  })
}

async function latestProfilePhoto(ownerId: string): Promise<StoredAsset | null> {
  const rows = await getIdentityDatabase()
    .select()
    .from(photoAsset)
    .where(and(eq(photoAsset.owner_id, ownerId), eq(photoAsset.kind, 'profile_photo')))
    .orderBy(desc(photoAsset.id))
    .limit(1)
  return rows[0] ? asAsset(rows[0]) : null
}

async function pendingProfilePhotos(ownerId: string): Promise<StoredAsset[]> {
  const rows = await getIdentityDatabase()
    .select()
    .from(photoAsset)
    .where(
      and(eq(photoAsset.owner_id, ownerId), eq(photoAsset.kind, 'profile_photo'), eq(photoAsset.moderation_state, 'pending')),
    )
    .orderBy(photoAsset.id)
  return rows.map(asAsset)
}

async function setModerationState(
  id: string,
  state: ModerationState,
  db?: Pick<NodePgDatabase, 'update'>,
): Promise<boolean> {
  const updated = await (db ?? getIdentityDatabase())
    .update(photoAsset)
    .set({ moderation_state: state })
    .where(and(eq(photoAsset.id, id), eq(photoAsset.moderation_state, 'pending')))
    .returning({ id: photoAsset.id })
  return updated.length === 1
}

async function readAsset(id: string): Promise<StoredAsset | null> {
  const rows = await getIdentityDatabase().select().from(photoAsset).where(eq(photoAsset.id, id)).limit(1)
  return rows[0] ? asAsset(rows[0]) : null
}

async function readBytes(key: string): Promise<Uint8Array | null> {
  const writer = getEvidenceWriter()
  if (!writer) {
    throw new MediaStorageError()
  }
  try {
    return await writer.readObject(key)
  } catch {
    return null
  }
}

async function saveGrant(grant: StoredGrant): Promise<void> {
  await getIdentityDatabase().insert(signedGrant).values({
    id: grant.id,
    photo_asset_id: grant.photo_asset_id,
    viewer_id: grant.viewer_id,
    derivative: grant.derivative,
    expires_at: grant.expires_at,
    revoked_at: grant.revoked_at,
  })
}

async function readGrant(id: string): Promise<StoredGrant | null> {
  if (!isUuidV7(id)) {
    return null
  }
  const rows = await getIdentityDatabase().select().from(signedGrant).where(eq(signedGrant.id, id)).limit(1)
  const row = rows[0]
  if (!row) {
    return null
  }
  return {
    id: row.id,
    photo_asset_id: row.photo_asset_id,
    viewer_id: row.viewer_id,
    derivative: row.derivative,
    expires_at: asTimestamp(row.expires_at),
    revoked_at: row.revoked_at === null ? null : asTimestamp(row.revoked_at),
  }
}

async function revokeGrant(id: string, at: string): Promise<void> {
  await getIdentityDatabase().update(signedGrant).set({ revoked_at: at }).where(eq(signedGrant.id, id))
}

function asAsset(row: typeof photoAsset.$inferSelect): StoredAsset {
  return {
    id: row.id,
    owner_id: row.owner_id,
    kind: row.kind === 'chat_photo' || row.kind === 'voice_note' ? row.kind : 'profile_photo',
    original_key: row.original_key,
    blur_key: row.blur_key,
    moderation_state:
      row.moderation_state === 'pending' || row.moderation_state === 'live' || row.moderation_state === 'blocked'
        ? row.moderation_state
        : null,
  }
}

function asTimestamp(value: string | Date): string {
  if (value instanceof Date) {
    return value.toISOString()
  }
  return value
}
