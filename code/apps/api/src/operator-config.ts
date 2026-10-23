import { sql } from 'drizzle-orm'
import { check, pgTable, text } from 'drizzle-orm/pg-core'

export const free_unlimited = 'free_unlimited'
export const same_quota_as_brothers = 'same_quota_as_brothers'

export type SisterReachMode = typeof free_unlimited | typeof same_quota_as_brothers

/**
 * Fay, 2026-10-23: every Free-tier limit applies the same to Sisters and Brothers; Premium lifts it for both.
 * Migration 0021 moved the seeded row here too. `free_unlimited` stays valid (the Story 4.7 operator switch).
 */
export const DEFAULT_SISTER_REACH_MODE: SisterReachMode = same_quota_as_brothers

export const operatorConfig = pgTable(
  'operator_config',
  {
    key: text('key').primaryKey(),
    value: text('value').notNull(),
  },
  (table) => [
    check(
      'operator_config_sister_reach_mode_check',
      sql`${table.key} <> 'sister_reach_mode' OR ${table.value} IN (${sql.raw(`'${free_unlimited}'`)}, ${sql.raw(`'${same_quota_as_brothers}'`)})`,
    ),
  ],
)
