---
title: Input reconciliation — PRD 2026-10-02 sister_reach_mode lock
status: complete
created: 2026-10-02
verdict: pass-with-findings
date: 2026-10-02
input: prds/prd-muslim-marriage-africa-2026-09-27/prd.md (binding 2026-10-02)
against: architecture/architecture-muslim-marriage-africa-2026-09-27 (ARCHITECTURE-SPINE.md + SOLUTION-DESIGN.md, updated 2026-10-02)
focus: FR-044, FR-045, FR-105, FR-145; related FR-106, FR-107, FR-108, NFR-004
locked: 2026-10-02 sister_reach_mode free_unlimited DEFAULT | same_quota_as_brothers (Maitchibi Fayçal)
not_reopened: AD-10, AD-11, AD-5, A1–A3, name
---

# Reconcile: UPDATED PRD → UPDATED spine + SOLUTION-DESIGN (2026-10-02)

PRIMARY input: `_bmad-output/planning-artifacts/prds/prd-muslim-marriage-africa-2026-09-27/prd.md` (binding 2026-10-02).
Compared against: `ARCHITECTURE-SPINE.md` + `SOLUTION-DESIGN.md` (both `updated: 2026-10-02`).
Spine `.memlog.md` treated as author intent, not coverage. Artifacts were not modified.

This is extract-and-gap on the **2026-10-02 sister-reach lock**. Older reviews that asserted Sisters always free/unlimited, or that Sister invite send must never call `BillingPort`, are historical (`reviews/*` superseded banners). This file is the PRD-reconcile lens for that lock. It does not re-score the 2026-10-01 Chat-passive findings.

**Verdict: pass-with-findings.**

The locked decision landed as **AD-27** plus consequential AD-2 / AD-21 / AD-18 / AD-23 / config-convention edits, and SOLUTION-DESIGN §2 / §3 / §6 / §7 / §11 / §16. FR-145 has its own §16 row. Coverage is **145 / 145** FRs and **9 / 9** NFRs. AD-2 and AD-21 no longer absolutely ban sister-invite `BillingPort`. Brothers never read `sister_reach_mode` as a free pass. Safety and Chat-after-accept still must not call `BillingPort`. AD-10 (passive Chat) and AD-5 (Scaleway `fr-par`) were not reopened.

What did not land as a Rule is the **pack-offer / Sister-checkout** half of FR-145 / FR-107: Invite quota and operator PATCH are specified; `GET /v1/packs` and `POST /v1/payments` have no mode-and-gender guard. A billing team can still offer a reach pack to a Sister in `free_unlimited` while every AD stays green.

---

## 0. Required confirmations

| Check | Result | Evidence |
| --- | --- | --- |
| FR-145 is traced (not dropped) | **Confirmed** | SD §16 own row: FR-145 → operator, invites, billing → **AD-27, AD-18, AD-14, AD-21**. Totals: “145 / 145 FRs mapped (144 prior + FR-145)”. AD-18 Binds include FR-145. AD-27 Binds lead with FR-145. |
| Other FR traces not dropped (coverage still complete) | **Confirmed as range coverage** | Continuous walk FR-001…FR-145; NFR-001…NFR-009 each have a row. FR-044–045 split out to AD-27; FR-104–110 now cites AD-27; FR-038–043 / FR-046–049 / FR-144 retained. 0 missing IDs. |
| AD-2 / AD-21 no longer absolutely ban sister-invite `BillingPort` | **Confirmed** | AD-2 Prevents: “or an absolute sister-invite `BillingPort` ban that blocks `same_quota_as_brothers`”. Rule: Sister invite send **may** call `isEntitled` **only** when `sister_reach_mode` is `same_quota_as_brothers`; must not when `free_unlimited`. AD-21 retired “Sister-initiated Invites are not entitlement checks” as an absolute; same only-when-`same_quota` exception. |
| AD-27 binds FR-145, FR-045, FR-044, FR-105 | **Confirmed** | AD-27 Binds line is exactly those four. |
| `operator_config.sister_reach_mode` in data model + config convention | **Confirmed** | SD §6 `operator_config` required key `free_unlimited` (DEFAULT) \| `same_quota_as_brothers`; both seeded day one. Spine Consistency Conventions Config row lists the same key and enum; “not a compile-out flag”. Not in the Feature flags list. |
| API: operator PATCH `sister_reach_mode`; sister invite quota response | **Confirmed** | SD §7.1 operator `/v1/staff/config` `GET`/`PATCH` (“`PATCH` may set `sister_reach_mode`”). Quota table on `GET /v1/invites/quota` and `POST /v1/invites`: Brother ignored-mode capped body; Sister `free_unlimited` `{ capped: false, sister_reach_mode }`; Sister `same_quota` capped body + `QUOTA_EXCEEDED`. |
| Brothers never get `free_unlimited` | **Confirmed** | AD-27: Brothers always `brother_invite_quota_free` / `brother_invite_quota_premium`; “never read `sister_reach_mode` as a free pass”. AD-2: Brother quota may call `isEntitled` always. AD-23: Brother caps from config always. SD §7: Brother row “ignored”; “There is no brother-free field.” |
| Safety / Chat-after-accept never call `BillingPort` | **Confirmed** | AD-2, AD-21, AD-27: verification, blur/reveal, mahram, report, block, and Chat after accept must not import or call `BillingPort` in **either** mode; must succeed when billing is down / `unavailable` / no pack. |
| Mode change audited; subsequent invites only | **Confirmed** | AD-18 mandatory events include operator `sister_reach_mode` changes. AD-27: “Mode change is an AD-18 event. Applies to subsequent invites only; does not delete past invites.” SD §7 PATCH paragraph repeats that. |
| Passive moderation (AD-10) unchanged | **Confirmed** | AD-10 still persist-`delivered`, background `ModerationPort`, no pre-delivery hold, Profile publish-gate, D6 published honesty. No `sister_reach_mode` in the Rule. Paid-faster-review still must not skip scan (pre-existing). |
| AD-5 unchanged | **Confirmed** | Still Scaleway `fr-par`, same French disclosure, CIL launch gate, `[ASSUMPTION — legal review]`. No sister-reach clause. |

---

## 1. What transferred (not findings)

Locked decision 2026-10-02 (Maitchibi Fayçal), from PRD Document control + glossary `sister_reach_mode` + D20:

> Sister access is admin-configurable on MVP day one (`sister_reach_mode`: `free_unlimited` DEFAULT \| `same_quota_as_brothers`). Overrides every earlier sentence that said Sisters never pay for Invites or that Invites are always unlimited. Safety and Chat after accept stay free in both modes. Brothers stay on paid quota.

| PRD lock (2026-10-02) | Architecture |
| --- | --- |
| Enum `free_unlimited` (DEFAULT) \| `same_quota_as_brothers`; both on day one; not hardcoded unlimited | AD-27; config convention; SD §2 inherit; SD §6 `operator_config` |
| Not a compile-out / feature-flag that can drop a mode | AD-27 Prevents “compiling out either mode”; key is required config, absent from Feature flags |
| Operator sets the mode without a store release | SD §7 `PATCH /v1/staff/config`; FR-139-adjacent operator writer (AD-3) |
| Change audited | AD-18 Binds FR-145 + mandatory event; SD §7 `operator sister_reach_mode change` |
| Subsequent Sister Invites only; past Invites not deleted | AD-27 Rule; SD §6 / §7 |
| Brothers always paid quota; no brother-free mode | AD-27, AD-2, AD-23; SD §7 “no brother-free field” |
| `free_unlimited`: Sister send not quota-capped; no pack; no `BillingPort` | AD-27; AD-2; AD-21; SD §7 Sister `capped: false`; SD §11 |
| `same_quota_as_brothers`: same packs, same Free/Premium daily caps, same reset; missing pack or `isEntitled=unavailable` → Free cap, not a safety block | AD-27; SD §6 `invite_quota`; SD §7 Sister capped body + `QUOTA_EXCEEDED` |
| Working caps 3 / 15 `[ASSUMPTION]` live in config, not schema enums | `brother_invite_quota_free` / `brother_invite_quota_premium`; SD §6 invite “working 3/15” |
| `invite_quota` written only by invites, only when the sender is capped; billing never writes it | AD-27; SD §6 `invite_quota` |
| Safety (verification, Blur/Reveal, Mahram, Report, Block) free in both modes | AD-21, AD-13, AD-27; FR-105 ACs |
| Chat after accepted Invite free for both genders; not an entitlement check | AD-2, AD-21, AD-27 |
| Browse + Chat after accept work without payment in both modes (FR-104) | AD-21 + SD §2 / §11 |
| 1 / 3 / 6 packs; no silent auto-renew (FR-106) | AD-14 unchanged; SD §11 Sisters buy those packs only in `same_quota` |
| BF rails (FR-107) still Orange Money / Moov / Wave-Coris; cards hosted | AD-14; SD §11 |
| Transparent pricing (FR-108) same numbers as Brother checkout when Sisters are on `same_quota` | SD §11 + FR-104–110 → AD-14, AD-21, AD-27 |
| Payment outage must not take down Free / safety (NFR-004) | AD-21; AD-14; SD §11 |
| AD-2 dependency direction still hexagon; billing outage must not leak into safety | AD-2 Prevents both the leak **and** the absolute sister-invite ban |
| Passive Chat (AD-10) and hosting (AD-5) not rewritten | AD-10 / AD-5 as of 2026-10-01 |

Prior 2026-10-01 Chat-lock findings (D6 copy was later bound on AD-10; Flash `flash_id`; AD-12 leftover states cleaned) are out of this lock’s scope and were not undone by AD-27.

---

## 2. Focus FR / NFR point-at-new-rule

| ID | PRD (updated 2026-10-02) | Points at AD-27 / amended AD-2 / AD-21? | Quiet miss inside the FR |
| --- | --- | --- | --- |
| **FR-044** | Brothers always quota-capped. Free 3 / Premium 15 per **UTC day** `[ASSUMPTION]`. Any `sister_reach_mode`, Brother UI gains no free-unlimited mode. No paid ranking in MVP. | **Yes** on the Brother cap and no-free-mode. AD-27 + AD-23 + SD §7 Brother row. §16 FR-044–045 → AD-27, AD-21, AD-23. | Reset clock is Ouaga civil day, “not UTC” (AD-23). See §4. Ranking-not-in-MVP is still AD-22 / FR-111 NEXT. |
| **FR-045** | Sister reach not hardcoded unlimited. Default `free_unlimited`. `same_quota` applies FR-044 caps; missing pack = Free cap. Safety + Chat after accept stay free. | **Yes.** AD-27 is the rule. SD §7 Sister rows match the three send ACs (`capped: false` / Free cap + reset / Premium cap). | Pack-offer / checkout existence is not an AD (FR-145 / FR-107). See §3. |
| **FR-105** | Verification, Blur/Reveal, Mahram, Report, Block free in both modes. Chat after accept free for both genders. Sister Invites follow FR-045, not a safety paywall. | **Yes.** AD-21 + AD-27 + AD-2. Brother Report / Verification / Chat-after-accept still not entitlement checks. | None on the safety stack. |
| **FR-145** | Operator sets mode; both values day one; audited; subsequent only; no brother-free; Sister UI unlimited **or** same quota + pack purchase. | **Operator + quota + audit + Brother UI: yes.** Own §16 row. PATCH + quota response specified. | **Sister “does not offer a reach pack” / checkout-exists-only-in-`same_quota` is §11 prose.** See §3. |
| **FR-106** | 1 / 3 / 6; no silent auto-renew. Brothers always see packs. Sisters see them only when `same_quota`. | **Pack machine yes** (AD-14). Sister visibility is SD §11. | Same pack-offer miss as FR-145. Audio no-auto-renew (D16) is out of this lock. |
| **FR-107** | BF rails. “Sister checkout exists on day one only when `same_quota` (FR-145).” | Rails yes (AD-14 / SD §11). Sister-pay ACs assume `same_quota`. | Resource map lists `/v1/packs` and `/v1/payments` with no gender/mode predicate. See §3. |
| **FR-108** | One transparent page; Sister checkout prices match Brother when `same_quota`. | Implied by AD-14 + single `pack_prices_xof`. | No extra miss beyond §3 (if checkout is shown, prices are the same config). |
| **NFR-004** | Core path (includes Invite) ≥ 99.5%; payment-provider outage must not take down Free or safety. | **Outage half yes** (AD-21). Invite stays up on `unavailable` via Free cap (AD-27), not a send-block. | 99.5% monthly target is still not an AD number (pre-existing; not this lock). |

§16 rows for the slice:

- `FR-044–FR-045` → invites, billing, operator → **AD-27, AD-21, AD-23**
- `FR-104–FR-110` → billing → **AD-14, AD-21, AD-27** (covers FR-106 / 107 / 108)
- `FR-145` → operator, invites, billing → **AD-27, AD-18, AD-14, AD-21**
- `NFR-004` → billing, api → **AD-14, AD-20, AD-21**

That is the new rule, not the deleted “Sisters never pay / never call `BillingPort`”.

---

## 3. Quiet requirement the AD structure dropped: Sister pack-offer / checkout

FR-145 and FR-107 are two surfaces. The **Invite-quota and operator-mode** surface is an AD. The **pricing / checkout offer** surface is not.

**PRD locks (testable):**

- FR-145 body: “Sister UI shows either unlimited Invites **or** the same quota and pack purchase as Brothers.”
- FR-145 AC: `free_unlimited` → Invite or pricing UI “shows unlimited Invites and **does not offer a reach pack**.”
- FR-145 AC: `same_quota_as_brothers` → she sees the same Free/Premium daily caps **and** the same 1/3/6-month pack purchase (FR-044, FR-106, FR-107, FR-108).
- FR-106: “Sisters see the same packs only when `sister_reach_mode` is `same_quota_as_brothers`.” AC: `free_unlimited` → “she is not required to buy a reach pack.”
- FR-107: “Sister checkout exists on day one **only when** `sister_reach_mode` is `same_quota_as_brothers` (FR-145).”

**What the architecture encoded:**

| Surface | Landed? |
| --- | --- |
| Sister send quota / `BillingPort` by mode | AD-27, AD-2, AD-21, SD §7 quota table |
| Operator PATCH + audit + subsequent-only | AD-27, AD-18, SD §7 |
| “Sisters see and buy the same packs only when `same_quota`” | SD §11 prose only |
| `GET /v1/packs` / `POST /v1/payments` refused or hidden for Sisters in `free_unlimited` | **No.** Resource map is unguarded. |
| AD Prevents “Sister checkout in `free_unlimited`” | **No.** AD-27 Prevents hardcoded unlimited send, brother-free, compile-out, Brother free-pass, BillingPort on safety — not an extra pack SKU on Sister pricing. |

A billing team can ship `/v1/packs` + checkout to Sisters in `free_unlimited`, take money, and still satisfy AD-14 / AD-27 (send remains uncapped and does not call `BillingPort`). That is the Farata-shaped honesty risk on the **pricing** page: offer a reach pack she does not need. FR-106’s weaker AC (“not required to buy”) would still pass; FR-145’s stronger AC (“does not offer”) would fail.

**Severity:** medium. Testable AC on the new FR. Not a safety paywall and not a dropped trace. Easy to miss because the AD format locked the send predicate and left the offer predicate in §11.

---

## 4. FR-044 / FR-045 reset clock: PRD UTC vs AD-23 Ouaga

PRD FR-044 / FR-045 ACs still say “UTC day” / “same UTC day” (working 3 / 15, `[ASSUMPTION]`).

Architecture:

- AD-23: “Daily Invite quotas reset on the `Africa/Ouagadougou` civil day, **not UTC**.”
- AD-27: `same_quota` uses “the same `Africa/Ouagadougou` civil-day reset.”
- Time convention: APIs/DB are UTC ISO-8601; quota windows use the Ouaga civil day.

Burkina Faso is UTC+0 with no DST, so the clocks coincide for launch. The documents still contradict: a tester following the PRD AC writes “UTC day”; a builder following AD-23 writes “not UTC.” A later-country rail (FR-114) would make them diverge.

**Severity:** low. Pre-existing clock choice, now restated on AD-27. Not a drop of the 3 / 15 working numbers (those live in `operator_config`).

---

## 5. FR-038–043 §16 row still omits AD-27

FR-038 is the send action (“Invite-ready Sister or Brother **within quota**”). §16 maps FR-038–043 → AD-23, AD-21, AD-10 — not AD-27.

The Invites **capability map** cites AD-27. FR-044–045 have their own AD-27 row. A builder who implements “send Invite” from the FR-038 row alone can miss `sister_reach_mode` and treat every Sister as the old unlimited path, or (worse) as always-`BillingPort`.

**Severity:** low. Range presence is not the Rule; the Rule is on AD-27 and the capability map. Traceability nit, not a dropped FR.

---

## 6. AD-10 and AD-5 (must stay unchanged)

| Topic | Still true? |
| --- | --- |
| Chat persist `delivered` immediately; background scan; no hold-on-timeout | Yes. AD-10. |
| Profile Photo / bio publish-gated | Yes. AD-10 apply path. |
| D6 Member-facing delivered-then-scanned copy | Yes. Still on AD-10 (2026-10-01 autofix). Untouched by this lock. |
| Flash `flash_id` scan substrate | Yes. AD-10 / ER `INVITE → MODERATION_JOB`. Untouched. |
| Primary host Scaleway `fr-par`; public FR disclosure; CIL gate | Yes. AD-5. |
| A1–A3, name, stack pins | Unchanged. |

No sister-reach clause was inserted into AD-10 or AD-5. Passive moderation and hosting were not used as a vehicle for the monetisation lock.

---

## 7. SOLUTION-DESIGN §16 coverage (144 prior + FR-145)

Claim: “Coverage: **FR-001–FR-145 = 145/145**. **NFR-001–NFR-009 = 9/9**.” Totals repeat: “145 / 145 FRs mapped (144 prior + FR-145). 9 / 9 NFRs mapped. 0 missing.”

Range walk (no hole, no duplicate of 145):

FR-001–008, 009–010, 011, 012–013, 014–015, 016–017, 018, 019, 020, 021–023, 024–027, 028, 029–036, 037, 038–043, **044–045**, 046–049, 050–052, 053, 054, 055, 056–061, 062–068, 069–070, 071–080, 081–082, 083–093, 094, 095–101, 102–103, **104–110** (now includes AD-27), 111–114, 115–116, 117, 118, 119–120, 121–131, 132–135, 136, 137–138, 139–142, 143, 144, **145**.

NFR-001–009 each have a row. NFR-004 still AD-14, AD-20, AD-21 (outage isolation; not rewritten as an Invite entitlement).

Range presence is not a Rule that would fail if the FR were ignored. For this update that distinction matters only for **FR-145 / FR-107 pack-offer** (§3) and the **FR-038 row omitting AD-27** (§5). Older decorative maps are out of this lock’s scope.

---

## 8. Findings (triaged)

### Critical

None. FR-145 is not dropped. AD-2 / AD-21 no longer absolutely ban sister-invite `BillingPort`. AD-27 binds FR-145, FR-045, FR-044, FR-105. Brothers never gain `free_unlimited`. Safety and Chat-after-accept still must not call `BillingPort`. Mode change is an AD-18 event and applies to subsequent invites only. AD-10 and AD-5 were not reopened. Coverage is 145 / 145 + 9 / 9.

### High

None.

### Medium

1. **Sister pack-offer / checkout in `free_unlimited` is not an AD.** FR-145 AC + FR-107 require that Sister pricing does not offer a reach pack, and that Sister checkout exists on day one only when `same_quota_as_brothers`. Invite quota and operator PATCH landed. `GET /v1/packs` and `POST /v1/payments` stay unguarded; SD §11 is prose. A billing team can sell a Sister a pack she does not need and still satisfy every Rule.

### Low

2. **PRD FR-044 / FR-045 say UTC day; AD-23 / AD-27 say Ouaga civil day, “not UTC.”** Same clock in Burkina (UTC+0). Documents disagree; a later country would expose it.
3. **FR-038–043 §16 row omits AD-27.** Send-Invite builders who follow only that row can miss `sister_reach_mode`. Capability map and FR-044–045 row do cite it.
4. **AD-18 payload for a mode change is ids + action + reason.** Mandatory event exists; old/new `sister_reach_mode` values are not named as required payload fields (FR-145 AC “the new value is … written to the audit log”).

---

## 9. Suggested repairs (not applied)

This review does not edit the spine or the PRD. If a later distill absorbs findings:

1. Bind pack-offer on AD-27 or AD-14: Sisters are offered `/v1/packs` and `POST /v1/payments` **only** when `sister_reach_mode` is `same_quota_as_brothers`; in `free_unlimited` those endpoints do not offer a reach pack (FR-145, FR-107). Keep send-path `BillingPort` rules as written.
2. Either change PRD FR-044 / FR-045 ACs to `Africa/Ouagadougou` civil day, or drop “not UTC” from AD-23 and treat Ouaga civil day as the UTC day for BF (state the UTC+0 coincidence).
3. Add AD-27 to the FR-038–043 governing-AD cell, or point that row at the Invites capability map.
4. AD-18: `sister_reach_mode` change payload includes previous and new enum values (ids + action + reason already allow it).

---

## 10. What this review is not

Not a spine or PRD edit. Not a reopen of AD-10, AD-11, AD-5, A1–A3, name, stack, Capacitor, or AD-9. Not a re-score of 2026-10-01 Chat-passive findings. Not UX, spec, or epics. Not legal advice.
