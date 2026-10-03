# Epic 1 Story 1.4 QA handoff

## What was built

A French Next.js public shell. `/` is the public landing. `/splash` is the splash. Tailwind tokens carry the sand, indigo, gold, staff, and blur-wash colors and Source Serif 4 / Source Sans 3. `button-primary`, `button-secondary`, `button-quiet`, `empty-state`, and `error-banner` exist. Member, Mahram, and Staff chrome components exist and are not mounted on the public pages. A staff session cookie cannot open a member route.

## Where

- `code/apps/web` — App Router shell
- `code/apps/web/src/landing.tsx` — public landing
- `code/apps/web/src/splash.tsx` — splash
- `code/apps/web/src/components.tsx` — buttons, empty-state, error-banner
- `code/apps/web/src/chrome.tsx` — three role shells
- `code/apps/web/src/member-route.ts` — staff and mahram refusal
- `code/apps/web/app/decouvrir/route.ts`, `invitations`, `discussions`, `profil` — member paths
- `code/apps/web/src/member-route.test.ts`
- `code/apps/web/src/shell.test.tsx`

## How to run

From `code/`:

```bash
npx vitest run apps/web/src/member-route.test.ts apps/web/src/shell.test.tsx
npm run typecheck
npm run lint
```

Production build, from `code/apps/web`:

```bash
npx next build
npx next start -p 3214
```

Open `http://127.0.0.1:3214/` at 360px and at a desktop width. Open `http://127.0.0.1:3214/splash`.

Staff refusal:

```bash
curl -s -D - -o /tmp/member.json -H 'Cookie: ankanu_session=staff' http://127.0.0.1:3214/decouvrir
```

Expected: HTTP 403, `content-type` JSON, body `error.code` `FORBIDDEN`, message `Cette session d'équipe ne peut pas ouvrir un espace membre.`, `details` null, `retryable` false, a `request_id`. The body is not HTML.

## Test cases

| Case | Input | Expected |
| --- | --- | --- |
| Landing | `GET /` at 360px | French. Product name AnKanu. Text `Mariages confirmés : 0`. Mihrab wash on the hero. No member bottom nav. No `dating`. No `rencontre romantique`. Hero `h1` is 3 lines, font-size 30px, line-height 36px. |
| Landing desktop | `GET /` wide | Header links: La Vision, Académie, Board consultatif, Médiation & Tuteur, Tarifs transparents. Primary `Commencer l'inscription` is at least 48px tall. Hero line-height is 40px at 640px and 48px at 768px and 1280px. |
| Cookie control | Click `Accepter les paramètres stricts` | The banner leaves the page. No consent record is stored. |
| Splash | `GET /splash` | AnKanu, the Mihrab mark, `Continuer vers le sanctuaire` with `href="#prochaine-etape"`. First paint says `Vérification du sanctuaire sécurisé`. After about 1.4s the title becomes `Sanctuaire vérifié & session active`. `#status-subtitle` is 13px with font-weight 500. |
| Splash install | Click `Installer` | The line becomes `Raccourci PWA prêt sur votre terminal Android.` No browser install prompt. |
| Staff cookie | `Cookie: ankanu_session=staff` on `/decouvrir`, `/invitations`, `/discussions`, `/profil` | 403 JSON `FORBIDDEN` and the staff message. No member screen. |
| Mahram cookie | `ankanu_session=mahram` on `/decouvrir`, `/invitations`, `/discussions` | 403 JSON `FORBIDDEN` and `Une session mahram ne peut pas ouvrir cet espace.` |
| Mahram on profil | `ankanu_session=mahram` on `/profil` | 401 JSON `UNAUTHENTICATED`, message `Session non authentifiée.` |
| Other sessions | No cookie, `web`, or `capacitor` on a member path | 401 JSON `UNAUTHENTICATED`. |
| Tokens | `code/apps/web/app/globals.css` and `layout.tsx` | Hex values `#F4EDE0`, `#1F3A5F`, `#C4A35A`, `#6B3D2E`, `#C8BBA6`. Fonts Source Serif 4 and Source Sans 3. `html lang="fr"`. |
| Components | Render `ButtonPrimary`, `EmptyState`, `ErrorBanner` | Primary includes `min-h-[48px]` and `bg-indigo`. Empty state is one sentence and one action. `PAY_UNAVAILABLE` copy is `Le paiement est indisponible.` Report, Blur, Mahram, Verification, Block, and browse stay enabled. |
| Chrome | Render each shell | Member labels are Découvrir, Invitations, Discussions, Profil. Mahram shows Discussions and Profil and omits Découvrir and Invitations. Staff shows `Équipe seulement` and no member nav. Public pages do not render these shells. |
| Reduced motion | `prefers-reduced-motion: reduce` | Splash spinner animation is disabled. The status still reaches the verified line. |

## Test data

Cookie name `ankanu_session`. Values used: `staff`, `mahram`, `web`, `capacitor`. No database. The marriage counter is the constant 0. There is no account fixture.

## My results

`npx vitest run apps/web/src/shell.test.tsx` — 5 passed after the QA fixes. `npm run typecheck` passed. `npm run lint` passed. `npx next build` compiled `/`, `/splash`, and the four member routes.

Chromium against the Stitch files: the hero `h1` is 30px / 36px and 108px tall at 360px (3 lines), 40px line-height at 640px, and 48px line-height at 768px and 1280px. The primary button bottom matches the Stitch file at those four widths. `#status-subtitle` is 13px with font-weight 500. `MahramChrome` renders Discussions and Profil and omits Découvrir and Invitations.

## Three validation passes

1. Browser: landing at 360px and 1280px, cookie dismiss, splash first paint and the later verified line, continue href unchanged.
2. HTTP: staff cookie refused on all four member paths; mahram refused on discover, invitations, and discussions; missing cookie and `web` stay 401 JSON.
3. Static: vitest, `npm run typecheck`, `npm run lint`, and `npx next build`.

## Solution-design sections

- §2 inherited product — French public shell, web only.
- §3 paradigm — `apps/web` does not import `modules/*/domain`.
- §4 stack — Next.js 16.3.6, React 19.3.0, Tailwind 4.3.3.
- session (AD-8) — `ankanu_session` kind `staff` cannot open a member path. No new session fields.
- marriage_counter — public text is 0. The table was not created.
- §7.1 — `/v1/public/marriage-count` was not added. It is not in the running API.
- §13 — staff cookie refusal uses the AD-7 envelope.
- §14 — not deployed.

## Stitch files

- `code/design-stitch/01-public-landing/screen.html`
- `code/design-stitch/01-public-landing/screen.png`
- `code/design-stitch/10-splash/screen.html`
- `code/design-stitch/10-splash/screen.png`
- Tokens only: `code/design-stitch/tokens/DESIGN.md`

## Known gaps

- `GET /v1/public/marriage-count` does not exist. The counter stays the launch value 0. No second metrics endpoint was added.
- Member paths do not render Discover, Invitations, Discussions, or Profil. They only return the envelope.
- Continue stays on `#prochaine-etape`. Auth is not this story.
- The splash install control only swaps the Stitch sentence. There is no service worker and no browser install prompt.
- The cookie banner hides in the page. It does not store a consent record.
- The Stitch cookie button is `min-h-[40px]`. The primary component is 48px.
- The landing document title is the Stitch string `Public landing`.
- The splash verified line is the Stitch demo. It does not create a session.
- Mahram on `/profil` is 401. The pasted rule refuses mahram on browse, invite, and chat write, and does not name Profil.
- This machine's Node is 24.5.0. The package engine pin remains 24.21.0.
