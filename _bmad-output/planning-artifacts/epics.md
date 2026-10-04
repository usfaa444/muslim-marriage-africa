---
status: ready for development
stepsCompleted:
  - step-01-validate-prerequisites
  - step-02-design-epics
  - step-03-create-stories
  - step-04-final-validation
recommendedNextSkill: bmad-help
inputDocuments:
  - _bmad-output/planning-artifacts/briefs/brief-muslim-marriage-africa-2026-09-27/brief.md
  - _bmad-output/planning-artifacts/prds/prd-muslim-marriage-africa-2026-09-27/prd.md
  - _bmad-output/planning-artifacts/prds/prd-muslim-marriage-africa-2026-09-27/addendum.md
  - _bmad-output/planning-artifacts/architecture/architecture-muslim-marriage-africa-2026-09-27/ARCHITECTURE-SPINE.md
  - _bmad-output/planning-artifacts/architecture/architecture-muslim-marriage-africa-2026-09-27/SOLUTION-DESIGN.md
  - _bmad-output/planning-artifacts/ux-designs/ux-muslim-marriage-africa-2026-10-01/DESIGN.md
  - _bmad-output/planning-artifacts/ux-designs/ux-muslim-marriage-africa-2026-10-01/EXPERIENCE.md
excludedDocuments:
  - superseded architecture and PRD reviews that still describe pre-delivery holds or fail-closed Chat
lockedDecisions:
  - AI moderation is PASSIVE. Chat text, Chat Photos, Voice notes, and Message Flash are delivered as soon as stored. AI only flags an admin (FR-062, FR-063, FR-064, FR-066, FR-067, FR-144, NFR-003, AD-10, AD-11).
  - No story may implement a pre-delivery hold, a pending-moderation or held chat state, an unsend, or an AI auto-suspend.
  - Profile photo and bio stay unpublished until reviewed (FR-065).
  - Blur/reveal is server-side (AD-9).
  - Mahram is read-only on granted threads only (AD-12).
  - Contact-share still blocks phone numbers, WhatsApp, and links until both opt in (FR-068); that is not an AI hold.
  - Product name is AnKanu. Domain ankanu.com was purchased on Hostinger (2026-10-03). Repo slug muslim-marriage-africa is not the product name. Shortlist names were not chosen and those domains were not bought. A1–A3 and the other open questions stay open.
  - Sister reach is operator-configurable on day one (`operator_config.sister_reach_mode`: `free_unlimited` DEFAULT | `same_quota_as_brothers`). Both values ship. Safety (verification, blur/reveal, mahram attach, report, block) stays free in both modes and must not call BillingPort. Chat send may call `BillingPort.isEntitled` only to decide FR-146. Brothers stay on the paid Invite quota (Free 3 `[ASSUMPTION]`). No brother-free mode. Locked Maitchibi Fayçal, 2026-10-02 (FR-044, FR-045, FR-105, FR-145, FR-146, AD-21, AD-27, AD-29). Historical note: “Chat after accept stay free … must not call BillingPort” is superseded 2026-10-02 for message volume. Safety still must not call BillingPort.
  - Discover and every people list default to one focused card. Grid is optional via a toggle on Discover and Search. Pass is dismiss, not a like. Dishonest chrome stays rejected (online now, +247.8k). A one-at-a-time card is not a rejected dating pattern. Locked Maitchibi Fayçal, 2026-10-02 (FR-024, FR-025, AD-28).
  - Free-tier messages are daily-capped by `operator_config.daily_message_cap` (seed 10 is `[ASSUMPTION — admin-configurable, not a product lock]`). Premium = unlimited Invites AND unlimited messages. There is no Premium Invite cap of 15. Sisters in `free_unlimited` still have message caps unless Premium. Sister checkout exists in BOTH `sister_reach_mode` values. Over-cap send is rejected (`MESSAGE_CAP_EXCEEDED`), not stored, not held. Allowed sends still deliver immediately (AD-10). Locked Maitchibi Fayçal, 2026-10-02 (FR-044, FR-050, FR-051, FR-105, FR-110, FR-146, AD-14, AD-21, AD-23, AD-29).
  - After Mahram confirm the grant list is empty. Sister grants individual Brother threads. Revoke one. Remove/report revokes every grant. He cannot send as her. Read-only on granted delivered messages. New chats are not auto-granted. Flash before accept is not grantable (grant needs a conversation). Locked Maitchibi Fayçal, 2026-10-02 (FR-074, FR-076, FR-077, AD-12).
---

# AnKanu — Epic Breakdown

Repo slug: muslim-marriage-africa. Product name: AnKanu.

## Overview

This document provides the complete epic and story breakdown for muslim-marriage-africa, decomposing the requirements from the PRD, UX Design if it exists, and Architecture requirements into implementable stories.

Product name **AnKanu**. Domain **ankanu.com** purchased on Hostinger (2026-10-03). Repo slug muslim-marriage-africa is not the product name. This file is the build index. Sprint planning is a later skill.

Entity fields, nullability, and relationships: [SOLUTION-DESIGN.md §6 Entity catalog](architecture/architecture-muslim-marriage-africa-2026-09-27/SOLUTION-DESIGN.md). Spine AD-3 is ownership only.

## Requirements Inventory

### Functional Requirements

Horizon is MVP unless marked **NEXT** or **LATER**. Full acceptance criteria live in [prd.md §4](prds/prd-muslim-marriage-africa-2026-09-27/prd.md).

**Identity, account, and onboarding (prd.md §4.1)**

- FR-001: Create account with email, password, unique pseudonym, and gender (Sister/Brother). Profile is not publicly visible until review + verification succeed.
- FR-002: Phone OTP before public visibility.
- FR-003: Google sign-in as an additional method, never the only path in Burkina.
- FR-004: Apple sign-in — **NEXT** (ships with native iOS).
- FR-005: Sincerity pledge at signup; reaffirmation if entertainment-browsing heuristics fire.
- FR-006: Email verification with expiry and resend.
- FR-007: Captcha / bot check on signup and login; rate-limit credential stuffing.
- FR-008: Password reset and remember-me; reset invalidates old sessions.
- FR-009: Guided onboarding splits minimum-to-browse from complete-to-send-Invite; Mooré/Dioula audio on hard steps.
- FR-010: Audio onboarding prompts for onboarding, photo rules, and no-auto-renew pricing.
- FR-011: Age gate 19+ `[ASSUMPTION A1 — legal review stays open]`. Under-19 never publicly listed.
- FR-012: Human review of every new Profile before public visibility. Paid faster queue is not a rubber stamp.
- FR-013: Published free review SLA (working 24h Free). One number; SLA-breach visible to Operator.
- FR-014: ID document plus liveness selfie — free, separate from Premium; liveness matched to Profile Photos.
- FR-015: Verification levels on the Profile (phone / ID / Mahram). Premium must not look like identity verification.
- FR-016: Profile Photo required to send an Invite; Sisters may remain Blurred.
- FR-017: Edit Profile; Photo changes re-moderated before they replace the live Photo.
- FR-018: Deactivate and reactivate with named life-pauses (Ramadan, exams, travel, grief + free text).
- FR-019: Self-serve delete, export, status URL, real ticketing (not Gmail-only).
- FR-020: Shared-device PIN (background >60s; 5 fails → re-auth).

**Profiles and discovery (prd.md §4.2)**

- FR-021: Profile fields: age/DOB, city/country, origin, marital status, education, profession, practice, intentions, description, Photos.
- FR-022: Islamic criteria (core): madhhab, practice, intentions. Filterable.
- FR-023: Completeness meter names missing Islamic criteria without shaming.
- FR-024: People lists default to one focused card (Discover, Search, every list of people). Basic filters: location, marital status, religious criteria, life plans, distance (10/25/50/city-wide). Shared traits under the photo come only from existing Profile fields. Pass is dismiss, not a like. Invite and card quick message obey FR-044 / FR-045 and FR-146. Dishonest chrome (online now, invented counts) stays rejected.
- FR-025: Optional grid of cached opposite-gender visibility-approved Profiles behind a toggle on Discover and Search. Not the default people-list UI. A many-filter search may open on the grid; the card toggle remains.
- FR-026: Private favourites. No “who favourited me” in MVP.
- FR-027: Visit patterns for Moderators (mass-view-then-never-Invite). No member visitors list.
- FR-028: Ta'aruf stages `invite | chat | meeting | married`. Meeting is confirm-only in MVP (planner is NEXT).
- FR-029: Confrérie and hijra fields — **NEXT**.
- FR-030: Advanced filters tier — **NEXT**.
- FR-031: AI compatibility score — **NEXT**.
- FR-032: Daily recommendations that learn — **NEXT**.
- FR-033: Who favourited me — **NEXT**.
- FR-034: Member-facing visitors list — **NEXT**.
- FR-035: Online-now indicator — **NEXT**.
- FR-036: Anonymous mode — **NEXT**.
- FR-037: Marital-status honesty and polygamy intent visible to Sisters **before** accept. ID is not marital-status proof. First-wife notification stays unbuilt (OQ-1).

**Invites and matching (prd.md §4.3)**

- FR-038: Send an Invite to an eligible opposite-gender Member.
- FR-039: Accept or decline. Chat opens only with Sister consent (her send counts as consent).
- FR-040: Invite lists — sent, received, accepted.
- FR-041: Chat opens only after Sister consent. No thread on a pending Brother-sent Invite.
- FR-042: Quiet decline — no “she saw this,” no guilt timer.
- FR-043: No resend after refuse (unless she later initiates).
- FR-044: Daily Invite quota for Brothers (working 3 Free `[ASSUMPTION]`). Premium = unlimited Invites. There is no Premium Invite cap of 15. Reset on `Africa/Ouagadougou` civil day (AD-23 supersedes PRD UTC wording). Sisters follow FR-045 / `sister_reach_mode`. Message sends are FR-146, not this FR. No brother-free mode.
- FR-045: Sister Invite reach follows `sister_reach_mode` (`free_unlimited` DEFAULT | `same_quota_as_brothers`). Default: unlimited Invites; no pack required for reach. `same_quota_as_brothers`: same Free Invite cap (3 `[ASSUMPTION]`) and same 1/3/6 packs as Brothers. Premium Sisters have unlimited Invites. Safety stays free in both modes. Chat after accept is not unconditionally unlimited — Free-tier messages stay capped (FR-146) even in `free_unlimited` unless she has Premium.
- FR-046: Message Flash visible before accept; delivered immediately if under FR-146; later flag does not unsend. Over-cap Flash persists neither Invite nor Flash (`MESSAGE_CAP_EXCEEDED`).
- FR-047: Ice Breaker templates (deen/family); editable before send.
- FR-048: Message Flash is Mahram-visible only after a conversation exists AND that conversation is granted. Flash before accept is not grantable.
- FR-049: AI-personalised Ice Breakers — **NEXT**.

**Chat, Voice notes, and notifications (prd.md §4.4)**

- FR-050: Real-time Chat after open: typing, reactions, Photo share. An allowed send is delivered immediately and does not wait on AI. A Free sender at the FR-146 cap gets `MESSAGE_CAP_EXCEEDED`; nothing is stored or held.
- FR-051: Voice notes (FR/mos/dyu). An allowed Voice note is delivered immediately; STT + classifier run after. Not a safety paywall. Counts as a FR-146 message. Over-cap is not stored or held.
- FR-052: Push notifications (FCM + Web Push). Template + ids; Blurred thumbs; no Chat body, no phone.
- FR-053: SMS essential-path: OTP, Invite received, Mahram pause/end/flag, Contact-share rejects, admin suspend/Ban.
- FR-054: Curated GIFs / stickers — **NEXT**.
- FR-055: USSD essential path — **NEXT**.

**Photo privacy (prd.md §4.5)**

- FR-056: Blur by default for opposite-gender viewers. Server derivative, not CSS.
- FR-057: Per-viewer Reveal policy `on_accept | on_request | never` for Sisters and Brothers.
- FR-058: Reveal-on-request; one pending request per pair.
- FR-059: Revoke Reveal; gateway stops serving clear URL within 60s.
- FR-060: No marketing use of Profiles without per-use `likeness_grant`. Cookie consent is not that grant.
- FR-061: Anti-leak polish (watermark / no-download) — **NEXT**. FLAG_SECURE + blur thumbs ship in MVP.

**Passive AI moderation (prd.md §4.6) — LOCKED send-first**

- FR-062: Chat text delivered, then passively scanned. Later flag does not unsend.
- FR-063: Chat Photos delivered, then passively scanned. Blur remains privacy, not a moderation delivery outcome.
- FR-064: Voice notes delivered, then STT + audio classifier in background. Mooré/Dioula = word lists + human review; never a pre-delivery hold.
- FR-065: Profile Photos and bio unpublished until reviewed. Discovery omits unpublished photos. Previous allowed bio stays live if a new bio is blocked.
- FR-066: AI outcomes are `flag-for-admin` only (or clean). Not block, hold, or blur-and-warn as delivery outcomes. D6 Member policy must say delivered-then-scanned; AI flags a human and does not silently delete, block, or hold.
- FR-067: AI 5xx / timeout / low confidence records `scan-deferred` / `scan-failed` on the admin flag queue. Delivery already happened.
- FR-144: Admin flag queue of already-delivered items plus scan-deferred / scan-failed. Admin chooses warning, suspend, or another published action. AI never applies a sanction.
- FR-068: Contact-share blocks phone / WhatsApp / links until both opt in (deterministic matcher, not ModerationPort). Money-ask language is delivered and flagged; in-Chat education after delivery.
- FR-069: Photo Strike floor: 3 rejects → 24h upload block (`operator_config`).
- FR-070: Published photo rules with pictograms + Mooré/Dioula audio.

**Mahram (prd.md §4.7)**

- FR-071: Sister invites a Mahram by phone. Brother cannot attach. Mahram has no browse/Invite identity.
- FR-072: Mahram phone OTP + declared relationship `father | brother | uncle | other_mahram`. Unmatched-friend rejected. 1h cooling-off after OTP. No kinship documents.
- FR-073: Sister confirms; pending invite expires in 7 days.
- FR-074: After confirm the grant list is empty. Mahram reads only granted threads with an active `mahram_thread_grant` (`revoked_at IS NULL`). Delivered messages only, including Flash once a conversation exists and is granted. A later AI flag does not hide content. New Chats are not auto-granted.
- FR-075: Mahram can flag (priority case), pause (Brother cannot resume), or end (terminal) on a granted thread only. Flag / pause / end on an ungranted thread is rejected.
- FR-076: Mahram cannot compose or send as the Sister.
- FR-077: Sister can remove or Report the Mahram. Remove/report sets `revoked_at` on every active grant in the same unit of work (do not DELETE the rows); read access gone within 60s; optional 24h emergency hide. Revoke-one is Story 7.8.
- FR-078: Optional ID check → Verified-Mahram badge. No kinship document.
- FR-079: Brother sees persistent Mahram-presence banner only when THIS thread is granted. Revoke-one or remove drops the banner.
- FR-080: Family-involvement guidance: Mahram optional and Sister-initiated.
- FR-081: Mahram dashboard — **NEXT**.
- FR-082: Chaperoned-meeting planner — **NEXT**.

**Trust, Report, Block, sanctions (prd.md §4.8)**

- FR-083: Report with published 24h first-human SLA. Clock starts at submit.
- FR-084: Block from Profile or Chat; blocker hidden; Invite/Chat rejected.
- FR-085: Sanctions ladder: warning / suspension / Ban.
- FR-086: False-report sanctions (working: 3 overturned in 30 days).
- FR-087: Report → Strike → Ban console with evidence snapshots. Mahram flags are priority.
- FR-088: Repeat-offender fingerprint `sha256(phone_e164 | id_doc_hash | device_attestation)`. Cookie-only id is not a Ban key.
- FR-089: Code of conduct stored on the account at signup.
- FR-090: Member appeal reviewed by a second human.
- FR-091: Age / liveness hold for suspected minors. Not a Chat state.
- FR-092: Periodic transparency stats, proof-backed only.
- FR-093: Moderator unblur is audited (typed case reason). Dual-control is NEXT.
- FR-094: Match-visible change-audit — **NEXT**.

**Marriage outcomes (prd.md §4.9)**

- FR-095: Joint “we got married” report from an accepted Chat.
- FR-096: Both must confirm. One-sided does not increment the counter. 30d expiry.
- FR-097: Optional private nikah proof — never a public URL.
- FR-098: Joint married state: both leave browse; no new Invites.
- FR-099: Consent-based story; either spouse can refuse public; no Chat excerpts; optional family-ok.
- FR-100: Showcase page; empty is valid.
- FR-101: Honest Verified-marriages counter starting at 0; increments only on dual confirm.
- FR-102: Testimonials carousel — **NEXT**.
- FR-103: Alumni mentorship — **LATER**.

**Monetisation (prd.md §4.10)**

- FR-104: Freemium in XOF. Free browse + quota Invites + Chat after accept under the FR-146 cap.
- FR-105: Safety and Sister dignity never paywalled (Verification, Blur/Reveal, Mahram, Report, Block). Chat after accept is not unconditionally unlimited: Free-tier messages are capped (FR-146) unless Premium. Sister Invite send is allowed or rejected solely by FR-045 / `sister_reach_mode`, never by a safety paywall. Billing down must not disable safety. Message volume fails closed to the Free cap (`unavailable` → Free cap).
- FR-106: 1 / 3 / 6 month packs; explicit `ends_at`; no silent auto-renew; no renewal job. Sisters see and buy these packs in both `sister_reach_mode` values because messages are capped (FR-146). In `free_unlimited` the pack is not required for Invite reach.
- FR-107: Burkina rails: Orange Money BF, Moov Africa BF, Wave/Coris; cards secondary via hosted checkout (PAN never touches api).
- FR-108: One transparent pricing page; same numbers as checkout.
- FR-109: Published CGV and refunds; Operator-approved refund returns Member to Free.
- FR-110: MVP Premium deltas: unlimited Invites (vs Free 3 `[ASSUMPTION]`), unlimited messages (vs FR-146), and faster human-review queue. Not “15 vs 3”. Cannot skip scan, review, or admin flag queue.
- FR-111: Boosts — **NEXT**.
- FR-112: Premium badge — **NEXT**.
- FR-113: Remaining Premium perks — **NEXT**.
- FR-114: Free Money / MTN MoMo — **NEXT**.

**Content, localisation, legal (prd.md §4.11)**

- FR-115: Académie seed — five scholar-reviewed articles.
- FR-116: Advisory Board names (at least two named people; no fictional board).
- FR-117: Programmatic SEO for Ouagadougou, Bobo-Dioulasso, Burkina Faso. No dating lexicon.
- FR-118: Ticketed contact form plus FAQ; misuse routes to Moderators.
- FR-119: Cookie consent; accept never grants likeness reuse.
- FR-120: Public hosting disclosure and CIL stance. Do not ship the Scaleway / Île-de-France sentence. Do not invent a replacement string. A3 text is not rewritten.
- FR-121: Full Académie library — **NEXT**.
- FR-122: Blog — **NEXT**.
- FR-123: Promo / explainer video — **NEXT**.
- FR-124: Grounded AI marriage coach — **NEXT**.
- FR-125: Remaining city / country / intent SEO — **NEXT**.
- FR-126: Optional language filters — **NEXT**.
- FR-127: Prayer / night quiet hours — **NEXT**.
- FR-128: Full Arabic + English UI — **LATER**.
- FR-129: Istikhara companion — **NEXT**.
- FR-130: Mahr conversation card — **NEXT**.
- FR-131: Mosque / imam attestation level — **NEXT**.

**Platforms (prd.md §4.12)**

- FR-132: Web app — UJ-1 completable in a current browser.
- FR-133: Installable PWA — same path via home-screen icon.
- FR-134: Store-listed Android (Capacitor wrapping the same origin). FLAG_SECURE, FCM, camera, mic.
- FR-135: Native iOS — **NEXT**.
- FR-136: Lite mode: deferred images, derivatives `xs | sm | md | blur`, no autoplay, offline text outbox. First-grid ≤150KB; chat first page ≤80KB.
- FR-137: French-first UI. Banned: *dating* / *rencontre romantique*.
- FR-138: Mooré and Dioula audio on the covered set.

**Operator (prd.md §4.13)**

- FR-139: Pricing and pack configuration without a store release. Audited.
- FR-140: Moderation policy and thresholds. Subsequent scans only. Member-facing D6 copy is Operator-editable `moderation_policy_*`. Stale pre-delivery copy is forbidden.
- FR-141: Advisory Board / Académie publish.
- FR-142: Internal metrics (verified levels, dual-confirmed marriages, report SLA, scan-deferred never hidden, appeal overturns).
- FR-143: Account deletion and CIL request handling with a Member-visible status page.
- FR-145: Operator sets `sister_reach_mode` (`free_unlimited` DEFAULT | `same_quota_as_brothers`). Both ship day one. Audited. Subsequent Sister Invites use the new mode; past Invites stay. Sister UI shows unlimited Invites or the same Free Invite cap as Brothers. Sister checkout exists in both modes (unlimited messages, and unlimited Invites). No brother-free mode.
- FR-146: Operator sets `daily_message_cap`. Audited. Seed 10 is `[ASSUMPTION — admin-configurable, not a product lock]`. Free members of both genders (including a Sister in `free_unlimited`) hit the cap. Premium = unlimited messages. Counts once: chat text, chat photo, voice note, Message Flash (card quick message is that Flash). Over-cap is `MESSAGE_CAP_EXCEEDED`, not stored, not held. Allowed sends still deliver immediately.

### NonFunctional Requirements

Full targets in [prd.md §5](prds/prd-muslim-marriage-africa-2026-09-27/prd.md).

- NFR-001: Security — public visibility requires OTP + liveness + ID + human review; TLS 1.2+; AES-256-class at rest for photos, chat bodies, ID images, backups; argon2id passwords; auth rate limits; PIN; 15 min idle on Mahram/Sister PIN sessions; no staff bulk contact export.
- NFR-002: Privacy and CIL — CIL program before public launch; hosting disclosed; 72h breach notice; coarse geo; no marketing without FR-060.
- NFR-003: Send-first Chat and admin decision SLA — send returns when stored; background scan must not delay send; first human decision p95 ≤ 24h; scan-deferred / scan-failed counted, never hidden.
- NFR-004: Availability — core path ≥ 99.5% monthly excluding agreed maintenance. Payment outage must not take down Free or safety.
- NFR-005: Performance on low-end Android and 2G–3G — Lite first grid ≤ 8s; Chat open ≤ 4s; send-text ack ≤ 2s; no autoplay.
- NFR-006: Accessibility and low-literacy — WCAG 2.1 AA French UI; pictogram + audio for photo rules and onboarding; touch targets ≥ 44px.
- NFR-007: Localisation — 100% MVP screens in French; covered audio set in Mooré and Dioula, native-speaker checked.
- NFR-008: Data retention and deletion — `[ASSUMPTION]` erase ≤30d, export ≤72h, chat ≤18 months after close unless hold; payments per OHADA/tax counsel. Legal must replace before launch.
- NFR-009: Auditability — tamper-evident events for unblur, sanctions, appeals, operator changes, deletion/CIL, scan-deferred / scan-failed, admin flag actions; retain ≥12 months; individual staff attribution.

### Additional Requirements

From [ARCHITECTURE-SPINE.md](architecture/architecture-muslim-marriage-africa-2026-09-27/ARCHITECTURE-SPINE.md) and [SOLUTION-DESIGN.md](architecture/architecture-muslim-marriage-africa-2026-09-27/SOLUTION-DESIGN.md).

**Starter template:** none inherited. Greenfield hexagonal modular monolith. Monorepo owns lint/test/module system. Do not inherit vanilla CLI defaults.

**Paradigm and process roles**

- AD-1: One API product. Two process roles from the **same image**: `api` (HTTP/WS) and `worker` (BullMQ). Third in-region `web` role (AD-4). No per-module microservice.
- AD-2: Dependency direction `clients → inbound adapters → application → domain`. Safety paths must not import `BillingPort` in either `sister_reach_mode`. Chat send may call `BillingPort.isEntitled` only to decide FR-146.
- AD-3: Single entity ownership (see spine ownership table). Cross-module reads go through ports.
- AD-23: Only `ChatPort.openFromInvite` inserts `conversation`. Daily Invite quotas reset on `Africa/Ouagadougou`. Stage enum `invite | chat | meeting | married` only.

**Substrate (must be stories)**

- AD-6: OCI containers; Docker Compose from Story 1.7 (not Kubernetes); PostgreSQL; S3-compatible object storage; Redis/Valkey; secrets never in images.
- AD-20: One self-managed environment (Story 1.7 compose). No OpenTofu. No isolated `dev | staging | prod`. CI GitHub Actions. OTel contract. PG PITR + object versioning. Launch: 2 `api` + 1 `worker` + 1 `web`, PG primary + replica. Drizzle Kit is the only migration runner.
- AD-5: Self-managed hosting `[ASSUMPTION — legal review]`. Do not print « Données hébergées en région Île-de-France (France), prestataire Scaleway ». Do not invent a replacement location string.
- Structural seed: `apps/web`, `apps/android`, `apps/api`, `modules/*`, `packages/kernel`, `packages/ports`. Compose is Story 1.7 — no `infra/` OpenTofu for MVP.
- Stack pins: Node 24.21.0, TypeScript 7.0.2, Next.js 16.3.6, React 19.3.0, NestJS 12.1.0, Capacitor 8.5.2, Drizzle 0.45.3, PostgreSQL 17.11, Redis 8.6.3, BullMQ 6.3.9, Socket.IO 4.8.4, Tailwind CSS 4.3.3.

**API / auth / security**

- AD-7: JSON REST `/v1`; Socket.IO `/v1/realtime`; error envelope `{ error: { code, message, details, request_id, retryable } }`; `Idempotency-Key` on payment create and webhook ingest; webhook timestamp reject >600s.
- AD-8: Roles `member | mahram | moderator | operator | system`. Sister/Brother is a Member attribute. Staff MFA. No operator-as-member session. `min_age` default 19.
- AD-15: Socket.IO events: `conversation.typing`, `message.delivered`, `mahram.presence`, `reveal.changed`, `stage.changed`. No `message.pending` / `message.held`. Events carry `media_id` only, never a signed URL. Long-poll fallback.
- AD-17: TLS 1.2+; chat ciphertext `{v, alg, kid, iv, ct}`; argon2id; CSRF; Capacitor Bearer in platform secure storage; captcha; rate limits; Contact-share is the single off-platform predicate; staff list endpoints never return phone/WhatsApp.
- AD-18: Append-only `audit_event` hash-chain; INSERT/SELECT-only DB role; retain ≥12 months.
- AD-19: Loi n°001-2021/AN; CIL authorisation before public traffic; erase includes object-storage versions. Retention clocks stay `[ASSUMPTION]`.
- AD-21: `BillingPort.isEntitled` returns `true | false | unavailable` and must not throw into safety handlers. Safety (verification, blur/reveal, mahram attach, report, block, browse) must not call `BillingPort`. Chat send must call `isEntitled` only to decide FR-146. `unavailable` maps to the Free message cap. Sister invite send may call it only when `sister_reach_mode` is `same_quota_as_brothers` (AD-27). Sister checkout may call it in both modes.
- AD-27: `operator_config.sister_reach_mode` is `free_unlimited` (DEFAULT) | `same_quota_as_brothers`. Both seeded day one. Only `operator` may write. Brothers never read it as a free pass. Sister invite send in `free_unlimited` must not call `BillingPort`. Sister checkout catalog exists in both modes (AD-14) because messages are capped. Premium Invite volume is unlimited, not a cap of 15.
- AD-22: Open PRD questions stay open as config/flags. Question 2 (fail-closed UX) is resolved. Do not bake closed answers into schema enums.

**Media / moderation / mahram / outcomes**

- AD-9: Only `MediaPort.sign` mints a capability token to the media GET gateway. Gateway re-checks grant + denylist on every GET. `signed_url_ttl_seconds` ≤ 60. Serializers never emit `original_key`. No CSS-only blur.
- AD-10: Persist `delivered` immediately. Only `ModerationPort.enqueueScan` inserts `moderation_job`. Only moderation inserts `flag_queue`. AI never writes `message.state`. `ProfilePort.applyModeration` / `MediaPort.applyModeration` legal only for `profile_photo` and bio.
- AD-11: Do not claim ASR coverage Whisper does not have. `mos`/`dyu` → lexicon + human review or `scan-deferred`. Not a hold.
- AD-12: After confirm the grant list is empty. Mahram read-only on granted threads (`mahram_thread_grant`, `revoked_at IS NULL`). Cannot send as her. Revoke-one sets `revoked_at` on that row. Remove/report sets `revoked_at` on every active grant in the same unit of work within 60s. Flash / pre-accept is not grantable.
- AD-13: `VerificationPort` independent of Premium.
- AD-14: `MobileMoneyPort`; no stored recurring mandate; no silent auto-renew. Sisters can buy the same 1/3/6 packs in both `sister_reach_mode` values.
- AD-16: Lite defaults; `SmsPort` one live adapter; `UssdPort` exists and stays disabled.
- AD-24: WCAG 2.1 AA; ≥44px; pictogram + audio; banned dating lexicon in shipped strings.
- AD-25: `marriage_counter` +1 only after both confirm. Public metrics proof-backed only.
- AD-26: `marital_status` and (if married) `polygamy_intent` required and readable on the Invite decision surface before Sister accept.
- AD-28: Discover and every people list default to one focused card (`GET /v1/browse?view=card|grid`, default card). Pass is `POST /v1/browse/pass` (viewer-scoped exclusion, not a like). Shared traits from existing Profile fields only. No online-now. No invented counts. Grid is optional.
- AD-29: `operator_config.daily_message_cap` is operator-only, audited (AD-18). Seed 10 is `[ASSUMPTION — admin-configurable, not a product lock]`. `message_quota` `{account_id, civil_day_ouaga, sent_count}` written only by chat when not entitled. Over-cap `MESSAGE_CAP_EXCEEDED`. Premium writes no increment.

**Required `operator_config` keys:** `flag_threshold`, `free_review_sla_hours`, `report_sla_hours`, `photo_strike_count`, `photo_strike_block_hours`, `brother_invite_quota_free`, `brother_invite_quota_premium` (Premium Invite volume is unlimited when `isEntitled` — not a lock of 15), `sister_reach_mode` (`free_unlimited` DEFAULT | `same_quota_as_brothers`; both seeded day one), `daily_message_cap` (number; seed **10** `[ASSUMPTION — admin-configurable, not a product lock]`), `signed_url_ttl_seconds` (max 60), `pack_prices_xof`, `min_age`, `rl_auth_per_min`, `rl_otp_per_hour`, `rl_invite_per_day`, `rl_report_per_hour`, `rl_pay_per_min`, `rl_browse_per_min`.

**Feature flags stay off until NEXT FR ships:** `gif_picker`, `ussd`, `anonymous_mode`, `ios_apple_signin`, `who_favourited_me`, `visitors_list`, `online_now`, `boosts`.

### UX Design Requirements

From [DESIGN.md](ux-designs/ux-muslim-marriage-africa-2026-10-01/DESIGN.md) and [EXPERIENCE.md](ux-designs/ux-muslim-marriage-africa-2026-10-01/EXPERIENCE.md). Both status final. Product name is **AnKanu** (ankanu.com on Hostinger, 2026-10-03). Do not print the historical shortlist as the product name.

- UX-DR1: Implement DESIGN.md tokens in Tailwind 4 — colors (sand, raised, indigo, gold, mihrab, blur-wash, danger, success, staff, disabled), typography (Source Serif 4 display/title/heading; Source Sans 3 body/meta/caption), spacing 4/8/12/16/24/32/48, rounded sm/md/lg/full.
- UX-DR2: `button-primary` (indigo, 48px, one commit per screen; never a send that waits on AI), `button-secondary`, `button-quiet` (quiet decline / Revoke / remove Mahram).
- UX-DR3: `field` 48px, `{colors.border-strong}` outline, errors name the field. Gender immutable after first set without operator+audit.
- UX-DR4: `age-gate` — DOB; under 19 blocked; copy does not claim statute (A1 open).
- UX-DR5: `otp-input` — 4–6 discrete 48px boxes; SMS channel; published resend cooldown.
- UX-DR6: `liveness-capture` — camera + pictogram + audio; no beauty filter; failure = retake, not paywall.
- UX-DR7: `completeness-meter` — named missing Islamic criteria, not a shame bar. Gold fill only when Invite-ready.
- UX-DR8: `focused-card` + optional `discovery-card` grid — default one focused card (shared traits under the photo from existing fields only; pass = dismiss, not a like). Optional two-column small cards behind the toggle; blur thumb xs/sm; city, age, marital, practice; quiet bookmark favourite, not a heart. Lite first-card / first-grid metadata + blur thumbs ≤150KB (AD-16).
- UX-DR9: `blur-photo` — server `blur` derivative only. Never CSS-blur `original`. Not-yet-public caption « Photo en revue — pas encore publique ».
- UX-DR10: `reveal-control` — 44px; policies `on_accept | on_request | never`; caption + pictogram so gold is never the only signal; Revoke ≤60s.
- UX-DR11: `chat-bubble` — persist delivered immediately. Meta is time only. Banned member copy: « En cours de vérification », scan-wait, hourglass, the word « scan » including negations.
- UX-DR12: `voice-note` — play as soon as stored; 44px control; no member-facing transcript.
- UX-DR13: `mahram-banner` — persistent indigo-deep « Un wali lit cette discussion ». No compose on Mahram client.
- UX-DR14: `contact-share-interstitial` — shown to **both** Members on `CONTACT_SHARE_REQUIRED`. Not an AI hold. Do not reuse for money-ask.
- UX-DR15: `invite-row` — marital status + polygamy intent visible before accept; quiet decline.
- UX-DR16: `flash-composer` — 280 chars + Ice Breaker picker; phone/WhatsApp/links refused.
- UX-DR17: `stage-chip` — `invite | chat | meeting | married` rectangle, not a story ring.
- UX-DR18: `admin-flag-row` — staff-only; kinds `flag-for-admin | scan-deferred | scan-failed`; opening never changes `message.state`.
- UX-DR19: `staff-only-badge` on every staff surface. Members never see this chrome.
- UX-DR20: `sanction-action` — Avertissement / Suspension / Autre action publiée. AI is not a control.
- UX-DR21: `pack-card` — 1/3/6 months XOF; selected = gold-soft + « Sélectionné » + indigo ring; « Pas de renouvellement automatique » + `audio-prompt`.
- UX-DR22: `audio-prompt` — speaker + `mos`/`dyu` toggles ≥44px on onboarding, photo rules, no-auto-renew, Mahram invite. Audio fail → pictograms remain.
- UX-DR23: `pin-lock` — full-screen sand, four digits, no photo behind.
- UX-DR24: `empty-state` — one sentence + one action. Zero results never invent Profiles.
- UX-DR25: `error-banner` — AD-7 codes mapped to French. `PAY_UNAVAILABLE` does not disable Report, Blur, Mahram attach, Verification, Block, or browse. Message volume fails closed to the Free cap. `MESSAGE_CAP_EXCEEDED` is refused, not held. Sister Invite send is allowed or rejected solely by FR-045 / `sister_reach_mode`, never by a safety paywall.
- UX-DR26: `lite-placeholder` — criteria remain while images defer. Chat media waits for connection, not AI.
- UX-DR27: Three role shells never mixed on one session: Member (bottom nav Découvrir · Invitations · Discussions · Profil), Mahram (no Découvrir, no Invitations), Staff (two-pane from 768px).
- UX-DR28: Implement EXPERIENCE.md public, identity, member-core, Mahram, and staff surfaces with the documented empty/loading/error/success states. Banned Chat states: `pending`, `held`, `pending-moderation`, `scan-wait`, `fail-closed`.
- UX-DR29: Accessibility floor — WCAG 2.1 AA; ≥44px (48px primary); TalkBack/VoiceOver announces « Message envoyé » never « en vérification »; focus-visible 2px; Reduce Motion skips mihrab fade; color is not the only Reveal signal.
- UX-DR30: Member 360px reference; no hover-only Reveal; PWA install optional; Android Capacitor `FLAG_SECURE` as deterrence (do not advertise “cannot screenshot”); time display `Africa/Ouagadougou`.
- UX-DR31: Keeper mocks (spines win): `mockups/auth.html`, `discovery-lite.html`, `profile-blur.html`, `chat-thread.html`, `mahram-readonly.html`, `admin-flag-queue.html`, `payment-pack.html`, `marriage-confirm.html`.
- UX-DR32: Copy vocabulary locked — *mariage / ta'aruf / nikah / khitba* only. Dishonest chrome stays rejected (online now, invented DAU / “+247.8k”, celebrity-couple hero, gold “Premium verified” badge, heart-stack). A one-at-a-time card with pass is the product, not a rejected dating pattern.

### FR Coverage Map

Primary epic only. NEXT/LATER items are listed so none are dropped; they are not MVP stories.

**Identity**
- FR-001: Epic 2 — create account
- FR-002: Epic 2 — phone OTP
- FR-003: Epic 2 — Google additional sign-in
- FR-004: not-MVP (NEXT — Apple with iOS)
- FR-005: Epic 2 — sincerity pledge
- FR-006: Epic 2 — email verification
- FR-007: Epic 2 — captcha / rate limit
- FR-008: Epic 2 — password reset / remember-me
- FR-009: Epic 2 — guided onboarding
- FR-010: Epic 2 — audio on hard steps
- FR-011: Epic 2 — age gate 19+
- FR-012: Epic 3 — human profile review
- FR-013: Epic 3 — published review SLA
- FR-014: Epic 2 — free ID + liveness
- FR-015: Epic 3 — verification levels on profile
- FR-016: Epic 4 — photo required to contact (Story 4.1)
- FR-017: Epic 3 — edit profile; photo re-moderated
- FR-018: Epic 2 — deactivate / reactivate
- FR-019: Epic 2 — delete / export / status
- FR-020: Epic 2 — shared-device PIN

**Profiles and discovery**
- FR-021: Epic 3 — profile fields
- FR-022: Epic 3 — Islamic criteria
- FR-023: Epic 3 — completeness meter
- FR-024: Epic 3 — card default and basic filters (Stories 3.8, 3.9, 3.13)
- FR-025: Epic 3 — optional grid and card/grid toggle (Stories 3.8, 3.9, 3.13)
- FR-026: Epic 3 — private favourites
- FR-027: Epic 3 — T&S visit patterns
- FR-028: Epic 5 — ta'aruf stages
- FR-029: not-MVP (NEXT — confrérie / hijra)
- FR-030: not-MVP (NEXT — advanced filters)
- FR-031: not-MVP (NEXT — AI compatibility)
- FR-032: not-MVP (NEXT — daily recs)
- FR-033: not-MVP (NEXT — who favourited me)
- FR-034: not-MVP (NEXT — visitors list)
- FR-035: not-MVP (NEXT — online-now)
- FR-036: not-MVP (NEXT — anonymous mode)
- FR-037: Epic 4 — marital honesty before accept

**Invites**
- FR-038: Epic 4 — send Invite
- FR-039: Epic 4 — accept / decline
- FR-040: Epic 4 — invite lists
- FR-041: Epic 4 — Chat only after Sister consent
- FR-042: Epic 4 — quiet decline
- FR-043: Epic 4 — no resend after refuse
- FR-044: Epic 4 — Brother daily quota
- FR-045: Epic 4 — Sister invite reach follows `sister_reach_mode` (Stories 4.1, 4.7)
- FR-046: Epic 4 — Message Flash
- FR-047: Epic 4 — Ice Breaker templates
- FR-048: Epic 7 — Flash Mahram-visible on a granted thread (Stories 7.4, 7.8)
- FR-049: not-MVP (NEXT — AI Ice Breakers)

**Chat and notifications**
- FR-050: Epic 5 — realtime Chat
- FR-051: Epic 5 — Voice notes
- FR-052: Epic 5 — push
- FR-053: Epic 5 — SMS essential path
- FR-054: not-MVP (NEXT — GIF picker)
- FR-055: not-MVP (NEXT — USSD)

**Photo privacy**
- FR-056: Epic 3 — blur by default
- FR-057: Epic 6 — per-viewer Reveal
- FR-058: Epic 6 — Reveal-on-request
- FR-059: Epic 6 — Revoke
- FR-060: Epic 6 — likeness grant
- FR-061: not-MVP (NEXT — watermark polish)

**Passive moderation**
- FR-062: Epic 5 — text delivered then scanned
- FR-063: Epic 5 — Chat Photo delivered then scanned
- FR-064: Epic 5 — Voice delivered then scanned
- FR-065: Epic 3 — Profile Photo / bio publish-gate
- FR-066: Epic 8 — AI flag-for-admin only
- FR-067: Epic 8 — scan-deferred / scan-failed
- FR-144: Epic 8 — admin flag queue and admin action
- FR-068: Epic 5 — Contact-share + money-ask education
- FR-069: Epic 3 — Photo Strike
- FR-070: Epic 3 — photo rules pictogram + audio

**Mahram**
- FR-071: Epic 7 — Sister invites Mahram
- FR-072: Epic 7 — OTP + relationship
- FR-073: Epic 7 — Sister confirms
- FR-074: Epic 7 — granted threads only (Stories 7.4, 7.8)
- FR-075: Epic 7 — flag / pause / end
- FR-076: Epic 7 — cannot send as Sister
- FR-077: Epic 7 — remove / report revokes all grants (Stories 7.6, 7.8)
- FR-078: Epic 7 — optional Verified-Mahram
- FR-079: Epic 7 — presence banner
- FR-080: Epic 7 — family guidance
- FR-081: not-MVP (NEXT — Mahram dashboard)
- FR-082: not-MVP (NEXT — meeting planner)

**Trust**
- FR-083: Epic 8 — Report + 24h SLA
- FR-084: Epic 8 — Block
- FR-085: Epic 8 — sanctions ladder
- FR-086: Epic 8 — false-report sanctions
- FR-087: Epic 8 — case console
- FR-088: Epic 8 — Ban fingerprint
- FR-089: Epic 2 — Code of conduct at signup
- FR-090: Epic 8 — appeal
- FR-091: Epic 2 — suspected-minor hold
- FR-092: Epic 8 — transparency stats
- FR-093: Epic 8 — audited unblur
- FR-094: not-MVP (NEXT — match-visible change-audit)

**Marriage**
- FR-095: Epic 9 — joint report
- FR-096: Epic 9 — both confirm
- FR-097: Epic 9 — private nikah proof
- FR-098: Epic 9 — joint married state
- FR-099: Epic 9 — consent story
- FR-100: Epic 9 — showcase
- FR-101: Epic 9 — counter starts at 0
- FR-102: not-MVP (NEXT — testimonials carousel)
- FR-103: not-MVP (LATER — alumni mentorship)

**Billing**
- FR-104: Epic 10 — freemium XOF
- FR-105: Epic 10 — safety never paywalled
- FR-106: Epic 10 — 1/3/6 months, no auto-renew
- FR-107: Epic 10 — BF payment rails
- FR-108: Epic 10 — one pricing page
- FR-109: Epic 10 — CGV / refunds
- FR-110: Epic 10 — MVP Premium delta only
- FR-111: not-MVP (NEXT — boosts)
- FR-112: not-MVP (NEXT — Premium badge)
- FR-113: not-MVP (NEXT — remaining perks)
- FR-114: not-MVP (NEXT — Free Money / MTN MoMo)

**Content and legal**
- FR-115: Epic 11 — Académie seed
- FR-116: Epic 11 — Advisory Board names
- FR-117: Epic 11 — SEO trio
- FR-118: Epic 11 — FAQ + ticketed contact
- FR-119: Epic 11 — cookie consent
- FR-120: Epic 11 — hosting / CIL disclosure
- FR-121: not-MVP (NEXT — full Académie)
- FR-122: not-MVP (NEXT — blog)
- FR-123: not-MVP (NEXT — promo video)
- FR-124: not-MVP (NEXT — AI coach)
- FR-125: not-MVP (NEXT — remaining SEO)
- FR-126: not-MVP (NEXT — language filters)
- FR-127: not-MVP (NEXT — quiet hours)
- FR-128: not-MVP (LATER — AR/EN UI)
- FR-129: not-MVP (NEXT — Istikhara)
- FR-130: not-MVP (NEXT — mahr card)
- FR-131: not-MVP (NEXT — mosque attestation)

**Platforms**
- FR-132: Epic 1 — web process and public shell (UJ-1 completeness proven across later epics)
- FR-133: Epic 11 — installable PWA
- FR-134: Epic 11 — store-listed Android
- FR-135: not-MVP (NEXT — native iOS)
- FR-136: Epic 3 — Lite mode
- FR-137: Epic 1 — French-first shell + banned lexicon
- FR-138: Epic 11 — Mooré / Dioula audio assets

**Operator**
- FR-139: Epic 12 — pack configuration
- FR-140: Epic 12 — moderation policy / thresholds
- FR-141: Epic 12 — Board / Académie publish
- FR-142: Epic 12 — internal metrics
- FR-143: Epic 12 — CIL / deletion tickets
- FR-145: Epic 4 — Operator `sister_reach_mode` and Sister checkout (Story 4.7)
- FR-146: Epic 5 — Free-tier daily message cap (Story 5.11, with 4.3, 4.7, 10.6)

**NFRs**
- NFR-001: Epic 2 (auth/PIN) + Epic 6 (media at rest) + Epic 12 (no staff bulk export)
- NFR-002: Epic 11 + Epic 12
- NFR-003: Epic 5 + Epic 8
- NFR-004: Epic 1 + Epic 10
- NFR-005: Epic 3 + Epic 5
- NFR-006: Epic 1 + Epic 2 + Epic 3
- NFR-007: Epic 2 + Epic 11
- NFR-008: Epic 2 + Epic 12
- NFR-009: Epic 8 + Epic 12

## Epic List

### Epic 1: A running Burkina-first product
Operators and developers can run `web` + `api` + `worker` against Postgres, Redis, and object storage in one self-managed Docker Compose environment (Story 1.7 stack). A visitor opens a French public shell with design tokens and three role shells. This is the substrate required to run every later epic.
**FRs covered:** FR-132, FR-137
**NFRs:** NFR-004 (substrate), NFR-006 (token/a11y floor)
**ADs:** AD-1, AD-2, AD-3, AD-5, AD-6, AD-7, AD-20, AD-22

### Epic 2: An accountable adult can join
A prospective Member creates an email+password account, pledges sincerity, passes the 19+ gate, verifies email and phone, completes free ID + liveness, finishes guided onboarding with audio, and can PIN-lock, pause, or delete the account. Public listing still waits on Epic 3 review.
**FRs covered:** FR-001, FR-002, FR-003, FR-005, FR-006, FR-007, FR-008, FR-009, FR-010, FR-011, FR-014, FR-018, FR-019, FR-020, FR-089, FR-091
**NFRs:** NFR-001, NFR-008 (delete/export clocks)
**ADs:** AD-8, AD-13, AD-17, AD-19

### Epic 3: Browse without selling a face
A reviewed Member publishes Islamic-criteria fields, stays unpublished until photo/bio review, appears Blurred on one focused card by default (optional Lite grid behind a toggle), filters, and saves private favourites. Discovery never ships a clear original.
**FRs covered:** FR-012, FR-013, FR-015, FR-017, FR-021, FR-022, FR-023, FR-024, FR-025, FR-026, FR-027, FR-056, FR-065, FR-069, FR-070, FR-136
**NFRs:** NFR-005 (first card / first grid)
**ADs:** AD-9 (blur ingest), AD-10 (publish-gate only), AD-16, AD-26 (profile fields), AD-28

### Epic 4: Invite only with Sister consent
Members send and decide Invites. Sister invite reach follows `sister_reach_mode`: default `free_unlimited` (unlimited Invites; no pack required for reach); `same_quota_as_brothers` uses the same Free Invite cap as Brothers. Sisters can buy the same 1/3/6 packs in both modes because messages are capped (FR-146). Brothers stay on the paid Invite quota (Free 3 `[ASSUMPTION]`; Premium unlimited). Marital status and polygamy intent are visible before accept. Decline is quiet. Chat is created only after Sister consent.
**FRs covered:** FR-016, FR-037, FR-038, FR-039, FR-040, FR-041, FR-042, FR-043, FR-044, FR-045, FR-046, FR-047, FR-145
**ADs:** AD-21, AD-23, AD-26, AD-27, AD-29

### Epic 5: Talk immediately after accept
After Sister consent, Members exchange text, Chat Photos, and Voice notes. An allowed send appears as soon as it is stored. A Free sender at `daily_message_cap` is rejected (`MESSAGE_CAP_EXCEEDED`); nothing is stored or held. Premium does not increment `message_quota`. Contact-share still blocks phone/WhatsApp/links until both opt in. Push and SMS carry ids and blur thumbs only. Each allowed persist enqueues a background scan — it does not hold the send.
**FRs covered:** FR-028, FR-050, FR-051, FR-052, FR-053, FR-062, FR-063, FR-064, FR-068, FR-146
**NFRs:** NFR-003 (send-first), NFR-005 (chat open / send ack)
**ADs:** AD-10, AD-15, AD-16, AD-17, AD-21, AD-29

### Epic 6: Reveal a face to one viewer, and take it back
The photo owner chooses per-viewer `on_accept | on_request | never`, grants or refuses a request, and Revokes so the gateway stops serving clear bytes within 60s. Marketing reuse needs a per-use likeness grant.
**FRs covered:** FR-057, FR-058, FR-059, FR-060
**NFRs:** NFR-001 (photos at rest)
**ADs:** AD-9

### Epic 7: An optional Mahram can read and stop the Chat
A Sister invites a Mahram by phone. After OTP, declared relationship, and her confirm, the grant list is empty. She grants individual Brother threads. He reads only granted, delivered messages and can flag, pause, or end those threads. He cannot compose. She can revoke one or remove him (revoke-all).
**FRs covered:** FR-048, FR-071, FR-072, FR-073, FR-074, FR-075, FR-076, FR-077, FR-078, FR-079, FR-080
**ADs:** AD-12, AD-13

### Epic 8: A human, not the AI, decides
The worker scans already-delivered Chat items. Flags and scan-deferred events land in a staff-only queue. Admins warn, suspend, or take another published action. Members Report and Block. Appeals get a second human. Unblur is audited. The AI never unsends or auto-suspends.
**FRs covered:** FR-066, FR-067, FR-144, FR-083, FR-084, FR-085, FR-086, FR-087, FR-088, FR-090, FR-092, FR-093
**NFRs:** NFR-003, NFR-009
**ADs:** AD-10, AD-11, AD-18

### Epic 9: Both confirm a marriage
A couple jointly reports nikah. The public counter stays 0 until both confirm. Optional proof stays private. A public story needs both consents. Empty showcase is valid.
**FRs covered:** FR-095, FR-096, FR-097, FR-098, FR-099, FR-100, FR-101
**ADs:** AD-25

### Epic 10: Pay for reach in XOF, never for dignity
A Brother buys a 1/3/6-month pack on Orange Money, Moov, or Wave. A Sister sees and buys the same packs in both `sister_reach_mode` values because Free-tier messages are capped (FR-146). There is no silent auto-renew. Premium deltas are unlimited Invites, unlimited messages, and faster human review — not “15 vs 3”. Verification, Blur, Mahram attach, Report, and Block stay free even if billing is down. Message volume fails closed to the Free cap.
**FRs covered:** FR-104, FR-105, FR-106, FR-107, FR-108, FR-109, FR-110, FR-146
**NFRs:** NFR-004
**ADs:** AD-14, AD-21, AD-27, AD-29

### Epic 11: Stand in public as honorable ta'aruf
Visitors see an honest counter, five scholar-reviewed articles, named Board members, Ouaga/Bobo/BF pages, cookies that are not a likeness grant, hosting/CIL disclosure, FAQ, and can install the PWA or the Play-listed Android wrapper.
**FRs covered:** FR-115, FR-116, FR-117, FR-118, FR-119, FR-120, FR-133, FR-134, FR-138
**NFRs:** NFR-002, NFR-007
**ADs:** AD-4, AD-5, AD-19, AD-24

### Epic 12: Operate, measure, and honour a CIL request
Operators change pack prices, `sister_reach_mode` (Story 4.7), `daily_message_cap` (Story 5.11 — do not fork a second conflicting story), and moderation policy text, publish Board/Académie, see internal metrics including scan-deferred, and complete deletion/CIL tickets. Staff are individual, MFA, never operator-as-member. Audit is append-only.
**FRs covered:** FR-139, FR-140, FR-141, FR-142, FR-143
**NFRs:** NFR-002, NFR-008, NFR-009
**ADs:** AD-18, AD-19, AD-20, AD-29

## Epic 1: A running Burkina-first product

Operators and developers can run `web` + `api` + `worker` against Postgres, Redis, and object storage in one self-managed Docker Compose environment (Story 1.7 stack). A visitor opens a French public shell with design tokens and three role shells. No Chat hold state exists anywhere in this substrate.

**FRs covered:** FR-132, FR-137

### Story 1.1: Shared kernel and port types

As a developer on the launch team,
I want a `packages/kernel` + `packages/ports` that own UUID v7 ids, the AD-7 error envelope, AuthContext, and Africa/Ouagadougou clocks,
So that every later module shares one contract and cannot invent a second error shape.

**Acceptance Criteria:**

**Given** the monorepo is empty of product code
**When** I add kernel + ports packages
**Then** IDs are UUID v7, errors are `{ error: { code, message, details, request_id, retryable } }`, and AuthContext is `{ accountId, roles[], gender?, mahramWardId? }`
**And** time helpers expose UTC storage and Ouaga display

**Given** a module tries to throw a raw Nest exception to a client
**When** the inbound adapter maps it
**Then** the client only ever sees the AD-7 envelope

**Implements:** AD-7, AD-8, AD-22 · AD-1, AD-2 · [prd.md §4 (cross-cutting)](prds/prd-muslim-marriage-africa-2026-09-27/prd.md) · screen [Foundation](ux-designs/ux-muslim-marriage-africa-2026-10-01/EXPERIENCE.md)
**Start here:** `packages/kernel + packages/ports (no HTTP yet)` · entity `n/a (shared types)` · container `api`
**UX:** UX-DR25 error codes. Open questions stay config, not schema enums.
### Story 1.2: API process with health and versioned REST

As a operator,
I want an `apps/api` NestJS process that serves `/v1` and a health check,
So that compose can prove the API is alive before features land.

**Acceptance Criteria:**

**Given** the api image is running
**When** I GET `/v1/health`
**Then** I receive 200 with `{ status, role: "api" }` and a `request_id`

**Given** I call an unknown `/v1` route
**When** the request finishes
**Then** I get the AD-7 envelope with a machine `code`, never a stack trace

**Implements:** FR-132 (api half) · AD-1, AD-7 · [prd.md §4.12](prds/prd-muslim-marriage-africa-2026-09-27/prd.md) · screen [Foundation](ux-designs/ux-muslim-marriage-africa-2026-10-01/EXPERIENCE.md)
**Start here:** `GET /v1/health` · entity `n/a` · container `api`
### Story 1.3: Worker process from the same image

As a operator,
I want the same OCI image started with role `worker` that consumes BullMQ,
So that background scans and SMS can run without a second codebase.

**Acceptance Criteria:**

**Given** the image is built once
**When** I start it with `PROCESS_ROLE=worker`
**Then** the process registers queue processors and does not bind the public HTTP port

**Given** Redis is down
**When** the worker starts
**Then** it exits non-zero or retries visibly; it does not start an HTTP server

**Implements:** AD-1, AD-20 · AD-1, AD-10 (queue host) · [prd.md §5 NFR-004](prds/prd-muslim-marriage-africa-2026-09-27/prd.md) · screen [Foundation](ux-designs/ux-muslim-marriage-africa-2026-10-01/EXPERIENCE.md)
**Start here:** `command PROCESS_ROLE=worker` · entity `n/a` · container `worker`
### Story 1.4: Web shell, tokens, and three role chrome

As a visitor,
I want a Next.js public shell in French with DESIGN.md tokens and Member / Mahram / Staff chrome that cannot share a session,
So that the product looks like honorable ta'aruf and later screens have a home.

**Acceptance Criteria:**

**Given** I open the site on a 360px viewport
**When** the landing renders
**Then** UI is French, the product name is **AnKanu**, *dating* / *rencontre romantique* are absent, mihrab wash is on splash/landing only

**Given** I inspect tokens
**When** I compare to DESIGN.md
**Then** sand/indigo/gold/staff/blur-wash and Source Serif 4 / Source Sans 3 match
**And** primary actions are 48px; empty-state and error-banner components exist

**Given** a staff cookie is present
**When** I request a member route
**Then** I am refused — no operator-as-member session

**Implements:** FR-132, FR-137 · AD-4, AD-8, AD-24 · [prd.md §4.12](prds/prd-muslim-marriage-africa-2026-09-27/prd.md) · screen [Public landing + Splash](ux-designs/ux-muslim-marriage-africa-2026-10-01/EXPERIENCE.md)
**Start here:** `apps/web App Router pages` · entity `n/a` · container `web`
**Notes:** UX-DR1, UX-DR2, UX-DR24, UX-DR25, UX-DR27, UX-DR29, UX-DR32. Keeper mock: mockups/auth.html for later auth; landing uses DESIGN.md Brand.
**Design:** [ux-designs/ux-muslim-marriage-africa-2026-10-01/DESIGN.md](ux-designs/ux-muslim-marriage-africa-2026-10-01/DESIGN.md)
### Story 1.5: Postgres migrations and operator_config seed

As a developer,
I want Drizzle Kit as the only migration runner and a seeded `operator_config` row,
So that later stories alter only the tables they need and read working numbers from config.

**Acceptance Criteria:**

**Given** compose Postgres is empty
**When** I run Drizzle migrate
**Then** the `operator_config` table exists with the spine keys (`min_age=19`, `brother_invite_quota_free` = 3 `[ASSUMPTION]`, `brother_invite_quota_premium` present but Premium Invite volume is unlimited when `isEntitled` — not a lock of 15, `sister_reach_mode=free_unlimited` DEFAULT, both enum values seeded, `daily_message_cap` seed 10 `[ASSUMPTION — admin-configurable, not a product lock]`, SLA 24h, signed_url_ttl ≤60, strike 3/24h, rate-limit keys)

**Given** I change a config value in a later story
**When** I look at this table
**Then** I do not invent a second config store

**Implements:** AD-20, AD-22 · AD-3 (operator owns operator_config) · [prd.md §17 assumptions](prds/prd-muslim-marriage-africa-2026-09-27/prd.md) · screen [Operator policy / thresholds](ux-designs/ux-muslim-marriage-africa-2026-10-01/EXPERIENCE.md)
**Start here:** `drizzle-kit migrate` · entity `operator_config` · container `api`
### Story 1.6: Redis and S3-compatible object storage adapters

As a developer,
I want working Redis (queue/cache/pubsub) and an S3-compatible bucket adapter,
So that Chat, media, and the worker have a portable substrate (AD-6).

**Acceptance Criteria:**

**Given** compose is up
**When** the api writes a test object and enqueues a no-op job
**Then** the object is in the bucket and the worker acks the job

**Given** secrets are inspected
**When** I look at images and git
**Then** no bucket keys or Redis passwords are baked in

**Implements:** AD-6, AD-16 · AD-6 · [prd.md §5 NFR-004](prds/prd-muslim-marriage-africa-2026-09-27/prd.md) · screen [Foundation](ux-designs/ux-muslim-marriage-africa-2026-10-01/EXPERIENCE.md)
**Start here:** `ObjectStorageAdapter + Redis connection` · entity `n/a (infra adapters)` · container `api`
### Story 1.7: Dockerfiles and local compose

As a developer,
I want Dockerfiles for api/worker (one image) and web, plus compose for Postgres, Redis, and object storage,
So that a new clone can run the product locally without Scaleway.

**Acceptance Criteria:**

**Given** I run `docker compose up`
**When** health is checked
**Then** `web`, `api`, `worker`, Postgres, Redis, and the bucket are reachable

**Given** I inspect the api/worker image
**When** I compare tags
**Then** api and worker are the same image, different command

**Implements:** AD-6, AD-20 · AD-1, AD-6 · [prd.md §7 Platform](prds/prd-muslim-marriage-africa-2026-09-27/prd.md) · screen [Foundation](ux-designs/ux-muslim-marriage-africa-2026-10-01/EXPERIENCE.md)
**Start here:** `Dockerfile + compose.yaml` · entity `n/a` · container `infra`
### Story 1.8: One self-managed compose environment

As a operator,
I want the Story 1.7 compose stack (`web` + `api` + `worker` + Postgres + Redis + object storage) as the one self-managed environment,
So that we run an open-source stack ourselves, without Kapsule, OpenTofu, or isolated `dev | staging | prod`.

**Acceptance Criteria:**

**Given** I inspect hosting for MVP
**When** I look for Kapsule, OpenTofu, or `infra/` env modules
**Then** they are not part of this story

**Given** I inspect environments
**When** I compare
**Then** there is one self-managed environment — not isolated `dev | staging | prod`

**Given** I open the public privacy stub
**When** I read hosting
**Then** « Données hébergées en région Île-de-France (France), prestataire Scaleway » is absent, and no invented replacement location string is present — A3 is not rewritten

**Implements:** FR-120 (no invented string), NFR-004 · AD-5, AD-6, AD-20 · [prd.md §4.11 FR-120](prds/prd-muslim-marriage-africa-2026-09-27/prd.md) · screen [Legal hub](ux-designs/ux-muslim-marriage-africa-2026-10-01/EXPERIENCE.md)
**Start here:** `compose.yaml (one self-managed environment)` · entity `n/a` · container `infra`
### Story 1.9: CI, observability, and restore drills

As a operator,
I want GitHub Actions (lint, types, unit, integration, migration check), in-region OpenTelemetry, PG PITR, object versioning, and a quarterly restore runbook,
So that scan-deferred gaps and unrestorable backups cannot hide.

**Acceptance Criteria:**

**Given** a PR is opened
**When** CI runs
**Then** oxlint, types, unit, integration, and migration check must pass

**Given** the worker records a scan-deferred event later
**When** metrics are queried
**Then** the OTel contract already has a `scan_deferred_count` instrument — never hidden

**Given** I follow the restore runbook
**When** I restore a backup of the one self-managed environment
**Then** PG PITR + object versions come back

**Implements:** NFR-004, NFR-009 (obs) · AD-18, AD-20 · [prd.md §5 NFR-004](prds/prd-muslim-marriage-africa-2026-09-27/prd.md) · screen [Operator metrics](ux-designs/ux-muslim-marriage-africa-2026-10-01/EXPERIENCE.md)
**Start here:** `GitHub Actions + OTel exporters + backup runbook` · entity `audit_event (later)` · container `infra`
## Epic 2: An accountable adult can join

A prospective Member creates an email+password account, pledges sincerity, passes the 19+ gate, verifies email and phone, completes free ID + liveness, finishes guided onboarding with audio, and can PIN-lock, pause, or delete. Public listing still waits on Epic 3 review.

**FRs covered:** FR-001, FR-002, FR-003, FR-005, FR-006, FR-007, FR-008, FR-009, FR-010, FR-011, FR-014, FR-018, FR-019, FR-020, FR-089, FR-091

### Story 2.1: Create account with pledge and gender

As a prospective Member,
I want to create an account with email, password, unique pseudonym, gender, sincerity pledge, and Code of conduct,
So that I exist as a Member but I am not publicly listed.

**Acceptance Criteria:**

**Given** email and pseudonym are unused and I accepted the pledge and CoC
**When** I POST `/v1/accounts`
**Then** an `account` exists with gender `sister|brother`, `age_attested` unset, visibility blocked
**And** the CoC version is stored (FR-089)

**Given** I skip the pledge
**When** I submit
**Then** no account is created

**Given** email or pseudonym is taken
**When** I submit
**Then** no account is created and the conflicting field is named

**Implements:** FR-001, FR-005, FR-089 · AD-8, AD-17 · [prd.md §4.1 FR-001](prds/prd-muslim-marriage-africa-2026-09-27/prd.md) · screen [Auth (signup / login)](ux-designs/ux-muslim-marriage-africa-2026-10-01/EXPERIENCE.md)
**Start here:** `POST /v1/accounts` · entity `account, credential` · container `api`
**Notes:** UX-DR3 field. Gender immutable after first set without operator+audit. Mock: mockups/auth.html.
### Story 2.2: Session, captcha, and rate limits

As a Member,
I want to sign in with email+password under captcha and published rate limits,
So that bots and stuffing cannot create or steal sessions.

**Acceptance Criteria:**

**Given** captcha fails
**When** I POST `/v1/sessions`
**Then** the action is rejected with AD-7 `code`

**Given** I exceed `rl_auth_per_min`
**When** I keep posting
**Then** I get a rate-limit and no new session

**Given** remember-me is off
**When** I close the client
**Then** the next launch requires authentication (PIN may still apply)

**Implements:** FR-007, FR-008 (session half) · AD-7, AD-8, AD-17 · [prd.md §4.1 FR-007](prds/prd-muslim-marriage-africa-2026-09-27/prd.md) · screen [Auth (signup / login)](ux-designs/ux-muslim-marriage-africa-2026-10-01/EXPERIENCE.md)
**Start here:** `POST /v1/sessions + captcha adapter` · entity `session` · container `api`
**Notes:** Web/PWA: httpOnly Secure SameSite=Lax + CSRF. Capacitor: Bearer in platform secure storage.
### Story 2.3: Verify email

As a Member,
I want to confirm my email with an expiring link and resend,
So that the account has a verified inbox for reset and notices.

**Acceptance Criteria:**

**Given** I have a valid unexpired link
**When** I open it
**Then** email is marked verified

**Given** the link expired
**When** I request resend
**Then** a new link is issued and the old one fails

**Implements:** FR-006 · AD-8 · [prd.md §4.1 FR-006](prds/prd-muslim-marriage-africa-2026-09-27/prd.md) · screen [Email verification](ux-designs/ux-muslim-marriage-africa-2026-10-01/EXPERIENCE.md)
**Start here:** `POST /v1/accounts/email-verifications` · entity `account` · container `api`
### Story 2.4: Reset password

As a Member,
I want to set a new password from a single-use email link,
So that I can recover the account and old sessions die.

**Acceptance Criteria:**

**Given** my email is verified
**When** I complete reset
**Then** the new password works and old sessions are revoked except the new one

**Given** the reset link is reused
**When** I submit again
**Then** it fails

**Implements:** FR-008 · AD-8, AD-17 · [prd.md §4.1 FR-008](prds/prd-muslim-marriage-africa-2026-09-27/prd.md) · screen [Password reset](ux-designs/ux-muslim-marriage-africa-2026-10-01/EXPERIENCE.md)
**Start here:** `POST /v1/password-resets` · entity `credential, session` · container `api`
### Story 2.5: Google sign-in as an additional method

As a Member,
I want to link Google OIDC without making Google the only path,
So that I can still use email+password when Google is down.

**Acceptance Criteria:**

**Given** I complete Google OIDC
**When** the session is created
**Then** I still must complete phone OTP and ID + liveness before visibility

**Given** Google is unavailable
**When** I use email+password
**Then** I can still create and use an account

**Implements:** FR-003 · AD-8 · [prd.md §4.1 FR-003](prds/prd-muslim-marriage-africa-2026-09-27/prd.md) · screen [Auth (signup / login)](ux-designs/ux-muslim-marriage-africa-2026-10-01/EXPERIENCE.md)
**Start here:** `POST /v1/sessions/google` · entity `account, credential` · container `api`
**Notes:** Apple Sign-In stays flag `ios_apple_signin=off` (FR-004 not-MVP).
### Story 2.6: Age gate 19+ and suspected-minor hold

As a prospective Member,
I want to enter my date of birth and be blocked or held if I am under 19 or ID disagrees toward a minor,
So that minors are never publicly listed. A1 legal review stays open — copy does not claim statute.

**Acceptance Criteria:**

**Given** DOB makes me younger than `operator_config.min_age` (default 19)
**When** I submit
**Then** the account is rejected or held and never listed

**Given** ID DOB or liveness suggests a minor
**When** FR-014 runs
**Then** verification writes a hold; profiles apply `visibility=held` — not a Chat state

**Implements:** FR-011, FR-091 · AD-8, AD-13, AD-19 · [prd.md §4.1 FR-011](prds/prd-muslim-marriage-africa-2026-09-27/prd.md) · screen [Age gate](ux-designs/ux-muslim-marriage-africa-2026-10-01/EXPERIENCE.md)
**Start here:** `POST /v1/accounts (dob) + VerificationPort hold` · entity `account, verification_record` · container `api`
**Notes:** UX-DR4. Do not silently ship 18.
### Story 2.7: Phone OTP before visibility

As a Member,
I want to verify a phone number by SMS OTP,
So that public browse stays blocked until this level exists.

**Acceptance Criteria:**

**Given** I request a code
**When** SmsPort sends OTP
**Then** public listing remains blocked
**And** payload is template + ids only — no photo

**Given** I submit a correct unexpired OTP
**When** I POST `/v1/verifications/otp`
**Then** phone level is granted

**Given** I submit wrong or expired OTP
**When** I retry
**Then** Verification is not granted; resend follows published cooldown

**Implements:** FR-002, FR-053 (OTP SMS) · AD-13, AD-16 · [prd.md §4.1 FR-002](prds/prd-muslim-marriage-africa-2026-09-27/prd.md) · screen [OTP](ux-designs/ux-muslim-marriage-africa-2026-10-01/EXPERIENCE.md)
**Start here:** `POST /v1/verifications/otp` · entity `verification_record` · container `api`
**Notes:** UX-DR5 otp-input. One live SmsPort (shared with notifications).
### Story 2.8: Free ID and liveness selfie

As a Member,
I want to submit ID + liveness without paying,
So that Verification is a public good, not Premium, and liveness is matched to Profile Photos.

**Acceptance Criteria:**

**Given** I have no pack
**When** I POST `/v1/verifications/liveness` and `/v1/verifications/id`
**Then** the flow completes without an entitlement check

**Given** liveness does not match Profile Photos
**When** review runs
**Then** the Profile is not approved and I am asked to retake — not to pay

**Given** I bought Premium but skipped ID
**When** I try to become public
**Then** visibility stays blocked

**Implements:** FR-014, FR-105 · AD-13, AD-21 · [prd.md §4.1 FR-014](prds/prd-muslim-marriage-africa-2026-09-27/prd.md) · screen [ID + liveness](ux-designs/ux-muslim-marriage-africa-2026-10-01/EXPERIENCE.md)
**Start here:** `POST /v1/verifications/liveness + /v1/verifications/id` · entity `verification_record` · container `api`
**Notes:** UX-DR6. PAN/billing must not sit on this path.
### Story 2.9: Guided onboarding with Mooré and Dioula audio

As a Member,
I want to finish minimum-to-browse or complete-to-send-Invite with pictograms and audio,
So that low-literacy Members can finish without reading a French paragraph.

**Acceptance Criteria:**

**Given** I complete minimum fields only
**When** I finish onboarding
**Then** I can browse after visibility gates and cannot send an Invite

**Given** I select Mooré or Dioula
**When** I play onboarding, photo-rules, or no-auto-renew
**Then** that step’s audio plays; if 2G fails, pictograms remain

**Implements:** FR-009, FR-010 · AD-16, AD-24 · [prd.md §4.1 FR-009](prds/prd-muslim-marriage-africa-2026-09-27/prd.md) · screen [Onboarding + Photo rules](ux-designs/ux-muslim-marriage-africa-2026-10-01/EXPERIENCE.md)
**Start here:** `PUT /v1/me/onboarding` · entity `profile, audio_asset (content)` · container `web`
**Notes:** UX-DR22 audio-prompt. Player uses `audio_asset` keys; missing files take the pictogram path so this story does not wait on later content upload.
### Story 2.10: Shared-device PIN

As a Sister or Mahram on a shared Android,
I want to lock the client with a PIN after background,
So that a cousin cannot open my session.

**Acceptance Criteria:**

**Given** PIN is enabled and the app is backgrounded >60s
**When** I return
**Then** re-entry requires the PIN (full-screen sand, no photo behind)

**Given** I fail PIN five times
**When** I enter a sixth
**Then** the local session locks and I must re-authenticate with password or OTP

**Given** a Sister/Mahram PIN session is idle 15 minutes
**When** I return
**Then** I must unlock

**Implements:** FR-020, NFR-001 · AD-8, AD-17 · [prd.md §4.1 FR-020](prds/prd-muslim-marriage-africa-2026-09-27/prd.md) · screen [PIN lock](ux-designs/ux-muslim-marriage-africa-2026-10-01/EXPERIENCE.md)
**Start here:** `PUT /v1/pin + client lock` · entity `pin_lock, session` · container `web`
**Notes:** UX-DR23. Idle timeout is identity-enforced.
### Story 2.11: Deactivate with a named life-pause

As a Member,
I want to deactivate for Ramadan, exams, travel, grief, or free text and one-tap reactivate,
So that I disappear from browse without repeating onboarding.

**Acceptance Criteria:**

**Given** I am active
**When** I deactivate with a named reason
**Then** I disappear from browse, cannot receive new Invites, existing Chats show a pause state

**Given** I one-tap reactivate
**When** visibility returns
**Then** Verification and review remain valid unless Photos changed

**Implements:** FR-018 · AD-3, AD-23 · [prd.md §4.1 FR-018](prds/prd-muslim-marriage-africa-2026-09-27/prd.md) · screen [Profile edit](ux-designs/ux-muslim-marriage-africa-2026-10-01/EXPERIENCE.md)
**Start here:** `POST /v1/me/deactivate + /v1/me/reactivate` · entity `profile, account` · container `api`
### Story 2.12: Self-serve delete, export, and status URL

As a Member,
I want to delete my account, export my data, and watch a status page,
So that deletion is real and not Gmail-only. NFR-008 clocks stay [ASSUMPTION].

**Acceptance Criteria:**

**Given** I confirm delete
**When** IdentityPort.deleteAccount runs
**Then** erasure is scheduled per NFR-008 and I receive a status URL

**Given** I request export
**When** the export is ready
**Then** I download it from the status page without emailing a personal inbox

**Given** the request stalls
**When** I open the ticket
**Then** the Operator CIL queue (Epic 12) can complete it

**Implements:** FR-019, NFR-008 · AD-19, AD-18 · [prd.md §4.1 FR-019](prds/prd-muslim-marriage-africa-2026-09-27/prd.md) · screen [Delete / export status](ux-designs/ux-muslim-marriage-africa-2026-10-01/EXPERIENCE.md)
**Start here:** `POST /v1/me/delete + GET /v1/me/export-status` · entity `account, cil_ticket` · container `api`
## Epic 3: Browse without selling a face

A reviewed Member publishes Islamic-criteria fields, stays unpublished until photo/bio review, appears Blurred on one focused card by default (optional Lite grid behind a toggle), filters, and saves private favourites. Discovery never ships a clear original.

**FRs covered:** FR-012, FR-013, FR-015, FR-017, FR-021, FR-022, FR-023, FR-024, FR-025, FR-026, FR-027, FR-056, FR-065, FR-069, FR-070, FR-136

### Story 3.1: Profile fields, Islamic criteria, and completeness

As a Member,
I want to save age/DOB, city, origin, marital status, education, profession, practice, intentions, madhhab, and a completeness meter that names missing fields,
So that I can become Invite-ready without being shamed.

**Acceptance Criteria:**

**Given** a required Invite field is empty
**When** I try to send an Invite later
**Then** send is blocked and the meter lists the field by name — no “profil faible”

**Given** I am a Brother with marital_status `married`
**When** I save without polygamy_intent `yes`
**Then** the save is rejected (AD-26)

**Given** flags for NEXT fields
**When** I edit Profile
**Then** confrérie / hijra / who-favourited / visitors / online-now / anonymous are absent

**Implements:** FR-021, FR-022, FR-023, FR-037 (fields) · AD-3, AD-26 · [prd.md §4.2 FR-021](prds/prd-muslim-marriage-africa-2026-09-27/prd.md) · screen [Profile edit](ux-designs/ux-muslim-marriage-africa-2026-10-01/EXPERIENCE.md)
**Start here:** `PUT /v1/me/profile` · entity `profile, profile_field, completeness` · container `api`
**Notes:** UX-DR7 completeness-meter. OQ-1 first-wife notification stays unbuilt.
### Story 3.2: Upload a Profile Photo that stays unpublished and blurred

As a Member,
I want to upload a Profile Photo that is stored as original + blur derivatives and is not publicly visible until review,
So that opposite-gender viewers never receive a clear original, and an unreviewed photo is not a Chat hold.

**Acceptance Criteria:**

**Given** I upload a Profile Photo
**When** MediaPort stores it
**Then** `kind=profile_photo`, serializers never emit `original_key`, unauthorized viewers would only be eligible for `blur`
**And** public/discovery omit it until review (FR-065)

**Given** I view my own edit screen
**When** the pending photo shows
**Then** caption « Photo en revue — pas encore publique » — not a Chat state

**Given** I try a CSS blur of `original` on the client
**When** code review / test
**Then** that path does not exist (AD-9)

**Implements:** FR-016, FR-056, FR-065 · AD-9, AD-10 · [prd.md §4.5 FR-056 + §4.6 FR-065](prds/prd-muslim-marriage-africa-2026-09-27/prd.md) · screen [Profile not-yet-public + blur-photo](ux-designs/ux-muslim-marriage-africa-2026-10-01/EXPERIENCE.md)
**Start here:** `POST /v1/media (upload init)` · entity `photo_asset, derivative` · container `api`
**Notes:** UX-DR9. applyModeration legal only for profile_photo and bio.
### Story 3.3: Human review before anyone else sees me

As a new Member,
I want every new Profile and new Profile Photo/bio to be human-reviewed before public visibility, with one published SLA,
So that people lists cannot show an unreviewed face. Paid faster queue is not a rubber stamp.

**Acceptance Criteria:**

**Given** my Profile is not approved
**When** another Member browses
**Then** I do not appear

**Given** I have Premium
**When** I enter the queue
**Then** I am ordered ahead of Free but still need a human decision — scan/review is not skipped

**Given** I wait longer than `free_review_sla_hours`
**When** Operator metrics open
**Then** the case is SLA-breach

**Given** public help/pricing
**When** I read review timing
**Then** a single SLA is stated

**Implements:** FR-012, FR-013 · AD-10, AD-21 · [prd.md §4.1 FR-012](prds/prd-muslim-marriage-africa-2026-09-27/prd.md) · screen [Profile not-yet-public](ux-designs/ux-muslim-marriage-africa-2026-10-01/EXPERIENCE.md)
**Start here:** `staff POST /v1/staff/cases (profile review)` · entity `moderation_case, profile` · container `api`
### Story 3.4: Edit Profile and re-moderate Photos

As a Member,
I want to edit fields any time and keep the old Photo live until the new one is approved,
So that a rejected upload does not blank my Profile.

**Acceptance Criteria:**

**Given** I upload a new Photo on an approved Profile
**When** review is pending
**Then** the old Photo remains live

**Given** the new Photo is rejected
**When** I view my Profile
**Then** the previous approved Photo remains (subject to Strike)

**Given** a new bio is blocked
**When** I view edit
**Then** the previous allowed bio stays live

**Implements:** FR-017, FR-065 · AD-10 · [prd.md §4.1 FR-017](prds/prd-muslim-marriage-africa-2026-09-27/prd.md) · screen [Profile edit](ux-designs/ux-muslim-marriage-africa-2026-10-01/EXPERIENCE.md)
**Start here:** `PUT /v1/me/profile + POST /v1/media` · entity `profile, photo_asset` · container `api`
### Story 3.5: Photo rules with pictograms and audio

As a Member,
I want to see modest/recent/real/no-third-parties rules as pictograms plus Mooré/Dioula audio,
So that I can follow haya rules without reading a paragraph.

**Acceptance Criteria:**

**Given** I open rules at upload
**When** the screen renders
**Then** pictograms are visible without a paragraph

**Given** Mooré audio is selected
**When** I play rules
**Then** audio matches the pictogram set; failure leaves pictograms

**Implements:** FR-070, FR-010 · AD-24 · [prd.md §4.6 FR-070](prds/prd-muslim-marriage-africa-2026-09-27/prd.md) · screen [Photo rules](ux-designs/ux-muslim-marriage-africa-2026-10-01/EXPERIENCE.md)
**Start here:** `GET /v1/academie or content locale_string + audio keys` · entity `locale_string, audio_asset` · container `web`
**Notes:** UX-DR22.
### Story 3.6: Photo Strike floor

As a Member who keeps failing photo review,
I want three rejected Photos to block upload for 24h,
So that repeat indecency cannot flood the queue.

**Acceptance Criteria:**

**Given** I have three rejected Profile or Chat Photos
**When** I upload a fourth within `photo_strike_block_hours`
**Then** upload is blocked until the window ends

**Given** the window ends
**When** I upload
**Then** the block count has reset per published policy

**Implements:** FR-069 · AD-10 · [prd.md §4.6 FR-069](prds/prd-muslim-marriage-africa-2026-09-27/prd.md) · screen [Profile edit](ux-designs/ux-muslim-marriage-africa-2026-10-01/EXPERIENCE.md)
**Start here:** `MediaPort.upload guard` · entity `strike` · container `api`
### Story 3.7: Verification levels on the Profile

As a Member viewing another Profile,
I want to see phone / ID / Mahram levels and never a Premium “looks verified” badge,
So that payment cannot impersonate identity.

**Acceptance Criteria:**

**Given** the other Member completed only OTP
**When** I view their Profile
**Then** only the phone level is shown

**Given** ID + liveness is approved
**When** I view
**Then** the ID level is shown

**Given** Premium is active
**When** the Profile renders
**Then** no badge implies identity Verification from payment

**Implements:** FR-015 · AD-13 · [prd.md §4.1 FR-015](prds/prd-muslim-marriage-africa-2026-09-27/prd.md) · screen [Profile detail](ux-designs/ux-muslim-marriage-africa-2026-10-01/EXPERIENCE.md)
**Start here:** `GET /v1/profiles/:id` · entity `verification_record, profile` · container `web`
### Story 3.8: Optional Lite discovery grid

As a Member,
I want an optional two-column cached grid of opposite-gender approved Profiles with deferred images,
So that I can switch from the default card (story 3.13) when I want a denser list on 2G, without a full-bleed face feed.

**Acceptance Criteria:**

**Given** I open Découvrir
**When** the screen loads
**Then** the default view is the focused card (story 3.13), not this grid
**And** a card/grid toggle is present on the screen

**Given** I switch the toggle to grid and visibility-approved opposite-gender Profiles exist
**When** `GET /v1/browse?view=grid`
**Then** small cards render; first-grid metadata + blur thumbs ≤150KB (AD-16); no invented Profiles on empty
**And** no online-now; no invented counts

**Given** Lite is on and 3G is throttled
**When** the optional grid loads
**Then** text criteria appear within NFR-005 (≤8s) even if images stay deferred

**Given** NEXT flags
**When** I look at the home
**Then** no who-favourited, visitors, online-now, or learning recs rail

**Implements:** FR-025, FR-136, NFR-005 · AD-16, AD-9, AD-28 · [prd.md §4.2 FR-025](prds/prd-muslim-marriage-africa-2026-09-27/prd.md) · screen [Discover](ux-designs/ux-muslim-marriage-africa-2026-10-01/EXPERIENCE.md)
**Start here:** `GET /v1/browse?view=grid` · entity `profile` · container `web`
**Notes:** UX-DR8, UX-DR26. Mock: mockups/discovery-lite.html is grid-only — spine wins; default is the single card (story 3.13). Toggle stays on Discover and Search.
### Story 3.9: Basic filters

As a Member,
I want to filter by city, marital status, practice, life plans, and distance,
So that I can narrow to sincere criteria without paid advanced filters.

**Acceptance Criteria:**

**Given** I filter marital `married` + polygamy `yes`
**When** results return
**Then** Brothers who have not set those fields are excluded

**Given** I apply 25 km around Ouagadougou
**When** results return
**Then** Profiles outside that city centroid are excluded

**Given** results return
**When** the screen renders
**Then** they render as the focused card or the optional grid (`view=card|grid`); empty state is not grid-only
**And** the card/grid toggle remains (a many-filter search may open on the grid)

**Given** zero results
**When** card or grid renders
**Then** empty-state, no invented Profiles. Advanced filters stay off (FR-030 stays NEXT)

**Implements:** FR-024, FR-025 · AD-16, AD-28 · [prd.md §4.2 FR-024](prds/prd-muslim-marriage-africa-2026-09-27/prd.md) · screens [Filters](ux-designs/ux-muslim-marriage-africa-2026-10-01/EXPERIENCE.md), [Search](ux-designs/ux-muslim-marriage-africa-2026-10-01/EXPERIENCE.md)
**Start here:** `GET /v1/browse?view=card|grid&filters + GET /v1/filters` · entity `profile` · container `api`
### Story 3.10: Private favourites

As a Member,
I want to save a Profile to a list only I can see,
So that I can return later without a vanity “who favourited me” surface.

**Acceptance Criteria:**

**Given** I favourite a Profile
**When** I open Favourites
**Then** it appears only on my private list

**Given** another Member opens settings
**When** they look for who favourited them
**Then** the list does not exist (flag off)

**Implements:** FR-026 · AD-3, AD-22 · [prd.md §4.2 FR-026](prds/prd-muslim-marriage-africa-2026-09-27/prd.md) · screen [Favourites](ux-designs/ux-muslim-marriage-africa-2026-10-01/EXPERIENCE.md)
**Start here:** `POST /v1/favourites` · entity `favourite` · container `api`
### Story 3.11: Visit patterns for Moderators only

As a Moderator,
I want to see Members who view many Profiles and never Invite,
So that T&S can spot spray-and-browse without a member visitors list.

**Acceptance Criteria:**

**Given** a Member views more than the published threshold (working 50/24h) without an Invite
**When** I open T&S signals
**Then** that Member is listed

**Given** I am a Member
**When** I open settings
**Then** there is no “who viewed me” list

**Implements:** FR-027 · AD-3, AD-22 · [prd.md §4.2 FR-027](prds/prd-muslim-marriage-africa-2026-09-27/prd.md) · screen [T&S visit signals](ux-designs/ux-muslim-marriage-africa-2026-10-01/EXPERIENCE.md)
**Start here:** `GET /v1/staff/signals/visits` · entity `profile_visit` · container `api`
### Story 3.12: Lite mode setting

As a Member on a 1GB-class Android,
I want to turn on data-saver: deferred images, no autoplay, cached browse,
So that I can use the product on ~1GB/month.

**Acceptance Criteria:**

**Given** Lite is on
**When** a Chat Photo arrives later
**Then** it is not auto-downloaded at full resolution until tap

**Given** Lite is on
**When** browse loads
**Then** lite-placeholders hold the card size while criteria stay visible

**Implements:** FR-136, NFR-005 · AD-16 · [prd.md §4.12 FR-136](prds/prd-muslim-marriage-africa-2026-09-27/prd.md) · screen [Settings](ux-designs/ux-muslim-marriage-africa-2026-10-01/EXPERIENCE.md)
**Start here:** `PUT /v1/me/prefs (lite)` · entity `account / operator_config` · container `web`
**Notes:** UX-DR26, UX-DR30.
### Story 3.13: One focused card, with an optional grid

As a Member,
I want Discover and Search to open on one focused card, with an optional grid behind a toggle,
So that I see one Profile at a time with shared traits, and I can pass without liking.

**Acceptance Criteria:**

**Given** I open Découvrir or Search
**When** the screen loads
**Then** default `view=card` and I see one visibility-approved opposite-gender Profile
**And** `GET /v1/browse?view=card|grid` defaults to card when `view` is omitted

**Given** the focused card renders
**When** `sharedTraits` are computed
**Then** they come only from existing Profile fields (polygamy intent, same city, other stored fields)
**And** no kids column is added and bio is not parsed; if no stored kids field exists, that chip is omitted (the PRD names kids only as an example of a shared existing field)

**Given** I pass
**When** I POST `/v1/browse/pass`
**Then** the Profile is a viewer-scoped exclusion — not a like, not a favourite, not a public counter
**And** no Invite or message is sent

**Given** I toggle to grid
**When** a many-filter search opened on the grid
**Then** the card/grid toggle remains and returns me to one focused card

**Given** I Invite or send a quick message from the card
**When** I submit
**Then** those are the existing invite / Flash commands (story 4.3) and obey Invite quota (FR-044 / FR-045) and FR-146

**Given** Lite is on
**When** the card loads
**Then** small image, text first (AD-16); first-card metadata + blur thumb stays within the AD-16 budget; no online-now; no invented counts

**Implements:** FR-024, FR-025, FR-136, FR-146 · AD-28, AD-16 · [prd.md §4.2 FR-024](prds/prd-muslim-marriage-africa-2026-09-27/prd.md) · screens [Discover](ux-designs/ux-muslim-marriage-africa-2026-10-01/EXPERIENCE.md), [Search](ux-designs/ux-muslim-marriage-africa-2026-10-01/EXPERIENCE.md)
**Start here:** `GET /v1/browse?view=card|grid` + `POST /v1/browse/pass` · entity `profile` · container `web + api`
**Notes:** UX-DR8, UX-DR26. Pass is dismiss. Card quick message is Message Flash (story 4.3).
## Epic 4: Invite only with Sister consent

Members send and decide Invites. Sister invite reach follows `sister_reach_mode`: default `free_unlimited` (unlimited Invites; no pack required for reach); `same_quota_as_brothers` uses the same Free Invite cap as Brothers. Sisters can buy the same 1/3/6 packs in both modes because messages are capped (FR-146). Brothers stay on the paid Invite quota (Free 3 `[ASSUMPTION]`; Premium unlimited). Marital status and polygamy intent are visible before accept. Decline is quiet. Chat is created only after Sister consent.

**FRs covered:** FR-016, FR-037, FR-038, FR-039, FR-040, FR-041, FR-042, FR-043, FR-044, FR-045, FR-046, FR-047, FR-145

### Story 4.1: Send an Invite

As a Invite-ready Member,
I want to send an Invite to an eligible opposite-gender Member,
So that ta'aruf starts as a request, not a like.

**Acceptance Criteria:**

**Given** I have a Profile Photo and Invite-ready fields
**When** I POST `/v1/invites`
**Then** it appears on the recipient’s received list

**Given** I have no Profile Photo
**When** I try to send
**Then** the action is blocked with a prompt to add a Photo

**Given** the recipient is deactivated, Banned, or married
**When** I submit
**Then** the Invite is rejected

**Given** I am a Sister and `sister_reach_mode` is `free_unlimited`
**When** I send my Nth Invite
**Then** it is not blocked by a paid quota and I am not asked to buy a pack
**And** the send path does not call `BillingPort`

**Given** I am a Sister and `sister_reach_mode` is `same_quota_as_brothers` with no pack
**When** I send a 4th Invite the same Ouaga day
**Then** I get `QUOTA_EXCEEDED` with the reset time (same Free cap as Brothers)

**Implements:** FR-038, FR-016, FR-045 · AD-23, AD-21, AD-27 · [prd.md §4.3 FR-038](prds/prd-muslim-marriage-africa-2026-09-27/prd.md) · screen [Invite compose + Message Flash](ux-designs/ux-muslim-marriage-africa-2026-10-01/EXPERIENCE.md)
**Start here:** `POST /v1/invites` · entity `invite` · container `api`
### Story 4.2: Brother daily Invite quota

As a Brother,
I want a daily Free Invite quota of 3 `[ASSUMPTION]` that resets on the Ouagadougou civil day, and unlimited Invites when Premium,
So that spray-and-pray is expensive and Sisters are not paywalled. There is no Premium Invite cap of 15.

**Acceptance Criteria:**

**Given** I am Free and already sent 3 today
**When** I send a fourth
**Then** I get `QUOTA_EXCEEDED` with the Ouaga-day reset time
**And** `QUOTA_EXCEEDED` is Invite-only — it is never used for the FR-146 message cap

**Given** I am Premium
**When** I send Invites
**Then** there is no daily Invite cap (the 4th, 16th, and Nth succeed)

**Given** billing is `unavailable` and I am a Sister and `sister_reach_mode` is `free_unlimited`
**When** I send an Invite
**Then** the send succeeds and the Invite path does not call `BillingPort`

**Given** billing is `unavailable` and I am a Sister and `sister_reach_mode` is `same_quota_as_brothers`
**When** I send Invites
**Then** the Free Invite cap applies (same as Brothers); safety is not blocked

**Given** browse ranking is inspected
**When** MVP Premium
**Then** no paid ranking boost (FR-111 stays off)

**Implements:** FR-044, FR-110 (Invite half) · AD-21, AD-23, AD-27 · [prd.md §4.3 FR-044](prds/prd-muslim-marriage-africa-2026-09-27/prd.md) · screen [Invite compose + Message Flash](ux-designs/ux-muslim-marriage-africa-2026-10-01/EXPERIENCE.md)
**Start here:** `POST /v1/invites (quota guard)` · entity `invite_quota` · container `api`
**Notes:** AD-23 supersedes PRD UTC wording. Historical Premium cap of 15 is superseded 2026-10-02.
### Story 4.3: Message Flash and Ice Breaker templates

As a Member composing an Invite,
I want to attach an editable deen/family first message that is visible before accept,
So that the first words are sincere and already delivered — a later flag does not unsend.

**Acceptance Criteria:**

**Given** I send Flash text and I am under the FR-146 cap (or Premium)
**When** the recipient opens the Invite
**Then** Flash is visible before accept and persisted immediately
**And** Flash counts once against FR-146 via `ChatPort.consumeMessageQuota` BEFORE invite persist
**And** card quick message is that same Flash (story 3.13) — counted once

**Given** I am Free and at the FR-146 cap
**When** I submit Invite + Flash (or card quick message)
**Then** `MESSAGE_CAP_EXCEEDED` persists neither Invite nor Flash
**And** nothing is stored or held for scan

**Given** Invite quota is exceeded first (Brother, or Sister in `same_quota_as_brothers`)
**When** I submit Invite + Flash
**Then** `QUOTA_EXCEEDED` is returned and `message_quota` is not consumed

**Given** `ChatPort.openFromInvite` later opens Chat
**When** Flash is read through `flash_id`
**Then** `openFromInvite` must not increment `message_quota` and must not consult the cap

**Given** Flash contains a phone, WhatsApp, or link
**When** I submit
**Then** `CONTACT_SHARE_REQUIRED` — Flash cannot have Contact-share open

**Given** I pick an Ice Breaker template
**When** I edit and send
**Then** the edited text is what arrives. No AI-personalised generator

**Given** background scan later flags an allowed Flash
**When** the Invite is inspected
**Then** Flash is not unsent; the person is flagged for admin

**Implements:** FR-046, FR-047, FR-068 (Flash matcher), FR-146 · AD-10, AD-17, AD-23, AD-29 · [prd.md §4.3 FR-046](prds/prd-muslim-marriage-africa-2026-09-27/prd.md) · screen [Invite compose + Message Flash](ux-designs/ux-muslim-marriage-africa-2026-10-01/EXPERIENCE.md)
**Start here:** `POST /v1/invites (flash_id)` · entity `message_flash, invite` · container `api`
**Notes:** UX-DR16 flash-composer. enqueueScan after persist. Not copied into a message row.
### Story 4.4: Invite inbox with marital honesty

As a Sister,
I want to see sent / received / accepted Invites with marital status and polygamy intent before I accept,
So that I do not hope on a hidden marriage. ID is not marital proof.

**Acceptance Criteria:**

**Given** a Brother-sent Invite is pending
**When** I open Received
**Then** I see marital_status and polygamy_intent before accept

**Given** I open Sent
**When** rows render
**Then** pending / accepted / declined — declined has no guilt copy

**Given** I report “misrepresented marital status”
**When** submit
**Then** the Report reason `misrepresented marital status` is available (the Report API is Story 8.5)

**Implements:** FR-037, FR-040 · AD-26 · [prd.md §4.2 FR-037](prds/prd-muslim-marriage-africa-2026-09-27/prd.md) · screen [Invite inbox](ux-designs/ux-muslim-marriage-africa-2026-10-01/EXPERIENCE.md)
**Start here:** `GET /v1/invites` · entity `invite, profile` · container `web`
**Notes:** UX-DR15 invite-row.
### Story 4.5: Accept, quiet decline, and open Chat only after Sister consent

As a Sister,
I want to accept or quietly decline, and to have Chat created only when I have consented,
So that a Brother never gets a secret thread. Decline is not a lecture.

**Acceptance Criteria:**

**Given** he sent the Invite
**When** I accept
**Then** `ChatPort.openFromInvite` inserts `conversation` and stage is `chat`

**Given** he sent the Invite
**When** I decline with button-quiet
**Then** no Chat exists; he sees declined without a read receipt or guilt timer; he cannot resend

**Given** I sent the Invite
**When** he accepts
**Then** Chat opens (my send counted as consent)

**Given** he opens messages on a pending Invite he sent
**When** he looks for a thread
**Then** there is none

**Implements:** FR-039, FR-041, FR-042, FR-043 · AD-23 · [prd.md §4.3 FR-039](prds/prd-muslim-marriage-africa-2026-09-27/prd.md) · screen [Invite inbox](ux-designs/ux-muslim-marriage-africa-2026-10-01/EXPERIENCE.md)
**Start here:** `POST /v1/invites/:id/accept|decline` · entity `invite, conversation` · container `api`
**Notes:** UX-DR2 button-quiet. Only ChatPort.openFromInvite inserts conversation.
### Story 4.6: Flash stays a first-class item, not a Chat message copy

As a Member,
I want Message Flash to stay on the Invite (`flash_id`) and never be copied into a parallel `message` row,
So that later Mahram granted-thread read (Epic 7) can read the same delivered Flash without a second store.

**Acceptance Criteria:**

**Given** an Invite with Flash
**When** I inspect storage
**Then** Flash lives on `message_flash` / `invite.flash_id` only — Chat does not insert a duplicate `message`

**Given** no Mahram exists yet
**When** the recipient opens the Invite
**Then** only the two Members see the Flash

**Implements:** FR-046 (store invariant) · AD-10, AD-23 · [prd.md §4.3 FR-046](prds/prd-muslim-marriage-africa-2026-09-27/prd.md) · screen [Invite compose + Message Flash](ux-designs/ux-muslim-marriage-africa-2026-10-01/EXPERIENCE.md)
**Start here:** `GET /v1/invites/:id` (flash read-through) · entity `message_flash` · container `api`
**Notes:** FR-048 Mahram visibility is Story 7.4, after `mahram_link` exists.
### Story 4.7: Operator sister-reach mode and Sister checkout

As an Operator,
I want to set `sister_reach_mode` to `free_unlimited` or `same_quota_as_brothers`,
So that Sisters stay Invite-unlimited by default, and I can apply the same Free Invite cap as Brothers without a release — never a brother-free mode. Sister checkout exists in both modes because messages are capped (FR-146).

**Acceptance Criteria:**

**Given** I am an Operator
**When** I PATCH `/v1/staff/config` with `sister_reach_mode` = `same_quota_as_brothers` or `free_unlimited`
**Then** the value is stored, both values exist in seed and code on day one, and an AD-18 audit event is written in the same unit of work with `from`, `to`, `staffId`
**And** a moderator, system, or env/SQL write is rejected
**And** subsequent Sister Invites use the new mode; past Invites are not deleted; already-sent Invites that day do not count toward a newly applied cap

**Given** `sister_reach_mode` is `free_unlimited` (DEFAULT)
**When** a Sister opens Invite compose
**Then** copy is « Invitations illimitées. »; no Invite remaining/cap; no reach-pack offer for Invite send
**And** Sister invite send, Invite quota GET, and Invite compose do not call `BillingPort`
**And** `QUOTA_EXCEEDED` is never returned for a Sister Invite
**And** Free-tier messages still hit FR-146 unless she has Premium (story 5.11)
**And** `GET /v1/packs` and `POST /v1/payments` DO offer a Sister pack in this mode, for unlimited messages (and unlimited Invites)

**Given** `sister_reach_mode` is `same_quota_as_brothers`
**When** a Sister opens Invite compose or pricing
**Then** she sees the same Free **3** `[ASSUMPTION]` daily Invite cap and Ouaga-day reset as Brothers; Premium Invite send is unlimited (not 15)
**And** hitting the Invite cap opens the Sister invite quota wall whose CTA opens the same Payment pack checkout (Orange/Moov/Wave, 1/3/6, no auto-renew)
**And** a successful Sister pack purchase entitles her to unlimited Invites and unlimited messages until `ends_at`

**Given** either `sister_reach_mode`
**When** a Sister opens `GET /v1/packs` or `POST /v1/payments`
**Then** a Sister pack is offered (unlimited messages, and unlimited Invites). Do not say “no pack” for messages. Sister checkout is story 4.7 / 10.1, not a second Invite quota.

**Given** a Brother
**When** he opens Invite or pricing in either mode
**Then** he stays on the paid Invite quota; there is no brother-free control

**Given** Verification, Blur/Reveal, Mahram attach, Report, or Block
**When** either mode
**Then** those paths succeed without calling `BillingPort`
**And** Chat-after-accept volume is FR-146 (`BillingPort.isEntitled` only to decide the cap) — not “never BillingPort”
**And** passive moderation stays; no pre-delivery hold

**Implements:** FR-145, FR-045, FR-105, FR-146 · AD-27, AD-21, AD-14, AD-18, AD-29 · [prd.md §4.13 FR-145](prds/prd-muslim-marriage-africa-2026-09-27/prd.md) · screens [Operator sister-reach mode](ux-designs/ux-muslim-marriage-africa-2026-10-01/EXPERIENCE.md), [Sister invite quota wall](ux-designs/ux-muslim-marriage-africa-2026-10-01/EXPERIENCE.md), [Payment pack](ux-designs/ux-muslim-marriage-africa-2026-10-01/EXPERIENCE.md), [Message quota wall](ux-designs/ux-muslim-marriage-africa-2026-10-01/EXPERIENCE.md)
**Start here:** `PATCH /v1/staff/config (sister_reach_mode)` · entity `operator_config` · container `api`
**Notes:** UX `operator-reach-mode`. Sister checkout exists in both modes and is not compiled out. Safety modules must not import BillingPort. Historical “no pack” for Sisters in `free_unlimited` is superseded 2026-10-02 for messages.
## Epic 5: Talk immediately after accept

After Sister consent, Members exchange text, Chat Photos, and Voice notes. An allowed send appears as soon as it is stored. A Free sender at `daily_message_cap` is rejected (`MESSAGE_CAP_EXCEEDED`); nothing is stored or held. Premium does not increment `message_quota`. Contact-share still blocks phone/WhatsApp/links until both opt in. Each allowed persist enqueues a background scan and does not hold the send. Banned Chat states: pending, held, pending-moderation, scan-wait, fail-closed.

**FRs covered:** FR-028, FR-050, FR-051, FR-052, FR-053, FR-062, FR-063, FR-064, FR-068, FR-146

### Story 5.1: Realtime Chat thread without a hold state

As a Member in an accepted Chat,
I want to open a thread with typing indicators and delivered bubbles that never wait on AI,
So that ta'aruf feels like a conversation, not a quarantine inbox.

**Acceptance Criteria:**

**Given** Chat exists
**When** I open Discussions
**Then** thread open ≤4s; no hold badge; TalkBack says nothing about scan

**Given** I type
**When** the other Member is on median 3G
**Then** they see typing within 2s

**Given** I inspect message.state in API/DB
**When** I look for pending/held
**Then** the only created state is `delivered`. No member copy « En cours de vérification »

**Implements:** FR-050, NFR-005 · AD-15, AD-10 · [prd.md §4.4 FR-050](prds/prd-muslim-marriage-africa-2026-09-27/prd.md) · screen [Chat thread](ux-designs/ux-muslim-marriage-africa-2026-10-01/EXPERIENCE.md)
**Start here:** `GET /v1/conversations/:id + Socket.IO /v1/realtime` · entity `conversation, message` · container `api`
**Notes:** UX-DR11 chat-bubble. Mock: mockups/chat-thread.html. Events carry media_id only, never a signed URL.
### Story 5.2: Send Chat text — delivered, then enqueue scan

As a Member,
I want to send text that the recipient sees as soon as it is stored,
So that a later admin flag does not unsend what they already read.

**Acceptance Criteria:**

**Given** I tap send and I am under the FR-146 cap (or Premium)
**When** the row is persisted
**Then** the recipient sees the text without waiting for AI
**And** Chat calls `ModerationPort.enqueueScan` after persist
**And** if I am Premium, `message_quota` is not incremented

**Given** I am Free and at the FR-146 cap
**When** I tap send
**Then** I get `MESSAGE_CAP_EXCEEDED` and nothing is stored or held
**And** no `moderation_job` is enqueued

**Given** AI is down
**When** I send an allowed text
**Then** ack still returns; scan-deferred is Epic 8’s job, not a send block

**Given** I send an allowed text from 3G
**When** ack timing
**Then** send-text ack ≤2s (NFR-005)

**Implements:** FR-062, FR-050, FR-146, NFR-003 · AD-10, AD-15, AD-29 · [prd.md §4.6 FR-062](prds/prd-muslim-marriage-africa-2026-09-27/prd.md) · screen [Chat thread](ux-designs/ux-muslim-marriage-africa-2026-10-01/EXPERIENCE.md)
**Start here:** `POST /v1/conversations/:id/messages (kind=text)` · entity `message, moderation_job (enqueue only)` · container `api`
**Notes:** Chat decrypts for the scan payload; moderation does not SELECT message. Body stored as ciphertext {v,alg,kid,iv,ct}. Cap consult is story 5.11.
### Story 5.3: Send a Chat Photo — delivered, then enqueue scan

As a Member,
I want to send a gallery/camera Photo that the recipient sees immediately,
So that blur remains privacy, not a moderation delivery outcome, and a later flag does not unsend.

**Acceptance Criteria:**

**Given** I upload a Chat Photo and I am under the FR-146 cap (or Premium)
**When** it is stored `kind=chat_photo`
**Then** the recipient’s thread shows it without waiting for AI
**And** unauthorized viewers still never get originals
**And** if I am Premium, `message_quota` is not incremented

**Given** I am Free and at the FR-146 cap
**When** I try to send a Chat Photo
**Then** I get `MESSAGE_CAP_EXCEEDED` and nothing is stored or held

**Given** sign for chat_photo
**When** MediaPort.sign is called
**Then** it must not wait on applyModeration

**Given** GIF picker
**When** I compose
**Then** no picker (flag off)

**Implements:** FR-063, FR-050, FR-146 · AD-9, AD-10, AD-29 · [prd.md §4.6 FR-063](prds/prd-muslim-marriage-africa-2026-09-27/prd.md) · screen [Chat thread](ux-designs/ux-muslim-marriage-africa-2026-10-01/EXPERIENCE.md)
**Start here:** `POST /v1/conversations/:id/messages (kind=photo)` · entity `message, photo_asset` · container `api`
### Story 5.4: Send a Voice note — playable immediately

As a Free Member,
I want to send a French / Mooré / Dioula Voice note the recipient can hear without waiting for STT,
So that voice is a safety feature, not a Premium toy, and Mooré/Dioula never justify a hold.

**Acceptance Criteria:**

**Given** I send a Voice note and I am under the FR-146 cap (or Premium)
**When** it is stored `kind=voice_note`
**Then** the recipient can play it immediately; no member-facing transcript
**And** if I am Premium, `message_quota` is not incremented

**Given** I am Free and at the FR-146 cap
**When** I try to send a Voice note
**Then** I get `MESSAGE_CAP_EXCEEDED` and nothing is stored or held

**Given** Premium is inactive and I am under the cap
**When** I send
**Then** the action is not blocked as a safety paywall; it still counts against FR-146

**Given** language is mos/dyu
**When** enqueueScan runs later on an allowed Voice note
**Then** delivery already happened — AD-11 does not hold

**Implements:** FR-051, FR-064, FR-146 · AD-10, AD-11, AD-21, AD-29 · [prd.md §4.4 FR-051](prds/prd-muslim-marriage-africa-2026-09-27/prd.md) · screen [Chat thread](ux-designs/ux-muslim-marriage-africa-2026-10-01/EXPERIENCE.md)
**Start here:** `POST /v1/conversations/:id/messages (kind=voice)` · entity `message, photo_asset (voice_note)` · container `api`
**Notes:** UX-DR12. Not content.audio_asset.
### Story 5.5: Contact-share and money-ask education

As a Member,
I want phone numbers, WhatsApp handles, and links to stay blocked until both of us opt in, while money-ask language is delivered and flagged,
So that off-platform grooming is harder, and that rule is not an AI hold.

**Acceptance Criteria:**

**Given** Contact-share is off
**When** I send a phone, WhatsApp, or http(s) link
**Then** persist is refused with `CONTACT_SHARE_REQUIRED` and both Members see the interstitial

**Given** both opted in
**When** I send a number
**Then** it is delivered immediately and still background-scanned

**Given** I send money-ask language (Wave / Orange Money)
**When** Contact-share on or off
**Then** the message is delivered, the person is flagged, and in-Chat education “never send money to a suitor” is shown after delivery

**Implements:** FR-068 · AD-17, AD-10 · [prd.md §4.6 FR-068](prds/prd-muslim-marriage-africa-2026-09-27/prd.md) · screen [Contact-share interstitial](ux-designs/ux-muslim-marriage-africa-2026-10-01/EXPERIENCE.md)
**Start here:** `POST /v1/conversations/:id/contact-share + local matcher in chat/invites` · entity `contact_share` · container `api`
**Notes:** UX-DR14. Matcher must not call ModerationPort. Only chat writes contact_share.
### Story 5.6: Ta'aruf stages including meeting confirm

As a Member or a Mahram with an active grant on that thread,
I want to see stage `invite | chat | meeting | married` and confirm a meeting without a full planner,
So that the path is visible. The NEXT planner is not mocked as live.

**Acceptance Criteria:**

**Given** pending Invite
**When** either views it
**Then** stage is `invite`

**Given** Chat is open
**When** either Member or a Mahram with an active grant on that thread proposes meeting and the other Member confirms
**Then** stage becomes `meeting`; Brother-only mark does not change stage

**Given** Mahram rejects a proposal
**When** compose
**Then** compose pauses until the Sister resumes

**Given** time/place/attendee fields
**When** I look at MVP
**Then** they are absent (FR-082 not-MVP)

**Implements:** FR-028 · AD-23 · [prd.md §4.2 FR-028](prds/prd-muslim-marriage-africa-2026-09-27/prd.md) · screen [Chat thread](ux-designs/ux-muslim-marriage-africa-2026-10-01/EXPERIENCE.md)
**Start here:** `POST /v1/conversations/:id/stage` · entity `conversation.taaruf_stage` · container `api`
**Notes:** UX-DR17 stage-chip.
### Story 5.7: Message reactions

As a Member,
I want to add a reaction another Member can see,
So that acknowledgement does not need a new message.

**Acceptance Criteria:**

**Given** I react to a delivered message
**When** the other views it
**Then** the reaction is visible

**Implements:** FR-050 · AD-15 · [prd.md §4.4 FR-050](prds/prd-muslim-marriage-africa-2026-09-27/prd.md) · screen [Chat thread](ux-designs/ux-muslim-marriage-africa-2026-10-01/EXPERIENCE.md)
**Start here:** `POST /v1/conversations/:id/messages/:mid/reactions` · entity `reaction` · container `api`
### Story 5.8: Push notifications with blur thumbs only

As a Member with push enabled,
I want to be notified of messages, Invites, Reveal requests, Mahram pause/end, and sanctions without a clear Photo or Chat body,
So that a lock screen cannot leak a face or a phone number.

**Acceptance Criteria:**

**Given** a delivered message arrives
**When** FCM or Web Push fires
**Then** payload is template + ids; thumb is blur only

**Given** push permission is denied
**When** a message arrives
**Then** in-app unread still increments

**Implements:** FR-052 · AD-16, AD-9 · [prd.md §4.4 FR-052](prds/prd-muslim-marriage-africa-2026-09-27/prd.md) · screen [Notifications](ux-designs/ux-muslim-marriage-africa-2026-10-01/EXPERIENCE.md)
**Start here:** `POST /v1/devices + notification dispatch` · entity `notification` · container `worker`
### Story 5.9: SMS on the essential path

As a Sister, Mahram, or sanctioned Member,
I want SMS for Invite received, Mahram pause/end/flag, Contact-share rejects, admin suspend/Ban, and OTP,
So that 2G death does not hide a guardian action. USSD stays disabled.

**Acceptance Criteria:**

**Given** I receive an Invite and SMS alerts are on
**When** SmsPort sends
**Then** no Photo payload, no Chat body, no phone of the other party

**Given** Mahram pause/end/flag commits
**When** SMS
**Then** Sister and Brother receive it

**Given** UssdPort
**When** I inspect flags
**Then** `ussd=off`

**Implements:** FR-053 · AD-16 · [prd.md §4.4 FR-053](prds/prd-muslim-marriage-africa-2026-09-27/prd.md) · screen [Notifications](ux-designs/ux-muslim-marriage-africa-2026-10-01/EXPERIENCE.md)
**Start here:** `SmsPort.dispatch` · entity `sms_dispatch` · container `worker`
### Story 5.10: Long-poll fallback and offline text outbox

As a Member on broken WebSocket or 2G,
I want to keep receiving events via long-poll and queue text while offline,
So that Chat media waits for connection, not for AI.

**Acceptance Criteria:**

**Given** Socket.IO is broken
**When** I stay in the thread
**Then** long-poll on `/v1/realtime` keeps typing/delivered events

**Given** I am offline
**When** I send text
**Then** it sits in an outbox and flushes on reconnect
**And** Chat media does not pretend to wait on moderation

**Implements:** FR-050, FR-136, NFR-005 · AD-15, AD-16 · [prd.md §4.4 FR-050](prds/prd-muslim-marriage-africa-2026-09-27/prd.md) · screen [Chat thread](ux-designs/ux-muslim-marriage-africa-2026-10-01/EXPERIENCE.md)
**Start here:** `GET long-poll /v1/realtime + client outbox` · entity `message` · container `web`
### Story 5.11: Free-tier daily message cap

As a Free Member,
I want a daily message cap that the Operator can change, shown as the live admin value,
So that Free-tier volume is bounded without locking a product number, and Premium unlocks unlimited messages.

**Acceptance Criteria:**

**Given** I am an Operator
**When** I PATCH `/v1/staff/config` with `daily_message_cap`
**Then** only `operator` may write; the write and an AD-18 audit event (`from`, `to`, `staffId`, key) are the same unit of work
**And** the UI shows the live admin value, not a locked number
**And** seed 10 is tagged `[ASSUMPTION — admin-configurable, not a product lock]`

**Given** entity `message_quota` `{account_id, civil_day_ouaga, sent_count}`
**When** chat persists a counted send and the sender is not entitled
**Then** chat is the only writer and `sent_count` increments once
**And** counted kinds are: chat text, chat photo, voice note, message flash (card quick message is that flash — once)

**Given** every counted persist
**When** chat consults the cap
**Then** it reads live `BillingPort.isEntitled` and live `daily_message_cap`
**And** Premium (`isEntitled` true) writes no increment and is unlimited
**And** `unavailable` maps to the Free cap (fail closed on the paid perk)

**Given** the Operator changes the cap
**When** subsequent Free-tier sends happen
**Then** `sent_count` stays; remaining = `max(0, new_cap - sent_count)`; already-delivered messages stay

**Given** I GET `/v1/me/message-remaining`
**When** I am Free
**Then** `{ capped, remaining, cap, resets_at }` uses the live admin cap
**And** when Premium, `{ capped: false }`

**Given** I am Free and at the cap
**When** I send Chat text, Chat Photo, Voice note, Flash, or card quick message
**Then** `MESSAGE_CAP_EXCEEDED`; nothing is stored or held

**Given** I am a Free Sister in `free_unlimited`
**When** I send messages
**Then** this cap still applies; Sister checkout for unlimited messages is story 4.7 / 10.1, not a second Invite quota

**Implements:** FR-146, FR-050, FR-051, FR-105 · AD-29, AD-21, AD-23, AD-18 · [prd.md §4.13 FR-146](prds/prd-muslim-marriage-africa-2026-09-27/prd.md) · screens [Message quota wall](ux-designs/ux-muslim-marriage-africa-2026-10-01/EXPERIENCE.md), [Operator daily message cap](ux-designs/ux-muslim-marriage-africa-2026-10-01/EXPERIENCE.md)
**Start here:** `GET /v1/me/message-remaining` + `PATCH /v1/staff/config (daily_message_cap)` · entity `message_quota` · container `api`
**Notes:** Do not fork a second operator-cap story in Epic 12. Operator control sits next to `sister_reach_mode`.
## Epic 6: Reveal a face to one viewer, and take it back

The photo owner chooses per-viewer `on_accept | on_request | never`, grants or refuses a request, and Revokes so the gateway stops serving clear bytes within 60s. Marketing reuse needs a per-use likeness grant.

**FRs covered:** FR-057, FR-058, FR-059, FR-060

### Story 6.1: Media GET gateway and capability tokens

As a any authorized viewer,
I want every Photo URL to be a capability token to a grant-checked gateway, not a raw bucket pre-sign,
So that revoke can stop serving clear bytes. `system` must not mint reveal URLs.

**Acceptance Criteria:**

**Given** I request a URL
**When** MediaPort.sign(assetId, derivative, viewerId) runs
**Then** I receive a token to `/v1/media/get`; `original` and clear `md` are refused without a live grant

**Given** the gateway GET runs
**When** grant + denylist are re-checked
**Then** unauthorized bytes are not served

**Given** a serializer runs
**When** JSON is inspected
**Then** `original_key` is never emitted

**Implements:** FR-059 (serve path), NFR-001 · AD-9 · [prd.md §4.5 FR-059](prds/prd-muslim-marriage-africa-2026-09-27/prd.md) · screen [Profile detail](ux-designs/ux-muslim-marriage-africa-2026-10-01/EXPERIENCE.md)
**Start here:** `GET /v1/media/get + POST /v1/media sign` · entity `signed_grant, photo_asset` · container `api`
### Story 6.2: Per-viewer Reveal policy

As a Sister or Brother who owns Photos,
I want to choose `on_accept | on_request | never` per viewer,
So that Blur is not all-or-nothing. Paid perk cannot grant Reveal.

**Acceptance Criteria:**

**Given** policy is `never`
**When** an Invite is accepted
**Then** that viewer still sees Blur

**Given** policy is `on_accept`
**When** that viewer’s Invite is accepted
**Then** they see clear until Revoke

**Given** I Reveal to Brother A only
**When** Brother B views
**Then** B remains Blurred

**Given** I am a Brother
**When** I open Photo settings
**Then** I have the same three policies

**Implements:** FR-057 · AD-9 · [prd.md §4.5 FR-057](prds/prd-muslim-marriage-africa-2026-09-27/prd.md) · screen [Blur / Reveal / Revoke](ux-designs/ux-muslim-marriage-africa-2026-10-01/EXPERIENCE.md)
**Start here:** `PUT /v1/reveals/policy` · entity `reveal_grant` · container `api`
**Notes:** UX-DR10 reveal-control. Mock: mockups/profile-blur.html.
### Story 6.3: Reveal on request

As a viewer and Photo owner,
I want to request Reveal and approve per person, with one pending request per pair,
So that nagging cannot coerce a Sister to un-Blur.

**Acceptance Criteria:**

**Given** I request and the owner approves
**When** only I am Revealed
**Then** others stay Blurred

**Given** the owner ignores or denies
**When** I try again
**Then** I am not spammed beyond one pending request per pair

**Implements:** FR-058, FR-052 (push) · AD-9 · [prd.md §4.5 FR-058](prds/prd-muslim-marriage-africa-2026-09-27/prd.md) · screen [Blur / Reveal / Revoke](ux-designs/ux-muslim-marriage-africa-2026-10-01/EXPERIENCE.md)
**Start here:** `POST /v1/reveals + POST /v1/reveals/:id/decide` · entity `reveal_grant` · container `api`
### Story 6.4: Revoke Reveal within 60 seconds

As a Photo owner,
I want to Revoke so subsequent views and notification thumbs are Blurred,
So that I can take a face back. Cached client bytes remain a residual (watermark is NEXT).

**Acceptance Criteria:**

**Given** a viewer is Revealed
**When** I Revoke
**Then** the gateway denylist stops serving the clear URL within 60s (`signed_url_ttl_seconds` ≤ 60)

**Given** Android Capacitor
**When** FLAG_SECURE
**Then** it is on as deterrence — the product does not advertise “cannot screenshot”

**Implements:** FR-059 · AD-9, AD-4 · [prd.md §4.5 FR-059](prds/prd-muslim-marriage-africa-2026-09-27/prd.md) · screen [Blur / Reveal / Revoke](ux-designs/ux-muslim-marriage-africa-2026-10-01/EXPERIENCE.md)
**Start here:** `POST /v1/reveals/:id/revoke` · entity `reveal_grant` · container `api`
### Story 6.5: Per-use likeness grant for marketing

As a Member,
I want my Photos to stay out of campaigns unless I opt in per campaign,
So that cookie consent is not a likeness grant (opposite of Farata §07).

**Acceptance Criteria:**

**Given** no likeness_grant
**When** Operator exports campaign images
**Then** Member Photos are not included

**Given** I opt in to campaign X
**When** X ends
**Then** the grant does not reuse for campaign Y

**Given** I accept cookies
**When** Operator checks marketing rights
**Then** Photo reuse is still false

**Implements:** FR-060, FR-119 · AD-9, AD-19 · [prd.md §4.5 FR-060](prds/prd-muslim-marriage-africa-2026-09-27/prd.md) · screen [Settings + Cookie consent](ux-designs/ux-muslim-marriage-africa-2026-10-01/EXPERIENCE.md)
**Start here:** `POST /v1/likeness-grants` · entity `likeness_grant` · container `api`
## Epic 7: An optional Mahram can read and stop the Chat

A Sister invites a Mahram by phone. After OTP, declared relationship, and her confirm, the grant list is empty. She grants individual Brother threads. He reads only granted, delivered messages and can flag, pause, or end those threads. He cannot compose. She can revoke one or remove him (revoke-all). A2 legal review stays open. No kinship documents.

**FRs covered:** FR-048, FR-071, FR-072, FR-073, FR-074, FR-075, FR-076, FR-077, FR-078, FR-079, FR-080

### Story 7.1: Sister invites a Mahram by phone

As a Sister,
I want to invite a guardian by phone number without forcing it,
So that family involvement is honorable and optional. Brothers cannot attach a guardian to her Chat.

**Acceptance Criteria:**

**Given** I submit a phone number
**When** POST `/v1/mahram/invites`
**Then** an invite SMS is sent and no Chat message is sent as me

**Given** a Brother tries to attach a Mahram to my Chat
**When** the API
**Then** rejects

**Given** the Mahram account
**When** browse/Invite
**Then** is not offered — no people-list identity (card or grid)

**Implements:** FR-071, FR-080 (entry) · AD-12 · [prd.md §4.7 FR-071](prds/prd-muslim-marriage-africa-2026-09-27/prd.md) · screen [Mahram invite (Sister)](ux-designs/ux-muslim-marriage-africa-2026-10-01/EXPERIENCE.md)
**Start here:** `POST /v1/mahram/invites` · entity `mahram_invite` · container `api`
### Story 7.2: Mahram OTP and declared relationship

As a invited Mahram,
I want to verify by phone OTP and declare father / brother / uncle / other_mahram,
So that an unmatched male friend cannot become a wali. No kinship papers.

**Acceptance Criteria:**

**Given** I complete OTP and pick an allowed relationship
**When** the Sister is asked to confirm
**Then** pause/end are not available until she confirms (1h cooling-off after OTP is the working number)

**Given** I pick unmatched-friend
**When** I submit
**Then** the invite is rejected

**Implements:** FR-072, A2 · AD-12, AD-13 · [prd.md §4.7 FR-072](prds/prd-muslim-marriage-africa-2026-09-27/prd.md) · screen [Mahram OTP + relationship](ux-designs/ux-muslim-marriage-africa-2026-10-01/EXPERIENCE.md)
**Start here:** `POST /v1/mahram/invites/:id/otp` · entity `mahram_invite` · container `api`
### Story 7.3: Sister confirms the Mahram

As a Sister,
I want to confirm or let a pending invite expire in 7 days,
So that nobody attaches a guardian without my yes.

**Acceptance Criteria:**

**Given** I confirm
**When** a `mahram_link` exists
**Then** the link is created and the grant list is empty
**And** he is not attached to every conversation

**Given** I ignore
**When** 7 days pass
**Then** the pending invite expires

**Implements:** FR-073 · AD-12 · [prd.md §4.7 FR-073](prds/prd-muslim-marriage-africa-2026-09-27/prd.md) · screen [Sister confirm Mahram](ux-designs/ux-muslim-marriage-africa-2026-10-01/EXPERIENCE.md)
**Start here:** `POST /v1/mahram/invites/:id/confirm` · entity `mahram_link` · container `api`
**Notes:** Individual grants are Story 7.8. Historical “read-all on my conversations” is superseded 2026-10-02.
### Story 7.4: Read-only granted thread — no compose

As a confirmed Mahram,
I want to read only granted, delivered messages, and never send as the Sister,
So that I can supervise threads she chose without becoming a dating identity.

**Acceptance Criteria:**

**Given** a thread has an active `mahram_thread_grant` (`revoked_at IS NULL`)
**When** I open that thread
**Then** I can read delivered messages only. A later AI flag does not hide them
**And** there is no compose

**Given** I request an ungranted conversation id
**When** GET `/v1/mahram/threads/:id` (or equivalent)
**Then** access removed (404/`FORBIDDEN`) — not a read-all fallback

**Given** I look for compose
**When** the Mahram client
**Then** has no send control and the API rejects send-as-ward

**Given** the Brother views a message
**When** sender
**Then** is never the Mahram impersonating the Sister

**Given** a Message Flash
**When** I open a granted thread
**Then** Flash is visible only after a conversation exists AND that conversation is granted, via `flash_id` read-through — it is not copied into `message`
**And** Flash before accept is not grantable

**Implements:** FR-074, FR-076, FR-048 · AD-12, AD-15, AD-10 · [prd.md §4.7 FR-074](prds/prd-muslim-marriage-africa-2026-09-27/prd.md) · screens [Mahram read-only thread](ux-designs/ux-muslim-marriage-africa-2026-10-01/EXPERIENCE.md), [Mahram thread list](ux-designs/ux-muslim-marriage-africa-2026-10-01/EXPERIENCE.md)
**Start here:** `GET /v1/mahram/threads` · entity `mahram_thread_grant, message, message_flash` · container `web`
**Notes:** UX-DR13. Mock: mockups/mahram-readonly.html. Multi-ward dashboard is not built. Historical “read-all” is superseded 2026-10-02.
### Story 7.5: Flag, pause, or end

As a Mahram with an active grant on a thread,
I want to flag a message (priority case), pause compose for both Members, or end the Chat forever,
So that I can stop digital khalwa on threads she granted. The Brother cannot resume a pause.

**Acceptance Criteria:**

**Given** the thread is not granted (`revoked_at` set or no row)
**When** I POST flag, pause, or end
**Then** the action is rejected

**Given** I flag a granted thread
**When** I POST `/v1/mahram/links/:id/flag`
**Then** this story inserts `report` + priority `moderation_case` now (entities created when first needed) and SMS/push fire on the essential path

**Given** I pause a granted thread
**When** either Member opens Chat
**Then** compose is disabled; only Sister, I, or a Moderator can resume

**Given** I end a granted thread
**When** either Member opens the thread
**Then** compose stays disabled and stage does not revert
**And** end does not revoke the grant

**Implements:** FR-075, FR-053 · AD-12, AD-23 · [prd.md §4.7 FR-075](prds/prd-muslim-marriage-africa-2026-09-27/prd.md) · screen [Mahram pause / end / flag](ux-designs/ux-muslim-marriage-africa-2026-10-01/EXPERIENCE.md)
**Start here:** `POST /v1/mahram/links/:id/pause|end|flag` · entity `conversation, mahram_thread_grant` · container `api`
### Story 7.6: Sister removes or Reports the Mahram

As a Sister,
I want to revoke read access within 60s and optionally hide my Profile for 24h,
So that a coercive wali is not trapped in the product (D38).

**Acceptance Criteria:**

**Given** I remove him
**When** the command commits
**Then** `revoked_at` is set on EVERY active grant in the same unit of work (do not DELETE the rows)
**And** he loses read access within 60s and both sides receive SMS
**And** events are audited

**Given** I Report him
**When** a case opens
**Then** every active grant is revoked the same way (set `revoked_at`, do not DELETE)
**And** I may enable `ProfilePort.emergencyHide` for 24h
**And** events are audited

**Implements:** FR-077 · AD-12, AD-23, AD-18 · [prd.md §4.7 FR-077](prds/prd-muslim-marriage-africa-2026-09-27/prd.md) · screen [Remove / Report Mahram](ux-designs/ux-muslim-marriage-africa-2026-10-01/EXPERIENCE.md)
**Start here:** `POST /v1/mahram/links/:id/remove|report` · entity `mahram_link, mahram_thread_grant, profile` · container `api`
### Story 7.7: Presence banner, optional verified badge, and family guidance

As a Brother and Sister,
I want to see that a wali is reading, an optional Verified-Mahram badge after ID, and published guidance that Mahram is optional,
So that he does not overstep, and she is offered — not forced — a guardian.

**Acceptance Criteria:**

**Given** THIS thread is granted (`revoked_at IS NULL`)
**When** the Brother opens Chat
**Then** banner « Un wali lit cette discussion » is persistent

**Given** THIS thread is not granted, or I revoke-one, or I remove him
**When** the Brother opens Chat or pending Flash
**Then** the banner is gone
**And** new Chats are not auto-granted — they show no banner until she grants

**Given** Mahram completes optional ID + liveness
**When** approved
**Then** Verified-Mahram shows; kinship document is never requested
**And** he still reads granted threads only

**Given** onboarding / help
**When** I open family guidance
**Then** Mahram is described as optional and Sister-initiated

**Implements:** FR-078, FR-079, FR-080, FR-015 · AD-12, AD-13 · [prd.md §4.7 FR-078](prds/prd-muslim-marriage-africa-2026-09-27/prd.md) · screen [Chat thread + Family guidance](ux-designs/ux-muslim-marriage-africa-2026-10-01/EXPERIENCE.md)
**Start here:** `GET conversation (mahram.presence) + POST /v1/verifications/id (mahram)` · entity `mahram_link, mahram_thread_grant, verification_record` · container `web`
**Notes:** UX-DR13 mahram-banner. Socket event `mahram.presence` is grant-scoped.
### Story 7.8: Sister grants and revokes Mahram threads

As a Sister,
I want to grant one existing Brother conversation to my confirmed Mahram, and revoke that grant,
So that he reads only the threads I choose. Confirm does not attach him to every Chat.

**Acceptance Criteria:**

**Given** I have confirmed a Mahram (story 7.3)
**When** I open the grant list
**Then** it is empty — « Aucune discussion accordée. »

**Given** a conversation already exists (`ChatPort.openFromInvite`)
**When** I POST `/v1/mahram/links/:id/grants` `{ conversation_id }`
**Then** one `mahram_thread_grant` row is inserted (`revoked_at IS NULL`)
**And** I am the only writer (`accountId === link.sister_id`, `role=member`); he cannot self-grant
**And** grant of an `invite_id` or a pre-accept Flash is refused — grant needs a conversation
**And** a new conversation insert creates no grant

**Given** I revoke one thread
**When** I DELETE `/v1/mahram/links/:id/grants/:conversationId` (or equivalent revoke)
**Then** `revoked_at` is set on that row only (do not DELETE the row)
**And** other grants stay
**And** the event is audited

**Given** I remove or Report him (story 7.6)
**When** that command commits
**Then** every active grant is revoked (`revoked_at` set, do not DELETE)

**Given** he GET `/v1/mahram/threads`
**When** grants exist
**Then** only active grants (`revoked_at IS NULL`) are returned
**And** he cannot send

**Given** grant or revoke-one
**When** the write commits
**Then** an AD-18 audit event is written in the same unit of work

**Implements:** FR-074, FR-076, FR-077 · AD-12, AD-18 · [prd.md §4.7 FR-074](prds/prd-muslim-marriage-africa-2026-09-27/prd.md) · screens [Mahram grant list](ux-designs/ux-muslim-marriage-africa-2026-10-01/EXPERIENCE.md), [Mahram revoke one thread](ux-designs/ux-muslim-marriage-africa-2026-10-01/EXPERIENCE.md), [Mahram thread list](ux-designs/ux-muslim-marriage-africa-2026-10-01/EXPERIENCE.md)
**Start here:** `POST /v1/mahram/links/:id/grants` + revoke-one · entity `mahram_thread_grant` · container `api + web`
## Epic 8: A human, not the AI, decides

The worker scans already-delivered Chat items. Flags and scan-deferred events land in a staff-only queue. Admins warn, suspend, or take another published action. Members Report and Block. The AI never unsends or auto-suspends.

**FRs covered:** FR-066, FR-067, FR-144, FR-083, FR-084, FR-085, FR-086, FR-087, FR-088, FR-090, FR-092, FR-093

### Story 8.1: Passive scan worker — flag-for-admin or clean

As a Trust & Safety (system),
I want the worker to run scanText / scanImage / transcribe / classifyAudio on already-delivered items,
So that indecent content is scored after the recipient already has it. Outcomes are flag-for-admin or clean — never a Chat state change.

**Acceptance Criteria:**

**Given** a moderation_job exists
**When** the worker runs
**Then** only moderation INSERTs `moderation_job` scores and may INSERT `flag_queue`
**And** it never writes `message.state`

**Given** French audio
**When** transcribe
**Then** commercial ASR may be used for `fr` only

**Given** mos/dyu or low confidence
**When** classify
**Then** lexicon + human path or scan-deferred — not a hold
**And** do not advertise “we understand all Mooré/Dioula audio”

**Implements:** FR-066, FR-064, NFR-003 · AD-10, AD-11 · [prd.md §4.6 FR-066](prds/prd-muslim-marriage-africa-2026-09-27/prd.md) · screen [Admin flag queue](ux-designs/ux-muslim-marriage-africa-2026-10-01/EXPERIENCE.md)
**Start here:** `worker processors scanText|scanImage|transcribe|classifyAudio` · entity `moderation_job, flag_queue` · container `worker`
### Story 8.2: Scan-deferred and scan-failed are visible

As a Operator / Moderator,
I want AI 5xx, timeout, empty/malformed, or low confidence to record scan-deferred / scan-failed on the flag queue,
So that the gap is counted and never hidden. Delivery already happened.

**Acceptance Criteria:**

**Given** the vendor returns 5xx or times out
**When** the worker finishes
**Then** flag_queue gets `scan-deferred` or `scan-failed`
**And** the recipient already has the content

**Given** Operator metrics
**When** I view the period
**Then** scan-deferred / scan-failed are counted (FR-142)

**Implements:** FR-067, FR-142, NFR-003 · AD-10, AD-20 · [prd.md §4.6 FR-067](prds/prd-muslim-marriage-africa-2026-09-27/prd.md) · screen [Admin flag queue](ux-designs/ux-muslim-marriage-africa-2026-10-01/EXPERIENCE.md)
**Start here:** `worker error path → flag_queue` · entity `flag_queue` · container `worker`
### Story 8.3: Admin flag queue and admin-chosen action

As a Moderator,
I want to work a staff-only queue of already-delivered flags plus scan-deferred events and choose warning, suspend, or another published action,
So that the AI never applies a sanction and opening a row never changes message.state.

**Acceptance Criteria:**

**Given** a flag or scan-deferred exists
**When** I open the queue
**Then** I see the delivered item and the flagged person; every row has staff-only-badge

**Given** I decide
**When** I save warning / suspend / other
**Then** trust may open or continue a case; the message is not unsent
**And** AI is not a fourth button

**Given** paid-faster-review
**When** queue order
**Then** it may shorten position; it must not skip the background scan or auto-clear a flag

**Implements:** FR-144, FR-066 · AD-10, AD-18, AD-21 · [prd.md §4.6 FR-144](prds/prd-muslim-marriage-africa-2026-09-27/prd.md) · screen [Admin flag queue + Sanction](ux-designs/ux-muslim-marriage-africa-2026-10-01/EXPERIENCE.md)
**Start here:** `GET /v1/staff/flags + POST /v1/staff/flags/:id/action` · entity `flag_queue, sanction` · container `web`
**Notes:** UX-DR18, UX-DR19, UX-DR20. Mock: mockups/admin-flag-queue.html. SLA clock starts when the flag enters the queue.
### Story 8.4: Published D6 honesty copy

As a Member,
I want to read that messages are delivered then scanned, that the AI flags a human, and that the AI does not silently delete, block, or hold,
So that we do not ship Farata’s evidenced contradiction. Stale pre-delivery copy is forbidden.

**Acceptance Criteria:**

**Given** I open Member policy
**When** I read `moderation_policy_*`
**Then** it states delivered-then-scanned, human admin, no silent delete/block/hold, plus evidence-retention (AD-19 clocks as [ASSUMPTION])

**Given** a string search
**When** I grep the UI
**Then** no “held until scanned” / fail-closed Chat copy

**Implements:** FR-066, FR-140 · AD-10 · [prd.md §4.6 FR-066](prds/prd-muslim-marriage-africa-2026-09-27/prd.md) · screen [Settings / Legal hub](ux-designs/ux-muslim-marriage-africa-2026-10-01/EXPERIENCE.md)
**Start here:** `GET content locale_string moderation_policy_*` · entity `locale_string` · container `web`
### Story 8.5: Report with a 24h SLA

As a Member,
I want to Report a Profile or message with a reason and start the SLA clock,
So that a human must first-touch within 24h p95.

**Acceptance Criteria:**

**Given** I submit a Report
**When** a moderation_case exists
**Then** sla_started_at is submit time

**Given** 24h elapse with no first human
**When** Operator metrics
**Then** the case is SLA-breach

**Implements:** FR-083, NFR-003 · AD-10, AD-18 · [prd.md §4.8 FR-083](prds/prd-muslim-marriage-africa-2026-09-27/prd.md) · screen [Report / Block](ux-designs/ux-muslim-marriage-africa-2026-10-01/EXPERIENCE.md)
**Start here:** `POST /v1/reports` · entity `report, moderation_case` · container `api`
### Story 8.6: Block

As a Member,
I want to Block someone from Profile or Chat,
So that they can no longer see or contact me.

**Acceptance Criteria:**

**Given** I Block
**When** they browse
**Then** my Profile is absent

**Given** they send an Invite or Chat
**When** the API
**Then** rejects

**Implements:** FR-084 · AD-17 · [prd.md §4.8 FR-084](prds/prd-muslim-marriage-africa-2026-09-27/prd.md) · screen [Report / Block](ux-designs/ux-muslim-marriage-africa-2026-10-01/EXPERIENCE.md)
**Start here:** `POST /v1/blocks` · entity `block` · container `api`
### Story 8.7: Case console and sanctions ladder

As a Moderator,
I want one case file with media, scores, Report, and fingerprint hints, and to apply warning / suspend / Ban,
So that evidence snapshots stay on the case. AI does not choose the sanction.

**Acceptance Criteria:**

**Given** I open a case
**When** I see media + scores + Report + device/phone hints
**Then** Sister Photo thumbs stay blurred until audited unblur

**Given** I issue a Strike
**When** saved
**Then** the evidence snapshot is immutable on the case

**Given** warning vs suspend vs Ban
**When** the Member opens the app
**Then** warning: can continue under limits; suspend: suspended screen; Ban: access denied and FR-088 may link alts

**Implements:** FR-085, FR-087 · AD-10, AD-18 · [prd.md §4.8 FR-085](prds/prd-muslim-marriage-africa-2026-09-27/prd.md) · screen [Case file + Sanction](ux-designs/ux-muslim-marriage-africa-2026-10-01/EXPERIENCE.md)
**Start here:** `GET /v1/staff/cases/:id + POST /v1/staff/cases/:id/sanction` · entity `moderation_case, strike, sanction, ban` · container `web`
**Notes:** UX-DR20. Respectful Ouaga French macros.
### Story 8.8: Ban fingerprint

As a Moderator / system,
I want a Ban to hold new accounts that share phone, ID hash, or device attestation,
So that cookie-only ids are not a Ban key.

**Acceptance Criteria:**

**Given** a Banned ID hash is reused
**When** a new account submits that ID
**Then** it is held and not listed

**Given** the same phone OTP is used after Ban
**When** they verify
**Then** the account is held for review

**Given** staff list endpoints
**When** I GET `/v1/staff/*`
**Then** they never return another person’s phone or WhatsApp except via cil_ticket

**Implements:** FR-088, NFR-001 · AD-17, AD-18 · [prd.md §4.8 FR-088](prds/prd-muslim-marriage-africa-2026-09-27/prd.md) · screen [Case file](ux-designs/ux-muslim-marriage-africa-2026-10-01/EXPERIENCE.md)
**Start here:** `trust fingerprint sha256(phone_e164|id_doc_hash|device_attestation)` · entity `fingerprint, ban` · container `api`
### Story 8.9: Member appeal

As a suspended or Banned Member,
I want to appeal to a second human,
So that wrongful Ban in a small city is reviewable. Overturns are counted, not hidden.

**Acceptance Criteria:**

**Given** I submit an appeal
**When** a second human (not the original decider) is assigned
**Then** window rules are published

**Given** overturn completes
**When** access is restored
**Then** the overturn is counted (SM-C3)

**Implements:** FR-090 · AD-18 · [prd.md §4.8 FR-090](prds/prd-muslim-marriage-africa-2026-09-27/prd.md) · screen [Appeal](ux-designs/ux-muslim-marriage-africa-2026-10-01/EXPERIENCE.md)
**Start here:** `POST /v1/appeals` · entity `appeal` · container `api`
### Story 8.10: Audited moderator unblur

As a Moderator,
I want to unblur a Sister Photo only with a typed case reason written to the audit log,
So that curiosity peeking is attributable. Dual-control stays NEXT.

**Acceptance Criteria:**

**Given** I unblur
**When** I must enter a case reason
**Then** audit_event records actor, case id, timestamp — never original bytes in payload

**Given** I have no reason
**When** unblur
**Then** is locked

**Implements:** FR-093, NFR-009 · AD-9, AD-18 · [prd.md §4.8 FR-093](prds/prd-muslim-marriage-africa-2026-09-27/prd.md) · screen [Case file](ux-designs/ux-muslim-marriage-africa-2026-10-01/EXPERIENCE.md)
**Start here:** `POST /v1/staff/cases/:id/unblur` · entity `signed_grant, audit_event` · container `api`
### Story 8.11: False-report sanctions and proof-backed transparency stats

As a Moderator / visitor,
I want repeat overturned Reports to be sanctionable, and public stats to be sourced — never invented scale,
So that we do not rubber-stamp Bans or invent DAU.

**Acceptance Criteria:**

**Given** a Member has 3 overturned Reports in 30 days (working)
**When** I apply P43
**Then** they can be warned or suspended for false Reports

**Given** public stats page
**When** it renders
**Then** each number has a definition and is sourced from FR-142; Verified marriages shows 0 until dual-confirm

**Implements:** FR-086, FR-092 · AD-18, AD-25 · [prd.md §4.8 FR-086](prds/prd-muslim-marriage-africa-2026-09-27/prd.md) · screen [Operator metrics + public landing](ux-designs/ux-muslim-marriage-africa-2026-10-01/EXPERIENCE.md)
**Start here:** `GET /v1/public/stats + staff false-report action` · entity `sanction, marriage_counter` · container `web`
## Epic 9: Both confirm a marriage

A couple jointly reports nikah. The public counter stays 0 until both confirm. Optional proof stays private. A public story needs both consents. Empty showcase is valid.

**FRs covered:** FR-095, FR-096, FR-097, FR-098, FR-099, FR-100, FR-101

### Story 9.1: Start a joint “we got married” report

As a Member in an accepted Chat,
I want to name the other spouse and ask them to confirm,
So that one-sided claims cannot move the counter.

**Acceptance Criteria:**

**Given** we have an accepted Chat
**When** I POST `/v1/marriage-reports`
**Then** the other receives a confirmation request

**Given** we have no accepted Chat
**When** I start a report
**Then** it is rejected

**Implements:** FR-095 · AD-25 · [prd.md §4.9 FR-095](prds/prd-muslim-marriage-africa-2026-09-27/prd.md) · screen [Marriage dual-confirm](ux-designs/ux-muslim-marriage-africa-2026-10-01/EXPERIENCE.md)
**Start here:** `POST /v1/marriage-reports` · entity `marriage_report` · container `api`
**Notes:** Mock: mockups/marriage-confirm.html.
### Story 9.2: Both confirm — joint married state

As a the named spouse,
I want to confirm so both leave browse together,
So that availability does not flip on a one-sided hope. 30 days without confirm expires the report.

**Acceptance Criteria:**

**Given** only I confirmed
**When** 30 days pass
**Then** the report expires and the counter does not increment

**Given** the second confirmation is saved
**When** both Profiles
**Then** leave browse; neither can send or receive new Invites; stage is `married`; Chats close to new Invites via ChatPort.closeFromMarriage

**Implements:** FR-096, FR-098 · AD-25, AD-23 · [prd.md §4.9 FR-096](prds/prd-muslim-marriage-africa-2026-09-27/prd.md) · screen [Marriage dual-confirm](ux-designs/ux-muslim-marriage-africa-2026-10-01/EXPERIENCE.md)
**Start here:** `POST /v1/marriage-reports/:id/confirm` · entity `marriage_report, profile, conversation` · container `api`
### Story 9.3: Optional private nikah proof

As a the couple,
I want to upload a certificate or imam/Mahram attestation that is never a public URL,
So that proof can exist for T&S without becoming a celebrity poster.

**Acceptance Criteria:**

**Given** I upload proof
**When** it is stored
**Then** visible only to the couple and staff with a logged reason — never on the showcase

**Given** we skip proof
**When** both confirm
**Then** the Verified marriage still counts

**Implements:** FR-097 · AD-25, AD-18 · [prd.md §4.9 FR-097](prds/prd-muslim-marriage-africa-2026-09-27/prd.md) · screen [Marriage dual-confirm](ux-designs/ux-muslim-marriage-africa-2026-10-01/EXPERIENCE.md)
**Start here:** `POST /v1/marriage-reports/:id/proof` · entity `marriage_report.proof_key` · container `api`
### Story 9.4: Honest Verified-marriages counter starting at 0

As a visitor,
I want to see a public counter that equals the number of dual-confirmed reports,
So that we do not invent scale. Content must not write the counter.

**Acceptance Criteria:**

**Given** launch, zero confirms
**When** any public surface
**Then** the counter is 0 — not “+” or rounded

**Given** N dual-confirmed reports
**When** GET `/v1/public/marriage-count`
**Then** equals N

**Implements:** FR-101 · AD-25 · [prd.md §4.9 FR-101](prds/prd-muslim-marriage-africa-2026-09-27/prd.md) · screen [Public landing](ux-designs/ux-muslim-marriage-africa-2026-10-01/EXPERIENCE.md)
**Start here:** `GET /v1/public/marriage-count` · entity `marriage_counter` · container `api`
### Story 9.5: Consent story and showcase

As a married couple,
I want to submit an optional public story that either of us can refuse,
So that faces stay optional, Chat excerpts are forbidden, empty showcase is valid.

**Acceptance Criteria:**

**Given** either of us refuses public
**When** showcase
**Then** has no card of our faces; the counter may still have incremented

**Given** both accept and family-ok if set
**When** submit
**Then** the card waits for Operator/Board publish (Epic 12) before going live

**Given** no stories
**When** a visitor opens showcase
**Then** empty state points at the counter at 0, not invented quotes

**Implements:** FR-099, FR-100 · AD-25 · [prd.md §4.9 FR-099](prds/prd-muslim-marriage-africa-2026-09-27/prd.md) · screen [Consent story + Showcase](ux-designs/ux-muslim-marriage-africa-2026-10-01/EXPERIENCE.md)
**Start here:** `POST /v1/stories + GET /v1/stories` · entity `consent_story` · container `web`
## Epic 10: Pay for reach in XOF, never for dignity

A Brother buys a 1/3/6-month pack on Orange Money, Moov, or Wave. A Sister sees and buys the same packs in both `sister_reach_mode` values because Free-tier messages are capped (FR-146). There is no silent auto-renew. Premium deltas are unlimited Invites, unlimited messages, and faster human review — not “15 vs 3”. Verification, Blur, Mahram attach, Report, and Block stay free even if billing is down. Message volume fails closed to the Free cap.

**FRs covered:** FR-104, FR-105, FR-106, FR-107, FR-108, FR-109, FR-110, FR-146

### Story 10.1: Freemium packs and one pricing page

As a Brother or a Sister,
I want to see 1/3/6-month XOF packs with an explicit end date and no auto-renew, matching checkout,
So that I know what I pay. Gold is confirmation, not a “Premium verified” identity badge. Sisters can buy the same packs in both reach modes because messages are capped.

**Acceptance Criteria:**

**Given** I open public pricing and checkout
**When** I compare prices
**Then** they match; Free tier is described; launch vs normal price both shown if a launch price exists
**And** Premium is described as unlimited Invites and unlimited messages, plus faster human review — not “15 vs 3”

**Given** I am a Sister in either `sister_reach_mode`
**When** I GET `/v1/packs` or open checkout
**Then** the same 1/3/6 packs are offered
**And** in `free_unlimited` the pack is not required for Invite reach

**Given** I select a pack
**When** the card
**Then** shows « Sélectionné » + indigo ring + « Pas de renouvellement automatique » with audio-prompt

**Given** NEXT perks
**When** I look at MVP
**Then** no boosts, no Premium vérifié badge, no Free Money / MTN

**Implements:** FR-104, FR-106, FR-108, FR-146 · AD-14, AD-29 · [prd.md §4.10 FR-104](prds/prd-muslim-marriage-africa-2026-09-27/prd.md) · screen [Public pricing + Payment pack](ux-designs/ux-muslim-marriage-africa-2026-10-01/EXPERIENCE.md)
**Start here:** `GET /v1/packs` · entity `pack` · container `web`
**Notes:** UX-DR21 pack-card. Mock: mockups/payment-pack.html. Sister checkout in both modes is also Story 4.7.
### Story 10.2: Pay with Burkina mobile money

As a Brother or a Sister,
I want to pay via Orange Money BF, Moov Africa BF, or Wave/Coris, with cards only on hosted checkout,
So that PAN never touches `apps/api`. XOF is the currency.

**Acceptance Criteria:**

**Given** Orange Money BF is available
**When** I complete payment
**Then** I am entitled until `ends_at`

**Given** cards are used
**When** checkout
**Then** is hosted; PAN is not in api logs or bodies

**Given** Idempotency-Key is missing
**When** POST `/v1/payments`
**Then** is rejected

**Implements:** FR-107 · AD-14, AD-7 · [prd.md §4.10 FR-107](prds/prd-muslim-marriage-africa-2026-09-27/prd.md) · screen [Payment pack](ux-designs/ux-muslim-marriage-africa-2026-10-01/EXPERIENCE.md)
**Start here:** `POST /v1/payments` · entity `payment` · container `api`
### Story 10.3: Webhooks entitle once — never auto-renew

As a billing worker / api,
I want signed webhooks to apply once and set `ends_at` with no renewal job,
So that a processor preference for silent renew cannot bill again.

**Acceptance Criteria:**

**Given** a valid signed webhook arrives
**When** it is applied once via Idempotency-Key
**Then** `entitlement.ends_at` is set and `renew_at` does not exist

**Given** timestamp is older than 600s
**When** ingest
**Then** rejects

**Given** the pack ends
**When** I open the app
**Then** I am on Free until I explicitly buy again

**Implements:** FR-106, FR-107 · AD-14, AD-7, AD-18 · [prd.md §4.10 FR-106](prds/prd-muslim-marriage-africa-2026-09-27/prd.md) · screen [Payment pack](ux-designs/ux-muslim-marriage-africa-2026-10-01/EXPERIENCE.md)
**Start here:** `POST /v1/webhooks/payments` · entity `payment, entitlement, webhook_receipt` · container `api`
### Story 10.4: Safety stays up when billing is down

As a Sister or Brother,
I want Verification, Blur/Reveal, Mahram attach, Report, Block, and browse to succeed when billing is down or `isEntitled=unavailable`,
So that dignity is not a rail. Message volume fails closed to the Free cap. Sister Invite send follows FR-045 / `sister_reach_mode`, never a safety paywall. `BillingPort.isEntitled` must not throw into a safety handler.

**Acceptance Criteria:**

**Given** the payment adapter is disabled (game day)
**When** I complete OTP, Reveal, Mahram attach, Report, Block, or browse
**Then** all succeed in both `sister_reach_mode` values and those handlers do not call `BillingPort`
**And** verification, blur, mahram attach, report, and block are not blocked

**Given** the payment adapter is disabled
**When** I send a Free-tier message (Chat text, photo, voice, Flash, card quick message)
**Then** message volume fails closed to the Free cap (`unavailable` → Free cap)
**And** Chat GET / list / typing stay up; an allowed send still delivers immediately (AD-10)

**Given** the payment adapter is disabled and `sister_reach_mode` is `free_unlimited`
**When** I am a Sister sending an Invite
**Then** the send succeeds and does not call `BillingPort`

**Given** the payment adapter is disabled and `sister_reach_mode` is `same_quota_as_brothers`
**When** I am a Sister sending Invites
**Then** `unavailable` maps to the Free Invite cap; Verification, Blur, Mahram attach, Report, Block stay usable

**Given** error is `PAY_UNAVAILABLE`
**When** the UI
**Then** does not hide Report, Blur, Mahram attach, Verification, Block, or browse
**And** Sister Invite compose is allowed or rejected solely by FR-045 / `sister_reach_mode`

**Implements:** FR-105, FR-146, NFR-004 · AD-21, AD-2, AD-27, AD-29 · [prd.md §4.10 FR-105](prds/prd-muslim-marriage-africa-2026-09-27/prd.md) · screen [Payment pack + error-banner](ux-designs/ux-muslim-marriage-africa-2026-10-01/EXPERIENCE.md)
**Start here:** `BillingPort.isEntitled returns true|false|unavailable` · entity `entitlement` · container `api`
**Notes:** UX-DR25. Safety modules must not import BillingPort. Chat send may call `isEntitled` only to decide FR-146. Sister invite send may call BillingPort only when `same_quota_as_brothers`. Historical “Chat after accept stays free … must not call BillingPort” is superseded 2026-10-02 for message volume.
### Story 10.5: CGV and refunds

As a Member / Operator,
I want refund rules on the CGV to match the pricing page, and an Operator-approved refund to return me to Free,
So that homepage and legal text do not contradict.

**Acceptance Criteria:**

**Given** I read CGV and pricing
**When** refund window
**Then** matches

**Given** Operator approves a refund
**When** my entitlement
**Then** ends and a ticket records the refund

**Implements:** FR-109 · AD-14, AD-18 · [prd.md §4.10 FR-109](prds/prd-muslim-marriage-africa-2026-09-27/prd.md) · screen [Legal hub](ux-designs/ux-muslim-marriage-africa-2026-10-01/EXPERIENCE.md)
**Start here:** `POST /v1/staff/refunds` · entity `payment, cil_ticket/ticket` · container `api`
### Story 10.6: MVP Premium is unlimited reach, unlimited messages, and queue

As a Brother with Premium,
I want the only paid deltas to be unlimited Invites, unlimited messages, and a faster human-review queue,
So that Premium cannot skip scan, human review, or the admin flag queue. There is no Premium Invite cap of 15.

**Acceptance Criteria:**

**Given** I compare pricing page to behaviour
**When** MVP
**Then** the differences are unlimited Invites (vs Free 3 `[ASSUMPTION]`), unlimited messages (vs FR-146), and FR-012 queue priority
**And** there is no Premium Invite cap of 15

**Given** I try to skip FR-012 or the background scan
**When** Premium
**Then** those still apply

**Given** `sister_reach_mode` is `same_quota_as_brothers`
**When** a Sister is Free vs Premium
**Then** Free uses the same Invite cap as Brothers; Premium is unlimited Invites and unlimited messages; she cannot skip scan or review

**Given** `sister_reach_mode` is `free_unlimited`
**When** a Sister is Free vs Premium
**Then** Invites stay unlimited either way; Premium still unlocks unlimited messages (FR-146) and queue priority

**Implements:** FR-110, FR-013, FR-146 · AD-21, AD-10, AD-27, AD-29 · [prd.md §4.10 FR-110](prds/prd-muslim-marriage-africa-2026-09-27/prd.md) · screen [Public pricing](ux-designs/ux-muslim-marriage-africa-2026-10-01/EXPERIENCE.md)
**Start here:** `BillingPort.isEntitled on invite_quota + message_quota + review queue order` · entity `entitlement, invite_quota, message_quota` · container `api`
## Epic 11: Stand in public as honorable ta'aruf

Visitors see an honest counter, five scholar-reviewed articles, named Board members, Ouaga/Bobo/BF pages, cookies that are not a likeness grant, hosting/CIL disclosure, FAQ, and can install the PWA or the Play-listed Android wrapper.

**FRs covered:** FR-115, FR-116, FR-117, FR-118, FR-119, FR-120, FR-133, FR-134, FR-138

### Story 11.1: Public landing with honest counter

As a visitor,
I want a solemn landing that shows Verified marriages (from Epic 9) and no invented DAU,
So that the first impression is marriage, not dishonest dating chrome. The product name is **AnKanu**.

**Acceptance Criteria:**

**Given** I open the cold URL
**When** landing renders
**Then** counter is proof-backed; no “+247.8k actifs”; the product name shown is **AnKanu**, not a historical shortlist name

**Given** copy scan
**When** strings
**Then** *mariage / ta'aruf / nikah / khitba* only

**Implements:** FR-101 (surface), FR-137 · AD-25, AD-24 · [prd.md §4.9 FR-101](prds/prd-muslim-marriage-africa-2026-09-27/prd.md) · screen [Public landing](ux-designs/ux-muslim-marriage-africa-2026-10-01/EXPERIENCE.md)
**Start here:** `apps/web public page + GET /v1/public/marriage-count` · entity `marriage_counter` · container `web`
**Notes:** UX-DR32. Testimonials carousel is not built.
### Story 11.2: Académie seed and Advisory Board names

As a visitor,
I want to read at least five scholar-reviewed articles and at least two named Board members,
So that fiqh-edge is human. Do not ship a fictional board or hardcoded scholar names in chrome — names come from content tables.

**Acceptance Criteria:**

**Given** I open Académie
**When** five articles
**Then** are public, named, and marked reviewed

**Given** I open Advisory Board
**When** at least two named people
**Then** appear with roles. Launch is unmet if names are empty

**Given** OQ-4
**When** UI chrome
**Then** does not hardcode scholar names

**Implements:** FR-115, FR-116 · AD-22, AD-24 · [prd.md §4.11 FR-115](prds/prd-muslim-marriage-africa-2026-09-27/prd.md) · screen [Académie list + article + Advisory Board](ux-designs/ux-muslim-marriage-africa-2026-10-01/EXPERIENCE.md)
**Start here:** `GET /v1/academie + GET /v1/board` · entity `article, board_member` · container `web`
### Story 11.3: SEO pages for Ouagadougou, Bobo-Dioulasso, Burkina Faso

As a visitor from BF search,
I want those three URLs to return 200 with local imam-reviewed copy,
So that we are not a Senegal clone and we do not use dating lexicon.

**Acceptance Criteria:**

**Given** I request the three URLs
**When** each returns 200
**Then** copy is local and reviewed

**Given** string scan
**When** the pages
**Then** contain no dating / rencontre romantique

**Implements:** FR-117 · AD-24 · [prd.md §4.11 FR-117](prds/prd-muslim-marriage-africa-2026-09-27/prd.md) · screen [Public landing](ux-designs/ux-muslim-marriage-africa-2026-10-01/EXPERIENCE.md)
**Start here:** `apps/web SEO routes` · entity `article / locale_string` · container `web`
### Story 11.4: Legal hub, cookies, and hosting disclosure

As a visitor,
I want Mentions, CGV, cookies, and a privacy page that discloses hosting (FR-120) and cannot hide it,
So that cookie accept is not a likeness grant. A3 text is not rewritten.

**Acceptance Criteria:**

**Given** I open privacy
**When** I read hosting
**Then** « Données hébergées en région Île-de-France (France), prestataire Scaleway » is absent, and no invented replacement location string is present

**Given** first visit
**When** cookie banner
**Then** accept and manage both work; marketing Photo reuse stays false

**Given** an Operator
**When** tries to hide the hosting line
**Then** they cannot

**Implements:** FR-119, FR-120, FR-109, NFR-002 · AD-5, AD-9, AD-19 · [prd.md §4.11 FR-120](prds/prd-muslim-marriage-africa-2026-09-27/prd.md) · screen [Legal hub + Cookie consent](ux-designs/ux-muslim-marriage-africa-2026-10-01/EXPERIENCE.md)
**Start here:** `GET public legal pages + POST /v1/cookie-consent` · entity `cookie_consent` · container `web`
### Story 11.5: FAQ and ticketed contact form

As a visitor,
I want to submit a contact ticket and read FAQ, with misuse routed to Moderators,
So that support is not Gmail-only.

**Acceptance Criteria:**

**Given** I submit the form
**When** a ticket id is returned
**Then** it is stored

**Given** subject is misuse
**When** routing
**Then** goes to Moderators, not only generic support

**Implements:** FR-118 · AD-20 · [prd.md §4.11 FR-118](prds/prd-muslim-marriage-africa-2026-09-27/prd.md) · screen [FAQ + contact](ux-designs/ux-muslim-marriage-africa-2026-10-01/EXPERIENCE.md)
**Start here:** `POST /v1/public/contact` · entity `cil_ticket / support ticket` · container `api`
### Story 11.6: Installable PWA

As a Member on Android Chrome,
I want to install the same origin to the home screen,
So that I can complete the member path without waiting on Play review loops. Install prompt is optional.

**Acceptance Criteria:**

**Given** I install the PWA
**When** I return via the icon
**Then** I can sign in and use the same web capability core

**Given** manifest / service worker
**When** offline
**Then** text outbox from Epic 5 still applies; we do not claim full offline media

**Implements:** FR-133, FR-132 · AD-4 · [prd.md §4.12 FR-133](prds/prd-muslim-marriage-africa-2026-09-27/prd.md) · screen [Splash](ux-designs/ux-muslim-marriage-africa-2026-10-01/EXPERIENCE.md)
**Start here:** `apps/web manifest + service worker` · entity `n/a` · container `web`
### Story 11.7: Store-listed Capacitor Android

As a Member in Burkina,
I want a Play listing that wraps the same origin with FLAG_SECURE, FCM, camera, and mic,
So that Ouaga finds the app in Play. We do not advertise “cannot screenshot”.

**Acceptance Criteria:**

**Given** I install from Play
**When** I complete UJ-1
**Then** Capacitor Bearer lives in platform secure storage

**Given** FLAG_SECURE
**When** is set
**Then** as deterrence only

**Given** age rating
**When** listing
**Then** matches counsel’s gate (A1 open)

**Implements:** FR-134, NFR-005 · AD-4, AD-9 · [prd.md §4.12 FR-134](prds/prd-muslim-marriage-africa-2026-09-27/prd.md) · screen [Splash + Responsive & Platform](ux-designs/ux-muslim-marriage-africa-2026-10-01/EXPERIENCE.md)
**Start here:** `apps/android Capacitor shell` · entity `session.kind=capacitor` · container `web`
**Notes:** Container is the Android wrapper around web; native plugins are the Capacitor project. iOS is not MVP.
### Story 11.8: Mooré and Dioula audio assets

As a low-literacy Member,
I want native-speaker-checked audio for onboarding, photo rules, no-auto-renew, and Mahram invite explainers,
So that D18 is a differentiator, not a nice-to-have. Do not claim ASR coverage.

**Acceptance Criteria:**

**Given** I select mos or dyu
**When** I play a covered step
**Then** the correct asset plays

**Given** a screen is outside the covered set
**When** I open it
**Then** UI stays French; missing audio is a listed gap, not a crash

**Given** NFR-007 checklist
**When** launch
**Then** native-speaker sign-off exists

**Implements:** FR-138, FR-010, NFR-007 · AD-11, AD-16, AD-24 · [prd.md §4.12 FR-138](prds/prd-muslim-marriage-africa-2026-09-27/prd.md) · screen [Onboarding + audio-prompt](ux-designs/ux-muslim-marriage-africa-2026-10-01/EXPERIENCE.md)
**Start here:** `content audio_asset keys mos/dyu` · entity `audio_asset` · container `web`
## Epic 12: Operate, measure, and honour a CIL request

Operators change pack prices, `sister_reach_mode` (Story 4.7), `daily_message_cap` (Story 5.11 — do not fork a second conflicting story), and moderation policy text, publish Board/Académie, see internal metrics including scan-deferred, and complete deletion/CIL tickets. Staff are individual, MFA, never operator-as-member. Audit is append-only.

**FRs covered:** FR-139, FR-140, FR-141, FR-142, FR-143

### Story 12.1: Staff identity, MFA, and staff-only chrome

As a Moderator or Operator,
I want an individual staff session with MFA that cannot be mixed with a member session,
So that shared Moderator logins and operator-as-member are forbidden.

**Acceptance Criteria:**

**Given** I authenticate as staff
**When** session.kind=staff
**Then** MFA is required; I cannot open member chrome on this session

**Given** every staff surface
**When** renders
**Then** staff-only-badge is visible. Members never see this chrome

**Given** two-pane from 768px
**When** I resize below 768
**Then** queue stacks above the case

**Implements:** NFR-001, NFR-009, FR-093 (shell) · AD-8, AD-17 · [prd.md §5 NFR-001](prds/prd-muslim-marriage-africa-2026-09-27/prd.md) · screen [Staff home](ux-designs/ux-muslim-marriage-africa-2026-10-01/EXPERIENCE.md)
**Start here:** `POST /v1/sessions (staff) + MFA` · entity `session` · container `web`
**Notes:** UX-DR19, UX-DR27.
### Story 12.2: Configure pack prices without a store release

As a Operator,
I want to edit 1/3/6-month prices and durations so pricing and checkout update,
So that auto-renew stays off. The change is audited.

**Acceptance Criteria:**

**Given** I change a pack price
**When** FR-108 and checkout
**Then** show the new XOF values

**Given** a non-Operator
**When** calls the config API
**Then** is rejected

**Given** auto-renew toggle
**When** the form
**Then** does not exist

**Implements:** FR-139, FR-106 · AD-14, AD-18 · [prd.md §4.13 FR-139](prds/prd-muslim-marriage-africa-2026-09-27/prd.md) · screen [Operator pricing](ux-designs/ux-muslim-marriage-africa-2026-10-01/EXPERIENCE.md)
**Start here:** `PUT /v1/staff/config (pack_prices_xof)` · entity `operator_config, pack` · container `api`
**Notes:** `sister_reach_mode` PATCH, audit, Sister UI, and Sister checkout are Story 4.7 (FR-145). `daily_message_cap` PATCH and audit are Story 5.11 (FR-146) — do not fork a second conflicting story here. This story stays pack prices/durations only.
### Story 12.3: Edit moderation policy and thresholds

As a Operator,
I want to edit D6 Member policy text and numeric thresholds that apply only to subsequent scans,
So that old decisions are not silently rewritten. Thresholds do not add send latency.

**Acceptance Criteria:**

**Given** I change flag_threshold or photo-Strike floor
**When** new messages
**Then** use the new values; a versioned policy record is stored

**Given** Members open D6
**When** they see
**Then** the currently published delivered-then-scanned explanation

**Given** I look at send path
**When** latency
**Then** is unchanged — thresholds affect background scan and flag queue only

**Implements:** FR-140, FR-066 · AD-10, AD-18 · [prd.md §4.13 FR-140](prds/prd-muslim-marriage-africa-2026-09-27/prd.md) · screen [Operator policy / thresholds](ux-designs/ux-muslim-marriage-africa-2026-10-01/EXPERIENCE.md)
**Start here:** `PUT /v1/staff/config + locale_string moderation_policy_*` · entity `operator_config, locale_string` · container `api`
### Story 12.4: Publish Board names and Académie articles

As a Operator,
I want to publish or update Board names and the five articles with a review record,
So that drafts are 404. Fiqh-edge escalations have a human destination.

**Acceptance Criteria:**

**Given** I publish an article or name change
**When** the public page
**Then** updates and the review record is stored

**Given** a draft
**When** a visitor requests it
**Then** 404

**Implements:** FR-141, FR-115, FR-116 · AD-22, AD-18 · [prd.md §4.13 FR-141](prds/prd-muslim-marriage-africa-2026-09-27/prd.md) · screen [Operator Board / Académie publish](ux-designs/ux-muslim-marriage-africa-2026-10-01/EXPERIENCE.md)
**Start here:** `PUT /v1/staff/academie + /v1/staff/board` · entity `article, board_member` · container `api`
### Story 12.5: Internal metrics including scan-deferred

As a Operator,
I want a dashboard of verified levels, dual-confirmed marriages, report SLA, scan-deferred, and appeal overturns,
So that public embeds can only show numbers that exist here. Scan-deferred is never hidden.

**Acceptance Criteria:**

**Given** I open the dashboard
**When** the period
**Then** shows the metrics above, including scan-deferred count

**Given** a public embed shows a number
**When** that number
**Then** exists in this dashboard

**Given** zero launch
**When** counters
**Then** are valid (0 is honest)

**Implements:** FR-142, FR-092, NFR-003 · AD-20, AD-25 · [prd.md §4.13 FR-142](prds/prd-muslim-marriage-africa-2026-09-27/prd.md) · screen [Operator metrics](ux-designs/ux-muslim-marriage-africa-2026-10-01/EXPERIENCE.md)
**Start here:** `GET /v1/staff/metrics` · entity `n/a (projections)` · container `api`
### Story 12.6: CIL and deletion tickets

As a Operator / Member,
I want to complete access, erasure, and CIL tickets with a status page the Member can see,
So that staff must not run a bulk contact export. The only staff path that emits another person’s contact is this ticket.

**Acceptance Criteria:**

**Given** I complete a ticket
**When** the Member status page
**Then** shows completed and NFR-008 clocks are recorded as [ASSUMPTION]

**Given** a Member FR-019 stalls
**When** this queue
**Then** can complete it

**Given** a low-privilege staff role
**When** tries to bulk export contacts
**Then** the request fails (NFR-001)

**Implements:** FR-143, FR-019, NFR-002, NFR-008 · AD-19, AD-17, AD-18 · [prd.md §4.13 FR-143](prds/prd-muslim-marriage-africa-2026-09-27/prd.md) · screen [Operator CIL / deletion tickets](ux-designs/ux-muslim-marriage-africa-2026-10-01/EXPERIENCE.md)
**Start here:** `GET/PUT /v1/staff/cil-tickets` · entity `cil_ticket` · container `api`
### Story 12.7: Tamper-evident audit log

As a Operator / auditor,
I want append-only hash-chained audit events for unblur, sanctions, appeals, config, CIL, scan-deferred, admin flags, mahram, reveal, payments, and marriage confirms,
So that logs are individually attributed and retained ≥12 months. This is tamper-evident, not object-lock WORM.

**Acceptance Criteria:**

**Given** a mandatory event fires
**When** audit_event
**Then** stores ids + action + reason — never phones or original photo bytes

**Given** the audit DB role
**When** is inspected
**Then** INSERT + SELECT only; UPDATE/DELETE revoked

**Given** nightly job
**When** chain-verify
**Then** runs; copies may go to versioned object storage

**Implements:** NFR-009, FR-093 · AD-18 · [prd.md §5 NFR-009](prds/prd-muslim-marriage-africa-2026-09-27/prd.md) · screen [Case file / Operator](ux-designs/ux-muslim-marriage-africa-2026-10-01/EXPERIENCE.md)
**Start here:** `audit.append + nightly verify worker` · entity `audit_event` · container `worker`

## Requirements coverage table (story index)

Every PRD FR and NFR maps to a story id or an explicit not-MVP mark. NEXT/LATER items from PRD Appendix A are not MVP stories.

| ID | Story | Horizon |
| --- | --- | --- |
| FR-001 | 2.1 | MVP |
| FR-002 | 2.7 | MVP |
| FR-003 | 2.5 | MVP |
| FR-004 | not-MVP | not-MVP |
| FR-005 | 2.1 | MVP |
| FR-006 | 2.3 | MVP |
| FR-007 | 2.2 | MVP |
| FR-008 | 2.4 | MVP |
| FR-009 | 2.9 | MVP |
| FR-010 | 2.9 | MVP |
| FR-011 | 2.6 | MVP |
| FR-012 | 3.3 | MVP |
| FR-013 | 3.3 | MVP |
| FR-014 | 2.8 | MVP |
| FR-015 | 3.7 | MVP |
| FR-016 | 4.1 | MVP |
| FR-017 | 3.4 | MVP |
| FR-018 | 2.11 | MVP |
| FR-019 | 2.12 | MVP |
| FR-020 | 2.10 | MVP |
| FR-021 | 3.1 | MVP |
| FR-022 | 3.1 | MVP |
| FR-023 | 3.1 | MVP |
| FR-024 | 3.9, 3.13 | MVP |
| FR-025 | 3.8, 3.13 | MVP |
| FR-026 | 3.10 | MVP |
| FR-027 | 3.11 | MVP |
| FR-028 | 5.6 | MVP |
| FR-029 | not-MVP | not-MVP |
| FR-030 | not-MVP | not-MVP |
| FR-031 | not-MVP | not-MVP |
| FR-032 | not-MVP | not-MVP |
| FR-033 | not-MVP | not-MVP |
| FR-034 | not-MVP | not-MVP |
| FR-035 | not-MVP | not-MVP |
| FR-036 | not-MVP | not-MVP |
| FR-037 | 4.4 | MVP |
| FR-038 | 4.1 | MVP |
| FR-039 | 4.5 | MVP |
| FR-040 | 4.4 | MVP |
| FR-041 | 4.5 | MVP |
| FR-042 | 4.5 | MVP |
| FR-043 | 4.5 | MVP |
| FR-044 | 4.2 | MVP |
| FR-045 | 4.1 | MVP |
| FR-046 | 4.3 | MVP |
| FR-047 | 4.3 | MVP |
| FR-048 | 7.4 | MVP |
| FR-049 | not-MVP | not-MVP |
| FR-050 | 5.1 | MVP |
| FR-051 | 5.4 | MVP |
| FR-052 | 5.8 | MVP |
| FR-053 | 5.9 | MVP |
| FR-054 | not-MVP | not-MVP |
| FR-055 | not-MVP | not-MVP |
| FR-056 | 3.2 | MVP |
| FR-057 | 6.2 | MVP |
| FR-058 | 6.3 | MVP |
| FR-059 | 6.4 | MVP |
| FR-060 | 6.5 | MVP |
| FR-061 | not-MVP | not-MVP |
| FR-062 | 5.2 | MVP |
| FR-063 | 5.3 | MVP |
| FR-064 | 5.4 | MVP |
| FR-065 | 3.2 | MVP |
| FR-066 | 8.1 | MVP |
| FR-067 | 8.2 | MVP |
| FR-068 | 5.5 | MVP |
| FR-069 | 3.6 | MVP |
| FR-070 | 3.5 | MVP |
| FR-071 | 7.1 | MVP |
| FR-072 | 7.2 | MVP |
| FR-073 | 7.3 | MVP |
| FR-074 | 7.4, 7.8 | MVP |
| FR-075 | 7.5 | MVP |
| FR-076 | 7.4, 7.8 | MVP |
| FR-077 | 7.6, 7.8 | MVP |
| FR-078 | 7.7 | MVP |
| FR-079 | 7.7 | MVP |
| FR-080 | 7.7 | MVP |
| FR-081 | not-MVP | not-MVP |
| FR-082 | not-MVP | not-MVP |
| FR-083 | 8.5 | MVP |
| FR-084 | 8.6 | MVP |
| FR-085 | 8.7 | MVP |
| FR-086 | 8.11 | MVP |
| FR-087 | 8.7 | MVP |
| FR-088 | 8.8 | MVP |
| FR-089 | 2.1 | MVP |
| FR-090 | 8.9 | MVP |
| FR-091 | 2.6 | MVP |
| FR-092 | 8.11 | MVP |
| FR-093 | 8.10 | MVP |
| FR-094 | not-MVP | not-MVP |
| FR-095 | 9.1 | MVP |
| FR-096 | 9.2 | MVP |
| FR-097 | 9.3 | MVP |
| FR-098 | 9.2 | MVP |
| FR-099 | 9.5 | MVP |
| FR-100 | 9.5 | MVP |
| FR-101 | 9.4 | MVP |
| FR-102 | not-MVP | not-MVP |
| FR-103 | not-MVP | not-MVP |
| FR-104 | 10.1 | MVP |
| FR-105 | 10.4 | MVP |
| FR-106 | 10.3 | MVP |
| FR-107 | 10.2 | MVP |
| FR-108 | 10.1 | MVP |
| FR-109 | 10.5 | MVP |
| FR-110 | 10.6 | MVP |
| FR-111 | not-MVP | not-MVP |
| FR-112 | not-MVP | not-MVP |
| FR-113 | not-MVP | not-MVP |
| FR-114 | not-MVP | not-MVP |
| FR-115 | 11.2 | MVP |
| FR-116 | 11.2 | MVP |
| FR-117 | 11.3 | MVP |
| FR-118 | 11.5 | MVP |
| FR-119 | 11.4 | MVP |
| FR-120 | 11.4 | MVP |
| FR-121 | not-MVP | not-MVP |
| FR-122 | not-MVP | not-MVP |
| FR-123 | not-MVP | not-MVP |
| FR-124 | not-MVP | not-MVP |
| FR-125 | not-MVP | not-MVP |
| FR-126 | not-MVP | not-MVP |
| FR-127 | not-MVP | not-MVP |
| FR-128 | not-MVP | not-MVP |
| FR-129 | not-MVP | not-MVP |
| FR-130 | not-MVP | not-MVP |
| FR-131 | not-MVP | not-MVP |
| FR-132 | 1.4 | MVP |
| FR-133 | 11.6 | MVP |
| FR-134 | 11.7 | MVP |
| FR-135 | not-MVP | not-MVP |
| FR-136 | 3.12 | MVP |
| FR-137 | 1.4 | MVP |
| FR-138 | 11.8 | MVP |
| FR-139 | 12.2 | MVP |
| FR-140 | 12.3 | MVP |
| FR-141 | 12.4 | MVP |
| FR-142 | 12.5 | MVP |
| FR-143 | 12.6 | MVP |
| FR-144 | 8.3 | MVP |
| FR-145 | 4.7 | MVP |
| FR-146 | 5.11 | MVP |
| NFR-001 | 2.2 | MVP |
| NFR-002 | 11.4 | MVP |
| NFR-003 | 5.2 | MVP |
| NFR-004 | 10.4 | MVP |
| NFR-005 | 3.8 | MVP |
| NFR-006 | 2.9 | MVP |
| NFR-007 | 11.8 | MVP |
| NFR-008 | 2.12 | MVP |
| NFR-009 | 12.7 | MVP |

### UX-DR coverage

| ID | Story |
| --- | --- |
| UX-DR1 | 1.4 |
| UX-DR2 | 1.4 |
| UX-DR3 | 2.1 |
| UX-DR4 | 2.6 |
| UX-DR5 | 2.7 |
| UX-DR6 | 2.8 |
| UX-DR7 | 3.1 |
| UX-DR8 | 3.8, 3.13 |
| UX-DR9 | 3.2 |
| UX-DR10 | 6.2 |
| UX-DR11 | 5.1 |
| UX-DR12 | 5.4 |
| UX-DR13 | 7.4 |
| UX-DR14 | 5.5 |
| UX-DR15 | 4.4 |
| UX-DR16 | 4.3 |
| UX-DR17 | 5.6 |
| UX-DR18 | 8.3 |
| UX-DR19 | 12.1 |
| UX-DR20 | 8.7 |
| UX-DR21 | 10.1 |
| UX-DR22 | 2.9 |
| UX-DR23 | 2.10 |
| UX-DR24 | 1.4 |
| UX-DR25 | 1.2 |
| UX-DR26 | 3.8 |
| UX-DR27 | 1.4 |
| UX-DR28 | 5.1 |
| UX-DR29 | 1.4 |
| UX-DR30 | 11.7 |
| UX-DR31 | 5.1 |
| UX-DR32 | 11.1 |

## Validation (step 4)

- **FR/NFR coverage:** FR-001–FR-146 and NFR-001–NFR-009 each have a story id or an explicit not-MVP mark. MVP FRs uncovered: none. FR-145 maps to Story 4.7 (MVP). FR-146 maps to Story 5.11 (MVP), with 4.3, 4.7, 10.6.
- **Sister reach (2026-10-02):** Inventory, Epic 4 intro, Stories 4.1 / 4.2 / 4.7 / 10.4 no longer hardcode Sister Invites as always free. Both `sister_reach_mode` values are testable. Passive moderation and no pre-delivery hold unchanged.
- **Card / message-cap / mahram-grant (2026-10-02):** Discover defaults to one focused card (Stories 3.8, 3.9, 3.13). Premium Invite cap of 15 deleted; Premium is unlimited Invites and unlimited messages. Free-tier messages are daily-capped (Story 5.11). Mahram is grant-scoped (Stories 7.3–7.8). Historical “Chat after accept stays free … must not call BillingPort”, “read-all”, and “sisters buy packs only in same_quota” are superseded 2026-10-02. Safety still must not call BillingPort.
- **Starter template:** Architecture is greenfield. No clone-from-starter story. Story 1.1 is the shared kernel, not a vanilla CLI dump.
- **Entities:** Tables are created on the first story that needs them. Story 1.5 seeds `operator_config` only.
- **Locked moderation:** No story implements a pre-delivery hold, pending-moderation/held Chat state, unsend, or AI auto-suspend. Profile Photo/bio stay publish-gated (3.2). Blur is server-side (6.1). Mahram is read-only on granted threads only (7.4, 7.8). Contact-share is a local matcher (5.5). Over-cap send is rejected, not held (5.11).
- **Open questions:** A1–A3 and PRD §16 questions that are not the product name stay open. The product name is **AnKanu** (ankanu.com purchased on Hostinger, 2026-10-03). Historical shortlist domains were not bought.
- **File churn:** Media is touched in Epics 3, 5, and 6 on purpose — publish-gate, Chat delivery, and Reveal gateway are separate locked risk boundaries (AD-10 vs AD-9). Not consolidated.
- **Epic independence:** Each epic delivers its domain. Epic 1 is the runnable substrate required by AD-6/AD-20. Later epics build on earlier ones only.
- **Forward dependencies fixed:** FR-048 lives on Story 7.4. Story 4.6 only stores Flash. Story 2.9 degrades to pictograms if audio files are missing. Story 7.5 inserts the priority case when the Mahram flags.

### Recommended next skill

**bmad-help** — do not start sprint planning, implementation, or `bmad-sprint-planning` from this run.
