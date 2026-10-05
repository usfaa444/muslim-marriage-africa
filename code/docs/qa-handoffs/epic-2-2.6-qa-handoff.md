# Epic 2 Story 2.6 QA handoff

## What was built

The account is created on the age-gate submit, not on the Auth screen. Auth stores the existing signup fields in `sessionStorage` under `ankanu.signup` and opens `/age-gate`. The password is not put in the URL. `POST /v1/accounts` takes those fields plus `dob`. A second post with the same email still returns 409 and does not insert a second profile.

`dob` is `YYYY-MM-DD`. It is stored in `profile.dob`. The response has no `dob` and no profile object. The insert writes `account_id` and `dob` only. `city`, `country`, and `visibility` stay null on that insert. A held account then sets `profile.visibility` to `held`.

Age is completed years in UTC, using the same clock as the rest of auth (`authNow()`). Burkina Faso is UTC+0. A date that is not a real calendar date is rejected. Younger than `operator_config.min_age` means `age < min_age`. The seeded value is `19`. The server reads that integer. It does not substitute 18 or 19 when the row is missing or not a positive integer.

An adult (`age >= min_age`) is `status` `Active` and `age_attested` true. The profile `visibility` stays null. Under the minimum, the account is still created: `status` `held`, `age_attested` false, then `visibility` `held`. No `verification_record` row is inserted. No SMS is sent. ID and liveness stay out.

A missing, blank, or impossible `dob` is 400 `UNHANDLED`, `details.field` `dob`, message `dob : une date de naissance est requise.`, and creates nothing. An unreadable `min_age` is 503 `UNHANDLED`, `details.field` `min_age`, message `min_age : la configuration est illisible.`, `retryable` true, and creates nothing. Password rules are still checked before `dob`, so a bad password names `password`.

`GET /age-gate` serves `code/design-stitch/12-age-gate/screen.html`. The served HTML removes the Scaleway / Loi 010-2004/AN line and puts nothing in its place. The supervision line and the marriage counter stay. The Stitch files are not edited. The injected script replaces `handleContinue`. A disabled button does nothing. An enabled button posts the draft plus `dob`. A 201 with `status` `held` shows `#stateUnderage` and does not alert. Any other 201 removes the draft and alerts `Redirection vers la passerelle OTP SMS d'AnKanu Burkina Faso.` It does not navigate. The Google button on Auth stays visible and does not navigate.

## Where

- `code/apps/api/src/account-schema.ts`
- `code/apps/api/src/account-store.ts`
- `code/apps/api/src/create-account.ts`
- `code/apps/api/src/accounts.controller.ts`
- `code/apps/api/src/create-account.test.ts`
- `code/apps/api/src/create-session.test.ts`
- `code/apps/api/src/email-verification.test.ts`
- `code/apps/api/src/password-reset.test.ts`
- `code/apps/api/src/operator-config.migrate.test.ts`
- `code/apps/api/drizzle/0005_profile.sql`
- `code/apps/api/drizzle/meta/0005_snapshot.json`
- `code/apps/api/drizzle/meta/_journal.json`
- `code/apps/web/src/auth-page.ts`
- `code/apps/web/src/auth-page.test.ts`
- `code/apps/web/src/age-gate-page.ts`
- `code/apps/web/src/age-gate-page.test.ts`
- `code/apps/web/app/age-gate/route.ts`
- `code/apps/web/Dockerfile`

## How to run

From `code/`:

```bash
npx vitest run --config vitest.unit.config.ts apps/api/src/create-account.test.ts apps/api/src/create-session.test.ts apps/api/src/email-verification.test.ts apps/api/src/password-reset.test.ts apps/web/src/auth-page.test.ts apps/web/src/age-gate-page.test.ts
npx vitest run --config vitest.integration.config.ts --fileParallelism false apps/api/src/operator-config.migrate.test.ts
npm run typecheck
npm run lint
npm run migration-check
```

The migrate test starts a throwaway Postgres 17 container and removes it. The screen is `GET /age-gate` on the web app. Signup is `GET /auth`, then the age gate posts `POST /v1/accounts`. The web app rewrites `/v1/*` to `http://api:3000`.

## Test cases

| Case | Input | Expected |
| --- | --- | --- |
| Adult create | Auth fields plus `dob` `1990-01-15`, clock on or after that birthday plus 19 years | 201. `status` `Active`. `age_attested` true. No `dob` in the JSON. One profile row: that `dob`, `city` null, `country` null, `visibility` null. Password is argon2id. |
| Birthday | Clock `2026-10-04T12:00:00.000Z`, `dob` `2007-10-04`, `min_age` 19 | 201. `Active`. `age_attested` true. `visibility` null. |
| Under the minimum | Same clock, `dob` `2007-10-05` | 201. `status` `held`. `age_attested` false. Profile `visibility` `held`. No `dob` in the JSON. |
| Configured minimum | `min_age` 21, clock `2026-10-04`, `dob` `2006-10-04` (age 20) | 201. `held`. `age_attested` false. |
| Unreadable minimum | `minAge()` returns null | 503 `UNHANDLED`, `details.field` `min_age`, message `min_age : la configuration est illisible.`, `retryable` true. No account. No profile. |
| Bad dob | Missing `dob`, `""`, `2010-02-31`, or `15/01/1990` | 400 `UNHANDLED`, `details.field` `dob`, message `dob : une date de naissance est requise.` No row. |
| Duplicate email | The same email again with a new pseudonym | 409. `details.field` `email`. Profile count stays the same. |
| Auth screen | Filled signup, pledge and human checkboxes on | No `POST /v1/accounts`. `sessionStorage` key `ankanu.signup` holds the fields, including the password. Location becomes `/age-gate` with an empty query. Google click stays on `/auth`. |
| Young date on the screen | Day 01, month 01, year 15 years before today | Button stays disabled. Label stays `Continuer vers la vérification (SMS / OTP)`. `#stateUnderage` is shown. No post. |
| Adult date on the screen | `15` / `01` / `1990` | Button enables. Label becomes `Poursuivre vers l'envoi du code OTP`. Click posts `/v1/accounts` with the draft plus `dob` `1990-01-15`. The page stays on `/age-gate`. |
| Held response | The post returns 201 `{ "status": "held" }` | `#stateUnderage` is shown. The OTP alert does not run. The draft is removed. The button is disabled, uses the grey `bg-disabled` classes, and the label is `Continuer vers la vérification (SMS / OTP)`. |
| Back from the age gate | A valid signup assigns `/age-gate`, then the browser restores `/auth` (`pageshow` with `persisted`) | `submitting` is cleared and `validateSubmissionState()` runs. The filled form can submit again. A `pageshow` that is not a restore leaves the button disabled. |
| Adult response | The post returns 201 `{ "status": "Active" }` | Alert text is `Redirection vers la passerelle OTP SMS d'AnKanu Burkina Faso.` No navigation. The draft is removed. |
| Served HTML | `GET /age-gate` | 200, `cache-control: no-store`, `referrer-policy: no-referrer`. Supervision line and marriage counter `0` stay. Body does not contain `Scaleway` or `Loi 010-2004/AN`. |

## Test data

- email `fatim@example.bf`, pseudonym `Fatim_Ouaga`, password `phrase avec espaces`, gender `sister`, pledge true, `human_verified` true, `coc_version` `FR-089`, adult `dob` `1990-01-15`
- Clock `2026-10-04T12:00:00.000Z` for the birthday cases
- Under-minimum `dob` `2007-10-05`, exact-minimum `dob` `2007-10-04`
- Twenty-year-old against `min_age` 21: `dob` `2006-10-04`
- Postgres inbox `fatim@example.bf`, gender `brother`, same adult `dob`
- Signup draft key `ankanu.signup`

## My results

- QA fail fix: a held 201 restores the grey disabled button and the label `Continuer vers la vérification (SMS / OTP)`. Going back from the age gate fires `pageshow` with `persisted` and enables the filled signup again. `age-gate-page.test.ts` and `auth-page.test.ts`: 4 passed.
- Headless Chrome on `http://127.0.0.1:3456`: a stubbed 201 `{ "status": "held" }` left `#stateUnderage` visible, removed the draft, and set the button to disabled with `bg-disabled` and the label `Continuer vers la vérification (SMS / OTP)`. After signup, going back left the email filled and the signup button enabled.
- Unit files named above: 37 passed on the first full run of those files after the age assertions. The age-gate script test then passed on its own (2 tests) after the quote fix, and again after the fetch `ok` flag.
- `operator-config.migrate.test.ts`: 7 passed on Postgres 17. Six migrations apply. The adult create stores `profile.dob` `1990-01-15` with `city`, `country`, and `visibility` null, `age_attested` true, `status` `Active`, and no `dob` on the response.
- `npm run typecheck`, `npm run lint`, and `npm run migration-check` passed.
- `GET http://127.0.0.1:3456/age-gate` on the already-running web dev server returned 200 with `cache-control: no-store` and `referrer-policy: no-referrer`. The body has the supervision line and does not contain `Scaleway` or `Loi 010-2004/AN`.
- Headless Chrome on that server: Google click stayed on `/auth`. Signup stored the draft and opened `/age-gate` with an empty query. A 15-year-old date left the button disabled and showed `#stateUnderage`. `1990-01-15` enabled the button and POSTed the draft plus `dob` `1990-01-15` to `/v1/accounts`. The page stayed on `/age-gate`. The dev server rewrite to `api:3000` did not return 201, so the hint became `La création a échoué.` and the draft stayed. The script test covers held, adult alert, and 400.

## Three validation passes

1. HTTP: adult create, exact birthday, under-minimum hold, a higher `min_age`, unreadable `min_age` with no row, bad `dob` with no row, and duplicate email with one profile.
2. Migration: `0005_profile.sql` creates `profile`. Empty Postgres 17 applies six migrations. The adult insert writes `account_id` and `dob` only.
3. Static: `npm run typecheck`, `npm run lint`, and `npm run migration-check`. The page test runs the injected script. Chrome on the dev server confirmed signup navigation, the disabled young date, and the adult post.

## Solution-design sections

Founder sentences on this ticket. `profile` is 1:1 with `account` via `profile.account_id`. The create insert writes `account_id` and `dob`. `city`, `country`, and `visibility` may be null. A held account sets `visibility` to `held`. The endpoint is the existing `POST /v1/accounts`, with request field `dob`. `operator_config.min_age` is the seeded integer `19`. No `verification_record` row.

## Stitch files

- `code/design-stitch/12-age-gate/screen.html`
- `code/design-stitch/12-age-gate/screen.png`

The HTML file was not edited. The page removes the hosting statute line and injects a script before `</body>`. Auth still serves `code/design-stitch/11-auth/screen.html` and `screen.png`. The Google button stays on that screen.

## Known gaps

- The Stitch script disables the button when the selected date is under 19, so the screen does not submit that date. The API still creates a held account if that `dob` is posted. If the response is `held`, the page shows `#stateUnderage` and skips the OTP alert.
- The client age check stays hardcoded at 19 so the served screen matches the Stitch pixels. The server uses `operator_config.min_age`.
- The hosting line is removed only in the served HTML. The Stitch file still has it.
- The success alert does not open an OTP screen. Story 2.7 is not built.
- Google stays visible and does not sign in. Story 2.5 stays deferred.
- The password sits in `sessionStorage` until the age-gate post succeeds or the member leaves the tab.
- Chrome posted to the dev server, and the rewrite to `api:3000` failed, so that click did not create a row. The HTTP cases are locked by `create-account.test.ts` and the Postgres migrate test.
- A held 201 used to leave the SMS spinner on the button. The button now returns to the Stitch disabled control.
- A history restore of `/auth` used to keep signup disabled. `pageshow` with `persisted` clears that and validates the form again.
- This commit stays local until QA passes. Do not treat it as pushed.
