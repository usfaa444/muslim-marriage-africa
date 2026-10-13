import type { Gender } from '@ankanu/kernel'
import { and, eq, isNotNull, isNull, or, sql } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import { account, profile } from './account-schema.js'
import { getIdentityDatabase } from './account-store.js'
import type { CreatedProfile } from './create-account.js'
import type { ProfileWrite } from './profile-fields.js'

export type StoredProfile = ProfileWrite & {
  account_id: string
  bio_live: string | null
  visibility: string | null
  gender: Gender
  review_queued_at: string | null
  review_passed_at: string | null
  photo_blur: boolean
}

export type QueuedProfile = StoredProfile & {
  pseudonym: string
  account_status: string
}

export type ReviewPatch = {
  review_queued_at?: string | null
  review_passed_at?: string | null
  bio_live?: string | null
  bio_pending?: string | null
  visibility?: string | null
}

export type ProfileDb = Pick<NodePgDatabase, 'select' | 'update' | 'insert' | 'execute'>

/** `queued` writes only while this profile is still in the queue. `unpublished` writes public only from `unpublished`. */
export type ReviewWriteScope = 'queued' | 'unpublished'

export type ProfileStore = {
  read(accountId: string, db?: ProfileDb): Promise<StoredProfile | null>
  update(accountId: string, patch: ProfileWrite): Promise<StoredProfile | null>
  setPhotoBlur(accountId: string, photoBlur: boolean): Promise<StoredProfile | null>
  noteQueued(accountId: string, at: string): Promise<StoredProfile | null>
  patchReview(accountId: string, patch: ReviewPatch, scope?: ReviewWriteScope, db?: ProfileDb): Promise<StoredProfile | null>
  queued(): Promise<QueuedProfile[]>
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

/** Unit tests install a memory store. Production leaves this false and uses Postgres. */
export function profileStoreIsMemory(): boolean {
  return override !== undefined
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

type ReviewMemory = {
  review_queued_at: string | null
  review_passed_at: string | null
  bio_live: string | null
}

type ProfileSnap = {
  visibility: Array<{ account_id: string; visibility: string | null }>
  extra: Array<[string, ProfileWrite]>
  review: Array<[string, ReviewMemory]>
  blur: Array<[string, boolean]>
}

export function memoryProfileStore(
  accounts: Array<AccountGender & { pseudonym?: string; status?: string }>,
  profiles: CreatedProfile[],
): ProfileStore & { snapshot(): ProfileSnap; restore(snap: ProfileSnap): void } {
  const extra = new Map<string, ProfileWrite>()
  const review = new Map<string, ReviewMemory>()
  const blur = new Map<string, boolean>()
  return {
    snapshot() {
      return structuredClone({
        visibility: profiles.map((row) => ({ account_id: row.account_id, visibility: row.visibility })),
        extra: [...extra.entries()],
        review: [...review.entries()],
        blur: [...blur.entries()],
      })
    },
    restore(snap) {
      extra.clear()
      review.clear()
      blur.clear()
      for (const [accountId, patch] of snap.extra) {
        extra.set(accountId, patch)
      }
      for (const [accountId, clock] of snap.review) {
        review.set(accountId, clock)
      }
      for (const [accountId, value] of snap.blur ?? []) {
        blur.set(accountId, value)
      }
      for (const item of snap.visibility) {
        const row = profiles.find((entry) => entry.account_id === item.account_id)
        if (row) {
          row.visibility = item.visibility
        }
      }
    },
    async read(accountId) {
      return compose(accounts, profiles, extra, review, blur, accountId)
    },
    async update(accountId, patch) {
      const row = profiles.find((item) => item.account_id === accountId)
      if (!row) {
        return null
      }
      row.dob = patch.dob
      extra.set(accountId, patch)
      return compose(accounts, profiles, extra, review, blur, accountId)
    },
    async setPhotoBlur(accountId, photoBlur) {
      const row = profiles.find((item) => item.account_id === accountId)
      if (!row) {
        return null
      }
      blur.set(accountId, photoBlur)
      return compose(accounts, profiles, extra, review, blur, accountId)
    },
    async noteQueued(accountId, at) {
      const row = profiles.find((item) => item.account_id === accountId)
      if (!row) {
        return null
      }
      const current = review.get(accountId) ?? { review_queued_at: null, review_passed_at: null, bio_live: null }
      if (current.review_queued_at !== null && row.visibility !== null) {
        return compose(accounts, profiles, extra, review, blur, accountId)
      }
      if (current.review_queued_at === null) {
        current.review_queued_at = at
        review.set(accountId, current)
      }
      if (row.visibility === null) {
        row.visibility = 'unpublished'
      }
      return compose(accounts, profiles, extra, review, blur, accountId)
    },
    async patchReview(accountId, patch, scope) {
      const row = profiles.find((item) => item.account_id === accountId)
      if (!row) {
        return null
      }
      const current = review.get(accountId) ?? { review_queued_at: null, review_passed_at: null, bio_live: null }
      if (scope === 'queued' && current.review_queued_at === null) {
        return null
      }
      if (scope === 'unpublished' && row.visibility !== 'unpublished') {
        return compose(accounts, profiles, extra, review, blur, accountId)
      }
      if ('review_queued_at' in patch) {
        current.review_queued_at = patch.review_queued_at ?? null
      }
      if ('review_passed_at' in patch) {
        current.review_passed_at = patch.review_passed_at ?? null
      }
      if ('bio_live' in patch) {
        current.bio_live = patch.bio_live ?? null
      }
      review.set(accountId, current)
      if ('visibility' in patch) {
        row.visibility = patch.visibility ?? null
      }
      if ('bio_pending' in patch) {
        const saved = extra.get(accountId)
        if (saved) {
          saved.bio_pending = patch.bio_pending ?? null
        }
      }
      return compose(accounts, profiles, extra, review, blur, accountId)
    },
    async queued() {
      const rows: QueuedProfile[] = []
      for (const item of profiles) {
        const stored = compose(accounts, profiles, extra, review, blur, item.account_id)
        const owner = accounts.find((entry) => entry.id === item.account_id)
        if (!stored?.review_queued_at || !owner) {
          continue
        }
        rows.push({
          ...stored,
          pseudonym: owner.pseudonym ?? '',
          account_status: owner.status ?? '',
        })
      }
      return rows
    },
  }
}

function compose(
  accounts: AccountGender[],
  profiles: CreatedProfile[],
  extra: Map<string, ProfileWrite>,
  review: Map<string, ReviewMemory>,
  blur: Map<string, boolean>,
  accountId: string,
): StoredProfile | null {
  const base = profiles.find((item) => item.account_id === accountId)
  const owner = accounts.find((item) => item.id === accountId)
  const gender = owner ? asGender(owner.gender) : null
  if (!base || !gender) {
    return null
  }
  const saved = extra.get(accountId)
  const clock = review.get(accountId)
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
    bio_live: clock?.bio_live ?? null,
    visibility: base.visibility,
    review_queued_at: clock?.review_queued_at ?? null,
    review_passed_at: clock?.review_passed_at ?? null,
    photo_blur: blur.get(accountId) ?? true,
  }
}

function postgresProfileStore(): ProfileStore {
  return {
    read: (accountId, db) => readProfile(accountId, db),
    update: updateProfile,
    setPhotoBlur: setPhotoBlur,
    noteQueued: noteQueued,
    patchReview: (accountId, patch, scope, db) => patchReview(accountId, patch, scope, db),
    queued: queuedProfiles,
  }
}

async function readProfile(accountId: string, db?: ProfileDb): Promise<StoredProfile | null> {
  const rows = await (db ?? getIdentityDatabase())
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
      review_queued_at: profile.review_queued_at,
      review_passed_at: profile.review_passed_at,
      photo_blur: profile.photo_blur,
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
    review_queued_at: row.review_queued_at,
    review_passed_at: row.review_passed_at,
    photo_blur: row.photo_blur,
  }
}

async function noteQueued(accountId: string, at: string): Promise<StoredProfile | null> {
  const current = await readProfile(accountId)
  if (!current) {
    return null
  }
  if (current.review_queued_at !== null && current.visibility !== null) {
    return current
  }
  await getIdentityDatabase()
    .update(profile)
    .set({
      review_queued_at: sql`coalesce(${profile.review_queued_at}, ${at})`,
      visibility: sql`case when ${profile.visibility} is null then 'unpublished' else ${profile.visibility} end`,
    })
    .where(
      and(eq(profile.account_id, accountId), or(isNull(profile.review_queued_at), isNull(profile.visibility))),
    )
  return readProfile(accountId)
}

async function patchReview(
  accountId: string,
  patch: ReviewPatch,
  scope?: ReviewWriteScope,
  db?: ProfileDb,
): Promise<StoredProfile | null> {
  const set: {
    review_queued_at?: string | null
    review_passed_at?: string | null
    bio_live?: string | null
    bio_pending?: string | null
    visibility?: string | null
  } = {}
  if ('review_queued_at' in patch) {
    set.review_queued_at = patch.review_queued_at ?? null
  }
  if ('review_passed_at' in patch) {
    set.review_passed_at = patch.review_passed_at ?? null
  }
  if ('bio_live' in patch) {
    set.bio_live = patch.bio_live ?? null
  }
  if ('bio_pending' in patch) {
    set.bio_pending = patch.bio_pending ?? null
  }
  if ('visibility' in patch) {
    set.visibility = patch.visibility ?? null
  }
  if (Object.keys(set).length > 0) {
    const database = db ?? getIdentityDatabase()
    const filters = [eq(profile.account_id, accountId)]
    if (scope === 'queued') {
      filters.push(isNotNull(profile.review_queued_at))
    }
    if (scope === 'unpublished') {
      filters.push(eq(profile.visibility, 'unpublished'))
      filters.push(isNotNull(profile.review_passed_at))
    }
    const updated = await database
      .update(profile)
      .set(set)
      .where(and(...filters))
      .returning({ account_id: profile.account_id })
    if (updated.length === 0) {
      if (scope === 'unpublished') {
        return readProfile(accountId, db)
      }
      return null
    }
  }
  return readProfile(accountId, db)
}

async function queuedProfiles(): Promise<QueuedProfile[]> {
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
      review_queued_at: profile.review_queued_at,
      review_passed_at: profile.review_passed_at,
      photo_blur: profile.photo_blur,
      pseudonym: account.pseudonym,
      account_status: account.status,
    })
    .from(profile)
    .innerJoin(account, eq(account.id, profile.account_id))
    .where(isNotNull(profile.review_queued_at))
  const queued: QueuedProfile[] = []
  for (const row of rows) {
    const gender = asGender(row.gender)
    if (!gender || !row.review_queued_at) {
      continue
    }
    queued.push({
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
      review_queued_at: row.review_queued_at,
      review_passed_at: row.review_passed_at,
      photo_blur: row.photo_blur,
      pseudonym: row.pseudonym,
      account_status: row.account_status,
    })
  }
  return queued
}

async function setPhotoBlur(accountId: string, photoBlur: boolean): Promise<StoredProfile | null> {
  const updated = await getIdentityDatabase()
    .update(profile)
    .set({ photo_blur: photoBlur })
    .where(eq(profile.account_id, accountId))
    .returning({ account_id: profile.account_id })
  if (updated.length === 0) {
    return null
  }
  return readProfile(accountId)
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
