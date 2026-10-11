# Epic 2 ANK-88 QA handoff

This replaces the earlier handoff. [ANK-89](/ANK/issues/ANK-89) is the only QA ticket. [ANK-90](/ANK/issues/ANK-90) is cancelled. Its withdrawn pass is void. Do not push that result. Do not open Epic 3. Do not call the board webhook.

Local code commit, not on GitHub yet: `8286f9bd614ca4d221bff9d0a1b10fb6706cba45`. The handoff commit follows it. Push waits until ANK-89 passes.

`https://staging.ankanu.com` is not serving yet. Caddy validated the site block and then refused `caddy reload` because `admin off` leaves port 2019 closed. The live file was restored from the backup. Do not treat a TLS failure on that host as an app failure, and do not pass the https cases until `GET /` and `GET /v1/health` return 200 with a valid certificate. The raw IP cases below can be run now.

## What was built

Verification, change-email, and password-reset links are built only from `ANKANU_PUBLIC_ORIGIN`. The request `Origin` and `Host` are not used. Staging sets `https://staging.ankanu.com`. A missing or invalid value refuses to boot when `NODE_ENV=production`, which is how the api image always starts, including the worker.

`ANKANU_ALLOWED_ORIGINS` on staging is `https://staging.ankanu.com,http://72.61.0.79:4012`. A POST, PATCH, PUT, or DELETE under `/v1` that sends an `Origin` outside that list gets `403` `FORBIDDEN` and message `Origine refusée.` There is no `Access-Control-Allow-Origin`. A request with no `Origin` is not rejected for this reason.

`ankanu_session` stays `HttpOnly`, `SameSite=Lax`, `Path=/`, no `Domain`. It includes `Secure` when the trusted scheme is https. It omits `Secure` only for plain http whose origin is an allowed http origin (the raw IP). `ANKANU_COOKIE_SECURE=false` together with an https public origin still refuses to boot. Staging compose does not set that flag.

`X-Forwarded-Proto`, `X-Forwarded-Host`, `X-Forwarded-For`, `x-ankanu-edge-proto`, and `x-ankanu-edge-host` are trusted only from loopback or `172.16.0.0/12`. The web middleware copies the last hop onto the two `x-ankanu-edge-*` headers before the `/v1` rewrite. Gate redirects use `https://staging.ankanu.com` when that host is the allowed edge host, and `http://72.61.0.79:4012` on the raw IP. A host outside the allow list falls back to the public origin. Rate limits still use the socket address.

Sign-in routing from the previous commit is unchanged. After `POST /v1/sessions` returns 201, the browser reads `GET /v1/accounts/gate` and goes only to that step. There is no `/onboarding` fallback. A dropped session stays on `/auth` and shows `La session n'a pas été conservée.`

## Where

- `code/apps/api/src/public-origin.ts` — configured origin and allow list
- `code/apps/api/src/edge-request.ts` — trusted edge and the 403
- `code/apps/api/src/session-cookie.ts` — Secure from the request scheme
- `code/apps/api/src/main.ts` — boot asserts
- `code/apps/web/middleware.ts` — edge headers for the rewrite
- `code/apps/web/src/entry-guard.ts` — redirect origin
- `code/compose.yaml` — origin env on web, api, and worker
- `code/docs/api-host-env.md` and `code/docs/staging-edge.md` — settings and the edge

## How to run

From `code/`:

```bash
npx vitest run --config vitest.unit.config.ts apps/api/src/session-cookie.test.ts apps/api/src/edge-request.test.ts apps/api/src/email-verification.test.ts apps/api/src/password-reset.test.ts apps/api/src/change-email.test.ts apps/web/src/v2-flow.test.ts apps/web/src/v2-login.test.ts
npx tsc -p apps/api/tsconfig.json --noEmit
npx tsc -p apps/web/tsconfig.json --noEmit
```

Do not run `apps/api/src/compose.test.ts` against project `ankanu`. Its teardown is `docker compose -p ankanu down`.

Staging web, api, and worker were recreated with `code/compose.yaml` and `/root/ankanu-epic2/compose.ports.yml`. Port `4012` is still published. Postgres, redis, and the bucket were left up. Other compose projects were not restarted.

Primary host, once the edge is loaded: `https://staging.ankanu.com`. Fallback: `http://72.61.0.79:4012`. Do not use `127.0.0.1` for the cookie check. Loopback is exempt from the browser `Secure` rule.

## Test cases

| Case | Action | Expected |
| --- | --- | --- |
| Foreign origin | POST `/v1/sessions` with `Origin: https://evil.example` | `403`, body code `FORBIDDEN`, no CORS header. No mail is sent. |
| Listed origin | Same POST with `Origin: http://72.61.0.79:4012` or `https://staging.ankanu.com` | Not 403. |
| No origin | Same POST with no `Origin` | Not 403. |
| Verification link | Signed-in POST `/v1/accounts/email-verifications` from the raw IP, including a forged `Origin` that is still allowed | `docker logs ankanu-api-1` line path is `https://staging.ankanu.com/email-verification`. The query token is not in this handoff. |
| Reset link | POST `/v1/password-resets` for a verified account | Path is `https://staging.ankanu.com/password-reset`. An unverified account returns 201 and sends nothing. |
| IP cookie | POST `/v1/sessions` or `/v1/accounts` on `http://72.61.0.79:4012` | `Set-Cookie` is `HttpOnly; SameSite=Lax; Path=/`, no `Secure`, no `Domain`. A browser reload stays signed in. |
| HTTPS cookie | Sign in on `https://staging.ankanu.com` in a browser, not loopback | `ankanu_session` is `Secure; HttpOnly; SameSite=Lax`, host-only on `staging.ankanu.com`. Reload stays signed in. |
| IP redirect | Anonymous GET `/onboarding` on the raw IP | `303` to `http://72.61.0.79:4012/auth`. |
| Spoofed host | GET with `X-Forwarded-Host: evil.example` | Location is `https://staging.ankanu.com/...`, not the spoofed host. |
| Edge redirect | GET through the loaded https site | Location is `https://staging.ankanu.com/...`. |
| Sign-in email step | 201, then gate `email` | Lands on `/email-verification`. Reload stays there. |
| Other gate steps | Gate returns `phone`, `otp`, `identity`, or `account` | `/phone`, `/otp`, `/id-liveness`, `/onboarding`. |
| Dropped session | 201, then gate 401 or a failed read | Stay on `/auth` with `La session n'a pas été conservée.` No `/onboarding` fallback. |
| Wrong password, captcha, rate limit | The existing French messages | Shown inline on `#login-error`. Password cleared, email kept, captcha reset. |
| Layout | Error line visible | No horizontal scroll at 360, 390, 768, 1024, 1280, and 1440. `document.documentElement.scrollWidth <= window.innerWidth`. |

## Test data

Staging uses the reCAPTCHA test keys (`RECAPTCHA_ALLOW_TEST_KEYS=1`). A new member needs a unique email and pseudonym, gender, the pledge, civil names, `coc_version` `FR-089`, a DOB that is at least 19, and a password that meets the published rule. A brand-new account's gate step is `email`. Mail is `log:`, so the link is one stdout line: `email <recipient> AnKanu <full link>`.

Do not reuse a member password from a real person. This check created one disposable `@example.bf` account. The password was not written down.

## My results

- Unit files listed above: 7 files, 52 passed.
- `tsc` for `apps/api` and `apps/web`: exit 0.
- `GET http://127.0.0.1:4012/v1/health` returned 200 `role: api`. Web, api, and worker are healthy. `4012` is still bound. Compose env is `ANKANU_PUBLIC_ORIGIN=https://staging.ankanu.com` and the two-origin allow list. `ANKANU_COOKIE_SECURE` is unset.
- POST `/v1/sessions` with `Origin: https://evil.example` returned 403 `FORBIDDEN` and no CORS header. The listed IP origin and a missing origin returned 400 (empty body), not 403.
- `POST /v1/accounts` and `POST /v1/sessions` on `http://72.61.0.79:4012` set `ankanu_session` with flags `Path=/`, `HttpOnly`, `SameSite=Lax`. `Secure` and `Domain` were absent. The cookie jar host was `72.61.0.79`.
- Anonymous `GET /onboarding` on that IP returned 303 to `http://72.61.0.79:4012/auth`. After sign-in, `GET /onboarding` and `GET /auth` both returned 303 to `http://72.61.0.79:4012/email-verification`.
- `X-Forwarded-Host: evil.example` redirected to `https://staging.ankanu.com/auth`.
- After the account was verified, the log paths were `https://staging.ankanu.com/email-verification` and `https://staging.ankanu.com/password-reset`. The same reset with `Origin: https://evil.example` returned 403 and added no log line.
- Inside `sotigi-staging-edge-1`, `GET http://172.24.0.1:4012/` and `/v1/health` returned 200. Caddy validate passed. Caddy reload failed on `localhost:2019` because admin is off. The Caddyfile was restored. `https://sarati.net`, `https://choupi.sarati.net`, and `https://paperclip.sotigi.com` stayed 200. `https://staging.sotigi.com` stayed 502. `https://sotigi.com` and `https://staging.ankanu.com` stayed a TLS alert.
- The auth error markup was not changed. The earlier six-width pass of `04b-sign-in-error` still applies.

## Three validation passes

1. Origin, allow list, cookie scheme, and link host. Unit tests passed, and the live IP returned 403 for a foreign origin with links on `https://staging.ankanu.com`.
2. Sign-in routing and redirects. The IP session stayed on `/email-verification`. A spoofed host did not leave the public origin.
3. Typecheck, health, and the existing auth error line. `tsc` passed. The error line was not restyled. The https browser cookie and the six-width shots on `https://staging.ankanu.com` are not done, because that host is not loaded.

## Solution design and Stitch

Board comment on this ticket: public origin `https://staging.ankanu.com`, allow list of that origin plus `http://72.61.0.79:4012`, `Secure` on https and omitted only for the raw http IP, forwarded headers trusted only from loopback or the docker bridge. `SOLUTION-DESIGN.md` still says the web session cookie is `Secure` + `HttpOnly` + `SameSite=Lax` plus CSRF. This change does not add CSRF. No new table, field, or endpoint was added.

Stitch for the error line is unchanged: `code/design-stitch/ankanu-v2/02-auth/screen.html`. No state switcher was added.

## Known gaps

- `https://staging.ankanu.com` is not in the running Caddy config. The https cookie, the https redirect, and the certificate check are blocked on a founder decision to restart `sotigi-staging-edge-1` once. The procedure forbids that restart while `admin off` makes `caddy reload` impossible.
- The running-container assertion in `compose.test.ts` was not executed.
- Image proof of the error line remains the earlier 360 and 1440 shots. This change did not touch that markup.
