import { Body, Controller, HttpCode, HttpException, Post, Req, Res } from '@nestjs/common'
import { authNow } from './auth-clock.js'
import { clientIp, type IpRequest } from './auth-guard.js'
import { getEmailPort } from './email-port.js'
import { readRlPasswordResetPerMin } from './password-reset-limit.js'
import { consumePasswordReset, requestPasswordReset } from './password-reset.js'
import { getPasswordResetStore } from './password-reset-store.js'
import { takePasswordResetSlot } from './password-reset-rate.js'

type CookieResponse = {
  status: (code: number) => void
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
  if (typeof value === 'string') {
    return value
  }
  if (Array.isArray(value)) {
    return value[0]
  }
  return undefined
}

/** Counts this post in the password-reset window, then refuses it past `rl_password_reset_per_min`. */
export async function rejectIfPasswordResetRateLimited(ip: string): Promise<void> {
  const limit = await readRlPasswordResetPerMin()
  if (limit === null) {
    throw new HttpException(
      {
        code: 'UNHANDLED',
        message: 'Request failed',
        details: null,
        retryable: false,
      },
      500,
    )
  }
  if (!takePasswordResetSlot(ip, limit, authNow())) {
    throw new HttpException(
      {
        code: 'RATE_LIMITED',
        message: 'Cadence de requêtes régulée.',
        details: null,
        retryable: false,
      },
      429,
    )
  }
}

@Controller('password-resets')
export class PasswordResetsController {
  @Post()
  @HttpCode(201)
  async request(
    @Req() request: IpRequest & { headers?: { origin?: string | string[] } },
    @Body() body: unknown,
  ): Promise<unknown> {
    await rejectIfPasswordResetRateLimited(clientIp(request))
    const result = await requestPasswordReset({
      body,
      originHeader: headerText(request.headers?.origin),
      now: authNow,
      store: getPasswordResetStore(),
      send: (message) => getEmailPort().send(message),
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
    return {}
  }

  @Post('consume')
  async consume(
    @Body() body: unknown,
    @Res({ passthrough: true }) response: CookieResponse,
  ): Promise<unknown> {
    const result = await consumePasswordReset({
      body,
      now: authNow,
      store: getPasswordResetStore(),
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
    response.status(200)
    appendSetCookie(response, result.cookie)
    return result.body
  }
}
