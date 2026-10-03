# Version-check / reality-check (2026-10-02)

**Verdict:** pass-with-findings  
**Date:** 2026-10-02  
**Artifact:** `ARCHITECTURE-SPINE.md` (updated 2026-10-02; status `final`)  
**Companion (context only):** `SOLUTION-DESIGN.md`  
**Lens:** every committed stack / hosting / ASR / vendor-port decision must be live-web-verified or checked against the existing project/starter — not asserted from training data or from `.memlog.md`.  
**Constraint this run:** stack is **LOCKED**. Stale pins are flagged low/medium only. Do not demand spine stack edits. Do **not** reopen AD-5, AD-10, or AD-11. Extra attention: live drift on Next, Nest, BullMQ, TypeScript; Whisper `mos`/`dyu` absence; Scaleway host engines; CinetPay BF rails; and whether the 2026-10-02 AD-27 / AD-2 / AD-21 update introduced any new unpinned technology.

**Method (this review, independent):** `registry.npmjs.org/{pkg}` `dist-tags` + publish times (fetched 2026-10-02); `endoflife.date/api/{nodejs,postgresql,redis,nextjs}.json`; official Next.js *September 2026 Security Release* (nextjs.org/blog/september-2026-security-release); Scaleway Managed PostgreSQL / Managed Redis product pages + feature-request “Postgres 18”; official Whisper `whisper/tokenizer.py` on GitHub `main`; Hugging Face `bivariant/Griot-ASR-W-0.8-ALL` model card; Hugging Face `burkimbia/BIA-WHISPER-LARGE-SACHI_V3`; CinetPay JS SDK country-method map, docs.cinetpay.com transfer annex, cinetpay.com/pricing BF collect; Nest CLI issues #3477 / #3479 and `@nestjs/cli` npm `latest`. Memlog was read for claimed sources only; it was not treated as evidence. There is **no** `package.json` / starter in this repo to ratify against — still greenfield.

---

## 2026-10-02 delta — no new unpinned tech

This update added **AD-27** (`sister_reach_mode`) and amended **AD-2** / **AD-21** (plus consequential AD-18 / AD-23 / `operator_config` / capability-map cites). Those are product invariants on already-named ports and config:

| Named thing in the 2026-10-02 text | Already on the spine before this update? | New library / vendor / unpinned SKU? |
| --- | --- | --- |
| `operator_config.sister_reach_mode` enum `free_unlimited` \| `same_quota_as_brothers` | `operator_config` key table already existed; this is a new **required key** of an existing entity | No |
| `BillingPort.isEntitled` → `true \| false \| unavailable` | AD-21 | No |
| `invite_quota` writer = invites | AD-3 / AD-23 | No |
| Brother caps `brother_invite_quota_free` / `brother_invite_quota_premium` | already required config keys | No |
| `Africa/Ouagadougou` civil-day reset | AD-23 | No (IANA tz, already bound) |
| AD-18 event on mode change | AD-18 already audits operator threshold/price changes | No |
| Safety-path `BillingPort` ban (verification, blur/reveal, mahram, report, block, Chat after accept) | AD-2 / AD-21 already isolated billing from safety | No — exception narrowed, not a new adapter |

No new framework, queue, host SKU, ASR model, payment aggregator, or CLI was named. No pin was added or removed. Stack table is unchanged from the locked 2026-09-27 / host-corrected pins. **AD-27 is not a tech decision.**

---

## Stack table — independent live pins (2026-10-02)

Verified line in the spine still says “Verified 2026-09-27 …”. Live registry/EOL/vendor today:

| Spine pin | Live source (2026-10-02) | Match? |
| --- | --- | --- |
| Node.js 24.21.0 Active LTS | endoflife.date/api/nodejs.json: cycle 24 `latest=24.21.0`, LTS since 2025-10-28, `support=2026-10-20`, EOL 2028-04-30. Cycle 26 is Current (`latest=26.10.0`); LTS start 2026-10-28 | Yes. Window is 18 days — Finding 4 |
| TypeScript 7.0.2 | registry.npmjs.org/typescript `latest` → `7.0.2` (2026-07-08). `next` = `7.1.0-dev.20261002.1` (dev only). 7.1 RC planned 2026-10-20; stable planned 2026-11-10 | Version exists. Nest CLI still cannot consume it — Finding 2 |
| Next.js 16.3.6 | registry `latest` → **16.3.8** (2026-09-30T16:07Z). 16.3.7 published 2026-09-29 (bug-fix only). endoflife.date/api/nextjs.json cycle 16 `latest=16.3.8`. Official post: patch **16.3.8**. Canary is `16.4.0-canary.58` (not a pin) | **Table stale — Finding 1** |
| React 19.3.0 | registry.npmjs.org/react `latest` → `19.3.0` (2026-09-09) | Yes |
| NestJS (`@nestjs/core`) 12.1.0 | registry `latest` → **12.1.2** (2026-09-30). `@nestjs/cli` `latest` → 12.0.8 (2026-09-28) | Patch drift — Finding 3 |
| Capacitor (`@capacitor/core`) 8.5.2 | registry `latest` → `8.5.2` (2026-09-11). `next` = `9.0.0-alpha.7`. Nightly `8.5.3-nightly-20261002` is not stable | Yes — 9.x correctly avoided |
| Drizzle ORM 0.45.3 | registry `latest` → `0.45.3` (2026-09-21) | Yes |
| Prisma rejected as RC | registry `latest` → `8.0.0-rc.19` | Yes — reject is still correct |
| PostgreSQL (Scaleway managed) 17.11 | endoflife.date cycle 17 `latest=17.11`. Scaleway product page: engines **14, 15, 16, 17**. Feature request “Postgres 18”: still **Planned Q4 2026**. Upstream 18.6 exists and is not the host pin | Yes — host pin, not upstream-latest |
| Redis (Scaleway managed) 8.6.3 | Scaleway Managed Redis product page: **Version 8.6.3**. endoflife.date cycle 8.6 `latest=8.6.7`; cycle 8.10 `latest=8.10.2` | Yes — host pin. Upstream 8.6.7 is a host lag, already deferred |
| BullMQ 6.3.9 | registry `latest` → **6.3.11** (2026-10-01T01:58Z). No newer publish on 2026-10-02 | Patch drift — Finding 3 |
| Socket.IO 4.8.4 | registry `latest` → `4.8.4` (2026-09-25) | Yes |
| Tailwind CSS 4.3.3 | registry `latest` → `4.3.3` (2026-07-16) | Yes |
| Hosting (primary) Scaleway `fr-par` | Kapsule, managed PG, managed Redis, Object Storage, Secret Manager still listed for Paris. Managed PG/Redis also listed Available in Paris on the regional availability page | Yes |

Named technologies still exist and still fit the job: Next.js App Router PWA, Capacitor Android WebView shell, NestJS HTTP/WS, Drizzle over standard SQL, Socket.IO + Redis adapter, BullMQ, Scaleway Kapsule / Object Storage / Secret Manager. Nothing in the table is a dead or renamed product.

Day-over-day vs the 2026-10-01 version-check: **no new stack drift**. Next `latest` is still 16.3.8; Nest still 12.1.2; BullMQ still 6.3.11; TypeScript `latest` still 7.0.2. The locked table has not been edited (correct under the lock). Live floor sentences in the spine (“do not scaffold below 16.3.7 after 2026-09-30”) remain the stale artifact from Finding 1.

Greenfield starter contract in the spine (oxlint, Nest Vitest, ESM `apps/api`, “ignore Nest schematic TypeScript 6”, “do not scaffold below 16.3.7 after 2026-09-30”) is unchanged. There is still no in-repo starter to contradict it.

---

## Whisper honesty (confirm only — AD-11 not reopened)

Claims checked against live sources today, not against the 2026-10-01 review.

### Official Whisper still has no `mos` / `dyu`

Live `github.com/openai/whisper` `main` `whisper/tokenizer.py` `LANGUAGES` (fetched 2026-10-02): 99 codes. **`fr` is present. `mos` is absent. `dyu` is absent.** `TO_LANGUAGE_CODE` aliases also have neither. `get_tokenizer` still raises `Unsupported language` for codes outside that map.

Hugging Face `transformers` `tokenization_whisper.py` on `main` carries the same 99-code map — same absence.

AD-11’s sentence “official Whisper `LANGUAGES` has no `mos`/`dyu`” is still true today. It is not a training-data leftover. **No finding. AD-11 not reopened.**

### Community / Preview models still exist and are still not SLA coverage

- **Griot-ASR-W-0.8-ALL** (`huggingface.co/bivariant/Griot-ASR-W-0.8-ALL`, live card 2026-10-02): `dyu` Dioula and `mos` Mooré / Mossi are still **Preview (améliorations continues)**, not Disponible. Preview languages have **no public CER/WER**. Card itself still says Preview models are “pleinement fonctionnels pour l'inférence” with iterative updates — that is still Preview, not a production SLA. Treating them as low-confidence adapters remains honest.
- **BurkimbIA** `BIA-WHISPER-LARGE-SACHI_V3` still exists on Hugging Face. Card: community Moore fine-tune (~100h, Whisper v3). No inference-provider SLA on the card. Downloads last month listed as empty. AD-11’s “community / no SLA” hold.

**No finding. AD-11 not reopened.** Residual (out of this lens, already on the AD): official Whisper will never emit `mos`/`dyu`; the `mos`/`dyu` trigger fires only when a community adapter or a locale hint declares those ISO 639-3 codes.

---

## Hosting / rails — spot-check that named products still exist

### Scaleway `fr-par` (confirm only — AD-5 not reopened)

- Managed PostgreSQL product page: engines **14, 15, 16, 17**. Not 18.
- Feature request “Postgres 18” (feature-request.scaleway.com/posts/1185): still **Planned Q4 2026**. Commenters still wait on native `uuidv7`. Spine host pin 17.11 + UUIDv7-in-`packages/kernel` still matches the host.
- Managed Redis product page: **Version 8.6.3**. Paris listed Available.
- Kapsule, Object Storage (`s3.fr-par.scw.cloud` pattern), Secret Manager — still listed for Paris.

**Host pins match. AD-5 not reopened.** No finding.

### CinetPay BF rails (spot-check)

Live today, no SKU bound (AD-14 / Deferred still “ports only”):

- **cinetpay/cinetpay-js** country-method map: Burkina Faso `BF` → `OM_BF`, `MOOV_BF`, `WAVE_BF`. Same codes the companion cites.
- **docs.cinetpay.com** transfer annex: Burkina Faso +226 Orange `OMBF` **Available**; Moov `MOOVBF` **Available**. No Wave transfer row for BF on that annex.
- **cinetpay.com/pricing** BF collect: Orange Money Burkina Faso, Moov Money Burkina Faso, Visa–Mastercard. Wave is **not** on the public BF pricing table.

Fit is still real for Orange + Moov. Wave remains “where available” (AD-14 already hedges). Companion listing `WAVE_BF` is SDK-true, not pricing-page-true. Ports-only is still the right lock — builders must not treat the JS enum as a live-rail guarantee for Wave. **Recorded; not a pin change; not a new tech from AD-27.**

PayDunya / FedaPay were not re-fetched this run. Prior 2026-09-27 version-check verified them; AD-27 did not name them.

---

## Findings

### 1. Medium — Next.js table is 16.3.6; live Active LTS is 16.3.8, and the spine’s own 16.3.7 floor is the unpatched build

Independent check 2026-10-02 (unchanged from 2026-10-01 — no newer `latest`):

- npm `next@16.3.6` = 2026-09-22 (out-of-band `next/og` RCE).
- npm `next@16.3.7` = 2026-09-29 — **bug-fix only**.
- npm `next@16.3.8` = 2026-09-30 — official *September 2026 Security Release* (high Image Optimization SSRF; five medium cache/metadata issues; one low `next dev` MCP disclosure). Official install line is `npm install next@16.3.8`. **16.3.7 does not contain these fixes.**
- endoflife.date cycle 16 `latest=16.3.8`. Canary `16.4.0-canary.58` is not a release pin.

Spine table still pins **16.3.6**. Prose says “current as of 2026-09-27; do not scaffold below **16.3.7** after 2026-09-30.” That floor is still the last *vulnerable* 16.3 patch. Companion `SOLUTION-DESIGN.md` § stack still cites “planned 16.3.7 on 2026-09-30.”

Stack is locked this run — do not edit the table. Builders must still scaffold **16.3.8+** (or whatever `next@latest` is at first `create-next-app`). The recorded floor is the stale artifact.

### 2. Medium — TypeScript 7.0.2 is npm-latest, but Nest CLI cannot run `nest build` / `nest start` on it

Spine: “TypeScript pin is 7.0.2 (ignore Nest schematic ‘TypeScript 6’).” The schematic mismatch was reality-checked. The **compiler-API** mismatch is still live.

- npm `typescript@latest` is still **7.0.2**. `next` is `7.1.0-dev.20261002.1` only.
- TypeScript 7.1 iteration plan (#63703): RC **2026-10-20**, stable **2026-11-10**. Not released.
- Nest CLI issues #3477 / #3479 and the #3478 fail-fast guard: TypeScript 7.0 ships `tsc` only; `getParsedCommandLineOfConfigFile` / `createProgram` are undefined. `@nestjs/cli` latest **12.0.8** (2026-09-28) still fail-fasts until the programmatic API returns in **7.1**, or the project dual-pins `typescript` → `@typescript/typescript6` and type-checks 7 via a separate `tsc --noEmit`.

The pin is not fake. The “ignore TS 6” sentence under-states a hard CLI incompatibility. Stack stays locked. Implementation can keep 7.0.2 for typecheck and use the documented dual-pin / SWC-without-CLI-typecheck path — that is a starter-contract note, not a stack change. AD-27 did not touch this.

### 3. Low — Nest and BullMQ patch pins drifted since 2026-09-27 (no further drift since 2026-10-01)

- `@nestjs/core` 12.1.0 → live **12.1.2** (2026-09-30). No 12.1.3.
- `bullmq` 6.3.9 → live **6.3.11** (2026-10-01). No newer publish on 2026-10-02.

Same major. Fits unchanged. Locked stack — record only.

### 4. Low — Node 24 Active support ends 2026-10-20 (18 days)

Pin 24.21.0 is still cycle-24 latest. endoflife.date `support` for cycle 24 is **2026-10-20**; Node 26 LTS starts **2026-10-28**. Spine already says revisit 24-maintenance vs 26-LTS if first prod cut is after 2026-10-28. Still accurate; window is 18 days from this review.

---

## Checked and not flagged as stale

- **AD-27 / AD-2 / AD-21 (2026-10-02):** product invariants only. No new unpinned library, vendor, host SKU, ASR model, or CLI. Uses existing `BillingPort`, `operator_config`, `invite_quota`, AD-18 audit, `Africa/Ouagadougou`.
- AD-11 official Whisper `LANGUAGES` (GitHub `main` 2026-10-02): no `mos`, no `dyu`; `fr` present. Same map in Hugging Face `tokenization_whisper.py`.
- Griot-ASR `mos`/`dyu` still Preview; BurkimbIA V3 still community / no inference-provider SLA.
- AD-10 `ModerationPort` methods + Deferred “ports only / one live adapter” — vendor-swappable; no SKU bound. Not reopened.
- React 19.3.0, Capacitor 8.5.2, Drizzle 0.45.3, Socket.IO 4.8.4, Tailwind 4.3.3 — npm `latest`.
- Prisma `latest` still RC (`8.0.0-rc.19`); reject remains correct.
- Scaleway managed PG **17.11** / Redis **8.6.3** match the host pages. PG 18 still Planned Q4 2026.
- UUIDv7-in-`packages/kernel` still the right host workaround (PG 18 not listed).
- Capacitor 9 remains `next` alpha (`9.0.0-alpha.7`); 8.5.2 is the stable pin.
- CinetPay JS SDK still documents `OM_BF` / `MOOV_BF` / `WAVE_BF`; official BF pricing + transfer annex confirm Orange + Moov; Wave stays “where available.” No SKU bound.
- No in-repo starter versions to contradict the table.

## What this lens did not re-open

AD-5 legal adequacy of France as a CIL destination, AD-10 Chat delivery machine, AD-11 operational lexicon/hold rules (honesty of the Whisper *fact* was confirmed; the AD was not rewritten), latency as a product bet, payment-rail SKU choice, and stack pin edits. Those are other lenses or locked.

## Top findings (for the parent return)

1. Medium — Next table 16.3.6 and “do not scaffold below 16.3.7” are stale: live security floor is **16.3.8**; 16.3.7 is unpatched. Unchanged since 2026-10-01.  
2. Medium — TypeScript 7.0.2 is npm-latest but Nest CLI (`@nestjs/cli` 12.0.8) cannot `nest build`/`start` on it until 7.1 (RC planned 2026-10-20; dual-pin workaround exists).  
3. Low — `@nestjs/core` 12.1.2 and `bullmq` 6.3.11 are live vs table 12.1.0 / 6.3.9 (no further drift since 2026-10-01).  
4. Low — Node 24 Active support ends 2026-10-20 (18 days; spine already has the revisit date).  
5. (Not a finding) AD-27 / AD-2 / AD-21 introduced **no new unpinned tech**. Whisper “no `mos`/`dyu`” and Scaleway host pins still hold against live sources. CinetPay BF Orange/Moov rails still documented.
