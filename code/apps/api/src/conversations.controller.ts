import { Body, Controller, Get, Header, HttpCode, HttpException, Param, Post, Query, Req, Res } from '@nestjs/common'
import { listConversations, listMessages, readConversation, sendText, type ChatFailure } from './chat-messages.js'
import { requireLiveSession } from './pin-session.js'

type CookieRequest = {
  headers?: { cookie?: string | string[] }
}

type HeaderResponse = {
  setHeader(name: string, value: string): void
}

function refuse(result: ChatFailure): never {
  throw new HttpException(
    { code: result.code, message: result.message, details: result.details, retryable: result.retryable },
    result.status,
  )
}

/** Chat (Stories 4.5, 5.1, 5.2). Participants only; no BillingPort on any route. */
@Controller('conversations')
export class ConversationsController {
  @Get()
  @Header('Cache-Control', 'no-store')
  async list(@Req() request: CookieRequest, @Res({ passthrough: true }) response: HeaderResponse) {
    response.setHeader('Cache-Control', 'no-store')
    const session = await requireLiveSession(request.headers?.cookie)
    const result = await listConversations(session)
    return result.ok ? result.body : refuse(result)
  }

  @Get(':id')
  @Header('Cache-Control', 'no-store')
  async read(@Req() request: CookieRequest, @Param('id') id: string, @Res({ passthrough: true }) response: HeaderResponse) {
    response.setHeader('Cache-Control', 'no-store')
    const session = await requireLiveSession(request.headers?.cookie)
    const result = await readConversation(session, id)
    return result.ok ? result.body : refuse(result)
  }

  @Get(':id/messages')
  @Header('Cache-Control', 'no-store')
  async messages(
    @Req() request: CookieRequest,
    @Param('id') id: string,
    @Query() query: { limit?: unknown; before?: unknown; after?: unknown },
    @Res({ passthrough: true }) response: HeaderResponse,
  ) {
    response.setHeader('Cache-Control', 'no-store')
    const session = await requireLiveSession(request.headers?.cookie)
    const result = await listMessages(session, id, query ?? {})
    return result.ok ? result.body : refuse(result)
  }

  @Post(':id/messages')
  @HttpCode(201)
  @Header('Cache-Control', 'no-store')
  async send(
    @Req() request: CookieRequest,
    @Param('id') id: string,
    @Body() body: unknown,
    @Res({ passthrough: true }) response: HeaderResponse,
  ) {
    response.setHeader('Cache-Control', 'no-store')
    const session = await requireLiveSession(request.headers?.cookie)
    const result = await sendText(session, id, body)
    return result.ok ? result.body : refuse(result)
  }
}
