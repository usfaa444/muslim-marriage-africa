import { Body, Controller, HttpCode, HttpException, Post, Req, Res } from '@nestjs/common'
import { authNow } from './auth-clock.js'
import { getAccountStore } from './account-store.js'
import { clientIp, rejectIfAuthRateLimited, type IpRequest } from './auth-guard.js'
import { createMemberAccount } from './create-account.js'
import { resolveWebSession } from './create-session.js'
import { getEmailPort } from './email-port.js'
import {
  consumeEmailVerification,
  issueEmailVerification,
  publicOrigin,
  unauthenticatedIssue,
} from './email-verification.js'
import { getEmailVerificationStore } from './email-verification-store.js'
import { hashPassword } from './password-hash.js'
import { readCookie, SESSION_COOKIE } from './session-cookie.js'

@Controller('accounts')
export class AccountsController {
  @Post()
  @HttpCode(201)
  async create(@Req() request: IpRequest, @Body() body: unknown): Promise<unknown> {
    await rejectIfAuthRateLimited(clientIp(request))
    const result = await createMemberAccount(body, {
      store: getAccountStore(),
      hashPassword,
    })
    if (!result.ok) {
      throw new HttpException(
        {
          code: result.code,
          message: result.message,
          details: result.details,
          retryable: false,
        },
        result.status,
      )
    }
    return result.account
  }

  @Post('email-verifications')
  async issue(
    @Req() request: IpRequest & { headers?: { cookie?: string | string[]; origin?: string | string[] } },
    @Res({ passthrough: true }) response: HeaderResponse,
  ): Promise<unknown> {
    const sessionId = readCookie(headerText(request.headers?.cookie), SESSION_COOKIE)
    const session = sessionId ? await resolveWebSession(sessionId, authNow()) : null
    if (!session) {
      throw issueError(unauthenticatedIssue())
    }
    const result = await issueEmailVerification({
      accountId: session.accountId,
      origin: publicOrigin(headerText(request.headers?.origin)),
      now: authNow,
      store: getEmailVerificationStore(),
      send: (message) => getEmailPort().send(message),
    })
    applyEmailHeader(response, result.email)
    if (!result.ok) {
      throw issueError(result)
    }
    response.status(result.status)
    if (result.status === 201) {
      return { expires_at: result.expires_at }
    }
    return {}
  }

  @Post('email-verifications/consume')
  async consume(
    @Body() body: unknown,
    @Res({ passthrough: true }) response: HeaderResponse,
  ): Promise<unknown> {
    const token = isRecord(body) ? body.token : undefined
    const result = await consumeEmailVerification({
      token,
      now: authNow,
      store: getEmailVerificationStore(),
    })
    applyEmailHeader(response, result.email)
    if (!result.ok) {
      throw issueError(result)
    }
    response.status(200)
    return { email_verified_at: result.email_verified_at }
  }
}

type HeaderResponse = {
  status: (code: number) => void
  setHeader: (name: string, value: string) => void
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
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

function applyEmailHeader(response: HeaderResponse, email: string | null): void {
  if (!email) {
    return
  }
  response.setHeader('x-account-email', encodeURIComponent(email))
}

function issueError(result: { status: number; code: string; message: string; retryable: boolean }): HttpException {
  return new HttpException(
    {
      code: result.code,
      message: result.message,
      details: null,
      retryable: result.retryable,
    },
    result.status,
  )
}
