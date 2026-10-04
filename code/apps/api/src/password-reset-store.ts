import { and, eq, gt, isNull, ne, sql } from 'drizzle-orm'
import { account, credential, passwordReset, session } from './account-schema.js'
import { getIdentityDatabase } from './account-store.js'
import type { CreatedAccount, PasswordCredential } from './create-account.js'
import type { SessionRow } from './session-store.js'

export type PasswordResetRow = {
  id: string
  account_id: string
  token_hash: string
  expires_at: Date
  consumed_at: Date | null
  superseded_at: Date | null
  created_at: Date
}

export type PasswordResetAccount = {
  account_id: string
  email: string
  verified: boolean
}

export type PasswordResetStore = {
  findAccount(email: string): Promise<PasswordResetAccount | null>
  /** True only for a hash that is unconsumed, unsuperseded, and still after `at`. */
  findUsable(tokenHash: string, at: Date): Promise<boolean>
  supersedeAndInsert(accountId: string, row: PasswordResetRow): Promise<'inserted' | 'not_verified'>
  consume(input: {
    tokenHash: string
    secretHash: string
    session: SessionRow
    at: Date
  }): Promise<boolean>
}

let override: PasswordResetStore | undefined

export function setPasswordResetStore(store: PasswordResetStore | undefined): void {
  override = store
}

export function getPasswordResetStore(): PasswordResetStore {
  if (override) {
    return override
  }
  return postgresPasswordResetStore()
}

function verifiedAt(value: string | null | undefined): boolean {
  return value !== null && value !== undefined
}

export function memoryPasswordResetStore(source: {
  accounts: CreatedAccount[]
  credentials: PasswordCredential[]
  sessions: SessionRow[]
}): PasswordResetStore & { rows: PasswordResetRow[] } {
  const rows: PasswordResetRow[] = []
  return {
    rows,
    async findAccount(email) {
      const owner = source.accounts.find((row) => row.email === email)
      if (!owner) {
        return null
      }
      const passwords = source.credentials.filter((row) => row.account_id === owner.id && row.kind === 'password')
      return {
        account_id: owner.id,
        email: owner.email,
        verified: passwords.some((row) => verifiedAt(row.email_verified_at)),
      }
    },
    async supersedeAndInsert(accountId, row) {
      const verified = source.credentials.some(
        (item) => item.account_id === accountId && item.kind === 'password' && verifiedAt(item.email_verified_at),
      )
      if (!verified) {
        return 'not_verified'
      }
      for (const existing of rows) {
        if (existing.account_id === accountId && existing.consumed_at === null && existing.superseded_at === null) {
          existing.superseded_at = row.created_at
        }
      }
      rows.push(row)
      return 'inserted'
    },
    async findUsable(tokenHash, at) {
      return rows.some(
        (item) =>
          item.token_hash === tokenHash &&
          item.consumed_at === null &&
          item.superseded_at === null &&
          item.expires_at.getTime() > at.getTime(),
      )
    },
    async consume(input) {
      const row = rows.find(
        (item) =>
          item.token_hash === input.tokenHash &&
          item.consumed_at === null &&
          item.superseded_at === null &&
          item.expires_at.getTime() > input.at.getTime(),
      )
      if (!row) {
        return false
      }
      const passwords = source.credentials.filter((item) => item.account_id === row.account_id && item.kind === 'password')
      if (passwords.length === 0) {
        return false
      }
      row.consumed_at = input.at
      for (const password of passwords) {
        password.secret_hash = input.secretHash
      }
      input.session.account_id = row.account_id
      source.sessions.push(input.session)
      for (const existing of source.sessions) {
        if (
          existing.account_id === row.account_id &&
          existing.id !== input.session.id &&
          existing.expires_at.getTime() > input.at.getTime()
        ) {
          existing.expires_at = input.at
        }
      }
      return true
    },
  }
}

function postgresPasswordResetStore(): PasswordResetStore {
  return {
    async findAccount(email) {
      const rows = await getIdentityDatabase()
        .select({
          id: account.id,
          email: account.email,
          email_verified_at: credential.email_verified_at,
          kind: credential.kind,
        })
        .from(account)
        .leftJoin(credential, eq(credential.account_id, account.id))
        .where(eq(account.email, email))
      const first = rows[0]
      if (!first) {
        return null
      }
      return {
        account_id: first.id,
        email: first.email,
        verified: rows.some((row) => row.kind === 'password' && verifiedAt(row.email_verified_at)),
      }
    },
    async supersedeAndInsert(accountId, row) {
      const database = getIdentityDatabase()
      return database.transaction(async (tx) => {
        await tx.execute(sql`select ${account.id} from ${account} where ${account.id} = ${accountId} for update`)
        const passwords = await tx
          .select({ email_verified_at: credential.email_verified_at })
          .from(credential)
          .where(and(eq(credential.account_id, accountId), eq(credential.kind, 'password')))
        if (!passwords.some((item) => verifiedAt(item.email_verified_at))) {
          return 'not_verified' as const
        }
        await tx
          .update(passwordReset)
          .set({ superseded_at: row.created_at })
          .where(
            and(
              eq(passwordReset.account_id, accountId),
              isNull(passwordReset.consumed_at),
              isNull(passwordReset.superseded_at),
            ),
          )
        await tx.insert(passwordReset).values(row)
        return 'inserted' as const
      })
    },
    async findUsable(tokenHash, at) {
      const found = await getIdentityDatabase()
        .select({ id: passwordReset.id })
        .from(passwordReset)
        .where(
          and(
            eq(passwordReset.token_hash, tokenHash),
            isNull(passwordReset.consumed_at),
            isNull(passwordReset.superseded_at),
            gt(passwordReset.expires_at, at),
          ),
        )
        .limit(1)
      return found.length > 0
    },
    async consume(input) {
      const database = getIdentityDatabase()
      return database.transaction(async (tx) => {
        const updated = await tx
          .update(passwordReset)
          .set({ consumed_at: input.at })
          .where(
            and(
              eq(passwordReset.token_hash, input.tokenHash),
              isNull(passwordReset.consumed_at),
              isNull(passwordReset.superseded_at),
              gt(passwordReset.expires_at, input.at),
            ),
          )
          .returning({ account_id: passwordReset.account_id })
        const owner = updated[0]
        if (!owner) {
          return false
        }
        const passwords = await tx
          .update(credential)
          .set({ secret_hash: input.secretHash })
          .where(and(eq(credential.account_id, owner.account_id), eq(credential.kind, 'password')))
          .returning({ id: credential.id })
        if (passwords.length === 0) {
          throw new Error('password credential missing')
        }
        await tx.insert(session).values({
          id: input.session.id,
          account_id: owner.account_id,
          kind: input.session.kind,
          expires_at: input.session.expires_at,
          last_seen_at: input.session.last_seen_at,
        })
        await tx
          .update(session)
          .set({ expires_at: input.at })
          .where(
            and(
              eq(session.account_id, owner.account_id),
              ne(session.id, input.session.id),
              gt(session.expires_at, input.at),
            ),
          )
        return true
      })
    },
  }
}
