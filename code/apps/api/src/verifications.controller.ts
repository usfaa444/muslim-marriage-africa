import { Body, Controller, HttpException, Post, Req, Res } from '@nestjs/common'
import { authNow } from './auth-clock.js'
import { resolveWebSession } from './create-session.js'
import { readRlOtpPerHour } from './otp-limit.js'
import { submitPhoneOtp, unauthenticatedOtp, type OtpFailure } from './phone-otp.js'
import { getPhoneOtpStore } from './phone-otp-store.js'
import { readCookie, SESSION_COOKIE } from './session-cookie.js'
import { getSmsPort } from './sms-port.js'

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
