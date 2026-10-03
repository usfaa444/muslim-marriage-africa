# Rubric-walker review — Architecture Spine (correction of record)

- **Artifact:** `ARCHITECTURE-SPINE.md`
- **Companion (context only, not judged):** `SOLUTION-DESIGN.md`
- **Driving PRD (binding, 2026-10-01):** `prds/prd-muslim-marriage-africa-2026-09-27/prd.md`
- **Altitude:** initiative / build-substrate
- **Reviewed:** 2026-10-01

> **Annotation 2026-10-01 (final spine).** AD-12 no longer names Chat `pending`/`held` or a staff hold queue. Findings in this file that say it does were written against a mid-edit spine and are stale. The final AD-10 rule forbids a pre-delivery Chat hold.

> **Name lock 2026-10-03 (Maitchibi Fayçal via Harris).** Product name is **AnKanu**. Domain **ankanu.com** purchased on Hostinger. Repository slug `muslim-marriage-africa` is not the product name. Sentences below that treat the name as TBD, undecided, or a live shortlist (Nisfuddin, Nikahsira, Sakinaa, Mithaqun, Nonglem, `nisfdin`) are historical of this review date. Those names were not chosen and those domains were not purchased. OAPI/WIPO for AnKanu is not recorded as completed.
- **Reviewer:** rubric-walker (independent; spine only; lint already 0 findings)
- **Verdict:** **pass-with-findings**

This run is a correction of record: Chat AI moderation is **passive** (persist `delivered` immediately, background scan, flag-for-admin). Profile Photo/bio stay publish-gated (FR-065). Locked items are **not** holes: A1–A3, product name TBD, AD-5 Scaleway `fr-par` legal review, stack pins, Capacitor, AD-9 blur, AD-12 mahram (read delivered only; cannot send as Sister). OQ-2 is resolved 2026-10-01. Questions 1 and 3–11 plus NFR-008 stay open.

The spine does **not** instruct a pre-delivery Chat scan or a fail-closed send hold. AD-10 / AD-11 / AD-15 / AD-16 / AD-22 are the load-bearing locks and they hold. Residual `pending`/`held` nouns in AD-12, an ambiguous AI-case writer, and AD-7 vs AD-15 transport wording can still let two feature units diverge.

---

## Checklist

| Gate | Result | Notes |
| --- | --- | --- |
| Fixes real feature-level divergence points; misses none | **PASS WITH CAVEAT** | Paradigm, same-image `api`+`worker`, entity owners (including `contact_share` / `moderation_case` / `flag_queue`), in-region `web`, blur, passive Chat vs publish-gate, mahram cannot-send, billing isolation, contact-share send reject, ops envelope (OpenTofu, GHA, Secret Manager, OTel, Drizzle Kit) are locked. Residual: AD-12 hold nouns; who INSERTs an AI-originated `moderation_case`; Message Flash mahram read before `conversation` exists. |
| Every AD Rule is enforceable and prevents its stated divergence | **PASS WITH CAVEAT** | AD-10’s Prevents/Rule actually block a pre-delivery Chat machine and a Profile-gate leak into Chat. AD-12’s locked mahram rules are enforceable; the parenthetical `pending`/`held` / “staff queue” does not prevent a second Chat state machine — it names one. AD-10 “case opened by the passive flag” fights AD-3 (trust-only case writer) and FR-144. AD-7 “WebSocket” vs AD-15 Socket.IO. |
| Nothing under Deferred could let two units diverge | **PASS** | iOS = same Capacitor project; USSD flag off; one live adapter per port; Redis/Valkey and PG 18 stay on host pins; unblur/watermark/multi-region/name/prices/A-V/EN-AR are scoped. Redis client package is weak leftover, not a fork. |
| Named tech is verified-current | **PASS WITH LOW** | Stack is **LOCKED** this run. Pins were current 2026-09-27. Live `next` is 16.3.8 vs table 16.3.6; the spine’s own “do not scaffold below 16.3.7 after 2026-09-30” is internally stale. Flag only — do not demand stack edits. |
| Greenfield is coherent (no brownfield to ratify) | **PASS** | No legacy runtime or schema. Farata is evidence, not substrate. |
| Covers PRD capability surface, especially FR-062–068, FR-144, NFR-003 | **PASS WITH CAVEAT** | Chat send-first, no unsend, scan-deferred not hold, flag-for-admin not auto-sanction, Contact-share as deterministic send reject, money-ask delivered+flagged, Profile publish-gate split, 24h flag-queue SLA, Q2 closed / Q1+3–11+NFR-008 open — all present. Caveat: FR-048 Flash is mahram-visible before accept; AD-12 scopes read-all to `conversation`(s) only. |
| Must not tell a builder to scan Chat before delivery or fail-closed hold a Chat message | **PASS WITH CAVEAT** | AD-10/11/15/16/22 forbid it. AD-12 still says Mahram does not see `pending` or `held` because “those stay on the staff queue.” That is leftover fail-closed vocabulary, not a second scan-before-send rule. |
| Every initiative dimension decided, deferred, or an open question — especially ops/env envelope | **PASS** | Region, Kapsule `web`+`api`+`worker`, secrets, OTel, IaC, CI host, PITR, launch scale, migration runner, FCM/Web Push: decided. Remaining silences (monorepo workspace tool, e2e runner, ingress SKU) are not feature-fork risks once `infra/` is shared. |

---

## What the spine gets right (correction of record)

- **AD-10 is the Chat lock.** Persist `delivered` immediately; recipient sees without AI; background `ModerationPort` after persist; outcomes `flag-for-admin` or clean; later flag does not unsend; AI does not block, hold, refuse, or auto-suspend; 5xx/timeout/malformed/low-confidence → `scan-deferred` / `scan-failed` on `flag_queue`, not `held`; no Chat `pending→delivered` machine; no `hold_queue`; clocks `>10s / >30s → hold` deleted; moderation never writes `message.state`.
- **FR-065 stays a publish-gate**, not a Chat hold. Separate `pending → live | blocked` diagram is labeled `profile_photo_or_bio`. `ProfilePort.applyModeration` / `MediaPort.applyModeration` apply only there. Discovery omits unpublished profile photos. Blur stays AD-9 (privacy).
- **FR-068 is not AI-hold.** Contact-share is the send-time predicate (`CONTACT_SHARE_REQUIRED` to the sender). Money-ask language is delivered and flagged (AD-17). Image phone/QR may flag **after** delivery.
- **NFR-003** is send-first: no AI wait, scan-deferred counted not hidden (AD-20), human flag-queue SLA = Report 24h clock starting at queue entry, paid-faster-review cannot skip the background scan (AD-10, AD-21).
- **FR-144** admin-chosen warning / suspend / other; AI never sanctions.
- **AD-11** Mooré/Dioula → flag or `scan-deferred`, not a Voice-note hold.
- **AD-15** emits `message.delivered` only; no `message.pending` / `message.held` delivery event.
- **AD-16** Chat media waits for **connection**, not AI.
- **AD-22** Q2 resolved 2026-10-01 (no hold-timeout UX). Questions 1 and 3–11 plus NFR-008 clocks stay open; first-wife path stays unbuilt (AD-26).
- **Locked, not holes:** A1 19+ on AD-8; A2 / AD-12 Sister-initiated, read delivered only, cannot send as Sister; A3 + AD-5 `fr-par` + CIL + legal-review tag; product name TBD; Capacitor Android; AD-9 server-side blur + gateway + 60s TTL.

Prior 2026-09-27 rubric holes that are **closed** on this spine and are not re-opened: AD-1 same-image `api`+`worker`; AD-3 `moderation_case` + `contact_share` owners; AD-4 in-region `web`; AD-17 contact-share writer; AD-20 secrets/OTel/OpenTofu/GHA/Drizzle; Deferred one-adapter-per-port chooser.

---

## Findings

### CRITICAL

None.

### HIGH

#### H1 — AD-12 still names Chat `pending` / `held` on a staff queue

- **Checklist:** must-not-hold; AD enforceability; missed feature divergence
- **Suggest:** **autofix** (wording only — do **not** reopen locked mahram rules)
- **Where:** AD-12 Rule (“not `pending` or `held` (those stay on the staff queue)”)
- **Gap:** The locked AD-12 constraints stand: Mahram reads **delivered** only; cannot compose or send as the Sister; cannot browse or Invite. Those are not holes. The parenthetical is leftover fail-closed vocabulary. AD-10 deletes the Chat `pending→delivered` machine and `hold_queue`. AD-15 deletes `message.pending` / `message.held` events. A mahram or chat feature spine that treats AD-12 as source of truth will keep `pending`/`held` columns and a staff queue for “undelivered” Chat so Mahram can be excluded from them.
- **Divergence it fails to prevent:** a second Chat state machine — the exact divergence AD-10 claims to block. It does **not** tell a builder to scan before send; it tells them held Chat still exists.
- **Autofix:** Drop `pending`/`held`/staff-queue. Keep: Mahram reads already-`delivered` messages (and Flash — see M3) on attached conversations; a later flag does not hide them; cannot send as Sister.

### MEDIUM

#### M1 — AD-10 “AI-originated case opened by the passive flag” vs AD-3 / FR-144

- **Checklist:** AD enforceability; PRD FR-144 coverage
- **Suggest:** **autofix**
- **Where:** AD-10 last sentences; AD-3 (`flag_queue` = moderation, `moderation_case` = trust); PRD FR-144 AC and §14.1
- **Gap:** AD-3 allows only trust to write `moderation_case`. AD-10 says Member Reports open a `moderation_case` written only by trust, then “an AI-originated case is opened by the passive flag.” PRD §14.1 / FR-144: the trigger is the **passive flag plus an admin action**; the admin action *may* open or continue a Report → Strike → Ban case. The AI never writes a sanction.
- **Divergence:** Moderation INSERTs `moderation_case` on every flag (violates AD-3), or Trust auto-opens a case per `flag_queue` row, or neither does until admin act — three lawful readings, two workbenches, two SLA clocks.
- **Autofix:** Passive flag writes `flag_queue` only (moderation). Trust writes `moderation_case` only when a Member Report arrives **or** when an admin action on a flag opens/continues a case (FR-144). Sanction is the admin action, never the flag.

#### M2 — AD-7 “WebSocket `/v1/realtime`” vs AD-15 Socket.IO

- **Checklist:** AD enforceability; missed feature divergence
- **Suggest:** **autofix**
- **Where:** AD-7 Rule; AD-15 Rule
- **Gap:** AD-7’s stated Prevents (error shape, versioning, double-charge) are enforced. The extra “WebSocket `/v1/realtime`” line is not Socket.IO. A chat spine can ship native WS; a Capacitor/PWA spine can ship Socket.IO + Redis adapter + long-poll on the same path.
- **Autofix:** AD-7: realtime transport is Socket.IO on `/v1/realtime` (AD-15); long-poll fallback required. Do not say raw WebSocket.

#### M3 — Message Flash mahram read before `conversation` exists (FR-046 / FR-048)

- **Checklist:** PRD capability coverage; missed feature divergence
- **Suggest:** **autofix**
- **Where:** AD-3 (`message_flash` → invites); AD-10 (Flash persisted `delivered`); AD-12 (read-all on attached **conversation(s) only**); AD-23 (only `ChatPort.openFromInvite` inserts `conversation`)
- **Gap:** This is not a challenge to locked AD-12 (read delivered only; cannot send as Sister). Flash is already `delivered` (AD-10, FR-046). FR-048 requires an already-attached Mahram to read Flash from minute one, **before** Sister accept, so before AD-23 allows a conversation. No port says invites must expose delivered Flash to mahram.
- **Divergence:** Invites shows Flash only on the invite card; mahram dashboards subscribe only to `conversation` messages; chat refuses to exist pre-accept. Flash is invisible to Mahram or is stuffed into a premature conversation.
- **Autofix:** One line on AD-23 or AD-12: Mahram read of delivered `message_flash` goes through `InvitesPort` until `ChatPort.openFromInvite`; do not insert a conversation to satisfy FR-048.

### LOW

#### L1 — Next.js pin stale vs the spine’s own floor (stack LOCKED — no edit demanded)

- **Checklist:** named tech verified-current
- **Suggest:** **ignore** this run (record only)
- **Where:** Stack table `16.3.6`; note “do not scaffold below 16.3.7 after 2026-09-30”
- **Gap:** Independent check 2026-10-01: `registry.npmjs.org/next/latest` → **16.3.8**. TypeScript 7.0.2 still matches. Table vs note already disagreed after 2026-09-30. Stack is locked; do not demand a pin bump.

#### L2 — AD-16 hung on discovery only in the capability map

- **Suggest:** **autofix** (map row)
- Lite / derivatives / SMS / FCM bind `apps/web`, `apps/android`, media, chat, notifications, invites — not discovery alone.

#### L3 — `packages/ports` vs module ports

- **Suggest:** **autofix** or **defer**
- Paradigm: ports live with modules. Seed: `packages/ports`. Cross-module ports can be declared twice. One line: shared *shapes* only; modules do not re-declare.

#### L4 — Monorepo workspace tool unnamed

- **Suggest:** **defer**
- oxlint / ESM / Vitest are locked. pnpm vs npm vs Nx is silent. Weak once the template exists; name it or defer “template owns the workspace tool; features do not add a second one.”

---

## Version check (named tech) — stack LOCKED

Claim: verified 2026-09-27. This walker re-checked only what can go stale; **do not treat the stack table as a required edit.**

| Name | Spine | Check 2026-10-01 | Status |
| --- | --- | --- | --- |
| Node.js Active LTS | 24.21.0 | Still the pinned Active LTS line; revisit 24-maintenance vs 26-LTS if first prod cut is after 2026-10-28 (spine already says this) | current-enough |
| TypeScript | 7.0.2 | npm latest 7.0.2 | current |
| Next.js | 16.3.6 | npm latest **16.3.8**; spine note already required ≥16.3.7 after 2026-09-30 | **stale pin (L1)** |
| React | 19.3.0 | not re-pulled; 2026-09-27 match | locked |
| NestJS / Capacitor / Drizzle / BullMQ / Socket.IO / Tailwind | as table | not re-pulled; 2026-09-27 match | locked |
| PostgreSQL (Scaleway managed) | 17.11 | host pin, not upstream 18 — Deferred already | locked |
| Redis (Scaleway managed) | 8.6.3 | host pin, not upstream 8.10 — Deferred already | locked |
| Scaleway `fr-par` | product | AD-5 assumption / legal review — **not a hole** | n/a |

Whisper `LANGUAGES` lacking `mos`/`dyu` (AD-11) is a factual constraint, not a version pin.

---

## Greenfield

No existing production schema, vendor contract, or deployable is ratified. Rejected hosts remain alternatives, not brownfield. Coherent.

---

## Capability map vs FR-062–068, FR-144, NFR-003

| Requirement | Spine lock | Hole? |
| --- | --- | --- |
| FR-062 text delivered then scanned | AD-10 persist `delivered`; no unsend | no |
| FR-063 Chat Photo delivered; blur is privacy | AD-10 + AD-9; image flag after delivery | no |
| FR-064 Voice delivered; mos/dyu not a hold | AD-10 + AD-11 | no |
| FR-065 Profile Photo/bio publish-gate | AD-10 apply path + state diagram | no |
| FR-066 flag-for-admin only; no hold/block/blur-and-warn as delivery | AD-10 outcomes + admin FR-144 | no |
| FR-067 scan-deferred; not fail-closed | AD-10, AD-20 metrics, AD-18 audit | no |
| FR-068 Contact-share block vs money-ask delivered | AD-10, AD-15, AD-17 | no |
| FR-144 admin flag queue; AI does not sanction | AD-10 `flag_queue`; caveat M1 on *case* insert | caveat |
| NFR-003 send-first; no send-blocking latency | AD-10, AD-22 Q2 resolved | no |
| FR-046/048 Flash delivered; Mahram reads pre-accept | AD-10 delivers Flash; AD-12 conversation-only (M3) | **yes (M3)** |
| OQ-2 resolved; Q1, Q3–11, NFR-008 open | AD-22, AD-19 clocks `[ASSUMPTION]` | no |

Do **not** treat as holes: A1 19+, A2 mahram path, A3/AD-5 legal review, name TBD, Capacitor, AD-9 blur, AD-12 cannot-send / read-delivered-only.

---

## Deferred that can still fork units

| Deferred item | Safe? | Why |
| --- | --- | --- |
| Native iOS + Apple Sign-In | yes | Same Capacitor project; flag `ios_apple_signin` |
| USSD enabled | yes | Port exists, flag off |
| KYC / SMS / moderation / aggregator SKUs | yes | One live adapter per port; OTP + notifications share `SmsPort` |
| Redis vs Valkey | yes (weak) | Stay on managed 8.6.3; protocol-compatible |
| Scaleway PG 18 | yes | Stay on 17.11 until host lists 18 |
| Dual-control unblur | yes | MVP = audited single-control |
| Watermark / no-download polish | yes | MVP revoke + blur + FLAG_SECURE |
| Multi-region / in-country move | yes | Substrate portable; not launched |
| Product name / domains | yes | Branding tokens — **locked TBD, not a hole** |
| XOF prices / free-review hours | yes | `operator_config` |
| Live 1:1 A/V | yes | LATER |
| Full EN/AR UI | yes | LATER |

---

## Suggested resolution order

1. **Autofix H1** — strip AD-12 `pending`/`held`/staff-queue; keep locked mahram rules.
2. **Autofix M1, M2, M3** — case writer = trust on report or admin action; AD-7 cites Socket.IO; Flash mahram via `InvitesPort`.
3. **Ignore L1** this run (stack locked).
4. **Autofix or defer L2–L4** if touching the file anyway.

Do not expand the spine into a solution design. Do not re-open A1–A3, AD-5 legal review, Capacitor, AD-9, AD-12 cannot-send, or stack pins.

---

## Verdict rationale

**pass-with-findings**, not revise: the correction of record landed. A builder who obeys AD-10/11/15/16/22 will deliver Chat immediately, scan in the background, flag for admin, and keep Profile Photo/bio publish-gated. OQ-2 is closed; Q1 and 3–11 and NFR-008 stay open. Locked items are not treated as gaps.

**pass-with-findings**, not pass: AD-12 still talks like Chat `held` lives on a staff queue; AD-10’s “case opened by the passive flag” does not pick a single writer; AD-7 can still fork the realtime transport; Flash mahram-read before conversation is unbound. Those are real feature-altitude forks. None of them re-instruct a pre-delivery scan.
