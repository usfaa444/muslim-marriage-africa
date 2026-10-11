# Epic 2 ANK-88 QA handoff

This replaces the earlier handoff. [ANK-89](/ANK/issues/ANK-89) is the only QA ticket. [ANK-90](/ANK/issues/ANK-90) is cancelled. Its withdrawn pass is void. Do not push that result. Do not open Epic 3. Do not call the board webhook.

Local code commit, not on GitHub yet: `8286f9bd614ca4d221bff9d0a1b10fb6706cba45`. Handoff commit `02f5ac1223423b1cfab60e3815fb9063526f058d`. The edge note in this file is a later commit. Push waits until ANK-89 passes.

`https://staging.ankanu.com` is the primary host. `GET /` and `GET /v1/health` return 200. The certificate is Let's Encrypt, `CN=staging.ankanu.com`, notAfter 9 Jan 2027. `http://72.61.0.79:4012` is only the non-Secure fallback. Do not use `127.0.0.1` for the cookie check.

## What was built

Verification, change-email, and password-reset links are built only from `ANKANU_PUBLIC_ORIGIN`. The request `Origin` and `Host` are not used. Staging sets `https://staging.ankanu.com`. A missing or invalid value refuses to boot when `NODE_ENV=production`, which is how the api image always starts, including the worker.

`ANKANU_ALLOWED_ORIGINS` on staging is `https://staging.ankanu.com,http://72.61.0.79:4012`. A POST, PATCH, PUT, or DELETE under `/v1` that sends an `Origin` outside that list gets `403` `FORBIDDEN` and message `Origine refusée.` There is no `Access-Control-Allow-Origin`. A request with no `Origin` is not rejected for this reason.

`ankanu_session` stays `HttpOnly`, `SameSite=Lax`, `Path=/`, no `Domain`. It includes `Secure` when the trusted scheme is https. It omits `Secure` only for plain http whose origin is an allowed http origin (the raw IP). `ANKANU_COOKIE_SECURE=false` together with an https public origin still refuses to boot. Staging compose does not set that flag.

`X-Forwarded-Proto`, `X-Forwarded-Host`, `X-Forwarded-For`, `x-ankanu-edge-proto`, and `x-ankanu-edge-host` are trusted only from loopback or `172.16.0.0/12`. The web middleware copies the last hop onto the two `x-ankanu-edge-*` headers before the `/v1` rewrite. Gate redirects use `https://staging.ankanu.com` when that host is the allowed edge host, and `http://72.61.0.79:4012` on the raw IP. A host outside the allow list falls back to the public origin. Rate limits still use the socket address.

Sign-in routing from the previous commit is unchanged. After `POST /v1/sessions` returns 201, the browser reads `GET /v1/accounts/gate` and goes only to that step. There is no `/onboarding` fallback. If that gate read is not OK, or the read throws, the browser calls `DELETE /v1/sessions/current` before showing `La session n'a pas été conservée.` Reload then stays on `/auth`.

On the published raw-IP host (`72.61.0.79:4012`), the web process does not copy a client `X-Forwarded-Proto` or `X-Forwarded-Host` into `x-ankanu-edge-*`. Any IPv4 host is treated as that raw listener, because the edge bundle does not see `ANKANU_ALLOWED_ORIGINS`. Next also sets the request protocol from `X-Forwarded-Proto`, so the raw listener always reports `http` rather than that derived protocol. A POST to that host with `X-Forwarded-Proto: https` still omits `Secure`. A request whose host is `staging.ankanu.com` still uses the forwarded https hop.

## Where

- `code/apps/api/src/public-origin.ts` — configured origin and allow list
- `code/apps/api/src/edge-request.ts` — trusted edge and the 403
- `code/apps/api/src/session-cookie.ts` — Secure from the request scheme
- `code/apps/api/src/main.ts` — boot asserts
- `code/apps/web/middleware.ts` — edge headers for the rewrite; the raw IP ignores client forwarded headers
- `code/apps/web/src/v2-client.ts` — `goToGate` clears the session when the gate read is not OK
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

Primary host: `https://staging.ankanu.com`. Fallback: `http://72.61.0.79:4012`. Do not use `127.0.0.1` for the cookie check. Loopback is exempt from the browser `Secure` rule.

## Test cases

| Case | Action | Expected |
| --- | --- | --- |
| Foreign origin | POST `/v1/sessions` with `Origin: https://evil.example` | `403`, body code `FORBIDDEN`, no CORS header. No mail is sent. |
| Listed origin | Same POST with `Origin: http://72.61.0.79:4012` or `https://staging.ankanu.com` | Not 403. |
| No origin | Same POST with no `Origin` | Not 403. |
| Verification link | Signed-in POST `/v1/accounts/email-verifications` from the raw IP, including a forged `Origin` that is still allowed | `docker logs ankanu-api-1` line path is `https://staging.ankanu.com/email-verification`. The query token is not in this handoff. |
| Reset link | POST `/v1/password-resets` for a verified account | Path is `https://staging.ankanu.com/password-reset`. An unverified account returns 201 and sends nothing. |
| IP cookie | POST `/v1/sessions` or `/v1/accounts` on `http://72.61.0.79:4012` | `Set-Cookie` is `HttpOnly; SameSite=Lax; Path=/`, no `Secure`, no `Domain`. A browser reload stays signed in. |
| Spoofed proto on the IP | Same POST with `X-Forwarded-Proto: https` and `X-Forwarded-Host: staging.ankanu.com` | `Secure` is still absent. |
| Dropped gate | 201, then gate 401, non-OK, or a failed read | `DELETE /v1/sessions/current` runs, then the inline message. Reload stays on `/auth`. No `/onboarding`. |
| HTTPS cookie | Sign in on `https://staging.ankanu.com` in a browser, not loopback | `ankanu_session` is `Secure; HttpOnly; SameSite=Lax`, host-only on `staging.ankanu.com`. Reload stays signed in. |
| IP redirect | Anonymous GET `/onboarding` on the raw IP | `303` to `http://72.61.0.79:4012/auth`. |
| Spoofed host | GET with `X-Forwarded-Host: evil.example` | Location is `https://staging.ankanu.com/...`, not the spoofed host. |
| Edge redirect | GET through the loaded https site | Location is `https://staging.ankanu.com/...`. |
| Sign-in email step | 201, then gate `email` | Lands on `/email-verification`. Reload stays there. |
| Other gate steps | One real account on `https://staging.ankanu.com`, signed in again at each unfinished step. See below. | `/phone`, `/otp`, `/id-liveness`, `/onboarding`. |
| Dropped session | 201, then gate 401 or a failed read | `DELETE /v1/sessions/current`, stay on `/auth` with `La session n'a pas été conservée.` Reload stays on `/auth`. No `/onboarding` fallback. |
| Wrong password, captcha, rate limit | The existing French messages | Shown inline on `#login-error`. Password cleared, email kept, captcha reset. |
| Layout | Error line visible | No horizontal scroll at 360, 390, 768, 1024, 1280, and 1440. `document.documentElement.scrollWidth <= window.innerWidth`. |

## Test data

Staging uses the reCAPTCHA test keys (`RECAPTCHA_ALLOW_TEST_KEYS=1`). A new member needs a unique email and pseudonym, gender, the pledge, civil names, `coc_version` `FR-089`, a DOB that is at least 19, and a password that meets the published rule. A brand-new account's gate step is `email`. Mail is `log:`, so the link is one stdout line: `email <recipient> AnKanu <full link>`.

Do not reuse a member password from a real person. This check created one disposable `@example.bf` account. The password was not written down.

## Sign in at phone, OTP, identity, and account

Use one new member on `https://staging.ankanu.com`. Do not create extra accounts just to reach a step. After each step below, `DELETE /v1/sessions/current` (204, cookie cleared), then sign in again on `/auth` and confirm the landing. Reload must stay on that landing. Do not trip `rl_auth_per_min` on staging. A 429 check stays in the unit tests.

1. Email. A new account signs in to `/email-verification`. The verify link is one `docker logs ankanu-api-1` line, `email <recipient> AnKanu <full link>`, and the path is `https://staging.ankanu.com/email-verification`. Do not copy the token into the ticket. Consuming it moves the gate to `phone`.
2. Phone. The phone page sends `+226` plus the 8 digits entered. `POST /v1/verifications/otp` with `{ "action": "send", "phone_e164": "<E.164>" }` returns 201. The code is one stdout line, `otp <six digits>`. Do not copy it into the ticket.
3. OTP. On `/otp`, submit those 6 digits (`{ "action": "verify", "code": "<six digits>" }`). `status: granted` goes to `/id-liveness`. Sign out and sign in again. The landing is `/id-liveness` (gate `identity`).
4. Identity and account. There is no specimen image in the repo. Use a JPEG or PNG under 5 MiB. The ID control posts that file to `POST /v1/verifications/id`. The liveness control on the page uses the camera and posts a JPEG to `POST /v1/verifications/liveness`. A headless browser with no camera can POST the same JPEG to that path with the session cookie, reload `/id-liveness`, and use `Confirmer et transmettre`. Both responses are 201 with `status` `pending` and no evidence URI. Gate `account` then opens `/onboarding`. Sign out and sign in again. The landing is `/onboarding`. `GET /id-liveness` is `303` to `/onboarding`.

Step 7 can be run on this staging api. Evidence key length 44, kid length 25, `SMTP_URL` scheme `log`. The same upload already returned 201 on 2026-10-11 in `code/docs/qa-handoffs/epic-2-ank-84-qa-report.md`. If a post returns 503, stop and say so. Do not invent a key.

## My results

- Unit files listed above: 7 files, 52 passed.
- `tsc` for `apps/api` and `apps/web`: exit 0.
- `GET http://127.0.0.1:4012/v1/health` returned 200 `role: api`. Web, api, and worker are healthy. `4012` is still bound. Compose env is `ANKANU_PUBLIC_ORIGIN=https://staging.ankanu.com` and the two-origin allow list. `ANKANU_COOKIE_SECURE` is unset.
- POST `/v1/sessions` with `Origin: https://evil.example` returned 403 `FORBIDDEN` and no CORS header. The listed IP origin and a missing origin returned 400 (empty body), not 403.
- `POST /v1/accounts` and `POST /v1/sessions` on `http://72.61.0.79:4012` set `ankanu_session` with flags `Path=/`, `HttpOnly`, `SameSite=Lax`. `Secure` and `Domain` were absent. The cookie jar host was `72.61.0.79`.
- Anonymous `GET /onboarding` on that IP returned 303 to `http://72.61.0.79:4012/auth`. After sign-in, `GET /onboarding` and `GET /auth` both returned 303 to `http://72.61.0.79:4012/email-verification`.
- `X-Forwarded-Host: evil.example` redirected to `https://staging.ankanu.com/auth`.
- After the account was verified, the log paths were `https://staging.ankanu.com/email-verification` and `https://staging.ankanu.com/password-reset`. The same reset with `Origin: https://evil.example` returned 403 and added no log line.
- Headless Chrome on `https://staging.ankanu.com/auth` (not loopback): sign-in landed on `/email-verification`. `ankanu_session` was host `staging.ankanu.com`, `Path=/`, `Secure`, `HttpOnly`, `SameSite=Lax`. Reload stayed on `/email-verification` and the cookie was still present. `POST /v1/accounts` on that host set the same flags, with no `Domain`.
- A signed-in verification and, after consume, a password reset wrote `https://staging.ankanu.com/email-verification` and `https://staging.ankanu.com/password-reset`. The same reset with `Origin: https://evil.example` returned 403.
- `https://sarati.net`, `https://choupi.sarati.net`, and `https://paperclip.sotigi.com` stayed 200 after the restart that loaded the site. `https://staging.sotigi.com` stayed 502. The edge note is `code/docs/staging-edge.md`.
- The auth error markup was not changed. The earlier six-width pass of `04b-sign-in-error` still applies.
- `v2-login.test.ts`, `edge-headers.test.ts`, and `v2-flow.test.ts`: the login and edge-header files passed again after the QA fixes (`edge-headers` 4, `v2-login` 4). `tsc` for `apps/web` exited 0. A failed gate now records `DELETE /v1/sessions/current`. The raw-IP header decision stays `http` when the client sends `X-Forwarded-Proto: https`.
- Live retest after the web-only recreate, port `4012` still bound. `POST /v1/accounts` on `http://72.61.0.79:4012` with `X-Forwarded-Proto: https` and `X-Forwarded-Host: staging.ankanu.com` returned 201 and `Set-Cookie` flags `Path=/; HttpOnly; SameSite=Lax` with no `Secure`. The same POST without those headers omitted `Secure`. `POST /v1/accounts` on `https://staging.ankanu.com` returned 201 with `Secure`. Cookie values were not recorded.
- `POST /v1/sessions` on the raw IP with `X-Forwarded-Proto: https` returned 201 and omitted `Secure`. The following `GET /v1/accounts/gate`, still sending that header, returned 200 `{"step":"email"}`. The same sign-in on `https://staging.ankanu.com` returned 201 with `Secure`.

## Three validation passes

1. Origin, allow list, cookie scheme, and link host. Unit tests passed, and the live IP returned 403 for a foreign origin with links on `https://staging.ankanu.com`.
2. Sign-in routing and redirects. The IP session stayed on `/email-verification`. A spoofed host did not leave the public origin.
3. Typecheck, health, and the https browser cookie. `tsc` passed. Headless Chrome on `https://staging.ankanu.com` kept a Secure host-only session across reload. The auth error line was not restyled; the earlier six-width pass still applies. QA still takes the six widths on this host.

## Solution design and Stitch

Board comment on this ticket: public origin `https://staging.ankanu.com`, allow list of that origin plus `http://72.61.0.79:4012`, `Secure` on https and omitted only for the raw http IP, forwarded headers trusted only from loopback or the docker bridge. `SOLUTION-DESIGN.md` still says the web session cookie is `Secure` + `HttpOnly` + `SameSite=Lax` plus CSRF. This change does not add CSRF. No new table, field, or endpoint was added.

Stitch for the error line is unchanged: `code/design-stitch/ankanu-v2/02-auth/screen.html`. No state switcher was added.

## Known gaps

- The running-container assertion in `compose.test.ts` was not executed.
- Image proof of the error line remains the earlier 360 and 1440 shots. This change did not touch that markup. QA still checks the six widths on `https://staging.ankanu.com`.
- `paperclip-https` rebuilds the Caddyfile from `site.caddy.template`. The staging block is in that template. A later edit of only the live file will be removed on the next container start.
