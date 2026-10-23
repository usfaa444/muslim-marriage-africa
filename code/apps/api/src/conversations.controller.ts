import { Controller, Get, Header, HttpException, Req, Res } from '@nestjs/common'
import { listConversations } from './chat.js'
import { requireLiveSession } from './pin-session.js'

type CookieRequest = {
  headers?: { cookie?: string | string[] }
}

type HeaderResponse = {
  setHeader(name: string, value: string): void
}

/** Read only until Epic 5: the member's conversations, each opened by `ChatPort.openFromInvite`. */
@Controller('conversations')
export class ConversationsController {
  @Get()
  @Header('Cache-Control', 'no-store')
  async list(@Req() request: CookieRequest, @Res({ passthrough: true }) response: HeaderResponse) {
    response.setHeader('Cache-Control', 'no-store')
    const session = await requireLiveSession(request.headers?.cookie)
    const result = await listConversations(session)
    if (!result.ok) {
      throw new HttpException(
        { code: result.code, message: result.message, details: result.details, retryable: result.retryable },
        result.status,
      )
    }
    return result.body
  }
}
