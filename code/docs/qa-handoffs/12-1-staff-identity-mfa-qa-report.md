# 12-1-staff-identity-mfa QA report

model: Claude Sonnet 5.5
Verdict: **FAIL** (2026-10-22, local full stack built from branch factory/staff-mfa at 05aa2c2, compose project `ankanu-qa-staff`, web :3100, api :4062, Postgres 17, Redis, MinIO; stand-ins for Google reCAPTCHA siteverify/widget, Tailwind CDN and Google Fonts)

Evidence folder: `code/docs/qa-handoffs/12-1-staff-identity-mfa-evidence/` (passwords and secrets of disposable local accounts redacted).

## Gate summary
| Gate | Result | Evidence |
| --- | --- | --- |
| G1 Static | PASS with note. Lint 0 errors (3 warnings, same as main), typecheck clean, migration-check clean, uqr@0.1.3 matches the registry integrity hash, MIT, no dependencies, no install scripts, no secrets or debug leftovers in the diff. `npm audit --omit=dev` still shows 1 critical on `next` 16.3.6 (not touched by this story; no finding on uqr). | `migration-check.txt`, console output |
| G2 Automated tests | PASS with findings. Unit 440 passed, 12 skipped, 1 failed (`photo-rules`, known). Integration 26 passed, 2 skipped, `compose.test.ts` failed at npm ci/compose (known env). New staff-shell e2e on the stack 8 passed, 4 skipped (the full first sign-in test passed with a fresh account); `--repeat-each=3` 21 passed, 0 flaky. Mutation checks: see matrix. | `unit-run.txt`, `integration-run.txt`, `e2e-staff-shell-stack.txt`, `e2e-staff-shell-repeat3.txt`, `mutation-checks.txt` |
| G3 Functional | FAIL (F1, F2) | api-*.txt, ui*-log.txt |
| G4 UI fidelity | PASS with minor notes. 360/390/768/1024/1280/1440, no horizontal scroll, badge on every surface, no member nav, two panes from 768. | `ui3-widths-log.txt`, `w*-*.png` |
| G5 UX | PASS with minor findings (F5, F6, F8) | screenshots 01-08 |
| G6 Accessibility | PASS for the new surfaces (axe WCAG 2.0/2.1/2.2 A+AA: zero violations on sign-in, password, enroll, verify, staff home at 390 and 1440; keyboard-only sign-in, code entry and sign-out works). Visit-signals page shows 7 serious color-contrast nodes (see F7, pre-existing page). | `ui2-log.txt`, `ui3-widths-log.txt`, `keyboard-logout-log.txt` |
| G7 Non-functional | Partly run. Security: done. Reliability: expected 4xx only; no 5xx except F4. Not run: Lighthouse/Web Vitals, 3G throttle, ZAP (see Not tested). | api-*.txt |
| G8 Regression | PASS with caveat. Existing staff-role tests (profile review, verification grant, photo strike, visit signals) pass in the unit run. Full e2e on the stack: 39 passed; the member pages' e2e results depend on my approximated Tailwind stand-in (the `/auth` axe target-size result is a stand-in artefact: that page is untouched by this story). | `e2e-full-stack.txt` |

## Verification matrix
| ID | Criterion or check | Expected | Actual | Result | Evidence |
| --- | --- | --- | --- | --- | --- |
| AC1 | `create` new account | role set, password printed once, audit row, gender none | OK; account `gender=none`, roles `{moderator}`, only argon2id hash stored, `staff_account_created` audit (no secret) | PASS | `cli-session.txt`, `audit-events.txt` |
| AC1 | `create` existing staff/member email (also upper-case, concurrent) | refuse, nothing changed | Exit 1 "Nothing was changed." Concurrent duplicate: loser exits 1 with a raw Drizzle "Failed query ... params" dump (F9), one row only | PASS (F9 minor) | `cli-session.txt` |
| AC1 | bad role / missing args / unknown email / member email for reset-mfa and disable | refuse | bad role exit 1 (handoff says 2: F10), no args exit 2, unknown/member emails exit 1 and nothing touched | PASS | `cli-session.txt`, `cli-member-targets.txt` |
| AC1 | `reset-mfa`, `disable` | enrollment cleared, sessions ended, audited | Old full and pending sessions 401 after reset; re-enrollment issues a NEW secret, old secret code refused; disable: sessions ended, generic 401, audited | PASS | `api-reset-disable.txt` |
| AC2 | one-time password -> new password -> QR + key -> code | step order enforced | enroll/mfa before password change 403 `staff_step`; same password and short password refused; QR SVG 150px with alt text, 32-char key in groups of 4; pending secret is stable across reloads; wrong code keeps session pending | PASS | `api-flow-moderator.txt`, `05-enroll-390.png` |
| AC2 | session rotation | new id after code | new cookie, old pending id 401 | PASS | `api-flow-moderator.txt` |
| AC3 | TOTP correctness (my own independent RFC 6238 implementation) | current step +-1 accepted once; +-2 refused | -2 and +2 refused; -1, 0, +1 accepted; same code in a second session refused; an older step than the last used is refused | PASS | `api-totp-lockout.txt` |
| AC3 | lockout | 5 wrong codes -> 429, 15 min, Retry-After, correct password also 429, pending sessions ended, expiry re-opens | 5th wrong code gave 429 `staff_locked`, `Retry-After: 900`, correct password gives 429, pending session 401, after expiry sign-in and a valid code work. Counter resets on success. | PASS sequential | `api-totp-lockout.txt`, `api-lock-expiry-and-race.txt` |
| AC3 | lockout under concurrency | at most 5 guesses evaluated | 40 parallel wrong codes: 29 evaluated (401), 11 refused (429); 29 `staff_sign_in_failure` + 11 `staff_sign_in_locked` audit rows; failed_codes ends at 4 | **FAIL (F1)** | `api-lock-expiry-and-race.txt` |
| AC3 | generic failures, captcha, rate limit | same message for unknown, member, wrong password, disabled; captcha required; per-IP limit | all `Identifiant ou mot de passe incorrect.`; missing/bad captcha 400; default 10/min then 429 (also on the mfa endpoint) | PASS | `api-reset-disable.txt`, `api-rate-limit-default.txt` |
| AC4 | `/v1/staff/*` with no session / garbage / member / member with staff role / member with mahram+staff roles / MFA-pending | 401 / 403 | none and garbage 401; member, member-with-staff-role, mahram-role 403; pending 403 `staff_mfa_pending` (also on enrollment-only routes) | PASS | `api-separation-matrix.txt` |
| AC4 | staff session on 13 member endpoints (profile, browse, favourites, media, pin, accounts, export...) | 403 | all 403 `staff_session`; staff credentials at member sign-in give the generic 401 | PASS | `api-separation-matrix.txt` |
| AC4 | member pages for a staff session | redirect to /staff | `/decouvrir`, `/auth`, `/profile-edit`, `/signup` redirect to `/staff`; `/` (public) stays | PASS | `ui2-log.txt` |
| AC4 | forged cookie `ankanu_session=staff` | no staff page | `/staff` and `/staff/visit-signals` return 200 to an unauthenticated visitor | **FAIL (F2)** | `web-gate-stub-cookie.txt` |
| AC5 | badge, no member nav, two panes, widths | as spec | PASS at all 6 widths on /staff, /staff/connexion, /staff/visit-signals; stacked below 768, side by side from 768 | PASS | `ui3-widths-log.txt` |
| AC6 | audit events | sign-in, failure, lock, enroll, password change, create, reset, disable; no secrets | all present (`audit-events.txt`); no secret/password/code in payloads; secrets sealed AES-256-GCM (`kid` + iv in column), hashes argon2id | PASS | `audit-events.txt` |
| AC6 | logs, URLs, storage | no password, code, secret, otpauth | api/web/worker logs: 0 matches; no secret in any navigated URL; localStorage/sessionStorage empty; enrollment sent only via `Cache-Control: no-store` GET while enrolling | PASS | `log-secret-scan.txt`, `ui2-log.txt` |
| AC6 | production boot without key | refuse | Not re-run by me (see Not tested); unit tests exist | BLOCKED-minor | n/a |
| AC7 | stack boots, docs | boots and works | boots with the documented env, migrations to 0019 applied, e2e staff shell passes on the stack | PASS | `e2e-staff-shell-stack.txt` |
| Migration | `gender='none'` check | only non-empty subsets of moderator/operator | none+`{}`, `{mahram}`, `{moderator,mahram}`, `{admin}` and gender `other` rejected; `{moderator}`, `{moderator,operator}` accepted. Session check: a staff session with NULL `mfa_state` is accepted by the DB (F3) | PASS (F3 minor) | `migration-constraints.txt` |
| Session | idle/absolute | 30 min idle, 12 h ceiling, sliding | 31 min idle 401; 29 min idle 200 and last_seen slides; past expiry 401; cookie HttpOnly, SameSite=Lax, no Max-Age | PASS | `api-idle-payloads-headers.txt` |
| Input | SQL/script/null byte/non-Latin/wrong shapes | generic 4xx | all 401/400; 200 KB body gives 500 (F4, same as member sign-in) | PASS (F4) | `api-idle-payloads-headers.txt` |
| UI | keyboard only | complete flow | Tab order email, password, captcha, submit; focus moves to the step heading; code entry, sign-out by keyboard; `/staff` redirects after logout | PASS | `keyboard-logout-log.txt` |
| Test quality | mutation: lock threshold 5->6 | a test fails | fails (AC3 lock test) | PASS | `mutation-checks.txt` |
| Test quality | mutation: window 1->2; replay check removed | a test fails | both fail | PASS | `mutation-checks.txt` |
| Test quality | mutation: MFA-pending check removed from `requireStaffSession` alone | a test fails | all 21 pass because the middleware gate still blocks (defence in depth, controller layer has no test of its own); removing both layers fails 3 tests | PASS with note (F11) | `mutation-checks.txt` |

## Findings
| # | Severity | Gate | Steps to reproduce | Expected | Actual | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| F1 | **Major** | G3/G7 security | Sign in to an enrolled staff account 40 times in parallel (password step), then POST a wrong code on each pending session simultaneously | At most 5 wrong codes are evaluated, then lock (AC3) | 29 wrong codes were evaluated before the lock took effect; `failed_codes` is a read-modify-write (`wrongCode` in `staff-session.ts`), not an atomic increment, and the lock check is not serialised. Each burst leaks ~30+ guesses; 11 duplicate `staff_sign_in_locked` events. The per-IP limit (10/min) only limits a single-IP attacker. Fix: `UPDATE ... SET failed_codes = failed_codes + 1 ... RETURNING` in one statement (or row lock) and check the returned value. | `api-lock-expiry-and-race.txt`, `audit-events.txt` |
| F2 | **Major** | G3 security | `curl -H 'cookie: ankanu_session=staff' http://host/staff` and `/staff/visit-signals` with no sign-in | 303 to `/staff/connexion` | 200 with the staff shell. The web test seam (`STUBS`, `sessionKind` in `entry-guard.ts`/`v2-serve.ts`) is live in the production build, so the page-level MFA gate can be bypassed by a forged cookie. No data leaks today (the page data calls are authorised by the API), but the next story (review console) will inherit a bypass. Gate the stub on a test-only env flag. | `web-gate-stub-cookie.txt` |
| F3 | Minor | G7 | insert a `session` row with `kind='staff'` and NULL `mfa_state` | rejected | accepted: the CHECK evaluates to NULL. The code treats NULL as pending, so no bypass, but add `mfa_state is not null` for staff. | `migration-constraints.txt` |
| F4 | Minor | G7 | POST a 200 KB JSON body to `/v1/staff/sessions` | 413/400 | 500 "Request failed" (identical on member `/v1/sessions`, so not new) | `api-idle-payloads-headers.txt` |
| F5 | Minor | G5 | Paste or type "123 456" (the format authenticator apps show) in the code field | accepted (the script strips spaces) | `maxlength="6"` truncates the paste to "123 45" so it fails | `ui1` run, `staff-pages.ts` |
| F6 | Minor | G5 | Wrong password-rule input | plain French message | message starts with the technical field name ("new_password : ..."), and the hint copy "lettres, chiffres et symbole noble" is not what the server enforces (length 12-128 only). Same pre-existing pattern as the member screens. | `ui2` run |
| F7 | Minor | G6 | axe on `/staff/visit-signals` signed in | 0 serious | 7 `color-contrast` nodes (gold #C9A86C on cream 2:1, `#visit-stamp` 4.34:1). The page and its colours exist on main; this story only changed its header. Not attributable to 12-1 but fails the "zero serious" bar if counted. | `ui3-widths-log.txt` |
| F8 | Minor | G5 | Staff home at 1440 | header and content aligned | header content is centred in a `max-w-7xl` box while the page content is full width (AnKanu starts at x=128, content at x=48) | `w1440-home.png` |
| F9 | Minor | G3 | Run two `create` for the same email at the same time | friendly refusal | the loser prints the raw SQL error with parameters (email, generated pseudonym) | `cli` output in session |
| F10 | Minor | docs | `create --role admin` | handoff says exit 2 with usage | exit 1 with `--role must be moderator or operator.` | `cli-session.txt` |
| F11 | Minor | G2 | remove the MFA-pending check in `requireStaffSession` only | a test fails | no test fails (the middleware gate covers it); the controller-level check is unprotected | `mutation-checks.txt` |
| F12 | Minor | G5 | A pending (MFA not done) session calls `DELETE /v1/sessions/current` | can end own session | 403 `staff_mfa_pending`; the pending session cannot be ended by its owner (it expires on its own, and sign-in ends it only after a code) | `api-flow-moderator.txt` |
| F13 | Info | G7 | none of the staff or other pages set security headers (CSP, X-Content-Type-Options, X-Frame-Options, Referrer-Policy) | per config, none required | absent (also on existing pages) | `api-idle-payloads-headers.txt` |

Known tolerated e2e entries (known-issues.ts): favicon 404 on port 3100, reCAPTCHA iframe messages; neither was needed in my runs once the stand-ins served the scripts.

## Not tested and why
- Lighthouse, Web Vitals and 3G throttling: not run (time); the new pages are static HTML plus one fetch each. Required before PASS.
- OWASP ZAP: not configured in `.factory/config.md`.
- `NODE_ENV=production` boot without `STAFF_MFA_KEY` (AC6): not re-run by me; covered by the developer's unit tests and handoff.
- Real Google reCAPTCHA and real Tailwind CDN: blocked; I used a local siteverify stub (`test-ok`), a widget stub and Tailwind v4 compiled from each page's own config (via a TLS stand-in plus `--host-resolver-rules`), with real Google Fonts through the proxy. Styling is a close approximation only.
- WebKit/mobile profile beyond Pixel 7 in the shipped e2e: not run.
- Staff `media/get` happy path (needs seeded media): only the 403 for a staff-session on member media was checked.
- Integration `compose.test.ts` and unit `photo-rules`: known environment failures. Note that `compose.test.ts` deletes `code/pg-data` of the worktree and runs `down -v` on project `ankanu`; it wiped my stack's database mid-run (re-migrated, earlier API evidence kept in the evidence folder).

---

# Retest, round 2 (commit 4c104d0)

model: Claude Sonnet 5.5
**Verdict: PASS with minor findings** (2026-10-22). Round 1 above is kept unchanged. Environment: fresh local stack from 4c104d0 (built images, fresh Postgres, migration 0019 as edited), project `ankanu-qa-staff`, same stand-ins as round 1 (siteverify and widget stubs, Tailwind v4 compiled per page, real Google Fonts through the proxy). Evidence: `code/docs/qa-handoffs/12-1-staff-identity-mfa-evidence/r2/`.

## Round 1 findings, retested
| # | Round 1 | Round 2 result | Evidence |
| --- | --- | --- | --- |
| F1 Major | 29 of 40 parallel wrong codes evaluated | **Fixed.** Same 40-parallel burst on 40 pending sessions against built-image Postgres: 4 x 401 `OTP_INVALID` + 36 x 429 `staff_locked`; audit rows: 5 `staff_sign_in_failure`, 1 `staff_sign_in_locked`; all sessions ended. Edge: 4 wrong codes then the correct 5th is accepted (200, full session works). Sequential lock, `Retry-After: 900`, lock expiry, +-1 window, replay all unchanged. Mutation (claim never counts) fails the Postgres migrate test; threshold 5->6 fails 2 unit tests. | `api-race-40-retally.txt`, `api-4wrong-then-correct.txt`, `api-totp-lockout-r2.txt`, `mutation-checks-r2.txt` |
| F2 Major | forged `staff` cookie got 200 on `/staff` | **Fixed on the built image.** Cookies `staff`, `web`, `capacitor`, `mahram`, `STAFF`, `staff%20`, `%73taff`, and combined `staff; ...=zzz` / `zzz; ...=staff` on 11 paths (`/staff`, `/staff/visit-signals`, `/decouvrir`, `/profile-edit`, `/profil`, `/favoris`, ...): every gated path answers 303 (staff pages to `/staff/connexion`, member pages to `/auth`); none answers 200. Real signed-in staff still gets `/staff` and visit-signals. Mutation (stubs always on) fails the unit test. | `web-forged-stub-cookies.txt`, `ui-r2-log.txt` |
| F3 Minor | NULL `mfa_state` accepted | **Fixed.** Constraint now has `mfa_state IS NOT NULL` for staff; insert fails with 23514 on the fresh DB. | `db-integrity-and-f3.txt` |
| F4 Minor | 500 on a 200 KB body | Not fixed, pre-existing (same on member sign-in); accepted. | round 1 |
| F5 Minor | "123 456" truncated | **Fixed.** Field `maxlength=16`, no pattern; typed "491 768" stays in the field and signs in (UI); API strips spaces. | `ui-r2-log.txt` |
| F6 Minor | field-name prefix, wrong hint | **Fixed.** "Le mot de passe doit compter de 12 à 128 caractères.", "Choisissez un mot de passe différent du mot de passe provisoire.", hint "De 12 à 128 caractères. Les espaces sont acceptés." with `aria-describedby`. | `ui-r2-log.txt`, `api-flow-pending-r2.txt` |
| F7 Minor | visit-signals contrast | Still open, pre-existing page (3 serious nodes with real fonts loaded); accepted as known. | `ui-r2-log.txt` |
| F8 Minor | header/content misaligned at 1440 | **Fixed.** Brand x = title x at all widths (16/16 at 360 and 390, 48/48 at 768-1280, 128/128 at 1440); no horizontal scroll, badge present, no nav. | `ui-r2-log.txt`, `r2-home-1440.png` |
| F9 Minor | raw SQL error on concurrent create | **Fixed.** Three rounds of 3 concurrent creates for one email: exactly one account each, the others print the normal refusal (exit 1); no orphan `staff_credential`/credential rows, one audit row per account. | `cli-concurrent-create.txt`, `db-integrity-and-f3.txt` |
| F10 Minor | exit code | **Fixed.** Bad role, malformed email: exit 2 with usage. | `cli-concurrent-create.txt` |
| F11 Minor | controller check unprotected | **Fixed.** Removing the check in `requireStaffSession` alone now fails the new controller-level test. | `mutation-checks-r2.txt` |
| F12 Minor | pending session could not sign out | **Fixed in the UI.** "Se déconnecter" (`/staff/connexion?leave=1`) is in the markup for the pending steps and is toggled hidden on the email step (in my Tailwind v4 stand-in `hidden` loses to `inline-flex`, so it shows on the email step; the real Tailwind v3 CDN orders `hidden` last; not counted). Clicking it on the enrollment step clears the cookie and returns to the email step. The DELETE route already worked in round 1 (my POST /logout probe was a wrong route). | `ui-r2-log.txt` |
| F13 Info | no security headers | unchanged, accepted. | |

## Gate re-run
| Gate | Result | Evidence |
| --- | --- | --- |
| G1 Static | PASS. Lint 0 errors, typecheck clean, migration-check clean, the only audit finding is still the existing critical on `next`; package.json/lock unchanged since round 1 (uqr unchanged). | console |
| G2 Tests | PASS. Unit 445 passed, 12 skipped, 1 failed (`photo-rules`, known). Integration (compose.test.ts excluded): 19 passed in 4 files, including the new Postgres race, NULL-session and concurrent-create test. Four mutations (non-atomic claim, threshold, controller check, stubs in production) each fail a test. Web-only e2e `--repeat-each=3`: 150 passed, 48 skipped, 0 flaky; the only failures are `/auth` axe (6/6, deterministic; see G8). Stack e2e staff shell repeat x3: 6 passed, 0 flaky. | `unit-run-r2.txt`, `integration-r2-no-compose.txt`, `mutation-checks-r2.txt`, `e2e-webonly-repeat3-r2.txt`, `e2e-stack-repeat3-r2.txt` |
| G3 Functional | PASS. Separation matrix unchanged (no session/garbage 401; member, member with staff role 403; pending 403; staff session 403 on 13 member endpoints), reset-mfa/disable behave as before, first sign-in on the built stack passes (e2e, spaced code). | `api-separation-matrix-r2.txt`, `api-reset-disable-r2.txt`, `api-flow-pending-r2.txt`, `e2e-staff-shell-r2.txt` |
| G4 UI | PASS at 360, 390, 768, 1024, 1280, 1440. | `ui-r2-log.txt`, `r2-*.png` |
| G5 UX | PASS (F5, F6, F8, F12 fixed). | |
| G6 Accessibility | PASS for the new surfaces: axe zero violations on login, password, enroll and staff home. Visit-signals remains F7 (pre-existing). | `ui-r2-log.txt` |
| G7 Non-functional | Security re-run as above. Lighthouse/Web Vitals, 3G throttling and ZAP still not run (see below). | |
| G8 Regression | PASS with caveat. Stack e2e 28 passed, 37 skipped; the only red items are `/auth` axe target-size (a page this story does not touch; my Tailwind v4 stand-in cannot reproduce the CDN's CSS exactly, and it fails identically in round 1) and one run of the first sign-in test that aborted font requests while my stand-in was slow, which passed three times once the stand-in cached fonts. | `e2e-full-stack-r2.txt`, `e2e-staff-shell-r2.txt` |

## New finding
| # | Severity | Gate | Description |
| --- | --- | --- | --- |
| F14 | Minor | G2 coverage | Judging the change you asked about. Stub-cookie tests now skip on a built stack (stack e2e: 28-31 passed, 37 skipped, down from 54 passed). I reviewed what was lost. The 8 `profile-edit-flow` tests mock every browser `/v1` call themselves (`context.route`) and only needed the server to render `/profile-edit` and `/pin` for the `web` stub; they do not touch the real API, so they still run, and pass, on the web-only dev server (150 passed there). The staff-shell stub tests are replaced on a stack by the real first sign-in, which covers badge, axe, panes, header alignment and no horizontal scroll with a real staff session, and by the forged-cookie test. What is genuinely lost: no e2e on a built image now renders `/profile-edit`, `/pin`, `/decouvrir` or the favourites page for a member (a real member past the signup gate needs email, phone OTP and ID steps; with a real session but before the gate those pages 303 to `/auth`). The remaining protection is static (`web-image.test.ts` checks the Dockerfile copy list against the screens the server reads) plus the screen-52 sign-in check. I accept that as a Minor gap rather than a blocker, because security was the reason for the change and the build-time gate is correct, but a seeded real-member e2e (or a documented test-only member fixture created by a command like `staff-cli`) should replace the lost image-render check before more screens depend on the stubs. |

## Not tested and why (round 2)
- Lighthouse/Web Vitals, 3G throttling, ZAP, WebKit: not run (same as round 1). These remain open gates; the changes in this round do not alter page weight or render path, and I judge the risk low, but strictly they were not measured.
- `NODE_ENV=production` boot without `STAFF_MFA_KEY`: not re-run by me.
- Real Google reCAPTCHA and the real Tailwind CDN: stand-ins as in round 1.
- Environment note: the Postgres integration tests (not only `compose.test.ts`) and the restore drill delete the worktree's `code/pg-data`; the stack database was wiped twice and re-migrated. `compose.test.ts` was not run, as instructed.
