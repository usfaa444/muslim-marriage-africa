import { Body, Controller, Get, HttpCode, HttpException, Post, Req, Res } from '@nestjs/common'
import { changeAccountEmail } from './change-email.js'
import { precheckAccount } from './account-precheck.js'
import { authNow } from './auth-clock.js'
import { getAccountStore } from './account-store.js'
import { clientIp, rejectIfAuthRateLimited, type IpRequest } from './auth-guard.js'
import { createMemberAccount, publicAccount } from './create-account.js'
import { createWebSession, resolveWebSession } from './create-session.js'
import { recaptchaPasses } from './recaptcha.js'
import { readSignupStep } from './signup-gate.js'
import { notePinUnlocked } from './pin-lock-state.js'
import { getSessionStore } from './session-store.js'
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
  @Post('precheck')
  @HttpCode(200)
  async precheck(@Req() request: IpRequest, @Body() body: unknown): Promise<unknown> {
    await rejectIfAuthRateLimited(clientIp(request))
    const result = await precheckAccount(body, { store: getAccountStore(), today: authNow() })
    if (!result.ok) {
      throw new HttpException(
        {
          code: result.code,
          message: result.message,
          details: result.details,
          retryable: result.retryable,
        },
        result.status,
      )
    }
    return result.body
  }

  @Get('gate')
  async gate(@Req() request: IpRequest & { headers?: { cookie?: string | string[] } }): Promise<{ step: string }> {
    const sessionId = readCookie(headerText(request.headers?.cookie), SESSION_COOKIE)
    const session = sessionId ? await resolveWebSession(sessionId, authNow()) : null
    if (!session) {
      throw new HttpException(
        {
          code: 'UNAUTHENTICATED',
          message: 'Authentification requise.',
          details: null,
          retryable: false,
        },
        401,
      )
    }
    return { step: await readSignupStep(session.accountId) }
  }

  @Post()
  @HttpCode(201)
  async create(
    @Req() request: IpRequest,
    @Res({ passthrough: true }) response: HeaderResponse,
    @Body() body: unknown,
  ): Promise<unknown> {
    await rejectIfAuthRateLimited(clientIp(request))
    const token = isRecord(body) ? body.recaptcha_token : undefined
    if (!(await recaptchaPasses(token, clientIp(request)))) {
      throw captchaFailed()
    }
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
          retryable: result.retryable,
        },
        result.status,
      )
    }
    try {
      const opened = await createWebSession(
        {
          identifier: result.account.email,
          password: isRecord(body) && typeof body.password === 'string' ? body.password : '',
          remember_me: false,
        },
        { store: getSessionStore(), now: authNow() },
      )
      if (opened.ok) {
        notePinUnlocked(opened.session.id, authNow())
        appendSetCookie(response, opened.cookie)
      }
    } catch {
      // The account row is already stored. Sign-in can open the session.
    }
    return publicAccount(result.account)
  }

  @Post('email')
  @HttpCode(200)
  async changeEmail(
    @Req() request: IpRequest & { headers?: { cookie?: string | string[]; origin?: string | string[] } },
    @Res({ passthrough: true }) response: HeaderResponse,
    @Body() body: unknown,
  ): Promise<unknown> {
    await rejectIfAuthRateLimited(clientIp(request))
    const sessionId = readCookie(headerText(request.headers?.cookie), SESSION_COOKIE)
    const session = sessionId ? await resolveWebSession(sessionId, authNow()) : null
    if (!session) {
      throw issueError(unauthenticatedIssue())
    }
    const result = await changeAccountEmail({
      accountId: session.accountId,
      body,
      origin: publicOrigin(headerText(request.headers?.origin)),
      now: authNow,
      store: getEmailVerificationStore(),
      emailTaken: (email) => getAccountStore().emailTaken(email),
      send: (message) => getEmailPort().send(message),
    })
    applyEmailHeader(response, result.email)
    if (!result.ok) {
      throw new HttpException(
        {
          code: result.code,
          message: result.message,
          details: result.details,
          retryable: result.retryable,
        },
        result.status,
      )
    }
    return { email: result.email, expires_at: result.expires_at }
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
  appendHeader?: (name: string, value: string) => void
}

function appendSetCookie(response: HeaderResponse, value: string): void {
  if (typeof response.appendHeader === 'function') {
    response.appendHeader('Set-Cookie', value)
    return
  }
  response.setHeader('Set-Cookie', value)
}

function captchaFailed(): HttpException {
  return new HttpException(
    {
      code: 'CAPTCHA_FAILED',
      message: 'Échec de validation de la vérification humaine.',
      details: { field: 'recaptcha_token' },
      retryable: false,
    },
    400,
  )
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
