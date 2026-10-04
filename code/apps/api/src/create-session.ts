import { assertAuthContext, newId, type AuthContext, type Role, ROLES } from '@ankanu/kernel'
import { authNow } from './auth-clock.js'
import { hashPassword, verifyPassword } from './password-hash.js'
import {
  FOURTEEN_DAYS_MS,
  readCookie,
  rememberMeMaxAge,
  SESSION_COOKIE,
  sessionCookieHeader,
  TWELVE_HOURS_MS,
} from './session-cookie.js'
import { getSessionStore, type SessionRow, type SessionStore } from './session-store.js'

export type SessionFailure = {
  ok: false
  status: 400 | 401
  code: 'UNHANDLED' | 'UNAUTHENTICATED'
  message: string
  details: { field: string } | null
}

export type SessionSuccess = {
  ok: true
  body: { id: string; kind: 'web'; expires_at: string }
  cookie: string
  session: SessionRow
}

const UNAUTHENTICATED_MESSAGE = 'Identifiant ou mot de passe incorrect.'
const MAX_IDENTIFIER_LENGTH = 2048
const MAX_PASSWORD_LENGTH = 128

let dummyHash: Promise<string> | undefined

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function fieldFailure(field: string, message: string): SessionFailure {
  return { ok: false, status: 400, code: 'UNHANDLED', message, details: { field } }
}

function unauthenticated(): SessionFailure {
  return {
    ok: false,
    status: 401,
    code: 'UNAUTHENTICATED',
    message: UNAUTHENTICATED_MESSAGE,
    details: null,
  }
}

async function burnUnknownPassword(password: string): Promise<void> {
  const sample = Array.from(password).length > MAX_PASSWORD_LENGTH ? 'not-a-member-password' : password
  try {
    dummyHash ??= hashPassword('not-a-member-password')
    await verifyPassword(await dummyHash, sample)
  } catch (error) {
    dummyHash = undefined
    throw error
  }
}

function memberRoles(roles: readonly string[]): Role[] | null {
  const next: Role[] = []
  for (const role of roles) {
    if (!ROLES.includes(role as Role)) {
      return null
    }
    next.push(role as Role)
  }
  return next
}

export async function createWebSession(
  body: unknown,
  deps: {
    store: SessionStore
    now: Date
  },
): Promise<SessionSuccess | SessionFailure> {
  if (!isRecord(body)) {
    return fieldFailure('body', 'body : un objet est requis.')
  }
  if (typeof body.identifier !== 'string' || body.identifier.trim().length === 0) {
    return fieldFailure('identifier', 'identifier : un identifiant est requis.')
  }
  if (typeof body.password !== 'string' || body.password.length === 0) {
    return fieldFailure('password', 'password : un mot de passe est requis.')
  }
  if (typeof body.remember_me !== 'boolean') {
    return fieldFailure('remember_me', 'remember_me : un booléen est requis.')
  }
  const identifier = body.identifier.trim()
  if (identifier.includes('\0') || identifier.length > MAX_IDENTIFIER_LENGTH || Array.from(body.password).length > MAX_PASSWORD_LENGTH) {
    await burnUnknownPassword(body.password)
    return unauthenticated()
  }

  const matches = await deps.store.findAccounts(identifier)
  if (matches.length !== 1) {
    await burnUnknownPassword(body.password)
    return unauthenticated()
  }
  const owner = matches[0]
  if (!owner || owner.secret_hashes.length === 0) {
    await burnUnknownPassword(body.password)
    return unauthenticated()
  }
  let matched = false
  for (const hash of owner.secret_hashes) {
    if (await verifyPassword(hash, body.password)) {
      matched = true
      break
    }
  }
  if (!matched) {
    return unauthenticated()
  }

  const expiresAt = new Date(deps.now.getTime() + (body.remember_me ? FOURTEEN_DAYS_MS : TWELVE_HOURS_MS))
  const row: SessionRow = {
    id: newId(deps.now),
    account_id: owner.id,
    kind: 'web',
    expires_at: expiresAt,
    last_seen_at: deps.now,
  }
  await deps.store.insert(row)
  return {
    ok: true,
    body: { id: row.id, kind: 'web', expires_at: expiresAt.toISOString() },
    cookie: sessionCookieHeader(row.id, body.remember_me ? rememberMeMaxAge(expiresAt, deps.now) : null),
    session: row,
  }
}

export async function resolveWebSession(sessionId: string, now = authNow()): Promise<AuthContext | null> {
  const row = await getSessionStore().get(sessionId)
  if (!row || row.expires_at.getTime() <= now.getTime()) {
    return null
  }
  const roles = memberRoles(row.roles)
  if (!roles || roles.length === 0) {
    return null
  }
  try {
    return assertAuthContext({
      accountId: row.account_id,
      roles,
      gender: row.gender,
    })
  } catch {
    return null
  }
}

export function isSlidingRememberMe(expiresAt: Date, lastSeenAt: Date): boolean {
  return expiresAt.getTime() - lastSeenAt.getTime() === FOURTEEN_DAYS_MS
}

export async function refreshRememberMeCookie(cookieHeader: string | undefined): Promise<string | null> {
  const sessionId = readCookie(cookieHeader, SESSION_COOKIE)
  if (!sessionId) {
    return null
  }
  const now = authNow()
  const store = getSessionStore()
  const row = await store.get(sessionId)
  if (!row || row.expires_at.getTime() <= now.getTime()) {
    return null
  }
  if (!isSlidingRememberMe(row.expires_at, row.last_seen_at)) {
    return null
  }
  const expiresAt = new Date(now.getTime() + FOURTEEN_DAYS_MS)
  await store.saveTimes(sessionId, expiresAt, now)
  return sessionCookieHeader(sessionId, rememberMeMaxAge(expiresAt, now))
}
