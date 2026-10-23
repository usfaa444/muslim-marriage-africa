# QA handoff: discover-app-shell

Story spec: `_bmad-output/implementation-artifacts/spec-discover-app-shell.md` (with Fay's update to AC 4: build the bottom nav from screen 53).
Branch: `factory/discover-app-shell`, from `main` at f80e259. Local commit only, not pushed.

## 1. What was built

**One shared shell for every in-app page**, in `code/apps/web/src/app-shell.ts`. Every page the web serves from Stitch HTML now goes through `withAppShell()`. It removes the Stitch chrome (full-width top bar `<header class="w-full…">`, full-width `<footer class="w-full…">`, any `<nav aria-label="Navigation mobile|membre|principale">` and the empty `<aside aria-label="Navigation membre">`). Then it adds:

- **App header** (`#app-header`, `data-app-shell="header"`). It is the grid view's own header, made shared. A sticky cream (#F7F1E3) bar with a hairline bottom border (#E2D4B8 at 60 %). It holds a small soft-gold dot and the **AnKanu** wordmark in Newsreader (24 px on phones, 30 px from 640 px). It is 64 px tall on phones and 80 px from 640 px, with a max width of 80 rem. On member pages the wordmark is a link to `/decouvrir` with the accessible name « AnKanu, accueil ». On gated flows it is plain text with no link, so there are no nav actions.
- **App footer** (`#app-footer`, `data-app-shell="footer"`). A cream band with a hairline top border. It shows the AnKanu wordmark (Newsreader 20 px) and one line: « © {current year} AnKanu · Confidentialité ». « Confidentialité » links to `/#legal`, the landing page's legal footer. That link is a 44 by 44 px target. The footer uses `margin-top: auto`, and the body gets `min-height: 100dvh`, so on short pages the footer sits at the bottom.
- **Bottom nav** (`#app-bottom-nav`, `data-app-shell="bottom-nav"`), on member pages only. It is built at request time from `design-stitch/ankanu-v2/53-barre-de-navigation/screen.html`: same items, order, SVG icons, labels, aria-label « Navigation principale », and the same navy pill, gold active pill and gold icons, using the design's own class strings. The design file is parsed, and the page throws if the design loses its four items or its selected item.
  - Items: **Découvrir** → `/decouvrir`, **Invitations** → `/invitations`, **Discussions** → `/discussions`, **Profil** → `/profil`.
  - The current section gets `aria-current="page"` and the design's selected style: gold pill, navy text and icon, label in semibold.
  - Layout: fixed at the bottom and centred. Below 640 px the pill is full width (max 28 rem), with four equal items and the icon above a 11 px label. From 640 px it is the design's inline pill, with icon and label side by side. Every item is at least 44 by 44 px. The bottom padding includes `env(safe-area-inset-bottom)`, and the viewport meta gets `viewport-fit=cover`. The body gets `padding-bottom: calc(6rem + safe-area)`, so the footer and content always end above the bar.
  - The shell CSS is self-contained (`#app-shell-style`), so the chrome looks right even if a page's Tailwind does not load.

**Which page gets what**

| Page | Header | Footer | Bottom nav (current item) |
| --- | --- | --- | --- |
| `/decouvrir` (both views, hold state included) | link | yes | Découvrir |
| `/profil/<id>` and its not-listable hold page | link | yes | Découvrir |
| `/favoris` | link | yes | Découvrir |
| `/invitations/envoyer/<id>` | link | yes | Invitations |
| `/invitations` (live session) | link | yes | Invitations |
| `/discussions` (live session) | link | yes | Discussions |
| `/profile-edit`, `/profile-review`, `/settings` | link | yes | Profil |
| `/auth`, `/signup/account`, `/signup/identity`, `/signup/pseudonym`, `/email-verification`, `/phone`, `/otp`, `/id-liveness`, `/password-reset`, `/pin`, `/onboarding`, `/photo-rules`, `/privacy/status/<ticket>` | text only | yes | none |
| `/` landing | unchanged | unchanged | none |
| `/staff*` | unchanged | unchanged | none |
| `/signup` (splash, custom HTML, not Stitch) | unchanged | unchanged | none |

**Discover: one layout for both views** (`discover-page.ts`). The page is now the grid view's structure (screen 57 `grid.html`): header, then `<main id="discover-main">` with the intro, the toolbar (Filtres, filter chips, « Découverte respectueuse », the view toggle), then the card area, then the proverb banner, then footer and bottom nav. Only the card area switches, between `#discover-card` (the single card of screen 57, or screen 13 with two filters or more, as before) and `#discover-grid` (tiles). The chrome is never rebuilt.

- The intro sentence « Consultation sobre des profils engagés dans une démarche de mariage honorifique au Burkina Faso. » is removed.
- The eyebrow « ESPACE DE CONVENANCE MATRIMONIALE » is now **« Faites connaissance »**. The design's `uppercase` class still shows it in capitals.
- The toggle uses the grid toolbar's buttons (« Affichage unitaire », « Grille panoramique »). The selected state is drawn on the server and updated on every switch with `aria-pressed`, using the design's selected style (navy fill, cream icon). Each button is at least 44 by 44 px. The grid design's `aria-current="page"` on a toggle button was dropped, because that attribute is for navigation.
- The single card is unchanged. Its markup is byte-identical to `main` for both card sources (checked by script, see §4). Rendered with Tailwind, its box is identical at all six widths. Pixel diff without the fixed bar: 3 px at 768 px and up, 23 px at 360/390, all anti-aliasing from a sub-pixel vertical offset.
- When the browse hold shows, `#discover-main` is hidden along with the panes, as the panes were before.

**`/invitations`, `/discussions`, `/profil` for a live member session** (`v2-serve.ts`, `member-section-page.ts`). Before this story these answered a JSON 401 « Session non authentifiée » even to a signed-in member, so a nav tap showed raw JSON. Now:

- `/profil` sends a 303 to `/profile-edit`, the member's own profile, where Profil is current.
- `/invitations` and `/discussions` render the shared shell with only the section title (the nav label, `<h1>Invitations</h1>` or `<h1>Discussions</h1>`). Screens 19 and 20 belong to later stories.
- Stub cookies (`web`, `capacitor`, `mahram`, `staff`) still get the same JSON envelopes. Signed-out visitors still go to `/auth`.

## 2. Where

New:
- `code/apps/web/src/app-shell.ts`: header, footer, bottom nav, Stitch chrome stripping, shell CSS. This is a design-file reader: `loadStitch('53-barre-de-navigation/screen.html')`.
- `code/apps/web/src/member-section-page.ts`: the `/invitations` and `/discussions` shell pages.
- Tests: `code/apps/web/src/app-shell.test.tsx`, `code/apps/web/src/app-shell-browser.test.ts`, `code/e2e/app-shell.spec.ts`.
- Evidence: `code/docs/qa-handoffs/discover-app-shell-evidence/` (screenshots, see §3).

Changed:
- `discover-page.ts`: the single grid-based layout, the eyebrow, the sentence removal, the toggle state. Unused `innerBody`, `replaceHrefs` and `MEMBER_HREFS` were removed.
- `not-listable.ts`: the hold page uses the shell. `desktopDiscoverNav` and `mobileDiscoverNav` were removed. `notListablePage(reviewSource, details)` lost its two nav-source arguments. The hold client hides `#discover-main`.
- `v2-pages.ts`: `mount` and `guarded` take a shell option. Gated is the default; profile edit, review and settings are member pages with Profil current.
- `favourites-page.ts`, `invite-compose-page.ts`, `profile-detail.ts`: wrapped in the shell.
- `v2-serve.ts`: `memberGuarded` handles live sessions. The not-listable call is updated.
- `web-image.test.ts`: `src/app-shell.ts` added to the allowed design readers, and the test now expects screen 53 among the reads.
- `discover-page.test.ts`, `not-listable.test.ts`, `ank-148-fix.test.ts`, `v2-responsive.test.ts`: updated for the new structure (see §7).

There are no migrations, flags or env vars. No API change. The Dockerfile already copies `53-barre-de-navigation/screen.html`, and `.dockerignore` already allows it. `web-image.test.ts` checks both and passes.

## 3. How to run

From `code/`:

```bash
npm ci
npm run lint && npm run typecheck
npm run test:unit
npx vitest run --config vitest.unit.config.ts apps/web/src/app-shell.test.tsx apps/web/src/app-shell-browser.test.ts apps/web/src/discover-page.test.ts
npm run test:e2e -- e2e/app-shell.spec.ts       # web-only dev server on :3100
```

In a sandbox without CDN access, add `E2E_ALLOW_ERRORS='cdn\.tailwindcss\.com,fonts\.googleapis\.com,fonts\.gstatic\.com,www\.google\.com/recaptcha,www\.gstatic\.com,^tailwind is not defined$'` and `PLAYWRIGHT_CHROMIUM_EXECUTABLE=<chromium>`.

Manual check (full stack, `docker compose` or staging): sign in as an account-step member, then:
1. Open `/decouvrir` and switch between the single and grid views.
2. Tap each nav item.
3. Open `/favoris`, a profile, Invite, `/settings` and `/profile-edit`.
4. Sign out, then open `/auth` and `/password-reset` (no bottom nav).
5. Open `/` (landing unchanged).

Screenshots in `discover-app-shell-evidence/` were taken at 360 and 1440 px for Discover (card and grid), settings, auth, invitations, invite, hold and favourites. They were rendered with Tailwind 3.4 CSS generated locally from each page's own `tailwind.config`, because the CDN is blocked in this container. They are full-page captures, so the fixed bar shows where the viewport ended.

## 4. AC trace table

| ID | Criterion | How it is proven | Status |
| --- | --- | --- | --- |
| AC1 | Same Discover screen in both views; only the card area changes; the single card is unchanged | `app-shell.test.tsx` › "keeps the title, toolbar and toggle outside the swapped card area", "draws the toggle state…", "keeps the single card markup"; `app-shell-browser.test.ts` measures the header, h1, toolbar, Filtres, toggle and nav boxes in card → grid → card at all 6 widths and they are identical; `discover-page.test.ts` browser suite (toggle, cache, filters, Lite, hold) still green; markup diff against `main`: identical for both card sources | Pass (unit + browser, run here) |
| AC1-b | The card is pixel-identical | Script render against `main` with locally generated Tailwind: same box at all widths, ≤23 px anti-alias diff (§1). Not an automated test | Pass (manual script) |
| AC2 | The sentence is gone in both views | `app-shell.test.tsx` › "drops the Stitch sentence…" (default and 2-filter page) | Pass |
| AC3 | The eyebrow is renamed | same test; `DISCOVER_EYEBROW = 'Faites connaissance'` | Pass |
| AC4 | One bottom nav from screen 53 on every free-navigation page, current section active, items navigate, no Stitch nav left | `app-shell.test.tsx` › "bottom nav from screen 53" (items, order, icons, labels, classes), "one shell on every in-app page" (11 member pages: exactly one nav and one `aria-current`, the right section, no `Navigation mobile/membre`), "renders the same … nav markup on every member page", the live-session route tests; e2e › member pages (role-based: 4 links in order, hrefs, current item, ≥44 px) and "each item opens its section, from the keyboard too" | Pass (from `/settings` in e2e; `/decouvrir` needs a live session, see §7) |
| AC5 | No bottom nav on gated flows | `app-shell.test.tsx` (13 gated pages: no nav, no nav items, no `ank-has-nav`); e2e › gated pages `/auth`, `/signup/identity`, `/signup/pseudonym`, `/password-reset` | Pass |
| AC6 | One app header on member and gated pages; no Stitch top bar | `app-shell.test.tsx` (24 pages: one `data-app-shell="header"`, zero `<header class="w-full`; link on member pages, text on gated); e2e `getByRole('banner')` count 1 | Pass |
| AC7 | One app footer above the nav, never covered; no Stitch footer | `app-shell.test.tsx` (exactly one `<footer>` per page, the shared one); browser test and e2e: after scrolling to the end, footer bottom ≤ nav top at all widths; mutation check: with the body padding removed, the browser test fails ("nav covers the footer") | Pass |
| AC8 | Landing unchanged | `app-shell.test.tsx` › "leaves the landing header and footer alone"; e2e › "the landing page keeps its own header and footer"; `landing.tsx` untouched | Pass |
| AC9 | Quality gates | §5 below | Pass for lint, typecheck, new and touched tests; pre-existing environment failures listed |
| NFR-a11y | `nav` with French aria-label, `aria-current`, keyboard, 44 px, axe | e2e: axe (WCAG 2.2 AA tags) on the whole page for invite compose, the gated pages and the landing; axe scoped to header, footer and nav for `/settings` and `/profile-edit` (§7); keyboard Tab reaches « Découvrir » and Enter opens it | Pass |
| NFR-responsive | 360–1440, no horizontal scroll | browser test (decouvrir, settings, invitations, auth) and e2e width sweep (settings, profile-edit, invite) | Pass |
| NFR-staff | Staff console untouched | `app-shell.test.tsx` › "leaves the staff console alone" | Pass |
| Edge: hold state | Hold hides the Discover layout, shell stays | `app-shell.test.tsx` › "hides the shared Discover layout…"; `not-listable.test.ts` | Pass |
| Edge: filtered URL (2+ filters) | Grid shown first, toggle state matches | `app-shell.test.tsx` toggle test (filtered page has `aria-pressed="true"` on the grid button); `discover-page.test.ts` filters browser test | Pass |
| Edge: stub and signed-out sessions | Member-route JSON unchanged; anon → `/auth` | `app-shell.test.tsx` › "keeps stub cookies on the JSON envelope…"; existing `member-route.test.ts` green | Pass |

## 5. Self-check results (run in this container)

- `npm run lint`: exit 0. Three warnings, all pre-existing (`life-pause.ts`, `v2-flow.test.ts`, `photo-rules.test.ts`).
- `npm run typecheck`: exit 0.
- `npm run test:unit`: `Test Files 3 failed | 73 passed (76)`, `Tests 3 failed | 558 passed (561)`. The 3 failures are the same 3 that fail on untouched `main` in this container (baseline run before any change): `ank-148-fix.test.ts` ("wires onboarding…"), `photo-rules.test.ts` ("keeps a 32px play circle in Chrome…", 5 s timeout) and `v2-responsive.test.ts` (360 s timeout). They are Chrome tests whose pages need `cdn.tailwindcss.com`, which this container's proxy refuses (403).
- New tests: `app-shell.test.tsx` 41/41 pass. `app-shell-browser.test.ts` 1/1 pass (real Chromium, not skipped). `discover-page.test.ts` 8/8 pass, including all 5 browser tests.
- `npm run test:e2e` (web-only, :3100, CDN errors allowed as above): `30 failed, 23 skipped, 77 passed`. On untouched `main` with the same command: `30 failed, 20 skipped, 56 passed`. The list of failing tests is identical. They are `profile-edit-flow`, `staff-shell`, `staff-review` and `known-issues`: unstyled pages because the Tailwind CDN is blocked, and `known-issues.spec` breaks once `E2E_ALLOW_ERRORS` is set. `e2e/app-shell.spec.ts`: 21 passed, 3 skipped (the width sweep runs on desktop only).
- Browser walk (Playwright, Tailwind generated locally, fonts through the proxy): every page in the evidence set fits 360/390/768/1024/1280/1440 with no horizontal scroll. Each page has exactly one header and one footer, and member pages have one nav. The footer ends 18 to 31 px above the bar. Discover chrome did not move between views at any width.

**Could not run here**: integration tests and Docker (no Docker in this container); the full-stack e2e with `E2E_BASE_URL` (no API or staging access); Lighthouse; any page with the real Tailwind CDN. QA should run the e2e on a machine with CDN access, or against the local Docker stack, and walk `/decouvrir` with a real member session.

## 6. Test cases for QA

1. Signed-in member, `/decouvrir` at 360 and 1440. Switch Affichage unitaire ↔ Grille panoramique several times. Expected: the header, the « FAITES CONNAISSANCE » eyebrow, the title, the toolbar, the toggle position, the background, the proverb, the footer and the nav stay put; only the card area changes. The toggle's navy fill follows the current view, and a screen reader announces it as pressed.
2. The same page: the sentence « Consultation sobre… » and « ESPACE DE CONVENANCE MATRIMONIALE » are absent in both views.
3. The single card is the same as on `main`: name, VÉRIFIÉ, city, photo well, shared traits, Passer avec égards, Message d'introduction, and Envoyer une invitation Ta'aruf → `/invitations/envoyer/<id>`.
4. Tap Découvrir, Invitations, Discussions and Profil. Expected: `/decouvrir`; `/invitations` (shell plus « Invitations », Invitations current); `/discussions` (the same for Discussions); `/profil` → `/profile-edit` with Profil current.
5. Keyboard only: Tab through the page to the nav. Every item gets a visible gold focus ring, and Enter opens it.
6. iPhone with a home indicator (or emulate the safe area): the bar clears the indicator, and the footer's « Confidentialité » can be reached above the bar.
7. Gated pages: `/auth`, `/signup/identity`, `/signup/pseudonym`, `/password-reset`, and as a member mid-onboarding `/email-verification`, `/phone`, `/otp`, `/id-liveness`, `/onboarding`, `/photo-rules`, `/pin`. Expected: the AnKanu header (not a link) and the footer, no bottom nav.
8. `/` and `/staff/connexion`: their own chrome, with no AnKanu shell header, footer or bottom nav.
9. Negative: a stub `web` cookie on `/invitations` still gets the JSON 401. A staff session on `/decouvrir` still gets a 403 JSON. A signed-out visitor on `/invitations` goes to `/auth`.
10. Hold: a member who is not listable sees the hold card inside the shell, with Découvrir current, and no extra desktop pill or mobile bar.

## 7. Out of scope, assumptions, known issues, open questions

**Out of scope**: screens 19 (invite inbox) and 20 (discussions list). `/invitations` and `/discussions` show only the shell and the section title until those stories ship. The mahram shell (`MahramChrome` in `chrome.tsx`, a React stub not used by any served page) and the staff console are not touched.

**Decisions to confirm (open questions for Fay)**:
1. **Placeholder pages**: a live member on `/invitations` or `/discussions` now gets a shell page titled with the nav label instead of the JSON 401. `/profil` (no id) redirects to `/profile-edit`. Without this, AC 4 ("each nav item navigates to its screen") could not hold. Revert if you prefer the old JSON.
2. **Current item on `/favoris`**: it is not one of the four items. I chose **Découvrir**, because favourites are saved Discover profiles and the empty state links back to Découvrir. **Invite compose** marks **Invitations**. **Profile detail** marks **Découvrir**. **Profile edit, review and settings** mark **Profil**.
3. **`/privacy/status/<ticket>`** (export or deletion status) is treated as a gated status page (no nav), following the spec's "status pages". It is reachable from settings, so it could arguably be a member page.
4. **`/signup` splash** keeps its own full-screen design, with no app header or footer. It is not a Stitch page, and a header would break the splash.
5. **Footer link**: « Confidentialité » points to `/#legal` (the landing's legal footer), because there is no privacy page yet.
6. **Proverb banner** (« La bienséance précède toute démarche de rencontre. ») from the grid design now shows in both views, because the grid page is the reference.

**Known issues and notes**:
- `/settings` and `/profile-edit` have axe findings inside their own Stitch content, which this story does not touch: `button-name` on `#lite-mode-toggle` and `#pin-toggle`, and `target-size` on the PIN timeout buttons when unstyled. So `e2e/app-shell.spec.ts` runs axe scoped to the shell on those two pages, and on the whole page for invite compose, the gated pages and the landing. Worth a separate ticket.
- **Bundler quirk found**: in `next dev`, Turbopack rewrites `new URL(\`../../../design-stitch/ankanu-v2/${name}\`, import.meta.url)` into one of its own assets. The new loader received a Google sign-in HTML file instead of screen 53. `app-shell.ts` therefore resolves the screen from the working directory only. `discover-page.ts`'s `loadStitch` (filters modal and search card) still has that first candidate. It worked on staging in earlier QA, but QA should check the filters modal on the built image.
- **Tests changed and why**:
  - `discover-page.test.ts`: there is now one toolbar, so `data-discover-view` counts went from 2 to 1, the toggle selectors from `#discover-card`/`#discover-grid` became `#discover-main`, and the filter-chip counts went from 2 to 1. The old count was one chip per view toolbar.
  - `not-listable.test.ts`: the removed per-page Stitch navs are replaced by assertions on the one shared nav.
  - `ank-148-fix.test.ts` and `v2-responsive.test.ts`: the call signature change only.
  - `web-image.test.ts`: `app-shell.ts` was added as a design reader, as that test's own comment asks.
  - No assertion was weakened.
- The unit browser tests in `discover-page.test.ts` write screenshots into tracked `docs/qa-handoffs/epic-3-*` folders. Those were restored and are not part of this change.
