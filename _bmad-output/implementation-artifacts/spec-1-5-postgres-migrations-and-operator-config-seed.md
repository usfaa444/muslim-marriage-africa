---
title: 'Story 1.5 — Postgres migrations and operator_config seed'
type: 'feature'
created: '2026-10-03'
status: 'draft'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Later stories have no Postgres table to read working numbers from. `code/` has no Drizzle schema, no migration runner, and no `operator_config` rows.

**Approach:** Add Drizzle Kit 0.45.3 as the only migration runner under `code/apps/api`. One migration creates `operator_config` (`key` text primary key, `value` text not null) and inserts one row per spine key. Do not insert `flag_threshold`, `pack_prices_xof`, the six `rl_*` keys, or `brother_invite_quota_premium` until the open questions name the exact `value` text.

## Boundaries & Constraints

**Always:** Owner is operator. Natural key is `key`. Callers read by `key`. No foreign key. Drizzle ORM 0.45.3. PostgreSQL 17. `sister_reach_mode` row value is `free_unlimited`. Both locked strings `free_unlimited` and `same_quota_as_brothers` exist in the migration and in code on day one. Seeds that are already written: `min_age` `19`; `brother_invite_quota_free` `3`; `daily_message_cap` `10`; `free_review_sla_hours` `24`; `report_sla_hours` `24`; `photo_strike_count` `3`; `photo_strike_block_hours` `24`; `signed_url_ttl_seconds` `60`. Numbers live only in this table.

**Never:** A second config table, env fallback, or one column per setting. `cil_ticket` or any other catalog table. Prisma or a second migration runner. Operator HTTP, audit rows, Operator UI, Redis, S3, Dockerfiles, or compose. Premium value `15`. Invented prices or rate-limit numbers. Stitch pixel match. Deploy.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Empty database | Postgres has no app tables | `drizzle-kit migrate` creates `operator_config` and the seeded keys | Migration is the only runner |
| Known seeds | Read by `key` | Values match the Always list. `sister_reach_mode` is `free_unlimited`. Both enum strings are present in the migration | N/A |
| Unstated seeds | Keys named in Open Questions | Rows exist only after those exact values are supplied | Do not insert a guessed value |
| Later edit | A story updates one `value` | The same table holds the new value. No second store | N/A |

</frozen-after-approval>

## Open Questions

- `flag_threshold` — the key is required and no source states the number or the scale. Options: the exact `value` text supplied in the answer (that text is inserted) / leave the key out (fails the spine key list).
- `pack_prices_xof` — PRD §17 gives a band of about 4 900–5 900 XOF/month and forbids a made-up catalog. Options: the exact stored text supplied in the answer, including 1/3/6 month shape if that is the value (inserted verbatim) / leave the key out (fails the required-key list).
- Rate-limit seeds — `rl_auth_per_min`, `rl_otp_per_hour`, `rl_invite_per_day`, `rl_report_per_hour`, `rl_pay_per_min`, `rl_browse_per_min` have no numbers. `rl_invite_per_day` is abuse control, not the Invite quota. Options: six exact integers supplied in that key order (inserted as text) / leave the keys out (fails the AC).
- `brother_invite_quota_premium` — the key must exist, Premium Invite volume is unlimited when `isEntitled`, and `15` is forbidden. The catalog types the value as a number. Options: exact `value` text supplied in the answer, as long as it is not `15` (inserted verbatim) / the text `unlimited` (not a numeric cap; callers must ignore it when `isEntitled`).

## Code Map

- `code/apps/api/package.json` — Nest ESM app. No database driver and no Drizzle. Add `drizzle-orm` 0.45.3 and `drizzle-kit` 0.45.3 here. Do not add compose.
- `code/apps/api/src/app.module.ts` — health controller only. Do not mount staff config routes.
- `code/package.json` — workspaces already include `apps/*`. Test script is `vitest run`. Do not add a second test runner.
- `code/vitest.config.ts` — includes `apps/api/src/**/*.test.ts`. Point a new migration test at that include.
- `code/packages/kernel` — UUID v7. This table uses natural key `key`, not a UUID.
- No `compose.yaml`, no Dockerfile, no `psql` on this machine. Docker exists. Story 1.7 owns compose. Verification may start a throwaway Postgres 17 container. Do not commit that container spec.

## Tasks & Acceptance

**Execution:**
- [ ] `code/apps/api` — Drizzle schema, one migration, seed of the known keys — blocked on the four open questions
- [ ] `code/apps/api` test — migrate an empty Postgres and read every seeded key — so the AC is executed without a second config store

**Acceptance Criteria:**
- Given an empty Postgres, when Drizzle migrate runs, then `operator_config` exists and the spine keys are present with the values this spec locks, including the four answers.
- Given a later story changes one value, when the table is read, then that value lives in `operator_config` and nowhere else.

## Implementation Notes

## Spec Change Log

## Review Triage Log

## Design Notes

`sister_reach_mode` is one row because `key` is the primary key. The current value is `free_unlimited`. The migration check allows only `free_unlimited` and `same_quota_as_brothers` for that key, and the same two strings are exported from api code, so the unused value is not compiled out. `report_sla_hours` is `24` because this pack says to use the 24h report clock when it is not given a different number. `signed_url_ttl_seconds` is `60` because 60 is the only number in the pack and it is the cap.

## Verification

**Commands:**
- From `code/`: the new api migration test against an empty Postgres 17 — expected: known seeds match, both reach-mode strings exist, and no second config table exists.
- From `code/`: `npm run typecheck` and `npm run lint` — expected: pass for the api project.
