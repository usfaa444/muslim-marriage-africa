---
title: Input reconciliation — prd-muslim-marriage-africa-2026-09-27
status: complete
created: 2026-09-27
updated: 2026-10-02
superseded: 2026-10-02
verdict: pass-with-findings
input: prds/prd-muslim-marriage-africa-2026-09-27 (prd.md + addendum.md)
against: architecture/architecture-muslim-marriage-africa-2026-09-27 (ARCHITECTURE-SPINE.md + SOLUTION-DESIGN.md)
---

# Reconcile: PRD package → architecture spine

> **Superseded 2026-10-01.** Chat moderation is passive after delivery (AD-10 amendment; PRD FR-062–068, FR-144, NFR-003). Claims in this review of pre-delivery Chat scan, hold-on-timeout, or fail-closed Chat delivery are historical. Profile Photo/bio publish-gate (FR-065), AD-9 blur, and AD-12 mahram read-delivered-only are unchanged.

> **Name lock 2026-10-03 (Maitchibi Fayçal via Harris).** Product name is **AnKanu**. Domain **ankanu.com** purchased on Hostinger. Repository slug `muslim-marriage-africa` is not the product name. Sentences below that treat the name as TBD, undecided, or a live shortlist (Nisfuddin, Nikahsira, Sakinaa, Mithaqun, Nonglem, `nisfdin`) are historical of this review date. Those names were not chosen and those domains were not purchased. OAPI/WIPO for AnKanu is not recorded as completed.

> **Superseded 2026-10-02.** Sister Invite reach is operator-configurable (AD-27 / FR-145). The transferred-item row “Billing isolation from safety / Sister invites → AD-21” is historical as an absolute. Isolation still holds for safety and for Sister send in `free_unlimited`; `same_quota_as_brothers` Sister send uses the same `BillingPort.isEntitled` result as Brothers.

PRIMARY input: `prds/prd-muslim-marriage-africa-2026-09-27` (`prd.md`, `addendum.md`).
Compared against: `ARCHITECTURE-SPINE.md` + `SOLUTION-DESIGN.md`.
Spine memlog treated as author intent, not as coverage.

This is extract-and-gap. The spine was **not** modified. Citations are file + AD / FR / NFR / section.

**Verdict: pass-with-findings.**

Load-bearing safety, money, platform, A2/A3, fail-closed, server-side Blur, D38 core, and no-auto-renew invariants landed as ADs. Quiet product constraints the `AD` structure dropped — especially tone, A1 verbatim+binding, D38 emergency hide, and range-mapped FR/NFR gaps — would not fail a builder who only obeyed the spine.

---

## 1. What transferred (not findings)

Capability-level inheritance is strong. The companion `SOLUTION-DESIGN.md` carries most product decisions the terse spine correctly refuses to re-argue.

| PRD lock | Where it lives in the architecture |
| --- | --- |
| Hexagonal-enough module ownership; one API process | AD-1, AD-2, AD-3; Structural Seed |
| Web + PWA + store-listed Android MVP; iOS NEXT, not dropped | AD-4; Deferred |
| A3 pick as a separate AD, not a rewrite | AD-5 + SOLUTION-DESIGN §2 A3 / §5 |
| Portable substrate if CIL forces in-country | AD-6 |
| Fail-closed pre-delivery on text / Chat Photo / Voice / Profile Photo / bio | AD-10 state machine; SOLUTION-DESIGN §8 |
| Server-side Blur: private originals, signed URL after auth, no original in list/grid/push | AD-9; SOLUTION-DESIGN §9 |
| Sister-initiated Mahram; read-all of attached Chat only; cannot send as her; cannot browse/Invite | AD-12 |
| D38 remove/report + revoke ≤60s | AD-12 Rule |
| Verification free, not an entitlement | AD-13, AD-21 |
| 1/3/6 month packs; no renewal job; no stored mandate | AD-14; pack entity `ends_at`, **no** `renew_at` |
| Billing isolation from safety / Sister invites | AD-21 |
| Lite + SMS essential path; USSD port exists, flag off | AD-16; Deferred |
| Contact-share as single off-platform predicate; money-ask held after share | AD-17 |
| CIL + public FR hosting line; cookie consent ≠ Photo reuse | AD-5, AD-19 |
| Dual-confirm marriage; counter only on both confirm; proof private | SOLUTION-DESIGN §6 `marriage_report` / `consent_story` |
| Name undecided; shortlist preserved | Spine header; SOLUTION-DESIGN lead |
| Farata three evidence labels only | Consistency Conventions |
| Open questions 1–11 listed as OPEN with a flexibility row each | AD-22; SOLUTION-DESIGN §15 |

Traceability table (SOLUTION-DESIGN §16) claims **FR-001–FR-143 = 143/143** and **NFR-001–NFR-009 = 9/9** via ranges. Range presence is not the same as an AD that would fail if the FR were ignored — see §9.

---

## 2. Quiet requirement the AD structure dropped: tone (no dating language)

This is the clearest “quiet requirement” miss.

**PRD locks (testable, not editorial):**

- §7 Platform: copy vocabulary *mariage / ta'aruf / nikah / khitba*. Banned: *dating / rencontre romantique*.
- FR-117 AC: programmatic SEO “contains no dating / *rencontre romantique* lexicon.”
- FR-137 AC: “When scanned against the banned lexicon, Then *dating* and *rencontre romantique* do not appear.”
- NFR-007 verification: “automated test that banned dating lexicon is absent.”
- §12 mosque-rumor control names “zero dating language” beside Académie + Advisory Board (FR-115, FR-116, FR-137).
- §2.2 / addendum risk 22: mosque rumor that this is dating is a launch-killing class of risk.
- Addendum §5 binding stance: “Copy vocabulary locked.”
- Mahram job (addendum §3): “read ward Chats without a dating-app identity.”

**What the spine encoded:** one Consistency Conventions cell — “no dating lexicon in copy keys.”

**What that drops:**

| PRD requirement | Spine / AD |
| --- | --- |
| Allowed vocab *mariage / ta'aruf / nikah / khitba* | Absent |
| Banned *rencontre romantique* (not only English *dating*) | Absent |
| Automated scan of **rendered** SEO + UI (FR-117, FR-137, NFR-007) | “copy keys” only — SEO body, audio transcripts, sanction macros, Académie, pricing, store listing are unbound |
| Governing AD | None. FR-117 maps to AD-22; FR-137 / NFR-007 map to AD-16 + AD-11 (Lite / Whisper honesty) |
| Mahram “not a dating-app identity” | AD-12 forbids browse/Invite; no copy/onboarding invariant |

Two content or web teams can ship a Tinder-shaped empty state, a “rencontre” SEO cluster, or dating-shaped Mahram onboarding without violating any AD. The mosque-rumor control the PRD treats as product-level is a convention footnote.

**Severity:** high. Quiet, easy to lose in stories, and the exact class of drop this reconcile is for.

---

## 3. A1–A3 wording fidelity

Spine header: “Assumptions A1–A3 stay as written in the brief/PRD.” SOLUTION-DESIGN §2 claims each is “Kept verbatim.” Only A3 is faithful. A2 is close. A1 is shortened and unbound.

### 3.1 A1 — Minimum age 19+ — **not verbatim, not an AD**

PRD FR-011 / §17 A1 (verbatim body):

> Minimum age is **19+** (Farata parity, conservative). Rationale: Farata Mentions légales Claimed 19+; stores rate Farata 17+ (iOS) / 18+ (Play) Offered (seen) as store ratings. A conservative floor reduces minor-adjacent risk in a matrimony product and matches the competitor’s published rule. **Flag for legal review:** Burkina Faso civil majority and marriage-age law, plus our own store ratings (likely 17+/18+), must be confirmed before launch. **If counsel requires 18+, the PRD will add extra protections for 18–21 rather than silently lowering the gate.**

SOLUTION-DESIGN §2 A1 keeps only: “minimum age is **19+** (Farata Mentions légales Claimed 19+). Flag for legal review of Burkina civil majority / marriage-age law and store ratings.”

Dropped from the verbatim body:

- Farata store ratings 17+ (iOS) / 18+ (Play) Offered (seen).
- The anti-silent-lower rule: counsel-driven 18+ ⇒ extra 18–21 protections, **not** a schema default of 18.

Spine has **no AD that binds 19+**. FR-011 is mapped to AD-8 + AD-19. Neither rule mentions age. Account seed field is `age_attested`, not a 19+ invariant. FR-134 AC (“age rating matches counsel’s gate (A1)”) has no AD.

A builder who only reads ADs can put `CHECK (age >= 18)` in identity and still be “compliant.” That is the exact silent-lower A1 forbids.

**Severity:** high. Launch-killing (minors, D39, store rating).

### 3.2 A2 — Wali / Mahram path — **kept; parenthetical trim only**

PRD §4.7 six steps vs SOLUTION-DESIGN §2 A2: steps 1–6 match (phone invite; OTP + declared relationship; Sister confirm; optional ID → “verified wali”; no kinship document; remove/report + cannot send as her).

Trim: PRD step 5 parenthetical “(avoids excluding orphans, converts, and families without papers)” is omitted. Normative rule intact.

AD-12 productizes A2 (enum, unmatched-friend rejected, no kinship docs, D38 revoke ≤60s). Legal flag on impersonation / deceased-father / constrained `other_mahram` is not restated on the AD — acceptable if A2 remains `[ASSUMPTION]`.

Additive product numbers (1-hour cooling-off, 7-day pending expiry, emergency hide 24h) are PRD `[ASSUMPTION]`s. Cooling-off and 7-day expiry are **absent** from AD-12 and from the mahram entity invariants. Emergency hide is a D38 gap — see §7.

### 3.3 A3 — Hosting deferred; CIL + public disclose — **verbatim; AD-5 correctly separate**

PRD FR-120 A3 body is restated in SOLUTION-DESIGN §2 A3, including “hosting-location **decision is deferred to architecture**.” AD-5 is tagged `[ASSUMPTION — legal review]` and says “A3 text is not rewritten.” Public FR disclosure string is specified. Launch gate = CIL authorisation before public traffic.

This is the intended inheritance: product assumption stays open; architecture adds a pick.

Nit: AD-19 does not carry NFR-002’s **72h breach notice** to Members and to CIL. SOLUTION-DESIGN §13 mentions it in prose; no AD binds it. See §9.

---

## 4. Open questions — 11 listed; PRD has 12; none of 1–11 closed

AD-22 binds “PRD §16 questions 1–11.” SOLUTION-DESIGN §15 gives a flexibility row for each of 1–11. None of those eleven is baked into a closed schema enum. That part of AD-22 holds.

| # | Still open in architecture? | Note |
| --- | --- | --- |
| 1 Polygamy / first-wife | Yes | No notification adapter unless counsel/sisters flip |
| 2 Fail-closed UX tolerance | Yes | Copy/wait from `operator_config`; state stays `hold` |
| 3 USSD/SMS cost | Yes | `UssdPort` flag off |
| 4 Imam names + Académie SLA | Yes | Content tables; no hardcoded scholars |
| 5 Free review SLA hours | Yes | `free_review_sla_hours` (working 24) |
| 6 Anonymous-mode (D36) | Yes | Flag + policy table; NEXT |
| 7 Brother clear Photo pre-accept | Yes, with a working default | `default_preaccept_clear_if_owner_unblurred` (working yes) — config, not enum. Matches PRD lean. Do not promote to schema default. |
| 8 GIF/sticker | Yes | `gif_picker=off` |
| 9 Native-speaker name check | Yes | Branding strings are config |
| 10 OAPI / WIPO / handles | Yes | Legal/ops; tokens replaceable |
| 11 Free Money / MTN MoMo | Yes | Catalog + adapters |

**PRD §16 item 12 is missing from AD-22.**

> 12. **Retention schedule:** legal must replace NFR-008 working numbers before launch.

AD-19 / SOLUTION-DESIGN §15 keep NFR-008 clocks as `[ASSUMPTION]`. They are **not** in the “stay OPEN” table AD-22 claims is complete. A builder who treats AD-22 as the full open-question set will think retention is decided.

**Severity:** medium. The clocks are still tagged assumption (not silently closed). The contract that “every §16 question stays open” is factually short by one.

---

## 5. Must-have coverage (PRD §6 → AD / module)

All six owner must-haves exist as modules and appear in the FR range map. None is deferred. The drops are **inside** the must-have: ACs with no AD that would fail if ignored.

| # | Must-have | Landed? | Quiet drop inside the must-have |
| --- | --- | --- | --- |
| 1 | Profiles / browse / Invite / accept / Chat | Yes — profiles, discovery, invites, chat | Photo-required-to-Invite (FR-016) not an invite invariant. Quiet decline (FR-042) unbound. Guided onboarding browse-vs-Invite-ready (FR-009) unbound. Ice Breakers (FR-047) have no entity. Message Flash Mahram-visible from minute one (FR-048) not in AD-12 (Flash lives on Invite, before `conversation`). |
| 2 | AI moderation on everything + report/ban | Yes — AD-10, AD-11, trust | FR-066 “15 minutes later still held, not auto-allowed” not in AD-10 (state machine implies it; no “never auto-allow after wall-clock”). Sender-facing published explanation (D6 honesty) unbound. False-report ladder (FR-086, 3/30d) unbound. |
| 3 | Photo privacy, both genders, three Reveal policies | Yes — AD-9 + `reveal_grant` | AD-9 does not say **Brothers get the same three policies** (FR-057 AC). D10 / FR-060 per-use campaign opt-in is not a field; AD-19 only blocks cookie→reuse. |
| 4 | Mahram-in-Chat | Yes — AD-12 | FR-080 family-involvement guidance mapped to mahram/AD-12 — it is copy. Emergency hide — §7. |
| 5 | Marriage success reporting | Yes — outcomes + data invariants | Showcase voice (du'a, not celebrities) is editorial; FR-099 mechanics are in the data model. Honest counter-at-0 is in SOLUTION-DESIGN §6, not an AD Rule. |
| 6 | Security + verification | Yes — AD-8, AD-13, AD-17 | Captcha (FR-007) ≠ rate limits. Sincerity pledge + entertainment reaffirmation (FR-005) not on `account`. Age gate — §3.1. |

Must-haves are **present**. They are not **closed** as AD-level invariants the way fail-closed and no-auto-renew are.

---

## 6. Fail-closed

**Landed.** AD-10: create `pending`; AI 5xx or timeout (>10s text / >30s media) → `hold`; never allow. Bio and Profile Photos included. AD-18 / AD-20: fail-closed incidents audited and metered. NFR-003 mapped. SOLUTION-DESIGN §8 step 6: “Never allow.” Chaos-test spirit of NFR-003 is implied by the state machine.

Gaps (do not undo the landing):

- FR-066 AC: hold after 15 minutes without a human stays held — not written on AD-10.
- NFR-003 allow-path **p50 < 3s / p95 < 10s** (text) and **p95 < 30s** (media) when AI is up — AD-10 has timeout ceilings only, not allow-path SLOs. Report p95 ≤ 24h lives in `operator_config` / FR-083, not an AD number (acceptable if config-owned).
- FR-067 / FR-142: incident count **must not be hidden** — AD-20 lists the metric; no “cannot hide” rule the way AD-5 forbids hiding hosting.

**Severity of gaps:** low–medium. The fail-open path is closed. The honesty/ops surface is thinner than the PRD.

---

## 7. Photo server-side

**Landed as a first-class AD.** AD-9 is the right shape: private bucket, auth then short-lived signed URL, originals never in list/grid/notification, revoke ≤60s, moderator unblur = audited grant not client decode, `FLAG_SECURE` as deterrence. SOLUTION-DESIGN §9 matches FR-056–FR-059 and FR-052 thumbs.

Deferred correctly: watermark / no-download (FR-061 / D9 NEXT); dual-control unblur (D31 NEXT).

Quiet drops around the AD, not inside it:

- Opposite-gender default (FR-056) vs same-gender self — AD-9 says “unauthorized viewers”; gender rule is implicit.
- Brother policy parity (must-have #3 / FR-057) — not in AD-9.
- FR-060 D10 per-campaign opt-in + expiry — no `marketing_grant` entity; mapped to AD-9 in the range table even though AD-9 is Blur/Reveal.
- Cached-bytes residual risk is acknowledged (good). Mass revoke / kill-switch (PRD addendum risk 24) is still not an FR **or** an AD.

**Severity:** medium for D10/Brother parity; server-side itself passes.

---

## 8. Mahram D38

D38 (Appendix A): “Sister can remove/Report abusive Mahram; emergency hide; cannot send as her” → FR-076, FR-077.

| D38 / FR-077 piece | Architecture |
| --- | --- |
| Cannot send as her | AD-12. Landed. |
| Sister remove | AD-12. Revoke read access ≤60s. Landed. |
| Sister Report | AD-12 names “remove/report (D38)”. SOLUTION-DESIGN §10: SMS to both sides. |
| Report opens a Moderator case | Not an AD or trust invariant. |
| Emergency hide: Profile hidden from browse 24h `[ASSUMPTION]` | **Dropped.** No flag, no `operator_config` key, no discovery rule. |

Addendum risk 16 (coercive Mahram) and risk 7 (fake Mahram) both name D38. The spine kept the access-revoke half and lost the safety-hide half. A Sister who Reports an abusive wali can lose him as a reader and still be grid-visible to him as a Member if he also has a suitor account — the PRD’s emergency path.

Related A2 product rules also unbound on AD-12: 1-hour cooling-off before pause/end; 7-day pending expiry; FR-048 Flash visible to Mahram from minute one (before conversation).

**Severity:** high for emergency hide (D38 incomplete). Medium for cooling-off / Flash-from-minute-one.

---

## 9. No silent auto-renew

**Landed.** AD-14: explicit `ends_at`, **no** renewal job, no stored recurring mandate, processor preference ignored. SOLUTION-DESIGN §6/§11: no `renew_at`. FR-106–FR-110 mapped to AD-14 + AD-21. Feature flag catalog does not include auto-renew.

Gaps around the money surface, not the renew rule:

- FR-106 / FR-138 / NFR-007: Mooré/Dioula **pricing-trust audio states no-auto-renew**. AD-16 audio is OTP / Invite / Mahram / blocking — not pricing-trust.
- FR-108 one transparent pricing page; checkout numbers match; launch vs normal shown — no AD.
- FR-109 CGV / refunds match pricing page — in the FR-104–110 range, no rule.
- FR-139 Operator cannot turn auto-renew on via config — AD-14 says no renewal job; a config key `auto_renew` is not forbidden. Safer to name it unsellable.

**Severity:** low for the core rule (it holds). Medium for pricing-trust audio / “Operator cannot enable renew.”

---

## 10. FR / NFR coverage gaps (range map ≠ governing AD)

SOLUTION-DESIGN §16: “Coverage: **FR-001–FR-143 = 143/143**. **NFR-001–NFR-009 = 9/9**.” “0 missing.”

Ranges assign a module + AD to a slice. Several MVP FRs have **no Rule that would fail** if omitted. That is the coverage gap.

### 10.1 FRs mapped to an AD that does not mention them

| FR | Mapped to | Why the map is decorative |
| --- | --- | --- |
| FR-005 sincerity pledge + entertainment reaffirmation | AD-8, AD-17 | Neither mentions pledge or Code of conduct |
| FR-006 email verification | AD-8 | Auth methods only |
| FR-007 captcha / bot check | AD-17 | Rate limits ≠ captcha |
| FR-009 guided onboarding (browse vs Invite-ready) | AD-16, AD-22 | Lite / open questions |
| FR-011 age 19+ | AD-8, AD-19 | See §3.1 |
| FR-013 published free-review SLA | AD-10, AD-22 | AD-10 is message pipeline, not Profile review queue |
| FR-018 named life-pauses deactivate | AD-8 | `status` exists; pauses unbound |
| FR-027 T&S mass-view 50/24h | AD-3, AD-16 | Visit entity; no threshold |
| FR-028 meeting-stage propose/confirm | AD-15, AD-12 | Stages exist; who may mark **meeting** (SM-2) unbound — known PRD thinness, still unowned |
| FR-042 quiet decline | AD-12, AD-21 | Not a Mahram/billing concern |
| FR-047 Ice Breaker templates | AD-12, AD-21 | No content ownership |
| FR-048 Flash visible to Mahram from minute one | AD-12 | AD-12 is attached **conversations** |
| FR-060 per-use marketing opt-in | AD-9 | AD-9 is Blur/Reveal |
| FR-080 family-involvement guidance | AD-12, AD-13 | Copy, not mahram domain |
| FR-086 false-report sanctions | AD-10, AD-18 | No 3/30d rule |
| FR-089 Code of conduct (entertainment = violation) | AD-10, AD-18 | No entertainment predicate |
| FR-108 / FR-109 pricing page + CGV | AD-14, AD-21 | Packs/webhooks only |
| FR-115 five scholar-reviewed articles | AD-22 | No seed count |
| FR-117 SEO banned lexicon | AD-22 | See §2 |
| FR-137 French-first + banned lexicon | AD-16, AD-11 | Lite + Whisper |

### 10.2 NFRs mapped but only partly bound

| NFR | Mapped to | Missing from those ADs |
| --- | --- | --- |
| NFR-001 | AD-8, AD-9, AD-13, AD-17 | PIN 5-fail lock; 60s background re-lock (FR-020). 15 min idle is in session invariants (good). |
| NFR-002 | AD-5, AD-19 | **72h breach notice** to Members and CIL. Lawful-basis documentation. |
| NFR-003 | AD-10, AD-11 | Allow-path p50/p95 when AI is up |
| NFR-005 | AD-4, AD-16 | Payload budgets landed (150KB / 80KB). Lab targets first grid ≤8s, Chat open ≤4s, send-text ack ≤2s — not in AD-16 |
| NFR-006 | AD-16, AD-4 | WCAG 2.1 AA, 44px targets, pictogram+audio completable without a paragraph. AD-16 is bandwidth. |
| NFR-007 | AD-11, AD-16 | Covered audio set includes **no-auto-renew** and **Mahram invite explainers**. Dating-lexicon automated test. Native-speaker sign-off. |
| NFR-008 | AD-19 | Clocks stay assumption (good). Not listed as OQ-12 (see §4). |

### 10.3 What the range map got right

FR-001–FR-004 identity methods; FR-014–FR-015 verification; FR-021–FR-025 profile/browse; FR-037 polygamy invariant (data model); FR-041 Sister consent; FR-044 quotas (working 3/15); FR-050–FR-055 chat/SMS/USSD; FR-056–FR-059 Blur/Reveal; FR-062–FR-067 / FR-068 pipeline + contact-share; FR-071–FR-079 Mahram core; FR-083–FR-085 / FR-090–FR-093 trust floor; FR-095–FR-101 outcomes; FR-104–FR-107 / FR-110 payments core; FR-132–FR-136 platforms + Lite; FR-139–FR-143 operator; NFR-004 billing isolation; NFR-009 audit list.

Those can stay range-mapped. The rows in §10.1 should not count as “covered” until an AD, entity invariant, or config key would fail the opposite behaviour.

---

## 11. Other quiet PRD locks (secondary)

Not in the assigned focus list; recorded so they are not mistaken for transfer.

- **Khalwa:** no live 1:1 A/V until Mahram **or** chaperoned meeting; live video even with Mahram is LATER. Deferred names “Live 1:1 A/V (LATER, khalwa)” — does not restate the Mahram-or-meeting exception. Fine if LATER stays unbuilt.
- **Woman’s consent first-class:** Chat only after Sister accept — invite invariant. Landed in SOLUTION-DESIGN §6, not an AD Rule.
- **Proof-backed counters only / no invented member counts (SM-C1):** FR-101 / FR-142 mapped; no AD that forbids a public DAU headline.
- **Boosts never bypass safety (D37):** NEXT + AD-22. OK.
- **Staff individual attribution:** AD-8, AD-18. Landed.
- **No staff bulk export:** AD-17. Landed.
- **Coarse geo; quartier hidden until accepted Invite:** AD-19. Landed.
- **married Brother must set polygamy_intent:** data model. Landed.
- **Gender immutable without operator+audit:** data model. Landed.
- **Advisory Board is not a mufti-bot / no “Cheikh” bot:** no AD. FR-116 / FR-124 NEXT.
- **Ouaga-French human sanction macros (§10 tone):** no AD (same class as §2).
- **PIN 60s background + 5-fail lock:** session idle 15 min only.

---

## 12. Findings (triaged)

### Critical

None. Fail-closed is not fail-open. Auto-renew is not scheduled. Originals are not client-decoded. A2/A3 are not rewritten into silent USA hosting or paywalled wali papers. Must-haves exist as modules.

### High

1. **Tone / banned dating lexicon is not an AD.** Convention “no dating lexicon in copy keys” does not bind FR-117, FR-137, NFR-007, allowed vocab, or *rencontre romantique*. Mosque-rumor control is unprotected at consistency-contract altitude.
2. **A1 is not verbatim and not bound.** SOLUTION-DESIGN shortens A1; no AD states 19+ or the “do not silently lower to 18” rule. FR-011 → AD-8/AD-19 is a paper map.
3. **D38 is incomplete.** Remove/report + 60s revoke + no send-as-her landed. FR-077 emergency hide (24h browse hide) and Report→case are absent.

### Medium

4. **§16 coverage claim is overstated.** 143/143 and 9/9 are range counts. Unbound MVP FRs include FR-005, FR-007, FR-009, FR-013, FR-042, FR-047, FR-048, FR-060, FR-080, FR-086, FR-089, FR-108, FR-109, plus NFR-002 72h breach, NFR-006 WCAG, NFR-007 pricing-trust audio / lexicon test.
5. **AD-22 “questions 1–11” omits PRD §16 question 12** (retention schedule). Clocks remain `[ASSUMPTION]` on AD-19 — not closed, not in the stay-open contract.
6. **Must-have #3 Brother Reveal parity and D10 marketing grants** sit beside AD-9, not inside it.
7. **Fail-closed honesty extras** (15-minute no-auto-allow, Operator cannot hide incident count, allow-path p50/p95) are thinner than FR-066 / FR-067 / NFR-003.
8. **No-auto-renew audio + “Operator cannot enable renew via config”** are thinner than FR-106 / FR-138 / FR-139.

### Low

9. A2 parenthetical (orphans/converts/papers) trimmed.
10. A2 cooling-off (1h) and pending expiry (7d) not in AD-12.
11. Captcha, sincerity pledge, Ice Breakers, quiet decline, family-guidance copy — product FRs without a home invariant.
12. Khalwa exception wording on the Deferred live-A/V line.
13. SM-C1 vanity-headline forbid is not an AD.

---

## 13. Suggested spine repairs (not applied)

This review does not edit the spine. If a later distill absorbs findings:

1. Add **AD-23 Copy lexicon** (or extend Consistency Conventions to a Rule): allowed *mariage / ta'aruf / nikah / khitba*; banned *dating / rencontre romantique* on rendered UI, SEO, audio transcripts, store listing; automated test. Bind FR-117, FR-137, NFR-007.
2. Quote **A1 in full** on SOLUTION-DESIGN §2; add a one-line AD-8 (or AD-13) Rule: minimum attested age 19+; schema must not default to 18; counsel-driven 18+ is extra 18–21 protections, not a silent lower. Bind FR-011, FR-091, FR-134.
3. Extend **AD-12** with D38 emergency hide (config hours, working 24) + Report opens a trust case; mention Flash-from-minute-one (FR-048) on invite-or-conversation read scope.
4. Add FR-060 `marketing_grant` (per campaign, expires) under media or content; state Brother Reveal policy parity on AD-9.
5. AD-22 table: add row **12 Retention schedule** → AD-19 clocks stay `[ASSUMPTION]`.
6. Narrow SOLUTION-DESIGN §16: keep range rows for true slices; mark §10.1 FRs as “module only, no governing AD” until a Rule exists.
7. AD-14: forbid an `auto_renew` config key; AD-16 covered audio set includes pricing-trust (no-auto-renew).
8. AD-10: hold never auto-allows on wall-clock; AD-20: fail-closed count is not hideable.

---

## 14. What this review is not

Not a spine edit. Not a start of UX, spec, epics, or another BMAD skill. Not legal advice. Not a re-open of AD-5’s Scaleway pick.
