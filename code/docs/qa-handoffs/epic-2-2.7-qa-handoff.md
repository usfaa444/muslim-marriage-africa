# Epic 2 Story 2.7 QA handoff

## What was built

A signed-in member can send and check a phone code on one path, `POST /v1/verifications/otp`. The body field `action` is `send` or `verify`. Any other action is 400 `UNHANDLED`, message `Action inconnue.`. No session cookie is 401 `UNAUTHENTICATED`, message `Authentification requise.`.

Send body: `{ "action": "send", "phone_e164": "<E.164>" }`. The server accepts `^\+[1-9]\d{1,14}$`. A space, or any other string that fails that pattern, is 400 `UNHANDLED`, `details.field` `phone_e164`, message `phone_e164 : un numéro E.164 est requis.`, and writes nothing. A new send is 201 `{ "expires_at": "<ISO-8601>" }`. The response has no code.

The phone is stored only on `verification_record.phone_e164`. `kind` is `phone_otp`. `status` is `pending`. `hash` is the SHA-256 hex of the six-digit code. `expires_at` is ten minutes after the send. `vendor` and `evidence_uri` stay null. There is no phone column on `account` or on the credential. One `phone_otp` row per account is updated in place.

`sms_dispatch` stores `id`, `account_id`, `template` `OTP`, and `created_at`. It does not store the phone or the code. The log adapter writes `otp <six digits>` and nothing else. There is no vendor URL and no secret. The row and the dispatch are inserted first, then the log runs, in the same transaction. If that log write throws, the transaction rolls back: the send is 503 `UNHANDLED`, `retryable` true, message `L'envoi du code a échoué.`, and the previous hash, phone, and dispatch count stay as they were. A database error is not that sentence. It is 500 `UNHANDLED`, message `Request failed`.

A second send sooner than 60 seconds returns 200 with the existing `expires_at`. It does not send, does not add a dispatch, and does not change the stored phone. The screen leaves the mask and the resend number on the phone from the last 201. A 60-second no-op does not count toward the hour. `operator_config.rl_otp_per_hour` stays the seeded `5`. When that many `OTP` dispatches already exist in the last hour, the send is 429 `RATE_LIMITED`, `retryable` false, message `Cadence de requêtes régulée.`, and nothing is sent. An unreadable limit is 500 `UNHANDLED`, message `Request failed`. This route does not use `rl_auth_per_min`.

Verify body: `{ "action": "verify", "code": "<six digits>" }`. A matching unexpired code is 200 `{ "status": "granted" }`. The row becomes `granted`. The same code again, while it is still unexpired, is 200 `{ "status": "granted" }`. A wrong code, a code that is not six digits, an expired code, or a code replaced by a later send is 400 `OTP_INVALID`, message `Code invalide ou expiré.`. A wrong code leaves `pending`. An expired code does not clear an existing `granted`. A resend after 60 seconds is 201, sets `pending`, replaces `hash` and `expires_at`, and the older code then fails.

Nothing in this story writes `profile.visibility`. The profile stays unlistable.

`GET /otp` serves `code/design-stitch/14-otp/screen.html` with `cache-control: no-store` and `referrer-policy: no-referrer`. The Stitch file is not edited. A script injected before `</body>` replaces `handleFormSubmit`, `triggerResend`, and `openModifyNumberModal`. The first paint keeps the Stitch screen, including the 58s label, the specimen `+226 70 •• •• 84`, the Scaleway line, and the audit bar. The client strips spaces, dots, dashes, and parentheses before the post. A 201 runs the existing alert, `setScreenState('sent')`, and `startCooldown(60)`. A 200 inside the wait does not alert, does not change the mask, and does not change the number a later resend posts. A verify 200 runs `setScreenState('success')` and a later submit does not post again. Any other verify response runs `setScreenState('error')` and then `startCooldown(60)`, so the wait is 60 seconds rather than the Stitch error-state 42. The page does not navigate. The age gate still does not open `/otp`.

## Where

- `code/packages/kernel/src/error.ts`
- `code/apps/api/src/account-schema.ts`
- `code/apps/api/src/app.module.ts`
- `code/apps/api/src/otp-limit.ts`
- `code/apps/api/src/phone-otp.ts`
- `code/apps/api/src/phone-otp-store.ts`
- `code/apps/api/src/phone-otp.test.ts`
- `code/apps/api/src/sms-port.ts`
- `code/apps/api/src/verifications.controller.ts`
- `code/apps/api/src/operator-config.migrate.test.ts`
- `code/apps/api/drizzle/0006_verification_otp.sql`
- `code/apps/api/drizzle/meta/0006_snapshot.json`
- `code/apps/api/drizzle/meta/_journal.json`
- `code/apps/web/src/otp-page.ts`
- `code/apps/web/src/otp-page.test.ts`
- `code/apps/web/src/auth-page.test.ts`
- `code/apps/web/app/otp/route.ts`
- `code/apps/web/Dockerfile`
- `code/.dockerignore`

## How to run

From `code/`:

```bash
npx vitest run --config vitest.unit.config.ts apps/api/src/phone-otp.test.ts apps/web/src/otp-page.test.ts packages/kernel/src/kernel.test.ts
npx vitest run --config vitest.integration.config.ts --fileParallelism false apps/api/src/operator-config.migrate.test.ts
npm run typecheck
npm run lint
npm run migration-check
```

The migrate test starts a throwaway Postgres 17 container and removes it. The screen is `GET /otp` on the web app. The web app rewrites `/v1/*` to `http://api:3000`. A session cookie from `POST /v1/sessions` is required. The dev server on `http://127.0.0.1:3456` has no API behind that rewrite, so a real click there does not create a row.

## Test cases

| Case | Input | Expected |
| --- | --- | --- |
| No session | `POST /v1/verifications/otp` `{ "action": "send", "phone_e164": "+22670123484" }` with no cookie | 401 `UNAUTHENTICATED`. No row. No dispatch. No log. |
| Unknown action | `{ "action": "mint" }` with a session | 400 `UNHANDLED`, message `Action inconnue.`. Nothing stored. |
| Phone with spaces | `{ "action": "send", "phone_e164": "+226 70 12 34 84" }` | 400 `UNHANDLED`, `details.field` `phone_e164`, message `phone_e164 : un numéro E.164 est requis.` Nothing stored. |
| Send | `{ "action": "send", "phone_e164": "+22670123484" }` | 201 `{ "expires_at" }` ten minutes out. Body has no code. One `verification_record`: `kind` `phone_otp`, `status` `pending`, that phone, SHA-256 `hash`, `vendor` null, `evidence_uri` null. One `sms_dispatch`: `template` `OTP`, `account_id` set, no phone and no code. Log line is `otp` plus six digits. `profile.visibility` stays null. |
| Inside 60 seconds | Another send 30 seconds later, even with `phone_e164` `+22670999999` | 200 and the original `expires_at`. Still one log, one dispatch, and the original phone. Status stays `pending`. |
| Wrong code | `{ "action": "verify", "code": "000000" }` | 400 `OTP_INVALID`, message `Code invalide ou expiré.`. Status stays `pending`. |
| Matching code | `{ "action": "verify", "code": "<the six digits>" }` | 200 `{ "status": "granted" }`. Row `granted`. `visibility` stays null. The same code again, before expiry, is 200 `{ "status": "granted" }`. |
| Resend | Send again at least 60 seconds later | 201. Status returns to `pending`. Hash is the new code. The older code is 400 `OTP_INVALID`. The new code is 200 `granted`. |
| Expired | Verify after `expires_at` | 400 `OTP_INVALID`. A row that was already `granted` stays `granted`. `visibility` stays null. |
| Hour cap | Sends in the last hour already equal `rl_otp_per_hour` | 429 `RATE_LIMITED`, `retryable` false, message `Cadence de requêtes régulée.`. No new log and no new dispatch. |
| Log failure | The log write throws | 503 `UNHANDLED`, `retryable` true, message `L'envoi du code a échoué.`. Hash, phone, and dispatch count stay as they were. The log runs after the row and dispatch insert, and that insert is rolled back. |
| Store failure | The store throws before it can return a result | 500 `UNHANDLED`, message `Request failed`. The body does not contain `L'envoi du code a échoué.` |
| Screen, first paint | `GET /otp` | 200, `cache-control: no-store`, `referrer-policy: no-referrer`. Title `Vérification du Numéro de Téléphone`. Six boxes. Timer text `58`. Specimen `+226 70 •• •• 84`. Submit disabled. Scaleway line present. |
| Modify number | Prompt `+226 70 12 34 84`, stubbed 201 | Post `{ "action": "send", "phone_e164": "+22670123484" }`. Alert `Numéro enregistré avec succès. Un nouveau code à 6 chiffres a été ordonnancé.` Headline `Nouveau code transmis à l'instant`. Mask `+226 70 •• •• 84`. `startCooldown(60)` is called. The page stays on `/otp`. |
| Second modify inside the wait | After that 201, prompt `+226 70 99 99 99` and stub 200 | The post is `{ "action": "send", "phone_e164": "+22670999999" }`. No second alert. Mask stays `+226 70 •• •• 84`. Headline stays `Nouveau code transmis à l'instant`. Resend posts `+22670123484`. |
| Wrong code on the screen | Six digits, response not 200 | Error banner `Code invalide ou expiré`. `setScreenState('error')` then `startCooldown(60)`. |
| Matching code on the screen | Response 200 | Success banner `Niveau téléphonique accordé (Phone level granted)`. Button label `Accéder à l'étape Wali`. The Stitch success state fills `840192`. No navigation. |
| Success button again | Click `Accéder à l'étape Wali` after that 200 | No second `POST`. The success banner stays. The error banner stays hidden. The label stays `Accéder à l'étape Wali`. |

## Test data

- Phone `+22670123484`. Spaced reject `+226 70 12 34 84`. Cooldown attempt `+22670999999`. Failed-log attempt `+33612345678`.
- Clock for the HTTP file starts at `2026-10-05T12:00:00.000Z`. Resend clock `2026-10-05T12:02:00.000Z`. Expired clock `2026-10-05T12:12:00.001Z`.
- Session is the existing signup plus `POST /v1/sessions`. Inbox in the HTTP file: email `aminata@example.bf`, pseudonym `Aminata_Ouaga`, password `phrase avec espaces`, gender `sister`.
- `rl_otp_per_hour` seed `5`. The cap case sets the reader to the current dispatch count.
- Screen prompt default `+226 70 00 00 00`. Browser prompt value used: `+226 70 12 34 84`.

## My results

- QA fail fix: a stubbed 200 for `+22670999999` left the mask on `+226 70 •• •• 84`, and resend posted `+22670123484`. Clicking `Accéder à l'étape Wali` after a granted `111111` did not post `840192`. The success banner stayed.
- `phone-otp.test.ts` and `otp-page.test.ts`: 14 passed. That includes the cooldown screen, the second success click, the log rollback, and a store throw returning 500 `Request failed`.
- The earlier run of `operator-config.migrate.test.ts` passed 7 tests on Postgres 17. This fix does not change the SQL. `apps/web` and `apps/api` typecheck passed after the fix.
- The signup `pageshow` listener in `auth-page.test.ts` now accepts the event the page already passes. That was a typecheck error on the existing file. Behavior is unchanged.
- `GET http://127.0.0.1:3456/otp` on the already-running web dev server returned 200. The body has the title, six inputs, `58`, the specimen, the Scaleway line, and the injected `fetch('/v1/verifications/otp'`.
- Headless Chrome on that URL, after this fix: a stubbed 201 for `+226 70 12 34 84` then a stubbed 200 for `+226 70 99 99 99` left the mask `+226 70 •• •• 84` and the headline `Nouveau code transmis à l'instant`. Verify `111111` showed the success banner and filled `840192`. A second submit posted nothing. The error banner stayed hidden. `apps/web` and `apps/api` typecheck passed.

## Three validation passes

1. HTTP: session, unknown action, spaced phone, hashed send with template only, 60-second no-op, wrong code, grant and replay, resend supersede, expired code, hour cap, log failure with no new live code, and a store throw that is 500 `Request failed`.
2. Migration: `0006_verification_otp.sql` creates `verification_record` and `sms_dispatch`. Empty Postgres 17 applies seven migrations. The table lists include both tables.
3. Static: `apps/web` and `apps/api` typecheck passed on this fix. The page test runs the injected script, including the 200 cooldown and the second success click. Chrome on the dev server confirmed the mask stayed and the success button did not post `840192`.

## Solution-design sections

Founder sentences on this ticket. One route, `POST /v1/verifications/otp`, with `action` `send` or `verify`. Phone lives on `verification_record.phone_e164`. New columns are `hash` and `expires_at`. `kind` stays `phone_otp`. Lifetime is 10 minutes. Resend replaces `hash` and `expires_at` on the pending row. `rl_otp_per_hour` stays 5. The resend wait is 60 seconds. The hour cap is 429 `RATE_LIMITED`. The log adapter may print the six digits. `sms_dispatch` stores template and ids only. A failed log write leaves no live code. Wrong, expired, or superseded codes are 400 `OTP_INVALID`. `profile.visibility` is not written.

## Stitch files

- `code/design-stitch/14-otp/screen.html`
- `code/design-stitch/14-otp/screen.png`

The HTML file was not edited. The page injects a script before `</body>`.

## Known gaps

- The first paint still shows 58 seconds. That number is in the Stitch HTML. A real send or a rejected code calls `startCooldown(60)`. The Stitch clock does not change the visible number until one second later. The Stitch error branch calls `startCooldown(42)` before the injected script calls `startCooldown(60)`.
- `setScreenState('success')` still fills the boxes with `840192`. That is the Stitch success state. A later click does not post those digits.
- An in-flight send can still overwrite `granted`, because `grant` does not take the account lock. This fix does not choose which request wins.
- The Scaleway line and the audit bar stay, because this screen is served from the downloaded HTML.
- There is no live SMS vendor. The log line is the adapter. Tests use a fake that records `{ code }`.
- A send inside 60 seconds is 200 with the current `expires_at`. The founder did not name an error code for that wait. 429 is only the hour cap.
- A failed log write is 503 `UNHANDLED`. The founder did not name another machine code.
- The age-gate adult alert still does not open `/otp`.
- Audio controls on this screen stay inert.
- Google sign-in is not on this screen. Story 2.5 stays deferred.
- `design-stitch/12-age-gate/screen.html` and `design-stitch/13-email-verification/screen.html` are still excluded by `.dockerignore` while the web Dockerfile copies them. `14-otp/screen.html` is re-included.
- Chrome posted to the dev server only through a stub. The rewrite to `api:3000` is not a live API on that port. The HTTP cases are locked by `phone-otp.test.ts`.
- This commit stays local until QA passes. Do not treat it as pushed.
