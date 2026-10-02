# Spine Pair Review — muslim-marriage-africa

## Overall verdict

The spine pair is a usable downstream contract. A consumer can source-extract the six PRD journeys, the token set, and the 27-component pairing, and the load-bearing product decisions (passive AI, no Chat hold, name TBD, A1–A3 and PRD §16 Q1 / Q3–Q12 open) are committed rather than implied. The extract is not complete: State Patterns miss several IA surfaces a story will still have to invent (Discussions list, Case file, Mahram satellites, public/identity leftovers), mockups are a bulk dump rather than section-anchored illustrations, and a few YAML colors are defined but unbound.

## 1. Flow coverage — strong

Checked PRD §2.3 UJ-1..UJ-6 names (addendum has no extra UJs). Each has a Key Flow in EXPERIENCE.md with the PRD protagonist, numbered steps, a climax beat, and a failure path. AD ids are architecture decisions, not journeys; they are cited on flows and IA rows, not required as their own Key Flows.

Extracted UJ names (PRD → EXPERIENCE.md Key Flows):

| Source (prd.md §2.3) | Key Flow | Protagonist | Steps | Climax | Failure |
|---|---|---|---|---|---|
| UJ-1. Fatim searches without selling her face | UJ-1 — Fatim searches without selling her face | Fatim | 1–14 | ¶13 | review / 2G audio / dead radio |
| UJ-2. Ibrahim pays in Orange Money and is seen as a suitor | UJ-2 — Ibrahim pays in Orange Money and is seen as a suitor | Ibrahim | 1–10 | ¶10 | `PAY_UNAVAILABLE` / quota |
| UJ-3. Ousmane reads every message and can stop the Chat | UJ-3 — Ousmane reads every message and can stop the Chat | Ousmane | 1–9 | ¶9 | 7-day expire / pause resume |
| UJ-4. Aïcha closes a report without peeking for curiosity | UJ-4 — Aïcha closes a report without peeking for curiosity | Aïcha | 1–8 | ¶8 | fiqh-edge / curiosity unblur |
| UJ-5. Aminata and Yusuf jointly report they got married | UJ-5 — Aminata and Yusuf jointly report they got married | Aminata and Yusuf | 1–8 | ¶8 | story refused |
| UJ-6. Kadiatou configures price, policy, and honours a CIL request | UJ-6 — Kadiatou configures price, policy, and honours a CIL request | Kadiatou | 1–7 | ¶7 | hide hosting / rewrite old sanctions |

### Findings

None that block extract. Title punctuation is `.` in the PRD and `—` in the spine (see §7).

## 2. Token completeness — adequate

Extracted every YAML token in DESIGN.md and every `{path.to.token}` in DESIGN.md prose / component objects. Every reference resolves. Every color has a hex. No dark-mode pair was promised (sand-first). `{error.code}` in EXPERIENCE.md is an AD-7 envelope field, not a DESIGN token (see §7).

YAML colors (all hex): `surface-sand`, `surface-raised`, `surface-indigo`, `ink-primary`, `ink-secondary`, `ink-on-indigo`, `indigo`, `indigo-deep`, `gold`, `gold-soft`, `mihrab`, `border-hairline`, `blur-wash`, `danger`, `danger-soft`, `success`, `success-soft`, `staff`, `staff-soft`, `disabled`.

YAML typography: `display`, `title`, `heading`, `body`, `body-strong`, `meta`, `caption` — each has `fontFamily` / `fontSize` / `fontWeight` / `lineHeight` (plus tracking where set).

YAML rounded: `sm`, `md`, `lg`, `full`. Spacing: `1`–`7`, `gutter`, `screen-pad`.

Prose `{path.to.token}` refs that resolve: `{colors.surface-sand}`, `{colors.surface-raised}`, `{colors.indigo}`, `{colors.indigo-deep}`, `{colors.gold}`, `{colors.gold-soft}`, `{colors.mihrab}`, `{colors.blur-wash}`, `{colors.danger}`, `{colors.staff}`, `{colors.ink-primary}`, `{colors.ink-on-indigo}`, `{colors.border-hairline}`, `{typography.display}`, `{typography.title}`, `{typography.heading}`, `{typography.body}`, `{typography.body-strong}`, `{typography.meta}`, `{typography.caption}`, `{spacing.screen-pad}`, `{rounded.md}`, `{rounded.lg}`, `{rounded.sm}`, `{components.staff-only-badge}`. Frontmatter component objects also resolve `{colors.*}`, `{rounded.*}`, `{typography.*}`.

Contrast stated: `{colors.ink-primary}` on `{colors.surface-sand}` and `{colors.ink-on-indigo}` on `{colors.indigo}` must meet WCAG 2.1 AA; `{colors.gold}` is never text on sand.

### Findings

- **medium** Contrast is stated only for the two body-copy pairs plus the gold-as-text ban. Load-bearing combinations without a target: reveal-control `{colors.gold-soft}` / `{colors.indigo-deep}`, staff-only-badge `{colors.staff}` / `{colors.surface-raised}`, danger actions `{colors.danger}` on sand/raised, theirs-bubble `{colors.ink-primary}` on `{colors.surface-raised}`, quiet text `{colors.ink-secondary}` on sand (DESIGN.md Colors). *Fix:* state AA (or “same floor as ink-primary/sand”) for those five.
- **medium** `{colors.success}` and `{colors.success-soft}` are defined and never bound; confirmation is gold (DESIGN.md frontmatter vs Colors / Components). A consumer can invent green success chrome that fights the gold rule. `{colors.disabled}` is also unbound to any disabled-button / field spec. *Fix:* bind them to named states or delete the unused keys.
- **low** `{colors.surface-indigo}` equals `{colors.indigo-deep}` (`#15283F`) and is never referenced (DESIGN.md frontmatter). *Fix:* drop the alias.
- **low** `{rounded.full}` is defined while pills-as-dating-chips are banned (DESIGN.md Shapes). *Fix:* drop `full` or name the one allowed use.

## 3. Component coverage — strong

Extracted every component name in DESIGN.md.Components, EXPERIENCE.md.Component Patterns, and YAML `components`. The 27 body names match 1:1 across both spines. Each EXPERIENCE row has real behavioral rules (not one-word). DESIGN rows are visual enough to implement except the thin set below.

Paired (both spines): `button-primary`, `button-secondary`, `button-quiet`, `field`, `age-gate`, `otp-input`, `liveness-capture`, `completeness-meter`, `discovery-card`, `blur-photo`, `reveal-control`, `chat-bubble`, `voice-note`, `mahram-banner`, `contact-share-interstitial`, `invite-row`, `flash-composer`, `stage-chip`, `admin-flag-row`, `staff-only-badge`, `sanction-action`, `pack-card`, `audio-prompt`, `pin-lock`, `empty-state`, `error-banner`, `lite-placeholder`.

YAML `components` is a subset (8): `button-primary`, `button-secondary`, `button-quiet`, `chat-bubble`, `blur-photo`, `reveal-control`, `admin-flag-row`, `staff-only-badge`. Spec allows body-only components; a frontmatter-only extractor will under-count.

No unnamed chrome used as if it were a component except the member bottom nav and Ice Breaker picker (the latter is inside `flash-composer`).

### Findings

- **low** YAML `components` maps 8 of 27 body components (DESIGN.md frontmatter vs Components). *Fix:* either extend the YAML map or state “body list is canonical; YAML is brand-layer only.”
- **low** `stage-chip`, `voice-note`, `audio-prompt`, `pin-lock`, `empty-state` visual rows are size/type only — no token-bound fill/ink (DESIGN.md Components). `contact-share-interstitial` and `sanction-action` DESIGN rows are mostly behavioral. *Fix:* one color/radius sentence each, or point at an existing token object.

## 4. State coverage — adequate

Walked every IA surface. State Patterns cover the core member path and correctly lock the three non-negotiables: Chat has no pending-moderation / held / scan-wait; scan-deferred is staff-only; Profile Photo not-yet-public is its own surface (FR-065), not a Chat state.

Covered in the state table: Splash/Auth, Age gate, OTP, ID + liveness, Onboarding, Profile edit, Profile not-yet-public, Discovery lite grid, Profile detail, Blur/Reveal/Revoke, Favourites, Invite compose, Invite inbox, Chat thread, Contact-share interstitial, Mahram read-only, Report/Block, Marriage dual-confirm, Payment pack, Notifications, Settings, Admin flag queue, Sanction, Appeal, Operator policy/pricing.

### Findings

- **high** Case file is a primary UJ-4 surface (IA Staff) with no empty / loading / error / success row. Unblur-locked vs reason-entered, missing evidence, and staff-auth fail are not committed (EXPERIENCE.md State Patterns vs IA Staff). *Fix:* add a Case file row; unblur-disabled-until-reason is the climax state.
- **high** Member nav includes **Discussions** but IA has only Chat thread (reached from Accept / Discussions). No conversation-list surface, no empty « Aucune discussion. », no loading/error for the inbox (EXPERIENCE.md IA Member core, State Patterns). *Fix:* name Discussions list as a surface and give it the four states.
- **medium** Email verification and Password reset are IA Identity surfaces with no state rows (expired link, resend, success) (EXPERIENCE.md IA Identity). *Fix:* two rows, or an explicit inherit from Auth.
- **medium** Consent story is a UJ-5 IA surface with no states (refuse public, faces optional, both-family checkbox `[ASSUMPTION]`) (EXPERIENCE.md IA Member core). *Fix:* add the row; empty showcase is not a substitute.
- **medium** Mahram satellites — invite (Sister), OTP + relationship, Sister confirm, pause/end/flag, Verified-Mahram ID, Remove/Report — have IA rows but only Mahram read-only is in State Patterns (EXPERIENCE.md IA Mahram). *Fix:* one row per satellite, or a shared “Mahram attach” row plus pause/end/remove.
- **medium** Operator CIL / deletion tickets, Operator metrics, Operator Board / Académie publish lack states; UJ-6 climax includes CIL completed and proof-backed metrics (EXPERIENCE.md IA Staff). *Fix:* split the combined Operator policy/pricing row or add the three.
- **low** Public landing, Legal hub, Public pricing, Académie, Advisory Board, FAQ + contact, Showcase, Cookie consent, Photo rules, PIN lock, Filters, Family guidance, Delete/export status, Appeal review, T&S visit signals omitted. Showcase empty is in IA purpose only; PIN 5-fail lives on the component, not the table; life-pause deactivate (FR-018) is named on Profile edit with no state. *Fix:* inherit `empty-state` + `error-banner` in one sentence, and add PIN fail + life-pause on Profile edit.

## 5. Visual reference coverage — adequate

`mockups/` contains exactly eight files. No `wireframes/` or `imports/`. EXPERIENCE.md IA lists all eight in one composition line. DESIGN.md states spines-win and links no file. Spines-win-on-conflict is stated once per spine (DESIGN.md preamble; EXPERIENCE.md Foundation + IA). Orphans: none.

| File | Linked | Named illustration | Inline at relevant section |
|---|---|---|---|
| `mockups/auth.html` | EXPERIENCE.md IA dump | no | no (not at Auth / UJ-1) |
| `mockups/discovery-lite.html` | same | no | no (not at Discovery / Lite) |
| `mockups/profile-blur.html` | same | no | no (not at Blur / Reveal) |
| `mockups/chat-thread.html` | same | no | no (not at Chat / UJ-1 climax) |
| `mockups/mahram-readonly.html` | same | no | no (not at Mahram / UJ-3) |
| `mockups/admin-flag-queue.html` | same | no | no (not at Flag queue / UJ-4) |
| `mockups/payment-pack.html` | same | no | no (not at Payment / UJ-2) |
| `mockups/marriage-confirm.html` | same | no | no (not at dual-confirm / UJ-5) |

### Findings

- **medium** All eight mocks are an unspecific IA dump: paths only, no “this illustrates …”, none repeated at the matching IA / flow / component section (EXPERIENCE.md Information Architecture). DESIGN.md has zero per-file links (DESIGN.md preamble). *Fix:* one captioned link per file at the surface it shows; keep a single spines-win sentence.

## 6. Bloat & overspecification — adequate

DESIGN.md is tight and editorial where the spec allows it. EXPERIENCE.md is mostly tables. Invented sections (Open questions, NEXT, Traceability) earn their place on a regulated product. Key Flows restating PRD UJs is the job, not bloat. Pixel values that match NFRs (48px, ≤4s, ≤8s, 360px, 768/1024) are load-bearing.

### Findings

- **medium** Traceability restates every IA Implements / PRD / Architecture cell (~55 rows). A consumer now has two tables to keep in sync (EXPERIENCE.md Traceability vs IA). *Fix:* drop Traceability or generate it from IA; do not maintain both by hand.
- **low** Key Flow FR laundry lists repeat IA Implements (EXPERIENCE.md Key Flows). Useful for journey extract; trim to the climax FRs if the file must shrink.

## 7. Inheritance discipline — strong

All five `sources:` paths resolve from this workspace (`prd.md`, `addendum.md`, `ARCHITECTURE-SPINE.md`, `SOLUTION-DESIGN.md`, `brief.md`). UJ titles match PRD wording. Component names are identical across both files. Glossary terms (Sister, Brother, Mahram, Invite, Message Flash, Contact-share, Scan-deferred, Reveal, Lite mode, Verified-Mahram, Verified marriage, Ta'aruf stage values) match PRD §3; spines inherit the glossary by reference rather than copying it. EXPERIENCE.md does not sprinkle DESIGN tokens (pairing is by component name, matching the examples). Locked facts are not treated as gaps: AI is passive; Chat has no hold; name is TBD; A1–A3 and §16 Q1, Q3–Q12 stay open; Q2 is marked resolved.

AD ids cited on IA/flows that exist on the architecture spine: AD-4, AD-5, AD-8, AD-9, AD-10, AD-11, AD-12, AD-13, AD-14, AD-15, AD-16, AD-17, AD-18, AD-19, AD-20, AD-21, AD-22, AD-23, AD-24, AD-25, AD-26. No dangling AD-n.

### Findings

- **low** PRD headings use `UJ-1.` ; EXPERIENCE uses `UJ-1 —`. UJ-1 onboarding says `complete-to-invite` vs PRD `complete-to-send-Invite` (prd.md §2.3 vs EXPERIENCE.md Key Flows). *Fix:* paste the PRD title and the browse/Invite phrase verbatim.
- **low** `{error.code}` in EXPERIENCE.md Component Patterns is not a DESIGN.md token (AD-7 envelope). The Foundation line claims EXPERIENCE references `{path.to.token}` but contains no DESIGN token refs. *Fix:* write `error.code` without braces, or `{` only for DESIGN tokens.

## 8. Shape fit — strong

DESIGN.md body order is canonical: Brand & Style → Colors → Typography → Layout & Spacing → Elevation & Depth → Shapes → Components → Do's and Don'ts. Extra BMAD frontmatter (`status`, `updated`, `sources`) sits beside the spec keys and does not scramble them.

EXPERIENCE.md required defaults are all present: Foundation, Information Architecture, Voice and Tone, Component Patterns, State Patterns, Interaction Primitives, Accessibility Floor, Key Flows. Required-when-applicable present: Inspiration & Anti-patterns (Farata lift + dating/hold/CSS-blur rejects); Responsive & Platform (web + PWA + Android, staff breakpoint). Invented Open questions / NEXT / Traceability are justified.

### Findings

None.

## Mechanical notes

- Frontmatter: both spines `name: TBD`, `status: final`, `updated: 2026-10-01`, same five sources. DESIGN.md also has `description`. Paths resolve.
- UJ title punctuation: PRD `UJ-n.` vs EXPERIENCE `UJ-n —`.
- Phrase drift: `complete-to-send-Invite` (PRD) vs `complete-to-invite` (EXPERIENCE).
- `{error.code}` looks like an unresolved DESIGN token.
- YAML `components` ≠ body component list (8 vs 27).
- `{colors.surface-indigo}` unused alias of `{colors.indigo-deep}`.
- `{colors.success}`, `{colors.success-soft}`, `{colors.disabled}`, `{colors.staff-soft}` unused in prose; `danger-soft` / `staff-soft` appear as English names, not `{path.to.token}`.
- Mockup links exist only as one EXPERIENCE.md IA sentence; DESIGN.md has directory-level spines-win only.
- No broken `prd.md` / `ARCHITECTURE-SPINE.md` relative links from this folder.
- No Mermaid in either spine.
- Chat banned states are listed twice (Component Patterns + State Patterns) and agree: no `pending`, `held`, `pending-moderation`, `scan-wait`, `fail-closed`.
