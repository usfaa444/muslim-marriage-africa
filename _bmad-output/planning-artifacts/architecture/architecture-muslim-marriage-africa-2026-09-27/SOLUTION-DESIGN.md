---
title: AnKanu — solution design
status: final
created: 2026-09-27
updated: 2026-10-03
audience: future build team + legal/CIL reviewer
spine: ARCHITECTURE-SPINE.md
open_questions:
  - polygamy-disclosure-ux
  - ussd-sms-cost
  - imam-names-academie-sla
  - free-review-sla-hours
  - anonymous-mode-d36
  - brother-clear-photo-preaccept
  - gif-sticker-pack
  - oapi-wipo-handles
  - later-country-payment-rails
  - nfr-008-retention-clocks
---

# Solution design — AnKanu

Companion to `ARCHITECTURE-SPINE.md`. The spine is the consistency contract (invariants only). This document is the human-facing solution design: purpose, hosting justification, data and API shape, honest moderation limits, and full FR/NFR traceability.

Product name **AnKanu** (locked 2026-10-03, Maitchibi Fayçal via Harris). Domain **ankanu.com** purchased on Hostinger. Repository slug `muslim-marriage-africa` is not the product name. Nisfuddin, Nikahsira, Sakinaa, Mithaqun, Nonglem, and `nisfdin` are history of the search that was not chosen — those domains were not purchased. OAPI/WIPO for AnKanu is not recorded as completed.

## 1. Purpose and audience

| Who | What they need from this pair of docs |
| --- | --- |
| Future build team | A named paradigm, module ownership, ports, stack pins, and a map from every FR/NFR to a governing AD so two feature teams cannot invent a second photo-URL scheme or a second payment state machine |
| Legal / CIL reviewer | A3 kept as written; an explicit hosting pick tagged `[ASSUMPTION — legal review]`; verified statute citation (Loi n°001-2021/AN); public French disclosure text; what is *not* claimed about Mooré/Dioula ASR |

This is not UX, not epics, not a vendor contract.

## 2. Inherited product decisions (not re-opened)

From the 2026-09-27 PRD and brief, inherited silently, then **corrected 2026-10-01** for Chat moderation:

- Burkina-first honorable ta'aruf. French-first UI. Mooré/Dioula **audio**.
- Chat text, Chat Photos, Voice notes, and Message Flash are delivered immediately, then passively scanned (FR-062–FR-068, FR-144, NFR-003). Profile Photos and bio stay publish-gated (FR-065).
- Sister-initiated optional Mahram. Dual-confirm marriage. Honest counter starting at 0.
- Web + installable PWA + store-listed Android in MVP. Native iOS is NEXT, not dropped.
- Freemium XOF. Safety and Sister dignity never paywalled. 1/3/6-month packs. No silent auto-renew.
- Sister Invite reach is operator-configurable on day one: `sister_reach_mode` `free_unlimited` (DEFAULT) | `same_quota_as_brothers` (FR-044, FR-045, FR-105, FR-145). Brothers always stay on the paid quota. Locked 2026-10-02.
- Free-tier messages are daily-capped for both genders, including a Sister in `free_unlimited` (FR-146). Premium = unlimited Invites **and** unlimited messages. No Premium Invite cap of 15. Sisters can buy the same 1/3/6 packs in **both** reach modes. Locked 2026-10-02.
- People lists default to one focused card; grid is optional via toggle (FR-024, FR-025). After OTP + Sister confirm, the Mahram grant list is empty; she grants individual Brother threads (FR-074, FR-076, FR-077). Locked 2026-10-02.
- Farata statements use only **Offered (seen)** / **Claimed (marketing)** / **Not publicly evidenced**.

### A1 — Minimum age 19+ `[ASSUMPTION]` — legal review

Kept verbatim from the brief/PRD: minimum age is **19+** (Farata Mentions légales Claimed (marketing) 19+). Flag for legal review of Burkina civil majority / marriage-age law and store ratings. If counsel requires 18+, the PRD will add extra protections for 18–21 rather than silently lowering the gate. Bound on the spine as AD-8 (`min_age` default 19).

### A2 — Wali / Mahram verification in MVP `[ASSUMPTION]` — legal review

Kept verbatim:

1. Sister invites her mahram **by phone number**.
2. Mahram verifies via **phone OTP** and **declares the relationship** (father / brother / uncle / other mahram).
3. Sister **confirms**.
4. Optional ID check earns a **“verified wali”** badge.
5. **No document proof of kinship in MVP**.
6. Sister can **remove/report** the wali (D38). Wali **cannot send messages as her**.

### A3 — Data residency and CIL `[ASSUMPTION]` — legal review

Kept verbatim: hosting-location **decision is deferred to architecture**. The product **must** comply with Burkina Faso’s data-protection authority (**CIL — Commission de l’Informatique et des Libertés**) and **must publicly disclose the hosting location**.

The pick below is **AD-5**, not a rewrite of A3.

## 3. Paradigm and module boundaries

Hexagonal modular monolith (AD-1, AD-2). One API product: `api` + `worker` from the same image, plus in-region `web`. Each row in the spine ownership table is the **only writer** of that entity (AD-3).

Dependency direction: clients → inbound adapters → application → domain; outbound vendor I/O only in adapters. Billing cannot sit on the path of identity, verification, media, moderation, mahram attach, report, block, browse, or Invite accept (AD-21). A Free-tier Chat / Flash / card quick-message send may call `BillingPort.isEntitled` only to decide the FR-146 cap (AD-29). Sister invite send may call `BillingPort` only when `sister_reach_mode` is `same_quota_as_brothers` (AD-27). Sister checkout may call `BillingPort` in both reach modes (AD-14).

## 4. Stack (verified 2026-09-27)

See spine `## Stack`. Pins came from `registry.npmjs.org/*/latest`, `endoflife.date/api/{nodejs,nextjs,postgresql,redis}.json`, Next.js security posts (16.3.6; planned 16.3.7 on 2026-09-30), React 19.3 blog (2026-09-09), Scaleway product pages, and Whisper `tokenizer.py`.

**Not pinned:** Prisma (npm `latest` was `8.0.0-rc.17`). Drizzle 0.45.3 is the ORM.

**Client approach (AD-4):** one shared Next.js UI. Capacitor 8.5.2 wraps it for Play. Rejected alternatives:

| Approach | Why not primary |
| --- | --- |
| PWA + TWA | No `FLAG_SECURE`; weaker FCM and camera/mic on low-end WebView |
| React Native / Expo | Second UI; web/PWA would drift |
| Flutter | Second UI; iOS later would fork further |

iOS is the same Capacitor project later (FR-135). Web and PWA stay first-class without the native shell.

## 5. Data residency (A3 + AD-5)

`[ASSUMPTION — legal review]`

### 5.1 What exists (verified)

| Option | What exists | Latency from Ouagadougou | Managed PG / Redis / S3 | CIL posture |
| --- | --- | --- | --- | --- |
| In-country BF | Virtix Data Center (Ouaga 2000, Tier III, commercial colo). Government mini-DCs (Jan 2026) are **public-admin only**. No AWS/GCP/Azure region in BF | Lowest | Self-operate | No transfer if all personal data stays in BF |
| Nearby West Africa | Lagos colo (Equinix/MainOne, Open Access, Africloud). Africloud claims ~12 ms Ouaga. **No hyperscaler region** in West Africa (Lagos still “study”, 2027–28 commentary) | Low if fibre holds | Uneven; not a full managed trio | Still a **foreign transfer** (Nigeria) |
| EU France / Paris | Scaleway `fr-par` (Kapsule, managed PG, Redis, Object Storage). AWS `eu-west-3` Paris. OVH France | ~100 ms-class (typical Ouaga→Paris) | Yes | Transfer under Loi 001-2021/AN arts 42–44; FR-language contracts help counsel — they are not automatic art. 42 adequacy |
| South Africa | AWS `af-south-1` Cape Town; Azure and GCP Johannesburg | Higher than Paris for many Sahel routes | Yes | Transfer; weaker French legal/ops fit |

Loi **n°001-2021/AN** (Assemblée nationale) is the statute. Law Lab Africa (verified against the 2021 text, 2026-07-11): arts 42–44 require adequate protection, **prior CIL authorisation** before a foreign transfer, confidentiality and reversibility clauses, and encryption; art. 44 lists derogations. This document does not invent further articles.

Farata’s public DPA lists Vercel (USA) and Neon (USA) as processors — Offered (seen) (legal text). CIL mention is Not publicly evidenced (competitor gap 9). Do not copy that silence.

### 5.2 Pick

**Primary: Scaleway Paris (`fr-par`), France.**

Justify: managed services the launch team can actually run; French contracts (a counsel fact pattern, not “CIL-compliant because GDPR”); Object Storage is S3-compatible (AD-6); cost below a three-AZ AWS start; latency acceptable for REST/chat vs Cape Town. Containers + standard Postgres + S3-compatible storage remain movable to Virtix (or a future BF commercial cloud) if CIL requires in-country residency. Host engines today: managed PG **17.11**, managed Redis **8.6.3**.

**Public disclosure (FR, required):** « Données hébergées en région Île-de-France (France), prestataire Scaleway ». Operators cannot hide this (FR-120).

**Launch gate:** CIL transfer authorisation + DPA + encryption evidence **before** public traffic. Tagged `[ASSUMPTION — legal review]`.

### 5.3 Filing inventory (inputs for counsel — not a CIL filing)

Do not invent further articles. Do not claim GDPR = art. 42 adequacy.

| Fact for the filing | Why it is in scope |
| --- | --- |
| Controller | The Burkina operating company (product AnKanu; legal entity name still counsel) |
| Hosting processor | Scaleway `fr-par` (France) — AD-5 |
| Other destinataires / sous-traitants | SMS gateway, KYC/liveness vendor, moderation/ASR vendor, mobile-money aggregator, FCM, Web Push relay, Google OIDC, captcha vendor — each may be outside BF. Adapter SKUs stay unbound (AD-5 not reopened) |
| Categories | Account/contact; profile (including `madhhab`/`practice` — religious, art. 12 express consent); photos; chat; liveness + ID images (biometric-class + foreign transfer, art. 31); model scores on every outbound Chat item (art. 31 AI/profiling bullet — counsel decides); payments |
| Transfers | France (host) plus each vendor’s country; list them on the privacy page, not only Scaleway |

## 6. Entity catalog

This is the implementation catalog. Spine AD-3 is ownership only. Shared traits on the card are computed from existing profile columns; they are not a table.

**Not stored:** likes; kids/children/`has_children`/`accepts_partner_with_kids` columns; `hold_queue`; `sharedTraits` DTO; completeness (computed from profile columns); `taaruf_stage` (it is `conversation.stage`, not a table); `profile_field` (the profile columns, not an EAV table); `mahram_permission` (AD-3 name — the permission is `mahram_link` + `mahram_thread_grant`, not a table).

IDs are UUID v7 from `packages/kernel` unless a natural key is specified (`operator_config.key`; `invite_quota` and `message_quota` grain). NFR-008 clocks stay `[ASSUMPTION]`.

### account

Owner module: identity

| Field | Type | Null | Meaning |
| --- | --- | --- | --- |
| id | uuid v7 | NO | Primary key |
| email | text | NO | Unique. Unused email required to create (FR-001) |
| pseudonym | text | NO | Unique. Unused pseudonym required to create (FR-001) |
| gender | enum `sister\|brother` | NO | Immutable after first set without operator+audit. Roles are not gender |
| roles | text[] | NO | `member\|mahram\|moderator\|operator\|system`. Not gender |
| status | text | NO | Active / deactivated / held. No public listing until verification+review (`profile.visibility` is the browse gate) |
| age_attested | boolean | NO | Product age gate is 19+ (`operator_config.min_age` defaults to 19) |

- credential 1:N account via `credential.account_id`
- session N:1 account via `session.account_id`
- pin_lock 1:1 account via `pin_lock.account_id`
- cookie_consent N:1 account via `cookie_consent.account_id`
- profile 1:1 account via `profile.account_id`
- verification_record N:1 account via `verification_record.account_id`

Invariants: Identity is the only writer of `account.gender`. Ban, password change, and Mahram remove call `IdentityPort.revokeSessions`. Password hash lives on `credential`; PIN hash lives on `pin_lock`.

### credential

Owner module: identity

| Field | Type | Null | Meaning |
| --- | --- | --- | --- |
| id | uuid v7 | NO | Primary key |
| account_id | uuid v7 | NO | Owning account |
| kind | enum `password\|google_oidc\|apple` | NO | Google OIDC is additional, never the only path. Apple with iOS |
| secret_hash | text | YES | argon2id password hash. Null for OIDC |
| provider_subject | text | YES | OIDC subject when `kind` is not password |
| email_verified_at | timestamptz | YES | FR-006 email verification. Null until the link succeeds |

- credential N:1 account via `credential.account_id`

Invariants: argon2id passwords. Password change revokes other sessions.

### session

Owner module: identity

| Field | Type | Null | Meaning |
| --- | --- | --- | --- |
| id | uuid v7 | NO | Primary key |
| account_id | uuid v7 | NO | Session owner |
| kind | enum `web\|capacitor\|mahram\|staff` | NO | Staff MFA. No member+staff on one session. `kind=mahram` must not hit browse / invite / chat write |
| expires_at | timestamptz | NO | Session expiry |
| last_seen_at | timestamptz | NO | PIN idle clock. Idle-timeout 15 min (NFR-001 working number) |

- session N:1 account via `session.account_id`

Invariants: Web/PWA uses httpOnly session cookie; Capacitor uses Bearer. `AuthContext.gender` is required on `member` sessions.

### pin_lock

Owner module: identity

| Field | Type | Null | Meaning |
| --- | --- | --- | --- |
| id | uuid v7 | NO | Primary key |
| account_id | uuid v7 | NO | Unique per account. Shared-device PIN (FR-020) |
| pin_hash | text | NO | argon2id PIN. Not stored on `account` |

- pin_lock 1:1 account via `pin_lock.account_id`
- pin_lock idle is enforced against `session.last_seen_at` (15 min, NFR-001 working number)

### cookie_consent

Owner module: identity

| Field | Type | Null | Meaning |
| --- | --- | --- | --- |
| id | uuid v7 | NO | Primary key |
| account_id | uuid v7 | NO | Consenting account |
| granted_at | timestamptz | NO | When cookie categories were recorded |
| categories | text | NO | Cookie categories only |

- cookie_consent N:1 account via `cookie_consent.account_id`

Invariants: Cookie consent is not a `likeness_grant` and never grants photo reuse (AD-9, AD-19).

### verification_record

Owner module: verification

| Field | Type | Null | Meaning |
| --- | --- | --- | --- |
| id | uuid v7 | NO | Primary key |
| account_id | uuid v7 | NO | Subject account |
| kind | enum `phone_otp\|liveness\|id_document` | NO | Independent of entitlement |
| status | text | NO | Granted / pending / rejected / held |
| vendor | text | YES | Adapter SKU. Domain does not hard-wire vendors |
| evidence_uri | text | YES | Encrypted ID-image / liveness evidence. Not a public URL |
| phone_e164 | text | YES | Member phone for `kind=phone_otp` only (FR-002). This is the only Member `phone_e164` column. Staff list/browse/metrics never return it. `fingerprint.hash` hashes it and does not store plaintext |

- verification_record N:1 account via `verification_record.account_id`

Invariants: Verification is free. Liveness is matched to Profile Photos. Suspected-minor hold: verification writes the hold; profiles applies `visibility=held`. ID badge is not marital-status proof (AD-26). Notifications/SMS resolve Member phone through `VerificationPort`, not a second phone column on `account` or `credential`.

### profile

Owner module: profiles

| Field | Type | Null | Meaning |
| --- | --- | --- | --- |
| account_id | uuid v7 | NO | Primary key. 1:1 with account |
| dob | date | NO | FR-021 age/DOB. Age gate 19+ (`min_age` 19) |
| city | text | NO | FR-021. Coarse geo; quartier hidden until accepted Invite |
| country | text | NO | FR-021 city/country |
| origin | text | YES | FR-021 origin |
| marital_status | text | YES | FR-021 / AD-26. Required on the Invite decision surface before Sister accept |
| polygamy_intent | text | YES | Required when brother is `married` (AD-26). Not a kids column |
| education | text | YES | FR-021 |
| profession | text | YES | FR-021 |
| madhhab | text | YES | FR-022. Religious; art. 12 express consent |
| practice | text | YES | FR-021 / FR-022. Religious; art. 12 express consent |
| life_plans | text | YES | Intentions (FR-021 / FR-022). Filterable as life plans (FR-024) |
| bio_live | text | YES | Public description only after allow (FR-065) |
| bio_pending | text | YES | Unpublished until reviewed. Previous live bio stays if pending is blocked |
| visibility | enum `unpublished\|public\|held\|emergency_hidden` | NO | Browse gate. `held` = suspected-minor (AD-13). `emergency_hidden` = `ProfilePort.emergencyHide` (24h). Unhide must not lift `held`. Clock is the hide command, not a new FR-021 column |

- profile 1:1 account via `profile.account_id`
- photo_asset N:1 profile owner via `photo_asset.owner_id` (kind `profile_photo`)

Invariants: Bio swaps only on allow. **No** kids / children / `has_children` / `accepts_partner_with_kids` column. Shared traits on the card are computed from these columns; they are not a table (AD-28). Completeness is computed from these columns (FR-023). Confrérie and hijra stay NEXT (FR-029).

### photo_asset

Owner module: media

| Field | Type | Null | Meaning |
| --- | --- | --- | --- |
| id | uuid v7 | NO | Primary key |
| owner_id | uuid v7 | NO | Owning account |
| kind | enum `profile_photo\|chat_photo\|voice_note` | NO | Chat Voice is not `content.audio_asset` |
| original_key | text | NO | Storage-only. Serializers never emit it |
| blur_key | text | YES | Ingest default opposite-gender object. Same object as `derivative` where `size=blur` — not a second blur |
| moderation_state | enum `pending\|live\|blocked` | YES | Profile Photo / bio publish-gate only (AD-10). Null / unused for `chat_photo` and `voice_note` |

- photo_asset N:1 account via `photo_asset.owner_id`
- derivative N:1 photo_asset via `derivative.photo_asset_id`
- reveal_grant N:1 photo_asset via `reveal_grant.photo_id`
- signed_grant N:1 photo_asset via `signed_grant.photo_asset_id`
- message N:1 photo_asset via `message.media_id` when kind is photo/voice

Invariants: `chat_photo` / `voice_note` sign without waiting on review. Discovery omits unpublished profile photos.

### derivative

Owner module: media

| Field | Type | Null | Meaning |
| --- | --- | --- | --- |
| id | uuid v7 | NO | Primary key |
| photo_asset_id | uuid v7 | NO | Parent asset |
| size | enum `xs\|sm\|md\|blur` | NO | Lite derivatives (AD-16) |
| object_key | text | NO | Private bucket key. When `size=blur`, this is `photo_asset.blur_key` |

- derivative N:1 photo_asset via `derivative.photo_asset_id`

Invariants: List/grid/push thumbs are blur derivatives only. Clear `md` requires a live reveal grant. Media is the only writer of both `blur_key` and this row.

### reveal_grant

Owner module: media

| Field | Type | Null | Meaning |
| --- | --- | --- | --- |
| id | uuid v7 | NO | Primary key |
| photo_id | uuid v7 | YES | Per-photo grant when set |
| owner_id | uuid v7 | NO | Photo owner |
| viewer_id | uuid v7 | NO | Per-viewer. No unmatched clear-face on the grid |
| policy | enum `on_accept\|on_request\|never` | NO | Owner-chosen |
| revoked_at | timestamptz | YES | Gateway + denylist stop **serving** clear bytes ≤60s |

- reveal_grant N:1 photo_asset via `reveal_grant.photo_id`
- reveal_grant N:1 account (owner) via `reveal_grant.owner_id`
- reveal_grant N:1 account (viewer) via `reveal_grant.viewer_id`

Invariants: `MediaPort.sign` refuses `original` and clear `md` unless a live grant exists for that viewer.

### signed_grant

Owner module: media

| Field | Type | Null | Meaning |
| --- | --- | --- | --- |
| id | uuid v7 | NO | Primary key |
| photo_asset_id | uuid v7 | NO | Asset being signed |
| viewer_id | uuid v7 | NO | Capability is per viewer |
| derivative | text | NO | Size signed. Not a raw bucket pre-sign |
| expires_at | timestamptz | NO | `signed_url_ttl_seconds` capped at 60 |
| revoked_at | timestamptz | YES | Gateway re-checks grant + denylist on every GET |

- signed_grant N:1 photo_asset via `signed_grant.photo_asset_id`
- signed_grant N:1 account via `signed_grant.viewer_id`

Invariants: Only `MediaPort.sign` may mint a URL. Token is to the media GET gateway.

### likeness_grant

Owner module: media

| Field | Type | Null | Meaning |
| --- | --- | --- | --- |
| id | uuid v7 | NO | Primary key |
| owner_id | uuid v7 | NO | Likeness owner |
| campaign_id | text | NO | Per-use marketing/social reuse |
| expires_at | timestamptz | NO | Expires with the campaign |

- likeness_grant N:1 account via `likeness_grant.owner_id`

Invariants: Cookie consent is not this grant.

### invite

Owner module: invites

| Field | Type | Null | Meaning |
| --- | --- | --- | --- |
| id | uuid v7 | NO | Primary key |
| from_id | uuid v7 | NO | Sender account |
| to_id | uuid v7 | NO | Recipient account |
| flash_id | uuid v7 | YES | Optional Message Flash. Not a `message` row |
| state | text | NO | Pending / accepted / declined. No resend after refuse |
| sister_accepted_at | timestamptz | YES | Chat exists only after Sister accept (or she sent) |

- invite N:1 account (sender) via `invite.from_id`
- invite N:1 account (recipient) via `invite.to_id`
- invite 0..1:1 message_flash via `invite.flash_id`
- conversation 0..1:1 invite via `conversation.invite_id`

Invariants: Brother daily Invite quota from config (working **3** Free `[ASSUMPTION]`; Premium = unlimited Invites — no cap of 15). Sister Invite quota follows AD-27 (`sister_reach_mode`). Flash is delivered immediately (AD-10) and counts against FR-146. Invite + Flash is one command: over-cap persists neither.

### message_flash

Owner module: invites

| Field | Type | Null | Meaning |
| --- | --- | --- | --- |
| id | uuid v7 | NO | Primary key |
| author_id | uuid v7 | NO | Counted sender for FR-146 |
| body | jsonb | NO | Ciphertext envelope `{v, alg, kid, iv, ct}`. Visible before accept |
| created_at | timestamptz | NO | Persist time |

- message_flash 1:0..1 invite via `invite.flash_id`
- moderation_job 0..1:1 message_flash via `moderation_job.flash_id`

Invariants: Not copied into a parallel `message` row. Card quick-message **is** Message Flash (AD-23, AD-28). After `ChatPort.openFromInvite`, Chat may store `flash_id` as a read-through and must not increment `message_quota`. Phone / WhatsApp / links in Flash are refused (`CONTACT_SHARE_REQUIRED`).

### invite_quota

Owner module: invites

| Field | Type | Null | Meaning |
| --- | --- | --- | --- |
| account_id | uuid v7 | NO | Grain PK with `civil_day_ouaga`. No UUID id |
| civil_day_ouaga | date | NO | Grain PK. Civil day `Africa/Ouagadougou`, not UTC |
| sent_count | int | NO | Increment only on successful send persist. Never on accept. No refund on decline |

- invite_quota N:1 account via `invite_quota.account_id`

Invariants: Written only by invites when the sender is Invite-quota-capped (Brothers always; Sisters iff `same_quota_as_brothers`). Billing never writes this row. Cap computed live from `operator_config` + `BillingPort.isEntitled`. Not the message cap. Free brother Invite cap **3** `[ASSUMPTION]`.

### message_quota

Owner module: chat

| Field | Type | Null | Meaning |
| --- | --- | --- | --- |
| account_id | uuid v7 | NO | Grain PK with `civil_day_ouaga`. No UUID id |
| civil_day_ouaga | date | NO | Grain PK. Civil day `Africa/Ouagadougou` |
| sent_count | int | NO | Increment only on successful persist of a counted kind when the sender is **not** entitled |

- message_quota N:1 account via `message_quota.account_id`

Invariants: Chat is the only writer. Counts chat text, chat photo, voice note, message flash (card quick-message is that Flash — once). Invites Flash call `ChatPort.consumeMessageQuota` before persist; `openFromInvite` must not increment. Live `isEntitled` + live `daily_message_cap` every persist. Cap change: `sent_count` stays; remaining = `max(0, new_cap − sent_count)`. Over-cap is not stored. Seed cap **10** `[ASSUMPTION — admin-configurable, not a product lock]`.

### conversation

Owner module: chat

| Field | Type | Null | Meaning |
| --- | --- | --- | --- |
| id | uuid v7 | NO | Primary key |
| invite_id | uuid v7 | NO | Inserted only by `ChatPort.openFromInvite` |
| stage | enum `invite\|chat\|meeting\|married` | NO | This **is** taaruf_stage. Not a table |
| paused_by | uuid v7 | YES | Mahram / Sister / Moderator pause. Brother cannot resume |
| ended_at | timestamptz | YES | Ended is terminal. End does **not** revoke a grant |
| flash_id | uuid v7 | YES | Sole Flash read-through after `openFromInvite`. Must not increment `message_quota`. Not stored on `message` |

- conversation N:1 invite via `conversation.invite_id`
- message N:1 conversation via `message.conversation_id`
- contact_share 0..1:1 conversation via `contact_share.conversation_id`
- mahram_thread_grant N:1 conversation via `mahram_thread_grant.conversation_id`
- marriage_report 0..1:1 conversation via `marriage_report.conversation_id`

Invariants: Mahram must not INSERT. New conversation does **not** insert or inherit a grant. Decline creates no conversation.

### contact_share

Owner module: chat

| Field | Type | Null | Meaning |
| --- | --- | --- | --- |
| conversation_id | uuid v7 | NO | Primary key |
| opened_at | timestamptz | YES | When both have opted in |
| opened_by_a | timestamptz | YES | First member opt-in |
| opened_by_b | timestamptz | YES | Second member opt-in |

- contact_share 1:1 conversation via `contact_share.conversation_id`

Invariants: Both members must opt in. Only chat writes. Moderation/trust call `ChatPort.contactShareOpen`. `taaruf_stage` must not encode contact-share. Matcher is local deterministic — must not call `ModerationPort`.

### message

Owner module: chat

| Field | Type | Null | Meaning |
| --- | --- | --- | --- |
| id | uuid v7 | NO | Primary key |
| conversation_id | uuid v7 | NO | Must exist. Chat refuses messages without this FK |
| sender_id | uuid v7 | NO | Member sender. Never a Mahram impersonating the Sister |
| kind | enum `text\|photo\|voice` | NO | Counted kinds for FR-146 |
| state | enum `delivered` | NO | **Only** `delivered`. No `pending` / `held` |
| body | jsonb | NO | Ciphertext envelope `{v, alg, kid, iv, ct}`. Not plaintext |
| media_id | uuid v7 | YES | Chat photo or voice note asset |

- message N:1 conversation via `message.conversation_id`
- message N:1 account via `message.sender_id`
- message 0..1:1 photo_asset via `message.media_id`
- reaction N:1 message via `reaction.message_id`
- moderation_job 0..1:1 message via `moderation_job.message_id`

Invariants: Created `delivered` only after the FR-146 cap allows the send. Over-cap is not stored. Mahram reads delivered only on an active grant. Later flag does not unsend. Moderation never writes `message.state`.

### reaction

Owner module: chat

| Field | Type | Null | Meaning |
| --- | --- | --- | --- |
| id | uuid v7 | NO | Primary key |
| message_id | uuid v7 | NO | Reacted message |
| account_id | uuid v7 | NO | Member who reacted |
| emoji | text | NO | Visible to the other party (FR-050) |

- reaction N:1 message via `reaction.message_id`
- reaction N:1 account via `reaction.account_id`

Invariants: Mahram cannot write reactions.

### discovery_exclusion

Owner module: discovery

| Field | Type | Null | Meaning |
| --- | --- | --- | --- |
| viewer_id | uuid v7 | NO | Grain PK with `target_id`. Viewer-scoped pass (AD-28) |
| target_id | uuid v7 | NO | Grain PK. Dismissed profile account |
| created_at | timestamptz | NO | When this viewer passed this card |

- discovery_exclusion N:1 account (viewer) via `discovery_exclusion.viewer_id`
- discovery_exclusion N:1 account (target) via `discovery_exclusion.target_id`

Invariants: Pass is a dismiss of this card for this viewer, not a like and not a public counter. Not `favourite`. Do not invent a likes table. Reuse an existing row if one exists.

### favourite

Owner module: discovery

| Field | Type | Null | Meaning |
| --- | --- | --- | --- |
| account_id | uuid v7 | NO | Grain PK with `target_id`. Private list owner |
| target_id | uuid v7 | NO | Grain PK. Favourited profile |
| created_at | timestamptz | NO | When saved |

- favourite N:1 account (owner) via `favourite.account_id`
- favourite N:1 account (target) via `favourite.target_id`

Invariants: Private in MVP. Do not overload this row as a pass. `who_favourited_me` stays off until NEXT.

### profile_visit

Owner module: discovery

| Field | Type | Null | Meaning |
| --- | --- | --- | --- |
| account_id | uuid v7 | NO | Viewer |
| target_id | uuid v7 | NO | Viewed profile |
| created_at | timestamptz | NO | Visit time. T&S reads remain on |

- profile_visit N:1 account (viewer) via `profile_visit.account_id`
- profile_visit N:1 account (target) via `profile_visit.target_id`

Invariants: Member-facing visitors list stays off (`visitors_list` flag). Not a like.

### mahram_invite

Owner module: mahram

| Field | Type | Null | Meaning |
| --- | --- | --- | --- |
| id | uuid v7 | NO | Primary key |
| sister_id | uuid v7 | NO | Sister-initiated only |
| phone | text | NO | Invite by phone number (A2). Staff list/browse never returns phone |
| relationship | enum `father\|brother\|uncle\|other_mahram` | YES | Declared at OTP. Unmatched-friend rejected |
| expires_at | timestamptz | NO | Pending invite expiry 7 days `[ASSUMPTION]` |
| confirmed_at | timestamptz | YES | Sister confirm. After confirm the grant list is empty |

- mahram_invite N:1 account (sister) via `mahram_invite.sister_id`
- mahram_link 0..1:1 mahram_invite (confirm creates the link)

Invariants: No kinship documents in MVP. Cooling-off 1 hour after OTP before pause/end (A2 working number).

### mahram_link

Owner module: mahram

| Field | Type | Null | Meaning |
| --- | --- | --- | --- |
| id | uuid v7 | NO | Primary key |
| sister_id | uuid v7 | NO | Ward Sister. One confirmed guardian set per sister in MVP |
| mahram_account_id | uuid v7 | NO | Guardian account after OTP |
| relationship | enum `father\|brother\|uncle\|other_mahram` | NO | Same enum as invite |
| confirmed_at | timestamptz | NO | After OTP + Sister confirm |
| verified_badge | boolean | NO | Optional ID → verified wali. Not marital-status proof |
| removed_at | timestamptz | YES | Sister remove/report. Revokes every active grant in the same unit of work |
| cooling_off_until | timestamptz | YES | 1 hour after OTP (A2 working number) |
| mahram_invite_id | uuid v7 | YES | Confirm creates the link from this invite |

- mahram_link N:1 account (sister) via `mahram_link.sister_id`
- mahram_link N:1 account (mahram) via `mahram_link.mahram_account_id`
- mahram_link 0..1:1 mahram_invite via `mahram_link.mahram_invite_id`
- mahram_thread_grant N:1 mahram_link via the same `sister_account_id` + `mahram_account_id` pair (no second link id)

Invariants: This is sister account to mahram account — not a conversation watch. After confirm the grant list is empty. Dashboard multi-ward is NEXT.

### mahram_thread_grant

Owner module: mahram

| Field | Type | Null | Meaning |
| --- | --- | --- | --- |
| id | uuid v7 | NO | Primary key |
| sister_account_id | uuid v7 | NO | Ward Sister (`accountId === link.sister_id`, `role=member`) |
| mahram_account_id | uuid v7 | NO | Guardian |
| conversation_id | uuid v7 | NO | Existing conversation from `ChatPort.openFromInvite`. No `invite_id` |
| granted_at | timestamptz | NO | When the Sister granted this thread |
| revoked_at | timestamptz | YES | Active means `revoked_at IS NULL`. Revoke-one sets this (do not DELETE) |

- mahram_thread_grant N:1 conversation via `mahram_thread_grant.conversation_id`
- mahram_thread_grant N:1 account (sister) via `mahram_thread_grant.sister_account_id`
- mahram_thread_grant N:1 account (mahram) via `mahram_thread_grant.mahram_account_id`

Invariants: Unique **active** grant per `{ mahram_account_id, conversation_id }`. Flash / pre-accept is not grantable. New conversation never inherits a grant. Only the ward Sister INSERTs or revoke-ones. Conversation `end` does **not** revoke. Remove sets `revoked_at` on every active grant for that link in the same unit of work.

### moderation_job

Owner module: moderation

| Field | Type | Null | Meaning |
| --- | --- | --- | --- |
| id | uuid v7 | NO | Primary key |
| message_id | uuid v7 | YES | Keyed by `flash_id` \| `message_id` \| `asset_id` |
| asset_id | uuid v7 | YES | Profile photo or chat media |
| flash_id | uuid v7 | YES | Pre-conversation Flash |
| scores | jsonb | YES | Vendor scores. Never phones or original photo bytes in audit |
| outcome | enum `flag-for-admin\|clean\|scan-deferred\|scan-failed` | NO | Never writes `message.state` |
| vendor | text | YES | Adapter |
| latency_ms | int | YES | Observed latency. Not a send-block clock |

- moderation_job 0..1:1 message via `moderation_job.message_id`
- moderation_job 0..1:1 message_flash via `moderation_job.flash_id`
- moderation_job 0..1:1 photo_asset via `moderation_job.asset_id`
- flag_queue N:1 moderation_job via `flag_queue.job_id`

Invariants: Only moderation INSERTs this row (`ModerationPort.enqueueScan`). No row path that holds delivery. Clocks `>10s text / >30s media → hold` are deleted. There is **no** `hold_queue`.

### flag_queue

Owner module: moderation

| Field | Type | Null | Meaning |
| --- | --- | --- | --- |
| id | uuid v7 | NO | Primary key |
| job_id | uuid v7 | NO | Parent job |
| account_id | uuid v7 | NO | Flagged-person mark only — not a `strike`, `sanction`, or `account` write |
| item_id | uuid v7 | NO | Delivered message / flash / asset |
| reason | enum `flag-for-admin\|scan-deferred\|scan-failed` | NO | No row for clean |
| entered_at | timestamptz | NO | Human flag-queue SLA clock starts here (same 24h first-human clock as Reports) |

- flag_queue N:1 moderation_job via `flag_queue.job_id`
- flag_queue N:1 account via `flag_queue.account_id`

Invariants: Already-delivered Chat items plus scan-deferred / scan-failed. Does not stop delivery. Replaces `hold_queue`. The sanction is the admin action, never the flag.

### report

Owner module: trust

| Field | Type | Null | Meaning |
| --- | --- | --- | --- |
| id | uuid v7 | NO | Primary key |
| reporter_id | uuid v7 | NO | Filing member |
| target | uuid v7 | NO | Reported profile or message target (FR-083) |
| reason | text | NO | Published reason |
| sla_started_at | timestamptz | NO | Report clock starts at submit |
| first_human_at | timestamptz | YES | First human decision |

- report N:1 account (reporter) via `report.reporter_id`
- moderation_case 0..1:1 report via `moderation_case.report_id`

Invariants: Member Reports open a `moderation_case` written only by trust.

### moderation_case

Owner module: trust

| Field | Type | Null | Meaning |
| --- | --- | --- | --- |
| id | uuid v7 | NO | Primary key |
| report_id | uuid v7 | YES | Set when a Member Report arrives |
| flag_queue_id | uuid v7 | YES | Set when an admin action on a flag opens or continues a case (FR-144) |
| sla_started_at | timestamptz | NO | Report clock at submit; AI-flag clock when the flag entered the queue |
| first_human_at | timestamptz | YES | First human decision |

- moderation_case 0..1:1 report via `moderation_case.report_id`
- moderation_case 0..1:1 flag_queue via `moderation_case.flag_queue_id`
- strike N:1 moderation_case via `strike.case_id`

Invariants: Trust writes `moderation_case` only. The passive flag writes `flag_queue` only.

### strike

Owner module: trust

| Field | Type | Null | Meaning |
| --- | --- | --- | --- |
| id | uuid v7 | NO | Primary key |
| account_id | uuid v7 | NO | Subject |
| case_id | uuid v7 | YES | Evidence snapshot stays on the case |
| ladder | text | NO | Strike step. Photo floor: 3 rejects → 24h upload block from `operator_config.photo_strike_count` / `photo_strike_block_hours` |
| evidence | text | YES | Immutable snapshot reference |

- strike N:1 account via `strike.account_id`
- strike N:1 moderation_case via `strike.case_id`

### sanction

Owner module: trust

| Field | Type | Null | Meaning |
| --- | --- | --- | --- |
| id | uuid v7 | NO | Primary key |
| account_id | uuid v7 | NO | Subject |
| kind | enum `warning\|suspension\|ban` | NO | Admin action (FR-144 / FR-085). Never the flag |
| evidence | text | YES | Case evidence reference |

- sanction N:1 account via `sanction.account_id`
- appeal N:1 sanction via `appeal.sanction_id`

### ban

Owner module: trust

| Field | Type | Null | Meaning |
| --- | --- | --- | --- |
| id | uuid v7 | NO | Primary key |
| account_id | uuid v7 | NO | Banned account |
| fingerprint_id | uuid v7 | YES | Repeat-offender link (FR-088) |
| evidence | text | YES | Case evidence |

- ban N:1 account via `ban.account_id`
- ban N:1 fingerprint via `ban.fingerprint_id`

### appeal

Owner module: trust

| Field | Type | Null | Meaning |
| --- | --- | --- | --- |
| id | uuid v7 | NO | Primary key |
| account_id | uuid v7 | NO | Appellant |
| sanction_id | uuid v7 | NO | Suspension or Ban under appeal |
| status | text | NO | Second human, not the original decider (FR-090) |

- appeal N:1 account via `appeal.account_id`
- appeal N:1 sanction via `appeal.sanction_id`

### block

Owner module: trust

| Field | Type | Null | Meaning |
| --- | --- | --- | --- |
| id | uuid v7 | NO | Primary key |
| blocker_id | uuid v7 | NO | Blocker |
| blocked_id | uuid v7 | NO | Blocked member. Cannot see or contact the blocker |

- block N:1 account (blocker) via `block.blocker_id`
- block N:1 account (blocked) via `block.blocked_id`

### fingerprint

Owner module: trust

| Field | Type | Null | Meaning |
| --- | --- | --- | --- |
| id | uuid v7 | NO | Primary key |
| account_id | uuid v7 | NO | Linked account |
| hash | text | NO | `sha256(phone_e164 \| id_doc_hash \| device_attestation)`. A cookie-only id is not a Ban key |

- fingerprint N:1 account via `fingerprint.account_id`
- ban N:1 fingerprint via `ban.fingerprint_id`

### marriage_report

Owner module: outcomes

| Field | Type | Null | Meaning |
| --- | --- | --- | --- |
| id | uuid v7 | NO | Primary key |
| initiator_id | uuid v7 | NO | First confirmer |
| spouse_id | uuid v7 | NO | Named spouse. Requires an accepted Chat |
| conversation_id | uuid v7 | NO | Accepted conversation. Outcomes never INSERT/DELETE conversation |
| confirmed_at | timestamptz | YES | Set only after both named spouses confirm |
| proof_key | text | YES | Optional private nikah proof. Never a public URL |

- marriage_report N:1 account (initiator) via `marriage_report.initiator_id`
- marriage_report N:1 account (spouse) via `marriage_report.spouse_id`
- marriage_report N:1 conversation via `marriage_report.conversation_id`
- consent_story 0..1:1 marriage_report via `consent_story.report_id`

Invariants: `marriage_counter` increments by 1 only after dual confirm. One-sided report does not increment.

### consent_story

Owner module: outcomes

| Field | Type | Null | Meaning |
| --- | --- | --- | --- |
| id | uuid v7 | NO | Primary key |
| report_id | uuid v7 | NO | Dual-confirmed marriage_report |
| public_ok_a | boolean | NO | First spouse public consent |
| public_ok_b | boolean | NO | Second spouse public consent |
| family_ok | boolean | YES | Extra family-ok flag if set |
| faces | text | YES | Optional/blurred faces. City/date allowed; no Chat excerpts |

- consent_story 1:1 marriage_report via `consent_story.report_id`

Invariants: Goes public only if both spouses (and family-ok if set) consent. Either refuse keeps the showcase empty of their faces. `content` must not auto-publish.

### marriage_counter

Owner module: outcomes

| Field | Type | Null | Meaning |
| --- | --- | --- | --- |
| id | uuid v7 | NO | Singleton row |
| confirmed_count | int | NO | Starts at 0. Increment by 1 only after both named spouses confirm the same `marriage_report` |

- Relationships: none. No foreign key. One singleton row; outcomes increments `confirmed_count` when a `marriage_report` is dual-confirmed.

Invariants: `content` must not write this row. Public metrics are proof-backed only — no DAU or invented member counts.

### pack

Owner module: billing

| Field | Type | Null | Meaning |
| --- | --- | --- | --- |
| id | uuid v7 | NO | Primary key |
| duration_days | int | NO | **30 / 90 / 180** only (1/3/6 months). No `renew_at` |
| amount_xof | int | NO | Catalog amount. Live prices also in `operator_config.pack_prices_xof` |

- payment N:1 pack via `payment.pack_id`

Invariants: Sisters can buy the same packs in **both** `sister_reach_mode` values. No silent auto-renew.

### payment

Owner module: billing

| Field | Type | Null | Meaning |
| --- | --- | --- | --- |
| id | uuid v7 | NO | Primary key |
| account_id | uuid v7 | NO | Payer |
| pack_id | uuid v7 | NO | Purchased pack |
| amount_xof | int | NO | Charged XOF |
| provider | text | NO | Orange Money BF / Moov / Wave/Coris / hosted card |
| provider_ref | text | YES | Provider reference |
| ends_at | timestamptz | NO | Explicit end. **No** `renew_at` |
| idempotency_key | text | NO | Required on payment create |
| status | enum `created\|applied` | NO | Webhook apply once (AD-7). `entitlement` may exist only when `applied` |

- payment N:1 account via `payment.account_id`
- payment N:1 pack via `payment.pack_id`
- entitlement 1:1 payment via `entitlement.payment_id`
- webhook_receipt N:1 payment (apply once)

### entitlement

Owner module: billing

| Field | Type | Null | Meaning |
| --- | --- | --- | --- |
| id | uuid v7 | NO | Primary key |
| account_id | uuid v7 | NO | Entitled account |
| payment_id | uuid v7 | NO | Granting payment |
| ends_at | timestamptz | NO | Pack presence only. `isEntitled` must not read `sister_reach_mode` or gender |

- entitlement N:1 account via `entitlement.account_id`
- entitlement 1:1 payment via `entitlement.payment_id`

Invariants: Any live pack → unlimited Invites and unlimited messages. `unavailable` maps to the Free cap. Insert only after `payment.status=applied`. One live entitlement per account; a later applied pack replaces `ends_at`, it does not stack concurrent packs.

### webhook_receipt

Owner module: billing

| Field | Type | Null | Meaning |
| --- | --- | --- | --- |
| id | uuid v7 | NO | Primary key |
| idempotency_key | text | NO | Apply once. Reject timestamps older than 600s |
| received_at | timestamptz | NO | Ingest time |
| expires_at | timestamptz | NO | Persist 30 days (AD-7) |
| payment_id | uuid v7 | YES | Payment this receipt applied. Null if rejected before apply |

- webhook_receipt N:1 payment via `webhook_receipt.payment_id`

### article

Owner module: content

| Field | Type | Null | Meaning |
| --- | --- | --- | --- |
| id | uuid v7 | NO | Primary key |
| slug | text | NO | Académie article |
| reviewer_name | text | NO | Advisory Board or recorded delegate (FR-115) |
| published_at | timestamptz | YES | Public when set |

- Relationships: none. No foreign key. `reviewer_name` is text, not `board_member.id`.

Invariants: Member-facing copy uses *mariage / ta'aruf / nikah / khitba* only.

### board_member

Owner module: content

| Field | Type | Null | Meaning |
| --- | --- | --- | --- |
| id | uuid v7 | NO | Primary key |
| name | text | NO | Named person (FR-116). No fictional board |
| role | text | NO | Public trust-page role |

- Relationships: none. No foreign key.

### locale_string

Owner module: content

| Field | Type | Null | Meaning |
| --- | --- | --- | --- |
| key | text | NO | Grain PK with `locale`. Includes `moderation_policy_*` (AD-10 D6 honesty) |
| locale | text | NO | Grain PK. `fr` default UI |
| value | text | NO | Operator-editable Member policy text. Stale pre-delivery / fail-closed copy is forbidden |

- Relationships: none. No foreign key.

Invariants: Operator edits the text; content owns the row. Dating / *rencontre romantique* forbidden in shipped strings (AD-24).

### audio_asset

Owner module: content

| Field | Type | Null | Meaning |
| --- | --- | --- | --- |
| id | uuid v7 | NO | Primary key |
| key | text | NO | Onboarding / photo-rules / pricing-trust audio key |
| locale | enum `mos\|dyu` | NO | Mooré / Dioula audio. Not Chat Voice |
| object_key | text | NO | Stored object |

- Relationships: none. No foreign key. Not `photo_asset`.

Invariants: Chat Voice is `photo_asset.kind=voice_note`, not this table.

### ice_breaker_template

Owner module: content

| Field | Type | Null | Meaning |
| --- | --- | --- | --- |
| id | uuid v7 | NO | Primary key |
| body | text | NO | Scholar-sensible deen/family template (FR-047). Member edits before send |
| locale | text | NO | Template language |

- Relationships: none. No foreign key. A sent Flash does not store this id.

Invariants: AI-personalised Ice Breakers are FR-049 NEXT. Not a `message` and not a `message_flash` until the Member sends.

### operator_config

Owner module: operator

| Field | Type | Null | Meaning |
| --- | --- | --- | --- |
| key | text | NO | Primary key. Natural key. Not one column per setting |
| value | text | NO | Typed by key: number unless `_xof` is integer XOF or `sister_reach_mode` is that enum. Required keys: `flag_threshold`; `free_review_sla_hours`; `report_sla_hours`; `photo_strike_count` (photo floor **3**); `photo_strike_block_hours` (**24h**); `brother_invite_quota_free` (working **3** `[ASSUMPTION]`); `brother_invite_quota_premium` (Premium Invite volume is unlimited when `isEntitled` — not a lock of 15); `sister_reach_mode` (`free_unlimited` DEFAULT \| `same_quota_as_brothers`; both seeded day one); `daily_message_cap` (number; seed **10** `[ASSUMPTION — admin-configurable, not a product lock]`); `signed_url_ttl_seconds` (max 60); `pack_prices_xof`; `min_age` (defaults to 19); `rl_auth_per_min`; `rl_otp_per_hour`; `rl_invite_per_day`; `rl_report_per_hour`; `rl_pay_per_min`; `rl_browse_per_min` |

- Relationships: none. No foreign key. Callers read by `key`.

Invariants: Only `operator` may write `sister_reach_mode` and `daily_message_cap`. Change is an AD-18 event in the same unit of work (`from`, `to`, `staffId`, key). Not a compile-out flag.

### cil_ticket

Owner module: operator

| Field | Type | Null | Meaning |
| --- | --- | --- | --- |
| id | uuid v7 | NO | Primary key |
| subject_account_id | uuid v7 | NO | Data subject. The **only** staff path that emits another person’s contact (AD-17) |
| kind | enum `export\|erase\|access` | NO | Owner-only delete/export plus operator status page |
| status | text | NO | Status-page state. NFR-008 clocks `[ASSUMPTION]` (erase ≤30d, export ≤72h) |

- cil_ticket N:1 account via `cil_ticket.subject_account_id`

Invariants: Every such export is an AD-18 event. Staff must not run a bulk contact export.

### notification

Owner module: notifications

| Field | Type | Null | Meaning |
| --- | --- | --- | --- |
| id | uuid v7 | NO | Primary key |
| account_id | uuid v7 | NO | Recipient |
| template | text | NO | Template id only |
| conversation_id | uuid v7 | YES | Id payload — no Chat/Flash body |
| invite_id | uuid v7 | YES | Id payload |
| media_id | uuid v7 | YES | Blur thumb via `MediaPort.sign` only. No media URL except that |

- notification N:1 account via `notification.account_id`

Invariants: No phone, no WhatsApp, no Chat/Flash body on FCM / Web Push.

### sms_dispatch

Owner module: notifications

| Field | Type | Null | Meaning |
| --- | --- | --- | --- |
| id | uuid v7 | NO | Primary key |
| account_id | uuid v7 | YES | Recipient account when known |
| template | text | NO | OTP, Invite-received, Mahram pause/end/flag, Contact-share rejects, admin sanctions |
| created_at | timestamptz | NO | Dispatch time |

- sms_dispatch N:1 account via `sms_dispatch.account_id`

Invariants: One live SMS adapter at a time. Payload is template + ids — no Chat/Flash body, no phone in the stored payload.

### audit_event

Owner module: audit

| Field | Type | Null | Meaning |
| --- | --- | --- | --- |
| id | uuid v7 | NO | Primary key |
| actor_id | uuid v7 | YES | Individual staff or member attribution |
| action | text | NO | Mandatory events include moderator unblur, sanctions, appeals, operator `sister_reach_mode` / `daily_message_cap` / threshold / price changes, deletion/CIL completions, scan-deferred / scan-failed, admin flag actions, mahram attach/grant/revoke-one/remove/pause/end, reveal grant/revoke, payment webhook apply, marriage dual-confirm, consent-story publish or refuse, subject-access export |
| payload | jsonb | NO | ids + action + reason — **never** phones or original photo bytes |
| prev_hash | text | NO | Hash chain |
| hash | text | NO | Tamper-evident at the app layer, not object-lock WORM |

- audit_event N:1 account via `audit_event.actor_id` when attributed

Invariants: INSERT/SELECT-only DB role. Nightly chain-verify. Retain ≥12 months. NFR-008 working clocks stay `[ASSUMPTION]`.

## 7. APIs

Style: JSON REST `/v1` + Socket.IO `/v1/realtime` (AD-7, AD-15).

Auth: session cookie `Secure` + `HttpOnly` + `SameSite=Lax` plus CSRF (web/PWA); Bearer in platform secure storage (Capacitor). Socket.IO handshake carries the same `AuthContext`. Staff MFA. Captcha on signup/login (FR-007). RBAC per AD-8.

Idempotency: `Idempotency-Key` on `POST /v1/payments` and all `POST /v1/webhooks/*`.

### 7.1 Resource map (main)

| Module | HTTP | Events |
| --- | --- | --- |
| identity | `/v1/accounts`, `/v1/sessions`, `/v1/password-resets`, `/v1/pin` | — |
| verification | `/v1/verifications/otp`, `/liveness`, `/id` | — |
| profiles | `/v1/me/profile`, `/v1/profiles/:id` | — |
| discovery | `/v1/browse` (`view=card\|grid`, default `card` unless client sent `grid`; card payload includes `sharedTraits` from existing Profile fields only), `/v1/browse/pass` (viewer-scoped exclusion; **not** a likes table), `/v1/favourites`, `/v1/filters` | — |
| invites | `/v1/invites`, `/v1/invites/:id/accept\|decline`, `/v1/invites/quota` | `invite.received` |
| chat | `/v1/conversations`, `/v1/conversations/:id/messages`, `/v1/conversations/:id/contact-share`, `/v1/me/message-remaining` | `message.*`, `conversation.typing`, `stage.changed` |
| media | `/v1/media` (upload init; never returns `original_key`), `/v1/media/get` (grant-checked gateway), `/v1/reveals` | `reveal.changed` |
| mahram | `/v1/mahram/invites`, `/v1/mahram/links/:id/grants` (Sister grant thread / revoke one), `/v1/mahram/links/:id/remove` (revoke all), `/v1/mahram/links/:id/pause\|end\|flag`, `/v1/mahram/threads` (list/read **only** where an active grant exists; delivered messages only; **no** mahram send) | `mahram.presence` |
| moderation | staff `/v1/staff/flags`, `/v1/staff/cases` | — |
| trust | `/v1/reports`, `/v1/blocks`, `/v1/appeals` | — |
| outcomes | `/v1/marriage-reports`, `/v1/stories`, public `/v1/public/marriage-count` | — |
| billing | `/v1/packs`, `/v1/payments` (Sister checkout catalog exists in **both** `sister_reach_mode` values; in `free_unlimited` the pack is not required for Invite reach), `/v1/webhooks/payments` | — |
| content | `/v1/academie`, `/v1/board` | — |
| operator | `/v1/staff/config` (`GET`/`PATCH`; `PATCH` may set `sister_reach_mode` and `daily_message_cap`; both audited), `/v1/staff/cil-tickets`, `/v1/staff/metrics` | — |
| notifications | `/v1/devices`, `/v1/notification-prefs` | push/SMS side effects |

Error envelope only (AD-7). Typical codes: `UNAUTHENTICATED`, `FORBIDDEN`, `CONTACT_SHARE_REQUIRED`, `REVEAL_DENIED`, `QUOTA_EXCEEDED` (Invite cap), `MESSAGE_CAP_EXCEEDED` (Free-tier message cap), `PAY_UNAVAILABLE`, `IDEMPOTENCY_REPLAY`.

People-list `GET /v1/browse?view=card|grid` (default `card` unless the client sent `view=grid`) returns one profile (`card`) or a page (`grid`). Card payload includes `sharedTraits` computed for the viewer from Profile fields that already exist; omit a trait if the field does not exist (no kids column, no bio parse). Pass writes a viewer-scoped discovery exclusion (not a likes table, not `favourite`). Invite and card quick-message are existing Invite / Message Flash commands and return Invite-quota / message-cap results (`QUOTA_EXCEEDED` first if Invite-capped, else `MESSAGE_CAP_EXCEEDED`). Invite + Flash is one command: cap refuse persists neither.

`GET /v1/me/message-remaining` is the Member read model from **chat** only (billing must not expose a remaining-int): `{ capped, remaining, cap, resets_at }` when Free (`cap` is the live `daily_message_cap`; `remaining = max(0, cap − sent_count)`); `{ capped: false }` when Premium (`isEntitled` true). `unavailable` maps to the Free cap.

Sister grant: `POST /v1/mahram/links/:id/grants` `{ conversation_id }` — writer must be the ward Sister (`accountId === link.sister_id`, `role=member`). Revoke one: `DELETE` that grant. Revoke all = remove mahram (sets `revoked_at` on every active grant in the same unit of work). Mahram list/read 404/`FORBIDDEN` when no active grant. Chat HTTP / Socket.IO when `roles ∋ mahram` use the same predicate. No mahram send route. `session.kind=mahram` must not hit browse / invite / chat write.

`GET /v1/invites/quota` (and the `POST /v1/invites` success/error body) return the same quota predicate the sender is under:

| Caller | `sister_reach_mode` | Body |
| --- | --- | --- |
| Brother (any mode) | ignored | `{ capped: true, remaining, cap, resets_at }` — Free/Premium caps from `operator_config` + `BillingPort.isEntitled` |
| Sister | `free_unlimited` | `{ capped: false, sister_reach_mode: "free_unlimited" }` — no remaining/cap; `POST` never returns `QUOTA_EXCEEDED` |
| Sister | `same_quota_as_brothers` | `{ capped: true, remaining, cap, resets_at, sister_reach_mode: "same_quota_as_brothers" }` — same numbers as a Brother with the same entitlement. Over-cap `POST` → `QUOTA_EXCEEDED` with reset time. Missing pack or `isEntitled=unavailable` → Free cap |

`PATCH /v1/staff/config` with `sister_reach_mode` or `daily_message_cap` is **operator**-only (`roles ∋ operator`; `moderator` / `system` / env / SQL must not write them). The write and the AD-18 event are one unit of work (`from`, `to`, `staffId`, key). A `sister_reach_mode` change applies to the next Sister invite send; past invites are not deleted; already-sent invites that day do not count toward a newly applied cap. A `daily_message_cap` change applies to subsequent Free-tier sends; already-delivered messages stay. There is no brother-free field. `daily_message_cap` seed **10** is `[ASSUMPTION — admin-configurable, not a product lock]`.

## 8. Moderation pipeline (honest)

Farata homepage Claimed (marketing) “AI scans every message”; FAQ Claimed (marketing) “we do not read private chats” (evidenced contradiction). Voice/chat-photo moderation is Not publicly evidenced. **Locked 2026-10-01 (Maitchibi Fayçal):** Chat is **passive** — delivered immediately, then scanned. Honesty is that the AI flags for a human admin and does not silently delete, block, or hold Chat (D4, D6, D32). That sentence is also the **shipped** D6 Member policy (FR-066, FR-140): Operator-editable `moderation_policy_*` locale strings; stale pre-delivery copy is forbidden.

**Chat path (FR-062–FR-064, FR-066–FR-068, FR-144, NFR-003):**

1. Client sends. Chat consults the FR-146 cap **before** insert (AD-29). Over-cap → `MESSAGE_CAP_EXCEEDED`; nothing is stored and nothing is held. An allowed send → message row `delivered`. Recipient (and Mahram, if this thread has an active grant) can read it immediately. Send does not wait on AI.
2. After persist, Chat (or Invites for Flash) calls `ModerationPort.enqueueScan`. The worker then runs `scanText` / `scanImage` / `transcribe` / `classifyAudio`. Only moderation INSERTs `moderation_job` and `flag_queue`.
3. Text: background classifier + money-ask lexicon (FR/local lists). Phone / WhatsApp / links are a **local deterministic** Contact-share matcher in `chat` (and `invites` for Flash) — regex / handle patterns / URL parse — **not** `ModerationPort.scanText`. If Contact-share is off (Flash: it cannot be open), persist is refused with `CONTACT_SHARE_REQUIRED` and **both** Members see the education interstitial. Money-ask language is delivered and flagged, not held; in-Chat education (“never send money to a suitor”) is shown after delivery. `ModerationPort` 5xx never runs on this matcher.
4. Image: visual classifier after delivery. Visible phone/QR may flag the person; it does not unsend the Photo. Blur remains AD-9 privacy, not a moderation delivery outcome.
5. Voice: `transcribe` + `classifyAudio` + lexicon on transcript, **after** the recipient can hear it. **French** may use commercial Whisper-class ASR. **Mooré / Dioula:** official Whisper list has no `mos`/`dyu`. Griot-ASR lists both as Preview. Community Moore fine-tunes exist without an SLA. Design: word lists maintained by moderators plus human review on the passive-scan path; low confidence flags or records `scan-deferred`. Do **not** hold the Voice note before delivery. Do not advertise “we understand all Mooré/Dioula audio.”
6. AI 5xx / timeout / empty or malformed / low confidence → record `scan-deferred` or `scan-failed` on `flag_queue` (NFR-003). Delivery already happened. Do not invent a send-blocking latency. Delete clocks `>10s text / >30s media → hold`.
7. `flag_queue` is already-delivered items plus scan-deferred / scan-failed events. Admin first-human decision SLA is the existing Report clock (p95 ≤ 24h); for an AI flag the clock starts when the flag enters the queue.
8. Admin chooses warning, suspend (if too indecent), or another published action (FR-144). The AI never applies a sanction. The passive flag writes `flag_queue` only; trust writes `moderation_case` only on a Member Report or when that admin action opens or continues a case.

**Profile path (FR-065) — not the Chat pipeline:** a Profile Photo or bio is not publicly visible until reviewed. Do not apply immediate Chat delivery to public Profile Photos. Discovery omits unpublished Profile Photos. Previous allowed bio stays live if a new bio is blocked.

## 9. Photo privacy (server-side)

Ingest → original + blur derivatives in a private bucket. `MediaPort.sign` mints a capability token to the media GET gateway (not a raw bucket pre-sign). The gateway re-checks grant + denylist on every GET, so revoke **stops serving** a clear URL within 60s (FR-059). TTL cap is 60s. `original` and clear `md` are refused without a live grant. Serializers never emit `original_key`. Erase includes object versions. List/grid/push thumbs are blur derivatives only. Cached client bytes remain a residual (watermark polish is FR-061 NEXT). Moderator unblur is audited (FR-093). Android `FLAG_SECURE` is deterrence — do not advertise “cannot screenshot.”

## 10. Mahram

After OTP + Sister confirm, the grant list is **empty**. She grants individual Brother threads. New chats are not auto-granted. Mahram reads only **granted, delivered** messages. He cannot compose or send as her. He cannot browse or Invite. Revoke-one drops that thread only. Sister remove/report (FR-077) revokes the entire permission and drops every thread grant within 60s; SMS to both sides; may call `ProfilePort.emergencyHide` (24h). Flag / pause / end are rejected on a thread that is not granted. All grant / revoke-one / remove events are audited (AD-18). Optional verified-wali badge via the same VerificationPort. A2 unchanged. Mahram must not INSERT `conversation`.

## 11. Payments

`MobileMoneyPort`. MVP methods: Orange Money BF, Moov Africa BF, Wave/Coris where available; cards secondary via hosted checkout only (PAN never touches `apps/api`). Aggregators that **document** BF rails today: CinetPay (`OM_BF`, `MOOV_BF`, `WAVE_BF`), PayDunya (`orange-money-burkina`, `moov-burkina-faso`), FedaPay (BF Orange/Moov). No SKU bound. Time-boxed 1/3/6 months. **No stored recurring mandate. No silent auto-renew.** Webhook verify + idempotency. `isEntitled` returns `true | false | unavailable` and must not throw into safety paths. Payment outage must not affect Free/safety (NFR-004, AD-21). Brothers always see these packs. Sisters can buy the same 1/3/6 packs in **both** `sister_reach_mode` values (AD-14, AD-29) because Free-tier messages are capped (FR-146). Premium = unlimited Invites **and** unlimited messages. In `free_unlimited` the pack is not required for Invite reach; Sister invite send still does not call `BillingPort` (AD-27). Do not accept a brother-free mode.

## 12. Low bandwidth and notifications

Lite mode (AD-16). Offline text outbox (Chat media waits for connection, not AI). SMS for OTP, Invite received, Mahram pause/end/flag, Contact-share rejects, admin sanctions. USSD port disabled (OQ-3 / FR-055). Push/SMS payloads are template + ids only; thumbs always blurred. No Chat/Flash body or phone on FCM, Web Push, or SMS.

## 13. Security, audit, privacy

RBAC AD-8 (staff MFA; no operator-as-member). Encryption, CSRF/SameSite, captcha, and rate limits AD-17. Contact-share is the only off-platform predicate (FR-068). Tamper-evident (not WORM) hash-chained audit AD-18 — INSERT/SELECT-only role. CIL program + filing inventory §5.3 + 72h breach notice + public hosting line AD-19 / AD-5. Staff contact export only via `cil_ticket`. Retention clocks in NFR-008 remain `[ASSUMPTION]`.

## 14. Deployment

`dev` / `staging` / `prod` isolated (AD-20). CI on every PR; prod deploy is a human approve. Observability must include scan-deferred / scan-failed count (never hidden). Backups: PG PITR + object versioning; quarterly restore. Launch assumption: 10k MAU BF, single Paris region, 2 API replicas, PG primary+replica.

## 15. Open questions (stay OPEN)

PRD §16 questions 1, 3–8, and 10–11 stay **open**. Question 2 (fail-closed UX) is **resolved 2026-10-01**. Question 9 (native-speaker check of Nikahsira / Nonglem) is **resolved 2026-10-03** — product name AnKanu; domain ankanu.com purchased on Hostinger; shortlist is search history only. Flexibility:

| # | Question | Architecture flexibility |
| --- | --- | --- |
| 1 | Polygamy disclosure UX / first-wife awareness | Profile fields + policy table. **No** first-wife notification adapter unless counsel/sisters flip. Out-of-scope path stays unbuilt |
| 2 | Fail-closed UX tolerance | **Resolved 2026-10-01.** Chat is send-first and passive (AD-10). AI outage records scan-deferred; it does not hold. No hold-timeout UX |
| 3 | USSD/SMS cost | `SmsPort` live. `UssdPort` flag off |
| 4 | Imam names + Académie review SLA | Content tables; SLA number in config; no hardcoded scholars |
| 5 | Free review SLA hours | `operator_config.free_review_sla_hours` (working 24) |
| 6 | Anonymous-mode rules (D36) | Feature flag + visibility policy table (NEXT) |
| 7 | Brother clear photo before accept if he opted out of blur | Per-owner reveal policy already. Config `default_preaccept_clear_if_owner_unblurred` (working yes) |
| 8 | GIF/sticker pack | Feature flag `gif_picker=off` |
| 9 | Native-speaker check of Nikahsira / Nonglem | **Resolved 2026-10-03.** Product name is AnKanu. Domain ankanu.com purchased on Hostinger. Shortlist names are search history only — those domains were not purchased. Branding strings remain config, not schema |
| 10 | OAPI / WIPO / handles | Still open for AnKanu (not recorded as completed). Shortlist-domain purchase is closed. Legal/ops. Brand tokens replaceable |
| 11 | Free Money / MTN MoMo later-country rails | Payment method catalog + new adapters; billing module unchanged |
| 12 | Retention schedule (PRD §16 / NFR-008) | Clocks stay `[ASSUMPTION]` in AD-19 until counsel replaces them; not a silent Farata copy |

## 16. Traceability — every FR and NFR

Ranges are used only when the same AD **and** module govern the slice. Coverage: **FR-001–FR-146 = 146/146**. **NFR-001–NFR-009 = 9/9**.

| IDs | Horizon | Module(s) | Governing AD(s) |
| --- | --- | --- | --- |
| FR-001–FR-008 | MVP (FR-004 NEXT) | identity | AD-8, AD-17 |
| FR-009–FR-010 | MVP | identity, content | AD-16, AD-22 |
| FR-011 | MVP (A1) | identity | AD-8, AD-19 |
| FR-012–FR-013 | MVP | profiles, moderation, operator | AD-10, AD-22 |
| FR-014–FR-015 | MVP | verification | AD-13, AD-21 |
| FR-016–FR-017 | MVP | profiles, media, moderation | AD-9, AD-10 |
| FR-018 | MVP | identity | AD-8 |
| FR-019 | MVP | identity, operator | AD-19, AD-18 |
| FR-020 | MVP | identity | AD-8, AD-17 |
| FR-021–FR-023 | MVP | profiles | AD-3 |
| FR-024–FR-027 | MVP | discovery | AD-3, AD-16, AD-28 |
| FR-028 | MVP | chat | AD-15, AD-12 |
| FR-029–FR-036 | NEXT | profiles, discovery | AD-3, AD-22 |
| FR-037 | MVP | profiles, invites | AD-26, AD-22 |
| FR-038–FR-043 | MVP | invites, mahram, chat | AD-23, AD-21, AD-10, AD-27 |
| FR-044–FR-045 | MVP | invites, billing, operator | AD-27, AD-21, AD-23, AD-29 |
| FR-046–FR-049 | MVP (FR-049 NEXT) | invites, mahram, chat | AD-23, AD-21, AD-10, AD-29 |
| FR-050–FR-052 | MVP | chat, notifications, media | AD-15, AD-9, AD-16, AD-29 |
| FR-053 | MVP | notifications | AD-16 |
| FR-054 | NEXT | chat | AD-22 |
| FR-055 | NEXT | notifications | AD-16, AD-22 |
| FR-056–FR-061 | MVP (FR-061 NEXT) | media | AD-9 |
| FR-062–FR-068 | MVP | chat, moderation, trust | AD-10, AD-11, AD-17 |
| FR-069–FR-070 | MVP | moderation, trust, media | AD-10, AD-9 |
| FR-071–FR-080 | MVP | mahram | AD-12, AD-13 |
| FR-081–FR-082 | NEXT | mahram, chat | AD-12, AD-22 |
| FR-083–FR-093 | MVP | trust, moderation, media | AD-10, AD-18, AD-9 |
| FR-094 | NEXT | trust, chat | AD-18, AD-22 |
| FR-095–FR-101 | MVP | outcomes | AD-25, AD-18 |
| FR-102–FR-103 | NEXT / LATER | outcomes, content | AD-22 |
| FR-104–FR-110 | MVP | billing | AD-14, AD-21, AD-27, AD-29 |
| FR-111–FR-114 | NEXT | billing, discovery | AD-14, AD-21, AD-22 |
| FR-115–FR-116 | MVP | content | AD-22 |
| FR-117 | MVP | content | AD-24, AD-22 |
| FR-118 | MVP | operator | AD-20 |
| FR-119–FR-120 | MVP | operator, content | AD-19, AD-5 |
| FR-121–FR-131 | NEXT / LATER | content, chat | AD-22 |
| FR-132–FR-135 | MVP (FR-135 NEXT) | apps/web, apps/android | AD-4 |
| FR-136 | MVP | apps/web, media | AD-16 |
| FR-137–FR-138 | MVP | content, apps/web | AD-24, AD-16, AD-11 |
| FR-139–FR-142 | MVP | operator | AD-10, AD-14, AD-20, AD-18, AD-29 |
| FR-143 | MVP | operator, identity | AD-19, AD-18 |
| FR-144 | MVP | trust, moderation | AD-10, AD-18 |
| FR-145 | MVP | operator, invites, billing | AD-27, AD-18, AD-14, AD-21 |
| FR-146 | MVP | chat, operator, billing | AD-29, AD-21, AD-23, AD-18 |
| NFR-001 | — | identity, media, verification | AD-8, AD-9, AD-13, AD-17 |
| NFR-002 | — | operator, media | AD-5, AD-19 |
| NFR-003 | — | chat, moderation, trust | AD-10, AD-11 |
| NFR-004 | — | billing, api | AD-14, AD-20, AD-21 |
| NFR-005 | — | apps/web, media, chat | AD-4, AD-16 |
| NFR-006 | — | apps/web, content | AD-24, AD-16, AD-4 |
| NFR-007 | — | content | AD-24, AD-11, AD-16 |
| NFR-008 | — | identity, operator, chat | AD-19 |
| NFR-009 | — | audit | AD-18 |

**Coverage totals:** 146 / 146 FRs mapped (145 prior + FR-146). 9 / 9 NFRs mapped. 0 missing. Ranges share a governing AD+module; NEXT/LATER ids inside a range stay horizon-NEXT (FR-004, FR-029–FR-036, FR-049, FR-054–FR-055, FR-061, FR-081–FR-082, FR-094, FR-102–FR-103, FR-111–FR-114, FR-121–FR-131, FR-135) — dual-control unblur (D31) remains Deferred, not an MVP AD.

## 17. What this is not

Not legal advice. Not a CIL filing. Not an OAPI/WIPO filing. Product name AnKanu and domain ankanu.com are locked 2026-10-03; this document is not a trademark registration. Not the start of UX, spec, or epics. Competitor numbers stay labeled; Farata “+247.8k actifs” remains Claimed (marketing) versus Play 10k+ Offered (seen).
