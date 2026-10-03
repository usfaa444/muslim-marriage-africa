---
title: Input reconciliation — brief-muslim-marriage-africa-2026-09-27
status: complete
created: 2026-09-27
updated: 2026-10-01
input: briefs/brief-muslim-marriage-africa-2026-09-27 (brief.md + addendum.md + .memlog.md)
against: prds/prd-muslim-marriage-africa-2026-09-27 (prd.md + addendum.md)
---

**Superseded in part on 2026-10-01.** Locked decision (Maitchibi Fayçal): AI moderation is passive. Rows and gaps below that require fail-closed pre-delivery, hold-on-timeout, or pre-delivery block/hold rates as current PRD behavior are historical. Current `prd.md` delivers Chat immediately, then scans; SM-4 counts flags and scan-deferred events. Other gaps in this reconcile are not closed by that decision.

**Superseded in part on 2026-10-02.** Locked decision (Maitchibi Fayçal): Sister access is admin-configurable (`sister_reach_mode`: `free_unlimited` DEFAULT | `same_quota_as_brothers`). Sentences below that treat sister reach as always free, unlimited, or “never pay” are historical. Safety and Chat after accept stay free. D20 stays, reframed.

# Reconcile: product brief → PRD

PRIMARY input: `brief-muslim-marriage-africa-2026-09-27` (`brief.md`, `addendum.md`, `.memlog.md`).
Compared against: `prd.md` + PRD `addendum.md`. Brief memlog decisions treated as binding stance, not process noise.

This is extract-and-gap, not a rewrite. Citations are file + section (or FR/SM id).

---

## 1. What transferred

The brief’s “What the PRD must preserve” (brief.md §What the PRD must preserve, items 1–10) largely landed.

| Brief spine | Where it lives in the PRD |
| --- | --- |
| Working title + name TBD; shortlist Nisfuddin / Nikahsira / Sakinaa; alternates Mithaqun / Nonglem | `prd.md` title blurb; Document control **Name**; PRD addendum §2.7 + §6 |
| Vision: Ouaga/Bobo honorable path; face not sold; father reads Chat; Orange Money; verified marriages from 0 | `prd.md` §1 Vision (near-verbatim of brief.md §Vision) |
| Wedge vs Farata; three evidence labels only | `prd.md` §0; §9 Why now; Appendix A preamble |
| Six owner must-haves as MVP | `prd.md` §6 Must-have coverage + Appendix A |
| Complete P1–P59 and D1–D40, no drops, split slices | Appendix A (118 rows; 99 unique ids) |
| Platforms: web + PWA + store-listed Android MVP; native iOS NEXT, not dropped | `prd.md` §7; FR-004 / FR-132–FR-135; P36 rows |
| Freemium XOF; dignity never paywalled; 1/3/6; no silent auto-renew; mobile-money first | `prd.md` §8; FR-104–FR-110 |
| Copy lexicon *mariage / ta'aruf / nikah / khitba*; ban *dating / rencontre romantique* | §7; FR-117 AC; NFR-007 |
| Khalwa-safe: no live A/V until Mahram or chaperoned meeting; live video even with Mahram is LATER | §7; Non-Goals |
| Woman’s consent; quiet decline; no guilt timer | FR-039, FR-041, FR-042 |
| Fail-closed pre-delivery on every modality *(brief spine; PRD correction 2026-10-01 delivers Chat then scans)* | FR-062–FR-067, FR-144; NFR-003 (send-first + scan-deferred) |
| North star = chaperoned meetings + dual-confirmed nikah | §1; §15 SM-1 / SM-2 |
| A1–A3 tagged [ASSUMPTION] and flagged for legal review | FR-011, §4.7, FR-120; §17 |
| Open questions 1–11 from the brief | `prd.md` §16 (plus new #12 retention) |
| Full 30-row risk table; personas/JTBD; options considered | PRD addendum §§2–4 |
| Binding stance list | PRD addendum §5 |
| Exact Premium band ~4 900–5 900 XOF/month; free Brother quota ~3/day | Brief memlog + brief.md §Pricing stance → `prd.md` §8, FR-044, §17 |
| P58 Free Money / MTN MoMo as later-country rails | FR-114; Appendix A |

Capability-level transfer is strong. FR-018 (named life-pauses: Ramadan, exams, travel, grief), FR-023 (completeness meter without shaming), FR-046/FR-048 (Message Flash wali-visible from minute one), FR-068 (in-Chat “never send money to a suitor”), FR-070 (pictogram + audio photo rules), and FR-105 (dignity never paywalled) all carry brief notes that could have been lost in a thinner PRD.

---

## 2. Qualitative ideas (tone / voice / feel) the FR structure silently dropped

These are in the brief’s narrative, JTBD, or addendum personas. The PRD keeps some as Vision / §10 Aesthetic / journey prose, but **no FR acceptance criterion** would fail if UX shipped the opposite feel.

### 2.1 Visual keepsake cited, then missing

`prd.md` §10: “Brainstorm keepsake (indigo/sand/gold, mihrab, *sira*) is a hint only — see addendum.”

PRD `addendum.md` has **no** indigo / sand / gold / mihrab / *sira* visual note. Brief addendum also never stored that keepsake (it is process overflow from the brainstorm). Downstream UX is pointed at a file that does not contain the hint. Tone/feel of a solemn *sira* path has no artifact home.

### 2.2 “Not a swipe feed” vs grid-only implication

Brief.md §The solution: “makes ta'aruf a **visible process, not a swipe feed**.”
Brief addendum §2 Brothers: “without endless swipe → P16–P20 with marriage-criteria first.”

`prd.md` §10 says “Solemn marriage path, not swipe culture.” FR-025 specifies a **grid**. Nothing forbids a card-stack / Tinder-shaped browse as an additional surface. The anti-swipe *feel* is editorial, not a requirement.

### 2.3 Sanction-macro voice (Ouaga French, human)

Brief addendum §2 Moderators: “**Tone:** French macros that are respectful when warning a member in Ouaga French → templated, reviewed sanction language.”

`prd.md` §10: “Member-facing voice is respectful Ouaga French; sanction macros stay human.”
PRD addendum §3 Aïcha: same tone line.

FR-066 requires a “distinct, published explanation.” FR-085 covers the ladder. **No FR requires reviewed, respectful Ouaga-French macros.** A cold/legalistic or Dakar-slang sanction voice would still pass.

### 2.4 “Du'a, not celebrities”

Brief.md §Who this serves — Married couples: “Help others make du'a without becoming celebrities.”
Brief addendum §2: “our story should help others make du'a, not turn us into celebrities → faces optional/blurred, no chat excerpts.”

UJ-5 and the jobs list keep the sentence. FR-099 ACs are mechanical (faces optional/blurred, no Chat excerpts, either spouse can refuse). The **voice** of the showcase (du'a aid vs celebrity reel) is not testable. A glossy couple-influencer layout would still pass FR-099.

### 2.5 “Suitor, not a player” / “not a liar before Allah”

Brief.md §Who this serves — Brothers: “be seen as a suitor, not a player.”
Brief addendum §2: married-brother job “honest so I am not a liar before Allah → D14 + P3 pledge wording that names honesty about existing marriage.”

UJ-2 title and FR-005 (“Copy names honesty about existing marriage”) carry the pledge *content*. There is no FR that the product *feels* like a suitor path (quota copy, Ice Breaker framing, empty states). Spray-and-pray UX with a legalistic pledge checkbox would still pass FR-005 + FR-044.

### 2.6 Wali “not a dating-app identity”

Brief.md §Who this serves — Walis: “not a dating-app identity.”
Brief addendum §2 Walis: “see my ward’s conversations without creating a dating-app identity.”

UJ-3 states it. Implementation is an `[ASSUMPTION]` on UJ-3 step 8 / FR-071: “Mahram accounts cannot send Invites or appear in the grid.” That is a journey note, not a first-class FR title with ACs covering browse identity, dating-shaped onboarding, or profile-as-suitor. Easy to lose in stories.

### 2.7 Small-city mosque-trust feel; kill-switch not an FR

Brief.md §The problem: “A leak or a trapped account in a small city kills mosque trust.”
Brief.md §Top risks: Photo leaks control includes “**kill-switch + mass revoke**” alongside D8 + D9 NEXT.
Brief addendum risk 24: “Viral indecent leak — Kill-switch, mass revoke of reveals, user notification, transparency note (D7 / D9).”

`prd.md` §12 lists Photo leaks as “FR-056–FR-059; D9 NEXT.” FR-059 is per-viewer Revoke. **No FR for a kill-switch, mass revoke, user notification, or transparency note.** PRD addendum risk 24 still names those controls, but they are not requirements. The mosque-trust *feel* is unprotected at the capability layer.

### 2.8 Transferred qualitative (not dropped) — for the record

These *did* become testable:

- Quiet decline / no guilt timer / brother sees not-accepted only → **FR-042**
- Completeness meter without shaming → **FR-023**
- Haya-default Blur; per-viewer Reveal/Revoke → **FR-056–FR-059**
- Default pseudonym + city-level geo; quartier hidden until match → **FR-001**, **NFR-002**
- Shared/low-end Android, ~1GB/month → UJ-1, **FR-136**, **NFR-005**
- Entertainment-seeking as non-marriage use → **FR-089**, Non-Goals
- Family involvement described as honorable, optional, Sister-initiated → **FR-080**

---

## 3. A1–A3 wording fidelity

All three bodies are marked “verbatim” and the **normative sentences match the brief**. Two fidelity nits.

### A1 — Minimum age 19+

Brief.md §A1 vs `prd.md` FR-011: body is character-faithful (19+; Farata Mentions légales Claimed 19+; store 17+/18+ Offered (seen); legal flag; if counsel requires 18+, add 18–21 protections rather than silently lowering the gate).

No wording drift. Placement is correct (FR-011 + §17).

### A2 — Wali verification in MVP

Brief.md §A2 vs `prd.md` §4.7 lead-in: the six-step path is identical (invite by phone; OTP + declared relationship; Sister confirms; optional ID → “verified wali”; **no kinship document in MVP**; remove/report + cannot send as her). Rationale and legal-flag paragraph match, including cooling-off and “wali cannot be an unmatched male friend.”

Fidelity: **verbatim.** Productization adds `[ASSUMPTION]` numbers the brief did not lock (1-hour cooling-off, 7-day pending expiry) on FR-072/FR-073 — additive, not contradictory.

### A3 — Data residency and CIL

Brief.md §A3 vs `prd.md` FR-120: body is verbatim, **including the leftover clause** “We will not pretend a region pick **in a product brief**.”

That sentence is now false in situ. The assumption lives in a PRD. Normative content (hosting deferred to architecture; CIL compliance; public hosting disclosure; legal flag on filing, lawful basis, cross-border, retention vs Farata-like 2-year keep, 72h breach) is intact. The document-type leftover is the only A3 wording defect.

---

## 4. P/D horizon mismatches

Appendix A preamble claims “Horizons match the brief.” Two slices **do not**.

### 4.1 P16 confrérie + hijra — conditional MUST collapsed to NEXT

| Source | Horizon language |
| --- | --- |
| Brief.md P16 split | “**parity — deferred to NEXT** *if not cheap enough for MUST*. Extra taxonomy. **Include in MVP if cheap.**” |
| `prd.md` FR-022 / FR-029 / Appendix A | “PRD treats NEXT” / “`[ASSUMPTION]` treat as NEXT in this PRD so architecture does not assume them.” |

The brief left a cheapness door open. The PRD closed it. §17 records the assumption. Downstream that treats Appendix A as “the brief’s horizons” will skip a MUST-if-cheap slice the brief still allowed.

### 4.2 D27 USSD — MUST-if-feasible collapsed to NEXT

| Source | Horizon language |
| --- | --- |
| Brief.md D27 USSD | “**MUST if feasible; otherwise NEXT**” (tier P2, rank 43) |
| Brief.md Open questions | “SMS is MUST; USSD is MUST-if-feasible.” |
| `prd.md` FR-055 / §11 / §16 Q3 / Appendix A | “`[ASSUMPTION]` USSD is NEXT (cost/operator unknown).” / “PRD treats NEXT pending operator cost.” |

The PRD is honest about the collapse, but the **label change is real**: brief = MUST pending feasibility; PRD = NEXT unless later revived. SMS (D27 MVP slice, FR-053) is correctly MUST.

### 4.3 Horizons that match (not gaps)

P2 Apple, P16 core, P18–P20, P22/P23 vanity slices, P24–P27, P32 AI Ice Breakers, P33 GIFs, P36 iOS, P49, P50/P52 splits, P51/P53 NEXT+LATER, P54, P56 remaining perks, P58 Free Money/MTN, D2/D3/D9, D12 polish, D18 EN/AR LATER, D21–D23 splits, D24 MUST stages, D25–D26, D28–D40 (except USSD as above) — all match brief.md tables.

D3 “NEXT (full)” + D24 lightweight **meeting** stage as MUST: Appendix A is consistent. **Implementation hole:** FR-028 *names* stage **meeting** but its ACs only cover invite / chat / married. There is no AC for *who marks meeting* or what “lightweight” means. SM-2 depends on that missing action. Brief.md §Success metrics: “D3 full is NEXT; a lightweight ‘meeting’ stage in D24 is MUST.” The horizon is right; the MUST slice is underspecified.

D-rank / P0–P3 tier numbers from brief.md §D1–D40 are not reproduced (PRD uses MVP/NEXT/LATER only). Acceptable compression if horizons stay faithful — they mostly do, except 4.1–4.2.

---

## 5. Pricing / metrics / name gaps

### 5.1 Pricing — mostly transferred; two soft gaps

Transferred from brief.md §Pricing stance + brief memlog:

- Freemium XOF; dignity stack never paywalled *(safety still true; “sisters never pay for reach” superseded 2026-10-02 — default `free_unlimited`, Operator can set `same_quota_as_brothers`)*
- Brothers pay for reach/convenience
- One transparent pricing page; launch vs normal disclosed (FR-108)
- 1 / 3 / 6 months; no silent auto-renew even if processor wants it (FR-106)
- Orange Money BF, Moov Africa BF, Wave/Coris; cards secondary (FR-107)
- Working band **~4 900–5 900 XOF/month**; cheaper 3- and 6-month packs; do not race to 0 FCFA (`prd.md` §8 — same numbers and Farata 5 900 / 9 900 Claimed reference)
- Free-tier Brother quota **~3/day** locked as `[ASSUMPTION]` **3 Invites per UTC day** (FR-044)
- P56 remaining perks (HD 10 photos, unlimited coach, priority 7/7, &lt;10 min validation) stay NEXT (FR-113)
- Boosts cannot bypass safety (FR-111, D37)

Gaps:

1. **Premium quota number is unset.** Brief only required the PRD to lock the *free* quota. FR-044 says “Premium raises the published quota” with no number. Fine as an Operator config (FR-139) but not called out as still-open the way 3/day is.
2. **“Explore Orange/Moov identity”** (brief.md P2 notes) is not an FR. FR-003 only forbids Google-only. Exploration lives in PRD addendum §1 Identity row. Easy to drop from stories.

### 5.2 Metrics — Safety class incomplete in the SM table

Brief.md §Success metrics classes vs `prd.md` §15:

| Brief class | Brief metric | PRD |
| --- | --- | --- |
| Outcome | Dual-confirmed marriages (D11); counter at 0 | **SM-1** — transferred |
| Outcome | Chaperoned / family meetings (D24 MUST slice) | **SM-2** — transferred, but see FR-028 hole |
| Trust | Verified members by level; never sell “looks verified” | **SM-3** — transferred |
| Safety | **Pre-delivery block / hold / human-review rates** | **Superseded 2026-10-01.** SM-4 now counts passive-scan flags, admin warning/suspend/other-action rates, and scan-deferred events. Pre-delivery hold rates are no longer the product. |
| Safety | Report SLA met (24h); strike → ban completions | **SM-4** — transferred |
| Safety | Appeal overturn rate | **SM-C3** (counter-metric) — reframed, not dropped |
| Safety | **Fail-closed incidents counted, not hidden** | **Superseded 2026-10-01.** SM-4 + FR-067 / FR-142 count **scan-deferred** events, not fail-closed holds. |
| Dignity | Blur share; reveal-revoke; wali-attached chats; sister-initiated requests | **SM-5** — transferred |
| Local fit | Android+PWA Ouaga then Bobo; Orange Money/Moov checkout; audio-onboarding | **SM-6** — transferred |
| Honesty | Proof-backed counters only | **SM-C1** + FR-101 — transferred |

**Superseded 2026-10-01.** D4/D6/D32 now mean deliver-then-scan, honest “AI flags a human,” and scan-deferred visibility. SM-4 names flag rates and scan-deferred counts. The brief’s pre-delivery / fail-closed safety class is no longer the product.

### 5.3 Name — shortlist transferred; decision-gate detail thinned

| Brief.md §Naming | PRD |
| --- | --- |
| Product name not decided; no domain bought | Transferred (title, Non-Goals, Document control) |
| Shortlist + alternates | Transferred (one line in `prd.md`; table in addendum §6) |
| Nisfuddin meaning + **also consider `nisfdin`** | Addendum §6 only — **not in `prd.md` header** |
| Nikahsira = *nikah* + Jula *sira*; native-speaker check | Meaning in addendum §6; slang/taboo in §16 Q9 |
| Sakinaa; **`sakina.com` / `.net` taken** | Addendum §6 |
| **.com / .net free columns** for all five | **Dropped** (addendum has no availability table) |
| RDAP **2026-09-27 ~21:10 ET**; HTTP 404 = free at check time; **not a purchase/reservation/hold**; premium/reserved + trademark **not checked** | Timestamp in addendum §2.7 / §6; **HTTP 404 meaning and “premium/reserved not checked” dropped** |
| Pending: native-speaker (slang/taboo); **OAPI + WIPO**; social handles; **user test with sisters, brothers, and walis in Ouaga and Bobo** | Q9–Q10 cover native-speaker + OAPI/handles; addendum §6 says “user test in Ouaga/Bobo” **without the three actor types** |

`prd.md` header is a one-liner. Anyone who only reads the PRD spine will not know `nisfdin`, that `sakina.com` is taken, that RDAP was point-in-time, or that name-decision requires a three-actor user test.

---

## 6. Other extract notes (not the asked gap classes)

- Brief.md P8 “Honest SLA hours are an open question” → PRD keeps Q5 and adds working **24h Free** (FR-013). Lock-forward, not a drop.
- Brief.md P2 “Explore Orange/Moov identity” — see §5.1.
- Brief D-rank / P0–P3 columns omitted; horizons used instead.
- Kill-switch / mass revoke: brief launch-killing control; no FR (see §2.7).
- FR-028 meeting-stage action unspecified (see §4.3).
- New PRD-only material (UJ protagonists, Operator role, NFR-008 working retention, numbered FRs) is additive, not a brief contradiction.
- Brief addendum Dannaya (`.com` taken / `.net` free, not on shortlist) is preserved in PRD addendum §2.7.

---

## 7. Gap list (for parent summary)

1. **Visual / swipe / sanction / du'a / suitor / wali-identity feel** — §10 and journeys only; FRs would pass a dating-shaped or celebrity-shaped UX (see §2).
2. **A3 leftover “in a product brief”** — verbatim paste is stale in the PRD (see §3).
3. **P16 hijra/confrérie and D27 USSD** — brief MUST-if-cheap / MUST-if-feasible flattened to NEXT; Appendix A overclaims horizon match (see §4).
4. **Safety metrics** — **Superseded 2026-10-01.** Pre-delivery block/hold rates are no longer required. SM-4 now tracks flags, admin actions, and scan-deferred events (see §5.2).
5. **Name decision-gate** — RDAP/404 caveats, `.com/.net` table, `nisfdin`, three-actor user test thinned out of the PRD spine (see §5.3).

Related: kill-switch + mass revoke has no FR; FR-028 has no AC for marking the MUST meeting stage.
