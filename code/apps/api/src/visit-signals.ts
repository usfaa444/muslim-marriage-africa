import { isUuidV7, uuidV7Instant, type Gender } from '@ankanu/kernel'
import { and, eq, gte, lte } from 'drizzle-orm'
import { account, profile, profileVisit, verificationRecord } from './account-schema.js'
import { accountStoreIsMemory, getAccountStore, getIdentityDatabase } from './account-store.js'
import { ageOn, type CreatedAccount } from './create-account.js'
import { authNow } from './auth-clock.js'
import { getCaptureStore } from './id-liveness-store.js'
import { getInvitesPort } from './invites-port.js'
import { getProfileStore, profileStoreIsMemory } from './profile-store.js'

export const VISIT_THRESHOLD = 50
export const VISIT_WINDOW_HOURS = 24
const MAX_ROWS = 100
const WINDOW_MS = VISIT_WINDOW_HOURS * 60 * 60 * 1000

export type VisitRow = {
  account_id: string
  target_id: string
  created_at: string
}

export type VisitSignalRow = {
  account_id: string
  pseudonym: string
  gender: Gender
  age: number | null
  city: string | null
  member_since: string
  id_verified: boolean
  profiles_viewed_24h: number
  invites_sent_24h: number
  over_threshold_at: string
}

export type VisitSignalsBody = {
  threshold: number
  window_hours: number
  generated_at: string
  count: number
  truncated: boolean
  rows: VisitSignalRow[]
}

export type ProfileVisitStore = {
  insert(row: VisitRow): Promise<void>
  listInWindow(sinceIso: string, untilIso: string): Promise<VisitRow[]>
}

let override: ProfileVisitStore | undefined
let memoryDefault: ProfileVisitStore | undefined

export function setProfileVisitStore(store: ProfileVisitStore | undefined): void {
  override = store
}

export function memoryProfileVisitStore(): ProfileVisitStore & { rows: VisitRow[] } {
  const rows: VisitRow[] = []
  return {
    rows,
    async insert(row) {
      rows.push(row)
    },
    async listInWindow(sinceIso, untilIso) {
      const since = Date.parse(sinceIso)
      const until = Date.parse(untilIso)
      return rows.filter((row) => {
        const at = Date.parse(row.created_at)
        return at >= since && at <= until
      })
    },
  }
}

export function getProfileVisitStore(): ProfileVisitStore {
  if (override) {
    return override
  }
  if (accountStoreIsMemory()) {
    memoryDefault ??= memoryProfileVisitStore()
    return memoryDefault
  }
  return postgresProfileVisitStore()
}

function postgresProfileVisitStore(): ProfileVisitStore {
  return {
    async insert(row) {
      await getIdentityDatabase().insert(profileVisit).values(row)
    },
    async listInWindow(sinceIso, untilIso) {
      return getIdentityDatabase()
        .select({
          account_id: profileVisit.account_id,
          target_id: profileVisit.target_id,
          created_at: profileVisit.created_at,
        })
        .from(profileVisit)
        .where(and(gte(profileVisit.created_at, sinceIso), lte(profileVisit.created_at, untilIso)))
    },
  }
}

/** Drizzle's string timestamps are not ISO. The staff body always is. */
export function toVisitIso(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }
  return date.toISOString()
}

/** Discovery is the only writer. A failed insert must not change the profile read. */
export async function recordProfileVisit(accountId: string, targetId: string): Promise<void> {
  try {
    await getProfileVisitStore().insert({
      account_id: accountId,
      target_id: targetId,
      created_at: authNow().toISOString(),
    })
  } catch (error) {
    const name = error instanceof Error ? error.name : 'Error'
    console.error(`profile_visit insert failed: ${name}`)
  }
}

type Qualified = {
  account_id: string
  profiles_viewed_24h: number
  over_threshold_at: string
}

/** Distinct targets in the window. The 51st first-open is the moment the count passed 50. */
export function qualifyVisitAccounts(rows: readonly VisitRow[], threshold = VISIT_THRESHOLD): Qualified[] {
  const byAccount = new Map<string, Map<string, string>>()
  for (const row of rows) {
    const created = toVisitIso(row.created_at)
    const targets = byAccount.get(row.account_id) ?? new Map<string, string>()
    const first = targets.get(row.target_id)
    if (!first || created < first) {
      targets.set(row.target_id, created)
    }
    byAccount.set(row.account_id, targets)
  }
  const qualified: Qualified[] = []
  for (const [accountId, targets] of byAccount) {
    const firsts = [...targets.values()].sort((left, right) => left.localeCompare(right))
    if (firsts.length <= threshold) {
      continue
    }
    const crossed = firsts[threshold]
    if (!crossed) {
      continue
    }
    qualified.push({
      account_id: accountId,
      profiles_viewed_24h: firsts.length,
      over_threshold_at: crossed,
    })
  }
  qualified.sort(
    (left, right) =>
      right.over_threshold_at.localeCompare(left.over_threshold_at) || left.account_id.localeCompare(right.account_id),
  )
  return qualified
}

function isGender(value: string): value is Gender {
  return value === 'sister' || value === 'brother'
}

async function loadAccount(id: string): Promise<{ id: string; pseudonym: string; gender: Gender } | null> {
  if (accountStoreIsMemory()) {
    const store = getAccountStore() as { accounts?: CreatedAccount[] }
    const row = store.accounts?.find((item) => item.id === id)
    if (!row || !isGender(row.gender)) {
      return null
    }
    return { id: row.id, pseudonym: row.pseudonym, gender: row.gender }
  }
  const rows = await getIdentityDatabase()
    .select({ id: account.id, pseudonym: account.pseudonym, gender: account.gender })
    .from(account)
    .where(eq(account.id, id))
    .limit(1)
  const row = rows[0]
  if (!row || !isGender(row.gender)) {
    return null
  }
  return { id: row.id, pseudonym: row.pseudonym, gender: row.gender }
}

async function loadCityAndDob(accountId: string): Promise<{ city: string | null; dob: string | null }> {
  if (profileStoreIsMemory() || accountStoreIsMemory()) {
    const row = await getProfileStore().read(accountId)
    return { city: row?.city ?? null, dob: row?.dob ?? null }
  }
  const rows = await getIdentityDatabase()
    .select({ city: profile.city, dob: profile.dob })
    .from(profile)
    .where(eq(profile.account_id, accountId))
    .limit(1)
  const row = rows[0]
  return { city: row?.city ?? null, dob: row ? String(row.dob) : null }
}

async function idVerified(accountId: string): Promise<boolean> {
  if (profileStoreIsMemory() || accountStoreIsMemory()) {
    const idDocument = await getCaptureStore().latest(accountId, 'id_document')
    const liveness = await getCaptureStore().latest(accountId, 'liveness')
    return idDocument?.status === 'granted' && liveness?.status === 'granted'
  }
  const rows = await getIdentityDatabase()
    .select({ id: verificationRecord.id, kind: verificationRecord.kind, status: verificationRecord.status })
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

export async function listVisitSignals(now = authNow()): Promise<VisitSignalsBody> {
  const generatedAt = now.toISOString()
  const since = new Date(now.getTime() - WINDOW_MS)
  const visits = (await getProfileVisitStore().listInWindow(since.toISOString(), generatedAt)).map((row) => ({
    ...row,
    created_at: toVisitIso(row.created_at),
  }))
  const qualified = qualifyVisitAccounts(visits)
  const kept: VisitSignalRow[] = []
  for (const item of qualified) {
    const invites = await getInvitesPort().sentCountSince(item.account_id, since)
    if (invites !== 0) {
      continue
    }
    const owner = await loadAccount(item.account_id)
    if (!owner || !isUuidV7(owner.id)) {
      continue
    }
    const place = await loadCityAndDob(owner.id)
    kept.push({
      account_id: owner.id,
      pseudonym: owner.pseudonym,
      gender: owner.gender,
      age: place.dob ? ageOn(place.dob, now) : null,
      city: place.city,
      member_since: uuidV7Instant(owner.id).toISOString(),
      id_verified: await idVerified(owner.id),
      profiles_viewed_24h: item.profiles_viewed_24h,
      invites_sent_24h: invites,
      over_threshold_at: item.over_threshold_at,
    })
  }
  return {
    threshold: VISIT_THRESHOLD,
    window_hours: VISIT_WINDOW_HOURS,
    generated_at: generatedAt,
    count: kept.length,
    truncated: kept.length > MAX_ROWS,
    rows: kept.slice(0, MAX_ROWS),
  }
}
