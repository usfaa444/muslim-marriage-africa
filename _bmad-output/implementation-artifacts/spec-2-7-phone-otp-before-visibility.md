---
title: 'Phone OTP before visibility'
type: 'feature'
created: '2026-10-05'
status: 'draft'
route: 'dispatch'
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** A Member cannot verify a phone by SMS OTP, so the phone level of Verification does not exist. Public visibility still waits on OTP plus later liveness, ID, and human review.

**Approach:** Build only what the Story 2.7 pack and `code/design-stitch/ankanu-v2/06-otp/` already name. The pack has no OTP request body, no stored secret, and no published cooldown number, so this draft does not choose them.

## Boundaries & Constraints

**Always:** FR-002 and the OTP SMS slice of FR-053. AD-13 and AD-16. `POST /v1/verifications/otp`. Entity `verification_record` (`id`, `account_id`, `kind`, `status`, `vendor`, `evidence_uri`, `phone_e164`). `kind` includes `phone_otp`. Status text includes Granted, pending, rejected, held. `sms_dispatch` stores `id`, `account_id`, `template`, `created_at`. Template list includes OTP. Stored SMS payload is template plus ids. Screen files are `code/design-stitch/ankanu-v2/06-otp/screen.html` and `screen.png`. The screen has six digit boxes. Error envelope is `{ error: { code, message, details, request_id, retryable } }`. `rl_otp_per_hour` is already seeded `5`.

**Never:** Do not invent a request field, a response field, a code column, an expiry, or a cooldown number. Do not add a second OTP path. Do not put a phone on `account` or `credential`. Do not write `ProfilePort.setVisibility`. Do not build liveness, ID capture, Mahram OTP, Google OIDC, invite SMS, Mahram SMS, or sanction SMS. Do not edit the Stitch files or planning docs. The screen demo values `58`, `60`, `+226 70 •• •• 84`, `123456`, and `840192` are not server rules.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
| --- | --- | --- | --- |
| Request a code | SmsPort sends OTP | Public listing stays blocked. Stored payload is template plus ids | The request JSON is an open question |
| Correct unexpired OTP | `POST /v1/verifications/otp` | Phone level is granted | The response JSON and the expiry are open questions |
| Wrong or expired OTP | Retry | Verification is not granted. Resend follows the published cooldown | The cooldown number is an open question |

</frozen-after-approval>

## Open Questions

- One path for `sendOtp` and `verifyOtp` — the resource map lists `POST /v1/verifications/otp` and no body. Options: founder names one JSON body for both operations on that path / founder names a separate send sentence / stay blocked.
- OTP secret and expiry — `verification_record` has no code, hash, or `expires_at`. `evidence_uri` is ID-image and liveness evidence. Options: founder adds catalog fields / founder names an existing column / stay blocked.
- Published cooldown — copy says published. `rl_otp_per_hour` is `5`. The HTML clock starts at 58 and the demo resend uses 60. Options: founder names the duration / `rl_otp_per_hour` is the only limit / stay blocked.
- Phone entry and live SMS body — the only Member phone column is `verification_record.phone_e164`. `sms_dispatch` stores no phone. The screen shows a masked specimen and a prompt. Options: founder names how the first number is saved and whether the live SMS body contains the six-digit code / stay blocked.
- Bad-OTP machine code and SMS transport — the kernel list has no OTP code. No vendor URL is named. Options: founder names the code and the transport / stay blocked.

## Code Map

- `code/design-stitch/ankanu-v2/06-otp/screen.html` — six boxes, masked specimen, local demo submit. Do not edit.
- `code/design-stitch/ankanu-v2/06-otp/screen.png` — pixel target. Do not edit.
- `code/packages/kernel/src/error.ts` — no OTP machine code.
- `code/apps/api/src/account-schema.ts` — no `verification_record`. No phone on `account` or `credential`.
- `code/apps/api/drizzle/0000_operator_config.sql` — `rl_otp_per_hour` value `5`.
- `code/apps/api/src/create-account.ts` — visibility stays null except a suspected-minor `held`. No public browse list exists.
- Reuse the session cookie and the error envelope. Do not copy `EmailPort` onto SMS until a transport is named.

## Tasks & Acceptance

**Execution:**
- [ ] Wait for the open questions. Do not add a route, a table, or a screen binding before those sentences exist.

**Acceptance Criteria:**
- Given a code request, when SmsPort sends OTP, then public listing stays blocked and the stored payload is template plus ids.
- Given a correct unexpired OTP, when the Member POSTs `/v1/verifications/otp`, then the phone level is granted.
- Given a wrong or expired OTP, when they retry, then Verification is not granted and resend follows the published cooldown.

## Implementation Notes

## Spec Change Log

## Review Triage Log
