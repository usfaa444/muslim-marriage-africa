import { Body, Controller, Get, Header, HttpCode, HttpException, Param, Post, Query, Req, Res } from '@nestjs/common'
import { acceptInvite, declineInvite, listInvites, readInviteQuota, sendInvite, type InviteFailure } from './invites.js'
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

  /** Recipient only. Opens the conversation through `ChatPort.openFromInvite` (Story 4.5). */
  @Post(':id/accept')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  async accept(
    @Param('id') id: string,
    @Req() request: CookieRequest,
    @Res({ passthrough: true }) response: StatusResponse,
  ) {
    response.setHeader('Cache-Control', 'no-store')
    const session = await requireLiveSession(request.headers?.cookie)
    const result = await acceptInvite(session, id)
    if (!result.ok) {
      raise(result)
    }
    return result.body
  }

  /** Recipient only. Quiet: no conversation, nothing sent to the sender (Story 4.5). */
  @Post(':id/decline')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  async decline(
    @Param('id') id: string,
    @Req() request: CookieRequest,
    @Res({ passthrough: true }) response: StatusResponse,
  ) {
    response.setHeader('Cache-Control', 'no-store')
    const session = await requireLiveSession(request.headers?.cookie)
    const result = await declineInvite(session, id)
    if (!result.ok) {
      raise(result)
    }
    return result.body
  }
}
