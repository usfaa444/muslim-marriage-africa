# Input reconciliation — `docs/system-idea.md`

**Superseded in part on 2026-10-01.** Locked decision (Maitchibi Fayçal): AI moderation is passive. The 2026-09-27 gap “continuous scan vs pre-delivery” is closed in the other direction: Chat is delivered immediately, then background-scanned. Findings below that describe the PRD as a pre-delivery hold are historical. Settings-optional blur and showcase-story gaps are not closed by that decision.

**Superseded in part on 2026-10-02.** Locked decision (Maitchibi Fayçal): browse is one focused card by default (optional grid), not a Lite-grid-only UI. Mahram does not read all chats — grant-scoped threads only (FR-074). Chat after accept is not unconditionally unlimited (FR-146). Rows below that say `FR-025` Lite grid is the browse UI, or “read-all including Flash,” are historical.

**Input:** `/workspace/projects/muslim-marriage-africa/docs/system-idea.md`  
**Against:** `prd.md` §6 Must-have coverage + §4 FRs / §5 NFRs; `addendum.md` overflow  
**Date:** 2026-09-27 (annotated 2026-10-01)  
**Question:** Are owner must-haves #1–#6 MVP FRs with testable acceptance criteria, and did the FR structure drop qualitative intent?

Verdict: all six must-haves exist as MVP capabilities with Given/When/Then ACs (NFR-001 uses Target/Verification). Remaining wording-vs-behavior gaps after the 2026-10-01 lock: settings-optional blur vs blur-by-default; “become showcase stories” vs consent-gated empty showcase. The former “continuous vs pre-delivery” gap is superseded — current PRD is deliver-then-scan (closer to every-send, not a sampler). Farata “EVERY feature” is carried as P/D IDs, not as MVP-complete parity.

---

## 1. Coverage table vs system-idea wording (quoted)

PRD §6 header: “Owner must-haves from `docs/system-idea.md` are all MVP FRs.”

| # | system-idea.md (verbatim) | PRD §6 table (verbatim wording + FR IDs) | MVP FRs with testable ACs? |
| --- | --- | --- | --- |
| 1 | “Profiles: create and submit a profile; browse profiles; send an invite/match request; accept or decline; see who invited you and who accepted; exchange messages once matched.” | Same wording. `FR-001, FR-009, FR-016, FR-017, FR-021, FR-025, FR-038, FR-039, FR-040, FR-041, FR-046, FR-050` | Yes for the loop. Table omits `FR-012` (the actual submit/review gate). `FR-050` ACs never state “text is exchanged”; that sits on `FR-062`. |
| 2 | “AI moderation on everything: every chat message, photo and voice note/audio is scanned continuously for indecent content (immodest photos, inappropriate language/advances). It blocks or flags, enforces the rules, and feeds a report/ban pipeline. Profile photos are moderated too.” | Same wording. `FR-062, FR-063, FR-064, FR-065, FR-066, FR-067, FR-068, FR-069, FR-070, FR-083, FR-084, FR-085, FR-087, FR-088` + `FR-144` (2026-10-01) | Modalities and pipeline are MVP with ACs. **2026-10-01:** “Continuously” as every-send-then-background-scan is now the model (`FR-062`–`FR-067`, `FR-144`, `NFR-003`). The 2026-09-27 “pre-delivery hold” reading is superseded. Table still omitted `FR-051` and `FR-089` at original review time. |
| 3 | “Photo privacy: each member (sister or brother) can choose in settings to blur their profile picture and uploaded photos for viewers (with ideas like reveal-on-match or reveal-on-request).” | Same wording. `FR-056, FR-057, FR-058, FR-059` | Reveal-on-accepted-Invite and Reveal-on-request are MVP with ACs. **“Choose in settings to blur” is not the model** — blur is default (`FR-056`); no AC that a Brother opens Settings and toggles blur; no “always unblurred to browsers” policy. Appendix A P40 title still says “Blur toggle”; FRs do not. |
| 4 | “Mahram/wali in chat: a sister can optionally add her mahram to the conversation. He reads all messages and acts as a human safeguard and moderator if something slips past the AI, keeping the conversation within Islamic limits.” | Same wording. `FR-071, FR-072, FR-073, FR-074, FR-075, FR-076, FR-077, FR-078, FR-079, FR-080` | Optional Sister-initiated attach, read-all, flag/pause/end: MVP with ACs. **“Islamic limits” has no testable AC** — Mahram judgment is the mechanism; fiqh-edge goes to Advisory Board (`FR-116`), not a rule list. |
| 5 | “Marriage success reporting: couples report that they got married through the platform, and these become showcase success stories.” | Same wording. `FR-095, FR-096, FR-097, FR-098, FR-099, FR-100, FR-101` | Dual-confirm report is MVP with ACs. **“These become showcase success stories” is false as written** — public card needs both spouses + family checkbox + Operator/Advisory Board publish (`FR-099`). `FR-102` testimonials are NEXT. Launch showcase is empty; hero is the counter at 0. |
| 6 | “Strong security and verification so people can't break the rules (identity verification, reporting, etc.).” | Same wording. `FR-002, FR-007, FR-011, FR-012, FR-014, FR-015, FR-083, FR-084, FR-085, FR-086, FR-091, NFR-001` | Identity + report/block/sanctions + age/liveness hold are MVP with ACs. NFR-001 is testable (hash, rate-limit, PIN, idle timeout, no staff bulk export) but does not name TLS/encryption-at-rest. “Can't break the rules” is aspirational; product enforces after the fact. Table omits `FR-020` (PIN) and `FR-088` (Ban-evasion fingerprint — listed under #2). |

Note after the table (PRD): “Must-have #5 maps to D11 full + D12 MUST slice. P54 testimonials remain NEXT (FR-102).” That note confirms the showcase-story drop.

---

## 2. Clause-by-clause (must-haves only)

### #1 Profiles loop — covered, table incomplete

| Clause | PRD | AC quality |
| --- | --- | --- |
| create a profile | `FR-001` account + gender; `FR-021` fields | Given unused email/pseudonym → account exists, not public until `FR-012` + `FR-014`. |
| submit a profile | `FR-012` human review before listing | Testable. **Not in §6 row #1** (only in row #6). |
| browse profiles | `FR-025` Lite grid | Testable. |
| send invite/match request | `FR-038` + `FR-046` Message Flash | Testable. |
| accept or decline | `FR-039`, quiet decline `FR-042` | Testable. `FR-042` not in the §6 row. |
| see who invited you / who accepted | `FR-040` Sent / Received / Accepted | Testable. |
| exchange messages once matched | `FR-041` Chat after Sister consent; `FR-050` Chat | `FR-050` ACs cover typing, immediately delivered Photos, reactions. Delivery of text is `FR-062` (immediate, then background scan). *(2026-09-27 “held Photos” reading superseded 2026-10-01.)* |

No dropped capability. Qualitative “match” is renamed Invite/Chat (Glossary) — consistent, not a loss.

### #2 AI moderation — modalities yes; “continuously” no

| Clause | PRD | Gap? |
| --- | --- | --- |
| every chat message | `FR-062` deliver immediately, then background scan | No *(2026-10-01)* |
| photo (chat) | `FR-063` same | No |
| voice note/audio | `FR-064` STT + classifier after delivery; `FR-051` send path | Table omits `FR-051` |
| profile photos | `FR-065` + `FR-012` (still publish-gated) | No |
| “on everything” | Vision + D4: text, Chat Photo, Voice note, Flash delivered then scanned; Profile Photo, bio publish-gated | Flash/bio not in original §6 row |
| scanned **continuously** | **Superseded 2026-10-01.** Every send is delivered, then scanned. AI outage records scan-deferred (`FR-067`), does not hold. | Closed as pre-delivery gap; remaining honesty is flag-for-admin, not silent delete |
| indecent / immodest / advances | Outcomes `FR-066` flag-for-admin; Code `FR-089` | `FR-089` not in §6 row |
| blocks or flags | **Superseded 2026-10-01.** AI flags for admin; admin chooses warning / suspend / other. Contact-share block stays a product rule. | Owner “blocks” is now admin-applied, not AI-gated delivery |
| report/ban pipeline | `FR-083`–`FR-088`, `FR-085`, `FR-144` | No |

**Gap (2026-09-27, superseded 2026-10-01).** Owner said “scanned continuously.” The 2026-09-27 PRD had chosen **before delivery**. The 2026-10-01 lock delivers then scans every send. That is the continuous-every-send reading, not a pre-delivery hold.

### #3 Photo privacy — ideas kept; settings-choice dropped

| Clause | PRD | Gap? |
| --- | --- | --- |
| each member (sister or brother) | `FR-056` opposite-gender Blur at upload; `FR-057` “the owner” | Brother-as-owner never appears in an AC (examples are Sister). Soft. |
| choose **in settings** to blur | No Settings FR. `FR-056` is default-on. Addendum 2.5 chose per-viewer Reveal, rejected always-blur-never-reveal, did not keep opt-in blur | **Yes** |
| profile picture and uploaded photos | `FR-056` Profile + uploaded Photos | No |
| reveal-on-match | `FR-057` “on accepted Invite” | No |
| reveal-on-request | `FR-058` | No |
| (implied) can show face unblurred to the grid | Not a listed policy. Policies: never / on accepted Invite / on request | Members cannot publish a clear face to unmatched viewers |

P40 in Appendix A is still titled “Blur toggle / default / reveal-on-accept / unblur.” The FRs implement default + per-viewer policy, not a toggle. Align P40 title or add a Settings AC.

### #4 Mahram — mechanism complete; “Islamic limits” qualitative

Optional, Sister-initiated (`FR-071`, `FR-080`). Read-all including Flash (`FR-074`, `FR-048`). Human safeguard if AI misses: flag → priority case, pause, end (`FR-075`). Cannot send as her (`FR-076`). Brother sees presence (`FR-079`).

**Gap (qualitative, expected of FRs):** “keeping the conversation within Islamic limits” is not a checkable rule set. Product is “not a mufti” (§11). That is an honest drop of religious-authority feel into Advisory Board + Mahram judgment. Surface it so UX does not invent a “halal/haram” classifier.

### #5 Marriage reporting — report yes; automatic showcase no

`FR-095`/`FR-096` joint report + both confirm. `FR-098` joint married / leave browse. `FR-101` counter starts at 0.

**Gap.** Verbatim “and these become showcase success stories” implies report → public story. `FR-099`/`FR-100` make the showcase **optional, dual-consent, family-gated, staff-published**. `FR-102` (P54 carousel) is NEXT. At launch the showcase empty-state “points at the counter at 0, not at invented quotes.” Dignity-correct; the owner’s must-have *outcome* (visible success stories) is not guaranteed in MVP.

### #6 Security and verification — covered; “strong” is a floor

Phone OTP, captcha, 19+ gate, human review, free ID + liveness, levels, Report/Block/sanctions/false-report, minor hold, NFR-001.

**Soft gaps:** NFR-001 does not require TLS or encryption at rest (architecture will invent it). PIN (`FR-020`) and fingerprinting (`FR-088`) exist but are missing from the §6 row. “So people can't break the rules” over-claims; ACs test detection and sanction, not impossibility.

---

## 3. Qualitative intent the FR structure silently drops or shifts

These are in `system-idea.md` but are not must-have #s. Reconciliation still has to surface them.

| Owner wording | Where it landed | Dropped / shifted? |
| --- | --- | --- |
| “marriage-focused … not casual dating” | Non-goals, `FR-089`, `FR-137` banned *dating / rencontre romantique*, §10 solemn voice | Kept in prose + one lexicon AC. Tone/feel is not an FR — correct — but §10 is the only home. |
| “THE reference for finding a Muslim spouse online” | §1 / §9 “honorable local reference” / “known honorable path” | Ambition kept as vision, not a metric. North star is dual-confirmed nikah (`SM-1`), not category ownership. |
| “African Muslim brothers and sisters” / “francophone West Africa first, e.g. Burkina Faso, then wider” | Burkina-first; then CI, Mali, Senegal | Kept. |
| “web app + mobile” | Web + PWA + Android MVP; native iOS NEXT (`FR-135`) | Mobile is Android-first, not both stores. Named deferral, not a silent drop. |
| “Competitor: farata.net … implement EVERY feature they have (parity), then list concrete improvements … Carry both lists into brief and PRD as explicit features.” | Appendix A: P1–P59 + D1–D40, 99 IDs, no id dropped | **Lists are carried.** “EVERY feature” is **not** MVP: iOS, GIFs, anonymous mode, coach, blog, video, testimonials, boosts, and more are NEXT/LATER. Owner who reads “parity then beat them” as launch-complete will be surprised. |

Feel that FRs cannot hold: solemn ta'aruf, haya-default media, quiet decline, no swipe culture. Present in §10 and journeys; no AC that a screen “feels honorable.” Downstream UX must pick that up — this is the silent drop the Finalize step warned about.

---

## 4. AC testability sweep (mapped MVP IDs)

Every FR in the §6 table has at least one Given/When/Then pair except `NFR-001` (Target + Verification method — still testable). Weakest ACs:

- `FR-050` — *(2026-09-27: no “message body delivered after allow.” 2026-10-01: Photos and text deliver without waiting for AI.)*
- `FR-056` / `FR-057` — no Brother Settings path.
- `FR-066` — outcomes named; “indecent / advances” thesaurus is in `FR-089`, not here.
- `FR-075` — pause/resume rules tagged `[ASSUMPTION]`.
- `FR-099` — “become a story” depends on Operator publish, so owner must-have #5 cannot be accepted by a single couple action.

---

## 5. Gaps to resolve before polish (actionable)

1. **#2 “continuously”** — **Done 2026-10-01.** §4.6 / D4 / Glossary now state deliver-immediately then background-scan every send. Not a pre-delivery hold.
2. **#3 settings / toggle** — Add a Settings AC on `FR-056`/`FR-057` for Sister *and* Brother; decide whether unmatched viewers can ever see a clear Photo. Rename Appendix A P40 if there is no toggle.
3. **#5 showcase** — Either accept “report ≠ story” in the §6 note (already partly there) or add an MVP AC that a dual-confirmed couple *can* reach a published card without a NEXT carousel. Empty-at-launch is a product choice; it contradicts “these become showcase success stories.”
4. **§6 row hygiene** — Put `FR-012` on #1; `FR-051` + `FR-089` on #2; `FR-020` on #6. Avoid implying the listed IDs are the whole capability.
5. **Farata “EVERY feature”** — Keep the P/D appendix, but state in §6 or §14 that MVP is not full Offered-seen parity (iOS especially). That sentence is missing next to the must-have table.

Non-gaps (do not treat as holes): Invite vocabulary vs “match”; consent-gated stories vs invented testimonials; iOS NEXT vs “mobile” if Android+PWA is the accepted reading. *(2026-09-27 “fail-closed vs continuous” is no longer a non-gap framing — fail-closed Chat hold is superseded 2026-10-01.)*

---

## 6. Sources

- `docs/system-idea.md` (entire file; six numbered must-haves + platform + Farata paragraph)
- `prd.md` §1, §4.1–4.9, §5 NFR-001/003, §6 table, §10, §14, Appendix A
- `addendum.md` §2.5 Blur model, §2.8 Homepage proof
