# Reviewer Gate — 2026-10-02 sister-reach mode

**Verdict:** pass after autofix. Sister Invite reach is operator-configurable (`sister_reach_mode`). Sister invite send may call `BillingPort.isEntitled` only when `same_quota_as_brothers`. Safety paths and Chat after accept still must not call `BillingPort`.

**Intent:** update. AD IDs stable. AD-2 / AD-21 amended in place. AD-27 added. AD-10 / AD-11 / AD-5 not reopened. A1–A3, name, stack, Capacitor, AD-9 blur product, AD-12 mahram product not reopened.

Lint: `reviews/lint_spine.json` — 0 findings (re-run after autofix).

## Lenses (2026-10-02)

| Lens | File | Verdict | Applied |
| --- | --- | --- | --- |
| Rubric walker | [review-rubric-2026-10-02.md](review-rubric-2026-10-02.md) | pass-with-findings | H1 Sister checkout/pricing only in `same_quota`; M1 `isEntitled` never throws, unavailable → Free cap; L1 `QUOTA_EXCEEDED`; L2/P1 next-send bind, no retro-count. L3 stack drift recorded only. |
| Version-check | [review-version-check-2026-10-02.md](review-version-check-2026-10-02.md) | pass-with-findings | Stack **locked** — Next 16.3.8 / Nest 12.1.2 / BullMQ 6.3.11 / TS vs Nest CLI recorded only. AD-27 added no new tech. Whisper `mos`/`dyu` absent confirmed. |
| Adversarial | [review-adversarial-2026-10-02.md](review-adversarial-2026-10-02.md) | revise → closed by tighten | P1–P5, P6–P11: live `isEntitled`, no remaining-int from billing, Sister read/compose/packs follow mode, increment-on-send, `OperatorPort.get`, `AuthContext.gender` required, `isEntitled` pack-presence only. No AD-28. |
| Security/privacy | [review-security-privacy-2026-10-02.md](review-security-privacy-2026-10-02.md) | pass-with-findings | SEC-1 accept/`openFromInvite` banned from `BillingPort`; SEC-2 billing init must not block safety; SEC-3 no `AuthContext.entitled`; SEC-4 operator-only mode write; SEC-5 browse on isolation list; SEC-6 audit `from`/`to`/`staffId` same unit of work. |
| PRD reconcile | [reconcile-prd-2026-10-02.md](reconcile-prd-2026-10-02.md) | pass-with-findings | FR-145 traced (145/145). Packs/payments mode-guarded. FR-038–043 cite AD-27. UTC vs Ouaga: spine civil day wins (already AD-23). |

Historical reviews that asserted Sisters always free/unlimited, or that Sister invite send is never an entitlement check / must never call `BillingPort`, are annotated **superseded 2026-10-02** (history kept).

## Unapplied (locked or out of scope)

- Stack pin bumps (Next 16.3.8, Nest 12.1.2, BullMQ 6.3.11, TS/Nest CLI).
- AD-9 gateway caller-bind; Mahram-remove `MediaPort.revokeByViewer`.
- FR-048 Flash read before conversation (AD-12 mahram read access).
- `packages/ports` publisher (P13 residual; conventions already name the folder).

## Confirmations

- Both `sister_reach_mode` values seeded day one. No brother-free mode.
- Brothers always paid quota. Safety + Chat after accept never call `BillingPort`.
- Mode change audited; subsequent Sister sends only; past invites stay; no retro-count.
- AD-10 passive Chat and AD-5 hosting unchanged.
