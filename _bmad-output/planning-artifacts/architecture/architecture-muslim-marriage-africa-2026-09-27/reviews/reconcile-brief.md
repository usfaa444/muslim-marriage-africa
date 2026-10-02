---
title: Input reconciliation — brief → architecture spine
status: complete
created: 2026-09-27
updated: 2026-10-01
superseded: 2026-10-01
verdict: pass-with-findings
input: briefs/brief-muslim-marriage-africa-2026-09-27 (brief.md + addendum.md)
against: architecture/architecture-muslim-marriage-africa-2026-09-27 (ARCHITECTURE-SPINE.md + SOLUTION-DESIGN.md)
spine-modified: false
---

# Reconcile: product brief → architecture spine

> **Superseded 2026-10-01.** Chat moderation is passive after delivery (AD-10 amendment; PRD FR-062–068, FR-144, NFR-003). Claims in this review of pre-delivery Chat scan, hold-on-timeout, or fail-closed Chat delivery are historical. Profile Photo/bio publish-gate (FR-065), AD-9 blur, and AD-12 mahram read-delivered-only are unchanged.

PRIMARY input: `brief-muslim-marriage-africa-2026-09-27` (`brief.md`, `addendum.md`).
Compared against: `ARCHITECTURE-SPINE.md` + `SOLUTION-DESIGN.md` (2026-09-27 draft). Spine was not modified by this review.

This is extract-and-gap, not a rewrite. Citations are file + section (or AD / FR / P / D id).

Required checks: A1–A3 kept as written; name shortlist; platforms; CIL + public hosting disclosure; P/D horizons not silently dropped.

**Verdict: pass with findings.** Name shortlist, platforms, CIL + disclosure, and A2/A3 product text land. No MUST P/D id is moved to NEXT or omitted from the FR map. A1 is **not** kept as written. Several NEXT slices that share an FR with an MVP floor are collapsed into MVP ranges. Two MUST-adjacent product rules from A2/D38 never appear in an AD rule.

---

## 1. Required-check scorecard

| Check | Result | Where it lives / where it breaks |
| --- | --- | --- |
| A1 kept as written | **Fail (paraphrase)** | Spine asserts “A1–A3 stay as written.” Solution design §2 claims “Kept verbatim” then quotes only “19+ (Farata Mentions légales Claimed 19+)”. The 18+ fallback and store-rating rationale are gone. No AD states 19+. |
| A2 kept as written | **Pass (6 steps)** / **thin on rationale rules** | Solution design §2 quotes the six A2 steps. AD-12 carries sister-initiate, enum, no kinship docs, D38 remove, cannot-send-as-her, unmatched-friend. Cooling-off (A2 rationale; PRD FR-072) is absent. |
| A3 kept as written | **Pass** | Solution design §2 quotes A3 verbatim and says the pick is AD-5, not a rewrite. AD-5: “A3 text is not rewritten.” |
| Name shortlist | **Pass** | Spine header + solution design header: Nisfuddin, Nikahsira, Sakinaa; alternates Mithaqun, Nonglem. Name stays TBD. `nisfdin` also-consider and RDAP caveats are thinned (see §5). |
| Platforms | **Pass** | AD-4: web + PWA first-class; Play = Capacitor Android; iOS = same project later, not dropped. TWA rejected with a reason (narrowing of the brief’s “TWA / Capacitor” option set, not a platform drop). |
| CIL + disclosure | **Pass** | AD-5 + AD-19 + solution design §5: CIL authorisation as launch gate; public French disclosure sentence; Loi n°001-2021/AN arts 42–44; portable move if CIL requires in-country. |
| P/D horizons not silently dropped | **Pass with range-collapse** | No MUST id deferred. Deferred list matches brief NEXT/LATER (iOS, USSD, D9, D31, live A/V, EN/AR). Solution design §16 ranges hide NEXT legs that share an FR with an MVP floor (FR-093 / D31; FR-092 / D23 NEXT). |

---

## 2. What transferred

The brief’s “What the PRD must preserve” items 1–10 that architecture can own largely landed. Architecture inherits via the PRD FR map (solution design §16 claims 143/143 FR and 9/9 NFR).

| Brief spine | Where it lives in architecture |
| --- | --- |
| Working title; name TBD; shortlist + alternates | Spine header; solution design header; Deferred “Product name, domains, trademarks — branding tokens, not schema” |
| Burkina-first honorable ta'aruf; French-first; Mooré/Dioula **audio** | Solution design §2 inherited decisions; AD-11 honesty; locale convention `fr` default, audio keys `mos`/`dyu` |
| Six owner must-haves as MVP | Solution design §2; capability map (profiles, moderation, media/Reveal, mahram, outcomes, verification/trust) |
| Fail-closed pre-delivery on every modality | AD-10 + AD-11; state machine `pending → delivered\|held\|blocked` |
| Sister-initiated optional Mahram; dual-confirm marriage; counter from 0 | AD-12; outcomes ownership of `marriage_report` / `consent_story` / `marriage_counter`; data-model “Counter increments **only** on dual confirm” |
| Web + PWA + store-listed Android MVP; native iOS NEXT, not dropped | AD-4; Deferred iOS; FR-132–FR-135 mapped “MVP (FR-135 NEXT)” |
| Freemium XOF; dignity never paywalled; 1/3/6; no silent auto-renew; mobile-money first | AD-14, AD-21; Orange Money BF / Moov Africa BF / Wave/Coris; cards secondary |
| Evidence labels only | Consistency Conventions “Evidence”; solution design §2 and §17 |
| A3: CIL + public hosting disclosure; region pick belongs to architecture | AD-5 pick + disclosure; AD-19 statute; A3 text quoted in solution design §2 |
| Open questions 1–11 stay open | AD-22; solution design §15 table |
| Khalwa: no live 1:1 A/V (LATER even with wali) | Deferred “Live 1:1 A/V (LATER, khalwa)” |
| Full English/Arabic UI LATER | Deferred; FR-121–FR-131 “NEXT / LATER” |
| No dating lexicon | Locale convention “no dating lexicon in copy keys” |
| Cookie consent ≠ photo reuse; coarse geo; quartier hidden until accepted Invite | AD-19 |
| Verification free, not an entitlement | AD-13, AD-21 |
| USSD MUST-if-feasible → port exists, flag off | AD-16; Deferred; OQ-3 |

Capability-level transfer is strong. AD-9 (server-side blur/revoke), AD-11 (no fake Mooré/Dioula ASR claim), AD-14 (no renewal job), and AD-21 (billing unreachable from safety paths) are the architecture-shaped forms of D8, D4/D18, D16, and D20.

---

## 3. A1–A3 as written

### 3.1 A1 — Minimum age 19+ — not kept as written

Brief.md §Assumptions A1 (and PRD FR-011, labeled verbatim) is:

> Minimum age is **19+** (Farata parity, conservative). Rationale: Farata Mentions légales Claimed 19+; stores rate Farata 17+ (iOS) / 18+ (Play) Offered (seen) as store ratings. A conservative floor reduces minor-adjacent risk in a matrimony product and matches the competitor’s published rule. **Flag for legal review:** Burkina Faso civil majority and marriage-age law, plus our own store ratings (likely 17+/18+), must be confirmed before launch. **If counsel requires 18+, the PRD will add extra protections for 18–21 rather than silently lowering the gate.**

What architecture actually wrote:

- Spine: “Assumptions A1–A3 stay as written in the brief/PRD.” Pointer only. No 19+ rule in any AD.
- AD-8 (identity/RBAC) binds FR-011 in the trace table but the AD text is roles, Google, PIN — not age.
- AD-13 mentions D39 suspected-minor hold, not the 19+ floor.
- Solution design §2 A1: “Kept verbatim … minimum age is **19+** (Farata Mentions légales Claimed 19+). Flag for legal review of Burkina civil majority / marriage-age law and store ratings.”
- Data model: `age_attested` on `account`. No `min_age = 19` invariant.

**Finding F1 — high.** Claiming “verbatim” while dropping the 18+ fallback is the silent-gate-change A1 exists to prevent. A builder who only reads the spine can ship a hard `19` enum with no 18–21 protection path, or skip the gate entirely because no AD states it.

### 3.2 A2 — Wali path — six steps kept; rationale rules split

Solution design §2 A2 quotes the six steps. AD-12 and AD-13 cover steps 1–6 plus unmatched-friend rejected (from the A2 rationale and addendum §3.2).

Missing from both architecture files (confirmed: no `cooling-off` / `cool-off` / `1 hour` / `emergency hide`):

| A2 / D38 product rule (brief) | Architecture |
| --- | --- |
| Cooling-off after OTP; pause/end only after Sister confirm (brief A2 rationale; PRD FR-072 `[ASSUMPTION: 1 hour]`) | Absent |
| Pending invite expiry (PRD FR-073 `[ASSUMPTION: 7 days]`) | Absent |
| D38 **emergency hide** (brief D38 MUST; addendum risk 16; PRD FR-077) | Absent. AD-12 only: remove/report revokes read access within 60s |
| “Verified wali” badge | Present (solution design §2 step 4; §10; AD-13 optional ID) |
| Unmatched male friend rejected | Present (AD-12) |
| No kinship documents in MVP | Present (AD-12) |

**Finding F2 — medium.** A2’s six-step list is kept. Two MUST-adjacent rules that the brief treated as part of the anti-fake/coercive-wali floor — cooling-off and emergency hide — have no port, entity, or AD sentence. FR-071–FR-079 are bound to AD-12, so a builder can treat those ACs as “product, not architecture” and omit them from schema (no `cooling_off_until`, no emergency-hide flag).

### 3.3 A3 — Data residency and CIL — kept; pick added correctly

Brief A3 (addendum §3.3 chosen option): hosting-location **decision is deferred to architecture**; product **must** comply with **CIL** and **must publicly disclose the hosting location**.

Solution design §2 quotes those sentences, then: “The pick below is **AD-5**, not a rewrite of A3.”

AD-5 does the job A3 assigned to architecture: Scaleway `fr-par`, tagged `[ASSUMPTION — legal review]`, compared and rejected Virtix / Lagos / Cape Town, hyperscaler alt AWS `eu-west-3`, portable substrate (AD-6) if CIL requires in-country. Public line: « Données hébergées en région Île-de-France (France), prestataire Scaleway ». Launch gate: CIL authorisation + DPA + encryption before public traffic.

AD-19 keeps statute as Loi n°001-2021/AN arts 42–44, refuses invented articles and copied Farata retention, and leaves NFR-008 clocks `[ASSUMPTION]`.

A3 is the cleanest of the three assumptions.

---

## 4. Name shortlist

Brief.md §Naming vs architecture:

| Brief | Architecture |
| --- | --- |
| Name not decided; no domain bought | Kept (working title; Deferred branding tokens) |
| Shortlist Nisfuddin / Nikahsira / Sakinaa | Kept (spine + solution design headers) |
| Alternates Mithaqun / Nonglem | Kept |
| Also consider `nisfdin` | **Dropped** |
| `sakina.com` / `.net` taken | **Dropped** |
| `.com` / `.net` free columns; RDAP 2026-09-27 ~21:10 ET; HTTP 404 ≠ purchase | **Dropped** (point-in-time caveat not restated) |
| Pending: native-speaker slang/taboo; OAPI + WIPO; social handles; user test sisters/brothers/walis in Ouaga and Bobo | Native-speaker + OAPI/WIPO kept (solution design header; OQ-9, OQ-10). Social-handle check and three-actor user test not restated |

**Finding F3 — low.** Shortlist and alternates are intact; name is not decided in the spine. Decision-gate detail (`nisfdin`, RDAP, three-actor test) lives only in the brief/PRD. Acceptable for architecture if branding stays config — do not treat the spine header as the naming dossier.

Addendum §3.7 Dannaya (not on the shortlist) is correctly absent.

---

## 5. Platforms

Brief.md §Launch market and platforms + addendum §3.4:

- MVP: web + installable PWA + store-listed Android (thin wrapper / **TWA / Capacitor**).
- Native iOS: parity — deferred to NEXT, not dropped. Apple sign-in ships with iOS (P2).

AD-4 chooses Capacitor and **prevents** “a TWA-only shell that cannot set `FLAG_SECURE` or reliable FCM/camera.” Solution design §4 records the rejected alternatives (PWA+TWA, RN/Expo, Flutter).

This is a documented narrowing of the brief’s option set, not a drop of Android or web/PWA. iOS remains the same Capacitor project (Deferred; FR-135 NEXT). Apple Sign-In is a feature flag `ios_apple_signin` (AD-8; conventions).

Web and installable PWA stay first-class without the native shell — matches brief P36 split.

No platform finding.

---

## 6. CIL + public disclosure

Brief A3 + D17 + P46 + out-of-scope “architecture / hosting vendor pick”:

| Brief requirement | Architecture |
| --- | --- |
| Comply with CIL | AD-5 launch gate; AD-19 arts 42–44; operator owns `cil_ticket` |
| Publicly disclose hosting location | AD-5 French sentence; FR-119–FR-120 mapped; “Operators cannot hide this (FR-120)” |
| Do not pretend a region in the brief | Honored: pick is AD-5, A3 text unchanged |
| Do not copy Farata USA silence | AD-5 cites Farata DPA Vercel/Neon USA Offered (seen); CIL mention Not publicly evidenced |
| Write our own retention (not Farata 2-year Claimed) | AD-19 NFR-008 clocks stay `[ASSUMPTION]` |
| 72h breach notice (P46) | Solution design §13 “72h breach notice” |

CIL + disclosure is the strongest transfer in the pair. No finding.

---

## 7. P/D horizons

Architecture does not reprint P1–P59 / D1–D40. Horizons are carried through solution design §16 (FR/NFR → horizon + AD) and the spine Deferred list. Cross-checked against brief horizons via PRD Appendix A (which the brief required the PRD to keep, and which architecture claims to inherit).

### 7.1 MUST / MVP — none deferred

Spine Deferred contains no MUST P/D id. Items there match brief NEXT/LATER:

| Deferred line | Brief horizon |
| --- | --- |
| Native iOS + Apple Sign-In | P2 / P36 NEXT |
| USSD adapter flag off | D27 MUST-if-feasible; brief/PRD treat NEXT pending cost |
| Dual-control unblur (D31 NEXT) | D31 NEXT |
| Watermark / no-download (FR-061 NEXT) | D9 NEXT |
| Live 1:1 A/V LATER | Brief LATER / khalwa |
| Full English/Arabic UI LATER | D18 LATER |
| Exact Premium XOF prices | Brief `[ASSUMPTION]` |

USSD is the one brief “MUST if feasible” flattened to NEXT. That flattening already happened in the PRD (FR-055). Architecture keeps the port and the flag — not a new silent drop.

### 7.2 NEXT / LATER ranges that hide a slice

Solution design §16 uses ranges. Most parentheticals are careful (`FR-004 NEXT`, `FR-049 NEXT`, `FR-061 NEXT`, `FR-135 NEXT`). Three are not:

| Range in §16 | Horizon written | Hidden slice |
| --- | --- | --- |
| FR-083–FR-093 | **MVP** | FR-093 title is “MVP floor; dual-control NEXT” (D31). Spine Deferred saves this; the table does not. |
| FR-083–FR-093 | **MVP** | FR-092 AC includes “Given the D23 NEXT slice” (fuller named board + stats). D23 NEXT is not called out. |
| FR-095–FR-101 | **MVP** | PRD Appendix A maps D12 NEXT polish to FR-100. FR-100 ACs are the MUST showcase page. Range is correct for the MUST slice; the NEXT polish has no distinct FR — inherited PRD overlap, not a new drop. |
| FR-121–FR-131 | NEXT / LATER | FR-128 (D18 EN/AR **LATER**) is not singled out the way FR-135 is. Spine Deferred does name it. |

**Finding F4 — medium.** A builder using only §16 can schedule FR-093 and FR-092 as “all MVP.” Dual-control and the D23 fuller-board slice would ship in the first schema if they follow the table instead of the Deferred list. The spine Deferred line for D31 is the only thing preventing a silent horizon pull-forward.

### 7.3 Horizon spot-check (brief → §16)

| Brief id | Brief horizon | Architecture §16 | Match |
| --- | --- | --- | --- |
| P2 Apple / P36 iOS | NEXT | FR-001–008 “MVP (FR-004 NEXT)”; FR-132–135 “MVP (FR-135 NEXT)” | Yes |
| P16 confrérie + hijra | NEXT if not cheap | FR-029–036 NEXT | Yes |
| P18–P20, P24–P27 | NEXT | FR-029–036 NEXT | Yes |
| P33 GIF / P54 testimonials | NEXT | FR-054 NEXT; FR-102–103 NEXT/LATER | Yes |
| P51 / P53 LATER cadence | LATER | FR-121–131 NEXT/LATER | Yes (lumped) |
| P56 remaining perks / P58 Free Money–MTN | NEXT | FR-111–114 NEXT | Yes |
| D1, D4, D8, D11, D12 MUST, D13, D20 | MUST | AD-12, AD-10, AD-9, outcomes, AD-13, AD-21 | Yes |
| D2, D3, D9, D21, D25, D26, D29–D31, D34–D37 | NEXT | FR-081–082, FR-061, FR-121–131, FR-094, FR-111 | Yes (D31 table issue above) |
| D18 EN/AR, D33 alumni | LATER | FR-121–131; FR-102–103 | Yes |
| D27 SMS / USSD | MUST / MUST-if-feasible | FR-053 MVP; FR-055 NEXT | Yes |

No MUST id is missing from the FR map. No NEXT/LATER id is rewritten to MVP except the FR-093 / FR-092 range collapse.

---

## 8. Other extract notes (not the required-check classes)

### 8.1 Lite trigger drifted

Brief.md §Who this serves: sisters on “1GB-class data.” Addendum §2: “use this on ~1GB/month → D19.”
AD-16: “Lite default on Slow-3G or **2GB-class**.”

Not a horizon drop. A builder will tune Lite for a 2GB phone, not a 1GB month. Record as a product-number drift.

### 8.2 P8 paid-faster review

Brief P8 MVP: published free SLA; paid buys a faster queue, not a rubber stamp.
§16 maps FR-012–FR-013 MVP to AD-10 / AD-22. No BillingPort method or entitlement for review-queue priority. Free path is protected (AD-13, AD-21). The paid perk can vanish into `operator_config` without an entitlement row.

### 8.3 Fingerprint definition

PRD FR-088: “fingerprint definition is an architecture input.”
AD-3 owns `fingerprint` on trust. No definition (device / phone / ID hash / combination). Brief D7 MUST still has an entity owner; the input the PRD asked architecture to close is still open.

### 8.4 Kill-switch / mass revoke

Brief launch-killing eight + addendum risk 24: kill-switch + mass revoke of reveals.
AD-9 is per-viewer revoke ≤60s. No operator mass-revoke / kill-switch command. Inherited from the PRD (no FR), not introduced by the spine.

### 8.5 Qualitative feel

Brief “not a swipe feed,” “du'a not celebrities,” Ouaga-French sanction macros, suitor-not-player: architecture correctly does not own UX. Locale convention bans dating lexicon in copy keys. No architecture finding.

### 8.6 Pricing band

Brief working band ~4 900–5 900 XOF/month stays `[ASSUMPTION]` in Deferred / `operator_config`. Correct.

---

## 9. Gap list (for parent summary)

1. **A1 not kept as written** — “verbatim” claim is a paraphrase; 18+ / 18–21 fallback omitted; no AD binds 19+ (see §3.1). **High.**
2. **A2/D38 rules missing from AD-12** — cooling-off after OTP; D38 emergency hide (see §3.2). **Medium.**
3. **§16 range collapse** — FR-083–FR-093 marked all-MVP hides D31 dual-control NEXT and D23 NEXT board slice; only the Deferred list saves D31 (see §7.2). **Medium.**
4. **Name decision-gate thinned** — `nisfdin`, RDAP, three-actor user test not in the spine header (see §4). **Low.**
5. **Lite 1GB → 2GB-class** (see §8.1). **Low.**

Not findings (required checks pass): A3 text + AD-5 pick; CIL filing + French disclosure; platforms web/PWA/Android MVP + iOS NEXT; shortlist + alternates present; no MUST P/D silently deferred.

---

## 10. Document control

- **Intent:** reconcile architecture against the product brief. No other BMAD skill started. Spine not modified.
- **Sources read:** `ARCHITECTURE-SPINE.md`; `SOLUTION-DESIGN.md`; `brief.md`; `addendum.md`. PRD Appendix A and FR-071–FR-093 used only to resolve P/D ↔ FR horizon identity.
- **Verdict:** pass with findings.
