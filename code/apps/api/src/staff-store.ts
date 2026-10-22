import { and, eq, gt, isNull, lt, or } from 'drizzle-orm'
import { isUuidV7, newId } from '@ankanu/kernel'
import type { AuditAppend } from '@ankanu/ports'
import { account, credential, session, staffCredential } from './account-schema.js'
import { getIdentityDatabase } from './account-store.js'
import { getAuditPort } from './audit-port.js'
import { authNow } from './auth-clock.js'

/** Staff session progress. Only `done` is a usable staff session. */
export type StaffMfaState = 'password_change' | 'enroll' | 'verify' | 'done'

export const STAFF_ROLES = ['moderator', 'operator'] as const
export type StaffRole = (typeof STAFF_ROLES)[number]

export type StaffAccountRow = {
  id: string
  email: string
  pseudonym: string
  roles: string[]
  status: string
  password_hash: string | null
}

export type StaffCredentialRow = {
  account_id: string
  must_change_password: boolean
  totp_sealed: string | null
  totp_pending_sealed: string | null
  totp_enrolled_at: Date | null
  totp_last_step: number | null
  failed_codes: number
  locked_until: Date | null
  created_at: Date
}

export type StaffSessionRow = {
  id: string
  account_id: string
  expires_at: Date
  last_seen_at: Date
  mfa_state: StaffMfaState
}

export type StaffSessionView = StaffSessionRow & {
  email: string
  roles: string[]
  status: string
}

export type StaffCredentialPatch = Partial<Omit<StaffCredentialRow, 'account_id' | 'created_at'>>

export type StaffStore = {
  /** The staff account and its factors, or null when the email has no staff credential. */
  findByEmail(email: string): Promise<{ account: StaffAccountRow; credential: StaffCredentialRow } | null>
  findById(accountId: string): Promise<{ account: StaffAccountRow; credential: StaffCredentialRow } | null>
  emailTaken(email: string): Promise<boolean>
  create(row: StaffAccountRow & { password_hash: string }, factors: StaffCredentialRow, audit: AuditAppend): Promise<void>
  updateCredential(accountId: string, patch: StaffCredentialPatch, audits?: AuditAppend[]): Promise<void>
  /** Writes `patch` with `totp_last_step = step` only while the stored step is lower. False when another call won. */
  consumeStep(accountId: string, step: number, patch: StaffCredentialPatch, audits: AuditAppend[]): Promise<boolean>
  setPassword(accountId: string, passwordHash: string, audit: AuditAppend): Promise<void>
  disable(accountId: string, now: Date, audit: AuditAppend): Promise<void>
  insertSession(row: StaffSessionRow): Promise<void>
  getSession(id: string): Promise<StaffSessionView | null>
  updateSession(id: string, patch: Partial<Pick<StaffSessionRow, 'expires_at' | 'last_seen_at' | 'mfa_state'>>): Promise<void>
  /** Ends every live staff session of the account. */
  endSessions(accountId: string, now: Date): Promise<void>
  audit(input: AuditAppend): Promise<void>
}

let override: StaffStore | undefined

export function setStaffStore(store: StaffStore | undefined): void {
  override = store
}

const NO_STAFF: StaffStore = emptyStore()

/** Without an override and without `DATABASE_URL` there are no staff accounts and no staff sessions. */
export function getStaffStore(): StaffStore {
  if (override) {
    return override
  }
  if (!process.env['DATABASE_URL']) {
    return NO_STAFF
  }
  return postgresStaffStore()
}

function emptyStore(): StaffStore {
  const refuse = async (): Promise<never> => {
    throw new Error('staff store requires DATABASE_URL')
  }
  return {
    findByEmail: async () => null,
    findById: async () => null,
    emailTaken: refuse,
    create: refuse,
    updateCredential: refuse,
    consumeStep: refuse,
    setPassword: refuse,
    disable: refuse,
    insertSession: refuse,
    getSession: async () => null,
    updateSession: refuse,
    endSessions: refuse,
    audit: refuse,
  }
}

export type MemoryStaffStore = StaffStore & {
  accounts: StaffAccountRow[]
  credentials: StaffCredentialRow[]
  sessions: StaffSessionRow[]
}

const unusedSql = (): never => {
  throw new Error('memory staff store transaction is not a SQL handle')
}
/** Shaped like a caller transaction so audit ports that check for one accept memory writes. */
const MEMORY_TX = Object.freeze({ insert: unusedSql, select: unusedSql, execute: unusedSql, update: unusedSql })

/** `memberEmailTaken` lets a test share the member account store's emails, as the one Postgres table does. */
export function memoryStaffStore(options: { memberEmailTaken?: (email: string) => Promise<boolean> } = {}): MemoryStaffStore {
  const accounts: StaffAccountRow[] = []
  const credentials: StaffCredentialRow[] = []
  const sessions: StaffSessionRow[] = []
  const pair = (row: StaffAccountRow | undefined) => {
    if (!row) {
      return null
    }
    const factors = credentials.find((item) => item.account_id === row.id)
    return factors ? { account: { ...row }, credential: { ...factors } } : null
  }
  const audits = async (list: AuditAppend[] = []) => {
    for (const item of list) {
      await getAuditPort().append(MEMORY_TX, item)
    }
  }
  return {
    accounts,
    credentials,
    sessions,
    async findByEmail(email) {
      return pair(accounts.find((row) => row.email === email.toLowerCase()))
    },
    async findById(accountId) {
      return pair(accounts.find((row) => row.id === accountId))
    },
    async emailTaken(email) {
      if (accounts.some((row) => row.email === email.toLowerCase())) {
        return true
      }
      return (await options.memberEmailTaken?.(email.toLowerCase())) ?? false
    },
    async create(row, factors, audit) {
      accounts.push({ ...row, roles: [...row.roles] })
      credentials.push({ ...factors })
      await audits([audit])
    },
    async updateCredential(accountId, patch, list) {
      const row = credentials.find((item) => item.account_id === accountId)
      if (row) {
        Object.assign(row, patch)
      }
      await audits(list)
    },
    async consumeStep(accountId, step, patch, list) {
      const row = credentials.find((item) => item.account_id === accountId)
      if (!row || (row.totp_last_step !== null && row.totp_last_step >= step)) {
        return false
      }
      Object.assign(row, patch, { totp_last_step: step })
      await audits(list)
      return true
    },
    async setPassword(accountId, passwordHash, audit) {
      const row = accounts.find((item) => item.id === accountId)
      if (row) {
        row.password_hash = passwordHash
      }
      const factors = credentials.find((item) => item.account_id === accountId)
      if (factors) {
        factors.must_change_password = false
      }
      await audits([audit])
    },
    async disable(accountId, now, audit) {
      const row = accounts.find((item) => item.id === accountId)
      if (row) {
        row.status = 'deactivated'
      }
      endAll(sessions, accountId, now)
      await audits([audit])
    },
    async insertSession(row) {
      sessions.push({ ...row })
    },
    async getSession(id) {
      const row = sessions.find((item) => item.id === id)
      const owner = row ? accounts.find((item) => item.id === row.account_id) : undefined
      if (!row || !owner) {
        return null
      }
      return { ...row, email: owner.email, roles: [...owner.roles], status: owner.status }
    },
    async updateSession(id, patch) {
      const row = sessions.find((item) => item.id === id)
      if (row) {
        Object.assign(row, patch)
      }
    },
    async endSessions(accountId, now) {
      endAll(sessions, accountId, now)
    },
    async audit(input) {
      await audits([input])
    },
  }
}

function endAll(sessions: StaffSessionRow[], accountId: string, now: Date): void {
  for (const row of sessions) {
    if (row.account_id === accountId && row.expires_at.getTime() > now.getTime()) {
      row.expires_at = now
    }
  }
}

function isMfaState(value: string | null): value is StaffMfaState {
  return value === 'password_change' || value === 'enroll' || value === 'verify' || value === 'done'
}

function asDate(value: Date | string | null): Date | null {
  if (value === null) {
    return null
  }
  return value instanceof Date ? value : new Date(value)
}

function postgresStaffStore(): StaffStore {
  const db = () => getIdentityDatabase()

  async function load(where: ReturnType<typeof eq>) {
    const rows = await db()
      .select({
        id: account.id,
        email: account.email,
        pseudonym: account.pseudonym,
        roles: account.roles,
        status: account.status,
        password_hash: credential.secret_hash,
        factors: staffCredential,
      })
      .from(account)
      .innerJoin(staffCredential, eq(staffCredential.account_id, account.id))
      .leftJoin(credential, and(eq(credential.account_id, account.id), eq(credential.kind, 'password')))
      .where(where)
      .limit(2)
    const row = rows[0]
    if (!row || rows.length !== 1) {
      return null
    }
    return {
      account: {
        id: row.id,
        email: row.email,
        pseudonym: row.pseudonym,
        roles: row.roles,
        status: row.status,
        password_hash: row.password_hash,
      },
      credential: {
        ...row.factors,
        totp_enrolled_at: asDate(row.factors.totp_enrolled_at),
        locked_until: asDate(row.factors.locked_until),
        created_at: asDate(row.factors.created_at) ?? new Date(0),
        totp_last_step: row.factors.totp_last_step === null ? null : Number(row.factors.totp_last_step),
      },
    }
  }

  return {
    findByEmail: (email) => load(eq(account.email, email.toLowerCase())),
    findById: (accountId) => (isUuidV7(accountId) ? load(eq(account.id, accountId)) : Promise.resolve(null)),
    async emailTaken(email) {
      const rows = await db().select({ id: account.id }).from(account).where(eq(account.email, email.toLowerCase())).limit(1)
      return rows.length > 0
    },
    async create(row, factors, audit) {
      await db().transaction(async (tx) => {
        await tx.insert(account).values({
          id: row.id,
          email: row.email.toLowerCase(),
          pseudonym: row.pseudonym,
          gender: 'none',
          roles: row.roles,
          status: row.status,
          age_attested: true,
          coc_version: 'staff',
          civil_given_name: '',
          civil_family_name: '',
        })
        await tx.insert(credential).values({
          id: newId(authNow()),
          account_id: row.id,
          kind: 'password',
          secret_hash: row.password_hash,
          provider_subject: null,
          email_verified_at: null,
        })
        await tx.insert(staffCredential).values(factors)
        await getAuditPort().append(tx, audit)
      })
    },
    async updateCredential(accountId, patch, audits = []) {
      await db().transaction(async (tx) => {
        await tx.update(staffCredential).set(patch).where(eq(staffCredential.account_id, accountId))
        for (const item of audits) {
          await getAuditPort().append(tx, item)
        }
      })
    },
    async consumeStep(accountId, step, patch, audits) {
      return db().transaction(async (tx) => {
        const updated = await tx
          .update(staffCredential)
          .set({ ...patch, totp_last_step: step })
          .where(
            and(
              eq(staffCredential.account_id, accountId),
              or(isNull(staffCredential.totp_last_step), lt(staffCredential.totp_last_step, step)),
            ),
          )
          .returning({ account_id: staffCredential.account_id })
        if (updated.length !== 1) {
          return false
        }
        for (const item of audits) {
          await getAuditPort().append(tx, item)
        }
        return true
      })
    },
    async setPassword(accountId, passwordHash, audit) {
      await db().transaction(async (tx) => {
        await tx
          .update(credential)
          .set({ secret_hash: passwordHash })
          .where(and(eq(credential.account_id, accountId), eq(credential.kind, 'password')))
        await tx.update(staffCredential).set({ must_change_password: false }).where(eq(staffCredential.account_id, accountId))
        await getAuditPort().append(tx, audit)
      })
    },
    async disable(accountId, now, audit) {
      await db().transaction(async (tx) => {
        await tx.update(account).set({ status: 'deactivated' }).where(eq(account.id, accountId))
        await tx
          .update(session)
          .set({ expires_at: now })
          .where(and(eq(session.account_id, accountId), eq(session.kind, 'staff'), gt(session.expires_at, now)))
        await getAuditPort().append(tx, audit)
      })
    },
    async insertSession(row) {
      await db().insert(session).values({
        id: row.id,
        account_id: row.account_id,
        kind: 'staff',
        expires_at: row.expires_at,
        last_seen_at: row.last_seen_at,
        mfa_state: row.mfa_state,
      })
    },
    async getSession(id) {
      if (!isUuidV7(id)) {
        return null
      }
      const rows = await db()
        .select({
          id: session.id,
          account_id: session.account_id,
          kind: session.kind,
          expires_at: session.expires_at,
          last_seen_at: session.last_seen_at,
          mfa_state: session.mfa_state,
          email: account.email,
          roles: account.roles,
          status: account.status,
        })
        .from(session)
        .innerJoin(account, eq(account.id, session.account_id))
        .where(eq(session.id, id))
        .limit(1)
      const row = rows[0]
      if (!row || row.kind !== 'staff' || !isMfaState(row.mfa_state)) {
        return null
      }
      return {
        id: row.id,
        account_id: row.account_id,
        expires_at: asDate(row.expires_at) ?? new Date(0),
        last_seen_at: asDate(row.last_seen_at) ?? new Date(0),
        mfa_state: row.mfa_state,
        email: row.email,
        roles: row.roles,
        status: row.status,
      }
    },
    async updateSession(id, patch) {
      if (!isUuidV7(id)) {
        return
      }
      await db().update(session).set(patch).where(and(eq(session.id, id), eq(session.kind, 'staff')))
    },
    async endSessions(accountId, now) {
      await db()
        .update(session)
        .set({ expires_at: now })
        .where(and(eq(session.account_id, accountId), eq(session.kind, 'staff'), gt(session.expires_at, now)))
    },
    async audit(input) {
      await db().transaction(async (tx) => {
        await getAuditPort().append(tx, input)
      })
    },
  }
}
