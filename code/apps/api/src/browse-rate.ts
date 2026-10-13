import { eq } from 'drizzle-orm'
import { authNow } from './auth-clock.js'
import { takeAuthSlot } from './auth-rate.js'
import { getIdentityDatabase } from './account-store.js'
import { operatorConfig } from './operator-config.js'

let reader: (() => Promise<number | null>) | undefined

export function setBrowseLimitReader(next: (() => Promise<number | null>) | undefined): void {
  reader = next
}

/** Seeded `rl_browse_per_min` is 60. A present database row that is not a positive integer returns null. */
export async function readRlBrowsePerMin(): Promise<number | null> {
  if (reader) {
    return reader()
  }
  if (!process.env['DATABASE_URL']) {
    return 60
  }
  const rows = await getIdentityDatabase()
    .select({ value: operatorConfig.value })
    .from(operatorConfig)
    .where(eq(operatorConfig.key, 'rl_browse_per_min'))
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

/** One bucket per viewer account, through the existing 60-second limiter. */
export function takeBrowseSlot(accountId: string, limit: number, now = authNow()): boolean {
  return takeAuthSlot(`browse:${accountId}`, limit, now)
}
