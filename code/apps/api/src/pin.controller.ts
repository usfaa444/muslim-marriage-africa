import { Body, Controller, Get, HttpCode, HttpException, Post, Put, Req, Res } from '@nestjs/common'
import { newId } from '@ankanu/kernel'
import { authNow } from './auth-clock.js'
import { clientIp, rejectIfAuthRateLimited, type IpRequest } from './auth-guard.js'
import { hashPassword, verifyPassword } from './password-hash.js'
import { getPinLockStore } from './pin-lock-store.js'
import { notePinLocked, notePinUnlocked, readPinEntry } from './pin-lock-state.js'
import {
  endWebSession,
  PIN_INVALID_MESSAGE,
  PIN_LOCKED_MESSAGE,
  readPin,
  requireLiveSession,
  stampSeen,
  lockThisSession,
} from './pin-session.js'
import { clearSessionCookieHeader } from './session-cookie.js'

type CookieRequest = IpRequest & {
  headers?: { cookie?: string | string[] }
}

type CookieResponse = {
  appendHeader?: (name: string, value: string) => void
  setHeader: (name: string, value: string) => void
}

function appendSetCookie(response: CookieResponse, value: string): void {
  if (typeof response.appendHeader === 'function') {
    response.appendHeader('Set-Cookie', value)
    return
  }
  response.setHeader('Set-Cookie', value)
}

@Controller('pin')
export class PinController {
  @Get()
  async read(@Req() request: CookieRequest): Promise<{ enabled: boolean; locked: boolean }> {
    const session = await requireLiveSession(request.headers?.cookie)
    const row = await getPinLockStore().findByAccount(session.account_id)
    const enabled = row !== null
    const entry = readPinEntry(session.id)
    return { enabled, locked: enabled && entry?.unlocked !== true }
  }

  @Put()
  async save(@Req() request: CookieRequest, @Body() body: unknown): Promise<{ enabled: true }> {
    const session = await requireLiveSession(request.headers?.cookie)
    const pin = readPin(body)
    await getPinLockStore().save(session.account_id, await hashPassword(pin), newId(authNow()))
    notePinUnlocked(session.id)
    return { enabled: true }
  }

  @Post('lock')
  @HttpCode(200)
  async lock(@Req() request: CookieRequest): Promise<{ locked: boolean }> {
    await rejectIfAuthRateLimited(clientIp(request))
    const session = await requireLiveSession(request.headers?.cookie)
    const row = await getPinLockStore().findByAccount(session.account_id)
    if (!row) {
      return { locked: false }
    }
    lockThisSession(session.id)
    return { locked: true }
  }

  @Post('unlock')
  @HttpCode(200)
  async unlock(
    @Req() request: CookieRequest,
    @Res({ passthrough: true }) response: CookieResponse,
    @Body() body: unknown,
  ): Promise<{ locked: false }> {
    await rejectIfAuthRateLimited(clientIp(request))
    const session = await requireLiveSession(request.headers?.cookie)
    const pin = readPin(body)
    const row = await getPinLockStore().findByAccount(session.account_id)
    if (!row) {
      return { locked: false }
    }
    if (await verifyPassword(row.pin_hash, pin)) {
      notePinUnlocked(session.id)
      const cookie = await stampSeen(session)
      if (cookie) {
        appendSetCookie(response, cookie)
      }
      return { locked: false }
    }
    const fails = (readPinEntry(session.id)?.fails ?? 0) + 1
    if (fails >= 5) {
      await endWebSession(session.id)
      appendSetCookie(response, clearSessionCookieHeader())
      throw new HttpException(
        {
          code: 'PIN_LOCKED',
          message: PIN_LOCKED_MESSAGE,
          details: null,
          retryable: false,
        },
        401,
      )
    }
    notePinLocked(session.id, fails)
    throw new HttpException(
      {
        code: 'PIN_INVALID',
        message: PIN_INVALID_MESSAGE,
        details: { attempts_left: 5 - fails },
        retryable: false,
      },
      400,
    )
  }
}
