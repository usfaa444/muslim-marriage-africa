import { eq } from 'drizzle-orm'
import { pinLock } from './account-schema.js'
import { getIdentityDatabase } from './account-store.js'

export type PinLockRow = {
  id: string
  account_id: string
  pin_hash: string
}

export type PinLockStore = {
  findByAccount(accountId: string): Promise<PinLockRow | null>
  save(accountId: string, pinHash: string, id: string): Promise<void>
}

let override: PinLockStore | undefined

export function setPinLockStore(store: PinLockStore | undefined): void {
  override = store
}

export function getPinLockStore(): PinLockStore {
  if (override) {
    return override
  }
  return postgresPinLockStore()
}

export function memoryPinLockStore(): PinLockStore & { rows: PinLockRow[] } {
  const rows: PinLockRow[] = []
  return {
    rows,
    async findByAccount(accountId) {
      return rows.find((row) => row.account_id === accountId) ?? null
    },
    async save(accountId, pinHash, id) {
      const existing = rows.find((row) => row.account_id === accountId)
      if (existing) {
        existing.pin_hash = pinHash
        return
      }
      rows.push({ id, account_id: accountId, pin_hash: pinHash })
    },
  }
}

function postgresPinLockStore(): PinLockStore {
  return {
    async findByAccount(accountId) {
      const rows = await getIdentityDatabase()
        .select({
          id: pinLock.id,
          account_id: pinLock.account_id,
          pin_hash: pinLock.pin_hash,
        })
        .from(pinLock)
        .where(eq(pinLock.account_id, accountId))
        .limit(1)
      return rows[0] ?? null
    },
    async save(accountId, pinHash, id) {
      const existing = await getIdentityDatabase()
        .select({ id: pinLock.id })
        .from(pinLock)
        .where(eq(pinLock.account_id, accountId))
        .limit(1)
      if (existing[0]) {
        await getIdentityDatabase()
          .update(pinLock)
          .set({ pin_hash: pinHash })
          .where(eq(pinLock.account_id, accountId))
        return
      }
      await getIdentityDatabase().insert(pinLock).values({
        id,
        account_id: accountId,
        pin_hash: pinHash,
      })
    },
  }
}
