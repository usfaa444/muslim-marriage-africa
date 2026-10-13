import type { Gender } from '@ankanu/kernel'
import { eq } from 'drizzle-orm'
import { account, profile } from './account-schema.js'
import { getIdentityDatabase } from './account-store.js'
import type { CreatedProfile } from './create-account.js'
import type { ProfileWrite } from './profile-fields.js'

export type StoredProfile = ProfileWrite & {
  account_id: string
  bio_live: string | null
  visibility: string | null
  gender: Gender
}

export type ProfileStore = {
  read(accountId: string): Promise<StoredProfile | null>
  update(accountId: string, patch: ProfileWrite): Promise<StoredProfile | null>
}

type AccountGender = { id: string; gender: string }

let override: ProfileStore | undefined

export function setProfileStore(store: ProfileStore | undefined): void {
  override = store
}

export function getProfileStore(): ProfileStore {
  if (override) {
    return override
  }
  return postgresProfileStore()
}

function asGender(value: string): Gender | null {
  if (value === 'sister' || value === 'brother') {
    return value
  }
  return null
}

function asDob(value: unknown): string {
  if (typeof value === 'string') {
    return value.slice(0, 10)
  }
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10)
  }
  return ''
}

export function memoryProfileStore(accounts: AccountGender[], profiles: CreatedProfile[]): ProfileStore {
  const extra = new Map<string, ProfileWrite>()
  return {
    async read(accountId) {
      return compose(accounts, profiles, extra, accountId)
    },
    async update(accountId, patch) {
      const row = profiles.find((item) => item.account_id === accountId)
      if (!row) {
        return null
      }
      row.dob = patch.dob
      extra.set(accountId, patch)
      return compose(accounts, profiles, extra, accountId)
    },
  }
}

function compose(
  accounts: AccountGender[],
  profiles: CreatedProfile[],
  extra: Map<string, ProfileWrite>,
  accountId: string,
): StoredProfile | null {
  const base = profiles.find((item) => item.account_id === accountId)
  const owner = accounts.find((item) => item.id === accountId)
  const gender = owner ? asGender(owner.gender) : null
  if (!base || !gender) {
    return null
  }
  const saved = extra.get(accountId)
  return {
    account_id: accountId,
    gender,
    dob: saved?.dob ?? base.dob,
    city: saved?.city ?? null,
    country: saved?.country ?? null,
    origin: saved?.origin ?? null,
    marital_status: saved?.marital_status ?? null,
    polygamy_intent: saved?.polygamy_intent ?? null,
    education: saved?.education ?? null,
    profession: saved?.profession ?? null,
    madhhab: saved?.madhhab ?? null,
    practice: saved?.practice ?? null,
    life_plans: saved?.life_plans ?? null,
    bio_pending: saved?.bio_pending ?? null,
    bio_live: null,
    visibility: base.visibility,
  }
}

function postgresProfileStore(): ProfileStore {
  return {
    read: readProfile,
    update: updateProfile,
  }
}

async function readProfile(accountId: string): Promise<StoredProfile | null> {
  const rows = await getIdentityDatabase()
    .select({
      account_id: profile.account_id,
      dob: profile.dob,
      city: profile.city,
      country: profile.country,
      origin: profile.origin,
      marital_status: profile.marital_status,
      polygamy_intent: profile.polygamy_intent,
      education: profile.education,
      profession: profile.profession,
      madhhab: profile.madhhab,
      practice: profile.practice,
      life_plans: profile.life_plans,
      bio_live: profile.bio_live,
      bio_pending: profile.bio_pending,
      visibility: profile.visibility,
      gender: account.gender,
    })
    .from(profile)
    .innerJoin(account, eq(account.id, profile.account_id))
    .where(eq(profile.account_id, accountId))
    .limit(1)
  const row = rows[0]
  if (!row) {
    return null
  }
  const gender = asGender(row.gender)
  if (!gender) {
    return null
  }
  return {
    account_id: row.account_id,
    gender,
    dob: asDob(row.dob),
    city: row.city,
    country: row.country,
    origin: row.origin,
    marital_status: row.marital_status,
    polygamy_intent: row.polygamy_intent,
    education: row.education,
    profession: row.profession,
    madhhab: row.madhhab,
    practice: row.practice,
    life_plans: row.life_plans,
    bio_live: row.bio_live,
    bio_pending: row.bio_pending,
    visibility: row.visibility,
  }
}

/** `patch` is the merged row. A null column was cleared on purpose; an omitted key never reaches here. */
async function updateProfile(accountId: string, patch: ProfileWrite): Promise<StoredProfile | null> {
  const updated = await getIdentityDatabase()
    .update(profile)
    .set({
      dob: patch.dob,
      city: patch.city,
      country: patch.country,
      origin: patch.origin,
      marital_status: patch.marital_status,
      polygamy_intent: patch.polygamy_intent,
      education: patch.education,
      profession: patch.profession,
      madhhab: patch.madhhab,
      practice: patch.practice,
      life_plans: patch.life_plans,
      bio_pending: patch.bio_pending,
    })
    .where(eq(profile.account_id, accountId))
    .returning({ account_id: profile.account_id })
  if (updated.length === 0) {
    return null
  }
  return readProfile(accountId)
}
