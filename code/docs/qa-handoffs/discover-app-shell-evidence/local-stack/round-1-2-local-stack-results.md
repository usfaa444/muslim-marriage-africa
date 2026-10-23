# Local Docker stack results (Fay's Mac, http://localhost:4012)

Run by the factory's local deployment on Fay's machine, headless Chromium, signed in as seeded member moussa.test@example.bf. Screenshots and results JSON stay on that machine (scratchpad shots/ and shots2/).

## Round 1 (commit e80d21e)
- Stack: 6 containers healthy, migrations applied, `/` and `/v1/health` OK.
- Full-stack e2e (`E2E_BASE_URL=http://localhost:4012`): 44 passed, 0 failed, 86 skipped (stub-server and desktop-only tests).
- 390 and 1280: header, title « Faites connaissance », view toggle and bottom nav have identical bounding boxes in single and grid view. Footer same size, lower in grid view because it follows the longer grid.
- Old sentence and « ESPACE DE CONVENANCE MATRIMONIALE » absent; « Faites connaissance » present.
- Bottom nav from /decouvrir: Découvrir → /decouvrir, Invitations → /invitations, Discussions → /discussions, Profil → /profile-edit, each with exactly one shared header, footer and nav.
- /favoris, /settings, /profile-edit at 390 and 1280: one shared header, footer and nav, no leftover Stitch nav.
- No horizontal scroll at 360 and 1440.
- FAIL: Filtres opened a blank overlay with no form and no close button (`#filters-canvas` empty in server HTML; `loadStitch` used a templated `new URL(..., import.meta.url)` that the production bundler replaced).

## Round 2 (commit 364ffe3)
- Rebuilt; stack healthy; e2e 44 passed, 0 failed, 86 skipped.
- Filters at 390 and 1280 on /decouvrir and /decouvrir?city=ouagadougou&practice=assidue, 30/30 checks pass: form « Filtres de convenance » renders with 19 fields; ✕ « Fermer les filtres » visible and focused on open; ✕, Escape and backdrop click each close it and return focus to Filtres; no horizontal scroll while open; with 2 filters the grid shows first and the single view shows the screen 13 search card.
- Round 1 layout re-run: 36/38 pass; the 2 non-passing are the footer vertical position (follows content length, same as round 1, not a regression).
