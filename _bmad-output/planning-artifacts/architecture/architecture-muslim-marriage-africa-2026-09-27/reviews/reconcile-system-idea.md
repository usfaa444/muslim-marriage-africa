# Architecture reconciliation — `docs/system-idea.md` six must-haves

> **Superseded 2026-10-01.** Chat moderation is passive after delivery (AD-10 amendment; PRD FR-062–068, FR-144, NFR-003). Claims in this review of pre-delivery Chat scan, hold-on-timeout, or fail-closed Chat delivery are historical. Profile Photo/bio publish-gate (FR-065), AD-9 blur, and AD-12 mahram read-delivered-only are unchanged.

**Input:** `/workspace/projects/muslim-marriage-africa/docs/system-idea.md`  
**Against:** `ARCHITECTURE-SPINE.md` (initiative-altitude consistency contract only)  
**Companion (read, not scored as the contract):** `SOLUTION-DESIGN.md`  
**Date:** 2026-09-27  
**Reviewer:** reconciliation reviewer  
**Spine modified:** no  
**Other BMAD skills started:** no  

**Question:** Do the six owner must-haves have a module home **and** a spine invariant strong enough that two feature teams cannot implement them in conflicting ways?

---

## Verdict

**CONDITIONAL PASS.** All six must-haves have a named module (or module set) and appear in the capability map. Must-haves #2, #4, and #6 have dedicated ADs that lock the dangerous ambiguities (fail-closed pre-delivery, Sister-initiated Mahram read-only, free verification + report/ban + security baseline). Must-have #5 has entities but **no AD**. Must-have #3’s AD-9 locks leak-prevention, not the owner’s “choose in settings to blur” / reveal-on-match-or-request model. Must-have #1 has modules but no rule that messages exist only after an accepted invite.

The spine does **not** drop any must-have. The gaps are missing invariants, not missing homes. Companion `SOLUTION-DESIGN.md` already holds several of the missing rules; they are not on the contract the spine claims to be.

---

## Method

1. Quote each must-have from `docs/system-idea.md` verbatim.
2. Ask what a feature team could invent if they read **only** the spine (not the PRD, not the companion).
3. Score:
   - **Home** — owning module + capability-map row.
   - **Invariant** — an AD whose rule would fail a conflicting implementation.
   - **Wording delta** — owner phrase vs what the AD actually forbids.
4. Companion fields are cited only to show “already decided next door, not on the spine.” They do not count as spine coverage.
5. Non-numbered owner sentences (web+mobile, Burkina-first, Farata “EVERY feature”) are noted; they are not must-have numbers.

Severity: **high** = two teams can ship conflicting implementations of a must-have. **medium** = home exists; one dangerous edge is unlocked. **low** = wording/traceability nit. **inherited** = product already chose a stricter or different model; spine matches that model and should name the delta so builders do not “restore” the owner wording.

---

## 1. Coverage table

| # | system-idea.md (verbatim) | Spine home | Governing AD(s) | Invariant strong enough? |
| --- | --- | --- | --- | --- |
| 1 | “Profiles: create and submit a profile; browse profiles; send an invite/match request; accept or decline; see who invited you and who accepted; exchange messages once matched.” | `profiles`, `discovery`, `invites`, `chat` | AD-3 (ownership), AD-16 (browse Lite), AD-13 (public visibility after OTP+liveness+ID+review), AD-12/AD-21 (who may Invite) | **Partial.** Loop is housed. No AD says conversation/messages exist only after accept. |
| 2 | “AI moderation on everything: every chat message, photo and voice note/audio is scanned continuously for indecent content (immodest photos, inappropriate language/advances). It blocks or flags, enforces the rules, and feeds a report/ban pipeline. Profile photos are moderated too.” | `moderation`, `trust` | AD-10, AD-11, AD-17 (money-ask), AD-18 | **Yes** for modalities, fail-closed, and trust write-path. **Inherited delta:** “continuously” is pre-delivery, not re-scan. Message Flash not named in AD-10. |
| 3 | “Photo privacy: each member (sister or brother) can choose in settings to blur their profile picture and uploaded photos for viewers (with ideas like reveal-on-match or reveal-on-request).” | `media` (`photo_asset`, `derivative`, `signed_grant`, `reveal_grant`) | AD-9 | **No for owner wording.** AD-9 forbids original-URL leakage. It does not lock member settings, gender-symmetric policy choice, or `on_accept \| on_request \| never`. |
| 4 | “Mahram/wali in chat: a sister can optionally add her mahram to the conversation. He reads all messages and acts as a human safeguard and moderator if something slips past the AI, keeping the conversation within Islamic limits.” | `mahram` | AD-12 `[ADOPTED]`, AD-8 (role ≠ Member), AD-16 (SMS on pause/end/flag) | **Yes** for attach, read-scope of conversations, and safeguard actions. **Unlocked:** whether Mahram sees `pending`/`held` vs `delivered` only. |
| 5 | “Marriage success reporting: couples report that they got married through the platform, and these become showcase success stories.” | `outcomes` (`marriage_report`, `consent_story`, `marriage_counter`) | AD-3 only (capability map). AD-18 does not list these events. | **No.** Entities exist. Dual-confirm, proof unpublished, consent-gated public story, counter-at-0 are companion-only. |
| 6 | “Strong security and verification so people can't break the rules (identity verification, reporting, etc.).” | `identity`, `verification`, `trust`, `audit` | AD-8, AD-13 `[ADOPTED]`, AD-17, AD-18, AD-19, AD-21 | **Yes.** “Can't break” is aspirational; the spine encodes detection, verification-as-public-good, and sanction write-path — correct for this altitude. |

---

## 2. Clause-by-clause

### #1 Profiles loop — housed; matched-only chat not locked

| Clause | Spine | Gap? |
| --- | --- | --- |
| create a profile | `profiles` owns `profile`, `profile_field`, `completeness` (AD-3) | No |
| submit a profile | AD-13: public visibility requires phone OTP + liveness + ID + human review | Soft — “submit” is the verification+review gate, not a named profile-submit command |
| browse profiles | `discovery` + AD-16 first-grid budget | No |
| send invite / match request | `invites` owns `invite`, `message_flash`, `invite_quota` | No. “Match” is not a spine word (Invite vocabulary is inherited; not a drop) |
| accept or decline | Entity `invite` exists; no accept/decline state machine on the spine | Soft — owner module can invent states; companion already has `sister_accepted_at` / refuse-no-resend |
| see who invited you / who accepted | No named inbox/outbox invariant | Soft — one writer (`invites`) makes a second list store unlikely |
| exchange messages once matched | ER: `INVITE \|\|--o\| CONVERSATION`. AD-15 is the channel, not the gate. Capability map splits invites vs chat | **Yes.** A team can open chat from browse, or let a pending invite grow a conversation |

Companion already states: “Chat exists only after Sister accept (or she sent).” That sentence is not an AD. Feature spines that bind only AD-15 can skip the gate.

### #2 AI moderation — modalities and pipeline locked; “continuously” inherited

| Clause | Spine | Gap? |
| --- | --- | --- |
| every chat message | AD-10: Chat text created `pending` | No |
| photo (chat) | AD-10: Chat Photo | No |
| voice note / audio | AD-10: Voice note; `ModerationPort.transcribe`, `classifyAudio`; AD-11 for `mos`/`dyu` | No |
| profile photos | AD-10 names Profile Photo; AD-9 ingest path | No |
| “on everything” | AD-10 also names bio (stricter than the owner list) | Message Flash is an `invites` entity and is **not** in the AD-10 modality list |
| scanned **continuously** | State machine is send/upload → `pending` → `delivered \| held \| blocked`. Capability map says “Pre-delivery scan” | **Inherited.** Same delta as PRD reconcile: owner said continuous; product/spine is every outbound item before delivery, fail-closed. No re-scan AD, and no sentence that forbids a second continuous job |
| blocks or flags | Outcomes `block`, `hold`, `blur-and-warn` (photos only) | No |
| report / ban pipeline | Strikes/sanctions/bans/appeals written only by `trust` (AD-10, AD-3) | No |

This is the strongest must-have on the spine. Do not treat fail-closed pre-delivery as a hole. Do treat an unnamed Flash scan and an unnamed “no post-delivery re-scan unless a new AD” as medium/low so a later team does not add a side-channel scanner that races AD-10.

### #3 Photo privacy — leak AD is not the owner settings AD

| Clause | Spine AD-9 | Gap? |
| --- | --- | --- |
| each member (sister or brother) | AD-9 is gender-silent. AD-8 says Sister/Brother is a Member attribute | Soft — nothing says Brother owners get the same grant policies |
| choose **in settings** to blur | Not present. No settings entity, no owner blur preference, no feature flag | **Yes** |
| profile picture and uploaded photos | Ingest writes original + blurred derivatives; originals never in list/grid/notification payloads | No for leakage. Yes for “member chose to blur these” — blur is the storage default, not a preference |
| reveal-on-match | `reveal_grant` is owned by `media`; event `reveal.changed` (AD-15) | Policy values are **not** on the spine |
| reveal-on-request | Same | Same |

Companion data model already locks `reveal_grant.policy` to `on_accept \| on_request \| never` and “Per viewer. Revoke ≤60s.” Memlog AD-9 mentions “Reveal grant or same-gender/self/moderator-unblur.” The published AD-9 rule is only: check authorization, then mint a short-lived signed URL; revoke within 60s.

Owner wording is opt-in blur. PRD inherited blur-by-default + per-viewer Reveal (already reconciled at PRD altitude). The architecture job is to **lock that inherited model** so a team cannot ship client-side CSS blur, a global “show face on the grid” toggle, or a second grant table. AD-9 currently prevents the CSS/URL leak. It does not prevent a second policy model.

### #4 Mahram — adopted and complete; “all messages” vs pending unlocked

| Clause | Spine | Gap? |
| --- | --- | --- |
| sister can optionally add | AD-12: Sister-initiated only | No |
| to the conversation | Read-all of the **attached** conversation(s) only | No (slightly broader than “the” conversation; still a lock) |
| he reads all messages | AD-12 read-all. AD-15: recipients never get media bytes until `delivered` | **Yes — who is a recipient?** Companion: “Mahram reads delivered only.” Spine does not say |
| human safeguard / moderator if AI slips | Actions: flag / escalate / pause / end. AD-8: `mahram` is not `moderator` | No — correct split. Do not give Mahram staff unblur |
| Islamic limits | No fiqh classifier. Copy convention: no dating lexicon | Expected qualitative drop; Advisory Board lives in `content` under AD-22 |

AD-12 is the right altitude for this must-have. The only consistency risk is Mahram dashboards subscribing to `message.pending` / reading held bodies.

### #5 Marriage success reporting — entities without a rule

| Clause | Spine | Gap? |
| --- | --- | --- |
| couples report they got married | `outcomes` owns `marriage_report` | Writer exists; who must confirm is unset |
| through the platform | ER: `CONVERSATION \|\|--o\| MARRIAGE_REPORT : may_close` | Soft — report is conversation-linked, not a free-floating testimonial |
| these become showcase success stories | `consent_story` + `marriage_counter` owned by `outcomes`. Capability map: “Marriage report, story, counter” → AD-3 | **Yes.** Auto-publish, single-sided counter increment, or a `content.article` showcase writer are all legal under the spine |

Companion already locks: counter increments **only** on dual confirm; proof never published; either spouse can refuse public. Those are must-have-#5 invariants. They are not ADs. AD-18’s mandatory event list omits marriage confirm and story publish, so two audit formats can appear.

PRD already narrowed “become showcase stories” to dual-consent + staff publish, with testimonials NEXT. Architecture should inherit that narrowing as a rule, not leave `consent_story` as an unexplained table name.

### #6 Security and verification — covered

| Clause | Spine | Gap? |
| --- | --- | --- |
| identity verification | AD-13: `VerificationPort` (`sendOtp`, `verifyOtp`, `liveness`, `idDocument`); free; not an entitlement | No |
| reporting | `trust` owns report / strike / sanction / ban / appeal / block / fingerprint | No |
| strong security | AD-17 TLS 1.2+, AES-256-class at rest, argon2id, rate limits; AD-8 RBAC; AD-18 hash-chained audit; AD-9 signed media; AD-21 safety up when billing down | No |
| “can't break the rules” | Enforcement after the fact (hold, sanction, revoke) | Aspirational; not a spine defect |

---

## 3. Non-numbered owner sentences

These sit in `docs/system-idea.md` above/below the numbered list. They are not must-haves; reconciliation still records them.

| Owner wording | Spine | Dropped / shifted? |
| --- | --- | --- |
| “marriage-focused … not casual dating” | Locale convention: no dating lexicon in copy keys; AD-17 money-ask hold | Feel is not an AD. Correct. |
| “THE reference for finding a Muslim spouse online” | Out of scope for a consistency contract | Vision, not architecture. |
| “African Muslim brothers and sisters” / francophone West Africa first | AD-5 Burkina/CIL hosting; `fr` default; `mos`/`dyu` audio keys; AD-11 | Kept. |
| “web app + mobile” | AD-4: `apps/web` + Capacitor Android; iOS same project later | Mobile is Android-first. Named deferral, not a silent drop. |
| Farata “implement EVERY feature they have (parity), then list concrete improvements” | Sources include `docs/competitor-farata.md`. Evidence labels in conventions. No AD that Offered-seen parity is a launch gate | **Correct omission.** Parity is a product appendix, not a substrate rule. Builders must not read the spine as “Farata clone + extras.” |

---

## 4. Findings (actionable on a future spine edit; this review does not edit)

### F1 — high — Must-have #5 has no AD

`outcomes` is only bound by AD-3 (single writer). The owner outcome is report → (consent-gated) showcase. Without a rule, a team can increment `marriage_counter` on one spouse, publish `consent_story` from `content`, or skip proof-private. Promote the companion invariants (dual confirm; proof never published; either spouse refuses public; counter starts at 0) to an AD. Add confirm/publish to AD-18’s mandatory event list.

### F2 — high — Must-have #3: AD-9 ≠ settings-to-blur / reveal policies

AD-9 is the right *safety* rule (no original URLs to unauthorized viewers). It is the wrong *product* rule for the owner text and for the PRD-inherited model (default blur, per-viewer Reveal). Lock on the spine: grant policies `on_accept | on_request | never`; per-viewer; Sister and Brother owners; no second client-side blur path. Do not add a Settings toggle that re-opens unmatched clear-face on the grid unless product re-opens that question (AD-22 / OQ-7 already treats opt-out as config, not a new enum).

### F3 — medium — Must-have #1: chat-after-accept is not a rule

The ERD implies Invite opens Conversation. AD-15 can be implemented as open-DM. Add one sentence to an invites/chat AD: a `conversation` row is created only from an accepted Invite (or a Sister-sent Invite); `chat` refuses messages without that FK.

### F4 — medium — Must-have #4: “reads all messages” vs AD-10 pending

AD-12 “read-all” and AD-10/AD-15 “nothing until delivered” collide if Mahram is treated as a recipient of pending/held. Lock: Mahram sees `delivered` only (same as the ward’s counterpart); flag/escalate still works on delivered slips; held items stay on the staff queue. That preserves “safeguard if AI slips” without making Mahram a second moderator viewport.

### F5 — low / inherited — Must-have #2 “continuously” and Flash

Keep pre-delivery fail-closed (do not restore a sampling or post-delivery continuous job without a new AD). Add Message Flash to the AD-10 modality list, or state that Flash is chat-text under the same state machine. One line in AD-10: “continuously” on this spine means every outbound item before delivery, not a historical re-scan.

---

## 5. Non-gaps (do not treat as holes)

- Invite vocabulary vs owner “match.”
- Fail-closed pre-delivery vs owner “continuously,” once F5’s one-line gloss exists.
- Mahram is not the `moderator` role.
- Consent-gated / empty-at-launch showcase vs invented testimonials — dignity-correct; just not written on the spine yet (F1).
- iOS NEXT vs “mobile,” given AD-4 Android Capacitor + first-class web/PWA.
- Farata full Offered-seen parity as a launch AD — product appendix, not substrate.
- Billing, hosting, stack pins — not must-haves; out of this review’s score.

---

## 6. Sources

- `docs/system-idea.md` — six numbered must-haves + platform + Farata paragraph
- `_bmad-output/planning-artifacts/architecture/architecture-muslim-marriage-africa-2026-09-27/ARCHITECTURE-SPINE.md` — entire file (ADs, ownership table, capability map, ERD, deferred)
- `_bmad-output/planning-artifacts/architecture/architecture-muslim-marriage-africa-2026-09-27/SOLUTION-DESIGN.md` — §6 data-model invariants and §16 FR map, cited only as “next door”
- PRD §6 must-have FR IDs used as a cross-check of inherited product narrowing, not as the scored contract
