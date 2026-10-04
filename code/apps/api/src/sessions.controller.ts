import { Body, Controller, HttpCode, HttpException, Post, Req, Res } from '@nestjs/common'
import { authNow } from './auth-clock.js'
import { clientIp, rejectIfAuthRateLimited, type IpRequest } from './auth-guard.js'
import { createWebSession } from './create-session.js'
import { getSessionStore } from './session-store.js'

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
    appendSetCookie(response, result.cookie)
    return result.body
  }
}
