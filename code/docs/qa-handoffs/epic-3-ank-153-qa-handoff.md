# QA handoff — Staging-only staff grant for ID + liveness

Story ticket [ANK-154](/ANK/issues/ANK-154). Coordination [ANK-153](/ANK/issues/ANK-153). Parent [ANK-97](/ANK/issues/ANK-97) stays open. This is not Epic 4.

## What was built

`POST /v1/staff/verifications/grant` lets a moderator or operator mark one member's ID document and liveness as granted on staging. Human review is not skipped. `review_passed_at` is not written. Phone OTP is not written. After the grant, the existing `publishIfEligible` runs.

The route is on only when both of these are true:

- `STAGING_STAFF_VERIFICATION_GRANT` is exactly `1`
- `ANKANU_PUBLIC_ORIGIN` is exactly `https://staging.ankanu.com`

Any other value, including a trailing slash or a different host, returns **404**. `https://ankanu.com` with the flag set still returns **404**. `NODE_ENV` is not the switch. The api image already sets `NODE_ENV=production` on staging.

`code/compose.yaml` sets `STAGING_STAFF_VERIFICATION_GRANT: "1"` on the api service only. Web and worker do not set it. This ticket does not deploy. The route stays 404 on the current staging process until that compose change is actually running.

## Where

- `code/apps/api/src/staff.controller.ts` — `POST /v1/staff/verifications/grant`
- `code/apps/api/src/staff-verification-grant.ts` — flag, grant, audit, `publishIfEligible`
- `code/apps/api/src/staff-verification-grant.test.ts`
- `code/compose.yaml` — flag on the api service

No screen, HTML, or CSS changed. No Stitch frame was added.

## How the founder uses it on staging

There is no seeded staff user in the repo. Do not put the operator role on the founder's member account. A staff role on that account is refused at `/decouvrir` with `staff_session`.

1. Use a different account whose `roles` include `moderator` or `operator`. Sign in at `https://staging.ankanu.com`. The session cookie name is `ankanu_session`.
2. The member id is that member's `account.id`. Look it up in staging Postgres by the email he already uses. Do not print the address or the cookie in the ticket.

```sql
select id, pseudonym, roles
from account
where email = '<founder-email>';
```

If no moderator or operator exists, put `operator` on a separate account, then sign in as that account:

```sql
update account
set roles = array['operator']
where id = '<staff-account-uuid>';
```

3. Run this from a machine that can reach staging. Replace the two placeholders. Do not commit the cookie.

```bash
curl -sS -b 'ankanu_session=<staff-session-cookie>' \
  -H 'content-type: application/json' \
  -d '{"account_id":"<member-account-uuid>"}' \
  https://staging.ankanu.com/v1/staff/verifications/grant
```

A granted reviewed member with phone OTP already granted returns `200`:

```json
{"account_id":"<member-account-uuid>","id_document":"granted","liveness":"granted","visibility":"public"}
```

`visibility` stays `unpublished` when `review_passed_at` is null, or when phone OTP is not granted, or when visibility was not `unpublished`.

4. Sign out of the staff account. Sign in as the member. Open `https://staging.ankanu.com/decouvrir`.

## How to run the automated check

From `code/`:

```bash
npx vitest run --config vitest.unit.config.ts apps/api/src/staff-verification-grant.test.ts
npx tsc -p apps/api/tsconfig.json --noEmit
```

## Test cases

| Case | Input | Expected |
| --- | --- | --- |
| Flag off | Staff cookie, flag unset, origin `https://staging.ankanu.com`, `NODE_ENV=production` | **404** `NOT_FOUND`. No audit row. No verification row. |
| Production origin | Flag `1`, origin `https://ankanu.com`, `NODE_ENV=production` | **404**. No audit row. |
| Not exact origin | Flag `1`, origin `https://staging.ankanu.com/` or `HTTPS://staging.ankanu.com` | **404**. |
| Anonymous | Flag on, no cookie | **401** `UNAUTHENTICATED` |
| Member | Flag on, member session | **403** `FORBIDDEN` |
| Bad id | Staff, `account_id` not a uuid v7 | **400** `UNHANDLED`, `details.field` `account_id` |
| Missing account | Staff, unknown uuid | **404** `Ce compte est introuvable.` |
| Audit | Operator grant | One `audit_event`: actor is the staff id, action `staff_verification_grant`, payload `account_id`, `action`, `id_document` `granted`, `id_document_id`, `liveness` `granted`, `liveness_id`, `reason` `staging_staff_grant`. No phone. No photo bytes. A second grant writes a second row. `audit_event` has no `created_at`; the row id is the time. |
| Older capture | Two `id_document` rows | Only the latest id becomes `granted`. The older row and its `evidence_uri` stay. |
| Phone OTP | A pending phone row and a later granted phone row | Both stay as they were. |
| Unreviewed | Review not passed, visibility `unpublished` | After grant, visibility stays `unpublished`. `review_passed_at` stays null. `GET /v1/browse` is **403** `viewer_not_listable`. |
| Reviewed | `review_passed_at` set, phone OTP granted, no ID rows, visibility `unpublished` | Grant inserts empty-evidence `id_document` and `liveness` as `granted`. Visibility becomes `public`. `review_passed_at` is unchanged. `GET /v1/accounts/gate` is `{ "step": "account" }`. `/decouvrir` is allowed for step `account`. `GET /v1/browse` is **200** `{ "view": "card" }`. |
| Failed audit | Audit append throws | **500**. The capture statuses roll back. |
| Repeat | Second grant on the reviewed member | Still one `id_document` row and one `liveness` row. Visibility stays `public`. |

Opposite-gender, blur, and staff browse refusal were not edited. A staff session still cannot open `/decouvrir` as a member.

## Test data

Memory accounts from `staff-verification-grant.test.ts`. Password `phrase avec espaces`. Captcha `test-ok`. Gender sister. DOB `1990-01-15`. Clock starts at `2026-10-14T12:00:00.000Z`. Phone on the OTP row is `+22670111222`. Staff roles are set to `operator` or `moderator` after sign-in and do not also have `member`.

## My results

- `staff-verification-grant.test.ts`: 4 passed.
- `tsc -p apps/api/tsconfig.json --noEmit`: passed.
- `oxlint` on the three API files: passed.

## Three validation passes

1. Behavior: flag off and a non-staging origin return 404 before a session check. Members and anonymous callers are rejected when the flag is on. An audit row is written. An unreviewed member stays unpublished. A reviewed member with phone OTP becomes `public`, the gate step becomes `account`, and `GET /v1/browse` returns 200. `review_passed_at` and phone OTP are unchanged.
2. Responsive: no screen was added or edited. There is no new viewport, no horizontal scroll, and no width screenshot. QA has no new frame to measure.
3. Stitch: no AnKanu v2 HTML or PNG was changed. No state tab, demo toggle, or sample profile was added. The grant is the API above, not a new staff screen.

## Solution-design sections followed

SOLUTION-DESIGN §7.1 has no staff verification-grant row. The founder decision on [ANK-154](/ANK/issues/ANK-154) is that sentence. No new table and no new relationship. The grant writes catalogued `verification_record` (`kind` `id_document` and `liveness`, `status` `granted`) and `audit_event` (`actor_id`, payload ids, action, reason). Then it calls the existing `publishIfEligible`. It does not write `review_passed_at` and it does not call profile-review allow or block. Staff auth matches `GET /v1/staff/cases`: a live session whose roles include `moderator` or `operator`. Errors use the AD-7 envelope.

## Stitch files matched

None. No screen was built. These existing frames were not edited:

- `code/design-stitch/ankanu-v2/07-id-liveness/screen.html` and `screen.png`
- `code/design-stitch/ankanu-v2/12-profile-not-yet-public/screen.html` and `screen.png`
- `code/design-stitch/ankanu-v2/57-discover/screen.html`, `screen.png`, `grid.html`, `grid.png`
- `code/design-stitch/ankanu-v2/15-profile-detail/screen.html` and `screen.png`

## Known gaps

- This commit is local until it is pushed. Do not push from this ticket. [ANK-155](/ANK/issues/ANK-155) is the QA ticket. After that pass, Awa opens the GitHub push and staging redeploy. Do not deploy production.
- The route 404s on the current staging process until the api container is recreated with `STAGING_STAFF_VERIFICATION_GRANT=1`.
- A missing ID or liveness row is inserted, so those two ids count toward `rl_verification_upload_per_hour` for that hour.
- The unit tests use the memory stores. They do not open Postgres.
