import { isUuidV7, type Gender } from '@ankanu/kernel'
import { eq } from 'drizzle-orm'
import { account, verificationRecord } from './account-schema.js'
import { accountStoreIsMemory, getAccountStore, getIdentityDatabase } from './account-store.js'
import { ageOn, type CreatedAccount } from './create-account.js'
import { authNow } from './auth-clock.js'
import { readRlBrowsePerMin, takeBrowseSlot } from './browse-rate.js'
import { getCaptureStore } from './id-liveness-store.js'
import { getMediaStore } from './media-store.js'
import { livePhotosForMember } from './media.js'
import { getMahramPort } from './mahram-port.js'
import { getPhoneOtpStore, type PhoneOtpRow } from './phone-otp-store.js'
import { isListableProfile } from './profile-review.js'
import { getProfileStore, profileStoreIsMemory, type StoredProfile } from './profile-store.js'
import type { ResolvedSession } from './session-store.js'

export const PROFILE_UNAVAILABLE = "Ce profil n'est pas disponible."
export const VIEWER_NOT_LISTABLE = "Votre profil doit être validé avant de consulter d'autres profils."
export const BROWSE_RATE_MESSAGE = 'Cadence de requêtes régulée.'
export const STAFF_MEMBER_MESSAGE = "Cette session d'équipe ne peut pas ouvrir un espace membre."
export const MAHRAM_MEMBER_MESSAGE = 'Une session mahram ne peut pas ouvrir cet espace.'
const STAFF_ROLES = new Set(['moderator', 'operator'])

export type PublicPhoto = {
  id: string
  is_main: boolean
  url: string
}

export type PublicProfileBody = {
  profile: {
    id: string
    pseudonym: string
    age: number | null
    city: string | null
    country: string | null
    profession: string | null
    marital_status: string | null
    polygamy_intent: string | null
    madhhab: string | null
    practice: string | null
    life_plans: string | null
  }
  verification: {
    phone: boolean
    id: boolean
    mahram: boolean
  }
  photo_blur: boolean
  photos: PublicPhoto[]
}

export type PublicProfileFailure = {
  ok: false
  status: 403 | 404 | 429 | 500 | 503
  code: 'FORBIDDEN' | 'NOT_FOUND' | 'RATE_LIMITED' | 'UNHANDLED'
  message: string
  details: { reason?: string } | null
  retryable: boolean
}

export type BrowseViewer = {
  id: string
  pseudonym: string
  gender: Gender
  roles: readonly string[]
  status: string
}

function failure(
  status: PublicProfileFailure['status'],
  code: PublicProfileFailure['code'],
  message: string,
  details: PublicProfileFailure['details'],
  retryable: boolean,
): PublicProfileFailure {
  return { ok: false, status, code, message, details, retryable }
}

function unavailable(): PublicProfileFailure {
  return failure(404, 'NOT_FOUND', PROFILE_UNAVAILABLE, null, false)
}

function isGender(value: string): value is Gender {
  return value === 'sister' || value === 'brother'
}

async function loadAccount(id: string): Promise<BrowseViewer | null> {
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

async function latestStatuses(accountId: string): Promise<Map<string, string>> {
  if (profileStoreIsMemory()) {
    const latest = new Map<string, string>()
    const store = getPhoneOtpStore() as { rows?: PhoneOtpRow[] }
    let phone: PhoneOtpRow | undefined
    for (const row of store.rows ?? []) {
      if (row.account_id !== accountId) {
        continue
      }
      if (!phone || row.id > phone.id) {
        phone = row
      }
    }
    if (phone) {
      latest.set('phone_otp', phone.status)
    }
    const idDocument = await getCaptureStore().latest(accountId, 'id_document')
    const liveness = await getCaptureStore().latest(accountId, 'liveness')
    if (idDocument) {
      latest.set('id_document', idDocument.status)
    }
    if (liveness) {
      latest.set('liveness', liveness.status)
    }
    return latest
  }
  const rows = await getIdentityDatabase()
    .select({ id: verificationRecord.id, kind: verificationRecord.kind, status: verificationRecord.status })
    .from(verificationRecord)
    .where(eq(verificationRecord.account_id, accountId))
  const chosen = new Map<string, { id: string; status: string }>()
  for (const row of rows) {
    const current = chosen.get(row.kind)
    if (!current || row.id > current.id) {
      chosen.set(row.kind, { id: row.id, status: row.status })
    }
  }
  return new Map([...chosen.entries()].map(([kind, row]) => [kind, row.status]))
}

async function verificationFlags(accountId: string, gender: Gender): Promise<PublicProfileBody['verification']> {
  const latest = await latestStatuses(accountId)
  const mahram = gender === 'sister' ? await getMahramPort().verifiedWali(accountId) : false
  return {
    phone: latest.get('phone_otp') === 'granted',
    id: latest.get('id_document') === 'granted' && latest.get('liveness') === 'granted',
    mahram,
  }
}

function presentProfile(row: StoredProfile, owner: BrowseViewer): PublicProfileBody['profile'] {
  return {
    id: owner.id,
    pseudonym: owner.pseudonym,
    age: ageOn(row.dob, authNow()),
    city: row.city,
    country: row.country,
    profession: row.profession,
    marital_status: row.marital_status,
    polygamy_intent: row.polygamy_intent,
    madhhab: row.madhhab,
    practice: row.practice,
    life_plans: row.life_plans,
  }
}

/** Session, staff/mahram, then the viewer's own listable profile. Does not take a browse slot. */
export async function assertBrowseViewer(
  viewer: ResolvedSession,
): Promise<{ ok: true; account: BrowseViewer } | PublicProfileFailure> {
  if (viewer.roles.some((role) => STAFF_ROLES.has(role))) {
    return failure(403, 'FORBIDDEN', STAFF_MEMBER_MESSAGE, { reason: 'staff_session' }, false)
  }
  if (!viewer.roles.includes('member')) {
    return failure(403, 'FORBIDDEN', MAHRAM_MEMBER_MESSAGE, { reason: 'mahram_session' }, false)
  }

  const viewerAccount = await loadAccount(viewer.account_id)
  const viewerProfile = await getProfileStore().read(viewer.account_id)
  if (!viewerAccount || !isListableProfile(viewerProfile?.visibility ?? null, viewerAccount.status)) {
    return failure(403, 'FORBIDDEN', VIEWER_NOT_LISTABLE, { reason: 'viewer_not_listable' }, false)
  }
  return { ok: true, account: viewerAccount }
}

/**
 * Other-member profile read. Writes nothing. Does not call BillingPort.
 * One 404 body covers every hidden target.
 */
export async function readPublicProfile(
  viewer: ResolvedSession,
  targetId: string,
): Promise<{ ok: true; body: PublicProfileBody } | PublicProfileFailure> {
  const gate = await assertBrowseViewer(viewer)
  if (!gate.ok) {
    return gate
  }

  const limit = await readRlBrowsePerMin()
  if (limit === null) {
    return failure(500, 'UNHANDLED', 'Request failed', null, false)
  }
  if (!takeBrowseSlot(viewer.account_id, limit)) {
    return failure(429, 'RATE_LIMITED', BROWSE_RATE_MESSAGE, null, true)
  }

  if (!isUuidV7(targetId) || targetId === viewer.account_id) {
    return unavailable()
  }
  const target = await loadAccount(targetId)
  const profile = await getProfileStore().read(targetId)
  if (
    !target ||
    !profile ||
    !target.roles.includes('member') ||
    !isGender(target.gender) ||
    target.gender === viewer.gender ||
    !isListableProfile(profile.visibility, target.status)
  ) {
    return unavailable()
  }

  const photos = await livePhotosForMember(getMediaStore(), target.id, viewer.account_id, 'md')
  if (!photos.ok) {
    if (photos.code === 'REVEAL_DENIED' || photos.code === 'FORBIDDEN' || photos.code === 'PHOTO_LIMIT_REACHED') {
      return failure(503, 'UNHANDLED', 'Request failed', null, true)
    }
    return failure(photos.status === 429 ? 429 : 503, photos.code === 'RATE_LIMITED' ? 'RATE_LIMITED' : 'UNHANDLED', photos.message, null, photos.retryable)
  }

  return {
    ok: true,
    body: {
      profile: presentProfile(profile, target),
      verification: await verificationFlags(target.id, target.gender),
      photo_blur: profile.photo_blur,
      photos: photos.photos,
    },
  }
}
