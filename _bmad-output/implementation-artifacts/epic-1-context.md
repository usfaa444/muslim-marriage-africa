# Epic 1 Context: A running Burkina-first product

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Stand up the only runtime later epics may use: a French public web shell, plus `web`, `api`, and `worker`, against PostgreSQL, Redis, and S3-compatible object storage in one self-managed Docker Compose environment. A visitor sees **AnKanu** (repo slug `muslim-marriage-africa` is not the product name), the design tokens, and three role shells that cannot share a session. This substrate has no Chat hold state, no second config store, and no named host or region.

## Stories

- Story 1.1: Shared kernel and port types
- Story 1.2: API process with health and versioned REST
- Story 1.3: Worker process from the same image
- Story 1.4: Web shell, tokens, and three role chrome
- Story 1.5: Postgres migrations and operator_config seed
- Story 1.6: Redis and S3-compatible object storage adapters
- Story 1.7: Dockerfiles and local compose
- Story 1.8: One self-managed compose environment
- Story 1.9: CI, observability, and restore drills

## Requirements & Constraints

- Primary screens are French. Member-facing copy uses *mariage*, *ta'aruf*, *nikah*, and *khitba*. *dating* and *rencontre romantique* are forbidden in shipped strings.
- French UI meets WCAG 2.1 AA (contrast, focus, labels). Touch targets are at least 44px, and 48px on primary actions. Reduce Motion skips the mihrab fade.
- Once later epics fill the member path, monthly availability is 99.5% excluding agreed maintenance. A payment outage must leave the Free tier and safety features up, so health and this shell must not depend on billing.
- The public privacy stub must not show « Données hébergées en région Île-de-France (France), prestataire Scaleway » and must not contain an invented location sentence. Publish a hosting location only after a host is named. Do not claim CIL compliance, and do not rewrite the standing CIL assumption.
- Open product and legal questions stay config, policy rows, or disabled ports. Retention clocks stay assumptions.
- Scan-deferred work is countable before any scanner exists. That count is never hidden. There is no pending-to-delivered Chat machine, no hold queue, and no member-facing wait-for-scan chrome.

## Technical Decisions

One hexagonal API product. `api` (HTTP) and `worker` (BullMQ) are two roles of the same OCI image. `PROCESS_ROLE=worker` registers queue processors and does not bind public HTTP; if Redis is down it exits non-zero or retries visibly. Modules do not ship their own queues. `apps/web` is Next.js and must not import module domain. `apps/api` is NestJS and ESM. Domain does not import Nest, Next, or adapters. Modules call each other only through published ports.

`packages/kernel` owns UUID v7 (PostgreSQL 17 has no native `uuidv7`), clocks, `AuthContext`, and the only client error shape: `{ error: { code, message, details, request_id, retryable } }`. Map framework exceptions onto that envelope. Unknown `/v1` routes return it, never a stack trace. `GET /v1/health` returns 200 `{ status, role: "api" }` and a `request_id`. JSON REST is under `/v1`. `packages/ports` holds shared port types.

`AuthContext` is `{ accountId, roles[], gender, mahramWardId? }`. `gender` is required on `member` sessions and must not be re-parsed downstream. The context must not carry entitlement or packs. Roles are `member | mahram | moderator | operator | system`. Sister and Brother are a member attribute, not roles. A staff session must not also be a member session. Persist and send UTC ISO-8601. Display time, and later civil-day windows, in `Africa/Ouagadougou`.

Drizzle Kit is the only migration runner (Drizzle ORM 0.45.3). The only config store is operator-owned `operator_config` (`key` text primary key, `value` text). Seed on an empty database: `min_age` 19; `brother_invite_quota_free` 3 (assumption); `brother_invite_quota_premium` present, while Premium invite volume is unlimited when entitled (not a locked 15); `sister_reach_mode` with both `free_unlimited` (default) and `same_quota_as_brothers`; `daily_message_cap` seed 10 (admin-configurable assumption, not a product lock); `signed_url_ttl_seconds` max 60; `photo_strike_count` 3; `photo_strike_block_hours` 24; `free_review_sla_hours` and `report_sla_hours` (the stated human-review clock is 24h; separate seed integers are not given); `flag_threshold`; `pack_prices_xof`; `rl_auth_per_min`, `rl_otp_per_hour`, `rl_invite_per_day`, `rl_report_per_hour`, `rl_pay_per_min`, `rl_browse_per_min`. Do not invent numbers for threshold, pack prices, or rate limits. Only an operator may write `sister_reach_mode` and `daily_message_cap`.

Runtime is Docker Compose, not Kubernetes: `web`, `api`, `worker`, PostgreSQL, Redis, and S3-compatible object storage, one self-managed environment. Redis (Valkey-compatible allowed) is queue, cache, and pub/sub. Secrets live in a secrets manager, never in images or git. Kapsule, OpenTofu, `infra/` env modules, and isolated `dev | staging | prod` are out of MVP. Do not name a host or region. France hosting is not a requirement. Vercel, Netlify, and USA edge hosts are rejected for member traffic.

Pins: Node.js 24.21.0, TypeScript 7.0.2 (ignore a Nest schematic that asks for TypeScript 6), React 19.3.0, NestJS 12.1.0, PostgreSQL 17.11 (stay off 18 until the pin moves), Redis 8.6.3, BullMQ 6.3.9, Tailwind CSS 4.3.3. The stack table lists Next.js 16.3.6 and also says not to scaffold below 16.3.7 after 2026-09-30; no newer verified pin is stated. If the first production cut is after 2026-10-28, revisit Node 24 maintenance versus 26 LTS. Lint with oxlint. Nest tests use Vitest. Layout: `apps/web`, `apps/api`, `modules/*`, `packages/kernel`, `packages/ports`, `compose.yaml`. Capacitor Android is a later shell on the same origin, not this epic.

GitHub Actions must pass oxlint, types, unit, integration, and a migration check. Observability is OpenTelemetry logs, traces, and metrics, including `scan_deferred_count`. Backups are PostgreSQL PITR (daily plus WAL) and object-storage versioning, restored together in a quarterly drill on this one environment.

## UX & Interaction Patterns

Mobile-first, 360px member reference, Tailwind 4, no second component library. Tokens: sand, indigo, gold, staff, blur-wash. Source Serif 4 for display, title, and heading; Source Sans 3 for body. Mihrab wash on splash and public landing only. One indigo primary action per screen, minimum height 48px, French verb label. Ship `empty-state` (one sentence and one action) and `error-banner` (French for `error.code`). Spines win over mocks.

Three shells never share a session. Member: phone-first, bottom nav **Découvrir · Invitations · Discussions · Profil** (labels are an assumption), 16px screen padding. Mahram: phone-first, no browse, no invite. Staff: two-pane from 768px (comfortable at 1024), queue above case below 768, staff color, staff-only badge. A staff cookie on a member route is refused.

## Cross-Story Dependencies

Kernel and ports are the contract the API and worker speak. The worker and object storage need Redis and the bucket from compose. The single-environment story locks that same compose file and the hosting-copy ban. Later invite, message-cap, age, SLA, and rate-limit work reads this `operator_config` seed. The scan-deferred instrument must exist before moderation metrics. Later screens mount in this shell; account, Mahram, and staff work extend this role split. A real public hosting line, once a host is named, belongs to the public-presence epic. Chat delivery and human review depend on the absence of a hold state.
