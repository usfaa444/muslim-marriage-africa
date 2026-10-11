---
title: 'Reset password'
type: 'feature'
created: '2026-10-04'
status: 'draft'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: '87a38bcaaae884b0c423960a376785f100c2057e'
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** A verified member cannot set a new password from a single-use link, so old sessions cannot die except the new one.

**Approach:** Not chosen. The path is `POST /v1/password-resets`. The entities are `credential` and `session`. The catalog does not name a token store, body, consume method, expiry, delivery, surviving-session command, or password rule. Nothing is built until those are decisions in this block.

## Boundaries & Constraints

**Always:** FR-008 reset half. Verified email, completed reset: new password works; old sessions revoked except the new one. A reused link fails. argon2id on `credential.secret_hash`. Password change calls `IdentityPort.revokeSessions`. `/v1` JSON. Envelope `{ error: { code, message, details, request_id, retryable } }`. Screens: `code/design-stitch/ankanu-v2/05-password-reset/screen.html` and `screen.png`. `DESIGN.md` is not the layout.

**Never:** Do not invent a table, field, relationship, body, method, duration, template, `expires_at`, password rule, rate-limit key, or error sentence. Do not reuse `email_verification` unless a decision says so. Stitch « 15 minutes », « 30 jours », and the 12-character hint are not server rules. Do not print the Scaleway location lines, and do not invent a replacement. No captcha, remember-me, PIN, Google, age gate, or phone OTP. Do not edit planning docs or the Stitch files.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
| --- | --- | --- | --- |
| Complete reset | Verified email; reset completed | New password works. Old sessions revoked except the new one | Not specified |
| Reused link | Same link submitted again | Submit fails | Not specified |

</frozen-after-approval>

## Open Questions

- Token store — catalog has `credential` and `session` only. No reset-token table. Options: founder names the table, every field, cardinality, and joining field (a row can be stored) / stay blocked.
- HTTP contract — path only. No body, consume method, or status codes. Options: founder names request fields, response fields, consume method and path, and status codes / stay blocked.
- Expiry — no duration. « 15 minutes » is not the server rule. Options: founder names the duration and the timestamp field / stay blocked.
- Rate limit — AD-17 names a password-reset limit in `operator_config`. No `rl_password_reset_*` key. `rl_auth_per_min` is a different key. Options: founder names the key and number, or names an existing key this route uses / stay blocked.
- Delivery — §12 names no email adapter or template for FR-008. [ANK-50](/ANK/issues/ANK-50) `EmailPort` is Story 2.3. Options: founder says this link uses that port and names the path and message, or names another adapter / stay blocked. SMS is not named for this.
- Surviving session — « except the new one » names no command and no `expires_at`. « 30 jours » and Story 2.2 durations are not this rule. Options: founder names the command, `session.kind`, and the `expires_at` rule / stay blocked.
- Password rule — no length field on `credential`. The Stitch hint is not the rule. Signup `passwordIsPublishable` (12–128, not whitespace-only) is not named here. Options: founder adopts that signup rule or names another / stay blocked.
- Published copy — request and success copy are Unspecified. Error is « Expired / unknown email per published rule », and that rule is absent. Unknown and unverified email are unnamed. Options: founder names the rule and whether the Stitch French lines are the screen copy / stay blocked.
- Footer — the PNG prints « hébergement souverain en France (Scaleway) » and « Scaleway Paris DC ». AD-5 forbids those sentences and a replacement. Options: founder accepts those lines removed and no replacement (the rest can match; those lines will not) / withhold the screen.

## Code Map

- `code/apps/api/src/account-schema.ts` — `credential`, `session`, and Story 2.3 `email_verification`. Add nothing until a decision names it.
- `code/apps/api/src/email-port.ts` — Story 2.3 SMTP port. Do not call it for reset yet.
- `code/apps/api/src/create-session.ts` — login session. Do not reuse its expiry yet.
- `code/apps/api/src/create-account.ts` — signup `passwordIsPublishable`. Do not apply it on reset yet.
- `code/apps/api/src/auth-limit.ts` — `rl_auth_per_min` only. Do not attach this route yet.
- `code/design-stitch/ankanu-v2/05-password-reset/screen.html` — pixel source. Do not edit.
- `code/design-stitch/ankanu-v2/05-password-reset/screen.png` — on disk. Do not edit.
- No password-reset web route exists. Do not add one until copy and footer are decided.

## Tasks & Acceptance

**Execution:**
- [ ] No file under `code/` — wait until every open question is a frozen decision.

**Acceptance Criteria:**
- Given a verified email, when reset is completed, then the new password works and old sessions are revoked except the new one.
- Given the reset link is reused, when it is submitted again, then it fails.

## Implementation Notes

## Spec Change Log

## Review Triage Log

## Design Notes

Story 2.3 gained `email_verification` only from founder sentences on [ANK-50](/ANK/issues/ANK-50). This pack says those sentences are not the reset catalog. Copying that table, `EmailPort`, the 30-minute expiry, or the signup length would invent the reset rule.
