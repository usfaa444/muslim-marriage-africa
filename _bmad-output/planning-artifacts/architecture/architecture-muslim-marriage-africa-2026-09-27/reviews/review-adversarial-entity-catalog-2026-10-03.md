---
name: review-adversarial-entity-catalog
artifact: ARCHITECTURE-SPINE.md + SOLUTION-DESIGN.md ## 6. Entity catalog
lens: adversarial
date: 2026-10-03
status: complete
kind: reviewer-gate
focus: 53 stored entities / Not stored list / catalog grains
verdict: pass-with-residual
---

# Adversarial review — entity catalog (2026-10-03)

**Artifact:** `_bmad-output/planning-artifacts/architecture/architecture-muslim-marriage-africa-2026-09-27/ARCHITECTURE-SPINE.md` plus companion `SOLUTION-DESIGN.md` `## 6. Entity catalog`  
**Lens:** Attack the spine as an adversary. Construct two units one level down (two feature teams) that each obey every AD to the letter and still ship incompatibly — clashing shared-data shapes, two owners of one entity, conflicting state-mutation paths. Every pair is a hole to close with a new or tightened AD.  
**Scope of this update:** the catalog of record. AD-3 is ownership only; field-level columns live here. Prior card / cap / grant / Sister-reach AD tightenings are already in the spine and are **not** re-opened as holes.  
**Locked (not holes):** A1–A3; product name; AD-5; stack pins; Capacitor (AD-4); AD-9 blur/reveal/gateway product; **AD-10 / AD-11 / AD-12 / AD-27 / AD-28 / AD-29 product rules**. Do not invent kids/children/`has_children` columns. Do not invent a likes table. Do not restore `hold_queue` or `message.state` `pending`/`held`.  
**New-AD bar:** do **not** propose AD-30 unless two teams can still diverge on a real decision fork that a field-table tighten cannot close. A catalog is not a new AD. Prefer: add a missing field the ADs already name; clarify a type/null; add a relationship bullet.

Independent count of catalog `###` headings: **53** stored entities. Matches AD-3 once `profile_field`, `completeness`, `taaruf_stage`, and `mahram_permission` are read as the **Not stored** aliases the catalog names.

## Method

Two hypothetical feature teams — **Team A** and **Team B** — are given the spine **and** the catalog and nothing else. Each team:

- ships one API product, hexagonal modules, ports, adapters (AD-1, AD-2);
- writes only the entities AD-3 assigns; treats the catalog Field|Type|Null|Meaning tables as the stored shape;
- does not store likes, kids/`has_children` columns, `hold_queue`, a `sharedTraits` table, completeness, `taaruf_stage`, `profile_field` EAV, or `mahram_permission`;
- treats `discovery_exclusion` as a viewer-scoped pass, not `favourite` (AD-28);
- keys `mahram_thread_grant` on `conversation_id` with no `invite_id` (AD-12);
- persists Chat `message.state` as `delivered` only (AD-10);
- writes `invite_quota` / `message_quota` as `{ account_id, civil_day_ouaga, sent_count }` (AD-27, AD-29);
- stores `operator_config` as key/value, not one column per setting;
- stores `pack` / `payment` with an explicit end and **no** `renew_at` (AD-14);
- stores `audit_event.payload` as ids + action + reason — never phones or original photo bytes (AD-18).

If those two teams can still disagree on a shared record, a writer, or a mutation path, the catalog does not yet bind that seam. A pair that only exists by *violating* a locked AD (hold, likes, kids column, `invite_id` grant, auto-renew, Brother-free, pending/held message) is not a hole.

## Verdict

**pass-with-residual**

The 2026-10-03 catalog holds for the thing it was written to lock. Two teams **cannot** lawfully invent a likes table, kids/`has_children` columns, `hold_queue`, `message.state` `pending`/`held`, an `invite_id` on `mahram_thread_grant`, a `renew_at`, a wide `operator_config` row, an EAV `profile_field`, a `taaruf_stage` table, a `mahram_permission` table, or audit payloads that carry phones or original photo bytes. `discovery_exclusion` is the pass row. Quota grains match the locked ADs. No AD-30 is justified.

That is not enough for a clean pass. Teams that obey every AD and the catalog tables as written can still:

- store the member phone that AD-17 names as `phone_e164` on `account`, on `verification_record`, or on a new credential kind — two owners of one identifier (**P1**);
- collapse suspected-minor `visibility=held` and 24h `emergencyHide` onto one text column with no until-clock, so a 24h unhide lifts a minor hold (**P2**);
- put Flash read-through on `conversation.flash_id`, on `message.flash_id`, or on both — three persisted shapes for one AD-10 sentence (**P3**);
- INSERT `entitlement` at checkout start, on webhook success, or as a stack of overlapping `ends_at` — `isEntitled` disagrees before money clears (**P4**);
- treat blur as `photo_asset.blur_key`, as `derivative.size=blur`, or as both that can drift (**P5**).

Every remaining pair closes by a catalog autofix (add the field the AD already names; pin type/null/grain; add a relationship or Not-stored bullet). None of them restore a hold, a likes table, a kids column, an `invite_id` grant, or silent auto-renew. **Do not add AD-30.**

---

## Checklist — named binds (not holes)

These attacks die. Do not spend AD or catalog budget re-arguing them.

| Check | Catalog bind | Hole? |
| --- | --- | --- |
| 53 stored entities | 53 `###` headings; AD-3 ownership minus the four Not-stored aliases | No |
| `discovery_exclusion` is viewer-scoped pass, not favourite | Grain PK `{ viewer_id, target_id }`; invariants: dismiss, not a like, not `favourite`, reuse existing row | No |
| `mahram_thread_grant` has no `invite_id` | Columns are sister + mahram + `conversation_id` + granted/revoked; “No `invite_id`”; Flash / pre-accept not grantable | No |
| `message.state` is only `delivered` | enum `delivered`; no `pending` / `held`; moderation never writes it | No — do not restore |
| `invite_quota` / `message_quota` grain | `{ account_id, civil_day_ouaga, sent_count }`; no UUID id; not per conversation; not a stored remaining | No |
| `operator_config` is key/value | `key` PK + `value` text; “Not one column per setting”; required keys listed | No |
| `pack` has no `renew_at` | `duration_days` 30/90/180; `payment.ends_at` explicit end; **No** `renew_at` | No |
| `audit_event` has no phone / photo bytes | `payload` jsonb: ids + action + reason — **never** phones or original photo bytes | No |
| likes / kids columns / `hold_queue` | **Not stored** | No — do not invent |
| `sharedTraits` DTO / completeness / `taaruf_stage` / `profile_field` / `mahram_permission` | **Not stored** (computed, `conversation.stage`, profile columns, link+grant) | No |

---

## What the catalog + locked ADs already bind (not holes)

| Attack | Why it dies |
| --- | --- |
| Pass overloads `favourite` or invents a likes table | AD-28 + catalog `discovery_exclusion` + Not stored |
| Kids / `has_children` / `accepts_partner_with_kids` column or chip | AD-28 + profile invariants + Not stored |
| `hold_queue` or Chat `pending→delivered` / `held` | AD-10 locked + `message.state` enum `delivered` + Not stored |
| Grant hangs on `invite_id` / Flash / pre-accept | AD-12 locked + grant table has no `invite_id` |
| `message_quota` written by invites or billing | AD-3 + AD-29 + catalog owner chat |
| `invite_quota` written by chat or billing | AD-3 + AD-27 + catalog owner invites |
| Silent auto-renew / `renew_at` job | AD-14 + pack/payment “No `renew_at`” |
| Wide `operator_config` (one column per setting) | Catalog key/value |
| Audit payload carries phone or original photo bytes | AD-18 + `audit_event.payload` meaning |
| EAV `profile_field` / `completeness` row / `taaruf_stage` table / `mahram_permission` table | Not stored + AD-3 “ownership only” pointer |
| Card quick-message as a `message` or new `conversation` | AD-23 / AD-28 locked (Flash alias) |
| Brother-free mode / compile-out of `sister_reach_mode` | AD-27 locked |

---

## Incompatibility pairs

Each pair is a hole. Suggested closure is a **catalog autofix**. No new AD. No reopen of AD-10 / AD-11 / AD-12 / AD-27 / AD-28 / AD-29 product rules.

### P1 — `phone_e164` is named by AD-17 and has no stored home

**Clash type:** two owners of one entity  
**Teams:** Identity vs Verification (Trust as the fingerprint consumer)  
**location:** catalog `account` / `credential` / `verification_record` / `fingerprint` / `sms_dispatch` / `mahram_invite`

**What the docs say**

- AD-17: Ban fingerprint is `sha256(phone_e164 | id_doc_hash | device_attestation)` owned by trust. Staff list/browse never return phone. SMS/push payloads are template + ids — no phone.
- AD-8 / AD-13: phone OTP is verification; identity writes `account`.
- Catalog `account`: email, pseudonym, gender, roles, status, age_attested. **No phone.**
- Catalog `verification_record`: kind `phone_otp`, `evidence_uri`. **No phone.**
- Catalog `credential.kind`: `password | google_oidc | apple`. **No phone.**
- Catalog `mahram_invite.phone`: dest until the guardian account exists.
- Catalog `sms_dispatch`: no dest phone; `account_id` nullable.
- Catalog `fingerprint.hash`: the formula names `phone_e164` as if it already lived somewhere.

**The fork**

- **Team Identity-column.** Member phone is `account.phone_e164` (unique). OTP reads it through `IdentityPort`. Trust hashes via that port. Staff SELECT of the column is a bulk-contact path AD-17 already forbids — they still needed a home.
- **Team Verification-otp.** Phone lives only on the latest `phone_otp` `verification_record` (they add a column the catalog omitted, or stuff it into `evidence_uri`). Identity never stores it. A later ID-only verification overwrites or leaves a stale number. Ban fingerprint follows whichever record they pick.
- **Team Identity-credential.** They extend `credential.kind` with `phone` and put the number in `provider_subject`. Login and Ban now disagree with Team Identity-column on uniqueness and on erase.
- **Team Trust-copy.** Fingerprint INSERT copies the raw `phone_e164` into `hash` inputs they persisted beside the row (or into `evidence`). They did not write `audit_event.payload` phones (AD-18 satisfied) and they did not invent a likes table. They still created a second contact store.

Same signup: one build has a unique identity phone; the other has a verification-only phone that Ban cannot stably read; the third has a credential-shaped phone. All three obeyed “identity writes account,” “verification writes `verification_record`,” “trust writes `fingerprint`,” and “audit payload never phones.”

**Suggested bind (catalog autofix)**

Add `account.phone_e164` text NO unique (the field AD-17 already names). Identity is the only writer. `verification_record` stores **no** phone (OTP dest is resolved through `IdentityPort` / `MahramPort` at send). `credential.kind` stays the three values — do not add `phone`. `mahram_invite.phone` remains the pre-account dest; after OTP creates the mahram `account`, that `phone_e164` is the source and the invite number is not a second member-phone store. `fingerprint.hash` is computed at ban time from `IdentityPort` + `VerificationPort` hashes — trust must not persist raw phone or ID bytes. `sms_dispatch` still stores no dest phone. Add `id_doc_hash` on `verification_record` (or an equivalent verification-owned hash field) so the other half of the AD-17 formula has one home.

---

### P2 — `profile.visibility` is one unbound text for two hide reasons

**Clash type:** clashing shared-data shapes / conflicting state-mutation paths  
**Teams:** Profiles vs Verification vs Mahram (Discovery as the reader)  
**location:** catalog `profile.visibility`

**What the docs say**

- Catalog: `visibility` text NO — “Browse gate including `held` and emergency hide (24h).”
- No enum. No `visibility_until`. No hide-reason column.
- AD-13: suspected-minor hold → verification writes the hold; profiles applies `visibility=held`.
- AD-12 / AD-23: `ProfilePort.emergencyHide(sisterId, 24h)`; discovery reads `profile.visibility` only.
- AD-12 product rule (when hide is required vs optional) stays locked — this pair is the **stored clock and discriminant**, not the “may” on remove.

**The fork**

- **Team Profiles-held.** Both minor-hold and emergency hide write `visibility=held`. A 24h worker sets `visibility` back to the previous live value. The worker has no stored until and no reason: a delayed-job loss leaves her hidden forever; a successful tick also unhides a suspected-minor who was `held` for AD-13.
- **Team Profiles-enum-only.** They invent `emergency_hidden` as a second string (catalog said “including `held` and emergency hide,” not that those are the same token). Discovery-A omits only `held`. Discovery-B omits anything except `live`. Same Sister is on the grid on one replica and gone on the other.
- **Team Profiles-until-column.** They add `visibility_until` the catalog does not list. Team Profiles-held has no such column. Migrations diverge.
- **Team Discovery-exclusion.** Emergency hide writes a `discovery_exclusion` for every other member (or a sentinel target) so browse can stay “visibility only” without a clock. That overloads the pass row AD-28 bound as a *viewer-scoped dismiss*, not a site-wide hide.

Same report-remove: one build hides her for 24h then returns her to the grid while a minor-hold is still in force; the other keeps her held; the third used pass-shaped rows that unblock will not understand. None of them invented a kids column or a likes table. Discovery still “reads `profile.visibility` only” on the builds that never grew an until column — they just do not agree what the string means.

**Suggested bind (catalog autofix)**

Pin `visibility` to a closed set that already appears in the ADs (`live` / unpublished-or-equivalent / `held` / `emergency_hidden` — pick the unpublished token the publish-gate already uses; do not invent a new product state). Add `visibility_until` timestamptz YES, set only for `emergency_hidden` (24h). The restore worker may clear **only** `emergency_hidden` when `visibility_until` has passed; it must not touch `held`. Discovery still reads `visibility` only (omit unless browse-live). Do not write `discovery_exclusion` for emergency hide or block.

---

### P3 — Flash read-through has two stored homes

**Clash type:** clashing shared-data shapes  
**Teams:** Chat vs Invites  
**location:** catalog `conversation.flash_id` and `message.flash_id`

**What the docs say**

- AD-10: Flash is not copied into a parallel `message` row; after `ChatPort.openFromInvite`, Chat may store `flash_id` as a read-through.
- AD-23: that read-through must not increment `message_quota` and must not consult the cap. Consume-once at Flash persist is already bound (do not reopen).
- Catalog `conversation.flash_id` YES — “Read-through after openFromInvite.”
- Catalog `message.flash_id` YES — “Read-through only. Not a second Flash body.”
- Catalog `message.body` is NO (required ciphertext). Hydrating a `message` therefore requires *some* body.

**The fork**

- **Team Chat-conversation.** `openFromInvite` sets `conversation.flash_id` only. Thread list reads Flash through Invites. No `message` row. AD-10 “not copied” satisfied.
- **Team Chat-message.** They INSERT a `message` with `flash_id` set so the thread has a first item. `body` is required: they copy the Flash envelope (a parallel body — the thing AD-10 forbade) or they store an empty/placeholder envelope (a `message` that is not a send, still a second row). They do not increment quota (bound).
- **Team Chat-both.** Both columns set; one side nullable in practice. A later accept-path writer fills one and not the other. Mahram / Chat GET disagree on whether the first item exists.

Same accepted Invite-with-Flash: 0, 1, or 2 persisted Flash pointers; 0 or 1 extra `message` row. Quota and `delivered` stay legal. The *shape* of the thread after `openFromInvite` is unbound.

**Suggested bind (catalog autofix)**

One home: `conversation.flash_id` is the only read-through. Drop `message.flash_id` (or the reverse — pick conversation; Flash is pre-message). Do not INSERT a `message` for the Flash. Body stays on `message_flash` only.

---

### P4 — `payment` has no state; `entitlement` can precede money; packs can stack or overwrite

**Clash type:** conflicting state-mutation paths / clashing shared-data shapes  
**Teams:** Billing (checkout) vs Billing (webhook) vs Chat/Invites (`isEntitled` readers)  
**location:** catalog `payment` / `entitlement` / `webhook_receipt` / `pack`

**What the docs say**

- AD-7: `Idempotency-Key` on payment create **and** webhook ingest; apply once.
- AD-14: webhook verify; apply once; explicit end; no renewal job.
- AD-21: `isEntitled` is pack presence only (`true | false | unavailable`).
- Catalog `payment`: no `state`. `ends_at` NO — “Explicit end.”
- Catalog `entitlement` 1:1 payment; `ends_at` NO — “Pack presence only.”
- Catalog `webhook_receipt` “applies at most one `payment`” with **no** `payment_id` column.
- Locked: no `renew_at`, no silent auto-renew, no brother-free. Not reopened.

**The fork**

- **Team Pay-on-create.** `POST /v1/payments` INSERTs `payment` + `entitlement` immediately (idempotency key on create). Webhook is a receipt only. `isEntitled` is true before Orange/Moov money clears — and stays true if the webhook never arrives.
- **Team Pay-on-apply.** Checkout writes `webhook_receipt` (or a pending payment they invented). `entitlement` INSERTs only on successful apply. `isEntitled` stays false until money.
- **Team Pay-stack.** A second 1-month pack while one is live INSERTs a second `entitlement`. `isEntitled` is true if **any** `ends_at > now()`.
- **Team Pay-overwrite.** The new payment UPDATEs the existing `entitlement.ends_at` (or DELETEs the old row). Billing still “never writes `invite_quota` / `message_quota`” (bound). Today’s remaining flips on one build and not the other.
- **Team Receipt-no-FK.** Apply matches on `idempotency_key` only. Two payments can share a provider ref; one receipt attaches to the wrong pack duration.

Same Sister, same 1-month pack, webhook delayed 10 minutes: Team create already lifted her FR-146 cap; Team apply still Free-caps Flash #11. Same member buys a second pack at day 20: one build extends to day 50 from now; the other runs two windows; the third replaces and shortens. No team stored `renew_at`.

**Suggested bind (catalog autofix)**

Add `payment.state` enum `created | succeeded | failed` (or: payment row exists only after successful apply — pick one and delete the other). `entitlement` INSERTs only when `state=succeeded` (same unit of work as webhook apply). `isEntitled` reads only a succeeded entitlement with `ends_at > now()`. Each payment creates at most one entitlement; overlapping live packs are **union of windows** (any live row) — do not UPDATE an old `ends_at` to fake a renew (that is how `renew_at` comes back without the column). Add `webhook_receipt.payment_id` uuid YES (set when applied). `pack.amount_xof` is seed/display; charged `payment.amount_xof` is the live `operator_config.pack_prices_xof` at checkout (closes the dual-price half of this pair; see P9).

---

### P5 — Blur has two stored homes

**Clash type:** clashing shared-data shapes  
**Teams:** Media (ingest) vs Media (sign) vs Discovery (thumbs)  
**location:** catalog `photo_asset.blur_key` and `derivative.size=blur`

**What the docs say**

- AD-16: derivatives `xs | sm | md | blur`.
- Catalog `photo_asset.blur_key` YES — “Default opposite-gender derivative.”
- Catalog `derivative.size` enum includes `blur`.
- List/grid/push thumbs are blur derivatives only. Serializers never emit `original_key`.

**The fork**

- **Team Media-column.** Ingest writes `blur_key` on the asset. Sign/list read that column. `derivative` rows are only `xs|sm|md`.
- **Team Media-row.** Blur is `derivative.size=blur`. `blur_key` stays null. Discovery that joined `blur_key` shows no thumb.
- **Team Media-both.** Both written at ingest; a later re-blur updates one. Opposite-gender grid gets the stale key.

Same profile photo: one replica’s card has a blur thumb; the other emits empty media and falls back toward a clear `md` path that AD-9 must still refuse — or a client-side placeholder that looks like a second blur (AD-9 product not reopened; the hole is the stored key).

**Suggested bind (catalog autofix)**

One home: `derivative.size=blur` is the blur object. Drop `photo_asset.blur_key`, or mark it denormalized-from-that-row and say ingest must write both in one unit of work. Do not keep two independent writers.

---

### P6 — `moderation_job` is keyed by three nullable FKs with no exclusivity

**Clash type:** two writers of one scan / clashing grain  
**Teams:** Chat vs Invites vs Media vs Moderation  
**location:** catalog `moderation_job` (`message_id` / `asset_id` / `flash_id`)

**What the docs say**

- AD-10: after persist, Chat (or Invites for Flash) **must** call `ModerationPort.enqueueScan`. That call is the only INSERT of `moderation_job`. Job is keyed by `flash_id | message_id | asset_id`.
- Catalog: all three FKs YES. No CHECK that exactly one is set. Chat-photo `message` also has `media_id`.

**The fork**

- **Team Chat-message-key.** Chat photo enqueue uses `message_id`. Asset scan goes through `MediaPort.fetchForScan`.
- **Team Media-asset-key.** Ingest of `chat_photo` also enqueueScans by `asset_id` (profile_photo already must). One send → two jobs → two `flag_queue` rows → two SLA clocks.
- **Team Job-open.** Worker INSERTs a job with all three null, then UPDATEs a key (catalog allows it). A crash leaves an unkeyed job that never flags and is not `scan-failed`.
- **Team Flash-and-message.** After `openFromInvite`, a hydrate path (P3) enqueueScans the new `message` *and* the original `flash_id`. Same Flash, two flags. They did not copy a hold and they did not write `message.state`.

Same Chat photo: 1 or 2 jobs. Same Flash: 1 or 2 jobs after accept. Passive delivery stays immediate (locked).

**Suggested bind (catalog autofix)**

Exactly one of `flash_id`, `message_id`, `asset_id` is non-null. Profile-photo jobs key by `asset_id`. Chat text / photo / voice jobs key by `message_id` (bytes via `MediaPort.fetchForScan` when needed). Flash jobs key by `flash_id`. `openFromInvite` read-through must not insert a second job. No job row with all keys null.

---

### P7 — `report.target` and `flag_queue.item_id` are untyped uuids

**Clash type:** clashing shared-data shapes  
**Teams:** Trust vs Moderation vs Chat  
**location:** catalog `report.target`; `flag_queue.item_id`; `moderation_case` dual nullable FKs

**What the docs say**

- Catalog `report.target` uuid NO — “Reported profile or message target.”
- Catalog `flag_queue.item_id` uuid NO — “Delivered message / flash / asset.” No `item_kind`.
- Catalog `moderation_case.report_id` and `flag_queue_id` both YES. No “exactly one / both-when-continuing” rule.

**The fork**

- **Team Trust-account.** `target` is always an `account_id`. A message report stores the sender only; the message id lives in `reason` text.
- **Team Trust-polymorphic.** `target` is a `message_id` when the member tapped a bubble. Staff JOIN to `account` misses. The same uuid space is used for accounts, messages, and assets.
- **Team Case-split.** One message that is both flagged and reported becomes two `moderation_case` rows (two SLAs) or one row with both FKs, or a staff-opened case with neither. `sla_started_at` is NO so a neither-row is still insertable.

Same FR-083 report-on-message: one build’s case points at the sender account; the other points at a message id that trust treats as an account and attaches a strike to a random/wrong row. Not a Chat-hold. Not a second `moderation_case` writer (trust still writes it).

**Suggested bind (catalog autofix)**

`report.target_account_id` uuid NO + optional `item_id` / `item_kind` (`message | flash | asset | profile`). `flag_queue` already has `account_id` + `item_id`; add the same `item_kind`. `moderation_case`: at least one of `report_id` / `flag_queue_id` NOT NULL; both allowed when an admin action on a flag continues a report case. One open case per `(account_id, item_kind, item_id)` unless a new report explicitly continues.

---

### P8 — `reveal_grant.photo_id` nullable creates two grant grains

**Clash type:** clashing shared-data shapes  
**Teams:** Media (policy) vs Media (gateway)  
**location:** catalog `reveal_grant`

**What the docs say**

- AD-9: per-viewer policy `on_accept | on_request | never`; `MediaPort.sign` refuses clear `md` / `original` unless a live reveal grant exists for that viewer. Gateway re-checks grant + denylist. (AD-9 product locked — this is the **row grain**.)
- Catalog `reveal_grant.photo_id` YES — “Per-photo grant when set.”
- No uniqueness. `signed_grant` is a second per-viewer, per-asset, per-derivative row with its own `revoked_at`.

**The fork**

- **Team Grant-per-photo.** Every row has `photo_id`. Policy is copied per asset. New profile photo is not granted (no unmatched clear-face — bound) until a new row exists.
- **Team Grant-per-viewer.** `photo_id` null means “all this owner’s photos for this viewer.” A new upload is clear to that viewer without a new row. Grid still blurs unmatched viewers (AD-9 satisfied) but *matched* viewers see new faces the owner did not grant.
- **Team Sign-table.** Gateway trusts `signed_grant` only (capability persist). Revoke sets `reveal_grant.revoked_at` and leaves `signed_grant` live until TTL — or the reverse. Two revoke clocks.

**Suggested bind (catalog autofix)**

`photo_id` NO. Unique active grant per `{ photo_id, viewer_id }` (`revoked_at IS NULL`). Owner policy may be copied onto each asset at upload; a null `photo_id` row is illegal. Gateway re-checks **live `reveal_grant` + `signed_grant.revoked_at`**; `signed_grant` is the minted-token row, not a second policy. Denylist: see P12 — do not invent a third table unless you add it to the 53 and to AD-3.

---

### P9 — Price has two authorities

**Clash type:** clashing shared-data shapes  
**Teams:** Billing vs Operator  
**location:** catalog `pack.amount_xof`; `operator_config` key `pack_prices_xof`

**What the docs say**

- Catalog `pack.amount_xof` NO — “Catalog amount. Live prices also in `operator_config.pack_prices_xof`.”
- Conventions / AD-18: operator price changes are audited.
- Sisters buy the same 1/3/6 packs in both reach modes (AD-14 locked).

**The fork**

- **Team Pack-row.** Checkout charges `pack.amount_xof`. An audited `pack_prices_xof` PATCH is ignored until someone UPDATEs `pack`.
- **Team Config-live.** Checkout reads `OperatorPort.get('pack_prices_xof')`. `pack.amount_xof` is leftover seed. Receipts disagree with the catalog page.
- **Team Both-write.** Operator PATCH updates config and billing UPDATEs every `pack` row (billing writes `pack` — they own it). A second replica still serving stale `pack` rows charges yesterday.

Same 3-month SKU after a price change: two XOF amounts, two `payment.amount_xof` histories, one AD-18 event. Not auto-renew.

**Suggested bind (catalog autofix)**

`pack.amount_xof` is seed/display only (or drop it and say display reads config). Charged amount is live `pack_prices_xof` at `payment` create, stored on `payment.amount_xof` (the receipt). Operator PATCH does not require a `pack` UPDATE to bind the next checkout.

---

### P10 — `profile_visit` has no grain; `contact_share` a/b is unbound

**Clash type:** clashing shared-data shapes  
**Teams:** Discovery vs Chat  
**location:** catalog `profile_visit`; `contact_share`

**What the docs say**

- `favourite` and `discovery_exclusion` declare grain PKs. `profile_visit` has `account_id`, `target_id`, `created_at` and **no** uniqueness. T&S reads remain on; member visitors list stays off.
- `contact_share`: `conversation_id` PK; `opened_at`, `opened_by_a`, `opened_by_b` all YES. “Both members must opt in.” Who is a/b is unsaid. `opened_at` vs the two stamps can drift.

**The fork**

- **Team Visit-append.** Every card view INSERTs a row. T&S volume is one-row-per-view.
- **Team Visit-upsert.** Unique `(account_id, target_id)`; `created_at` moves. T&S loses history.
- **Team Visit-day.** Unique per civil day. A third migration.
- **Team Share-first-clicker.** `opened_by_a` is whoever opted first; `opened_by_b` the second. The same member is `a` on one replica and `b` on another if two clicks race.
- **Team Share-invite-poles.** `a` = `invite.from_id`, `b` = `invite.to_id`. Open means both stamps set **and** `opened_at` equals the later of the two. Team Share-first treats `opened_at` as first click (Contact-share “open” too early; Flash-style matcher in Chat then allows phone).

Pass/`favourite` stay un-overloaded (bound). Contact-share still has one writer (chat). The **row identity** forks.

**Suggested bind (catalog autofix)**

`profile_visit`: pick one grain and write it as the PK — append-only event (id uuid + created_at; T&S) **or** unique `(account_id, target_id)` upsert. Do not leave both legal. `contact_share`: replace `opened_by_a/b` with `opened_by_from` / `opened_by_to` (invite poles) or `account_id` pair; `opened_at` is set iff both opt-ins are set, else null. Open predicate is `opened_at IS NOT NULL` only.

---

## Additional pairs (same class; catalog autofix; do not change the verdict)

These do not justify AD-30. They do not reopen locked product rules.

### P11 — Sister-sent Invite: when does `openFromInvite` run?

**Teams:** Invites vs Chat. AD-23 (locked product): conversation exists when the Sister accepted **or she sent**. Catalog `invite.sister_accepted_at` YES; `conversation.invite_id` NO. Team Invites-immediate calls `openFromInvite` in the send UoW. Team Chat-lazy waits for Brother open/reply (no conversation until then — Sister-sent Chat is refused). Add invite invariant: Sister-sent persist calls `ChatPort.openFromInvite` in the **same** unit of work; Brother-sent waits for Sister accept. Decline still creates no conversation.

### P12 — AD-9 `denylist` is named and is neither stored nor Not stored

**Teams:** Media vs Trust. Gateway “re-checks grant + denylist.” Catalog has `reveal_grant.revoked_at` and `signed_grant.revoked_at` only. Team Media-table invents `denylist` (54th entity, not on AD-3). Team Media-revoke uses `revoked_at` as the denylist. Team Trust-block treats `block` as the media denylist. **Not stored:** add `denylist` as an alias of grant `revoked_at` (+ block via `TrustPort` if that is the intent). Do not reopen the locked AD-9 transferable-token residual — do not claim a new table closes FR-059.

### P13 — `sanction.kind=ban` and `ban` are two rows for one act

**Teams:** two Trust authors. Catalog has both entities. Team A writes only `sanction`. Team B writes only `ban` + `fingerprint`. Team C writes both, or one, with no 1:1. Fingerprint-linked repeat Ban then misses. Invariant: `sanction.kind=ban` INSERTs exactly one `ban` in the same UoW; `ban` is the fingerprint-bearing row; warning/suspension do not write `ban`.

### P14 — `mahram_thread_grant` N:1 `mahram_link` has no `mahram_link_id`

**Teams:** Mahram. Relationship bullet names the link; columns are only sister + mahram + conversation. Team A joins the pair; Team B adds `mahram_link_id`. After remove + re-invite of the same guardian, pair-join can see stale revoked rows as “this link.” Add `mahram_link_id` uuid NO (or write the join as “active link pair + conversation”). Do not add `invite_id`. Do not change AD-12 grant grain.

### P15 — `session.kind` vs Capacitor mahram

**Teams:** Identity. `kind` is `web | capacitor | mahram | staff`. A mahram on Android is `mahram` on one build and `capacitor` on the other; `session.kind=mahram` must not hit browse (AD-8 / AD-12). Team capacitor-kind relies on `roles` only. Pin: `kind=mahram` whenever `roles ∋ mahram` (including Capacitor); `kind=staff` when moderator/operator; member web/capacitor never carry staff. Operator-as-member stays forbidden.

### P16 — Closed-set fields still typed `text`

**Teams:** any two module authors. `account.status`, `invite.state`, `verification_record.status`, `photo_asset.moderation_state`, `profile.marital_status`, `signed_grant.derivative` are prose lists, not enums. `marital_status` is YES while AD-26 requires it on the Invite decision surface. Team A stores `married`; Team B stores `marie`; polygamy_intent required-when-married misses. Autofix: enum the values the ADs already use; `marital_status` / `polygamy_intent` null only until first Invite-decision read, then refuse accept if missing — do not add kids columns.

---

## AD / catalog gap map (holes → bind)

| Pair | Missing bind | Action |
| --- | --- | --- |
| P1 | Home for `phone_e164` / `id_doc_hash` | Catalog: add `account.phone_e164`; verification-owned `id_doc_hash`; no second phone store |
| P2 | `visibility` enum + 24h clock vs `held` | Catalog: closed set + `visibility_until`; restore never lifts `held` |
| P3 | Flash read-through table | Catalog: `conversation.flash_id` only; drop `message.flash_id` |
| P4 | Payment/entitlement apply timing + stack | Catalog: `payment.state`; entitlement only on succeeded; union of live windows; `webhook_receipt.payment_id` |
| P5 | Blur key vs derivative | Catalog: one home |
| P6 | Job key exclusivity | Catalog: exactly one of flash/message/asset |
| P7 | Report/flag item grain | Catalog: typed item + case uniqueness |
| P8 | Reveal grant grain | Catalog: `photo_id` NO; unique active per photo+viewer |
| P9 | Price authority | Catalog: live config charges; `payment.amount_xof` is receipt |
| P10 | Visit grain; contact-share poles | Catalog: declare PK; name the two members |
| P11–P16 | Sister-sent open timing; denylist alias; ban 1:1; grant→link FK; session.kind; text vs enum | Catalog bullets / type pin |

**Do not add AD-30.** Two teams cannot rebuild a Chat hold, a likes table, a kids column, an `invite_id` grant, a `renew_at`, a wide config row, or an audit phone/photo dump while obeying the locked ADs and this catalog. The remaining forks are missing **fields**, **null/type pins**, and **relationship bullets** on the 53 tables — the job this update claimed to finish.

Minimum close before feature-spine fork: **P1, P2, P3, P4, P5**. P6 and P8 are the next sentence each.

---

## Two-team sketches (executable thought experiment)

### Sketch 1 — “Sister reports her mahram, then a Free Brother pays and sends Flash”

- Report/remove: **Profiles-held** sets `visibility=held` with no until (P2). Verification already had `held` for a suspected-minor review. 24h later a worker sets her live. Discovery shows her. **Profiles-until** would have left `held` untouched — if that column existed.
- Emergency hide did or did not write `discovery_exclusion` (P2). Pass rows for real viewers stay; a sentinel “hide” row is not a like (bound) but it is not a pass either.
- Grant revoke-all still sets `revoked_at` on `conversation_id` rows with no `invite_id` (bound). Team Mahram-link-id and Team pair-join disagree only if she re-invites the same number (P14) — residual.
- Brother buys a pack. **Pay-on-create** INSERTs `entitlement` now (P4). He sends Invite+Flash. Cap is Premium unlimited on that replica. **Pay-on-apply** still Free-caps him; Flash #11 is `MESSAGE_CAP_EXCEEDED` (AD-29 locked — correct code, wrong entitlement bit).
- `openFromInvite` stores `conversation.flash_id` on one build and also hydrates `message.flash_id` + body copy on the other (P3). Quota is not incremented twice (bound).
- Chat photo enqueue creates one job or two (P6). Delivery is still immediate (AD-10 locked).

All cited locked ADs remain satisfied. No likes table. No kids column. No `renew_at`.

### Sketch 2 — “New member, phone OTP, Ban fingerprint, opposite-gender grid”

- Signup: email+pseudonym on `account` (catalog). Phone: Identity-column vs Verification-otp vs credential-phone (P1). OTP SMS has no stored dest on `sms_dispatch` (bound); dest resolution follows whichever phone home they picked.
- Ban later: `fingerprint.hash` inputs come from identity, from a stale OTP row, or from a raw copy trust kept beside `evidence` (P1). `audit_event.payload` still has no phone bytes (bound).
- Profile photo ingest: blur on `blur_key` only vs `derivative` only (P5). Opposite-gender card: thumb present or missing. Clear `md` still requires a live reveal grant (AD-9 locked).
- She grants a viewer. **Grant-per-viewer** with null `photo_id` makes the *next* upload clear to him (P8). **Grant-per-photo** does not. Unmatched grid stays blurred (bound).
- Staff report on a message: `target` is account or message uuid (P7). Strike lands on the sender or on a uuid that is not an account.

All cited locked ADs remain satisfied.

---

## Reviewer note

This review does not propose stack changes, hosting changes, AD-30, a brother-free mode, kids/children columns, a likes table, `hold_queue`, or `message.state` `pending`/`held`. It does not reopen AD-10, AD-11, AD-12, AD-27, AD-28, or AD-29 product rules. Closing a pair means writing a catalog sentence (field / null / type / relationship / Not-stored bullet) that makes one of the two builds *illegal*, not documenting both as options. If P1–P5 are closed in `## 6. Entity catalog`, a re-run of this lens should be able to verdict **pass** without a new AD.
