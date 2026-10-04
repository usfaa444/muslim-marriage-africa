# Epic 2 Story 2.4 QA handoff

## What was built

`password_reset` stores the reset link. Columns are `id`, `account_id`, `token_hash`, `expires_at`, `consumed_at`, `superseded_at`, and `created_at`. The raw token is never stored. The hash is SHA-256 hex. `expires_at` is `created_at` plus 15 minutes. A new row sets `superseded_at` on older unconsumed rows for that account. A row with `consumed_at` set, `superseded_at` set, or `expires_at` not after now cannot be used. This table is not `email_verification`.

`POST /v1/password-resets` takes `{ email }`. `email` must be a non-empty string. Success is 201 `{}` for a known verified inbox and for an unknown or unverified inbox. The token is not in the JSON. Lookup is `trim` plus lowercase, because signup stores the inbox that way. A missing or non-string email, including `""`, is 400 `UNHANDLED`, `details.field` `email`, message `email : une adresse est requise.`, and creates nothing. A whitespace-only email is non-empty, misses the lookup, and returns 201 `{}`.

The mail goes out only when a password credential has `email_verified_at` set. `EmailPort` sends one SMTP message to `account.email`. The live adapter reads `SMTP_URL`. Tests pass a fake that records the link. This is not `SmsPort`, not notification, and not `sms_dispatch`. The link is `{Origin}/password-reset?token=`. The body is the sentence `Une réinitialisation du mot de passe a été demandée et ce lien dure 15 minutes.` and then the link on the next line. The subject stays `AnKanu`. The Story 2.3 verification mail stays the link alone. The row is written only after the send returns, inside the same `try`. A missing `http`/`https` `Origin`, a send that throws, an insert that throws, or a store result other than `inserted` returns 503 `EMAIL_DELIVERY_FAILED`, `retryable` true, message `L'envoi du lien a échoué.`, and no new row. Unknown and unverified inboxes never call SMTP and stay 201 `{}`.

`rl_auth_per_min` stays 10 and still counts only signup and login. `rl_password_reset_per_min` is 5. It counts by client IP, with the same address normalization as auth, on `POST /v1/password-resets` only, in its own 60-second window, before any insert. Consume is not counted. Over the limit is 429 `RATE_LIMITED`, message `Cadence de requêtes régulée.`, and creates nothing. A missing or invalid limit row is 500 `UNHANDLED`. Without `DATABASE_URL` the reader returns 5.

`POST /v1/password-resets/consume` takes `{ token, password }`. The screen checks the confirmation locally and sends one password. A usable row is looked up before argon2id. An expired, consumed, superseded, or unknown token is 400 `PASSWORD_RESET_INVALID` and does not hash. A usable token whose password fails `passwordIsPublishable` (12 to 128 Unicode characters, spaces allowed, reject only-spaces) is 400 `UNHANDLED`, `details.field` `password`, message `password : la règle publiée n'est pas respectée.`, and the token is not consumed. Consume is not counted by `rl_password_reset_per_min`. The Stitch hint about letters, digits, and a symbol stays on the screen and is not the server rule. The new secret replaces `secret_hash` on the existing password credential as argon2id. No second credential is inserted. `email_verified_at` is not changed.

A valid consume is 200 `{ id, kind: "web", expires_at }` plus `Set-Cookie`. `expires_at` is 30 days after consume. The cookie is `ankanu_session={session id}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=` matching that expiry. It is not remember-me and it is not 14 days. Every other live session for that account (`expires_at` after now) is revoked by setting `expires_at` to the consume time. The member is not sent to `POST /v1/sessions` to create this session. After 200, the page replaces the URL with `/password-reset` so a reload does not send the token again.

An expired, consumed, superseded, or unknown token is 400 `PASSWORD_RESET_INVALID`, message `Lien expiré ou adresse inconnue.` `PASSWORD_RESET_INVALID` is on the AD-7 code list. The bad-link screen uses the Stitch copy already in the HTML.

The served page drops `Infrastructure souveraine hébergée en Union Européenne (Scaleway Paris DC).` and ` et hébergement souverain en France (Scaleway)`. Nothing replaces them. The card line is `Chiffrement de bout en bout. Zéro traitement publicitaire de vos identifiants.` The footer copyright is `© 2026 AnKanu. Tous droits réservés.` The 2025 plateforme sentence is gone. The served HTML also drops the specimen `value` attributes, so it does not contain `mariam.sawadogo@famille.bf` or `Barakah2025!Honor`. The email placeholder stays. The Stitch HTML and PNG files were not edited.

## Where

- `code/packages/kernel/src/error.ts`
- `code/apps/api/src/account-schema.ts`
- `code/apps/api/src/app.module.ts`
- `code/apps/api/src/email-port.ts`
- `code/apps/api/src/password-reset.ts`
- `code/apps/api/src/password-reset-store.ts`
- `code/apps/api/src/password-reset-rate.ts`
- `code/apps/api/src/password-reset-limit.ts`
- `code/apps/api/src/password-resets.controller.ts`
- `code/apps/api/src/password-reset.test.ts`
- `code/apps/api/src/operator-config.migrate.test.ts`
- `code/apps/api/drizzle/0004_password_reset.sql`
- `code/apps/api/drizzle/meta/0004_snapshot.json`
- `code/apps/api/drizzle/meta/_journal.json`
- `code/apps/web/src/password-reset-page.ts`
- `code/apps/web/src/password-reset-page.test.ts`
- `code/apps/web/app/password-reset/route.ts`

## How to run

From `code/`:

```bash
npx vitest run --config vitest.unit.config.ts apps/api/src/password-reset.test.ts apps/web/src/password-reset-page.test.ts apps/api/src/email-port.test.ts apps/api/src/email-verification.test.ts
npx vitest run --config vitest.integration.config.ts --fileParallelism false apps/api/src/operator-config.migrate.test.ts
npm run typecheck
npm run lint
npm run migration-check
```

The migrate test starts a throwaway Postgres 17 container and removes it. The screen is `GET /password-reset` on the web app. Request is `POST /v1/password-resets` with JSON `{ "email" }` and an `Origin` header. Consume is `POST /v1/password-resets/consume` with JSON `{ "token", "password" }`. The web app rewrites `/v1/*` to `http://api:3000`. A live send needs `SMTP_URL` on the API process. It is not in Compose.

## Test cases

| Case | Input | Expected |
| --- | --- | --- |
| Unknown inbox | `{ "email": "absent@example.bf" }` and `Origin` | 201 `{}`. No row. No mail. |
| Unverified inbox | Signup password credential, `email_verified_at` null | 201 `{}`. No row. No mail. |
| Missing email | `{}` or `{ "email": "" }` | 400 `UNHANDLED`, `details.field` `email`, message `email : une adresse est requise.` No row. |
| Verified request | `email_verified_at` set, `Origin: http://ankanu.test`, body email `Fatim@Example.bf` | 201 `{}`. One mail to `fatim@example.bf`. Notice is the French 15-minute sentence. Link starts with `http://ankanu.test/password-reset?token=`. The row stores the SHA-256 hex, not the token. `expires_at` is 15 minutes after `created_at`. `consumed_at` and `superseded_at` are null. JSON has no token. |
| Send fails | The port throws for a verified inbox | 503 `EMAIL_DELIVERY_FAILED`, `retryable` true. No new row. |
| Save fails after send | SMTP accepts, then `supersedeAndInsert` throws | 503 `EMAIL_DELIVERY_FAILED`, `retryable` true. The previous live row is not superseded. |
| Unusable token | `{ "token": "not-a-row", "password": "une phrase plus longue" }`, or a row whose `expires_at` is not after now | 400 `PASSWORD_RESET_INVALID`. The password hasher is not called. |
| Bad password | A usable token, password `court` | 400 `UNHANDLED`, `details.field` `password`, message `password : la règle publiée n'est pas respectée.` `consumed_at` stays null. The hasher is not called. |
| Consume | Token from the mail, password `une phrase plus longue` | 200. Body is `id`, `kind` `web`, `expires_at` 30 days ahead. Cookie is `ankanu_session`, `Path=/`, `HttpOnly`, `Secure`, `SameSite=Lax`, `Max-Age`. The old password is 401 on `POST /v1/sessions`. The new password is 201. The older session cookie is 401 on the verification issue route. The new cookie is 200 there. |
| Reuse | The same token again | 400 `PASSWORD_RESET_INVALID`, message `Lien expiré ou adresse inconnue.` |
| Supersede | Request again, then consume the first token | 400 `PASSWORD_RESET_INVALID`. The newer token consumes with 200. |
| Rate limit | Reader returns 2, three posts from one IP | First two are 201. The third is 429 `RATE_LIMITED`, message `Cadence de requêtes régulée.` A following consume is not counted and returns 400 for an unknown token. |
| Screen copy | Served HTML | Title, the 12-character hint, `Lien expiré ou adresse inconnue`, and `Session locale active et reconnue pour 30 jours.` stay. Copyright is `© 2026 AnKanu. Tous droits réservés.` The card line is `Chiffrement de bout en bout. Zéro traitement publicitaire de vos identifiants.` The body does not contain `Scaleway`, the 2025 plateforme sentence, `mariam.sawadogo@famille.bf`, or `Barakah2025!Honor`. The email placeholder stays. |
| Screen script | Run the injected script | No token: request posts `/v1/password-resets` and 201 sets `state-2`. `?token=` shows `state-3` and posts nothing until submit. A confirmation mismatch posts nothing. A match posts consume once. 200 sets `state-5` and replaces the URL with `/password-reset`. 400 `PASSWORD_RESET_INVALID` sets `state-4`. |
| Postgres | Migrated Postgres 17, inbox `salimata@example.bf`, clock `2026-10-04T19:00:00.000Z` | Tables include `password_reset`. Five migrations are applied. `operator_config.rl_password_reset_per_min` is `5`. Issue stores the SHA-256 and `expires_at` 15 minutes after `created_at`. Consume returns 200, `kind` `web`, expiry 30 days, and the new password signs in. A second link consumed at exactly `expires_at` is 400 `PASSWORD_RESET_INVALID` and `consumed_at` stays null. |

## Test data

- email `fatim@example.bf`, pseudonym `Fatim_Ouaga`, password `phrase avec espaces`, gender `sister`, pledge true, `human_verified` true, `coc_version` `FR-089`
- Verified by setting that password credential's `email_verified_at` in the memory store
- Replacement passwords `une phrase plus longue` and `encore une phrase longue`
- Unknown inbox `absent@example.bf` and rate-limit inbox `nobody@example.bf`
- Clock frozen at `2026-10-04T12:00:00.000Z` in the memory file, and `2026-10-04T19:00:00.000Z` for the Postgres reset
- Postgres inbox `salimata@example.bf`, pseudonym `Salimata_Ouaga`
- Origin `http://ankanu.test`

## My results

- QA fail fix: `password-reset.test.ts` and `password-reset-page.test.ts`: 13 passed. An unusable token does not call the hasher. An insert that throws after send returns 503 and leaves the previous live row unsuperseded. The served HTML has no specimen email or password, and the card line has no space before the period.
- `operator-config.migrate.test.ts`: 7 passed on Postgres 17, including issue, consume, and a consume at exactly 15 minutes
- `npm run typecheck`, `npm run lint`, and `npm run migration-check` passed on the first build. This fail fix did not re-run them.
- `GET http://127.0.0.1:3456/password-reset` on the already-running web dev server returned 200. The body contains the joined card line and the email placeholder. It does not contain `mariam.sawadogo@famille.bf`, `Barakah2025!Honor`, or `bout .`
- Headless Chrome on that server: a load with no token shows `#state-1` and hides `#state-3`. Submitting `fatim@example.bf` POSTed `{ "email": "fatim@example.bf" }` to `/v1/password-resets`. A load with `?token=abc` shows `#state-3` and hides `#state-1`. A mismatched confirmation posted nothing and stayed on `#state-3`. A matching confirmation POSTed `{ "token": "abc", "password": "une phrase plus longue" }` to `/v1/password-resets/consume`. The dev server has no API behind the rewrite, so those posts did not return 201 or 200 and the panels did not advance. The script test covers 201, 200, and 400.

## Three validation passes

1. HTTP: unknown, unverified, missing email, verified send, send failure, insert failure after send, unusable token with no hash, bad password, consume, session revoke, reuse, supersede, and the reset rate limit not applying to consume.
2. Migration: `0004_password_reset.sql` creates `password_reset` and inserts `rl_password_reset_per_min` = `5`. Empty Postgres 17 applies five migrations. Issue and consume run on that database, and a second link consumed at exactly 15 minutes stays unused.
3. Static: `npm run typecheck`, `npm run lint`, and `npm run migration-check`. The page test runs the injected script. Chrome on the dev server confirmed the token panel, the local confirmation check, and both posts.

## Solution-design sections

Founder sentences on this ticket, and only those sentences. `password_reset` N:1 `account` via `account_id`. Endpoints are `POST /v1/password-resets` and `POST /v1/password-resets/consume`. The session row matches `POST /v1/sessions` except the expiry is 30 days. AD-7 codes now include `PASSWORD_RESET_INVALID`. `EMAIL_DELIVERY_FAILED` is reused for a failed send.

## Stitch files

- `code/design-stitch/15-password-reset/screen.html`
- `code/design-stitch/15-password-reset/screen.png`

The HTML file was not edited. The page removes the two hosting sentences, joins the card line at the period, replaces the 2025 copyright, strips the specimen `value` attributes, strips the two form `onsubmit` handlers that only switched panels, and injects a script before `</body>`.

## Known gaps

- A verified inbox with a missing `Origin` or a thrown send returns 503, while an unknown or unverified inbox returns 201. That difference can show that a verified account exists.
- The founder named `UNHANDLED` and `details.field` `email` for a bad email, and did not name the message. The message used is `email : une adresse est requise.`
- The cookie also sets `Path=/`. That comes from the existing session cookie helper.
- A confirmation mismatch does not call the API and does not show new copy. The password panel stays up. The Stitch file has no mismatch sentence.
- The Stitch file still has the specimen `value` attributes. Only the served HTML removes them.
- The walkthrough tabs still call `switchState`. `Simuler l'ouverture du lien` still only switches panels.
- The password hint on the screen is not the server rule.
- Every `POST /v1/password-resets` counts toward the limit, including a missing email, because the count runs before the body check.
- An unusable token is refused before the password rule. A short password on a bad token returns `PASSWORD_RESET_INVALID` and does not hash. A short password on a usable token returns the password error and does not consume.
- I clicked the forms in headless Chrome against the web dev server. Those posts did not reach a live API. I did not change Compose or a port to force a 201. The script transitions are locked by `password-reset-page.test.ts`, and the HTTP behavior is locked by `password-reset.test.ts`.
- This commit stays local until QA passes. Do not treat it as pushed.
