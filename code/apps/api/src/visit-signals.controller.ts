import { Controller, Get, Header, HttpException, Req, Res } from '@nestjs/common'
import { requireStaffSession } from './staff-session.js'
import { listVisitSignals } from './visit-signals.js'

type CookieRequest = {
  headers?: { cookie?: string | string[] }
}

type HeaderResponse = {
  setHeader(name: string, value: string): void
}

const STORE_MESSAGE = 'Les signaux de visite sont indisponibles.'

@Controller('staff')
export class VisitSignalsController {
  @Get('signals/visits')
  @Header('Cache-Control', 'no-store')
  async visits(@Req() request: CookieRequest, @Res({ passthrough: true }) response: HeaderResponse) {
    response.setHeader('Cache-Control', 'no-store')
    await requireStaffSession(request.headers?.cookie)
    try {
      return await listVisitSignals()
    } catch (error) {
      if (error instanceof HttpException) {
        throw error
      }
      throw new HttpException(
        {
          code: 'UNHANDLED',
          message: STORE_MESSAGE,
          details: null,
          retryable: true,
        },
        500,
      )
    }
  }
}
