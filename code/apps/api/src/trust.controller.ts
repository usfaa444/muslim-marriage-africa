import { Body, Controller, Delete, Get, Header, HttpCode, HttpException, Param, Post, Req, Res } from '@nestjs/common'
import { requireLiveSession } from './pin-session.js'
import { blockMember, listMyBlocks, submitReport, unblockMember, type TrustFailure } from './reports.js'

type CookieRequest = {
  headers?: { cookie?: string | string[] }
}

type StatusResponse = {
  setHeader(name: string, value: string): void
  status(code: number): StatusResponse
}

function raise(result: TrustFailure): never {
  throw new HttpException(
    { code: result.code, message: result.message, details: result.details, retryable: result.retryable },
    result.status,
  )
}

/** Story 8.5. A Member Report opens a moderation case; its SLA clock starts at submit. No BillingPort. */
@Controller('reports')
export class ReportsController {
  @Post()
  @HttpCode(201)
  @Header('Cache-Control', 'no-store')
  async create(@Body() body: unknown, @Req() request: CookieRequest, @Res({ passthrough: true }) response: StatusResponse) {
    response.setHeader('Cache-Control', 'no-store')
    const session = await requireLiveSession(request.headers?.cookie)
    const result = await submitReport(session, body)
    return result.ok ? result.body : raise(result)
  }
}

/** Story 8.6. A Block hides both members from each other and refuses Invites and Chat between them. No BillingPort. */
@Controller('blocks')
export class BlocksController {
  @Post()
  @Header('Cache-Control', 'no-store')
  async create(@Body() body: unknown, @Req() request: CookieRequest, @Res({ passthrough: true }) response: StatusResponse) {
    response.setHeader('Cache-Control', 'no-store')
    const session = await requireLiveSession(request.headers?.cookie)
    const result = await blockMember(session, body)
    if (!result.ok) {
      raise(result)
    }
    response.status(result.status)
    return result.body
  }

  /** Story 8.6 follow-up: the Blocks I placed, pseudonym and blurred photo only. */
  @Get()
  @Header('Cache-Control', 'no-store')
  async list(@Req() request: CookieRequest) {
    const session = await requireLiveSession(request.headers?.cookie)
    const result = await listMyBlocks(session)
    return result.ok ? result.body : raise(result)
  }

  /** Removes my own Block on that member only. 404 when I have none. */
  @Delete(':blockedId')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  async remove(@Param('blockedId') blockedId: string, @Req() request: CookieRequest) {
    const session = await requireLiveSession(request.headers?.cookie)
    const result = await unblockMember(session, blockedId)
    return result.ok ? result.body : raise(result)
  }
}
