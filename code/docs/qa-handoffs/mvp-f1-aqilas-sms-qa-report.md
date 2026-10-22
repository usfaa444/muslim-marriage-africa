# mvp-f1-aqilas-sms QA report

model: Claude Sonnet 5.5 (`claude-sonnet-5-5`), independent QA phase, agent `.claude/agents/factory-qa.md`

Verdict: **PASS** (2026-10-22). Environment: local Docker stack, project `ankanu-qa`, built from commit `f135622` on branch `factory/mvp-f1-aqilas-sms` (exported with `git archive` so the repo's git-ignored `pg-*` directories were not touched). No staging deploy exists for this branch. A real Aqilas key and real numbers were never used.

**Retest of commit `75f099f` (same day): PASS.** F-1, F-2 and F-3 are fixed; one new minor residual (N-1). See the "Retest" section at the end. The round-1 text below is kept unchanged.

Read this before relying on PASS:

- All six acceptance criteria are met and verified by me, with no blocker, critical or major finding attributable to this story's code. Four minor findings are listed.
- You told me to judge UI, accessibility and performance by regression on the existing OTP screens, because the story changes no screen. On that basis I did not count the findings in section "Pre-existing and out-of-scope observations" against the verdict. Two of them are serious for launch: P-1 (a failed send is invisible to the member) and P-2 (no abuse limits on a now-paid, third-party-reaching SMS endpoint). Both existed before this story, but this story makes them reachable. If the orchestrator or Fay judges P-1 to be in scope, the verdict becomes FAIL on that finding alone.
- The one thing nobody can verify here is a real SMS reaching a real phone. That is Fay's manual test in the spec.

Evidence folder: `code/docs/qa-handoffs/mvp-f1-aqilas-sms-evidence/` (called `evidence/` below). The scripts I used are in `evidence/harness/`.

## Gate summary

| Gate | Result | Evidence |
| --- | --- | --- |
| G1 Static | PASS. Lint 0 errors (3 pre-existing warnings). Typecheck and build pass. `npm audit` exit 1 on one high (`next`), pre-existing: `package.json` and `package-lock.json` are unchanged in this diff. No secret, real phone or debug leftover in the diff. | `evidence/g1-*.txt` |
| G2 Automated tests | PASS with sandbox-only reds that are identical on parent `5030b6f`. Mutation spot-check: 13 of 13 mutations caught. e2e against the full stack, `--repeat-each=3`: 42 passed, 0 failed, 0 flaky. | `evidence/g2-*.txt` |
| G3 Functional, real browser and API | PASS. 52 API checks and the browser flows run against the stack (details in the matrix). One minor security finding (F-1). | `evidence/g3-*.txt`, screenshots |
| G4 UI fidelity | PASS as regression. No horizontal scroll at 360, 390, 768, 1024, 1280, 1440, plus 320 and 720 (200% zoom). Copy and layout match `06-otp` and `56-otp-alt`. | `evidence/f2-*.png`, `g4-g6-widths-axe-run.txt` |
| G5 UX | Regression PASS. Pre-existing gaps recorded as P-1. | `evidence/f3a-*.png`, `f4b-*.png` |
| G6 Accessibility | Regression PASS. axe finds only `color-contrast` (serious) on `/phone` and `/otp`, present before this story (P-3). Keyboard-only flow completes. | `evidence/g6-axe-violations.json`, `g3-browser-run-F2-F5.txt` |
| G7 Non-functional | PASS. Security, reliability, privacy and timing checks done. Web Vitals measured with Playwright, not Lighthouse (see "Not tested"). | `evidence/g3-*`, `g7-*` |
| G8 Regression | PASS. Smoke e2e on the stack, log-mode OTP flow, Story 2.7 OTP tests, `id-liveness` and `profile-review` tests. | `evidence/g2-e2e-stack-repeat3.txt`, `g3-browser-log-mode-F1.txt` |

## Verification matrix

Derived from the spec, PRD FR-002 and the NFRs before I read the diff. Then extended with the handoff cases.

| ID | Criterion or check | Expected | Actual | Result | Evidence |
| --- | --- | --- | --- | --- | --- |
| AC1 | `SMS_PROVIDER=aqilas` send | One POST to the Aqilas URL, header `X-AUTH-TOKEN`, JSON `from`, `to`, `text` with the stored code, 201 | One POST `/api/v1/sms`, token `test-key`, `application/json`, body keys exactly `from,text,to`, `from` `AnKanu`, `to` `["+22600000011"]`, text exact. Stored hash equals sha256 of the code in the SMS. The code from the vendor SMS verifies with 200 `granted`. | PASS | `g3-api-checks-run3.txt` S02a-f, `g3-vendor-request-sample.json` |
| AC1b | Text is French, one segment | 88 characters, GSM-7, copy exact | 88 characters, only basic characters, matches the spec string | PASS | S02c |
| AC1c | Same flow in a real browser | `/phone`, number, `/otp`, code, `/id-liveness` | Passed; masked number only on screen; reload on `/otp` keeps state; persisted `granted` | PASS | `g3-browser-run-aqilas-second-pass.txt` F1a-F1f |
| AC2 | Vendor 500, 401, 400, 429, 404, 503 | 503 `UNHANDLED`, `retryable` true, `L'envoi du code a échoué.`; hash, phone, dispatch unchanged | All six: 503 with that body, 0 stored rows, 0 dispatch rows, one vendor call, 15-22 ms | PASS | S05-* |
| AC2b | Vendor 200, 202, 204 | Any 2xx is success | 201 for each | PASS | S05-200/202/204 |
| AC2c | Rollback keeps earlier state | Earlier hash, phone, expiry, dispatch count kept; the earlier code still verifies | Same; earlier code verified 200 | PASS | S05b |
| AC2d | Retry right after a failure | Not blocked by the 60 s wait | 201 immediately, for every status | PASS | S05-*-retry |
| AC2e | Timeout | 503 after about 10 s, nothing stored, status-only log line | 503 after 10 019 ms, 0 rows; a 3 s vendor delay gives 201 after 3.0 s | PASS | S06, S06b |
| AC2f | Network failure | 503, log `sms aqilas network error` | Stub stopped: 503 in 44 ms, that log line; also a redirect loop | PASS | `g3-network-error-stub-stopped.txt` |
| AC2g | Vendor sends headers then stalls the body, or a 5 MB body | Not awaited, not echoed | 201/503 in 21-27 ms; response 41-152 bytes | PASS | S07, S08 |
| AC3 | No code, phone, key or vendor text in output, `sms_dispatch`, errors | None | api container log has only `sms aqilas status N` / `timeout` / `network error`. Swept for 32 codes and 28 phones in the first sweep, then for the key, `votre code`, `226\d{8}`, vendor text in a second clean-container sweep: 0 hits. DB dump: no plaintext code; phone only in `verification_record` (Story 2.7 design). `sms_dispatch` columns are `account_id,created_at,id,template`. Error bodies carry no vendor or key text. | PASS | S13a-d, `g3-api-log-aqilas-mode-filtered.txt` |
| AC3b | No `otp <code>` line in aqilas mode | None | None | PASS | S13b |
| AC4 | `SMS_PROVIDER` unset or `log` | Story 2.7 behaviour | Default-env stack: `SMS_PROVIDER=log`, `AQILAS_*` empty, vendor never called, `otp 295644` in the api log, browser flow completes | PASS | `g3-browser-log-mode-F1.txt`, `g3-compose-config-default-env.txt` |
| AC5 | Boot refusals | Names the variable, never echoes a value | In the real api image: aqilas without key refuses, blank key refuses, unknown provider refuses ("SMS_PROVIDER must be log or aqilas", the odd value is not echoed), `ftp://` URL refuses and the key is not echoed, production + real reCAPTCHA keys + `log` or unset refuses ("log SMS is refused in production"). Production + aqilas + key boots. Staging style (test keys + opt-in + log) boots. Worker role ignores the SMS settings. | PASS | `g3-boot-checks.txt` B1-B9 |
| AC6 | Full stack with default env boots, OTP flow works, variables documented | Boots; docs present | All six compose services healthy plus the two stand-in stubs; migrations applied by hand (compose does not migrate); flow works; README SMS section and `.factory/config.md` local section match behaviour | PASS | `g3-stack-ps.txt`, README diff |
| E1 | Signed out or bogus session | 401, no vendor call | 401 on send and GET, 0 vendor calls | PASS | S01 |
| E2 | Another member's session verifies A's code (IDOR) | 400; A still verifies | B 400, A 200; B's GET shows `none` | PASS | S11 |
| E3 | Double submit, 8 concurrent sends | One SMS | One 201, seven 200, one vendor call | PASS | S04 |
| E4 | Resend inside 60 s | No second SMS | 200, same `expires_at`, one vendor call | PASS | S03, F4a |
| E5 | Hourly cap (5) | 6th is 429, no vendor call | `201,201,201,201,201,429`, 5 vendor calls | PASS | S12 |
| E6 | Hostile input: script, SQL, 300 characters, arrays, objects, null, newline, Arabic-Indic digits, emoji, JSON injection in `phone_e164`, non-JSON body, array body | 400, never 5xx, no vendor call | 18 payloads and 2 malformed bodies all 400; 0 vendor calls | PASS | S10 |
| E7 | Valid non-Burkina number | Passed verbatim in a one-element list | `+33612345678` sent as `["+33612345678"]` | PASS | S10c |
| E8 | Resend with a healthy vendor | New code replaces the old | Old code 400, new code 200 | PASS | F4d-e |
| E9 | Session expiry mid-flow, deep links, Back | 401, no SMS; guard redirects | 401, 0 calls; `/phone` signed out goes to `/auth`; `/phone` and `/id-liveness` with a pending code go to `/otp` | PASS | F7, F8 |
| E10 | Slow network (400 kbps, 400 ms RTT) with a 1.5 s vendor, triple submit | One SMS | One SMS; reached `/otp` after 28 s, dominated by page weight (see P-1 for the missing pending state) | PASS | F6a |
| E11 | Vendor redirects (307) to another host | The key must not follow | The POST, with token and body, was re-sent to the other host and the api answered 201 | **FAIL, F-1 minor** | `g3-api-checks-S09-redirect.txt` |
| E12 | Key containing a newline | Rejected at boot or reported clearly | Accepted at boot; every send fails and logs "network error" | F-2 minor | `g3-key-with-newline.txt` |
| UI1 | Widths 360-1440 on `/phone` and `/otp` | No horizontal scroll, copy and layout match the design | `scrollWidth == innerWidth` in 12 of 12; 320 and 720 also fit; screenshots match `06-otp` and `56-otp-alt` | PASS | `evidence/f2-*.png`, `f9-*.png` |
| UI2 | Keyboard only | Whole flow completes | Tab, digits, Enter reach `/id-liveness`; focus lands on "Chiffre 1" on `/otp`; visible focus ring | PASS | F5 |
| UI3 | Console and network during the happy path | No errors | One `net::ERR_ABORTED` on the POST, identical in log mode (P-4); nothing else | pre-existing | F1g in both modes |
| NF1 | Web Vitals on `/phone` and `/otp`, Lighthouse-like throttle (1.6 Mbps, 150 ms, CPU x4) | LCP under 2.5 s, CLS under 0.1 | LCP 0.74 s and 0.76 s, CLS 0.011 and 0.002; `/otp` makes one API call (no N+1) | PASS (indicative) | `g7-vitals-throttled.json` |
| MUT | Mutation spot-check, 13 mutations across AC1-AC5 | Each caught by at least one test | All 13 caught (list below) | PASS | `g2-mutations.txt` |

Mutations, all caught: non-2xx treated as success; header dropped; phone appended to the failure log; boot assertion removed from `main.ts`; provider default inverted; abort signal removed; wrong phone sent; production-log rule inverted; text "15 minutes"; SMS code differs from the stored hash; vendor failure swallowed; URL and phone put into the error; one `compose.yaml` SMS line removed.

## Findings

Attributable to this story. None blocks the verdict.

| # | Severity | Gate | Steps to reproduce | Expected | Actual | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| F-1 | Minor (security hardening) | G7 | Stub answers `POST /api/v1/sms` with `307` and `Location` on another host; send a code | Redirect refused or treated as failure; the key, phone and code never leave for another host | `fetch` follows the redirect: a second POST with `X-AUTH-TOKEN: test-key` and the body (phone, code) reached the other host, and the api answered 201. Needs the vendor, or a misconfigured URL, to redirect, so likelihood is low. Fix: `redirect: 'error'` (or `'manual'`) in `aqilasSmsPort`, and add a test. | `g3-api-checks-S09-redirect.txt` |
| F-2 | Minor | G3 | `AQILAS_API_KEY` containing a newline, then boot and send | Boot refuses, or the log names the real cause | Boot accepts. Every send throws inside `fetch` (invalid header) and is logged as `sms aqilas network error`, which sends an operator looking at the network. Fix: refuse control characters in the key at boot. | `g3-key-with-newline.txt` |
| F-3 | Minor (docs) | G3 | Read README and `.factory/config.md` | The SMS variables must go where compose will read them | Compose's `environment:` block (`SMS_PROVIDER: ${SMS_PROVIDER:-log}` and the three `AQILAS_*` as empty defaults) overrides `/var/lib/ankanu/api.env`. A key put in `api.env` on staging is silently ignored and staging stays in log mode. This is only in the developer handoff. Add it to the README SMS section. | `code/compose.yaml`, handoff "Known limitations" |
| F-4 | Minor (disclosed limitation) | G7 | Slow vendor, or the DB commit fails after the vendor accepted | Short transaction | The vendor call runs inside the Story 2.7 transaction while the account row is locked (`for update`), for up to 10 s. If the commit fails after Aqilas accepted the message, the member holds a code that was never stored. Same design as the log write before. Not fixed here by design. | S06; `phone-otp-store.ts` |

## Pre-existing and out-of-scope observations

Not counted against the verdict because they are not caused by this story and the spec forbids changing the screen and the OTP rules. They are the reason to plan a follow-up before turning `SMS_PROVIDER=aqilas` on for real members.

| # | Recommended severity for launch | Gate | What I saw | Recommendation | Evidence |
| --- | --- | --- | --- | --- | --- |
| P-1 | Major | G5 | The member never learns that a send failed. On `/phone`, a 503 (vendor down, no balance, sender ID `AnKanu` not approved, which the spec lists as unconfirmed) leaves the page unchanged: no message, no `role=alert`, no `aria-live`. The same for 429, 400 and 401, and for "Renvoyer le code", which also shows no success or cooldown feedback. The send button has no pending state, so a 10 s vendor timeout looks like a dead button. The typed number is kept, so a retry works. Before this story a send could not fail in production; now it can. | Follow-up story: show `L'envoi du code a échoué.` (copy already returned by the API), a pending state, and resend feedback. | `evidence/f3a-phone-after-503.png`, `f4b-otp-resend-failed.png`, F3b and F4b |
| P-2 | Major | G7 | SMS abuse surface. `POST /v1/verifications/otp` does not require a verified email, and the only limits are 5 per hour per account and 1 per 60 s per account. Four fresh accounts with unverified throwaway emails each triggered a vendor SMS request to the same number. With a live vendor this costs money and can spam third parties; reCAPTCHA and the 10 signups per minute per IP are the only brakes. | Follow-up story: per-destination cap, per-IP cap, and require `email_verified` before a send. | `g7-sms-abuse-surface.txt` |
| P-3 | Serious per axe | G6 | axe `color-contrast` serious on `/phone` and `/otp` at all six widths (`text-deep-navy/55`, `/60` at 11-12 px). Touch targets under 44 px: "Se connecter avec un autre compte" 203x16, "Renvoyer le code" 94x32, "Modifier le numéro" 105x16. | Design-system fix in a UI story. `git diff 5030b6f f135622 -- code/apps/web code/design-stitch` is empty, so the parent has the same result. | `g6-axe-violations.json`, `g4-g6-widths-axe-run.txt` |
| P-4 | Minor | G3 | The phone form never reads the POST response, so navigation aborts it and Chromium reports `net::ERR_ABORTED`. Same in log mode. The repo e2e guard would flag it if an e2e test covered this flow. Also pre-existing console noise: `401 /v1/accounts/gate` on `/auth` and a favicon 404. | Read or ignore the body properly in the phone script. | F1g in `g3-browser-log-mode-F1.txt` and aqilas runs |
| P-5 | Minor | G2 | No automated browser test covers `/phone` to `/otp`; AC6's "flow works as before" is covered by a static compose test and, here, by my manual run. | Add an e2e once the stack e2e can run in CI. | `code/e2e/` |

## Open known-issues (config rule)

`code/e2e/known-issues.ts` has two entries: the favicon 404 (`localhost:3100`) and the local web-only run with no API behind `/v1`. Neither matched in my runs against the stack. In the sandbox I added `E2E_ALLOW_ERRORS` for `tailwind is not defined`, `cdn.tailwindcss.com`, `ERR_TUNNEL_CONNECTION_FAILED`, `favicon.ico` and `v1/accounts/gate`, because the sandbox proxy blocks the Tailwind CDN and Google reCAPTCHA and the pages log those. These are environment effects and a pre-existing 401, not product findings.

## Suite results

| Suite | This commit | Parent `5030b6f` |
| --- | --- | --- |
| Focused: sms-port, phone-otp-aqilas, phone-otp, worker-shell, id-liveness, profile-review, email-port | 7 files, 65 passed | n/a (new tests) |
| `npm run test:unit` | 63 files: 357 passed, 1 failed, 12 skipped. Failure is `photo-rules.test.ts` "keeps a 32px play circle in Chrome": no Chrome at the paths it looks in. | Same failure |
| Browser-based unit tests with Chromium linked into `/usr/bin` (temporary, removed) | 3 failed: `ank-148-fix`, `photo-rules`, `v2-responsive` (timeouts, CDN blocked) | Same 3 fail |
| `npm run test:integration` | 25 passed, 2 skipped, 1 suite failed: `compose.test.ts` "docker compose up" fails at `npm ci --omit=dev` (sandbox TLS interception in image builds). The static SMS compose assertions pass. | Same failure |
| `npm run migration-check` | pass | n/a |
| e2e on the stack, `--repeat-each=3` | 42 passed, 0 failed, 0 flaky, 12 skipped (the width sweep runs on the desktop project only by design) | n/a |

This story adds no e2e tests, so there was nothing new to repeat-run beyond the existing smoke suite.

## How I ran it, and what I substituted

- Images `api:qa` and `web:qa` built from a `git archive` of `f135622` with copies of the two Dockerfiles that only add the sandbox CA (`evidence/harness/Dockerfile.qa-*`). Compose stack from `code/compose.yaml` (verified byte-identical) plus an override file kept outside the repo.
- Aqilas stand-in: `evidence/harness/aqilas-stub.mjs`, pointed to by `AQILAS_API_URL`, key `test-key`, fake numbers `+2260000xxxx`. It can answer any status, delay, redirect, stall or send a 5 MB body.
- reCAPTCHA: Google is blocked by the sandbox policy (403), so I stood in a local HTTPS `siteverify` stub aliased as `www.google.com`, trusted through `NODE_EXTRA_CA_CERTS`. That let real signups work. Product code untouched.
- Tailwind CDN is blocked the same way. For the browser runs I served CSS compiled locally with Tailwind 3.4.17 and the page's own inline config through a Playwright route, so screenshots show the real layout and fonts. Visual match with the Stitch screens was judged on that render.
- In the scratch database only: migrations applied with `psql`; `rl_auth_per_min` raised to 10 000 so the harness could create accounts; `credential.email_verified_at` set to skip the email step. The stack and its volumes are removed.
- Two harness slips, not product issues: the first two `api-checks` runs aborted on the signup rate limiter (kept as `g3-api-checks-run1.txt` and `run2.txt`); the first F10 browser run reused a stub that still held an earlier call (re-run clean in `g3-browser-run-F10-rerun.txt`).

## Not tested and why

- A real SMS to a real phone, and the real Aqilas URL, sender-ID rules, error bodies and rate limits. Needs Fay's key and the spec's manual test. The default vendor URL is asserted by a unit test only.
- Lighthouse. The sandbox blocks the Tailwind CDN, so scores would not be representative, and the web code is unchanged. Playwright-measured LCP and CLS under Lighthouse-like throttling are in `g7-vitals-throttled.json` and are indicative only.
- WebKit, OWASP ZAP (not configured), cookie and header hardening (no new endpoint; the existing session cookie is `HttpOnly; SameSite=Lax`).
- `docker compose up` through the repo's own Dockerfiles (sandbox TLS interception; same red on the parent). I built the same sources with the CA added instead.

## State left behind

`git diff` on tracked files is empty. Running the web unit tests with a Chromium link overwrote 23 committed screenshots under `docs/qa-handoffs/ank-83-widths` and `epic-3-ank-148-widths` and created two untracked ones; I restored them with `git checkout` and deleted the two new files. `dist` was rebuilt from the clean source after the mutation runs (the worker-shell test rebuilds it). Only the new report and evidence folder are untracked. The `/usr/bin/chromium` link and all `ankanu-qa` containers and the network are removed.

## Retest of `75f099f` (2026-10-22)

model: Claude Sonnet 5.5. Retest verdict: **PASS**. The branch was already at `75f099f` (`git pull` reported up to date; HEAD `75f099f`, one commit after `f135622`). The commit changes `sms-port.ts`, `README.md`, three test files and the handoff only. No web, schema, compose or dependency file changed: `diff -rq` of `code/apps/web` and `code/compose.yaml` against round 1 is empty, and `package.json` and `package-lock.json` are unchanged.

How I ran it: a new image `api:qa2` built from `git archive 75f099f` (same CA-only Dockerfile copy), the same stand-ins (Aqilas stub, reCAPTCHA stand-in), a fresh scratch database. `web:qa` from round 1 was reused because the web sources are identical. The stack and its containers are removed again. Evidence files for this round start with `retest-`. Scripted browser runs reuse the round-1 screenshot names, so the unprefixed `f*.png`, `g6-axe-violations.json` and `g7-vitals-throttled.json` now hold the retest runs (same scenarios, same results); the round-1 text logs are kept.

### Earlier findings

| Finding | Status | Fresh evidence |
| --- | --- | --- |
| F-1 Adapter followed redirects, so a 307 re-sent key, phone and code to another host | **Fixed** | The real `api:qa2` image against my stub: 301, 302, 303, 307 and 308 to another host, a 307 with a relative `Location`, a 307 with no `Location`, and a 302 to an unresolvable hostile name. In all 8 cases: api 503 `UNHANDLED`, `retryable` true, French message; exactly 1 request reached the vendor; 0 followed requests; the key was never seen anywhere else; one new log line `sms aqilas status <n>`; 0 stored rows and 0 dispatch rows; no phone in the body. A healthy vendor afterwards gives 201. The original `S09` check now passes (`status=503 requests=1`). Code: `redirect: 'manual'`, a 3xx fails like any non-2xx. `retest-g3-redirect-F1.txt`, `retest-g3-api-checks.txt` |
| F-2 A key with a newline passed boot and every send was logged as "network error" | **Fixed for control characters** | Real image: embedded newline, embedded carriage return, trailing newline, leading newline and tab in `AQILAS_API_KEY` all exit 1 with `AQILAS_API_KEY must not contain control characters`; a newline in `AQILAS_SENDER_ID` exits 1 with `AQILAS_SENDER_ID must not contain control characters`. The key and sender values never appear in the output (0 hits for the test strings). `AnKanu` and `test-key` boot. In `log` mode the same bad values are ignored and the api boots. The worker role still boots. A residual case is new finding N-1. `retest-g3-boot-checks.txt` |
| F-3 Staging must set SMS variables where compose reads them | **Fixed (docs)** | README "SMS" section now says compose's `environment:` block overrides `env_file`, and tells the operator to use `~/.ankanu/local.env` locally and `/var/lib/ankanu/compose.interpolate.env` on staging, never `api.env`. I checked the claim with `docker compose config`: with the three values in `/var/lib/ankanu/api.env` the api gets `SMS_PROVIDER: log` and an empty key; with the same values in the `--env-file` it gets `aqilas` and the key. The test file I created there is removed. The README also states the control-character and no-redirect rules, which match what I observed. `retest-g3-F3-env-file-precedence.txt` |
| F-4 Vendor call inside the Story 2.7 transaction | Open, unchanged | Deferred to a follow-up by the developer and by the coordinator. `S06` still shows the 10 s hold: 503 after 10 031 ms. |
| P-1 to P-5 | Unchanged, as expected | Re-observed with no web change: failed send still invisible (F3b, F4b), axe `color-contrast` serious on `/phone` and `/otp` at all widths, the `net::ERR_ABORTED` POST (also in log mode), four throwaway accounts still each trigger a vendor SMS to one number. `retest-g3-browser-run-aqilas.txt`, `retest-g6-axe-violations.json`, `retest-g7-sms-abuse-surface.txt` |

### New finding

| # | Severity | Gate | Steps to reproduce | Expected | Actual | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| N-1 | Minor | G3 | Boot with `SMS_PROVIDER=aqilas` and an `AQILAS_API_KEY` containing a character above U+00FF, such as an en dash pasted from a document or an Arabic letter; send a code to a live server | Boot refuses, or the log names the cause | The F-2 fix covers control characters only. Such a key boots (container stays up) and every send fails inside `fetch` (the header value is not a valid byte string) and is logged as `sms aqilas network error`, the same misleading symptom as F-2. A key with `é` (U+00E9) or an embedded space works. Fix: also refuse characters above U+007E in the key at boot. Low likelihood: vendor keys are ASCII. | `retest-g3-key-nonlatin1-probe.txt`, boot case B18 |

### Gates re-run in full

| Gate | Result | Evidence |
| --- | --- | --- |
| G1 Static | PASS. Lint 0 errors and the same 3 pre-existing warnings; typecheck and build pass; `npm audit` still exit 1 on the one pre-existing high (`next`, package files unchanged); no secret, real phone or debug leftover in the new diff. | `retest-g1-*.txt` |
| G2 Automated tests | PASS with the same sandbox reds as round 1. Unit: 63 files, 370 passed, 1 failed, 12 skipped; the failure is `photo-rules.test.ts` (no Chrome at the paths it checks), red on the parent too. Focused 7 files: 78 passed. Integration: 25 passed, 2 skipped, `compose.test.ts` "docker compose up" fails at `npm ci --omit=dev` (sandbox TLS), red on the parent too (round-1 parent run in `g2-parent-5030b6f-compose.txt`). `migration-check` pass. e2e on the stack, `--repeat-each=3`: 42 passed, 0 flaky. Mutations on the new code: 6 of 6 caught (redirect option removed, redirect set to follow, 3xx treated as success, key control check disabled, sender control check disabled, newline and carriage return let through). The 12 round-1 mutations re-run on the new code: 12 of 12 caught. | `retest-g2-*.txt`, `retest-g2-mutations.txt`, `retest-g2-mutations-round1-set.txt` |
| G3 Functional | PASS. Full API matrix 52 of 52 passed (send, all failure statuses, rollback, 10 s timeout, stalled and 5 MB bodies, hostile inputs, another member's session, 8 concurrent sends, hourly cap, no-leak sweep of the api log and DB dump). Stub stopped: 503 in 34 ms with `sms aqilas network error`. Browser flow, keyboard-only flow, reload, Back, deep links, session expiry and slow network behave as in round 1. A final no-leak sweep of the aqilas-mode api log after the browser and redirect runs: 0 hits for the key, `votre code`, any `226` plus 8 digits, vendor text and the redirect targets; only `sms aqilas status N` lines. | `retest-g3-api-checks.txt`, `retest-g3-network-error-stub-stopped.txt`, `retest-g3-api-log-aqilas-mode-filtered.txt` |
| G6 Accessibility | Same as round 1, no regression. 12 screen and width audits: only `color-contrast` serious (P-3, pre-existing). No horizontal scroll at 360, 390, 768, 1024, 1280, 1440, 320 and 720. Keyboard-only flow completes. | `retest-g6-axe-violations.json`, `retest-g3-browser-run-aqilas.txt` |
| G7 Non-functional | PASS. LCP 0.77 s on `/phone` and 0.72 s on `/otp`, CLS 0.011 and 0.002, one API call on `/otp` (indicative, Playwright throttled, not Lighthouse). Redirect and key leak path closed. Abuse surface P-2 unchanged. | `retest-g7-vitals-throttled.json` |
| G8 Regression | PASS. Default-env stack boots with `SMS_PROVIDER=log` and empty `AQILAS_*`; the browser flow completes in log mode with the code in the api log and 0 vendor calls; Story 2.7 OTP tests, `id-liveness`, `profile-review` and `email-port` tests pass; smoke e2e passes on the stack. | `retest-g8-browser-log-mode-F1.txt`, `retest-g8-compose-config-default-env.txt` |

### Harness slips this round

- My first boot-check run passed `-e NAME=value` as one quoted word, so Docker set variables with a leading space and the newline cases hit "key required" for the wrong reason. I fixed the quoting and re-ran all cases; only the corrected run is in `retest-g3-boot-checks.txt`.
- The round-1 `S09` script hard-coded the stub's old IP; it now reads it from Docker. Under the fix it passes either way, and `retest-g3-redirect-F1.txt` is the authoritative check.

### State left behind

`git diff` on tracked files is empty. `dist` was rebuilt from the clean `75f099f` source after the mutation runs and holds `redirect: 'manual'`. Only the report and the evidence folder are untracked. All `ankanu-qa` containers and the network are removed; no Chromium link; no file left under `/var/lib/ankanu`.
