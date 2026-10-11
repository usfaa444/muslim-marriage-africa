import { newId } from '@ankanu/kernel'
import { normalizeAccountEmail } from './create-account.js'
import type { EmailMessage } from './email-port.js'
import {
  EMAIL_LINK_TTL_MS,
  emailVerificationLink,
  hashEmailToken,
  newEmailToken,
} from './email-verification.js'
import type { EmailVerificationStore } from './email-verification-store.js'

const INVALID_MESSAGE = 'email : une adresse inutilisée est requise.'
const SAME_MESSAGE = "email : c'est déjà l'adresse enregistrée."
const TAKEN_MESSAGE = 'email : ce champ est déjà utilisé.'
const VERIFIED_MESSAGE = "email : l'adresse est déjà vérifiée."
const DELIVERY_MESSAGE = "L'envoi du lien a échoué."

export type ChangeEmailFailure = {
  ok: false
  status: 400 | 409 | 503
  code: 'UNHANDLED' | 'EMAIL_DELIVERY_FAILED'
  message: string
  details: { field: 'email' } | null
  retryable: boolean
  email: string | null
}

export type ChangeEmailSuccess = {
  ok: true
  status: 200
  email: string
  expires_at: string
}

function refused(
  status: 400 | 409,
  message: string,
  email: string | null,
): ChangeEmailFailure {
  return {
    ok: false,
    status,
    code: 'UNHANDLED',
    message,
    details: { field: 'email' },
    retryable: false,
    email,
  }
}

function deliveryFailed(email: string | null): ChangeEmailFailure {
  return {
    ok: false,
    status: 503,
    code: 'EMAIL_DELIVERY_FAILED',
    message: DELIVERY_MESSAGE,
    details: null,
    retryable: true,
    email,
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** Replaces an unverified address and issues the Story 2.3 link to the new inbox. */
export async function changeAccountEmail(input: {
  accountId: string
  body: unknown
  origin: string | null
  now: () => Date
  store: EmailVerificationStore
  emailTaken: (email: string) => Promise<boolean>
  send: (message: EmailMessage) => Promise<void>
}): Promise<ChangeEmailSuccess | ChangeEmailFailure> {
  const email = normalizeAccountEmail(isRecord(input.body) ? input.body.email : undefined)
  if (email === null) {
    return refused(400, INVALID_MESSAGE, null)
  }
  const current = await input.store.accountEmail(input.accountId)
  if (!current || !input.origin) {
    return deliveryFailed(current)
  }
  if (await input.store.passwordVerified(input.accountId)) {
    return refused(409, VERIFIED_MESSAGE, current)
  }
  if (current === email) {
    return refused(400, SAME_MESSAGE, current)
  }
  if (await input.emailTaken(email)) {
    return refused(409, TAKEN_MESSAGE, current)
  }
  const token = newEmailToken()
  const link = emailVerificationLink(input.origin, token)
  try {
    await input.send({ to: email, link })
  } catch {
    return deliveryFailed(current)
  }
  const createdAt = input.now()
  const expiresAt = new Date(createdAt.getTime() + EMAIL_LINK_TTL_MS)
  let stored: 'replaced' | 'verified' | 'same' | 'taken' | 'missing'
  try {
    stored = await input.store.commitEmailChange(input.accountId, email, {
      id: newId(createdAt),
      account_id: input.accountId,
      token_hash: hashEmailToken(token),
      expires_at: expiresAt,
      consumed_at: null,
      superseded_at: null,
      created_at: createdAt,
    })
  } catch {
    return deliveryFailed(current)
  }
  if (stored === 'verified') {
    return refused(409, VERIFIED_MESSAGE, current)
  }
  if (stored === 'same') {
    return refused(400, SAME_MESSAGE, current)
  }
  if (stored === 'taken') {
    return refused(409, TAKEN_MESSAGE, current)
  }
  if (stored !== 'replaced') {
    return deliveryFailed(current)
  }
  return { ok: true, status: 200, email, expires_at: expiresAt.toISOString() }
}
