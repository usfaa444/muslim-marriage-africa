import { Controller, Get, Header, HttpException, Req, Res } from '@nestjs/common'
import { readBadges } from './nav-badges.js'
import { requireLiveSession } from './pin-session.js'

type CookieRequest = {
  headers?: { cookie?: string | string[] }
}

type HeaderResponse = {
  setHeader(name: string, value: string): void
}

/** Story chat-polish: the bottom-nav badges (« Invitations », « Discussions »). Members only; no BillingPort. */
@Controller('me/badges')
export class NavBadgesController {
  @Get()
  @Header('Cache-Control', 'no-store')
  async read(@Req() request: CookieRequest, @Res({ passthrough: true }) response: HeaderResponse) {
    response.setHeader('Cache-Control', 'no-store')
    const session = await requireLiveSession(request.headers?.cookie)
    const result = await readBadges(session)
    if (result.ok) {
      return result.body
    }
    throw new HttpException({ code: result.code, message: result.message, details: result.details, retryable: false }, result.status)
  }
}
