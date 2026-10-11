---
title: 'Show phone entry before any OTP boxes'
type: 'bugfix'
created: '2026-10-06'
status: 'done'
route: 'oneshot'
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** After the age gate, `/otp` paints the six code boxes and the specimen "code sent" banner even though no phone was entered and no code was sent. The number is only reachable through "Modifier le numéro". That shows an unearned state.

**Approach:** Add a session-scoped `GET /v1/verifications/otp` that reports `none`, `pending`, or `granted` without the full number or the code. First paint is phone entry only, built from the existing `06-otp` card. Code boxes, the sent banner, the timer, and resend appear only after a real send or a live pending read. A grant hides number editing, including after reload.

</frozen-after-approval>

## Implementation Notes

- `GET /v1/verifications/otp` reads the current `phone_otp` row. No new table or column. The body is `none`, or `pending`/`granted` with `expires_at` and `phone_masked`. The full E.164, the hash, and the code stay off the response. `Cache-Control: no-store`.
- First paint hides the sent copy, the sent banner, the boxes, and the resend row. The phone field sits in the status slot with default `+226` and the send pill "Envoyer le code par SMS". The specimen mask and the specimen timestamp are not in the served HTML.
- The Stitch timestamp stays hidden. The status read has no send time, and the ticket allows hiding it.
- A reload does not receive the full number. "Renvoyer" opens the phone field and leaves the boxes up. It does not post the mask.
- A send `200` is followed by the status read. `granted` locks the success state. Otherwise the earlier mask, or the read mask, stays on the code entry.
- A send or verify `401` goes to `/auth?mode=login`.
- Files: `code/apps/api/src/phone-otp.ts`, `phone-otp-store.ts`, `verifications.controller.ts`, `phone-otp.test.ts`, `code/apps/web/src/otp-page.ts`, `otp-page.test.ts`.

## Review Triage Log

- Resend after a status read has no full number — medium, patched. Resend opens the field and keeps the boxes. It does not post the mask.
- Bare `+226` and the short-number mask — false. The required check is `^\+[1-9]\d{1,14}$`, and the mask is the existing `maskE164`.
- A send error hides the boxes — false. The required flow keeps phone entry and shows no boxes for 400, 429, 503, and network errors.
- Send `200` is both cooldown and an existing grant — medium, patched. The page reads status after `200` and locks success when that read is `granted`.
- The browser clock decides expiry — false. The required flow compares `expires_at` on the client. The read has no separate expired status.
- Place chip, sent headline, and hidden timestamp — false. Those lines are the Stitch after-send banner. The timestamp is hidden because the read has no send time.
- Error-banner second sentence and live region — low, not patched. The banner is the Stitch element. A new live region was not in the pack.
- Send `401` stayed on the form, and a failed send could drop a late status read — medium, patched. `401` redirects to login. `acted` is set only after `200`, `201`, or a grant. A non-200 status read stays on phone entry with no extra sentence — low, not patched, because boxes must not appear without a matching read.
- `current()` row order — false. The read uses the same current-row choice as grant, and this store keeps one `phone_otp` row.
- Status read could be cached — medium, patched. The GET sends `cache-control: no-store`, and the page fetch uses `cache: 'no-store'`.
