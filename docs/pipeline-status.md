# Pipeline status

| Phase | Status | Commit |
|---|---|---|
| 0 Setup (BMAD v6.12.0 bmm + cursor, git, GitHub remote) | done | 4a9d259 |
| 1a Farata teardown (`docs/competitor-farata.md`) + 1b names/RDAP (`docs/name-options.md`) | done | d6d7d63 |
| 1c Headless bmad-brainstorming (153 ideas, 4 techniques) | done | 65bb352 |
| 1c amend (must-have #5 + Android to MVP MUST) | done | 2a13408 |
| 2 Product brief (`_bmad-output/planning-artifacts/briefs/brief-muslim-marriage-africa-2026-09-27/`) | done | 9e9842e |
| 3 PRD (`_bmad-output/planning-artifacts/prds/prd-muslim-marriage-africa-2026-09-27/`) | done | 91a9b87 |
| 4 UX (`_bmad-output/planning-artifacts/ux-designs/ux-muslim-marriage-africa-2026-10-01/`) | done (was skipped; run 2026-10-01 after architecture) | d0b46c2 |
| 4 Architecture (`_bmad-output/planning-artifacts/architecture/architecture-muslim-marriage-africa-2026-09-27/`) | done | d01469e |
| 6 Epics & stories (`_bmad-output/planning-artifacts/epics.md`) | done (12 epics, 98 stories; ready for development) | b67d789 |
| 7 Sprint planning / implementation | **not started** | — |
| Amendment 2026-10-01: passive AI moderation (PRD + architecture + brief updated in place; brainstorm/competitor/system-idea corrected) | done | e310bf3 |

## bmad-help answer after Phase 1 (2026-09-27 ~21:22 ET, model cursor-grok-4.6-high-fast)

> **You are in BMad Method, plan phase.** Brainstorming is done. There is no `_bmad-output/planning-artifacts/` folder, so no brief, PRD, or architecture yet.
> 
> **Next (optional, recommended):** [CB] **Create Brief** — `bmad-product-brief`  
> A guided conversation that captures your product idea in a brief. A gentler alternative to the PRFAQ when you are already committed to your concept.  
> Args: `-A`
> 
> **Why:** The catalog’s plan sequence is brainstorm → brief (or PRFAQ) → PRD. `bmad-prd` is the next *required* skill and is preceded-by `bmad-product-brief`. You already have a committed concept plus brief bindings in `brainstorm-intent.md`, so the brief is the right next step — not `bmad-prd` yet, and not `bmad-prfaq` (that is the Working Backwards alternative when the concept still needs pressure-testing).
> 
> **Inputs to feed `bmad-product-brief`:**
> - `_bmad-output/brainstorming/brainstorm-muslim-marriage-africa-2026-09-27/` (`brainstorm-intent.md`, `brainstorm.html`, `.memlog.md`)
> - `docs/system-idea.md`
> - `docs/competitor-farata.md` (parity P1–P59, differentiators D1–D23)
> - `docs/name-options.md`
> 
> **After the brief (required):** [PRD] **Create Edit and Review PRD** — `bmad-prd`
> 
> Run `bmad-product-brief` in a **fresh context window**.


## bmad-help answer after Phase 2 (2026-09-27 ~21:30 ET, model cursor-grok-4.6-high-fast)

> You are in **BMad Method, phase 2-planning**. Brainstorming and the product brief are complete. No PRD, UX, or architecture exists yet.
> 
> **Next (required):** [PRD] **Create Edit and Review PRD** — `bmad-prd`  
> Create a new PRD through guided discovery. Preceded-by `bmad-product-brief`. Required before UX, architecture, and later plan/ship steps.
> 
> **Why:** The catalog sequence is brief → PRD → (optional UX) → architecture. The brief is `status: complete`, so the next required skill is `bmad-prd`. Skip `bmad-ux` and `bmad-architecture` until the PRD exists. `bmad-spec` is an anytime shortcut, not the required path for this launch-stakes product.
> 
> **Inputs for `bmad-prd` (extract, don’t ingest):**
> - Primary: `_bmad-output/planning-artifacts/briefs/brief-muslim-marriage-africa-2026-09-27/` (`brief.md`, `addendum.md`, `.memlog.md`)
> - Also: `_bmad-output/brainstorming/brainstorm-muslim-marriage-africa-2026-09-27/` (`brainstorm-intent.md`, `brainstorm.html`, `.memlog.md`)
> - Also: `docs/system-idea.md`, `docs/competitor-farata.md`, `docs/name-options.md`
> 
> **Optional before PRD (not required):** [RS] `bmad-deep-recon` if you want extra market/legal/user-voice research; [AE] `bmad-advanced-elicitation` if you want to harden the brief first.
> 
> Run `bmad-prd` in a **fresh context window**.


## bmad-help answer after Phase 3 (2026-09-27 ~21:56 ET, model cursor-grok-4.6-high-fast)

> You are in **BMad Method, phase 2-planning**. Brainstorming, the product brief, and the PRD (`status: final`) are done. No UX, architecture, or epics exist yet.
> 
> **Next (optional, recommended):** [CU] **Create UX** — `bmad-ux`  
> Capture UX decisions into `DESIGN.md` (how it looks) and `EXPERIENCE.md` (how it behaves). Strongly recommended when a UI is a major part of the project. Preceded-by `bmad-prd`.
> 
> **Why:** The catalog sequence is PRD → UX (if UI-major) → architecture. This product is UI-major (French-first web/PWA/Android, Lite mode, blur/Reveal, Mahram-in-Chat, named journeys). Architecture is offered once a PRD exists **plus UX if present**, so UX should land first. The PRD itself defers visual direction, polygamy-disclosure UX, and fail-closed UX to this step.
> 
> **Inputs for `bmad-ux`:**
> - Primary: `_bmad-output/planning-artifacts/prds/prd-muslim-marriage-africa-2026-09-27/` (`prd.md`, `addendum.md`, reconcile/review files)
> - Also: `_bmad-output/planning-artifacts/briefs/brief-muslim-marriage-africa-2026-09-27/`
> - Also: `_bmad-output/brainstorming/brainstorm-muslim-marriage-africa-2026-09-27/` (visual keepsake: indigo/sand/gold, mihrab, *sira*)
> - Also: `docs/system-idea.md`, `docs/competitor-farata.md`, `docs/name-options.md`
> 
> **After UX (required):** [CA] **Architecture** — `bmad-architecture`  
> Inputs: the final PRD plus the UX spines. Then `bmad-create-epics-and-stories`.
> 
> Run `bmad-ux` in a **fresh context window**.

## bmad-help after Phase 4 (architecture) — 2026-09-27 22:09 EDT

UX skipped by user choice. Architecture: hexagonal modular monolith, AD-1..AD-26, Scaleway fr-par `[ASSUMPTION — legal review]`, trace FR 143/143 + NFR 9/9.

> **Where you are:** BMad Method planning. Brainstorm, product brief, PRD (`status: final`), and architecture (`ARCHITECTURE-SPINE.md` `status: final` + `SOLUTION-DESIGN.md`) are done. UX was skipped on purpose. No epics/stories yet.
>
> **Optional (skipped, not a gate):** `[CU]` **Create UX** — `bmad-ux`. Recommended when UI is a major part of the product; `required=false`. Stay skipped unless you want design/experience docs before stories.
>
> **Next required:** `[CE]` **Create Epics and Stories** — `bmad-create-epics-and-stories`
>
> Breaks the PRD and architecture into epics and user stories with acceptance criteria. It is the next required planning skill (`preceded-by: bmad-architecture`). Sprint planning (`bmad-sprint-planning`) comes after this, not before.
>
> **Inputs it should take:**
> - PRD: `_bmad-output/planning-artifacts/prds/prd-muslim-marriage-africa-2026-09-27/` (`prd.md`, plus addenda/polish)
> - Architecture: `_bmad-output/planning-artifacts/architecture/architecture-muslim-marriage-africa-2026-09-27/` (`ARCHITECTURE-SPINE.md`, `SOLUTION-DESIGN.md`)
> - No UX folder (none exists)
> - Brief/brainstorm only as supporting context if the skill scans `planning_artifacts` / `docs`
>
> Run it in a **fresh context window**. After CE finishes, the next required skill is `bmad-sprint-planning`.

## Amendment 2026-10-01 — passive AI moderation (ET)

Locked decision from Maitchibi Fayçal. AI moderation is passive: chat text, chat photos, voice notes, and flashes are delivered immediately. The AI then flags red flags for an admin, who chooses warning, suspend, or another action. The AI does not block, hold, or delay delivery. AI outage records scan-deferred; it does not hold the message. Photo blur/reveal and mahram read-only are unchanged. Profile photos and bio stay publish-gated (FR-065).

bmad-help (before the rewrite): use `bmad-prd` **update**, then `bmad-architecture` **update**, in the existing folders. `bmad-correct-course` does not apply before epics exist.

BMAD rewrote the PRD (`FR-062`–`FR-068`, `NFR-003`, new `FR-144`), the architecture (`AD-10`, `AD-11`), and the brief. Brainstorm has no update workflow, so `brainstorm-intent.md`, `brainstorm.html`, `docs/competitor-farata.md` D4, and a banner on `docs/system-idea.md` were corrected by hand. Epics, stories, and UX were not started.

## bmad-help before Phase 5 UX — 2026-10-01 ~21:44 ET

> **`bmad-ux`** — **Create** (not Update). This is not `bmad-create-epics-and-stories`.
>
> Output folder: `_bmad-output/planning-artifacts/ux-designs/ux-muslim-marriage-africa-2026-10-01/`
>
> Run `bmad-ux` in a fresh context. Stop after UX. Do not start epics.

UX spines are `DESIGN.md` and `EXPERIENCE.md` (status final). Passive moderation is a banned chat state. Epics were not started. Headless status was `partial` only because PRD open questions stay open.

## bmad-help before Phase 6 epics — 2026-10-01 ~21:58 ET

> **Next required step:** `[CE]` **Create Epics and Stories** — `bmad-create-epics-and-stories`.
> **Output:** `_bmad-output/planning-artifacts/epics.md`
> UX exists, so epics may start. Do not start sprint planning after it.

Epics file is the build index. Recommended next skill written in the file, not run: `bmad-help`. Sprint planning was not started.

## Phase 7 hand-back

Planning pack is complete: brainstorm, brief, PRD, architecture, UX, epics and stories. Implementation was not started. A later build may use a Cloud Agent only if the user asks. Do not auto-start.
