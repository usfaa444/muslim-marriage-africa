import { and, eq, gt, isNull, sql } from 'drizzle-orm'
import { account, credential, emailVerification } from './account-schema.js'
import { getIdentityDatabase } from './account-store.js'
import type { CreatedAccount, PasswordCredential } from './create-account.js'

export type EmailVerificationRow = {
  id: string
  account_id: string
  token_hash: string
  expires_at: Date
  consumed_at: Date | null
  superseded_at: Date | null
  created_at: Date
}

export type EmailVerificationStore = {
  accountEmail(accountId: string): Promise<string | null>
  passwordVerified(accountId: string): Promise<boolean>
  findByHash(tokenHash: string): Promise<EmailVerificationRow | null>
  supersedeAndInsert(accountId: string, row: EmailVerificationRow): Promise<'inserted' | 'already_verified'>
  markConsumed(id: string, accountId: string, at: Date): Promise<boolean>
}

let override: EmailVerificationStore | undefined

export function setEmailVerificationStore(store: EmailVerificationStore | undefined): void {
  override = store
}

export function getEmailVerificationStore(): EmailVerificationStore {
  if (override) {
    return override
  }
  return postgresEmailVerificationStore()
}

function asDate(value: Date | string | null): Date | null {
  if (value === null) {
    return null
  }
  return value instanceof Date ? value : new Date(value)
}

function postgresEmailVerificationStore(): EmailVerificationStore {
  return {
    async accountEmail(accountId) {
      const rows = await getIdentityDatabase()
        .select({ email: account.email })
        .from(account)
        .where(eq(account.id, accountId))
        .limit(1)
      return rows[0]?.email ?? null
    },
    async passwordVerified(accountId) {
      const rows = await getIdentityDatabase()
        .select({ email_verified_at: credential.email_verified_at })
        .from(credential)
        .where(and(eq(credential.account_id, accountId), eq(credential.kind, 'password')))
      return rows.some((row) => row.email_verified_at !== null && row.email_verified_at !== undefined)
    },
    async findByHash(tokenHash) {
      const rows = await getIdentityDatabase()
        .select()
        .from(emailVerification)
        .where(eq(emailVerification.token_hash, tokenHash))
        .limit(1)
      const row = rows[0]
      if (!row) {
        return null
      }
      return {
        id: row.id,
        account_id: row.account_id,
        token_hash: row.token_hash,
        expires_at: asDate(row.expires_at) ?? new Date(0),
        consumed_at: asDate(row.consumed_at),
        superseded_at: asDate(row.superseded_at),
        created_at: asDate(row.created_at) ?? new Date(0),
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
        if (passwords.some((item) => item.email_verified_at !== null && item.email_verified_at !== undefined)) {
          return 'already_verified' as const
        }
        await tx
          .update(emailVerification)
          .set({ superseded_at: row.created_at })
          .where(
            and(
              eq(emailVerification.account_id, accountId),
              isNull(emailVerification.consumed_at),
              isNull(emailVerification.superseded_at),
            ),
          )
        await tx.insert(emailVerification).values(row)
        return 'inserted' as const
      })
    },
    async markConsumed(id, accountId, at) {
      const database = getIdentityDatabase()
      return database.transaction(async (tx) => {
        const passwords = await tx
          .select({ id: credential.id })
          .from(credential)
          .where(and(eq(credential.account_id, accountId), eq(credential.kind, 'password')))
        if (passwords.length === 0) {
          return false
        }
        const updated = await tx
          .update(emailVerification)
          .set({ consumed_at: at })
          .where(
            and(
              eq(emailVerification.id, id),
              isNull(emailVerification.consumed_at),
              isNull(emailVerification.superseded_at),
              gt(emailVerification.expires_at, at),
            ),
          )
          .returning({ id: emailVerification.id })
        if (updated.length === 0) {
          return false
        }
        await tx
          .update(credential)
          .set({ email_verified_at: at.toISOString() })
          .where(and(eq(credential.account_id, accountId), eq(credential.kind, 'password')))
        return true
      })
    },
  }
}

/** In-memory rows for unit tests. Shares the account create arrays. */
export function memoryEmailVerificationStore(source: {
  accounts: CreatedAccount[]
  credentials: PasswordCredential[]
}): EmailVerificationStore & { rows: EmailVerificationRow[] } {
  const rows: EmailVerificationRow[] = []
  return {
    rows,
    async accountEmail(accountId) {
      return source.accounts.find((row) => row.id === accountId)?.email ?? null
    },
    async passwordVerified(accountId) {
      return source.credentials.some(
        (row) => row.account_id === accountId && row.kind === 'password' && row.email_verified_at !== null,
      )
    },
    async findByHash(tokenHash) {
      return rows.find((row) => row.token_hash === tokenHash) ?? null
    },
    async supersedeAndInsert(accountId, row) {
      const verified = source.credentials.some(
        (item) => item.account_id === accountId && item.kind === 'password' && item.email_verified_at !== null,
      )
      if (verified) {
        return 'already_verified'
      }
      for (const existing of rows) {
        if (existing.account_id === accountId && existing.consumed_at === null && existing.superseded_at === null) {
          existing.superseded_at = row.created_at
        }
      }
      rows.push(row)
      return 'inserted'
    },
    async markConsumed(id, accountId, at) {
      const passwords = source.credentials.filter((row) => row.account_id === accountId && row.kind === 'password')
      if (passwords.length === 0) {
        return false
      }
      const row = rows.find(
        (item) =>
          item.id === id &&
          item.consumed_at === null &&
          item.superseded_at === null &&
          item.expires_at.getTime() > at.getTime(),
      )
      if (!row) {
        return false
      }
      row.consumed_at = at
      const stamp = at.toISOString()
      for (const password of passwords) {
        password.email_verified_at = stamp
      }
      return true
    },
  }
}
