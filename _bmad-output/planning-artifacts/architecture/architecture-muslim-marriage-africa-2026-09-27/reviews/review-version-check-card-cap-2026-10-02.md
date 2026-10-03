# Version-check / reality-check (card-cap finalize, 2026-10-02)

**Verdict:** pass-with-findings  
**Date:** 2026-10-02  
**Artifact:** `ARCHITECTURE-SPINE.md` (updated 2026-10-02; status `final`)  
**Companion (context only):** `SOLUTION-DESIGN.md`  
**Lens:** every committed stack / hosting / ASR / vendor-port decision must be live-web-verified or checked against the existing project/starter — not asserted from training data or from `.memlog.md`.  
**Constraint this run:** stack pins are **LOCKED**. Do not recommend changing Node / Next / Nest / Capacitor / Drizzle / PG / Redis / BullMQ / Socket.IO / Tailwind. Stale pins are flagged low/medium only. **AD-28 and AD-29 add no new vendor tech.** Confirm Whisper still has no `mos`/`dyu` if checked. Record stack drift only.

**Method (this review, independent):** `registry.npmjs.org/{pkg}` `dist-tags` + publish times (fetched 2026-10-02); `endoflife.date/api/{nodejs,postgresql,redis,nextjs}.json`; official Next.js *September 2026 Security Release* (nextjs.org/blog/september-2026-security-release, fetched 2026-10-02); Scaleway Managed PostgreSQL / Managed Redis product pages + feature-request “Postgres 18”; official Whisper `whisper/tokenizer.py` on GitHub `main` (raw fetch 2026-10-02); Hugging Face `transformers` `tokenization_whisper.py` on `main`; Nest CLI issues #3477 / #3479 and `@nestjs/cli` npm `latest`; TypeScript 7.1 iteration plan (#63703). Memlog was read for claimed sources only; it was not treated as evidence. There is **no** `package.json` / starter in this repo to ratify against — still greenfield.

---

## 2026-10-02 card-cap delta — AD-28 / AD-29 add no new vendor tech

This update added **AD-28** (one focused card, grid optional) and **AD-29** (Free-tier daily message cap) and amended AD-2 / AD-8 / AD-14 / AD-17 / AD-18 / AD-21 / AD-23 / `operator_config` / error codes / capability-map cites. Those are product invariants on already-named ports, entities, and config:

| Named thing in the 2026-10-02 card-cap text | Already on the spine before this update? | New library / vendor / unpinned SKU? |
| --- | --- | --- |
| Discovery default = one profile; view toggle `card` \| `grid` | AD-16 lite payload; discovery already owned browse | No — UI convention only |
| Shared traits from existing Profile fields only; “no new profile columns” | AD-3 `profile` / `profile_field` | No |
| Pass = per-viewer dismiss, not a like / public counter | Feature flags already keep `online_now` / boosts off | No |
| Invite + card quick-message = existing invite/chat commands | AD-23 / AD-27 | No |
| `operator_config.daily_message_cap` (seed **10** `[ASSUMPTION]`) | `operator_config` key table already existed | No — new **required key** of an existing entity |
| `message_quota` writer = chat | AD-3 / AD-23 command ownership | No — new entity, same module, no vendor |
| Chat / Flash / card quick-message may call `BillingPort.isEntitled` **only** for FR-146 | AD-21 already owned `isEntitled` | No — exception narrowed, not a new adapter |
| `MESSAGE_CAP_EXCEEDED` | AD-7 envelope | No — new machine `code` |
| `Africa/Ouagadougou` civil-day reset for message count | AD-23 already bound that tz for Invite quotas | No (IANA tz) |
| AD-18 event on `daily_message_cap` change | AD-18 already audits operator threshold/price/`sister_reach_mode` | No |
| Sister checkout in **both** `sister_reach_mode` values | AD-14 packs; AD-27 mode enum | No — catalog rule, not a new payment SKU |
| Premium = unlimited Invites **and** unlimited messages; no Premium Invite cap of 15 | AD-14 / AD-27 packs | No |

No new framework, queue, host SKU, ASR model, payment aggregator, card-UI library, swipe SDK, or CLI was named. No pin was added or removed. Stack table is unchanged from the locked 2026-09-27 / host-corrected pins. **AD-28 is a browse-layout invariant. AD-29 is an operator-config + quota invariant. Neither is a tech decision.**

---

## Stack table — independent live pins (2026-10-02)

Verified line in the spine still says “Verified 2026-09-27 against npm registry, endoflife.date APIs, vendor docs, and official Whisper sources.” Live registry/EOL/vendor today:

| Spine pin | Live source (2026-10-02) | Match? |
| --- | --- | --- |
| Node.js 24.21.0 Active LTS | endoflife.date/api/nodejs.json: cycle 24 `latest=24.21.0`, LTS since 2025-10-28, `support=2026-10-20`, EOL 2028-04-30. Cycle 26 is Current (`latest=26.10.0`); LTS start 2026-10-28 | Yes. Window is 18 days — Finding 4 |
| TypeScript 7.0.2 | registry.npmjs.org/typescript `latest` → `7.0.2` (2026-07-08T15:55Z). `next` = `7.1.0-dev.20261002.1` (dev only). 7.1 RC planned 2026-10-20; stable planned 2026-11-10 (#63703) | Version exists. Nest CLI still cannot consume it — Finding 2 |
| Next.js 16.3.6 | registry `latest` → **16.3.8** (2026-09-30T16:07Z). 16.3.6 published 2026-09-22; 16.3.7 published 2026-09-29 (bug-fix only). endoflife.date/api/nextjs.json cycle 16 `latest=16.3.8`. Official post: patch **16.3.8**. Canary is `16.4.0-canary.58` (not a pin) | **Table stale — Finding 1** |
| React 19.3.0 | registry.npmjs.org/react `latest` → `19.3.0` (2026-09-09T17:21Z) | Yes |
| NestJS (`@nestjs/core`) 12.1.0 | registry `latest` → **12.1.2** (2026-09-30T09:06Z). 12.1.1 published 2026-09-28. `@nestjs/cli` `latest` → 12.0.8 (2026-09-28) | Patch drift — Finding 3 |
| Capacitor (`@capacitor/core`) 8.5.2 | registry `latest` → `8.5.2` (2026-09-11T15:05Z). `next` = `9.0.0-alpha.7`. Nightly `8.5.3-nightly-20261002` is not stable | Yes — 9.x correctly avoided |
| Drizzle ORM 0.45.3 | registry `latest` → `0.45.3` (2026-09-21T10:06Z). `drizzle-kit` latest `0.31.11` (same day) — kit is unpinned on the spine, not a new vendor | Yes |
| Prisma rejected as RC | registry `latest` → `8.0.0-rc.19` (2026-09-29) | Yes — reject is still correct |
| PostgreSQL (Scaleway managed) 17.11 | endoflife.date cycle 17 `latest=17.11`. Scaleway product page: engines **14, 15, 16, 17**. Feature request “Postgres 18”: still **Planned Q4 2026**. Upstream 18.6 exists and is not the host pin | Yes — host pin, not upstream-latest |
| Redis (Scaleway managed) 8.6.3 | Scaleway Managed Redis product page: **Version 8.6.3**. endoflife.date cycle 8.6 `latest=8.6.7`; cycle 8.10 `latest=8.10.2` | Yes — host pin. Upstream 8.6.7 is a host lag, already deferred |
| BullMQ 6.3.9 | registry `latest` → **6.3.11** (2026-10-01T01:58Z). 6.3.10 published 2026-09-29. No newer publish on 2026-10-02 | Patch drift — Finding 3 |
| Socket.IO 4.8.4 | registry `latest` → `4.8.4` (2026-09-25T08:51Z) | Yes |
| Tailwind CSS 4.3.3 | registry `latest` → `4.3.3` (2026-07-16T12:03Z) | Yes |
| Hosting (primary) Scaleway `fr-par` | Kapsule, managed PG, managed Redis, Object Storage, Secret Manager still listed for Paris. Managed PG/Redis also listed Available in Paris on the regional availability page | Yes |

Named technologies still exist and still fit the job: Next.js App Router PWA, Capacitor Android WebView shell, NestJS HTTP/WS, Drizzle over standard SQL, Socket.IO + Redis adapter, BullMQ, Scaleway Kapsule / Object Storage / Secret Manager. Nothing in the table is a dead or renamed product.

Day-over-day vs the earlier 2026-10-02 AD-27 version-check: **no new stack drift**. Next `latest` is still 16.3.8; Nest still 12.1.2; BullMQ still 6.3.11; TypeScript `latest` still 7.0.2. The locked table has not been edited (correct under the lock). Live floor sentences in the spine (“do not scaffold below 16.3.7 after 2026-09-30”) remain the stale artifact from Finding 1.

Greenfield starter contract in the spine (oxlint, Nest Vitest, ESM `apps/api`, “ignore Nest schematic TypeScript 6”, “do not scaffold below 16.3.7 after 2026-09-30”) is unchanged. Live starter-adjacent latest today (not spine pins; recorded so a builder does not inherit them as ADs): `oxlint` 1.86.0; `vitest` 5.0.3. There is still no in-repo starter to contradict the contract. AD-28 / AD-29 did not lean on a new starter.

---

## Whisper honesty (confirm only — AD-11 not reopened)

Claims checked against live sources today, not against the earlier 2026-10-02 review.

### Official Whisper still has no `mos` / `dyu`

Live `github.com/openai/whisper` `main` `whisper/tokenizer.py` `LANGUAGES` (raw fetch 2026-10-02): 99 codes. **`fr` is present. `mos` is absent. `dyu` is absent.** `TO_LANGUAGE_CODE` aliases also have neither (`burmese`, `valencian`, `flemish`, `haitian`, `letzeburgesch`, `pushto`, `panjabi`, `moldavian`/`moldovan`, `sinhalese`, `castilian`, `mandarin` only). `get_tokenizer` still raises `Unsupported language` for codes outside that map.

Hugging Face `transformers` `tokenization_whisper.py` on `main` carries the same 99-code map — same absence.

AD-11’s sentence “official Whisper `LANGUAGES` has no `mos`/`dyu`” is still true today. It is not a training-data leftover. **No finding. AD-11 not reopened.** AD-28 / AD-29 do not touch ASR.

---

## Hosting — spot-check that named products still exist (AD-5 not reopened)

- Managed PostgreSQL product page: engines **14, 15, 16, 17**. Not 18.
- Feature request “Postgres 18” (feature-request.scaleway.com/posts/1185): still **Planned Q4 2026**. Commenters still wait on native `uuidv7`. Spine host pin 17.11 + UUIDv7-in-`packages/kernel` still matches the host.
- Managed Redis product page: **Version 8.6.3**. Paris listed Available.
- Kapsule, Object Storage, Secret Manager — still listed for Paris.

**Host pins match. AD-5 not reopened.** No finding. AD-28 / AD-29 did not name a host SKU.

Payment-rail SKUs were not re-fetched this run. AD-28 / AD-29 did not name CinetPay / PayDunya / FedaPay / Wave. Ports-only (Deferred) still holds.

---

## Findings

### 1. Medium — Next.js table is 16.3.6; live Active LTS is 16.3.8, and the spine’s own 16.3.7 floor is the unpatched build

Independent check 2026-10-02 (no newer `latest` than the earlier same-day AD-27 pass):

- npm `next@16.3.6` = 2026-09-22T16:19Z (out-of-band `next/og` RCE).
- npm `next@16.3.7` = 2026-09-29T09:04Z — **bug-fix only**.
- npm `next@16.3.8` = 2026-09-30T16:07Z — official *September 2026 Security Release* (high Image Optimization SSRF CVE-2026-94483; five medium cache/metadata issues; one low `next dev` MCP disclosure). Official install line is `npm install next@16.3.8`. **16.3.7 does not contain these fixes.**
- endoflife.date cycle 16 `latest=16.3.8`. Canary `16.4.0-canary.58` is not a release pin.

Spine table still pins **16.3.6**. Prose says “current as of 2026-09-27; do not scaffold below **16.3.7** after 2026-09-30.” That floor is still the last *vulnerable* 16.3 patch. Companion `SOLUTION-DESIGN.md` § stack still cites “planned 16.3.7 on 2026-09-30.”

**Stack is locked this run — do not edit the table.** Record only. Builders must still treat **16.3.8** as the live security floor at first `create-next-app`. AD-28 / AD-29 did not touch this.

### 2. Medium — TypeScript 7.0.2 is npm-latest, but Nest CLI cannot run `nest build` / `nest start` on it

Spine: “TypeScript pin is 7.0.2 (ignore Nest schematic ‘TypeScript 6’).” The schematic mismatch was reality-checked. The **compiler-API** mismatch is still live.

- npm `typescript@latest` is still **7.0.2**. `next` is `7.1.0-dev.20261002.1` only.
- TypeScript 7.1 iteration plan (#63703): RC **2026-10-20**, stable **2026-11-10**. Not released.
- Nest CLI issues #3477 / #3479 and the #3478 fail-fast guard: TypeScript 7.0 ships `tsc` only; `getParsedCommandLineOfConfigFile` / `createProgram` are undefined. `@nestjs/cli` latest **12.0.8** (2026-09-28) still fail-fasts until the programmatic API returns in **7.1**, or the project dual-pins `typescript` → `@typescript/typescript6` and type-checks 7 via a separate `tsc --noEmit`.

The pin is not fake. The “ignore TS 6” sentence under-states a hard CLI incompatibility. **Stack stays locked.** Implementation can keep 7.0.2 for typecheck and use the documented dual-pin / SWC-without-CLI-typecheck path — that is a starter-contract note, not a stack change. AD-28 / AD-29 did not touch this.

### 3. Low — Nest and BullMQ patch pins drifted since 2026-09-27 (no further drift since the earlier 2026-10-02 pass)

- `@nestjs/core` 12.1.0 → live **12.1.2** (2026-09-30). No 12.1.3.
- `bullmq` 6.3.9 → live **6.3.11** (2026-10-01). No newer publish on 2026-10-02.

Same major. Fits unchanged. Locked stack — record only.

### 4. Low — Node 24 Active support ends 2026-10-20 (18 days)

Pin 24.21.0 is still cycle-24 latest. endoflife.date `support` for cycle 24 is **2026-10-20**; Node 26 LTS starts **2026-10-28**. Spine already says revisit 24-maintenance vs 26-LTS if first prod cut is after 2026-10-28. Still accurate; window is 18 days from this review. Locked — record only.

---

## Checked and not flagged as stale

- **AD-28 / AD-29 (2026-10-02 card-cap):** product invariants only. No new unpinned library, vendor, host SKU, ASR model, swipe/card SDK, payment aggregator, or CLI. Uses existing `BillingPort`, `operator_config`, `ChatPort`, `message_quota`, AD-16 lite budget, AD-18 audit, `Africa/Ouagadougou`.
- AD-11 official Whisper `LANGUAGES` (GitHub `main` raw, 2026-10-02): no `mos`, no `dyu`; `fr` present. Same map in Hugging Face `tokenization_whisper.py`.
- AD-10 `ModerationPort` methods + Deferred “ports only / one live adapter” — vendor-swappable; no SKU bound. Not reopened. AD-28 / AD-29 did not name a moderation vendor.
- React 19.3.0, Capacitor 8.5.2, Drizzle 0.45.3, Socket.IO 4.8.4, Tailwind 4.3.3 — npm `latest`.
- Prisma `latest` still RC (`8.0.0-rc.19`); reject remains correct.
- Scaleway managed PG **17.11** / Redis **8.6.3** match the host pages. PG 18 still Planned Q4 2026.
- UUIDv7-in-`packages/kernel` still the right host workaround (PG 18 not listed).
- Capacitor 9 remains `next` alpha (`9.0.0-alpha.7`); 8.5.2 is the stable pin.
- No in-repo starter versions to contradict the table.

## What this lens did not re-open

AD-5 legal adequacy of France as a CIL destination, AD-10 Chat delivery machine, AD-11 operational lexicon/hold rules (honesty of the Whisper *fact* was confirmed; the AD was not rewritten), AD-27 core reach-mode rules, latency as a product bet, payment-rail SKU choice, and **stack pin edits**. Those are other lenses or locked.

## Top findings (for the parent return)

1. Medium — Next table 16.3.6 and “do not scaffold below 16.3.7” are stale: live security floor is **16.3.8**; 16.3.7 is unpatched. Unchanged since 2026-10-01. Locked — record only.  
2. Medium — TypeScript 7.0.2 is npm-latest but Nest CLI (`@nestjs/cli` 12.0.8) cannot `nest build`/`start` on it until 7.1 (RC planned 2026-10-20; dual-pin workaround exists). Locked — record only.  
3. Low — `@nestjs/core` 12.1.2 and `bullmq` 6.3.11 are live vs table 12.1.0 / 6.3.9 (no further drift since the earlier 2026-10-02 pass).  
4. Low — Node 24 Active support ends 2026-10-20 (18 days; spine already has the revisit date).  
5. (Not a finding) AD-28 / AD-29 introduced **no new vendor tech**. Whisper “no `mos`/`dyu`” still holds against live `tokenizer.py` on GitHub `main`. Scaleway host pins still hold.
