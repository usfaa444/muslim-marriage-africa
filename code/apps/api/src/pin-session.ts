import { HttpException } from '@nestjs/common'
import { authNow } from './auth-clock.js'
import { rejectIfAuthRateLimited } from './auth-guard.js'
import { isSlidingRememberMe } from './create-session.js'
import { getPinLockStore } from './pin-lock-store.js'
import { forgetPinEntry, notePinLocked, readPinEntry } from './pin-lock-state.js'
import {
  FOURTEEN_DAYS_MS,
  readCookie,
  rememberMeMaxAge,
  SESSION_COOKIE,
  sessionCookieHeader,
} from './session-cookie.js'
import { getSessionStore, type ResolvedSession } from './session-store.js'

export const PIN_PATTERN = /^[0-9]{4}$/
export const PIN_IDLE_MS = 15 * 60 * 1000
export const PIN_INVALID_MESSAGE = 'Code incorrect.'
export const PIN_LOCKED_MESSAGE = 'Session verrouillée.'
export const PIN_REQUIRED_MESSAGE = 'Code PIN requis.'
const AUTH_MESSAGE = 'Authentification requise.'
const PIN_FIELD_MESSAGE = 'pin : quatre chiffres sont requis.'

const EXEMPT = new Set([
  'GET /v1/pin',
  'POST /v1/pin/lock',
  'POST /v1/pin/unlock',
  'DELETE /v1/sessions/current',
  'POST /v1/sessions',
])

export type PinGateResult = { stop: true } | { stop: false; cookie: string | null }

export function unauthenticated(): never {
  throw new HttpException(
    {
      code: 'UNAUTHENTICATED',
      message: AUTH_MESSAGE,
      details: null,
      retryable: false,
    },
    401,
  )
}

export function pinField(): never {
  throw new HttpException(
    {
      code: 'UNHANDLED',
      message: PIN_FIELD_MESSAGE,
      details: { field: 'pin' },
      retryable: false,
    },
    400,
  )
}

export function readPin(body: unknown): string {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    pinField()
  }
  const pin = (body as { pin?: unknown }).pin
  if (typeof pin !== 'string' || !PIN_PATTERN.test(pin)) {
    pinField()
  }
  return pin
}

function headerText(value: string | string[] | undefined): string | undefined {
  if (typeof value === 'string') {
    return value
  }
  if (Array.isArray(value)) {
    return value.join('; ')
  }
  return undefined
}

export function requestPath(url: string | undefined): string {
  if (!url) {
    return ''
  }
  const query = url.indexOf('?')
  return query < 0 ? url : url.slice(0, query)
}

export async function loadLiveSession(cookie: string | string[] | undefined): Promise<ResolvedSession | null> {
  const sessionId = readCookie(headerText(cookie), SESSION_COOKIE)
  if (!sessionId) {
    return null
  }
  const row = await getSessionStore().get(sessionId)
  if (!row || row.expires_at.getTime() <= authNow().getTime()) {
    return null
  }
  return row
}

export async function requireLiveSession(cookie: string | string[] | undefined): Promise<ResolvedSession> {
  const row = await loadLiveSession(cookie)
  if (!row) {
    unauthenticated()
  }
  return row
}

export async function endWebSession(sessionId: string, now = authNow()): Promise<void> {
  const row = await getSessionStore().get(sessionId)
  if (row) {
    await getSessionStore().saveTimes(sessionId, now, row.last_seen_at)
  }
  forgetPinEntry(sessionId)
}

export function sessionNeedsIdleClock(row: ResolvedSession): boolean {
  return row.gender === 'sister' || row.roles.includes('mahram')
}

/** Fail closed: a missing map entry is not unlocked. Idle applies only to sisters and mahrams. */
export function sessionIsPinLocked(row: ResolvedSession, now = authNow()): boolean {
  const entry = readPinEntry(row.id)
  const idle = sessionNeedsIdleClock(row) && now.getTime() - row.last_seen_at.getTime() >= PIN_IDLE_MS
  return entry?.unlocked !== true || idle
}

export async function stampSeen(row: ResolvedSession, now = authNow()): Promise<string | null> {
  if (isSlidingRememberMe(row.expires_at, row.last_seen_at)) {
    const expiresAt = new Date(now.getTime() + FOURTEEN_DAYS_MS)
    await getSessionStore().saveTimes(row.id, expiresAt, now)
    return sessionCookieHeader(row.id, rememberMeMaxAge(expiresAt, now))
  }
  await getSessionStore().saveTimes(row.id, row.expires_at, now)
  return null
}

export function lockThisSession(sessionId: string, now = authNow()): void {
  const fails = readPinEntry(sessionId)?.fails ?? 0
  notePinLocked(sessionId, fails, now)
}

/** Idle and lock gate for every session-cookie call except the named PIN and session routes. */
export async function applySessionGate(
  method: string,
  path: string,
  cookieHeader: string | undefined,
  ip = '',
): Promise<PinGateResult> {
  const route = `${method.toUpperCase()} ${requestPath(path)}`
  if (route === 'PUT /v1/pin') {
    await rejectIfAuthRateLimited(ip)
  }
  if (EXEMPT.has(route)) {
    return { stop: false, cookie: null }
  }
  const sessionId = readCookie(cookieHeader, SESSION_COOKIE)
  if (!sessionId) {
    return { stop: false, cookie: null }
  }
  const row = await getSessionStore().get(sessionId)
  const now = authNow()
  if (!row || row.expires_at.getTime() <= now.getTime()) {
    return { stop: false, cookie: null }
  }
  const pin = await getPinLockStore().findByAccount(row.account_id)
  if (pin && sessionIsPinLocked(row, now)) {
    lockThisSession(row.id, now)
    return { stop: true }
  }
  return { stop: false, cookie: await stampSeen(row, now) }
}
