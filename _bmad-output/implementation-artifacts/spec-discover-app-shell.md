---
title: 'Discover: one layout for single and grid views, and one shared app header, footer and bottom nav'
type: 'ui'
created: '2026-10-23'
status: 'ready'
route: 'factory'
story_id: 'discover-app-shell'
---

## Intent

**Problem:** Fay tested `/decouvrir` and found that the single card view and the grid view look like two different screens. The card itself in the single view is right and must not change, but everything around it (header, intro, toggle, background, spacing, footer, nav) differs from the grid view. Across the app, screens built from different Google Stitch exports each carry their own header, footer and bottom nav, so the app does not feel like one product. From `/decouvrir` a member cannot always reach the other menu screens through a bottom nav.

Fay's words (2026-10-23), summarised:

- The grid view is the base and source of truth for the Discover page. Switching between single and grid must not feel like moving to a new screen; only the card area changes (one card or many).
- Remove the sentence « Consultation sobre des profils engagés dans une démarche de mariage honorifique au Burkina Faso. » from the grid view.
- Rename the eyebrow « ESPACE DE CONVENANCE MATRIMONIALE » to something casual and less technical.
- Every screen where the member can navigate freely has the bottom nav, and it is the same bottom nav component everywhere.
- Every in-app page uses the same simple header and the same simple footer. The landing page keeps its existing rich header and footer.
- Where a Stitch screen ships its own bottom nav, header or footer, drop it and use the shared component.
- The new header and footer are Claude's design, simple and well styled, with the app's own look (tokens, fonts, colours), not a foreign component.

## Boundaries & Constraints

**Always:**
- The single-view profile card (its markup, styles, content, buttons including the Invite button from Stories 4.1 + 4.2) stays exactly as today.
- Use the existing design tokens and fonts (`DESIGN.md`, `app/globals.css`, the Tailwind config used by the Stitch screens). No new dependencies.
- One component (or one HTML-producing function, matching how the web serves Stitch screens in `v2-serve.ts` / `v2-pages.ts` / `discover-page.ts`) for each of: app header, app footer, bottom nav. Every in-app page calls it; no page keeps a hand-written copy.
- French copy only. New copy is limited to: the new eyebrow, the header and footer link labels, and nav labels already used in the app.
- Bottom nav: at least 44 by 44 px targets, `aria-current="page"` on the active item, a `<nav>` with a French `aria-label`, keyboard reachable, safe-area padding at the bottom on phones. Page content is never hidden behind it.
- Responsive at 360, 390, 768, 1024, 1280, 1440 with no horizontal scroll.
- Existing behaviour (Lite mode, filters, favourites, invite, PIN guard, member-route guard, data loading, empty and error states) is unchanged.

**Never:**
- Do not change the landing page's header or footer.
- Do not change API behaviour or data.
- Do not show the bottom nav on gated, linear flows where free navigation is not allowed (sign up, sign in, age gate, email verification, phone and OTP, PIN entry, ID and liveness, photo rules, guided onboarding, password reset, status pages such as suspended or held accounts). These may show the shared header (without nav actions) and footer.
- Do not touch the staff console chrome (it is a separate role with its own shell).
- Never skip or weaken a test.

## Acceptance Criteria

1. **Same Discover screen in both views.** Given a signed-in member on `/decouvrir`, when they switch between the single view and the grid view, then the header, page title area, view toggle, filters entry, background, spacing, footer and bottom nav stay identical and in the same position (no layout jump outside the card area); only the card area changes between one card and the grid. The grid view's current page structure is the reference. The single card itself is pixel-identical to today.
2. **Copy removed.** The sentence « Consultation sobre des profils engagés dans une démarche de mariage honorifique au Burkina Faso. » no longer appears on `/decouvrir` in either view.
3. **Eyebrow renamed.** « ESPACE DE CONVENANCE MATRIMONIALE » no longer appears on `/decouvrir`; it is replaced by a short casual French eyebrow (default choice: « Faites connaissance »).
4. **One bottom nav component, from the existing design.** The shared bottom nav is built from the Stitch design `code/design-stitch/ankanu-v2/53-barre-de-navigation/screen.html` (Fay, 2026-10-23: "we already have a design for the bottom nav menu"): its items, order, icons, labels and styling. Every in-app page where free navigation is allowed (at least `/decouvrir`, `/favoris`, `/invitations`, `/discussions`, `/profil`, `/profil/<id>`, `/settings`, `/profile-edit`, `/invitations/envoyer/<id>`, and any other signed-in member page reachable from the menu) renders the same bottom nav from a single source, with the same items, order, icons and labels, and the current section marked active. From `/decouvrir` each nav item navigates to its screen. No Stitch-provided bottom nav remains on any page.
5. **No bottom nav on gated flows.** The pages listed under Never (gated flows) render no bottom nav.
6. **One app header.** Every in-app page (member pages and gated flows; not the landing page, not staff) renders the same simple header from a single source: AnKanu brand mark linking to the member home when signed in, styled with the app tokens. No Stitch-provided page header or top app bar duplicates it.
7. **One app footer.** The same pages render the same simple footer from a single source (for example © year AnKanu and links such as Confidentialité), styled with the app tokens, sitting above the bottom nav and never covered by it. No Stitch-provided footer remains.
8. **Landing unchanged.** `/` keeps its existing header and footer.
9. **Quality gates.** Lint, typecheck, unit tests and e2e pass; new tests cover AC 1 to 8 (for example: unit tests that every in-app page's HTML contains exactly one shared nav/header/footer and no Stitch nav; e2e that toggles views on `/decouvrir` and asserts the chrome boxes do not move; axe zero serious or critical; no horizontal overflow at all widths).
