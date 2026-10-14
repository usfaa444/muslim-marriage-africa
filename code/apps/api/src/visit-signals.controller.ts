import { Controller, Get, Header, HttpException, Req, Res } from '@nestjs/common'
import { requireLiveSession } from './pin-session.js'
import { staffForbidden } from './profile-review.js'
import { listVisitSignals } from './visit-signals.js'

type CookieRequest = {
  headers?: { cookie?: string | string[] }
}

type HeaderResponse = {
  setHeader(name: string, value: string): void
}

const STORE_MESSAGE = 'Les signaux de visite sont indisponibles.'

function staffDenied(): never {
  const error = staffForbidden()
  throw new HttpException(
    {
      code: error.code,
      message: error.message,
      details: error.details,
      retryable: error.retryable,
    },
    error.status,
  )
}

@Controller('staff')
export class VisitSignalsController {
  @Get('signals/visits')
  @Header('Cache-Control', 'no-store')
  async visits(@Req() request: CookieRequest, @Res({ passthrough: true }) response: HeaderResponse) {
    response.setHeader('Cache-Control', 'no-store')
    const session = await requireLiveSession(request.headers?.cookie)
    if (!session.roles.includes('moderator') && !session.roles.includes('operator')) {
      staffDenied()
    }
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
