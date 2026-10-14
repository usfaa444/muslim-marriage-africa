import { isUuidV7, type Gender } from '@ankanu/kernel'
import { eq } from 'drizzle-orm'
import { account, discoveryExclusion } from './account-schema.js'
import { accountStoreIsMemory, getAccountStore, getIdentityDatabase } from './account-store.js'
import { authNow } from './auth-clock.js'
import { profileStoreIsMemory, getProfileStore, type StoredProfile } from './profile-store.js'
import { isListableProfile } from './profile-review.js'
import { assertBrowseViewer, PROFILE_UNAVAILABLE, type PublicProfileFailure } from './public-profile.js'
import type { CreatedAccount } from './create-account.js'
import type { ResolvedSession } from './session-store.js'

const TARGET_MESSAGE = 'target_id : valeur non reconnue.'

export type ExclusionRow = {
  viewer_id: string
  target_id: string
  created_at: string
}

export type ExclusionBody = ExclusionRow

export type ExclusionFailure = {
  ok: false
  status: 400 | 403 | 404 | 500
  code: 'UNHANDLED' | 'FORBIDDEN' | 'NOT_FOUND'
  message: string
  details: { reason?: string; field?: string } | null
  retryable: boolean
}

export type ExclusionStore = {
  targetIds(viewerId: string): Promise<string[]>
  insert(row: ExclusionRow): Promise<{ created: boolean; row: ExclusionRow }>
}

type BrowseAccount = {
  id: string
  gender: Gender
  roles: readonly string[]
  status: string
}

const memoryRows: ExclusionRow[] = []

let override: ExclusionStore | undefined

export function setExclusionStore(store: ExclusionStore | undefined): void {
  override = store
}

export function clearMemoryExclusions(): void {
  memoryRows.length = 0
}

export function getExclusionStore(): ExclusionStore {
  if (override) {
    return override
  }
  if (profileStoreIsMemory() || accountStoreIsMemory()) {
    return memoryExclusionStore()
  }
  return postgresExclusionStore()
}

function memoryExclusionStore(): ExclusionStore {
  return {
    async targetIds(viewerId) {
      return memoryRows.filter((row) => row.viewer_id === viewerId).map((row) => row.target_id)
    },
    async insert(row) {
      const existing = memoryRows.find((item) => item.viewer_id === row.viewer_id && item.target_id === row.target_id)
      if (existing) {
        return { created: false, row: existing }
      }
      memoryRows.push(row)
      return { created: true, row }
    },
  }
}

function postgresExclusionStore(): ExclusionStore {
  return {
    async targetIds(viewerId) {
      const rows = await getIdentityDatabase()
        .select({ target_id: discoveryExclusion.target_id })
        .from(discoveryExclusion)
        .where(eq(discoveryExclusion.viewer_id, viewerId))
      return rows.map((row) => row.target_id)
    },
    async insert(row) {
      const inserted = await getIdentityDatabase()
        .insert(discoveryExclusion)
        .values(row)
        .onConflictDoNothing()
        .returning()
      const created = inserted[0]
      if (created) {
        return { created: true, row: created }
      }
      const existing = await getIdentityDatabase()
        .select()
        .from(discoveryExclusion)
        .where(eq(discoveryExclusion.viewer_id, row.viewer_id))
      const found = existing.find((item) => item.target_id.toLowerCase() === row.target_id.toLowerCase())
      if (!found) {
        throw new Error('discovery_exclusion insert missed the existing row')
      }
      return { created: false, row: found }
    },
  }
}

function fail(
  status: ExclusionFailure['status'],
  code: ExclusionFailure['code'],
  message: string,
  details: ExclusionFailure['details'],
  retryable: boolean,
): ExclusionFailure {
  return { ok: false, status, code, message, details, retryable }
}

function fromViewer(error: PublicProfileFailure): ExclusionFailure {
  if (error.status === 403 && error.code === 'FORBIDDEN') {
    return fail(403, 'FORBIDDEN', error.message, error.details, error.retryable)
  }
  return fail(500, 'UNHANDLED', 'Request failed', null, false)
}

function badTarget(): ExclusionFailure {
  return fail(400, 'UNHANDLED', TARGET_MESSAGE, { field: 'target_id' }, false)
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
    return { id: row.id, gender: row.gender, roles: row.roles, status: row.status }
  }
  const rows = await getIdentityDatabase()
    .select({
      id: account.id,
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
  return { id: row.id, gender: row.gender, roles: row.roles, status: row.status }
}

async function listableOpposite(
  viewer: BrowseAccount,
  targetId: string,
): Promise<{ ok: true; profile: StoredProfile } | ExclusionFailure> {
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
  return { ok: true, profile }
}

function readTargetId(body: unknown): string | ExclusionFailure {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return badTarget()
  }
  const targetId = (body as { target_id?: unknown }).target_id
  if (typeof targetId !== 'string' || !isUuidV7(targetId)) {
    return badTarget()
  }
  return targetId
}

/** First pass is 201. The same viewer and target returns the existing row. Not a like and not a favourite. */
export async function passBrowse(
  viewer: ResolvedSession,
  body: unknown,
): Promise<{ ok: true; status: 200 | 201; body: ExclusionBody } | ExclusionFailure> {
  const opened = await assertBrowseViewer(viewer)
  if (!opened.ok) {
    return fromViewer(opened)
  }
  const readId = readTargetId(body)
  if (typeof readId !== 'string') {
    return readId
  }
  const targetId = readId.toLowerCase()
  if (targetId === opened.account.id.toLowerCase()) {
    return badTarget()
  }
  const target = await listableOpposite(opened.account, targetId)
  if (!target.ok) {
    return target
  }
  const saved = await getExclusionStore().insert({
    viewer_id: opened.account.id,
    target_id: targetId,
    created_at: authNow().toISOString(),
  })
  return {
    ok: true,
    status: saved.created ? 201 : 200,
    body: saved.row,
  }
}
