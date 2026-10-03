---
title: muslim-marriage-africa — solution design
status: final
created: 2026-09-27
updated: 2026-10-02
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
  - native-speaker-nikahsira-nonglem
  - oapi-wipo-handles
  - later-country-payment-rails
  - nfr-008-retention-clocks
---

# Solution design — muslim-marriage-africa

Companion to `ARCHITECTURE-SPINE.md`. The spine is the consistency contract (invariants only). This document is the human-facing solution design: purpose, hosting justification, data and API shape, honest moderation limits, and full FR/NFR traceability.

Working title **muslim-marriage-africa**. Product name undecided (shortlist Nisfuddin — also consider `nisfdin` — Nikahsira, Sakinaa; alternates Mithaqun, Nonglem). RDAP checks are point-in-time, not a purchase. Native-speaker and OAPI/WIPO checks remain open.

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

Dependency direction: clients → inbound adapters → application → domain; outbound vendor I/O only in adapters. Billing cannot sit on the path of identity, verification, media, moderation, mahram, report, block, or Chat after accept (AD-21). Sister invite send may call `BillingPort` only when `sister_reach_mode` is `same_quota_as_brothers` (AD-27).

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
| Controller | The Burkina operating company (name still branding-open) |
| Hosting processor | Scaleway `fr-par` (France) — AD-5 |
| Other destinataires / sous-traitants | SMS gateway, KYC/liveness vendor, moderation/ASR vendor, mobile-money aggregator, FCM, Web Push relay, Google OIDC, captcha vendor — each may be outside BF. Adapter SKUs stay unbound (AD-5 not reopened) |
| Categories | Account/contact; profile (including `madhhab`/`practice` — religious, art. 12 express consent); photos; chat; liveness + ID images (biometric-class + foreign transfer, art. 31); model scores on every outbound Chat item (art. 31 AI/profiling bullet — counsel decides); payments |
| Transfers | France (host) plus each vendor’s country; list them on the privacy page, not only Scaleway |

## 6. Data model (invariants)

Spine ERD is the shape. Fields and invariants the code must not invent twice:

| Entity | Key fields | Invariants |
| --- | --- | --- |
| account | id, email unique, password_hash, pseudonym unique, gender `sister\|brother`, roles, status, age_attested, pin_hash | No public visibility until verification+review. Gender immutable after first set without operator+audit |
| session | id, account_id, kind `web\|capacitor\|mahram\|staff`, expires_at | PIN sessions idle-timeout 15 min (NFR-001 working number). Staff MFA. No member+staff on one session |
| verification_record | id, account_id, kind `phone_otp\|liveness\|id_document`, status, vendor, evidence_uri | Independent of entitlement. Liveness matched to profile photos |
| profile | account_id, dob, city, marital_status, polygamy_intent, madhhab, practice, life_plans, bio_live, bio_pending, visibility | `married` brother **must** set polygamy_intent. Bio swaps only on allow |
| photo_asset | id, owner_id, kind `profile_photo\|chat_photo\|voice_note`, original_key, blur_key, moderation_state | `original_key` is storage-only. `applyModeration` only on `profile_photo`. `chat_photo` / `voice_note` sign without waiting on review. Not `content.audio_asset` |
| reveal_grant | photo_id or owner_id, viewer_id, policy, revoked_at | Per viewer. Gateway + denylist stop **serving** clear bytes ≤60s. Policy `on_accept\|on_request\|never` |
| likeness_grant | owner_id, campaign_id, expires_at | Per-use marketing/social reuse only; cookie consent is not this grant |
| invite | id, from_id, to_id, flash_id, state, sister_accepted_at | Chat exists only after Sister accept (or she sent). No resend after refuse. Brother daily quota from config (working 3/15) always. Sister quota follows AD-27 (`sister_reach_mode`). Flash is delivered immediately (AD-10) |
| invite_quota | account_id, civil_day, sent_count | Written only by invites, and only when the sender is quota-capped (Brothers always; Sisters iff `same_quota_as_brothers`). Day = `Africa/Ouagadougou`. Cap from `operator_config` + `BillingPort.isEntitled`. Billing never writes this row |
| operator_config | key, value | Operator is the only writer. Required key `sister_reach_mode`: `free_unlimited` (DEFAULT) \| `same_quota_as_brothers`. Both seeded day one. Change is an AD-18 event; subsequent invites only |
| conversation | id, invite_id, stage `invite\|chat\|meeting\|married`, paused_by, ended_at | Ended is terminal. Brother cannot resume a Mahram pause. Inserted only by `ChatPort.openFromInvite` |
| contact_share | conversation_id, opened_at, opened_by_a, opened_by_b | Both members must opt in. Only chat writes. Moderation reads `ChatPort.contactShareOpen` |
| message | id, conversation_id, sender_id, kind `text\|photo\|voice`, state `delivered`, body_enc, media_id | Created `delivered`. No Chat `pending`/`held`. Mahram reads delivered only. Ciphertext `{v, alg, kid, iv, ct}` |
| mahram_invite / mahram_link | sister_id, phone, relationship, confirmed_at, verified_badge, removed_at | Enum `father\|brother\|uncle\|other_mahram`. No kinship doc. One confirmed guardian set per sister in MVP (dashboard multi-ward is NEXT) |
| moderation_job | message_id or asset_id or flash_id, scores, outcome, vendor, latency_ms | Outcome `flag-for-admin` \| clean \| `scan-deferred` \| `scan-failed`. Never writes `message.state`. Flash uses `flash_id` (pre-conversation) |
| flag_queue | job_id, account_id, item_id, reason, entered_at | Already-delivered Chat items plus scan-deferred / scan-failed. Does not stop delivery. Replaces `hold_queue` |
| report / case | target, reason, sla_started_at, first_human_at | Report clock starts at submit; AI-flag clock starts when the flag enters the queue |
| strike / sanction / ban / appeal | account_id, ladder, evidence | Photo floor: 3 rejects → 24h upload block (config) |
| marriage_report | initiator_id, spouse_id, confirmed_at, proof_key | Counter increments **only** on dual confirm. Proof never published |
| consent_story | report_id, public_ok_a, public_ok_b, family_ok, faces | Either spouse can refuse public |
| pack / payment / entitlement | duration_days 30/90/180, amount_xof, provider, provider_ref, ends_at, idempotency_key | `ends_at` set; **no** `renew_at`. Webhook applied once |
| audit_event | actor_id, action, payload, prev_hash, hash | Tamper-evident hash-chain. INSERT/SELECT-only role. Payload = ids + action + reason |

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
| discovery | `/v1/browse`, `/v1/favourites`, `/v1/filters` | — |
| invites | `/v1/invites`, `/v1/invites/:id/accept\|decline`, `/v1/invites/quota` | `invite.received` |
| chat | `/v1/conversations`, `/v1/conversations/:id/messages`, `/v1/conversations/:id/contact-share` | `message.*`, `conversation.typing`, `stage.changed` |
| media | `/v1/media` (upload init; never returns `original_key`), `/v1/media/get` (grant-checked gateway), `/v1/reveals` | `reveal.changed` |
| mahram | `/v1/mahram/invites`, `/v1/mahram/links/:id/pause\|end\|flag\|remove` | `mahram.presence` |
| moderation | staff `/v1/staff/flags`, `/v1/staff/cases` | — |
| trust | `/v1/reports`, `/v1/blocks`, `/v1/appeals` | — |
| outcomes | `/v1/marriage-reports`, `/v1/stories`, public `/v1/public/marriage-count` | — |
| billing | `/v1/packs`, `/v1/payments` (Sister reach-pack list/create only when `sister_reach_mode` is `same_quota_as_brothers`; `free_unlimited` Sister → empty list / `FORBIDDEN`), `/v1/webhooks/payments` | — |
| content | `/v1/academie`, `/v1/board` | — |
| operator | `/v1/staff/config` (`GET`/`PATCH`; `PATCH` may set `sister_reach_mode`), `/v1/staff/cil-tickets`, `/v1/staff/metrics` | — |
| notifications | `/v1/devices`, `/v1/notification-prefs` | push/SMS side effects |

Error envelope only (AD-7). Typical codes: `UNAUTHENTICATED`, `FORBIDDEN`, `CONTACT_SHARE_REQUIRED`, `REVEAL_DENIED`, `QUOTA_EXCEEDED`, `PAY_UNAVAILABLE`, `IDEMPOTENCY_REPLAY`.

`GET /v1/invites/quota` (and the `POST /v1/invites` success/error body) return the same quota predicate the sender is under:

| Caller | `sister_reach_mode` | Body |
| --- | --- | --- |
| Brother (any mode) | ignored | `{ capped: true, remaining, cap, resets_at }` — Free/Premium caps from `operator_config` + `BillingPort.isEntitled` |
| Sister | `free_unlimited` | `{ capped: false, sister_reach_mode: "free_unlimited" }` — no remaining/cap; `POST` never returns `QUOTA_EXCEEDED` |
| Sister | `same_quota_as_brothers` | `{ capped: true, remaining, cap, resets_at, sister_reach_mode: "same_quota_as_brothers" }` — same numbers as a Brother with the same entitlement. Over-cap `POST` → `QUOTA_EXCEEDED` with reset time. Missing pack or `isEntitled=unavailable` → Free cap |

`PATCH /v1/staff/config` with `sister_reach_mode` is **operator**-only (`roles ∋ operator`; `moderator` / `system` / env / SQL must not write it). The write and the AD-18 event are one unit of work (`from`, `to`, `staffId`). The new value applies to the next Sister invite send; past invites are not deleted; already-sent invites that day do not count toward a newly applied cap. There is no brother-free field.

## 8. Moderation pipeline (honest)

Farata homepage Claimed (marketing) “AI scans every message”; FAQ Claimed (marketing) “we do not read private chats” (evidenced contradiction). Voice/chat-photo moderation is Not publicly evidenced. **Locked 2026-10-01 (Maitchibi Fayçal):** Chat is **passive** — delivered immediately, then scanned. Honesty is that the AI flags for a human admin and does not silently delete, block, or hold Chat (D4, D6, D32). That sentence is also the **shipped** D6 Member policy (FR-066, FR-140): Operator-editable `moderation_policy_*` locale strings; stale pre-delivery copy is forbidden.

**Chat path (FR-062–FR-064, FR-066–FR-068, FR-144, NFR-003):**

1. Client sends → message row `delivered`. Recipient (and Mahram, if attached) can read it immediately. Send does not wait on AI.
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

Read-all of the **attached conversation(s)** only. Flag / escalate / pause / end. Cannot send as the Sister. Cannot browse or Invite. Sister can remove (D38); access gone within 60s; SMS to both sides. Audit trail on every action. Optional verified-wali badge via the same VerificationPort. A2 unchanged.

## 11. Payments

`MobileMoneyPort`. MVP methods: Orange Money BF, Moov Africa BF, Wave/Coris where available; cards secondary via hosted checkout only (PAN never touches `apps/api`). Aggregators that **document** BF rails today: CinetPay (`OM_BF`, `MOOV_BF`, `WAVE_BF`), PayDunya (`orange-money-burkina`, `moov-burkina-faso`), FedaPay (BF Orange/Moov). No SKU bound. Time-boxed 1/3/6 months. **No stored recurring mandate. No silent auto-renew.** Webhook verify + idempotency. `isEntitled` returns `true | false | unavailable` and must not throw into safety paths. Payment outage must not affect Free/safety (NFR-004, AD-21). Brothers always see these packs. Sisters see and buy the same packs only when `sister_reach_mode` is `same_quota_as_brothers` (AD-27). In `free_unlimited`, Sister invite send does not call `BillingPort`.

## 12. Low bandwidth and notifications

Lite mode (AD-16). Offline text outbox (Chat media waits for connection, not AI). SMS for OTP, Invite received, Mahram pause/end/flag, Contact-share rejects, admin sanctions. USSD port disabled (OQ-3 / FR-055). Push/SMS payloads are template + ids only; thumbs always blurred. No Chat/Flash body or phone on FCM, Web Push, or SMS.

## 13. Security, audit, privacy

RBAC AD-8 (staff MFA; no operator-as-member). Encryption, CSRF/SameSite, captcha, and rate limits AD-17. Contact-share is the only off-platform predicate (FR-068). Tamper-evident (not WORM) hash-chained audit AD-18 — INSERT/SELECT-only role. CIL program + filing inventory §5.3 + 72h breach notice + public hosting line AD-19 / AD-5. Staff contact export only via `cil_ticket`. Retention clocks in NFR-008 remain `[ASSUMPTION]`.

## 14. Deployment

`dev` / `staging` / `prod` isolated (AD-20). CI on every PR; prod deploy is a human approve. Observability must include scan-deferred / scan-failed count (never hidden). Backups: PG PITR + object versioning; quarterly restore. Launch assumption: 10k MAU BF, single Paris region, 2 API replicas, PG primary+replica.

## 15. Open questions (stay OPEN)

PRD §16 questions 1 and 3–11 stay **open**. Question 2 (fail-closed UX) is **resolved 2026-10-01**. Flexibility:

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
| 9 | Native-speaker check of Nikahsira / Nonglem | Branding strings are config, not schema |
| 10 | OAPI / WIPO / handles | Legal/ops. Brand tokens replaceable |
| 11 | Free Money / MTN MoMo later-country rails | Payment method catalog + new adapters; billing module unchanged |
| 12 | Retention schedule (PRD §16 / NFR-008) | Clocks stay `[ASSUMPTION]` in AD-19 until counsel replaces them; not a silent Farata copy |

## 16. Traceability — every FR and NFR

Ranges are used only when the same AD **and** module govern the slice. Coverage: **FR-001–FR-145 = 145/145**. **NFR-001–NFR-009 = 9/9**.

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
| FR-024–FR-027 | MVP | discovery | AD-3, AD-16 |
| FR-028 | MVP | chat | AD-15, AD-12 |
| FR-029–FR-036 | NEXT | profiles, discovery | AD-3, AD-22 |
| FR-037 | MVP | profiles, invites | AD-26, AD-22 |
| FR-038–FR-043 | MVP | invites, mahram, chat | AD-23, AD-21, AD-10, AD-27 |
| FR-044–FR-045 | MVP | invites, billing, operator | AD-27, AD-21, AD-23 |
| FR-046–FR-049 | MVP (FR-049 NEXT) | invites, mahram, chat | AD-23, AD-21, AD-10 |
| FR-050–FR-052 | MVP | chat, notifications, media | AD-15, AD-9, AD-16 |
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
| FR-104–FR-110 | MVP | billing | AD-14, AD-21, AD-27 |
| FR-111–FR-114 | NEXT | billing, discovery | AD-14, AD-21, AD-22 |
| FR-115–FR-116 | MVP | content | AD-22 |
| FR-117 | MVP | content | AD-24, AD-22 |
| FR-118 | MVP | operator | AD-20 |
| FR-119–FR-120 | MVP | operator, content | AD-19, AD-5 |
| FR-121–FR-131 | NEXT / LATER | content, chat | AD-22 |
| FR-132–FR-135 | MVP (FR-135 NEXT) | apps/web, apps/android | AD-4 |
| FR-136 | MVP | apps/web, media | AD-16 |
| FR-137–FR-138 | MVP | content, apps/web | AD-24, AD-16, AD-11 |
| FR-139–FR-142 | MVP | operator | AD-10, AD-14, AD-20, AD-18 |
| FR-143 | MVP | operator, identity | AD-19, AD-18 |
| FR-144 | MVP | trust, moderation | AD-10, AD-18 |
| FR-145 | MVP | operator, invites, billing | AD-27, AD-18, AD-14, AD-21 |
| NFR-001 | — | identity, media, verification | AD-8, AD-9, AD-13, AD-17 |
| NFR-002 | — | operator, media | AD-5, AD-19 |
| NFR-003 | — | chat, moderation, trust | AD-10, AD-11 |
| NFR-004 | — | billing, api | AD-14, AD-20, AD-21 |
| NFR-005 | — | apps/web, media, chat | AD-4, AD-16 |
| NFR-006 | — | apps/web, content | AD-24, AD-16, AD-4 |
| NFR-007 | — | content | AD-24, AD-11, AD-16 |
| NFR-008 | — | identity, operator, chat | AD-19 |
| NFR-009 | — | audit | AD-18 |

**Coverage totals:** 145 / 145 FRs mapped (144 prior + FR-145). 9 / 9 NFRs mapped. 0 missing. Ranges share a governing AD+module; NEXT/LATER ids inside a range stay horizon-NEXT (FR-004, FR-029–FR-036, FR-049, FR-054–FR-055, FR-061, FR-081–FR-082, FR-094, FR-102–FR-103, FR-111–FR-114, FR-121–FR-131, FR-135) — dual-control unblur (D31) remains Deferred, not an MVP AD.

## 17. What this is not

Not legal advice. Not a CIL filing. Not a name or domain purchase. Not the start of UX, spec, or epics. Competitor numbers stay labeled; Farata “+247.8k actifs” remains Claimed (marketing) versus Play 10k+ Offered (seen).
