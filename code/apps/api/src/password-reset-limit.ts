import { eq } from 'drizzle-orm'
import { getIdentityDatabase } from './account-store.js'
import { operatorConfig } from './operator-config.js'

let reader: (() => Promise<number | null>) | undefined

export function setPasswordResetLimitReader(next: (() => Promise<number | null>) | undefined): void {
  reader = next
}

/**
 * `rl_password_reset_per_min`. Without `DATABASE_URL` the seeded value is 5.
 * A present database row that is not a positive integer returns null.
 */
export async function readRlPasswordResetPerMin(): Promise<number | null> {
  if (reader) {
    return reader()
  }
  if (!process.env['DATABASE_URL']) {
    return 5
  }
  const rows = await getIdentityDatabase()
    .select({ value: operatorConfig.value })
    .from(operatorConfig)
    .where(eq(operatorConfig.key, 'rl_password_reset_per_min'))
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
