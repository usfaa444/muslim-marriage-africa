---
title: Input reconciliation — docs/competitor-farata.md vs architecture
status: extract
created: 2026-09-27
input: docs/competitor-farata.md
compared:
  - ARCHITECTURE-SPINE.md
  - SOLUTION-DESIGN.md
scope: Farata evidence-label honesty only
spine_modified: false
---

# Reconcile: competitor-farata.md vs architecture spine

Extract-only. Does **not** edit `ARCHITECTURE-SPINE.md`. Does **not** start other BMAD skills. Does **not** re-score P1–P59 / D1–D23 id coverage (that is the PRD’s job; the spine inherits the PRD silently).

**Input:** `/workspace/projects/muslim-marriage-africa/docs/competitor-farata.md` (public-pages teardown, 2026-09-27)  
**Spine:** `ARCHITECTURE-SPINE.md`  
**Companion:** `SOLUTION-DESIGN.md`  
**Raw check (when a label needed a source line):** `docs/research/farata-rendered-text/dpa.txt`, `home.txt`, `faq.txt` / `docs/research/farata-js-ui-strings.txt`

**Rule applied:** any Farata statement in the pair must keep the input’s three labels only — **Offered (seen)** / **Claimed (marketing)** / **Not publicly evidenced**. No new unsourced competitor claims.

**Severity:** critical = invented Farata fact; high = factual Farata claim with no prescribed label; medium = truncated or dual label, or spine/companion disagree on the same fact; low = style / paraphrase / qualitative gap not required at architecture altitude.

---

## Verdict

**Pass with findings.**

No invented Farata capabilities. Every named competitor fact in the pair is in the teardown (or the same research corpus the teardown cites). Labels exist on every factual claim. The pair is **not** honesty-clean on form: AD-5 uses a dual truncated label that is not one of the three official tokens and disagrees with the companion; A1 and §8 abbreviate `Claimed (marketing)` to `Claimed`.

Counts: **0 critical**, **0 high**, **2 medium**, **3 low**. Inventory: **8** Farata-touching statements (4 spine, 4 companion). Pass-clean after full-form labels: **3**.

---

## 1. Required checks

| Check | Verdict |
| --- | --- |
| Farata statements use only the three official labels | **Mostly.** Convention row and §2 / §17 use the full forms. AD-5, A1, and §8 truncate or dual-label. See §4. |
| No invented competitor claims | **Pass.** No Farata feature, metric, or stack item is asserted that the teardown does not support. See §5. |
| Spine / companion agree on the same Farata fact | **Fail one row.** AD-5 vs SOLUTION-DESIGN §5.1 on Vercel/Neon USA processors. See M1. |
| P1–P59 / D1–D23 id coverage | **Out of scope.** Architecture inherits the PRD. Not scored here. |

---

## 2. What the input actually requires of architecture

The teardown is a **product** input (parity P1–P59, differentiators D1–D23, twelve gaps). Architecture’s job is not to re-list those ids. Its job, for this reconcile, is:

1. When it **mentions Farata**, keep the three labels and invent nothing.
2. Use the teardown as **negative examples** (USA-default hosting, copied retention, CIL silence, homepage-vs-FAQ moderation contradiction) without turning analysis into unsourced Farata product facts.

Label meanings (binding, copied from the input):

| Label | Meaning |
| --- | --- |
| **Offered (seen)** | Public page, shipped UI in the public JS bundle (*[bundle]*), or store-listing **structured facts** (downloads, rating, version) |
| **Claimed (marketing)** | Marketing, FAQ, store description, or legal text; working feature not seen (behind login) |
| **Not publicly evidenced** | Searched, not found. Does not prove Farata lacks it |

A Play **user review** is third-party reportage, not Offered (seen). Store **copy** is Claimed (marketing), not [bundle]. Public **legal text** that was actually read is Offered (seen) as a document; treating the *working* infrastructure as proven still sits in Claimed (marketing). The honest-review fix for DPA processor lists is: **Offered (seen) (legal text)**.

---

## 3. Statement inventory

### 3.1 ARCHITECTURE-SPINE.md

| # | Where | Quote (compressed) | Label used | Teardown match | Honesty |
| --- | --- | --- | --- | --- | --- |
| S1 | `sources` | `docs/competitor-farata.md` | n/a (citation) | Source list | Clean |
| S2 | AD-5 Prevents | `Farata DPA lists Vercel/Neon USA — Claimed processors / Offered (seen) legal text` | Dual, truncated | S4/S7 processors; raw DPA Art. 05–06 `Vercel (USA)`, `Neon (USA)`; gap 10 USA hosting | **M1** — fact ok, label not one of the three tokens; companion disagrees |
| S3 | AD-19 Prevents | `invented statute details and copied Farata retention` | none (no Farata fact asserted) | S4/S7 Claimed (policy) retention exists; spine does not quote numbers | **L1** — unnamed retention; no invented clock |
| S4 | Consistency / Evidence | `Farata statements keep labels Offered (seen) / Claimed (marketing) / Not publicly evidenced` | Rule (full forms) | Input §0 labels | Clean — this is the standard AD-5/A1/§8 fail |

### 3.2 SOLUTION-DESIGN.md

| # | Where | Quote (compressed) | Label used | Teardown match | Honesty |
| --- | --- | --- | --- | --- | --- |
| C1 | §2 inherited decisions | `Farata statements use only Offered (seen) / Claimed (marketing) / Not publicly evidenced` | Rule (full forms) | Input §0 | Clean |
| C2 | A1 | `Farata Mentions légales Claimed 19+` | `Claimed` (truncated) | S6 19+; matrix “Claimed (enforcement not seen)” | **M2** — fact ok |
| C3 | §5.1 | `Farata’s public DPA lists Vercel (USA) and Neon (USA) as processors — Offered (seen) (legal text). CIL mention is Not publicly evidenced (competitor gap 9)` | Full forms | Raw DPA lists both as USA; S4/S7 name the processors; gap 9 = no CIL | **Clean** — preferred wording for this fact |
| C4 | §8 | `Farata homepage Claimed “AI scans every message”; FAQ Claimed “we do not read private chats” (evidenced contradiction). Voice/chat-photo moderation is Not publicly evidenced` | `Claimed` ×2 + full `Not publicly evidenced` | S1 homepage; S2 FAQ; §4.4 voice/photos NPE | **M2** on Claimed; fact + contradiction + NPE are correct. **L2** paraphrase |
| C5 | §17 | `Farata “+247.8k actifs” remains Claimed (marketing) versus Play 10k+ Offered (seen)` | Full forms | S1/S9 `+247.8k membres actifs`; S16 Play 10k+ structured | Clean fact + labels. **L3** shortens “membres actifs” |

No other Farata-attributed facts appear in the pair (blur, mahram, paywalled KYC, auto-renew, strike 3/24h, cookie/photo reuse are written as **our** invariants, not as Farata claims).

---

## 4. Findings (triaged)

### M1 — medium — AD-5 dual / truncated processor label, disagrees with companion

**Where:** `ARCHITECTURE-SPINE.md` AD-5 Prevents.

**Quote:** `Farata DPA lists Vercel/Neon USA — Claimed processors / Offered (seen) legal text`

**Issue:** The Evidence convention on the same spine requires the three official tokens. `Claimed processors` is not one of them (`Claimed (marketing)` is). Dual-labeling one fact (`Claimed` **and** `Offered (seen)`) is the old PRD/addendum habit, not the teardown’s method.

The **fact** is not invented. Public DPA text in-repo (`docs/research/farata-rendered-text/dpa.txt` Art. 05–06) lists `Vercel (USA)` and `Neon (USA)` as processors (San Francisco, USA). S4/S7 name Vercel and Neon. Gap 10 states USA hosting. Attaching **USA** to the DPA list is therefore Offered (seen) legal text, not an analyst leap.

**Companion already has the clean form** (`SOLUTION-DESIGN.md` §5.1): `Offered (seen) (legal text)` plus `CIL mention is Not publicly evidenced (competitor gap 9)`.

**Fix (do not apply in this review):** change AD-5 to the companion sentence. Drop `Claimed processors`.

### M2 — medium — `Claimed` abbreviated on two sourced facts

The rule requires the full token **Claimed (marketing)**. These are content-correct:

| Location | Quote | Teardown | Should be |
| --- | --- | --- | --- |
| SOLUTION-DESIGN A1 | `Farata Mentions légales Claimed 19+` | S6 age gate 19+; “Claimed (enforcement not seen)” | **Claimed (marketing)** |
| SOLUTION-DESIGN §8 | `homepage Claimed “AI scans every message”` | S1 “Notre IA scanne chaque message…” — Claimed | **Claimed (marketing)** |
| SOLUTION-DESIGN §8 | `FAQ Claimed “we do not read private chats”` | S2 “Nous ne lisons pas les conversations privées” — Claimed; contradiction called in §4.4 / gap 2 | **Claimed (marketing)** |

§8’s `Voice/chat-photo moderation is Not publicly evidenced` already uses the full third token and matches §4.4 exactly.

**Fix:** write `Claimed (marketing)` in A1 and both §8 clauses. Do not change the 19+ number or the contradiction.

### L1 — low — AD-19 names “Farata retention” without a labeled fact

**Where:** AD-19 Prevents: `copied Farata retention`.

No clock is copied (NFR-008 stays `[ASSUMPTION]`; the companion does not quote Farata’s 2-year message / 10-year payment keep). The teardown’s retention row is Claimed (policy) (S4, S7). This is a “do not copy” constraint, not an unlabeled metric. Optional clarity: `copied Farata retention (S4/S7 Claimed (marketing) legal text)` if a later edit wants the token on the page.

### L2 — low — FAQ paraphrase drops the report-triggered-moderator clause

**Where:** SOLUTION-DESIGN §8: `we do not read private chats`.

Input FAQ (S2 / bundle): *Nous ne lisons pas les conversations privées. Cependant, si un membre signale un comportement inapproprié, notre équipe de modération peut examiner les messages concernés…*

The contradiction (homepage scans-everything vs FAQ we-don’t-read) is evidenced and labeled. The English shorten is accurate enough; it omits “unless reported.” Not an invented claim.

### L3 — low — scale string shortened

**Where:** SOLUTION-DESIGN §17: `+247.8k actifs`.

Input: `+247.8k membres actifs` (S1/S9). Number and labels (`Claimed (marketing)` vs Play `10k+` `Offered (seen)`) match. Style only.

---

## 5. Invented-claim hunt (none found)

Checked against the teardown’s “do not invent” surfaces:

| Risk (from PRD honesty review / teardown gaps) | In this pair? |
| --- | --- |
| Competitor “shallow wali digest” or mahram-in-chat as a Farata product | **No.** AD-12 / §10 describe **our** D1. Teardown: mahram product is **Not publicly evidenced**; family text is policy only (S3). Not attributed to Farata. |
| Unlabeled Farata Premium perk list (10 HD, coach, 7/7, &lt;10 min) | **No.** Not restated. |
| Voice / chat-photo moderation asserted as Farata-offered | **No.** Explicitly **Not publicly evidenced**. |
| Invented member counts | **No.** `+247.8k` kept Claimed (marketing); Play 10k+ Offered (seen). |
| Paywalled KYC stated as a seen Farata feature | **No.** AD-13 “Prevents: paywalled KYC” is our invariant. Teardown: “Badge Premium vérifié” is marketing; ID+selfie is Claimed (store). Not quoted. |
| Per-viewer reveal attributed to Farata | **No.** AD-9 is ours. Teardown: per-viewer reveal **Not publicly evidenced**; blur-on-accept is Offered (seen) [bundle]. |
| Copied Farata retention clocks | **No.** AD-19 forbids it; no 2y/10y numbers. |
| Gridinsoft 35/100, Instagram 100k+, Ouaga “1 000+”, “+14.3k inscrits” | **Correctly absent.** |
| JAABA LLC (Delaware) vs Dakar *entreprise individuelle* stated as a Farata quote without a label | **Not stated at all** (see §6). |

**USA on Vercel/Neon** is **not** invented. Raw DPA lists `Vercel (USA)` and `Neon (USA)`. The teardown’s S7 one-liner omitted the country; gap 10 and the rendered DPA supply it. Companion C3 is the right citation.

---

## 6. Qualitative / altitude notes (not scored as misses)

These are teardown gaps the PRD already carries. Architecture does not need a Farata-labeled sentence for each.

| Input gap / feel | Architecture treatment | Note |
| --- | --- | --- |
| Gap 2 — homepage vs FAQ AI contradiction; voice/photos NPE | AD-10/AD-11 + §8 (labeled) | In scope and handled |
| Gap 8 — scale vs Play 10k+ | §17 (full labels) | In scope and handled |
| Gap 9 — no CIL | §5.1 NPE; AD-5/AD-19 CIL gate | In scope and handled |
| Gap 10 — USA hosting | AD-5 + §5.1 (see M1 for label form) | Hosting handled |
| Gap 10 — **JAABA LLC / Delaware vs Dakar EI** | **Unmentioned** | Legal-surface lesson, not a module invariant. Same drop as PRD reconcile G3. Not an invented claim. Optional later: one-entity disclosure next to AD-5, without new Farata research. |
| Gaps 1, 3–7, 11–12 (mahram, blur, ads, deletion, pricing, Académie, Cheikh) | Implemented as **our** ADs / deferred flags, not as Farata attributions | Correct for this altitude |

---

## 7. Non-gaps (do not re-litigate)

- Citing `docs/competitor-farata.md` in `sources` is required, not a claim.
- The Evidence convention row and SOLUTION-DESIGN §2 state the three labels in full.
- §5.1 CIL + DPA processor sentence is the honesty-clean form.
- §8 voice/chat-photo **Not publicly evidenced** matches §4.4 / gap 2.
- §17 scale labels match S1/S9 vs S16.
- A1 19+ is the teardown’s S6 number; enforcement-not-seen is implied by Claimed.
- AD-19 forbidding copied retention and invented statute details matches the input’s “do not copy their silence / their clocks” intent.
- Strike floor 3/24h, blur/reveal, mahram, free verification, no auto-renew, cookie ≠ photo reuse are **our** rules. Not scoring them as unlabeled Farata restatements.
- P1–P59 / D1–D23 completeness is a PRD reconcile, not this file.
- Third-party scare numbers correctly stayed out.

---

## 8. Parent surface (compact)

**Verdict:** Pass with findings.

Highest-leverage copy fixes (no new Farata research; do not apply in this review):

1. AD-5: replace `Claimed processors / Offered (seen) legal text` with SOLUTION-DESIGN §5.1’s `Offered (seen) (legal text)`.
2. A1 and §8: write **Claimed (marketing)** in full on 19+ and both AI-moderation clauses.

No invented competitor claims to retract.
