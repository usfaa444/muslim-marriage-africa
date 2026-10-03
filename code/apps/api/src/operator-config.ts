import { sql } from 'drizzle-orm'
import { check, pgTable, text } from 'drizzle-orm/pg-core'

export const free_unlimited = 'free_unlimited'
export const same_quota_as_brothers = 'same_quota_as_brothers'

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
