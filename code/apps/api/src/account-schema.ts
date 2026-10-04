import { sql } from 'drizzle-orm'
import { boolean, check, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

/** Identity-owned account. `coc_version` is the Code of conduct version accepted at signup. */
export const account = pgTable(
  'account',
  {
    id: uuid('id').primaryKey(),
    email: text('email').notNull().unique(),
    pseudonym: text('pseudonym').notNull().unique(),
    gender: text('gender').notNull(),
    roles: text('roles').array().notNull(),
    status: text('status').notNull(),
    age_attested: boolean('age_attested').notNull(),
    coc_version: text('coc_version').notNull(),
  },
  (table) => [
    check('account_gender_check', sql`${table.gender} in ('sister', 'brother')`),
    check('account_status_check', sql`${table.status} in ('Active', 'deactivated', 'held')`),
  ],
)

/** Password hash lives here. This story inserts kind `password` only. */
export const credential = pgTable(
  'credential',
  {
    id: uuid('id').primaryKey(),
    account_id: uuid('account_id')
      .notNull()
      .references(() => account.id),
    kind: text('kind').notNull(),
    secret_hash: text('secret_hash'),
    provider_subject: text('provider_subject'),
    email_verified_at: timestamp('email_verified_at', { withTimezone: true, mode: 'string' }),
  },
  (table) => [check('credential_kind_check', sql`${table.kind} in ('password', 'google_oidc', 'apple')`)],
)
