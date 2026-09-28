---
name: review-adversarial
artifact: ARCHITECTURE-SPINE.md
lens: adversarial
date: 2026-09-27
status: complete
---

# Adversarial review — architecture spine

**Artifact:** `_bmad-output/planning-artifacts/architecture/architecture-muslim-marriage-africa-2026-09-27/ARCHITECTURE-SPINE.md`  
**Lens:** Attack the spine as an adversary. Construct two units one level down (two feature teams) that each obey every AD to the letter and still ship incompatibly — clashing shared-data shapes, two owners of one entity, conflicting state-mutation paths. Every pair is a hole to close with a new or tightened AD.  
**Scope of reading:** the spine only. Companions, PRD, and prior reviews were not used as authority.

## Method

Two hypothetical feature teams — **Team A** and **Team B** — are given the spine and nothing else. Each team:

- ships one API process, hexagonal modules, ports, adapters (AD-1, AD-2);
- writes only the entities AD-3 assigns them;
- uses `/v1`, the error envelope, UUID v7, UTC, `AuthContext`, `operator_config` (AD-7, conventions);
- keeps billing off the safety path (AD-21);
- leaves PRD §16 questions as flags/rows/disabled ports (AD-22).

If those two teams can still disagree on a shared record, a writer, or a mutation path, the spine does not yet bind that seam.

## Verdict

**Not merge-ready as a consistency contract.** The spine is strong on process shape (one API, hexagon, vendor ports, hosting, fail-closed moderation, billing isolation). It is weak on the *shared facts that cross module walls*. AD-3 names writers for a subset of nouns; the ER diagram, AD-10/12/13/17, and the conventions introduce more nouns than that table owns. Port *names* exist (`BillingPort.isEntitled`, `ModerationPort`, `SmsPort`) without signatures, result types, or a single publisher in `packages/ports`. Several product predicates (contact-share, public visibility, suspected-minor hold, conversation open/close, content-state apply) are described as rules and left without a single writer or a single DTO.

Two competent teams can implement every AD as written and still refuse each other's payloads, double-write one concept, or mutate the same member-visible state on two paths.

**Recommended action:** close the pairs below with new or tightened ADs *before* feature spines fork. Do not treat “modules call ports, never tables” as sufficient — the missing contract is the port *shape* and the *apply* command, not the import graph.

---

## Incompatibility pairs

Each pair is a hole. Suggested AD closure is the minimum bind that would make the two builds illegal.

### P1 — Contact-share is a single predicate with zero owners

**Clash type:** two owners of one entity / clashing shared-data shape  
**Teams:** Chat vs Trust (Invites as a third lawful writer)

**What the spine says**

- AD-17: “Contact-share is the **single** predicate that unlocks phone / WhatsApp / links (Mahram optional).”
- AD-3 entity table: no `contact_share`, no `contact_grant`. Chat owns `conversation`, `taaruf_stage`. Trust owns `report`, `block`, `sanction`. Invites owns `invite`.
- AD-22: builders must not bake a closed answer into schema enums unless the PRD already locked the enum. Ta'aruf stages are not locked in this spine.
- Conventions: “Commands in the owning module” — there is no owning module.

**Lawful Team Chat.** Contact-share is a `taaruf_stage` value (or a boolean on `conversation`) that Chat writes when both members confirm. Unlock is `GET /v1/conversations/:id` → `{ stage: "contact_shared", phone: ... }` after Chat calls `ProfilesPort.contactPoints`. Mahram-optional is `MahramPort.permissions`. Chat never writes trust tables.

**Lawful Team Trust.** AD-17 is a trust/safety predicate, analogous to `block`. Trust introduces `contact_share` as a grant row (FK to account pair + conversation id), the only writer. Chat stores `conversation_id` and reads `TrustPort.isContactShared(conversationId)`. Phone numbers never appear on conversation reads.

**Incompatibility.** Two source-of-truth rows. Chat's stage can be `contact_shared` while Trust has no grant (or a revoked grant). Clients, SMS copy, and Mahram “optional” each pick a different port. Money-ask language (AD-17) is held on one path and delivered on the other because “after Contact-share” means different things.

**Hole to close.** New AD (or AD-3 row + AD-17 tighten): name the entity (`contact_share` / `contact_grant`), assign **one** writer, and bind the unlock to that port only. State that `taaruf_stage` must not encode contact-share. Define the DTO (`{ conversationId, grantedAt, revokedAt, mahramIncluded }`) and the revoke path (sister remove, ban, report).

---

### P2 — Message / photo / bio state is written on two paths; `blur-and-warn` is a third schema

**Clash type:** conflicting state-mutation paths / clashing shared-data shape  
**Teams:** Chat vs Moderation (Profiles/Media as parallel twins)

**What the spine says**

- AD-3: Chat is the only writer of `message`. Moderation is the only writer of `moderation_job`, `hold_queue`. Media writes `photo_asset`. Profiles writes `profile_field`.
- AD-10: every Chat text, Chat Photo, Voice note, Profile Photo, and bio is created `pending` and becomes `delivered | held | blocked` **only after the pipeline**. Outcomes also include `blur-and-warn` (photos only). AI 5xx/timeout → `hold`. Human review queue lives in moderation; SLA from `operator_config`.
- AD-15: Socket.IO events `message.pending | delivered | held | blocked`. Recipients never receive media bytes until `message.state=delivered`.
- AD-10 “Prevents: … two conflicting state machines” — then specifies *states* without specifying *who applies them to the owned entity*.

**Lawful Team Chat.** Chat creates `message.state=pending`, calls `ModerationPort.scanText`, and **Chat** writes the transition. Human-allow is `POST /v1/chat/messages/:id/moderation-apply` (command in the owning module). `blur-and-warn` is not a message state; Chat sets `state=delivered` and asks Media for a blur derivative. WS events fire from Chat.

**Lawful Team Moderation.** The pipeline owns the outcome. `moderation_job.outcome` is `block | hold | blur-and-warn | allow`. Human review updates `hold_queue` then the job. Chat is expected to *project* `job.outcome` into `message.state`. Moderator UI calls `PATCH /v1/moderation/jobs/:id` only. `blur-and-warn` is a first-class outcome stored on the job (and on `photo_asset` if Media copies it). Chat that maps `blur-and-warn` → `delivered` is, to Moderation, a safety bug — but AD-10 lists it as an outcome *and* omits it from the state diagram (`pending → delivered | held | blocked`).

**Incompatibility.** After human allow: Chat has `message.state=held` (no apply call) while `moderation_job.outcome=allow`. After `blur-and-warn`: Chat emits `message.delivered` with original-adjacent bytes; Moderation believes the photo is still restricted. AD-15's “no media bytes until delivered” and AD-9's “originals never in list/grid” cannot be checked against one field. Bios and profile photos repeat the split: Profiles/Media own the row; Moderation owns the job; nobody is bound to apply.

**Hole to close.** Tighten AD-10: **one apply path**. Either (a) Moderation decides, Chat/Media/Profiles **must** expose `applyModerationOutcome(id, outcome)` as the only writer of member-visible state, and inbound adapters for human review call that port — or (b) Moderation is read-only advice and Chat/Media/Profiles are the only writers, and moderator HTTP is forbidden from writing `hold_queue` as if it were the message. Add `blur-and-warn` to the state diagram *or* state that it is a Media grant overlay, not a message state. Require a shared outcome enum in `packages/ports` (owned, versioned).

---

### P3 — `Case` is prevented in AD-3 and unassigned; `MODERATION_CASE` exists only in the ER

**Clash type:** two owners of one entity  
**Teams:** Trust vs Moderation

**What the spine says**

- AD-3 **Prevents:** “two writers of one entity (Profile, Message, PhotoGrant, Payment, **Case**)”.
- AD-3 **table:** `report, strike, sanction, ban, appeal, block, fingerprint` → trust. `moderation_job, hold_queue` → moderation. **No `case`, no `moderation_case`.**
- ER diagram: `REPORT ||--o| MODERATION_CASE : opens` and `MESSAGE ||--o| MODERATION_JOB : scanned_by`. Two different “moderation work item” nouns.
- Capability map: Report → trust (AD-10, AD-18); pre-delivery scan / hold queue → moderation (AD-10, AD-11).

**Lawful Team Trust.** A member `report` opens a **case** (the noun AD-3 already used). Trust stores `moderation_case` as part of the report aggregate — they are the writer of `report`, so the case *is* the report. Moderator workbench is `/v1/trust/cases`. SLA clock starts on `report.created_at`.

**Lawful Team Moderation.** Human work is `hold_queue`. A report is just another intake: Trust calls `ModerationPort.enqueue(reportId)`. There is no case table. SLA is `operator_config` on hold-queue age. Pre-delivery holds and member reports share one queue.

**Incompatibility.** Two workbenches, two IDs, two SLA clocks, two “this is what a moderator opens.” The ER's `MODERATION_CASE` is an orphaned entity: either team can claim it without violating the table. Operators cannot join “report opened a case” to “pipeline held a message” without a spine-level identity.

**Hole to close.** Tighten AD-3: add `moderation_case` (or explicitly forbid it and say `hold_queue` is the only human work item). State whether a member `report` *creates* a hold-queue row, a distinct case, or both, and which module writes the link. Align the ER or delete `MODERATION_CASE`.

---

### P4 — Conversation birth and death have three lawful writers

**Clash type:** conflicting state-mutation paths / two owners of one lifecycle  
**Teams:** Invites vs Chat vs Outcomes

**What the spine says**

- AD-3: `invite` → invites; `conversation` → chat; `marriage_report` → outcomes.
- ER: `INVITE ||--o| CONVERSATION : opens` and `CONVERSATION ||--o| MARRIAGE_REPORT : may_close`.
- No AD names the command that **creates** a conversation or the command that **closes** one.
- AD-12: Mahram attaches to “the attached conversation(s)” after confirm — assumes a conversation id already exists.
- AD-15: `stage.changed` — stage lives on Chat (`taaruf_stage`).
- AD-22: do not lock enums the PRD did not lock — close-reason / stage values are open.

**Lawful Team Invites.** On accept, Invites is the use-case owner: it calls `ChatPort.openFromInvite({ inviteId, a, b })` and stores `invite.conversation_id`. Conversation identity is “the invite's pair.” Close is not Invites' problem.

**Lawful Team Chat.** Chat subscribes to `invite.accepted` (event name lawful under `domain.action`) and creates `{ id, participants[], stage }`. Participant shape is an array (Mahram will be added later), not a pair. If Invites also called `openFromInvite`, two conversations exist for one invite.

**Lawful Team Outcomes.** `marriage_report` “may_close” the conversation. Outcomes writes the report and either (a) sets `marriage_report.closes_conversation=true` and expects Chat to react, or (b) calls `ChatPort.archive`. Chat, following AD-22, refuses a `married` enum and keeps the thread open at `taaruf_stage=nikah_reported` so the consent story can still attach. Outcomes' counter increments; Chat still accepts messages.

**Incompatibility.** Duplicate conversations per accepted invite; participant DTO `{ memberA, memberB }` vs `{ participants[] }` vs later `{ members[], watchers[] }`; “closed” means archived-no-writes in Outcomes and “stage changed” in Chat. Mahram attach (AD-12) binds to the wrong conversation id. `stage.changed` and marriage-close race.

**Hole to close.** New AD on conversation lifecycle: **only Chat** creates and closes `conversation`. Invites may only call `ChatPort.openFromInvite` (single method, single return `{ conversationId }`) and must not listen-and-create. Outcomes may only call `ChatPort.closeForOutcome(conversationId, reportId)` — Chat is the writer of `closed_at`. Define participant DTO once. State that marriage-report does not imply a stage enum unless PRD locks it.

---

### P5 — Public visibility and suspected-minor hold are joint outcomes with no entity

**Clash type:** two owners of one entity / conflicting mutation paths  
**Teams:** Verification vs Profiles vs Trust vs Discovery

**What the spine says**

- AD-13: “Public visibility requires phone OTP + liveness + ID + human review.” “Suspected-minor hold (D39) is a **verification+trust** outcome, not a UI guess.”
- AD-3: `verification_record` → verification; `profile`, `completeness` → profiles; `favourite`, `profile_visit` → discovery; `report`, `strike`, `sanction`, `ban` → trust.
- No `visibility`, `public_flag`, or `suspected_minor_hold` row.
- AD-21: verification must work when billing is down — does not say who *reads* verification to show a card.

**Lawful Team Verification.** `verification_record.status=approved` **is** public visibility. Port: `VerificationPort.isPublic(accountId): boolean`. Human review of ID lives in verification (AD-13 lists human review as a verification requirement). Suspected-minor: Verification writes `verification_record.status=hold_minor` and notifies Trust; Trust may add a strike later. Discovery is told to call Verification only.

**Lawful Team Profiles.** Completeness is Profiles' entity. Visibility is a profile field computed from completeness + a `VerificationPort` snapshot cached on `profile` (FK + denormalized `is_visible`). Discovery reads `ProfilesPort.listVisible`. Verification never writes profiles — lawful.

**Lawful Team Trust.** AD-13 says suspected-minor is verification **+ trust**. Trust writes `sanction.kind=suspected_minor_hold` (sanction is theirs). Discovery must call `TrustPort.isHidden`. Verification's hold is “evidence,” not the hide switch.

**Lawful Team Discovery.** Filters on `completeness` and `!TrustPort.isBanned`. Does not wait for ID human review (that is verification's private state). Cards go out for OTP+liveness-only profiles.

**Incompatibility.** Four booleans: `verification.approved`, `profile.is_visible`, `trust.sanction hold_minor`, `discovery.query`. A suspected minor can be grid-visible (Discovery) while Verification is on hold and Trust has no sanction yet — each team did their AD-3 job. “Public visibility requires … human review” is a sentence, not a writer.

**Hole to close.** New AD: one **visibility** decision function and one writer of the cached flag (recommend Profiles writes `visibility_state`, reading Verification + Trust through ports; Discovery must not invent a third predicate). Tighten AD-13: suspected-minor hold is a **Trust** write (`sanction` or a named `hold`) triggered by a Verification signal; Verification must not also be a hide-switch. Enumerate the required inputs (OTP, liveness, ID, human review, no minor-hold, no ban) in one port method.

---

## Additional pairs (same class of hole; close if tightening the top five)

These are extra seams the same method found. They do not change the verdict; they show the pattern is systemic.

### P6 — `BillingPort.isEntitled` is a boolean name; `invite_quota` is a counter

**Teams:** Billing vs Invites  

AD-3 gives Invites `invite_quota` and Billing `entitlement`. AD-21 requires safety/sister-invite paths to succeed when billing returns `unavailable`, and names only `BillingPort.isEntitled`.  

Team Invites decrements a local remaining-int and, on `unavailable`, uses a hardcoded free-tier (AD-21). Team Billing treats entitlement as `{ pack, endsAt, features }` and implements `isEntitled(feature): boolean` with no remaining count. Two sources of “invites left”; Premium vs Free disagree after a paid pack.  

**Close:** AD-14/AD-21 — `isEntitled` result type must include `{ entitled, remaining?, until?, unavailable }`. State that `invite_quota` is a projection **written only by Invites** from that result, or delete `invite_quota` and make Billing the only numeric source. Define the Free fallback table in `operator_config` (not in Invites code).

### P7 — Sister/Brother and gender live in two modules

**Teams:** Identity vs Profiles  

AD-8: Sister/Brother is a **Member attribute**, not a role. `AuthContext` has `gender?` (optional). AD-3: Identity owns `account`; Profiles owns `profile_field`. No `gender` / `ward_side` entity.  

Team Identity writes `account.gender` / `account.presentation` and fills `AuthContext.gender`. Team Profiles stores sister/brother as profile fields for matching and leaves `gender` unset (lawful — it is optional). Discovery matches on profile fields; mahram and PIN paths trust AuthContext. A member can be Sister in AuthContext and Brother on the profile.  

**Close:** AD-8 + AD-3 — one writer for presentation/gender (Identity). Profiles may read `IdentityPort.presentation(accountId)` only. Make `AuthContext.gender` required for `member` sessions or forbid downstream use of profile fields as gender.

### P8 — SMS has a port and an owned table; two send paths

**Teams:** Identity (or Mahram) vs Notifications  

AD-16 names `SmsPort` for OTP, Invite-received, Mahram pause/end/flag, blocking outcomes. AD-3: `notification`, `sms_dispatch` → notifications.  

Team Identity implements `SmsPort` in `modules/identity/adapters` and sends OTP without writing `sms_dispatch` (they do not own it). Team Notifications claims all SMS must go through `NotificationsPort.send` so rate limits and audit work. Duplicate OTP SMS; rate limits on one path only.  

**Close:** AD-16 — all SMS commands go through Notifications (only writer of `sms_dispatch`). Other modules call `NotificationsPort.dispatchSms(template, to, payload)`. `SmsPort` is Notifications' outbound adapter, not a kernel free-for-all.

### P9 — Reveal / signed grant vs Mahram “read-all”

**Teams:** Media vs Mahram  

AD-9: authorize, then mint short-lived signed URL; originals never in list/grid/notification; revoke within 60s. AD-12: after confirm, Mahram has **read-all** of the attached conversation(s). AD-3: Media owns `signed_grant`, `reveal_grant`; Mahram owns `mahram_permission`.  

Team Media: originals require a member `reveal_grant`; Mahram is not a reveal party → blur derivatives only. Team Mahram: read-all means the guardian sees what the Sister sees, including originals; `MahramPort.canRead(conversationId)` is sufficient authz for `MediaPort.signOriginal`. Grant DTO `{ assetId, viewerAccountId, kind: reveal|moderator }` vs `{ conversationId, role: mahram }`. Sister remove revokes mahram read in 60s (AD-12) but Media revoke is a different 60s clock (AD-9) — grants outlive the link.  

**Close:** AD-9 + AD-12 — Media is the only mint/revoke writer. Define grant kinds (`list_blur`, `reveal`, `moderator_unblur`, `mahram_read`) and state whether mahram-read includes originals. Sister remove **must** call `MediaPort.revokeByViewer(mahramAccountId)` in the same 60s budget.

### P10 — Ban / block / session: write in Trust, enforce nowhere

**Teams:** Trust vs Identity vs Chat vs Discovery  

Trust writes `ban`, `block`. Identity writes `session`. Chat writes `message`. No AD names who invalidates sessions or who fans out hide-on-block.  

Team Trust writes the row and emits `trust.banned`. Team Identity only revokes sessions via `IdentityPort.revokeAll`, which Trust never calls. Team Chat checks `TrustPort.isBlocked` on send; Team Discovery caches `blocked_ids` at browse-time. Banned member keeps a live cookie (AD-7) and keeps receiving WS events (AD-15).  

**Close:** New AD on enforcement: Trust write is necessary but not sufficient. Bind `ban` → Identity session revoke + Chat refuse + Discovery hide as **required callers** (or a single `TrustPort.onSanction` that those modules must implement). Idempotent, audited.

### P11 — Shared IDs, events, and `packages/ports` have no owner

**Teams:** any two HTTP/WS publishers  

Conventions: UUID v7, **prefix optional**; events `domain.action`; `packages/ports` is “shared port types.” AD-7 versions URLs, not bodies. Socket.IO event *names* are listed (AD-15); payloads are not.  

Team A: `{ "id": "msg_...", "occurred_at": "...", "state": "delivered" }`. Team B: `{ "messageId": "0193...", "occurredAt": "...", "status": "ok" }`. Both UUID v7, both UTC ISO-8601, both `/v1`. `BillingPort` in `packages/ports` is published twice under two signatures; AD-21 cites the name only. REST `GET /v1/messages/:id` and WS `message.delivered` diverge. Long-poll fallback (AD-15) is a third shape.  

**Close:** New AD on the published contract: `packages/ports` has one publisher (kernel or a named owner); port types are the only legal cross-module shapes; ID prefix policy is **required** or **forbidden**, not optional; every AD-15 event has a typed payload in that package; REST and WS share the same DTO for the same noun.

### P12 — Feature flags vs `operator_config`; CIL delete has no orchestrator

**Teams:** Operator vs any module; Operator vs Identity/Media/Chat  

Conventions put flags (`gif_picker`, `ussd`, `anonymous_mode`, …) in a list; `operator_config` holds numeric thresholds. No owner for flags. AD-19/AD-18 require deletion/CIL completions audited; `cil_ticket` → operator; each module owns its rows.  

Team Operator stores flags as config rows. Team Chat reads `process.env.ANONYMOUS_MODE`. Two answers to an AD-22-open question. On erase, Operator calls module `DeletePort`s; Identity “cascades” via FK (cross-table, AD-2-adjacent); Media lifecycle-expires objects in 30d; Chat hard-deletes now. Audit never sees a single completion.  

**Close:** AD-22 + conventions — flags are `operator_config` keys (or a named `feature_flag` entity owned by operator). New AD on erasure: Operator orchestrates; modules delete **only** their entities through their ports; completion is one `audit_event` after all ports ack; no cross-module FK cascade.

---

## What the spine already binds (not holes)

These attacks fail. Do not spend AD budget here.

| Attack | Why it dies |
| --- | --- |
| Second mobile paradigm (RN/Flutter) | AD-4 |
| Microservice mesh / vendor SDK in domain | AD-1, AD-2 |
| Billing adapter down takes KYC/blur/mahram/report | AD-2, AD-21, AD-14 |
| Paywalled verification | AD-13 |
| Silent mobile-money renew | AD-14 |
| Original photo URLs in grids as a *policy* (not as a DTO) | AD-9 |
| Fail-open when AI 5xx | AD-10 |
| Claiming Whisper covers Mooré/Dioula | AD-11 |
| Mahram composing as the Sister / browsing | AD-12 |
| Shared staff login / Sister as a role | AD-8 |
| USA-default host without disclosure | AD-5 |
| Mutable ad-hoc logs | AD-18 |
| Baking a closed PRD §16 answer into a locked enum | AD-22 (as a prohibition — not as a shared flag store; see P12) |

The spine's failures are **seam contracts**, not paradigm or vendor-isolation.

---

## AD gap map (holes → bind)

| Pair | Missing bind | Suggested AD action |
| --- | --- | --- |
| P1 | Contact-share entity + writer | New AD + AD-3 row; strip from `taaruf_stage` |
| P2 | Who applies pipeline outcome; `blur-and-warn` vs state | Tighten AD-10 + AD-15; shared outcome enum |
| P3 | `Case` / `MODERATION_CASE` owner | Tighten AD-3; fix ER |
| P4 | Conversation create/close command | New lifecycle AD; Chat-only writer |
| P5 | Visibility / minor-hold writer | New AD; split AD-13 joint outcome |
| P6 | Entitlement result shape vs quota | Tighten AD-14/21 |
| P7 | Gender/presentation writer | Tighten AD-8 + AD-3 |
| P8 | Single SMS command path | Tighten AD-16 |
| P9 | Grant kinds + mahram authz | Tighten AD-9 + AD-12 |
| P10 | Sanction fan-out | New enforcement AD |
| P11 | Port/DTO/ID ownership | New published-contract AD |
| P12 | Flag store + erase orchestrator | Tighten AD-22; new erasure AD |

Minimum close for a consistent feature-spine fork: **P1, P2, P3, P4, P5**. P11 is the meta-hole (without owned port types, every new AD remains a name).

---

## Two-team sketches (executable thought experiment)

### Sketch 1 — “Invite accept to first photo”

- **Invites** creates conversation A (`{ memberA, memberB }`) and a `message_flash` that **skips** ModerationPort (flash is not “Chat text” under a literal reading of AD-10).
- **Chat** also creates conversation B from `invite.accepted`, puts the flash in as `message.state=pending`, and waits for Moderation.
- Sister attaches Mahram to conversation A (the id Invites returned). Brother chats on conversation B.
- First photo: Media mints `reveal_grant` for the two member ids on B; Mahram on A gets no grant (P9) and sees a different thread (P4).
- Contact-share: Chat flips `taaruf_stage` on B; Trust never wrote a grant (P1). Phone appears in Chat's REST body and not in Trust's.

All ADs cited above remain satisfied.

### Sketch 2 — “Held photo, human allow, suspected minor”

- **Moderation** job outcome `blur-and-warn` then human `allow` on the job. Chat never called apply (P2). WS clients still have `message.held`.
- Parallel **Verification** hold_minor on the uploader; **Discovery** still lists the card (P5).
- Member reports the card. **Trust** opens `moderation_case-1`. **Moderation** already has `hold_queue-9`. Operator SLA is two clocks (P3).
- Ban issued. Session cookie stays valid (P10).

All ADs cited above remain satisfied.

---

## Reviewer note

This review does not propose implementation, stack changes, or edits to the spine. It only names seams two AD-compliant teams can still fork. Closing a pair means writing an AD that makes one of the two builds *illegal*, not documenting both as options.
