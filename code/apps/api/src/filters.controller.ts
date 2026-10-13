import { Controller, Get, Header, HttpException, Req, Res } from '@nestjs/common'
import { FILTERS_CATALOGUE } from './filters-catalogue.js'
import { requireLiveSession } from './pin-session.js'
import { assertBrowseViewer } from './public-profile.js'

type CookieRequest = {
  headers?: { cookie?: string | string[] }
}

type HeaderResponse = {
  setHeader(name: string, value: string): void
}

@Controller('filters')
export class FiltersController {
  @Get()
  @Header('Cache-Control', 'no-store')
  async read(@Req() request: CookieRequest, @Res({ passthrough: true }) response: HeaderResponse) {
    response.setHeader('Cache-Control', 'no-store')
    const session = await requireLiveSession(request.headers?.cookie)
    const gate = await assertBrowseViewer(session)
    if (!gate.ok) {
      throw new HttpException(
        {
          code: gate.code,
          message: gate.message,
          details: gate.details,
          retryable: gate.retryable,
        },
        gate.status,
      )
    }
    return FILTERS_CATALOGUE
  }
}
