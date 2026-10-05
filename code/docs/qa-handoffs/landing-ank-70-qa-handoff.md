# ANK-70 landing signup and login QA handoff

## What was built

From the public landing, a new visitor can open signup, and a returning visitor can open login.

- « Commencer l'inscription », « Déposer une demande de ta'aruf », and « Découvrir les modules de l'Académie » still go to `#auth-inscription` on the same page.
- Inside that section, « Déposer mon dossier de ta'aruf » goes to `/auth?mode=signup`. It is no longer `href="#"`.
- « Déjà inscrit·e ? Se connecter » is in the header (nav `Compte`, stacked above the inscription button) and again under the section button. Both go to `/auth?mode=login`.
- `/auth` reads `mode` on load. `login` shows the login panel. `signup` shows the signup panel. Any other value, including no query, shows signup. The address is not rewritten when someone clicks a tab.

Founder-requested deviation from the landing PNG: those two login links were not in `01-public-landing`. The header control is stacked so the five section links keep their row. Below `md`, the inscription section has extra bottom padding so the cookie bar does not cover the new link. `DESIGN.md` is not the layout.

## Where

- `code/apps/web/src/landing.tsx`
- `code/design-stitch/01-public-landing/screen.html` (same links as the React page)
- `code/apps/web/src/auth-page.ts` — script inserted before `</body>` on `GET /auth`
- `code/apps/web/app/auth/route.ts` — unchanged; it already serves `authPageHtml`
- `code/apps/web/src/landing-auth-links.test.ts`
- `code/apps/web/src/auth-page.test.ts`

## How to run

From `code/`:

```bash
npx vitest run --config vitest.unit.config.ts apps/web/src/landing-auth-links.test.ts apps/web/src/auth-page.test.ts apps/web/src/shell.test.tsx
npx oxlint apps/web/src/landing.tsx apps/web/src/auth-page.ts apps/web/src/auth-page.test.ts apps/web/src/landing-auth-links.test.ts
npx tsc -p apps/web/tsconfig.json --noEmit
```

The click test uses a local Chrome or Chromium binary (`ANKANU_CHROME`, `/usr/bin/google-chrome`, `/usr/bin/chromium`, or `~/.cache/ms-playwright/chromium-*`). If none is installed, that one describe block is skipped and the markup tests still run.

Open `/`. Use the section button for signup and either « Se connecter » link for login. The three calls listed above should only scroll to `#auth-inscription`.

## Test cases

| Case | Action | Expected |
| --- | --- | --- |
| Header inscription | Click « Commencer l'inscription » | Same page, hash `#auth-inscription` |
| Hero | Click « Déposer une demande de ta'aruf » | Same page, hash `#auth-inscription` |
| Académie | Click « Découvrir les modules de l'Académie » | Same page, hash `#auth-inscription` |
| Section dossier | Click « Déposer mon dossier de ta'aruf » | `/auth?mode=signup`. Signup panel visible. Login panel hidden. Signup tab `aria-selected=true` |
| Header login | Click the header « Déjà inscrit·e ? Se connecter » | `/auth?mode=login`. Login panel visible. Signup panel hidden. Login tab `aria-selected=true` |
| Under-button login | Click the same phrase under the dossier button | Same as header login |
| Bare auth | Open `/auth` | Signup panel. `data-auth-mode=signup` |
| Explicit signup | Open `/auth?mode=signup` | Signup panel |
| Other mode | Open `/auth?mode=other` | Signup panel. Query stays `mode=other` |

## Test data

No account, password, or fixture. The links do not submit a form.

## Results

- `npx vitest run --config vitest.unit.config.ts apps/web/src/landing-auth-links.test.ts apps/web/src/auth-page.test.ts apps/web/src/shell.test.tsx`: 3 files, 11 tests passed. The click test ran here (Chrome was present).
- `npx oxlint` on the four touched TypeScript files: clean.
- `npx tsc -p apps/web/tsconfig.json --noEmit`: passed.
- Live `next dev` at `http://127.0.0.1:3456` (the server already running for this app): at 390px and 1280px the document does not scroll sideways, the header login link is visible, and the section login link is visible. Clicking « Déposer mon dossier de ta'aruf » opened `/auth?mode=signup` with the signup panel. Opening `/auth?mode=login` showed the login panel and `data-auth-mode=login`.
- I did not redeploy port 4012. Push waits until QA passes.

## Three validation passes

1. Browser: headless Chrome clicked the three scroll calls, the section dossier button, and both login links, then opened `/auth` and `/auth?mode=other`.
2. Markup and script: rendered landing hrefs match the Stitch HTML, and the auth script selects login or signup from the query, including the `data-auth-mode` attribute.
3. Static: oxlint on the touched files and `tsc` for the web package.

## Solution-design sections

This ticket did not paste a SOLUTION-DESIGN section. No new table, field, relationship, or endpoint. `GET /auth` already existed. The ops mapping on [ANK-70](/ANK/issues/ANK-70) is the contract.

## Stitch files

- `code/design-stitch/01-public-landing/screen.html` — updated with the same hrefs as the app
- `code/design-stitch/01-public-landing/screen.png` — not edited. The login links are a founder-requested deviation from that PNG
- `code/design-stitch/11-auth/screen.html` — not edited. The mode script is injected at request time
- `code/design-stitch/11-auth/screen.png` — not edited

## Known gaps

- The automated click test serves the landing markup without Tailwind. A separate headless pass on the running `next dev` server checked 390px and 1280px with styles loaded. It did not click through the open cookie bar.
- CI skips the Chrome describe block when no browser binary is installed. The href assertions still run.
- Clicking the login or signup tab does not change `?mode`.
- Staging on port 4012 is unchanged until QA passes and this commit is pushed. Epic 3 stays closed.
