import { and, eq, or } from 'drizzle-orm'
import { isUuidV7, type Gender } from '@ankanu/kernel'
import { account, credential, session } from './account-schema.js'
import { getIdentityDatabase } from './account-store.js'
import type { CreatedAccount, PasswordCredential } from './create-account.js'

export type LoginAccount = {
  id: string
  email: string
  pseudonym: string
  gender: Gender
  roles: readonly string[]
  secret_hashes: string[]
}

export type SessionRow = {
  id: string
  account_id: string
  kind: 'web'
  expires_at: Date
  last_seen_at: Date
}

export type ResolvedSession = SessionRow & {
  gender: Gender
  roles: readonly string[]
}

export type SessionStore = {
  findAccounts(identifier: string): Promise<LoginAccount[]>
  insert(row: SessionRow): Promise<void>
  get(id: string): Promise<ResolvedSession | null>
  saveTimes(id: string, expiresAt: Date, lastSeenAt: Date): Promise<void>
}

let override: SessionStore | undefined

export function setSessionStore(store: SessionStore | undefined): void {
  override = store
}

export function getSessionStore(): SessionStore {
  if (override) {
    return override
  }
  return postgresSessionStore()
}

function isGender(value: string): value is Gender {
  return value === 'sister' || value === 'brother'
}

function asDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value)
}

export function memorySessionStore(source: {
  accounts: CreatedAccount[]
  credentials: PasswordCredential[]
}): SessionStore & { sessions: SessionRow[] } {
  const sessions: SessionRow[] = []
  return {
    sessions,
    async findAccounts(identifier) {
      const emailKey = identifier.toLowerCase()
      return source.accounts
        .filter((row) => row.email.toLowerCase() === emailKey || row.pseudonym === identifier)
        .map((row) => ({
          id: row.id,
          email: row.email,
          pseudonym: row.pseudonym,
          gender: row.gender,
          roles: row.roles,
          secret_hashes: source.credentials
            .filter((item) => item.account_id === row.id && item.kind === 'password' && item.secret_hash)
            .map((item) => item.secret_hash),
        }))
    },
    async insert(row) {
      sessions.push(row)
    },
    async get(id) {
      const row = sessions.find((item) => item.id === id)
      if (!row) {
        return null
      }
      const owner = source.accounts.find((item) => item.id === row.account_id)
      if (!owner) {
        return null
      }
      return { ...row, gender: owner.gender, roles: owner.roles }
    },
    async saveTimes(id, expiresAt, lastSeenAt) {
      const row = sessions.find((item) => item.id === id)
      if (!row) {
        return
      }
      row.expires_at = expiresAt
      row.last_seen_at = lastSeenAt
    },
  }
}

function postgresSessionStore(): SessionStore {
  return {
    findAccounts: findAccounts,
    insert: insertSession,
    get: getSession,
    saveTimes: saveTimes,
  }
}

async function findAccounts(identifier: string): Promise<LoginAccount[]> {
  const rows = await getIdentityDatabase()
    .select({
      id: account.id,
      email: account.email,
      pseudonym: account.pseudonym,
      gender: account.gender,
      roles: account.roles,
      secret_hash: credential.secret_hash,
    })
    .from(account)
    .leftJoin(
      credential,
      and(eq(credential.account_id, account.id), eq(credential.kind, 'password')),
    )
    .where(or(eq(account.email, identifier.toLowerCase()), eq(account.pseudonym, identifier)))

  const byId = new Map<string, LoginAccount>()
  for (const row of rows) {
    if (!isGender(row.gender)) {
      continue
    }
    const existing = byId.get(row.id)
    if (!existing) {
      byId.set(row.id, {
        id: row.id,
        email: row.email,
        pseudonym: row.pseudonym,
        gender: row.gender,
        roles: row.roles,
        secret_hashes: row.secret_hash ? [row.secret_hash] : [],
      })
      continue
    }
    if (row.secret_hash) {
      existing.secret_hashes.push(row.secret_hash)
    }
  }
  return [...byId.values()]
}

async function insertSession(row: SessionRow): Promise<void> {
  await getIdentityDatabase().insert(session).values({
    id: row.id,
    account_id: row.account_id,
    kind: row.kind,
    expires_at: row.expires_at,
    last_seen_at: row.last_seen_at,
  })
}

async function getSession(id: string): Promise<ResolvedSession | null> {
  if (!isUuidV7(id)) {
    return null
  }
  const rows = await getIdentityDatabase()
    .select({
      id: session.id,
      account_id: session.account_id,
      kind: session.kind,
      expires_at: session.expires_at,
      last_seen_at: session.last_seen_at,
      gender: account.gender,
      roles: account.roles,
    })
    .from(session)
    .innerJoin(account, eq(account.id, session.account_id))
    .where(eq(session.id, id))
    .limit(1)
  const row = rows[0]
  if (!row || row.kind !== 'web' || !isGender(row.gender)) {
    return null
  }
  return {
    id: row.id,
    account_id: row.account_id,
    kind: 'web',
    expires_at: asDate(row.expires_at),
    last_seen_at: asDate(row.last_seen_at),
    gender: row.gender,
    roles: row.roles,
  }
}

async function saveTimes(id: string, expiresAt: Date, lastSeenAt: Date): Promise<void> {
  if (!isUuidV7(id)) {
    return
  }
  await getIdentityDatabase()
    .update(session)
    .set({ expires_at: expiresAt, last_seen_at: lastSeenAt })
    .where(eq(session.id, id))
}
