---
title: 'Age gate 19+ and suspected-minor hold'
type: 'feature'
created: '2026-10-04'
status: 'draft'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: 'c0a9f0d3c460b118488b04cf82fe9f3e5a48ba4f'
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** A prospective member can create an account with `age_attested` false and `status` Active. Nothing yet blocks a date of birth under 19, and nothing writes a suspected-minor hold.

**Approach:** Founder decisions on [ANK-56](/ANK/issues/ANK-56) are recorded here. The request field is `dob` on `POST /v1/accounts`. The date is stored in `profile.dob`. The response gains no dob field. Under 19, `account.status` is `held` and no profile row is created. A suspected-minor hold in this story sets `verification_record.status` to `held` and `ProfilePort.setVisibility` sets `visibility` to `held`. ID capture, liveness capture, and a new `kind` stay out. The Scaleway footer line and the Loi 010-2004/AN clause come off with nothing in their place. Nothing under `code/` is built until the remaining catalog conflicts are decisions in this block.

## Boundaries & Constraints

**Always:** FR-011 and FR-091. `operator_config.min_age` defaults to 19. Copy does not claim a statute. `/v1` JSON. Envelope `{ error: { code, message, details, request_id, retryable } }`. Screens: `code/design-stitch/ankanu-v2/03-age-gate/screen.html` and `screen.png`. `DESIGN.md` is not the layout. The Stitch success control may keep its alert. It does not navigate. Remove the hosting line that contains Scaleway and Loi 010-2004/AN. Leave the supervision line and the marriage counter.

**Never:** Do not add a dob column on `account`. Do not invent `profile.city`, `profile.country`, or a visibility value on the dob write. Do not ship 18. Do not build SMS OTP (Story 2.7), Google OIDC (Story 2.5), ID or liveness capture (Story 2.8), or a moderator screen. Do not invent member hold chrome (Gap G8). Do not add a `verification_record.kind`. Do not edit the Stitch files or planning docs.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
| --- | --- | --- | --- |
| Under the floor | DOB younger than `operator_config.min_age` (default 19) | `account.status` is `held`. No profile row. Never listed | Dob is not stored, because no profile row is created |
| Adult | DOB at least `min_age` | Date stored in `profile.dob`. Response has no dob field. Stitch eligible state, then the OTP alert | City, country, and visibility are not set. The insert is not possible yet |
| Suspected minor | Hold in this story, without ID or liveness capture | `verification_record.status` is `held`. `setVisibility` sets `visibility` to `held` | `kind` is not named. No new kind may be added |

</frozen-after-approval>

## Open Questions

- Profile insert — `profile.city`, `profile.country`, and `profile.visibility` are NOT NULL. The founder said they are not set, and that `profile.dob` stores the date. Options: founder allows those three columns to be null on this insert / founder names the three values / founder says this story does not insert a profile row (then `profile.dob` is not stored).
- Hold kind — `verification_record.kind` is NOT NULL and only `phone_otp`, `liveness`, or `id_document`. The founder said status is `held`, no new kind, and ID and liveness stay out. Options: the held row uses `kind` `phone_otp` and no SMS is sent / this story does not insert `verification_record` / founder names which existing kind the held row uses.
- Create timing — Auth already posts `POST /v1/accounts` and creates the account before this screen. `dob` is a field on that same POST. Options: Auth does not create the account; the age-gate submit sends the Auth fields plus `dob` / founder names a later write and Auth keeps creating the account.
- `age_attested` — the column is the 19+ gate and signup sets it false. The founder did not mention it. Options: true when the date is at least `min_age`, false when held / leave it false in both cases.

## Code Map

- `code/apps/api/src/create-account.ts` — signup sets `age_attested: false` and `status` `Active`. Do not change it yet.
- `code/apps/api/src/account-schema.ts` — `account` has no dob. Do not add one.
- `code/apps/api/drizzle/0000_operator_config.sql` — `min_age` seeded `19`. No reader yet.
- `code/apps/web/src/auth-page.ts` — signup posts `/v1/accounts` with no dob and stays on Auth.
- `code/apps/web/src/password-reset-page.ts` — strips a Scaleway block on another screen. The age-gate removal is only the hosting line named above.
- `code/design-stitch/ankanu-v2/03-age-gate/screen.html` — day, month, year selects; under-19 state; eligible state; OTP label; alert on continue. Do not edit.
- `code/design-stitch/ankanu-v2/03-age-gate/screen.png` — on disk. Do not edit.
- No `profile` table, `verification_record` table, `VerificationPort`, `ProfilePort`, or age-gate route. Do not add them until the open questions are decisions.

## Tasks & Acceptance

**Execution:**
- [ ] No file under `code/` — wait until every open question is a frozen decision.

**Acceptance Criteria:**
- Given a date of birth younger than `operator_config.min_age` (default 19), when it is submitted, then `account.status` is `held` and the account is never listed.
- Given a suspected minor in this story, when the hold is written, then `verification_record.status` is `held` and `ProfilePort.setVisibility` sets `visibility` to `held`.

## Implementation Notes

## Spec Change Log

## Review Triage Log

## Design Notes

The footer decision is enough to remove one line and not enough to ship the story. A profile insert with `dob` and without `city`, `country`, and `visibility` contradicts the catalog. A `verification_record` row with status `held` still needs a `kind`, and the allowed kinds are either excluded or unnamed. Auth already creates the account on `POST /v1/accounts`, so adding `dob` to that body changes when the account is created unless a later write is named. Footprint until those answers: no application file.
