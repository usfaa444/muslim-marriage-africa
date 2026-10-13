import { AsyncLocalStorage } from 'node:async_hooks'
import { and, desc, eq, inArray, isNull, sql } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import { isUuidV7 } from '@ankanu/kernel'
import { getIdentityDatabase } from './account-store.js'
import { photoAsset, photoDerivative, signedGrant } from './account-schema.js'
import { getEvidenceWriter } from './evidence-writer.js'

export type PhotoKind = 'profile_photo' | 'chat_photo' | 'voice_note'
export type ModerationState = 'pending' | 'live' | 'blocked' | 'replaced'
export type DerivativeSize = 'xs' | 'sm' | 'md' | 'blur'

export type StoredAsset = {
  id: string
  owner_id: string
  kind: PhotoKind
  original_key: string
  blur_key: string | null
  moderation_state: ModerationState | null
  is_main: boolean
}

export type PhotoFile = {
  key: string
  bytes: Uint8Array
}

export type MainResult = 'ok' | 'missing' | 'not_live'

export type RemoveResult = 'ok' | 'missing' | 'not_live' | 'main_photo' | 'pending_photo'

type MediaDb = Pick<NodePgDatabase, 'select' | 'update' | 'insert' | 'execute'>

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
  saveAsset(asset: StoredAsset, derivatives: StoredDerivative[], files: PhotoFile[]): Promise<void>
  withOwnerPhotoLock<T>(ownerId: string, work: () => Promise<T>): Promise<T>
  countOpenProfilePhotos(ownerId: string): Promise<number>
  openProfilePhotos(ownerId: string): Promise<StoredAsset[]>
  latestProfilePhoto(ownerId: string): Promise<StoredAsset | null>
  liveProfilePhoto(ownerId: string): Promise<StoredAsset | null>
  liveMainProfilePhotos(ownerIds: readonly string[]): Promise<StoredAsset[]>
  pendingProfilePhotos(ownerId: string): Promise<StoredAsset[]>
  allowProfilePhoto(id: string, db?: MediaDb): Promise<boolean>
  setProfileMain(ownerId: string, assetId: string): Promise<MainResult>
  removeLiveGalleryPhoto(ownerId: string, assetId: string, at: string): Promise<RemoveResult>
  replaceLiveProfilePhotos(ownerId: string, db?: Pick<NodePgDatabase, 'update'>): Promise<string[]>
  revokeUnrevokedGrants(assetIds: string[], at: string, db?: Pick<NodePgDatabase, 'update'>): Promise<void>
  setModerationState(id: string, state: ModerationState, db?: Pick<NodePgDatabase, 'update'>): Promise<boolean>
  asset(id: string): Promise<StoredAsset | null>
  derivative(assetId: string, size: DerivativeSize): Promise<StoredDerivative | null>
  saveDerivative(derivative: StoredDerivative, file: PhotoFile): Promise<void>
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
  snapshot(): {
    states: Array<{ id: string; moderation_state: ModerationState | null; is_main: boolean }>
    grants: Array<{ id: string; revoked_at: string | null }>
  }
  restore(saved: {
    states: Array<{ id: string; moderation_state: ModerationState | null; is_main?: boolean }>
    grants: Array<{ id: string; revoked_at: string | null }>
  }): void
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
    async saveAsset(asset, savedDerivatives, files) {
      for (const file of files) {
        blobs.set(file.key, file.bytes)
      }
      assets.push({ ...asset, is_main: asset.is_main === true })
      derivatives.push(...savedDerivatives)
    },
    withOwnerPhotoLock(ownerId, work) {
      return withMemoryPhotoLock(ownerId, work)
    },
    async countOpenProfilePhotos(ownerId) {
      return openRows(assets, ownerId).length
    },
    async openProfilePhotos(ownerId) {
      return sortOpenPhotos(openRows(assets, ownerId))
    },
    async latestProfilePhoto(ownerId) {
      const rows = assets.filter((row) => row.owner_id === ownerId && row.kind === 'profile_photo')
      return rows[rows.length - 1] ?? null
    },
    async liveProfilePhoto(ownerId) {
      return sortOpenPhotos(openRows(assets, ownerId)).find((row) => row.moderation_state === 'live') ?? null
    },
    async liveMainProfilePhotos(ownerIds) {
      const wanted = new Set(ownerIds)
      return assets.filter(
        (row) =>
          wanted.has(row.owner_id) &&
          row.kind === 'profile_photo' &&
          row.moderation_state === 'live' &&
          row.is_main === true,
      )
    },
    async pendingProfilePhotos(ownerId) {
      return assets
        .filter((row) => row.owner_id === ownerId && row.kind === 'profile_photo' && row.moderation_state === 'pending')
        .sort(byAssetId)
    },
    async allowProfilePhoto(id) {
      const row = assets.find((item) => item.id === id)
      if (!row || row.kind !== 'profile_photo' || row.moderation_state !== 'pending') {
        return false
      }
      row.moderation_state = 'live'
      const hasMain = assets.some(
        (item) =>
          item.id !== row.id &&
          item.owner_id === row.owner_id &&
          item.kind === 'profile_photo' &&
          item.moderation_state === 'live' &&
          item.is_main,
      )
      row.is_main = !hasMain
      return true
    },
    async setProfileMain(ownerId, assetId) {
      return withMemoryPhotoLock(ownerId, async () => {
        const row = assets.find((item) => item.id === assetId)
        if (!row || row.owner_id !== ownerId || row.kind !== 'profile_photo') {
          return 'missing'
        }
        if (row.moderation_state !== 'live') {
          return 'not_live'
        }
        for (const item of assets) {
          if (item.owner_id === ownerId && item.kind === 'profile_photo' && item.moderation_state === 'live') {
            item.is_main = item.id === assetId
          }
        }
        return 'ok'
      })
    },
    async removeLiveGalleryPhoto(ownerId, assetId, at) {
      return withMemoryPhotoLock(ownerId, async () => {
        const row = assets.find((item) => item.id === assetId)
        if (!row || row.owner_id !== ownerId || row.kind !== 'profile_photo') {
          return 'missing'
        }
        if (row.moderation_state === 'pending') {
          return 'pending_photo'
        }
        if (row.moderation_state !== 'live') {
          return 'not_live'
        }
        if (row.is_main) {
          return 'main_photo'
        }
        row.moderation_state = 'replaced'
        row.is_main = false
        for (const grant of grants) {
          if (grant.photo_asset_id === row.id && grant.revoked_at === null) {
            grant.revoked_at = at
          }
        }
        return 'ok'
      })
    },
    async replaceLiveProfilePhotos(ownerId) {
      const replaced: string[] = []
      for (const row of assets) {
        if (row.owner_id === ownerId && row.kind === 'profile_photo' && row.moderation_state === 'live') {
          row.moderation_state = 'replaced'
          row.is_main = false
          replaced.push(row.id)
        }
      }
      return replaced
    },
    async revokeUnrevokedGrants(assetIds, at) {
      if (assetIds.length === 0) {
        return
      }
      const ids = new Set(assetIds)
      for (const grant of grants) {
        if (ids.has(grant.photo_asset_id) && grant.revoked_at === null) {
          grant.revoked_at = at
        }
      }
    },
    snapshot() {
      return {
        states: assets.map((row) => ({ id: row.id, moderation_state: row.moderation_state, is_main: row.is_main })),
        grants: grants.map((row) => ({ id: row.id, revoked_at: row.revoked_at })),
      }
    },
    restore(saved) {
      for (const item of saved.states) {
        const row = assets.find((asset) => asset.id === item.id)
        if (row) {
          row.moderation_state = item.moderation_state
          row.is_main = item.is_main === true
        }
      }
      for (const item of saved.grants) {
        const grant = grants.find((row) => row.id === item.id)
        if (grant) {
          grant.revoked_at = item.revoked_at
        }
      }
    },
    async setModerationState(id, state) {
      const row = assets.find((item) => item.id === id)
      if (!row || row.moderation_state !== 'pending') {
        return false
      }
      if (state !== 'live') {
        row.is_main = false
      }
      row.moderation_state = state
      return true
    },
    async derivative(assetId, size) {
      return derivatives.find((row) => row.photo_asset_id === assetId && row.size === size) ?? null
    },
    async saveDerivative(derivative, file) {
      blobs.set(file.key, file.bytes)
      if (!derivatives.some((row) => row.photo_asset_id === derivative.photo_asset_id && row.size === derivative.size)) {
        derivatives.push(derivative)
      }
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
    withOwnerPhotoLock: withPostgresPhotoLock,
    countOpenProfilePhotos: countOpenProfilePhotos,
    openProfilePhotos: openProfilePhotos,
    latestProfilePhoto: latestProfilePhoto,
    liveProfilePhoto: liveProfilePhoto,
    liveMainProfilePhotos: liveMainProfilePhotos,
    pendingProfilePhotos: pendingProfilePhotos,
    allowProfilePhoto: allowProfilePhoto,
    setProfileMain: setProfileMain,
    removeLiveGalleryPhoto: removeLiveGalleryPhoto,
    replaceLiveProfilePhotos: replaceLiveProfilePhotos,
    revokeUnrevokedGrants: revokeUnrevokedGrants,
    setModerationState: setModerationState,
    asset: readAsset,
    derivative: readDerivative,
    saveDerivative: writeDerivative,
    bytes: readBytes,
    saveGrant: saveGrant,
    grant: readGrant,
    revokeGrant: revokeGrant,
  }
}

const photoWork = new AsyncLocalStorage<MediaDb>()
const memoryLocks = new Map<string, Promise<void>>()

function mediaDatabase(): MediaDb {
  return photoWork.getStore() ?? getIdentityDatabase()
}

function withMemoryPhotoLock<T>(ownerId: string, work: () => Promise<T>): Promise<T> {
  const previous = memoryLocks.get(ownerId) ?? Promise.resolve()
  let release: () => void = () => undefined
  const gate = new Promise<void>((resolve) => {
    release = resolve
  })
  const settled = previous.then(
    () => undefined,
    () => undefined,
  )
  memoryLocks.set(
    ownerId,
    settled.then(() => gate),
  )
  return settled.then(work).finally(release)
}

async function withPostgresPhotoLock<T>(ownerId: string, work: () => Promise<T>): Promise<T> {
  const current = photoWork.getStore()
  if (current) {
    await lockOwner(current, ownerId)
    return work()
  }
  return getIdentityDatabase().transaction(async (tx) => {
    await lockOwner(tx, ownerId)
    return photoWork.run(tx, () => work())
  })
}

async function lockOwner(db: Pick<MediaDb, 'execute'>, ownerId: string): Promise<void> {
  await db.execute(sql`select pg_advisory_xact_lock(('x' || substr(md5(${ownerId}), 1, 16))::bit(64)::bigint)`)
}

function byAssetId(left: StoredAsset, right: StoredAsset): number {
  if (left.id < right.id) {
    return -1
  }
  if (left.id > right.id) {
    return 1
  }
  return 0
}

function openRows(assets: StoredAsset[], ownerId: string): StoredAsset[] {
  return assets.filter(
    (row) =>
      row.owner_id === ownerId &&
      row.kind === 'profile_photo' &&
      (row.moderation_state === 'pending' || row.moderation_state === 'live'),
  )
}

function sortOpenPhotos(rows: StoredAsset[]): StoredAsset[] {
  const live = rows.filter((row) => row.moderation_state === 'live')
  const pending = rows.filter((row) => row.moderation_state === 'pending').sort(byAssetId)
  const main = live.filter((row) => row.is_main)
  const rest = live.filter((row) => !row.is_main).sort(byAssetId)
  return [...main, ...rest, ...pending]
}

async function saveAsset(asset: StoredAsset, derivatives: StoredDerivative[], files: PhotoFile[]): Promise<void> {
  const writer = getEvidenceWriter()
  if (!writer) {
    throw new MediaStorageError()
  }
  for (const file of files) {
    await writer.writeObject(file.key, file.bytes)
  }
  const database = mediaDatabase()
  await database.insert(photoAsset).values({
    id: asset.id,
    owner_id: asset.owner_id,
    kind: asset.kind,
    original_key: asset.original_key,
    blur_key: asset.blur_key,
    moderation_state: asset.moderation_state,
    is_main: asset.is_main,
  })
  if (derivatives.length > 0) {
    await database.insert(photoDerivative).values(
      derivatives.map((derivative) => ({
        id: derivative.id,
        photo_asset_id: derivative.photo_asset_id,
        size: derivative.size,
        object_key: derivative.object_key,
      })),
    )
  }
}

async function countOpenProfilePhotos(ownerId: string): Promise<number> {
  const rows = await openProfilePhotos(ownerId)
  return rows.length
}

async function openProfilePhotos(ownerId: string): Promise<StoredAsset[]> {
  const rows = await mediaDatabase()
    .select()
    .from(photoAsset)
    .where(
      and(
        eq(photoAsset.owner_id, ownerId),
        eq(photoAsset.kind, 'profile_photo'),
        inArray(photoAsset.moderation_state, ['pending', 'live']),
      ),
    )
  return sortOpenPhotos(rows.map(asAsset))
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

async function liveMainProfilePhotos(ownerIds: readonly string[]): Promise<StoredAsset[]> {
  if (ownerIds.length === 0) {
    return []
  }
  const rows = await mediaDatabase()
    .select()
    .from(photoAsset)
    .where(
      and(
        inArray(photoAsset.owner_id, [...ownerIds]),
        eq(photoAsset.kind, 'profile_photo'),
        eq(photoAsset.moderation_state, 'live'),
        eq(photoAsset.is_main, true),
      ),
    )
  return rows.map(asAsset)
}

async function liveProfilePhoto(ownerId: string): Promise<StoredAsset | null> {
  const rows = await openProfilePhotos(ownerId)
  return rows.find((row) => row.moderation_state === 'live') ?? null
}

async function pendingProfilePhotos(ownerId: string): Promise<StoredAsset[]> {
  const rows = await mediaDatabase()
    .select()
    .from(photoAsset)
    .where(
      and(eq(photoAsset.owner_id, ownerId), eq(photoAsset.kind, 'profile_photo'), eq(photoAsset.moderation_state, 'pending')),
    )
    .orderBy(photoAsset.id)
  return rows.map(asAsset)
}

async function allowProfilePhoto(id: string, db?: MediaDb): Promise<boolean> {
  const run = async (database: MediaDb): Promise<boolean> => {
    const existing = await database
      .select({ owner_id: photoAsset.owner_id })
      .from(photoAsset)
      .where(eq(photoAsset.id, id))
      .limit(1)
    const ownerId = existing[0]?.owner_id
    if (!ownerId) {
      return false
    }
    await lockOwner(database, ownerId)
    const updated = await database
      .update(photoAsset)
      .set({ moderation_state: 'live', is_main: false })
      .where(and(eq(photoAsset.id, id), eq(photoAsset.kind, 'profile_photo'), eq(photoAsset.moderation_state, 'pending')))
      .returning({ id: photoAsset.id, owner_id: photoAsset.owner_id })
    const row = updated[0]
    if (!row) {
      return false
    }
    await database.execute(sql`
      update "photo_asset"
      set "is_main" = true
      where "id" = ${row.id}
        and "moderation_state" = 'live'
        and not exists (
          select 1 from "photo_asset" as other
          where other."owner_id" = ${row.owner_id}
            and other."kind" = 'profile_photo'
            and other."moderation_state" = 'live'
            and other."is_main"
            and other."id" <> ${row.id}
        )
    `)
    return true
  }
  if (db) {
    return run(db)
  }
  return getIdentityDatabase().transaction(async (tx) => run(tx))
}

async function setProfileMain(ownerId: string, assetId: string): Promise<MainResult> {
  return withPostgresPhotoLock(ownerId, async () => {
    const row = await readAsset(assetId)
    if (!row || row.owner_id !== ownerId || row.kind !== 'profile_photo') {
      return 'missing'
    }
    if (row.moderation_state !== 'live') {
      return 'not_live'
    }
    const database = mediaDatabase()
    await database
      .update(photoAsset)
      .set({ is_main: false })
      .where(
        and(
          eq(photoAsset.owner_id, ownerId),
          eq(photoAsset.kind, 'profile_photo'),
          eq(photoAsset.moderation_state, 'live'),
          eq(photoAsset.is_main, true),
        ),
      )
    await database
      .update(photoAsset)
      .set({ is_main: true })
      .where(
        and(
          eq(photoAsset.id, assetId),
          eq(photoAsset.owner_id, ownerId),
          eq(photoAsset.kind, 'profile_photo'),
          eq(photoAsset.moderation_state, 'live'),
        ),
      )
    return 'ok'
  })
}

async function removeLiveGalleryPhoto(ownerId: string, assetId: string, at: string): Promise<RemoveResult> {
  return withPostgresPhotoLock(ownerId, async () => {
    const row = await readAsset(assetId)
    if (!row || row.owner_id !== ownerId || row.kind !== 'profile_photo') {
      return 'missing'
    }
    if (row.moderation_state === 'pending') {
      return 'pending_photo'
    }
    if (row.moderation_state !== 'live') {
      return 'not_live'
    }
    if (row.is_main) {
      return 'main_photo'
    }
    await mediaDatabase()
      .update(photoAsset)
      .set({ moderation_state: 'replaced', is_main: false })
      .where(eq(photoAsset.id, assetId))
    await revokeUnrevokedGrants([assetId], at)
    return 'ok'
  })
}

async function replaceLiveProfilePhotos(
  ownerId: string,
  db?: Pick<NodePgDatabase, 'update'>,
): Promise<string[]> {
  const updated = await (db ?? getIdentityDatabase())
    .update(photoAsset)
    .set({ moderation_state: 'replaced', is_main: false })
    .where(
      and(eq(photoAsset.owner_id, ownerId), eq(photoAsset.kind, 'profile_photo'), eq(photoAsset.moderation_state, 'live')),
    )
    .returning({ id: photoAsset.id })
  return updated.map((row) => row.id)
}

async function revokeUnrevokedGrants(
  assetIds: string[],
  at: string,
  db?: Pick<NodePgDatabase, 'update'>,
): Promise<void> {
  if (assetIds.length === 0) {
    return
  }
  await (db ?? mediaDatabase())
    .update(signedGrant)
    .set({ revoked_at: at })
    .where(and(inArray(signedGrant.photo_asset_id, assetIds), isNull(signedGrant.revoked_at)))
}

async function setModerationState(
  id: string,
  state: ModerationState,
  db?: Pick<NodePgDatabase, 'update'>,
): Promise<boolean> {
  const updated = await (db ?? mediaDatabase())
    .update(photoAsset)
    .set(state === 'live' ? { moderation_state: state } : { moderation_state: state, is_main: false })
    .where(and(eq(photoAsset.id, id), eq(photoAsset.moderation_state, 'pending')))
    .returning({ id: photoAsset.id })
  return updated.length === 1
}

async function readAsset(id: string): Promise<StoredAsset | null> {
  const rows = await mediaDatabase().select().from(photoAsset).where(eq(photoAsset.id, id)).limit(1)
  return rows[0] ? asAsset(rows[0]) : null
}

async function readDerivative(assetId: string, size: DerivativeSize): Promise<StoredDerivative | null> {
  const rows = await mediaDatabase()
    .select()
    .from(photoDerivative)
    .where(and(eq(photoDerivative.photo_asset_id, assetId), eq(photoDerivative.size, size)))
    .limit(1)
  const row = rows[0]
  if (!row || (row.size !== 'xs' && row.size !== 'sm' && row.size !== 'md' && row.size !== 'blur')) {
    return null
  }
  return {
    id: row.id,
    photo_asset_id: row.photo_asset_id,
    size: row.size,
    object_key: row.object_key,
  }
}

async function writeDerivative(derivative: StoredDerivative, file: PhotoFile): Promise<void> {
  const writer = getEvidenceWriter()
  if (!writer) {
    throw new MediaStorageError()
  }
  await writer.writeObject(file.key, file.bytes)
  const existing = await readDerivative(derivative.photo_asset_id, derivative.size)
  if (existing) {
    return
  }
  await mediaDatabase().insert(photoDerivative).values({
    id: derivative.id,
    photo_asset_id: derivative.photo_asset_id,
    size: derivative.size,
    object_key: derivative.object_key,
  })
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
  await mediaDatabase().insert(signedGrant).values({
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
    is_main: row.is_main === true,
    moderation_state:
      row.moderation_state === 'pending' ||
      row.moderation_state === 'live' ||
      row.moderation_state === 'blocked' ||
      row.moderation_state === 'replaced'
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
