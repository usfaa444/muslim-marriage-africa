---

> **Annotation 2026-10-01 (final spine).** AD-12 no longer names Chat `pending`/`held` or a staff hold queue. Findings in this file that say it does were written against a mid-edit spine and are stale. The final AD-10 rule forbids a pre-delivery Chat hold.
name: review-adversarial
artifact: ARCHITECTURE-SPINE.md
lens: adversarial
date: 2026-10-01
status: complete
kind: correction-of-record
supersedes: reviews/review-adversarial.md
---

# Adversarial review — architecture spine (correction of record, 2026-10-01)

**Artifact:** `_bmad-output/planning-artifacts/architecture/architecture-muslim-marriage-africa-2026-09-27/ARCHITECTURE-SPINE.md`  
**Lens:** Attack the spine as an adversary. Construct two units one level down (two feature teams) that each obey every AD to the letter and still ship incompatibly — clashing shared-data shapes, two owners of one entity, conflicting state-mutation paths. Every pair is a hole to close with a new or tightened AD.  
**Scope of reading:** the spine only. Companions, PRD, SOLUTION-DESIGN, memlog, and the 2026-09-27 adversarial review are not authority. The 2026-09-27 review is historical; its hold / fail-closed / `hold_queue` claims do not apply to this spine.  
**Locked (not holes):** A1–A3; product name; AD-5; stack pins; Capacitor (AD-4); AD-9 blur/reveal/gateway; AD-12 Mahram read-delivered-only.  
**Binding Chat rule (AD-10, 2026-10-01):** persist `delivered` immediately; background `ModerationPort` scan; `flag_queue` of already-delivered items; AI never holds / blocks / refuses / auto-suspends; AI 5xx / timeout / empty / low-confidence = `scan-deferred` / `scan-failed`, not hold. Profile Photo / bio stay publish-gated (FR-065). Contact-share (AD-17) is the deterministic phone / WhatsApp / link predicate. Money-ask is delivered and flagged.  
**New-AD bar:** do not invent a new AD unless two teams can still build Chat *delivery* incompatibly while obeying AD-10. Remaining delivery forks close by tightening AD-10 / AD-17 / AD-3.

## Method

Two hypothetical feature teams — **Team A** and **Team B** — are given the spine and nothing else. Each team:

- ships one API product, hexagonal modules, ports, adapters (AD-1, AD-2);
- writes only the entities AD-3 assigns them;
- persists Chat text / Chat Photo / Voice / Flash as `delivered` and never holds on AI (AD-10);
- uses `/v1`, the error envelope, UUID v7, UTC, `AuthContext`, `operator_config` (AD-7, conventions);
- keeps billing off the safety path (AD-21);
- leaves PRD §16 questions 1 and 3–11 as flags/rows/disabled ports (AD-22).

If those two teams can still disagree on a shared record, a writer, or a mutation path, the spine does not yet bind that seam. A pair that only exists by *violating* AD-10 (pre-delivery hold, AI refuse, publish-gate applied to Chat as a send block) is not a hole.

## Verdict

**revise**

The 2026-10-01 amendment holds for the thing it was written to lock: two teams **cannot** lawfully rebuild a Chat `pending→delivered` machine, a `hold_queue`, an AI send-block, or a money-ask hold. `message.state` at persist is `delivered`; moderation is forbidden from writing it; contact-share is a chat-owned row plus `ChatPort.contactShareOpen`; `flag_queue` and `moderation_case` now have named owners.

That is not enough. Teams that obey every sentence can still:

- persist or refuse the **same** phone-bearing Message Flash (contact-share is conversation-scoped; Flash is invite-scoped);
- sign or withhold **Chat Photo / Voice** bytes depending on whether `MediaPort.applyModeration` is treated as a kind-less photo rule;
- leave `flag_queue` empty because `scanText` / `scanImage` are vendor calls with no named enqueue/apply command;
- open two staff workbenches for one AI flag (`flag_queue` vs `moderation_case` “opened by the passive flag”).

No new AD is justified: none of these restore a second Chat delivery machine. Close them by tightening AD-10, AD-17, and the AD-3 kind/command sentences below. Do not reopen A1–A3, name, AD-5, stack, Capacitor, AD-9, or AD-12.

---

## What the 2026-10-01 correction already binds (not holes)

These attacks die. Do not spend AD budget here.

| Attack | Why it dies |
| --- | --- |
| Pre-delivery Chat hold / `pending→delivered` / `hold_queue` | AD-10 persist-`delivered`; clocks deleted; Prevent names the second machine |
| AI 5xx / timeout / empty / low-confidence as send block | AD-10 records `scan-deferred` / `scan-failed` on `flag_queue`; does not delay send |
| AI refuses or auto-suspends | AD-10: AI does not block, hold, refuse, or auto-suspend; admin chooses FR-144 |
| Money-ask held | AD-10 + AD-17: delivered and flagged, even after Contact-share |
| Contact-share as a second module-owned grant | AD-3 `contact_share` → chat; AD-17 only chat writes; AD-23 `taaruf_stage` must not encode it; others read `ChatPort.contactShareOpen` |
| Moderation writes `message.state` | AD-10 apply path: moderation writes `moderation_job` + `flag_queue` only |
| Profile publish-gate used as a Chat *send* hold | AD-10 Prevent + “recipient sees them without waiting for AI” |
| Conversation born twice / closed by outcomes | AD-23 `ChatPort.openFromInvite` / `closeFromMarriage` |
| Discovery invents visibility | AD-13 `ProfilePort.setVisibility`; AD-23 discovery reads `profile.visibility` only |
| Mahram reads `pending`/`held` Chat | AD-12 locked: read-delivered-only (and Chat has no those states) |
| Second blur path / raw bucket pre-sign | AD-9 locked |
| Second UI / USA web host / stack fork | AD-4, AD-5, Stack — locked |

---

## Incompatibility pairs

Each pair is a hole. Suggested closure is a **tighten** of an existing AD unless noted. No new AD.

### P1 — Message Flash can carry a phone because contact-share has no conversation yet

**Clash type:** conflicting state-mutation paths / Chat-adjacent delivery fork  
**Teams:** Invites vs Chat  
**Severity:** high

**What the spine says**

- AD-3: invites owns `message_flash`; chat owns `message`, `contact_share`.
- AD-10: Message Flash is persisted `delivered` immediately, then scanned. Contact-share is the send-time predicate for phone / WhatsApp / links — not the AI.
- AD-15: contact-share reject is HTTP `CONTACT_SHARE_REQUIRED` to the sender, not a recipient hold.
- AD-17: only chat writes `contact_share`; others call `ChatPort.contactShareOpen`.
- AD-23: conversation is inserted only after Sister accept or she sent the Invite. `CONVERSATION ||--o| CONTACT_SHARE`.
- ER: Flash is not on the ER. Contact-share hangs off conversation only.

**Lawful Team Invites.** Flash lives on the invite *before* a conversation exists. `ChatPort.contactShareOpen(conversationId)` cannot be called — there is no id. AD-10 orders persist-`delivered` immediately. They persist `message_flash` with a WhatsApp number. After persist they call `ModerationPort.scanText`. Image/text phones after delivery may flag (AD-10). They never return `CONTACT_SHARE_REQUIRED`.

**Lawful Team Chat.** Flash is a Chat-family item (AD-10 lists it with Chat text / Photo / Voice). AD-17 is the *single* predicate for phones. They refuse to let Invites persist a Flash that matches the detector; Invites must call Chat. Chat returns `CONTACT_SHARE_REQUIRED` (or a hard refuse: no conversation ⇒ contact-share cannot be open ⇒ phones are illegal). No `message_flash` row.

**Incompatibility.** The same Sister-to-Brother Flash either arrives with a phone (Invites) or never exists (Chat). That is Chat-family *delivery*, not a hold machine. Both teams obeyed AD-10 (no AI refuse, persist-delivered when they do persist) and AD-17 (predicate is conversation-scoped, so it is undefined on an invite).

**Hole to close.** Tighten AD-17 (and one AD-10 sentence): name the Flash rule. Either (a) Flash **cannot** contain phone / WhatsApp / links — Invites runs the same detector and always refuses (`CONTACT_SHARE_REQUIRED` or a Flash-specific code) because `contact_share` cannot be open without a conversation, or (b) Flash **is not** a contact-share surface — phones in Flash are persisted `delivered` and flagged after scan, like money-ask. Pick one. Do not leave “predicate has no conversation id” as an implicit allow.

**Canonical**

- `location`: AD-10 Rule (Flash + contact-share sentence); AD-17 contact-share; AD-3 `message_flash` vs `contact_share`; AD-23 conversation insert
- `trigger_condition`: Flash is invite-scoped; contact-share is conversation-scoped; no rule for phones on Flash
- `guard_snippet`: Bind Flash phones to always-refuse **or** deliver-and-flag; Invites must not invent a third predicate
- `potential_consequence`: one build leaks WhatsApp on the invite card; the other 409s the same payload

---

### P2 — Chat Photo / Voice bytes still have no asset kind; Media can withhold `sign`

**Clash type:** clashing shared-data shape / Chat delivery of media bytes  
**Teams:** Chat vs Media (Profiles as the publish-gate twin)  
**Severity:** high

**What the spine says**

- AD-3: media owns `photo_asset`, `derivative`, `signed_grant`, `reveal_grant`. Chat owns `message`. No `kind` enum on `photo_asset`. Content owns `audio_asset` (Académie), not Chat Voice.
- AD-9 (locked): only `MediaPort.sign` mints a URL; blur-by-default for opposite-gender; gateway re-checks grant. Not a hole.
- AD-10 Prevent: applying the Profile publish-gate to Chat. Rule: Chat Photo and Voice are persisted `delivered`; recipient sees them without waiting for AI; `ProfilePort.applyModeration` / `MediaPort.applyModeration` apply **only** to the Profile Photo / bio publish gate; Discovery omits unpublished profile photos.
- AD-15: any media URL on the socket is still minted only by `MediaPort.sign`. Persist emits `message.delivered` immediately.

**Lawful Team Chat.** Persist `message` `{ kind: photo|voice, media_id, state: delivered }`. Emit `message.delivered`. Call `MediaPort.sign(assetId, blur|granted, viewerId)` on persist. They never call `MediaPort.applyModeration` for chat-kind items. Recipient sees the bubble and a blur (or reveal) thumb.

**Lawful Team Media.** AD-3 gives them one `photo_asset` noun. They implement one ingest: `moderation_state=pending` until `MediaPort.applyModeration`. `sign` refuses any asset that is not `live` (they read FR-065 / the applyModeration sentence as “photos are unpublished until reviewed”). Chat Voice is stored as `photo_asset` (no other owner) or they refuse audio and tell Chat to use `content.audio_asset`. Chat’s `message` row is `delivered` (they did not write `message.state`). The WS event fires. The GET gateway returns 403 / empty derivative.

**Incompatibility.** Same Chat Photo: Team Chat’s client shows a (blurred) image; Team Media’s client shows a delivered shell with no bytes until a human allow — the Profile publish-gate applied to Chat *pixels* while the message row stayed `delivered`. AD-10’s Prevent names this, but the Rule never names `photo_asset.kind` or says `sign` for chat-kind **must** succeed without `applyModeration`. A Media team that never reads “Chat Photo” as a different kind is still letter-compliant on AD-3 and AD-9.

Voice is worse: no entity. Chat stores an object key on `message`; Media invents `photo_asset.kind=voice`; Content claims `audio_asset`. Three playback URLs.

**Hole to close.** Tighten AD-10 + AD-3: asset kinds `profile_photo | chat_photo | voice_note` (media-owned). `MediaPort.applyModeration` is legal **only** for `profile_photo` (and bio via Profiles). `MediaPort.sign` for `chat_photo` / `voice_note` must not wait on applyModeration. Chat Voice is not `content.audio_asset`. Message stores `media_id` only. Blur/reveal stay AD-9.

**Canonical**

- `location`: AD-10 apply-path / publish-gate sentence; AD-3 `photo_asset` (no kind); Structural Seed ER (`PROFILE ||--o{ PHOTO_ASSET`)
- `trigger_condition`: one photo_asset noun, applyModeration named, no kind that excludes Chat
- `guard_snippet`: Bind kinds; forbid applyModeration on chat_photo/voice_note; sign-on-persist for those kinds
- `potential_consequence`: recipient “sees” a delivered Photo that cannot load until profile-style review

---

### P3 — `ModerationPort.scan*` is not an apply command; nobody is bound to write `flag_queue`

**Clash type:** conflicting state-mutation paths  
**Teams:** Chat vs Moderation  
**Severity:** high

**What the spine says**

- AD-3: moderation is the only writer of `moderation_job`, `flag_queue`. Chat is the only writer of `message`.
- AD-2: modules never read other modules’ tables.
- AD-10: after persist, “a background job calls `ModerationPort` (`scanText`, `scanImage`, `transcribe`, `classifyAudio`)”. Outcomes: `flag-for-admin` (item enters `flag_queue`) or clean. Apply path: moderation writes job + `flag_queue` only; never `message.state`.
- AD-1: modules contribute queue processors; they do not deploy their own queues.
- Named methods are vendor-shaped (scan / transcribe / classify), not `enqueueScan` / `recordOutcome`.

**Lawful Team Chat.** After INSERT `message`, they enqueue a **Chat** processor `chat.scanRequested` that calls `ModerationPort.scanText(plaintext)` and treats the return as advice. They do not write `flag_queue` (not theirs). They do not call a second port. If `scanText` is a pure vendor wrapper, the outcome evaporates. Ciphertext (AD-17) is decrypted in Chat and passed in the BullMQ payload — or they pass only `messageId` and expect Moderation to read the row (illegal under AD-2), so they pass ciphertext and scans fail closed-as-`scan-failed`… except Chat never writes that either.

**Lawful Team Moderation.** `scanText` is the vendor adapter. `flag_queue` is written only inside `applyScanResult(jobId, outcome)`. They wait for `ModerationPort.enqueue({ itemId, kind, payload })` — the only lawful way they learn a message exists without reading chat tables. Chat never called `enqueue` (not a named method). Jobs table stays empty. Metrics (AD-20) show zero scans.

**Incompatibility.** One build: every message is scanned, flags appear, SLA clocks start. The other: every message is delivered (AD-10 satisfied) and `flag_queue` is permanently empty. Delivery is compatible; the *scan contract* AD-10 exists to bind is not. This is the ChatPort vs ModerationPort apply-path hole: ChatPort has `openFromInvite` / `contactShareOpen` / `closeFromMarriage` and **no** `provideScanPayload`; ModerationPort has vendor verbs and **no** enqueue.

**Hole to close.** Tighten AD-10 apply path (not a new AD): (1) Chat persist **must** call `ModerationPort.enqueueScan({ itemId, itemKind, payload })` after commit — that call is the only INSERT of `moderation_job`; (2) payload is plaintext / bytes provided by Chat (decrypt) or `MediaPort.fetchForScan(mediaId)` — Moderation does not SELECT `message` and does not persist plaintext on the job; (3) `scan*` run on the `worker`; outcome writer is moderation (`flag_queue` for `flag-for-admin` | `scan-deferred` | `scan-failed`; no row for clean); (4) Chat must not write `message.state` or a `message.scan_outcome` projection unless the spine names that column.

**Canonical**

- `location`: AD-10 “after persist, a background job calls ModerationPort”; apply-path sentence; AD-2 never-tables
- `trigger_condition`: vendor methods named; enqueue/apply command not named; Chat cannot write flag_queue
- `guard_snippet`: Bind `enqueueScan` as the post-persist command; bind who decrypts; bind that only moderation INSERTs flag_queue from that job
- `potential_consequence`: send-first Chat ships with no flags, or double-scan if both teams enqueue

---

### P4 — “AI-originated case is opened by the passive flag” vs trust-owned `moderation_case`

**Clash type:** two owners of one work item / two mutation paths  
**Teams:** Moderation vs Trust  
**Severity:** high

**What the spine says**

- AD-3: `flag_queue` → moderation; `moderation_case` → trust. Prevent still names “Case”.
- AD-10: Member Reports open a `moderation_case` written only by trust; “an AI-originated case is opened by the passive flag”; the sanction is the admin action. Human flag-queue SLA starts when the flag enters the queue. Same 24h clock as Reports.
- ER: `REPORT ||--o| MODERATION_CASE : opens`. `MODERATION_JOB ||--o| FLAG_QUEUE : may_open`. **No** edge from `FLAG_QUEUE` to `MODERATION_CASE`.
- Capability map: flag queue → moderation; Report / case / strike → trust.

**Lawful Team Moderation.** The workbench is `flag_queue`. “Opened by the passive flag” means the flag *is* the case (no second row). Admin acts on `/flags/:id` (warning / suspend). They call `TrustPort.applySanction` and do not INSERT `moderation_case` (not theirs). Reports are a separate trust queue.

**Lawful Team Trust.** “Opened by the passive flag” is a write they must perform: on every `flag-for-admin` they INSERT `moderation_case` (`source=ai_flag`, FK to flag). Admin acts only on cases. A flag with no case is invisible. They poll `ModerationPort.listNewFlags` or require Moderation to call `TrustPort.openFromFlag(flagId)`. If Moderation never calls, AI flags never become cases and never get sanctions.

**Incompatibility.** Two ids, two workbenches, two SLA start stamps (`flag_queue.entered_at` vs `moderation_case` opened later). Operator “first human on this AI flag” cannot be joined. AD-3 assigned the *rows*; AD-10 left the *command* that creates an AI case unspecified. ER contradicts the AD-10 sentence.

**Hole to close.** Tighten AD-10 (and align the ER): pick one. (a) AI flags **do not** create `moderation_case`; staff work `flag_queue`; admin action calls `TrustPort.applySanction({ flagId })`; cases are Member-Report only — delete the “AI-originated case is opened by the passive flag” clause. Or (b) every `flag-for-admin` **must** call `TrustPort.openFromFlag(flagId)`; trust is the only INSERT of `moderation_case`; staff act on cases; `flag_queue` is the scan ledger. Do not leave both sentences live.

**Canonical**

- `location`: AD-10 last sentences (Reports / “AI-originated case”); AD-3 table; ER `REPORT ||--o| MODERATION_CASE`
- `trigger_condition`: case has an owner but two lawful openers; ER only knows Report
- `guard_snippet`: One command: either no AI case, or `TrustPort.openFromFlag` only
- `potential_consequence`: flags without sanctions, or two clocks for one human SLA

---

### P5 — “marks the person flagged” has no entity and two lawful writers

**Clash type:** two owners of one entity  
**Teams:** Moderation vs Trust (Identity as a third)  
**Severity:** medium

**What the spine says**

- AD-10: `flag-for-admin` “marks the person flagged; the already-delivered item enters `flag_queue`”.
- AD-3: no `person_flag`, no `account.flagged`. Trust owns `strike`, `sanction`. Identity owns `account`. Moderation owns `flag_queue`.
- AI must not auto-suspend. Sanction is the admin action.

**Lawful Team Moderation.** “Person flagged” is `flag_queue.account_id` plus an open-flag count. No other write.

**Lawful Team Trust.** “Person flagged” is a person-level outcome they own. They write `strike` (or `sanction.kind=flagged`) when the flag lands — not a suspend, so AD-10’s “AI does not auto-suspend” still holds.

**Lawful Team Identity.** They add `account.flagged_at` because “the person” is the account.

**Incompatibility.** Discovery / staff badges / paid-faster-review position read three different facts. A member is “flagged” in Moderation and clean in Trust. This is not Chat delivery — do not mint a new AD — but it is a second writer of the *person* mark AD-10 introduced.

**Hole to close.** Tighten AD-10: “marks the person flagged” means a `flag_queue` row with `account_id` (and staff UI). It is **not** a `strike`, `sanction`, or `account` write. Those stay admin-only via trust / identity.

**Canonical**

- `location`: AD-10 “marks the person flagged”
- `trigger_condition`: noun has no AD-3 row
- `guard_snippet`: Define it as flag_queue.account_id only; forbid AI-time strike/account writes
- `potential_consequence`: three “this person is flagged” bits; Discovery or billing perk reads the wrong one

---

### P6 — Message Flash is delivered twice (invite row and chat message)

**Clash type:** two owners of one payload  
**Teams:** Invites vs Chat  
**Severity:** medium

**What the spine says**

- AD-3: `message_flash` → invites; `message` → chat.
- AD-10: Flash is persisted `delivered` immediately (same sentence as Chat text).
- AD-23: chat refuses messages without a conversation FK; conversation exists only after Sister accept or she sent.

**Lawful Team Invites.** One `message_flash` row on the invite. Scan keyed by `message_flash.id`. No `message` insert (conversation may not exist).

**Lawful Team Chat.** AD-10 lists Flash with Chat items. After `openFromInvite`, they INSERT `message.kind=flash` copying the body so Mahram read-all (AD-12, locked) and `message.delivered` WS apply. Invites already persisted `message_flash`. Two delivered copies; two scan jobs if both enqueue (P3).

**Incompatibility.** Recipient sees Flash on the invite card, in the thread, or both. Flag/unsend (admin) hits one row. Tighten AD-10: Flash is **only** `message_flash` (invites writer); Chat must not INSERT a parallel `message`; after conversation open, Chat may *reference* `flash_id` as a read-through, not a second body. Scan once, `itemKind=message_flash`.

**Canonical**

- `location`: AD-3 `message_flash` vs `message`; AD-10 Flash in the persist list
- `trigger_condition`: one product noun, two tables, no “do not copy” rule
- `guard_snippet`: Single writer (invites); chat stores FK only if the thread must show it
- `potential_consequence`: double delivery, double flag, Mahram sees a different copy than the member

---

### P7 — Chat ciphertext vs who may give plaintext to the scanner

**Clash type:** clashing shared-data shape / scan path  
**Teams:** Chat vs Moderation  
**Severity:** medium

**What the spine says**

- AD-17: chat bodies at rest are `{v, alg, kid, iv, ct}`; `kid` in Secret Manager.
- AD-10: background job calls `scanText` / `transcribe` (needs plaintext / audio).
- AD-2: Moderation must not SELECT chat tables.
- AD-19: destinataires include moderation/ASR vendors.

**Lawful Team Chat.** Worker decrypts and puts plaintext in the Redis job payload (or never decrypts and passes `ct`; vendor scores garbage → `scan-failed` they don’t write — P3).

**Lawful Team Moderation.** They refuse to hold the DEK. `scanText` requires plaintext in-process. They have no `ChatPort.provideScanPayload`. Scan is empty / `scan-failed`.

**Incompatibility.** Not a delivery fork (AD-10 already says scan failure must not hold). It is a CIL/scan fork: one build sends bodies to the vendor; the other records 100% `scan-failed` or never scans. Tighten AD-10 with P3: Chat decrypts in-process and passes payload into `enqueueScan`; Moderation must not persist body/bytes on `moderation_job`; job row stores ids + scores + outcome only (AD-18 already forbids phones / original bytes on audit).

**Canonical**

- `location`: AD-17 ciphertext envelope; AD-10 scan methods
- `trigger_condition`: scanner needs plaintext; writer of plaintext-to-port is unnamed
- `guard_snippet`: ChatPort/MediaPort provide in-process scan payload; no DEK in moderation; no body on job row
- `potential_consequence`: silent scan-failed flood, or plaintext sitting in BullMQ/job tables

---

### P8 — `scan-deferred` / `scan-failed` on `flag_queue` vs job-only retry

**Clash type:** clashing shared-data shape  
**Teams:** Moderation vs Operator (staff SLA)  
**Severity:** medium

**What the spine says**

- AD-10: AI 5xx / timeout / empty / low-confidence → record `scan-deferred` / `scan-failed` **on `flag_queue`**. Human flag-queue SLA starts “when the flag enters the queue.”
- AD-11: `mos`/`dyu` or low confidence “flags **or** records `scan-deferred`.”
- AD-20: metrics include scan-deferred / scan-failed count **and** flag-queue age (two series).

**Lawful Team Moderation-A.** Every deferred/failed insert is a `flag_queue` row. The 24h first-human clock starts. `mos` Voice notes always occupy a human slot.

**Lawful Team Moderation-B.** They read “record on flag_queue” as a status on `moderation_job` (the job “is” the queue item) and only promote `flag-for-admin` to the human workbench. Deferred items retry on the worker. SLA does not start. AD-11’s “or” lets them skip the flag.

**Incompatibility.** Same Voice note: human must see it within 24h, or it retries forever with a metric bump and no human. Tighten AD-10/AD-11: `scan-deferred` / `scan-failed` **are** `flag_queue.reason` values (human-visible, same clock) **or** they are job-only with a named retry and must **not** start the human SLA. Delete AD-11’s “flags or”.

**Canonical**

- `location`: AD-10 scan-deferred sentence + SLA sentence; AD-11 “flags or records”
- `trigger_condition`: same nouns on two stores; AD-11 offers an or
- `guard_snippet`: One store and one clock policy; remove the or
- `potential_consequence`: NFR-003 clock is either flooded with ASR misses or never starts

---

### P9 — Admin “other published action” can unsend; Chat reads AD-10 as never-unsend

**Clash type:** conflicting state-mutation paths  
**Teams:** Trust vs Chat  
**Severity:** medium

**What the spine says**

- AD-10: a later *flag* does not unsend. Admin chooses warning, suspend, or another published action (FR-144). Sanction is the admin action. No Chat `pending→delivered` machine — silent on `delivered→retracted`.
- AD-3: chat writes `message`; trust writes `sanction`.

**Lawful Team Trust.** FR-144 “other” includes remove-from-recipient-view. They call `ChatPort.retract(messageId)` after a case/flag decision. Chat writes `message.retracted_at` (they are the writer). Recipient no longer sees the body.

**Lawful Team Chat.** “Later flag does not unsend” plus “no second Chat state machine” means `message.state` is write-once `delivered`. Admin may suspend the *account* (`IdentityPort.revokeSessions`, AD-8) but must not mutate the item. `ChatPort.retract` does not exist.

**Incompatibility.** After the same admin click, the recipient still has the indecent Photo (Chat) or does not (Trust). That is post-delivery visibility, not a pre-delivery hold. Tighten AD-10: either (a) write-once `delivered` — admin never unsends; sanction is person-level only, or (b) admin unsend is allowed **only** via `ChatPort.retract`, Chat is the only writer, and this is **not** an AI path. Name `message.state` as write-once `delivered` plus optional `retracted_at` if (b).

**Canonical**

- `location`: AD-10 “later flag does not unsend” + FR-144 admin actions; AD-3 `message`
- `trigger_condition`: AI unsend forbidden; admin unsend neither forbidden nor commanded
- `guard_snippet`: Write-once delivered **or** named ChatPort.retract for admin only
- `potential_consequence`: two recipient histories for the same sanctioned item

---

### P10 — Contact-share *detector* is unnamed; Chat and Invites ship different matchers

**Clash type:** clashing shared-data shape  
**Teams:** Chat vs Invites (Moderation as a third “lexicon” owner)  
**Severity:** medium

**What the spine says**

- AD-10: contact-share is the deterministic send-time predicate — not the AI. Image scan may flag visible phone/QR **after** delivery.
- AD-17: single predicate; chat writes the row; others call `ChatPort.contactShareOpen`.
- No DTO for what counts as phone / WhatsApp / link. No owner of the matcher.

**Lawful Team Chat.** Detector is in chat domain: E.164 / `wa.me` / `http(s)` only. Worded numbers (“sept…”) persist. They check `contact_share` then persist or `CONTACT_SHARE_REQUIRED`. They never call ModerationPort at send time (AI must not refuse).

**Lawful Team Invites.** Flash / invite copy uses a looser digit-run matcher (P1). Or they call `ModerationPort.scanText` *before* persist as a “deterministic lexicon, not AI” and map a hit to refuse — they claim that is not the AI vendor, it is lists (AD-11 lexicon). AD-10 says the predicate is not the AI; it does not say ModerationPort cannot be the detector.

**Incompatibility.** Same string persists on one build and 409s on the other. Money-ask is safely delivered (bound). Phones are not. Tighten AD-17: the detector lives in **chat** (one function); Invites/Flash must call `ChatPort.containsContactPayload(text)` (or equivalent) — not `ModerationPort` — at send time; ModerationPort is after-persist only. Name the match surface (E.164, `wa.me` / `api.whatsapp.com`, `http(s)` / `www`) so two chat implementations cannot diverge at initiative altitude. Image/QR remains after-delivery flag only.

**Canonical**

- `location`: AD-17 contact-share sentence; AD-10 “not the AI”
- `trigger_condition`: grant owner named; matcher owner and tokens not named
- `guard_snippet`: Chat-owned detector; bind tokens; forbid send-time ModerationPort
- `potential_consequence`: phone leak on Flash/text in one app build, refuse in the other

---

## Additional pairs (same class; close if tightening the top set)

These do not change the verdict. They are not Chat-delivery-machine forks. Do not invent a new AD for them.

### P11 — `BillingPort.isEntitled` vs `invite_quota`

**Teams:** Billing vs Invites. AD-21 result is `true | false | unavailable`. AD-3 gives Invites `invite_quota` and Billing `entitlement`. Two sources of “invites left.” Tighten AD-21/AD-23: `invite_quota` is written only by Invites from `isEntitled` + `operator_config` free/premium caps; Billing must not expose a second remaining-int.

### P12 — Sister/Brother writer

**Teams:** Identity vs Profiles. AD-8: presentation is a Member attribute; `AuthContext.gender?` is optional. AD-3: no `gender` row. Tighten AD-8 + AD-3: Identity writes `account.gender`; Profiles reads `IdentityPort.presentation` only; `AuthContext.gender` required for `member`.

### P13 — SMS command path

**Teams:** Identity vs Notifications. AD-16: one live `SmsPort` adapter. AD-3: `sms_dispatch` → notifications. Identity may still send OTP via its own adapter wrapper without writing `sms_dispatch`. Tighten AD-16: all SMS commands go through `NotificationsPort.dispatchSms`; `SmsPort` is Notifications’ outbound adapter only.

### P14 — Ban fan-out beyond sessions

**Teams:** Trust vs Chat vs Discovery. AD-8 binds `ban` → `IdentityPort.revokeSessions`. Chat refuse and Discovery hide are still optional callers. Tighten AD-8 or AD-23: ban must also make `ChatPort.refuse` and Discovery omit; not a new AD.

### P15 — `packages/ports` still has no publisher

**Teams:** any two port authors. Conventions say shared port types; no owner. Residual of the 2026-09-27 P11. Meta-hole: every tightened method name above (`enqueueScan`, `openFromFlag`, `containsContactPayload`) will fork if two packages publish the same port. Close in conventions / AD-7: one publisher for `packages/ports`.

---

## AD gap map (holes → bind)

| Pair | Missing bind | AD action |
| --- | --- | --- |
| P1 | Flash × conversation-scoped contact-share | Tighten AD-17 + AD-10 (always-refuse **or** deliver-and-flag) |
| P2 | `photo_asset.kind`; applyModeration vs Chat sign | Tighten AD-10 + AD-3 kinds |
| P3 | enqueue/apply command; who writes `flag_queue` | Tighten AD-10 apply path |
| P4 | AI flag → case command | Tighten AD-10; fix ER edge |
| P5 | “person flagged” writer | Tighten AD-10 (queue row only) |
| P6 | Flash body copied into `message` | Tighten AD-10 (single writer) |
| P7 | plaintext scan payload | Tighten AD-10 with P3 |
| P8 | deferred on queue vs job; AD-11 `or` | Tighten AD-10 + AD-11 |
| P9 | admin unsend | Tighten AD-10 write-once vs `ChatPort.retract` |
| P10 | contact detector owner + tokens | Tighten AD-17 |
| P11–P15 | quota / gender / SMS / ban fan-out / ports package | Tighten existing ADs / conventions |

**Do not add AD-27** for Chat delivery. Two teams cannot rebuild hold / AI-refuse / money-ask-hold while obeying AD-10. The remaining delivery forks (P1, P2, P10) are under-specified predicates and kinds on AD-10/AD-17, not a missing decision.

Minimum close before feature-spine fork: **P1, P2, P3, P4**. P5 and P9 are the next sentence each.

---

## Two-team sketches (executable thought experiment)

### Sketch 1 — “Invite Flash with a WhatsApp number”

- **Invites** persists `message_flash` containing `wa.me/226…` (no conversation; `contactShareOpen` inapplicable). Recipient sees it on the invite card. Background scan may flag (P1, P6).
- **Chat** would have returned `CONTACT_SHARE_REQUIRED` and written nothing (P1, P10).
- If the Sister later accepts, Chat `openFromInvite` copies the Flash into `message` (P6). Moderation enqueues a second job — or does not, waiting for `enqueueScan` Chat never called (P3).
- Staff: Moderation has `flag_queue-12`. Trust has no `moderation_case` (P4). Admin suspends in one UI; the other still shows clean.

All cited ADs remain satisfied.

### Sketch 2 — “Chat Photo, publish-gate-shaped Media, AI 5xx”

- **Chat** persists `message.state=delivered`, emits `message.delivered`, does not wait (AD-10).
- **Media** withholds `sign` until `applyModeration` on the undifferentiated `photo_asset` (P2). Recipient has a delivered bubble and no pixels. Profile bio on the same account correctly stays unpublished (FR-065) — the gate leaked sideways, not onto Profile.
- Worker: Chat called `scanImage(messageId)` with no bytes; Moderation cannot read tables (P3, P7). Outcome never written. Or Moderation records `scan-failed` on the job only; flag-queue SLA never starts (P8).
- Admin later “removes” the Photo via Trust; Chat refuses to retract (P9). Mahram still reads the delivered row (AD-12, locked, correct).

All cited ADs remain satisfied.

---

## Reviewer note

This is a correction-of-record review. It does not propose stack changes, hosting changes, or edits to the spine file. It does not treat locked items as holes. Closing a pair means writing a sentence that makes one of the two builds *illegal*, not documenting both as options. If P1–P4 are closed in AD-10/AD-17/AD-3, a re-run of this lens should be able to verdict **pass** or **pass-with-findings** without a new AD.
