import { Controller, Get, Header, HttpException, Param, Req, Res } from '@nestjs/common'
import { requireLiveSession, unauthenticated } from './pin-session.js'
import { readPublicProfile } from './public-profile.js'

type CookieRequest = {
  headers?: { cookie?: string | string[] }
}

type HeaderResponse = {
  setHeader(name: string, value: string): void
}

@Controller('profiles')
export class ProfilesController {
  @Get(':id')
  @Header('Cache-Control', 'no-store')
  async read(
    @Param('id') id: string,
    @Req() request: CookieRequest,
    @Res({ passthrough: true }) response: HeaderResponse,
  ) {
    response.setHeader('Cache-Control', 'no-store')
    const session = await requireLiveSession(request.headers?.cookie)
    if (!session) {
      unauthenticated()
    }
    const result = await readPublicProfile(session, id)
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
}
