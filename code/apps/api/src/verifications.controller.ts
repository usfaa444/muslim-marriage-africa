import { Body, Controller, Get, HttpException, Post, Req, Res } from '@nestjs/common'
import { authNow } from './auth-clock.js'
import { resolveWebSession } from './create-session.js'
import { readEvidenceKey } from './evidence-seal.js'
import { getEvidenceWriter } from './evidence-writer.js'
import { getCaptureStore } from './id-liveness-store.js'
import {
  readCapture,
  submitCapture,
  unauthenticatedCapture,
  type CaptureFailure,
} from './id-liveness.js'
import { readRlOtpPerHour } from './otp-limit.js'
import { readPhoneOtp, submitPhoneOtp, unauthenticatedOtp, type OtpFailure } from './phone-otp.js'
import { getPhoneOtpStore } from './phone-otp-store.js'
import { readCookie, SESSION_COOKIE } from './session-cookie.js'
import { getSmsPort } from './sms-port.js'
import { readRlVerificationUploadPerHour } from './verification-limit.js'

@Controller('verifications')
export class VerificationsController {
  @Post('otp')
  async otp(
    @Req() request: { headers?: { cookie?: string | string[] } },
    @Body() body: unknown,
    @Res({ passthrough: true }) response: { status: (code: number) => void },
  ): Promise<unknown> {
    const sessionId = readCookie(headerText(request.headers?.cookie), SESSION_COOKIE)
    const session = sessionId ? await resolveWebSession(sessionId, authNow()) : null
    if (!session) {
      throw otpError(unauthenticatedOtp())
    }
    const result = await submitPhoneOtp({
      accountId: session.accountId,
      body,
      now: authNow,
      limit: await readRlOtpPerHour(),
      store: getPhoneOtpStore(),
      send: (message) => getSmsPort().sendOtp(message),
    })
    if (!result.ok) {
      throw otpError(result)
    }
    response.status(result.status)
    return result.body
  }

  @Get('otp')
  async readOtp(
    @Req() request: { headers?: { cookie?: string | string[] } },
    @Res({ passthrough: true }) response: { status: (code: number) => void; setHeader: (name: string, value: string) => void },
  ): Promise<unknown> {
    response.setHeader('cache-control', 'no-store')
    const sessionId = readCookie(headerText(request.headers?.cookie), SESSION_COOKIE)
    const session = sessionId ? await resolveWebSession(sessionId, authNow()) : null
    if (!session) {
      throw otpError(unauthenticatedOtp())
    }
    const result = await readPhoneOtp({ accountId: session.accountId, store: getPhoneOtpStore() })
    response.status(result.status)
    return result.body
  }

  @Get('liveness')
  async readLiveness(
    @Req() request: CookieRequest,
    @Res({ passthrough: true }) response: { status: (code: number) => void },
  ): Promise<unknown> {
    return readKind('liveness', request, response)
  }

  @Post('liveness')
  async postLiveness(
    @Req() request: CookieRequest,
    @Body() body: unknown,
    @Res({ passthrough: true }) response: { status: (code: number) => void },
  ): Promise<unknown> {
    return postKind('liveness', request, body, response)
  }

  @Get('id')
  async readId(
    @Req() request: CookieRequest,
    @Res({ passthrough: true }) response: { status: (code: number) => void },
  ): Promise<unknown> {
    return readKind('id_document', request, response)
  }

  @Post('id')
  async postId(
    @Req() request: CookieRequest,
    @Body() body: unknown,
    @Res({ passthrough: true }) response: { status: (code: number) => void },
  ): Promise<unknown> {
    return postKind('id_document', request, body, response)
  }
}

type CookieRequest = { headers?: { cookie?: string | string[] } }

async function sessionAccountId(request: CookieRequest): Promise<string | null> {
  const sessionId = readCookie(headerText(request.headers?.cookie), SESSION_COOKIE)
  const session = sessionId ? await resolveWebSession(sessionId, authNow()) : null
  return session?.accountId ?? null
}

async function readKind(
  kind: 'liveness' | 'id_document',
  request: CookieRequest,
  response: { status: (code: number) => void },
): Promise<unknown> {
  const accountId = await sessionAccountId(request)
  if (!accountId) {
    throw captureError(unauthenticatedCapture())
  }
  const result = await readCapture({ accountId, kind, store: getCaptureStore() })
  response.status(result.status)
  return result.body
}

async function postKind(
  kind: 'liveness' | 'id_document',
  request: CookieRequest,
  body: unknown,
  response: { status: (code: number) => void },
): Promise<unknown> {
  const accountId = await sessionAccountId(request)
  if (!accountId) {
    throw captureError(unauthenticatedCapture())
  }
  const writer = getEvidenceWriter()
  const result = await submitCapture({
    accountId,
    kind,
    body,
    now: authNow(),
    limit: await readRlVerificationUploadPerHour(),
    evidence: readEvidenceKey(),
    store: getCaptureStore(),
    writeObject: writer ? (key, bytes) => writer.writeObject(key, bytes) : null,
    bucket: writer?.bucket ?? null,
  })
  if (!result.ok) {
    throw captureError(result)
  }
  response.status(result.status)
  return result.body
}

function captureError(result: CaptureFailure): HttpException {
  return new HttpException(
    {
      code: result.code,
      message: result.message,
      details: result.details,
      retryable: result.retryable,
    },
    result.status,
  )
}

function headerText(value: string | string[] | undefined): string | undefined {
  if (typeof value === 'string') {
    return value
  }
  if (Array.isArray(value)) {
    return value[0]
  }
  return undefined
}

function otpError(result: OtpFailure): HttpException {
  return new HttpException(
    {
      code: result.code,
      message: result.message,
      details: result.details,
      retryable: result.retryable,
    },
    result.status,
  )
}
