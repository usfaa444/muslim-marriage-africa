# Rubric-walker review — Architecture Spine (sister_reach_mode)

- **Artifact:** `ARCHITECTURE-SPINE.md`
- **Companion (context only, not judged):** `SOLUTION-DESIGN.md`
- **Driving PRD (binding, 2026-10-02):** `prds/prd-muslim-marriage-africa-2026-09-27/prd.md` — FR-044, FR-045, FR-105, FR-145
- **Altitude:** initiative / build-substrate
- **Reviewed:** 2026-10-02
- **Reviewer:** rubric-walker (independent; spine only; lint already 0 findings)
- **Verdict:** **pass-with-findings**

This run judges the 2026-10-02 amendment: AD-2 and AD-21 no longer absolutely ban `BillingPort` on Sister invite send; Sister invite may call `BillingPort.isEntitled` **only** when `sister_reach_mode` is `same_quota_as_brothers`; safety paths stay banned; new AD-27. Locked items are **not** holes: AD-10/AD-11 passive Chat, AD-5 hosting, A1–A3, stack pins, Capacitor, AD-9 blur product, AD-12 mahram product, AD IDs stable.

The send-path contract landed. A builder who obeys AD-2 / AD-21 / AD-27 will not hardcode unlimited Sister invites, will not give Brothers a free-reach mode, will not compile out either mode, and will not put `BillingPort` on verification, blur/reveal, mahram, report, block, or Chat after accept. Residual: AD-27 binds FR-145 but does not lock Sister checkout/pricing visibility; AD-21’s no-throw clause still names only safety handlers after Sister invite became an entitlement caller.

---

## Checklist

| Gate | Result | Notes |
| --- | --- | --- |
| Fixes real feature-level divergence points; misses none | **PASS WITH CAVEAT** | Mode enum + DEFAULT, both seeded day one, Brother always capped, Sister send `BillingPort` only in `same_quota_as_brothers`, `invite_quota` writer, unavailable → Free cap, mode change = AD-18 + subsequent-only — locked. Caveat: FR-145 checkout/pricing (who may see and buy packs) is not in the AD-27 Rule (H1). |
| Every AD Rule is enforceable and prevents its stated divergence | **PASS WITH CAVEAT** | AD-2/AD-21 Prevents no longer re-impose an absolute Sister-invite ban; the conditional allow is testable. AD-27 Prevents match the send-path Rule. Caveat: AD-21 “must not throw” is scoped to safety handlers; Sister invite in `same_quota_as_brothers` is now an entitlement path (M1). |
| Nothing under Deferred could let two units diverge | **PASS** | iOS = same Capacitor project; USSD flag off; one live adapter per port; Redis/Valkey and PG 18 stay on host pins; prices stay `operator_config`. No Deferred item reopens `sister_reach_mode` or a Brother-free mode. |
| Named tech is verified-current | **PASS WITH LOW** | Stack is **LOCKED** this run. Pins were current 2026-09-27. Live `next` is 16.3.8 vs table 16.3.6; the spine’s own “do not scaffold below 16.3.7 after 2026-09-30” is still internally stale. Flag only — do not demand stack edits. |
| Greenfield is coherent (no brownfield to ratify) | **PASS** | No legacy runtime or schema. Farata is evidence, not substrate. |
| Covers PRD capability surface, especially FR-044, FR-045, FR-105, FR-145 | **PASS WITH CAVEAT** | Brothers always quota-capped; Sister reach follows the two-value mode; safety + Chat after accept stay free and must not call `BillingPort`; both modes seed day one; audit + subsequent-only. Caveat: FR-145 / FR-106 / FR-107 Sister checkout and Invite/pricing UI are companion-only (H1). |
| Every initiative dimension decided, deferred, or an open question — especially ops/env envelope | **PASS** | Region, Kapsule `web`+`api`+`worker`, secrets, OTel, IaC, CI host, PITR, launch scale, migration runner: decided. `sister_reach_mode` is decided (AD-27), not an open question. Q1 and 3–11 plus NFR-008 stay open (AD-22). |

---

## What the 2026-10-02 update gets right

- **AD-2 no longer absolutely bans `BillingPort` on Sister invite send.** Prevents now names the old absolute ban as a divergence. Rule: safety + Chat-after-accept must not import or call `BillingPort` (including `isEntitled`) in either mode; Sister invite send may call `isEntitled` **only** when `operator_config.sister_reach_mode` is `same_quota_as_brothers`; `free_unlimited` must not call `BillingPort`; Brothers and paid-faster-review may call `isEntitled` always and never treat the mode as a free pass.
- **AD-21 isolation still holds for safety.** Verification, Blur/Reveal, Mahram, Report, Block, and Chat after accept are not entitlement checks in either mode — succeed when billing is down, `unavailable`, or the caller has no pack, and they must not call `BillingPort`. The retired sentence “Sister-initiated Invites are not entitlement checks” is gone.
- **AD-27 is the mode lock.** Enum `free_unlimited` (DEFAULT) \| `same_quota_as_brothers`; both values exist in code and seed on day one — not a compile-out flag. Brothers always use `brother_invite_quota_free` / `brother_invite_quota_premium`. `same_quota_as_brothers` uses the same quota predicate and the same `isEntitled` result as Brothers — same packs, same daily caps, same `Africa/Ouagadougou` civil-day reset; missing pack or `unavailable` = Free cap, not a safety block. `invite_quota` written only by invites, and only when the sender is quota-capped (Brothers always; Sisters iff `same_quota_as_brothers`). Billing never writes `invite_quota`. Mode change is an AD-18 event; subsequent invites only; past invites stay.
- **Consequential amendments stay consistent.** AD-18 mandatory events include `sister_reach_mode` changes and bind FR-145. AD-23 dropped “Sisters unlimited and never an entitlement check”; Brother caps from `operator_config` always; Sister caps follow AD-27. Config table requires `sister_reach_mode` with both values seeded. Feature-flag list does not include the mode. Capability map Invites / billing / operator cite AD-27.
- **FR-044 / FR-045 / FR-105 send-path coverage holds.** Brothers never gain a free-unlimited mode. Sister Nth invite in `free_unlimited` is not pack-gated. In `same_quota_as_brothers`, no pack → Free cap, not a safety paywall. Safety actions succeed with no payment method.
- **Prior 2026-10-01 rubric holes that stay closed and are not re-opened:** AD-12 no longer names Chat `pending`/`held`; AD-10 case writer = trust on Report or admin action; AD-7 realtime is Socket.IO + long-poll. Do not treat AD-12 mahram product or the unapplied FR-048 Flash-before-conversation port as holes this run.

---

## Findings

### CRITICAL

None.

### HIGH

#### H1 — AD-27 binds FR-145 but does not lock Sister checkout / pricing visibility

- **Severity:** high
- **Checklist:** missed feature divergence; PRD FR-145 / FR-106 / FR-107 coverage
- **Suggest:** **autofix**
- **Where:** AD-27 Rule; AD-14 Rule (binds FR-104–FR-114, silent on the mode); AD-2 / AD-21 (send-path only)
- **Gap:** FR-145 AC: in `free_unlimited`, Sister Invite or pricing UI shows unlimited Invites and does not offer a reach pack; in `same_quota_as_brothers`, she sees the same Free/Premium daily caps and the same 1/3/6-month pack purchase as Brothers. FR-106 / FR-107 say Sisters see and buy those packs only in `same_quota_as_brothers`; checkout exists on day one only in that mode. AD-27 Rule locks **send** (`BillingPort.isEntitled`, `invite_quota` writer, Free-cap fallback). It never says billing or the pricing UI must hide or refuse a Sister reach-pack purchase in `free_unlimited`, or must offer the same packs when the mode is `same_quota_as_brothers`. SOLUTION-DESIGN §11 already states the missing sentence and cites AD-27 as if the spine had it.
- **Divergence it fails to prevent:** billing always exposes `/v1/packs` + `/v1/payments` to Sisters; web always (or never) shows Sister checkout; invites correctly skips `BillingPort` in `free_unlimited`. Three lawful readings of FR-145, two workbenches, a Sister who can pay for a pack that does not change her cap — or cannot pay when the Operator has switched to `same_quota_as_brothers`.
- **Autofix:** One clause on AD-27 (and a cite on AD-14): Sisters see and buy the same 1/3/6-month reach packs **only** when `sister_reach_mode` is `same_quota_as_brothers`. When `free_unlimited`, billing and Invite/pricing UI must not offer or accept a Sister reach-pack purchase. Brothers always see packs. Do not compile Sister checkout out of the `same_quota_as_brothers` path.

### MEDIUM

#### M1 — AD-21 no-throw is still scoped to safety handlers after Sister invite became an entitlement caller

- **Severity:** medium
- **Checklist:** AD enforceability
- **Suggest:** **autofix**
- **Where:** AD-21 Rule (“must not throw into a safety handler”); AD-27 (“`isEntitled=unavailable` means the Free cap”)
- **Gap:** `isEntitled` is typed `true | false | unavailable`. The explicit no-throw sentence names only a safety handler. Sister invite send in `same_quota_as_brothers` is now an entitlement check (AD-2, AD-21, AD-27), not a safety path. A billing adapter that throws on that caller, or an invites handler that treats throw as `PAY_UNAVAILABLE` hard-fail, violates AD-27’s Free-cap fallback without violating AD-21’s letter.
- **Divergence:** invites maps throw → Free cap; billing throws and the send 500s; web shows `PAY_UNAVAILABLE` as a safety block. That is the payment-outage leak AD-21 still claims to prevent, now on the one path this update added.
- **Autofix:** `BillingPort.isEntitled` never throws. Quota callers (Brother always; Sister iff `same_quota_as_brothers`) map `unavailable` to the Free cap. Safety callers still must not call the port.

### LOW

#### L1 — Over-cap error code is unnamed on the spine

- **Severity:** low
- **Checklist:** missed feature divergence (invites vs web)
- **Suggest:** **autofix**
- **Where:** Consistency Conventions `Errors`; AD-7; AD-27
- **Gap:** Conventions name `CONTACT_SHARE_REQUIRED` and `PAY_UNAVAILABLE`. SOLUTION-DESIGN names `QUOTA_EXCEEDED` (over-cap + reset time). The spine never does. FR-044 / FR-045 require reject-with-reset-time, which is not a payment outage.
- **Divergence:** one unit reuses `PAY_UNAVAILABLE` for over-cap; another invents `INVITE_LIMIT` / `QUOTA_EXCEEDED`.
- **Autofix:** Add `QUOTA_EXCEEDED` (over-cap, reset time) next to `PAY_UNAVAILABLE` (processor down → Free cap on quota paths, never a safety block).

#### L2 — Mid-day mode switch does not say whether already-sent invites count

- **Severity:** low
- **Checklist:** AD-27 subsequent-only; feature-level remaining-quota math
- **Suggest:** **discuss**
- **Where:** AD-27 “Applies to subsequent invites only; does not delete past invites”
- **Gap:** PRD and AD-27 lock “do not delete past invites.” They do not say whether a switch *to* `same_quota_as_brothers` counts Invites already sent that `Africa/Ouagadougou` civil day toward the new cap, or starts at zero.
- **Divergence:** two invite stories, two remaining values after an Operator toggle.
- **Discuss:** Prefer “already-sent that civil day still count when the new mode is quota-capped; switch does not insert or delete `invite_quota` rows by itself.” Or name it as an Operator policy. Do not delete past invites either way.

#### L3 — Next.js pin stale vs the spine’s own floor (stack LOCKED — no edit demanded)

- **Severity:** low
- **Checklist:** named tech verified-current
- **Suggest:** **ignore** this run (record only)
- **Where:** Stack table `16.3.6`; note “do not scaffold below 16.3.7 after 2026-09-30”
- **Gap:** Independent check 2026-10-02: Next.js latest stable **16.3.8** (2026-09-30 security drop). Table vs note already disagreed after 2026-09-30. Stack is locked; do not demand a pin bump.

---

## FR coverage (binding this update)

| Requirement | Spine lock | Hole? |
| --- | --- | --- |
| FR-044 Brothers always quota-capped; no Brother free-unlimited mode | AD-27, AD-2, AD-23 | no |
| FR-045 `free_unlimited` DEFAULT: Sister send not pack-gated | AD-27, AD-21 | no |
| FR-045 `same_quota_as_brothers`: same Free/Premium caps; missing pack = Free cap | AD-27 | no (send path) |
| FR-105 safety + Chat after accept never paywalled in either mode | AD-21, AD-2, AD-13, AD-27 | no |
| FR-105 Sister Invite not a safety paywall | AD-21, AD-27 | no |
| FR-145 both modes exist day one; Operator sets; audited; subsequent only | AD-27, AD-18, config table | no |
| FR-145 Brother UI gains no free mode | AD-27, AD-2 | no |
| FR-145 / FR-106 / FR-107 Sister checkout + pricing UI follow the mode | AD-27 silent; companion §11 only | **yes (H1)** |
| FR-044/045 “UTC day” vs AD-23/AD-27 `Africa/Ouagadougou` civil day | Intentional; BF is UTC+0 year-round | not a fork — **ignore** |
| OQ-2 resolved; Q1, Q3–11, NFR-008 open | AD-22 | no |

Do **not** treat as holes: A1 19+, A2 mahram path, A3/AD-5 legal review, name TBD, Capacitor, AD-9 blur, AD-10/AD-11 passive Chat, AD-12 cannot-send / read-delivered-only, AD IDs stable, stack pins. FR-048 Flash-to-Mahram-before-conversation remains the 2026-10-01 unapplied item (would reopen AD-12) — not re-opened here.

---

## Deferred that can still fork units

| Deferred item | Safe? | Why |
| --- | --- | --- |
| Native iOS + Apple Sign-In | yes | Same Capacitor project; flag `ios_apple_signin` |
| USSD enabled | yes | Port exists, flag off |
| KYC / SMS / moderation / aggregator SKUs | yes | One live adapter per port; OTP + notifications share `SmsPort` |
| Redis vs Valkey | yes | Stay on managed 8.6.3 |
| Scaleway PG 18 | yes | Stay on 17.11 until host lists 18 |
| Dual-control unblur / watermark / multi-region / name / A-V / EN-AR | yes | Scoped; not a `sister_reach_mode` fork |
| Exact Premium XOF prices and free-review hours | yes | `operator_config`; Sister caps reuse `brother_invite_quota_*` |

Nothing under Deferred reintroduces an absolute Sister-invite `BillingPort` ban, a Brother-free mode, or a compile-out of either `sister_reach_mode` value.

---

## Version check (named tech) — stack LOCKED

Claim: verified 2026-09-27. This walker re-checked only what can go stale; **do not treat the stack table as a required edit.**

| Name | Spine | Check 2026-10-02 | Status |
| --- | --- | --- | --- |
| Next.js | 16.3.6 | npm / Next security note **16.3.8**; spine note already required ≥16.3.7 after 2026-09-30 | **stale pin (L3)** |
| TypeScript / Node / React / Nest / Capacitor / Drizzle / BullMQ / Socket.IO / Tailwind | as table | not re-pulled as a required edit | locked |
| PostgreSQL (Scaleway managed) | 17.11 | host pin — Deferred already | locked |
| Redis (Scaleway managed) | 8.6.3 | host pin — Deferred already | locked |
| Scaleway `fr-par` | product | AD-5 assumption / legal review — **not a hole** | n/a |

---

## Greenfield

No existing production schema, vendor contract, or deployable is ratified. Rejected hosts remain alternatives, not brownfield. Coherent.

---

## Suggested resolution order

1. **Autofix H1** — AD-27 + AD-14 cite: Sisters see/buy reach packs only in `same_quota_as_brothers`; `free_unlimited` must not offer or accept a Sister reach-pack purchase.
2. **Autofix M1** — `isEntitled` never throws; quota callers map `unavailable` to Free cap.
3. **Autofix L1** if touching Conventions anyway — name `QUOTA_EXCEEDED`.
4. **Discuss L2** only if the Operator toggle ships in the same slice as quota math.
5. **Ignore L3** this run (stack locked).

Do not expand the spine into a solution design. Do not re-open A1–A3, AD-5 legal review, Capacitor, AD-9, AD-10/AD-11, AD-12 mahram product, AD IDs, or stack pins.

---

## Verdict rationale

**pass-with-findings**, not revise: the 2026-10-02 correction landed. AD-2 and AD-21 no longer absolutely ban `BillingPort` on Sister invite send. The allow is exclusive to `sister_reach_mode = same_quota_as_brothers`. Safety paths and Chat after accept stay banned in both modes. AD-27 is a real, enforceable mode lock (enum, DEFAULT, both seeded, Brother never a free pass, `invite_quota` writer, unavailable → Free cap, audited subsequent-only). FR-044, FR-045, and FR-105 send/safety coverage hold.

**pass-with-findings**, not pass: AD-27 claims FR-145 but leaves Sister checkout/pricing to the companion; AD-21’s no-throw sentence was not widened for the new entitlement caller. Those are real feature-altitude forks. Neither reintroduces an absolute Sister-invite ban or a safety paywall.
