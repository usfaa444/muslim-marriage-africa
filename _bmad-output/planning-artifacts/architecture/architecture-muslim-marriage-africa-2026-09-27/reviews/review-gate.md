# Reviewer Gate — 2026-10-03 entity catalog

**Verdict:** pass after catalog autofix. Implementation catalog is SOLUTION-DESIGN.md `## 6. Entity catalog`. AD-3 remains ownership only. Product rules unchanged.

**Intent:** update. AD IDs stable. No AD-30. AD-10 / AD-11 / AD-12 / AD-27 / AD-28 / AD-29 not reopened. `discovery_exclusion` added to AD-3 ownership. erDiagram watch edge is conversation → `mahram_thread_grant`.

Lint: `reviews/lint_spine.json` — 0 findings.

## Lenses (2026-10-03 entity catalog)

| Lens | File | Verdict | Applied |
| --- | --- | --- | --- |
| Rubric walker | [review-rubric-entity-catalog-2026-10-03.md](review-rubric-entity-catalog-2026-10-03.md) | pass-with-residual | H1 Member `phone_e164` homed on `verification_record` (phone_otp only). M1 emergency hide stays `visibility=emergency_hidden` (no new FR-021 column). M2 `photo_asset.moderation_state` = `pending\|live\|blocked` for profile_photo. |
| Version-check | [review-version-check-entity-catalog-2026-10-03.md](review-version-check-entity-catalog-2026-10-03.md) | pass-with-residual | Stack **locked**. Catalog added no new vendor tech. Drift recorded only. |
| Adversarial | [review-adversarial-entity-catalog-2026-10-03.md](review-adversarial-entity-catalog-2026-10-03.md) | pass-with-residual | P1 phone home (above). P2 visibility enum + `held` must not lift on unhide. P3 Flash read-through only on `conversation.flash_id`. P4 `payment.status` `created\|applied`; entitlement only when applied. P5 `blur_key` = `derivative.size=blur` same object. No AD-30. |

## Unapplied (locked or residual)

- Stack pin bumps (Next 16.3.8, Nest 12.1.2, BullMQ 6.3.11, TS/Nest CLI).
- AD-9 gateway caller-bind / Mahram-remove media denylist (locked).
- No `emergency_hidden_until` column (FR-021 lock; hide clock is the command).

## Confirmations

- 53 stored entities, each with owner + Field \| Type \| Null \| Meaning + relationships.
- Not stored: likes; kids/children columns; `hold_queue`; `sharedTraits` DTO; completeness; `taaruf_stage`; `profile_field`; `mahram_permission`.
- `message.state` is only `delivered`. Pack has no `renew_at`.
- Seed `daily_message_cap` **10** is `[ASSUMPTION — admin-configurable, not a product lock]`.
- Free Brothers keep daily Invite cap **3** `[ASSUMPTION]`.
