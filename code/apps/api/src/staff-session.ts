import { HttpException } from '@nestjs/common'
import { errorEnvelope, newId, type ErrorEnvelope } from '@ankanu/kernel'
import type { AuditAppend } from '@ankanu/ports'
import { renderSVG } from 'uqr'
import { authNow } from './auth-clock.js'
import { passwordIsPublishable } from './create-account.js'
import { hashPassword, verifyPassword } from './password-hash.js'
import { readCookie, SESSION_COOKIE, sessionCookieHeader } from './session-cookie.js'
import { getSessionStore } from './session-store.js'
import {
  openTotpSecret,
  readStaffMfaKey,
  sealTotpSecret,
} from './staff-mfa-key.js'
import {
  getStaffStore,
  STAFF_ROLES,
  type StaffMfaState,
  type StaffSessionRow,
  type StaffSessionView,
} from './staff-store.js'
import { generateTotpSecret, groupedSecret, matchTotpStep, otpauthUri, TOTP_CODE_PATTERN } from './staff-totp.js'

/** Staff sessions slide on a 30-minute idle clock, inside a 12-hour ceiling from sign-in. Never PIN sessions. */
export const STAFF_IDLE_MS = 30 * 60 * 1000
export const STAFF_ABSOLUTE_MS = 12 * 60 * 60 * 1000
export const STAFF_MAX_CODE_FAILS = 5
export const STAFF_LOCK_MS = 15 * 60 * 1000

export const STAFF_CREDENTIALS_MESSAGE = 'Identifiant ou mot de passe incorrect.'
export const STAFF_CODE_MESSAGE = 'Code incorrect.'
export const STAFF_CODE_FORMAT_MESSAGE = 'code : six chiffres sont requis.'
export const STAFF_LOCKED_MESSAGE = 'Connexion verrouillée. Réessayez dans 15 minutes.'
export const STAFF_MFA_PENDING_MESSAGE = 'Validation en deux étapes requise.'
export const STAFF_STEP_MESSAGE = "Cette étape n'est pas disponible."
export const STAFF_UNAVAILABLE_MESSAGE = 'La connexion staff est indisponible.'
export const STAFF_MEMBER_MESSAGE = "Cette session d'équipe ne peut pas ouvrir un espace membre."
export const STAFF_FORBIDDEN_MESSAGE = 'Accès réservé au personnel de modération.'
export const STAFF_AUTH_MESSAGE = 'Authentification requise.'
export const STAFF_SAME_PASSWORD_MESSAGE = 'new_password : choisissez un mot de passe différent.'
export const STAFF_PASSWORD_RULE_MESSAGE = "new_password : la règle publiée n'est pas respectée."

export const STAFF_SIGN_IN_AUDIT = {
  success: 'staff_sign_in',
  failure: 'staff_sign_in_failure',
  locked: 'staff_sign_in_locked',
  enrolled: 'staff_mfa_enrolled',
  passwordChanged: 'staff_password_changed',
} as const

const MAX_EMAIL_LENGTH = 254
const MAX_PASSWORD_LENGTH = 128

export type StaffFailure = {
  ok: false
  status: 400 | 401 | 403 | 429 | 503
  code: string
  message: string
  details: Record<string, unknown> | null
  retryAfter?: number
}

type Ok<T> = { ok: true } & T

export function staffException(failure: StaffFailure): HttpException {
  const body: Record<string, unknown> = {
    code: failure.code,
    message: failure.message,
    details: failure.details,
    retryable: failure.status === 429 || failure.status === 503,
  }
  if (failure.retryAfter !== undefined) {
    body['retryAfter'] = failure.retryAfter
  }
  return new HttpException(body, failure.status)
}

function failure(
  status: StaffFailure['status'],
  code: string,
  message: string,
  details: Record<string, unknown> | null = null,
): StaffFailure {
  return { ok: false, status, code, message, details }
}

const credentialsFailure = () => failure(401, 'UNAUTHENTICATED', STAFF_CREDENTIALS_MESSAGE)
const codeFailure = () => failure(401, 'OTP_INVALID', STAFF_CODE_MESSAGE)
const unavailable = () => failure(503, 'STAFF_MFA_UNAVAILABLE', STAFF_UNAVAILABLE_MESSAGE)
const stepFailure = () => failure(403, 'FORBIDDEN', STAFF_STEP_MESSAGE, { reason: 'staff_step' })

function lockedFailure(until: Date, now: Date): StaffFailure {
  const seconds = Math.max(1, Math.ceil((until.getTime() - now.getTime()) / 1000))
  return { ...failure(429, 'RATE_LIMITED', STAFF_LOCKED_MESSAGE, { reason: 'staff_locked' }), retryAfter: seconds }
}

export function isStaffRoleList(roles: readonly string[]): boolean {
  return roles.length > 0 && roles.every((role) => (STAFF_ROLES as readonly string[]).includes(role))
}

/** A staff session is live while inside both clocks, on an Active account that still holds a staff role. */
export function staffSessionLive(row: StaffSessionView, now: Date): boolean {
  return (
    row.expires_at.getTime() > now.getTime() &&
    now.getTime() - row.last_seen_at.getTime() < STAFF_IDLE_MS &&
    row.status === 'Active' &&
    isStaffRoleList(row.roles)
  )
}

function headerText(value: string | string[] | undefined | null): string | undefined {
  if (typeof value === 'string') {
    return value
  }
  if (Array.isArray(value)) {
    return value.join('; ')
  }
  return undefined
}

export async function loadStaffSessionById(sessionId: string, now = authNow()): Promise<StaffSessionView | null> {
  const row = await getStaffStore().getSession(sessionId)
  if (!row || !staffSessionLive(row, now)) {
    return null
  }
  return row
}

export async function loadStaffSession(cookie: string | string[] | undefined): Promise<StaffSessionView | null> {
  const sessionId = readCookie(headerText(cookie), SESSION_COOKIE)
  return sessionId ? loadStaffSessionById(sessionId) : null
}

async function memberSessionLive(cookie: string | string[] | undefined): Promise<boolean> {
  const sessionId = readCookie(headerText(cookie), SESSION_COOKIE)
  if (!sessionId) {
    return false
  }
  const row = await getSessionStore().get(sessionId)
  return row !== null && row.expires_at.getTime() > authNow().getTime()
}

/**
 * Every `/v1/staff/*` business endpoint. A member or Mahram session is 403 even when its account holds a staff role.
 * An MFA-pending staff session is 403. No session is 401.
 */
export async function requireStaffSession(
  cookie: string | string[] | undefined,
): Promise<{ account_id: string; roles: string[]; session_id: string }> {
  const staff = await loadStaffSession(cookie)
  if (staff) {
    if (staff.mfa_state !== 'done') {
      throw staffException(failure(403, 'FORBIDDEN', STAFF_MFA_PENDING_MESSAGE, { reason: 'staff_mfa_pending' }))
    }
    return { account_id: staff.account_id, roles: [...staff.roles], session_id: staff.id }
  }
  if (await memberSessionLive(cookie)) {
    throw staffException(failure(403, 'FORBIDDEN', STAFF_FORBIDDEN_MESSAGE))
  }
  throw staffException(failure(401, 'UNAUTHENTICATED', STAFF_AUTH_MESSAGE))
}

/** The session-cookie gate for a staff session. Member routes are refused; MFA-pending sessions reach only their own steps. */
const STAFF_PENDING_ROUTES = new Set([
  'GET /v1/staff/sessions/current',
  'POST /v1/staff/sessions/password',
  'GET /v1/staff/sessions/enrollment',
  'POST /v1/staff/sessions/mfa',
])

const STAFF_OPEN_ROUTES = new Set(['GET /v1/health', 'GET /v1/media/get', 'POST /v1/staff/sessions'])

export type StaffGateResult = { stop: false } | { stop: true; status: 403; body: ErrorEnvelope }

export function staffRouteAllowed(route: string, state: StaffMfaState): boolean {
  if (STAFF_PENDING_ROUTES.has(route) || route === 'POST /v1/staff/sessions') {
    return true
  }
  if (state !== 'done') {
    return false
  }
  const [, path = ''] = route.split(' ')
  return path.startsWith('/v1/staff/') || STAFF_OPEN_ROUTES.has(route)
}

export async function applyStaffGate(route: string, row: StaffSessionView, now: Date): Promise<StaffGateResult> {
  if (!staffRouteAllowed(route, row.mfa_state)) {
    const pending = row.mfa_state !== 'done'
    return {
      stop: true,
      status: 403,
      body: errorEnvelope({
        code: 'FORBIDDEN',
        message: pending ? STAFF_MFA_PENDING_MESSAGE : STAFF_MEMBER_MESSAGE,
        details: { reason: pending ? 'staff_mfa_pending' : 'staff_session' },
        retryable: false,
      }),
    }
  }
  await getStaffStore().updateSession(row.id, { last_seen_at: now })
  return { stop: false }
}

function readField(body: unknown, field: string): string | null {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return null
  }
  const value = (body as Record<string, unknown>)[field]
  return typeof value === 'string' ? value : null
}

let dummyHash: Promise<string> | undefined

async function burnPassword(password: string): Promise<void> {
  const sample = Array.from(password).length > MAX_PASSWORD_LENGTH ? 'not-a-staff-password' : password
  try {
    dummyHash ??= hashPassword('not-a-staff-password')
    await verifyPassword(await dummyHash, sample)
  } catch (error) {
    dummyHash = undefined
    throw error
  }
}

export function staffSignInBodyReady(body: unknown): boolean {
  const email = readField(body, 'email')
  const password = readField(body, 'password')
  return email !== null && email.trim().length > 0 && password !== null && password.length > 0
}

function nextState(credential: { must_change_password: boolean; totp_sealed: string | null }): StaffMfaState {
  if (credential.must_change_password) {
    return 'password_change'
  }
  return credential.totp_sealed ? 'verify' : 'enroll'
}

export type StaffSessionBody = { kind: 'staff'; mfa_state: StaffMfaState; expires_at: string }

/** Email and password. Opens an MFA-pending staff session; only a valid code makes it a staff session. */
export async function signInStaff(
  body: unknown,
  now = authNow(),
): Promise<Ok<{ body: StaffSessionBody; cookie: string }> | StaffFailure> {
  const rawEmail = readField(body, 'email')
  const password = readField(body, 'password')
  if (rawEmail === null || rawEmail.trim().length === 0) {
    return failure(400, 'UNHANDLED', 'email : un identifiant est requis.', { field: 'email' })
  }
  if (password === null || password.length === 0) {
    return failure(400, 'UNHANDLED', 'password : un mot de passe est requis.', { field: 'password' })
  }
  const email = rawEmail.trim().toLowerCase()
  if (email.length > MAX_EMAIL_LENGTH || email.includes('\0') || Array.from(password).length > MAX_PASSWORD_LENGTH) {
    await burnPassword(password)
    return credentialsFailure()
  }
  if (!readStaffMfaKey()) {
    await burnPassword(password)
    return unavailable()
  }
  const store = getStaffStore()
  const found = await store.findByEmail(email)
  if (!found || !found.account.password_hash || !isStaffRoleList(found.account.roles) || found.account.status !== 'Active') {
    await burnPassword(password)
    await store.audit({ actorId: null, action: STAFF_SIGN_IN_AUDIT.failure, payload: { reason: 'credentials' } })
    return credentialsFailure()
  }
  if (!(await verifyPassword(found.account.password_hash, password))) {
    await store.audit({
      actorId: found.account.id,
      action: STAFF_SIGN_IN_AUDIT.failure,
      payload: { account_id: found.account.id, reason: 'credentials' },
    })
    return credentialsFailure()
  }
  const lockedUntil = found.credential.locked_until
  if (lockedUntil && lockedUntil.getTime() > now.getTime()) {
    return lockedFailure(lockedUntil, now)
  }
  const row: StaffSessionRow = {
    id: newId(now),
    account_id: found.account.id,
    expires_at: new Date(now.getTime() + STAFF_ABSOLUTE_MS),
    last_seen_at: now,
    mfa_state: nextState(found.credential),
  }
  await store.insertSession(row)
  return {
    ok: true,
    body: { kind: 'staff', mfa_state: row.mfa_state, expires_at: row.expires_at.toISOString() },
    cookie: sessionCookieHeader(row.id, null),
  }
}

/** First sign-in: the one-time password must be replaced before enrollment. */
export async function changeStaffPassword(
  session: StaffSessionView,
  body: unknown,
  now = authNow(),
): Promise<Ok<{ body: StaffSessionBody }> | StaffFailure> {
  if (session.mfa_state !== 'password_change') {
    return stepFailure()
  }
  const next = readField(body, 'new_password')
  if (next === null || !passwordIsPublishable(next)) {
    return failure(400, 'UNHANDLED', STAFF_PASSWORD_RULE_MESSAGE, { field: 'new_password' })
  }
  const store = getStaffStore()
  const found = await store.findById(session.account_id)
  if (!found || !found.account.password_hash) {
    return credentialsFailure()
  }
  if (await verifyPassword(found.account.password_hash, next)) {
    return failure(400, 'UNHANDLED', STAFF_SAME_PASSWORD_MESSAGE, { field: 'new_password' })
  }
  await store.setPassword(session.account_id, await hashPassword(next), {
    actorId: session.account_id,
    action: STAFF_SIGN_IN_AUDIT.passwordChanged,
    payload: { account_id: session.account_id },
  })
  const state = found.credential.totp_sealed ? 'verify' : 'enroll'
  await store.updateSession(session.id, { mfa_state: state, last_seen_at: now })
  return { ok: true, body: { kind: 'staff', mfa_state: state, expires_at: session.expires_at.toISOString() } }
}

export type EnrollmentBody = { otpauth_uri: string; secret: string; qr_svg: string }

/** The QR code and manual key, only while the session is enrolling. After enrollment the secret is never sent again. */
export async function readEnrollment(session: StaffSessionView): Promise<Ok<{ body: EnrollmentBody }> | StaffFailure> {
  if (session.mfa_state !== 'enroll') {
    return stepFailure()
  }
  const key = readStaffMfaKey()
  if (!key) {
    return unavailable()
  }
  const store = getStaffStore()
  const found = await store.findById(session.account_id)
  if (!found || found.credential.totp_sealed) {
    return stepFailure()
  }
  let secret: string
  if (found.credential.totp_pending_sealed) {
    secret = openTotpSecret(found.credential.totp_pending_sealed, key)
  } else {
    secret = generateTotpSecret()
    await store.updateCredential(session.account_id, { totp_pending_sealed: sealTotpSecret(secret, key) })
  }
  const uri = otpauthUri(found.account.email, secret)
  return {
    ok: true,
    body: {
      otpauth_uri: uri,
      secret: groupedSecret(secret),
      qr_svg: renderSVG(uri, { ecc: 'M', border: 2, pixelSize: 6 }),
    },
  }
}

/**
 * The six-digit code. Enrolling checks the pending secret; signing in checks the enrolled one.
 * Current step ±1, each step accepted once, 5 wrong codes lock sign-in for 15 minutes.
 * Success replaces the session id, so the MFA-pending id never becomes a staff session.
 */
export async function verifyStaffCode(
  session: StaffSessionView,
  body: unknown,
  now = authNow(),
): Promise<Ok<{ body: StaffSessionBody; cookie: string }> | StaffFailure> {
  if (session.mfa_state !== 'enroll' && session.mfa_state !== 'verify') {
    return stepFailure()
  }
  const store = getStaffStore()
  const found = await store.findById(session.account_id)
  if (!found) {
    return credentialsFailure()
  }
  const factors = found.credential
  if (factors.locked_until && factors.locked_until.getTime() > now.getTime()) {
    return lockedFailure(factors.locked_until, now)
  }
  const code = readField(body, 'code')
  if (code === null || !TOTP_CODE_PATTERN.test(code)) {
    return failure(400, 'UNHANDLED', STAFF_CODE_FORMAT_MESSAGE, { field: 'code' })
  }
  const key = readStaffMfaKey()
  if (!key) {
    return unavailable()
  }
  const enrolling = session.mfa_state === 'enroll'
  const sealed = enrolling ? factors.totp_pending_sealed : factors.totp_sealed
  if (!sealed) {
    return stepFailure()
  }
  const step = matchTotpStep(openTotpSecret(sealed, key), code, now, enrolling ? null : factors.totp_last_step)
  const signedIn: AuditAppend = {
    actorId: session.account_id,
    action: STAFF_SIGN_IN_AUDIT.success,
    payload: { account_id: session.account_id, role: found.account.roles.join(',') },
  }
  const accepted =
    step !== null &&
    (await store.consumeStep(
      session.account_id,
      step,
      enrolling
        ? { totp_sealed: sealed, totp_pending_sealed: null, totp_enrolled_at: now, failed_codes: 0, locked_until: null }
        : { failed_codes: 0, locked_until: null },
      enrolling
        ? [
            { actorId: session.account_id, action: STAFF_SIGN_IN_AUDIT.enrolled, payload: { account_id: session.account_id } },
            signedIn,
          ]
        : [signedIn],
    ))
  if (!accepted) {
    return wrongCode(session, factors.failed_codes, now)
  }
  const fresh: StaffSessionRow = {
    id: newId(now),
    account_id: session.account_id,
    expires_at: session.expires_at,
    last_seen_at: now,
    mfa_state: 'done',
  }
  await store.updateSession(session.id, { expires_at: now })
  await store.insertSession(fresh)
  return {
    ok: true,
    body: { kind: 'staff', mfa_state: 'done', expires_at: fresh.expires_at.toISOString() },
    cookie: sessionCookieHeader(fresh.id, null),
  }
}

async function wrongCode(session: StaffSessionView, failedBefore: number, now: Date): Promise<StaffFailure> {
  const store = getStaffStore()
  const fails = failedBefore + 1
  const failed: AuditAppend = {
    actorId: session.account_id,
    action: STAFF_SIGN_IN_AUDIT.failure,
    payload: { account_id: session.account_id, reason: 'code' },
  }
  if (fails < STAFF_MAX_CODE_FAILS) {
    await store.updateCredential(session.account_id, { failed_codes: fails }, [failed])
    return codeFailure()
  }
  const until = new Date(now.getTime() + STAFF_LOCK_MS)
  await store.updateCredential(session.account_id, { failed_codes: 0, locked_until: until }, [
    failed,
    {
      actorId: session.account_id,
      action: STAFF_SIGN_IN_AUDIT.locked,
      payload: { account_id: session.account_id, locked_until: until.toISOString() },
    },
  ])
  await store.endSessions(session.account_id, now)
  return lockedFailure(until, now)
}

export async function endStaffSession(sessionId: string, now = authNow()): Promise<boolean> {
  const row = await getStaffStore().getSession(sessionId)
  if (!row) {
    return false
  }
  await getStaffStore().updateSession(sessionId, { expires_at: now })
  return true
}

export function staffSessionBody(row: StaffSessionView): {
  kind: 'staff'
  mfa_state: StaffMfaState
  roles: string[]
  email: string
  idle_timeout_seconds: number
} {
  return {
    kind: 'staff',
    mfa_state: row.mfa_state,
    roles: [...row.roles],
    email: row.email,
    idle_timeout_seconds: STAFF_IDLE_MS / 1000,
  }
}
