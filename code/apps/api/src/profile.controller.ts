import { Body, Controller, Get, Header, HttpException, Patch, Put, Req, Res } from '@nestjs/common'
import { ageOn } from './create-account.js'
import { authNow } from './auth-clock.js'
import { getAccountStore } from './account-store.js'
import { NON_MEMBER_PAUSE_MESSAGE } from './life-pause.js'
import { requireLiveSession, unauthenticated } from './pin-session.js'
import { acceptPhotoBlur, acceptProfileWrite, completenessFor, isProfileFieldError } from './profile-fields.js'
import { galleryForMember, pendingPhotoForMember, photoForMember } from './media.controller.js'
import { queueAfterProfileSave, readFreeReviewSlaHours } from './profile-review.js'
import { getProfileStore, type StoredProfile } from './profile-store.js'

type CookieRequest = {
  headers?: { cookie?: string | string[] }
}

type HeaderResponse = {
  setHeader(name: string, value: string): void
}

function reject(status: 400 | 503, error: { field: string; message: string }, retryable = false): never {
  throw new HttpException(
    {
      code: 'UNHANDLED',
      message: error.message,
      details: { field: error.field },
      retryable,
    },
    status,
  )
}

function forbid(): never {
  throw new HttpException(
    {
      code: 'FORBIDDEN',
      message: NON_MEMBER_PAUSE_MESSAGE,
      details: null,
      retryable: false,
    },
    403,
  )
}

async function withSla(row: StoredProfile) {
  const hours = await readFreeReviewSlaHours()
  if (hours === null) {
    reject(503, { field: 'free_review_sla_hours', message: 'free_review_sla_hours : la configuration est illisible.' }, true)
  }
  return { ...present(row), review_sla_hours: hours }
}

function present(row: StoredProfile) {
  return {
    dob: row.dob,
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
    bio_pending: row.bio_pending,
    bio_live: row.bio_live,
    photo_blur: row.photo_blur,
    completeness: completenessFor(row, row.gender),
  }
}

async function memberPhotos(accountId: string): Promise<{
  photo: Awaited<ReturnType<typeof photoForMember>>
  photos: Awaited<ReturnType<typeof galleryForMember>>
  pending_photo?: NonNullable<Awaited<ReturnType<typeof pendingPhotoForMember>>>
}> {
  const photo = await photoForMember(accountId)
  const pending = await pendingPhotoForMember(accountId)
  const photos = await galleryForMember(accountId)
  if (!pending) {
    return { photo, photos }
  }
  return { photo, photos, pending_photo: pending }
}

async function memberAccount(request: CookieRequest): Promise<{ accountId: string; gender: StoredProfile['gender'] }> {
  const session = await requireLiveSession(request.headers?.cookie)
  if (!session.roles.includes('member')) {
    forbid()
  }
  return { accountId: session.account_id, gender: session.gender }
}

// Every body carries signed photo URLs that expire after signed_url_ttl_seconds. A browser
// must never reuse one, including on a back/forward navigation, so nothing here is stored.
@Controller('me')
export class ProfileController {
  @Get('profile')
  @Header('Cache-Control', 'no-store')
  async read(@Req() request: CookieRequest, @Res({ passthrough: true }) response: HeaderResponse) {
    response.setHeader('Cache-Control', 'no-store')
    const member = await memberAccount(request)
    const row = await getProfileStore().read(member.accountId)
    if (!row) {
      unauthenticated()
    }
    return {
      ...(await withSla(row)),
      ...(await memberPhotos(member.accountId)),
      account_id: member.accountId,
      gender: member.gender,
    }
  }

  @Put('profile')
  @Header('Cache-Control', 'no-store')
  async save(
    @Req() request: CookieRequest,
    @Res({ passthrough: true }) response: HeaderResponse,
    @Body() body: unknown,
  ) {
    response.setHeader('Cache-Control', 'no-store')
    const member = await memberAccount(request)
    const current = await getProfileStore().read(member.accountId)
    if (!current) {
      unauthenticated()
    }
    const accepted = acceptProfileWrite(body, member.gender, current)
    if (isProfileFieldError(accepted)) {
      reject(400, accepted)
    }
    const age = ageOn(accepted.dob, authNow())
    if (age === null) {
      reject(400, { field: 'dob', message: 'dob : une date de naissance est requise.' })
    }
    const minAge = await getAccountStore().minAge()
    if (minAge === null) {
      reject(503, { field: 'min_age', message: 'min_age : la configuration est illisible.' }, true)
    }
    if (age < minAge) {
      reject(400, { field: 'dob', message: "dob : l'âge déclaré est inférieur au minimum." })
    }
    const saved = await getProfileStore().update(member.accountId, accepted)
    if (!saved) {
      unauthenticated()
    }
    const queued = await queueAfterProfileSave(saved, authNow().toISOString())
    return { ...(await withSla(queued ?? saved)), ...(await memberPhotos(member.accountId)) }
  }

  @Patch('profile')
  @Header('Cache-Control', 'no-store')
  async blur(
    @Req() request: CookieRequest,
    @Res({ passthrough: true }) response: HeaderResponse,
    @Body() body: unknown,
  ) {
    response.setHeader('Cache-Control', 'no-store')
    const member = await memberAccount(request)
    const accepted = acceptPhotoBlur(body)
    if ('field' in accepted) {
      reject(400, accepted)
    }
    const current = await getProfileStore().read(member.accountId)
    const previousBlur = current?.photo_blur !== false
    const saved = await getProfileStore().setPhotoBlur(member.accountId, accepted.photo_blur)
    if (!saved) {
      unauthenticated()
    }
    try {
      return { ...(await withSla(saved)), ...(await memberPhotos(member.accountId)) }
    } catch (error) {
      await getProfileStore().setPhotoBlur(member.accountId, previousBlur)
      throw error
    }
  }
}
