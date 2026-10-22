# fix-e2e-auth-smoke QA handoff

The factory smoke suite failed against the full local Docker stack (`E2E_BASE_URL=http://localhost:4012 npm run test:e2e`, Fay's Mac): 9 passed, 5 failed, 4 skipped. All 5 failures were console errors on `/auth`, or on `/auth` after the Discover redirect:

1. `Failed to load resource: the server responded with a status of 401 (Unauthorized) http://localhost:4012/v1/accounts/gate`
2. `requestStorageAccess: Permission denied.` from Google's reCAPTCHA `anchor` and `bframe` iframes (test site key `6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI`)

Branch `factory/e2e-auth-smoke`, based on `origin/main` at `7505c57`.

## What was built

### Error 1: the browser no longer reads the gate on a sign-in page load (product fix)

Root cause: the login panel script (`accountScript(…, 'login')` in `v2-client.ts`) registered a `pageshow` handler that called `GET /v1/accounts/gate` on every page show, including a fresh load. For a signed-out visitor the API answers `401 UNAUTHENTICATED`, and Chromium logs every 4xx fetch as `Failed to load resource`. The web-only run did not catch it because `known-issues.ts` tolerates all `/v1` errors when there is no API.

That read did no work on a fresh load. `/auth` is served by `authResponse`, which runs the server entry guard (`entryRedirect`) with the request's cookie before it renders anything, and answers with `cache-control: no-store`. A signed-in account never receives the form: the guard sends `303` to `/decouvrir` (step `account`) or to the step screen (`/email-verification`, `/phone`, `/otp`, `/id-liveness`). So a fresh `/auth` document has always just been through the guard. The client read only matters for a page restored from the back-forward cache, which skips the server. That was the case commit `4eddaa3` (ANK-156) added it for.

The change:

- Fresh load (`pageshow` with `persisted: false`): nothing happens. No request, no 401.
- Restore from the back-forward cache (`persisted: true`): `#login-form` gets `hidden` and the page calls `location.reload()`. The reload goes back through the server guard. A signed-in account is redirected to the same place as before (`/decouvrir` for `account`, the step screen otherwise). A signed-out visitor gets a fresh form. The browser never reads the gate, so a signed-out visitor never logs a 401 here, even on Back.
- The server guard is now the only place that decides who sees the login form (`entry-guard.ts`: "Client flags never decide the next screen"). The client step table for this handler is gone. `STEP` is still used by sign-in submit.
- Unchanged: after `POST /v1/sessions` returns 201, the browser still reads `GET /v1/accounts/gate` (`goToGate`) and follows the step. A 401 there still shows « La session n'a pas été conservée. » and ends the session. `/id-liveness` and `/onboarding` still read the gate. These pages are only served to signed-in accounts.

### The gate contract is unchanged, and now has a test

`GET /v1/accounts/gate` still answers `401` with the AD-7 envelope (`UNAUTHENTICATED`, `Authentification requise.`, `retryable: false`) when there is no live session. I kept the 401 rather than adding a signed-out `200`:

- Every session-scoped read in the API answers `401 UNAUTHENTICATED` with no session (`/v1/accounts/email-verifications`, `/v1/verifications/*`, `/v1/me/*`). SOLUTION-DESIGN §7 defines the gate as the step "for the session". A signed-out `200` would be the one exception.
- The server guard depends on it: `fetchGateStep` maps `401` to `anon`.
- Once the browser stops reading the gate on public pages, nothing on a signed-out page load calls it.

There was no API test for the signed-out answer, so I added one (no cookie, unknown session id, expired session). I also added a web test that pins how `fetchGateStep` reads that answer. No API code, endpoint, schema or authorization changed.

### Error 2: reCAPTCHA storage access, one narrow known-issue entry

Root cause: Chromium writes this message when a script calls `document.requestStorageAccess()` and the permission is denied. Here the script is Google's reCAPTCHA code inside its own cross-origin iframes. Playwright's default headless Chromium (the headless shell) denies the request, so each iframe logs it on load. Our code never calls the API: `grep -r requestStorageAccess` over `code/` finds it only in an unserved Stitch capture (`01-splash/screen.html`). The widget loads only when `RECAPTCHA_SITE_KEY` is set, which is why the web-only CI run never sees it. Neither our page nor its headers can stop it.

New entry in `e2e/known-issues.ts` (reason included). It matches only:

- the exact Chromium text `requestStorageAccess: Permission denied.`
- followed by a page URL of `https://www.google.com/recaptcha/api2/anchor?…` or `…/api2/bframe?…`
- with `k=6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI`, the test site key in `compose.yaml` and on staging.

The same message from our origin, another host, another reCAPTCHA path or another site key still fails the test. So does any other error from those iframes. `e2e/known-issues.spec.ts` checks all of these cases.

Google is blocked in this sandbox, so I could not load the real iframes. To check the exact text the fixture records, I ran a local probe: a cross-origin iframe calls `requestStorageAccess()` in Playwright's headless shell (chromium-1194). Playwright reported `type: error`, text `requestStorageAccess: Permission denied.`, and `location.url` = the iframe's document URL. That is the `text + ' ' + url` string the guard builds, and the regex is written against it. The full Chrome binary granted the request, which is why the error depends on the browser build.

## Where

| File | Change |
| --- | --- |
| `code/apps/web/src/v2-client.ts` | Login `pageshow` handler: no gate read on a fresh load; hide the form and `location.reload()` on a back-forward cache restore. |
| `code/apps/web/src/v2-login.test.ts` | Runtime test of the handler (fresh: no request, no reload; restored: hidden form, one reload, no request). The signup panel registers no `pageshow`. Updated the script assertions. |
| `code/apps/web/src/v2-flow.test.ts` | `fetchGateStep`: 401 → `anon`, step → step, unknown step / 5xx / throw → `error`. `/auth` is served `cache-control: no-store`. |
| `code/apps/api/src/create-session.test.ts` | `GET /v1/accounts/gate` is `401 UNAUTHENTICATED` with no cookie, an unknown session id, and an expired session. |
| `code/e2e/auth-entry.spec.ts` | New e2e test: `/auth` and `/decouvrir` signed out show the form with no browser gate read. A restored `/auth` reloads through the server and makes no gate read. |
| `code/e2e/known-issues.ts` | One entry for Google's reCAPTCHA storage-access message (see above). |
| `code/e2e/known-issues.spec.ts` | Checks the allow-list with no page: the reCAPTCHA entry matches only the Google iframes for the test key, and a gate 401 against a stack is never tolerated. Uses plain `@playwright/test` because it opens no page. Runs once (desktop project). |

No migration, env var, flag, endpoint or route.

## How to run

From `code/`:

```bash
npm ci
npm run lint && npm run typecheck
npm run test:unit
npm run test:integration            # needs Docker
npm run test:e2e                    # web only, CI mode
# full stack, as in .factory/config.md "Local deployment":
docker compose -p ankanu-local --env-file ~/.ankanu/local.env \
  -f compose.yaml -f ~/.ankanu/compose.local.yml up -d --build --wait
E2E_BASE_URL=http://localhost:4012 npm run test:e2e
```

Expected against the full stack: `22 passed, 6 skipped`. Of these, the smoke suite is 14 passed and 4 skipped (the mobile width sweep).

## Trace table

| ID | Failing test / error | Root cause | Fix | Proven by | Status |
| --- | --- | --- | --- | --- | --- |
| T1 | `[mobile] public page /auth › renders without console errors and passes axe AA` | Browser `GET /v1/accounts/gate` → 401 on a fresh `/auth` | No gate read on a fresh load (`v2-client.ts`) | `smoke.spec.ts` against the stack, `auth-entry.spec.ts` (`/auth`) | Pass, scratch full stack + web only |
| T2 | `[desktop] public page /auth › renders without console errors and passes axe AA` | same | same | same | Pass |
| T3 | `[desktop] public page /auth › fits every factory width` (6 loads, 6 × 401) | same | same | `smoke.spec.ts` width sweep against the stack | Pass |
| T4 | `[mobile] a signed-out visitor is sent from Discover to sign-in` | `/decouvrir` → 303 `/auth`, then the same 401 | same | `smoke.spec.ts`, `auth-entry.spec.ts` (`/decouvrir`) | Pass |
| T5 | `[desktop] a signed-out visitor is sent from Discover to sign-in` | same | same | same | Pass |
| E1 | `Failed to load resource: … 401 (Unauthorized) …/v1/accounts/gate` | Client read was redundant with the server guard on a fresh load | Removed. A restore reloads through the guard. | `v2-login.test.ts` "reads no gate on a fresh sign-in page…"; e2e above | Pass. Fails on `origin/main` (unit: `['fetch /v1/accounts/gate']`; e2e web only: 6/6 fail) |
| E2 | `requestStorageAccess: Permission denied.` from reCAPTCHA `anchor` / `bframe` | Google's iframe code; headless shell denies storage access | Narrow known-issue entry | `known-issues.spec.ts`; the Chromium probe above | Entry checked. **The real Google iframes were not run here (Google blocked).** Needs a run on Fay's Mac. |
| G1 | Signed-in member must stay off the login form (ANK-156) | n/a | Fresh `/auth`: server guard, unchanged. Restored `/auth`: reload → guard. | `v2-flow.test.ts` "sends a signed-in account away from the login form" (303 `/decouvrir`, `/phone`); `v2-login.test.ts` restore → reload; browser check below | Pass |
| G2 | Gate contract and server authorization unchanged | n/a | No API change | `create-session.test.ts` gate 401 ×3; `staff-verification-grant.test.ts` gate 200 `{ step }`; `fetchGateStep` test | Pass |
| G3 | No blanket allow-list | n/a | No `/v1` or 401 entry. The reCAPTCHA entry is pinned to text, host, path and key. | `known-issues.spec.ts` | Pass |
| N1 | Accessibility (axe 2.2 AA) and widths 360–1440 on `/auth` | n/a | No markup change | Smoke axe and width tests against the stack | Pass (sandbox: Tailwind CDN blocked, see below) |

## Test cases for QA

| Case | Steps | Expected |
| --- | --- | --- |
| Signed out, fresh `/auth` | Open `/auth` in a new context. Watch the network. | 200, `#login-form` visible. No request to `/v1/accounts/gate`. No console error except the reCAPTCHA entry, which shows as a `known-issue` annotation. |
| Signed out, Discover | Open `/decouvrir` | 303 to `/auth`, same as above. |
| Signed out, restored `/auth` | On `/auth`, run `window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }))`, or go Back to `/auth` in a browser with bfcache | The form hides and the page reloads once. Fresh form, still no gate request. |
| Signed in, restored `/auth` | Sign in on `/auth`, then do the restore above with the session cookie present (or Back to a cached `/auth`) | Reload, then 303 to the step: `/decouvrir` for `account`, else `/email-verification`, `/phone`, `/otp` or `/id-liveness`. The login form is not shown. |
| Signed in, fresh `/auth` | Open `/auth` with a live session | 303 to the step, as above. Unchanged. |
| Sign-in submit | Submit valid credentials | `POST /v1/sessions` 201, then `GET /v1/accounts/gate`, then the step screen. A 401 on that read shows « La session n'a pas été conservée. ». Unchanged. |
| Gate API, signed out | `curl -i $BASE/v1/accounts/gate` | `401`, `{"error":{"code":"UNAUTHENTICATED","message":"Authentification requise.","details":null,"request_id":…,"retryable":false}}`. Unchanged. |
| reCAPTCHA entry, near misses | `npx playwright test e2e/known-issues.spec.ts` | Matches only the Google anchor/bframe URLs with the test key. |
| Full stack smoke on a Mac | Full-stack command above | `22 passed, 6 skipped`. Annotations list only the reCAPTCHA entry for `/auth`. |

## Self-check results (this sandbox)

| Check | Result |
| --- | --- |
| `npm ci` | OK (290 packages) |
| `npm run lint` | exit 0, 0 errors, 3 warnings (all pre-existing: `life-pause.ts`, `v2-flow.test.ts:485`, `photo-rules.test.ts`) |
| `npm run typecheck` | exit 0 |
| `npm run migration-check` | `Everything's fine` |
| `npm run test:unit` | `Tests 1 failed / 336 passed / 12 skipped (349)`. Baseline `origin/main`: `1 failed / 333 passed / 12 skipped`. The one failure is the same on both: `photo-rules.test.ts` "keeps a 32px play circle in Chrome" needs a Chrome binary at a fixed path. |
| Chrome-backed unit tests | With a Chrome path supplied (`HOME` override), `photo-rules`, `v2-responsive` and `ank-148-fix` time out in this sandbox because the Tailwind CDN and Google are blocked. `photo-rules` times out the same way on `origin/main`. These runs also rewrite the tracked screenshots under `docs/qa-handoffs/*-widths/`; I restored them and none are committed. |
| `npm run test:integration` | `Tests 1 failed / 26 passed (27)`, run from a scratch copy whose Dockerfiles add the proxy CA. The failure is environmental: `compose.test.ts` "makes web, api, worker… healthy" reads `/proc/net/tcp6` inside the worker, and containers here have no IPv6 (`docker run node:24.21.0 ls /proc/net/tcp6` → no such file). All six services did come up healthy. This change does not touch compose, the worker or the API runtime. |
| `npm run test:e2e` web only | `22 passed, 6 skipped` (headless shell 1194, `E2E_ALLOW_ERRORS` for the blocked Tailwind CDN only). JSON report: no `/v1` known-issue annotation remains. The only annotations are the sandbox Tailwind ones. |
| New e2e on `origin/main` code, web only | `6 failed`: 4 record `GET http://localhost:3100/v1/accounts/gate`, 2 restore tests never reload |
| Smoke, scratch full stack, `origin/main` images | `5 failed, 4 skipped, 9 passed`: the same 5 tests as on Fay's Mac, with `Failed to load resource: the server responded with a status of 401 (Unauthorized) http://localhost:4032/v1/accounts/gate` |
| Full e2e, scratch full stack, fixed web image | `22 passed, 6 skipped` (smoke 14 passed, 4 skipped) |
| Browser check, signed in, scratch stack | Seeded session (step `email`) at 360 and 1440. A restored `/auth` reloads, gets 303, and lands on `/email-verification` with no `#login-form`. A fresh `/auth` also lands on `/email-verification`. 0 browser gate reads, 0 console errors apart from the blocked hosts. |

Scratch full stack: project `ankanu-dev2`, web published on `4032`. Images were built from scratch copies of the Dockerfiles that add the proxy CA. The env and override files were outside the repo, and Postgres volumes were redirected to scratch.

## Out of scope

- The client gate reads after sign-in (`goToGate`), on `/id-liveness` and on `/onboarding` stay as they are. They run only with a session.
- `known-issues.ts` keeps its web-only `/v1/` entry. With no API every `/v1` call fails by design. After this change, the smoke and sign-in specs make no `/v1` call in the web-only run.

## Assumptions and known issues

- **Not reproducible here: error 2.** Google and the Tailwind CDN are blocked in this sandbox. The reCAPTCHA iframes never loaded, so the new entry has not been matched against the real Google messages. Its format comes from the local probe above. Fay's Mac uses Playwright 1.64.1's own Chromium, which is newer than the sandbox's chromium-1194. If the Mac run still shows a storage-access error, compare its exact text and URL with the regex. Do not widen the regex beyond Google's iframes.
- Sandbox-only `E2E_ALLOW_ERRORS`: `https://cdn\.tailwindcss\.com/\?plugins=forms.container-queries`, `^tailwind is not defined$`, and, for the stack only, `https://www\.google\.com/recaptcha/api\.js\?onload=onRecaptchaLoad&render=explicit`. Do not set these on a machine that can reach those hosts.
- Signed-in e2e: the API verifies `recaptcha_token` with Google siteverify, which is blocked here. `POST /v1/accounts` therefore returns `CAPTCHA_FAILED` in this sandbox, and I could not create an account through the API. The signed-in browser check used a session row seeded directly in the scratch database. No signed-in e2e test is committed. QA can run the signed-in restore case on staging or Fay's Mac with a disposable account (`recaptcha_token: test-ok`).
- Observation: a fresh stack's database had no tables. The API does not run `apps/api/drizzle/*.sql` at boot, and `POST /v1/accounts` returned 500 until I applied them with `psql`. If `~/.ankanu` on Fay's Mac is a fresh volume, sign-up there may hit the same problem. Unrelated to this fix.
- Observation: with the full Chrome binary (`PLAYWRIGHT_CHROMIUM_EXECUTABLE=…/chrome`) rather than the headless shell, the stack run also logs `favicon.ico` 404 on `localhost:4032`. The existing favicon entry matches only `localhost:3100`. Playwright's default headless shell does not fetch the favicon, which is why Fay's run did not show it. Not changed here.
- `next dev`, started by the web-only e2e run, writes untracked `apps/web/AGENTS.md` and `apps/web/CLAUDE.md`. They are not part of this change.
