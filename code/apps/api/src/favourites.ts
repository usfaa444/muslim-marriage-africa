import { isUuidV7, type Gender } from '@ankanu/kernel'
import { and, desc, eq } from 'drizzle-orm'
import { account, favourite, verificationRecord } from './account-schema.js'
import { accountStoreIsMemory, getAccountStore, getIdentityDatabase } from './account-store.js'
import { ageOn, type CreatedAccount } from './create-account.js'
import { authNow } from './auth-clock.js'
import { discoveryPhoto, signMedia, type MediaFailure } from './media.js'
import { getMediaStore } from './media-store.js'
import { getCaptureStore } from './id-liveness-store.js'
import { profileStoreIsMemory, getProfileStore, type StoredProfile } from './profile-store.js'
import { isListableProfile } from './profile-review.js'
import {
  assertBrowseViewer,
  PROFILE_UNAVAILABLE,
  type PublicProfileFailure,
} from './public-profile.js'
import type { ResolvedSession } from './session-store.js'

const TARGET_MESSAGE = 'target_id : valeur non reconnue.'
const MISSING_FAVOURITE = "Ce favori n'existe pas."

const CITY: Record<string, string> = {
  ouagadougou: 'Ouagadougou',
  bobo: 'Bobo-Dioulasso',
  koudougou: 'Koudougou',
  ouahigouya: 'Ouahigouya',
  banfora: 'Banfora',
  dedougou: 'Dédougou',
  fada: "Fada N'Gourma",
  autre: 'Autre localité',
}

const MARITAL: Record<string, string> = {
  single: 'Célibataire',
  married: 'Marié(e)',
  divorced: 'Divorcé(e)',
  widowed: 'Veuf(ve)',
}

const POLYGAMY: Record<string, string> = {
  no: 'Non',
  yes: 'Oui',
}

const MADHHAB: Record<string, string> = {
  maliki: 'Maliki',
  hanafi: 'Hanafi',
  shafii: "Shafi'i",
  hanbali: 'Hanbali',
  apprentissage: 'En apprentissage / Sans attachement strict',
}

const PRACTICE: Record<string, string> = {
  assidue: 'Pratique assidue',
  heure: "Prières à l'heure",
  cheminement: 'En cheminement',
}

export type FavouritePhoto = {
  id: string
  url: string
}

export type FavouriteItem = {
  target_id: string
  created_at: string
  pseudonym: string
  age: number
  city: string | null
  profession: string | null
  madhhab: string | null
  practice: string | null
  marital_status: string | null
  polygamy_intent: string | null
  verified: boolean
  photo_blur: boolean
  photo: FavouritePhoto | null
  bio: string | null
}

export type FavouriteRowBody = {
  account_id: string
  target_id: string
  created_at: string
}

export type FavouriteListBody = {
  count: number
  items: FavouriteItem[]
}

export type FavouriteFailure = {
  ok: false
  status: 400 | 403 | 404 | 500
  code: 'UNHANDLED' | 'FORBIDDEN' | 'NOT_FOUND'
  message: string
  details: { reason?: string; field?: string } | null
  retryable: boolean
}

type FavouriteRow = {
  account_id: string
  target_id: string
  created_at: string
}

type BrowseAccount = {
  id: string
  pseudonym: string
  gender: Gender
  roles: readonly string[]
  status: string
}

export type FavouriteStore = {
  find(accountId: string, targetId: string): Promise<FavouriteRow | null>
  insert(row: FavouriteRow): Promise<{ created: boolean; row: FavouriteRow }>
  list(accountId: string): Promise<FavouriteRow[]>
  remove(accountId: string, targetId: string): Promise<boolean>
}

let override: FavouriteStore | undefined

export function setFavouriteStore(store: FavouriteStore | undefined): void {
  override = store
}

export function getFavouriteStore(): FavouriteStore {
  if (override) {
    return override
  }
  return postgresFavouriteStore()
}

export function memoryFavouriteStore(): FavouriteStore & { rows: FavouriteRow[] } {
  const rows: FavouriteRow[] = []
  return {
    rows,
    async find(accountId, targetId) {
      return rows.find((row) => row.account_id === accountId && row.target_id === targetId) ?? null
    },
    async insert(row) {
      const existing = rows.find((item) => item.account_id === row.account_id && item.target_id === row.target_id)
      if (existing) {
        return { created: false, row: existing }
      }
      rows.push(row)
      return { created: true, row }
    },
    async list(accountId) {
      return rows
        .filter((row) => row.account_id === accountId)
        .sort((left, right) => right.created_at.localeCompare(left.created_at) || right.target_id.localeCompare(left.target_id))
    },
    async remove(accountId, targetId) {
      const index = rows.findIndex((row) => row.account_id === accountId && row.target_id === targetId)
      if (index < 0) {
        return false
      }
      rows.splice(index, 1)
      return true
    },
  }
}

function postgresFavouriteStore(): FavouriteStore {
  return {
    async find(accountId, targetId) {
      const rows = await getIdentityDatabase()
        .select()
        .from(favourite)
        .where(and(eq(favourite.account_id, accountId), eq(favourite.target_id, targetId)))
        .limit(1)
      return rows[0] ?? null
    },
    async insert(row) {
      const inserted = await getIdentityDatabase().insert(favourite).values(row).onConflictDoNothing().returning()
      const created = inserted[0]
      if (created) {
        return { created: true, row: created }
      }
      const existing = await this.find(row.account_id, row.target_id)
      if (!existing) {
        throw new Error('favourite insert missed the existing row')
      }
      return { created: false, row: existing }
    },
    async list(accountId) {
      return getIdentityDatabase()
        .select()
        .from(favourite)
        .where(eq(favourite.account_id, accountId))
        .orderBy(desc(favourite.created_at), desc(favourite.target_id))
    },
    async remove(accountId, targetId) {
      const removed = await getIdentityDatabase()
        .delete(favourite)
        .where(and(eq(favourite.account_id, accountId), eq(favourite.target_id, targetId)))
        .returning({ account_id: favourite.account_id })
      return removed.length > 0
    },
  }
}

function fail(
  status: FavouriteFailure['status'],
  code: FavouriteFailure['code'],
  message: string,
  details: FavouriteFailure['details'],
  retryable: boolean,
): FavouriteFailure {
  return { ok: false, status, code, message, details, retryable }
}

function fromViewer(error: PublicProfileFailure): FavouriteFailure {
  if (error.status === 403 && error.code === 'FORBIDDEN') {
    return fail(403, 'FORBIDDEN', error.message, error.details, error.retryable)
  }
  return fail(500, 'UNHANDLED', 'Request failed', null, false)
}

function badTarget(): FavouriteFailure {
  return fail(400, 'UNHANDLED', TARGET_MESSAGE, { field: 'target_id' }, false)
}

function label(value: string | null, map: Record<string, string>): string | null {
  if (value === null || value === '') {
    return null
  }
  return map[value] ?? value
}

function isGender(value: string): value is Gender {
  return value === 'sister' || value === 'brother'
}

async function loadAccount(id: string): Promise<BrowseAccount | null> {
  if (accountStoreIsMemory()) {
    const store = getAccountStore() as { accounts?: CreatedAccount[] }
    const row = store.accounts?.find((item) => item.id === id)
    if (!row || !isGender(row.gender)) {
      return null
    }
    return {
      id: row.id,
      pseudonym: row.pseudonym,
      gender: row.gender,
      roles: row.roles,
      status: row.status,
    }
  }
  const rows = await getIdentityDatabase()
    .select({
      id: account.id,
      pseudonym: account.pseudonym,
      gender: account.gender,
      roles: account.roles,
      status: account.status,
    })
    .from(account)
    .where(eq(account.id, id))
    .limit(1)
  const row = rows[0]
  if (!row || !isGender(row.gender)) {
    return null
  }
  return {
    id: row.id,
    pseudonym: row.pseudonym,
    gender: row.gender,
    roles: row.roles,
    status: row.status,
  }
}

async function verified(accountId: string): Promise<boolean> {
  if (profileStoreIsMemory() || accountStoreIsMemory()) {
    const idDocument = await getCaptureStore().latest(accountId, 'id_document')
    const liveness = await getCaptureStore().latest(accountId, 'liveness')
    return idDocument?.status === 'granted' && liveness?.status === 'granted'
  }
  const rows = await getIdentityDatabase()
    .select({
      id: verificationRecord.id,
      kind: verificationRecord.kind,
      status: verificationRecord.status,
    })
    .from(verificationRecord)
    .where(eq(verificationRecord.account_id, accountId))
  const chosen = new Map<string, { id: string; status: string }>()
  for (const row of rows) {
    if (row.kind !== 'id_document' && row.kind !== 'liveness') {
      continue
    }
    const current = chosen.get(row.kind)
    if (!current || row.id > current.id) {
      chosen.set(row.kind, { id: row.id, status: row.status })
    }
  }
  return chosen.get('id_document')?.status === 'granted' && chosen.get('liveness')?.status === 'granted'
}

async function listableOpposite(
  viewer: BrowseAccount,
  targetId: string,
): Promise<{ ok: true; account: BrowseAccount; profile: StoredProfile } | FavouriteFailure> {
  const target = await loadAccount(targetId)
  const profile = await getProfileStore().read(targetId)
  if (
    !target ||
    !profile ||
    !target.roles.includes('member') ||
    target.gender === viewer.gender ||
    !isListableProfile(profile.visibility, target.status)
  ) {
    return fail(404, 'NOT_FOUND', PROFILE_UNAVAILABLE, null, false)
  }
  return { ok: true, account: target, profile }
}

function readTargetId(body: unknown): string | FavouriteFailure {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return badTarget()
  }
  const targetId = (body as { target_id?: unknown }).target_id
  if (typeof targetId !== 'string' || !isUuidV7(targetId)) {
    return badTarget()
  }
  return targetId
}

function photoFailure(photos: MediaFailure): FavouriteFailure {
  return fail(500, 'UNHANDLED', 'Request failed', null, photos.retryable)
}

async function presentItem(row: FavouriteRow, viewerId: string): Promise<FavouriteItem | FavouriteFailure | null> {
  const target = await loadAccount(row.target_id)
  const profile = await getProfileStore().read(row.target_id)
  if (!target || !profile) {
    return null
  }
  const age = ageOn(profile.dob, authNow())
  if (age === null) {
    return fail(500, 'UNHANDLED', 'Request failed', null, false)
  }
  const mains = await getMediaStore().liveMainProfilePhotos([row.target_id])
  const asset = mains.find((item) => item.owner_id === row.target_id) ?? null
  let photo: FavouritePhoto | null = null
  if (asset && discoveryPhoto(asset)) {
    const signed = await signMedia(getMediaStore(), asset.id, 'blur', viewerId)
    if (!signed.ok) {
      return photoFailure(signed)
    }
    photo = { id: asset.id, url: signed.url }
  }
  const bio = profile.bio_live && profile.bio_live.trim().length > 0 ? profile.bio_live : null
  return {
    target_id: row.target_id,
    created_at: row.created_at,
    pseudonym: target.pseudonym,
    age,
    city: label(profile.city, CITY),
    profession: profile.profession && profile.profession.length > 0 ? profile.profession : null,
    madhhab: label(profile.madhhab, MADHHAB),
    practice: label(profile.practice, PRACTICE),
    marital_status: label(profile.marital_status, MARITAL),
    polygamy_intent: label(profile.polygamy_intent, POLYGAMY),
    verified: await verified(row.target_id),
    photo_blur: photo !== null,
    photo,
    bio,
  }
}

async function gate(viewer: ResolvedSession): Promise<{ ok: true; account: BrowseAccount } | FavouriteFailure> {
  const result = await assertBrowseViewer(viewer)
  if (!result.ok) {
    return fromViewer(result)
  }
  return result
}

/** First save is 201. The same grain returns the existing row and does not insert again. */
export async function createFavourite(
  viewer: ResolvedSession,
  body: unknown,
): Promise<{ ok: true; status: 200 | 201; body: FavouriteRowBody } | FavouriteFailure> {
  const opened = await gate(viewer)
  if (!opened.ok) {
    return opened
  }
  const targetId = readTargetId(body)
  if (typeof targetId !== 'string') {
    return targetId
  }
  if (targetId === opened.account.id) {
    return badTarget()
  }
  const target = await listableOpposite(opened.account, targetId)
  if (!target.ok) {
    return target
  }
  const saved = await getFavouriteStore().insert({
    account_id: opened.account.id,
    target_id: targetId,
    created_at: authNow().toISOString(),
  })
  return {
    ok: true,
    status: saved.created ? 201 : 200,
    body: saved.row,
  }
}

/** Owner list only. No browse rate slot. No favourite-row write. No BillingPort. */
export async function readFavourites(
  viewer: ResolvedSession,
): Promise<{ ok: true; body: FavouriteListBody } | FavouriteFailure> {
  const opened = await gate(viewer)
  if (!opened.ok) {
    return opened
  }
  const rows = await getFavouriteStore().list(opened.account.id)
  const items: FavouriteItem[] = []
  for (const row of rows) {
    const item = await presentItem(row, opened.account.id)
    if (item === null) {
      continue
    }
    if ('ok' in item && item.ok === false) {
      return item
    }
    items.push(item as FavouriteItem)
  }
  return { ok: true, body: { count: items.length, items } }
}

/** Removes one grain. A missing row is 404. No removed_at column. */
export async function removeFavourite(
  viewer: ResolvedSession,
  targetId: string,
): Promise<{ ok: true; body: Record<string, never> } | FavouriteFailure> {
  const opened = await gate(viewer)
  if (!opened.ok) {
    return opened
  }
  if (!isUuidV7(targetId)) {
    return fail(404, 'NOT_FOUND', MISSING_FAVOURITE, null, false)
  }
  const removed = await getFavouriteStore().remove(opened.account.id, targetId)
  if (!removed) {
    return fail(404, 'NOT_FOUND', MISSING_FAVOURITE, null, false)
  }
  return { ok: true, body: {} }
}
