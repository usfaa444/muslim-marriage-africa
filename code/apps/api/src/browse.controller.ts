import { Controller, Get, Header, HttpException, Query, Req, Res } from '@nestjs/common'
import { readBrowseGrid } from './browse-grid.js'
import { requireLiveSession } from './pin-session.js'

type CookieRequest = {
  headers?: { cookie?: string | string[] }
}

type HeaderResponse = {
  setHeader(name: string, value: string): void
}

@Controller('browse')
export class BrowseController {
  @Get()
  @Header('Cache-Control', 'no-store')
  async read(
    @Query('view') view: unknown,
    @Query('cursor') cursor: unknown,
    @Req() request: CookieRequest,
    @Res({ passthrough: true }) response: HeaderResponse,
  ) {
    response.setHeader('Cache-Control', 'no-store')
    const session = await requireLiveSession(request.headers?.cookie)
    const result = await readBrowseGrid(session, view, cursor)
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
