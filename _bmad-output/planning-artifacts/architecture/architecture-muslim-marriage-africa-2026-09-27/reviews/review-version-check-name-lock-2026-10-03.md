# Version-check / reality-check (name lock, 2026-10-03)

**Verdict:** pass-with-residual  
**Date:** 2026-10-03  
**Artifact:** `ARCHITECTURE-SPINE.md` (`## Stack` + naming header; updated 2026-10-03; status `final`)  
**Companion (context only):** `SOLUTION-DESIGN.md` header + OQ-9 / OQ-10 (same naming sentences; not a stack change)  
**Lens:** every committed stack / hosting / ASR / vendor-port / named-type decision must be live-web-verified or checked against the existing project/starter — not asserted from training data or from `.memlog.md`.  
**Constraint this run:** **THIS UPDATE ADDED NO NEW TECH.** Stack pins stay **LOCKED** as of 2026-09-27. Do **not** demand pin bumps. Do **not** propose AD-30. Do **not** reopen AD-10 / AD-11 / AD-12 / AD-27 / AD-28 / AD-29. Live registry drift is residual only. Because this update is naming-only, “stack was not the subject of this change” is residual, not a fail. Product name **AnKanu** and domain **ankanu.com** are branding facts, not stack. Flag naming **only** if the sentences invent a purchased shortlist domain (Nisfuddin / Nikahsira / etc.) or claim OAPI/WIPO for AnKanu was completed (it was not).

**Method (this review, independent):** `registry.npmjs.org/{pkg}/latest` fetched 2026-10-03 for `next`, `typescript`, `@nestjs/core`, `@nestjs/cli`, `bullmq`, `react`, `@capacitor/core`, `drizzle-orm`, `socket.io`, `tailwindcss`, `prisma`; `endoflife.date/api/{nodejs,postgresql,nextjs,redis}.json` fetched 2026-10-03. Verisign RDAP `https://rdap.verisign.com/com/v1/domain/ankanu.com` fetched 2026-10-03 (HTTP 200); IANA registrar-ids XML for handle `1636`; Hostinger marketing pages `hostinger.com` / `hostinger.com/domains` HTTP 200. Shortlist `.com` RDAP 404s fetched 2026-10-03 for `nisfuddin`, `nikahsira`, `sakinaa`, `mithaqun`, `nonglem`, `nisfdin`. Memlog was read for the claimed 2026-10-03 naming delta only; it was not treated as version evidence. Scaleway product pages, official Whisper `tokenizer.py`, and payment-rail SKU pages were **not** re-fetched today (AD-5 / AD-11 locked; ports-only Deferred). There is **no** `package.json` / starter in this repo to ratify against — still greenfield.

---

## Locked stack pins (2026-09-27) — do not bump

Recorded as previously locked. The spine table and the “Verified 2026-09-27 …” line are unchanged by this update.

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

Greenfield contract (unchanged): monorepo owns lint/test/module system; `apps/api` ESM; one linter (oxlint); Nest tests Vitest; Next may use Turbopack; TypeScript pin 7.0.2 (ignore Nest schematic “TypeScript 6”). **No pin was added or removed on 2026-10-03.** Hostinger is **not** in this table.

---

## 2026-10-03 naming delta — no new vendor tech

Memlog: Headless Update 2026-10-03. LOCKED naming only (Maitchibi Fayçal via Harris). Headers and current undecided/TBD/live-shortlist sentences replaced. AD-22 Rule amended in place for Q9/Q10 only. No new AD. Stack table untouched.

| Named thing in the 2026-10-03 naming text | Already on the spine / prior companion? | New library / vendor / unpinned SKU? |
| --- | --- | --- |
| Product name **AnKanu** | Replaces TBD / shortlist; branding token | No — name, not a stack |
| Domain **ankanu.com** purchased | Replaces “name undecided”; Deferred still “not an AD” | No — DNS registration, not a host SKU |
| Registrar **Hostinger** (purchase channel) | New sentence; **not** added to `## Stack` or AD-5 | No — existing ICANN registrar (IANA 1636). Not a Kapsule / PG / Redis / Object Storage substitute |
| Repo slug `muslim-marriage-africa` is not the product name | Already true; now explicit | No |
| Nisfuddin, Nikahsira, Sakinaa, Mithaqun, Nonglem, `nisfdin` as **search history**; those domains **not** purchased | Prior shortlist text, now history | No — and not claimed as bought |
| OAPI/WIPO for AnKanu **not recorded as completed**; Q10 stays open | OQ-10 already open | No — correctly **not** closed |
| AD-22 Q9 resolved (name chosen); Q10 still open | AD-22 already bound open questions | No — config/branding, not schema |
| Deferred: trademarks + handles for AnKanu; name/domain locked 2026-10-03 (not an AD) | Deferred already had trademarks / handles | No |

No new framework, queue, host SKU, ASR model, payment aggregator, ORM, UUID library, hash library, DNS product pin, CDN, or CLI was named. Hostinger is the **domain registrar of record**, not a new compute/datastore SKU. Primary hosting remains Scaleway `fr-par` (AD-5). **AnKanu + ankanu.com are branding facts. They are not a tech decision.**

---

## Naming sentences — existence and honesty (reality-check, not a stack change)

Checked against live RDAP / IANA / Hostinger pages 2026-10-03. Training data and `.memlog.md` were not treated as evidence.

| Claim in the spine header / AD-22 / Deferred | Live source (2026-10-03) | Honest? |
| --- | --- | --- |
| Product name **AnKanu** (locked 2026-10-03) | Branding decision. Not a library. No npm / host SKU named AnKanu | Yes — branding fact, not stack |
| Domain **ankanu.com** purchased | Verisign RDAP HTTP **200**. `ldhName` `ANKANU.COM`. Registration `2026-10-03T05:05:28Z`. Expiration `2027-10-03T05:05:28Z`. Status `client transfer prohibited` | Yes — registered today; purchase-date claim matches RDAP registration date |
| Purchased **on Hostinger** | RDAP registrar handle **1636**, vCard `HOSTINGER operations, UAB`, related RDAP `https://rdap.hostinger.com/domain/ANKANU.COM`, about-link `http://www.hostinger.com`. IANA registrar-ids: `1636` **HOSTINGER operations, UAB**, status **Accredited**, RDAP `https://rdap.hostinger.com/`. `hostinger.com` and `hostinger.com/domains` HTTP 200 | Yes — Hostinger exists and is the registrar. Not invented. Not added to the stack table |
| Nisfuddin / Nikahsira / Sakinaa / Mithaqun / Nonglem / `nisfdin` **not purchased** | Verisign RDAP HTTP **404** for `nisfuddin.com`, `nikahsira.com`, `sakinaa.com`, `mithaqun.com`, `nonglem.com`, `nisfdin.com` | Yes — those `.com` names are **not registered**. Spine does **not** invent a purchased shortlist domain. **No naming flag** |
| OAPI/WIPO for AnKanu **not recorded as completed** | Header, AD-22 Q10, Deferred, companion OQ-10 all keep the filing **open** | Yes — no completed-filing claim. **No naming flag** |

Hostinger nameservers on the RDAP record are parking hosts (`AURORA.DNS-PARKING.COM`, `NEBULA.DNS-PARKING.COM`). That is registrar-default parking after a same-day buy. It does **not** move Member traffic off Scaleway `fr-par` and is not a stack pin.

**No new vendor/SKU was invented for the name.** Hostinger is a real accredited registrar used as the purchase channel. It is not an AD-5 host, not a Kapsule replacement, and not a Deferred SKU.

---

## Stack table — live registry / EOL today (residual only)

Verified line in the spine still says “Verified 2026-09-27 against npm registry, endoflife.date APIs, vendor docs, and official Whisper sources.” Live sources **2026-10-03** (independent of the earlier same-day entity-catalog pass):

| Spine pin (locked 2026-09-27) | Live source (2026-10-03) | Match? |
| --- | --- | --- |
| Node.js 24.21.0 Active LTS | endoflife.date/api/nodejs.json: cycle 24 `latest=24.21.0`, LTS since 2025-10-28, `support=2026-10-20`, EOL 2028-04-30. Cycle 26 Current `latest=26.10.0`; LTS start 2026-10-28 | Pin matches latest-24. Window is **17 days** — Residual 4 |
| TypeScript 7.0.2 | registry `typescript` `latest` → `7.0.2`. `@nestjs/cli` `latest` → **12.0.8** with dependency `typescript ~6.0.2` | Version exists. Nest CLI still cannot consume 7.0 as its compiler API — Residual 2 |
| Next.js 16.3.6 | registry `next` `latest` → **16.3.8** (tarball `next-16.3.8.tgz`). endoflife.date/api/nextjs.json cycle 16 `latest=16.3.8` | **Table stale — Residual 1** |
| React 19.3.0 | registry `react` `latest` → `19.3.0` | Yes |
| NestJS (`@nestjs/core`) 12.1.0 | registry `latest` → **12.1.2** (2026-09-30T09:06Z) | Patch drift — Residual 3 |
| Capacitor (`@capacitor/core`) 8.5.2 | registry `latest` → `8.5.2` | Yes — 9.x not on `latest` |
| Drizzle ORM 0.45.3 | registry `latest` → `0.45.3` | Yes |
| Prisma rejected as RC | registry `prisma` `latest` → **`8.0.0-rc.19`** | Yes — reject is still correct |
| PostgreSQL (Scaleway managed) 17.11 | endoflife.date cycle 17 `latest=17.11`. Upstream 18.6 exists and is **not** the host pin | Host pin still matches upstream-17 latest. Scaleway engine list **not** re-fetched today — Residual 5 |
| Redis (Scaleway managed) 8.6.3 | endoflife.date cycle 8.6 `latest=8.6.7`; cycle 8.10 `latest=8.10.2` | Host pin vs upstream lag, already Deferred. Scaleway page **not** re-fetched today — Residual 5 |
| BullMQ 6.3.9 | registry `latest` → **6.3.11** (2026-10-01T01:58Z). No newer `latest` on 2026-10-03 | Patch drift — Residual 3 |
| Socket.IO 4.8.4 | registry `latest` → `4.8.4` | Yes |
| Tailwind CSS 4.3.3 | registry `latest` → `4.3.3` | Yes |

Day-over-day vs the 2026-10-03 entity-catalog version-check: **no new stack drift**. Next `latest` is still 16.3.8; Nest still 12.1.2; BullMQ still 6.3.11; TypeScript `latest` still 7.0.2; Prisma still `8.0.0-rc.19`; `@nestjs/cli` still 12.0.8. The locked table has not been edited (correct under the lock). Naming did not touch `## Stack`.

Named technologies still exist and still fit: Next.js App Router PWA, Capacitor Android WebView shell, NestJS HTTP/WS, Drizzle over standard SQL, Socket.IO + Redis adapter, BullMQ, Scaleway Kapsule / Object Storage / Secret Manager (last host-page confirm 2026-10-02). Nothing in the table is a dead or renamed product.

Companion `SOLUTION-DESIGN.md` §4 still cites “planned 16.3.7 on 2026-09-30.” That sentence is the same stale floor as Residual 1. Naming update did not touch §4. **Do not bump.**

---

## What was not re-opened / not re-fetched today

- **AD-5** hosting/legal adequacy of France as a CIL destination. Scaleway Kapsule / managed PG / Redis / Object Storage / Secret Manager pages were last confirmed 2026-10-02. Not re-fetched 2026-10-03. Residual 5 only. Hostinger is **not** a host-region change.
- **AD-10** Chat delivery machine / `ModerationPort` methods. Naming did not touch them.
- **AD-11** Whisper honesty / lexicon/hold rules. Official `LANGUAGES` (no `mos`/`dyu`) was last raw-fetched 2026-10-02. Not re-fetched today. **AD-11 not reopened.**
- **AD-12 / AD-27 / AD-28 / AD-29** — not reopened.
- Payment-rail SKUs (CinetPay / PayDunya / FedaPay / Wave). Ports-only Deferred still holds.
- **AD-30** — not proposed.

---

## Findings

### Residual 1 — Next.js table is 16.3.6; live latest is 16.3.8; spine floor still 16.3.7

Independent check 2026-10-03 (unchanged since 2026-10-02):

- npm `next@latest` = **16.3.8**.
- endoflife.date cycle 16 `latest=16.3.8`.
- Spine table still pins **16.3.6**. Prose still says “do not scaffold below **16.3.7** after 2026-09-30.” Companion §4 still cites “planned 16.3.7 on 2026-09-30.”

**Stack is locked this run — do not edit the table.** Record only. The naming update did not touch Next. Builders at first `create-next-app` must still treat the live security floor as whatever `next@latest` is that day (16.3.8 as of this fetch). This is residual, not a fail.

### Residual 2 — TypeScript 7.0.2 is npm-latest; Nest CLI 12.0.8 still depends on TypeScript ~6

Spine: “TypeScript pin is 7.0.2 (ignore Nest schematic ‘TypeScript 6’).” Live today:

- `typescript@latest` = **7.0.2**.
- `@nestjs/cli@latest` = **12.0.8**, dependency `typescript ~6.0.2`.

The pin is not fake. The CLI/compiler-API mismatch is still live. **Do not bump. Do not dual-pin in the spine.** Implementation note only (starter contract), already recorded on 2026-10-02. Naming did not touch this.

### Residual 3 — Nest and BullMQ patch pins drifted since 2026-09-27 (no further drift since 2026-10-02)

- `@nestjs/core` 12.1.0 → live **12.1.2** (2026-09-30T09:06Z).
- `bullmq` 6.3.9 → live **6.3.11** (2026-10-01T01:58Z; still latest on 2026-10-03).

Same major. Fits unchanged. Locked — record only.

### Residual 4 — Node 24 Active support ends 2026-10-20 (17 days)

Pin 24.21.0 is still cycle-24 latest. endoflife.date `support` for cycle 24 is **2026-10-20**; Node 26 LTS starts **2026-10-28**. Spine already says revisit 24-maintenance vs 26-LTS if first prod cut is after 2026-10-28. Still accurate. Locked — record only.

### Residual 5 — Host SKUs and Whisper `LANGUAGES` were not re-fetched today

Naming-only update. AD-5 / AD-11 locked. Scaleway managed-engine pages and official Whisper `tokenizer.py` were last independently fetched **2026-10-02**. Upstream EOL still shows PG 17.11 / Redis 8.6.x latest 8.6.7. The finding that those vendor pages were not re-verified on 2026-10-03 is **residual, not a fail**, per this lens.

---

## Checked and not flagged (naming / stack)

- **AnKanu + ankanu.com** are branding facts. RDAP 200 on 2026-10-03; registration date matches the lock date. **Not stack.**
- **Hostinger** is IANA registrar 1636 (`HOSTINGER operations, UAB`, Accredited). Purchase-channel sentence is real. **No new vendor/SKU invented.** Not added to `## Stack`. AD-5 host remains Scaleway `fr-par`.
- Shortlist names are history only. Spine **does not** invent a purchased Nisfuddin / Nikahsira / Sakinaa / Mithaqun / Nonglem / `nisfdin` domain. Matching `.com` RDAP is 404.
- OAPI/WIPO for AnKanu is **not** claimed completed. Q10 / Deferred stay open.
- Prisma `latest` still RC (`8.0.0-rc.19`); reject remains correct.
- React 19.3.0, Capacitor 8.5.2, Drizzle 0.45.3, Socket.IO 4.8.4, Tailwind 4.3.3 — npm `latest`.
- No in-repo starter versions to contradict the table.
- No AD-30. AD-10 / AD-11 / AD-12 / AD-27 / AD-28 / AD-29 not reopened.

## What this lens did not re-open

AD-5 legal adequacy of France as a CIL destination, AD-10 Chat delivery machine, AD-11 operational lexicon/hold rules, AD-12 grant grain, AD-27 reach-mode core, AD-28 card/grid, AD-29 message cap, latency as a product bet, payment-rail SKU choice, **stack pin edits**, and **AD-30**. Those are other lenses or locked.

## Top findings (for the parent return)

1. Residual — Next table 16.3.6 and “do not scaffold below 16.3.7” are stale vs live **16.3.8**. Unchanged since 2026-10-02. Locked — no bump.  
2. Residual — TypeScript 7.0.2 is npm-latest but `@nestjs/cli` 12.0.8 still depends on `typescript ~6.0.2`. Locked — no bump.  
3. Residual — `@nestjs/core` 12.1.2 and `bullmq` 6.3.11 are live vs table 12.1.0 / 6.3.9 (no further drift since 2026-10-02).  
4. Residual — Node 24 Active support ends 2026-10-20 (17 days; spine already has the revisit date).  
5. Residual — Scaleway host pages and Whisper `LANGUAGES` were not re-fetched today (AD-5 / AD-11 locked). Naming itself introduced **no new vendor tech**; AnKanu + ankanu.com are branding facts (RDAP 200, Hostinger IANA 1636). No invented shortlist-domain purchase. OAPI/WIPO not claimed completed.
