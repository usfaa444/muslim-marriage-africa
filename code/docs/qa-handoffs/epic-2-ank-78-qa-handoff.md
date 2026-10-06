# Epic 2 ANK-78 QA handoff

## What was built

`/otp` no longer opens on the six code boxes. The first paint is the phone field, default `+226`, with the button "Envoyer le code par SMS". The sent paragraph, the "Code expédié" banner, the boxes, the timer, and "Renvoyer" stay hidden until a real send or a live status read.

`GET /v1/verifications/otp` requires the session cookie. With no `phone_otp` row the body is `{ "status": "none" }`. Otherwise it is `{ "status": "pending" | "granted", "expires_at": "<ISO>", "phone_masked": "+226 70 •• •• 84" }`. The full E.164, the hash, and the code are not in the body. The response sends `cache-control: no-store`. No new table or column. The log SMS adapter is unchanged.

A send `201` shows the Stitch after-send view with the real mask, the boxes, a 60-second resend wait, and "Modifier le numéro". A send `200` keeps that view. If the follow-up read is `granted`, the page locks the success state. A send `400`, `429`, `503`, or a network failure keeps the phone field, shows the inline error, and does not show the boxes. An invalid number does the same and does not post.

A reload with `pending` and a future `expires_at` shows code entry, the server mask, and the remaining resend time. A past `expires_at` shows "Code invalide ou expiré"; the boxes cannot verify until a new send `201`. Verify `400` keeps the boxes and allows another try. Verify `200` or a `granted` read shows the success banner, keeps "Confirmer le code scellé" disabled, and hides "Modifier le numéro". No session, including a later `401`, goes to `/auth?mode=login` and does not show the boxes.

The specimen mask and the specimen timestamp are not shown. The timestamp line stays hidden because the status read has no send time.

## Where

- `code/apps/api/src/verifications.controller.ts`
- `code/apps/api/src/phone-otp.ts`
- `code/apps/api/src/phone-otp-store.ts`
- `code/apps/api/src/phone-otp.test.ts`
- `code/apps/web/src/otp-page.ts`
- `code/apps/web/src/otp-page.test.ts`
- `code/apps/web/app/otp/route.ts` (unchanged route; it serves `otpPageHtml`)

No Stitch file was edited. No migration was added.

## How to run

From `code/`:

```bash
npx vitest run --config vitest.unit.config.ts apps/web/src/otp-page.test.ts apps/web/src/native-dialog.test.ts apps/api/src/phone-otp.test.ts
```

`GET /otp` is HTML. The page calls `GET /v1/verifications/otp` and `POST /v1/verifications/otp`. On staging, after this build is deployed to the existing Compose project `ankanu` only, read the code from the API container stdout:

```bash
docker logs ankanu-api-1
```

A new send writes one line `otp` followed by six digits. Do not read logs from any other Compose project. Do not put that code in the page.

This heartbeat did not deploy. `http://72.61.0.79:4012` still serves the previous build until QA passes and this commit is pushed.

## Test cases

| Case | Input | Expected |
| --- | --- | --- |
| No session | `GET /v1/verifications/otp` without a cookie, or open `/otp` signed out | `401` `UNAUTHENTICATED`. The page goes to `/auth?mode=login`. Boxes stay hidden. |
| No row | Signed in, no `phone_otp` row | `200` `{ "status": "none" }`. `cache-control: no-store`. Phone field only, value `+226`, button "Envoyer le code par SMS". No boxes, no "Code expédié", no specimen mask, no specimen timestamp. |
| Invalid number | `70 12 34 84` or `abc`, then send | Inline `phone_e164 : un numéro E.164 est requis.` Phone field stays. No POST. No boxes. |
| Send `201` | `+226 70 12 34 84` | POST `{ "action": "send", "phone_e164": "+22670123484" }`. `201` `{ "expires_at" }`. Mask `+226 70 •• •• 84`. Boxes, timer, resend, and "Modifier le numéro" appear. Button returns to "Confirmer le code scellé". |
| Send error | First send `503` or `400` or `429` | That error in `#error-banner`. Phone field stays. Button can be clicked again. No boxes. A later `201` shows code entry. |
| Send `200` | A second send inside 60 seconds | Code entry stays on the earlier mask. No new SMS row. |
| Reload pending | `GET` `pending` with a future `expires_at` and `phone_masked` | Code entry with that mask and the remaining resend seconds. "Renvoyer" opens the phone field and does not post the mask. Boxes stay until a new send. |
| Reload expired | `GET` `pending` with `expires_at` in the past | Banner "Code invalide ou expiré". Boxes are not accepted for verify. Resend and "Modifier le numéro" remain. |
| Verify `400` | Six digits, not the live code | Banner "Code invalide ou expiré". Boxes stay. Another six digits can be posted. |
| Verify `200` or `GET` `granted` | Correct code, or a granted read | Success banner. Button "Confirmer le code scellé" disabled. "Modifier le numéro" is not shown. No `840192` and no "Accéder à l'étape Wali". |
| Deep link | `/otp` before the matching read | Boxes, the error banner, and the success banner are not shown for `none`. They appear only for the matching `pending`, expired, or `granted` read. |
| Body secrecy | Any GET | JSON has no full E.164, no code, and no hash. |

## Test data

- Account from the API test: email `aminata@example.bf`, password `phrase avec espaces`, pseudonym `Aminata_Ouaga`, gender `sister`, dob `1990-01-15`
- Phone `+226 70 12 34 84`, posted as `+22670123484`, mask `+226 70 •• •• 84`
- On the stub walk, verify `222222` grants and `111111` does not. On staging, use the six digits from `docker logs ankanu-api-1`

## My results

- `npx vitest run --config vitest.unit.config.ts apps/web/src/otp-page.test.ts apps/web/src/native-dialog.test.ts apps/api/src/phone-otp.test.ts`: 28 passed.
- Headless Chrome on a local `/otp` with a stub status read: signed-out navigation ended on `/auth`; a fresh page showed only the phone field; an invalid number did not post; a `503` kept the field; a `201` showed the real mask and the boxes; a bad code kept the boxes; `222222` showed the success banner and hid "Modifier le numéro" (`display: none`); an expired read showed the error banner; a granted read showed the success banner and the server mask. The visible text never included `Aujourd'hui, 14:32:08 UTC`.
- Staging `http://72.61.0.79:4012` was not redeployed.

## Three validation passes

1. Solution-design / API: FR-002 still sends an OTP for a number that has not been granted, and a correct code grants the phone level. `verification_record` is unchanged (`phone_e164` remains the only Member phone column). The new read matches the `GET /v1/verifications/id` and `liveness` precedent: session required, `{ "status": "none" }` or the row status. No new table or column. Log-only SMS is unchanged.
2. Logic: unit tests cover the status read, phone-only first paint, invalid number, send `201`, send error, reload pending, reload expired, verify `400`, verify `200`, `GET granted`, and a deep link that cannot show boxes without the matching read. Headless Chrome walked the same states. The ANK-74 strips still hold: no state switcher, no `840192`, no "Accéder à l'étape Wali", no native dialog.
3. Visual: pre-send uses the 14-otp card header, the phone chip styling, the Stitch error banner, and the indigo `#submit-btn`. After send, the page uses the sent paragraph, the "Code expédié" banner, the boxes, and the resend row from `code/design-stitch/14-otp/screen.html` and `screen.png`. The specimen number and specimen timestamp are not used as live values.

## Solution-design sections followed

- FR-002 phone OTP: request a code, grant on a correct unexpired code, do not grant on an incorrect or expired code
- `verification_record`: `kind` `phone_otp`, `status`, `phone_e164`, `hash`, `expires_at`. No new column
- `POST /v1/verifications/otp` with `action` `send` and `verify`
- Error envelope `{ error: { code, message, details, request_id, retryable } }`
- `sms_dispatch` stores template and ids only

## Stitch files matched

- `code/design-stitch/14-otp/screen.html`
- `code/design-stitch/14-otp/screen.png`

The pre-send view reuses that card. It does not add a new screen. State tabs and the audit switcher are not served.

## Known gaps

- After a reload, "Renvoyer" cannot post the stored number, because the read must not return the full E.164. It opens the phone field instead. The boxes stay until the next send.
- The dispatch timestamp stays hidden. The status read has no send time.
- Submitting the untouched default `+226` is a valid E.164 for the required pattern, so the client posts it.
- A send error, including `429` during resend, returns to phone entry and hides the boxes, as the required flow says.
- The after-send banner still includes the Stitch line "Faso / Ouagadougou".
- Staging was not updated in this pass.
