---
title: Review — competitive-claim honesty (Farata)
status: complete
created: 2026-09-27
reviewed_artifacts:
  - prd.md
  - addendum.md
evidence_source: docs/competitor-farata.md (2026-09-27)
---

# Competitive-claim honesty review

**Rule applied:** Farata statements may use **only** the evidence labels from `docs/competitor-farata.md`: **Offered (seen)** / **Claimed (marketing)** / **Not publicly evidenced**. No new unsourced claims about Farata.

**Severity:** critical = invented Farata fact; high = missing label on a factual claim; medium = imprecise label; low = style.

**Verdict: fail.** Most named Farata facts match the teardown and carry a label, but the pair is not honesty-clean: one competitor capability is invented, one Farata perk list is unlabeled, and several labels are truncated or applied to the wrong surface.

Counts: **1 critical**, **2 high**, **8 medium**, **4 low**. Inventory: **32** Farata/competitor statements (24 in `prd.md`, 8 in `addendum.md`). Pass-clean after labels: **18**.

---

## Findings (triaged)

### C1 — critical — invented competitor capability

**Where:** `addendum.md` §4 risk row 23.

**Quote:** `Competitor shallow wali digest | Keep D1 product-deep`

**Issue:** Invented Farata/competitor product fact. The teardown states mahram/wali-in-chat is **Not publicly evidenced**; family involvement is Offered (seen) as rules §04 *policy only*, with no product feature, dashboard, or digest on site, bundle, or store listing. A “wali digest” is *our* D2, not something Farata shows. Stating a “competitor shallow wali digest” as a current risk invents a capability the evidence file does not support.

**Charitable reading:** a future copycat risk. That reading is not written. As published, it is an unsourced competitor feature.

**Fix:** Rewrite as a hypothetical (“if a copycat ships a shallow digest, keep D1 product-deep”) or as the evidenced gap (“Farata mahram-in-Chat is Not publicly evidenced; family text is Offered (seen) policy only”).

### H1 — high — unlabeled Farata perk facts

**Where:** `prd.md` FR-110 (and FR-113 continues the same list without naming Farata).

**Quote:** `Remaining Farata-like perks (HD 10 Photos, unlimited coach, priority 7/7, <10 min validation) are FR-113 (NEXT).`

**Issue:** Four factual claims about Farata’s Premium bundle, no evidence label. Teardown support exists and is unused:

| Claim in PRD | Teardown | Correct label |
| --- | --- | --- |
| HD 10 Photos | S1 Premium “up to 10 HD photos” | Offered (seen) on homepage; checkout behind login |
| unlimited coach | S1 free 3/day, unlimited Premium | Claimed (marketing) (S1) / coach widget Offered (seen) [bundle] |
| priority 7/7 | S1 “priority support 7/7” | Claimed (marketing) |
| <10 min validation | S2 / S12 “Validée en 10 min avec Premium” | Claimed (marketing) |

**Fix:** Attach the teardown labels to each perk, or drop the Farata attribution and treat the list as our NEXT scope only.

### H2 — high — USA-hosting / CIL silence unlabeled in addendum

**Where:** `addendum.md` §1.

**Quote:** `Do not copy their USA-hosting silence on CIL.`

**Issue:** Two factual claims about Farata (USA hosting; silence on CIL) with no prescribed label. The teardown supports both — DPA/mentions list Vercel/Neon as USA processors (public legal text); gap 9 is no CIL mention — but the addendum sentence does not use Offered (seen) / Claimed (marketing) / Not publicly evidenced.

The paired stack sentence (`Farata’s public stack (Vercel, Neon, Stripe, etc.) is Claimed / Offered`) is truncated (see M1), not invented. Raw DPA text does list `Vercel (USA)` and `Neon (USA)`.

**Fix:** `Farata DPA lists Vercel/Neon as USA processors Offered (seen) (legal text). CIL mention is Not publicly evidenced (gap 9).`

### M1 — medium — truncated label form (`Claimed` / `Claimed / Offered` / `Claimed policy`)

The rule requires the full tokens. These are content-correct but imprecise:

| Location | Quote | Teardown match | Should be |
| --- | --- | --- | --- |
| `prd.md` L23 | `Farata Claimed “+247.8k actifs”` | Scale claims are marketing, not verified (S1/S9) | **Claimed (marketing)** (full form used later at SM-C1) |
| `prd.md` A1 / `addendum.md` §2.1 | `Farata Mentions légales Claimed 19+` | Age gate 19+ Claimed (enforcement not seen) (S6) | **Claimed (marketing)** |
| `prd.md` FR-066 / §4.6 | `homepage Claimed “AI scans every message”; FAQ Claimed “we do not read private chats”` | Claimed; homepage-vs-FAQ contradiction (S1, S2) | **Claimed (marketing)** on both |
| `prd.md` A3 | `Farata-like 2-year message keep (Claimed policy` | Messages 2 yrs then anonymised — Claimed (policy) (S4, S7) | **Claimed (marketing)** (legal text sits in that bucket) |
| `prd.md` NFR-008 | `Farata’s Claimed 10-year payment keep` | Payments 10 years — Claimed (policy) (S4, S7) | **Claimed (marketing)** |
| `prd.md` Appendix A P27 | `Farata behaviour unknown (Claimed)` | mode anonyme Claimed (behaviour unknown) | **Claimed (marketing)** |
| `addendum.md` §1 | `Claimed / Offered as *their* processors` | Processors listed on S4/S7 | **Claimed (marketing)** / **Offered (seen)** |

### M2 — medium — homepage prices labeled Claimed (marketing)

**Where:** `prd.md` §8; `addendum.md` §2.6.

**Quotes:**
- `Farata **5 900 FCFA/month** launch, **9 900** normal — Claimed (marketing).`
- `Undercut Farata 5 900/9 900 Claimed (marketing)`

**Issue:** Amounts are visible on the public homepage (S1). Per the label glossary, that is **Offered (seen)**. **Claimed (marketing)** would fit *checkout actually charging those amounts* ( `/premium` is behind login). Using Claimed on the published number is conservative but imprecise. Content is not invented.

### M3 — medium — both coach names tagged Offered (seen) [bundle]

**Where:** `prd.md` FR-124.

**Quote:** `Farata coaches “Cheikh Moussa” / “Cheikh Amadou” Offered (seen) [bundle].`

**Issue:** Cheikh Moussa is Offered (seen) [bundle] (S12). Cheikh Amadou is store-listing copy (S15). Store *structured facts* (downloads, rating, version) are Offered (seen); store *feature description* is Claimed (marketing). Dual names are real (gap 12); the [bundle] tag on Amadou is wrong.

**Fix:** `“Cheikh Moussa” Offered (seen) [bundle]; “Cheikh Amadou” Claimed (marketing) (store copy).`

### M4 — medium — Vercel/Neon USA called Claimed processors

**Where:** `prd.md` A3 / FR-120.

**Quote:** `Farata lists Vercel/Neon USA as Claimed processors and does not mention CIL (gap 9, labeled).`

**Issue:** Not invented — DPA Article 05/06 lists `Vercel (USA)` and `Neon (USA)` on a public page, so **Offered (seen)** (legal text) is the tighter label. Claimed (marketing) is defensible only if “legal text, working hosting not independently proven.” CIL absence correctly points at gap 9; better as **Not publicly evidenced**.

### M5 — medium — Offered (seen) on a Play user review

**Where:** `prd.md` FR-019.

**Quote:** `Farata deletion is Claimed (marketing) and reported broken by a user Offered (seen) as a user report.`

**Issue:** Deletion-as-claimed matches the teardown (Claimed; reported broken). The review lives on Play (S16). Offered (seen) is defined as public page, shipped UI, or store *structured facts* (downloads, rating, version) — not a user review. The qualifier “as a user report” helps, but the label is stretched. Prefer: `deletion Claimed (marketing); one Play review reports it broken (S16; not Offered as a working feature).`

### M6 — medium — “Senegal-first” shares an Offered (seen) tag with French-only UI

**Where:** `prd.md` §9.

**Quote:** `Farata is live at farata.net (Senegal-first, French-only UI Offered (seen); Burkina is an SEO page Offered (seen)).`

**Issue:** French-only UI Offered (seen) and Burkina SEO page Offered (seen) match S1/S13 and S10. “Senegal-first” is the teardown’s gap-9 synthesis (HQ Dakar S6, Senegal-centric blog, Senegalese law), not a single labeled feature. Grammar lets Offered (seen) cover “Senegal-first” as if it were a seen UI fact.

### L1 — low — abbreviated member-count quote

`“+247.8k actifs”` vs teardown `“+247.8k membres actifs”` (`prd.md` L23, SM-C1). Same claim, clipped wording.

### L2 — low — unnamed “dating app from Dakar”

`prd.md` L21 and §9. Positions Farata without naming or labeling it. HQ Dakar is Offered (seen) (S6/S8). Farata’s site Claimed (marketing) “Pas une app de rencontre”; the iOS listing title is `farata-muslim-dating` (S15). Style/rhetoric, not a new fact — but it fights their own marketing label.

### L3 — low — implied Gmail support

`prd.md` FR-019 / FR-118: `not Gmail-only`. Our requirement (D15). Implies Farata support is Gmail. Teardown S8 lists `faratasn@gmail.com` Offered (seen). Unstated, unlabeled, not invented.

### L4 — low — “etc.” on the processor list

`addendum.md` §1. Vercel, Neon, Stripe are in S4; “etc.” covers Resend, Cloudflare, Cloudinary, Sentry from the same teardown paragraph. Vague, not invented.

---

## Full inventory

Each Farata/competitor statement. **OK** = label present and matches the teardown.

### `prd.md`

| # | Location | Quote (abridged) | Label present? | vs teardown | Result |
| --- | --- | --- | --- | --- | --- |
| 1 | §0 L15 | Rule: use only the three labels | n/a (methodology) | — | OK (meta) |
| 2 | §1 L21 | `not another dating app from Dakar` | No (unnamed) | HQ Dakar Offered (seen); “not dating” is their Claimed line | L2 |
| 3 | §1 L23 | `Farata Claimed “+247.8k actifs”` / Play `10k+` `Offered (seen)` | Partial / Yes | Scale Claimed (marketing) (S1/S9); Play 10k+ Offered (seen) (S16) | M1 + L1; Play OK |
| 4 | §4.1 desc | email+password+pseudonym+gender Offered (seen); Google Offered (seen); ID+selfie Claimed (marketing) | Yes | 4.1 matrix matches | **OK** |
| 5 | FR-011 A1 | Mentions légales Claimed 19+; stores 17+/18+ Offered (seen) | Partial / Yes | 19+ Claimed (S6); store ratings Offered (seen) (S15/S16) | M1; ratings OK |
| 6 | FR-013 | `12–24h / 30 min / 10 min` Claimed (marketing) | Yes | Manual review + Premium perk; numbers disagree; Claimed | **OK** |
| 7 | FR-019 | deletion Claimed (marketing); user report Offered (seen) | Yes, stretched | Claimed; Play review S16 | M5 |
| 8 | FR-036 | `mode anonyme` Claimed (marketing); behaviour unknown | Yes | Claimed (behaviour unknown) | **OK** |
| 9 | §4.3 desc | start-conversation behind Premium Offered (seen) [bundle] | Yes | Free users reply-only; start is Premium (S1, S12) | **OK** |
| 10 | §4.4 desc | voice Claimed (marketing) and Premium-gated in marketing | Yes | Voice Premium Claimed (S1, S15/S16) | **OK** |
| 11 | §4.5 desc | Blur Offered (seen) [bundle] all-or-nothing reveal-on-accept; per-viewer Not publicly evidenced | Yes | 4.4 blur row + per-viewer row | **OK** |
| 12 | FR-060 | rules §07 Offered (seen) (ads; opt-out on request) | Yes | Offered (seen) (policy) (S3) | **OK** |
| 13 | §4.6 desc | homepage/FAQ AI contradiction Claimed; voice/chat-Photo Not publicly evidenced | Partial / Yes | Contradiction Claimed (S1 vs S2); voice/photo mod Not publicly evidenced | M1; gap OK |
| 14 | §4.7 desc | family §04 Offered (seen) policy; mahram-in-Chat Not publicly evidenced | Yes | 4.4 family + mahram rows | **OK** |
| 15 | §4.8 desc | testimonials Offered (seen) are app-experience; marriage report Not publicly evidenced | Yes | 4.6 success-story rows | **OK** |
| 16 | FR-110 | Farata-like perks (HD 10, unlimited coach, 7/7, <10 min) | **No** | All in S1/S2/S12 | **H1** |
| 17 | FR-120 A3 | Vercel/Neon USA Claimed processors; no CIL (gap 9); 2-year keep Claimed policy | Partial | DPA lists USA processors (public); CIL gap 9; 2-year Claimed (S4/S7) | M4 + M1 |
| 18 | FR-122 | blog leaked AI-prompt text Offered (seen) | Yes | S11 note | **OK** |
| 19 | FR-124 | Cheikh Moussa / Cheikh Amadou Offered (seen) [bundle] | Yes, wrong surface for Amadou | Moussa [bundle]; Amadou store copy | M3 |
| 20 | NFR-008 | Claimed 10-year payment keep | Partial | Claimed (policy) (S4/S7) | M1 |
| 21 | §8 | 5 900 / 9 900 Claimed (marketing) | Yes, conservative | S1 homepage public prices | M2 |
| 22 | §9 | live farata.net; Senegal-first, French-only UI Offered (seen); Burkina SEO Offered (seen) | Yes on UI/SEO | French-only Offered (seen); S10 Ouaga/BF Offered (seen) | M6; SEO OK |
| 23 | SM-C1 | `+247.8k actifs` Claimed (marketing) vs Play 10k+ Offered (seen) | Yes | Same as #3, full Claimed (marketing) | **OK** + L1 |
| 24 | OQ 5–6; App A P27 | review SLA Claimed (marketing); mode anonyme Claimed (marketing); P27 `Claimed` | Yes / Partial | Matches #6 and #8 | **OK** / M1 on P27 |

### `addendum.md`

| # | Location | Quote (abridged) | Label present? | vs teardown | Result |
| --- | --- | --- | --- | --- | --- |
| 25 | §1 | public stack (Vercel, Neon, Stripe, etc.) Claimed / Offered | Truncated | S4/S7 processors | M1 + L4 |
| 26 | §1 | USA-hosting silence on CIL | **No** | DPA USA processors Offered (seen); CIL Not publicly evidenced (gap 9) | **H2** |
| 27 | §2.1 | Farata parity; Mentions légales Claimed 19+ | Partial | Same as #5 | M1 |
| 28 | §2.4 | Farata Offered (seen) native iOS | Yes | S15 Offered (seen) | **OK** |
| 29 | §2.5 | all-or-nothing reveal-on-accept Farata Offered (seen) [bundle] | Yes | Same as #11 | **OK** |
| 30 | §2.6 | Farata-style start-chat Premium Offered (seen) [bundle] | Yes | Same as #9 | **OK** |
| 31 | §2.6 | Farata 5 900/9 900 Claimed (marketing) | Yes, conservative | Same as #21 | M2 |
| 32 | §2.8 | Farata quotes Offered (seen) are not marriages | Yes | Same as #15 | **OK** |
| 33 | §4 risk 23 | Competitor shallow wali digest | **No** | Mahram product **Not publicly evidenced** | **C1** |
| 34 | §4 risk 26 | Farata price undercut | n/a (our strategy risk; prices labeled in §2.6) | Does not add a new Farata fact | OK |
| 35 | §5 | Three Farata evidence labels only | n/a (methodology) | — | OK (meta) |

Rows 34–35 are included for completeness; they are not extra findings.

---

## What is *not* a problem

These are teardown-faithful and correctly labeled. Do not “fix” them:

- Email / Google signup Offered (seen); ID+selfie Verification Claimed (marketing).
- Store 17+/18+ Offered (seen) as ratings (not as the 19+ legal rule).
- Start-chat Premium gate Offered (seen) [bundle].
- Voice Claimed (marketing).
- Blur all-or-nothing Offered (seen) [bundle]; per-viewer Reveal/Revoke Not publicly evidenced.
- Rules §07 promo use Offered (seen); family §04 Offered (seen) policy; mahram-in-Chat Not publicly evidenced.
- Testimonials Offered (seen) are not marriages; dual-confirm marriage Not publicly evidenced.
- Blog leaked prompt Offered (seen).
- Native iOS Offered (seen); French-only UI Offered (seen); Burkina SEO page Offered (seen).
- mode anonyme Claimed (marketing); behaviour unknown.
- Review-SLA disagreement Claimed (marketing).
- Play 10k+ vs +247.8k contrast when Claimed (marketing) is spelled in full (SM-C1).

Appendix A’s statement that the P/D table is *our* commitment, not a new Farata claim, is correct. P/D titles are not Farata assertions except the P27 reason cell (M1).

---

## Required edits (honesty gate)

1. **C1** — Remove or recast addendum risk 23 so it does not assert a competitor wali digest.
2. **H1** — Label or de-attribute the FR-110 Farata perk list.
3. **H2** — Label USA processors and CIL absence with the three allowed tokens.
4. **M1–M6** — Use the full label strings; move homepage prices and DPA processors toward Offered (seen); split coach-name surfaces; stop tagging a Play review as Offered (seen).

No new Farata facts should be added while editing.
