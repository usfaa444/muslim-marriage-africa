# Epic 2 Story 2.2 QA handoff

## What was built

`POST /v1/sessions` opens a `web` session. Body fields are `identifier` (required text; email matched case-insensitively, pseudonym matched exactly as stored), `password` (required text), and `remember_me` (required boolean). Success is 201 `{ id, kind: "web", expires_at }`. The response sets cookie `ankanu_session` to the session id, with `Path=/`, `Secure`, `HttpOnly`, and `SameSite=Lax`.

Unknown identifier and bad password both return `UNAUTHENTICATED`, HTTP 401, the same message, and no session row.

`human_verified` is required on `POST /v1/accounts` only. Missing or not boolean `true` is `CAPTCHA_FAILED`, HTTP 400, and no account. Login is not captcha-checked. No captcha control was added to the login panel. The existing signup checkbox is the only captcha control.

`rl_auth_per_min` stays `10`. Both `POST /v1/sessions` and `POST /v1/accounts` count the client IP before any insert, in a 60-second window, and only those two routes. Over the limit the code is `RATE_LIMITED`, HTTP 429, and nothing is created. `QUOTA_EXCEEDED` and `MESSAGE_CAP_EXCEEDED` are not reused.

Remember-me off: the cookie has no `Max-Age` and no `Expires`. `session.expires_at` is create time plus 12 hours and does not slide. Remember-me on: `expires_at` is `last_seen_at` plus 14 days, a later request slides both, and `Max-Age` is the seconds left until `expires_at`. No new session column. No CSRF token, entity, or endpoint. `POST /v1/sessions` does not require a token. Kind is `web` only. Gender is not stored on the session row. `AuthContext.gender` is `account.gender` when the session is resolved.

`CAPTCHA_FAILED` and `RATE_LIMITED` are on the AD-7 code list in `code/packages/kernel/src/error.ts`.

## Where

- `code/packages/kernel/src/error.ts`
- `code/apps/api/src/account-schema.ts`
- `code/apps/api/src/account-store.ts`
- `code/apps/api/src/password-hash.ts`
- `code/apps/api/src/create-account.ts`
- `code/apps/api/src/accounts.controller.ts`
- `code/apps/api/src/auth-clock.ts`
- `code/apps/api/src/auth-rate.ts`
- `code/apps/api/src/auth-limit.ts`
- `code/apps/api/src/auth-guard.ts`
- `code/apps/api/src/session-cookie.ts`
- `code/apps/api/src/session-store.ts`
- `code/apps/api/src/create-session.ts`
- `code/apps/api/src/sessions.controller.ts`
- `code/apps/api/src/session-touch.ts`
- `code/apps/api/src/app.module.ts`
- `code/apps/api/src/create-app.ts`
- `code/apps/api/src/create-session.test.ts`
- `code/apps/api/src/create-account.test.ts`
- `code/apps/api/src/operator-config.migrate.test.ts`
- `code/apps/api/drizzle/0002_session.sql`
- `code/apps/api/drizzle/meta/0002_snapshot.json`
- `code/apps/api/drizzle/meta/_journal.json`
- `code/apps/web/src/auth-page.ts`
- `code/apps/web/src/auth-page.test.ts`

## How to run

From `code/`:

```bash
npx vitest run --config vitest.unit.config.ts apps/api/src/create-session.test.ts apps/api/src/create-account.test.ts apps/web/src/auth-page.test.ts
npx vitest run --config vitest.integration.config.ts --fileParallelism false apps/api/src/operator-config.migrate.test.ts
npm run typecheck
npm run lint
npm run migration-check
```

The migrate test starts a throwaway Postgres 17 container and removes it. Auth HTML is `GET /auth` on the web app. Signup posts `/v1/accounts`. Login posts `/v1/sessions`. The web app rewrites `/v1/*` to `http://api:3000`.

## Test cases

| Case | Input | Expected |
| --- | --- | --- |
| Sign in by email | Existing email, any casing, correct password, `remember_me` false | 201. Body keys are only `id`, `kind` `web`, `expires_at` 12 hours ahead. Cookie `ankanu_session` is the id, `Secure`, `HttpOnly`, `SameSite=Lax`, no `Max-Age`, no `Expires`. Session row has no gender. Resolved context gender is the account gender. |
| Sign in by pseudonym | Exact stored pseudonym, `remember_me` true | 201. `expires_at` is 14 days ahead. Cookie `Max-Age=1209600` and no `Expires`. |
| Pseudonym case | Same pseudonym in another case | 401 `UNAUTHENTICATED`. No new session. |
| Padded identifier | Email with leading and trailing spaces | 201. The stored email matches after trim. |
| Remember-me slide | Cookie of a remember-me session on a later request | `last_seen_at` moves to that request. `expires_at` becomes that time plus 14 days. A new `Max-Age` is set. A remember-me-off cookie on a later request does not change `expires_at` and sets no cookie. |
| Expired remember-me | Resolve after `expires_at` | Context is null. |
| Unknown identifier | Identifier that matches no account | 401 `UNAUTHENTICATED`. Message matches the bad-password message. No session. |
| Bad password | Right identifier, wrong password | 401 `UNAUTHENTICATED`. Same message. No session. |
| Two accounts | Identifier is one account's email and another account's pseudonym | 401 `UNAUTHENTICATED`. No session. |
| Oversized password | Password longer than 128 characters | 401 `UNAUTHENTICATED`. No session. |
| Missing session field | `{}` | 400 `UNHANDLED`. `details.field` is `identifier`. No session. |
| Captcha fail | `POST /v1/accounts` with `human_verified` false, the string `"true"`, or omitted | 400 `CAPTCHA_FAILED`. `details.field` is `human_verified`. No account. |
| Captcha pass | `human_verified` true plus a valid Story 2.1 body | 201 account, as in Story 2.1. |
| Rate limit | More than `rl_auth_per_min` posts to the two auth routes from one IP inside 60 seconds | 429 `RATE_LIMITED`. No account and no session from the refused post. A refused post still occupies the window until 60 seconds after the last post. A flood that never pauses for a full window stays refused. The other address is not in that bucket. `::ffff:203.0.113.5` and `203.0.113.5` share a bucket. |
| Unreadable limit | `rl_auth_per_min` is not a positive safe integer | 500 `UNHANDLED`. Nothing is created. |
| Seeded limit | `DATABASE_URL` unset | The reader returns 10. With a database, the seeded row `10` is the number the routes enforce. |
| Junk cookie | `GET /v1/health` with `ankanu_session=nope` | 200. The request is not a database error. |
| Login screen | `GET /auth` | Stitch login and signup markup stay. The added script posts `human_verified` from `#human-verify`, posts `/v1/sessions` with `remember_me` from the login checkbox, and submits login on Enter. It does not add `id="human-verify"` or `id="captcha-box"`. |
| Postgres | Migrated Postgres 17, then sign in | `session` columns are `account_id`, `expires_at`, `id`, `kind`, `last_seen_at`. Remember-me false has no `Max-Age`. Remember-me true slides `expires_at` and `last_seen_at` in `"session"`. |

## Test data

- email `fatim@example.bf`, pseudonym `Fatim_Ouaga`, password `phrase avec espaces`, `human_verified` true, pledge true, `coc_version` `FR-089`
- Login identifier `Fatim@example.bf` and exact `Fatim_Ouaga`
- Second account email `autre@example.bf`, pseudonym `fatim@example.bf`, for the two-match case
- Clock frozen at `2026-10-04T12:00:00.000Z` in the unit session tests
- Postgres 17 throwaway database for the migration test only

## My results

- QA fail on the rate window, then: a denied post at `t+1ms` still refuses a post at `t+60000ms`. A pause of 60 seconds after the last denied post allows the next one. A flood every 59 seconds stays refused until a full quiet window.
- `create-session.test.ts`, `create-account.test.ts`, and `auth-page.test.ts`: 16 passed after that fix
- `operator-config.migrate.test.ts`: 5 passed, including the session insert, the remember-me slide read back from Postgres, the live limit `2` returning 429, a non-numeric limit returning 500, and a junk cookie still returning health 200
- `npm run typecheck` passed
- `npm run lint` passed
- `npm run migration-check` passed (`drizzle-kit check`)
- `npx next build` in `code/apps/web` succeeded. `GET /auth` is a dynamic route. I did not click it in a browser.

## Three validation passes

1. HTTP: email sign-in, pseudonym sign-in, remember-me on and off, slide and expiry, unknown identifier, bad password, two-account identifier, padded identifier, oversized password, missing field, captcha fail, shared rate limit, and unreadable limit.
2. Migration: `0002_session.sql` creates `session` with the five columns and kind check. Empty Postgres 17 applies three migrations. A real `rl_auth_per_min` row is enforced. Remember-me timestamps are read back after a later request.
3. Static: `npm run typecheck`, `npm run lint`, and `npm run migration-check`. The auth script assertions lock the signup checkbox and the login post.

## Solution-design sections

- `session`: `id`, `account_id`, `kind`, `expires_at`, `last_seen_at`. Relationship session N:1 account via `session.account_id`. No gender column and no remember-me column.
- `POST /v1/sessions` on the identity API. This story mints `kind` `web` only.
- `operator_config` key `rl_auth_per_min`, seeded `10`.
- AD-7 codes in code now include `CAPTCHA_FAILED` and `RATE_LIMITED`.
- Founder sentences on this ticket, and only those sentences, for cookie flags, captcha, the rate window, remember-me duration, no CSRF, and `AuthContext.gender` from the account.

## Stitch files

- `code/design-stitch/11-auth/screen.html`
- `code/design-stitch/11-auth/screen.png`

The HTML file was not edited. The page injects a script before `</body>`.

## Known gaps

- Client IP is `socket.remoteAddress` only. No `X-Forwarded-For` was named. Through the web rewrite, browsers share the web container address, so one flood locks both auth routes for everyone on that path.
- The counter is in-process. It is not shared across API replicas and it resets on restart. A denied post still occupies the window until 60 seconds after the last post. The stamp list does not grow with the flood. A continuous flood stays denied until it pauses for a full window.
- This story does not issue CSRF. `POST /v1/sessions` does not require a token.
- Login has no captcha control. Signup `#remember-device` is not wired. Creating an account does not set `ankanu_session`.
- A 201 leaves the member on the auth screen. No next screen was named. Google, password reset, age, and PIN are not this story.
- `Secure` will not stick on plain HTTP. `Path=/` is so the browser sends the cookie outside `/v1`.
- Missing session fields are 400 `UNHANDLED`. Two accounts for one identifier are 401 `UNAUTHENTICATED`. A non-numeric `rl_auth_per_min` is 500 `UNHANDLED`.
- I did not click the auth page in a browser. Compose publishes no host port, and the rewrite target is `http://api:3000` inside the stack. I did not change Compose or a port to force that click. The script strings are locked by `auth-page.test.ts`, and the HTTP behavior is locked by the API tests.
- This commit stays local until QA passes. Do not treat it as pushed.
