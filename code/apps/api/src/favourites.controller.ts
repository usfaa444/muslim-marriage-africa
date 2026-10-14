import { Body, Controller, Delete, Get, Header, HttpException, Param, Post, Req, Res } from '@nestjs/common'
import { createFavourite, readFavourites, removeFavourite } from './favourites.js'
import { requireLiveSession } from './pin-session.js'

type CookieRequest = {
  headers?: { cookie?: string | string[] }
}

type StatusResponse = {
  setHeader(name: string, value: string): void
  status(code: number): StatusResponse
}

function raise(result: {
  status: number
  code: string
  message: string
  details: { reason?: string; field?: string } | null
  retryable: boolean
}): never {
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

@Controller('favourites')
export class FavouritesController {
  @Get()
  @Header('Cache-Control', 'no-store')
  async read(@Req() request: CookieRequest, @Res({ passthrough: true }) response: StatusResponse) {
    response.setHeader('Cache-Control', 'no-store')
    const session = await requireLiveSession(request.headers?.cookie)
    const result = await readFavourites(session)
    if (!result.ok) {
      raise(result)
    }
    return result.body
  }

  @Post()
  @Header('Cache-Control', 'no-store')
  async create(
    @Body() body: unknown,
    @Req() request: CookieRequest,
    @Res({ passthrough: true }) response: StatusResponse,
  ) {
    response.setHeader('Cache-Control', 'no-store')
    const session = await requireLiveSession(request.headers?.cookie)
    const result = await createFavourite(session, body)
    if (!result.ok) {
      raise(result)
    }
    response.status(result.status)
    return result.body
  }

  @Delete(':target_id')
  @Header('Cache-Control', 'no-store')
  async remove(
    @Param('target_id') targetId: string,
    @Req() request: CookieRequest,
    @Res({ passthrough: true }) response: StatusResponse,
  ) {
    response.setHeader('Cache-Control', 'no-store')
    const session = await requireLiveSession(request.headers?.cookie)
    const result = await removeFavourite(session, targetId)
    if (!result.ok) {
      raise(result)
    }
    response.status(200)
    return result.body
  }
}
