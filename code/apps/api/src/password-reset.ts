import { createHash, randomBytes } from 'node:crypto'
import { newId } from '@ankanu/kernel'
import type { EmailMessage } from './email-port.js'
import { passwordIsPublishable } from './create-account.js'
import { hashPassword } from './password-hash.js'
import { publicOrigin } from './email-verification.js'
import type { PasswordResetStore } from './password-reset-store.js'
import { rememberMeMaxAge, sessionCookieHeader } from './session-cookie.js'
import type { SessionRow } from './session-store.js'

export const PASSWORD_RESET_TTL_MS = 15 * 60 * 1000
export const PASSWORD_RESET_SESSION_MS = 30 * 24 * 60 * 60 * 1000
export const PASSWORD_RESET_NOTICE =
  'Une réinitialisation du mot de passe a été demandée et ce lien dure 15 minutes.'

const MAX_TOKEN_LENGTH = 256
const INVALID_MESSAGE = 'Lien expiré ou adresse inconnue.'
const EMAIL_MESSAGE = 'email : une adresse est requise.'
const PASSWORD_MESSAGE = "password : la règle publiée n'est pas respectée."
const DELIVERY_MESSAGE = "L'envoi du lien a échoué."

export type ResetRequestFailure = {
  ok: false
  status: 400 | 503
  code: 'UNHANDLED' | 'EMAIL_DELIVERY_FAILED'
  message: string
  details: { field: string } | null
  retryable: boolean
}

export type ResetRequestSuccess = {
  ok: true
  status: 201
}

export type ResetConsumeFailure = {
  ok: false
  status: 400
  code: 'UNHANDLED' | 'PASSWORD_RESET_INVALID'
  message: string
  details: { field: string } | null
  retryable: false
}

export type ResetConsumeSuccess = {
  ok: true
  status: 200
  body: { id: string; kind: 'web'; expires_at: string }
  cookie: string
}

export function hashResetToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex')
}

export function newResetToken(): string {
  return randomBytes(32).toString('base64url')
}

export function passwordResetLink(origin: string, token: string): string {
  const url = new URL('/password-reset', origin)
  url.searchParams.set('token', token)
  return url.toString()
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function requestEmail(body: unknown): string | null {
  if (!isRecord(body) || typeof body.email !== 'string' || body.email.length === 0) {
    return null
  }
  return body.email
}

export async function requestPasswordReset(input: {
  body: unknown
  originHeader: string | undefined
  now: () => Date
  store: PasswordResetStore
  send: (message: EmailMessage) => Promise<void>
}): Promise<ResetRequestSuccess | ResetRequestFailure> {
  const email = requestEmail(input.body)
  if (email === null) {
    return {
      ok: false,
      status: 400,
      code: 'UNHANDLED',
      message: EMAIL_MESSAGE,
      details: { field: 'email' },
      retryable: false,
    }
  }
  const account = await input.store.findAccount(email.trim().toLowerCase())
  if (!account?.verified) {
    return { ok: true, status: 201 }
  }
  const origin = publicOrigin(input.originHeader)
  if (!origin) {
    return deliveryFailed()
  }
  const token = newResetToken()
  const link = passwordResetLink(origin, token)
  try {
    await input.send({ to: account.email, link, notice: PASSWORD_RESET_NOTICE })
    const createdAt = input.now()
    const stored = await input.store.supersedeAndInsert(account.account_id, {
      id: newId(createdAt),
      account_id: account.account_id,
      token_hash: hashResetToken(token),
      expires_at: new Date(createdAt.getTime() + PASSWORD_RESET_TTL_MS),
      consumed_at: null,
      superseded_at: null,
      created_at: createdAt,
    })
    if (stored !== 'inserted') {
      return deliveryFailed()
    }
  } catch {
    return deliveryFailed()
  }
  return { ok: true, status: 201 }
}

function deliveryFailed(): ResetRequestFailure {
  return {
    ok: false,
    status: 503,
    code: 'EMAIL_DELIVERY_FAILED',
    message: DELIVERY_MESSAGE,
    details: null,
    retryable: true,
  }
}

function invalidToken(): ResetConsumeFailure {
  return {
    ok: false,
    status: 400,
    code: 'PASSWORD_RESET_INVALID',
    message: INVALID_MESSAGE,
    details: null,
    retryable: false,
  }
}

export async function consumePasswordReset(input: {
  body: unknown
  now: () => Date
  store: PasswordResetStore
  hashPassword?: (password: string) => Promise<string>
}): Promise<ResetConsumeSuccess | ResetConsumeFailure> {
  const token = isRecord(input.body) ? input.body.token : undefined
  if (typeof token !== 'string' || token.length === 0 || token.length > MAX_TOKEN_LENGTH) {
    return invalidToken()
  }
  const at = input.now()
  const usable = await input.store.findUsable(hashResetToken(token), at)
  if (!usable) {
    return invalidToken()
  }
  const password = isRecord(input.body) ? input.body.password : undefined
  if (typeof password !== 'string' || !passwordIsPublishable(password)) {
    return {
      ok: false,
      status: 400,
      code: 'UNHANDLED',
      message: PASSWORD_MESSAGE,
      details: { field: 'password' },
      retryable: false,
    }
  }
  const secretHash = await (input.hashPassword ?? hashPassword)(password)
  const session: SessionRow = {
    id: newId(at),
    account_id: '',
    kind: 'web',
    expires_at: new Date(at.getTime() + PASSWORD_RESET_SESSION_MS),
    last_seen_at: at,
  }
  const consumed = await input.store.consume({
    tokenHash: hashResetToken(token),
    secretHash,
    session,
    at,
  })
  if (!consumed) {
    return invalidToken()
  }
  return {
    ok: true,
    status: 200,
    body: { id: session.id, kind: 'web', expires_at: session.expires_at.toISOString() },
    cookie: sessionCookieHeader(session.id, rememberMeMaxAge(session.expires_at, at)),
  }
}
