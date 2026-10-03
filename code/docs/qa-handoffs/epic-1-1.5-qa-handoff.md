# Epic 1 Story 1.5 QA handoff

## What was built

Drizzle Kit is the migration runner for `code/apps/api`. One migration creates `operator_config` (`key` text primary key, `value` text not null) and inserts one row per spine key. There is no second config store, no Operator screen, and no staff HTTP route.

## Where

- `code/apps/api/src/operator-config.ts`
- `code/apps/api/drizzle.config.ts`
- `code/apps/api/drizzle/0000_operator_config.sql`
- `code/apps/api/drizzle/meta/_journal.json`
- `code/apps/api/drizzle/meta/0000_snapshot.json`
- `code/apps/api/src/operator-config.migrate.test.ts`
- `code/apps/api/package.json`

## How to run

From `code/`, with Docker available:

```bash
npx vitest run apps/api/src/operator-config.migrate.test.ts
npm run typecheck
npm run lint
```

The test starts a throwaway `postgres:17` container, runs `drizzle-kit migrate` against that empty database, and removes the container. Do not add compose for this story.

## Test cases

| Case | Input | Expected |
| --- | --- | --- |
| Empty database | Postgres 17 with no app tables | `drizzle-kit migrate` creates only `public.operator_config` plus `drizzle.__drizzle_migrations`. One migration row. |
| Seeded keys | Read `operator_config` by `key` | `flag_threshold` `3`; `pack_prices_xof` `1=4900,3=14700,6=29400`; `rl_auth_per_min` `10`; `rl_otp_per_hour` `5`; `rl_invite_per_day` `30`; `rl_report_per_hour` `10`; `rl_pay_per_min` `5`; `rl_browse_per_min` `60`; `brother_invite_quota_premium` `unlimited`; `min_age` `19`; `brother_invite_quota_free` `3`; `daily_message_cap` `10`; `free_review_sla_hours` `24`; `report_sla_hours` `24`; `photo_strike_count` `3`; `photo_strike_block_hours` `24`; `signed_url_ttl_seconds` `60`; `sister_reach_mode` `free_unlimited`. |
| Reach-mode strings | Migration SQL and `operator-config.ts` | Both `free_unlimited` and `same_quota_as_brothers` appear. The row value is `free_unlimited`. A third value on that key fails with SQLSTATE `23514`. Another key may hold other text. |
| Later edit | Update `flag_threshold` to `4` | The new value is in `operator_config`. No second table with a `key` column appears. |
| Premium | `brother_invite_quota_premium` | Stored text is `unlimited`, not `15`. |

## Test data

Throwaway database `ankanu` on Postgres 17, user `ankanu`. No fixtures. The founder strings above are the seed.

## My results

`npx vitest run apps/api/src/operator-config.migrate.test.ts` — 4 passed. `npm run typecheck` passed. `npm run lint` passed.

## Three validation passes

1. Migrate an empty Postgres 17: the test asserts server version `17.`, no public tables before migrate, and only `operator_config` plus the Drizzle migrations table after.
2. Read every seeded key and both reach-mode strings in the SQL and in api code. The check rejects `not_a_locked_mode` for `sister_reach_mode` and allows that text on `daily_message_cap`.
3. Static pass: `npm run typecheck` and `npm run lint`. Api sources do not import `drizzle-orm` migrator or Prisma.

## Solution-design sections

- Entity catalog `operator_config`: `key` text primary key, `value` text not null, no foreign key.
- Owner is operator. This story does not ship `PATCH /v1/staff/config`.
- §14 Deployment: not deployed.
- §15: the founder supplied the previously missing seed strings. Other open questions stay open. `default_preaccept_clear_if_owner_unblurred` was not added.

## Stitch files

None. This story has no screen.

## Known gaps

- `drizzle-kit@0.45.3` is not on npm. The runner is `drizzle-kit` 0.31.11 with `drizzle-orm` 0.45.3.
- No audit row, staff HTTP, compose, Redis, or S3.
- Callers that ignore `brother_invite_quota_premium` when `isEntitled` are later stories.
- This story's commit is local until QA passes. It is not the Epic 1 push already on `main`.
