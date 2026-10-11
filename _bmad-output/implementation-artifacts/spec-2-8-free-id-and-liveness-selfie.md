---
title: 'Free ID and liveness selfie'
type: 'feature'
created: '2026-10-05'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: '6d57dabbf65acefff4e1351a55b5a73940923fb0'
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** A Member cannot submit ID and a liveness selfie for free, so Verification still cannot reach “ID level pending human review,” and a Premium purchase must not make a profile public.

**Approach:** `POST /v1/verifications/id` and `POST /v1/verifications/liveness` store one encrypted photo each. The screen is `GET /id-liveness`. Match to profile photos happens at human review, which this story does not build.

## Boundaries & Constraints

**Always:** Same session cookie as `POST /v1/verifications/otp`. No extra CSRF token. A granted `phone_otp` row is required, else 403 `FORBIDDEN`, `details` `{"required":"phone_otp"}`. ID body `{"image":"<base64 of one JPEG or PNG photo of the ID document front>"}`. Liveness body `{"image":"<base64 of one JPEG or PNG selfie frame captured at the end of the nod prompt>"}`. JPEG or PNG is detected from decoded-byte magic. No mime field. Decoded size is 1 byte to 5 MiB (5242880). JSON body limit on these two routes only is 8 MiB. Success is 201 `{"id","kind","status"}`. `kind` is `id_document` or `liveness`. `status` is `pending`, or `held` when the hold rule applies. Never return `evidence_uri`, `vendor`, or the image. Each POST inserts a new row. Newest row per account and kind is current. A retake is another POST. GET on the same two paths is 200 `{"id","kind","status"}` for the newest row of that kind, or 200 `{"status":"none"}`. Screen maps ready to none, success to pending, mismatch to rejected, minorhold to held. Errors: 401 `UNAUTHENTICATED`; 400 `VERIFICATION_RETAKE`, retryable true, `details` `{"field":"image","reason":"missing"|"unreadable"|"too_large"}`; 429 `RATE_LIMITED` from `operator_config` key `rl_verification_upload_per_hour` (default 10, per account, counted across both POSTs); 503 `UNHANDLED` retryable true when the evidence key or object storage is unavailable, and nothing is stored. Evidence: validate bytes, encrypt in memory AES-256-GCM, 32-byte key from `EVIDENCE_KEY` (base64), kid from `EVIDENCE_KID`, random 12-byte iv, envelope `{"v":1,"alg":"A256GCM","kid","iv","ct"}` with the 16-byte tag appended to the ciphertext, then `ObjectStorageAdapter.writeObject` at `verification/<account_id>/<record_id>.json`. `record_id` is uuid v7. Only after the write succeeds, insert `verification_record` with `vendor` null, `phone_e164` null, `hash` null, `expires_at` null, and `evidence_uri` `s3://<S3_BUCKET>/verification/<account_id>/<record_id>.json`. A missing or wrong-length key, or a failed write, is 503 and no row. Plaintext is never logged, written to disk, or stored in Postgres. `compose.yaml` passes `EVIDENCE_KEY` and `EVIDENCE_KID` the same way as the S3 keys. Tests use a throwaway key. A stored object decrypts to the original bytes and is not the plaintext. Match happens at human review, not at submit. Submit never compares, scores, or reads `photo_asset`. Review, not built here: the reviewer compares the newest liveness evidence with `photo_asset` kind `profile_photo`, then sets the newest liveness row to `granted` or `rejected`. Mismatch is record state `rejected`, not an HTTP error. No profile photo yet: the row stays `pending`. No separate mismatch code beyond `VERIFICATION_RETAKE`. When GET returns `rejected` for either kind, the screen shows `#status-mismatch` and the free retake button. `profile.visibility` is never set to `public`. Hold: if `account.status` is `held`, the new row is `held` and `ProfilePort.setVisibility(account_id, held)` runs. The second hold signal, a reviewer judging facial age or ID date of birth under 19, is contract only and is not built. Nothing here lifts `held`. `#status-minorhold` shows when GET returns `held` for either kind. Scaleway wording comes off this screen, with nothing in its place.

**Never:** Do not call `BillingPort`. Do not write `profile.visibility=public`. Do not hard-wire a KYC SDK. Do not build Profile-detail badges, Mahram ID, a moderator screen, Google OIDC, or photo upload. Do not add `id_doc_hash` or a fingerprint. Do not change the phone OTP row contract. Do not edit the Stitch HTML or PNG. Do not put a real evidence key in git or on a ticket.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
| --- | --- | --- | --- |
| No session | POST or GET either path | No row | 401 `UNAUTHENTICATED` |
| Phone not granted | POST with a session | No row, no object | 403 `FORBIDDEN`, `details.required` `phone_otp` |
| JPEG or PNG | Granted phone, adult account, size in range | New row `pending`, object decrypts to the bytes, object is not plaintext | 201 `{"id","kind","status":"pending"}`. No `evidence_uri`, `vendor`, or image |
| Retake | Second POST of the same kind | A new row. GET returns the newest | 201 |
| Bad image | Missing, not JPEG or PNG, or outside 1 byte to 5242880 | Nothing stored | 400 `VERIFICATION_RETAKE`, retryable true, reason `missing`, `unreadable`, or `too_large` |
| Hour cap | Successful posts in the last hour already equal the limit | No new row | 429 `RATE_LIMITED` |
| Storage down | Valid image, key missing or write throws | Nothing stored | 503 `UNHANDLED`, retryable true |
| Held account | `account.status` `held` | New row `held`. Visibility stays `held`. Never `public` | 201 `status` `held` |
| Adult | `account.status` not `held` | Visibility stays null | 201 `pending` |
| Rejected row | Newest liveness is `rejected` | GET returns `rejected`. Screen shows the free retake. No pay control | Not an HTTP error |
| No profile photo | Submit | No comparison. Row stays `pending` unless the account is held | No mismatch from submit |
| Premium | Any path in this story | Visibility is not set to `public` | No `BillingPort` call |

</frozen-after-approval>

## Code Map

- `code/apps/api/src/verifications.controller.ts` — GET and POST `id` and `liveness` beside the existing OTP post. Do not change the OTP method.
- `code/apps/api/src/id-liveness.ts` — decode, seal, insert order, public JSON.
- `code/apps/api/src/id-liveness-store.ts` — memory and Postgres. Phone rows stay on the OTP store.
- `code/apps/api/src/evidence-seal.ts` — AES-256-GCM envelope. `setEvidenceKey` is the test override.
- `code/apps/api/src/evidence-writer.ts` — `ObjectStorageAdapter` or a test writer.
- `code/apps/api/src/verification-limit.ts` — `rl_verification_upload_per_hour`.
- `code/apps/api/src/create-app.ts` — 8 MiB JSON on the two posts. Other routes stay at the default.
- `code/apps/api/drizzle/0007_rl_verification_upload.sql` — seeds `10`.
- `code/apps/web/src/id-liveness-page.ts` — strips hosting lines and injects the posts. Do not edit the Stitch file.
- `code/apps/web/app/id-liveness/route.ts` — `GET /id-liveness`.
- `code/design-stitch/ankanu-v2/07-id-liveness/screen.html` and `screen.png` — pixel target. Do not edit.
- `code/packages/kernel/src/error.ts` — `VERIFICATION_RETAKE`.
- Reuse the session cookie, the error envelope, and `ObjectStorageAdapter`. Do not change `phone-otp.ts`.

## Tasks & Acceptance

**Execution:**
- [x] POST and GET `/v1/verifications/id` and `/v1/verifications/liveness` follow the frozen matrix.
- [x] Evidence is AES-256-GCM in object storage. Postgres stores the URI only.
- [x] `GET /id-liveness` serves the Stitch screen without Scaleway wording and maps GET status to the named panels.
- [x] Unit tests cover the matrix, including decrypt and “stored bytes are not plaintext.”

**Acceptance Criteria:**
- Given a granted phone and an adult account, when the member posts a JPEG ID and a PNG selfie, then both rows are `pending`, visibility stays null, and each object decrypts to the posted bytes.
- Given a rejected liveness row, when the screen loads, then `#status-mismatch` is shown and the retake control is the free one.
- Given a held account, when the member posts, then the row and the profile stay `held`.

## Implementation Notes

- Held wins over rejected. Rejected wins over pending. Success only when both kinds are `pending`. Otherwise the screen stays ready.
- GET does not require a granted phone. POST does.
- The hour window is the uuid v7 timestamp on `liveness` and `id_document` rows. `verification_record` has no `created_at`.
- The ID bytes come from the existing file input. The selfie bytes come from a hidden file input inside the camera viewport.
- Audio buttons stay unwired. The Google button is not on this screen.

## Spec Change Log

- 2026-10-05: Founder answers replaced the four open questions. The draft wait task is done.

## Review Triage Log

- patch — a thrown refresh left the screen on loading with submit disabled. The catch now returns to ready.
- patch — every `Reprendre` button, including the camera card, forced ready and could hide a hold. Only `#status-mismatch` does that now.
- patch — clearing the evidence writer left a cached adapter. Clearing the override drops the cache.
- patch — tests now cover anonymous GET, the newest id, a liveness body over 100kb, the hour window with no row on 429, a save that throws, `readEvidenceKey`, the no-database upload default, both-or-neither screen states, and a submit that posts both images.
- false — a 400 retake is not `#status-mismatch`. Mismatch is a `rejected` row.
- false — the specimen filename and the ready-panel copy are in the Stitch file. They stay for the pixel match.
- false — `granted` has no named panel. It stays on ready until a later story names one.
- false — the envelope has no additional authenticated data. The founder named the JSON fields.
- false — an insert that fails after the object write leaves the object. The founder ordered write, then insert. The response is 503 and the test covers it.
- low, rejected — two overlapping posts can both pass the hour count. A lock is new behavior the founder did not name. One member posting one photo at a time does not hit it.
- defer — the Postgres capture store is not run by the unit suite. See `deferred-work.md`.
