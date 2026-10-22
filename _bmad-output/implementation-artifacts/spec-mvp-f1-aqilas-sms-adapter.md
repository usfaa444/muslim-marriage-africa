---
title: 'Aqilas SMS adapter behind SmsPort'
type: 'feature'
created: '2026-10-22'
status: 'ready'
route: 'factory'
story_id: 'mvp-f1-aqilas-sms'
---

## Intent

**Problem:** Phone OTP (Story 2.7) works end to end, but `SmsPort` only writes the six-digit code to the API log (`code/apps/api/src/sms-port.ts`). A real member never receives the code, so nobody can reach the phone level of Verification and nothing after it.

**Approach:** Add one live adapter for Aqilas (aqilas.com, the SMS vendor Fay chose on 2026-10-22) behind the existing `SmsPort`, selected by server environment. The log adapter stays for local development and tests. AD-16 and the architecture's "one live adapter per port" rule hold: Aqilas is the only live vendor. No Twilio fallback in this story (it would be a second live vendor and needs its own account; out of scope).

Source: MVP plan doc "AnKanu MVP: what's built, what's missing, and the path to launch", section 4, step 1 "Fix the foundations", first item.

## Aqilas API (from the vendor's public homepage samples; full docs are behind login)

- `POST https://www.aqilas.com/api/v1/sms`
- Headers: `X-AUTH-TOKEN: <api key>`, `Content-Type: application/json`
- Body: `{ "from": "<sender id>", "to": ["+22670707010"], "text": "<message>" }`
- Success: HTTP 200 or 201, JSON with `bulk_id`. Failure: non-2xx, JSON with `message`.
- Unknown: sender-ID length limit, exact error codes, rate limits. Do not invent handling for them beyond "non-2xx is a failure".

## Boundaries & Constraints

**Always:**
- Keep the `SmsPort` seam and `setSmsPort` override used by tests. `getSmsPort()` picks the adapter from env.
- Env (server settings only, never committed): `SMS_PROVIDER` = `log` | `aqilas`; `AQILAS_API_KEY`; `AQILAS_SENDER_ID` (default `AnKanu`); optional `AQILAS_API_URL` (default the vendor URL above, so tests and local QA can point at a stub).
- The adapter needs the destination phone. Extend the message passed to `sendOtp` with the E.164 phone held in memory for that call. Nothing new is stored: `sms_dispatch` stays template plus ids; no phone or code in `sms_dispatch`, logs, metrics or error details.
- SMS text, French, one segment (≤160 GSM-7 characters, no accents outside GSM-7): `AnKanu : votre code est 123456. Il expire dans 10 minutes. Ne le partagez avec personne.` (code is the real six digits).
- A request timeout (10 s). A timeout, network error, or non-2xx response throws, so the existing Story 2.7 path rolls back and answers 503 `UNHANDLED`, `retryable` true, `L'envoi du code a échoué.`
- Boot check, same style as `assertEmailBoot`: with `SMS_PROVIDER=aqilas` and no `AQILAS_API_KEY`, the api refuses to boot with a clear message that does not print any secret. `SMS_PROVIDER=log` (or unset) in a production boot is allowed only with the existing test-keys opt-in (`RECAPTCHA_ALLOW_TEST_KEYS=1`), as for log mail, so staging and local keep working and a real production boot cannot silently drop codes.
- `compose.yaml` passes `SMS_PROVIDER`, `AQILAS_API_KEY`, `AQILAS_SENDER_ID`, `AQILAS_API_URL` through from the env file without default secrets. `code/README.md` and `.factory/config.md` local deployment section document the new variables (local default stays `log`).

**Never:**
- No API key, token or real phone number in code, tests, fixtures, docs, commit messages or logs. Tests use a fake key such as `test-key` and a local stub server or injected `fetch`.
- In `aqilas` mode, never write the code, the phone, the API key or the raw vendor response body to stdout/stderr. A failure may log a short line with the HTTP status only.
- Do not change OTP rules from Story 2.7 (expiry, 60 s wait, hourly limit, hashing, response shapes, screen).
- Do not add Twilio, USSD, invite SMS, Mahram SMS or the worker queue.

## Acceptance Criteria

1. **Given** `SMS_PROVIDER=aqilas` with a key and sender id, **when** a member sends `POST /v1/verifications/otp` `{action:"send", phone_e164}`, **then** the api makes exactly one `POST` to the Aqilas URL with header `X-AUTH-TOKEN`, JSON `from` = sender id, `to` = `[phone_e164]`, `text` = the French template containing the same six-digit code whose hash is stored, and the member gets the Story 2.7 201 response.
2. **Given** Aqilas answers non-2xx, times out, or the network fails, **when** a member sends a code, **then** the response is 503 `UNHANDLED`, `retryable` true, `L'envoi du code a échoué.`, and the stored hash, phone and dispatch count are unchanged (existing rollback).
3. **Given** `SMS_PROVIDER=aqilas`, **when** codes are sent (success or failure), **then** no code, phone, API key or vendor body appears in api output, `sms_dispatch`, or error responses.
4. **Given** `SMS_PROVIDER` unset or `log`, **when** a code is sent, **then** behavior is exactly Story 2.7 today (`otp <code>` log line), so local and e2e flows keep working.
5. **Given** `SMS_PROVIDER=aqilas` without `AQILAS_API_KEY`, **when** the api boots, **then** it refuses to boot with a message naming the missing variable. **Given** `SMS_PROVIDER=log` in a production boot without `RECAPTCHA_ALLOW_TEST_KEYS=1`, **then** it refuses to boot. An unknown `SMS_PROVIDER` value refuses to boot.
6. **Given** the full local stack (`docker compose up`) with the default env, **when** it starts, **then** it boots and the OTP screen flow works as before; the new variables are documented in `code/README.md` and `.factory/config.md`.

## Code Map

- `code/apps/api/src/sms-port.ts` — port, log adapter, override; add the Aqilas adapter and the env selection here (or a sibling file).
- `code/apps/api/src/phone-otp.ts` — builds the message passed to `send`; add the phone to it.
- `code/apps/api/src/verifications.controller.ts` — wires `getSmsPort().sendOtp`.
- `code/apps/api/src/main.ts` — boot assertions (`assertEmailBoot` pattern).
- `code/apps/api/src/email-port.ts` — reference for env selection and the production opt-in rule.
- Tests: `phone-otp.test.ts`, `id-liveness.test.ts`, `profile-review.test.ts` use `setSmsPort`; add `sms-port.test.ts` for the adapter (stub server or injected fetch).
- `code/compose.yaml`, `code/README.md`, `.factory/config.md`.

## Manual test (Fay, after the key is in the env file)

1. In `~/.ankanu/local.env` set `SMS_PROVIDER=aqilas`, `AQILAS_API_KEY=<key from the Aqilas account>`, `AQILAS_SENDER_ID=AnKanu` (or the approved sender), restart the stack.
2. Sign up, open `/otp`, enter a real Burkina number, receive the SMS, enter the code, see success.
