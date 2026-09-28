# Ad-hoc review: must-have & traceability completeness

**Artifact:** `prd.md` (2026-09-27)  
**Sources:** `docs/system-idea.md`; brief `brief-muslim-marriage-africa-2026-09-27/brief.md` (P1–P59, D1–D40)  
**Reviewer:** ad-hoc PRD reviewer (must-have + traceability gate)  
**Date:** 2026-09-27  
**Verdict:** **Pass with findings**

All eight structural gates hold: six owner must-haves are MVP FRs with FR IDs; every FR-001–FR-143 has an Acceptance criteria block; six named journeys exist; Appendix A has one row per P/D slice (118 rows, 99 unique IDs, none dropped); horizon totals follow the table; A1–A3 body text matches the brief; platforms keep iOS as NEXT; nine NFR categories have a target and a verification method. Findings below are completeness and testability gaps, not silent drops.

Severity: **critical** = gate fail (dropped must-have, missing P/D id, rewritten assumption, dropped iOS). **high** = MVP/MUST capability claimed without a testable AC. **medium** = incomplete AC or weak slice mapping. **low** = annotation / fidelity nits.

---

## Gate results

| # | Check | Result |
| --- | --- | --- |
| 1 | Six must-haves are MVP FRs, explicit, FR IDs in Must-have coverage table | **Pass** |
| 2 | Every FR has concrete ACs (Given/When/Then or measurable checks) | **Pass with findings** |
| 3 | Journeys for sister, brother, mahram/wali, moderator, married couple, operator — narrative + numbered steps + FR IDs | **Pass** |
| 4 | Traceability: one row per P1–P59 and D1–D40 slice (99 ids); columns ID \| Title \| Horizon \| FR IDs \| Reason if deferred; horizons match brief | **Pass** (no id missing) |
| 5 | Totals after the table: how many ids are MVP, NEXT, LATER | **Pass** |
| 6 | A1–A3 kept exactly as written in the brief and tagged `[ASSUMPTION]` | **Pass with finding** (body exact; label annotated) |
| 7 | Platforms: web + PWA + Android MVP; iOS NEXT not dropped | **Pass** |
| 8 | NFRs for the nine required themes, each with measurable target + verification | **Pass with findings** |

---

## 1. Must-have coverage

§6 table states all six `docs/system-idea.md` must-haves as MVP FRs with FR IDs.

| # | Must-have | FR IDs cited | Horizon check |
| --- | --- | --- | --- |
| 1 | Profiles: create/submit, browse, invite, accept/decline, lists, messaging | FR-001, FR-009, FR-016, FR-017, FR-021, FR-025, FR-038, FR-039, FR-040, FR-041, FR-046, FR-050 | All MVP |
| 2 | AI moderation of text / photo / voice + report/ban pipeline | FR-062–FR-070, FR-083–FR-085, FR-087–FR-088 | All MVP |
| 3 | Photo blur + per-viewer reveal/revoke | FR-056–FR-059 | All MVP |
| 4 | Optional sister-initiated mahram/wali in chat | FR-071–FR-080 | All MVP |
| 5 | Marriage success reporting + showcase | FR-095–FR-101 (P54/FR-102 correctly left NEXT) | All MVP |
| 6 | Verification / security / reporting | FR-002, FR-007, FR-011, FR-012, FR-014, FR-015, FR-083–FR-086, FR-091, NFR-001 | All MVP |

Wording in the table is the system-idea text, not a paraphrase. No must-have is NEXT or omitted.

**Finding MH-1 — medium.** Brief “What the PRD must preserve” #1 required P/D ids **in** the coverage table. The PRD table has FR IDs only. Traceability still exists in Appendix A, but a reader of §6 cannot see P7/P15/… or D1/D4/D8/D11/D12/D13 without leaving the table.

---

## 2. Acceptance criteria

FR-001 through FR-143 each have an `**Acceptance criteria:**` block. Most MVP FRs use Given/When/Then. No FR is AC-less.

### FRs with non-concrete or incomplete ACs

**Finding AC-1 — high.** **FR-028** (D24 MUST: invite / chat / **meeting** / married) has GWT for `invite`, `chat`, and `married` only. The chat AC says “until a meeting is marked” but never specifies who marks it, what evidence is required, or the resulting stage. SM-2 (north-star chaperoned meetings) depends on this flag. The only MVP “mark meeting” check sits on **FR-082** (NEXT planner): “Given MVP, When they mark stage **meeting**, Then it is a stage flag without the full planner.” That buries a MUST AC on a NEXT FR and still does not say who may mark it or that both sides see it.

**Finding AC-2 — medium.** **FR-024** claims “Distance is included” (P17 MVP) but ACs only cover a polygamy-disclosure filter and an empty state. No measurable check that a distance/location filter changes the grid.

**Finding AC-3 — medium.** **FR-052** / P35: description lists pushes for messages, Invites, visit signals, Mahram digest, Reveal requests, moderation outcomes. ACs only cover (a) a delivered-message push with blurred thumb and (b) denied-permission unread increment. Invite / Mahram / Reveal / moderation / visit pushes are untested.

**Finding AC-4 — medium.** **FR-107** / P58 BF rails: description requires Orange Money BF, Moov Africa BF, Wave/Coris where available, cards secondary. ACs only prove Orange Money success and “cards unavailable → mobile money still works.” Moov Africa BF and Wave/Coris have no check.

**Finding AC-5 — medium.** Cluster of NEXT/LATER FRs whose ACs are presence/absence notes, not testable success:

| FR | Horizon | Problem |
| --- | --- | --- |
| FR-121 | NEXT | “the library grows beyond five” — no count, review record, or publish rule |
| FR-123 | NEXT / LATER | “a human-reviewed explainer **may** appear” — optional, not a check; high-production LATER slice has no AC |
| FR-125 | NEXT | “additional locales ship” — no URL set, review bar, or empty-state rule |
| FR-128 | LATER | “full UI locales ship” — no locale list, completeness %, or fallback |
| FR-129 | NEXT | “a private journal exists” — no reminder behaviour, privacy (not a fatwa) beyond one clause |
| FR-130 | NEXT | “the card can be shared” — no field list, Mahram-visible assertion as GWT |
| FR-131 | NEXT | “a Member **may** attach an imam attestation” — optional wording |

FR-033 / FR-034 / FR-035 MVP legs (“this list does not exist”) are acceptable measurable negatives. The rows above are not.

**Finding AC-6 — low.** **FR-021** lists P15 fields (age/DOB, city/country, origin, marital status, education, profession, practice, intentions, description, photos) but ACs only say a required field blocks an Invite and that fields “render in French.” Persistence of each named field is not checked.

---

## 3. Journeys

| ID | Actor | Narrative | Numbered steps | FR IDs per step |
| --- | --- | --- | --- | --- |
| UJ-1 Fatim | Sister | Persona, entry, climax, resolution | 12 + edge | Yes (step 10 uses range FR-071–FR-079) |
| UJ-2 Ibrahim | Brother | Same shape | 9 + edge | Yes |
| UJ-3 Ousmane | Mahram/wali | Same shape | 8 + edge | Yes |
| UJ-4 Aïcha | Moderator | Same shape | 7 + edge | Yes |
| UJ-5 Aminata & Yusuf | Married couple | Same shape | 7 + edge | Yes |
| UJ-6 Kadiatou | Operator | Same shape | 6 (no edge) | Yes |

All six required actors are present. Steps are numbered and cite FRs. No journey-actor miss.

**Finding J-1 — low.** UJ-1 step 10 cites `FR-071–FR-079` as a range instead of the IDs that step actually exercises (invite/OTP/confirm). Acceptable as a pointer to UJ-3, but it is not per-capability.

**Finding J-2 — low.** UJ-5 step 7 is a non-goal (“testimonials carousel is not MVP”), not a couple action. The couple path itself (dual-confirm → married state → consent story → counter) is covered in steps 1–6.

**Finding J-3 — low.** UJ-2 step 9 cites **FR-111** (Boosts — NEXT) to assert “cannot pay to skip.” The MVP assertion belongs on FR-105 / FR-110; FR-111 is the right id only after boosts exist.

No finding for missing sister / brother / wali / moderator / couple / operator journeys.

---

## 4. Traceability appendix (P1–P59, D1–D40)

Machine check of Appendix A vs the brief tables:

- **Unique IDs:** 99 (P1–P59 = 59, D1–D40 = 40). **None missing.**
- **Rows:** 118. Split counts match the brief exactly: P2, P16, P22, P23, P32, P33, P50, P51, P52, P53, P56, P58, D12, D18, D22, D23, D27 (2 each); **P36 (3)**.
- **Columns:** ID | Title | Horizon | FR IDs | Reason if deferred. Deferred rows have a reason.
- **Horizons:** every slice matches the brief once MUST → MVP is applied (brief D-table uses MUST for launch; PRD uses MVP). Conditional brief wording is respected:
  - P16 confrérie: brief “NEXT if not cheap enough” → PRD NEXT + reason.
  - D27 USSD: brief “MUST if feasible; otherwise NEXT” → PRD NEXT + operator-cost reason.
  - P51 full cadence / P53 high-production: brief “LATER if NEXT capacity is tight” → PRD LATER + reason.

**Missing P/D ids:** none.  
**Silently dropped ids:** none.  
**Wrong horizons:** none.

**Finding TR-1 — medium.** Slice rows exist, but two NEXT slices reuse an MVP FR and therefore have no distinct commitment:

| Slice | Horizon | Mapped FR | Issue |
| --- | --- | --- | --- |
| D12 curated rich showcase polish | NEXT | FR-100 (MVP showcase page) | Same FR as the MUST slice; no polish AC (layout, editorial, marketing pack) |
| D23 trust-by-proof + fuller named board | NEXT | FR-092 (MVP transparency stats) | Fuller-board work is not specified. FR-116 prose cites a nonexistent **`FR-123-board`** (FR-123 is the promo video) |

**Finding TR-2 — low.** D31 (NEXT dual-control / audit / **wellness**) maps only to FR-093 (unblur audit + dual-control). Moderator wellness has no FR and no AC.

---

## 5. Horizon totals (after the table)

Present and arithmetically correct.

**Unique IDs by earliest horizon** (any MVP slice ⇒ MVP):

| Horizon | Count | Check vs brief |
| --- | --- | --- |
| MVP | **74** | 48 P + 26 D |
| NEXT | **24** | 11 P (P18–P20, P24–P27, P49, P51, P53, P54) + 13 D (D2, D3, D9, D21, D25, D26, D29–D31, D34–D37) |
| LATER | **1** | D33 only (P51, P53, D18 have earlier slices) |
| **Sum** | **99** | 74 + 24 + 1 |

**Slice/row counts:** MVP 75, NEXT 39, LATER 4, total 118. LATER rows correctly listed: P51 full blog, P53 high-production, D18 EN/AR UI, D33 alumni.

No finding.

---

## 6. Assumptions A1–A3

Body text of A1 (in FR-011), A2 (in §4.7), and A3 (in FR-120) matches the brief character-for-character, including numbered wali path, rationale, and legal-review flags. Each block is tagged `[ASSUMPTION]`.

**Finding AS-1 — low.** The brief opens each with `**[ASSUMPTION]**` immediately followed by the sentence. The PRD opens with `**[ASSUMPTION] A1 (verbatim):**` / `A2 (verbatim):` / `A3 (verbatim):`. The assumption **content** is exact; the label is not. Index §17 points at those locations. Not a rewrite of age, wali path, or CIL/hosting.

---

## 7. Platforms

§7 and FR-132–FR-135:

| Surface | Horizon | Dropped? |
| --- | --- | --- |
| Web | MVP (FR-132) | No |
| Installable PWA | MVP (FR-133) | No |
| Store-listed Android | MVP (FR-134) | No |
| Native iOS | NEXT (FR-135); Apple sign-in FR-004 ships with it | **Not dropped** |

Non-goals and Appendix A P36 iOS row agree. No finding.

---

## 8. NFRs

All nine required themes exist as NFR-001–NFR-009 with a **Target** and a **Verification** method.

| NFR | Theme | Measurable target | Verification |
| --- | --- | --- | --- |
| NFR-001 | Security | Visibility gates; hashed passwords; rate-limit; 15 min idle PIN sessions (assumption); no staff bulk contact export | Pen test + automated ACL / search-omit tests |
| NFR-002 | Privacy / CIL | CIL program before launch; hosting disclosed; 72h breach; city-level geo; no marketing reuse | Legal checklist, tabletop, quartier automated test |
| NFR-003 | Moderation latency + fail-closed | Text p50 &lt; 3s / p95 &lt; 10s; media p95 &lt; 30s; report p95 ≤ 24h; timeout ⇒ hold never allow | Synthetic pipeline + chaos kill of AI |
| NFR-004 | Availability | Core path ≥ 99.5% monthly; payment outage must not take down Free/safety | Uptime checks + payment-rail game-day |
| NFR-005 | Low-end Android / 2G–3G | 2GB-class + Slow 3G: grid ≤ 8s, thread ≤ 4s, send ack ≤ 2s; no autoplay | Lab throttle + Ouaga/Bobo RUM |
| NFR-006 | A11y / low-literacy | WCAG 2.1 AA; pictogram+audio completable; touch ≥ 44px | Audit + 5-sister moderated test |
| NFR-007 | Localisation FR + Mooré/Dioula audio | 100% MVP screens French; named audio set native-speaker checked | String freeze, audio checklist, banned-lexicon test |
| NFR-008 | Retention / deletion | Erasure ≤ 30d; export ≤ 72h; chat ≤ 18 months unless hold; search gone ≤ 15 min | Staging rehearsal + automated delete test |
| NFR-009 | Auditability | Named immutable events; logs ≥ 12 months; no shared Moderator login | Replay, RBAC, quarterly access review |

**Finding NFR-1 — medium.** NFR-001 does not state a measurable **transport / at-rest encryption** target even though brief P46 names “Encryption, rights, DPA, 72h breach + CIL.” Hashing and ACL tests are specified; TLS and datastore encryption are not.

**Finding NFR-2 — low.** NFR-002 “CIL compliance program in place” is a process gate, not a numeric product target. The 72h breach clause and hosting-disclosure test carry the measurability. Acceptable if counsel owns the program; still softer than the other eight.

---

## Finding index

| ID | Severity | Gate | Summary |
| --- | --- | --- | --- |
| AC-1 | high | 2 | FR-028 has no AC for entering **meeting** (D24 MUST / SM-2) |
| MH-1 | medium | 1 | Must-have table dropped brief P/D id column |
| AC-2 | medium | 2 | FR-024: distance filter claimed, not ACed |
| AC-3 | medium | 2 | FR-052: most P35 notification types not ACed |
| AC-4 | medium | 2 | FR-107: Moov / Wave/Coris not ACed |
| AC-5 | medium | 2 | FR-121, FR-123, FR-125, FR-128–FR-131 ACs not concrete |
| TR-1 | medium | 4 | D12 NEXT polish and D23 NEXT fuller-board mapped to MVP FRs; `FR-123-board` does not exist |
| NFR-1 | medium | 8 | Security NFR omits measurable encryption in transit/at rest |
| AC-6 | low | 2 | FR-021 does not AC each P15 field |
| J-1 | low | 3 | UJ-1 step 10 uses an FR range |
| J-2 | low | 3 | UJ-5 step 7 is a non-goal, not a couple action |
| J-3 | low | 3 | UJ-2 cites NEXT FR-111 for an MVP paywall rule |
| TR-2 | low | 4 | D31 wellness has no FR/AC |
| AS-1 | low | 6 | A1–A3 labels annotated (`A1 (verbatim):`) rather than brief-exact |
| NFR-2 | low | 8 | CIL “program in place” is process-soft |

**Critical: 0. High: 1. Medium: 7. Low: 7.**

---

## What is solid (do not re-litigate)

- Owner must-haves 1–6 are MVP and named with FR IDs.
- P1–P59 and D1–D40 are complete; splits and horizons match the brief; iOS and P54 stay NEXT with reasons.
- Unique totals 74 / 24 / 1 and row totals 75 / 39 / 4 are correct.
- A1 19+, A2 wali-by-phone (no kinship papers), A3 CIL + public hosting disclosure are the brief text.
- Fail-closed (NFR-003, FR-067), 24h report SLA, low-end Android budgets, French + audio coverage, deletion clocks, and audit-log retention are measurable.
- Six actor journeys exist in the required shape.

## Recommended fixes (not in scope for this review to apply)

1. Add a FR-028 AC: Given an accepted Chat, When Sister or attached Mahram marks **meeting**, Then both Members and the Mahram see stage **meeting** (no live A/V).
2. Add distance (FR-024), remaining P35 push types (FR-052), and Moov/Wave-or-Coris (FR-107) GWTs.
3. Replace FR-121/123/125/128–131 ACs with measurable NEXT/LATER checks; add a real FR for D12 polish and D23 fuller-board; delete `FR-123-board`.
4. Restore P/D ids on the §6 must-have table; add TLS + at-rest encryption to NFR-001.
