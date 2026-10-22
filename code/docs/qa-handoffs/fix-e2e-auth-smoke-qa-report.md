# fix-e2e-auth-smoke QA report

model: Claude Sonnet 5.5 (`claude-sonnet-5-5`), independent QA phase, factory-qa skill

Verdict: **PASS** with four minor in-scope findings and one pre-existing major defect that is not attributable to this story (details below). One confirmation cannot be made in this sandbox and is listed as an open item for Fay's Mac run (finding F1).

- Date: 2026-10-22
- Story: `fix-e2e-auth-smoke` (no BMAD spec; acceptance criteria (a) to (e) as given by the orchestrator)
- Build under test: branch `factory/e2e-auth-smoke`, head `f5ba843` (2 commits on `origin/main` `7505c57`)
- Environment: local Docker in the QA container, fresh scratch stack, project `ankanu-qa2`, web on `http://localhost:4012`, Postgres on `127.0.0.1:55432`. Browser: Playwright's Chromium headless shell 141 (`chromium_headless_shell-1194`, the same kind of binary Playwright uses by default for headless runs). No WebKit is installed.
- Evidence folder: `fix-e2e-auth-smoke-evidence/` (next to this file). Every row below cites a file in it.

## Summary of what was verified

| Criterion | Result | Short evidence |
| --- | --- | --- |
| (a) signed-out `/auth` and Discover-to-sign-in log no 401 and still work | PASS | Browser: 0 gate requests, 0 console errors, 0 4xx/5xx on both profiles. Smoke on the stack: 14 passed, 4 skipped. The same smoke file against the `origin/main` web image reproduces Fay's numbers exactly: 9 passed, 5 failed, 4 skipped, all five on `GET /v1/accounts/gate` 401. |
| (b) signed-in member cannot use the sign-in form (server redirect and restore both send them on) | PASS | Server 303 for all five gate steps, fresh and restored, on both profiles (20 checks). Restore is simulated with a `pageshow` event with `persisted: true` because Chromium does not put this `no-store` page in the back-forward cache and no WebKit is available (finding F4). |
| (c) server-side authorization of the gate and every other session endpoint unchanged | PASS | API source is byte-identical to `origin/main` (the only API file in the diff is a test). Gate answers the same 401 envelope; 39 session routes answer 401 with no session; staff routes answer 403 to a member. |
| (d) known-issues entry narrow, with a reason; near misses still fail | PASS | 27-case probe of the regex, 4 simulated near misses through the repo's own fixture, 3 mutations of the entry caught. The `/v1/` web-only entry is inactive when `E2E_BASE_URL` is set. |
| (e) local deployment instructions correct and complete | PASS for a fresh stack, with documentation gaps for later resets (F2) | Followed literally with the sandbox adaptations listed below: signup, email link in the api log, phone OTP in the api log, ID and liveness uploads 201. |

## Gate summary

| Gate | Result | Evidence |
| --- | --- | --- |
| G1 Static | PASS (one pre-existing audit failure, P4) | `g1-lint.txt` (exit 0, 0 errors, 3 pre-existing warnings), `g1-typecheck.txt` (exit 0), `g1-migration-check.txt` (OK), `g1-audit.txt` (exit 1, 1 high: Next.js, `package.json` and lockfile are not in the diff), secret and debug scan of the diff: nothing found |
| G2 Automated tests | PASS | Unit `g2-unit.txt`: 336 passed, 1 failed (environmental, P6), 12 skipped. Integration `g2-integration.txt`: 26 passed, 1 failed (environmental, P6). E2E on the stack `g2-e2e-stack-run1.txt`: 22 passed, 6 skipped. Smoke only `g2-e2e-head-smoke.txt`: 14 passed, 4 skipped. `--repeat-each=3` `g2-e2e-head-repeat3.txt`: 66 passed, 18 skipped, 0 flaky. Web-only `g2-e2e-webonly.txt`: 22 passed, 6 skipped. Baseline `g2-e2e-main-baseline.txt`: 9 passed, 5 failed, 4 skipped. Mutation spot-checks (8): `g2-mutation-spotchecks.txt`, all caught. |
| G3 Functional in a real browser | PASS | `g3-core.txt`, `g3-signin.txt`, `g3-session-expiry.txt`, `g3-api-down-edge.txt`, `g3-bfcache.txt`, `g8-signup-ui.txt` |
| G4 UI fidelity | PASS (styled rendering is an approximation, see "Not tested") | Markup of `/auth` is identical to `origin/main` except the inline script (`g4-auth-html-diff.txt`, 45 diff lines, all in the script). Pixel diff against `origin/main` at 360, 390, 768, 1024, 1280, 1440: 0 pixels, no overflow (`g4-widths.json`, `widths/`). |
| G5 UX | PASS for the change; pre-existing issues listed (P2, P3); F3 is new | `g5-touch-targets-auth-360.txt`, `g5-restore-typed-input.txt`, `g3-signin.txt` |
| G6 Accessibility | PASS for the change; pre-existing issues listed (P2, P3) | `g6-axe.json`: no new violation, identical results on `origin/main`. Keyboard-only sign-in works (T11). |
| G7 Non-functional | PASS | Perf `g7-perf.txt`, security `g7-security.txt`, authorization sweep `g7-api-authz-sweep.txt` |
| G8 Regression | PASS | Sign-up through the UI against the real API (`g8-signup-ui.txt`), all gate-step pages load with no console error (`g3-core.txt`), full unit suite, smoke and new e2e |

## Sandbox adaptations (facts about this container, not about the code)

For criterion (e) the stack was built from `.factory/config.md` as literally as the sandbox allows. Files are in `fix-e2e-auth-smoke-evidence/sandbox-adaptations/`.

| Adaptation | Why | Effect on the check |
| --- | --- | --- |
| `~/.ankanu/*` created under a scratch `home/.ankanu/` and passed by explicit path; `/Users/<you>/.ankanu/api.env` replaced by that path | A fake `HOME` would hide the Docker CLI config | None. File contents are exactly the three files in config.md (secrets random, `api.env` mode 600). |
| Project `ankanu-qa2` instead of `ankanu-local`; port 4012 and 55432 unchanged | Orchestrator instruction | None |
| Extra `-f compose.sandbox.yml`: build with scratch copies of both Dockerfiles that add the sandbox proxy CA, `BUILDX_BAKE_ENTITLEMENTS_FS=0`, image names `ankanu-qa2-*` | npm in image builds fails on the TLS proxy | The repo Dockerfiles are otherwise unchanged. `up -d --build --wait` ran as written. |
| Postgres bind mounts redirected to scratch | Keep the worktree clean | None |
| A `google-stub` service that answers `https://www.google.com/recaptcha/api/siteverify` (network alias `www.google.com`, CA added to the api container) | Google is blocked here. The api has no `test-ok` special case: it posts the token to Google with Google's public test secret, and Google's documented behaviour is that the test secret accepts any token. The stub mimics exactly that and logs what the api sent (`secretIsTest: true`, `token: test-ok`). | The captcha part of sign-up depends on Google's documented test-key behaviour, which was not observed here. |
| `E2E_ALLOW_ERRORS` for three blocked hosts (Tailwind CDN, `api.js`, "tailwind is not defined") and the headless shell via `PLAYWRIGHT_CHROMIUM_EXECUTABLE` | Tailwind CDN and Google are blocked | Anchored patterns, listed in `g2-sandbox-allow-errors.txt`. They match none of the errors under test. The annotations in `g2-e2e-stack-run1.json` contain only these three. |

## Verification matrix

### (a) Signed-out visitor: no 401, still works

| ID | Check | Expected | Actual | Result | Evidence |
| --- | --- | --- | --- | --- | --- |
| A1 | Fresh signed-out `/auth`, mobile (Pixel 7, 360) and desktop (1440) | 200, `#login-form` visible, 0 requests to `/v1/accounts/gate`, 0 console errors, 0 4xx/5xx | As expected. Only same-origin request: `GET /auth` | PASS | `g3-core.txt` T01, `g3-mobile-auth-signed-out.png`, `g3-desktop-auth-signed-out.png` |
| A2 | Signed-out `/decouvrir` | 303 to `/auth`, form visible, same cleanliness | As expected | PASS | `g3-core.txt` T02 |
| A3 | Same page on the original code (`origin/main` web image, same api) | Reproduces the failure | 5 failed, 4 skipped, 9 passed, all with `Failed to load resource: 401 .../v1/accounts/gate` | PASS (proves the tests detect the defect) | `g2-e2e-main-baseline.txt` |
| A4 | Smoke suite on the fixed stack | No red | 14 passed, 4 skipped; whole suite 22 passed, 6 skipped; 3 repeats 66 passed | PASS | `g2-e2e-head-smoke.txt`, `g2-e2e-stack-run1.txt`, `g2-e2e-head-repeat3.txt` |
| A5 | Sign-in still works from `/auth` through the UI (reCAPTCHA widget stubbed in the browser, real api) | `POST /v1/sessions` 201, then exactly one gate read after submit, then the member's step: `/email-verification`, `/phone`, `/otp`, `/id-liveness`, `/onboarding` | As expected for all five members | PASS | `g3-signin.txt` T07 a to e |
| A6 | Wrong password | Inline error, stays on `/auth`, password cleared | « Identifiant ou mot de passe incorrect. » | PASS | `g3-signin.txt` T07b, `g3-mobile-signin-wrong-password.png` |
| A7 | Gate 401 right after a 201 sign-in (cookie not kept) | Still « La session n'a pas été conservée. » and one `DELETE /v1/sessions/current` | As expected | PASS | `g3-signin.txt` T08 |
| A8 | Garbage cookie, unknown session id, stub cookie `web` | Anonymous: form shown, no gate read, no error | As expected | PASS | `g3-signin.txt` T09 |
| A9 | Expired session (row updated in the database) | Form shown, no gate read, gate answers 401 | As expected. `/decouvrir` ends on `/auth` | PASS | `g3-session-expiry.txt` |
| A10 | Slow 3G (400 kbit/s, 400 ms) signed-out `/auth` | Renders, no gate read, no error | 200, form visible, 0 errors (load 23.9 s in this sandbox; the cause was not isolated and the number was not compared with `origin/main`) | PASS | `g3-signin.txt` T10 |
| A11 | Keyboard only (type, Tab, Tab, type, Enter) | Signs in | Reaches `/phone` | PASS | `g3-signin.txt` T11 |
| A12 | Double click on submit | One `POST /v1/sessions` | 1 | PASS | `g3-signin.txt` T12 |
| A13 | 10 000-character identifier, 5 000-character password, accents, Arabic and CJK | Handled error, no 5xx | 401 inline error only | PASS | `g3-signin.txt` T13, `g7-security.txt` |
| A14 | Restored (`pageshow`, `persisted: true`) signed-out `/auth` | One reload, fresh form, no gate read; `persisted: false` does nothing | As expected on both profiles | PASS | `g3-core.txt` T03, T03b |

### (b) Signed-in member cannot use the sign-in form

| ID | Check | Expected | Actual | Result | Evidence |
| --- | --- | --- | --- | --- | --- |
| B1 | Fresh `/auth` with a live session, one member per gate step (email, phone, otp, identity, account), mobile and desktop | 303 to `/email-verification`, `/phone`, `/otp`, `/id-liveness`, `/decouvrir`; no `#login-form` | As expected (10 checks). `/decouvrir` redirect is correct, but the destination returns 500 on the Docker image (P1) | PASS | `g3-core.txt` T04 |
| B2 | Restored `/auth` after the member signed in elsewhere, same five steps, both profiles | Form hidden, reload, 303 to the step | As expected (10 checks) | PASS | `g3-core.txt` T05 |
| B3 | Real Back navigation with bfcache enabled in Chromium | Server guard sends the member on | Chromium does not store this `no-store` page; Back re-requests it and the guard redirects to `/id-liveness`. `pageshow.persisted` was never true | PASS (real WebKit restore not tested, F4) | `g3-bfcache.txt` |
| B4 | Api unreachable while a signed-in member opens `/auth` | Same behaviour as before the change | Both builds serve the form (guard fails open); after the api returns, `/auth` redirects. Unchanged | PASS (observation) | `g3-api-down-edge.txt` |

### (c) Server-side authorization unchanged

| ID | Check | Expected | Actual | Result | Evidence |
| --- | --- | --- | --- | --- | --- |
| C1 | Diff of non-test source between `origin/main` and head under `code/apps/api` and `code/packages` | Empty | Empty. Only `apps/web/src/v2-client.ts` changed in product code | PASS | `g7-api-authz-sweep.txt` header, `git diff --stat 7505c57..HEAD` |
| C2 | `GET /v1/accounts/gate` with no cookie, unknown id, garbage, empty cookie | 401 `UNAUTHENTICATED` / `Authentification requise.` / `retryable: false` | Identical for all four | PASS | `g7-api-authz-sweep.txt` |
| C3 | Gate with a valid session | 200 `{ "step": ... }` | `identity`, `account` | PASS | same |
| C4 | Every mapped route with no cookie (48 routes) | Session routes 401 | 39 answer 401, 6 public routes answer 400 on an empty body, `GET /v1/health` 200, `DELETE /v1/sessions/current` 204 (idempotent logout), one staff grant route 404 | PASS | same |
| C5 | Member session on staff routes | 403 | 403 on all four | PASS | same |
| C6 | Another member's data through their own session | Each session sees only its own row | `GET /v1/verifications/id`: `none` vs the member's own pending row | PASS | same |

### (d) Known-issues entry

| ID | Check | Expected | Actual | Result | Evidence |
| --- | --- | --- | --- | --- | --- |
| D1 | 27 inputs against the entry (4 real-shaped Google URLs; other key, key with suffix or prefix, no key, our origin, google URL as a query parameter of our origin, http scheme, host suffix and prefix, no `www`, `recaptcha.net`, enterprise path, `userverify`, `anchor2`, wrong or truncated message, other error from the same iframe, CSP error, prefixed text, newline and space smuggling, a 401 gate error, a 500) | Only the first 4 tolerated | 4 tolerated, 23 fail | PASS | `g3-known-issues-probe.txt` |
| D2 | Chromium's real output for a cross-origin iframe that calls `requestStorageAccess()` (independent probe, headless shell 141 and full Chromium 141) | Message and location as the entry assumes | Headless shell: `console.error "requestStorageAccess: Permission denied."` with the iframe document URL as location, whether or not the page handles the rejection. Full Chromium grants the request and logs nothing | PASS (mechanism confirmed) | `g3-storage-access-probe.txt` |
| D3 | Simulated Google iframes at the real URLs (`https://www.google.com/recaptcha/api2/anchor?...` and `bframe?...`, test key) driven through the repo's own `fixtures.ts` guard | Tolerated and annotated, twice | Passed with 2 `known-issue` annotations (anchor and bframe) | PASS | `g3-recaptcha-simulation.txt` |
| D4 | Same simulation with another site key; test key plus another error; same message from our own origin; unhandled rejection from the iframe | The guard fails each | All four fail for the intended reason | PASS | same |
| D5 | Entry has a reason and covers only Google's third-party iframe | Yes | Reason: "Google's reCAPTCHA iframes ask for third-party storage access on load and headless Chromium denies it. Third-party code, not ours." Pinned to message, host, path (`anchor` or `bframe`) and the test key | PASS | `code/e2e/known-issues.ts` |
| D6 | No blanket allow-list against a stack | The `/v1/` entry is web-only | `E2E_BASE_URL` set: the `:3100/v1/` entry is inactive and a gate 401 on `:4012` is not tolerated | PASS | `g3-known-issues-probe.txt` (last lines), `known-issues.spec.ts` |
| D7 | Mutations of the entry: drop the key; widen the host | Test fails | Both caught by `known-issues.spec.ts` | PASS | `g2-mutation-spotchecks.txt` M3, M3b |

Open known-issues entries (all listed, as the factory requires):

1. `localhost:3100/favicon.ico` 404. Pre-existing. Web-only port, no favicon is served (P5).
2. `localhost:3100/v1/` while there is no api. Pre-existing, `when: webOnly`. Inactive when `E2E_BASE_URL` is set.
3. reCAPTCHA `requestStorageAccess: Permission denied.` from Google's `anchor` and `bframe` for the test key. New in this story.
4. Not in the repo, sandbox only: `E2E_ALLOW_ERRORS` for three blocked hosts (see adaptations).

### (e) Local deployment instructions

Steps followed from `.factory/config.md`, with the adaptations above. Each "Without X" sentence in the text was also tested.

| ID | Step or claim | Expected | Actual | Result | Evidence |
| --- | --- | --- | --- | --- | --- |
| E1 | The three first-time files, `up -d --build --wait` | Stack healthy | All 7 containers up, 6 healthy | PASS | `sandbox-adaptations/`, `e-03-signup.txt` |
| E2 | `curl -fsS :4012/ && curl -fsS :4012/v1/health` | OK | `{"status":"ok","role":"api",...}` | PASS | `e-01-before-migrations.txt` |
| E3 | "Without the migrations every database call is 500 `Request failed`" | 500 | `POST /v1/accounts` 500 `UNHANDLED` `Request failed` | PASS | `e-01-before-migrations.txt` |
| E4 | `npx drizzle-kit migrate` from `code/apps/api` with the given `DATABASE_URL` | Applies all 19 migrations; idempotent | Applied, 19 tables, second run clean | PASS (needs `npm ci` done first, see F2) | `e-02-migrate.txt`, `e-02-tables.txt` |
| E5 | Sign-up with `recaptcha_token: test-ok` | 201 and a session cookie | 201; the api posted `test-ok` with the test secret to the stub; gate `email` | PASS (Google stubbed) | `e-03-signup.txt` |
| E6 | "with `log://` the api log prints `email <address> AnKanu <link>`" | Present | `email qa2.member1@example.test AnKanu http://localhost:4012/email-verification?token=...` | PASS | `e-03-signup.txt` |
| E7 | The grep from config.md, run literally (`docker compose -p ... logs api | grep -E 'otp |email '`) | Lines found | Found (the `api-1  |` prefix does not break the pattern) | PASS | `e-06-email-link-browser.txt` |
| E8 | Open the logged link in a real browser with the member's cookie | Email verified, member moves on | `/email-verification?token=...` lands on `/phone`, gate `phone`; reusing the token gives 400 | PASS | `e-06-email-link-browser.txt`, `e-email-link-opened.png` |
| E9 | Phone: send, read `otp NNNNNN` in the api log, verify | 201, then 200 `granted` | As expected, gate `identity` | PASS | `e-03-signup.txt` |
| E10 | "Without the bucket, ID and liveness uploads are 503" | 503 | Both 503 | PASS | `e-03-signup.txt` |
| E11 | The bucket command from config.md, run literally from `code/` (only the project name differs). Run twice | Succeeds, idempotent | Exit 0 both times. Bucket `ankanu` exists, versioning Enabled, no policy, anonymous read 403 | PASS | `e-04-bucket.txt`, `e-04-bucket-verify.txt` |
| E12 | ID and liveness uploads after the bucket exists | 201 each, gate `account` | 201 and 201, gate `account`; 2 sealed objects in the bucket | PASS | `e-03-signup.txt` |
| E13 | "Without `SMTP_URL` every email send is 503 `EMAIL_DELIVERY_FAILED`" | 503 | 503 `EMAIL_DELIVERY_FAILED` | PASS | `e-05-without-claims.txt` |
| E14 | "Without the evidence key, ID and liveness uploads are 503" | 503 | Both 503 | PASS | `e-05-without-claims.txt` |
| E15 | "the api refuses to boot without them" (origins) | Refuses | `ANKANU_PUBLIC_ORIGIN must be an http(s) origin in production` | PASS | `e-05-without-claims.txt` |
| E16 | The per-story `up -d --build --wait` run again, nothing changed | Data kept | Accounts 7, bucket and 4 objects kept | PASS | `e-07-lifecycle.txt` |
| E17 | `docker compose down` then `up -d --build --wait` | Instructions should say what survives | Accounts kept, **bucket gone** (its data is an anonymous volume). Uploads 503 until the bucket command is run again, then 201 | Gap (F2) | `e-07-lifecycle.txt` |
| E18 | "Do not run `down -v`: it deletes the local database" | True | False: `./pg-data` is a bind mount and survived `down -v`. What `down -v` (and plain `down`) removes is the evidence bucket | Inaccurate sentence (F2) | `e-08-down-v.txt` |
| E19 | `E2E_BASE_URL=http://localhost:4012 npm run test:e2e` | Green | 22 passed, 6 skipped | PASS | `g2-e2e-stack-run1.txt` |

## Mutation spot-checks (G2)

Each mutation was applied to the tracked file, the named tests were run, and the file was restored with `git checkout -- <file>`. `git diff` was empty at the end. Output: `g2-mutation-spotchecks.txt`.

| # | Mutation | Criterion | Caught by |
| --- | --- | --- | --- |
| M1 | Re-add a gate `fetch` on every `pageshow` | (a) | Unit (2 tests) and e2e (all 6 `auth-entry` tests, both profiles) |
| M2 | Remove `window.location.reload()` | (b) | Unit (2 tests) and e2e restored-page test (both profiles) |
| M3, M3b | Drop the site key from the entry; widen the host | (d) | `known-issues.spec.ts` |
| M4 | Gate answers `200 { step: 'anon' }` when signed out | (c) | `create-session.test.ts` (new test) |
| M5 | Do not hide the form on a restored page | (b) | Unit |
| M6 | Server guard stops redirecting a signed-in member away from `/auth` | (b) | Unit (`v2-flow.test.ts`, 2 tests) |
| M7 | `fetchGateStep` maps 401 to `error` instead of `anon` | (c) | Unit (new test) |
| M8 | `/auth` served with `public, max-age=60` instead of `no-store` | (a), (b) | Unit (new assertion) |

## Findings

In-scope findings (introduced by or specific to this story):

| # | Severity | Gate | Steps to reproduce | Expected | Actual | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| F1 | Minor (open confirmation) | G3 | Error 2 needs Google's real iframes, which this sandbox cannot load | The entry removes exactly what Fay sees | Verified with an independent Chromium probe and with simulated iframes at the real URLs. Not observed against Google itself. If Google's iframe code leaves the rejection unhandled, a second message, a page error `requestStorageAccess not allowed` with no URL, would still fail the test; the entry does not and should not tolerate it. Fay's report lists only the console message, so that is unlikely | `g3-storage-access-probe.txt`, `g3-recaptcha-simulation.txt` (last test). The deployment run on Fay's Mac (config.md, last step) is the confirmation |
| F2 | Minor | G3 (docs, criterion e) | Read the "Local deployment" text, then `docker compose -p ... down` and `up -d --build --wait` | The text says what survives a reset | (1) "Do not run `down -v`: it deletes the local database" is wrong: the database lives in the `./pg-data` bind mount and survives. The evidence bucket is what is lost, with plain `down` as well. (2) Nothing says that the bucket command must be repeated after any `down`; uploads then answer 503 `Request failed` while the database still lists the members. (3) The migrate step needs `npm ci` to have been run in `code/`; the Install row of the commands table covers it but the section does not point to it. Suggested fix: one sentence each in the "After the first `up`" paragraph. Not part of the fresh-stack path, which works | `e-07-lifecycle.txt`, `e-08-down-v.txt` |
| F3 | Minor | G5 | Type an email on `/auth`, then trigger a bfcache restore (simulated `pageshow persisted: true`) | Unsent input kept, as before when the restored page stayed alive | The page now reloads on a restore, and the typed email and password are gone after the reload. Real only in browsers that restore this page from the bfcache (Safari). The trade-off is inherent to letting the server guard decide, but it is a behaviour change | `g5-restore-typed-input.txt` |
| F4 | Minor | G2 | See criterion (b) | An automated test for each signed-in case in a browser | No committed e2e test covers a signed-in member (needs a captcha-verified account, as the handoff says). Covered by unit tests, my mutation checks M2, M5, M6, and my browser checks T04 and T05. The bfcache restore is simulated; real WebKit was not available | `g3-core.txt`, `g3-bfcache.txt` |

Pre-existing findings (reproduced on `origin/main`, or present in markup and code this story does not touch). Listed for triage; they are not counted against this story.

| # | Severity | Gate | Steps to reproduce | Expected | Actual | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| P1 | Major (pre-existing) | G3 / G8 | On the Docker stack, sign in as a member whose gate step is `account` (or send their cookie) and open `/decouvrir` or `/favoris` | A page | 500. Web log: `code/design-stitch/ankanu-v2/57-discover/screen.html is not on disk`. `apps/web/Dockerfile` and `.dockerignore` ship only a fixed list of 14 screen files, so every route that needs another file fails. The same 500 on the `origin/main` web image. Impact for Fay: after sign-in at the `account` step the server redirects to `/decouvrir`, which crashes on her local stack. Recommend a separate story | `p1-decouvrir-500.txt`, `g3-core.txt` T04-e / T05-e |
| P2 | Minor (pre-existing) | G6 | Submit a wrong password on `/auth` | Error announced to assistive technology | `#login-error` is a plain `<p>`, no `role="alert"` and no `aria-live` | `g4-auth-html-diff.txt` (markup unchanged), page source |
| P3 | Minor (pre-existing) | G5 | `/auth` at 360 px | Touch targets of at least 44 by 44 px | "Mot de passe oublié ?" 125x16, password toggle 36x36, "Se souvenir de moi" checkbox 16x16 (label 134x16) | `g5-touch-targets-auth-360.txt` |
| P4 | Minor (pre-existing) | G1 | `npm audit --omit=dev --audit-level=high` | exit 0 | exit 1, 1 high (Next.js advisories). `package.json` and the lockfile are not in this diff | `g1-audit.txt` |
| P5 | Minor (pre-existing) | G2 | Run the smoke suite on the stack with a full (non-headless-shell) Chromium | Green | Every test fails on `GET http://localhost:4012/favicon.ico` 404; the known-issues entry only covers port 3100. Playwright's default headless shell never requests a favicon, which is why Fay's run did not show it | `g2-e2e-stack-fullchrome.txt` |
| P6 | Environmental | G2 | `npm run test:unit`, `npm run test:integration` | Green | Unit: `photo-rules.test.ts` needs Chrome at `~/.cache/ms-playwright/chromium-1243/...`, `/usr/bin/google-chrome` or `/usr/bin/chromium`, none exists here. Integration: `compose.test.ts` reads `/proc/net/tcp6` inside the worker; containers here have no IPv6 (`ls /proc/net/tcp6` fails). Both test files, `compose.yaml` and both Dockerfiles are byte-identical to `origin/main` (empty `git diff`), so the result is the same there | `g2-unit.txt`, `g2-integration.txt` |

Observations, no action: `/auth` carries no security headers except `cache-control: no-store`, and the api sends `X-Powered-By: Express`; the config does not ask for more. The session cookie is `HttpOnly; SameSite=Lax` (no `Secure` over local HTTP). Axe in my styled approximation reports two serious items (`color-contrast` and `label-content-name-mismatch` on the icon-font ligature text "mail" and "visibility") on both `origin/main` and head; they are artefacts of the blocked Material Symbols font, not of the change, and the repo's own axe check in the smoke suite passes (`g6-axe.json`).

## Not tested and why

- Real Google reCAPTCHA iframes and Google's siteverify (blocked). Mitigation and the open confirmation are in F1. The sign-up captcha path used a stub of Google's documented test-key behaviour.
- Real back-forward cache restore in Safari or any WebKit (not installed). The restore handler was tested with a synthetic `pageshow` event, the same method as the committed test, and Chromium's real Back navigation was checked (F4).
- Visual match against the Stitch screen and axe contrast with the real Tailwind Play CDN and Google Fonts (blocked). I compiled Tailwind 3.4 with the page's own config, forms and container-queries plugins, and stubbed the fonts. The markup is identical to `origin/main` and the screenshots are pixel-identical to it at all six widths, so the change cannot have moved a pixel; absolute fidelity to the design screen was not re-judged. Icons render as ligature text because the icon font is blocked.
- Lighthouse. I measured with Playwright instead (Pixel 7, 4x CPU, 1.6 Mbit/s, 150 ms): LCP 284 ms head vs 276 ms `origin/main`, CLS 0, same-origin requests 1 vs 2 (the gate read is gone). Numbers exclude the blocked external hosts. `g7-perf.txt`.
- OWASP ZAP (not configured).
- `origin/main` unit suite was not re-run end to end: the one failing unit test is an environment check in an unchanged file (P6).
- `ankanu-dev2`, the dev phase's scratch stack, was left running.

## Teardown and state

- Stack `ankanu-qa2`, the extra `origin/main` web container, the `ankanu-qa2-*` images, the network and the scratch volumes and data were removed. `api:latest` and `web:latest` were backed up and restored after the integration run rebuilt them.
- `git diff` on tracked files is empty. Mutations were restored with `git checkout -- <file>`. The web dev server started by Playwright had rewritten `apps/web/next-env.d.ts` and created `apps/web/AGENTS.md` and `apps/web/CLAUDE.md`; all three were restored or removed. The only new path in the worktree is `code/docs/qa-handoffs/fix-e2e-auth-smoke-evidence/` plus this report.
- Evidence also includes the scripts used (`scripts/*.txt`, renamed so no test runner picks them up) and the sandbox adaptation files (`sandbox-adaptations/`, secrets redacted).
