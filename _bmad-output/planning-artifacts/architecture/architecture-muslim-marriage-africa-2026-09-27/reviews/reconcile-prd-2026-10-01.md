---

> **Annotation 2026-10-01 (final spine).** AD-12 no longer names Chat `pending`/`held` or a staff hold queue. Findings in this file that say it does were written against a mid-edit spine and are stale. The final AD-10 rule forbids a pre-delivery Chat hold.
title: Input reconciliation — PRD 2026-10-01 passive Chat lock
status: complete
created: 2026-10-01
verdict: pass-with-findings
input: prds/prd-muslim-marriage-africa-2026-09-27/prd.md (updated 2026-10-01)
against: architecture/architecture-muslim-marriage-africa-2026-09-27 (ARCHITECTURE-SPINE.md + SOLUTION-DESIGN.md, updated 2026-10-01)
focus: FR-062, FR-063, FR-064, FR-065, FR-066, FR-067, FR-068, FR-144, NFR-003; OQ-2; §16 coverage
locked: 2026-10-01 AI Chat moderation PASSIVE (Maitchibi Fayçal)
not_reopened: A1–A3, name, AD-5, stack, Capacitor, AD-9, AD-12
---

# Reconcile: UPDATED PRD → UPDATED spine + SOLUTION-DESIGN (2026-10-01)

PRIMARY input: `_bmad-output/planning-artifacts/prds/prd-muslim-marriage-africa-2026-09-27/prd.md` (updated 2026-10-01).
Compared against: `ARCHITECTURE-SPINE.md` + `SOLUTION-DESIGN.md` (both `updated: 2026-10-01`).
Spine `.memlog.md` treated as author intent, not coverage. Artifacts were not modified.

This is extract-and-gap on the **2026-10-01 passive-Chat lock**. Older reviews that asserted pre-delivery scan, hold-on-timeout, or fail-closed Chat delivery are historical (`reviews/*` superseded banners). This file replaces `reviews/reconcile-prd.md` for the Chat-moderation question.

**Verdict: pass-with-findings.**

The locked decision landed as AD-10 (and consequential AD-11, AD-15, AD-16, AD-17, AD-18, AD-20, AD-22) plus SOLUTION-DESIGN §2 / §6 / §8 / §15 / §16. The spine does **not** tell a builder to scan Chat before delivery or hold on AI timeout. FR-062–068, FR-144, and NFR-003 point at the new rule. §16 still maps 143 prior FRs plus FR-144. OQ-2 is resolved; questions 1 and 3–12 stay open.

What did not land is the quiet half of D6: the **Member-facing published honesty** (FR-066 AC, FR-140 AC). The AD structure locked the pipeline and dropped the shipped policy page. Two leftover surfaces can still confuse a builder: AD-12 still names Chat `pending`/`held`, and Message Flash has no scan substrate in the data model / ER.

---

## 0. Required confirmations

| Check | Result | Evidence |
| --- | --- | --- |
| Spine does **not** tell a builder to scan Chat before delivery | **Confirmed** | AD-10: persist `delivered` immediately; “After persist, a background job”; Prevents “a pre-delivery Chat hold”. AD-15: emit `message.delivered` at persist. ER: `MESSAGE \|\|--o\| MODERATION_JOB : scanned_after`. Topology: `WK --> AI`, not the request path. |
| Spine does **not** tell a builder to hold on AI timeout | **Confirmed** | AD-10: 5xx / timeout / empty / low confidence “does **not** move the item to held and does **not** delay send”; clocks `>10s text / >30s media → hold` are **deleted**; “no Chat `pending→delivered` machine and **no** `hold_queue` that stops delivery”. AD-11: low-confidence / `mos`/`dyu` is “**not** a reason to hold the Voice note before delivery”. AD-16: media waits for **connection**, not AI. AD-22: “do not keep a hold-timeout UX”. |
| FR-062–068, FR-144, NFR-003 point at the new rule | **Confirmed** | See §2. Pipeline, publish-gate, contact-share, money-ask, and admin-chosen action match the lock. |
| 143 prior FRs + FR-144 covered in SOLUTION-DESIGN §16 | **Confirmed as range coverage** | Header and totals: “FR-001–FR-143 plus FR-144 = 144/144”; “144 / 144 FRs mapped (143 prior + FR-144)”. Ranges are continuous FR-001…FR-144. FR-144 is its own row (trust, moderation; AD-10, AD-18). |
| OQ-2 resolved; other open questions stay open | **Confirmed** | AD-22 binds “questions 1 and 3–11 and the NFR-008 retention clocks (PRD §16 item 12)”; “Question 2 … is **resolved 2026-10-01**”. SOLUTION-DESIGN frontmatter `open_questions` omits fail-closed UX (11 slugs = Q1, Q3–Q11, Q12). §15 table: row 2 **Resolved**; rows 1 and 3–12 stay open. |

Caveat on the first two rows (not a failed confirmation): AD-12 still *names* Chat `pending` / `held`. It does not instruct a pre-delivery scan or a timeout hold. See finding 3.

---

## 1. What transferred (not findings)

Locked decision 2026-10-01 (Maitchibi Fayçal), from PRD §4.6 and the FR-062 lead-in:

> AI moderation is passive, not an active gate before send. This replaces every earlier requirement that scanned Chat before delivery, held on AI timeout, or fail-closed so the recipient never saw an unscanned message.

| PRD lock (2026-10-01) | Architecture |
| --- | --- |
| Chat text / Photo / Voice / Flash delivered immediately; recipient does not wait | AD-10 Rule; AD-15 `message.delivered` at persist; SD §6 `message.state \`delivered\``; SD §8 steps 1–5 |
| Background `ModerationPort` after persist; vendors swappable | AD-10; SD §8 step 2; worker topology `WK --> AI` |
| Outcomes: `flag-for-admin` + flagged-person; not block / hold / blur-and-warn as delivery outcomes | AD-10; SD §6 `moderation_job.outcome`; SD §8 |
| Later flag does not unsend | AD-10; SD §8 |
| AI never auto-suspends; admin chooses warning / suspend / other (FR-144) | AD-10; SD §8 step 8 |
| AI 5xx / timeout / empty / low confidence → `scan-deferred` / `scan-failed` on `flag_queue`; not a send block | AD-10; AD-11; AD-18; AD-20 “never hidden”; SD §8 step 6 |
| No Chat `pending→delivered`; no delivery-stopping `hold_queue`; old 10s/30s hold clocks deleted | AD-10 Prevents + Rule; SD §6 `flag_queue` “Replaces `hold_queue`” |
| Profile Photo / bio still publish-gated (FR-065) | AD-10 apply path + profile state diagram; SD §8 Profile path; Discovery omits unpublished |
| Contact-share still blocks phone / WhatsApp / links until both complete | AD-17; AD-15 `CONTACT_SHARE_REQUIRED`; SD §8 step 3 |
| Money-ask delivered and flagged (even after Contact-share) | AD-10; AD-17; SD §8 step 3 |
| Human review per-item; no bulk-allow / no bulk-clear; thresholds apply to subsequent scans only | AD-10 |
| Paid-faster-review must not skip the background scan or auto-clear a flag | AD-10; AD-21 |
| Flag-queue SLA = same 24h first-human clock as Reports; clock starts when the flag enters the queue | AD-10; SD §6 report/case; SD §8 step 7; NFR-003 |
| Mooré / Dioula: lexicon + human review on the **passive-scan** path; not a Voice hold | AD-11 |
| OQ-2 closed; 1 and 3–12 stay open | AD-22; SD §15 + frontmatter |
| A1–A3, name, AD-5, stack, Capacitor, AD-9, AD-12 mahram rules not reopened | Spine header + AD-5/AD-8/AD-9/AD-12/Stack unchanged in substance |

Prior reconcile-prd high findings that this update did **not** undo (out of Chat-lock scope; recorded so they are not mistaken for new drops): AD-24 now binds the dating lexicon; AD-8 binds 19+ and the no-silent-lower rule; AD-12 / AD-23 bind D38 emergency hide. Those are not re-litigated here.

---

## 2. FR / NFR point-at-new-rule (focus set)

| ID | PRD (updated) | Points at AD-10 passive rule? | Quiet miss inside the FR |
| --- | --- | --- | --- |
| **FR-062** | Chat text stored; recipient sees it without waiting; later flag does not unsend; person flagged (FR-066, FR-144) | **Yes.** AD-10 persist-delivered + background scan + no unsend. SD §8 step 1. §16 → AD-10, AD-11, AD-17. | None on the pipeline. |
| **FR-063** | Chat Photo visible without waiting; later flag does not unsend; Blur stays privacy (FR-056–059), not a delivery outcome | **Yes.** AD-10 + AD-9. SD §8 step 4. | None on the pipeline. |
| **FR-064** | Voice hearable without waiting; `mos`/`dyu` = word lists + human review, **not** a hold; low confidence → flag or scan-deferred, Voice stays delivered | **Yes.** AD-10 + AD-11. SD §8 step 5. | None on the pipeline. |
| **FR-065** | Profile Photo / bio not publicly visible until reviewed; previous allowed bio stays live if a new bio is blocked | **Yes — still the publish-gate, not Chat.** AD-10 separate apply path + `pending → live \| blocked` diagram. SD §6 `bio_live` / `bio_pending`; SD §8 Profile path. | None. Correctly not send-first. |
| **FR-066** | AI outcomes = flag-for-admin + flagged-person only. Admin actions via FR-144. D6 policy **explains delivered-then-scanned, flags for a human, does not silently delete or block** | **Pipeline yes. D6 copy no.** AD-10 names the outcomes and “another published action”. No AD requires a Member-readable D6 page. SD §8 cites D6 as *design* honesty, not a shipped surface. | **This is the quiet drop.** See §3. |
| **FR-067** | Outage / timeout / low confidence does not hold or delay; record scan-deferred / scan-failed on the admin queue; count is not hidden; do not invent a send-blocking latency | **Yes.** AD-10, AD-18, AD-20 (“never hidden”). SD §8 step 6; §14. Includes Flash in the PRD AC. | Flash substrate — see §4. |
| **FR-144** (new) | Already-delivered items + scan-deferred / scan-failed on an admin **flag queue** (not a pre-delivery hold queue). Admin chooses warning / suspend / other. AI never applies a sanction. Later flag does not unsend. May open Report → Strike → Ban | **Yes.** AD-10; AD-3 `flag_queue` owner = moderation; trust owns `moderation_case`. SD §6, §7.1 `/v1/staff/flags`, §8 steps 7–8. §16 own row. | “Published-status outcome” to the Member (UJ-4 / FR-085) is implied by AD-16 SMS “admin sanctions”, not specified as a Member-visible status. Secondary. |
| **FR-068** | Phone / WhatsApp / links **blocked** until both complete Contact-share (deterministic, not the AI). Money-ask **delivered and flagged**. Education interstitial when blocked. Romance-scam scoring (D5). In-Chat “never send money to a suitor” | **Predicate + money-ask yes.** AD-17; AD-15 `CONTACT_SHARE_REQUIRED`; SD §8 step 3. | Education interstitial and the “never send money” education line are unbound. Romance-scam scoring is named in the PRD and not in an AD (money-ask lexicon is the landed slice). See §5. |
| **NFR-003** | Send returns when stored (no AI wait). Background scan must not delay send. Admin first decision p95 ≤ 24h on the existing report SLA. Scan-deferred counted, not fail-closed incidents. Do not invent a tighter admin clock or a send-blocking latency | **Yes.** AD-10 + AD-11; SD §8 steps 1, 6, 7. Chaos-test spirit is in NFR-003 verification; ADs correctly refuse to invent a send SLO. | None on the new rule. Old allow-path p50/p95 (pre-lock) is correctly gone. |

§16 range for the slice: `FR-062–FR-068` → chat, moderation, trust → **AD-10, AD-11, AD-17**. `FR-144` → trust, moderation → **AD-10, AD-18**. `NFR-003` → chat, moderation, trust → **AD-10, AD-11**. That is the new rule, not the deleted hold machine.

Related IDs updated in the same lock, not in the assigned focus list, but they must not silently revert:

- **FR-046** Flash: Invite + Flash still delivered; person flagged; Flash not unsent. §16 range FR-038–049 **includes AD-10**. AD-10 names Flash. Substrate missing — §4.
- **FR-140** thresholds apply to subsequent messages; Member-facing D6 page states delivered-then-scanned + no silent delete + evidence retention. Threshold half is on AD-10. Page half is not. Same drop as FR-066.
- **FR-012** Profile human review stays a publish gate. Not rewritten as send-first. Correct.

---

## 3. Quiet requirement the AD structure dropped: D6 published honesty

This is the clearest “quiet requirement” miss of the 2026-10-01 update. Same class as the 2026-09-27 tone drop: testable, Member-facing, easy to lose because it is copy, and the reason the lock exists.

**PRD locks (testable, not editorial):**

- D6 (Appendix A, MVP): “Honest consistent moderation policy + Member appeal; AI flags for a human and does not silently delete or block” → FR-066, FR-090, FR-140, FR-144.
- FR-066 AC: “Given D6 policy, When the Member reads it, Then it explains that messages are delivered then scanned, that the AI flags for a human admin, and that the AI does not silently delete or block.”
- FR-140 AC: “Given a Member, When they open D6 policy, Then they see the currently published explanation of what is scanned after delivery, that the AI flags for a human admin and does not silently delete or block, and how long evidence is kept.”
- UJ-6 step 2: Operator “edits moderation policy **text** and numeric thresholds.”
- §4.6 / Vision / §11 Safety / Non-Goals: honesty is that the AI flags for a human and does not silently delete, block, or auto-sanction. Farata homepage vs FAQ contradiction is the competitor failure this product refuses to copy.

**What the architecture encoded:** the *pipeline* that makes that honesty true (AD-10). SOLUTION-DESIGN §8 names D4 / D6 / D32 as the design stance.

**What that drops:**

| PRD requirement | Spine / AD / SD |
| --- | --- |
| A Member-readable D6 policy page | No entity. `operator_config` has `flag_threshold`, not policy text. `content.locale_string` is unscoped. |
| Copy must say **delivered then scanned** (not “held until checked”) | Unbound. A team can ship leftover fail-closed copy and still satisfy every AD. |
| Copy must say the AI flags for a human and does not silently delete or block | Unbound. |
| Evidence-retention sentence on that page (FR-140) | NFR-008 clocks stay `[ASSUMPTION]` on AD-19 — correct as clocks; not wired to a published D6 surface. |
| Operator-editable policy **text** (UJ-6 / FR-140) | AD-10 binds threshold versioning (“subsequent scans only”). Not the prose. |
| Governing AD | FR-066 → AD-10 / AD-11 / AD-17 (pipeline). FR-140 sits in FR-139–142 → AD-10, AD-14, AD-20, AD-18. None of those Rules mention a Member-facing policy document. |

Two content or operator teams can publish “we scan every message before you see it” — the exact Farata-shaped lie the lock replaced — without violating AD-10. The AD format kept Prevents / Rule / state-machine and dropped the shipped explanation.

**Severity:** high. Quiet, story-easy to lose, and the honesty surface the 2026-10-01 decision exists to make true for Members (not only for builders).

---

## 4. Message Flash: named on AD-10, missing from the substrate

PRD FR-046 / FR-067 / AD-10 all say Flash is delivered then passively scanned. FR-046 AC is the same lock as FR-062 (deliver; later flag; no unsend).

**Landed in prose:** AD-10 modality list includes Message Flash. SOLUTION-DESIGN §2 inherit line includes Flash. §16 range FR-038–049 cites AD-10.

**Dropped in the AD/entity structure:**

| Surface | What a builder sees |
| --- | --- |
| AD-3 | `message_flash` owned by **invites**. `moderation_job` / `flag_queue` owned by moderation. No flash FK. |
| SD §6 `moderation_job` | `message_id or asset_id` only. No `flash_id` / `invite_id`. |
| SD §6 `message` | Conversation-scoped. Flash is visible **before accept** (FR-046) — there is no conversation yet (AD-23). |
| ER | `MESSAGE \|\|--o\| MODERATION_JOB : scanned_after`. `INVITE` has no scan edge. |
| Capability map | “Invites, quotas, Message Flash” → **AD-23, AD-21, AD-26**. AD-10 is on the Chat row and the moderation row, not the Flash row. |

An invites team that obeys the ownership table and the capability map can persist Flash, skip `ModerationPort`, and still claim AD-23 compliance. AD-10’s parenthetical “and Message Flash” is the only bind, and it sits on a Chat/moderation AD the invites row does not cite.

FR-048 (Mahram reads Flash from minute one, before `conversation`) remains a known AD-12-adjacent gap. Not reopened as a mahram-rule change; noted because Flash is now on the passive-scan path and still has no read-surface for Mahram in AD-12 (AD-12 is attached **conversations** only).

**Severity:** medium. The Rule sentence landed; the structure a builder actually implements did not.

---

## 5. FR-068 education slice

Contact-share as the **single** predicate, Mahram optional, money-ask delivered-and-flagged: landed (AD-17, AD-15, SD §8 step 3). That is the load-bearing half of the lock (“Contact-share still blocks phone/WhatsApp/links until both complete. Money-ask delivered and flagged.”).

Unbound ACs / lines:

- Both Members see an **education interstitial** on a Contact-share reject (FR-068 AC; example “voici mon WhatsApp 70…”).
- In-Chat education: “never send money to a suitor” (FR-068 body; addendum risk 2).
- “Romance-scam scoring (D5)” as a named score — architecture has a money-ask lexicon, not a D5 scorer.

AD-17 Prevents “contact-share implemented twice.” It does not Prevent a silent HTTP 4xx with no education. Same quiet-copy class as D6, narrower blast radius (scam education, not the Farata-honesty lock).

**Severity:** medium for the interstitial (it is an AC). Low for romance-scam scoring as a separate model.

---

## 6. Stale Chat states on AD-12 (do not reopen mahram rules)

AD-12 was correctly **not** rewritten as a new mahram product. Read-all of **delivered** messages, no send-as-her, D38 revoke, emergency hide — those stay.

Leftover clause:

> Mahram has read-all of **delivered** messages on the attached conversation(s) only — not `pending` or `held` (those stay on the staff queue).

After AD-10 there is **no** Chat `pending` / `held`. SD §6: `message.state` is `delivered` only. A builder who implements the AD-12 parenthetical as message states re-creates the second Chat state machine AD-10 Prevents. Profile `pending` (FR-065) is the only remaining pending machine; it is not a Mahram read-scope.

This is **not** an instruction to scan before delivery or hold on timeout. It is leftover vocabulary that can undo the lock if someone “completes” AD-12 literally.

**Severity:** medium. Cleanup of the parenthetical, not a reopen of AD-12.

---

## 7. Open questions

| # | PRD §16 | Architecture | Status |
| --- | --- | --- | --- |
| 1 | Polygamy disclosure UX | SD §15 row 1; no first-wife adapter | **Open** |
| 2 | Fail-closed UX tolerance | AD-22 resolved; SD §15 row 2 **Resolved 2026-10-01**; omitted from frontmatter `open_questions` | **Resolved** — matches PRD |
| 3 | USSD/SMS cost | `UssdPort` flag off | **Open** |
| 4 | Imam names + Académie SLA | Content tables; no hardcoded scholars | **Open** |
| 5 | Free review SLA hours | `free_review_sla_hours` (working 24) | **Open** |
| 6 | Anonymous-mode (D36) | Flag + policy table; NEXT | **Open** |
| 7 | Brother clear Photo pre-accept | Config, not schema enum | **Open** |
| 8 | GIF/sticker | `gif_picker=off` | **Open** |
| 9 | Native-speaker name check | Branding config | **Open** |
| 10 | OAPI / WIPO / handles | Legal/ops | **Open** |
| 11 | Free Money / MTN MoMo | Catalog + adapters | **Open** |
| 12 | Retention schedule (NFR-008) | AD-19 / AD-22 / SD §15 row 12 stay `[ASSUMPTION]` | **Open** |

No other §16 question was silently closed. OQ-2 is not still sitting in a “copy/timeout display; state stays hold” flexibility (that text is gone from SD §15).

---

## 8. SOLUTION-DESIGN §16 coverage (143 + FR-144)

Claim: “Coverage: **FR-001–FR-143 plus FR-144 = 144/144**. **NFR-001–NFR-009 = 9/9**.” Totals repeat: “144 / 144 FRs mapped (143 prior + FR-144). 9 / 9 NFRs mapped. 0 missing.”

Range walk (no hole, no duplicate of 144):

FR-001–008, 009–010, 011, 012–013, 014–015, 016–017, 018, 019, 020, 021–023, 024–027, 028, 029–036, 037, 038–049, 050–052, 053, 054, 055, 056–061, 062–068, 069–070, 071–080, 081–082, 083–093, 094, 095–101, 102–103, 104–110, 111–114, 115–116, 117, 118, 119–120, 121–131, 132–135, 136, 137–138, 139–142, 143, **144**.

NFR-001–009 each have a row. NFR-003 retargeted to AD-10, AD-11.

Range presence is not the same as a Rule that would fail if the FR were ignored. For this update that distinction matters only for **FR-066 / FR-140 D6 copy**, **FR-046/Flash substrate**, and **FR-068 education** — already in §3–§5. Older decorative maps (FR-005 pledge, FR-007 captcha now actually on AD-17, etc.) are out of this lock’s scope.

---

## 9. Findings (triaged)

### Critical

None. The spine does not instruct pre-delivery Chat scan or hold-on-timeout. Profile publish-gate, Contact-share, money-ask, AD-9 blur, and AD-12 mahram product rules were not inverted. OQ-2 is closed. FR-144 exists in §16. A1–A3 / AD-5 / stack / Capacitor were not reopened.

### High

1. **D6 Member-facing published honesty is not an AD.** FR-066 AC + FR-140 AC + D6 require a Member-readable policy that says delivered-then-scanned, AI flags for a human, no silent delete/block, plus evidence retention. Architecture locked the pipeline and dropped the page. Stale fail-closed copy can ship without violating any Rule.

### Medium

2. **Message Flash has no scan substrate.** AD-10 names Flash; AD-3 / SD §6 / ER / capability map keep Flash on invites with `moderation_job` keyed only by `message_id` or `asset_id`. Invites team can skip the background scan.
3. **AD-12 leftover `pending` / `held` Chat states.** Parenthetical implies a Chat hold machine AD-10 deleted. Do not reopen mahram rules; delete the stale states from the sentence.
4. **FR-068 education interstitial (and “never send money” line) unbound.** Predicate and money-ask landed. The AC that both Members see education on a Contact-share reject did not.

### Low

5. FR-144 “published-status outcome” to the Member is only implied (SMS sanctions), not a trust invariant.
6. “Romance-scam scoring (D5)” is not a named port; money-ask lexicon is the landed slice.
7. “Flagged-person” mark has no writer beyond `flag_queue.account_id` (acceptable if that *is* the mark; unspecified if it is an account-level badge that could be misread as a send-block).

---

## 10. Suggested repairs (not applied)

This review does not edit the spine or the PRD. If a later distill absorbs findings:

1. Bind D6 as a Rule (AD-10 or a one-line AD-24/content extension): Operator-published Member policy must state delivered-then-scanned, AI flags for a human admin, AI does not silently delete/block/hold, and the evidence-retention sentence; stale pre-delivery copy is forbidden. Entity or `locale_string` key owned by content/operator. Bind FR-066, FR-140, D6.
2. Give Flash a scan FK (`moderation_job.flash_id` or treat Flash as a first `message` only after copying is forbidden — Flash is pre-conversation). Point the capability-map Flash row at AD-10.
3. AD-12: drop “not `pending` or `held` (those stay on the staff queue)”. Keep “read-all of **delivered** messages on the attached conversation(s) only.”
4. AD-17 or SD §8: Contact-share reject shows the education interstitial to both Members; money-ask education line stays in-Chat after delivery.

---

## 11. What this review is not

Not a spine or PRD edit. Not a reopen of A1–A3, name, AD-5, stack, Capacitor, AD-9, or AD-12 mahram product. Not a start of UX, spec, or epics. Not legal advice. Not a re-score of the superseded 2026-09-27 reconcile-prd fail-closed findings.
