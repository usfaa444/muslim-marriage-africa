# Epic 2 Story 2.3 QA handoff

## What was built

`email_verification` stores the link. Columns are `id`, `account_id`, `token_hash`, `expires_at`, `consumed_at`, `superseded_at`, and `created_at`. The raw token is never stored. The hash is SHA-256. `credential.email_verified_at` on the password credential is the only verified marker. `account` has no verified column.

`POST /v1/accounts/email-verifications` uses the session cookie and has no body. A live unverified inbox returns 201 `{ expires_at }`, thirty minutes after `created_at`. The token is not in the JSON. The response header `x-account-email` is `encodeURIComponent(account.email)`. Already verified returns 200 `{}` and does not send. No session returns 401 `UNAUTHENTICATED`. A send failure, a missing `http`/`https` `Origin`, or a refused SMTP address returns 503 `EMAIL_DELIVERY_FAILED`, `retryable` true, and no new row. The row is written only after the send returns. Resend sets `superseded_at` on older unconsumed rows, then inserts the new row. The old token fails immediately. These two posts are not counted by `rl_auth_per_min`.

`POST /v1/accounts/email-verifications/consume` takes `{ token }` and does not need a session. A valid link returns 200 `{ email_verified_at }`, sets `consumed_at`, and stamps the password credential. Invalid, expired, consumed, and superseded tokens return 400 `EMAIL_LINK_INVALID`. Expiry is `expires_at <= now`. The 60-second grace and the two-minute spam hint are not server rules.

`EmailPort` sends one SMTP message to `account.email`. The live adapter reads `SMTP_URL` (`smtp://` or `smtps://`). Tests pass a fake that records the link. This is not `SmsPort`, not notification, and not `sms_dispatch`. The link is `{Origin}/email-verification?token=`. That screen calls consume. Opening the screen with no token calls the issue POST.

`EMAIL_LINK_INVALID` and `EMAIL_DELIVERY_FAILED` are on the AD-7 code list.

## Where

- `code/packages/kernel/src/error.ts`
- `code/apps/api/src/account-schema.ts`
- `code/apps/api/src/create-account.ts`
- `code/apps/api/src/accounts.controller.ts`
- `code/apps/api/src/email-port.ts`
- `code/apps/api/src/email-port.test.ts`
- `code/apps/api/src/email-verification.ts`
- `code/apps/api/src/email-verification-store.ts`
- `code/apps/api/src/email-verification.test.ts`
- `code/apps/api/src/operator-config.migrate.test.ts`
- `code/apps/api/drizzle/0003_email_verification.sql`
- `code/apps/api/drizzle/meta/0003_snapshot.json`
- `code/apps/api/drizzle/meta/_journal.json`
- `code/apps/web/src/email-verification-page.ts`
- `code/apps/web/src/email-verification-page.test.ts`
- `code/apps/web/app/email-verification/route.ts`
- `code/apps/web/Dockerfile`

## How to run

From `code/`:

```bash
npx vitest run --config vitest.unit.config.ts apps/api/src/email-verification.test.ts apps/api/src/email-port.test.ts apps/web/src/email-verification-page.test.ts
npx vitest run --config vitest.integration.config.ts --fileParallelism false apps/api/src/operator-config.migrate.test.ts
npm run typecheck
npm run lint
npm run migration-check
```

The migrate test starts a throwaway Postgres 17 container and removes it. The screen is `GET /email-verification` on the web app. Issue is `POST /v1/accounts/email-verifications` with the `ankanu_session` cookie and an `Origin` header. Consume is `POST /v1/accounts/email-verifications/consume` with JSON `{ "token" }`. The web app rewrites `/v1/*` to `http://api:3000`. A live send needs `SMTP_URL` on the API process. It is not in Compose.

## Test cases

| Case | Input | Expected |
| --- | --- | --- |
| Issue | Session cookie, `Origin: http://ankanu.test`, unverified password credential | 201. Body key is only `expires_at`, 30 minutes ahead. Header `x-account-email` is the encoded inbox. One email to `account.email`. The link is that origin plus `/email-verification?token=`. The row stores the SHA-256 hash, not the token. `consumed_at` and `superseded_at` are null. `email_verified_at` stays null. |
| Open | That token | 200. Body key is only `email_verified_at`. `consumed_at` is set. The password credential is stamped. `account` has no `email_verified_at`. |
| Consumed again | The same token | 400 `EMAIL_LINK_INVALID`, `retryable` false. The stamp stays. |
| Already verified | Issue again | 200 `{}`. No send. No new row. |
| Expire | Consume at exactly `expires_at` | 400 `EMAIL_LINK_INVALID`. `consumed_at` stays null. `email_verified_at` stays null. A direct consume write on that row also returns false. |
| Resend | Issue again while unverified | 201. Older unconsumed rows get `superseded_at`. The old token is 400 even if its expiry is moved forward. The new token is 200. |
| Send fails | The port throws | 503 `EMAIL_DELIVERY_FAILED`, `retryable` true. The previous live row is not superseded. |
| No session | Issue with no cookie | 401 `UNAUTHENTICATED`, `retryable` false. No new row. |
| No origin | Issue with a cookie and no `Origin` | 503 `EMAIL_DELIVERY_FAILED`. No new row. |
| Unknown token | `{ "token": "not-the-live-token" }` | 400 `EMAIL_LINK_INVALID`. The live row stays unused. |
| Rate limit | `rl_auth_per_min` is 1 and the session route is already 429 | The verification issue still returns 200 for an already-verified inbox. |
| Cleartext AUTH | `SMTP_URL` is `smtp://user:secret@...` | The send throws before a socket opens. |
| Control character | Recipient contains NUL | The send throws before a socket opens. |
| Bare reply | SMTP server sends `250` with no text, then closes after DATA | The send resolves. |
| Refused recipient | SMTP `550` on `RCPT TO` | The send throws `SMTP 550`. |
| Screen with an inbox | Pass `fatim@example.bf` into the page helper | The specimen `tahir.sawadogo@courrier.bf` is gone from the markup. The Stitch sentences stay, including "sous deux minutes". |
| Hostile inbox | Pass `a</script>@example.com` | The markup contains the escaped address and not the raw close-script string. |
| Screen script | Run the injected script | A `?token=` load posts only consume. 200 sets `success` and replaces the URL with `/email-verification`. No token posts only the issue route and sets `waiting` on 201. 400 sets `expired`. |
| Waiting screen | Pass null | The specimen address remains until a response header replaces it. |
| Postgres | Migrated Postgres 17 | Columns are `account_id`, `consumed_at`, `created_at`, `expires_at`, `id`, `superseded_at`, `token_hash`. Issue then consume writes the hash, then `consumed_at` and `credential.email_verified_at`. |

## Test data

- email `fatim@example.bf`, pseudonym `Fatim_Ouaga`, password `phrase avec espaces`, gender `sister`, pledge true, `human_verified` true, `coc_version` `FR-089`
- Second inbox `amina@example.bf`, pseudonym `Amina_Bobo`, same password, for expiry and resend
- Postgres inbox `aminata@example.bf`, pseudonym `Aminata_Bobo`
- Clock frozen at `2026-10-04T12:00:00.000Z` for the first unit file, `2026-10-04T15:00:00.000Z` for expiry, and `2026-10-04T18:00:00.000Z` for Postgres
- Origin `http://ankanu.test`
- Specimen address on the Stitch screen: `tahir.sawadogo@courrier.bf`

## My results

- `email-verification.test.ts`, `email-port.test.ts`, `email-verification-page.test.ts`, and `create-account.test.ts`: 20 passed
- `operator-config.migrate.test.ts`: 6 passed, including the email link written and consumed on Postgres 17
- `npm run typecheck` passed
- `npm run lint` passed
- `npm run migration-check` passed (`drizzle-kit check`)
- `GET http://127.0.0.1:3456/email-verification` on the already-running web dev server returned 200, `cache-control: no-store`, `referrer-policy: no-referrer`, the Stitch title, the specimen address, `Modifier l'adresse`, and both fetch URLs. The body does not contain `sms`.

## Three validation passes

1. HTTP: issue, open, second open, already verified, exact expiry, resend, send failure, missing session, missing origin, unknown token, and the auth rate limit not applying to this route.
2. Migration: `0003_email_verification.sql` creates the seven columns. Empty Postgres 17 applies four migrations. Issue and consume are read back from `email_verification` and `credential`.
3. Static: `npm run typecheck`, `npm run lint`, and `npm run migration-check`. The page test runs the injected script. The SMTP test talks to a local server.

## Solution-design sections

Founder sentences on this ticket, and only those sentences. `email_verification` N:1 `account` via `account_id`. `credential.email_verified_at` stays the verified marker. No verified column on `account`. Endpoints are `POST /v1/accounts/email-verifications` and `POST /v1/accounts/email-verifications/consume`. AD-7 codes now include `EMAIL_LINK_INVALID` and `EMAIL_DELIVERY_FAILED`.

## Stitch files

- `code/design-stitch/13-email-verification/screen.html`
- `code/design-stitch/13-email-verification/screen.png`

The HTML file was not edited. The page injects a script before `</body>`. The visible inbox replaces the specimen. Resend calls the issue POST. `Modifier l'adresse` stays visible and does not change the email.

## Known gaps

- First paint still shows `tahir.sawadogo@courrier.bf` until the issue or consume response returns `x-account-email`. The web process has no database, so the route cannot fill the inbox before that response.
- Opening `/email-verification` with no token calls the issue POST. That supersedes any older unconsumed link. A refresh of the waiting screen does that too.
- `MAIL FROM` and the `From` header are `account.email`. A relay that checks SPF may refuse it. No other from-address was named.
- Compose does not set `SMTP_URL`. Without it, issue returns 503 and writes no row.
- `smtp://` is cleartext. A username on that scheme is refused. TLS is `smtps://`.
- The 60-second grace line and "sous deux minutes" stay as Stitch copy. They are not server rules.
- `Modifier l'adresse` does not change the email. "Continuer vers l'espace de convenance" stays `href="#"`.
- A failed issue (401 or 503) leaves the waiting state. The Stitch file has no send-failure state. The resend control returns to idle.
- I fetched the screen from the web dev server. I did not click resend through to the API. The rewrite target is `http://api:3000` inside the stack, and Compose publishes no host port. I did not change Compose or a port to force that click. The script is executed by `email-verification-page.test.ts`, and the HTTP behavior is locked by the API tests.
- This commit stays local until QA passes. Do not treat it as pushed.
