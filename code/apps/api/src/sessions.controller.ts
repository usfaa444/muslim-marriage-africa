import { Body, Controller, Delete, HttpCode, HttpException, Post, Req, Res } from '@nestjs/common'
import { authNow } from './auth-clock.js'
import { clientIp, rejectIfAuthRateLimited, type IpRequest } from './auth-guard.js'
import { createWebSession } from './create-session.js'
import { recaptchaPasses } from './recaptcha.js'
import { notePinUnlocked } from './pin-lock-state.js'
import { endWebSession } from './pin-session.js'
import { clearSessionCookieHeader, readCookie, SESSION_COOKIE } from './session-cookie.js'
import { getSessionStore } from './session-store.js'

type CookieRequest = IpRequest & {
  headers?: { cookie?: string | string[] }
}

type CookieResponse = {
  appendHeader?: (name: string, value: string) => void
  setHeader: (name: string, value: string) => void
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function sessionBodyReady(body: unknown): boolean {
  if (!isRecord(body)) {
    return false
  }
  return (
    typeof body.identifier === 'string' &&
    body.identifier.trim().length > 0 &&
    typeof body.password === 'string' &&
    body.password.length > 0 &&
    typeof body.remember_me === 'boolean'
  )
}

function appendSetCookie(response: CookieResponse, value: string): void {
  if (typeof response.appendHeader === 'function') {
    response.appendHeader('Set-Cookie', value)
    return
  }
  response.setHeader('Set-Cookie', value)
}

@Controller('sessions')
export class SessionsController {
  @Post()
  @HttpCode(201)
  async create(
    @Req() request: IpRequest,
    @Res({ passthrough: true }) response: CookieResponse,
    @Body() body: unknown,
  ): Promise<unknown> {
    await rejectIfAuthRateLimited(clientIp(request))
    if (sessionBodyReady(body)) {
      const token = isRecord(body) ? body.recaptcha_token : undefined
      if (!(await recaptchaPasses(token, clientIp(request)))) {
        throw new HttpException(
          {
            code: 'CAPTCHA_FAILED',
            message: 'Échec de validation de la vérification humaine.',
            details: { field: 'recaptcha_token' },
            retryable: false,
          },
          400,
        )
      }
    }
    const result = await createWebSession(body, {
      store: getSessionStore(),
      now: authNow(),
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
    notePinUnlocked(result.session.id, authNow())
    appendSetCookie(response, result.cookie)
    return result.body
  }

  @Delete('current')
  @HttpCode(204)
  async destroy(
    @Req() request: CookieRequest,
    @Res({ passthrough: true }) response: CookieResponse,
  ): Promise<void> {
    const header = request.headers?.cookie
    const sessionId = Array.isArray(header) ? header.join('; ') : header
    const id = readCookie(sessionId, SESSION_COOKIE)
    if (id) {
      await endWebSession(id)
    }
    appendSetCookie(response, clearSessionCookieHeader())
  }
}
