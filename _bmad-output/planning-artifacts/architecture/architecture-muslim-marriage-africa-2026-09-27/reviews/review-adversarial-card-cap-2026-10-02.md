---
name: review-adversarial-card-cap
artifact: ARCHITECTURE-SPINE.md
lens: adversarial
date: 2026-10-02
status: complete
kind: reviewer-gate
focus: AD-12 mahram_thread_grant / AD-28 card vs grid / AD-29 message_quota vs invite_quota
---

# Adversarial review — architecture spine (card / cap / mahram grant, 2026-10-02)

**Artifact:** `_bmad-output/planning-artifacts/architecture/architecture-muslim-marriage-africa-2026-09-27/ARCHITECTURE-SPINE.md`  
**Lens:** Attack the spine as an adversary. Construct two units one level down (two feature teams) that each obey every AD to the letter and still ship incompatibly — clashing shared-data shapes, two owners of one entity, conflicting state-mutation paths. Every pair is a hole to close with a new or tightened AD.  
**Scope of reading:** the spine only. Companions, PRD, SOLUTION-DESIGN, memlog, UX, and prior reviews are not authority.  
**Locked (not holes):** A1–A3; product name; AD-5; stack pins; Capacitor (AD-4); AD-9 blur/reveal/gateway; AD-10 / AD-11 passive Chat. Do not reopen AD-5, AD-10, or AD-11. Do not make Brothers free. Do not revert passive moderation.  
**New-AD bar:** do not invent a new AD unless two teams can still build card quick-message, `message_quota`, or `mahram_thread_grant` incompatibly while obeying AD-12, AD-23, AD-28, and AD-29. Remaining forks close by tightening those ADs plus AD-2 / AD-17 / AD-21 / AD-3. Do not reopen AD-27's Invite-reach core.

## Method

Two hypothetical feature teams — **Team A** and **Team B** — are given the spine and nothing else. Each team:

- ships one API product, hexagonal modules, ports, adapters (AD-1, AD-2);
- writes only the entities AD-3 assigns them (`mahram_thread_grant` → mahram; `message_quota` → chat; `invite_quota` → invites);
- keeps the grant list empty after OTP + Sister confirm; does not auto-grant new chats; revoke-one drops that thread; remove/report drops every grant within 60s (AD-12);
- never lets mahram INSERT `conversation` (AD-23);
- lets a Chat / Flash / card quick-message send call `BillingPort.isEntitled` **only** to decide the FR-146 cap; never from safety, browse, attach, accept, or `openFromInvite` (AD-2, AD-21);
- never calls `BillingPort` from Sister invite send / quota GET / compose when `free_unlimited` (AD-27);
- offers Sister checkout in **both** `sister_reach_mode` values (AD-14, AD-27, AD-29);
- emits `QUOTA_EXCEEDED` only from invites / `invite_quota`; emits `MESSAGE_CAP_EXCEEDED` only from chat, or from invites Flash / card quick-message after `ChatPort` refuses (AD-17);
- counts chat text, chat photo, voice note, message flash, and card quick message against `message_quota` (AD-29); Invites Flash persist and card quick-message call `ChatPort` to consume it (AD-23);
- persists allowed Chat `delivered` and never holds on AI (AD-10, locked);
- never treats `sister_reach_mode` as a Brother free pass (AD-27).

If those two teams can still disagree on a shared record, a writer, or a mutation path, the spine does not yet bind that seam. A pair that only exists by *violating* AD-12 (auto-grant / mahram compose), AD-23 (mahram INSERT `conversation`), AD-10 (hold), or AD-27 (Brothers free; Sister send calls `BillingPort` in `free_unlimited`) is not a hole.

## Verdict

**revise**

The 2026-10-02 card / cap / grant amendment holds for the thing it was written to lock: two teams **cannot** lawfully auto-grant every thread after confirm, let mahram INSERT `conversation`, collapse `invite_quota` and `message_quota` into one writer, emit `QUOTA_EXCEEDED` for a message cap (or the reverse), hide Sister checkout in `free_unlimited`, skip `BillingPort` on safety / attach / accept / `openFromInvite`, make Brothers free, or rebuild a Chat hold.

That is not enough. Teams that obey AD-12, AD-23, AD-28, and AD-29 to the letter can still:

- treat the same card "quick message" as Flash, as Invite+Flash, or as a Chat send that has no legal `conversation` INSERT (**P1**);
- increment `message_quota` once at Flash persist, again when `openFromInvite` stores `flash_id` as a read-through, or never if the invite is declined (**P2**);
- snapshot or live-read `isEntitled` / `daily_message_cap`, write or skip `message_quota` for Premium, and let billing expose a second remaining-int — the "may call `BillingPort`" on Flash lets a paid Sister in `free_unlimited` stay Free-capped on the invite path (**P3**);
- key `mahram_thread_grant` on `conversation_id` or on the Brother; treat `mahram_permission` or the grant row as "active"; drop by DELETE or `revoked_at` on a 60s worker (**P4**);
- return `QUOTA_EXCEEDED` or `MESSAGE_CAP_EXCEEDED` for the same Invite+Flash / card click depending on which cap is checked first (**P5**).

No new AD is justified: none of these restore auto-grant, a mahram-written `conversation`, a brother-free mode, or a pre-delivery hold. Close them by tightening AD-12, AD-23, AD-28, AD-29, plus AD-2 / AD-17 / AD-21 / AD-3. Do not reopen AD-5, AD-10, AD-11, or AD-27 Invite-reach.

---

## What the 2026-10-02 amendment already binds (not holes)

These attacks die. Do not spend AD budget here.

| Attack | Why it dies |
| --- | --- |
| Grant list pre-filled after OTP + confirm / new chats auto-granted | AD-12: empty after confirm; she grants individual threads; new chats are not auto-granted |
| Mahram INSERT `conversation` | AD-23: only `ChatPort.openFromInvite`; mahram must not INSERT |
| Mahram compose / send / browse / Invite | AD-12 |
| Flag / pause / end on an ungranted thread | AD-12: rejected |
| `message_quota` written by invites or billing | AD-3 + AD-23: chat is the only writer; Flash / card call `ChatPort` |
| `invite_quota` written by chat or billing | AD-3 + AD-27 |
| `QUOTA_EXCEEDED` used for the message cap | AD-17: invite-quota code only |
| `MESSAGE_CAP_EXCEEDED` used for Invite quota | AD-17: message-cap code only |
| Sister checkout hidden in `free_unlimited` | AD-14, AD-27, AD-29: catalog in both modes; pack not required for Invite reach |
| Chat volume never an entitlement check | AD-2 / AD-21: send may call `isEntitled` only for FR-146 |
| Safety / attach / browse / accept / `openFromInvite` call `BillingPort` | AD-2, AD-21, AD-27 |
| Sister invite send / compose / quota GET call `BillingPort` in `free_unlimited` | AD-27 (Invite-reach; not reopened) |
| Brothers read `sister_reach_mode` as free | AD-27; out of scope to undo |
| Over-cap send stored or held for scan | AD-21, AD-29; AD-10 locked (do not reopen) |
| Grid as the only browse UI / likes table / online-now / invented counts / new profile columns for traits | AD-28 |
| `daily_message_cap` compiled out or presented as a locked product number | AD-29 + conventions |
| Message rate-limit as the product cap | AD-17 |
| Pre-delivery Chat hold / AI send-block | AD-10 / AD-11 locked |
| USA host / second UI / second blur path | AD-5, AD-4, AD-9 locked |

---

## Incompatibility pairs

Each pair is a hole. Suggested closure is a **tighten** of an existing AD. No new AD.

### P1 — Card quick-message is named three times and owned nowhere

**Clash type:** two owners of one entity / conflicting state-mutation paths  
**Teams:** Discovery vs Invites vs Chat

**What the spine says**

- AD-28: "Invite and quick-message actions are the existing invite/chat commands and obey AD-27 and the message cap (AD-29)."
- AD-29: counts **both** "message flash" **and** "card quick message" as distinct kinds.
- AD-23: only `ChatPort.openFromInvite(inviteId)` inserts `conversation`; `chat` refuses messages without that conversation FK; "Invites Flash persist and card quick-message call `ChatPort` to consume the same `message_quota`."
- AD-3: no `card_quick_message` row. Invites own `invite` + `message_flash`. Chat own `conversation` + `message` + `message_quota`. Discovery own `favourite` + `profile_visit`.
- AD-10: Flash is invites-owned, visible before accept, not copied into a parallel `message` row.

**The fork**

- **Team Invites-flash.** Card quick-message **is** Message Flash (invite body, pre-conversation). They persist `message_flash`, call `ChatPort` once, increment `invite_quota` if the sender is Invite-capped. No `conversation` until accept. AD-28's "existing invite/chat commands" is Flash.
- **Team Invites-plus.** The card has two CTAs. Invite = `POST /v1/invites` (quota AD-27). Quick-message = a second persist that is also Flash. One member click can be one invite or one flash-on-invite; if the shell sends both, they increment `invite_quota` **and** `message_quota` (AD-29 listed both kinds).
- **Team Chat-message.** Card quick-message is a `message`. They need a conversation FK. There is no invite yet. They cannot INSERT `conversation` except `openFromInvite`. They either (a) refuse the CTA until an invite exists, or (b) mint a silent invite so `openFromInvite` is legal — then the same click is an Invite send (AD-27) **plus** a Chat send (AD-29).
- **Team Discovery.** `POST /v1/browse/quick-message` is a discovery inbound route that calls Invites and/or Chat. Discovery does not own a persist entity (AD-3). They still choose which port, so the two builds disagree on the row that exists after the click.

Same card, same Free Brother (Invite cap 3, message cap 10), same 1st click: Build Invites-flash writes `message_flash` + 1 `message_quota` + 1 `invite_quota` and no conversation. Build Chat-message refuses or writes a synthetic invite + conversation + `message`. Build Invites-plus writes both kinds and burns both caps. All three obeyed "existing invite/chat commands," "call `ChatPort` to consume `message_quota`," and "mahram / chat must not invent a second conversation INSERT" — Chat-message (b) used the only legal INSERT.

**Suggested bind**

Tighten AD-28 + AD-23 + AD-29 + AD-3: card quick-message **is** Message Flash (invites persist `message_flash`; may ride on an Invite send). It is **not** a `message` and must not create a `conversation`. Count it **once** as `message_flash` (drop the extra kind, or define it as an alias). If the click is also an Invite send, increment `invite_quota` on persist (AD-27) **and** consume `message_quota` via `ChatPort` once. Discovery must not persist; it may only call those commands. Do not add `ChatPort.openFromCard`.

---

### P2 — Flash consume-at-persist vs `openFromInvite` read-through (0 / 1 / 2)

**Clash type:** conflicting state-mutation paths  
**Teams:** Invites vs Chat

**What the spine says**

- AD-23: "Invites Flash persist and card quick-message call `ChatPort` to consume the same `message_quota` (chat is the only writer)."
- AD-10: Flash is **not** copied into a parallel `message` row; "after `ChatPort.openFromInvite`, Chat may store `flash_id` as a read-through."
- AD-29: counts message flash **and** chat text.
- AD-27: `invite_quota` increments on successful send persist; no refund on decline. No parallel sentence on `message_quota`.
- AD-21: over-cap is not stored.

**The fork**

- **Team Invites-at-persist.** `POST /v1/invites` (with Flash) calls `ChatPort.consume` **before** Flash persist. Decline later does not refund. AD-23 letter.
- **Team Chat-readthrough.** `openFromInvite` stores `flash_id`. That is not a send; they do not increment. Correct if Invites already counted.
- **Team Chat-hydrate.** Storing `flash_id` materializes the first visible item in the thread. They consult the cap and increment because AD-29 lists chat text and the member now "sent" something in Chat. Double count. They did not INSERT a parallel `message` row (AD-10 satisfied).
- **Team Invites-at-open.** Consume is deferred until `openFromInvite` because "Chat owns the count" and there is no conversation yet. A declined Flash never touches `message_quota`. A Sister who fires 20 Flash-bearing invites in `free_unlimited` (Invite-uncapped) pays zero against FR-146 until accept — and the increment then races the accepter's day, or the sender's.
- **Team Chat-refund.** Decline / unused Flash refunds `sent_count`. AD-27 forbids refund on `invite_quota` only.

One Flash: 0 (declined, deferred consume), 1 (persist only), or 2 (persist + hydrate). All four obeyed "chat is the only writer," "call `ChatPort`," and "no parallel `message` row."

**Suggested bind**

Tighten AD-23 + AD-29: `ChatPort` consume happens **once**, in the same unit of work as Flash persist (before insert; refuse → `MESSAGE_CAP_EXCEEDED`, nothing stored). `openFromInvite` read-through of `flash_id` must not increment `message_quota` and must not consult the cap. No refund on decline, accept, or close. The counted sender is the Flash author.

---

### P3 — `message_quota` grain, the "may" on `BillingPort`, and a second remaining-int

**Clash type:** clashing shared-data shapes / conflicting state-mutation paths  
**Teams:** Chat vs Billing vs Invites (Flash caller)

**What the spine says**

- AD-29: Chat owns `message_quota`; consults the cap before insert; Premium (`isEntitled` true) = unlimited messages; change applies to subsequent sends; already-delivered stay.
- AD-23: daily message count resets on the `Africa/Ouagadougou` civil day.
- AD-21: a Free-tier send (both genders, including a Sister in `free_unlimited`) **may** call `BillingPort.isEntitled` **only** to decide the FR-146 cap; `unavailable` → Free cap; `isEntitled` is pack presence only.
- AD-2: a Chat (or Flash / card quick-message) send **may** call `isEntitled` only to decide that cap.
- AD-27: `invite_quota` grain `{ account_id, civil_day_ouaga, sent_count }`; live `isEntitled` every capped send; no frozen cap/entitled bit; billing must not expose a remaining-int. **None of those sentences are repeated for `message_quota`.**
- AD-14 / AD-27: Sister checkout exists in both reach modes because messages are capped. In `free_unlimited` the pack is not required for Invite reach; Sister invite send still must not call `BillingPort`.

**The fork**

- **Team Chat-live.** Every send (and every Flash consume) reads live `OperatorPort.get('daily_message_cap')` and live `isEntitled`. Grain `{ account_id, civil_day_ouaga, sent_count }`. Pack at 15:00 unlocks the next send. Cap 10→5 after 7 sent → next send refused (already-delivered stay).
- **Team Chat-snapshot.** First Free send of the civil day writes `cap` + `entitled` on the row. Later sends only increment `sent_count`. Billing's webhook updates `entitlement` (billing does not write `message_quota` — legal). Today's remaining stays Free until Ouaga midnight.
- **Team Chat-premium-write.** Premium sends increment `sent_count` anyway (Chat "owns the count"). Pack `ends_at` at 16:00 after 40 sends → 40 ≥ 10 → refuse. They did not unsend (already-delivered stay).
- **Team Chat-premium-skip.** No row while entitled. Expiry starts `sent_count` at 0 for the rest of the day.
- **Team Chat-per-thread.** `message_quota` keyed by `conversation_id`. Ten messages **per thread**. Account-level FR-146 is evaded without making anyone Premium and without making Brothers free.
- **Team Billing-remaining.** AD-27 forbids a remaining-**invite** int. They put `messages_remaining` on `GET /v1/billing/me`. Chat paints `cap - sent_count`. Two member-visible numbers.
- **Team Chat-invite-path-blind.** AD-27: Sister invite send must not call `BillingPort` when `free_unlimited`. Flash persist is on that POST. AD-2/AD-21 say the Flash send **may** call `isEntitled` — optional. They skip the call to keep the invite handler clean, apply `daily_message_cap` as if Free. She already bought a pack (checkout legal in both modes) so in-thread Chat is unlimited (`isEntitled` true) while her Flash/card is still capped.

Same Sister, `free_unlimited`, pack purchased at 14:00, 9 Flash already sent: Team live+isEntitled allows Flash #10 as Premium unlimited; Team invite-path-blind refuses #11 with `MESSAGE_CAP_EXCEEDED`; Team snapshot ignores the pack until midnight; Team per-thread allows 10 more on a new card. All obeyed "may call only to decide the cap," "chat is the only writer," and "Sister invite send does not call `BillingPort`."

**Suggested bind**

Tighten AD-29 + AD-21 + AD-2: `message_quota` grain is `{ account_id, civil_day_ouaga, sent_count }` — not per conversation, not a stored remaining, not a frozen cap or entitled bit. On **every** counted persist (Chat text / photo / voice, Flash, card quick-message), chat reads live `daily_message_cap` and live `isEntitled(accountId)` (the `may` becomes **must** when deciding Premium vs Free). Any live pack → unlimited messages; `false` / `unavailable` → Free cap. Write `sent_count` only when the sender is not entitled (or always write count but **never** enforce a cap while entitled — pick one; do not enforce yesterday's Premium volume against today's Free cap). Billing must not expose a remaining-message int. Member-facing remaining / `MESSAGE_CAP_EXCEEDED` come only from chat (Flash / card re-emit after `ChatPort` refuses). Cap change binds the **next** counted persist; do not unsend; do not wait for midnight. Sister checkout in `free_unlimited` is the message-cap pack, not an Invite-reach pack (AD-27 compose still must not show a reach-pack offer). `ChatPort.consume` is the only place Flash/card may cause an `isEntitled` read — invites still must not import `BillingPort` on Sister send in `free_unlimited`.

---

### P4 — `mahram_thread_grant` grain is "Brother thread" or `conversation_id`; "active" has two predicates

**Clash type:** clashing shared-data shapes / two owners of one authz fact  
**Teams:** Mahram vs Chat (Invites as the conversation-birth caller)

**What the spine says**

- AD-3: mahram owns `mahram_thread_grant` **and** `mahram_invite` / `mahram_link` / `mahram_permission`.
- AD-12: after confirm the grant list is **empty**; she grants individual **Brother threads**; new chats are **not** auto-granted; revoke-one drops that thread only; remove/report revokes the entire **permission** and drops every thread grant within 60s; flag/pause/end rejected on a thread that is not granted.
- AD-23: Mahram must **not** INSERT `conversation`. Mahram read queries filter on an **active** `mahram_thread_grant` row. Only `ChatPort.openFromInvite` inserts `conversation`.
- AD-18: grant / revoke-one / remove events in the same unit of work as the grant-row change.
- No spine sentence names the grant key (`conversation_id` vs brother `account_id`), uniqueness, or what "drop" / "active" mean. No sentence says Flash / pre-accept can or cannot be granted.

**The fork**

- **Team Mahram-conversation.** Grant = `{ mahram_account_id, conversation_id, granted_at, revoked_at }`. Active = `revoked_at IS NULL`. Revoke-one sets `revoked_at`. A new `openFromInvite` for the same Brother is a new conversation and is **not** granted (new chats not auto-granted). Grant requires an existing conversation — mahram does not INSERT one (AD-23). Pre-accept / Flash cannot be granted.
- **Team Mahram-brother.** Grant = `{ mahram_account_id, brother_account_id }`. "Brother thread" is the person. New conversation C2 with the same Brother inherits the grant — they did not auto-grant a *new* chat; she granted *that Brother*. Revoke-one drops the Brother, every conversation with him.
- **Team Mahram-invite.** Grant hangs on `invite_id` until accept, then they UPDATE to `conversation_id` (Chat inserted the conversation — legal). Pre-accept Flash is "granted, delivered" (AD-12 + AD-10). Chat's read filter is conversation-scoped and misses it, or they let mahram SELECT `message_flash` by invite.
- **Team Mahram-delete vs tombstone.** "Drop" = DELETE. The other team sets `revoked_at`. Chat's "active" filter is `EXISTS(grant)` vs `revoked_at IS NULL`. After revoke-one, one build 404s, the other still lists the thread.
- **Team Chat-filter-grant.** AD-23: filter on an active **grant row**. After Sister remove, they wait for grant rows to change.
- **Team Mahram-permission.** Remove sets `mahram_permission.removed_at` immediately and drops grants on a 60s worker (AD-12 allows "within 60s"). Their list/read API 403s on removed permission. Chat still serves granted threads for up to 59s because the grant rows are still "active." AD-18 "same unit of work as the grant-row change" is satisfied on the later worker, not on the remove click — or they emit `remove` on the permission write and skip per-grant events.

Same Sister, same confirmed mahram, same Brother, conversation C1 granted, C1 ended, new invite accepted → C2: Team conversation hides C2 (empty grant); Team brother shows C2. Same remove click: Team permission-first hides immediately on `/v1/mahram/threads` while Chat WS still delivers `message.delivered` to the mahram socket for 59s. Neither team INSERTed `conversation`. Neither auto-granted **on confirm**.

**Suggested bind**

Tighten AD-12 + AD-23 + AD-3 + AD-18: `mahram_thread_grant` grain is `{ sister_account_id, mahram_account_id, conversation_id, granted_at, revoked_at }`. Unique **active** row per `{ mahram_account_id, conversation_id }`. Active means `revoked_at IS NULL`. Grant requires an existing `conversation` inserted by `ChatPort.openFromInvite` — refuse otherwise; no `invite_id` grant; Flash / pre-accept is not grantable. New conversation never inherits a grant from the Brother or from a prior conversation (that *is* auto-grant of a new chat). Revoke-one sets `revoked_at` on that row only (do not DELETE). Remove/report sets `revoked_at` on **every** active grant for that link in the **same** unit of work as the permission revoke (the 60s budget is the read-path/cache/WS deadline, not a second writer). Chat **and** mahram list/read use that active-grant predicate only — `mahram_permission` confirmed is necessary but not sufficient. Mahram still must not INSERT `conversation`.

---

### P5 — `QUOTA_EXCEEDED` vs `MESSAGE_CAP_EXCEEDED` on one Invite+Flash / card click

**Clash type:** conflicting state-mutation paths / clashing error shape  
**Teams:** Invites vs Chat

**What the spine says**

- AD-17: `QUOTA_EXCEEDED` is emitted **only** by invites from `invite_quota` + `operator_config` caps. `MESSAGE_CAP_EXCEEDED` is emitted **only** by chat, or by invites Flash / card quick-message **after `ChatPort` refuses** the cap.
- AD-23 / AD-29: Flash persist and card quick-message must call `ChatPort` before / to consume `message_quota`.
- AD-27: Brother (always) and Sister in `same_quota_as_brothers` are Invite-capped; Sister in `free_unlimited` never gets `QUOTA_EXCEEDED`.
- Conventions: both codes carry reset time. `PAY_UNAVAILABLE` maps to the Free cap on both paths, never a safety block.

**The fork**

A Free Brother (or Sister in `same_quota_as_brothers`) is at Invite cap **and** message cap and taps card Invite-with-Flash / quick-message (P1 — one or two commands).

- **Team Invites-invite-first.** Check `invite_quota`, return `QUOTA_EXCEEDED`, never call `ChatPort`. AD-17 satisfied (`QUOTA_EXCEEDED` from invites). AD-23's "call `ChatPort`" did not run because send persist did not happen.
- **Team Invites-message-first.** Call `ChatPort` first; consume refuses → they emit `MESSAGE_CAP_EXCEEDED` (AD-17's "after `ChatPort` refuses"). Invite row is not written; `invite_quota` unchanged.
- **Team Invites-both.** They persist neither and pick a code by feature flag or by "whichever remaining is smaller." Clients branch on `code` (upgrade CTA: Invite wall vs message wall — AD-27 compose vs AD-29 pack).
- **Team Chat-only-card.** If P1 lands as a Chat send, the same click can only return `MESSAGE_CAP_EXCEEDED` even when Invite quota is also exhausted.

Same member, same exhausted day, same button: one build shows the Invite pack wall (`QUOTA_EXCEEDED`); the other shows the message-cap wall (`MESSAGE_CAP_EXCEEDED`); a Sister in `free_unlimited` is immune to the first code (bound) but still forks if the click is classified as Invite+Flash vs Chat-only (P1). Neither team used the wrong code for the check they ran. The **order** and **which check is required** are unbound.

`PAY_UNAVAILABLE` forks the same way: Team A applies Free cap silently on both counters; Team B returns `PAY_UNAVAILABLE` with Free remaining on one path and not the other. Conventions allow the code on "quota / message-cap paths"; they do not say it is instead of, or in addition to, the cap codes.

**Suggested bind**

Tighten AD-17 + AD-23: on a persist that is both an Invite send and a Flash / card quick-message, invites **must** call `ChatPort` consume **and** apply the Invite-quota predicate. If Invite quota is exceeded, emit `QUOTA_EXCEEDED` and do not persist (do not consume `message_quota`). Else if `ChatPort` refuses, emit `MESSAGE_CAP_EXCEEDED` and do not persist invite or Flash. Sister in `free_unlimited`: skip the Invite-quota check (no `QUOTA_EXCEEDED`); still consume `message_quota`. Never emit `PAY_UNAVAILABLE` *instead of* applying the Free cap; the cap codes remain the over-cap codes. Discovery / web must re-emit the owning module's `code`, not remap.

---

## Additional pairs (same class; close if tightening the top set)

These do not change the verdict. They are not a reason for a new AD.

### P6 — `daily_message_cap` "subsequent" does not bind cutoff or retro-apply

**Teams:** Operator vs Chat. AD-29: change applies to subsequent sends; already-delivered stay. AD-27 already bound mode-flip as **next Sister invite**, no retro-count. Cap 10→3 after 5 sent: Team Chat-live refuses the next send (5 ≥ 3); Team Chat-day freezes today's remaining (5 left under the old cap); Team Chat-midnight waits for Ouaga reset. "Already-delivered stay" only forbids unsend. Tighten AD-29 with the P3 sentence: next counted persist; live cap; do not unsend; do not wait for midnight.

### P7 — Pass / `sharedTraits` / search default view

**Teams:** Discovery vs Profiles vs web. AD-28: pass is a dismiss, not a like; no new profile columns; every people-list defaults to one profile; many-filter search **may** open on the grid. No `pass` entity (AD-3: `favourite`, `profile_visit`). Team Discovery-visit writes `profile_visit.kind=dismiss`; Team Discovery-ephemeral stores nothing; Team Discovery-favourite overloads `favourite` (still "not a likes table"). `sharedTraits` payload is `{ flags }` vs `{ code, label }[]`; kids traits are omitted (no column) vs inferred from bio. Search: Team A always `view=card`; Team B opens `view=grid` when any filter is set. Tighten AD-28 + AD-3: pass may persist only as a discovery exclusion on an existing discovery row (not `favourite`); default `view=card` unless the client sent `view=grid`; `sharedTraits` are computed booleans from named existing fields only (list them or say "omit if the field does not exist" — do not parse bio).

### P8 — Message-cap upsell on Invite compose vs checkout-only

**Teams:** Invites vs Billing vs web. AD-27: `free_unlimited` compose must not show remaining/cap or a **reach-pack** offer. AD-14 / AD-29: Sister checkout exists in both modes because messages are capped. Team Web puts the message-pack CTA on Invite compose ("not a reach-pack"). Team Invites-strict shows no pack on compose. Team Billing sells the same SKU on `/v1/packs`. Not a second writer, but the compose handler that `GET`s packs imports `BillingPort` on a path AD-27 forbade. Tighten AD-27 / AD-2: Invite compose in `free_unlimited` must not call `BillingPort` and must not render any pack CTA. Message-cap checkout lives on the Chat / Flash / card `MESSAGE_CAP_EXCEEDED` wall and on `/v1/packs`, not on Invite compose.

### P9 — `ChatPort.consume` check-then-increment race

**Teams:** two Chat authors. AD-23 names the call, not the atomicity. Team Chat-two-step: `canSend` then `increment` — two Flashes both pass at `sent_count=9`. Team Chat-one-step: compare-and-increment in one command. Tighten AD-29: consume is one atomic check-and-increment (or no-op when entitled) in the persist unit of work.

### P10 — Grant / remove vs `ProfilePort.emergencyHide` and conversation end

**Teams:** Mahram vs Profiles vs Chat. AD-12: remove/report "may" call `emergencyHide` (24h). Team A always hides; Team B never; Team C only on report. AD-23: Mahram/Moderator `end` closes a conversation. After end, Team Mahram-keep leaves the grant active (mahram still reads history); Team Mahram-cascade sets `revoked_at` (end is not revoke-one). Tighten AD-12: `emergencyHide` is required on report, optional on remove (or required on both — pick one). End/close does **not** revoke the grant; revoke-one / remove remain the only grant writers.

---

## AD gap map (holes → bind)

| Pair | Missing bind | AD action |
| --- | --- | --- |
| P1 | Card quick-message identity, writer, no extra conversation INSERT | Tighten AD-28 + AD-23 + AD-29 + AD-3 |
| P2 | Flash consume once at persist; read-through must not increment; no refund | Tighten AD-23 + AD-29 |
| P3 | `message_quota` grain; live `isEntitled` **must**; no billing remaining-int; Premium write rule | Tighten AD-29 + AD-21 + AD-2 |
| P4 | Grant key = `conversation_id`; active = `revoked_at IS NULL`; same-UoW revoke-all; no pair inherit | Tighten AD-12 + AD-23 + AD-3 + AD-18 |
| P5 | Check order and which `code` on Invite+Flash / card | Tighten AD-17 + AD-23 |
| P6 | `daily_message_cap` next persist, not next day | Tighten AD-29 |
| P7–P10 | Pass row; compose vs message wall; atomic consume; hide/end vs grant | Tighten AD-28 / AD-27 / AD-29 / AD-12 |

**Do not add AD-30** for card / cap / grant. Two teams cannot rebuild auto-grant, a mahram-written `conversation`, a brother-free mode, a hidden Sister checkout, or a Chat hold while obeying AD-12 / AD-23 / AD-28 / AD-29 / AD-10. The remaining forks are under-specified *identity* / *grain* / *when* / *which-code* sentences on those ADs.

Minimum close before feature-spine fork: **P1, P2, P3, P4, P5**. P6 is the next sentence on AD-29.

---

## Two-team sketches (executable thought experiment)

### Sketch 1 — "Free Brother taps quick message on the focused card, then the Sister grants her mahram"

- **Discovery** renders one card (AD-28). Quick-message CTA fires.
- **Invites-flash** persist `message_flash`, call `ChatPort.consume` (count 1), increment `invite_quota` (count 1). No conversation (P1).
- **Chat-message** on the other replica refuses (no conversation FK) or mints a silent invite + `openFromInvite` so a `conversation` exists (P1). Mahram still must not INSERT (bound).
- Sister accepts. **Chat-hydrate** stores `flash_id` and increments `message_quota` again (P2). She is now at 2 toward 10 for one Flash.
- She confirmed mahram this morning (grant list empty — bound). She grants "this Brother."
- **Mahram-brother** writes a pair grant. A later second conversation with the same Brother is visible to mahram (P4).
- **Mahram-conversation** writes `{ conversation_id: C1 }`. The second conversation is hidden. He cannot end/pause the hidden one (AD-12 bound).
- Brother is also at Invite cap. Retry: **Invites-invite-first** returns `QUOTA_EXCEEDED`; **Invites-message-first** returns `MESSAGE_CAP_EXCEEDED` (P5). Web shows two different pack walls. Sister checkout still exists in both modes (bound); Brothers still pay (bound).

All cited ADs remain satisfied. AD-10 delivery stays immediate. AD-5 / AD-11 untouched.

### Sketch 2 — "Sister in `free_unlimited` buys a pack at 14:00, sends Flash, then chats"

- Sister checkout in `free_unlimited` is legal (bound). `isEntitled` → true. Invite send still must not import `BillingPort` (bound).
- **Chat-invite-path-blind** consume on Flash skips `isEntitled` (`may`), applies `daily_message_cap=10`. Flash #11 → `MESSAGE_CAP_EXCEEDED` (P3).
- **Chat-live** consume calls `isEntitled`, Premium, Flash unlimited (P3).
- She accepts. In-thread send on both builds calls `isEntitled` (clearly a Chat send) → unlimited. Same pack, same day, Flash and Chat disagree on one build.
- Operator PATCHes `daily_message_cap` 10→3. **Chat-midnight** ignores until Ouaga next day; **Chat-live** would have refused further Free sends (P6) — she is Premium on the live build, so the flip is invisible; on the blind build she is still Free-capped at 3 with 11 already-delivered Flashes (already-delivered stay) and the next Flash dies.
- Safety, attach, browse, accept, `openFromInvite` never called `BillingPort` (bound). Messages that were allowed stayed `delivered` (AD-10 locked). Brothers still on paid Invite quota (bound).

All cited ADs remain satisfied.

---

## Reviewer note

This review does not propose stack changes, hosting changes, edits to the spine file, a brother-free mode, or any reopening of AD-5 / AD-10 / AD-11. It does not treat locked items as holes. Closing a pair means writing a sentence that makes one of the two builds *illegal*, not documenting both as options. If P1–P5 are closed in AD-12 / AD-23 / AD-28 / AD-29 / AD-17 / AD-21, a re-run of this lens should be able to verdict **pass** or **pass-with-findings** without a new AD.
