import { Body, Controller, Get, Header, HttpCode, HttpException, Post, Req, Res } from '@nestjs/common'
import { authNow } from './auth-clock.js'
import { clientIp, rejectIfAuthRateLimited, type IpRequest } from './auth-guard.js'
import { recaptchaPasses } from './recaptcha.js'
import { getSessionStore } from './session-store.js'
import { readCookie, SESSION_COOKIE } from './session-cookie.js'
import {
  changeStaffPassword,
  loadStaffSession,
  readEnrollment,
  signInStaff,
  staffException,
  staffSessionBody,
  staffSignInBodyReady,
  STAFF_AUTH_MESSAGE,
  STAFF_FORBIDDEN_MESSAGE,
  verifyStaffCode,
} from './staff-session.js'
import type { StaffSessionView } from './staff-store.js'

type CookieRequest = IpRequest & {
  headers?: { cookie?: string | string[] }
}

type CookieResponse = {
  appendHeader?: (name: string, value: string) => void
  setHeader: (name: string, value: string) => void
}

function appendSetCookie(response: CookieResponse, value: string): void {
  if (typeof response.appendHeader === 'function') {
    response.appendHeader('Set-Cookie', value)
    return
  }
  response.setHeader('Set-Cookie', value)
}

function headerText(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value.join('; ') : value
}

/** The staff session behind this cookie at any MFA step. A live member session is 403, no session is 401. */
async function anyStaffSession(request: CookieRequest): Promise<StaffSessionView> {
  const staff = await loadStaffSession(request.headers?.cookie)
  if (staff) {
    return staff
  }
  const id = readCookie(headerText(request.headers?.cookie), SESSION_COOKIE)
  const member = id ? await getSessionStore().get(id) : null
  if (member && member.expires_at.getTime() > authNow().getTime()) {
    throw new HttpException(
      { code: 'FORBIDDEN', message: STAFF_FORBIDDEN_MESSAGE, details: null, retryable: false },
      403,
    )
  }
  throw new HttpException(
    { code: 'UNAUTHENTICATED', message: STAFF_AUTH_MESSAGE, details: null, retryable: false },
    401,
  )
}

/** Staff sign-in (Story 12.1). No route here creates a staff account or grants a role. */
@Controller('staff/sessions')
export class StaffSessionsController {
  @Post()
  @HttpCode(201)
  @Header('Cache-Control', 'no-store')
  async create(
    @Req() request: CookieRequest,
    @Res({ passthrough: true }) response: CookieResponse,
    @Body() body: unknown,
  ): Promise<unknown> {
    await rejectIfAuthRateLimited(clientIp(request))
    if (staffSignInBodyReady(body)) {
      const token =
        typeof body === 'object' && body !== null ? (body as { recaptcha_token?: unknown }).recaptcha_token : undefined
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
    const result = await signInStaff(body)
    if (!result.ok) {
      throw staffException(result)
    }
    appendSetCookie(response, result.cookie)
    return result.body
  }

  @Get('current')
  @Header('Cache-Control', 'no-store')
  async current(@Req() request: CookieRequest): Promise<unknown> {
    return staffSessionBody(await anyStaffSession(request))
  }

  @Post('password')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  async password(@Req() request: CookieRequest, @Body() body: unknown): Promise<unknown> {
    await rejectIfAuthRateLimited(clientIp(request))
    const result = await changeStaffPassword(await anyStaffSession(request), body)
    if (!result.ok) {
      throw staffException(result)
    }
    return result.body
  }

  @Get('enrollment')
  @Header('Cache-Control', 'no-store')
  async enrollment(@Req() request: CookieRequest): Promise<unknown> {
    const result = await readEnrollment(await anyStaffSession(request))
    if (!result.ok) {
      throw staffException(result)
    }
    return result.body
  }

  @Post('mfa')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  async mfa(
    @Req() request: CookieRequest,
    @Res({ passthrough: true }) response: CookieResponse,
    @Body() body: unknown,
  ): Promise<unknown> {
    await rejectIfAuthRateLimited(clientIp(request))
    const result = await verifyStaffCode(await anyStaffSession(request), body)
    if (!result.ok) {
      throw staffException(result)
    }
    appendSetCookie(response, result.cookie)
    return result.body
  }
}
