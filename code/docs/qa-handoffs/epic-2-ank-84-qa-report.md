# ANK-84 QA report — v2 auth rework

Verdict (2026-10-11, after log mail and the evidence key): **pass**. Change-email, a real reset link, reuse, and Step 7 were run on `http://72.61.0.79:4012`. Do not push from QA. Do not open the next story until the local commits are on GitHub. Do not deploy from QA. Do not call the board webhook.

The first-pass staging 404/500 is fixed. The two later defects are fixed on the 07:01 web image. Detail is in "Retest 2" at the bottom. Earlier sections stay as the record of those fails.

Handoff read: `code/docs/qa-handoffs/epic-2-ank-83-qa-handoff.md` (the task named `epic-2-v2-auth-rework-qa-handoff.md`; that path is not in the tree). Compared with ANK-83 board decisions, FR-001/002/005/006/007/008/011/014/020, NFR-001, and the solution-design auth paragraph plus `account.civil_given_name` / `account.civil_family_name`.

Code review (`/bmad-code-review`) ran four layers on `origin/main...HEAD` (commits `5da8f94`, `0ece4b3`). QA did not apply patches.

## Staging (http://72.61.0.79:4012)

`ankanu-web-1` and `ankanu-api-1` were created 2026-10-06. `design-stitch` is bind-mounted from the checkout, which now has only `ankanu-v2/`. The running web process still asks for the deleted file.

| Request | Result |
| --- | --- |
| `GET /signup` | 404 Next.js not-found |
| `GET /auth` | 500. Container log: `code/design-stitch/11-auth/screen.html is not on disk` |
| `GET /` | 200. Links are still `/auth?mode=login`, `#auth-inscription`, `/auth?mode=signup` |

Screenshots: `code/docs/qa-handoffs/ank-84-evidence/staging-signup-390.png`, `staging-auth-390.png`.

Steps 0–7, captcha on the live widget, OTP from the api log, and the six-width pass were not run on this host. The image does not contain the rework.

Source check (not the running image): `code/apps/**` and `code/apps/web/Dockerfile` name `design-stitch/ankanu-v2/` only. No `11-auth` or `13-email-verification` COPY. The image was not rebuilt in this pass.

## Local server (127.0.0.1:3456, this checkout)

Anonymous routes:

| Path | Status |
| --- | --- |
| `/`, `/signup`, `/signup/identity`, `/signup/pseudonym`, `/signup/account`, `/auth`, `/password-reset` | 200 |
| `/auth?mode=signup` | 303 `/signup` |
| `/age-gate` | 303 `/signup/identity` |
| `/email-verification`, `/phone`, `/otp`, `/id-liveness`, `/pin`, `/onboarding`, `/photo-rules`, `/profile-edit`, `/settings`, `/decouvrir`, `/discussions`, `/invitations`, `/profil` | 303 `/auth` |

`/signup/account` has no Google button, no `accounts.google.com`, no `alert(`, no Scaleway line, no `signup-pseudonym`. Landing has four `href="/signup"` and two `href="/auth"`.

## Tests re-run

From `code/`:

- `v2-flow.test.ts`: 12 passed
- `landing-auth-links`, `native-dialog`, `self-managed-environment`, `account-precheck`, `create-account`, `create-session`: 6 files, 38 passed
- `v2-responsive.test.ts`: 1 passed (16 initial documents × 360, 390, 768, 1024, 1280, 1440). The test asserts `scrollWidth <= innerWidth` and does not print each pair. It skips when Chrome is missing, and it does not open error or success states.

No new e2e file was added. The staging flow cannot be executed until the image is the rework.

## Fails to fix

1. **Redeploy** only the ankanu `web` and `api` containers from this checkout, and apply migration `0010_account_civil_name`. After that, `GET /signup` is Step 0 and `GET /auth` is the v2 sign-in. Leave other compose projects alone. Push stays after a QA pass.

2. **Step 0 mark does not match `01-splash/screen.png`.** The PNG mark has a square frame and a dotted inner ring. `splashHtml()` in `code/apps/web/src/v2-pages.ts` draws two circles and a plain teardrop. Evidence: `ank-84-evidence/local-signup-390.png` and `local-signup-1440.png` next to `code/design-stitch/ankanu-v2/01-splash/screen.png`. Do not serve `01-splash/screen.html`.

3. **PIN `next` is an open redirect.** `pinScript` in `code/apps/web/src/v2-client.ts` does `location.assign(params.get('next') || '/onboarding')`. A value of `https://…` or `//…` leaves the site after a correct PIN. Allow only a same-origin path (`/` but not `//`).

4. **Settings delete never confirms.** `POST /v1/me/delete` accepts only `{ "confirm": true }` (`acceptDeleteBody` in `cil-rights.ts`). `settingsScript` posts with no body, so deletion does not start. Send that body.

5. **Captcha cannot be retried.** After a non-201 create or sign-in, the button is enabled again and `grecaptcha.reset` is never called. The widget still looks solved and the next submit sends an empty token. Reset the widget for that panel, and re-enable the button in `finally` so a thrown `fetch` does not leave it disabled.

6. **Onboarding and photo rules dropped audio.** `onboardingHtml` and `photoHtml` call `guarded(stitch, '')`. `audioPromptScript` in `code/apps/web/src/audio-prompt.ts` is unused. Mooré/Dioula controls do nothing, including the pictogram path when no file exists. Inject the existing script. Do not add audio files.

7. **A gate error redirects every signed-in route to `/auth`, including `/auth` and `/password-reset`.** `entryRedirect` in `entry-guard.ts` returns that 303 before the path exceptions. A gate 500 loops a signed-in browser on `/auth`. Do not redirect when the path is already `/auth` or `/password-reset`.

## Board decision (2026-10-11) — retest after the 4012 redeploy

The earlier "hide change-email / do not draw a password form" note is superseded. Full spec is the board comment on [ANK-85](/ANK/issues/ANK-85). Retest both only after that redeploy.

- **Change email.** `POST /v1/accounts/email` with `{ email }`, session required. Success `200` updates the shown address, closes the field, and shows the new-mail sentence. Taken, already verified, same address, and no session each leave the address unchanged and show the server message. A failed send changes nothing. The old link then fails; the new link verifies. Resend stays on the existing route.
- **Reset.** No token: request screen only. `?token=`: new-password state in the same v2 frame. Mismatch sends nothing. `400 PASSWORD_RESET_INVALID` shows the bad-link state. `200` then the success state and entry redirect. Short password is the existing field error. Also a reused link. Both screens at 360, 390, 768, 1024, 1280, and 1440.

## Recorded, not a code fail

Google's documented test secret returns `"success": true` for a bogus token and for an empty `response` (checked 2026-10-11 against siteverify). The API rejects an empty token before that call, so a missing token is still `400 CAPTCHA_FAILED`. A non-empty bogus token will be accepted on staging while decision 5's test keys are in use. Real keys still fail a bad token. Do not special-case the test secret.

Already in the handoff, left as written: helper text says 8 characters while the button and API use 12–128; the PIN art has 6 slots and submit is at 4; ID/liveness `pending` or `granted` opens onboarding (`held` / `rejected` / `none` stay on Step 7); a missing session store after create returns 201 with no cookie.

## What QA could not do

Full new account Steps 0–7, resend and email link, OTP from the api log, member-route guards while signed in, and the six-width table on staging. Those start after the redeploy.

## Retest 2026-10-11

Handoff read this pass: `code/docs/qa-handoffs/epic-2-ank-85-qa-handoff.md`. Staging web recreated `2026-10-11T06:41:49Z`, api `2026-10-11T06:39:43Z`. Host `http://72.61.0.79:4012`.

### Fixed since the first pass

- `GET /signup` 200. Mark is the square frame, dotted ring, and teardrop. No Google. No `01-splash` markup. Shots: `ank-84-evidence/staging-signup-390.png`, `staging-signup-1440.png`.
- `GET /auth` 200. No Google button. Served HTML contains `grecaptcha.reset`.
- Anonymous `GET /onboarding` and `GET /email-verification` are `303` to `http://72.61.0.79:4012/auth` (public host, not `0.0.0.0:3000`). `/auth?mode=signup` → `/signup`. `/age-gate` → `/signup/identity`.
- Landing: four `href="/signup"`, two `href="/auth"`.
- Served settings script posts `{ confirm: true }`. Served PIN script accepts only a same-origin path (`/` but not `//`).
- Photo rules with the staff stub include the Mooré control and the audio script.
- `POST /v1/accounts` with a non-empty captcha token returns `201`, sets a session cookie, and omits civil names.
- Precheck: taken pseudonym plus under-19 returns both flags false. A free adult pseudonym returns both true.
- `POST /v1/accounts/email` with no cookie: `401`. Invalid email: `400` `email : une adresse inutilisée est requise.` Same address with `Origin`: `400` `email : c'est déjà l'adresse enregistrée.` Taken address with `Origin`: `409` `email : ce champ est déjà utilisé.` A new address with `Origin`: `503 EMAIL_DELIVERY_FAILED` (send throws before the write). Missing `Origin` returns `503` before the same/taken checks; that matches the handoff.
- `GET /password-reset` is the request form only. `?token=` shows the new-password fields, the 12-character hint, the revocation note, and `Valider et renouveler l'accès`. `?view=done` does not show the success state. No Scaleway line. A fake consume is `400 PASSWORD_RESET_INVALID`. Mismatch returns before `fetch` in `resetScript`.
- Widths, `documentElement.scrollWidth` vs `innerWidth`: signup, auth, password-reset, and `?token=` pass at 360, 390, 768, 1024, 1280, 1440. Landing passes at every width except 768.

### Fails

1. **Renew still shows the request sentence.** `GET /password-reset?token=sample-token` still renders `Renseignez l'adresse email associée à votre compte AnKanu pour recevoir un lien sécurisé à usage unique.` above the password fields. There is no email field on that state. Copy source state 3 (`23a7151^:code/design-stitch/15-password-reset/screen.html`) has no email sentence. In `applyResetView` (`v2-pages.ts`), the `renew` branch replaces the email group and the button label and leaves the intro. Replace that intro on the initial renew render. Shot: `ank-84-evidence/staging-reset-renew-390.png`.

2. **Landing overflows at 768.** `scrollWidth` 843, `innerWidth` 768. The header cluster (`Déjà inscrit·e ? Se connecter` and `Commencer l'inscription`) extends to x=843. A horizontal scrollbar is visible and the inscription label is clipped. Shot: `ank-84-evidence/staging-landing-768.png`. Reflow that header so nothing exceeds the viewport at 768. 360, 390, 1024, 1280, and 1440 already fit.

### Not a code fail, and not a pass

`SMTP_URL` and `EVIDENCE_KEY` are empty in the running api. A new change-email therefore cannot return `200`, so the old-link-dies / new-link-verifies case was not run. A real reset link was not received, so the `200` success state and a reused link were not clicked. Step 7 upload was not run. Do not invent those values. Same-address and taken-address checks did return the specified messages when `Origin` was set.

## Second retest 2026-10-11 — two defects pass, not a full pass

Web container recreated `2026-10-11T07:01:01Z`. Commit `c36f5ca` is local only.

| Check | Expected | Actual |
| --- | --- | --- |
| `GET /password-reset` | Request sentence present, `#email` present | Present. Fits 360, 390, 768, 1024, 1280, 1440. |
| `GET /password-reset?token=sample-token` | No request sentence, no `#email`, renew fields present, no Scaleway | Matches. Shot: `ank-84-evidence/staging-renew-390-retest.png`. Fits all six widths. |
| `GET /` at 768 | `scrollWidth <= innerWidth`, header not clipped | `753/768`. Section links wrap onto their own row. `Commencer l'inscription` is fully visible. Shot: `ank-84-evidence/staging-landing-768-retest.png`. |
| Landing, signup, auth | Fit the other required widths | `scrollWidth <= innerWidth` at 360, 390, 768, 1024, 1280, 1440. |

## Retest 2 (2026-10-11, web image 07:01)

`ankanu-web-1` recreated `2026-10-11T07:01:00Z`. API still `2026-10-11T06:39:43Z`. Host `http://72.61.0.79:4012`.

The two code defects pass.

| Check | Result |
| --- | --- |
| `GET /password-reset` | 200. Request sentence present. `#email` present. No `#reset-password`. |
| `GET /password-reset?token=sample-token` | 200. Request sentence absent. No `#email`. `Nouveau mot de passe`, 12-character hint, revocation note, `Valider et renouveler l'accès`. |
| Landing, request, renew widths | `scrollWidth <= innerWidth` at 360, 390, 768, 1024, 1280, 1440. Landing at 768 measured 753. Header links are fully visible. |

Shots: `ank-84-evidence/retest2-landing-768.png`, `retest2-renew-390.png`.

Live change-email `200`, a real reset link, a reused link, and Step 7 upload were not run in that pass. They are in the section below.

## Mail and Step 7 (2026-10-11, api recreated 07:18)

Presence only: `SMTP_URL` scheme `log` length 6, `EVIDENCE_KEY` length 44, `EVIDENCE_KID` length 25. Links and the OTP were read from `docker logs ankanu-api-1` and are not copied here.

| Check | Expected | Actual |
| --- | --- | --- |
| Issue a verification, then `POST /v1/accounts/email` | `200 { email, expires_at }` | `201` then `200`. Returned email matched the new address. |
| Old link | `400 EMAIL_LINK_INVALID` | `400`. Message `Lien expiré ou caduc.` |
| New link | `200` with `email_verified_at` | `200`. Gate step became `phone`. The session cookie still worked. |
| `POST /v1/password-resets` then consume | `201`, then `200 { kind: web }` and a session cookie | Both. `GET /password-reset?token=` showed the renew form and not the request sentence or the success title. |
| Same reset token again | `400 PASSWORD_RESET_INVALID` | `400`. A fresh GET of that URL still shows the renew form, not the success title. |
| Sessions | Other sessions revoked, the consume session stays | The signup cookie became `401`. The consume cookie still read gate `phone`. |
| OTP send and verify | `201`, then `200` | Both. Gate step became `identity`. `/id-liveness` was `200` with no state switcher. |
| `POST /v1/verifications/id` and `/liveness` | `201 pending`, no evidence URI | Both `201`, kinds `id_document` and `liveness`, status `pending`. |
| Account entry | Gate `account`, onboarding opens | Gate `account`. `GET /onboarding` `200`. `GET /id-liveness` `303` to `/onboarding`. |
