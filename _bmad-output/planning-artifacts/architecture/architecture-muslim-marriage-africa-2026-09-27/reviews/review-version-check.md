# Version-check / reality-check

**Verdict:** pass-with-findings  
**Date:** 2026-09-27  
**Lens:** every committed stack / hosting / CIL / ASR decision must be live-web-verified, not asserted from training data or from `.memlog.md`.  
**Method (this review, independent):** `registry.npmjs.org/*/latest`, `endoflife.date/api/{nodejs,postgresql,redis,nextjs}.json`, Scaleway product + feature-request pages, official Whisper `tokenizer.py` on GitHub `main`, Hugging Face Griot-ASR / BurkimbIA model cards, `an.bf` Loi n°001-2021/AN text, CinetPay / PayDunya / FedaPay docs, Capacitor / Next.js / NestJS starter docs, AWS regions list, Virtix / BF mini-DC / Africloud pages. Memlog was read for claimed sources only; it was not treated as evidence.

## Stack table — independent live pins (2026-09-27)

| Spine pin | Live source | Match? |
| --- | --- | --- |
| Node.js 24.21.0 Active LTS | endoflife.date/api/nodejs.json: cycle 24 `latest=24.21.0`, LTS since 2025-10-28, EOL 2028-04-30. Cycle 26 is Current (`latest=26.10.0`); LTS start 2026-10-28 | Yes. See nuance below |
| TypeScript 7.0.2 | registry.npmjs.org/typescript/latest → `7.0.2` | Yes |
| Next.js 16.3.6 | registry.npmjs.org/next/latest → `16.3.6`. endoflife.date/api/nextjs.json cycle 16 `latest=16.3.6` (2026-09-22) | Yes. See 16.3.7 note |
| React 19.3.0 | registry.npmjs.org/react/latest → `19.3.0` | Yes |
| NestJS `@nestjs/core` 12.1.0 | registry.npmjs.org/@nestjs/core/latest → `12.1.0` | Yes |
| Capacitor `@capacitor/core` 8.5.2 | registry.npmjs.org/@capacitor/core/latest → `8.5.2`. 9.x is `9.0.0-alpha.7` (Ionic: GA targeted end of Nov 2026) | Yes — 9.x correctly avoided |
| Drizzle ORM 0.45.3 | registry.npmjs.org/drizzle-orm/latest → `0.45.3` (updated 2026-09-21) | Yes |
| Prisma rejected as RC | registry.npmjs.org/prisma/latest → `8.0.0-rc.17` | Yes — reject is correct |
| PostgreSQL 18.6 | endoflife.date/api/postgresql.json: cycle 18 `latest=18.6`, EOL 2030-11-14 | **Upstream yes. Host no — Finding 1** |
| Redis 8.10.2 | endoflife.date/api/redis.json: cycle 8.10 `latest=8.10.2` (2026-09-17) | **Upstream yes. Host no — Finding 2** |
| BullMQ 6.3.9 | registry.npmjs.org/bullmq/latest → `6.3.9` (updated 2026-09-25) | Yes |
| Socket.IO 4.8.4 | registry.npmjs.org/socket.io/latest → `4.8.4` (updated 2026-09-25) | Yes |
| Tailwind CSS 4.3.3 | registry.npmjs.org/tailwindcss/latest → `4.3.3` | Yes |

Named technologies still exist and still fit the job: Next.js App Router PWA, Capacitor Android WebView shell, NestJS HTTP/WS, Drizzle over standard SQL, Socket.IO + Redis adapter, BullMQ, Scaleway Kapsule / Object Storage / Secret Manager. Nothing in the table is a dead or renamed product.

## Hosting / CIL / ASR / rails — independent checks

### Scaleway `fr-par` products (AD-5, AD-6)

Live vendor pages confirm, in Paris (`fr-par`):

- Kubernetes **Kapsule** (and Kosmos). Health-data guidance even requires staying in `fr-par` if that constraint applies.
- **Managed PostgreSQL & MySQL** — product page lists engines **14, 15, 16, 17** (not 18). Feature request “Postgres 18” is status **Planned — Q4 2026**.
- **Managed Database for Redis®** — product page lists **Version 8.6.3** (not 8.10.2). Paris / Amsterdam / Warsaw.
- **Object Storage** S3-compatible (`https://s3.fr-par.scw.cloud`).
- **Secret Manager** exists in `fr-par` / `nl-ams` / `pl-waw` (AD-6 “secrets manager” is a real Scaleway product, not a generic hope).

Rejected alternatives are real:

- **Virtix** Ouaga 2000: live Tier III carrier-neutral colo (virtix.bf, PeeringDB fac/11598). Services are colo / interconnect / on-site support — **no managed PG/Redis/S3** on the public site. Rejection rationale holds.
- **BF government mini-DCs** (inaugurated 2026-01-23): public-admin / “zéro donnée à l’extérieur” for **state platforms**. Private commercial use is not offered today; a 2028 national DC is described as the later private-sector vehicle. “Admin-only” is fair.
- **AWS** `eu-west-3` (Paris) and `af-south-1` (Cape Town) exist. There is **no West-Africa full region**. A Lagos **Local Zone** (`af-south-1-los-1a`) exists (EC2/EBS/ECS/EKS/ALB; **no RDS/ElastiCache/S3 in-zone**). Spine “no West-Africa hyperscaler region” is still true; the Local Zone is a nuance builders should not confuse with a managed-PG region.
- **Africloud Lagos ~12 ms Ouaga**: vendor-measured 2026-08-08 table shows Ouagadougou → Lagos **12.5 ms** (high confidence, 439 IPs), Lisbon **78.0 ms**, Johannesburg **141.4 ms**. Claim is a **vendor best-case**, correctly labeled as such in SOLUTION-DESIGN. Ouaga→Paris “~100 ms-class” is consistent with the Lisbon Europe path (~78 ms) plus a Paris hop; it is **not** a Scaleway `fr-par` measurement.

### CIL (AD-19)

Loi **n°001-2021/AN** *portant protection des personnes à l’égard du traitement des données à caractère personnel* is on `an.bf`. Independent read of the official text:

- **Art. 42:** foreign transfer only if the destination ensures an adequate level of protection; **prior authorisation** of the control authority; confidentiality + **reversibility** clauses; technical/org measures including **chiffrement**.
- **Art. 44:** derogations (consent, contract necessity, vital interest, décret, public interest, etc.).
- **Art. 45 / 56:** CIL is the control authority and “autorise les transferts… vers un autre pays.”

France hosting is correctly treated as a **transfer** and a launch-gate filing. The statute summary is not invented. Law Lab Africa (2026-07-11) is a secondary cite; the primary PDF is enough. NFR-008 clocks remaining `[ASSUMPTION]` is honest.

### ASR honesty (AD-11)

- Official Whisper `LANGUAGES` in `github.com/openai/whisper` `main` `whisper/tokenizer.py`: **no `mos`, no `dyu`**. French (`fr`) is present. Claim holds.
- **Griot-ASR-W-0.8-ALL** (Hugging Face `bivariant/Griot-ASR-W-0.8-ALL`): `dyu` Dioula and `mos` Mooré / Mossi are **Preview (améliorations continues)**, not Disponible. Claim holds.
- **BurkimbIA** `BIA-WHISPER-LARGE-SACHI_V3` exists (also V1/V2). Community Moore fine-tune, no inference-provider SLA. Claim holds.

### Payments (AD-14, port-only)

- CinetPay JS SDK documents BF methods **`OM_BF`, `MOOV_BF`, `WAVE_BF`**.
- PayDunya SoftPay: `orange-money-burkina`, `moov-burkina` / disbursement `orange-money-burkina`, `moov-burkina-faso`.
- FedaPay docs list **Burkina Faso: Moov, Orange** (homepage “05 pays” marketing blurb omits BF; the **payment-methods docs** include it).

No SKU is bound. Fit is real.

### Capacitor vs TWA (AD-4)

GoogleChrome/android-browser-helper#287: TWA content Activity is owned by the browser; **`FLAG_SECURE` is not available** on a standard TWA. Capacitor `@capacitor/privacy-screen` applies `FLAG_SECURE` on the WebView window. FCM has a current Capacitor 8 plugin line. The rejection of TWA-only is web-supported, not folklore.

### Redis license (AD-6 deferred)

redis.io/legal/licenses: Redis Open Source ≥ 8 is tri-license **RSALv2 / SSPLv1 / AGPLv3**. Valkey escape hatch is a real project. Counsel note is appropriate.

## Greenfield starter defaults the spine leans on (not recorded)

The spine is greenfield (`apps/web` Next.js App Router, `apps/api` NestJS, `apps/android` Capacitor) but does **not** pin the live CLI defaults a builder will inherit.

| Starter | Live default (2026-09-27) | Spine |
| --- | --- | --- |
| `npx create-next-app@latest` recommended | TypeScript, ESLint, Tailwind CSS v4 (CSS-first, no `tailwind.config`), App Router, Turbopack, import alias `@/*`, `AGENTS.md`. React Compiler **off**. `src/` **off** | App Router + Tailwind 4.3.3 + TS 7.0.2 — compatible, but ESLint-vs-oxlint and Turbopack are unstated |
| `npx @nestjs/cli@latest new` (v12) | **ESM default** (CJS still offered); ESM → **Vitest + oxlint**; CJS → Jest; **Rspack** default bundler; schematics still mention **TypeScript 6** / `nodenext` | Pins `@nestjs/core` 12.1.0 and TypeScript **7.0.2**. No ESM/CJS, test runner, or linter decision |
| Capacitor | `npm i @capacitor/core @capacitor/cli && npx cap init` wrapping an existing web bundle (not a second UI framework) | Matches AD-4 |

This is not a fake stack. It is an unrecorded starter contract: a builder who accepts both CLIs’ defaults will get **two lint stacks** (ESLint + oxlint), Nest **ESM + Vitest**, Next **Turbopack**, and a TS 6 schematic vs a TS 7 pin.

## Findings

### 1. High — PostgreSQL 18.6 is upstream-latest, not Scaleway-managed

The stack table and the “Verified … vendor docs” line present **18.6** as the pin. Independent check:

- endoflife.date: PG 18.6 is real.
- Scaleway Managed PostgreSQL marketing + docs: **14 / 15 / 16 / 17 only**.
- [Scaleway feature request “Postgres 18”](https://feature-request.scaleway.com/posts/1185/postgres-18): **Planned Q4 2026**. Commenters explicitly wait on native `uuidv7` (PG 18). Spine Consistency Conventions say **UUID v7**.

AD-6 (“standard PostgreSQL”) still allows self-operating 18 on Kapsule, or generating UUIDv7 in the app on managed 17. The **table is still wrong as a managed-host pin**. This was checked against endoflife, not against the chosen host’s engine list.

- **Close:** pin **PostgreSQL 17.11** (Scaleway’s current latest major; endoflife.date cycle 17 `latest=17.11`) for managed `fr-par`, keep 18 as a deferred upgrade; generate UUIDv7 in `packages/kernel` until the host offers 18. Or state explicitly “self-managed PG 18 on Kapsule, not Scaleway RDB.”

### 2. High — Redis 8.10.2 is upstream-latest, not Scaleway-managed

Spine / memlog pin **8.10.2** and say “default Redis 8.10 managed.” Scaleway Managed Redis product page lists **8.6.3**. endoflife.date cycle 8.6 is still supported (`latest=8.6.7` as of 2026-09-17). BullMQ 6.3.9 documents Redis ≥ 5 and a Valkey adapter — 8.6 is fine.

- **Close:** pin **Redis 8.6.x** (host) or say “Redis protocol 8; managed engine = whatever Scaleway lists (today 8.6.3); Valkey if counsel rejects the tri-license.” Do not imply 8.10.2 is what `fr-par` managed Redis will run.

### 3. Medium — Next.js 16.3.7 security drop is three days away and not in the table

Live: 16.3.6 is today’s latest (out-of-band RCE fix for `next/og` ImageResponse, GHSA-vcvr-r3jv-pc5j, 2026-09-22). Official post *Upcoming Next.js September Security Release* (2026-09-23) schedules **16.3.7** (and 15.5.27) on **2026-09-30** for nine vulns (1 critical, 2 high, 5 medium, 1 low). Memlog already notes “adopt when published.” The **committed table still freezes 16.3.6**.

- **Close:** keep 16.3.6 as “current as of 2026-09-27”; add a one-line launch rule “do not scaffold below 16.3.7 after 2026-09-30.”

### 4. Medium — Nest / create-next-app live defaults were not reality-checked into the spine

Greenfield leans on those two CLIs. Live Nest 12 `nest new` defaults to **ESM + Vitest + oxlint + Rspack** and schematics still talk **TypeScript 6**; `create-next-app` defaults to **ESLint + Tailwind v4 CSS-first + Turbopack + AGENTS.md**. None of that is in the stack table or conventions. Risk is a split toolchain, not a fake version.

- **Close:** record the accepted starter flags (or “do not use vanilla CLI defaults; monorepo template owns lint/test/module system”). Decide ESM vs CJS for `apps/api` and one linter for the repo.

### 5. Low — Node 24 Active LTS support window ends 2026-10-20

Pin 24.21.0 is the real Active LTS latest. endoflife.date `support` for cycle 24 is **2026-10-20** (then Maintenance until EOL 2028-04-30). Node 26 LTS starts **2026-10-28**. Memlog already prefers 24.x for launch. Not stale — but a launch that slips past October should re-decide 24-maintenance vs 26-LTS.

- **Defer:** revisit at first prod cut if after 2026-10-28.

## Checked and not flagged as stale

- TypeScript 7.0.2, React 19.3.0, Nest 12.1.0, Capacitor 8.5.2, Drizzle 0.45.3, BullMQ 6.3.9, Socket.IO 4.8.4, Tailwind 4.3.3 — all `latest` on npm today.
- Prisma `latest` is still RC (`8.0.0-rc.17`); rejecting it is correct.
- Whisper / Griot / BurkimbIA honesty is live-accurate.
- CIL Loi 001-2021/AN arts 42–44 / 45 / 56 match the official text.
- CinetPay / PayDunya / FedaPay BF rails exist; ports-only is correct.
- Virtix, BF admin DCs, AWS Paris/Cape Town, no WA full region — live.
- TWA vs `FLAG_SECURE` — live.
- Redis 8 tri-license + Valkey — live.
- Scaleway Secret Manager, Kapsule, Object Storage — live.

## What this lens did not re-open

Legal adequacy of France as a destination, latency as a product bet, and whether CIL will accept Scaleway are tagged `[ASSUMPTION — legal review]` and are out of version-check scope. AD-23 / entity-ownership edits are out of this lens.

## Top findings (for the parent return)

1. PostgreSQL 18.6 is not available on Scaleway managed (14–17; 18 planned Q4 2026) — stack table over-pinned upstream.  
2. Redis 8.10.2 is not what Scaleway managed Redis lists (8.6.3).  
3. Next 16.3.7 security release is scheduled 2026-09-30; table is correct *today* only.  
4. Nest 12 and create-next-app live defaults (ESM/Vitest/oxlint vs ESLint/Turbopack; TS 6 schematic vs TS 7 pin) were not recorded.  
5. Node 24 Active support ends 2026-10-20 — pin is valid, window is short.
