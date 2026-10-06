import { createHash, randomInt } from 'node:crypto'
import type { OtpLog } from './sms-port.js'
import type { PhoneOtpStore } from './phone-otp-store.js'

export const OTP_TTL_MS = 10 * 60 * 1000
export const OTP_RESEND_WAIT_MS = 60 * 1000
export const OTP_HOUR_MS = 60 * 60 * 1000
export const OTP_TEMPLATE = 'OTP'

const E164 = /^\+[1-9]\d{1,14}$/
const SIX_DIGITS = /^\d{6}$/

const UNAUTHENTICATED_MESSAGE = 'Authentification requise.'
const INVALID_MESSAGE = 'Code invalide ou expiré.'
const RATE_MESSAGE = 'Cadence de requêtes régulée.'
const UNKNOWN_ACTION_MESSAGE = 'Action inconnue.'
const PHONE_MESSAGE = 'phone_e164 : un numéro E.164 est requis.'
const DELIVERY_MESSAGE = "L'envoi du code a échoué."
const CONFIG_MESSAGE = 'Request failed'

export type OtpFailure = {
  ok: false
  status: 400 | 401 | 429 | 500 | 503
  code: 'UNAUTHENTICATED' | 'UNHANDLED' | 'OTP_INVALID' | 'RATE_LIMITED'
  message: string
  details: unknown
  retryable: boolean
}

export type OtpSuccess = {
  ok: true
  status: 200 | 201
  body: { expires_at: string } | { status: 'granted' }
}

export function hashOtpCode(code: string): string {
  return createHash('sha256').update(code, 'utf8').digest('hex')
}

export function newOtpCode(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, '0')
}

export function isE164(value: string): boolean {
  return E164.test(value)
}

/** Same grouping as the web mask. The read route returns this, never the stored E.164. */
export function maskE164(phone: string): string {
  const digits = phone.startsWith('+') ? phone.slice(1) : phone
  if (digits.startsWith('226') && digits.length === 11) {
    const national = digits.slice(3)
    return `+226 ${national.slice(0, 2)} •• •• ${national.slice(-2)}`
  }
  const last = digits.slice(-2)
  const head = digits.slice(0, Math.min(3, Math.max(0, digits.length - 2)))
  return `+${head} •• •• ${last}`
}

export type OtpRead = {
  ok: true
  status: 200
  body:
    | { status: 'none' }
    | { status: 'pending' | 'granted'; expires_at: string; phone_masked: string }
}

export async function readPhoneOtp(input: { accountId: string; store: PhoneOtpStore }): Promise<OtpRead> {
  const row = await input.store.current(input.accountId)
  if (!row || (row.status !== 'pending' && row.status !== 'granted') || !row.phone_e164 || !row.expires_at) {
    return { ok: true, status: 200, body: { status: 'none' } }
  }
  return {
    ok: true,
    status: 200,
    body: {
      status: row.status,
      expires_at: row.expires_at.toISOString(),
      phone_masked: maskE164(row.phone_e164),
    },
  }
}

export function gateOtpSend(input: {
  dispatches: Array<{ created_at: Date }>
  expiresAt: Date | null
  now: Date
  limit: number
  waitMs: number
}): { result: 'ready' } | { result: 'rate_limited' } | { result: 'cooldown'; expires_at: Date } {
  const hourStart = input.now.getTime() - OTP_HOUR_MS
  const inHour = input.dispatches.filter((row) => row.created_at.getTime() >= hourStart)
  if (inHour.length >= input.limit) {
    return { result: 'rate_limited' }
  }
  let latest: Date | null = null
  for (const row of inHour) {
    if (latest === null || row.created_at.getTime() > latest.getTime()) {
      latest = row.created_at
    }
  }
  if (
    latest !== null &&
    input.expiresAt !== null &&
    input.now.getTime() - latest.getTime() < input.waitMs
  ) {
    return { result: 'cooldown', expires_at: input.expiresAt }
  }
  return { result: 'ready' }
}

export function unauthenticatedOtp(): OtpFailure {
  return {
    ok: false,
    status: 401,
    code: 'UNAUTHENTICATED',
    message: UNAUTHENTICATED_MESSAGE,
    details: null,
    retryable: false,
  }
}

function failure(
  status: OtpFailure['status'],
  code: OtpFailure['code'],
  message: string,
  details: unknown,
  retryable: boolean,
): OtpFailure {
  return { ok: false, status, code, message, details, retryable }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export async function submitPhoneOtp(input: {
  accountId: string
  body: unknown
  now: () => Date
  limit: number | null
  store: PhoneOtpStore
  send: (message: OtpLog) => Promise<void>
}): Promise<OtpSuccess | OtpFailure> {
  if (input.limit === null) {
    return failure(500, 'UNHANDLED', CONFIG_MESSAGE, null, false)
  }
  if (!isRecord(input.body) || typeof input.body.action !== 'string') {
    return failure(400, 'UNHANDLED', UNKNOWN_ACTION_MESSAGE, null, false)
  }
  if (input.body.action === 'send') {
    return sendOtp(input.accountId, input.body.phone_e164, input)
  }
  if (input.body.action === 'verify') {
    return verifyOtp(input.accountId, input.body.code, input)
  }
  return failure(400, 'UNHANDLED', UNKNOWN_ACTION_MESSAGE, null, false)
}

async function sendOtp(
  accountId: string,
  phone: unknown,
  input: {
    now: () => Date
    limit: number | null
    store: PhoneOtpStore
    send: (message: OtpLog) => Promise<void>
  },
): Promise<OtpSuccess | OtpFailure> {
  if (typeof phone !== 'string' || !isE164(phone)) {
    return failure(400, 'UNHANDLED', PHONE_MESSAGE, { field: 'phone_e164' }, false)
  }
  const limit = input.limit
  if (limit === null) {
    return failure(500, 'UNHANDLED', CONFIG_MESSAGE, null, false)
  }
  const now = input.now()
  const code = newOtpCode()
  const issued = await input.store.issue({
    accountId,
    phone,
    hash: hashOtpCode(code),
    now,
    expiresAt: new Date(now.getTime() + OTP_TTL_MS),
    limit,
    waitMs: OTP_RESEND_WAIT_MS,
    log: () => input.send({ code }),
  })
  if (issued.result === 'rate_limited') {
    return failure(429, 'RATE_LIMITED', RATE_MESSAGE, null, false)
  }
  if (issued.result === 'delivery_failed') {
    return failure(503, 'UNHANDLED', DELIVERY_MESSAGE, null, true)
  }
  return {
    ok: true,
    status: issued.result === 'sent' ? 201 : 200,
    body: { expires_at: issued.expires_at.toISOString() },
  }
}

async function verifyOtp(
  accountId: string,
  code: unknown,
  input: { now: () => Date; store: PhoneOtpStore },
): Promise<OtpSuccess | OtpFailure> {
  if (typeof code !== 'string' || !SIX_DIGITS.test(code)) {
    return failure(400, 'OTP_INVALID', INVALID_MESSAGE, null, false)
  }
  const granted = await input.store.grant({
    accountId,
    hash: hashOtpCode(code),
    now: input.now(),
  })
  if (granted !== 'granted') {
    return failure(400, 'OTP_INVALID', INVALID_MESSAGE, null, false)
  }
  return { ok: true, status: 200, body: { status: 'granted' } }
}
