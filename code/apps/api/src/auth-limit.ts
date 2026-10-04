import { eq } from 'drizzle-orm'
import { getIdentityDatabase } from './account-store.js'
import { operatorConfig } from './operator-config.js'

let reader: (() => Promise<number | null>) | undefined

export function setAuthLimitReader(next: (() => Promise<number | null>) | undefined): void {
  reader = next
}

/**
 * Published auth limit. Without `DATABASE_URL` the seeded value is 10.
 * A present database row that is not a positive integer returns null.
 */
export async function readRlAuthPerMin(): Promise<number | null> {
  if (reader) {
    return reader()
  }
  if (!process.env['DATABASE_URL']) {
    return 10
  }
  const rows = await getIdentityDatabase()
    .select({ value: operatorConfig.value })
    .from(operatorConfig)
    .where(eq(operatorConfig.key, 'rl_auth_per_min'))
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
