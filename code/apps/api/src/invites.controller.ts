import { Body, Controller, Get, Header, HttpException, Post, Query, Req, Res } from '@nestjs/common'
import { listInvites, readInviteQuota, sendInvite, type InviteFailure } from './invites.js'
import { requireLiveSession } from './pin-session.js'

type CookieRequest = {
  headers?: { cookie?: string | string[] }
}

type StatusResponse = {
  setHeader(name: string, value: string): void
  status(code: number): StatusResponse
}

function raise(result: InviteFailure): never {
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

@Controller('invites')
export class InvitesController {
  @Get()
  @Header('Cache-Control', 'no-store')
  async list(
    @Query('box') box: unknown,
    @Req() request: CookieRequest,
    @Res({ passthrough: true }) response: StatusResponse,
  ) {
    response.setHeader('Cache-Control', 'no-store')
    const session = await requireLiveSession(request.headers?.cookie)
    const result = await listInvites(session, box)
    if (!result.ok) {
      raise(result)
    }
    return result.body
  }

  @Get('quota')
  @Header('Cache-Control', 'no-store')
  async quota(@Req() request: CookieRequest, @Res({ passthrough: true }) response: StatusResponse) {
    response.setHeader('Cache-Control', 'no-store')
    const session = await requireLiveSession(request.headers?.cookie)
    const result = await readInviteQuota(session)
    if (!result.ok) {
      raise(result)
    }
    return result.body
  }

  @Post()
  @Header('Cache-Control', 'no-store')
  async send(
    @Body() body: unknown,
    @Req() request: CookieRequest,
    @Res({ passthrough: true }) response: StatusResponse,
  ) {
    response.setHeader('Cache-Control', 'no-store')
    const session = await requireLiveSession(request.headers?.cookie)
    const result = await sendInvite(session, body)
    if (!result.ok) {
      raise(result)
    }
    response.status(result.status)
    return result.body
  }
}
