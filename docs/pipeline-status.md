# Pipeline status

| Phase | Status | Commit |
|---|---|---|
| 0 Setup (BMAD v6.12.0 bmm + cursor, git, GitHub remote) | done | 4a9d259 |
| 1a Farata teardown (`docs/competitor-farata.md`) + 1b names/RDAP (`docs/name-options.md`) | done | d6d7d63 |
| 1c Headless bmad-brainstorming (153 ideas, 4 techniques) | done | 65bb352 |
| 1c amend (must-have #5 + Android to MVP MUST) | done | 2a13408 |
| 2 Product brief (`_bmad-output/planning-artifacts/briefs/brief-muslim-marriage-africa-2026-09-27/`) | done | 9e9842e |
| 3 PRD | **not started** (awaiting go-ahead) | — |

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
