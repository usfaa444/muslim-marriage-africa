import { Body, Controller, Delete, Get, HttpException, Param, Post, Put, Query, Req, StreamableFile } from '@nestjs/common'
import { NON_MEMBER_PAUSE_MESSAGE } from './life-pause.js'
import {
  chooseMainPhoto,
  ownerGallery,
  ownerPendingPhotoCard,
  ownerPhotoCard,
  readGrantedMedia,
  removeGalleryPhoto,
  uploadProfilePhoto,
  type GalleryPhoto,
  type MediaFailure,
  type OwnerPhotoCard,
} from './media.js'
import { getMediaStore } from './media-store.js'
import { requireLiveSession } from './pin-session.js'

type CookieRequest = {
  headers?: { cookie?: string | string[] }
}

function fail(error: MediaFailure): never {
  throw new HttpException(
    {
      code: error.code,
      message: error.message,
      details: error.details,
      retryable: error.retryable,
      ...(error.retryAfter !== undefined ? { retryAfter: error.retryAfter } : {}),
    },
    error.status,
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

async function memberAccount(request: CookieRequest): Promise<{ accountId: string }> {
  const session = await requireLiveSession(request.headers?.cookie)
  if (!session.roles.includes('member')) {
    forbid()
  }
  return { accountId: session.account_id }
}

/** A signed blur grant is readable by the member who holds it and by staff reviewing that grant. */
async function grantViewer(request: CookieRequest): Promise<{ accountId: string }> {
  const session = await requireLiveSession(request.headers?.cookie)
  if (
    !session.roles.includes('member') &&
    !session.roles.includes('moderator') &&
    !session.roles.includes('operator')
  ) {
    forbid()
  }
  return { accountId: session.account_id }
}

@Controller('media')
export class MediaController {
  @Post()
  async upload(@Req() request: CookieRequest, @Body() body: unknown) {
    const member = await memberAccount(request)
    const saved = await uploadProfilePhoto(getMediaStore(), member.accountId, body)
    if (!saved.ok) {
      fail(saved)
    }
    return saved.photo
  }

  @Get('get')
  async gateway(@Req() request: CookieRequest, @Query('token') token: unknown): Promise<StreamableFile> {
    const member = await grantViewer(request)
    if (typeof token !== 'string' || token.trim() === '') {
      fail({
        ok: false,
        status: 403,
        code: 'FORBIDDEN',
        message: 'Accès au média refusé.',
        details: null,
        retryable: false,
      })
    }
    const read = await readGrantedMedia(getMediaStore(), token.trim(), member.accountId)
    if (!read.ok) {
      fail(read)
    }
    return new StreamableFile(Buffer.from(read.bytes), { type: 'image/jpeg' })
  }

  @Put(':id/main')
  async main(@Req() request: CookieRequest, @Param('id') id: string) {
    const member = await memberAccount(request)
    const saved = await chooseMainPhoto(getMediaStore(), member.accountId, id)
    if (!saved.ok) {
      fail(saved)
    }
    return { photos: saved.photos }
  }

  @Delete(':id')
  async remove(@Req() request: CookieRequest, @Param('id') id: string) {
    const member = await memberAccount(request)
    const saved = await removeGalleryPhoto(getMediaStore(), member.accountId, id)
    if (!saved.ok) {
      fail(saved)
    }
    return { photos: saved.photos }
  }
}

export async function photoForMember(accountId: string): Promise<OwnerPhotoCard | null> {
  const read = await ownerPhotoCard(getMediaStore(), accountId)
  if (!read.ok) {
    fail(read)
  }
  return read.photo
}

export async function galleryForMember(accountId: string): Promise<GalleryPhoto[]> {
  const read = await ownerGallery(getMediaStore(), accountId)
  if (!read.ok) {
    fail(read)
  }
  return read.photos
}

export async function pendingPhotoForMember(accountId: string): Promise<OwnerPhotoCard | null> {
  const read = await ownerPendingPhotoCard(getMediaStore(), accountId)
  if (!read.ok) {
    fail(read)
  }
  return read.photo
}
