# Epic 2 ANK-88 QA handoff

Sign-in on plain-http staging was returning to a cleared `/auth` because the session cookie was always `Secure`. Staging is `http://72.61.0.79:4012`. This is a fix on the open epic. Do not open Epic 3. Do not push from QA. Do not call the board webhook.

Local code commit, not on GitHub yet: `3627ad7f7eefa83bd28c16f64140c1708295eed8`. The handoff commit follows it. Push waits until this QA pass.

## What was built

`ANKANU_COOKIE_SECURE` defaults to `true`. Only the exact string `false` omits `Secure`. Any other value refuses to boot. `ANKANU_COOKIE_SECURE=false` together with an `ANKANU_PUBLIC_ORIGIN` whose protocol is `https:` (or a value that starts with `https:` when it is not a URL) refuses to boot. An unset origin is not https. Every `ankanu_session` set and clear goes through `code/apps/api/src/session-cookie.ts`: `HttpOnly`, `SameSite=Lax`, `Path=/`, no `Domain`.

The ankanu api service sets `ANKANU_COOKIE_SECURE=false` in `code/compose.yaml`. Production stays Secure by leaving the flag unset or `true`.

After `POST /v1/sessions` returns 201, the browser reads `GET /v1/accounts/gate` and goes only to:

| `step` | path |
| --- | --- |
| `email` | `/email-verification` |
| `phone` | `/phone` |
| `otp` | `/otp` |
| `identity` | `/id-liveness` |
| `account` | `/onboarding` |

A 401, any other non-ok gate, or a failed read stays on `/auth` and shows `La session n'a pas été conservée.` There is no `|| '/onboarding'` fallback.

Other non-201 responses show `error.message` from the server on `#login-error`. A thrown fetch shows `La connexion a échoué.` The email and "Se souvenir de moi" stay. The password is cleared. The login reCAPTCHA widget is reset. The button enables again only after a new solve and a password. The error is hidden until a real failure. Both auth forms use `method="post"` and no `action`, so a missing script cannot put the password in the query string.

## Where

- `code/apps/api/src/session-cookie.ts` — cookie builder and boot assert
- `code/apps/api/src/main.ts` — calls the boot assert before the worker/api split
- `code/compose.yaml` — api only: `ANKANU_COOKIE_SECURE=false`
- `code/docs/api-host-env.md` — the flag and `ANKANU_PUBLIC_ORIGIN`
- `code/apps/web/src/v2-client.ts` — gate routing and `#login-error`
- `code/apps/web/src/v2-document.ts` — hidden error markup and `method="post"`
- `code/apps/web/src/v2-pages.ts` — wires those into `/auth`

## How to run

Unit checks from `code/`:

```bash
npx vitest run --config vitest.unit.config.ts apps/api/src/session-cookie.test.ts apps/web/src/v2-login.test.ts apps/web/src/v2-flow.test.ts
npx vitest run --config vitest.unit.config.ts apps/web/src/v2-responsive.test.ts
```

Do not run `apps/api/src/compose.test.ts` against project `ankanu`. Its teardown is `docker compose -p ankanu down` and that removes this staging stack.

Staging is already this build. Only `ankanu-web-1` and `ankanu-api-1` were recreated. Postgres, redis, bucket, worker, and every other compose project were left up.

Open `http://72.61.0.79:4012/auth` in a normal browser, not `127.0.0.1`. `127.0.0.1` is exempt from the `Secure` cookie rule and will hide this bug.

## Test cases

| Case | Action | Expected |
| --- | --- | --- |
| Secure default | Unset or `true` | Set and clear include `Secure`. Boot succeeds even if the origin is https. |
| Staging cookie | Flag `false`, origin unset or http | Set and clear omit `Secure`. Boot succeeds. |
| Https refusal | Flag `false` and origin `https://…` | Process exits. `FALSE`, `yes`, and other strings also refuse to boot. |
| Sign-in email step | 201, then gate `email` | Browser stores `ankanu_session` and lands on `/email-verification`. Reload stays there. |
| Sign-in phone / otp / identity / account | Gate returns that step | `/phone`, `/otp`, `/id-liveness`, `/onboarding`. |
| Gate dropped | 201, then gate 401, non-ok, or a failed read | Stay on `/auth`. Inline `La session n'a pas été conservée.` Password cleared, email and remember-me kept, captcha reset. No navigation to `/onboarding`. |
| Wrong password | `401` `UNAUTHENTICATED` | Inline `Identifiant ou mot de passe incorrect.` Same field and captcha reset. |
| Captcha | `400` `CAPTCHA_FAILED` | Inline `Échec de validation de la vérification humaine.` |
| Rate limit | `429` | Inline `Cadence de requêtes régulée.` |
| Locked or held | non-201 with the server French message | That message inline. Same field and captcha reset. |
| Network | sign-in fetch throws | Inline `La connexion a échoué.` |
| Signup | `POST /v1/accounts` 201 on this http host | `Set-Cookie` has no `Secure`. The browser keeps it. |
| Form | Script missing | Password is not placed in the query string. |
| Layout | Error line visible | No horizontal scroll at 360, 390, 768, 1024, 1280, and 1440. `document.documentElement.scrollWidth <= window.innerWidth`. |

## Test data

Staging uses the reCAPTCHA test keys (`RECAPTCHA_ALLOW_TEST_KEYS=1`). A new member needs a unique email and pseudonym, gender, the pledge, civil names, `coc_version` `FR-089`, a DOB that is at least 19, and a password that meets the published rule (the unit fixtures use `phrase avec espaces`). A brand-new account's gate step is `email`.

Do not reuse a member password from a real person. The headless check created disposable `ank88-…@example.bf` accounts. Those passwords were not written down.

## My results

- `session-cookie.test.ts`, `v2-login.test.ts`, and `v2-flow.test.ts`: 20 passed, then 8 passed again after the compose assertion was added to the cookie file.
- `v2-responsive.test.ts`: 1 passed. `04b-sign-in-error` was visible at all six widths and `scrollWidth` stayed within the viewport. Shots saved at 360 and 1440: `code/docs/qa-handoffs/ank-88-widths/04b-sign-in-error-360.png` and `04b-sign-in-error-1440.png`. The harness still records images only at those two widths. The assertion ran at all six.
- `POST /v1/accounts` on `http://72.61.0.79:4012` returned 201. `Set-Cookie` flags were `Path`, `HttpOnly`, `SameSite`. `Secure` was absent.
- Headless Chrome on `http://72.61.0.79:4012/auth` (not loopback): sign-in stored `ankanu_session` for domain `72.61.0.79`, `Path=/`, `HttpOnly`, `SameSite=Lax`, `secure: false`. Reload stayed on `/email-verification` and the cookie was still present.
- Live `/auth` HTML contains hidden `#login-error`, `id="login-form" method="post"`, and does not contain `|| '/onboarding'`.
- Api container env includes `ANKANU_COOKIE_SECURE=false`. `GET /v1/health` returned `200` `role: api`.
- `ankanu-postgres-1`, `ankanu-redis-1`, `ankanu-bucket-1`, and `ankanu-worker-1` were still up from 5 days earlier after the recreate. Other projects were not restarted.

## Three validation passes

1. API and cookie: boot flag, set/clear attributes, https refusal, and the compose file line. Passed.
2. Client routing: each gate step, gate 401 and failed reads, each error code, password cleared, email kept, captcha reset, no `/onboarding` fallback. Passed.
3. Frontend fidelity and responsiveness: hidden v2 error pattern, post method, and the six widths with the error line shown. Passed.

## Solution design and Stitch

Board decision on this ticket: `Secure` follows the deployment; sign-in routing uses the gate step only; errors use the v2 `#email-error` pattern. `SOLUTION-DESIGN.md` still says the web session cookie is `Secure` + `HttpOnly` + `SameSite=Lax` plus CSRF (auth paragraph near the identity routes). This change does not add CSRF. No other auth rule was changed.

Stitch matched for the error line: `code/design-stitch/ankanu-v2/02-auth/screen.html` (`#email-error`: `text-xs text-[#9B2C2C]`, `error` icon). The line is inserted before `<!-- Se souvenir de moi -->` and starts hidden. The Stitch file was not edited. No state switcher, demo error, or all-states gallery was added.

## Known gaps

- The running-container assertion in `code/apps/api/src/compose.test.ts` was not executed. That file's suite tears down project `ankanu`.
- A failed gate on the password-reset "enter" button no longer falls through to `/onboarding`. The button stays on the reset page. A successful reset still follows the gate step.
- Image proof of the error line is at 360 and 1440. The other four widths were measured, not saved.
