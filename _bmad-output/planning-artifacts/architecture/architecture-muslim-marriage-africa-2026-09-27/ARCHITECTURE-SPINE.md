---
name: muslim-marriage-africa
type: architecture-spine
purpose: build-substrate
altitude: initiative
paradigm: hexagonal-modular-monolith
scope: Initiative-altitude consistency contract for the Burkina-first muslim-marriage-africa ta'aruf platform (working title; product name undecided). Governs all feature spines and the MVP+NEXT capability surface in the 2026-09-27 PRD.
status: final
created: 2026-09-27
updated: 2026-09-27
binds: [identity, verification, profiles, discovery, invites, chat, media, moderation, mahram, trust, outcomes, billing, content, operator, notifications, audit]
sources:
  - _bmad-output/planning-artifacts/prds/prd-muslim-marriage-africa-2026-09-27/prd.md
  - _bmad-output/planning-artifacts/prds/prd-muslim-marriage-africa-2026-09-27/addendum.md
  - _bmad-output/planning-artifacts/briefs/brief-muslim-marriage-africa-2026-09-27/brief.md
  - docs/system-idea.md
  - docs/competitor-farata.md
  - docs/name-options.md
  - _bmad-output/brainstorming/brainstorm-muslim-marriage-africa-2026-09-27/brainstorm-intent.md
companions:
  - SOLUTION-DESIGN.md
---

# Architecture Spine — muslim-marriage-africa

Working title **muslim-marriage-africa**. Product name undecided (shortlist Nisfuddin — also consider `nisfdin` — Nikahsira, Sakinaa; alternates Mithaqun, Nonglem). RDAP checks are point-in-time, not a purchase. Assumptions A1–A3 stay as written in the brief/PRD.

## Design Paradigm

**Hexagonal modular monolith.** One API *product* from one image: `api` + `worker` process roles (AD-1), plus an in-region `web` role (AD-4). Each capability is a module with `domain` + `application` + inbound/outbound **ports**; vendor I/O lives only in **adapters**. The Next.js/Capacitor clients are a single UI shell that talks HTTP+WebSocket — they do not own invariants.

| Layer | Lives in |
| --- | --- |
| UI shell | `apps/web` (Next.js PWA) + `apps/android` (Capacitor wrapper) |
| Inbound adapters | `apps/api` HTTP/WS controllers, webhook receivers |
| Application + domain | `modules/<name>/{application,domain}` |
| Outbound adapters | `modules/<name>/adapters/*` (SMS, KYC, moderation vendors, S3, mobile-money) |
| Shared kernel | `packages/kernel` (IDs, error envelope, auth context, clocks) |

## Invariants & Rules

### AD-1 — Hexagonal modular monolith

- **Binds:** all
- **Prevents:** a microservice mesh at Burkina-launch scale, or a layered dump with no vendor ports
- **Rule:** ship one API *product*. Two process roles from the **same image**: `api` (HTTP/WS) and `worker` (BullMQ processors). Modules contribute queue processors; they do not deploy their own queues or extra Deployments. A third in-region `web` role is AD-4. No per-module microservice

### AD-2 — Dependency direction

- **Binds:** all
- **Prevents:** circular module imports, domain depending on Nest/Next, billing outage leaking into safety paths
- **Rule:** `clients → inbound adapters → application → domain`; modules call other modules only through published application ports, never tables; domain never imports adapters or frameworks. Identity, verification, media, moderation, mahram, report, block, and sister-invite paths must not import or call `BillingPort` (including `isEntitled`). Brother Invite quota and paid-faster-review may call `BillingPort.isEntitled` only

```mermaid
flowchart TB
  web[apps/web]
  android[apps/android]
  http[HTTP_WS_adapters]
  web --> http
  android --> http
  http --> app[application_ports]
  app --> domain[module_domains]
  app --> ports[outbound_ports]
  ports --> sms[SmsAdapter]
  ports --> kyc[KycAdapter]
  ports --> mod[ModerationAdapter]
  ports --> pay[MobileMoneyAdapter]
  ports --> obj[ObjectStorageAdapter]
  pay -.->|must not block| app
```

### AD-3 — Single entity ownership

- **Binds:** all modules
- **Prevents:** two writers of one entity (Profile, Message, PhotoGrant, Payment, Case)
- **Rule:** the owning module is the only writer; others store foreign keys and read through the owner's port

| Entity | Owner |
| --- | --- |
| account, credential, session, pin_lock, cookie_consent | identity |
| verification_record | verification |
| profile, profile_field, completeness | profiles |
| favourite, profile_visit | discovery |
| likeness_grant | media |
| invite, message_flash, invite_quota | invites |
| conversation, message, reaction, taaruf_stage, contact_share | chat |
| photo_asset, derivative, signed_grant, reveal_grant | media |
| moderation_job, hold_queue | moderation |
| mahram_invite, mahram_link, mahram_permission | mahram |
| report, moderation_case, strike, sanction, ban, appeal, block, fingerprint | trust |
| marriage_report, consent_story, marriage_counter | outcomes |
| pack, payment, entitlement, webhook_receipt | billing |
| article, board_member, locale_string, audio_asset, ice_breaker_template | content |
| operator_config, cil_ticket | operator |
| notification, sms_dispatch | notifications |
| audit_event | audit |

### AD-4 — One shared web UI plus Capacitor Android

- **Binds:** FR-132, FR-133, FR-134, FR-135, FR-020, FR-061, NFR-005
- **Prevents:** a second UI (RN/Expo or Flutter) or a TWA-only shell that cannot set `FLAG_SECURE` or reliable FCM/camera
- **Rule:** all member/mahram/moderator/operator screens ship from `apps/web`. That `web` process role runs **in `fr-par` on Kapsule** (Next.js Node). It must not import `modules/*/domain`. Vercel, Netlify, and any USA edge host are rejected for Member traffic (same reason as AD-5). Play listing is `apps/android` Capacitor wrapping the same origin; iOS is the same Capacitor project later. Installable PWA is that same origin

### AD-5 — Primary hosting Scaleway Paris `[ASSUMPTION — legal review]`

- **Binds:** A3, FR-120, NFR-002
- **Prevents:** silent USA-default hosting (Farata DPA lists Vercel/Neon USA as processors — Offered (seen) (legal text)) and an un-disclosed region
- **Rule:** primary region is Scaleway `fr-par` (Paris, France). Public privacy page discloses in French: « Données hébergées en région Île-de-France (France), prestataire Scaleway ». CIL filing for this cross-border transfer is a launch gate. A3 text is not rewritten. Stack stays portable (AD-6) so the same containers can move in-country if CIL requires. Compared and rejected as primary: Virtix Ouaga colo (no managed PG/Redis/S3; gov cloud is admin-only); Lagos colo (still a transfer; no hyperscaler); AWS `af-south-1` / Azure-GCP Johannesburg (higher Ouaga latency, weaker FR legal fit). Hyperscaler alt if Scaleway is blocked: AWS `eu-west-3` Paris, same disclosure pattern

### AD-6 — Portable substrate

- **Binds:** AD-5, NFR-004, NFR-008
- **Prevents:** lock-in to a vendor-only datastore that cannot move to Burkina colo
- **Rule:** OCI containers on Kubernetes; standard PostgreSQL; S3-compatible object storage; Redis (or Valkey-compatible) for queue/cache/pubsub; secrets in a secrets manager, never in images

### AD-7 — API style, versioning, errors, idempotency

- **Binds:** all HTTP/WS surfaces, FR-107, NFR-001
- **Prevents:** ad-hoc error shapes, unversioned breaks, double-charging
- **Rule:** JSON REST under `/v1`; breaking changes go to `/v2`; WebSocket `/v1/realtime`. Auth: httpOnly session cookie on web/PWA; Bearer session token on Capacitor. Only error envelope: `{ "error": { "code", "message", "details", "request_id", "retryable" } }`. `Idempotency-Key` required on payment create and all webhook ingest. Webhooks: verify signature; reject timestamps older than 600s; persist `webhook_receipt` 30 days

### AD-8 — Authn and RBAC

- **Binds:** NFR-001, FR-001–FR-008, FR-020, FR-071–FR-079, FR-139–FR-143
- **Prevents:** role/gender confusion, shared staff logins, Mahram acting as a Member
- **Rule:** roles are `member | mahram | moderator | operator | system`. Sister/Brother is a Member attribute, not a role. Google OIDC is an additional method, never the only path. Apple Sign-In ships with iOS. Staff accounts are individual (`session.kind=staff`); staff MFA is required; a staff account must not share a session with `member` (operator-as-member forbidden). `system` is worker/service accounts only and must not mint reveal URLs. PIN lock is enforced by identity for shared-device sessions. Ban, password change, and Mahram remove call `IdentityPort.revokeSessions`. Product age gate is **19+** (A1, unchanged). `operator_config.min_age` defaults to 19; do not ship 18 without counsel. If counsel requires 18+, add 18–21 protections — do not silently lower the gate

### AD-9 — Server-side Blur and Reveal

- **Binds:** FR-056–FR-061, FR-052, FR-093, NFR-001
- **Prevents:** shipping originals to unauthorized viewers, a second client-side blur path, or a grant model that is not per-viewer
- **Rule:** blur-by-default at ingest for opposite-gender viewers. Sister and Brother owners choose per-viewer policy `on_accept | on_request | never` (no unmatched clear-face on the grid). Only `MediaPort.sign(assetId, derivative, viewerId)` may mint a URL, and that URL is a capability token to the **media GET gateway** (not a raw bucket pre-sign). The gateway re-checks grant + denylist on every GET — that is how FR-059 stops **serving** a clear URL within 60s. `signed_url_ttl_seconds` is capped at 60. `MediaPort.sign` refuses `original` and any clear derivative (`md` included) unless a live reveal grant exists for that viewer. HTTP/WS serializers never emit `original_key`. Account/photo erase includes object-storage versions. No CSS-only or client-decode blur. Moderator unblur is an audited media grant. Android Capacitor sets `FLAG_SECURE` as deterrence (not a guarantee). Marketing/social reuse of a likeness requires a `likeness_grant` (per-use, expires with the campaign); cookie consent is not that grant

### AD-10 — Moderation pipeline and message state

- **Binds:** FR-062–FR-070, FR-083–FR-093, FR-140, NFR-003
- **Prevents:** fail-open delivery, vendor lock-in, two conflicting state machines
- **Rule:** every outbound item is created `pending` and becomes `delivered | held | blocked` only after the pipeline: Chat text, Message Flash (same state machine as Chat text), Chat Photo, Voice note, Profile Photo, and bio. “Continuously” on this spine means every outbound item before delivery, not a historical re-scan (a post-delivery scanner needs a new AD). Outcomes: `block`, `hold`, `blur-and-warn` (photos only). AI 5xx, timeout (>10s text / >30s media), or empty/malformed `ModerationPort` response → `hold`. Worker crash after vendor allow and before state write retries; default remains `pending`. Providers sit behind `ModerationPort` (`scanText`, `scanImage`, `transcribe`, `classifyAudio`). Image scan treats visible phone/QR as contact-share content. **Apply path:** moderation writes `moderation_job` + `hold_queue` only; the owning module applies the outcome via `ChatPort.applyModeration`, `MediaPort.applyModeration`, or `ProfilePort.applyModeration`. `blur-and-warn` maps to `delivered` plus a blur derivative (never original bytes). Human review is per-item (no bulk-allow). Threshold changes apply to **subsequent** items only. Human review queue SLA is read from `operator_config`, not code. A paid-faster-review perk shortens queue position only — it must not auto-allow. Member Reports open a `moderation_case` written only by trust; holds attach to that case by FK. Discovery omits `pending`/`held` profile photos

```mermaid
stateDiagram-v2
  [*] --> pending: send_or_upload
  pending --> delivered: allow
  pending --> held: low_confidence_or_ai_down_or_policy
  pending --> blocked: block
  held --> delivered: human_allow
  held --> blocked: human_block
  delivered --> [*]
  blocked --> [*]
```

### AD-11 — Mooré and Dioula honesty

- **Binds:** FR-064, FR-010, FR-070, FR-138, NFR-003, NFR-007
- **Prevents:** claiming ASR or classifier coverage providers do not have
- **Rule:** official Whisper `LANGUAGES` has no `mos`/`dyu`. Community/Preview models (Griot-ASR Preview, BurkimbIA fine-tunes) may be adapters but are treated as low-confidence. Local-language path = moderator-maintained lexicon lists + hold-for-human when confidence is below `operator_config.hold_threshold` or language is `mos`/`dyu`. Measure false-negative rate on a labeled sample. French commercial ASR is allowed only for `fr`

### AD-12 — Mahram read access and permissions `[ADOPTED]`

- **Binds:** FR-071–FR-079, FR-038, A2, D38
- **Prevents:** Mahram browsing, sending as the Sister, or retaining access after removal
- **Rule:** Sister-initiated only. After OTP, a 1-hour cooling-off applies before pause/end (A2 working number). After confirm, Mahram has read-all of **delivered** messages on the attached conversation(s) only — not `pending` or `held` (those stay on the staff queue). Actions: flag/escalate/pause/end. Cannot compose or send as the Sister; cannot browse or Invite. Sister remove/report (D38) revokes read access within 60s and may call `ProfilePort.emergencyHide` (24h). Relationship enum `father | brother | uncle | other_mahram`; unmatched-friend rejected. No kinship documents in MVP. All attach/remove/pause/end/flag events are audited

### AD-13 — Verification ports, independent of Premium `[ADOPTED]`

- **Binds:** FR-002, FR-014, FR-015, FR-078, FR-091, FR-105, D13
- **Prevents:** paywalled KYC or hard-wired vendor SDKs in domain
- **Rule:** `VerificationPort` exposes `sendOtp`, `verifyOtp`, `liveness`, `idDocument`. Verification is free and is not an entitlement check. Public visibility is written only by `ProfilePort.setVisibility` after OTP + liveness + ID + human review. Liveness is matched to Profile Photos. Suspected-minor hold (D39): verification writes the hold record; profiles applies `visibility=held` via that port — ID badge is not a UI guess and is not marital-status proof (AD-26)

### AD-14 — Mobile-money payments, no silent auto-renew

- **Binds:** FR-104–FR-114, NFR-004
- **Prevents:** stored recurring mandates, processor-driven silent renew, payment outage taking down safety
- **Rule:** `MobileMoneyPort` methods for Orange Money BF, Moov Africa BF, Wave/Coris where available; cards secondary via **hosted checkout only** (PAN never touches `apps/api`); aggregator allowed. Packs are 1/3/6 months with an explicit end timestamp and **no** renewal job. Webhooks: verify signature, apply once via `Idempotency-Key`. Billing down → Free + safety stay up (AD-21)

### AD-15 — Realtime chat channel

- **Binds:** FR-050–FR-052, NFR-005
- **Prevents:** pushing undelivered media over a side channel
- **Rule:** Socket.IO with Redis adapter on `/v1/realtime`. Handshake must present the same `AuthContext` as HTTP (cookie or Bearer). Events: `conversation.typing`, `message.pending`, `message.delivered`, `message.held`, `message.blocked`, `mahram.presence`, `reveal.changed`, `stage.changed`. Recipients never receive media bytes until `message.state=delivered`; any media URL on the socket is still minted only by `MediaPort.sign`. Long-poll fallback on broken WS (2G). No live 1:1 audio/video channel in this spine (khalwa; LATER even with Mahram)

### AD-16 — Lite mode, derivatives, SMS fallback

- **Binds:** FR-136, FR-052, FR-053, FR-055, NFR-005
- **Prevents:** unbounded payloads on 2G and a missing essential-path when data dies
- **Rule:** Lite default on Slow-3G or **1GB-class** devices / ~1GB/month data-saver (brief/PRD class): deferred images, derivatives `xs | sm | md | blur`, no autoplay, offline text outbox (media waits for connection + moderation). First-grid metadata+blur thumbs ≤150KB; chat first page ≤80KB. `SmsPort` for OTP, Invite-received, Mahram pause/end/flag, blocking outcomes — one live SMS adapter at a time. `UssdPort` exists and stays disabled until FR-055. Push: FCM on Capacitor Android; Web Push on PWA/web — both thumbs via `MediaPort.sign` blur derivatives only

### AD-17 — Security baseline

- **Binds:** NFR-001, FR-007, FR-068, FR-088
- **Prevents:** reversible passwords, staff bulk export, contact-share implemented twice
- **Rule:** TLS 1.2+; AES-256-class at rest for photos, chat bodies, ID images, backups (same `kid` rotation as chat for ID-image keys). Chat ciphertext envelope `{v, alg, kid, iv, ct}` with `kid` in Scaleway Secret Manager (yearly rotation; session-signing, webhook HMAC, object-storage, and vendor API keys rotate on the same store, isolated per env). argon2id passwords. Web/PWA cookie is `Secure` + `HttpOnly` + `SameSite=Lax` plus CSRF on cookie POST/WS. Capacitor Bearer lives in platform secure storage, not WebView localStorage. Captcha (FR-007) on signup and login. Rate limits on auth, OTP, password-reset, Invite, Mahram-invite, Report, payment, media upload, reveal-request, browse, and `/v1/staff/*` (working numbers in `operator_config`). Contact-share is the **single** predicate: only chat writes `contact_share`; moderation/trust call `ChatPort.contactShareOpen`. Money-ask language is held or blocked even after Contact-share. Ban fingerprint is `sha256(phone_e164 | id_doc_hash | device_attestation)` owned by trust — a cookie-only id is not a Ban key. Staff list/browse/metrics endpoints never return phone or WhatsApp. The **only** staff path that emits another person’s contact is an `operator` `cil_ticket` for that subject (FR-019 / FR-143); every such export is an AD-18 event. Prod app SQL roles cannot `COPY`/`SELECT` contact columns in bulk

### AD-18 — Tamper-evident audit log

- **Binds:** NFR-009, FR-093, FR-085, FR-090, FR-139–FR-143, FR-067
- **Prevents:** mutable “logs” that two teams format differently, or a WORM claim a DBA can undo
- **Rule:** `audit` module owns append-only `audit_event` (application hash-chain). This is tamper-evident at the app layer, not object-lock WORM. The audit DB role is `INSERT` + `SELECT` only (`UPDATE`/`DELETE` revoked). Nightly chain-verify job; hash copies may go to versioned object storage. `payload` stores ids + action + reason — never phones or original photo bytes. Mandatory events: moderator unblur, sanctions, appeals, operator threshold/price changes, deletion/CIL completions, fail-closed incidents, mahram attach/remove/pause/end, reveal grant/revoke, payment webhook apply, marriage dual-confirm, consent-story publish or refuse, subject-access export. Retain ≥12 months. Individual staff attribution

### AD-19 — Privacy, CIL, retention

- **Binds:** A3, FR-019, FR-060, FR-119, FR-120, FR-143, NFR-002, NFR-008
- **Prevents:** invented statute details and copied Farata retention
- **Rule:** statute is Loi n°001-2021/AN (verified). Foreign hosting is a transfer under arts 42–44: CIL authorisation + confidentiality/reversibility + encryption before launch. Hosting location is public (AD-5). GDPR-grade contracts are a counsel fact pattern — they do **not** satisfy art. 42 by themselves. Filing inputs (not extra invented articles): religious fields `madhhab`/`practice` need express consent (art. 12); liveness + ID images are biometric-class treatments listed with foreign transfers under art. 31; every outbound Chat item is model-scored (counsel maps the art. 31 AI/profiling bullet); destinataires include SMS, KYC, moderation/ASR, and mobile-money vendors, not only Scaleway. Cookie consent never grants photo reuse (likeness reuse is AD-9 `likeness_grant`). Coarse geo (city; quartier hidden until accepted Invite). Delete/export is owner-only via `IdentityPort.deleteAccount` / `exportAccount` plus an `operator` `cil_ticket` status page — staff must not run a bulk contact export (AD-17). Erase includes object-storage versions. NFR-002 breach notice to Members and CIL is a product SLA of 72h (not pinned to a fabricated article). NFR-008 working clocks stay `[ASSUMPTION]` (erase ≤30d, export ≤72h, chat ≤18 months after close unless hold; payments per OHADA/tax counsel)

### AD-20 — Environments, CI/CD, observability, DR

- **Binds:** NFR-004, launch ops
- **Prevents:** one shared prod/staging database, unobserved fail-closed, unrestorable backups
- **Rule:** isolated `dev | staging | prod`. IaC is OpenTofu in `infra/` targeting Scaleway `fr-par`. CI host is GitHub Actions (lint, types, unit, integration, migration check). CD: staging auto; prod manual approve. Secrets live in Scaleway Secret Manager (or any in-region secrets manager — never images/git). Observability is OpenTelemetry into an in-region stack (logs/traces/metrics); vendor SKU may change, the OTel contract must not. Metrics include moderation latency, fail-closed count, report SLA, webhook lag, dual-confirmed marriages (internal; public counter is AD-25). PG PITR (daily + WAL); object-storage versioning; quarterly restore drill. Launch assumption: 10k MAU BF, single-region, 2 `api` + 1 `worker` + 1 `web` replica, PG primary + 1 replica. Drizzle Kit is the only migration runner

### AD-21 — Billing isolation from safety

- **Binds:** FR-105, FR-110, NFR-004
- **Prevents:** a payment-adapter outage disabling verification, blur, mahram, report, block, or sister invites
- **Rule:** entitlements are read only through `BillingPort.isEntitled`, which returns `true | false | unavailable` and must not throw into a safety handler. Verification, Blur/Reveal, Mahram, Report, Block, and Sister-initiated Invites are **not** entitlement checks — they must succeed when billing is down, `unavailable`, **or** the caller has no pack. Brother daily Invite quota and paid-faster-review may read `isEntitled`. Stale-closed cache must not disable Free/safety. A paid perk must not skip moderation (AD-10)

### AD-22 — Open PRD questions stay open

- **Binds:** PRD §16 questions 1–11 and the NFR-008 retention clocks (PRD §16 item 12)
- **Prevents:** silently closing product/legal questions in code defaults that cannot change
- **Rule:** each open question is a config flag, policy-table row, or disabled port (see SOLUTION-DESIGN.md). Builders must not bake a closed answer into schema enums unless the PRD already locked the enum. Retention clocks stay `[ASSUMPTION]` until counsel replaces them (AD-19)

### AD-23 — Cross-module commands

- **Binds:** invites, chat, mahram, profiles, discovery, media, notifications, moderation
- **Prevents:** two modules inserting the same aggregate (conversation born twice; hide implemented twice)
- **Rule:** only `ChatPort.openFromInvite(inviteId)` inserts `conversation`, and only when the Sister accepted or she sent the Invite. Decline creates no conversation and no resend. `chat` refuses messages without that conversation FK. Only `ChatPort.closeFromMarriage` or Mahram/Moderator `end` closes a conversation (outcomes never INSERT/DELETE conversation). Only chat inserts `contact_share` (`taaruf_stage` must not encode contact-share). Mahram emergency-hide calls `ProfilePort.emergencyHide(sisterId, 24h)` — discovery reads `profile.visibility` only. Notifications persist asset ids and call `MediaPort.sign` for thumbs. Daily Invite quotas: Brothers from `operator_config`; Sisters unlimited and never an entitlement check. Quotas reset on the `Africa/Ouagadougou` civil day, not UTC. Stage enum on `conversation` is `invite | chat | meeting | married` only

### AD-24 — Accessibility and low-literacy floor

- **Binds:** NFR-006, FR-010, FR-070, apps/web
- **Prevents:** one feature shipping 32px targets or text-only photo rules
- **Rule:** primary flows meet WCAG 2.1 AA on the French UI; touch targets ≥44px on Android/PWA primary path; photo rules and onboarding remain completable via pictogram + audio without a paragraph of text. Member-facing copy (including FR-117 SEO and FR-137 UI) uses *mariage / ta'aruf / nikah / khitba* only — *dating* and *rencontre romantique* are forbidden in shipped strings, not only in i18n key names

### AD-25 — Dual-confirm marriage outcomes

- **Binds:** FR-095–FR-101, D11, D12
- **Prevents:** one-sided “we got married,” a rounded public counter, or a content writer publishing a story without both consents
- **Rule:** `marriage_counter` increments by 1 only after both named spouses confirm the same `marriage_report`. Optional nikah proof stays private (never a public URL). `consent_story` goes public only if both spouses (and the extra family-ok flag if set) consent; either refuse keeps the showcase empty of their faces. Counter starts at 0. Public metrics are proof-backed only — no DAU or invented member counts on the public surface. `content` must not write `marriage_counter` or auto-publish `consent_story`

### AD-26 — Marital honesty on the Invite surface

- **Binds:** FR-037, D14, invites, profiles, verification
- **Prevents:** accept-without-disclosure, or treating an ID badge as proof of marital status
- **Rule:** `marital_status` and (for Brothers who are `married`) `polygamy_intent` are required Profile fields and are readable on the Invite decision surface **before** Sister accept. Verification badges must not be copied as marital-status proof. First-wife notification stays unbuilt unless AD-22 / OQ-1 flips

## Consistency Conventions

| Concern | Convention |
| --- | --- |
| Naming | Modules kebab-case dirs; entities snake_case tables; events `domain.action`; FR/NFR/AD ids stable and cited |
| IDs | UUID v7 generated in `packages/kernel` (host managed PG 17 has no native `uuidv7`); prefix optional in APIs (`acc_`, `msg_`, `pay_`) |
| Time | UTC ISO-8601 in APIs and DB; display in `Africa/Ouagadougou`; quota and quiet-hours windows use that civil day |
| Locale | `fr` default UI; audio keys `mos`, `dyu`; rendered Member/SEO/store/audio strings use *mariage / ta'aruf / nikah / khitba* only (AD-24) |
| Errors | AD-7 envelope only; `code` is machine (`CONTACT_SHARE_REQUIRED`, `MODERATION_HELD`, `PAY_UNAVAILABLE`) |
| Auth context | `AuthContext { accountId, roles[], gender?, mahramWardId? }` set by identity; downstream trusts it, does not re-parse tokens |
| Mutation | Commands in the owning module via AD-23 ports; no cross-module SQL writes |
| Config | Required `operator_config` keys: `hold_threshold`, `free_review_sla_hours`, `report_sla_hours`, `photo_strike_count`, `photo_strike_block_hours`, `brother_invite_quota_free`, `brother_invite_quota_premium`, `signed_url_ttl_seconds` (max 60), `pack_prices_xof`, `min_age`, `rl_auth_per_min`, `rl_otp_per_hour`, `rl_invite_per_day`, `rl_report_per_hour`, `rl_pay_per_min`, `rl_browse_per_min`. Types: number unless `_xof` is integer XOF. Audited on change |
| Feature flags | `gif_picker`, `ussd`, `anonymous_mode`, `ios_apple_signin`, `who_favourited_me`, `visitors_list`, `online_now`, `boosts`, extra payment methods. Member-facing who-favourited / visitors / online-now / boosts stay **off** until their NEXT FR ships. `profile_visit` reads for T&S remain on |
| Evidence | Farata statements keep labels Offered (seen) / Claimed (marketing) / Not publicly evidenced |

## Stack

Verified 2026-09-27 against npm registry, endoflife.date APIs, vendor docs, and official Whisper sources.

| Name | Version |
| --- | --- |
| Node.js (Active LTS) | 24.21.0 |
| TypeScript | 7.0.2 |
| Next.js | 16.3.6 |
| React | 19.3.0 |
| NestJS (@nestjs/core) | 12.1.0 |
| Capacitor (@capacitor/core) | 8.5.2 |
| Drizzle ORM | 0.45.3 |
| PostgreSQL (Scaleway managed) | 17.11 |
| Redis (Scaleway managed) | 8.6.3 |
| BullMQ | 6.3.9 |
| Socket.IO | 4.8.4 |
| Tailwind CSS | 4.3.3 |
| Hosting (primary) | Scaleway fr-par (Kapsule + managed PG + Redis + Object Storage) |

Greenfield contract (do not inherit vanilla CLI defaults): monorepo template owns lint/test/module system. `apps/api` is ESM. One linter for the repo (oxlint). Nest tests are Vitest. Next may use Turbopack. TypeScript pin is 7.0.2 (ignore Nest schematic “TypeScript 6”). Next.js 16.3.6 is current as of 2026-09-27; do not scaffold below 16.3.7 after 2026-09-30. Node 24.21.0 Active LTS (revisit 24-maintenance vs 26-LTS if first prod cut is after 2026-10-28).

## Structural Seed

```text
repo/
  apps/web/                 # Next.js App Router — member, mahram, moderator, operator, PWA
  apps/android/             # Capacitor shell (Play); FLAG_SECURE, FCM, camera, mic
  apps/api/                 # NestJS inbound adapters (HTTP, WS, webhooks)
  modules/
    identity/ verification/ profiles/ discovery/ invites/
    chat/ media/ moderation/ mahram/ trust/ outcomes/
    billing/ content/ operator/ notifications/ audit/
  packages/kernel/          # IDs, envelope, AuthContext, clocks
  packages/ports/           # shared port types
  infra/                    # Terraform/OpenTofu: k8s, PG, Redis, bucket, secrets
```

```mermaid
erDiagram
  ACCOUNT ||--o| PROFILE : owns
  ACCOUNT ||--o{ VERIFICATION_RECORD : has
  ACCOUNT ||--o{ SESSION : opens
  PROFILE ||--o{ PHOTO_ASSET : shows
  PHOTO_ASSET ||--o{ DERIVATIVE : has
  PHOTO_ASSET ||--o{ REVEAL_GRANT : grants
  ACCOUNT ||--o{ INVITE : sends
  INVITE ||--o| CONVERSATION : opens_after_sister_consent
  CONVERSATION ||--o{ MESSAGE : contains
  CONVERSATION ||--o| CONTACT_SHARE : may_unlock
  CONVERSATION ||--o{ MAHRAM_LINK : watched_by
  ACCOUNT ||--o{ MAHRAM_LINK : as_guardian
  MESSAGE ||--o| MODERATION_JOB : scanned_by
  ACCOUNT ||--o{ REPORT : files
  REPORT ||--o| MODERATION_CASE : opens
  ACCOUNT ||--o{ STRIKE : receives
  ACCOUNT ||--o{ SANCTION : under
  ACCOUNT ||--o{ PAYMENT : pays
  PAYMENT ||--o| ENTITLEMENT : grants
  CONVERSATION ||--o| MARRIAGE_REPORT : may_close
  ACCOUNT ||--o{ AUDIT_EVENT : attributed
```

```mermaid
flowchart LR
  subgraph clients
    W[Web_PWA]
    A[Android_Capacitor]
  end
  subgraph fr_par[Scaleway_fr-par]
    LB[Load_balancer]
    WEB[web_replicas]
    API[API_replicas]
    WK[worker_replicas]
    MG[media_GET_gateway]
    PG[(PostgreSQL)]
    RD[(Redis)]
    S3[Object_Storage]
  end
  SMS[SMS_gateway]
  KYC[KYC_vendor]
  AI[Moderation_vendors]
  MM[Mobile_money_aggregator]
  W --> LB
  A --> LB
  LB --> WEB
  LB --> API
  LB --> MG
  API --> PG
  API --> RD
  API --> S3
  MG --> PG
  MG --> S3
  WK --> PG
  WK --> RD
  WK --> S3
  API --> SMS
  API --> KYC
  WK --> AI
  API --> MM
```

## Capability → Architecture Map

| Capability / Area | Lives in | Governed by |
| --- | --- | --- |
| Identity / account / PIN / Google / cookies | identity | AD-8, AD-17 |
| Phone OTP, liveness, ID | verification | AD-13 |
| Profiles, fields, completeness, emergency hide | profiles | AD-3, AD-23, AD-26 |
| Browse, filters, favourites, visits | discovery | AD-16, AD-23 |
| Invites, quotas, Message Flash | invites | AD-23, AD-21, AD-26 |
| Chat, stages, reactions, contact-share | chat | AD-15, AD-10, AD-23 |
| Media, derivatives, Reveal, signed URLs, likeness | media | AD-9 |
| Pre-delivery scan, hold queue | moderation | AD-10, AD-11, AD-17 |
| Mahram invite / read / pause | mahram | AD-12, AD-23 |
| Report, case, strike, ban, appeal, block | trust | AD-10, AD-18, AD-17 |
| Marriage report, story, counter | outcomes | AD-25, AD-18 |
| Packs, payments, entitlements | billing | AD-14, AD-21 |
| Académie, board, FR copy, audio | content | AD-22, AD-24 |
| Operator config, CIL tickets | operator | AD-19, AD-20 |
| Push + SMS | notifications | AD-16, AD-9 |
| Audit log | audit | AD-18 |
| A11y / low-literacy floor | apps/web | AD-24 |

## Deferred

- Native iOS shell and Apple Sign-In (FR-004, FR-135) — same Capacitor project; not a new paradigm
- USSD adapter enabled (FR-055) — port exists, flag off until operator cost is known
- Specific KYC / SMS / moderation / aggregator SKUs — ports only; **one live adapter per port** chosen at implementation (identity OTP and notifications SMS share `SmsPort`; they must not pick two vendors)
- Redis vs Valkey if counsel rejects Redis 8 tri-license (managed engine today is 8.6.3, not upstream 8.10)
- Scaleway managed PostgreSQL 18 (planned Q4 2026) — stay on 17.11 until the host lists 18
- Dual-control moderator unblur (D31 NEXT) — MVP is audited single-control
- Watermark / no-download polish (FR-061 NEXT) — gateway revoke + blurred thumbs + FLAG_SECURE ship now
- Multi-region active-active and in-country move — portable substrate ready; not launched
- Product name, domains, trademarks — branding tokens, not schema
- Exact Premium XOF prices and free-review hours — `operator_config`
- Live 1:1 A/V (LATER, khalwa)
- Full English/Arabic UI (LATER)
