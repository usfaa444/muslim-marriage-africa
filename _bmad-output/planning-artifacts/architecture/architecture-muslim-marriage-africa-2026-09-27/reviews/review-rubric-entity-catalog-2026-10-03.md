# Rubric-walker review — Architecture Spine (entity catalog)

- **Artifact:** `ARCHITECTURE-SPINE.md` (AD-3 ownership + pointer) and companion `SOLUTION-DESIGN.md` `## 6. Entity catalog` (field tables; this update’s judged surface)
- **Driving constraint:** CATALOG-ONLY. Locked: do not reopen or rewrite AD-10, AD-11, AD-12, AD-27, AD-28, AD-29. Do not propose AD-30. A catalog is not a new AD. Do not invent kids/children columns or a likes table. Do not restore `hold_queue` or `message.state` `pending`/`held`.
- **Altitude:** initiative / build-substrate
- **Reviewed:** 2026-10-03
- **Reviewer:** rubric-walker (good-spine; catalog stored-shape only)
- **Verdict:** **pass-with-residual**

This run judges whether AD-3 plus the new field catalog stop two implementers from inventing incompatible stored shapes for the 53 named entities. It does **not** re-judge product rules.

The catalog landed. All 53 stored entities have an owner and a Field|Type|Null|Meaning table. The four AD-3 names that are not tables are aliased (`profile_field`, `completeness`, `taaruf_stage`, `mahram_permission`). Forbidden inventions are absent (no likes table, no kids entity, no `hold_queue`, `message.state` is `delivered` only). Conversation watch is `mahram_thread_grant`, not `mahram_link`. Residual: Member `phone_e164` has no column on any of the 53, so identity and verification can still dual-home the same fact; `ProfilePort.emergencyHide(…, 24h)` has no expiry column on `profile`; `photo_asset.moderation_state` is untyped against the AD-10 `pending|live|blocked` machine.

---

## Checklist

| Gate | Result | Notes |
| --- | --- | --- |
| Fixes real feature-level stored-shape divergences; misses none | **PASS WITH CAVEAT** | 53 field tables present; grains for `invite_quota`, `message_quota`, `mahram_thread_grant`, `discovery_exclusion` locked; aliases and anti-tables locked. Caveat: Member phone has no home (H1); emergency-hide 24h clock has no column (M1); profile-photo publish-gate enum unlocked (M2). |
| Every AD Rule is enforceable (via catalog shape, not a Rule rewrite) | **PASS WITH CAVEAT** | AD-10/12/27/28/29 stored predicates that this catalog must carry are present (`delivered` only; grant grain + `revoked_at`; quota grains; no likes/kids; no `hold_queue`). Caveat: AD-13 OTP + AD-17 fingerprint/staff-deny/CIL export cannot share one stored phone without inventing a column (H1). Do not rewrite those ADs. |
| Nothing under Deferred could let two units diverge | **PASS** | iOS = same Capacitor project; USSD flag off; vendor SKUs are adapters, not tables; PG 18 and Redis/Valkey stay on host pins; prices stay `operator_config`. No Deferred item reopens a likes table, a kids entity, `hold_queue`, or `mahram_link`-watches-conversation. |
| Named tech is verified-current | **PASS (LOCKED)** | Stack was **not** changed this update. Pins remain the 2026-09-27 table. Do not demand pin bumps. |
| Greenfield is coherent (no brownfield to ratify) | **PASS** | No legacy schema. Farata is evidence, not substrate. |
| Covers the 53 named entities; AD-3 ownership + catalog fields | **PASS WITH CAVEAT** | Count matches (see inventory). Four AD-3 names correctly not-stored. Caveat: H1/M1/M2 are missing or untyped fields on existing entities, not missing tables. |
| Locked ADs not reopened; no AD-30; no kids; no likes; no hold restore | **PASS** | Catalog cites AD-10/12/27/28/29; it does not amend their Rules. No AD-30. `Not stored` forbids likes, kids columns, and `hold_queue`. `message.state` enum is `delivered` only. |
| Conversation watch is grant-scoped, not `mahram_link` | **PASS** | Catalog: `mahram_link` is sister↔mahram, “not a conversation watch.” Spine erDiagram: `CONVERSATION \|\|--o{ MAHRAM_THREAD_GRANT : watched_by`. |
| Every initiative dimension decided, deferred, or open | **PASS** | Catalog-only update. Ops/env envelope and open questions (AD-22) unchanged. |

---

## Inventory — 53 stored entities vs AD-3

AD-3 lists 57 names. Four are not tables and are named under **Not stored**:

| AD-3 name | Catalog fate |
| --- | --- |
| `profile_field` | the `profile` columns; not EAV |
| `completeness` | computed from `profile` columns |
| `taaruf_stage` | `conversation.stage` (`invite\|chat\|meeting\|married`) |
| `mahram_permission` | `mahram_link` + `mahram_thread_grant`; not a table |

The other **53** each have a `###` heading, owner module, field table, and relationships:

`account`, `credential`, `session`, `pin_lock`, `cookie_consent`, `verification_record`, `profile`, `photo_asset`, `derivative`, `reveal_grant`, `signed_grant`, `likeness_grant`, `invite`, `message_flash`, `invite_quota`, `message_quota`, `conversation`, `contact_share`, `message`, `reaction`, `discovery_exclusion`, `favourite`, `profile_visit`, `mahram_invite`, `mahram_link`, `mahram_thread_grant`, `moderation_job`, `flag_queue`, `report`, `moderation_case`, `strike`, `sanction`, `ban`, `appeal`, `block`, `fingerprint`, `marriage_report`, `consent_story`, `marriage_counter`, `pack`, `payment`, `entitlement`, `webhook_receipt`, `article`, `board_member`, `locale_string`, `audio_asset`, `ice_breaker_template`, `operator_config`, `cil_ticket`, `notification`, `sms_dispatch`, `audit_event`.

No named stored entity is missing its field table.

---

## What this catalog-only update gets right

- **AD-3 stays ownership-only.** The spine table does not grow into columns. The pointer names `SOLUTION-DESIGN.md` `## 6. Entity catalog`. That is the right split; a catalog is not AD-30.
- **Grains that prior ADs already locked are copied into columns.** `invite_quota` and `message_quota` are `{ account_id, civil_day_ouaga, sent_count }` with no UUID id and no stored remaining/cap/entitled bit. `mahram_thread_grant` is `{ sister_account_id, mahram_account_id, conversation_id, granted_at, revoked_at }`; active = `revoked_at IS NULL`. `discovery_exclusion` is `{ viewer_id, target_id }` for Pass. `operator_config` stays a `key`/`value` row, not one column per setting; required keys including `sister_reach_mode` and `daily_message_cap` are listed.
- **`mahram_link` does not watch conversations.** Invariant says sister account to mahram account. Watch edge is `mahram_thread_grant.conversation_id`. Spine erDiagram matches. This is **not** a hole.
- **No kids entity; no likes table.** Profile invariant forbids `has_children` / `accepts_partner_with_kids`. `polygamy_intent` is explicitly not a kids column. Pass reuses `discovery_exclusion` and must not overload `favourite`. `sharedTraits` is a DTO, not a table. Do not treat the absence of kids/likes as a gap.
- **Passive Chat shape held.** `message.state` enum is **only** `delivered`. **No** `hold_queue`. `moderation_job` is keyed by `flash_id` \| `message_id` \| `asset_id`. `flag_queue` replaces hold. Bio publish-gate is `bio_live` / `bio_pending`. Chat Voice is `photo_asset.kind=voice_note`, not `content.audio_asset`. Do not restore `pending`/`held`.
- **Quota and pack shapes match AD-27 / AD-29 / AD-14.** No `renew_at`. `payment.ends_at` required. Flash is `message_flash`, not a parallel `message`. Card quick-message is that Flash. `conversation.flash_id` is read-through and must not increment `message_quota`.
- **AD-9 media shape is present.** `photo_asset.kind` `profile_photo\|chat_photo\|voice_note`; `original_key` storage-only; derivatives `xs\|sm\|md\|blur`; `reveal_grant.policy` `on_accept\|on_request\|never`; `signed_grant.expires_at` + `revoked_at`; `likeness_grant` distinct from `cookie_consent`.
- **AD-25 dual-confirm works without extra columns.** `marriage_report` row with `confirmed_at` NULL = first confirmer; `confirmed_at` set = both. `marriage_counter` is a singleton outcomes row. `consent_story` has both `public_ok_*` plus optional `family_ok`.
- **Locked ADs were not rewritten.** Catalog text cites them. No new AD. Stack table untouched.

---

## Findings

Flag only catalog holes: missing field a current AD needs; missing field table; conversation still watched by `mahram_link`; kids entity; likes table. No product-rule rewrites. No AD-30.

### CRITICAL

None. The catalog does not reintroduce `hold_queue`, `message.state` `pending`/`held`, a likes table, a kids entity, or `mahram_link` as the conversation watch. No named entity is missing its field table.

### HIGH

#### H1 — Member `phone_e164` has no column on any of the 53 entities

- **Severity:** high
- **Checklist:** missing field a current AD needs; AD-3 two-writers of one fact
- **Suggest:** **autofix (catalog only)**
- **Where:** `account`; `verification_record`; also read by `fingerprint.hash`, `sms_dispatch` (OTP destination), `cil_ticket` export, AD-13 `sendOtp`/`verifyOtp`, AD-17 staff-never-returns-phone
- **Gap:** `account` stores email, pseudonym, gender, roles, status, `age_attested`. `verification_record` stores `kind` `phone_otp\|liveness\|id_document`, `status`, `vendor`, `evidence_uri`. Neither has the E.164. `mahram_invite.phone` is the A2 invite destination only. `sms_dispatch` intentionally stores no phone. `fingerprint.hash` names `phone_e164` as a hash **input**, not a stored column. FR-001 does not require phone at create; FR-002 / AD-13 still persist a verified Member phone for uniqueness, resend, ban-evasion, SMS, and CIL export.
- **Divergence it fails to prevent:** identity adds `account.phone_e164`; verification adds `verification_record.destination` (or a 54th table not in AD-3); trust reads a third copy to build `fingerprint.hash`. That is two writers of one contact fact — the AD-3 failure the catalog exists to stop.
- **Autofix:** Add `phone_e164 text YES` on **`account`** (identity is the only writer of the unique Member phone after OTP succeeds). Unique when set. `verification_record` may carry the in-flight OTP destination as `destination text YES` for `kind=phone_otp` (attempt, not the unique home). Do not add a phone table. Do not put phone on `sms_dispatch`, `audit_event.payload`, or notifications. Do not rewrite AD-13 / AD-17.

### MEDIUM

#### M1 — `emergencyHide(sisterId, 24h)` has no expiry column on `profile`

- **Severity:** medium
- **Checklist:** missing field a current AD needs (AD-12 / AD-23)
- **Suggest:** **autofix (catalog only)**
- **Where:** `profile.visibility` (“Browse gate including `held` and emergency hide (24h)”)
- **Gap:** AD-23: Mahram emergency-hide calls `ProfilePort.emergencyHide(sisterId, 24h)`; discovery reads `profile.visibility` only. The catalog names the 24h in the meaning of `visibility` and stores no instant. Two profile stories: (1) `visibility=held` plus a BullMQ delay with no column; (2) `visibility_until` / `emergency_hidden_until`; (3) `held` with no auto-unhide. Discovery then disagrees about when the Sister reappears.
- **Divergence:** two stored clocks for the same hide; or no clock and an operator-only unhide the other unit treats as expired.
- **Autofix:** Add `visibility_until timestamptz YES` on `profile`. Null = no timed hold. When set, browse remains gated until that instant. Do not invent a hide table. Do not rewrite AD-12 / AD-23.

#### M2 — `photo_asset.moderation_state` is untyped against the AD-10 publish-gate machine

- **Severity:** medium
- **Checklist:** missing field a current AD needs (enum values AD-10 already named)
- **Suggest:** **autofix (catalog only)**
- **Where:** `photo_asset.moderation_state` (`text YES`); AD-10 state diagram `pending → live | blocked` for `profile_photo` / bio
- **Gap:** Bio already has a locked dual shape (`bio_live` / `bio_pending`). Profile Photo has one text column with no enum. Two media stories: `pending\|live\|blocked` (AD-10 diagram); `unpublished\|published`; `approved\|rejected`; or a boolean. `applyModeration` is legal only for `profile_photo` — the field exists — but the stored values are not a shared shape.
- **Divergence:** discovery “omit unpublished profile photos” matches different predicates; a chat-photo row accidentally gets a second enum the other unit never writes.
- **Autofix:** Type `moderation_state` as enum `pending\|live\|blocked` (YES; null only for `chat_photo` / `voice_note`). Do not add a second photo table. Do not restore a Chat hold state. Do not rewrite AD-10.

### LOW

#### L1 — `message` has no `created_at` while `message_flash` does

- **Severity:** low
- **Checklist:** stored-shape consistency on a named entity
- **Suggest:** **autofix (catalog only)** if touching `message` anyway
- **Where:** `message` field table vs `message_flash.created_at`
- **Gap:** UUID v7 can order Chat. Flash already stores persist time. Two chat stories will add `created_at` vs sort by `id` vs add `delivered_at`. Retention is after `conversation.ended_at` (AD-19), so this is not an AD-required clock — residual only.
- **Autofix:** Add `created_at timestamptz NO` on `message` (persist time). Do not add `pending_at` / `held_at`.

#### L2 — `webhook_receipt` claims N:1 `payment` without a payment FK

- **Severity:** low
- **Checklist:** missing field on a named entity (AD-7 apply-once)
- **Suggest:** **discuss**
- **Where:** `webhook_receipt` fields (`id`, `idempotency_key`, `received_at`, `expires_at`) vs relationship “applies at most one `payment`”
- **Gap:** Apply-once can join `payment.idempotency_key` if the keys are the same, or store `payment_id`. The relationship names a FK the field table does not.
- **Discuss:** Add `payment_id uuid v7 YES` **or** state the join is `idempotency_key` only and drop the N:1 line. Do not add a raw webhook-body table.

#### L3 — Next.js pin vs the spine’s own floor (stack LOCKED — no edit)

- **Severity:** low
- **Checklist:** named tech verified-current
- **Suggest:** **ignore** this run
- **Where:** Stack table `16.3.6`; note “do not scaffold below 16.3.7 after 2026-09-30”
- **Gap:** Internal stale floor from 2026-09-27. This update did not change the stack. Do not demand a pin bump.

---

## Not holes (do not raise)

| Temptation | Why it is not a hole |
| --- | --- |
| Kids / `has_children` / `accepts_partner_with_kids` column or entity | Catalog forbids them. AD-28: omit the trait; do not invent columns. Shared traits are not a table. |
| Likes table | Catalog forbids it. Pass = `discovery_exclusion`. Do not overload `favourite`. |
| Restore `hold_queue` or `message.state` `pending`/`held` | Catalog locks `delivered` only and “there is **no** `hold_queue`.” |
| `mahram_link` still watches conversation | It does not. Watch is `mahram_thread_grant`. |
| Missing field table for a named stored entity | All 53 have one. |
| `profile_field` / `completeness` / `taaruf_stage` / `mahram_permission` as tables | Correctly not-stored aliases. |
| Quartier column | AD-19 / NFR-002: city-level; quartier optional and hidden. City-only satisfies coarse-geo. Demanding `quartier` is a product-field add, not a catalog hole. `city` meaning may mention quartier; that is prose, not a missing AD field. |
| `payment.status` | `ends_at` is required; entitlement is the live pack. |
| Device / push-token table | Not one of the 53. Do not invent a 54th entity. |
| Dual-confirm extra timestamps on `marriage_report` | Row + null `confirmed_at` is a complete shape. |
| AD-10 / AD-11 / AD-12 / AD-27 / AD-28 / AD-29 Rule rewrites | Locked. Catalog cites them. |
| AD-30 | A catalog is not a new AD. |

---

## AD stored-shape coverage (current ADs only)

| AD | Catalog lock | Hole? |
| --- | --- | --- |
| AD-3 ownership + 53 field tables | Owner on every heading; 4 aliases not-stored | no (tables); **H1** is a missing field on owned entities |
| AD-8 `account.gender`, `session.kind`, PIN, roles | columns present | no |
| AD-9 blur / reveal / sign / likeness | `photo_asset`, `derivative`, `reveal_grant`, `signed_grant`, `likeness_grant` | no |
| AD-10 passive Chat + profile publish-gate | `message.state=delivered`; no `hold_queue`; `flag_queue`; `bio_*`; job keys | **M2** photo enum only |
| AD-11 Mooré / Dioula | no extra table; `flag_threshold` on `operator_config` | no |
| AD-12 grant grain + `revoked_at`; link ≠ watch | `mahram_thread_grant` + `mahram_link` invariants | no (watch); **M1** hide clock |
| AD-13 OTP / liveness / ID / `visibility=held` | `verification_record.kind`; `profile.visibility` | **H1** phone |
| AD-14 / AD-21 / AD-27 / AD-29 packs + quotas | pack days; no `renew_at`; both quota grains; config keys | no |
| AD-15 no `message.pending` event | state enum `delivered` only | no |
| AD-16 derivatives + SMS/push = template + ids | `derivative.size`; `notification` / `sms_dispatch` have no phone/body | no (strengthens H1) |
| AD-17 contact-share + fingerprint + no staff phone | `contact_share`; `fingerprint.hash`; `cil_ticket` | **H1** phone home |
| AD-18 hash-chain audit | `prev_hash`, `hash`; payload hygiene | no |
| AD-19 coarse geo + CIL | `city`; `madhhab`/`practice`; `cil_ticket` | no (quartier not demanded) |
| AD-23 `openFromInvite` / Flash read-through / hide | `conversation.invite_id`, `flash_id`; hide → M1 | **M1** |
| AD-25 dual-confirm | `confirmed_at` null-then-set; counter singleton | no |
| AD-26 marital honesty | `marital_status`, `polygamy_intent` | no |
| AD-28 card / Pass / no new kids / no likes | `discovery_exclusion`; profile invariant | no |

---

## Deferred that can still fork stored shapes

| Deferred item | Safe? | Why |
| --- | --- | --- |
| Native iOS + Apple Sign-In | yes | `credential.kind` already includes `apple`; same Capacitor project |
| USSD enabled | yes | Port exists, flag off; no USSD table |
| KYC / SMS / moderation / aggregator SKUs | yes | `vendor` text on verification/job; one live adapter per port |
| Redis vs Valkey / PG 18 | yes | Host pins; not schema |
| Dual-control unblur / watermark / multi-region / name / A-V / EN-AR | yes | No new MVP entity |
| Exact Premium XOF prices and free-review hours | yes | `operator_config` |

Nothing under Deferred reintroduces a likes table, a kids entity, `hold_queue`, or `mahram_link` as a conversation watch.

---

## Version check (named tech) — stack LOCKED

This walker does **not** treat the stack table as a required edit. Claim remains verified 2026-09-27.

| Name | Spine | Status |
| --- | --- | --- |
| Next.js | 16.3.6 | stale vs own floor (L3) — **ignore** |
| All other pins | as table | locked |

---

## Locked-item audit (this run)

| Locked item | Reopened? | Evidence |
| --- | --- | --- |
| AD-10 passive Chat | no | Catalog `delivered` only; no `hold_queue`; no pending/held |
| AD-11 Mooré / Dioula honesty | no | No ASR-coverage table; low-confidence stays flag / `scan-deferred` |
| AD-12 grant-scoped Mahram | no | Grant grain + `revoked_at`; link is not a watch |
| AD-27 Sister reach | no | `sister_reach_mode` on `operator_config`; `invite_quota` grain |
| AD-28 card / no kids / no likes | no | `discovery_exclusion`; kids/likes in **Not stored** |
| AD-29 message cap | no | `message_quota` grain; `daily_message_cap` listed |
| AD-30 | no | None proposed |
| Kids columns / likes table | no | Explicitly forbidden |
| `hold_queue` / `message.state` pending/held | no | Explicitly absent / enum `delivered` |

---

## Suggested resolution order

1. **Autofix H1** — `account.phone_e164` (unique when set); optional `verification_record.destination` for in-flight OTP only. Identity is the unique home.
2. **Autofix M1** — `profile.visibility_until` for the 24h emergency hide.
3. **Autofix M2** — `photo_asset.moderation_state` enum `pending\|live\|blocked`.
4. **Autofix L1** only if editing `message` anyway.
5. **Discuss L2** only if billing webhook apply ships in the same slice.
6. **Ignore L3** (stack locked).

Do not add a likes table. Do not add kids/children columns. Do not restore `hold_queue` or `message.state` `pending`/`held`. Do not point conversation watch at `mahram_link`. Do not rewrite AD-10, AD-11, AD-12, AD-27, AD-28, AD-29. Do not propose AD-30.

---

## Verdict rationale

**pass-with-residual**, not fail: the catalog-only update did the job it was opened for. All 53 stored entities have owner + field tables. The four AD-3 aliases are not tables. Conversation watch is `mahram_thread_grant`. Kids, likes, and `hold_queue` are forbidden. `message.state` stayed `delivered`. Locked ADs were not reopened. No AD-30.

**pass-with-residual**, not pass: Member phone — a fact AD-13, AD-16, AD-17, and AD-19 all read — has no column, so identity and verification can still invent incompatible homes (H1). The AD-12/AD-23 24h hide clock and the AD-10 profile-photo publish-gate enum are named in prose and not typed as columns (M1, M2). Those are catalog holes, not product-rule gaps.
