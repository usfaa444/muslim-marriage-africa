# Rubric-walker review — Architecture Spine

> **Superseded 2026-10-01.** Chat moderation is passive after delivery (AD-10 amendment; PRD FR-062–068, FR-144, NFR-003). Claims in this review of pre-delivery Chat scan, hold-on-timeout, or fail-closed Chat delivery are historical. Profile Photo/bio publish-gate (FR-065), AD-9 blur, and AD-12 mahram read-delivered-only are unchanged.

- **Artifact:** `ARCHITECTURE-SPINE.md`
- **Altitude:** initiative / build-substrate
- **Reviewed:** 2026-09-27
- **Reviewer:** rubric-walker (independent; spine only; versions checked against npm registry and public release notes)
- **Verdict:** **REVISE**

The spine is a coherent greenfield hexagonal modular monolith. Paradigm, most safety ADs, entity ownership, hosting region, and the capability map are real initiative decisions. It does **not** yet meet the good-spine bar: two AD rules fail to prevent their stated divergence, the deployable topology contradicts AD-1, contact-share and Case have no owner, and several initiative-owned ops/env dimensions are neither decided, deferred, nor asked.

---

## Checklist

| Gate | Result | Notes |
| --- | --- | --- |
| Fixes real feature-level divergence points; misses none | **FAIL** | Strong on paradigm, region, UI kit, blur, moderation fail-closed, mahram, billing isolation, roles, API envelope. Misses deployable topology (API vs workers vs Next runtime), contact-share owner, Case writer, push/observability/secrets/IaC/CI platform, monorepo tool. |
| Every AD Rule is enforceable and prevents its stated divergence | **FAIL** | AD-1 contradicted by its own worker diagram. AD-17 claims to prevent dual contact-share but names no owner, entity, or port. AD-3 names `Case` as a dual-write hazard then never assigns it. AD-7 vs AD-15 leave the realtime transport ambiguous. |
| Nothing under Deferred could let two units diverge | **FAIL** | “First adapter chosen at implementation” for SMS/KYC/moderation/aggregator has no chooser — identity OTP and notifications SMS can pick two vendors. Redis vs Valkey can split lockfiles. Push is not even in the deferred vendor list. |
| Named tech is verified-current | **PASS** | Patch pins match npm / vendor releases as of 2026-09-27. Not merely asserted. |
| Greenfield is coherent (no brownfield to ratify) | **PASS** | No legacy runtime, schema, or vendor to inherit. Farata is evidence, not substrate. |
| Covers PRD capability surface via capability map | **PASS WITH CAVEAT** | `binds` and the 16-row map are internally consistent. Spine-only review cannot certify PRD § completeness. Lite/SMS/USSD (AD-16) is mapped only to discovery; contact-share and device fingerprint have no map row. |
| Every initiative dimension decided, deferred, or an open question — especially ops/env envelope | **FAIL** | Region, K8s+PG+Redis+S3, envs, CI *kinds*, PITR, launch scale: decided. Next.js runtime/region, worker deployable, secrets product, observability product, IaC tool, CI host, ingress/DNS/certs, migration runner, feature-flag store: unset. |

---

## What the spine gets right

- Hexagonal modular monolith with ports/adapters, published cross-module ports, and a shared kernel is the right altitude for Burkina-launch scale.
- AD-3’s owner table, AD-9 server-side blur, AD-10 fail-closed states, AD-11 Mooré/Dioula honesty, AD-12 mahram read-only, AD-13 verification-not-paywalled, AD-14 no silent renew, and AD-21 billing isolation are real feature-divergence locks.
- AD-5 names a region, a public disclosure sentence, rejected alts, and a portable escape — not a silent USA default.
- AD-22 correctly refuses to close PRD §16 in schema enums.
- Stack versions are current (see Version check).
- Deferred iOS/USSD/watermark/A-V/multi-region/name/prices are scoped so they do not fork the paradigm.

---

## Findings

### CRITICAL

None. No finding would silently ship a second product or a brownfield contradiction. The failures are missing locks, not wrong locks.

### HIGH

#### H1 — AD-1 “one API process” is not the deployable topology the spine draws

- **Checklist:** AD enforceability; missed feature divergence; ops envelope
- **Suggest:** **autofix**
- **Where:** AD-1; Structural Seed flowchart (`API_replicas` + `BullMQ_workers`); AD-20 “2 API replicas”
- **Gap:** AD-1’s rule is “ship one API process.” The seed already has a second process class (BullMQ workers). AD-20’s launch assumption omits workers. No owner for the worker host. No rule that workers are the same image with a different command, or a second Deployment, or in-process.
- **Divergence it fails to prevent:** chat/moderation/media/notifications each invent a worker topology (sidecar, second service, in-process `WorkerHost`, separate repo). That is the microservice-adjacent split AD-1 claims to block.
- **Autofix:** Rewrite AD-1 to “one API *product*, two process roles from the same image: `api` and `worker`” (or explicitly forbid a second Deployment). Name the worker entrypoint and say modules contribute processors; they do not deploy their own queues.

#### H2 — AD-17 does not prevent dual contact-share (no owner, entity, or port)

- **Checklist:** AD enforceability; missed feature divergence
- **Suggest:** **autofix**
- **Where:** AD-17; AD-3 entity table; Capability map
- **Gap:** AD-17’s stated prevent is “contact-share implemented twice.” The rule names a predicate and forbids money-ask after share. It does not name the writing module, the table, or the port other modules must call. Contact-share is absent from the entity table and the capability map.
- **Divergence it fails to prevent:** chat, invites, profiles, and trust can each store “shared contacts” and unlock phone/WhatsApp/links.
- **Autofix:** Add `contact_share` (or equivalent) to AD-3 under one owner (likely `chat` or `invites`). Add a map row. State that phone / WhatsApp / profile links are readable only through that owner’s port after the predicate is true.

#### H3 — AD-3 names `Case` as a dual-write hazard, then never assigns it

- **Checklist:** AD enforceability; missed feature divergence
- **Suggest:** **autofix**
- **Where:** AD-3 prevent list (`Case`); entity table (`moderation_job`, `hold_queue` vs `report`…); ER `MODERATION_CASE`
- **Gap:** The prevent list includes `Case`. The owner table has no `case` / `moderation_case`. The ER invents `MODERATION_CASE` opened by `REPORT`. Trust and moderation can both create a “case.”
- **Divergence it fails to prevent:** two writers of the same case/report-work item — the exact AD-3 failure mode.
- **Autofix:** Either add `moderation_case` to one owner (moderation **or** trust) and drop the extra ER name, or delete `Case` from the prevent list and state that `report` (trust) + `moderation_job`/`hold_queue` (moderation) are the only work items, linked by FK + port.

#### H4 — Web/PWA runtime and region are not an initiative decision

- **Checklist:** ops/env envelope; missed feature divergence; AD-5 enforceability
- **Suggest:** **discuss**
- **Where:** Design Paradigm (`apps/web`); AD-4 “web bundle”; AD-5 Scaleway `fr-par`; Structural Seed flowchart (clients sit *outside* `fr_par`)
- **Gap:** AD-7 puts httpOnly session cookies on web/PWA. AD-4 says screens ship from Next.js App Router. The only deployables inside `fr-par` are API, workers, PG, Redis, object storage. No decision among: static export + CDN in-region; Next SSR on Kapsule; Vercel/Netlify (USA — the Farata default AD-5 exists to block). Capacitor “wrapping that web bundle” hints at static export but does not lock it.
- **Divergence:** one unit SSRs on Vercel, another static-exports to Scaleway Object Storage, a third treats `apps/web` as a BFF that imports domain modules.
- **Discuss:** Pick one: (a) static/PWA export served from in-region object storage/CDN, clients are not a second invariant owner (matches AD-1/AD-5); or (b) Next SSR as a third process role in `fr-par` with no domain imports. Record Vercel as rejected for the same reason as USA data hosts.

#### H5 — Initiative ops envelope is only half-decided

- **Checklist:** ops/env envelope; Deferred completeness
- **Suggest:** **discuss** (split: some autofix, some defer)
- **Where:** AD-6, AD-20, Structural Seed `infra/`, Deferred vendor SKUs
- **Decided:** K8s (Kapsule), PG, Redis/Valkey-compatible, S3-compatible, isolated `dev|staging|prod`, CI kinds, staging-auto / prod-manual, PITR + object versioning + quarterly restore, 10k MAU / 2 API replicas.
- **Neither decided, deferred, nor an open question:**
  - Secrets product (Scaleway Secret Manager vs Vault vs raw K8s Secrets) — AD-6 says “a secrets manager”
  - Observability product / standard (Scaleway Cockpit vs OTel+Grafana vs Datadog)
  - IaC tool (`Terraform/OpenTofu` is an OR in the seed)
  - CI host (GitHub Actions vs GitLab vs Scaleway)
  - Ingress / DNS / ACME
  - Push vendor (FCM is a *reason* for Capacitor in AD-4; not a port, not in the deferred SKU list)
  - Migration runner (Drizzle migrate-on-boot vs CI job vs operator)
  - Feature-flag store (conventions list flags; AD-20/operator_config do not say where boolean flags live)
  - Monorepo workspace tool (pnpm / npm / Turborepo / Nx)
- **Divergence:** two feature spines will pick different agents, secret backends, and IaC dialects. Notifications vs `apps/android` can bind FCM and OneSignal in parallel.
- **Discuss:** For each bullet, either name the product, add it to Deferred with a single chooser (e.g. “operator picks the first SMS/push adapter before any feature lands one”), or list it under Open questions.

### MEDIUM

#### M1 — AD-7 “WebSocket” vs AD-15 Socket.IO

- **Suggest:** **autofix**
- AD-7: WebSocket `/v1/realtime`. AD-15: Socket.IO with Redis adapter on the same path. Socket.IO is not a raw WebSocket. A chat spine can implement native WS and break the Capacitor/PWA client another spine built for Socket.IO.
- Autofix: AD-7 should say “realtime transport is Socket.IO on `/v1/realtime` (AD-15); long-poll fallback required.”

#### M2 — AD-10 does not name the write port onto `message` / `photo_asset`

- **Suggest:** **autofix**
- Chat owns `message`; media owns `photo_asset`; moderation owns `moderation_job`. AD-10 says items become `delivered|held|blocked` after the pipeline, but not that moderation may write those rows only via `ChatPort` / `MediaPort`. Workers will UPDATE `message.state` directly and violate AD-3.
- Autofix: “Moderation writes `moderation_job` only; chat/media apply `pending→delivered|held|blocked` through their own commands.”

#### M3 — AD-2 “report” path vs `trust` module

- **Suggest:** **autofix**
- AD-2 lists `report` among billing-isolated paths. There is no `report` module; reports live in `trust`. A feature spine will add `modules/report`.
- Autofix: say `trust` (report/block/sanction paths).

#### M4 — Deferred vendor SKUs have no single chooser

- **Suggest:** **autofix**
- “Ports only; first adapter chosen at implementation” lets identity (OTP) and notifications (Invite/Mahram SMS) land two SMS adapters. Same risk for moderation text vs media.
- Autofix: “One adapter per port at a time; the first landing feature may not add a second vendor. Extra methods stay behind the `extra payment methods` / vendor flags.” Add **push** to this list.

#### M5 — AD-22 does not enumerate the 11 open questions

- **Suggest:** **discuss**
- The rule says “see SOLUTION-DESIGN.md.” A feature team with only the spine can still bake a closed enum. Either list Q1–Q11 ids + “config/flag/disabled port” or state that SOLUTION-DESIGN §X is part of this spine’s enforceability surface.

#### M6 — AD-16 mapped only to discovery

- **Suggest:** **autofix**
- Lite payloads, derivatives, SMS fallback, and disabled `UssdPort` bind clients, media, chat, notifications, invites — not discovery alone. Map should list those modules or a `clients` row.

#### M7 — `fingerprint` owned, policy not decided

- **Suggest:** **defer**
- AD-3 gives `trust` `fingerprint`. No rule on what is stored, consent, retention, or sharing with `identity` sessions. Two units can invent device-id schemes.
- Defer with a one-liner: “device fingerprint is trust-owned, purpose-limited to multi-account/ban evasion, schema left to the trust feature spine; identity stores only `session`.”

#### M8 — Redis vs Valkey can still split the lockfile

- **Suggest:** **defer**
- Protocol-compatible, so runtime divergence is weak. `redis` vs `iovalkey` clients can still fork. Prefer: “ship Redis 8 protocol client; swap image if counsel rejects the license. Do not add a second client package.”

#### M9 — Rate-limit numbers and limiter home unset

- **Suggest:** **defer**
- AD-17 requires limits on auth, OTP, Invite, Report, payment but not where (ingress vs Redis vs Nest throttler) or the numbers. Feature spines will double-implement.
- Defer: “identity owns auth/OTP limiter; other commands use `packages/kernel` rate-limit port backed by Redis. Numeric ceilings live in `operator_config`.”

#### M10 — `packages/ports` vs module ports

- **Suggest:** **autofix**
- Paradigm: ports live with modules. Seed: `packages/ports` for shared types. Cross-module ports can be declared twice.
- Autofix: `packages/ports` holds only shared *shapes* (`BillingPort`, `ModerationPort`, …); modules do not re-declare them.

### LOW

#### L1 — AD-2 mermaid (`pay -.-> app`)

- **Suggest:** **ignore** (or cosmetic autofix)
- Arrow direction fights AD-2. Does not change the rule.

#### L2 — AES-256-class / TLS 1.2+

- **Suggest:** **defer**
- Class-level crypto is enough at initiative altitude if KMS/disk vs app-level is deferred to the security feature spine.

#### L3 — `completeness` as an AD-3 “entity”

- **Suggest:** **ignore**
- Likely a projection. Does not cause dual-write if profiles remain the only writer.

#### L4 — e2e runner unnamed

- **Suggest:** **defer**
- AD-20 already locks unit/integration/migration. Playwright vs Cypress can wait.

#### L5 — Node 24 Active LTS window is short

- **Suggest:** **ignore**
- 24.21.0 is correct Active LTS on 2026-09-27. Maintenance starts 2026-10-20; Node 26 becomes Active LTS 2026-10-28. Not a spine defect. Optional: note the October flip so the pin is revisited.

---

## Version check (named tech)

Claim: “Verified 2026-09-27 against npm registry, endoflife.date APIs, vendor docs, and official Whisper sources.” Independent check the same day:

| Name | Spine | Check | Status |
| --- | --- | --- | --- |
| Node.js Active LTS | 24.21.0 | Node 24.21.0 (Krypton) released 2026-09-07/08; Active LTS until 2026-10-20 | current |
| TypeScript | 7.0.2 | `npm view typescript version` → 7.0.2 | current |
| Next.js | 16.3.6 | npm → 16.3.6 | current |
| React | 19.3.0 | npm → 19.3.0 | current |
| NestJS `@nestjs/core` | 12.1.0 | npm → 12.1.0 | current |
| Capacitor `@capacitor/core` | 8.5.2 | npm → 8.5.2 | current |
| Drizzle ORM | 0.45.3 | npm → 0.45.3 | current |
| PostgreSQL | 18.6 | postgresql.org latest 18.x = 18.6 (2026-08-13) | current |
| Redis | 8.10.2 | endoflife.date / vendor images: 8.10.2 (2026-09-17/18) | current |
| BullMQ | 6.3.9 | npm → 6.3.9 | current |
| Socket.IO | 4.8.4 | npm → 4.8.4 | current |
| Tailwind CSS | 4.3.3 | npm → 4.3.3 | current |
| Scaleway `fr-par` Kapsule + managed PG/Redis/Object Storage | product names | not a version pin; consistent with AD-5/AD-6 | n/a |

No “asserted-looking” pins. Do not treat the stack table as a finding.

Whisper `LANGUAGES` lacking `mos`/`dyu` (AD-11) is a factual constraint, not a version pin. Not re-litigated here.

---

## Greenfield

No existing production schema, vendor contract, or deployable is ratified. Rejected hosts (Virtix, Lagos colo, `af-south-1`, Johannesburg, USA Vercel/Neon) are alternatives, not brownfield. Coherent.

---

## Capability map vs bound surface

Bound modules: identity, verification, profiles, discovery, invites, chat, media, moderation, mahram, trust, outcomes, billing, content, operator, notifications, audit. Each has a map row and an AD-3 owner set.

Visible holes **without** reading the PRD:

- Contact-share (AD-17) — no row, no owner (H2).
- Device fingerprint — owned in AD-3, no map row, no AD (M7).
- Lite / SMS / USSD / FLAG_SECURE — AD-16 and AD-4; map hangs AD-16 on discovery only (M6).
- Clients / PWA / Play shell — AD-4; not a module, and no “clients” map row for hosting (H4).
- FR citations in ADs (FR-001–008, 010, 014–015, 019–020, 038, 050–061, 062–079, 083–093, 104–114, 119–120, 132–136, 138–143, NFR-001–009) are pointed at by ADs; spine-only review cannot prove the PRD has no extra capability (e.g. email, matching rank, analytics).

---

## Deferred that can still fork units

| Deferred item | Safe? | Why |
| --- | --- | --- |
| Native iOS + Apple Sign-In | yes | Same Capacitor project; flag `ios_apple_signin` |
| USSD enabled | yes | Port exists, flag off |
| KYC / SMS / moderation / aggregator SKUs | **no** | No single chooser (M4) |
| Push vendor | **no** | Not listed (H5) |
| Redis vs Valkey | weak | Protocol-safe; client package can still fork (M8) |
| Dual-control unblur | yes | MVP = audited single-control |
| Watermark / no-download polish | yes | MVP revoke + blur + FLAG_SECURE |
| Multi-region / in-country move | yes | Substrate portable; not launched |
| Product name / domains | yes | Branding tokens |
| XOF prices / free-review hours | yes | `operator_config` |
| Live 1:1 A/V | yes | LATER |
| Full EN/AR UI | yes | LATER |

---

## Suggested resolution order

1. **Autofix H1, H2, H3, M1, M2, M3, M6, M10** — wording + owner table + map. No product debate.
2. **Discuss H4, H5, M5** — Next runtime/region; name or defer each ops product; whether AD-22 must inline Q1–Q11.
3. **Defer M4 (with chooser), M7, M8, M9, L2, L4** — one sentence each so two units cannot pick differently.
4. **Ignore L1, L3, L5.**

Do not expand the spine into a solution design. Companion `SOLUTION-DESIGN.md` can hold SKU evals once the spine names the *decision* or the *chooser*.

---

## Verdict rationale

**REVISE**, not fail: the initiative paradigm, safety invariants, region, and stack are usable. **REVISE**, not pass: a good spine’s job is to lock every seam the next altitude would otherwise invent. AD-1 and AD-17 do not lock the seams they advertise; Case is an orphan; the web runtime and half the ops envelope are blank. Feature spines started from this draft will diverge on workers, contact-share, cases, Next hosting, and vendors.
