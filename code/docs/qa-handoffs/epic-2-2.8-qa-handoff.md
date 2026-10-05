# Epic 2 Story 2.8 QA handoff

## What was built

A signed-in member with a granted phone can submit one ID photo and one liveness frame. Both posts use the same session cookie as `POST /v1/verifications/otp`. There is no extra CSRF token. Nothing in this story calls `BillingPort` or sets `profile.visibility` to `public`.

`POST /v1/verifications/id` body: `{ "image": "<base64 of one JPEG or PNG of the ID front>" }`.
`POST /v1/verifications/liveness` body: `{ "image": "<base64 of one JPEG or PNG selfie frame>" }`.

JPEG is bytes `FF D8 FF`. PNG is bytes `89 50 4E 47 0D 0A 1A 0A`. There is no mime field. Decoded size is 1 byte through 5242880. These two routes accept a JSON body up to 8 MiB. Other routes stay on the default parser. A body over that default on `POST /v1/sessions` is 500 `UNHANDLED`, not a session.

A missing session is 401 `UNAUTHENTICATED`, message `Authentification requise.` A session with no granted `phone_otp` row is 403 `FORBIDDEN`, `details` `{"required":"phone_otp"}`, message `Vérification du téléphone requise.`, and nothing is stored. That check runs before the image is judged. GET does not require the phone grant. GET without a session is still 401.

A good image is 201 `{ "id", "kind", "status" }`. `kind` is `id_document` or `liveness`. `status` is `pending` for an account that is not `held`, and `held` when `account.status` is `held`. The JSON never includes `evidence_uri`, `vendor`, or the image. Each POST inserts a new row. GET on the same path returns the newest row for that account and kind, or `{ "status": "none" }`.

A missing image is 400 `VERIFICATION_RETAKE`, retryable true, `details` `{"field":"image","reason":"missing"}`, message `Reprenez la capture.` A non-JPEG, non-PNG, or bad base64 string is the same code with reason `unreadable`. A decoded image over 5242880 bytes is reason `too_large`. None of those store a row. A 400 does not create a `rejected` row.

`operator_config.rl_verification_upload_per_hour` is seeded at `10`. The count is `liveness` plus `id_document` rows for that account whose uuid v7 time is inside the last hour. Over the cap is 429 `RATE_LIMITED`, retryable false, message `Cadence de requêtes régulée.`, and nothing new is stored. An unreadable limit is 500 `UNHANDLED`, retryable false, message `Request failed`. Without `DATABASE_URL` the reader returns 10.

The bytes are encrypted in memory with AES-256-GCM before anything is stored. The key is `EVIDENCE_KEY` (base64, 32 bytes) and the kid is `EVIDENCE_KID`. The object is JSON `{ "v": 1, "alg": "A256GCM", "kid", "iv", "ct" }`. The 16-byte auth tag is appended to the ciphertext. The object key is `verification/<account_id>/<record_id>.json` in the private bucket. The row is inserted only after that write. `evidence_uri` is `s3://<bucket>/verification/<account_id>/<record_id>.json`. `vendor`, `phone_e164`, `hash`, and `expires_at` stay null. A missing key, a key that is not 32 bytes, or a write that throws is 503 `UNHANDLED`, retryable true, message `Request failed`, and no row. A save that throws after the write is the same 503. The object can remain. Plaintext is not logged and is not the stored object.

If the account is already `held`, the new row is `held` and `profile.visibility` stays `held`. An adult account leaves `visibility` null. This story does not compare the selfie with a profile photo. `photo_asset` is not read. A `rejected` row is a record state, not an HTTP error. Seeding one and calling GET returns `rejected`.

`GET /id-liveness` serves `code/design-stitch/17-id-liveness/screen.html` with `cache-control: no-store` and `referrer-policy: no-referrer`. The Stitch file is not edited. The served HTML does not contain `Scaleway`. The hosting sentences are removed and nothing is put in their place. A script before `</body>` loads both GET routes. Held on either kind shows `#status-minorhold`. Otherwise rejected on either kind shows `#status-mismatch`. Success shows only when both are `pending`. Otherwise the screen stays `#status-ready`. The ID file input is the one already in the HTML. A click on the camera viewport opens a hidden file input for the selfie. Submit posts whichever images were chosen, then reloads the two GET routes. The free retake button inside `#status-mismatch` returns the screen to ready so the member can post again. Audio buttons stay unwired. The audit simulator buttons stay, because they are in the downloaded HTML.

## Where

- `code/packages/kernel/src/error.ts`
- `code/apps/api/src/create-app.ts`
- `code/apps/api/src/verifications.controller.ts`
- `code/apps/api/src/id-liveness.ts`
- `code/apps/api/src/id-liveness-store.ts`
- `code/apps/api/src/id-liveness.test.ts`
- `code/apps/api/src/evidence-seal.ts`
- `code/apps/api/src/evidence-writer.ts`
- `code/apps/api/src/verification-limit.ts`
- `code/apps/api/src/operator-config.migrate.test.ts`
- `code/apps/api/drizzle/0007_rl_verification_upload.sql`
- `code/apps/api/drizzle/meta/0007_snapshot.json`
- `code/apps/api/drizzle/meta/_journal.json`
- `code/apps/web/src/id-liveness-page.ts`
- `code/apps/web/src/id-liveness-page.test.ts`
- `code/apps/web/app/id-liveness/route.ts`
- `code/apps/web/Dockerfile`
- `code/.dockerignore`
- `code/compose.yaml`

## How to run

From `code/`:

```bash
npx vitest run --config vitest.unit.config.ts apps/api/src/id-liveness.test.ts apps/web/src/id-liveness-page.test.ts
npx tsc -p apps/api/tsconfig.json --noEmit
npx tsc -p apps/web/tsconfig.json --noEmit
npx tsc -p packages/kernel/tsconfig.json --noEmit
npm run migration-check -w @ankanu/api
```

The screen is `GET /id-liveness` on the web app. The web app rewrites `/v1/*` to `http://api:3000`. A session cookie from `POST /v1/sessions` is required for the posts. Phone OTP must already be `granted` on `POST /v1/verifications/otp`. `EVIDENCE_KEY` and `EVIDENCE_KID` must be set for a live API, the same way the S3 keys are passed. Tests use a throwaway key and do not read a real one.

## Test cases

| Case | Input | Expected |
| --- | --- | --- |
| No session | POST or GET either path with no cookie | 401 `UNAUTHENTICATED`. No row. |
| No phone grant | POST `{ "image": "<jpeg>" }` with a session and no granted `phone_otp` | 403 `FORBIDDEN`, `details.required` `phone_otp`. No row. GET still returns `{ "status": "none" }`. |
| JPEG ID | Granted phone, adult account, JPEG under the cap | 201 `{ "kind": "id_document", "status": "pending" }`. No `evidence_uri`, `vendor`, or image. The stored object decrypts to the same bytes and is not the plaintext. `profile.visibility` stays null. Row `vendor`, `phone_e164`, `hash`, and `expires_at` are null. |
| PNG selfie | Same account, PNG under the cap | 201 `{ "kind": "liveness", "status": "pending" }`. The object decrypts to the PNG. |
| Newest row | A second ID post | GET `/v1/verifications/id` returns that new id. |
| Missing image | POST `{}` after the phone is granted | 400 `VERIFICATION_RETAKE`, reason `missing`, retryable true. No new row. |
| Unreadable | Base64 that is not JPEG or PNG | 400 `VERIFICATION_RETAKE`, reason `unreadable`. No new row. This stays 400 even when the evidence key is missing. |
| Too large | Decoded length 5242881 | 400 `VERIFICATION_RETAKE`, reason `too_large`. No new row. |
| Over the old JSON cap | About 200KB of JPEG on `/id` and, after the hour window moves, on `/liveness` | 201. Not a parser rejection. |
| Other routes | `POST /v1/sessions` with about 120KB of extra JSON | 500 `UNHANDLED`. No session id. |
| Hour cap | Limit 1 while a capture row from the last hour exists | 429 `RATE_LIMITED`. Row count and object count stay the same. |
| After an hour | Clock moves `UPLOAD_HOUR_MS + 1` and the limit is 10 | 201 again. |
| Missing key | Valid image, evidence key cleared | 503 `UNHANDLED`, retryable true. No row. No object. |
| Write throws | Valid image, writer throws | 503 `UNHANDLED`, retryable true. No row. No object. |
| Save throws | Write succeeds, then save throws | 503 `UNHANDLED`, retryable true. No row. One object remains. |
| Unreadable limit | Reader returns null | 500 `UNHANDLED`, retryable false. No row. |
| No database | `readRlVerificationUploadPerHour` with no `DATABASE_URL` and no reader override | 10. |
| Evidence env | 32-byte canonical key and a kid | That key and kid. A 16-byte key or a blank kid is null. |
| Rejected liveness | Newest liveness row seeded `rejected` | GET returns that id and `rejected`. `visibility` is not `public`. |
| Held account | Date of birth `2010-01-15` on the 2026-10-05 clock, then a granted phone and an ID post | Account `held`, profile `held`, 201 `status` `held`. Visibility stays `held`. |
| Screen, no rows | Both GET bodies `{ "status": "none" }` | `#status-ready` is the visible panel. |
| Screen, one pending | ID `pending`, liveness `none` | Still ready. |
| Screen, both pending | Both `pending` | `#status-success`. |
| Screen, rejected | Either kind `rejected` | `#status-mismatch`. The free retake text `Reprendre la capture sans frais` is in the page. |
| Screen, held | Either kind `held` | `#status-minorhold`. |
| Screen submit | Choose an ID file and a selfie, then click submit | POST `{ "image" }` to `/v1/verifications/id` and `/v1/verifications/liveness`. |
| Served HTML | `GET /id-liveness` | 200, `content-type: text/html; charset=utf-8`, `cache-control: no-store`, `referrer-policy: no-referrer`. Body has the title `Authentification d'Identité` and does not contain `Scaleway`. |

## Test data

- Adult inbox: email `aminata@example.bf`, pseudonym `Aminata_Ouaga`, password `phrase avec espaces`, gender `sister`, date of birth `1990-01-15`.
- Held inbox: email `aicha@example.bf`, pseudonym `Aicha_Ouaga`, date of birth `2010-01-15`.
- Phone `+22670123484`.
- Clock starts at `2026-10-05T12:00:00.000Z`.
- Throwaway evidence key from `randomBytes(32)`, kid `test-kid`. Bucket name in the test writer is `ankanu`.
- JPEG fixture is `FF D8 FF` plus padding and an end marker. PNG fixture starts with the 8-byte PNG signature.

## My results

- `apps/api/src/id-liveness.test.ts` and `apps/web/src/id-liveness-page.test.ts`: 19 passed.
- `apps/api`, `apps/web`, and `packages/kernel` typecheck passed.
- `npm run migration-check -w @ankanu/api` printed `Everything's fine`.
- I did not run the Postgres migrate container in this pass. The new SQL file is `0007_rl_verification_upload.sql` and the journal expects 8 migrations. The file list in `operator-config.migrate.test.ts` includes that file and the seeded value `10`.

## Three validation passes

1. HTTP: anonymous POST and GET, missing phone grant, encrypted JPEG and PNG, newest row, retake reasons, bodies over the default JSON limit, the shared hour cap, a missing key, a failed write, a failed save, an unreadable limit, a rejected row, and a held account.
2. Screen: served headers, no `Scaleway`, ready, one pending, both pending, rejected on either side, held on either side, and a submit that posts both images.
3. Static: typecheck of the api, web, and kernel projects, plus `drizzle-kit check` on the new snapshot.

## Solution-design sections

Founder sentences on this ticket. `verification_record` already allows `liveness` and `id_document`. This story adds no column. `evidence_uri` is the encrypted object URI. `vendor` stays null. The posts are `POST /v1/verifications/id` and `POST /v1/verifications/liveness`, with GET on the same paths. `VERIFICATION_RETAKE` is the new error code. `rl_verification_upload_per_hour` defaults to 10. Match to profile photos is human review and is not built. A held account writes the new row as `held` and does not lift `profile.visibility`.

## Stitch files

- `code/design-stitch/17-id-liveness/screen.html`
- `code/design-stitch/17-id-liveness/screen.png`

The HTML file was not edited. The page injects a script before `</body>` and removes the hosting lines from the served copy only. The web image copies `17-id-liveness/screen.html`.

## Known gaps

- Human review is not built. Submit does not compare the selfie with a profile photo. A `rejected` row has to be seeded. No profile photo leaves the row `pending`.
- Nothing in this story reads facial age or an ID date of birth. The only hold signal built here is an account that is already `held`.
- `granted` has no panel. The screen stays on ready for that status.
- A 400, 401, 403, 429, or 503 on submit does not add a new banner. The next GET decides the panel. A 400 does not show mismatch.
- The audit simulator buttons stay in the served HTML and can still call `setScreenState` locally.
- Audio buttons stay unwired. There is no camera stream. The selfie is a file chosen from the viewport.
- The specimen name `CNIB_Sawadogo_Recto.jpg` stays until a file is chosen. That string is in the Stitch HTML.
- Two overlapping posts can both pass the hour count. The cap is checked, then the row is inserted.
- If the insert fails after the object write, the object can remain with no row.
- The Postgres store is not executed by the unit suite. The HTTP tests use the memory store.
- Age-gate and OTP screens are not changed to link here. Open `GET /id-liveness` directly.
- Google sign-in stays deferred. This screen has no Google button.
- This commit stays local until QA passes. Do not treat it as pushed.
