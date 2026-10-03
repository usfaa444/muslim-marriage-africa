---
title: 'Story 1.5 — Postgres migrations and operator_config seed'
type: 'feature'
created: '2026-10-03'
status: 'done'
baseline_commit: '2c725dc16fad16c4983b7079a23a3ca1dd7012f4'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Later stories have no Postgres table to read working numbers from. `code/` has no Drizzle schema, no migration runner, and no `operator_config` rows.

**Approach:** Add Drizzle Kit 0.45.3 as the only migration runner under `code/apps/api`. One migration creates `operator_config` (`key` text primary key, `value` text not null) and inserts one row per spine key. Founder defaults, inserted verbatim, admins may change later. Do not rewrite planning docs.

## Boundaries & Constraints

**Always:** Owner is operator. Natural key is `key`. Callers read by `key`. No foreign key. Drizzle ORM 0.45.3. PostgreSQL 17. `sister_reach_mode` row value is `free_unlimited`. Both locked strings `free_unlimited` and `same_quota_as_brothers` exist in the migration and in code on day one. Numbers live only in this table. Founder value text: `flag_threshold` `3`; `pack_prices_xof` `1=4900,3=14700,6=29400`; `rl_auth_per_min` `10`; `rl_otp_per_hour` `5`; `rl_invite_per_day` `30` (abuse control, not the free Invite quota of 3); `rl_report_per_hour` `10`; `rl_pay_per_min` `5`; `rl_browse_per_min` `60`; `brother_invite_quota_premium` `unlimited` (not `15`; callers ignore it when `isEntitled`). Also: `min_age` `19`; `brother_invite_quota_free` `3`; `daily_message_cap` `10`; `free_review_sla_hours` `24`; `report_sla_hours` `24`; `photo_strike_count` `3`; `photo_strike_block_hours` `24`; `signed_url_ttl_seconds` `60`.

**Never:** A second config table, env fallback, or one column per setting. `cil_ticket` or any other catalog table. Prisma or a second migration runner, including the Drizzle ORM migrator. Operator HTTP, audit rows, Operator UI, Redis, S3, Dockerfiles, or compose. Premium value `15`. Stitch pixel match. Planning-doc edits. Deploy.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Empty database | Postgres has no app tables | `drizzle-kit migrate` creates `operator_config` and the seeded keys | Migration is the only runner |
| Known seeds | Read by `key` | Values match the Always list. `sister_reach_mode` is `free_unlimited`. Both enum strings are present in the migration and in api code | N/A |
| Later edit | A story updates one `value` | The same table holds the new value. No second store | N/A |
| Reach mode | Value other than the two locked strings | The migration rejects it | Check on `sister_reach_mode` only |

</frozen-after-approval>

## Code Map

- `code/apps/api/package.json` — add `drizzle-orm` 0.45.3, `drizzle-kit` 0.45.3, and `pg`. Do not add Prisma or compose.
- `code/apps/api/src/app.module.ts` — health controller only. Do not mount staff config routes.
- `code/apps/api/src/main.ts` and `worker-shell.ts` — leave unchanged. Story 1.6 owns Redis.
- `code/package.json` — workspaces already include `apps/*`. Test script is `vitest run`. Do not add a second test runner.
- `code/vitest.config.ts` — already includes `apps/api/src/**/*.test.ts`.
- `code/packages/kernel` — UUID v7. This table uses natural key `key`, not a UUID. Do not change the kernel.
- `code/apps/web` — leave unchanged. This story has no UI.
- No `compose.yaml` and no Dockerfile. Docker may start a throwaway Postgres 17 for the test. Do not commit that container spec.

## Tasks & Acceptance

**Execution:**
- [x] `code/apps/api` — Drizzle schema, drizzle-kit config, one migration, seed of every Always key — so later stories alter this table only
- [x] `code/apps/api` — export `free_unlimited` and `same_quota_as_brothers` — so the unused mode is not compiled out
- [x] `code/apps/api/src/operator-config.migrate.test.ts` — `drizzle-kit migrate` on an empty Postgres 17, then read every key — so the AC is executed without a second config store

**Acceptance Criteria:**
- Given an empty Postgres, when `drizzle-kit migrate` runs, then `operator_config` exists and every Always key is present with that value text.
- Given a later story changes one value, when the table is read, then that value lives in `operator_config` and nowhere else.

## Implementation Notes

- `drizzle-kit@0.45.3` is not published. The runner is `drizzle-kit` 0.31.11, the current release, with `drizzle-orm` 0.45.3. The test shells out to `drizzle-kit migrate` and does not import the ORM migrator.
- One SQL migration creates `operator_config` and inserts the founder strings. `sister_reach_mode` is one row, `free_unlimited`. The check allows only `free_unlimited` and `same_quota_as_brothers`.
- Verified: `npx vitest run apps/api/src/operator-config.migrate.test.ts` — 4 passed on Postgres 17. `npm run typecheck` passed. `npm run lint` passed.
- `pg` is `8.23.1`. `@types/pg` `8.23.1` is a devDependency so the migration test typechecks. Founder numbers are inserted only by `drizzle/0000_operator_config.sql`.

## Spec Change Log

## Review Triage Log

## Design Notes

`sister_reach_mode` is one row because `key` is the primary key. The current value is `free_unlimited`. The migration check allows only `free_unlimited` and `same_quota_as_brothers` for that key, and the same two strings are exported from api code. `pack_prices_xof` is the founder string `1=4900,3=14700,6=29400` with no discount math in code. `brother_invite_quota_premium` is the text `unlimited`. The test applies SQL with `drizzle-kit migrate` only. `pg` reads the rows. The ORM migrator is not called.

## Verification

**Commands:**
- From `code/`: the new api migration test against an empty Postgres 17 — expected: every Always value matches, both reach-mode strings exist in the migration and in api code, and no second config table exists.
- From `code/`: `npm run typecheck` and `npm run lint` — expected: pass.
