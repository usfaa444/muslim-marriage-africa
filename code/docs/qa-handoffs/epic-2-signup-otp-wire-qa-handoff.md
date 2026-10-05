# Epic 2 signup OTP wire QA handoff

## What was built

An adult date of birth on `/age-gate` creates the account, opens a web session, and navigates to `/otp`. There is no native dialog. A failed session leaves the signup draft in place and turns the continue button back on. If the account already exists (`409`) and the same draft password opens a session, the page still goes to `/otp`. A `held` response still shows `#stateUnderage` and does not open a session.

`/otp` collects the phone in the existing number row. "Modifier le numéro" reveals `#otp-phone-input`. A second click, or Enter, posts `{ "action": "send", "phone_e164" }` to `POST /v1/verifications/otp`. Spaces, dots, dashes, and parentheses are stripped first. An empty confirm closes the field and does not post. A `201` masks the number, runs the Stitch sent state, and starts the 60-second resend wait. A `200` inside that wait keeps the last `201` number. A send error is the API message in `#error-banner`. Verify posts `{ "action": "verify", "code" }`. A `200` runs the Stitch success state and stays on `/otp`. Any other verify response shows the error banner, waits 60 seconds before resend, and leaves the confirm button usable when six digits are present.

Served signup, onboarding, OTP, age-gate, and the other current web screens do not contain `alert(`, `confirm(`, or `prompt(`. The photo-rules consent control no longer shows the Stitch dialog. It still does not upload.

The six-digit code is not shown in the product UI. With the log SMS adapter, the API process writes `otp` and the six digits to stdout.

## Where

- `code/apps/web/src/age-gate-page.ts`
- `code/apps/web/src/age-gate-page.test.ts`
- `code/apps/web/src/otp-page.ts`
- `code/apps/web/src/otp-page.test.ts`
- `code/apps/web/src/native-dialog.test.ts`
- `code/apps/web/src/photo-rules-page.ts`
- `code/apps/web/src/guided-onboarding-page.test.ts`
- `code/apps/web/app/age-gate/route.ts`
- `code/apps/web/app/otp/route.ts`

No API route, table, or SMS adapter changed. `POST /v1/accounts`, `POST /v1/sessions`, and `POST /v1/verifications/otp` are the existing endpoints. The Stitch files were not edited.

## How to run

From `code/`:

```bash
npx vitest run --config vitest.unit.config.ts apps/web/src/age-gate-page.test.ts apps/web/src/otp-page.test.ts apps/web/src/native-dialog.test.ts apps/web/src/guided-onboarding-page.test.ts apps/api/src/phone-otp.test.ts
```

`GET /age-gate` and `GET /otp` on the web app. Both send `content-type: text/html; charset=utf-8`, `cache-control: no-store`, and `referrer-policy: no-referrer`. The web app rewrites `/v1/*` to the API.

On the staging host, after this build is deployed to the existing Compose project `ankanu` only, read the code from the API container stdout:

```bash
docker logs ankanu-api-1
```

A new send writes one line `otp` followed by six digits. Do not read logs from any other Compose project. Do not put that code in the page.

## Test cases

| Case | Input | Expected |
| --- | --- | --- |
| Missing draft | Continue on `/age-gate` with no `ankanu.signup` | No `POST`. Hint `La création a échoué.` No dialog. |
| Held | `POST /v1/accounts` returns `201` `{ "status": "held" }` | `#stateUnderage` visible. Button disabled and grey. Draft removed. No session. No `/otp`. No dialog. |
| Adult | Draft plus `dob` `1990-01-15`, account `201` `{ "status": "Active" }`, session `201` | `POST /v1/accounts` with the draft and `dob`. Then `POST /v1/sessions` `{ "identifier", "password", "remember_me": false }`. Draft removed. Location `/otp`. No dialog. A later date change does not post again. |
| Session failure | Account `201`, session `401` `Identifiant ou mot de passe incorrect.` | Draft kept. Button enabled. That message on the page. No `/otp`. |
| Account already exists | Account `409` `email : ce champ est déjà utilisé.`, session `201` | Session uses the draft. Location `/otp`. Draft removed. |
| Account conflict, bad password | Account `409`, session `401` | The `409` message stays. Button enabled. Draft kept. No `/otp`. |
| Create error | Account `400` `dob : une date de naissance est requise.` | That message. Button enabled. No session. |
| In flight | Second click while the account post is open | One account post. Button stays on the pending label. |
| OTP send | Modifier le numéro, `+226 70 12 34 84`, stub `201` | `POST` `{ "action": "send", "phone_e164": "+22670123484" }`. Mask `+226 70 •• •• 84`. Headline `Nouveau code transmis à l'instant`. No dialog. |
| Empty number | Open the field and confirm it empty | No post. The specimen mask returns. |
| Send inside the wait | After a `201`, another number gets `200` | The second post uses the new number. The mask and the resend number stay on the `201` phone. |
| Send error | First send `400` `phone_e164 : un numéro E.164 est requis.` | That sentence in `#error-banner`. The field stays open. A later `201` sends and masks. |
| Bad code | Six digits, response not `200` | Error state. Resend wait `60`. Confirm can be used again. |
| Good code | Verify `200` `{ "status": "granted" }` | Success banner `Niveau téléphonique accordé (Phone level granted)`. Button label `Accéder à l'étape Wali`. A second submit does not post. The page stays on `/otp`. |
| Served HTML | Signup, age-gate, email, OTP, password reset, onboarding, photo rules, ID, PIN, profile, settings, status | No `alert(`, `confirm(`, or `prompt(`. Age-gate still has no Scaleway line and no `Loi 010-2004/AN`. OTP still has the Scaleway footer line. |

## Test data

- Draft: email `fatim@example.bf`, password `phrase avec espaces`, pseudonym `Fatim_Ouaga`, gender `sister`, pledge and human check true, `coc_version` `FR-089`
- Adult `dob` `1990-01-15`
- Phone `+226 70 12 34 84`, posted as `+22670123484`
- Verify code on the stub walk: `123456`. On staging, use the six digits from `docker logs ankanu-api-1`, not a fixed code.

## My results

- `npx vitest run --config vitest.unit.config.ts` on the five files above: 27 passed.
- Headless Chrome on `http://127.0.0.1:8877` with stubbed account, session, and OTP: an adult date enabled `Poursuivre vers l'envoi du code OTP`, posted the draft plus `dob` `1990-01-15`, posted the session with `remember_me` false, and landed on `/otp` with an empty dialog list. Modifier le numéro revealed the phone field, posted `+22670123484`, showed `Nouveau code transmis à l'instant` and the mask `+226 70 •• •• 84`. Verify `123456` showed the success banner and `Accéder à l'étape Wali`. No `alert`, `confirm`, or `prompt` ran.
- Staging `http://72.61.0.79:4012` was not redeployed in this pass. The live age-gate still has the old dialog until this commit is pushed and the `ankanu` project is recreated.

## Three validation passes

1. Solution-design / API: account create, then the existing session create, then the existing OTP send and verify. Held stays off OTP. The log adapter still writes `otp` and six digits. No new endpoint, table, or field.
2. Logic / regression: adult path reaches `/otp` and the button is not dead after success, session failure, or a `409` that can still sign in. Under-19 hold is unchanged. OTP send, resend, verify, and send failure can be tried again. Served pages have no native dialog.
3. Visual: age-gate and OTP still serve the downloaded Stitch HTML. The age-gate change removes the demo dialog call from the served script and does not change the form layout. The OTP phone input is a `hidden` field in the existing number row, so the first paint stays the specimen chip. I did not run a pixel diff against the PNG files.

## Solution-design sections

`POST /v1/accounts` with `dob`. Adult `status` is not `held`. `POST /v1/sessions` body is `identifier`, `password`, and `remember_me`. The cookie is the existing web session cookie. `POST /v1/verifications/otp` actions `send` and `verify`. `phone_e164` is E.164. The log SMS port writes `otp` plus six digits and stores no phone on `sms_dispatch`. No new relationship.

## Stitch files

- `code/design-stitch/12-age-gate/screen.html`
- `code/design-stitch/12-age-gate/screen.png`
- `code/design-stitch/14-otp/screen.html`
- `code/design-stitch/14-otp/screen.png`

`DESIGN.md` is tokens only. The HTML files were not edited.

## Known gaps

- Photo-rules consent no longer alerts and still does not open an upload screen. This fix does not add that screen.
- A granted phone stays on `/otp`. The success button label is the Stitch text `Accéder à l'étape Wali`. It does not navigate.
- The OTP page does not read a stored phone. A reload shows the specimen `+226 70 •• •• 84` until the member enters a number again. There is no read endpoint for that phone.
- A number that is not E.164 is rejected by the API. The page does not add `+226` on its own.
- The code is only in `ankanu-api-1` stdout. The page does not print it.
- This commit stays local until QA passes. Do not treat it as pushed. Do not redeploy until that push is on `main`.
