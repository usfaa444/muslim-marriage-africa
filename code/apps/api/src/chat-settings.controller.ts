import { Body, Controller, Get, Header, HttpException, Put, Req, Res } from '@nestjs/common'
import { readChatSettings, updateChatSettings, type ChatFailure } from './chat-messages.js'
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

/** Story chat-polish: the member's chat settings (« Confirmations de lecture »). Members only; no BillingPort. */
@Controller('chat/settings')
export class ChatSettingsController {
  @Get()
  @Header('Cache-Control', 'no-store')
  async read(@Req() request: CookieRequest, @Res({ passthrough: true }) response: HeaderResponse) {
    response.setHeader('Cache-Control', 'no-store')
    const session = await requireLiveSession(request.headers?.cookie)
    const result = await readChatSettings(session)
    return result.ok ? result.body : refuse(result)
  }

  @Put()
  @Header('Cache-Control', 'no-store')
  async update(@Req() request: CookieRequest, @Body() body: unknown, @Res({ passthrough: true }) response: HeaderResponse) {
    response.setHeader('Cache-Control', 'no-store')
    const session = await requireLiveSession(request.headers?.cookie)
    const result = await updateChatSettings(session, body)
    return result.ok ? result.body : refuse(result)
  }
}
