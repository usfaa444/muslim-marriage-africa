import { Body, Controller, Get, HttpCode, HttpException, Post, Req } from '@nestjs/common'
import { ACTIVE_STATUS, DEACTIVATED_STATUS } from './create-account.js'
import {
  acceptDeactivateBody,
  HELD_PAUSE_MESSAGE,
  NON_MEMBER_PAUSE_MESSAGE,
  type AccountStatus,
} from './life-pause.js'
import { getLifePauseStore, readAccountStatus } from './life-pause-store.js'
import { requireLiveSession, unauthenticated } from './pin-session.js'

type CookieRequest = {
  headers?: { cookie?: string | string[] }
}

function forbid(message: string, details: { status: 'held' } | null): never {
  throw new HttpException(
    {
      code: 'FORBIDDEN',
      message,
      details,
      retryable: false,
    },
    403,
  )
}

function rejectField(field: 'reason' | 'note', message: string): never {
  throw new HttpException(
    {
      code: 'UNHANDLED',
      message,
      details: { field },
      retryable: false,
    },
    400,
  )
}

async function memberAccount(request: CookieRequest): Promise<string> {
  const session = await requireLiveSession(request.headers?.cookie)
  if (!session.roles.includes('member')) {
    forbid(NON_MEMBER_PAUSE_MESSAGE, null)
  }
  return session.account_id
}

async function currentStatus(accountId: string): Promise<AccountStatus> {
  const status = await readAccountStatus(accountId)
  if (!status) {
    unauthenticated()
  }
  return status
}

@Controller('me')
export class MeController {
  @Get('deactivate')
  async read(@Req() request: CookieRequest): Promise<{ status: AccountStatus }> {
    const accountId = await memberAccount(request)
    return { status: await currentStatus(accountId) }
  }

  @Post('deactivate')
  @HttpCode(200)
  async deactivate(@Req() request: CookieRequest, @Body() body: unknown): Promise<{ status: typeof DEACTIVATED_STATUS }> {
    const accountId = await memberAccount(request)
    const rejected = acceptDeactivateBody(body)
    if (rejected) {
      rejectField(rejected.field, rejected.message)
    }
    const written = await getLifePauseStore().setDeactivated(accountId)
    if (written === 'held') {
      forbid(HELD_PAUSE_MESSAGE, { status: 'held' })
    }
    if (written === 'missing') {
      unauthenticated()
    }
    return { status: DEACTIVATED_STATUS }
  }

  @Post('reactivate')
  @HttpCode(200)
  async reactivate(@Req() request: CookieRequest): Promise<{ status: typeof ACTIVE_STATUS }> {
    const accountId = await memberAccount(request)
    const written = await getLifePauseStore().setActive(accountId)
    if (written === 'held') {
      forbid(HELD_PAUSE_MESSAGE, { status: 'held' })
    }
    if (written === 'missing') {
      unauthenticated()
    }
    return { status: ACTIVE_STATUS }
  }
}
