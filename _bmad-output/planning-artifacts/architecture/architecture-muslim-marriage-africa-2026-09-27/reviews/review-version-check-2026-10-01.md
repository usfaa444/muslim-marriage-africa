# Version-check / reality-check (finalize)

**Verdict:** pass-with-findings  
**Date:** 2026-10-01  
**Artifact:** `ARCHITECTURE-SPINE.md` (updated 2026-10-01; status `final`)  
**Companion (context only):** `SOLUTION-DESIGN.md`  
**Lens:** every committed stack / hosting / ASR / vendor-port decision must be live-web-verified or checked against the existing project/starter — not asserted from training data or from `.memlog.md`.  
**Constraint this run:** stack is **LOCKED**. Stale pins are flagged low/medium only. Do not demand spine stack edits. Extra attention: AD-10 / AD-11 Whisper honesty (`mos`/`dyu` absent) and `ModerationPort` remaining vendor-swappable.

**Method (this review, independent):** `registry.npmjs.org/{pkg}` `dist-tags` + publish times; `endoflife.date/api/{nodejs,postgresql,redis,nextjs}.json`; official Next.js *September 2026 Security Release* (nextjs.org/blog/september-2026-security-release); Scaleway managed PostgreSQL and Managed Redis product pages; Scaleway feature-request “Postgres 18”; official Whisper `whisper/tokenizer.py` on GitHub `main`; Hugging Face `bivariant/Griot-ASR-W-0.8-ALL` model card; Hugging Face `burkimbia/BIA-WHISPER-LARGE-SACHI_V{1,2,3}`; OpenAI File transcription docs (`whisper-1` vs `gpt-transcribe` language rules); Nest CLI issues #3477 / #3479 (TypeScript 7 programmatic API); Capacitor npm `latest` / `next` tags. Memlog was read for claimed sources only; it was not treated as evidence. There is **no** `package.json` / starter in this repo to ratify against — greenfield.

---

## Stack table — independent live pins (2026-10-01)

Verified line in the spine still says “Verified 2026-09-27 …”. Live registry/EOL/vendor today:

| Spine pin | Live source (2026-10-01) | Match? |
| --- | --- | --- |
| Node.js 24.21.0 Active LTS | endoflife.date/api/nodejs.json: cycle 24 `latest=24.21.0`, LTS since 2025-10-28, `support=2026-10-20`, EOL 2028-04-30. Cycle 26 is Current (`latest=26.10.0`); LTS start 2026-10-28 | Yes. Window is short — Finding 4 |
| TypeScript 7.0.2 | registry.npmjs.org/typescript `latest` → `7.0.2` (2026-07-08) | Version exists. Nest CLI cannot consume it — Finding 2 |
| Next.js 16.3.6 | registry `latest` → **16.3.8** (2026-09-30T16:07Z). 16.3.7 published 2026-09-29 (bug-fix only). endoflife.date/api/nextjs.json cycle 16 `latest=16.3.8`. Official post: patch **16.3.8**, not 16.3.7 | **Table stale — Finding 1** |
| React 19.3.0 | registry.npmjs.org/react `latest` → `19.3.0` (2026-09-09) | Yes |
| NestJS `@nestjs/core` 12.1.0 | registry `latest` → **12.1.2** (2026-09-30) | Patch drift — Finding 3 |
| Capacitor `@capacitor/core` 8.5.2 | registry `latest` → `8.5.2` (2026-09-11). `next` = `9.0.0-alpha.7` (2026-09-18). Ionic: GA targeted end of Nov 2026 | Yes — 9.x correctly avoided |
| Drizzle ORM 0.45.3 | registry `latest` → `0.45.3` (2026-09-21) | Yes |
| Prisma rejected as RC | registry `latest` → `8.0.0-rc.19` (was rc.17 on 2026-09-27) | Yes — reject is still correct |
| PostgreSQL (Scaleway managed) 17.11 | endoflife.date cycle 17 `latest=17.11`. Scaleway product page: engines **14, 15, 16, 17**. Feature request “Postgres 18”: still **Planned Q4 2026**. Upstream 18.6 exists and is not the host pin | Yes — host pin, not upstream-latest |
| Redis (Scaleway managed) 8.6.3 | Scaleway Managed Redis product page: **Version 8.6.3**. endoflife.date cycle 8.6 `latest=8.6.7`; cycle 8.10 `latest=8.10.2` | Yes — host pin. Upstream 8.6.7 is a host lag, already deferred |
| BullMQ 6.3.9 | registry `latest` → **6.3.11** (2026-10-01T01:58Z) | Patch drift — Finding 3 |
| Socket.IO 4.8.4 | registry `latest` → `4.8.4` (2026-09-25) | Yes |
| Tailwind CSS 4.3.3 | registry `latest` → `4.3.3` (2026-07-16) | Yes |
| Hosting Scaleway `fr-par` | Kapsule, managed PG, managed Redis, Object Storage, Secret Manager still listed for Paris | Yes |

Named technologies still exist and still fit the job: Next.js App Router PWA, Capacitor Android WebView shell, NestJS HTTP/WS, Drizzle over standard SQL, Socket.IO + Redis adapter, BullMQ, Scaleway Kapsule / Object Storage / Secret Manager. Nothing in the table is a dead or renamed product.

Greenfield starter contract in the spine (oxlint, Nest Vitest, ESM `apps/api`, “ignore Nest schematic TypeScript 6”, “do not scaffold below 16.3.7 after 2026-09-30”) was recorded after the 2026-09-27 version-check. The Next floor and the TS-6 ignore line are the two sentences that live evidence now contradicts or under-states. Stack stays locked; see Findings 1–2.

---

## AD-10 / AD-11 — Whisper honesty and ModerationPort swap

This is the extra-attention pass. Claims checked against live sources, not the 2026-09-27 review.

### Official Whisper still has no `mos` / `dyu`

Live `github.com/openai/whisper` `main` `whisper/tokenizer.py` `LANGUAGES` (fetched 2026-10-01): 99 codes. **`fr` is present. `mos` is absent. `dyu` is absent.** `TO_LANGUAGE_CODE` aliases also have neither. `get_tokenizer` raises `Unsupported language` for codes outside that map.

OpenAI File transcription docs (developers.openai.com, 2026-10-01): `whisper-1` “consult the Whisper language list”; `gpt-transcribe` accepts ISO 639-1 plus *selected* ISO 639-3 (`eng`, `spa`, `yue`, `cmn`, …) and rejects unsupported codes. **No published `mos` or `dyu` support.** Recommended new-work model is `gpt-transcribe`, not Whisper — that is a vendor SKU shift *inside* an adapter, not a coverage claim for Mooré/Dioula.

AD-11’s sentence “official Whisper `LANGUAGES` has no `mos`/`dyu`” is still true today. It is not a training-data leftover.

### Community / Preview models still exist and are still not SLA coverage

- **Griot-ASR-W-0.8-ALL** (`huggingface.co/bivariant/Griot-ASR-W-0.8-ALL`, live card): `dyu` Dioula and `mos` Mooré / Mossi are **Preview (améliorations continues)**, not Disponible. Preview languages have **no public CER/WER**. Card itself says Preview models are “pleinement fonctionnels pour l'inférence” with iterative updates — that is still Preview, not a production SLA. AD-11 treating them as low-confidence adapters is honest.
- **BurkimbIA** `BIA-WHISPER-LARGE-SACHI_V1/V2/V3` still exist on Hugging Face (`burkimbia/…`). V2/V3 last updated 2025-09-07. Cards: community Moore fine-tunes; **“This model isn't deployed by any Inference Provider.”** No SLA. AD-11 holds.
- Additional community Moore fine-tunes exist (e.g. `Dama12/whisper-small-moore`). They do not change the honesty rule.

### AD-11 operational rule still matches the evidence

- Local-language path = moderator lexicon + human review on the **passive-scan** path (not a pre-delivery hold). Matches Whisper’s missing codes and Griot’s Preview status.
- Low confidence or language `mos`/`dyu` → **flag or `scan-deferred`**, not a Voice-note hold. Official Whisper will **never emit** `mos`/`dyu` (those keys are not in `LANGUAGES`). The `mos`/`dyu` trigger therefore fires only when a community adapter or a locale hint declares those ISO 639-3 codes — which is exactly the “may be adapters but treated as low-confidence” clause. Not a fake Whisper capability.
- “French commercial ASR is allowed only for `fr`” still fits: `fr` is on the official list; commercial `gpt-transcribe` / `whisper-1` must not be advertised as Mooré/Dioula coverage.
- “Measure false-negative rate on a labeled sample” remains the right residual: official Whisper will mis-tag Mooré/Dioula as some other language (often `fr`) and the `mos`/`dyu` branch will not fire. That is a measurement obligation, not a coverage claim.

**AD-11 still honestly describes Whisper.** No finding.

### AD-10 `ModerationPort` remains vendor-swappable

Checked in the spine, not inferred:

- AD-10 names a **port** (`scanText`, `scanImage`, `transcribe`, `classifyAudio`) “so vendors stay swappable.” No SKU, no OpenAI model id, no Hugging Face repo is bound on the Chat path.
- Deferred: “Specific KYC / SMS / **moderation** / aggregator SKUs — ports only; **one live adapter per port** chosen at implementation.”
- AD-11 allows Griot / BurkimbIA as **adapters** and keeps them low-confidence. That is a swap path, not a lock-in.
- “French commercial ASR is allowed only for `fr`” is a **coverage constraint** on whichever adapter is live, not a Whisper-only type on the port. ISO 639-3 `mos`/`dyu` on the port interface is vendor-neutral (Whisper itself uses 639-1 and cannot emit those codes).
- One live adapter per `ModerationPort` means compose Whisper-for-`fr` + lexicon-for-`mos`/`dyu` **inside** the adapter facade. That preserves swap: replace the facade, not the domain.

**`ModerationPort` is still honestly vendor-swappable.** No finding. Risk to watch at implementation (out of this lens): baking `whisper-1` language enums into `packages/ports` would freeze the port to Whisper’s 99-code set. The spine does not do that today.

---

## Hosting / rails — spot-check that named products still exist

- **Scaleway `fr-par`:** managed PG 14–17, managed Redis 8.6.3, Kapsule, Object Storage, Secret Manager — live product pages. PG 18 still Planned Q4 2026. Spine host pins match.
- **Capacitor vs TWA / FLAG_SECURE:** not re-litigated; Capacitor 8.5.2 is still the stable line; 9.x is alpha. Fit unchanged.
- **Redis 8 tri-license + Valkey:** deferred escape hatch still real. Host engine is 8.6.3, as the spine now says.
- **No in-repo starter** to contradict CLI defaults. The recorded greenfield contract (oxlint, Vitest, ESM) is still the right kind of lock; the Next floor and TS-6 ignore line need the findings below.

CIL statute, payment-rail SKUs, Virtix, and AWS region list were not the extra-attention target this run. Prior 2026-09-27 version-check verified them; nothing in today’s stack or Whisper pass required reopening them.

---

## Findings

### 1. Medium — Next.js table is 16.3.6; live Active LTS is 16.3.8, and the spine’s own 16.3.7 floor is the unpatched build

Independent check 2026-10-01:

- npm `next@16.3.6` = 2026-09-22 (out-of-band `next/og` RCE).
- npm `next@16.3.7` = 2026-09-29 — **bug-fix only**.
- npm `next@16.3.8` = 2026-09-30 — official *September 2026 Security Release* (high Image Optimization SSRF; five medium cache/metadata issues; one low `next dev` MCP disclosure). Official install line is `npm install next@16.3.8`. **16.3.7 does not contain these fixes** (CVE-2026-103004 lists 16.3.0–16.3.7 as affected for the nested `use cache` leak).

Spine table still pins **16.3.6**. Prose says “current as of 2026-09-27; do not scaffold below **16.3.7** after 2026-09-30.” That floor is now the last *vulnerable* 16.3 patch. Companion `SOLUTION-DESIGN.md` § stack still cites “planned 16.3.7 on 2026-09-30.”

Stack is locked this run — do not edit the table. Builders must still scaffold **16.3.8+** (or whatever `next@latest` is at first `create-next-app`). The recorded floor is the stale artifact.

### 2. Medium — TypeScript 7.0.2 is npm-latest, but Nest CLI cannot run `nest build` / `nest start` on it

Spine: “TypeScript pin is 7.0.2 (ignore Nest schematic ‘TypeScript 6’).” The schematic mismatch was reality-checked. The **compiler-API** mismatch was not.

Live Nest CLI issues #3477 / #3479 and the #3478 fail-fast guard: TypeScript 7.0 ships `tsc` only; `getParsedCommandLineOfConfigFile` / `createProgram` are undefined. `@nestjs/cli` `nest build` / `nest start` (tsc **and** SWC type-check hosts) fail until the programmatic API returns in **7.1**, or the project dual-pins `typescript` → `@typescript/typescript6` and type-checks 7 via a separate `tsc --noEmit`. Microsoft’s own 7.0 notes match this.

The pin is not fake. The “ignore TS 6” sentence under-states a hard CLI incompatibility. Stack stays locked. Implementation can keep 7.0.2 for typecheck and use the documented dual-pin / SWC-without-CLI-typecheck path — that is a starter-contract note, not a stack change.

### 3. Low — Nest and BullMQ patch pins drifted since 2026-09-27

- `@nestjs/core` 12.1.0 → live **12.1.2** (2026-09-30).
- `bullmq` 6.3.9 → live **6.3.11** (2026-10-01).

Same major. Fits unchanged. Locked stack — record only.

### 4. Low — Node 24 Active support ends 2026-10-20

Pin 24.21.0 is still cycle-24 latest. endoflife.date `support` for cycle 24 is **2026-10-20**; Node 26 LTS starts **2026-10-28**. Spine already says revisit 24-maintenance vs 26-LTS if first prod cut is after 2026-10-28. Still accurate; window is 19 days from this review.

---

## Checked and not flagged as stale

- AD-11 official Whisper `LANGUAGES`: no `mos`, no `dyu`; `fr` present. Confirmed on GitHub `main` 2026-10-01.
- Griot-ASR `mos`/`dyu` still Preview; BurkimbIA still community / no inference-provider SLA.
- OpenAI commercial transcription does not publish `mos`/`dyu` support; `whisper-1` still defers to the Whisper list.
- AD-10 `ModerationPort` methods + Deferred “ports only / one live adapter” — vendor-swappable; no SKU bound.
- React 19.3.0, Capacitor 8.5.2, Drizzle 0.45.3, Socket.IO 4.8.4, Tailwind 4.3.3 — npm `latest`.
- Prisma `latest` still RC (`8.0.0-rc.19`); reject remains correct.
- Scaleway managed PG **17.11** / Redis **8.6.3** match the host pages (the 2026-09-27 high findings are closed on this spine).
- PG 18 still Planned Q4 2026; UUIDv7-in-`packages/kernel` still the right host workaround.
- Capacitor 9 remains `next` alpha (`9.0.0-alpha.7`); 8.5.2 is the stable pin.
- No in-repo starter versions to contradict the table.

## What this lens did not re-open

Legal adequacy of France as a CIL destination, latency as a product bet, payment-rail SKU choice, AD-12 leftover `pending`/`held` nouns, and who INSERTs an AI-originated `moderation_case` are other lenses. Stack edits are forbidden this run.

## Top findings (for the parent return)

1. Medium — Next table 16.3.6 and “do not scaffold below 16.3.7” are stale: live security floor is **16.3.8**; 16.3.7 is unpatched.  
2. Medium — TypeScript 7.0.2 is npm-latest but Nest CLI cannot `nest build`/`start` on it until 7.1 (dual-pin workaround exists).  
3. Low — `@nestjs/core` 12.1.2 and `bullmq` 6.3.11 are live vs table 12.1.0 / 6.3.9.  
4. Low — Node 24 Active support ends 2026-10-20 (spine already has the revisit date).  
5. (Not a finding) AD-10/AD-11 Whisper “no `mos`/`dyu`” and `ModerationPort` swap both hold against live sources.
