import { Body, Controller, Get, Header, HttpException, Post, Query, Req, Res } from '@nestjs/common'
import { readBrowseGrid } from './browse-grid.js'
import { passBrowse } from './discovery-exclusion.js'
import { requireLiveSession } from './pin-session.js'

type CookieRequest = {
  headers?: { cookie?: string | string[] }
}

type HeaderResponse = {
  setHeader(name: string, value: string): void
  status(code: number): HeaderResponse
}

@Controller('browse')
export class BrowseController {
  @Get()
  @Header('Cache-Control', 'no-store')
  async read(
    @Query() query: Record<string, unknown>,
    @Req() request: CookieRequest,
    @Res({ passthrough: true }) response: HeaderResponse,
  ) {
    response.setHeader('Cache-Control', 'no-store')
    const session = await requireLiveSession(request.headers?.cookie)
    const result = await readBrowseGrid(session, query)
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

  @Post('pass')
  @Header('Cache-Control', 'no-store')
  async pass(
    @Body() body: unknown,
    @Req() request: CookieRequest,
    @Res({ passthrough: true }) response: HeaderResponse,
  ) {
    response.setHeader('Cache-Control', 'no-store')
    const session = await requireLiveSession(request.headers?.cookie)
    const result = await passBrowse(session, body)
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
    response.status(result.status)
    return result.body
  }
}
