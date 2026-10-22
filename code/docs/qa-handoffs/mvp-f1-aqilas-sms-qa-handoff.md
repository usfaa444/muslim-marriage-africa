# MVP F1 Aqilas SMS adapter QA handoff

Story: `_bmad-output/implementation-artifacts/spec-mvp-f1-aqilas-sms-adapter.md`. Branch `factory/mvp-f1-aqilas-sms`.

## What was built

`SmsPort` now has one live adapter, Aqilas. `getSmsPort()` picks it from the server env. The log adapter stays the default for local runs and tests. `setSmsPort` still overrides both.

- `SMS_PROVIDER` is `log` (default when unset or blank) or `aqilas`. Anything else refuses to boot.
- With `aqilas`, each send is one `POST` to `AQILAS_API_URL` (default `https://www.aqilas.com/api/v1/sms`), headers `X-AUTH-TOKEN: <AQILAS_API_KEY>` and `Content-Type: application/json`, body `{ "from": <AQILAS_SENDER_ID, default AnKanu>, "to": [<phone_e164>], "text": "AnKanu : votre code est 123456. Il expire dans 10 minutes. Ne le partagez avec personne." }`. The text is 88 GSM-7 characters, one segment.
- 10-second timeout. A timeout, network error or any non-2xx answer throws. The Story 2.7 path then rolls back and answers 503 `UNHANDLED`, `retryable` true, `L'envoi du code a échoué.`. Any 2xx is success. The vendor body is discarded unread.
- On failure the api writes one stderr line: `sms aqilas status <n>`, `sms aqilas timeout` or `sms aqilas network error`. Never the code, the phone, the key or the vendor body. The thrown error is a fixed string.
- `phone-otp.ts` passes `{ code, phone_e164 }` to the port. The phone is the one already validated for that request, held in memory for the call. `sms_dispatch` is unchanged (template and ids only).
- Boot (`main.ts`, api role only; the worker does not send SMS): `assertSmsBoot` refuses `aqilas` without `AQILAS_API_KEY`, refuses an `AQILAS_API_URL` that is not http or https, refuses an unknown `SMS_PROVIDER`, and refuses `log` when `NODE_ENV=production` without `RECAPTCHA_ALLOW_TEST_KEYS=1` (same opt-in as log mail). Messages name the variable and never echo a value.
- `compose.yaml` passes `SMS_PROVIDER` (`${SMS_PROVIDER:-log}`), `AQILAS_API_KEY`, `AQILAS_SENDER_ID`, `AQILAS_API_URL` (all `:-` empty, no default secret) to the api from the `--env-file`.
- Story 2.7 rules are untouched: expiry, 60 s wait, hourly cap, hashing, response shapes, screen.

## Files changed

- `code/apps/api/src/sms-port.ts`: `OtpLog.phone_e164`, `smsProvider`, `assertSmsBoot`, `otpSmsText`, `aqilasSmsPort`, env selection in `getSmsPort`.
- `code/apps/api/src/phone-otp.ts`: send passes the phone to the port.
- `code/apps/api/src/main.ts`: `assertSmsBoot` on the api role.
- `code/compose.yaml`: four SMS variables on the api service.
- `code/apps/api/src/sms-port.test.ts` (new): adapter, selection, boot assertion.
- `code/apps/api/src/phone-otp-aqilas.test.ts` (new): the real route with `SMS_PROVIDER=aqilas` against a local stub vendor.
- `code/apps/api/src/phone-otp.test.ts`: also asserts the port receives the phone.
- `code/apps/api/src/worker-shell.test.ts`: spawns `dist/main.js` to prove the boot refusal; strips SMS vars from the child env so a dev shell cannot leak in.
- `code/apps/api/src/compose.test.ts`: static check of the four compose lines.
- `code/README.md`, `.factory/config.md`: new variables, local default `SMS_PROVIDER=log`.

`id-liveness.test.ts` and `profile-review.test.ts` use `setSmsPort` and compile and pass unchanged.

## How to run

From `code/`:

```bash
npx vitest run --config vitest.unit.config.ts apps/api/src/sms-port.test.ts apps/api/src/phone-otp-aqilas.test.ts apps/api/src/phone-otp.test.ts apps/api/src/worker-shell.test.ts apps/api/src/id-liveness.test.ts apps/api/src/profile-review.test.ts apps/api/src/email-port.test.ts
```

7 files, 65 passed. Full gates are below.

## AC trace

| AC | Implementation | Tests |
| --- | --- | --- |
| 1. Aqilas send: one POST, `X-AUTH-TOKEN`, `from`, `to`, French text with the stored code, 201 | `sms-port.ts` `aqilasSmsPort`, `getSmsPort`, `otpSmsText`; `phone-otp.ts` `sendOtp` passes `phone_e164` | `phone-otp-aqilas.test.ts` "posts once to Aqilas with the stored code and answers the Story 2.7 201" (hash of the code in the SMS equals the stored hash); `sms-port.test.ts` "posts one JSON request with the token header, sender, phone list and French text", "sends the real HTTP headers and body to a stub server and accepts 200", "picks Aqilas from env with the default sender and the overridable URL", "keeps the text to one GSM-7 segment"; `phone-otp.test.ts` "sends a hashed code..." (port receives the phone) |
| 2. Non-2xx, timeout, network failure: 503 and rollback | `aqilasSmsPort` throws; existing rollback in `phone-otp-store.ts` | `phone-otp-aqilas.test.ts` "rolls back and answers 503 when Aqilas answers 500/401/400", "rolls back and answers 503 when the network fails"; `sms-port.test.ts` "throws on HTTP 400/401/429/500/503 and logs the status only", "throws on a network error without echoing the request", "aborts a hanging vendor after the timeout", "times out after 10 seconds by default" |
| 3. No code, phone, key or vendor body in output, `sms_dispatch` or errors | `aqilasSmsPort` fixed error text, status-only line, body discarded | `phone-otp-aqilas.test.ts` `expectNothingLeaked` on every case (captures api stdout and stderr, response bodies, `sms_dispatch` rows; dispatch keys are exactly `account_id, created_at, id, template`); `sms-port.test.ts` `expectClean` on error message and stack |
| 4. Unset or `log`: Story 2.7 `otp <code>` line | `getSmsPort` falls back to `logSmsPort` | `sms-port.test.ts` "keeps the Story 2.7 log line when SMS_PROVIDER is unset or log" (no fetch); `phone-otp.test.ts` all 10 pass unchanged |
| 5. Boot refusals: aqilas without key, production log without opt-in, unknown provider | `sms-port.ts` `assertSmsBoot`; `main.ts` | `sms-port.test.ts` "refuses aqilas without a key and names the variable, never the value", "refuses log SMS in a production boot without the test-keys opt-in", "refuses an unknown provider without echoing it"; `worker-shell.test.ts` "refuses to boot the api when the SMS settings are incomplete or unknown" (real `dist/main.js` process exits non-zero with the message, never listens) |
| 6. Full local stack boots with default env; vars documented | `compose.yaml`, `code/README.md`, `.factory/config.md` | `compose.test.ts` "names the project ankanu..." (static compose lines); manual stack run below |

## Self-check results

All from `code/` on this branch. Where a gate is red, the same command is red on the parent commit `5030b6f` (checked with `git stash -u`), and none of the red tests touch files in this change.

| Command | Result |
| --- | --- |
| `npm run lint` | 0 errors. 3 warnings, all pre-existing in `life-pause.ts`, `v2-flow.test.ts`, `photo-rules.test.ts`. |
| `npm run typecheck` | Pass. |
| `npm run test:unit` | 63 files: 357 passed, 1 failed, 12 skipped (370). The failure is `photo-rules.test.ts` "keeps a 32px play circle in Chrome...": it looks for Chrome at `~/.cache/ms-playwright/chromium-1243/...`, `/usr/bin/google-chrome` or `/usr/bin/chromium`, and none exists in this container. Same failure on `5030b6f`. The 12 skips are the `skipIf(!binary)` browser tests. With a temporary `/usr/bin/chromium` link to the installed Chromium 141 (removed afterwards): 367 passed, 3 failed (`photo-rules`, `ank-148-fix`, `v2-responsive`, all web screen tests, timeouts and a render check); the same 3 fail on `5030b6f` with that link. |
| `npm run test:integration` | 5 files: 25 passed, 2 skipped, 1 suite failed (`compose.test.ts` > "docker compose up", 2 tests not run). The api image build fails at `RUN npm ci --omit=dev` with `SELF_SIGNED_CERT_IN_CHAIN`: this sandbox intercepts TLS and build containers do not trust its CA. Same failure on `5030b6f`. The static compose test (including the new SMS lines), the bucket-credential cases, `substrate`, `operator-config.migrate`, `restore-drill` and `object-version` pass. Docker Hub answered 429 to anonymous pulls, so `postgres:17.11` and `node:24.21.0` were pulled from `mirror.gcr.io` and tagged locally first. |
| `npm run migration-check` | Pass ("Everything's fine"). No schema change. |
| `npm audit --omit=dev --audit-level=high` | Exit 1: one high, `next` 16.0.0 to 16.3.7 (fix is `next@16.4.2`, outside the declared range). Pre-existing: `package.json` and `package-lock.json` are unchanged. Not in scope. |
| `PLAYWRIGHT_CHROMIUM_EXECUTABLE=/opt/pw-browsers/chromium-1194/chrome-linux/chrome npm run test:e2e` | 6 passed, 8 failed, 4 skipped. Failures are `/auth`, `/password-reset` and the Discover redirect: the local web-only server proxies `/v1/*` to `http://api:3000`, which does not resolve outside compose, and the fixture fails on failed requests. Identical counts on `5030b6f`. Without the env var, Playwright 1.64 looks for `chromium_headless_shell-1248`, which is not installed. |

### Local stack (scratch project `ankanu-dev`, files outside the repo)

1. Default env (`S3_*`, both origins on `http://localhost:4013`, `SMS_PROVIDER=log`), port override `web: 4013:3000`. All six services healthy. `curl http://localhost:4013/v1/health` was 200 `{"status":"ok","role":"api",...}`, and `/` was 200. In the api container `getSmsPort().sendOtp(...)` printed `otp 123456`. The api env had `SMS_PROVIDER=log` and the three `AQILAS_*` empty.
2. Aqilas env plus a stub service on the same network (`AQILAS_API_URL=http://sms-stub:8099/api/v1/sms`, `AQILAS_API_KEY=test-key`). The api was healthy. One send reached the stub as `POST /api/v1/sms`, token `test-key`, `application/json`, `{"from":"AnKanu","to":["+22600000003"],"text":"AnKanu : votre code est 123456. Il expire dans 10 minutes. Ne le partagez avec personne."}`. With the stub answering 500, the api printed only `sms aqilas status 500` and the send threw `aqilas send failed`.
3. Same env without `AQILAS_API_KEY`: the api exited 1 with `Error: AQILAS_API_KEY is required when SMS_PROVIDER=aqilas`.
4. `down -v --remove-orphans` on `ankanu-dev`.

Sandbox notes for this run: images were built with `docker build` from scratch copies of the two Dockerfiles that add only the sandbox CA (the repo Dockerfiles cannot run `npm ci` here), then `up --no-build`. Compose does not apply migrations, so the 19 SQL files were applied by hand with `psql`. A real signup and `/otp` flow on the stack was not possible here: the api container cannot resolve `www.google.com`, so reCAPTCHA `siteverify` fails with `CAPTCHA_FAILED`. The route itself is covered end to end over HTTP by `phone-otp-aqilas.test.ts`. On Fay's machine the normal command in `.factory/config.md` applies. The compose Postgres bind directories `code/pg-data`, `code/pg-wal` and `code/pg-base` (git-ignored) remain on disk from these runs.

## How QA can exercise the Aqilas path without a real key

Use a stub that answers like Aqilas, and point `AQILAS_API_URL` at it. Never use a real key or a real number. Use `test-key` and `+22600000001`-style numbers.

Stub (save outside the repo, for example `~/ankanu-qa/aqilas-stub.mjs`):

```js
import { createServer } from 'node:http'
const status = Number(process.env.STUB_STATUS ?? 201)
createServer((req, res) => {
  let body = ''
  req.on('data', (c) => (body += c))
  req.on('end', () => {
    console.log(JSON.stringify({ method: req.method, url: req.url, token: req.headers['x-auth-token'], body: JSON.parse(body || '{}') }))
    res.writeHead(status, { 'content-type': 'application/json' })
    res.end(status < 300 ? '{"bulk_id":"stub-1"}' : '{"message":"stub failure"}')
  })
}).listen(8099, '0.0.0.0')
```

Run it as a service in the stack with an override file outside the repo:

```yaml
services:
  sms-stub:
    image: api
    pull_policy: never
    command: ["node", "/stub/aqilas-stub.mjs"]
    environment:
      STUB_STATUS: "${STUB_STATUS:-201}"
    volumes:
      - /absolute/path/to/aqilas-stub.mjs:/stub/aqilas-stub.mjs:ro
```

and add to the env file:

```bash
SMS_PROVIDER=aqilas
AQILAS_API_KEY=test-key
AQILAS_SENDER_ID=AnKanu
AQILAS_API_URL=http://sms-stub:8099/api/v1/sms
```

Then `docker compose -p <scratch project> --env-file <that env> -f compose.yaml -f <port override> -f <stub override> up -d --build --wait`.

Cases:

| Case | Steps | Expected |
| --- | --- | --- |
| Send | Signed in, `POST /v1/verifications/otp` `{"action":"send","phone_e164":"+22600000001"}` | 201 `{expires_at}`. Stub logs one POST with token `test-key`, `from` `AnKanu`, `to` `["+22600000001"]`, the French text. Verifying the six digits from the stub log gives 200 `granted`. Api log has no `otp` line, no code, no phone. |
| Vendor error | Restart the stub with `STUB_STATUS=500` (or 401), wait 60 s, send again | 503 `UNHANDLED`, `retryable` true, `L'envoi du code a échoué.`. Api log has only `sms aqilas status 500`. No new `sms_dispatch` row, stored hash unchanged. |
| Network error | `docker compose stop sms-stub`, wait 60 s, send | Same 503. Api log `sms aqilas network error`. |
| Timeout | Point `AQILAS_API_URL` at a port that accepts and never answers (for example a `nc -l` container) | 503 after about 10 s. Api log `sms aqilas timeout`. |
| No key | Remove `AQILAS_API_KEY`, `up` again | api exits 1: `AQILAS_API_KEY is required when SMS_PROVIDER=aqilas`. |
| Unknown provider | `SMS_PROVIDER=twilio` | api exits 1: `SMS_PROVIDER must be log or aqilas`. |
| Default | No SMS lines in the env file | Story 2.7 behaviour: `otp <six digits>` in the api log. |

Without Docker, the same cases run in `phone-otp-aqilas.test.ts` and `sms-port.test.ts` against an in-process stub.

## Known limitations

- The Aqilas docs are behind a login. The request shape comes from the public homepage samples. The sender-ID length and character limits, the exact error codes and bodies, and the rate limits are unconfirmed. Handling is only "any non-2xx is a failure". `AQILAS_SENDER_ID` is not validated beyond "non-empty, else `AnKanu`". Fay should confirm the approved sender name in the Aqilas account.
- Any 2xx counts as sent. `bulk_id` is not read or stored (no column for it, and the spec keeps `sms_dispatch` to template and ids). There is no delivery receipt.
- The vendor call runs inside the Story 2.7 transaction, as the log write did. A slow vendor holds that transaction for up to 10 s.
- One attempt per send. No retry, no Twilio fallback, no queue (out of scope).
- A production boot with `SMS_PROVIDER=log` needs `RECAPTCHA_ALLOW_TEST_KEYS=1`. Staging sets it, so staging keeps log SMS until the key is added to its interpolation env file (`/var/lib/ankanu/compose.interpolate.env`). Values in `api.env` are overridden by the compose `environment` block, so the SMS variables must go in the interpolation env file there.
- Not verified here: a real SMS to a real phone (needs Fay's key; see the spec's manual test) and the browser `/otp` flow on the stack (reCAPTCHA cannot reach Google from this sandbox).

## Round 2 (QA findings F-1 to F-3)

QA passed `f135622` with minor findings (`mvp-f1-aqilas-sms-qa-report.md`). This round fixes F-1, F-2 and F-3 on the same branch. F-4 (the vendor call inside the Story 2.7 transaction) and P-1 to P-5 are left for follow-up stories, as asked.

| Finding | Fix | Tests |
| --- | --- | --- |
| F-1 The adapter followed redirects, so a 307 to another host re-sent the key, phone and code | `sms-port.ts` `aqilasSmsPort`: `redirect: 'manual'`. A 3xx comes back unfollowed and fails like any non-2xx: one stderr line `sms aqilas status <n>`, then the Story 2.7 503 rollback. | `sms-port.test.ts` "never follows a 301/302/303/307/308 to another host": a real stub answers with `Location` set to a second stub, which receives nothing; status-only line; clean error. "posts one JSON request..." also asserts `redirect: 'manual'`. `phone-otp-aqilas.test.ts` "does not follow a 307 to another host and answers 503": the real route gives 503 `L'envoi du code a échoué.`, `retryable` true, the second stub receives nothing, hash, phone and dispatch count are unchanged, and nothing leaks. Removing the option fails all 7. |
| F-2 A key with a newline booted, and every send was then logged as a network error | `sms-port.ts` `assertSmsBoot`, aqilas mode only: refuses `AQILAS_API_KEY` or `AQILAS_SENDER_ID` containing any character below U+0020 or U+007F, including a leading or trailing newline or carriage return. Messages are `AQILAS_API_KEY must not contain control characters` and `AQILAS_SENDER_ID must not contain control characters`, never the value. A loop is used instead of a regex so lint stays at its 3 pre-existing warnings. | `sms-port.test.ts` "refuses an AQILAS_API_KEY with a newline / a carriage return / a trailing newline / a tab / a NUL / a DEL and names only the variable", "refuses an AQILAS_SENDER_ID with a control character and names only the variable" (also checks that `AnKanu` boots and log mode ignores the Aqilas settings). `worker-shell.test.ts` "refuses to boot the api when the SMS settings are incomplete or unknown" now also starts `dist/main.js` with a key containing a newline: it exits non-zero with that message and never listens. Disabling the key check fails 6. |
| F-3 Staging must set the SMS variables where compose reads them | `code/README.md` "SMS": compose's `environment:` block overrides `env_file`. Local values go in `~/.ankanu/local.env`. Staging values go in the compose interpolation env file `/var/lib/ankanu/compose.interpolate.env`, never `/var/lib/ankanu/api.env`, where a key is silently ignored and staging stays on `log`. The README also states the control-character and no-redirect rules. | Docs only. |

### Round 2 self-check (from `code/`)

| Command | Result |
| --- | --- |
| `npm run lint` | 0 errors, the same 3 pre-existing warnings. |
| `npm run typecheck` | Pass. |
| Related files: `npx vitest run --config vitest.unit.config.ts apps/api/src/sms-port.test.ts apps/api/src/phone-otp-aqilas.test.ts apps/api/src/phone-otp.test.ts apps/api/src/worker-shell.test.ts apps/api/src/id-liveness.test.ts apps/api/src/profile-review.test.ts apps/api/src/email-port.test.ts` | 7 files, 78 passed. |
| `npm run test:unit` | 63 files: 370 passed, 1 failed, 12 skipped (383). The only failure is the same pre-existing `photo-rules.test.ts` one (no Chrome binary in this container), also red on `5030b6f`. |
| `npx vitest run --config vitest.integration.config.ts apps/api/src/compose.test.ts` | 8 passed, 2 skipped. The "docker compose up" suite fails at `npm ci --omit=dev` in the image build (sandbox TLS interception), as on `5030b6f`. The static compose test with the SMS lines passes. |

Not re-run in round 2: e2e, `migration-check` and the audit (no web, schema or dependency change since round 1), and the scratch Docker stack.
