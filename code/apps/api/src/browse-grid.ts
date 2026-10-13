import { and, inArray } from 'drizzle-orm'
import { accountStoreIsMemory, getIdentityDatabase } from './account-store.js'
import { ageOn } from './create-account.js'
import { authNow } from './auth-clock.js'
import { readRlBrowsePerMin, takeBrowseSlot } from './browse-rate.js'
import { getCaptureStore } from './id-liveness-store.js'
import { discoveryPhoto, signMedia, type MediaFailure } from './media.js'
import { getMediaStore } from './media-store.js'
import { parseBrowseFilters } from './browse-filters.js'
import { profileStoreIsMemory, getProfileStore } from './profile-store.js'
import { verificationRecord } from './account-schema.js'
import {
  assertBrowseViewer,
  BROWSE_RATE_MESSAGE,
  PROFILE_UNAVAILABLE,
  type PublicProfileFailure,
} from './public-profile.js'
import type { ResolvedSession } from './session-store.js'

/** Server page size. The look-ahead row is not returned. */
const GRID_PAGE_SIZE = 12

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const VIEW_MESSAGE = 'view : card ou grid.'
const CURSOR_MESSAGE = 'cursor : un UUID est requis.'

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

export type BrowseGridPhoto = {
  id: string
  url: string
}

export type BrowseGridItem = {
  id: string
  pseudonym: string
  age: number
  city: string | null
  marital_status: string | null
  polygamy_intent: string | null
  madhhab: string | null
  practice: string | null
  verified: boolean
  photo_blur: boolean
  photo: BrowseGridPhoto | null
}

export type BrowseGridBody = {
  view: 'grid'
  items: BrowseGridItem[]
  next_cursor: string | null
}

export type BrowseGridFailure = {
  ok: false
  status: 400 | 403 | 404 | 429 | 500 | 503
  code: 'UNHANDLED' | 'FORBIDDEN' | 'NOT_FOUND' | 'RATE_LIMITED'
  message: string
  details: { reason?: string; field?: string } | null
  retryable: boolean
}

function fail(
  status: BrowseGridFailure['status'],
  code: BrowseGridFailure['code'],
  message: string,
  details: BrowseGridFailure['details'],
  retryable: boolean,
): BrowseGridFailure {
  return { ok: false, status, code, message, details, retryable }
}

function fromViewer(error: PublicProfileFailure): BrowseGridFailure {
  return error
}

function label(value: string | null, map: Record<string, string>): string | null {
  if (value === null) {
    return null
  }
  return map[value] ?? value
}

function oneValue(value: unknown): string | undefined | null {
  if (value === undefined) {
    return undefined
  }
  if (typeof value === 'string') {
    return value
  }
  if (Array.isArray(value) && value.length === 1 && typeof value[0] === 'string') {
    return value[0]
  }
  return null
}

function photoFailure(photos: MediaFailure): BrowseGridFailure {
  if (photos.status === 429) {
    return fail(429, 'RATE_LIMITED', photos.message, null, true)
  }
  const forced =
    photos.code === 'REVEAL_DENIED' || photos.code === 'FORBIDDEN' || photos.code === 'PHOTO_LIMIT_REACHED'
  return fail(503, 'UNHANDLED', 'Request failed', null, forced ? true : photos.retryable)
}

async function verifiedAccountIds(accountIds: readonly string[]): Promise<Set<string>> {
  const verified = new Set<string>()
  if (accountIds.length === 0) {
    return verified
  }
  if (profileStoreIsMemory() || accountStoreIsMemory()) {
    for (const accountId of accountIds) {
      const idDocument = await getCaptureStore().latest(accountId, 'id_document')
      const liveness = await getCaptureStore().latest(accountId, 'liveness')
      if (idDocument?.status === 'granted' && liveness?.status === 'granted') {
        verified.add(accountId)
      }
    }
    return verified
  }
  const rows = await getIdentityDatabase()
    .select({
      id: verificationRecord.id,
      account_id: verificationRecord.account_id,
      kind: verificationRecord.kind,
      status: verificationRecord.status,
    })
    .from(verificationRecord)
    .where(
      and(
        inArray(verificationRecord.account_id, [...accountIds]),
        inArray(verificationRecord.kind, ['id_document', 'liveness']),
      ),
    )
  const chosen = new Map<string, { id: string; status: string }>()
  for (const row of rows) {
    const key = `${row.account_id}:${row.kind}`
    const current = chosen.get(key)
    if (!current || row.id > current.id) {
      chosen.set(key, { id: row.id, status: row.status })
    }
  }
  for (const accountId of accountIds) {
    const idDocument = chosen.get(`${accountId}:id_document`)
    const liveness = chosen.get(`${accountId}:liveness`)
    if (idDocument?.status === 'granted' && liveness?.status === 'granted') {
      verified.add(accountId)
    }
  }
  return verified
}

/**
 * Grid browse read. `view=card` and a missing view stay 404 until Story 3.13.
 * A refused viewer, a bad view, a bad cursor, and a bad filter do not take a browse slot.
 * A grid page takes one slot, then one profile query.
 */
export async function readBrowseGrid(
  viewer: ResolvedSession,
  query: Record<string, unknown>,
): Promise<{ ok: true; body: BrowseGridBody } | BrowseGridFailure> {
  const gate = await assertBrowseViewer(viewer)
  if (!gate.ok) {
    return fromViewer(gate)
  }

  const viewText = oneValue(query.view)
  if (viewText === null) {
    return fail(400, 'UNHANDLED', VIEW_MESSAGE, { field: 'view' }, false)
  }
  if (viewText === undefined || viewText === 'card') {
    return fail(404, 'NOT_FOUND', PROFILE_UNAVAILABLE, null, false)
  }
  if (viewText !== 'grid') {
    return fail(400, 'UNHANDLED', VIEW_MESSAGE, { field: 'view' }, false)
  }

  const cursorText = oneValue(query.cursor)
  if (cursorText === null || (cursorText !== undefined && !UUID.test(cursorText))) {
    return fail(400, 'UNHANDLED', CURSOR_MESSAGE, { field: 'cursor' }, false)
  }

  const filters = parseBrowseFilters(query)
  if (!filters.ok) {
    return filters
  }

  const limit = await readRlBrowsePerMin()
  if (limit === null) {
    return fail(500, 'UNHANDLED', 'Request failed', null, false)
  }
  if (!takeBrowseSlot(viewer.account_id, limit)) {
    return fail(429, 'RATE_LIMITED', BROWSE_RATE_MESSAGE, null, true)
  }

  const opposite = gate.account.gender === 'brother' ? 'sister' : 'brother'
  const fetched = await getProfileStore().browseGrid({
    viewerId: gate.account.id,
    oppositeGender: opposite,
    cursor: cursorText?.toLowerCase() ?? null,
    limit: GRID_PAGE_SIZE + 1,
    filters: filters.filters,
  })
  const page = fetched.slice(0, GRID_PAGE_SIZE)
  const nextCursor = fetched.length > GRID_PAGE_SIZE ? (page[page.length - 1]?.id ?? null) : null
  const ages = page.map((row) => ageOn(row.dob, authNow()))
  if (ages.some((age) => age === null)) {
    return fail(503, 'UNHANDLED', 'Request failed', null, false)
  }

  const ids = page.map((row) => row.id)
  const [verified, mains] = await Promise.all([
    verifiedAccountIds(ids),
    getMediaStore().liveMainProfilePhotos(ids),
  ])
  const mainByOwner = new Map(mains.map((asset) => [asset.owner_id, asset]))
  const photos = new Map<string, BrowseGridPhoto>()
  for (const row of page) {
    const asset = mainByOwner.get(row.id) ?? null
    if (!asset || !discoveryPhoto(asset)) {
      continue
    }
    const signed = await signMedia(
      getMediaStore(),
      asset.id,
      row.photo_blur ? 'blur' : 'sm',
      gate.account.id,
      row.photo_blur ? undefined : { clearForMember: true },
    )
    if (!signed.ok) {
      return photoFailure(signed)
    }
    photos.set(row.id, { id: asset.id, url: signed.url })
  }

  return {
    ok: true,
    body: {
      view: 'grid',
      items: page.map((row, index) => ({
        id: row.id,
        pseudonym: row.pseudonym,
        age: ages[index] ?? 0,
        city: label(row.city, CITY),
        marital_status: label(row.marital_status, MARITAL),
        polygamy_intent: label(row.polygamy_intent, POLYGAMY),
        madhhab: label(row.madhhab, MADHHAB),
        practice: label(row.practice, PRACTICE),
        verified: verified.has(row.id),
        photo_blur: row.photo_blur,
        photo: photos.get(row.id) ?? null,
      })),
      next_cursor: nextCursor,
    },
  }
}
