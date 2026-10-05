import { eq } from 'drizzle-orm'
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres'
import pg from 'pg'
import { account, credential, profile } from './account-schema.js'
import { operatorConfig } from './operator-config.js'
import {
  AccountUniqueError,
  HELD_STATUS,
  type AccountStore,
  type CreatedAccount,
  type CreatedProfile,
  type PasswordCredential,
} from './create-account.js'

const { Pool } = pg

let override: AccountStore | undefined
let pool: pg.Pool | undefined
let database: NodePgDatabase | undefined

export function setAccountStore(store: AccountStore | undefined): void {
  override = store
}

export function getAccountStore(): AccountStore {
  if (override) {
    return override
  }
  return postgresStore()
}

export async function closeAccountStore(): Promise<void> {
  const current = pool
  pool = undefined
  database = undefined
  if (current) {
    await current.end()
  }
}

function postgresStore(): AccountStore {
  return {
    emailTaken: (email) => exists(account.email, email),
    pseudonymTaken: (pseudonym) => exists(account.pseudonym, pseudonym),
    minAge: readMinAge,
    insert: insertAccount,
  }
}

export function getIdentityDatabase(): NodePgDatabase {
  return db()
}

function db(): NodePgDatabase {
  if (!database) {
    const url = process.env['DATABASE_URL']
    if (!url) {
      throw new Error('DATABASE_URL is required')
    }
    pool = new Pool({ connectionString: url })
    pool.on('error', () => {
      // An idle client error must not crash the API process.
    })
    database = drizzle(pool)
  }
  return database
}

async function exists(column: typeof account.email | typeof account.pseudonym, value: string): Promise<boolean> {
  const rows = await db().select({ id: account.id }).from(account).where(eq(column, value)).limit(1)
  return rows.length > 0
}

function constraintFields(constraint: string | undefined): Array<'email' | 'pseudonym'> {
  if (constraint?.includes('email')) {
    return ['email']
  }
  if (constraint?.includes('pseudonym')) {
    return ['pseudonym']
  }
  return []
}

function readPg(error: unknown): { code?: string; constraint?: string } | undefined {
  let current: unknown = error
  for (let depth = 0; depth < 6 && typeof current === 'object' && current !== null; depth += 1) {
    const record = current as { code?: unknown; constraint?: unknown; cause?: unknown }
    if (typeof record.code === 'string') {
      return {
        code: record.code,
        ...(typeof record.constraint === 'string' ? { constraint: record.constraint } : {}),
      }
    }
    current = record.cause
  }
  return undefined
}

async function readMinAge(): Promise<number | null> {
  const rows = await db()
    .select({ value: operatorConfig.value })
    .from(operatorConfig)
    .where(eq(operatorConfig.key, 'min_age'))
    .limit(1)
  const raw = rows[0]?.value
  if (raw === undefined || !/^[1-9]\d*$/.test(raw)) {
    return null
  }
  const parsed = Number(raw)
  if (!Number.isSafeInteger(parsed)) {
    return null
  }
  return parsed
}

async function insertAccount(row: CreatedAccount, secret: PasswordCredential, created: CreatedProfile): Promise<void> {
  try {
    await db().transaction(async (tx) => {
      await tx.insert(account).values({
        id: row.id,
        email: row.email,
        pseudonym: row.pseudonym,
        gender: row.gender,
        roles: [...row.roles],
        status: row.status,
        age_attested: row.age_attested,
        coc_version: row.coc_version,
      })
      await tx.insert(credential).values({
        id: secret.id,
        account_id: secret.account_id,
        kind: secret.kind,
        secret_hash: secret.secret_hash,
        provider_subject: secret.provider_subject,
        email_verified_at: secret.email_verified_at,
      })
      await tx.insert(profile).values({
        account_id: created.account_id,
        dob: created.dob,
      })
      if (created.visibility === HELD_STATUS) {
        await tx.update(profile).set({ visibility: HELD_STATUS }).where(eq(profile.account_id, created.account_id))
      }
    })
  } catch (error) {
    const pgError = readPg(error)
    if (pgError?.code === '23505') {
      const fields = constraintFields(pgError.constraint)
      if (fields.length > 0) {
        throw new AccountUniqueError(fields)
      }
    }
    throw error
  }
}

/** In-memory store for the account-create tests. Not used when DATABASE_URL is the runtime. */
export function memoryAccountStore(): AccountStore & {
  accounts: CreatedAccount[]
  credentials: PasswordCredential[]
  profiles: CreatedProfile[]
  minAgeValue: number | null
} {
  const accounts: CreatedAccount[] = []
  const credentials: PasswordCredential[] = []
  const profiles: CreatedProfile[] = []
  const state = { minAgeValue: 19 as number | null }
  return {
    accounts,
    credentials,
    profiles,
    get minAgeValue() {
      return state.minAgeValue
    },
    set minAgeValue(value: number | null) {
      state.minAgeValue = value
    },
    async emailTaken(email) {
      return accounts.some((row) => row.email === email)
    },
    async pseudonymTaken(pseudonym) {
      return accounts.some((row) => row.pseudonym === pseudonym)
    },
    async minAge() {
      return state.minAgeValue
    },
    async insert(row, secret, created) {
      const fields: Array<'email' | 'pseudonym'> = []
      if (accounts.some((item) => item.email === row.email)) {
        fields.push('email')
      }
      if (accounts.some((item) => item.pseudonym === row.pseudonym)) {
        fields.push('pseudonym')
      }
      if (fields.length > 0) {
        throw new AccountUniqueError(fields)
      }
      accounts.push(row)
      credentials.push(secret)
      profiles.push({
        account_id: created.account_id,
        dob: created.dob,
        visibility: null,
      })
      if (created.visibility === HELD_STATUS) {
        const stored = profiles[profiles.length - 1]
        if (stored) {
          stored.visibility = HELD_STATUS
        }
      }
    },
  }
}
