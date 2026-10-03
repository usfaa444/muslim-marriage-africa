---
title: 'Story 1.4 — Web shell, tokens, and three role chrome'
type: 'feature'
created: '2026-10-03'
status: 'done'
route: 'dispatch'
baseline_commit: 'ebee6c9b27cd5098e77cd3b770d0cd48062cf0bb'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** There is no `apps/web` shell. A visitor cannot open a French AnKanu landing or splash, and nothing refuses a staff cookie on a member route.

**Approach:** Add a Next.js App Router shell under `code/apps/web`. `/` matches `code/design-stitch/01-public-landing`. `/splash` matches `code/design-stitch/10-splash`. Tailwind tokens match `code/design-stitch/tokens/DESIGN.md`. Role chrome components exist and are not mounted on those two pages. Member routes refuse `ankanu_session=staff` with the kernel error envelope.

## Boundaries & Constraints

**Always:** French visible copy. Product name AnKanu. `lang="fr"`. Banned strings `dating` and `rencontre romantique` do not ship. Mihrab wash only on `/` and `/splash`. Primary control min-height 48px. Counter text is exactly `Mariages confirmés : 0`. Cookie name `ankanu_session`. Value is session kind `web`, `capacitor`, `mahram`, or `staff`. Member paths are `/decouvrir`, `/invitations`, `/discussions`, `/profil`. `staff` on those paths returns HTTP 403 and `{ error: { code: "FORBIDDEN", message: "Cette session d'équipe ne peut pas ouvrir un espace membre.", details: null, request_id, retryable: false } }` and no HTML. `mahram` on `/decouvrir`, `/invitations`, and `/discussions` returns HTTP 403 and message `Une session mahram ne peut pas ouvrir cet espace.` `web` does not import `modules/*/domain`. Pins: Next.js 16.3.6, React 19.3.0, Tailwind 4.3.3.

**Never:** Auth, age gate, a real PWA install prompt, Android, Docker, Redis, Postgres, `/v1/public/marriage-count`, a second metrics endpoint, SEO pages, or separate Legal, pricing, Académie, Board, FAQ, showcase, or cookie-consent pages. No Discover, Invitations, Discussions, or Profil screens. No member bottom nav on the public pages. No invented session fields.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Landing | Render `/` | French. AnKanu. `Mariages confirmés : 0`. Mihrab wash. No member nav. No banned lexicon. | N/A |
| Splash | Render `/splash` | AnKanu. Continue href `#prochaine-etape`. Mihrab mark. No member nav. | Error box starts hidden |
| Staff cookie | `ankanu_session=staff` on each member path | 403 JSON `FORBIDDEN` and the staff message. No `Découvrir`. | Envelope only |
| Mahram cookie | `ankanu_session=mahram` on `/decouvrir`, `/invitations`, `/discussions` | 403 JSON `FORBIDDEN` and the mahram message | Envelope only |
| Other session | Missing cookie, `web`, or `capacitor` on a member path; mahram on `/profil` | 401 JSON `UNAUTHENTICATED`, message `Session non authentifiée.` | Envelope only |
| Tokens | `button-primary`, `empty-state`, `error-banner` | Primary class includes `min-h-[48px]` and `bg-indigo`. Empty state is one sentence and one action. `PAY_UNAVAILABLE` does not disable Report, Blur, Mahram, Verification, Block, or browse. | French banner copy |
| Chrome | Render each shell | Member nav is the four labels. Mahram omits Découvrir and Invitations. Staff shows `Équipe seulement` and no member nav. Public pages render none of these. | N/A |

</frozen-after-approval>

## Code Map

- `code/apps/api` — leave the health body and worker shell unchanged.
- `code/packages/kernel/src/error.ts` — `errorEnvelope`. Reuse it. Do not add a second envelope.
- `code/design-stitch/01-public-landing/screen.html` — landing layout and copy. Match it.
- `code/design-stitch/10-splash/screen.html` — splash layout and copy. Match it. Splash spacing keys 5 and 6 differ from the landing scale; keep landing on default Tailwind spacing.
- `code/design-stitch/tokens/DESIGN.md` — color, type, and radius tokens. Not the layout.
- `code/package.json` — add the web workspace to typecheck. Do not change API pins.

## Tasks & Acceptance

**Execution:**
- [x] `code/apps/web` — Next.js shell, tokens, landing, splash, chrome, member-route refusal — so the story has a home
- [x] `code/apps/web/src/member-route.test.ts` — matrix rows for cookies — so the refusal is executed
- [x] `code/apps/web/src/shell.test.tsx` — landing, splash, tokens, chrome, banned lexicon — so the visible shell is executed

**Acceptance Criteria:**
- Given a 360px landing, when it renders, then the UI is French, the name is AnKanu, the banned lexicon is absent, and the mihrab wash is on the landing.
- Given the token components, when inspected, then sand, indigo, gold, staff, and blur-wash and the two Source families are the theme, primary height is 48px, and empty-state and error-banner exist.
- Given a staff cookie, when a member route is requested, then the response is the forbidden envelope and not a member screen.

## Implementation Notes

- Stitch files for this story were on `origin/main` and absent from the local branch. Checked out `01-public-landing`, `10-splash`, and `tokens` only.
- `GET /v1/public/marriage-count` is not in `apps/api`. The landing counter is the Stitch literal `Mariages confirmés : 0`. No second metrics endpoint.
- Cookie `ankanu_session` value is the session kind. Member paths return JSON only.
- Splash install click replaces the Stitch sentence. It does not call an install API.
- Verified in Chromium at 360px and 1280px: French landing, counter 0, cookie dismiss, splash continue href `#prochaine-etape`, staff cookie `GET /decouvrir` is 403. `npx vitest run apps/web/src/member-route.test.ts apps/web/src/shell.test.tsx` — 10 passed. `npm run typecheck`, `npm run lint`, and `npx next build` passed.

## Spec Change Log

## Review Triage Log

- malformed `decodeURIComponent` — medium — patched. Invalid encoding is skipped. A staff value still refuses.
- later `ankanu_session=staff` ignored — medium — patched. Any staff value wins.
- encoded whitespace around `staff` — low — patched. The value is trimmed after decode.
- `frenchErrorMessage` inherited keys — low — patched. Only own keys map.
- route `GET` handlers untested — medium — patched. Each handler is called with a staff cookie.
- 401 and mahram responses unchecked for content-type — medium — patched.
- `RoleChrome` member and mahram branches untested — low — patched.
- splash error box hidden class untested — low — patched.
- splash could include staff chrome unnoticed — low — patched. The splash render must not contain `Équipe seulement`.
- cookie banner absent from the landing assertion — low — patched. The first paint must contain `#cookie-consent`.
- unlayered font-weight overrode `font-bold` and `font-semibold` — medium — patched. Those rules were removed. `text-body-strong` stays 600.
- italic Wali line had no italic face — low — patched. Source Serif 4 loads italic.
- Material Symbols loaded on the landing — low — patched. The link is on the splash layout. Icons are `aria-hidden`.
- splash progress skipped 75% — low — patched. Reduced motion still jumps to verified.
- test tsx included in the Next program — low — patched. Excluded.
- applied stylesheet not proven by a unit test — low — deferred. The build emits the theme.
- 360px header overflow, gold focus ring, 40px cookie control, euro prices, board names, missing `#faq`, English titles, splash session sentence, multiple primaries — false. Those pixels are the Stitch files.
- empty mahram shell — false. Discussions and Profil pages are not this story. The shell omits Découvrir and Invitations.
- POST not returning 403, cache headers, quoted cookies, spacing scale 5/6/7, DESIGN.md source paths, stitch JSON palette — false. The landing scale stays the Stitch default. Downloaded token files were not rewritten.
- spec command names `shell.test.ts` — false. The fix would edit the spec. Vitest runs `shell.test.tsx`.

## Design Notes

Landing classes stay on the default Tailwind spacing scale because that file's CDN config does not remap it. Splash `p-6`, `px-6`, and `mb-6` are 32px in its own config, so those utilities become `p-8`, `px-8`, and `mb-8`. Splash `pt-5` is 24px, so it becomes `pt-6`. Theme `rounded-lg` is 20px from DESIGN.md; splash corners that were 8px use `rounded-[0.5rem]`. Continue stays `#prochaine-etape`. The marriage counter is the literal 0. The splash install control only swaps the Stitch sentence. It does not call an install API.

## Verification

**Commands:**
- From `code/`: `npx vitest run apps/web/src/member-route.test.ts apps/web/src/shell.test.ts` — expected: matrix rows pass.
- From `code/`: `npm run typecheck` and `npm run lint` — expected: pass.
- From `code/apps/web`: `npx next build` — expected: `/` and `/splash` and the four member routes compile.
