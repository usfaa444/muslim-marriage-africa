import { Body, Controller, Get, Header, HttpCode, HttpException, Post, Query, Req } from '@nestjs/common'
import { requireLiveSession } from './pin-session.js'
import {
  decideProfileReview,
  listProfileReviews,
  readReviewMetrics,
  staffForbidden,
  type ReviewFailure,
} from './profile-review.js'
import { grantStagingVerification, stagingStaffGrantEnabled } from './staff-verification-grant.js'

type CookieRequest = {
  headers?: { cookie?: string | string[] }
}

function fail(error: ReviewFailure): never {
  throw new HttpException(
    {
      code: error.code,
      message: error.message,
      details: error.details,
      retryable: error.retryable,
    },
    error.status,
  )
}

async function staffAccount(request: CookieRequest): Promise<string> {
  const session = await requireLiveSession(request.headers?.cookie)
  if (!session.roles.includes('moderator') && !session.roles.includes('operator')) {
    fail(staffForbidden())
  }
  return session.account_id
}

@Controller('staff')
export class StaffController {
  @Get('cases')
  async cases(@Req() request: CookieRequest, @Query('kind') kind: unknown) {
    const staffId = await staffAccount(request)
    if (kind !== 'profile_review') {
      fail({
        ok: false,
        status: 400,
        code: 'UNHANDLED',
        message: 'kind : profile_review est requis.',
        details: { field: 'kind' },
        retryable: false,
      })
    }
    const listed = await listProfileReviews(staffId)
    if (!listed.ok) {
      fail(listed)
    }
    return { rows: listed.rows }
  }

  @Post('cases')
  @HttpCode(200)
  async decide(@Req() request: CookieRequest, @Body() body: unknown) {
    const staffId = await staffAccount(request)
    const decided = await decideProfileReview(staffId, body)
    if (!decided.ok) {
      fail(decided)
    }
    return decided.result
  }

  @Get('metrics')
  async metrics(@Req() request: CookieRequest) {
    await staffAccount(request)
    const metrics = await readReviewMetrics()
    if (!metrics.ok) {
      fail(metrics)
    }
    return { free_review: metrics.free_review }
  }

  @Post('verifications/grant')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  async grantVerification(@Req() request: CookieRequest, @Body() body: unknown) {
    if (!stagingStaffGrantEnabled()) {
      throw new HttpException(
        {
          code: 'NOT_FOUND',
          message: 'Introuvable.',
          details: null,
          retryable: false,
        },
        404,
      )
    }
    const staffId = await staffAccount(request)
    const granted = await grantStagingVerification(staffId, body)
    if (!granted.ok) {
      fail(granted)
    }
    return granted.result
  }
}
