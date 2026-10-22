import { Body, Controller, Get, Header, HttpCode, HttpException, Param, Post, Query, Req, Res, StreamableFile } from '@nestjs/common'
import { requireStaffSession } from './staff-session.js'
import {
  decideVerification,
  openReviewCase,
  readEvidence,
  readReviewQueue,
  readUnblurredPhoto,
  unblurPhoto,
  type ReviewConsoleFailure,
  type StaffCaller,
} from './staff-review.js'

type CookieRequest = { headers?: { cookie?: string | string[] } }
type HeaderResponse = { setHeader(name: string, value: string): void }

/** Seconds a staff session waits after the evidence limit (the window is one minute). */
export const EVIDENCE_RETRY_AFTER_SECONDS = '60'

function fail(error: ReviewConsoleFailure): never {
  throw new HttpException(
    { code: error.code, message: error.message, details: error.details, retryable: error.retryable },
    error.status,
  )
}

/** A staff session with MFA done (401 without a session; 403 for a member, Mahram or MFA-pending session). */
async function staffCaller(request: CookieRequest): Promise<StaffCaller> {
  return requireStaffSession(request.headers?.cookie)
}

/** Evidence bytes: never cached, shown inline, never sniffed, never framed elsewhere. */
function evidenceFile(bytes: Buffer, contentType: string): StreamableFile {
  return new StreamableFile(bytes, { type: contentType, disposition: 'inline', length: bytes.length })
}

/** `/v1/staff/review/*`: the staff review console. Every answer is `no-store`. */
@Controller('staff/review')
export class StaffReviewController {
  @Get('queue')
  @Header('Cache-Control', 'no-store')
  async queue(@Req() request: CookieRequest) {
    const caller = await staffCaller(request)
    const read = await readReviewQueue(caller)
    if (!read.ok) {
      fail(read)
    }
    return read.view
  }

  @Get('cases/:accountId')
  @Header('Cache-Control', 'no-store')
  async case(@Req() request: CookieRequest, @Param('accountId') accountId: string) {
    const caller = await staffCaller(request)
    const opened = await openReviewCase(caller, accountId)
    if (!opened.ok) {
      fail(opened)
    }
    return opened.view
  }

  @Get('evidence/:recordId')
  @Header('Cache-Control', 'no-store, private, max-age=0')
  @Header('Pragma', 'no-cache')
  @Header('X-Content-Type-Options', 'nosniff')
  @Header('Content-Security-Policy', "default-src 'none'; frame-ancestors 'self'")
  async evidence(
    @Req() request: CookieRequest,
    @Res({ passthrough: true }) response: HeaderResponse,
    @Param('recordId') recordId: string,
  ): Promise<StreamableFile> {
    const caller = await staffCaller(request)
    const read = await readEvidence(caller, recordId)
    if (!read.ok) {
      if (read.status === 429) {
        response.setHeader('Retry-After', EVIDENCE_RETRY_AFTER_SECONDS)
      }
      fail(read)
    }
    return evidenceFile(read.bytes, read.contentType)
  }

  @Post('photos/unblur')
  @HttpCode(201)
  @Header('Cache-Control', 'no-store')
  async unblur(@Req() request: CookieRequest, @Body() body: unknown) {
    const caller = await staffCaller(request)
    const granted = await unblurPhoto(caller, body)
    if (!granted.ok) {
      fail(granted)
    }
    return { url: granted.url, expires_at: granted.expires_at }
  }

  @Get('photo')
  @Header('Cache-Control', 'no-store, private, max-age=0')
  @Header('Pragma', 'no-cache')
  @Header('X-Content-Type-Options', 'nosniff')
  @Header('Content-Security-Policy', "default-src 'none'; frame-ancestors 'self'")
  async photo(@Req() request: CookieRequest, @Query('token') token: unknown): Promise<StreamableFile> {
    const caller = await staffCaller(request)
    const read = await readUnblurredPhoto(caller, token)
    if (!read.ok) {
      fail(read)
    }
    return evidenceFile(read.bytes, read.contentType)
  }

  @Post('decisions')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  async decide(@Req() request: CookieRequest, @Body() body: unknown) {
    const caller = await staffCaller(request)
    const decided = await decideVerification(caller, body)
    if (!decided.ok) {
      fail(decided)
    }
    return decided.result
  }
}
