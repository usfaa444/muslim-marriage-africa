import { Body, Controller, Get, HttpCode, HttpException, Post, Req, Res } from '@nestjs/common'
import {
  acceptDeleteBody,
  acceptExportBody,
  CONFIRM_MESSAGE,
  EXPORT_BODY_MESSAGE,
  EXPORT_FAILED_MESSAGE,
  EXPORT_NOT_READY_MESSAGE,
  ExportNotReadyError,
  getRightsStore,
  type ExportFile,
  type TicketView,
} from './cil-rights.js'
import { PENDING_DELETION_STATUS } from './create-account.js'
import { NON_MEMBER_PAUSE_MESSAGE, type AccountStatus } from './life-pause.js'
import { requireLiveSession, unauthenticated } from './pin-session.js'

type CookieRequest = {
  headers?: { cookie?: string | string[] }
}

type HeaderResponse = {
  setHeader: (name: string, value: string) => void
}

function httpError(status: number, code: string, message: string, details: unknown, retryable: boolean): never {
  throw new HttpException({ code, message, details, retryable }, status)
}

async function memberAccount(request: CookieRequest): Promise<string> {
  const session = await requireLiveSession(request.headers?.cookie)
  if (!session.roles.includes('member')) {
    httpError(403, 'FORBIDDEN', NON_MEMBER_PAUSE_MESSAGE, null, false)
  }
  return session.account_id
}

@Controller('me')
export class CilController {
  @Post('delete')
  @HttpCode(200)
  async delete(
    @Req() request: CookieRequest,
    @Body() body: unknown,
  ): Promise<{ account_status: typeof PENDING_DELETION_STATUS; ticket: TicketView }> {
    const accountId = await memberAccount(request)
    if (!acceptDeleteBody(body)) {
      httpError(400, 'UNHANDLED', CONFIRM_MESSAGE, { field: 'confirm' }, false)
    }
    const result = await getRightsStore().deleteAccount(accountId)
    if (!result.ok) {
      unauthenticated()
    }
    return { account_status: result.account_status, ticket: result.ticket }
  }

  @Post('export')
  @HttpCode(200)
  async openExport(@Req() request: CookieRequest, @Body() body: unknown): Promise<{ ticket: TicketView }> {
    const accountId = await memberAccount(request)
    if (!acceptExportBody(body)) {
      httpError(400, 'UNHANDLED', EXPORT_BODY_MESSAGE, null, false)
    }
    const result = await getRightsStore().openExport(accountId)
    if (!result.ok && result.reason === 'missing') {
      unauthenticated()
    }
    if (!result.ok) {
      httpError(403, 'FORBIDDEN', NON_MEMBER_PAUSE_MESSAGE, null, false)
    }
    return { ticket: result.ticket }
  }

  @Get('export')
  @HttpCode(200)
  async download(
    @Req() request: CookieRequest,
    @Res({ passthrough: true }) response: HeaderResponse,
  ): Promise<ExportFile> {
    const accountId = await memberAccount(request)
    try {
      const file = await getRightsStore().exportAccount(accountId)
      response.setHeader('Content-Disposition', `attachment; filename="ankanu-export-${file.ticket_id}.json"`)
      response.setHeader('Cache-Control', 'no-store')
      return file
    } catch (error) {
      if (error instanceof ExportNotReadyError) {
        httpError(409, 'EXPORT_NOT_READY', EXPORT_NOT_READY_MESSAGE, null, false)
      }
      await getRightsStore().stallReadyExport(accountId)
      httpError(503, 'EXPORT_FAILED', EXPORT_FAILED_MESSAGE, null, false)
    }
  }

  @Get('export-status')
  async status(
    @Req() request: CookieRequest,
  ): Promise<{ account_status: AccountStatus; tickets: TicketView[] }> {
    const accountId = await memberAccount(request)
    const result = await getRightsStore().exportStatus(accountId)
    if (!result.ok) {
      unauthenticated()
    }
    return { account_status: result.account_status, tickets: result.tickets }
  }
}
