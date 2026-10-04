import { createHash, randomBytes } from 'node:crypto'
import { newId } from '@ankanu/kernel'
import type { EmailMessage } from './email-port.js'
import type { EmailVerificationStore } from './email-verification-store.js'

export const EMAIL_LINK_TTL_MS = 30 * 60 * 1000
const MAX_TOKEN_LENGTH = 256

const UNAUTHENTICATED_MESSAGE = 'Authentification requise.'
const INVALID_MESSAGE = 'Lien expiré ou caduc.'
const DELIVERY_MESSAGE = "L'envoi du lien a échoué."

export type IssueFailure = {
  ok: false
  status: 401 | 503
  code: 'UNAUTHENTICATED' | 'EMAIL_DELIVERY_FAILED'
  message: string
  retryable: boolean
  email: string | null
}

export type IssueSuccess = {
  ok: true
  status: 200 | 201
  email: string
  expires_at?: string
}

export type ConsumeFailure = {
  ok: false
  status: 400
  code: 'EMAIL_LINK_INVALID'
  message: string
  retryable: false
  email: string | null
}

export type ConsumeSuccess = {
  ok: true
  status: 200
  email: string | null
  email_verified_at: string
}

export function hashEmailToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex')
}

export function newEmailToken(): string {
  return randomBytes(32).toString('base64url')
}

export function emailVerificationLink(origin: string, token: string): string {
  const url = new URL('/email-verification', origin)
  url.searchParams.set('token', token)
  return url.toString()
}

/** `Origin` is an origin, not a path. Anything else cannot open the screen. */
export function publicOrigin(value: string | undefined): string | null {
  if (!value) {
    return null
  }
  let url: URL
  try {
    url = new URL(value)
  } catch {
    return null
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return null
  }
  if (url.username !== '' || url.password !== '') {
    return null
  }
  return url.origin
}

function deliveryFailed(email: string | null): IssueFailure {
  return {
    ok: false,
    status: 503,
    code: 'EMAIL_DELIVERY_FAILED',
    message: DELIVERY_MESSAGE,
    retryable: true,
    email,
  }
}

function invalidLink(email: string | null): ConsumeFailure {
  return {
    ok: false,
    status: 400,
    code: 'EMAIL_LINK_INVALID',
    message: INVALID_MESSAGE,
    retryable: false,
    email,
  }
}

export function unauthenticatedIssue(): IssueFailure {
  return {
    ok: false,
    status: 401,
    code: 'UNAUTHENTICATED',
    message: UNAUTHENTICATED_MESSAGE,
    retryable: false,
    email: null,
  }
}

export async function issueEmailVerification(input: {
  accountId: string
  origin: string | null
  now: () => Date
  store: EmailVerificationStore
  send: (message: EmailMessage) => Promise<void>
}): Promise<IssueSuccess | IssueFailure> {
  const email = await input.store.accountEmail(input.accountId)
  if (await input.store.passwordVerified(input.accountId)) {
    if (!email) {
      return deliveryFailed(null)
    }
    return { ok: true, status: 200, email }
  }
  if (!email || !input.origin) {
    return deliveryFailed(email)
  }
  const token = newEmailToken()
  const link = emailVerificationLink(input.origin, token)
  try {
    await input.send({ to: email, link })
  } catch {
    return deliveryFailed(email)
  }
  const createdAt = input.now()
  const expiresAt = new Date(createdAt.getTime() + EMAIL_LINK_TTL_MS)
  let stored: 'inserted' | 'already_verified'
  try {
    stored = await input.store.supersedeAndInsert(input.accountId, {
      id: newId(createdAt),
      account_id: input.accountId,
      token_hash: hashEmailToken(token),
      expires_at: expiresAt,
      consumed_at: null,
      superseded_at: null,
      created_at: createdAt,
    })
  } catch {
    return deliveryFailed(email)
  }
  if (stored === 'already_verified') {
    return { ok: true, status: 200, email }
  }
  return { ok: true, status: 201, email, expires_at: expiresAt.toISOString() }
}

export async function consumeEmailVerification(input: {
  token: unknown
  now: () => Date
  store: EmailVerificationStore
}): Promise<ConsumeSuccess | ConsumeFailure> {
  if (typeof input.token !== 'string' || input.token.length === 0 || input.token.length > MAX_TOKEN_LENGTH) {
    return invalidLink(null)
  }
  const row = await input.store.findByHash(hashEmailToken(input.token))
  if (!row) {
    return invalidLink(null)
  }
  const email = await input.store.accountEmail(row.account_id)
  const now = input.now()
  if (row.superseded_at !== null || row.consumed_at !== null || row.expires_at.getTime() <= now.getTime()) {
    return invalidLink(email)
  }
  const consumed = await input.store.markConsumed(row.id, row.account_id, now)
  if (!consumed) {
    return invalidLink(email)
  }
  return { ok: true, status: 200, email, email_verified_at: now.toISOString() }
}
