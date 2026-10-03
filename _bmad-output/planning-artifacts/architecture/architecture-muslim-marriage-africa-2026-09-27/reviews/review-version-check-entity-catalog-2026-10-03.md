# Version-check / reality-check (entity-catalog finalize, 2026-10-03)

**Verdict:** pass-with-residual  
**Date:** 2026-10-03  
**Artifact:** `ARCHITECTURE-SPINE.md` (updated 2026-10-03; status `final`)  
**Companion (this update):** `SOLUTION-DESIGN.md` `## 6. Entity catalog` (catalog of record; replaced `## 6. Data model`)  
**Lens:** every committed stack / hosting / ASR / vendor-port / named-type decision must be live-web-verified or checked against the existing project/starter — not asserted from training data or from `.memlog.md`.  
**Constraint this run:** **THIS UPDATE DID NOT CHANGE THE STACK.** Pins stay **LOCKED** as of 2026-09-27. Do **not** demand stack bumps. Do **not** reopen AD-5, AD-10, AD-11. Do **not** propose AD-30. Live registry drift is residual only. Because this update is catalog-only, “stack was not the subject of this change” is residual, not a fail.

**Method (this review, independent):** `registry.npmjs.org/{pkg}/latest` fetched 2026-10-03 for `next`, `typescript`, `@nestjs/core`, `@nestjs/cli`, `bullmq`, `react`, `@capacitor/core`, `drizzle-orm`, `socket.io`, `tailwindcss`, `prisma`; `endoflife.date/api/{nodejs,postgresql,nextjs,redis}.json` fetched 2026-10-03. Catalog Field|Type columns were checked against PostgreSQL 17 / Drizzle 0.45.3 capabilities (existence and fit), not against training-data schema folklore. Memlog was read for the claimed 2026-10-03 delta only; it was not treated as version evidence. Scaleway product pages, official Whisper `tokenizer.py`, and payment-rail SKU pages were **not** re-fetched today (AD-5 / AD-11 locked; ports-only Deferred). There is **no** `package.json` / starter in this repo to ratify against — still greenfield.

---

## Locked stack pins (2026-09-27) — do not bump

Recorded as previously locked. The spine table and the “Verified 2026-09-27 …” line are unchanged by this update. Companion §4 still points at the same table.

| Name | Locked pin (2026-09-27) |
| --- | --- |
| Node.js (Active LTS) | 24.21.0 |
| TypeScript | 7.0.2 |
| Next.js | 16.3.6 |
| React | 19.3.0 |
| NestJS (`@nestjs/core`) | 12.1.0 |
| Capacitor (`@capacitor/core`) | 8.5.2 |
| Drizzle ORM | 0.45.3 |
| PostgreSQL (Scaleway managed) | 17.11 |
| Redis (Scaleway managed) | 8.6.3 |
| BullMQ | 6.3.9 |
| Socket.IO | 4.8.4 |
| Tailwind CSS | 4.3.3 |
| Hosting (primary) | Scaleway `fr-par` (Kapsule + managed PG + Redis + Object Storage) |

Greenfield contract (unchanged): monorepo owns lint/test/module system; `apps/api` ESM; one linter (oxlint); Nest tests Vitest; Next may use Turbopack; TypeScript pin 7.0.2 (ignore Nest schematic “TypeScript 6”). **No pin was added or removed on 2026-10-03.**

---

## 2026-10-03 catalog delta — no new vendor tech

Memlog: Headless Update 2026-10-03. Entity catalog only — no product-rule change. `SOLUTION-DESIGN.md` `## 6. Data model (invariants)` replaced in place by `## 6. Entity catalog`. Spine AD-3 now points at that heading; `discovery_exclusion` added to the ownership table; erDiagram watch edge is `conversation → mahram_thread_grant`. No AD-30. AD-10 / AD-11 / AD-12 / AD-27 / AD-28 / AD-29 not reopened.

Independent count of catalog `###` stored entities: **53**. Matches the memlog claim.

| Named thing in the 2026-10-03 catalog text | Already on the spine / prior companion? | New library / vendor / unpinned SKU? |
| --- | --- | --- |
| 53 stored entities with owner + Field\|Type\|Null\|Meaning + relationships | AD-3 ownership + prior data-model invariants | No — documentation grain, not a stack |
| IDs = UUID v7 from `packages/kernel` | Consistency Conventions + AD-20 (host PG 17 has no native `uuidv7`) | No |
| Column types `uuid` / `text` / `text[]` / `boolean` / `date` / `timestamptz` / `int` / `jsonb` / PG enums | Standard PostgreSQL 17; Drizzle maps all of these | No |
| `civil_day_ouaga` `date` + `Africa/Ouagadougou` | AD-23 / AD-29 | No (IANA tz, already bound) |
| Ciphertext envelope `{v, alg, kid, iv, ct}` on `message.body` / `message_flash.body` | AD-17 | No |
| `argon2id` on `credential.secret_hash` / `pin_lock.pin_hash` | AD-17 | No — algorithm name, not a new npm pin |
| `sha256(...)` ban fingerprint | AD-17 | No |
| `audio_asset.locale` enum `mos\|dyu` (stored audio keys) | AD-11 locale keys; Chat Voice is `photo_asset.kind=voice_note` | No — not an ASR SKU |
| `verification_record.vendor` / `moderation_job.vendor` / `payment.provider` as `text` | Deferred “ports only / one live adapter” | No SKU bound |
| **Not stored:** likes; kids/`has_children` columns; `hold_queue`; `sharedTraits` DTO; completeness (computed); `taaruf_stage` (= `conversation.stage`); `profile_field` (not EAV); `mahram_permission` (link+grant) | AD-10 / AD-28 / AD-12 already forbade these inventions | No |
| `discovery_exclusion` on AD-3 ownership + erDiagram | AD-28 pass = viewer-scoped exclusion | No — entity already implied; now owned |
| AD-3 pointer “Field-level columns live in SOLUTION-DESIGN.md `## 6. Entity catalog`” | Heading rename only | No |

No new framework, queue, host SKU, ASR model, payment aggregator, ORM, UUID library, hash library, card-UI SDK, or CLI was named. No pin was added or removed. **The catalog is a data-shape artifact on the already-locked substrate. It is not a tech decision.**

---

## Catalog types — existence and fit (reality-check, not a stack change)

Checked against PostgreSQL 17 (host pin 17.11; endoflife.date cycle 17 `latest=17.11` as of 2026-10-03) and Drizzle ORM 0.45.3 (`registry.npmjs.org/drizzle-orm` `latest` still `0.45.3`, published 2026-09-21).

| Catalog type | Still exists? | Fits this host / ORM? |
| --- | --- | --- |
| `uuid` storing RFC 9562 v7, generated in `packages/kernel` | Yes. PG `uuid` is 128-bit; version is application-chosen | Yes. Host managed PG **17** still has **no** native `uuidv7()` (that is a PG **18** function). Kernel generation remains the correct workaround. Catalog type column “uuid v7” means stored `uuid` + app v7, not a PG type named `uuidv7` |
| `timestamptz` | Yes (PG timestamptz) | Yes. Matches spine “UTC ISO-8601 in APIs and DB” |
| `date` (`dob`, `civil_day_ouaga`) | Yes | Yes. Civil-day grain must not be `timestamptz` |
| `jsonb` (ciphertext, scores, audit payload) | Yes | Yes. Drizzle `jsonb()` |
| `text` / `text[]` / `int` / `boolean` | Yes | Yes |
| PG `enum` / check-constrained text for closed sets | Yes | Yes. Drizzle `pgEnum` or `text` + check. Catalog writes `enum \`a\|b\`` as domain language, not a new enum library |
| `Africa/Ouagadougou` | IANA Zone `Africa/Ouagadougou` (Burkina Faso) — already bound 2026-09-27 | Yes. Not re-fetched from IANA tzdb today — residual, not material |
| `argon2id` | Yes — current password-hash recommendation (OWASP / PHC) | Yes. Algorithm already bound in AD-17. No npm package was pinned (and must not be invented here) |
| Socket.IO + long-poll | `socket.io@4.8.4` still npm `latest` (2026-09-25). Engine.IO still upgrades from long-poll | Yes. Catalog/API §7 cites the existing AD-15 channel; no second WS library |

Nothing in the catalog Field|Type column is a dead type, a renamed PG feature, or a type that Drizzle 0.45.3 cannot migrate on PG 17.

---

## Stack table — live registry / EOL today (residual only)

Verified line in the spine still says “Verified 2026-09-27 against npm registry, endoflife.date APIs, vendor docs, and official Whisper sources.” Live sources **2026-10-03** (independent of the 2026-10-02 card-cap pass):

| Spine pin (locked 2026-09-27) | Live source (2026-10-03) | Match? |
| --- | --- | --- |
| Node.js 24.21.0 Active LTS | endoflife.date/api/nodejs.json: cycle 24 `latest=24.21.0`, LTS since 2025-10-28, `support=2026-10-20`, EOL 2028-04-30. Cycle 26 Current `latest=26.10.0`; LTS start 2026-10-28 | Pin matches latest-24. Window is **17 days** — Residual 4 |
| TypeScript 7.0.2 | registry `typescript` `latest` → `7.0.2`. `@nestjs/cli` `latest` → **12.0.8** with dependency `typescript ~6.0.2` | Version exists. Nest CLI still cannot consume 7.0 as its compiler API — Residual 2 |
| Next.js 16.3.6 | registry `next` `latest` → **16.3.8** (tarball `next-16.3.8.tgz`). endoflife.date/api/nextjs.json cycle 16 `latest=16.3.8` (2026-09-30) | **Table stale — Residual 1** |
| React 19.3.0 | registry `react` `latest` → `19.3.0` | Yes |
| NestJS (`@nestjs/core`) 12.1.0 | registry `latest` → **12.1.2** | Patch drift — Residual 3 |
| Capacitor (`@capacitor/core`) 8.5.2 | registry `latest` → `8.5.2` | Yes — 9.x not on `latest` |
| Drizzle ORM 0.45.3 | registry `latest` → `0.45.3` (2026-09-21) | Yes |
| Prisma rejected as RC | registry `prisma` `latest` → **`8.0.0-rc.19`** | Yes — reject is still correct |
| PostgreSQL (Scaleway managed) 17.11 | endoflife.date cycle 17 `latest=17.11`. Upstream 18.6 exists and is **not** the host pin | Host pin still matches upstream-17 latest. Scaleway engine list **not** re-fetched today — Residual 5 |
| Redis (Scaleway managed) 8.6.3 | endoflife.date cycle 8.6 `latest=8.6.7`; cycle 8.10 `latest=8.10.2` | Host pin vs upstream lag, already Deferred. Scaleway page **not** re-fetched today — Residual 5 |
| BullMQ 6.3.9 | registry `latest` → **6.3.11** (updated 2026-10-01T01:58Z). No newer `latest` on 2026-10-03 | Patch drift — Residual 3 |
| Socket.IO 4.8.4 | registry `latest` → `4.8.4` (2026-09-25) | Yes |
| Tailwind CSS 4.3.3 | registry `latest` → `4.3.3` | Yes |

Day-over-day vs the 2026-10-02 card-cap version-check: **no new stack drift**. Next `latest` is still 16.3.8; Nest still 12.1.2; BullMQ still 6.3.11; TypeScript `latest` still 7.0.2; Prisma still `8.0.0-rc.19`; `@nestjs/cli` still 12.0.8. The locked table has not been edited (correct under the lock).

Named technologies still exist and still fit: Next.js App Router PWA, Capacitor Android WebView shell, NestJS HTTP/WS, Drizzle over standard SQL, Socket.IO + Redis adapter, BullMQ, Scaleway Kapsule / Object Storage / Secret Manager (last host-page confirm 2026-10-02). Nothing in the table is a dead or renamed product.

Companion `SOLUTION-DESIGN.md` §4 still cites “planned 16.3.7 on 2026-09-30.” That sentence is the same stale floor as Residual 1. Catalog update did not touch §4. **Do not bump.**

---

## What was not re-opened / not re-fetched today

- **AD-5** hosting/legal adequacy of France as a CIL destination. Scaleway Kapsule / managed PG / Redis / Object Storage / Secret Manager pages were last confirmed 2026-10-02. Not re-fetched 2026-10-03. Residual 5 only.
- **AD-10** Chat delivery machine / `ModerationPort` methods. Catalog `message.state` is enum `delivered` only; `hold_queue` is in **Not stored**. That restates the locked rule; it does not re-decide it.
- **AD-11** Whisper honesty / lexicon/hold rules. Official `LANGUAGES` (no `mos`/`dyu`) was last raw-fetched 2026-10-02. Not re-fetched today. Catalog `audio_asset.locale` `mos|dyu` is **stored audio keys**, not an ASR coverage claim. **AD-11 not reopened.**
- Payment-rail SKUs (CinetPay / PayDunya / FedaPay / Wave). Catalog `payment.provider` is `text`. Ports-only Deferred still holds.
- **AD-30** — not proposed.

---

## Findings

### Residual 1 — Next.js table is 16.3.6; live latest is 16.3.8; spine floor still 16.3.7

Independent check 2026-10-03 (unchanged since 2026-10-02):

- npm `next@latest` = **16.3.8**.
- endoflife.date cycle 16 `latest=16.3.8` (2026-09-30).
- Spine table still pins **16.3.6**. Prose still says “do not scaffold below **16.3.7** after 2026-09-30.” Companion §4 still cites “planned 16.3.7 on 2026-09-30.”

**Stack is locked this run — do not edit the table.** Record only. The catalog update did not touch Next. Builders at first `create-next-app` must still treat the live security floor as whatever `next@latest` is that day (16.3.8 as of this fetch). This is residual, not a fail.

### Residual 2 — TypeScript 7.0.2 is npm-latest; Nest CLI 12.0.8 still depends on TypeScript ~6

Spine: “TypeScript pin is 7.0.2 (ignore Nest schematic ‘TypeScript 6’).” Live today:

- `typescript@latest` = **7.0.2**.
- `@nestjs/cli@latest` = **12.0.8** (2026-09-28), dependency `typescript ~6.0.2`.

The pin is not fake. The CLI/compiler-API mismatch is still live. **Do not bump. Do not dual-pin in the spine.** Implementation note only (starter contract), already recorded on 2026-10-02. Catalog did not touch this.

### Residual 3 — Nest and BullMQ patch pins drifted since 2026-09-27 (no further drift since 2026-10-02)

- `@nestjs/core` 12.1.0 → live **12.1.2**.
- `bullmq` 6.3.9 → live **6.3.11** (2026-10-01; still latest on 2026-10-03).

Same major. Fits unchanged. Locked — record only.

### Residual 4 — Node 24 Active support ends 2026-10-20 (17 days)

Pin 24.21.0 is still cycle-24 latest. endoflife.date `support` for cycle 24 is **2026-10-20**; Node 26 LTS starts **2026-10-28**. Spine already says revisit 24-maintenance vs 26-LTS if first prod cut is after 2026-10-28. Still accurate. Locked — record only.

### Residual 5 — Host SKUs and Whisper `LANGUAGES` were not re-fetched today

Catalog-only update. AD-5 / AD-11 locked. Scaleway managed-engine pages and official Whisper `tokenizer.py` were last independently fetched **2026-10-02**. Upstream EOL still shows PG 17.11 / Redis 8.6.x latest 8.6.7. The finding that those vendor pages were not re-verified on 2026-10-03 is **residual, not a fail**, per this lens.

---

## Checked and not flagged as stale (catalog / types)

- **53 stored entities** counted from `###` headings; memlog claim holds.
- Catalog Field|Type set is standard PostgreSQL 17 + Drizzle 0.45.3. No invented column type.
- UUID v7-in-`packages/kernel` still the right host workaround (PG 18 exists upstream; host pin stays 17.11).
- `civil_day_ouaga` as `date` (not timestamptz) matches the Ouagadougou civil-day grain.
- Ciphertext `jsonb` envelope, argon2id hashes, sha256 fingerprint — algorithms already bound; no new library.
- `audio_asset.locale` `mos|dyu` is stored content audio, not Whisper coverage. AD-11 not reopened.
- Vendor columns remain `text` / adapter SKU. Deferred ports-only still holds.
- Prisma `latest` still RC (`8.0.0-rc.19`); reject remains correct.
- React 19.3.0, Capacitor 8.5.2, Drizzle 0.45.3, Socket.IO 4.8.4, Tailwind 4.3.3 — npm `latest`.
- No in-repo starter versions to contradict the table.
- AD-3 still *names* `profile_field`, `completeness`, `taaruf_stage`, `mahram_permission` as ownership labels; the catalog explicitly says those are **not stored tables**. That is a naming/pointer convention, not a new type or vendor. Out of this lens as a stack issue.

## What this lens did not re-open

AD-5 legal adequacy of France as a CIL destination, AD-10 Chat delivery machine, AD-11 operational lexicon/hold rules, AD-12 grant grain, AD-27 reach-mode core, AD-28 card/grid, AD-29 message cap, latency as a product bet, payment-rail SKU choice, **stack pin edits**, and **AD-30**. Those are other lenses or locked.

## Top findings (for the parent return)

1. Residual — Next table 16.3.6 and “do not scaffold below 16.3.7” are stale vs live **16.3.8**. Unchanged since 2026-10-02. Locked — no bump.  
2. Residual — TypeScript 7.0.2 is npm-latest but `@nestjs/cli` 12.0.8 still depends on `typescript ~6.0.2`. Locked — no bump.  
3. Residual — `@nestjs/core` 12.1.2 and `bullmq` 6.3.11 are live vs table 12.1.0 / 6.3.9 (no further drift since 2026-10-02).  
4. Residual — Node 24 Active support ends 2026-10-20 (17 days; spine already has the revisit date).  
5. Residual — Scaleway host pages and Whisper `LANGUAGES` were not re-fetched today (AD-5 / AD-11 locked). Catalog itself introduced **no new vendor tech**; 53 entities use PG-17 / Drizzle-0.45.3 types only.
