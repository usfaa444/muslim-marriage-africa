# Epic 1 Context: A running Burkina-first product

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Operators can run web, api, and worker on PostgreSQL, Redis, and S3-compatible storage in Docker and, from the same images, on Scaleway Kapsule with dev, staging, and prod isolated. A visitor gets a French public shell with the design tokens and three role chromes. Later epics add account, browse, Invite, and Chat. The UI name is AnKanu (ankanu.com); the repo slug is not. This substrate has no Chat hold or fail-closed delivery state.

## Stories

- Story 1.1: Shared kernel and port types
- Story 1.2: API process with health and versioned REST
- Story 1.3: Worker process from the same image
- Story 1.4: Web shell, tokens, and three role chrome
- Story 1.5: Postgres migrations and operator_config seed
- Story 1.6: Redis and S3-compatible object storage adapters
- Story 1.7: Dockerfiles and local compose
- Story 1.8: Kapsule, OpenTofu, and isolated environments
- Story 1.9: CI, observability, and restore drills

## Requirements & Constraints

- Browsers can open the site. Account through Chat is later work.
- French UI, using mariage / ta'aruf / nikah / khitba. The words dating and rencontre romantique do not ship.
- Core member path ≥ 99.5% monthly, agreed maintenance excluded. Payment downtime leaves the Free tier and safety up.
- WCAG 2.1 AA. Targets ≥ 44px; primary actions 48px.
- Open questions stay config, not enums. Age gate is 19 pending counsel; do not claim a statute. Scaleway Paris hosting is an assumption pending legal review. Fixed copy: « Données hébergées en région Île-de-France (France), prestataire Scaleway ». Retention clocks stay assumptions.
- AnKanu trademark and social handles are unchecked. Nisfuddin, Nikahsira, Sakinaa, Mithaqun, and Nonglem are not the name.
- Secrets stay in an in-region manager, never in images or git.

## Technical Decisions

Greenfield hexagonal monolith. api and worker (BullMQ) share one image; PROCESS_ROLE=worker does not bind HTTP and fails without Redis. web is in-region Next.js on Kapsule and must not import module domain. No Vercel, Netlify, or USA edge. Calls: clients → adapters → application → domain, across modules only via ports. Safety paths must not call BillingPort. isEntitled returns true, false, or unavailable and must not throw.

Layout: apps/web, apps/android (Capacitor home only), apps/api (NestJS, ESM), modules when a later epic needs them, packages/kernel, packages/ports, infra/.

Kernel: UUID v7. Store UTC; display Africa/Ouagadougou, including civil days. AuthContext is { accountId, roles[], gender?, mahramWardId? }; gender is required on member sessions and carries no entitlement. Roles: member, mahram, moderator, operator, system. Sister/Brother is an attribute. Staff and member sessions never combine. Sole error: { error: { code, message, details, request_id, retryable } }. REST /v1 (breaks on /v2). GET /v1/health is 200 { status, role: "api" } plus request_id. No pending or held message state.

Drizzle Kit is the only migrator (0.45.3, not Prisma). The only table this epic creates is operator_config (operator-owned; key + value). Seed flag_threshold; free_review_sla_hours 24; report_sla_hours; photo_strike_count 3; photo_strike_block_hours 24; brother_invite_quota_free 3 (assumption); brother_invite_quota_premium (unlimited when entitled, not 15); sister_reach_mode free_unlimited (default) and same_quota_as_brothers, both seeded, not compiled out; daily_message_cap 10 (assumption); signed_url_ttl_seconds max 60; pack_prices_xof; min_age 19; rl_auth_per_min; rl_otp_per_hour; rl_invite_per_day; rl_report_per_hour; rl_pay_per_min; rl_browse_per_min. Only operator writes reach mode and message cap.

Compose: web, api, worker, Postgres, Redis or Valkey, S3-compatible bucket; one image, two commands; a test put and a no-op job round-trip. OpenTofu targets Scaleway fr-par (Kapsule, Postgres 17.11, Redis 8.6.3). dev, staging, and prod do not share stores or secrets. Staging auto-deploys; production needs approval. Launch: 2 api, 1 worker, 1 web, primary plus one replica.

CI: oxlint, types, unit, integration, migration check. In-region OpenTelemetry includes scan_deferred_count. PITR plus object versioning; a quarterly staging restore.

Pins (2026-09-27): Node 24.21.0, TypeScript 7.0.2 (not 6), Next.js 16.3.6 and not below 16.3.7, React 19.3.0, NestJS 12.1.0, Capacitor 8.5.2, BullMQ 6.3.9, Socket.IO 4.8.4, Tailwind 4.3.3. If production is after 2026-10-28, revisit Node 24 vs 26.

## UX & Interaction Patterns

Tailwind 4, 360px. Three chromes never share a session. Member nav: Découvrir · Invitations · Discussions · Profil (labels assumed). Mahram omits the first two. Staff is two panes from 768px; « Équipe seulement » stays off member screens. Tokens: sand, raised, indigo, gold (confirmation only), mihrab on splash and landing, blur-wash, danger, success, staff. Source Serif 4 for titles; Source Sans 3 for body. Indigo button-primary, 48px, one French verb per screen; plus secondary, quiet, empty-state, and a French error-banner. No invented counts, « en ligne », or heart stack.

## Cross-Story Dependencies

Kernel and ports (1.1) bind API, worker, and web errors (1.2–1.4). Redis and the bucket (1.6) are what compose (1.7) and Kapsule (1.8) run. Restore (1.9) needs PITR and object versions; CI checks Drizzle (1.5). Later tables read this operator_config. The shell refuses a staff cookie on a member route.
