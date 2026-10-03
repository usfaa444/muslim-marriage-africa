---
title: Input reconciliation — docs/competitor-farata.md
status: extract
created: 2026-09-27
input: docs/competitor-farata.md
compared: prd.md, addendum.md
---

# Reconcile: competitor-farata.md vs PRD

Extract-only. Does not add Farata facts. Does not start UX, architecture, or epics.

**Superseded in part on 2026-10-01.** Locked decision (Maitchibi Fayçal): AI moderation is passive. Rows below that treat D4 as pre-delivery block/hold are historical. Current `prd.md` delivers Chat then scans. `docs/competitor-farata.md` D4 was corrected the same day.

**Superseded in part on 2026-10-02.** Locked decision (Maitchibi Fayçal): Sister access is admin-configurable (`sister_reach_mode`: `free_unlimited` DEFAULT | `same_quota_as_brothers`). Rows below that treat D20 as “Sisters unlimited / never pay / start Invites free” as a hardcoded rule are historical. Safety stays free. D20 stays, reframed (FR-045, FR-105, FR-145).

**Superseded in part on 2026-10-02 (later lock).** People lists default to one focused card (optional grid). Free-tier messages are daily-capped (FR-146); Premium is unlimited Invites and unlimited messages (Premium Invite cap of 15 deleted). Mahram reads only granted threads (FR-074). Sentences below that say browse is only a grid, Chat after accept is always free of any cap, or a Mahram reads all chats are historical.

**Input:** `/workspace/projects/muslim-marriage-africa/docs/competitor-farata.md`  
**PRD:** `prd.md` (evidence rule §0; Vision §1; Features §4; NFRs §5; Why now §9; Appendix A)  
**Addendum:** `addendum.md` (§1 stack note; §2 options; §4 risks; §5 binding stance)  
**Scope of this input:** **P1–P59** (parity) and **D1–D23** (differentiators). **D24–D40 are brainstorm, not this doc** — they appear in Appendix A because later planning added them; they are out of scope for “did this teardown get dropped.”

Farata statements in the PRD/addendum must use only the three labels from the input: **Offered (seen)** / **Claimed (marketing)** / **Not publicly evidenced**. No new unsourced competitor claims.

## 1. Required checks

| Check | Verdict |
| --- | --- |
| Every **P1–P59** appears | **Pass.** All 59 ids are in Appendix A (some split across MVP/NEXT/LATER slices). None silently dropped. |
| Every **D1–D23** appears | **Pass.** All 23 ids are in Appendix A (D12, D18, D22, D23 split). None silently dropped. |
| **D24–D40** | **Not this input.** Brainstorm 2026-09-27. Present in Appendix A; do not treat presence/absence as a Farata-doc miss. |
| Evidence labels used correctly | **Mostly.** Three mis-applications and habitual abbreviation of `Claimed (marketing)` → `Claimed`. See §4. |
| No new unsourced Farata claims | **Pass with one stretch.** No invented Farata features. “Vercel/Neon **USA** as Claimed processors” adds a geography the input states as analyst inference (gap 10), not a Farata-labeled claim. See §4.3. |

**Conflicts with input intent:** none that drop a required P/D id. The input said nothing may be dropped silently; deferred items must be marked with a reason. Appendix A does that. Thinning inside an id (P17 filters, P46 crypto/DPA) is the real miss, not a missing row.

## 2. What the input actually requires

### 2.1 Method and labels (binding on PRD copy)

Public-pages-only teardown (2026-09-27). No account created. Three labels only:

| Label | Meaning |
| --- | --- |
| **Offered (seen)** | Public page, shipped UI in the public JS bundle (*[bundle]*), or store-listing **structured facts** (downloads, rating, version) |
| **Claimed (marketing)** | Marketing, FAQ, store description, or legal text; working feature not seen (behind login) |
| **Not publicly evidenced** | Searched, not found. Does not prove Farata lacks it |

A Play **user review** is third-party reportage, not Offered (seen). Store **copy** (feature paragraphs, coach names) is Claimed (marketing), not [bundle].

### 2.2 Carry rule

§6–§8: **P1–P59** as parity requirements; **D1–D23** as differentiators; each traceable. Silent drops forbidden. Deferrals need a reason. SCAMPER/brainstorm extras are a later phase — that is **D24–D40**, not this file.

### 2.3 Twelve gaps the input named as differentiation fuel (§5)

1. No mahram/wali-in-chat product (policy only).  
2. AI-moderation homepage vs FAQ contradiction; voice/chat-photo moderation not evidenced.  
3. No marriage-success reporting / verified stories.  
4. Blur all-or-nothing, reveal-on-acceptance; no per-viewer reveal/revoke.  
5. Profiles usable in ads by default (rules §07).  
6. Account deletion reported broken; Gmail support.  
7. Opaque/inconsistent pricing and quotas; verified-looking badge sold with Premium.  
8. Scale claims vs Play 10k+ / few ratings.  
9. Senegal-first, French-only; Burkina is SEO; no Mooré/Dioula, no BF rails, no CIL.  
10. Entity mismatch: Senegalese *entreprise individuelle* vs **JAABA LLC (Delaware)** as app publisher; USA hosting.  
11. Broken Académie URLs (404); leaked AI-prompt in a blog post; coach persona split (Moussa vs Amadou).  
12. “Cheikh” coach framed as religious authority.

## 3. ID appearance — P1–P59 and D1–D23

Horizon and FR ids from Appendix A. “Fidelity” is whether the **input’s wording** survived, not whether a row exists.

### 3.1 Parity P1–P59

| ID | Appendix | Horizon (earliest) | FR / NFR | Fidelity vs input wording |
| --- | --- | --- | --- | --- |
| P1 | Yes | MVP | FR-001 | Full |
| P2 | Yes (2 rows) | MVP Google; NEXT Apple | FR-003, FR-004 | Full; Apple deferred with store-compliance reason |
| P3 | Yes | MVP | FR-005 | Full; honesty-about-marriage copy added (ours) |
| P4 | Yes | MVP | FR-006 | Full |
| P5 | Yes | MVP | FR-007 | Full |
| P6 | Yes | MVP | FR-008 | Full |
| P7 | Yes | MVP | FR-009, FR-010 | Full; raised with audio split |
| P8 | Yes | MVP | FR-012, FR-013 | Full; SLA honest, Farata numbers labeled Claimed (marketing) |
| P9 | Yes | MVP | FR-014, FR-015 | Full; raised free / not Premium (D13) |
| P10 | Yes | MVP | FR-016, FR-056 | Full |
| P11 | Yes | MVP | FR-017 | Full |
| P12 | Yes | MVP | FR-018 | Full; named life-pauses are ours |
| P13 | Yes | MVP | FR-019 | Full; raised (D15) |
| P14 | Yes | MVP | FR-011, FR-091 | Full; 19+ A1 |
| P15 | Yes | MVP | FR-021 | Full as **fields** (incl. origin) |
| P16 | Yes (2 rows) | MVP core; NEXT confrérie/hijra | FR-022, FR-029 | Deferred slice has a reason |
| P17 | Yes | MVP | FR-024 | **Thinned.** Input: age, origin, location, distance, marital, religious, life plans, **relevance sort**. FR-024 lists location, marital, religious, life plans, distance. **Age, origin, relevance sort** are not in the FR or its ACs. UJ-1 step 6 also omits them. |
| P18 | Yes | NEXT | FR-030 | Deferred with reason |
| P19 | Yes | NEXT | FR-031 | Deferred with reason |
| P20 | Yes | NEXT | FR-032 | Deferred with reason |
| P21 | Yes | MVP | FR-025 | Full |
| P22 | Yes (2 rows) | MVP list; NEXT who-favourited | FR-026, FR-033 | Split with reason |
| P23 | Yes (2 rows) | MVP T&S; NEXT member list | FR-027, FR-034 | Split with reason |
| P24 | Yes | NEXT | FR-035 | Deferred with stalking reason |
| P25 | Yes | NEXT | FR-111 | Deferred with reason; D37 attached |
| P26 | Yes | NEXT | FR-112 | Deferred; must not say *vérifié* |
| P27 | Yes | NEXT | FR-036 | Deferred; Farata mode unknown (label abbreviated — §4) |
| P28 | Yes | MVP | FR-038–FR-041 | Full; Sister-consent raise is ours |
| P29 | Yes | MVP | FR-043 | Full |
| P30 | Yes | MVP | FR-044, FR-045 | Full; Sisters unlimited (D20) *(superseded 2026-10-02: default `free_unlimited`; Operator can set `same_quota_as_brothers`; FR-145)* |
| P31 | Yes | MVP | FR-046, FR-048 | Full |
| P32 | Yes (2 rows) | MVP templates; NEXT AI | FR-047, FR-049 | Split with reason |
| P33 | Yes (2 rows) | MVP chat; NEXT GIFs | FR-050, FR-054 | Split with reason |
| P34 | Yes | MVP | FR-051, FR-064 | Full; not paywalled (ours) |
| P35 | Yes | MVP | FR-052 | **Slight thin.** Input: pushes for messages, requests, **profile visits**. FR-052: messages, Invites, visit signals “as configured” / internal. Member-facing visit push is not an AC. |
| P36 | Yes (3 rows) | MVP web/PWA/Android; NEXT iOS | FR-132–FR-135 | Full; iOS not dropped. PWA **shortcuts** (Profils / Messages / Demandes) from S13 are not specified. |
| P37 | Yes | MVP | FR-062 | Full; raised by D4 |
| P38 | Yes | MVP | FR-069 | Full (3 / 24h floor) |
| P39 | Yes | MVP | FR-070 | **Policy thin.** Input photo rules also: hijab recommended for sisters (S3). FR-070: modest, recent, real, no third parties. Hijab line not carried. |
| P40 | Yes | MVP | FR-056, FR-057, FR-059 | Full; raised to D8 |
| P41 | Yes | MVP | FR-083 | Full (24h) |
| P42 | Yes | MVP | FR-084 | Full |
| P43 | Yes | MVP | FR-085, FR-086 | Full |
| P44 | Yes | MVP | FR-089, FR-088 | Full |
| P45 | Yes | MVP | FR-080 | Full; plus product D1 |
| P46 | Yes | MVP | FR-120, NFR-002, NFR-008 | **Thinned.** Input: encryption in transit/at rest, hashed passwords, encrypted backups, data-subject rights, **DPA**, 72h breach, retention. Hashed passwords (NFR-001), 72h (NFR-002), retention/erasure (NFR-008) land. **TLS / at-rest encryption, encrypted backups, and a published DPA** are not named as product requirements. |
| P47 | Yes | MVP | FR-119 | Full |
| P48 | Yes | MVP | FR-118 | **Partial.** Ticket + FAQ + misuse routing. Farata’s **automatic** contact-form AI triage that rejects matchmaking requests (S12 [bundle]) is not an AC. |
| P49 | Yes | NEXT | FR-124 | Deferred with D21 reason |
| P50 | Yes (2 rows) | MVP seed; NEXT full | FR-115, FR-121 | Full; public 200s (fixes input 404s) |
| P51 | Yes (2 rows) | NEXT / LATER | FR-122 | Deferred with reason; leaked-prompt lesson kept |
| P52 | Yes (2 rows) | MVP BF trio; NEXT rest | FR-117, FR-125 | Full |
| P53 | Yes (2 rows) | NEXT / LATER | FR-123 | Deferred with reason |
| P54 | Yes | NEXT | FR-102 | Deferred; not a fake-marriage hero |
| P55 | Yes | MVP | FR-104 | Full |
| P56 | Yes (2 rows) | MVP core; NEXT remaining perks | FR-105, FR-110, FR-113 | Split with reason. Remaining-perk list (HD 10, coach, 7/7, &lt;10 min) is unlabeled Farata restatement — §4. |
| P57 | Yes | MVP | FR-106 | Full |
| P58 | Yes (2 rows) | MVP BF; NEXT Free Money/MTN | FR-107, FR-114 | Full; later-country reason |
| P59 | Yes | MVP | FR-109 | Full (homepage-vs-CGV) |

**Parity count check:** 59 unique P ids. Split rows do not create new ids.

### 3.2 Differentiators D1–D23

| ID | Appendix | Horizon (earliest) | FR / NFR | Fidelity vs input wording |
| --- | --- | --- | --- | --- |
| D1 | Yes | MVP | FR-071–FR-079 | Full product; input “verified phone + identity” is **A2-weakened** (OTP + declared relationship + Sister confirm; ID optional). Documented, not silent. |
| D2 | Yes | NEXT | FR-081 | Deferred with reason |
| D3 | Yes | NEXT | FR-082 | Deferred; lightweight **meeting** stage in FR-028 MVP |
| D4 | Yes | MVP | FR-062–FR-066 | Full |
| D5 | Yes | MVP | FR-068 | Full |
| D6 | Yes | MVP | FR-066, FR-090, FR-140 | Full |
| D7 | Yes | MVP | FR-087, FR-088, FR-092 | Full at MVP-scale |
| D8 | Yes | MVP | FR-056–FR-059 | Full |
| D9 | Yes | NEXT | FR-061 | Deferred; thumbs Blur already on FR-052 |
| D10 | Yes | MVP | FR-060 | Full (opposite of §07) |
| D11 | Yes | MVP | FR-095–FR-098 | Full |
| D12 | Yes (2 rows) | MVP MUST slice; NEXT polish | FR-099–FR-101 | Full MUST slice |
| D13 | Yes | MVP | FR-002, FR-014, FR-015, FR-105 | Full |
| D14 | Yes | MVP | FR-037 | Full |
| D15 | Yes | MVP | FR-019, FR-143 | Full |
| D16 | Yes | MVP | FR-106, FR-108 | Full |
| D17 | Yes | MVP | FR-107, FR-120, NFR-002 | CIL + BF rails + XOF land. **JAABA LLC / Delaware vs Dakar EI** (input gap 10) is never named. |
| D18 | Yes (2 rows) | MVP audio; LATER AR/EN UI | FR-137, FR-138, FR-128 | Full |
| D19 | Yes | MVP | FR-136, NFR-005 | Full |
| D20 | Yes | MVP | FR-045, FR-105 | Full *(superseded 2026-10-02: D20 kept and reframed — default free reach plus admin switch, not “sisters never pay”; now FR-045, FR-105, FR-145)* |
| D21 | Yes | NEXT | FR-124 | Deferred with reason; “not a Cheikh / one persona” kept |
| D22 | Yes (2 rows) | MVP seed; NEXT full | FR-115, FR-121 | Full |
| D23 | Yes (2 rows) | MVP 2–3 names; NEXT metrics | FR-116, FR-092 | Full MUST slice |

### 3.3 D24–D40 (not this document)

These ids are **brainstorm**, not `docs/competitor-farata.md`. This reconcile does not score them. For the record, Appendix A currently lists D24–D40 (ta'aruf stages, istikhara, mahr card, SMS/USSD, PIN, imam attestation, quiet hours, moderator dual-control, deliver-then-scan / scan-deferred *(D32; was fail-closed hold, superseded 2026-10-01)*, alumni, language filters, change-audit, anonymous-mode definition, boost safety, abusive-Mahram, minor hold, pictogram/audio rules). Presence there is a brief/brainstorm carry, not a Farata-teardown requirement.

## 4. Evidence-label audit

PRD §0 states the three labels and “no new unsourced competitor claims.” Addendum §5 repeats “three Farata evidence labels only.”

### 4.1 Correct uses (do not re-litigate)

| Statement | Label | Why it matches the input |
| --- | --- | --- |
| +247.8k actifs vs Play 10k+ | Claimed (marketing) / Offered (seen) | S1/S9 vs S16 structured downloads |
| Email + password + pseudonym + gender; Google sign-in | Offered (seen) | S2, S4, S9 |
| ID + selfie Verification | Claimed (marketing) | S15/S16 store copy; not on the website |
| Mentions légales 19+ | Claimed (marketing) | S6; enforcement not seen |
| Store 17+ / 18+ | Offered (seen) as store ratings | S15/S16 structured facts |
| Review SLA 12–24h / 30 min / 10 min | Claimed (marketing) | S1, S2, S12; numbers disagree |
| Mode anonyme | Claimed (marketing); behaviour unknown | S1, S10, S15 |
| Start-chat gated on Premium | Offered (seen) [bundle] | S1, S12 |
| Voice notes | Claimed (marketing) | S1, S15/S16 |
| Blur all-or-nothing reveal-on-accept | Offered (seen) [bundle] | S12 |
| Per-viewer reveal/revoke | Not publicly evidenced | Input §4.4 |
| Rules §07 promo use of profiles | Offered (seen) | S3 policy |
| Homepage “AI scans every message” vs FAQ “we do not read private chats” | Claimed (marketing) + contradiction | S1 vs S2 |
| Voice / chat-Photo moderation | Not publicly evidenced | Input §4.4 |
| Family involvement rules §04; mahram-in-chat | Offered (seen) policy / Not publicly evidenced | S3 vs no product surface |
| Testimonials are app-experience, not marriages | Offered (seen) / Not publicly evidenced | S1 |
| French-only UI; Burkina SEO page | Offered (seen) | S1, S10, S13 |
| Blog leaked AI-prompt text | Offered (seen) | S11 |
| 5 900 / 9 900 FCFA | Claimed (marketing) | S1 |
| 2-year message keep; 10-year payment keep | Claimed (policy) | S4, S7 |
| Native iOS exists | Offered (seen) | S15 |
| Processors Vercel, Neon, Stripe, etc. | Claimed / Offered as *their* stack | S4, S7, HTML — addendum §1 correctly refuses to copy them |

### 4.2 Incorrect or stretched labels

| Location | What the PRD/addendum says | Problem |
| --- | --- | --- |
| `prd.md` FR-019 | Deletion “reported broken by a user **Offered (seen)** as a user report” | Play review is **not** Offered (seen). Offered (seen) is Farata’s public UI, pages, or store **structured facts**. The input itself says deletion is **Claimed**; “reported broken by a user” (S16) without that label. Calling the review Offered (seen) invents a fourth use of the label. |
| `prd.md` FR-124 | Coaches “Cheikh Moussa” / “Cheikh Amadou” **Offered (seen) [bundle]** | **Moussa** is Offered (seen) [bundle] (S12). **Amadou** is **app store copy** (S15) → **Claimed (marketing)**, not [bundle]. Lumping both under [bundle] is a label error. |
| `prd.md` FR-120 | “Vercel/Neon **USA** as Claimed processors” | Vercel/Neon as processors = Claimed (S4/S7). “**USA**” is the teardown’s gap-10 inference (“data hosted in the USA”), not a Farata-labeled sentence. Treat as sourced analysis, or drop “USA” from the Claimed clause. |
| `prd.md` FR-110 / FR-113 | “Farata-like perks (HD 10 Photos, unlimited coach, priority 7/7, &lt;10 min validation)” | Numbers are from S1 Premium table (Claimed). The sentence has **no label**. Not a new fact, but it is an unlabeled Farata restatement. |
| Habitual abbreviation | Vision L23 “Farata **Claimed**”; Appendix P27 “**(Claimed)**”; addendum §1 “**Claimed / Offered**” | Official forms are **Claimed (marketing)** and **Offered (seen)**. Abbreviation is readable but violates the “only these labels” rule as written. |

### 4.3 New unsourced Farata claims

**None of the invented-feature kind.** No PRD sentence asserts a Farata capability that is not in this teardown.

Stretches (sourced in the input as *analysis*, then stated as if Farata claimed them):

- Hosting “USA” attached to Claimed processors (above).  
- “Another dating app from Dakar” (`prd.md` §9) is positioning, not a Farata quote — acceptable if not read as their tagline. Their actual tagline is *“Ta moitié, par destin et invocation”* / “Pas une app de rencontre. Une app de mariage.”

Third-party rows the PRD correctly **did not ingest** as product facts: Gridinsoft 35/100, Instagram 100k+, domain 2025-11-29, “1 000+ membres à Ouagadougou,” “+14.3k inscrits ce mois.”

## 5. How §5 gaps and qualitative feel landed

| Input §5 / feel | PRD / addendum | Fidelity |
| --- | --- | --- |
| No mahram product | D1 MVP; P45 rules + product | Full |
| Moderation contradiction + unmoderated voice/photos | D4, D6; FR-062–FR-064 | Full |
| No marriage reporting | D11, D12; P54 demoted | Full |
| Blur all-or-nothing | D8; addendum §2.5 rejected Farata-only model | Full |
| Ads/default promo of profiles | D10 / FR-060 | Full |
| Deletion broken / Gmail | D15 / FR-019 / FR-118 | Full (label error on the review — §4.2) |
| Pricing/quota inconsistency; paywalled “verified” look | D16, D13; FR-108, FR-015, FR-112 | Full |
| Inflated member counts | SM-C1; forbidden invented counts | Full |
| Senegal-first / French-only / no CIL / no BF rails | D17, D18; §9 | Full |
| **Entity mismatch JAABA LLC (Delaware) vs Dakar EI** | **Absent.** A3 talks CIL + disclose hosting. No sentence says “do not publish one legal person on the site and another as store seller.” | **Dropped** |
| Broken Académie / leaked prompt / dual coach names | FR-115 public articles; FR-122 human-review; FR-124 one persona, no Cheikh | Full as product; 404 lesson is implied |
| “Cheikh” as religious authority | D21 / FR-124 / Non-Goals | Full |
| “Pas une app de rencontre. Une app de mariage.” | Copy lock *mariage / ta'aruf*; ban *dating / rencontre romantique* | Spirit kept; Farata’s exact promise not quoted (correct — we do not copy their slogan) |
| Qur’an/hadith on **every auth page** (Offered (seen)) | Sincerity pledge + Académie; **no** “scripture on every auth screen” requirement | Qualitative drop |
| PWA shortcuts Profils / Messages / Demandes | FR-133 install + same path only | Qualitative / IA drop |
| Free users can only reply (Premium to start chat) | Rejected for Sisters (D20); addendum §2.6 *(superseded 2026-10-02: rejected as the only model; Sister reach is admin-configurable, not hardcoded always-free)* | Full (we do not copy) |

## 6. Gaps (surface before polish)

None of these are missing P/D **rows**. They are thinning, label errors, or qualitative drops the FR spine can silently lose.

### G1. P17 search dimensions thinned

Input P17 is explicit: **age, origin, location, distance, marital status, religious criteria, life plans; relevance sort.**

FR-024 (and UJ-1 step 6) keep location / marital / religious / life plans / distance. **Age filter, origin filter, and relevance sort** have no AC. Origin exists as a **profile field** (P15 / FR-021) but not as a search dimension. Downstream can ship P17 “done” without age or origin filters. That is a silent shrink of a MUST parity id, not a documented deferral.

### G2. Evidence labels mis-applied in three places

1. Play deletion review tagged **Offered (seen)** (FR-019).  
2. **Cheikh Amadou** tagged **Offered (seen) [bundle]** (FR-124) — store copy is Claimed (marketing).  
3. **USA** attached to Claimed processors (FR-120) — analyst inference, not a Farata-labeled claim.

Also: unlabeled “Farata-like” perk numbers in FR-110/FR-113; `Claimed` often missing `(marketing)`.

These are exactly the discipline §0 promised. They are copy fixes, not new research.

### G3. JAABA LLC / Delaware vs Dakar *entreprise individuelle* never captured

Input gap 10 is a **trust and legal-surface** lesson: one identity on Mentions légales, another as iOS/Play publisher, data in the USA. D17/A3 absorb CIL + disclose hosting + BF rails. They do not lock “one legal person, consistent on web and stores.” UX/legal pages can recreate Farata’s mismatch without failing any FR.

### G4. P46 crypto / backups / DPA thinned

Hashed passwords, 72h breach, retention/erasure, and CIL stance exist. The input’s **encryption in transit and at rest, daily encrypted backups, and a published DPA** are not testable NFRs. Same class of miss as `reconcile-system-idea.md` on TLS/at-rest. Architecture will invent them unless product restates them.

### G5. Auth-page Islamic framing and photo-rule texture dropped

- Qur’an/hadith on every auth page (Offered (seen)) — tone/feel; no FR.  
- Hijab recommended for sisters (S3, inside P39’s source rules) — not in FR-070.  
- Contact-form **automatic** rejection of matchmaking (P48 source S12) — FR-118 only routes “misuse.”  
- PWA shortcuts and member-facing **visit** pushes (P35/P36 texture) — not in ACs.

These will not fail Appendix A. They will fail a reviewer who compares FR text to the teardown’s feature matrix.

## 7. Non-gaps (do not re-litigate)

- Every P1–P59 and D1–D23 **id** is in Appendix A with a horizon and a reason when deferred. That satisfies the input’s “no silent drop” rule at id level.  
- **D24–D40** are brainstorm. Do not score this file against them.  
- Raising blur (D8), verification (D13), Sisters starting Invites (D20), and mahram (D1) above Farata’s floor is the point of §7. *(D20 “Sisters starting Invites” as always-free/unlimited superseded 2026-10-02: default `free_unlimited`; Operator can set `same_quota_as_brothers`.)*  
- A2 (no kinship papers) and A3 (hosting deferred, CIL + disclose) are documented assumptions, not Farata-doc losses.  
- iOS, coach, blog, video, boosts, vanity lists, anonymous mode, GIFs: deferred **with reasons**.  
- Third-party scare numbers (Gridinsoft, Instagram 100k+, Ouaga “1 000+”) correctly stayed out of the PRD.  
- Not copying Farata’s stack, USA-hosting silence, paywalled start-chat, or invented member counts is aligned. *(“paywalled start-chat” as “Sisters never pay” superseded 2026-10-02: Farata-only-Premium-to-start stays rejected; Sister reach is admin-configurable.)*  
- Addendum options matrices (age, mahram proof, blur, monetisation, homepage proof) correctly treat Farata as labeled evidence, not a recommendation.

## 8. Parent surface (for Finalize, before polish)

Id coverage holds: **P1–P59** and **D1–D23** all appear; **D24–D40 are brainstorm, not this doc**.

Surface G1–G5. Highest-leverage absorbs without new Farata research:

1. Restore **age, origin, and relevance sort** on FR-024 (or explicitly defer origin/relevance with a reason — today they are just gone).  
2. Fix three labels: Play review ≠ Offered (seen); Amadou = Claimed (marketing); drop or re-qualify “USA” on Claimed processors. Put **Claimed (marketing)** on the FR-110 perk list.  
3. One legal-surface sentence: **one entity, same on site and stores** (the JAABA lesson), next to A3/D17.  
4. Name **in-transit / at-rest encryption, encrypted backups, and a public DPA** under P46/NFR-001–002, or send them to addendum as architecture-bound product constraints.  
5. Optional feel: scripture-on-auth is a UX choice; hijab-in-photo-rules and contact-form auto-triage should be accept or defer, not vanish.

Do not invent new Farata facts in the fix.
