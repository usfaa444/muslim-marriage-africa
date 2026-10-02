# Security / privacy review — 2026-10-01 Chat correction

> **Annotation 2026-10-01 (final spine).** AD-12 no longer names Chat `pending`/`held` or a staff hold queue. Findings in this file that say it does were written against a mid-edit spine and are stale. The final AD-10 rule forbids a pre-delivery Chat hold.

**Artifact:** `ARCHITECTURE-SPINE.md` + `SOLUTION-DESIGN.md` (updated 2026-10-01)  
**Lens:** authn/z, photo original leakage, signed-URL revoke, passive Chat moderation (must not reintroduce pre-delivery hold), contact-share predicate, money-ask flagging, audit, CIL honesty, staff export ban  
**Attack:** can two teams obey AD-10 and still leak originals, skip Contact-share, or treat AI 5xx as a send block?  
**Sources read:** the pair above; prior `reviews/review-security-privacy.md` (superseded 2026-09-27 review); PRD FR-046, FR-048, FR-059, FR-062–FR-068, FR-144, NFR-001–NFR-003  
**Binding 2026-10-01 (not reopened):** Chat is delivered immediately then passively scanned; a flag does not unsend; AI does not auto-suspend; Profile Photo/bio stay publish-gated; AD-9 blur unchanged (server-side, capability token, originals never shipped); AD-12 mahram reads delivered only; Contact-share remains the single phone/WhatsApp/link predicate; AD-5 data residency not reopened.  
**Spine / companion:** not modified by this review  
**Verdict:** pass-with-findings  
**Date:** 2026-10-01

This is not legal advice and not a CIL filing. It judges whether two feature teams that obey the written ADs can still produce the three attack outcomes, and whether the rest of the requested control surface still holds after the passive-Chat correction.

---

## Verdict in one paragraph

AD-10 as amended is a real send-first lock for **conversation-scoped Chat text**: persist `delivered`, background `ModerationPort`, flag does not unsend, AI 5xx records `scan-deferred` / `scan-failed` and does not hold. The 2026-09-27 holes that this correction was asked to close — pre-delivery hold, 300–900s raw pre-sign, CSRF/staff MFA/captcha, audit-as-WORM overclaim, hosting-only CIL paragraph, staff-export slogan — are closed on the Chat/message path. The contract is **not** yet sufficient against the attack. An invites team can ship Message Flash (free text, pre-conversation) with no Contact-share predicate and no `moderation_job` FK. A chat team can put a `MediaPort.sign` capability token on `message.delivered`; the gateway is not bound to the authenticated caller, and Mahram-remove does not denylist media. A chat team that implements the send-time Contact-share detector *through* `ModerationPort.scanText` will treat AI 5xx as either a send block or a Contact-share skip. Those are lawful readings of the current seams, not rogue deviations. Closable without a new paradigm. Until they are closed, **pass-with-findings**, not launch-cleared.

---

## What holds (do not re-litigate)

Closed by the 2026-10-01 pair relative to `reviews/review-security-privacy.md`. Do not reopen as if the old text were still live.

| Topic | Why it holds now |
| --- | --- |
| Authn split | AD-7 cookie vs Bearer. AD-17: `Secure` + `HttpOnly` + `SameSite=Lax` + CSRF on cookie POST/WS. Capacitor Bearer in platform secure storage, not WebView localStorage. Captcha on signup/login. |
| RBAC | AD-8: `member \| mahram \| moderator \| operator \| system`. Sister/Brother is an attribute. Staff MFA; `session.kind=staff`; operator-as-member forbidden. `system` must not mint reveal URLs. Ban / password change / Mahram remove call `IdentityPort.revokeSessions`. Age gate 19+ unchanged. |
| Photo originals in feeds | AD-9: serializers never emit `original_key`; `MediaPort.sign` refuses `original` and clear `md` without a live reveal grant; list/grid/push thumbs are blur; notifications persist asset ids. `/v1/media` never returns `original_key`. Erase includes object versions. `FLAG_SECURE` is deterrence. |
| Signed-URL *mechanism* | AD-9: capability token to the **media GET gateway** (not a raw bucket pre-sign); gateway re-checks grant + denylist on every GET; `signed_url_ttl_seconds` capped at 60. FR-059 is stop-**serving**, not stop-minting. Cached client bytes remain the named residual. |
| Passive Chat (message path) | AD-10 / AD-15 / SD §6 / §8: `message.state` is `delivered` only. No Chat `pending→delivered`. No delivery-stopping `hold_queue`. Clocks `>10s / >30s → hold` deleted. Worker, not the send request, calls AI (`WK --> AI`). Moderation never writes `message.state`. Profile Photo/bio stay on the publish-gate diagram. |
| AI 5xx on the Chat *job* | Named: 5xx / timeout / empty / malformed / low confidence → `scan-deferred` / `scan-failed` on `flag_queue`. Does not delay send. AD-11: `mos`/`dyu` is not a Voice hold. AD-16: media waits for connection, not AI. AD-22: OQ-2 resolved; no hold-timeout UX. AD-20: scan-deferred count never hidden. |
| Money-ask | AD-10 + AD-17 + SD §8: delivered and flagged, including after Contact-share. Not a send-time refuse. Independent of the phone/link predicate. |
| Payment isolation | Unchanged and out of the attack. AD-21 still keeps billing off safety paths. |
| Audit wording | AD-18 is tamper-evident (INSERT/SELECT-only role, nightly verify, no phones/original bytes in `payload`), not WORM. Mandatory events now include scan-deferred / scan-failed and admin flag actions. |
| CIL hosting honesty | A3 kept. AD-5 not reopened. France = transfer; launch gate = authorisation + DPA + encryption. GDPR-grade contracts are not art. 42 adequacy. Filing inventory in SD §5.3 names religious fields (art. 12), biometric + foreign-transfer + AI/profiling bullets (art. 31, counsel maps), and destinataires beyond Scaleway. |
| Staff export *intention* | AD-17: list/browse/metrics never return phone or WhatsApp. Only `operator` `cil_ticket` for that subject emits another person’s contact. Every such export is an AD-18 event. Prod app SQL roles cannot `COPY`/`SELECT` contact columns in bulk. |

---

## Attack result

| Attack outcome | On conversation Chat **text** if both teams obey AD-10 + AD-17 | Still possible while obeying the written ADs |
| --- | --- | --- |
| Leak originals | Serializers cannot emit `original_key`; `sign(original)` refuses without a reveal grant | **Yes** — transferable gateway tokens on `message.delivered` / Flash-adjacent media; Mahram-remove does not bind `MediaPort` denylist (SEC-1) |
| Skip Contact-share | HTTP persist of Chat text must refuse with `CONTACT_SHARE_REQUIRED` | **Yes** — Message Flash is invites-owned, pre-conversation, free text (SEC-2). Also notification/SMS bodies (SEC-5). Also Contact-share-via-`ModerationPort` fail-open (SEC-3) |
| Treat AI 5xx as a send block | Background job records `scan-deferred`; persist already returned | **Yes** — if the send-time Contact-share detector *is* `ModerationPort.scanText` (SEC-3). AD-12 leftover `pending`/`held` can also grow a second hold machine (SEC-4) |

The Chat-text happy path is specified well enough that a single chat team following AD-10 cannot *accidentally* hold on 5xx. The failures are **cross-module seams** AD-10 names but does not own.

---

## Judgement by requested topic

### 1. Authn / authz

**Pass.** The 2026-09-27 authz unfinished list (WS handshake, CSRF/SameSite, staff MFA, captcha, `system` reveal, operator-as-member, session revoke) is now in AD-7 / AD-8 / AD-15 / AD-17.

Residual that is *not* a new AD, but feeds SEC-1: `/v1/media/get` is not required to present `AuthContext`. A bearer capability token that the gateway accepts without a session is the intended anti-pre-sign design **only if** the token is non-transferable or the GET caller is re-bound to `viewerId`. That bind is missing. Staff unblur still requires an audited grant — do not let `/v1/staff/flags` treat `moderator` as an implicit original grant.

### 2. Photo original leakage

**Fail the “originals never shipped” promise at the Chat/Mahram seam. Pass on list/grid/push.**

AD-9 still prevents `original_key` in HTTP/WS serializers and refuses `sign(original \| clear md)` without a live reveal grant. That stops a careless profile DTO. It does not stop:

1. **Embed-then-forward.** AD-15 *permits* media URLs on the socket (“still minted only by `MediaPort.sign`”). Chat persist “recipient sees them without waiting for AI” (AD-10) is lawfully implemented as: sign once at send, put the URL on `message.delivered`. `MediaPort.sign(assetId, derivative, viewerId)` takes a viewer, but the minted artifact is named a **capability token**. Classic capability tokens are transferable. The gateway “re-checks grant + denylist” does not say *whose* grant: token subject (owner / intended viewer) vs authenticated GET caller. If grant is checked against the token subject, anyone who can read the message row — counterpart, Mahram (AD-12 read-all delivered), staff flag UI, subject-access export — presents the same URL and receives the bytes.
2. **Owner self-sign.** The uploader may `sign(original, ownerId)` (self-view is a live grant in any reasonable media module). Copying that token into the Chat payload is compatible with “never emit `original_key`” and with “recipient sees the Chat Photo immediately” (FR-063). Gateway grant(owner) still passes if it is not rebound to the caller.
3. **Conversation ≠ reveal_grant.** AD-23 does not create a `reveal_grant` when a Chat Photo is persisted. Two lawful products: (a) Chat Photos stay blur-only (haya-safe, product-wrong vs FR-063 “thread shows the image”); (b) media treats conversation membership as an implicit grant, including `original` / clear `md`. (b) plus a transferable token is an original leak to every reader of the delivered event.
4. **Mahram vs reveal.** AD-12 read-all delivered vs AD-9 per-viewer grant is still unbound (same seam as the 2026-09-27 adversarial P9). Media can lawfully refuse Mahram originals; Mahram can lawfully demand `sign` with `MahramPort.canRead`. Sister remove revokes mahram *read* and sessions within 60s (AD-12, AD-8) but does **not** call `MediaPort` denylist / `revokeByViewer`. Already-issued tokens and leftover grants outlive the link.

Cached client bytes after a *working* revoke remain the accepted FR-061 residual. This finding is not that residual. It is the origin still serving originals to someone who was never the granted viewer, or who was removed.

### 3. Signed-URL revoke

**Pass as a Chat-revoke mechanism; fail as a Mahram-remove / token-binding mechanism.**

The 2026-09-27 SEC-1 (300–900s S3 pre-sign, denylist only at mint time, unbounded `signed_url_ttl_seconds`) is closed. TTL cap 60 + GET-path re-check meets FR-059 **when the GET hits the gateway as that viewer**.

Still broken when:

- the token is transferable (SEC-1);
- Mahram-remove / Ban does not denylist outstanding tokens for that `viewerId`;
- a future CDN is placed in front of `MG` and cached by URL (that would violate “every GET”; do not add one without `Cache-Control: no-store` / cache-bypass). `apps/web` `next/image` would be a second origin — not specified, not scored as a present hole.

Do not reopen the old 900s pre-sign finding.

### 4. Passive Chat moderation (no pre-delivery hold)

**Pass on conversation `message`. Fail on leftover AD-12 states and on Flash substrate.**

AD-10 Prevents + Rule + both mermaid diagrams + SD §6 `message.state \`delivered\`` + AD-15 event list (`message.delivered` only) are aligned. A chat team that persists, enqueues, returns 200, and emits `message.delivered` cannot treat job-level AI 5xx as a hold without violating the Rule.

Reintroduction paths that still compile against the spine:

- **AD-12 parenthetical** still says Mahram reads delivered only — “not `pending` or `held` (those stay on the staff queue).” After the correction there is no Chat `pending`/`held`. Implementing that sentence as message states recreates the second Chat state machine AD-10 Prevents. Profile `pending` (FR-065) is the only remaining pending machine and is not a Mahram read-scope. Do not reopen AD-12’s mahram *product* (Sister-initiated, no send-as-her, delivered-only, D38 60s). Delete the stale states from the sentence.
- **Message Flash** is on the AD-10 modality list but not on the scan substrate (AD-3 `message_flash` → invites; `moderation_job` is `message_id or asset_id`; ER is `MESSAGE ‖--o| MODERATION_JOB`; capability map Flash row cites AD-23/21/26, not AD-10). An invites team can persist Flash and skip `ModerationPort` entirely. That is not a send block; it is an unscanned delivery with no `scan-deferred` row — NFR-003’s chaos metric will not see it.
- **`MediaPort.applyModeration`** is scoped to the Profile publish gate. A media team that applies it to Chat Photo `photo_asset` rows would hide an already-delivered Photo (an unsend). The sentence is there; treat as a test assertion, not a missing rule.

Paid-faster-review must not skip the scan or auto-clear a flag (AD-10, AD-21). Holds.

### 5. Contact-share predicate

**Pass as a single writer on conversation Chat text. Fail as a complete phone/WhatsApp/link predicate.**

Landed: only chat writes `contact_share`; moderation/trust call `ChatPort.contactShareOpen`; `taaruf_stage` must not encode it; reject is HTTP `CONTACT_SHARE_REQUIRED` to the sender, not a recipient hold; both members opt in (`opened_by_a`, `opened_by_b`); Mahram is optional.

The attack is a **skip**, not a second writer.

**Flash (SEC-2).** FR-046: Flash is visible **before accept**. AD-23: no conversation until Sister accept (or she sent). `contact_share` is conversation-scoped. FR-068’s own example — “voici mon WhatsApp 70…” with Contact-share off → block — is lawful Flash text (Ice Breaker templates are editable, FR-047). Invites owns `message_flash` and is not told to call `ChatPort.contactShareOpen` (there is nothing to open). Two teams obey AD-10 (Flash delivered immediately) and AD-17/AD-23 (chat-only predicate, chat-only conversation) and the recipient sees the number before a Chat exists.

Image/voice phone-or-QR **after delivery** is specified (AD-10, SD §8) and is not a Contact-share skip. Do not “fix” it by awaiting `scanImage` before persist — that is the 5xx-as-send-block regression.

Send-over-Socket.IO is not a listed event; reject is specified as HTTP. Not scored as a second persist path.

### 6. Money-ask flagging

**Pass.** Delivered and flagged, even after Contact-share. Not a send-time predicate. Lexicon lives on the passive-scan path (SD §8 step 3). Residual: spoken/on-image money-ask is only as good as the after-delivery transcript/classifier; `scan-failed` leaves it delivered and unflagged. That is the honesty of the lock, not a hole.

### 7. Audit

**Pass as tamper-evident.** Mandatory set covers scan-deferred / scan-failed, admin flag actions, reveal grant/revoke, subject-access export, mahram attach/remove. Payload hygiene forbids phones and original bytes.

Gap, not a top finding: **Contact-share open/close is not a mandatory AD-18 event.** The predicate that unlocks phones has no forensic row. Add it when the companion is next touched. DBA/PITR residual is already disclosed (not WORM).

### 8. CIL honesty

**Pass on hosting and on the 2026-09-27 CIL-1 close. Do not reopen AD-5.**

Still incomplete as a destinataire list for a legal reader who only uses SD §5.3:

- The architecture already names **FCM**, **Web Push**, **Google OIDC**, and **captcha**. Several are USA processors. §5.3 “include SMS, KYC, moderation/ASR, and mobile-money” does not name them. “Include” is not “only,” but the inventory is sold as filing inputs.
- Push/SMS bodies are not forbidden from carrying Chat/Flash text. That is a foreign transfer of chat content and a Contact-share side channel (SEC-5).
- Mahram is a human destinataire of chat. Controller-personnel (moderators) are not usually listed the same way; the guardian is.

Passive scoring of every outbound Chat item is correctly handed to counsel as an art. 31 AI/profiling fact. Do not decide it here. 72h breach notice remains a product SLA, not an invented article. Retention clocks stay `[ASSUMPTION]`.

### 9. Staff export ban

**Pass as a control on account-contact columns. Residual on other channels.**

Endpoint deny + `cil_ticket` exclusivity + SQL role + audit event + no phones in `audit_event.payload` is enough to fail the NFR-001 “low-privilege staff CSV” test.

Not closed, not scored as a new High:

- Flag-queue and case UIs must show the already-delivered body. If that body *is* a phone (Contact-share open, or Flash skip), staff see a contact. That is moderation, not list export — keep it off `/v1/staff/metrics` and browse.
- OpenTelemetry request logs (AD-20) are not forbidden from recording bodies/query strings. Observability can become the export.
- PITR backups contain contact columns. Same residual class as “audit is not WORM.”
- `IdentityPort.exportAccount` for the owner is the legitimate path; it must not include the counterpart’s phone unless Contact-share is open.

---

## Findings (triaged)

### High — transferable media tokens leak originals (SEC-1)

AD-9 + AD-15 allow a `MediaPort.sign` URL on `message.delivered`. The URL is a capability token to `/v1/media/get`. The gateway re-checks grant + denylist but does not bind the GET to `AuthContext.accountId == token.viewerId`. Conversation membership is not a `reveal_grant` writer. Mahram read-all and staff/export readers receive the same payload. Sister remove / Ban revokes sessions and mahram *read*, not media denylist.

- **Attack:** leak originals while obeying AD-10 (recipient sees Chat Photo immediately) and AD-9 (only `sign` mints; no `original_key`).
- **Close (companion or tighten AD-9/AD-15/AD-12 — do not change blur product):** messages carry `media_id` only; sign at read time per caller. Gateway authenticates the caller and checks `grant(asset, callerId)` + denylist. Tokens are non-transferable. Chat Photo may use grant kind `chat_participant` (not `original` unless a reveal grant exists). Mahram grant kind is named (`mahram_read` = same derivative the ward was shown, or blur-only). Sister remove / Ban **must** `MediaPort.revokeByViewer` inside the same 60s budget. `/v1/staff/flags` is not an implicit original grant.

### High — Message Flash skips Contact-share (and the scan FK) (SEC-2)

Flash is user-editable free text, visible before accept (FR-046), owned by invites, with no conversation and therefore no `contact_share`. AD-10 names Flash for immediate delivery. AD-17’s predicate cannot fire. `moderation_job` has no `flash_id`. Capability-map Flash row does not cite AD-10.

- **Attack:** skip Contact-share (FR-068 example works as Flash). Also skip the passive scan, so AI 5xx never becomes `scan-deferred` because no job exists.
- **Close:** send-time Contact-share matcher runs on Flash in invites via a chat/kernel port (or refuse phones/links in Flash outright — product choice, one rule). `moderation_job` accepts `flash_id` (or Flash is forbidden from being copied into `message` later). Capability-map Flash row cites AD-10 + AD-17. FR-048 Mahram-reads-Flash remains an AD-12 *read-surface* gap (pre-conversation); do not reopen mahram product rules to fix it — add a Flash read port.

### High — Contact-share detector has no home; AI 5xx becomes a send block or a skip (SEC-3)

AD-10: Contact-share is the deterministic send-time predicate, **not the AI**. SD §8 step 3 says the same and then lists `ModerationPort.scanText` as the background scanner. No named function, lexicon owner, or fail mode for the send-time matcher.

Lawful Team Chat: call `ModerationPort.scanText` in the persist handler to detect phone/WhatsApp/links (one vendor, swappable). AI 5xx / empty → either refuse persist (`CONTACT_SHARE_REQUIRED` or 503 — **send block**) or persist anyway (**skip**). Both are “obey AD-10” under a missing bind: must check at send, must not block on AI 5xx, must not skip Contact-share.

- **Attack:** treat AI 5xx as a send block, **or** skip Contact-share, while citing AD-10.
- **Close:** Contact-share matcher is a **local deterministic function in `chat` (and Flash in `invites`)** — regex / well-known handle patterns / URL parse. It must not call `ModerationPort`. 5xx of `ModerationPort` exists only on the background job and only writes `flag_queue`. Image/voice phone-or-QR stays after-delivery flag, never a persist await.

### Medium — AD-12 leftover `pending` / `held` can reintroduce a Chat hold (SEC-4)

“not `pending` or `held` (those stay on the staff queue)” is leftover fail-closed vocabulary. SD §6 forbids those message states. A mahram or staff team that implements the parenthetical as states + a staff hold queue recreates the machine AD-10 deleted.

- **Close:** drop the parenthetical. Keep “read-all of **delivered** messages on the attached conversation(s) only.” Do not reopen AD-12 product.

### Medium — Push / SMS bodies are an unbound Contact-share and CIL side channel (SEC-5)

AD-16/AD-23 lock push **thumbs** to blur derivatives. They do not forbid message/Flash **text** on FCM, Web Push, or Invite-received SMS. A notifications team implementing “recipient sees them” (AD-10) as a preview notification ships phone numbers to the device lock screen, the SMS destinataire, and Google FCM (USA) without Contact-share and without listing FCM/OIDC/captcha on SD §5.3.

- **Close:** notification payloads are template + conversation/invite ids only — no body, no phone, no media URL except `MediaPort.sign` blur. Add FCM, Web Push, Google OIDC, and the captcha vendor to the filing inventory when those adapters are chosen. Do not touch AD-5.

---

## Topic scorecard

| Topic | Score | Note |
| --- | --- | --- |
| Authn/z | pass | 2026-09-27 WS/CSRF/staff/captcha list closed; gateway caller-bind missing (rolled into SEC-1) |
| Photo original leakage | fail-at-Chat-seam | Feeds/serializers hold; transferable `sign` URL + unbound Mahram grant do not |
| Signed-URL revoke | pass-on-mechanism | 60s GET re-check holds; Mahram-remove denylist does not |
| Passive Chat / no hold | pass-on-message | AD-10 message path is tight; AD-12 leftover + Flash FK are the reintro / skip |
| Contact-share predicate | fail-on-Flash | Single writer on Chat text; Flash and notify bodies skip |
| Money-ask flagging | pass | Delivered + flagged; not a send block |
| Audit | pass | Tamper-evident; add Contact-share events later |
| CIL honesty | pass-on-hosting | AD-5 not reopened; FCM/OIDC/captcha absent from §5.3 (SEC-5) |
| Staff export ban | pass-with-residual | `cil_ticket` + SQL role hold; OTel/backups remain residual |

---

## What this review is not

Not a penetration test. Not a CIL filing pack. Not a rewrite of A1–A3. Not a reopen of AD-5, AD-9 blur product, or AD-12 mahram product. Not a request to start another BMAD skill. The spine and companion were not edited. Findings from `reviews/review-security-privacy.md` that the 2026-10-01 text actually closed are not restated as open.

---

## Top findings (parent return)

1. **High — SEC-1:** Capability-token media URLs on `message.delivered` are transferable; gateway is not caller-bound; Mahram-remove does not denylist — originals still leak.  
2. **High — SEC-2:** Message Flash is pre-conversation free text with no Contact-share predicate and no `moderation_job` FK.  
3. **High — SEC-3:** Unnamed Contact-share detector can be `ModerationPort.scanText` at send time, so AI 5xx is a send block or a skip.  
4. **Medium — SEC-4:** AD-12 leftover `pending`/`held` can recreate a Chat hold machine.  
5. **Medium — SEC-5:** Push/SMS bodies can ship phones (and chat) off-platform / to FCM without Contact-share; §5.3 omits those destinataires.
