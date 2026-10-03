> **Name lock 2026-10-03 (Maitchibi Fayçal via Harris).** Product name is **AnKanu**. Domain **ankanu.com** purchased on Hostinger. Sentences below that say the product name is TBD, undecided, or a live shortlist are historical for this review. Those shortlist domains were not bought.

# Editorial review — DESIGN.md + EXPERIENCE.md

**Content:** `DESIGN.md` (1,781 words), `EXPERIENCE.md` (6,505 words). Combined 8,286 words. Counts from `word_metrics.py`.
**Class:** docs. **Lenses:** structure, then prose. **Reader:** humans. **Style guide:** Microsoft Writing Style Guide.
**No length target** was provided.

**Purpose read:** These two spines exist to help implementers and reviewers (design, engineering, QA) build and verify a Burkina-first ta'aruf visual system and behavioral contract — without inventing dating-app chrome, a product name, or a Chat hold.

**Structure models:** `DESIGN.md` matches **Reference/Database** (token and component catalog) with a short Explanation opener (Brand & Style), in the locked Google Labs section order. `EXPERIENCE.md` is a hybrid **Reference/Database** (IA, components, states) plus **Tutorial/Guide** (Key Flows). The hybrid matches the job: jump-to-a-surface tables, then named journeys. The shape does not fight the purpose.

**Standing constraints (caller):** Content is sacrosanct. Do not change locked product decisions: passive AI, TBD name, open A1–A3, no Chat hold. The Traceability table must stay.

**Style to preserve (prose):** Telegram-spec fragments, French UI in guillemets, `{token}` references, role capitals (Sister, Brother, Chat, Lite), product term *Favourites*, UJ titles as in the PRD (including *honours*), quiet brand lines in Brand & Style, and every locked anti-dating / no-hold / TBD sentence. This pass does not rewrite the pair into conversational second person.

**Frontmatter, YAML tokens, and table markup** were not copy-edited.

## Word counts

### DESIGN.md — 1,781

| Heading | Words |
|---|---|
| (preamble / YAML) | 285 |
| TBD — Visual identity | 27 |
| Brand & Style | 105 |
| Colors | 352 |
| Typography | 57 |
| Layout & Spacing | 83 |
| Elevation & Depth | 51 |
| Shapes | 70 |
| Components | 584 |
| Do's and Don'ts | 138 |

### EXPERIENCE.md — 6,505

| Heading | Words |
|---|---|
| (preamble) | 19 |
| TBD — Experience spine | 33 |
| Foundation | 104 |
| Information Architecture (intro) | 44 |
| Public | 220 |
| Identity and onboarding | 248 |
| Member core | 620 |
| Mahram | 209 |
| Staff | 267 |
| NEXT — out of MVP | 86 |
| Voice and Tone | 197 |
| Component Patterns | 639 |
| State Patterns | 1,009 |
| Interaction Primitives | 115 |
| Accessibility Floor | 157 |
| Responsive & Platform | 84 |
| Inspiration & Anti-patterns | 75 |
| Open questions (do not close) | 179 |
| Key Flows (intro) | 12 |
| UJ-1 … UJ-6 | 1,275 |
| Traceability | 782 |

## Findings

| Pass | Original Text | Revised Text | Changes |
| --- | --- | --- | --- |
| structure | EXPERIENCE.md Foundation / Layout vs Responsive — staff breakpoint written three ways: “two-pane 1024+ … Below 768 it stacks” (DESIGN.md §Layout & Spacing, 83 words); “Two-pane from 768px; stacked below” (EXPERIENCE.md §Foundation); “Staff: 1024 two-pane; \<768 queue stacks above case” (EXPERIENCE.md §Responsive & Platform) | QUESTION — pick **one existing phrasing** and reuse it in all three places. Do not invent a new breakpoint. | Same layout rule, three wordings. A builder cannot tell whether two-pane starts at 768 or 1024. Harmonize expression only; do not change the product decision. (0 words) |
| structure | EXPERIENCE.md §Information Architecture Implements cells — 56 “See [prd.md …] and [ARCHITECTURE-SPINE.md …]” links (~309 words) across ~60 surface rows | CONDENSE Implements to FR / NFR / AD **codes only**. Leave the full PRD and architecture links in §Traceability (required). | True duplicate navigation. Codes still sit next to Purpose; links live in one table. Tables become scannable. (saves ~309 words) |
| structure | EXPERIENCE.md §Key Flows — six “Implements FR-… See [prd.md §2.3 UJ-n] …” paragraphs before the steps (~126 words) | CONDENSE each to a one-line source pointer (`See prd.md §2.3 UJ-n` + architecture AD). Keep the `→ FR-…` tags on the steps. | FR laundry lists delay the persona and climax. Coverage stays on the steps and in Traceability. (saves ~80 words) |
| structure | DESIGN.md §Components — undifferentiated 584-word bullet wall | MOVE the same bullets into labeled groups inside this section (entry/identity, discovery/photos, path/chat, staff, commerce/system). Do not drop or rewrite rules. | Pacing/scan for humans. Word impact about **+20** for headings. |
| structure | EXPERIENCE.md L17 “Spines win on conflict with `mockups/`.” and L39 “Spines win on conflict with every mock.” | CONDENSE — keep one sentence at the top of the spine (polish attached below). Drop the IA repeat. | Identical claim twice. (saves ~8 words) |
| structure | EXPERIENCE.md §Traceability (~782 words) | PRESERVE — do not cut, merge, or move. | Caller-required index. One row per MVP screen. IA Purpose / Reached from stay in IA; this table stays the link home. |
| structure | Repeated no-hold / TBD / A1–A3 / passive-AI lines in Voice, Components, State Patterns, Interaction Primitives, Inspiration, Do's and Don'ts, and the UJs; also §Key Flows and §State Patterns as wholes | PRESERVE | Looks repetitive; it is reinforcement of locked landmines plus required spine sections. Cutting them would trade a landmine for brevity. YAML tokens (DESIGN preamble, 285 words) stay. |
| prose | Farata-class grid + invite + blur *existence* (Offered (seen) [bundle]) — raised to per-viewer Reveal/Revoke. | Farata-class grid, invite, and blur as a product pattern — raised to per-viewer Reveal/Revoke. | Leftover research jargon. Same lift, readable. (EXPERIENCE.md §Inspiration & Anti-patterns) |
| prose | Member bottom nav: **Découvrir · Invitations · Discussions · Profil**. `[ASSUMPTION]` labels. | Member bottom nav: **Découvrir · Invitations · Discussions · Profil**. The French labels are `[ASSUMPTION]`. | Fragment did not say what was assumed. (EXPERIENCE.md §Information Architecture) |
| prose | Per-file captions sit on the matching IA row. | Mock callouts (file + what to look at) sit in the Purpose cell of the matching IA row. | “Captions” had no antecedent. (EXPERIENCE.md §Information Architecture) |
| prose | Email, password, unique pseudonym, gender; Google additional; captcha; pledge. | Email, password, unique pseudonym, gender; Google sign-in is additional; captcha; pledge. | Missing verb. Does not change “Google is additional, not the only path.” (EXPERIENCE.md Auth purpose) |
| prose | No “en vérification”, no hourglass, no scan wait, no member-facing “scan” word including negations. | No “en vérification”, no hourglass, and no scan wait. Do not use the word “scan” on member Chat, even in a denial (“not scanning”). | Stacked ban was easy to misread as “you may say no-scan.” Locked rule unchanged. (DESIGN.md chat-bubble) |
| prose | Keeper mocks (spines win): | Canonical mocks (this spine wins on conflict): | “Keeper” is insider jargon. (DESIGN.md §Components) |
| prose | Working title muslim-marriage-africa. | The working title is muslim-marriage-africa. | Incomplete sentence. Same fix in both H1 leads. Name stays TBD. |
| prose | The public number that may appear is Verified marriages, starting at 0. / Verified-marriages counter at 0 / « Mariages confirmés : 0 » | Consider: one English gloss — **Verified marriages** — in both spines? Keep « Mariages confirmés : 0 » as the UI string. | Same counter, two English forms. Do not invent a product name. (DESIGN.md Brand & Style; EXPERIENCE.md Public + Voice) |
| prose | Component pairing uses those names. | Component names in this spine match `DESIGN.md`. | “Pairing” was vague. (EXPERIENCE.md lead) |
| prose | Cookies ≠ likeness grant | Cookies are not a likeness grant | Inequality sign is easy to miss in a table cell. (EXPERIENCE.md Cookie consent) |
| prose | Rail down: Free + safety stay (NFR-004). / Failure: rail down → `PAY_UNAVAILABLE`; Free + safety stay (NFR-004). | If a payment rail is down, Free and safety stay (NFR-004). / Failure: payment rail down → `PAY_UNAVAILABLE`; Free and safety stay (NFR-004). | “Rail down” is unexplained on first read. (EXPERIENCE.md pack-card; UJ-2) |
| prose | First discovery grid is two columns of small cards — no full-bleed hero image (Lite, AD-16: first-grid metadata + blur thumbs ≤150KB). | The first discovery grid is two columns of small cards. Do not use a full-bleed hero image. Lite (AD-16): first-grid metadata and blur thumbs stay ≤150KB. | Three rules in one parenthesis. (DESIGN.md §Layout & Spacing) |
| prose | Spines win on conflict with any file in `mockups/`. / Spines win on conflict with `mockups/`. | If a mock in `mockups/` conflicts with this spine, the spine wins. | Attach to the surviving structure location after the IA repeat is dropped. |

8 further minor fixes (Play listing / “Burkina find path”; “Warning (the sanction)”; “Mass-view-then-never-Invite”; “Ack when stored.”; “Zero-launch counters valid”; “Lifted (product, not look)”; “Correction of record 2026-10-01.”; “Each climax is the named beat.”); ask to expand.

## Summary

- **19 rows** in the table (7 structure, 12 prose), plus 8 rolled-up minor prose fixes.
- **If every CONDENSE is accepted:** about **397 words** gone (309 + 80 + 8), **~4.8%** of 8,286. The Components grouping **adds ~20 words**. Net if all structure rows are accepted: **~377 words, ~4.6%**.
- **Length target:** none, so none to meet.
- **Comprehension trade-offs:** None of the PRESERVE rows should be cut. Dropping Traceability, the UJ narratives, State Patterns, or the locked no-hold / TBD / A1–A3 / passive-AI repeats would save words and hide landmines.
- **Must edit before final?** No. These are accept-or-reject edits. The only item that can mis-build if left unresolved is the staff **768 vs 1024** QUESTION — answer it by choosing an existing phrasing, not by changing the product.
