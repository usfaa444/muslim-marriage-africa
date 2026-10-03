# Security / privacy review — 2026-10-02 card + cap + mahram grant

**Artifact:** `ARCHITECTURE-SPINE.md` + `SOLUTION-DESIGN.md` (updated 2026-10-02)  
**Lens:** security / privacy — mahram grant-scoped read; revoke-all ≤60s; no mahram send/browse/invite; BillingPort isolation after the FR-146 volume exception; operator-only `daily_message_cap`; audit of grant/revoke/cap; no new kids columns; pass is not a public likes counter; no invented member counts / online now  
**Attack:** can a mahram read an ungranted or already-revoked thread; keep access after FR-077 remove; send, browse, or Invite; can `isEntitled` sit on a named safety path “because Chat now checks the cap”; can a non-operator write the cap; can grant/revoke/cap miss the audit chain; can the card grow a kids column or a public likes / “online now” / invented-count surface  
**Sources read:** the pair above; PRD FR-021, FR-024, FR-025, FR-048, FR-071–FR-079, FR-105, FR-146, NFR-001, NFR-009; prior `reviews/review-security-privacy-2026-10-02.md` (sister-reach BillingPort; not re-litigated where this pair already closed it); `reviews/reconcile-prd-card-cap-2026-10-02.md` (trace only)  
**Binding 2026-10-02 (not reopened):** AD-5 data residency; AD-9 blur / gateway product; AD-10 / AD-11 passive Chat. AD-12 product (Sister-initiated, empty after confirm, grant-scoped delivered read) is in scope as the *new* grant/revoke contract, not as a reopen of blur or scan.  
**Spine / companion:** not modified by this review  
**Verdict:** pass-with-findings  
**Date:** 2026-10-02

This is not legal advice and not a CIL filing. It judges whether two feature teams that obey the written ADs can still produce the requested attack outcomes after the 2026-10-02 AD-12 / AD-21 / AD-28 / AD-29 amendment. No new AD is proposed. Closures belong as sentences on AD-8, AD-12, AD-15, AD-16, AD-21, AD-23, AD-28 — not AD-30.

---

## Verdict in one paragraph

The pair **names** the happy path and closes it on HTTP grant rows: after confirm the grant list is empty; `mahram_thread_grant` is the only read ticket; new conversations do not auto-grant; revoke-one sets `revoked_at` on that row; FR-077 remove revokes the permission, drops every grant, and may `emergencyHide`; chat volume may call `BillingPort.isEntitled` **only** for the FR-146 cap; named safety paths (including browse and invite accept) still must not; only `operator` writes `daily_message_cap`; grant/revoke-one/remove and the cap change are AD-18 events in the same unit of work; pass is a per-viewer dismiss; public metrics stay proof-backed. That is not enough against the attack. Mahram read is specified on **mahram-module queries**, not on Socket.IO / long-poll emit, not on `GET /v1/conversations/:id/messages`, and not on invites-owned Flash (no `conversation_id` yet). Revoke-all’s 60s clock is a grant-row + `IdentityPort.revokeSessions` outcome; it does not drop live rooms or bind chat-photo tokens to the grant (AD-9 denylist stays a locked residual — do not reopen). `POST /v1/mahram/links/:id/grants` is not bound to the Sister’s member session, so a mahram can self-grant every thread. Chat POST and `/v1/browse` / `/v1/invites` are not role-forbidden for `roles ∋ mahram`; AD-12 bans send **as her**, not send-as-self. The new `isEntitled` licence is send-scoped in AD-21 and resource-scoped in the chat HTTP/WS map — a controller guard paywalls Chat-after-accept **read**. AD-28’s kids example has no source column in FR-021 or SD §6. Closable without a new paradigm. Until those seams are closed, **pass-with-findings**, not launch-cleared.

---

## What holds (do not re-litigate)

Closed by this pair relative to `reviews/review-security-privacy-2026-10-02.md` (sister-reach) and the pre-grant AD-12 “read-all delivered on attached conversations.” Do not reopen as if the old text were still live. Do not reopen AD-5, AD-9, AD-10, AD-11.

| Topic | Why it holds now |
| --- | --- |
| Empty grant list after confirm | AD-12 / AD-23 / SD §6: after OTP + Sister confirm the list is empty; `openFromInvite` does **not** insert a grant; unique **active** grant per mahram+conversation. |
| HTTP grant filter (mahram module) | AD-23: mahram read queries filter on an **active** `mahram_thread_grant`. SD §7: `/v1/mahram/threads` list/read only where that row exists; delivered only; 404/`FORBIDDEN` when no active grant. Flag/pause/end rejected if not granted (AD-12). |
| Mahram must not create Chat | AD-23: only `ChatPort.openFromInvite` inserts `conversation`; mahram must not INSERT. |
| Named safety vs `BillingPort` | AD-2 / AD-21 / AD-27: verification, blur/reveal, mahram **attach**, report, block, browse/discovery, invite accept, `openFromInvite` must not import or call `BillingPort` (including `isEntitled`) in either `sister_reach_mode`. |
| Chat volume exception | Narrow: Chat / Flash / card quick-message **send** may call `isEntitled` **only** to decide FR-146. Entitled → unlimited messages; not entitled → `daily_message_cap`; `unavailable` → Free cap (fail closed on the perk, not on safety). Over-cap is `MESSAGE_CAP_EXCEEDED`, not stored, not held (AD-10 unchanged). |
| Sister invite send still AD-27 | `free_unlimited` Sister invite send / quota / compose must not call `BillingPort`. Checkout may, in both modes (AD-14). |
| `AuthContext` smuggle (prior SEC-3) | Conventions: `AuthContext` must not carry `entitled` or packs. `isEntitled` is pack presence only and must not read `sister_reach_mode` or gender. |
| Operator-only cap write | AD-8: only `operator` writes `sister_reach_mode` **and** `daily_message_cap`. AD-27: not `moderator`, not `system`, not env/SQL (mode). SD §7: same ban on both keys. Member path cannot reach `PATCH /v1/staff/config`. |
| Audit *intention* + atomicity | AD-18: mahram attach/grant/revoke-one/remove/pause/end and operator `daily_message_cap` changes are mandatory. Config write + audit insert are one unit of work; payload `from` / `to` / `staffId` / key. Mahram grant/revoke-one/remove are one unit of work with the grant-row change. |
| Pass ≠ like | AD-28 / SD §6–§7: `/v1/browse/pass` is a per-viewer dismiss; may reuse a discovery exclusion; **do not invent a likes table**; pass is not a public counter. `who_favourited_me` stays flag-off. |
| Invented scale / online now | AD-28: no “online now”; no invented member counts. AD-25: public metrics proof-backed only (dual-confirm counter starts at 0). Feature flag `online_now` off until its NEXT FR. |
| `message_quota` writer | Chat is the only writer. Flash / card quick-message consume via `ChatPort` (AD-23). Billing never writes it. |
| Locked surfaces | AD-5 hosting/CIL; AD-9 blur/gateway (including prior transferable-token / Mahram-remove denylist residual — **unapplied, out of this update**); AD-10/AD-11 passive Chat. Prior sister-reach SEC-1 (accept / `openFromInvite`) is now a Rule sentence — do not re-score as open. |

---

## Attack result

| Attack outcome | Closed if both teams obey the named Rule sentences | Still possible while obeying the written ADs |
| --- | --- | --- |
| Mahram reads ungranted or non-delivered content | **No** on `GET /v1/mahram/threads` if that module filters active grant + `message.state=delivered` | **Yes** — Socket.IO / long-poll emit (SEC-1); chat HTTP (SEC-1); invites Flash with no conversation_id (SEC-1); self-grant (SEC-3) |
| Access remains after revoke-all >60s | **No** on the next mahram-module GET after `revoked_at` + `IdentityPort.revokeSessions` | **Yes** — live rooms / long-poll not dropped (SEC-2); revoke-one has no 60s and does not revoke sessions (SEC-2); chat-photo tokens if gateway ignores the grant (AD-9 residual, not reopened) |
| Mahram send / browse / Invite | **No** if AD-8 “Mahram acting as a Member” + SD “no mahram send route” are treated as spine law | **Yes** — AD-12 is send-**as-her**; grant POST not Sister-bound; browse/invite/chat write are not role-forbidden (SEC-3) |
| `BillingPort` on a named safety path | **No** on the listed handlers (verify / blur / mahram attach / report / block / browse / accept) | **Yes** — chat **resource** guard / WS namespace (SEC-4); bundled invite+Flash `isEntitled` in `free_unlimited` (SEC-4) |
| Non-operator writes `daily_message_cap` | **No** if AD-8 + SD §7 are implemented | Residual only: AD-29 does not repeat the env/SQL ban (covered by AD-8 / SD §7) |
| Audit omits grant / revoke / cap | **No** on the HTTP happy path (same unit of work, named events) | Residual: remove payload may carry only the link id; non-HTTP SQL is already forbidden |
| New kids column / structured kids leak | **No** if “no new profile columns” is read against FR-021 / SD §6 | **Yes** — AD-28’s kids example invites a column or a derived `has_kids` chip (SEC-5) |
| Pass as public likes; invented counts; online now | **No** on the named sentences + flags | Residual: browse DTO is not a closed schema (not scored as a top finding) |

The mahram-module GET cannot *accidentally* dump every ward thread if the team reads AD-12 + AD-23. The failures are **other readers of the same bytes** and **who is allowed to insert the grant**.

---

## Judgement by requested topic

### 1. Mahram reads only granted, delivered messages

**Fail as a platform read. Pass as a mahram-module list/get.**

AD-12: he reads only **granted, delivered** messages. AD-23: mahram read queries filter on an **active** grant. SD §7: `/v1/mahram/threads` 404/`FORBIDDEN` without that row. A later AI flag does not hide delivered content (PRD FR-074) — that is intended, not a leak.

Lawful readers that never touch `modules/mahram` queries:

1. **Realtime is a read path.** AD-15 handshake requires `AuthContext`. Events: `conversation.typing`, `message.delivered`, `mahram.presence`, `reveal.changed`, `stage.changed`. Chat persist “emits `message.delivered` immediately.” Nothing says the emitter joins the mahram socket only when an active grant exists, or that `typing` / `stage.changed` / `reveal.changed` are grant-scoped. Two rooms are lawful: `conversation:{id}` for every ward chat the sister is in, or `ward:{sisterId}`. Either one delivers ungranted bodies, media_ids, and suitor existence. Long-poll fallback is the same emit.

2. **Chat HTTP is a read path.** `/v1/conversations` and `/v1/conversations/:id/messages` are chat-owned. AD-23’s filter sentence does not say those inbound adapters reject `roles ∋ mahram` or that they call `MahramPort.hasActiveGrant` when `mahramWardId` is set. A mahram Bearer on the member message list is compatible with “no mahram send route.”

3. **Flash is invites-owned and pre-conversation.** Grant FK is `conversation_id`. `openFromInvite` is the only conversation INSERT, and only after Sister accept (or she sent). Brother-sent Flash has no row to grant. FR-048 still says the Flash is mahram-visible “from minute one **on a granted thread**.” Two lawful products: (a) invites serve every ward Flash to the confirmed mahram “because there is no grant row yet”; (b) hide Flash until a conversation exists and is granted. (a) is an ungranted read. (b) is a product miss, not a leak. The security failure is (a). Same leftover the 2026-10-01 gate left unapplied — now in-scope because grant-scoped read is the lock.

4. **Notifications.** AD-16 SMS list includes Invite-received and Mahram pause/end/flag, without “granted threads only.” PRD UJ-3 / FR-053: SMS for pause/end/flag on **granted** threads. An invites notifier that SMS-es every `invite.received` to the wali leaks ungranted suitor ids (payload is template + ids — the id is the leak).

5. **FR-079 `mahram.presence`.** Banner is grant-scoped in the PRD. AD-15 names the event without that filter. Emitting it on an ungranted thread tells the Brother a wali exists and is attached to *her*, not to *this* thread.

Decrypt-for-reader on a **granted** delivered row is intended. Do not treat ciphertext-at-rest as a mahram control.

### 2. Revoke-all within 60s; revoke-one

**Fail as a live-channel SLA. Pass as a grant-row + session-revoke outcome on remove.**

FR-077 / AD-12: remove revokes the entire permission and drops every thread grant within 60s; may `ProfilePort.emergencyHide` (24h). AD-8: Mahram remove calls `IdentityPort.revokeSessions`. Next cookie/Bearer request dies. Mahram-module GET then 404s.

Not specified:

- Socket.IO room leave / namespace disconnect / long-poll abort within 60s of `revoked_at` (all grants) or of revoke-one.
- Revoke-one does **not** call `revokeSessions` and has **no** 60s clock (FR-074 AC is “when he opens”). An open socket on that thread keeps `message.delivered` forever until he reconnects.
- Chat-photo / voice tokens already minted: gateway re-checks **reveal** grant + denylist (AD-9). This update does not bind that check to `mahram_thread_grant`. Already-minted tokens and leftover reveal rows can outlive remove until TTL. **Do not reopen AD-9** — record it as the same locked residual (`reviews/review-security-privacy-2026-10-01.md` SEC-1; memlog: denylist not applied). It still limits how true “read access gone ≤60s” can be for media bytes.
- Cached client plaintext after a working revoke remains the FR-061-class residual.

Emergency hide is discovery visibility, not a mahram-read kill. Correct, and not a substitute for grant drop.

### 3. No mahram send / browse / Invite

**Fail as API authz. Pass as mahram-UI copy.**

SD §7: no mahram send route; `/v1/mahram/threads` is read. AD-12: he cannot compose or send **as her**; he cannot browse or Invite. AD-8 Prevents “Mahram acting as a Member.” PRD UJ-3 `[ASSUMPTION]`: mahram accounts cannot send Invites or appear in people lists.

Holes that still compile:

1. **Self-grant (privilege escalation to read-all).** `POST /v1/mahram/links/:id/grants { conversation_id }` is described as “Sister grant.” No AD says the writer must be the ward’s `member` session (`accountId === link.sister_id`). AD-3 is **module** ownership. A mahram adapter that calls the same command grants himself every Brother thread and empties AD-12. Delete-one / remove have the same missing actor bind (self-remove is acceptable; self-grant is not).

2. **Send-as-her vs send-as-self.** FR-076 AC rejects send-as-ward and impersonation. AD-12 uses that wording. SD says “no mahram send.” Chat `POST /v1/conversations/:id/messages` is not `role=member`. Two units: reject only `sender_id=sister` (FR-076 minimum); or allow wali comments as himself. The second is a send. Reactions, typing, contact-share opt-in, reveal-request, and stage writes are also sends-in-effect and are not listed as mahram-forbidden.

3. **Browse / Invite / favourites.** `/v1/browse`, `/v1/invites`, `/v1/favourites` have no role predicate. `session.kind` includes `mahram` but `roles[]` may hold both `member` and `mahram` (dual-role wali who is also a Brother). AD-8 forbids staff+member on one session; it does not forbid member+mahram. A `kind=mahram` session that is allowed to hit browse is a Rule-adjacent hole. A dual-role **member** session browsing for himself is not this attack.

### 4. BillingPort isolation (safety banned; chat volume `isEntitled` only for FR-146)

**Pass on the named safety handlers. Fail as a scoped exception.**

This update **closes** yesterday’s accept / `openFromInvite` hole (now in AD-2 / AD-21 / AD-27) and the `AuthContext.entitled` hole. Browse is on the ban list. Sister invite send in `free_unlimited` still must not call. `unavailable` on a **send** maps to the Free cap, not a safety kill. Over-cap is reject-before-insert, not an AD-10 hold. Do not re-score those.

The new licence is the new hole:

1. **Send vs resource.** AD-2 / AD-21 allow `isEntitled` on Chat / Flash / card quick-message **send** only, to decide the cap. Capability map: chat → AD-15, AD-10, AD-23, AD-29 (no AD-21). A chat team that puts a Nest guard on `/v1/conversations` or on the Socket.IO namespace calls `isEntitled` for GET messages, typing, contact-share, and (if shared) mahram read-through. Billing `unavailable` or a hang then blocks **Chat-after-accept read** — the thing AD-21 just stopped calling “never an entitlement check” for *volume*, not for *existence*. Mahram attach stays clean; mahram **read** is not in the isolation list.

2. **Bundled invite + Flash.** `POST /v1/invites` may include Flash. AD-27: Sister invite **send** must not call `BillingPort` when `free_unlimited`. AD-2: Flash persist **may** call `isEntitled` for FR-146. One handler that calls `isEntitled` once “for the request” puts billing on the invite-send path. Correct split: invite row does not call; `ChatPort` cap check on Flash does. That split is not written on the HTTP resource.

3. **Who may call, restated.** Legal callers remain: Brother invite quota; Sister invite send/quota only when `same_quota_as_brothers`; Sister checkout in both modes; paid-faster-review reorder; Chat/Flash/card **send** for FR-146; `GET /v1/me/message-remaining`. Discovery must not call `BillingPort` to paint remaining on the card (use ChatPort / the remaining endpoint). Paid-faster-review / process-boot coupling to `setVisibility` is the prior SEC-2 residual — not introduced by the cap; do not expand it here.

`isEntitled` must not throw. A hang that 500s every Free send is an availability miss, not a safety paywall, if the adapter contract is honored as `unavailable` → Free cap. Weaker than (1).

### 5. Operator-only `daily_message_cap` write

**Pass.**

AD-8 names the key. SD §7: `PATCH /v1/staff/config` requires `roles ∋ operator`; `moderator` / `system` / env / SQL must not write it. Seed **10** is `[ASSUMPTION — admin-configurable, not a product lock]`. Change applies to subsequent Free-tier sends.

Residual (not a top finding): AD-29 says “same kind as `sister_reach_mode`” and does not repeat the env/SQL sentence. Two units that read AD-8 + SD §7 still agree. A unit that reads only AD-29 might allow a compile-time default override — AD-29 already forbids compile-out. Leave on AD-8; do not add AD-30.

### 6. Audit of grant / revoke / cap

**Pass on the HTTP command path.**

AD-18 lists attach, grant, revoke-one, remove, pause, end, and `daily_message_cap` change. Same unit of work as the row change. Cap payload includes `from`, `to`, `staffId`, key. Invites must not emit the config events.

Residuals (not top findings): remove may emit one event with the link id and omit the conversation ids that were live (the grant rows still have `revoked_at` — reconstructable in DB, thinner in the chain). Idempotent same-value PATCH need not emit. Seed of 10 on day one need not emit. Failed audit insert rolls back if “same unit of work” is implemented as one transaction — that sentence is now present, unlike yesterday’s mode-flip review.

### 7. No new profile columns leaking kids

**Fail as an example-vs-schema trap. Pass as a written ban.**

SD §6 profile keys: `dob`, `city`, `marital_status`, `polygamy_intent`, `madhhab`, `practice`, `life_plans`, `bio_*`, `visibility`. FR-021 stored fields: age/DOB, city/country, origin, marital status, education, profession, practice, intentions, description, Photos. **No kids field.** AD-28 / FR-024 example list includes “kids / accepts a partner with kids” and then says no new columns.

Two lawful discovery implementations:

1. Omit the kids chip (only compute polygamy + town + other real keys). Privacy-safe. FR-024 AC still passes.
2. Add `has_children` / `accepts_partner_with_children` so the example works — a new column that **structures** the existence of children on every browse card. Or derive `sharedTraits: ["has_kids"]` from bio NLP without a column — same public structured signal, no `ALTER TABLE`.

(2) is the leak the ban was meant to stop. The Rule’s own example points at it. Do not invent a kids AD; drop the example or name the existing `profile_field` key (there is none today). Children-adjacent data on a public card is CIL-sensitive even when the statute mapping stays with counsel.

### 8. Pass is not a public likes counter

**Pass.**

`/v1/browse/pass` is a dismiss. SD forbids a likes table. Favourites stay a private save. Flags for who-favourited / visitors stay off. A builder who emits `likes` on the card DTO is violating AD-28, not exploiting an unmarked seam. Residual: browse payload is not a closed field list — test the serializer; do not add an AD.

### 9. No invented member counts / online now

**Pass.**

AD-28 + AD-25 + flag `online_now=off`. Public `/v1/public/marriage-count` is dual-confirm only. Content `locale_string` inventing “+50k membres” is an AD-25 break. Residual: `mahram.presence` must mean “wali attached to this granted thread” (FR-079), not a green “online now” dot — that is SEC-1 if it leaks ungranted attach, and an AD-28 miss if it is live presence on a people list. Do not ship member last-seen on `/v1/browse`.

---

## Findings (triaged)

### High — mahram can read ungranted threads on every path except `/v1/mahram/threads` (SEC-1)

Grant-scoped read is specified for mahram-module queries. Chat persist emits `message.delivered` with no grant join. `GET /v1/conversations/:id/messages` has no mahram role bind. Invites-owned Flash has no `conversation_id` to grant and can be served to any confirmed wali. Invite-received SMS / `mahram.presence` can leak ungranted suitor or wali attach.

- **Attack:** mahram reads ungranted (and pre-accept Flash) content; empty-after-confirm is cosmetic.
- **Suggested action (no new AD):** AD-15 / AD-23: emit and long-poll only to viewers with an **active** grant (members: participants; mahram: grant row). Chat message GET rejects `roles ∋ mahram` — mahram reads only `/v1/mahram/threads`. Invites: Flash is invisible to mahram until a conversation exists **and** is granted (do not invent an invite-id grant). AD-16: mahram SMS only for pause/end/flag on granted threads; no Invite-received to the wali. FR-079 events only when the grant is active. Cite AD-12 on the chat + invites capability-map rows.

### High — revoke-all 60s does not drop live channels; revoke-one has no clock (SEC-2)

Remove sets `revoked_at` and revokes sessions. Open Socket.IO / long-poll membership is unbound. Revoke-one does not revoke sessions and has no 60s SLA, so `message.delivered` continues on that room. Media token denylist on mahram remove remains the locked AD-9 residual — do not reopen AD-9; do not claim FR-077 is true for chat-photo bytes until that residual is scheduled.

- **Attack:** read access after revoke-one (indefinite) or revoke-all (until socket dies), inside or past 60s.
- **Suggested action (no new AD):** AD-12 / AD-15: on revoke-one and on remove, disconnect mahram sockets and abort long-poll for those conversation ids within the same 60s budget as the grant drop. Revoke-one re-checks grant on every emit, not only on HTTP open. Leave AD-9 gateway mechanics untouched.

### High — mahram can self-grant and use member write/browse/invite routes (SEC-3)

`POST .../grants` is not Sister-session-bound. AD-12 forbids send **as her**, not send-as-self. Chat POST, `/v1/browse`, `/v1/invites` have no `role=member` predicate. Dual-role `roles[]` is allowed.

- **Attack:** self-grant → read-all (undoes AD-12); send as wali or as her if sender_id is trusted; browse/Invite on a `kind=mahram` session.
- **Suggested action (no new AD):** AD-8 / AD-12: only the ward’s `member` session may INSERT/revoke-one grants; mahram and `system` `FORBIDDEN`. Chat writes (message, reaction, typing, contact-share, reveal-request, stage) reject `roles ∋ mahram`. `kind=mahram` sessions cannot call browse, favourites, or invites. Dual-role accounts use separate sessions (same rule shape as staff-vs-member). SD “no mahram send” becomes the AD-12 sentence, not only “as her.”

### High — FR-146 `isEntitled` can wrap the whole chat resource (SEC-4)

The exception is **send-only**. The map and the HTTP tree are resource-scoped. A billing guard on `/v1/conversations` or `/v1/realtime` paywalls Chat-after-accept read (and any chat-module mahram read-through) when billing is down. A combined `POST /v1/invites` + Flash can call `isEntitled` in `free_unlimited` and violate AD-27.

- **Attack:** billing-unavailable blocks Chat read / safety-adjacent chat; Sister invite send calls `BillingPort` in `free_unlimited`.
- **Suggested action (no new AD):** AD-21: `isEntitled` runs only inside the send-cap predicate (chat persist, Flash persist via `ChatPort`, card quick-message via `ChatPort`, `GET /v1/me/message-remaining`). No guard on conversation GET, WS handshake, contact-share, or typing. Invite persist in `free_unlimited` still must not call; Flash cap is the `ChatPort` call. Put AD-21 on the chat capability-map row.

### Medium — kids example invites a new column or a structured kids trait (SEC-5)

FR-021 and SD §6 have no kids field. AD-28 names “kids / accepts a partner with kids” as a computed shared trait and forbids new columns. Discovery can add `has_children` or emit `sharedTraits: ["has_kids"]` from bio to match the example. That is a public structured signal about children on every card.

- **Attack:** new profile column or derived chip leaking kids on browse.
- **Suggested action (no new AD):** AD-28: drop the kids clause from the example list, **or** name the existing key (none today — so drop). `sharedTraits` only from the SD §6 columns. Do not NLP-extract children from bio onto the card.

---

## Topic scorecard

| Topic | Score | Note |
| --- | --- | --- |
| Granted, delivered read | fail-on-channel | Mahram-module GET holds; WS / chat HTTP / Flash (SEC-1) |
| Revoke-all ≤60s | fail-on-live-path | Grant row + session revoke hold; rooms / revoke-one (SEC-2) |
| No send / browse / Invite | fail-on-authz | UI holds; grant writer + role predicates (SEC-3) |
| BillingPort isolation | pass-on-named-handlers | Volume exception can wrap the chat resource (SEC-4) |
| Operator-only `daily_message_cap` | pass | AD-8 + SD §7 |
| Audit grant / revoke / cap | pass-on-HTTP | Same unit of work; thin remove payload is residual |
| No kids column | fail-on-example | Ban exists; example invites the column/chip (SEC-5) |
| Pass ≠ public likes | pass | Endpoint + no-likes-table |
| No invented counts / online now | pass | AD-28 / AD-25 / flag; test browse DTO |
| Locked ADs (5, 9, 10, 11) | not scored | Out of scope. AD-9 denylist residual noted under SEC-2 only |

---

## What this review is not

Not a penetration test. Not a CIL filing pack. Not a rewrite of A1–A3. Not a reopen of AD-5, AD-9 blur/gateway, or AD-10/AD-11 passive Chat. Not a request to start another BMAD skill. Not a new AD (AD-30+). The spine and companion were not edited. Sister-reach findings from `reviews/review-security-privacy-2026-10-02.md` that this pair already wrote into AD-2 / AD-8 / AD-18 / AD-21 / Conventions are not restated as open. The 2026-10-01 transferable-token / Mahram-remove media denylist remains unapplied and is cited only as a bound on how complete FR-077 media-byte revoke can be.

---

## Top findings (parent return)

1. **High — SEC-1:** Mahram read is grant-filtered only on `/v1/mahram/threads`; Socket.IO / long-poll, chat HTTP, and pre-conversation Flash can deliver ungranted content.  
2. **High — SEC-2:** Revoke-all 60s is grant-row + session revoke; live rooms are not dropped; revoke-one has no clock and does not revoke sessions.  
3. **High — SEC-3:** Grant POST is not Sister-only (self-grant → read-all); chat write / browse / invite are not `role=member`; AD-12 bans send-as-her only.  
4. **High — SEC-4:** FR-146 `isEntitled` can be applied to the whole chat resource or to bundled invite+Flash in `free_unlimited`.  
5. **Medium — SEC-5:** AD-28’s kids example has no source field; discovery can add a kids column or a structured `has_kids` chip on the public card.
