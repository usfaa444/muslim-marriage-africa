---
title: 'Create account with pledge and gender'
type: 'feature'
created: '2026-10-04'
status: 'in-review'
route: 'dispatch'
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** A prospective Member cannot create an account with email, password, pseudonym, gender, the sincerity pledge, and the Code of conduct version.

**Approach:** `POST /v1/accounts` writes `account` and a password `credential`. `GET /auth` serves the downloaded Auth screen. Founder sentences on 2026-10-04 settle the five catalog gaps.

## Boundaries & Constraints

**Always:** Store `coc_version` text not null. Reject a missing version. Do not add an accepted-at field. On create, `age_attested` is false. `status` is `Active`. Insert a password credential with an argon2id `secret_hash`. Do not create a profile row. Password is 12 to 128 Unicode characters, spaces allowed, reject only spaces. Render the full `02-auth` screen. Captcha, Google, and the 19+ notice do nothing beyond the layout. The page submits conduct version `FR-089` from the pledge checkbox token.

**Never:** Do not change `age_attested` to nullable. Do not add a status, an account visibility column, or a profile row. Do not check captcha, call Google, or collect date of birth. Do not open `03-age-gate`. Do not mint a session.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
| --- | --- | --- | --- |
| Create | Unused email and pseudonym, pledge accepted, version present, publishable password, gender sister or brother | 201 account, age_attested false, status Active, argon2id credential | N/A |
| Skip pledge | pledge_accepted is not true | No account | 400, field pledge |
| Missing version | blank coc_version | No account | 400, field coc_version |
| Taken email or pseudonym | existing value | No account | 409, that field named |
| Bad password | under 12, over 128, or only spaces | No account | 400, field password |

</frozen-after-approval>

## Code Map

- `code/apps/api/src/create-account.ts` — create rules
- `code/apps/api/src/account-schema.ts` — account and credential tables
- `code/apps/api/drizzle/0001_account_credential.sql` — migration
- `code/apps/web/src/auth-page.ts` — stitch HTML plus signup post
- `code/apps/web/app/auth/route.ts` — GET /auth
- `code/docs/qa-handoffs/epic-2-2.1-qa-handoff.md` — QA handoff

## Tasks & Acceptance

**Execution:**
- [x] `code/apps/api/src/create-account.ts` -- create account and credential -- founder sentences
- [x] `code/apps/web/app/auth/route.ts` -- serve the Auth screen -- stitch layout

**Acceptance Criteria:**
- Given an unused email and pseudonym and an accepted pledge and conduct version, when the client posts `/v1/accounts`, then an account exists with gender sister or brother, age_attested false, status Active, and coc_version stored.
- Given a skipped pledge, when the client submits, then no account is created.
- Given a taken email or pseudonym, when the client submits, then no account is created and the field is named.

## Implementation Notes

Founder answers were applied as written. The page version token is `FR-089` from the pledge checkbox. Verification: unit HTTP tests, auth HTML test, Postgres 17 migrate (4 passed), typecheck, lint, drizzle-kit check.
