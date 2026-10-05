# Epic 2 Story 2.10 QA handoff

## What was built

Shared-device PIN for the signed-in web session. The hash lives in `pin_lock`. The fail count lives in the API process, keyed by `session.id`. A missing map entry is locked when a PIN exists.

`GET /pin` serves `code/design-stitch/19-pin-lock/screen.html`. The response uses `content-type: text/html; charset=utf-8`, `cache-control: no-store`, and `referrer-policy: no-referrer`. The Stitch file on disk is not edited. The served page removes the simulator toolbar (`Simuler états`), starts the four wells empty, removes the Scaleway hosting line and puts nothing in its place, and does not ship the demo script (`1234`, `alert(`, prefilled wells). Touch ID stays visible and does nothing. The SMS OTP button stays visible and does nothing. « Mot de passe maître » goes to `/auth` and does not call `DELETE`. « Code PIN oublié ? » and « Se déconnecter du sanctuaire » call `DELETE /v1/sessions/current`, then go to `/auth`.

The attempt banner stays the Stitch sentence, including « 3 tentatives restantes ». `attempts_left` is only on the API error. The client does not compare digits and does not store a PIN literal.

`next` is used only when it starts with one `/` and not `//`. Otherwise the unlock goes to `/`. On load, `/pin` calls `GET /v1/pin`. If `locked` is false, it goes to `next`.

## Where

- `code/packages/kernel/src/error.ts` — `PIN_INVALID`, `PIN_REQUIRED`, `PIN_LOCKED`
- `code/apps/api/src/account-schema.ts` — `pin_lock`
- `code/apps/api/drizzle/0008_pin_lock.sql`
- `code/apps/api/drizzle/meta/0008_snapshot.json`
- `code/apps/api/drizzle/meta/_journal.json`
- `code/apps/api/src/pin-lock-store.ts`
- `code/apps/api/src/pin-lock-state.ts`
- `code/apps/api/src/pin-session.ts`
- `code/apps/api/src/pin.controller.ts`
- `code/apps/api/src/session-touch.ts`
- `code/apps/api/src/sessions.controller.ts` — password sign-in marks this session unlocked; `DELETE /v1/sessions/current`
- `code/apps/api/src/session-cookie.ts` — clear cookie
- `code/apps/api/src/pin.test.ts`
- `code/apps/web/src/pin-page.ts`
- `code/apps/web/src/pin-guard.ts`
- `code/apps/web/app/pin/route.ts`
- `code/apps/web/src/pin-page.test.ts`
- Guard injected before the page script on `age-gate-page.ts`, `email-verification-page.ts`, `otp-page.ts`, `id-liveness-page.ts`, `onboarding-page.ts`, `photo-rules-page.ts`

## How to run

From `code/`:

```bash
npx vitest run --config vitest.unit.config.ts apps/api/src/pin.test.ts apps/web/src/pin-page.test.ts apps/web/src/guided-onboarding-page.test.ts apps/api/src/create-session.test.ts
npx tsc -p apps/api/tsconfig.json --noEmit
npx tsc -p apps/web/tsconfig.json --noEmit
npm run migration-check -w @ankanu/api
```

The API listens on `PORT` or 3000. Sign in first, then set the PIN with the session cookie:

```bash
curl -sS -D - -o /tmp/ankanu-session.json \
  -H 'content-type: application/json' \
  -d '{"identifier":"fatim@example.bf","password":"phrase avec espaces","remember_me":false}' \
  http://127.0.0.1:3000/v1/sessions

curl -sS -D - \
  -X PUT http://127.0.0.1:3000/v1/pin \
  -H 'content-type: application/json' \
  -H "cookie: ankanu_session=$(node -e \"process.stdout.write(JSON.parse(require('fs').readFileSync('/tmp/ankanu-session.json','utf8')).id)\")" \
  -d '{"pin":"1357"}'
```

Expected PUT result: `200` and `{"enabled":true}`. The response has no hash, no gender, and no roles.

## Test cases

| Case | Input | Expected |
| --- | --- | --- |
| No session | `GET /v1/pin` | `401` `UNAUTHENTICATED` |
| PIN off | Signed-in `GET /v1/pin` | `200` `{"enabled":false,"locked":false}`. `last_seen_at` unchanged |
| Set PIN | `PUT /v1/pin` `{"pin":"1357"}` on an unlocked session | `200` `{"enabled":true}`. One `pin_lock` row. `pin_hash` is argon2id and is not `1357` |
| Bad PIN body | `{"pin":"12"}` on unlock | `400` `UNHANDLED`, `details.field` is `pin`. Fail count unchanged |
| Lock | `POST /v1/pin/lock` when a PIN exists | `200` `{"locked":true}`. Same session's next `GET /v1/pin` is locked. Another session of the same account stays unlocked |
| Lock with no PIN | `POST /v1/pin/lock` | `200` `{"locked":false}`. No `pin_lock` row |
| Wrong PIN | `POST /v1/pin/unlock` `{"pin":"1358"}` | `400` `PIN_INVALID`, message `Code incorrect.`, `details.attempts_left` is `4`, then `3` |
| Right PIN | `POST /v1/pin/unlock` `{"pin":"1357"}` | `200` `{"locked":false}`. `last_seen_at` moves to now. Remember-me also slides `expires_at` by 14 days and sets the cookie |
| Fifth wrong | Four `PIN_INVALID`, then a fifth wrong PIN | `401` `PIN_LOCKED`, message `Session verrouillée.`, `details` null. Cookie is `ankanu_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`. A later call with that cookie is `401` `UNAUTHENTICATED`. The other session still answers `GET /v1/pin` |
| Restart | Clear the in-process map | `GET /v1/pin` is `{"enabled":true,"locked":true}` and does not change `last_seen_at`. The next non-exempt call is `401` `PIN_REQUIRED`, message `Code PIN requis.` |
| Locked PUT | `PUT /v1/pin` while that session is locked | `401` `PIN_REQUIRED`. Hash unchanged |
| Sister idle | PIN on, map unlocked, `now - last_seen_at` is 15 minutes, gender sister | `GET /v1/pin` stays `locked:false` and does not move `last_seen_at`. `GET /v1/health` is `401` `PIN_REQUIRED` and does not move `last_seen_at` |
| Brother | Same 15 minutes, gender brother, role `member` | `GET /v1/health` is `200`. `last_seen_at` moves. `expires_at` stays. No `Set-Cookie` on a 12-hour session |
| Mahram | Brother whose roles include `mahram`, 15 minutes | `401` `PIN_REQUIRED`. `last_seen_at` unchanged |
| Remember-me | Live remember-me cookie on `GET /v1/health` | `last_seen_at` and `expires_at` both move. `Set-Cookie` contains `Max-Age=1209600` |
| Logout | `DELETE /v1/sessions/current` on a locked session, and again with no cookie | `204`. Cookie cleared the same way. Idempotent. No rate limit |
| Rate limit | `rl_auth_per_min` 1 | Two `GET /v1/pin` still `200`. The second `PUT /v1/pin` and the second `POST /v1/pin/unlock` are `429` `RATE_LIMITED` and do not change the hash or the fail count |
| Screen | `GET /pin` | Sanctuary copy, Touch ID, OTP button, empty `#dot-1`. No `Simuler états`, no `1234`, no `alert(`, no `Scaleway` |
| Guard pages | Served HTML | `/age-gate`, `/email-verification`, `/otp`, `/id-liveness`, `/onboarding`, `/photo-rules` contain `ankanu_pin_hidden_at` and `fetch('/v1/pin'`. The page's own script stays last |
| Guard behavior | Hide, then show after 60000 ms | `POST /v1/pin/lock`, then the key is removed. `PIN_REQUIRED` from a wrapped `fetch` goes to `/pin?next=`. `UNAUTHENTICATED` does not |
| Unguarded | `/auth`, `/password-reset`, `/pin`, `/`, `/splash` | No guard script. Member routes `/decouvrir`, `/invitations`, `/discussions`, `/profil` stay JSON and have no document to inject |

## Test data

Sister `fatim@example.bf` / `Fatim_Ouaga`, brother `moussa@example.bf` / `Moussa_Ouaga`, password `phrase avec espaces`, PIN `1357`, wrong PIN `1358`. Mahram is the brother account with roles `member` and `mahram`. No Redis. The fail map is process memory.

## My results

- `apps/api/src/pin.test.ts` and `apps/web/src/pin-page.test.ts`: 11 passed.
- `apps/web/src/guided-onboarding-page.test.ts`, `apps/api/src/create-session.test.ts`, `apps/web/src/age-gate-page.test.ts`, `apps/web/src/email-verification-page.test.ts`, `apps/web/src/otp-page.test.ts`, `apps/web/src/id-liveness-page.test.ts`: passed in the same run.
- `apps/api/src/phone-otp.test.ts`, `password-reset.test.ts`, `email-verification.test.ts`, `id-liveness.test.ts`, `create-account.test.ts`, `api.test.ts`: 52 passed.
- `npx tsc -p apps/api/tsconfig.json --noEmit`, `npx tsc -p apps/web/tsconfig.json --noEmit`, and `npx tsc -p packages/kernel/tsconfig.json --noEmit` passed.
- `npx oxlint` on the new PIN files passed.
- `npm run migration-check -w @ankanu/api` printed `Everything's fine`.
- I did not open a graphical browser. `GET /pin` was executed through the route function. The digit, logout, and guard paths ran in the unit harness.

## Three validation passes

1. API: hash-only `pin_lock`, in-process fails, the six routes, idle for sister and mahram, remember-me slide, and logout.
2. Screen: served HTML matches the sanctuary and drops the simulator, the prefilled wells, the demo script, and the hosting line.
3. Static: typecheck, oxlint on the PIN files, and `drizzle-kit check`.

## Solution-design sections

Founder sentences on this ticket. Resource map entry for `/v1/pin`. AD-7 error envelope. Session cookie `ankanu_session`. argon2id via the existing password hasher. No new relationship beyond `pin_lock.account_id` → `account.id`. No gender, roles, or hash in a PIN response. `IdentityPort.revokeSessions` is not called.

## Stitch files

- `code/design-stitch/19-pin-lock/screen.html`
- `code/design-stitch/19-pin-lock/screen.png`

`DESIGN.md` is not the layout. The PNG still shows the simulator, two filled wells, and the Scaleway footer. Those three stay out of the served page.

## Known gaps

- PIN enable/disable UI and the manual lock control (UJ-1 step 14) are owned by Settings / Profile edit; the API they call is `PUT /v1/pin` and `POST /v1/pin/lock`. Disable is not built.
- OTP re-auth and biometric unlock are not in the catalog; password re-auth satisfies FR-020 for this story.
- Story 2.9's handoff said onboarding and photo rules do not call `fetch`. This story adds the PIN guard to those two pages. That is the guard, not a profile save.
- Google sign-in stays deferred. This screen has no Google button.
- This commit stays local until QA passes. Do not treat it as pushed.
