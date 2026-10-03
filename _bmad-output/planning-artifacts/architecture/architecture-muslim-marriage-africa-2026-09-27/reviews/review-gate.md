# Reviewer Gate — 2026-10-02 card / message-cap / mahram-grant

**Verdict:** pass after autofix. People lists default to one focused card (AD-28). Free-tier messages are daily-capped (AD-29). Mahram reads only granted, delivered threads (AD-12). Sisters can buy 1/3/6 packs in both `sister_reach_mode` values. Passive Chat (AD-10) unchanged. Brothers stay Invite-capped.

**Intent:** update. AD IDs stable. AD-12 / AD-14 / AD-21 / AD-8 / AD-17 / AD-23 amended in place. AD-28 and AD-29 added. AD-27 Invite-reach core not reopened (checkout + compose remaining scoped only). AD-5 / AD-10 / AD-11 not reopened.

Lint: `reviews/lint_spine.json` — 0 findings (re-run after autofix).

## Lenses (2026-10-02 card-cap)

| Lens | File | Verdict | Applied |
| --- | --- | --- | --- |
| Rubric walker | [review-rubric-card-cap-2026-10-02.md](review-rubric-card-cap-2026-10-02.md) | pass-with-findings | H1 AD-27 remaining/cap scoped to Invite + reach-pack; H2 Invite+Flash fail-together; M1 `message_quota` grain / live read / ChatPort remaining. L3 stack drift recorded only. |
| Version-check | [review-version-check-card-cap-2026-10-02.md](review-version-check-card-cap-2026-10-02.md) | pass-with-findings | Stack **locked**. AD-28 / AD-29 added no new vendor tech. Whisper `mos`/`dyu` absent confirmed. |
| Adversarial | [review-adversarial-card-cap-2026-10-02.md](review-adversarial-card-cap-2026-10-02.md) | revise → closed by tighten | P1 card quick-message = Flash; P2 consume once at Flash persist; P3 grain + live `isEntitled`; P4 grant grain / `revoked_at` / same-unit drop; P5 Invite-quota then message-cap. No AD-30. |
| Security/privacy | [review-security-privacy-card-cap-2026-10-02.md](review-security-privacy-card-cap-2026-10-02.md) | pass-with-findings | SEC-1 grant filter on HTTP/WS; SEC-2 60s is WS deadline; SEC-3 Sister-only grant writer; SEC-4 `isEntitled` send-only; SEC-5 omit kids if no field. AD-9 media denylist not reopened. |
| PRD reconcile | [reconcile-prd-card-cap-2026-10-02.md](reconcile-prd-card-cap-2026-10-02.md) | pass-with-findings | FR-024/025/044/045/050/051/074/076/077/105/145/146 landed. Coverage 146/146 FRs, 9/9 NFRs. NEXT ids stay NEXT. |

## Unapplied (locked or residual)

- Stack pin bumps (Next 16.3.8, Nest 12.1.2, BullMQ 6.3.11, TS/Nest CLI).
- AD-9 gateway caller-bind / Mahram-remove media denylist (locked).
- Flash / pre-accept is **not grantable** (conversation-scoped grant; FR-048 before conversation stays unapplied — would invent `invite_id` grants).

## Confirmations

- AD-28 and AD-29 are separate IDs.
- Seed `daily_message_cap` **10** is `[ASSUMPTION — admin-configurable, not a product lock]`.
- Premium = unlimited Invites and unlimited messages. No Premium Invite cap of 15.
- Free Brothers keep daily Invite cap **3** `[ASSUMPTION]`.
- Safety paths still must not call `BillingPort`. Allowed messages still deliver immediately (AD-10). Over-cap is rejected, not held.
