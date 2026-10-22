# QA handoff: 12-1 staff identity and authenticator MFA

Branch `factory/staff-mfa` (based on origin/main 6c4788e). Spec: `_bmad-output/implementation-artifacts/spec-12-1-staff-identity-mfa.md`, epics.md Story 12.1.

## 1. What was built

- **Server command** `node apps/api/dist/staff-cli.js` (inside the api container):
  - `create --email <e> --role moderator|operator`: creates a staff-only account with that role. It prints `One-time password (shown once, change at first sign-in): <pw>` (24 base64url characters) once; only its hash is stored. An email that already exists, as staff or as a member, answers `An account already uses this email. Nothing was changed.` with exit 1, and nothing is written.
  - `reset-mfa --email <e>`: clears the enrollment, the lock and the failure count, and ends the account's sessions. The next sign-in enrolls again.
  - `disable --email <e>`: sets the account to `deactivated` and ends its sessions. Sign-in then gives the generic failure.
  - Exit codes: 0 done; 1 refused by the data (email taken, or no staff account uses it), nothing changed; 2 bad usage (unknown command, missing or malformed `--email`, `--role` other than moderator/operator), with the usage text. An unexpected failure prints only the error class and Postgres code. The CLI output is in English (operator tool).
  - Audit actions: `staff_account_created`, `staff_mfa_reset`, `staff_account_disabled` (`via: 'server_command'`).
- **Sign-in at `/staff/connexion`** (French, Stitch 52 shell):
  1. Email, password and reCAPTCHA, sent to `POST /v1/staff/sessions`. This opens an **MFA-pending** session (`session.kind='staff'`, `mfa_state` = `password_change` / `enroll` / `verify`). Failures are always `Identifiant ou mot de passe incorrect.` (401). They are rate limited per IP like member sign-in, and the captcha is required.
  2. First sign-in: "Choisissez un nouveau mot de passe" (`POST /v1/staff/sessions/password`). 12 to 128 characters (spaces allowed, not only spaces), different from the one-time password.
  3. Without MFA: "Configurer l'application d'authentification" with a QR code (SVG, alt text) and the manual key in groups of 4 (`GET /v1/staff/sessions/enrollment`).
  4. A six-digit code (`POST /v1/staff/sessions/mfa`). A valid code issues a **new session id** with `mfa_state='done'` and sends the browser to `/staff`. A wrong code gives `Code incorrect.` (401) and the session stays pending.
- **TOTP**: RFC 6238, SHA-1, 30 s, 6 digits, `node:crypto` only. Spaces in the code ("123 456") are ignored. A code is valid for the current step ±1, and each step is used once (an atomic `totp_last_step` update). Each attempt is counted atomically before the code is checked (round 2), so 5 wrong codes lock staff sign-in for 15 minutes: 429 `RATE_LIMITED`, `Connexion verrouillée. Réessayez dans 15 minutes.`, reason `staff_locked`, with `Retry-After`. The lock also ends the pending sessions.
- **Secrets**: the TOTP secret is sealed with AES-256-GCM under `STAFF_MFA_KEY`/`STAFF_MFA_KID` (the same envelope as evidence). The QR library is `uqr@0.1.3`, pinned and with no dependencies.
- **Separation**:
  - `/v1/staff/*` answers 403 to MFA-pending, member and Mahram sessions, even when the account has a staff role, and 401 with no session.
  - A staff session gets 403 `FORBIDDEN` with reason `staff_session` on every member endpoint; reason `staff_mfa_pending` while MFA is not done.
  - Member pages redirect a staff session to `/staff`; `/staff` sends a pending session back to `/staff/connexion`.
  - Staff sessions are never PIN sessions. Their idle timeout is 30 min and their absolute limit is 12 h. The cookie has no Max-Age.
- **Staff shell**:
  - Every staff surface (`/staff/connexion`, `/staff`, `/staff/visit-signals`) carries the badge `Réservé Staff / Confidentiel` (`data-testid="staff-only-badge"`) and shows no member nav.
  - `/staff` is the console home: two panes from 768 px (queue `md:col-span-5`, case `md:col-span-7`); below 768 the queue sits above the case. It has a link to Signaux de visite and "Se déconnecter".
- **Existing staff-role tests** (profile review, verification grant, photo strike, visit signals) now sign in through the real staff flow.

## 2. Where

- Migration `apps/api/drizzle/0019_staff_mfa.sql` (+ snapshot, journal):
  - New table `staff_credential`.
  - `session.mfa_state` with a check: staff sessions need a state, other kinds need null.
  - `account_gender_check` allows `gender='none'` only for accounts whose roles are a non-empty subset of moderator/operator.
- API, new files:
  - `staff-totp.ts`, `staff-mfa-key.ts`, `staff-store.ts`, `staff-accounts.ts`, `staff-cli.ts`, `staff-session.ts`, `staff-sessions.controller.ts`
  - `test-staff-session.ts` (test helper, excluded from the build)
- API, changed files:
  - `account-schema.ts`, `pin-session.ts` (staff gate in the session middleware), `session-touch.ts`, `sessions.controller.ts` (logout ends staff sessions)
  - `staff.controller.ts`, `visit-signals.controller.ts` (`requireStaffSession`)
  - `media.controller.ts` (a staff viewer needs a done staff session)
  - `main.ts` (boot check), `app.module.ts`, `package.json` (`uqr`)
- Web:
  - New: `src/staff-pages.ts`, `app/staff/route.ts`, `app/staff/connexion/route.ts`
  - Changed: `src/v2-serve.ts`, `src/entry-guard.ts` (gate step `staff`)
- Tests:
  - New: `apps/api/src/staff-mfa.test.ts`, `apps/web/src/staff-pages.test.ts`, `e2e/staff-shell.spec.ts`
  - Migrated: `profile-review`, `staff-verification-grant`, `photo-strike`, `visit-signals` tests; `visit-signals-page.test.ts`; `operator-config.migrate.test.ts`
- Env (api only, never in the repo):
  - `STAFF_MFA_KEY` (`openssl rand -base64 32`)
  - `STAFF_MFA_KID`
- Docs: `code/README.md` "Staff accounts"; `.factory/config.md` local deployment and staging.

## 3. How to run

1. Add the two env lines to `~/.ankanu/api.env` (see `.factory/config.md`) and start the stack as documented.
2. `docker compose -p ankanu-local exec api node apps/api/dist/staff-cli.js create --email qa.mod@example.bf --role moderator`, and note the printed password.
3. Open `http://localhost:4012/staff/connexion` and sign in. On a stack with reCAPTCHA test keys, the API accepts `recaptcha_token: "test-ok"`. Change the password, scan the QR code (or type the key into Google Authenticator or Authy, or compute it with `totpCode` from `apps/api/src/staff-totp.ts`), then enter the code.
4. Full-stack e2e run:

   ```
   E2E_BASE_URL=http://localhost:4012 E2E_STAFF_EMAIL=<fresh account> E2E_STAFF_ONE_TIME_PASSWORD=<printed pw> npm run test:e2e
   ```

   The run spends the one-time password, so each run needs a fresh account.
5. Unit: `npm test`. Postgres integration (`operator-config.migrate.test.ts`): `npm run test:integration` with `DATABASE_URL`.

## 4. AC trace

| ID | Criterion (verbatim) | Proven by | Status |
| --- | --- | --- | --- |
| AC1 | Given the provisioning command, when an operator runs `create` with an email and role, then a staff account exists with that role, a one-time password is printed once, an audit event is written, and running it for an existing email fails without changing anything. `reset-mfa` and `disable` behave as described and are audited. | `staff-mfa.test.ts` "AC1 provisioning command" (5 tests); `operator-config.migrate.test.ts` "provisions a staff account and signs it in with TOTP on migrated Postgres"; live on the stack: create, duplicate (exit 1), reset-mfa, disable, usage (exit 2), audit rows checked | Passing (unit, integration, live stack) |
| AC2 | Given a staff account without MFA, when it signs in at `/staff/connexion` with the right password, then it must set a new password, then sees a QR code and manual key, and the session becomes a full staff session only after a valid code; a wrong code keeps it MFA-pending. | `staff-mfa.test.ts` "walks password change, enrollment and the code; a wrong code keeps the session MFA-pending"; e2e `staff-shell.spec.ts` "new password, QR enrollment, a wrong then a valid code, then no member chrome" (stack) | Passing (unit, e2e on stack) |
| AC3 | Given an enrolled staff account, when it signs in, then email + password + a valid code give `session.kind = 'staff'`; a reused code, a code outside ±1 step, or a wrong code is refused; 5 wrong codes lock sign-in for 15 minutes; failures are generic and rate-limited. | `staff-mfa.test.ts` "AC3 enrolled sign-in" (6 tests); TOTP window tests; migrate test (replay refused on Postgres); live: 401×4 then 429 with `retry-after: 757`, reason `staff_locked` | Passing |
| AC4 | Given an MFA-pending session, a member session, or a Mahram session (even on an account with a staff role), when it calls any `/v1/staff/*` endpoint, then 403. Given a staff session, when it calls a member endpoint or opens a member page, then 403 or a redirect to the staff home. | `staff-mfa.test.ts` "AC4 separation" (3 tests); `staff-pages.test.ts` "sends a staff session from every member page to the staff home"; e2e stack flow (`/decouvrir`, `/auth`, `/profile-edit` go to `/staff`; `/v1/me/profile` gives 403 `staff_session`); live: a pending session got 403 `staff_mfa_pending` | Passing |
| AC5 | Given every staff surface, when it renders, then the staff-only badge is visible and no member nav is shown; at 768 px and wider the layout is two panes, below 768 the queue stacks above the case; no horizontal scroll at 360–1440. | `staff-pages.test.ts` (shell tests); e2e "the staff home shows the badge…", "two panes from 768 px…", "the visit-signals page carries the badge…", "the staff sign-in page is labelled…"; browser walk on the stack at 360/768/1440 (scrollWidth equal to the width on every page) | Passing |
| AC6 | Given sign-in, MFA and provisioning events, then each writes an audit event with no secret, and the api log has no password, code, secret or otpauth URI. The api refuses a production boot without the MFA key. | `staff-mfa.test.ts` "AC6 audit and logs carry no secret" (2 tests); migrate test (audit actions, no secrets in rows); live: grep of the api and web logs for the passwords, secrets and `otpauth` found nothing; a production boot without the key printed `STAFF_MFA_KEY and STAFF_MFA_KID are required in production` and exited 1 | Passing |
| AC7 | Given the full local stack, when it starts with the documented env, then it boots, existing e2e (including staff-role tests) pass, and the commands and env are documented. | Stack `ankanu-dev-staff` booted healthy (migrations through 0019); e2e on the stack 54 passed / 12 skipped; staff-role unit tests now on real staff sessions; `code/README.md` "Staff accounts" and `.factory/config.md` | Passing (see the env note in section 7) |
| NFR-sec | Session rotation after MFA; a pending session cannot reach staff data; generic failures; captcha; per-IP rate limit and per-account lock | AC2–AC4 tests | Passing |
| NFR-a11y | Labelled fields, `role="alert"` errors, QR alt text, axe WCAG 2.2 AA | e2e `expectAccessible` on `/staff` and `/staff/connexion` (also after sign-in on the stack) | Passing |
| NFR-i18n | French UI copy | `staff-pages.test.ts`; screenshots | Passing; new strings need Fay's review (section 8) |
| Edge | Unknown email or member email at staff sign-in; disabled account; key missing (503); idle 30 min; logout; replay; lock expiry | AC3/AC4/AC1 tests; live: disabled account gives the generic 401 | Passing |

## 5. Test cases for QA

| # | Input | Expected |
| --- | --- | --- |
| 1 | `create` with a new email, role moderator | Exit 0, password printed once, `staff_account_created` audit row with no password |
| 2 | `create` again with the same email, or with a member's email | Exit 1, `An account already uses this email. Nothing was changed.`, no new row |
| 3 | `create --role admin`, `create --email nope`, or no `--email` | Exit 2, usage text |
| 4 | First sign-in with the one-time password | New password step; reusing the one-time password is refused (`Choisissez un mot de passe différent du mot de passe provisoire.`); a short one gives `Le mot de passe doit compter de 12 à 128 caractères.` |
| 5 | Enrollment step | QR code and a grouped 32-character key; a wrong code gives `Code incorrect.` and the page stays on enrollment; a valid code goes to `/staff` |
| 6 | Signed-in staff opens `/decouvrir`, `/auth`, `/profile-edit` | Redirected to `/staff` |
| 7 | Signed-in staff calls `GET /v1/me/profile`, `/v1/browse`, `/v1/favourites` | 403, reason `staff_session` |
| 8 | MFA-pending session calls `/v1/staff/visit-signals` or opens `/staff` | 403 `staff_mfa_pending` / redirect to `/staff/connexion` |
| 9 | A member session (even after setting a staff role in the DB) calls `/v1/staff/*` | 403 |
| 10 | Sign in, then submit the same code again in a second sign-in within the same 30 s | Refused (`Code incorrect.`) |
| 11 | 5 wrong codes | 5th answer and the next sign-in with the correct password: 429, `Connexion verrouillée. Réessayez dans 15 minutes.`, `Retry-After` |
| 12 | Wrong password / unknown email / member account at `/staff/connexion` | All `Identifiant ou mot de passe incorrect.` (401) |
| 13 | `reset-mfa` then sign in | Enrollment again; old sessions ended |
| 14 | `disable` then sign in | Generic 401; old sessions ended |
| 15 | Idle 30 min, then use the staff page | Back to `/staff/connexion` |
| 16 | "Se déconnecter" (also shown on the password, enrollment and code steps) | Back to `/staff/connexion`; `/staff` then redirects to sign-in |
| 20 | 40 parallel wrong codes on 40 pending sessions of one account | 4×401, 36×429; 5 `staff_sign_in_failure` and 1 `staff_sign_in_locked` |
| 21 | Built image: `curl -H 'cookie: ankanu_session=staff' /staff` (or `/staff/visit-signals`) | 303 to `/staff/connexion` |
| 22 | Paste `123 456` in the code field | Kept whole, accepted |
| 23 | Two `create` for one email at once | One created, the other `An account already uses this email. Nothing was changed.` (exit 1) |
| 17 | Widths 360, 768, 1440 on `/staff`, `/staff/connexion`, `/staff/visit-signals` | Badge visible, no member nav, no horizontal scroll; two panes at 768 and wider |
| 18 | api with `NODE_ENV=production` and no `STAFF_MFA_KEY` (no test keys) | Refuses to boot with the error message above |
| 19 | Grep the api log after the flow | No password, code, key or `otpauth` |

## 6. Out of scope

- The review console queue and case contents (next story). `/staff` shows the shell, a link to Signaux de visite, and an empty case pane.
- Staff password reset by email; recovery codes; WebAuthn. A lost phone is handled with `reset-mfa`.
- Staff account management in the UI.

## 7. Assumptions, decisions and known issues

- **Staff accounts use `gender='none'`.** The account table requires a gender, and staff are not members. The migration relaxes the check only for accounts whose roles are a subset of moderator/operator, so member rows are unchanged. Member sign-in is unchanged; staff accounts are excluded from it by the existing gender filter, and they get the generic failure there.
- **The lock is per account**, using DB columns `failed_codes` and `locked_until`. It sits on top of the existing per-IP auth rate limit. A correct password during the lock gets the 429 too, so the lock cannot be bypassed by starting over.
- **Missing key.** The api refuses to boot only in a real production boot (`NODE_ENV=production` and `RECAPTCHA_ALLOW_TEST_KEYS` not `1`), the same pattern as the SMS boot check. On test-key stacks (local, staging) it boots, and staff sign-in answers 503 `La connexion staff est indisponible.` **Staging needs `STAFF_MFA_KEY`/`STAFF_MFA_KID` added to `/var/lib/ankanu/api.env` before deploying this branch**, or staff cannot sign in there.
- **Session rotation**: after a valid code the session id changes (AD-8 style fixation protection).
- **Changed test expectation**: in `visit-signals-page.test.ts`, anonymous visitors to `/staff/visit-signals` used to go to `/auth`; they now go to `/staff/connexion`, as the story requires.
- **e2e stub-cookie test skipped on a stack**: the stub-cookie visit-signals width test is skipped on a stack, because the stub is not an API session. The full-stack sign-in test covers that page at every width instead.
- Known environment failures, also red on main:
  - Unit `photo-rules` (1 test) fails on main too.
  - `compose.test.ts` fails at `npm ci` in the image build because of the sandbox proxy CA.
- The local stack runs used a scratch Dockerfile copy with the proxy CA (not committed).
- The e2e runs used a local stand-in for the blocked Tailwind CDN, and allowed the expected Google font/reCAPTCHA network errors and the favicon 404.
- `npm audit`: the existing high finding is on `next` 16.3.6, which this story does not touch. `uqr` has no findings.
- QA round 1 findings left as they are (pre-existing, not in this story):
  - F4: a 200 KB body to `/v1/staff/sessions` answers 500, the same as member `/v1/sessions`.
  - F7: 7 serious color-contrast nodes on `/staff/visit-signals` (page and colours from main; this story only changed its header).
  - F13: no security headers (CSP, X-Content-Type-Options, X-Frame-Options, Referrer-Policy) on any page.
- `compose.test.ts` runs `docker compose -p ankanu ... down -v` and deletes `code/pg-data` of the worktree. Do not run the unit or integration suite while another stack uses the compose project name `ankanu`; it will wipe that stack's database. Not changed in this story.

## 8. New French strings (need Fay's wording)

- Connexion staff
- Accès individuel réservé au personnel de modération.
- Choisissez un nouveau mot de passe
- Le mot de passe provisoire ne sert qu'une fois.
- Configurer l'application d'authentification
- Scannez ce code avec Google Authenticator ou Authy, puis saisissez le code à six chiffres affiché.
- Code QR de configuration de l'application d'authentification (QR alt text)
- Clé de configuration manuelle
- Code à six chiffres
- Code de l'application d'authentification
- Saisissez le code à six chiffres affiché par votre application.
- Se déconnecter
- Modérateur
- Opérateur
- Sélectionnez une fiche dans la file.
- Connexion verrouillée. Réessayez dans 15 minutes.
- Validation en deux étapes requise.
- Cette étape n'est pas disponible.
- La connexion staff est indisponible.
- Saisissez les six chiffres du code. (round 2, replaces "code : six chiffres sont requis.")
- Choisissez un mot de passe différent du mot de passe provisoire. (round 2)
- Le mot de passe doit compter de 12 à 128 caractères. (round 2)
- De 12 à 128 caractères. Les espaces sont acceptés. (round 2, hint under the new password)
- Saisissez votre adresse email. (round 2)
- Saisissez votre mot de passe. (round 2)

Reused copy, already approved: Réservé Staff / Confidentiel, Console de modération, Signalements & Contrôles, Signaux de visite, Instruction du dossier, Dossier d'arbitrage, Code incorrect., Confirmer le code, Continuer, Nouveau mot de passe, Adresse email, Mot de passe, Se connecter, Identifiant ou mot de passe incorrect. (The member screens still show the old hint "Au minimum 12 caractères avec lettres, chiffres et symbole noble."; not changed here.)

## 9. Self-check (real results)

- Lint (`npm run lint`): 0 errors, 3 warnings (all on main already).
- Typecheck: clean.
- Unit (`npm test`): 69 files; 440 passed, 12 skipped, 1 failed (`photo-rules`, which also fails on main).
- Integration (Postgres 17): 26 passed; `compose.test.ts` failed at `npm ci` (proxy CA, environment).
- E2E web-only: 52 passed, 14 skipped.
- E2E against the stack (`http://localhost:4051`): 54 passed, 12 skipped, including the full first sign-in.
- Browser walk on the stack (Chromium):
  - Sign-in, enrollment, home and visit-signals pages captured at 360, 768 and 1440 px; scrollWidth equalled the viewport width on every page.
  - `/decouvrir` redirected to `/staff`.
  - The only console errors were the blocked Google reCAPTCHA/fonts and the favicon 404.

## Round 2 (after QA round 1 FAIL on 05aa2c2)

Report: `code/docs/qa-handoffs/12-1-staff-identity-mfa-qa-report.md`. Each fix has a test that fails without it; the "Fails without the fix" column says how that was checked.

| Finding | Fix | Test | Fails without the fix |
| --- | --- | --- | --- |
| F1 Major: parallel wrong codes not counted atomically | `StaffStore.claimCodeAttempt`: one `UPDATE staff_credential SET failed_codes = ..., locked_until = CASE ... WHERE (not locked) RETURNING`, run **before** the code is checked. The attempt that reaches 5 sets the lock in the same statement; later attempts get 429 without a check. Only that attempt writes `staff_sign_in_locked` and ends the sessions. The memory store does the same read-and-write with no await in between. | `staff-mfa.test.ts` "checks at most 5 codes when 40 wrong codes arrive at once on 40 pending sessions, and locks once"; `operator-config.migrate.test.ts` "counts staff code attempts atomically..." (Postgres: 4×401, 36×429, 5 failure + 1 locked audit rows, all sessions ended) | Yes: ran the new unit test against the round-1 `staff-session.ts`, it failed |
| F2 Major: forged `ankanu_session=staff` reached `/staff` | Stub cookies (`web`, `capacitor`, `mahram`, `staff`) are honoured only when `NODE_ENV !== 'production'` (`stubSessionsEnabled()` in `member-route.ts`, used by `sessionKind` and `isStubSession`). Next inlines `NODE_ENV` at build, so a built image can never turn them on. Without a stub, every staff page asks the API: `/staff` and `/staff/connexion` need `GET /v1/staff/sessions/current` to answer `mfa_state: 'done'`, and `/staff/visit-signals` needs the staff-only signals endpoint to answer 200. | `staff-pages.test.ts` "ignores stub cookies in a production build..."; e2e (built image) `profile-edit-flow.spec.ts` "the image ignores stub cookies: a forged staff cookie gets no staff page". Checked on the built image with curl: `/staff` and `/staff/visit-signals` with `ankanu_session=staff` give 303 to `/staff/connexion`; `/decouvrir` with `staff` or `web` gives 303 to `/auth` | Yes: with the gate forced on, the unit test failed |
| F3: staff session with NULL `mfa_state` accepted | `session_mfa_state_check` now requires `mfa_state is not null` for staff. 0019 was edited in place (not merged or deployed anywhere; a stack that already ran the round-1 0019 needs a fresh database). `drizzle-kit check` and `generate` show no drift. | migrate test: insert of a staff session with NULL gives 23514 | Yes: QA showed NULL was accepted |
| F5: "123 456" cut to "123 45" | Code field: no `maxlength="6"` or digits-only `pattern`; `maxlength="16"`. The server drops whitespace before the six-digit check. | AC2 unit test sends `" 123 456 "`; `staff-pages.test.ts` checks the field; the stack e2e fills a spaced code and asserts the field keeps it | Yes: ran against the round-1 `staff-session.ts`, it failed |
| F6: message carried `new_password :`, hint did not match the rule | Messages: "Le mot de passe doit compter de 12 à 128 caractères.", "Choisissez un mot de passe différent du mot de passe provisoire."; the other staff field messages lost the field-name prefix too. Hint: "De 12 à 128 caractères. Les espaces sont acceptés." (linked with `aria-describedby`). | AC2 unit test checks both messages; `staff-pages.test.ts` checks the hint | Yes |
| F8: header and content not aligned at 1440 | The header row and the staff home content use the same centred box (`STAFF_ROW`, `max-w-7xl mx-auto px-4 md:px-12`); the home `main` is now full width with that box inside, the same structure as the header. | `staff-pages.test.ts` checks both use the shared box; e2e `expectHeaderAligned` checks brand x equals title x at every width (stub and signed in on the stack) | The unit assertion fails on the round-1 markup. In my Tailwind stand-in the round-1 page was already aligned, so the e2e only fails with QA's stand-in |
| F9: concurrent duplicate create printed SQL and values | `StaffStore.create` maps unique violation 23505 to `taken`, giving the normal refusal. The CLI's last-resort handler prints only `The staff command failed (<class>, code <pg code>).` | unit "refuses the loser of two concurrent creates cleanly..."; migrate test races two creates; on the stack, three concurrent pairs each gave exactly one account and one clean refusal | Yes for the memory race: the round-1 store had no uniqueness check |
| F10: exit code for a bad role | The code now matches the handoff: a bad `--role` or malformed `--email` is exit 2 (usage). README documents 0/1/2. | CLI unit test expects 2 | Yes: the round-1 code exited 1 |
| F11: controller-level pending check untested | Direct test of `requireStaffSession` with a pending cookie (403 `staff_mfa_pending`) and a done one | unit "refuses an MFA-pending session in the staff controllers themselves..." | Yes: with the check removed, this test failed |
| F12: pending session could not sign out | The API already lets a pending session end itself: `DELETE /v1/sessions/current` answers 204 (QA called `POST /v1/sessions/logout`, which is not a route). The UI had no way to do it, so the sign-in page now shows "Se déconnecter" on the password, enrollment and code steps (`/staff/connexion?leave=1`). | unit "lets an MFA-pending session sign out" (API); `staff-pages.test.ts` checks the link is hidden on the email step and shown on pending steps | The API test passes on round 1 too, because the route already worked. The link assertions fail on round 1. |

Changes the fixes forced on tests:
- **Stub-cookie e2e tests skip on a stack:** a built image no longer honours stub cookies. Affected: the two `profile-edit-flow.spec.ts` describes (8 tests) and the stub tests in `staff-shell.spec.ts`. They still run on the web-only dev server, as before. On a stack, the signed-in staff flow covers the staff checks: badge, axe, panes at every width, header alignment and no horizontal scroll.
- **"Web image screens" test:** it no longer opens `/staff/visit-signals` with a forged cookie. It now checks `/staff/connexion` (built from screen 52), and a new test asserts that the forged cookie is refused.

Self-check, round 2:
- Lint: 0 errors, 3 warnings (the same as main).
- Typecheck: clean.
- `npm run migration-check`: "Everything's fine". `drizzle-kit generate`: "No schema changes".
- Unit (`npx vitest run`, Docker available, so `compose.test.ts` runs as well): 472 passed, 14 skipped, 1 failed (`photo-rules`, red on main). `compose.test.ts` failed at the image build (proxy CA, environment).
- Staff unit tests: `staff-mfa.test.ts` 25 passed; `staff-pages.test.ts` + `visit-signals-page.test.ts` 15 passed, 2 skipped.
- Integration (`npm run test:integration`): 27 passed, 2 skipped. `compose.test.ts` failed (environment).
- E2E web-only (`next dev` :3100): 52 passed, 16 skipped.
- E2E against the stack (built images, :4051, fresh account `e2e.r2@example.bf`): 31 passed, 37 skipped. Includes the full first sign-in with a spaced code and the forged-cookie image test.
- Browser walk on the stack:
  - Pages: sign-in, enrollment, home and visit-signals at 360, 768 and 1440 px.
  - scrollWidth equalled the viewport width on every page, and the brand and title share x=128 at 1440.
  - `/decouvrir` redirected to `/staff`.
  - The only console errors were the blocked Google reCAPTCHA/fonts and the favicon 404.
- Log scan: the api, web and worker logs contain none of the one-time passwords, the chosen passwords or `otpauth`.
