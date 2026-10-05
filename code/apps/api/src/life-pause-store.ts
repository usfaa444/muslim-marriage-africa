import { and, eq, inArray } from 'drizzle-orm'
import { account } from './account-schema.js'
import { getIdentityDatabase } from './account-store.js'
import { ACTIVE_STATUS, DEACTIVATED_STATUS, HELD_STATUS, PENDING_DELETION_STATUS } from './create-account.js'
import { isAccountStatus, type AccountStatus } from './life-pause.js'

export type LifePauseWrite = 'updated' | 'held' | 'missing' | 'pending_deletion'

export type LifePauseStore = {
  read(accountId: string): Promise<AccountStatus | null>
  setDeactivated(accountId: string): Promise<LifePauseWrite>
  setActive(accountId: string): Promise<LifePauseWrite>
}

type StatusRow = { id: string; status: string }

let override: LifePauseStore | undefined

export function setLifePauseStore(store: LifePauseStore | undefined): void {
  override = store
}

export function getLifePauseStore(): LifePauseStore {
  if (override) {
    return override
  }
  return postgresLifePauseStore()
}

/** Identity read for this story's GET and for later discovery, invite, and chat stories. */
export async function readAccountStatus(accountId: string): Promise<AccountStatus | null> {
  return getLifePauseStore().read(accountId)
}

export function memoryLifePauseStore(accounts: StatusRow[]): LifePauseStore {
  return {
    async read(accountId) {
      const row = accounts.find((item) => item.id === accountId)
      if (!row || !isAccountStatus(row.status)) {
        return null
      }
      return row.status
    },
    setDeactivated: (accountId) => writeStatus(accounts, accountId, DEACTIVATED_STATUS, [ACTIVE_STATUS, DEACTIVATED_STATUS]),
    setActive: (accountId) => writeStatus(accounts, accountId, ACTIVE_STATUS, [DEACTIVATED_STATUS, ACTIVE_STATUS]),
  }
}

async function writeStatus(
  accounts: StatusRow[],
  accountId: string,
  next: typeof ACTIVE_STATUS | typeof DEACTIVATED_STATUS,
  allowed: readonly string[],
): Promise<LifePauseWrite> {
  const row = accounts.find((item) => item.id === accountId)
  if (!row) {
    return 'missing'
  }
  if (row.status === PENDING_DELETION_STATUS) {
    return 'pending_deletion'
  }
  if (row.status === HELD_STATUS) {
    return 'held'
  }
  if (!allowed.includes(row.status)) {
    return 'missing'
  }
  row.status = next
  return 'updated'
}

function postgresLifePauseStore(): LifePauseStore {
  return {
    read: readStatus,
    setDeactivated: (accountId) =>
      writeConditional(accountId, DEACTIVATED_STATUS, [ACTIVE_STATUS, DEACTIVATED_STATUS]),
    setActive: (accountId) => writeConditional(accountId, ACTIVE_STATUS, [DEACTIVATED_STATUS, ACTIVE_STATUS]),
  }
}

async function readStatus(accountId: string): Promise<AccountStatus | null> {
  const rows = await getIdentityDatabase()
    .select({ status: account.status })
    .from(account)
    .where(eq(account.id, accountId))
    .limit(1)
  const status = rows[0]?.status
  if (!status || !isAccountStatus(status)) {
    return null
  }
  return status
}

async function writeConditional(
  accountId: string,
  next: typeof ACTIVE_STATUS | typeof DEACTIVATED_STATUS,
  allowed: Array<typeof ACTIVE_STATUS | typeof DEACTIVATED_STATUS>,
): Promise<LifePauseWrite> {
  const updated = await getIdentityDatabase()
    .update(account)
    .set({ status: next })
    .where(and(eq(account.id, accountId), inArray(account.status, allowed)))
    .returning({ status: account.status })
  if (updated.length > 0) {
    return 'updated'
  }
  const current = await readStatus(accountId)
  if (current === PENDING_DELETION_STATUS) {
    return 'pending_deletion'
  }
  if (current === HELD_STATUS) {
    return 'held'
  }
  return 'missing'
}
