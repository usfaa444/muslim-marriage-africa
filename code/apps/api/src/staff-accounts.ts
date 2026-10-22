import { randomBytes } from 'node:crypto'
import { newId } from '@ankanu/kernel'
import { authNow } from './auth-clock.js'
import { hashPassword } from './password-hash.js'
import { getStaffStore, STAFF_ROLES, type StaffRole, type StaffStore } from './staff-store.js'

/**
 * Staff provisioning. Only the server command (`staff-cli.ts`) calls this module: no web or API route
 * creates staff accounts or grants roles. Each command writes one audit event, with no password or secret.
 */

export const STAFF_AUDIT = {
  created: 'staff_account_created',
  mfaReset: 'staff_mfa_reset',
  disabled: 'staff_account_disabled',
} as const

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MAX_EMAIL_LENGTH = 254

export type ProvisionFailure = { ok: false; message: string }

type Deps = {
  store?: StaffStore
  now?: Date
  hash?: (password: string) => Promise<string>
}

export function normalizeStaffEmail(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null
  }
  const email = value.trim().toLowerCase()
  if (email.length === 0 || email.length > MAX_EMAIL_LENGTH || !EMAIL_PATTERN.test(email)) {
    return null
  }
  return email
}

export function isStaffRole(value: unknown): value is StaffRole {
  return typeof value === 'string' && (STAFF_ROLES as readonly string[]).includes(value)
}

/** 24 URL-safe characters (144 bits). Shown once by the command, then only its argon2id hash exists. */
export function oneTimePassword(): string {
  return randomBytes(18).toString('base64url')
}

export async function createStaffAccount(
  input: { email: unknown; role: unknown },
  deps: Deps = {},
): Promise<{ ok: true; accountId: string; email: string; role: StaffRole; oneTimePassword: string } | ProvisionFailure> {
  const email = normalizeStaffEmail(input.email)
  if (!email) {
    return { ok: false, message: 'A valid --email is required.' }
  }
  if (!isStaffRole(input.role)) {
    return { ok: false, message: '--role must be moderator or operator.' }
  }
  const store = deps.store ?? getStaffStore()
  if (await store.emailTaken(email)) {
    return { ok: false, message: 'An account already uses this email. Nothing was changed.' }
  }
  const now = deps.now ?? authNow()
  const password = oneTimePassword()
  const passwordHash = await (deps.hash ?? hashPassword)(password)
  const accountId = newId(now)
  await store.create(
    {
      id: accountId,
      email,
      pseudonym: `staff_${randomBytes(6).toString('hex')}`,
      roles: [input.role],
      status: 'Active',
      password_hash: passwordHash,
    },
    {
      account_id: accountId,
      must_change_password: true,
      totp_sealed: null,
      totp_pending_sealed: null,
      totp_enrolled_at: null,
      totp_last_step: null,
      failed_codes: 0,
      locked_until: null,
      created_at: now,
    },
    {
      actorId: null,
      action: STAFF_AUDIT.created,
      payload: { account_id: accountId, role: input.role, via: 'server_command' },
    },
  )
  return { ok: true, accountId, email, role: input.role, oneTimePassword: password }
}

/** Clears the authenticator enrollment and ends live staff sessions. The next sign-in enrolls again. */
export async function resetStaffMfa(
  input: { email: unknown },
  deps: Deps = {},
): Promise<{ ok: true; accountId: string } | ProvisionFailure> {
  const email = normalizeStaffEmail(input.email)
  if (!email) {
    return { ok: false, message: 'A valid --email is required.' }
  }
  const store = deps.store ?? getStaffStore()
  const found = await store.findByEmail(email)
  if (!found) {
    return { ok: false, message: 'No staff account uses this email.' }
  }
  const now = deps.now ?? authNow()
  await store.endSessions(found.account.id, now)
  await store.updateCredential(
    found.account.id,
    {
      totp_sealed: null,
      totp_pending_sealed: null,
      totp_enrolled_at: null,
      totp_last_step: null,
      failed_codes: 0,
      locked_until: null,
    },
    [{ actorId: null, action: STAFF_AUDIT.mfaReset, payload: { account_id: found.account.id, via: 'server_command' } }],
  )
  return { ok: true, accountId: found.account.id }
}

/** Blocks sign-in and ends every live staff session of the account. */
export async function disableStaffAccount(
  input: { email: unknown },
  deps: Deps = {},
): Promise<{ ok: true; accountId: string } | ProvisionFailure> {
  const email = normalizeStaffEmail(input.email)
  if (!email) {
    return { ok: false, message: 'A valid --email is required.' }
  }
  const store = deps.store ?? getStaffStore()
  const found = await store.findByEmail(email)
  if (!found) {
    return { ok: false, message: 'No staff account uses this email.' }
  }
  await store.disable(found.account.id, deps.now ?? authNow(), {
    actorId: null,
    action: STAFF_AUDIT.disabled,
    payload: { account_id: found.account.id, via: 'server_command' },
  })
  return { ok: true, accountId: found.account.id }
}
