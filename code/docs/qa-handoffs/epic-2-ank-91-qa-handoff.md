# Epic 2 ANK-91 QA handoff

Founder request, 11 Oct 2026: the splash needs a sign-in path that skips name, date of birth, and gender. This is a deviation from `01-splash` in the button slot only. Everything else on that screen stays as built.

Handoff for [ANK-92](/ANK/issues/ANK-92). Staging: `https://staging.ankanu.com`. Do not use `127.0.0.1` for the browser pass. Do not open Epic 3. Push waits until this QA pass is on GitHub.

## What was built

`GET /signup` still serves the hand-built splash (mark, title, gold rule, three dots). The single « Continuer » control is gone. In that same centered slot, 17.5rem wide, two links are stacked with the splash dots gap (`0.5rem`):

1. « Créer un compte » — class `continue`, `href="/signup/identity"`. Navy `#0B1D36`, cream `#F7F1E3`, radius 8px, `min-height: 3rem`, type size `0.875rem`. An unmodified primary click clears `ankanu.signup.v2` and `ankanu.signup` before Step 1, so identity still starts empty. Ctrl/Cmd/Shift/Alt-click and non-primary buttons do not clear it.
2. « Se connecter » — class `signin`, `href="/auth"`. The `02-auth` outline button: cream `#F7F1E3`, navy text `#0B1D36`, border `1px solid #E2D4B8`, radius 8px, `min-height: 3rem`, type size `0.75rem`, weight 500, padding `0 1rem`. Hover fill is `rgba(226, 212, 184, 0.2)` (`hover:bg-hairline/20`). Loading the splash or following this link does not write or remove the signup draft.

`/auth` and `/auth?mode=login` still serve the Connexion panel (email, password, reCAPTCHA). The « Créer un compte » tab on that panel assigns `/signup`. `/auth?mode=signup` is still 303 to `/signup`. Landing login links stay `href="/auth"` (two). Landing signup CTAs stay `href="/signup"` (four). A signed-in member on `/signup` is still sent to the unfinished gate step.

No new table, field, relationship, or endpoint. `POST /v1/sessions` is unchanged.

## Where

- `code/apps/web/src/v2-pages.ts` — splash markup and the two button rules
- `code/apps/web/src/v2-client.ts` — `splashScript()` clears the draft on the signup click only
- `code/apps/web/src/v2-flow.test.ts`
- `code/apps/web/src/v2-responsive.test.ts` — splash buttons at the six widths
- Width shots: `code/docs/qa-handoffs/ank-83-widths/00-splash-360.png` and `00-splash-1440.png`

## How to run

From `code/`:

```bash
npx vitest run --fileParallelism false \
  apps/web/src/v2-flow.test.ts \
  apps/web/src/native-dialog.test.ts
npx vitest run --fileParallelism false apps/web/src/v2-responsive.test.ts
```

`v2-responsive.test.ts` needs the cached Playwright Chrome or `ANKANU_CHROME`. It fails if `document.documentElement.scrollWidth > window.innerWidth`, if a visible box crosses the viewport, or if the splash buttons are under 44px, overlap, differ in width, or leave the viewport at 360, 390, 768, 1024, 1280, or 1440.

Browser pass: `https://staging.ankanu.com` (web container only was recreated; api, worker, postgres, redis, and bucket stay up). Port `4012` stays `0.0.0.0:4012->3000`.

## Test cases

| Case | Input | Expected |
| --- | --- | --- |
| Splash | `GET /signup` anonymous | 200. Mark, « AnKanu », gold rule, three dots. Exactly « Créer un compte » → `/signup/identity` and « Se connecter » → `/auth`. No « Continuer ». No `accounts.google.com`. No state switcher. |
| Signup click | Unmodified click on « Créer un compte » | `/signup/identity`. Name, gender, then pseudonym and date of birth, unchanged. Draft keys `ankanu.signup.v2` and `ankanu.signup` are cleared on that click, so Step 1 is empty. |
| Sign-in click | A draft in `sessionStorage`, then « Se connecter » | `/auth` Connexion panel: email, password, reCAPTCHA. No name, date of birth, or gender step. The draft keys are still present. |
| Sign-in submit | Existing account, email + password + captcha | `POST /v1/sessions` 201. Lands on the gate step. Cookie `Secure; HttpOnly; SameSite=Lax` on `https://staging.ankanu.com`. Reload stays signed in. |
| Back to signup | On `/auth`, « Créer un compte » tab | `/signup`, then « Créer un compte » → `/signup/identity`. |
| Landing | `GET /` | Two `href="/auth"` login links. Four `href="/signup"` signup CTAs. No `mode=login` and no `mode=signup` on the landing. `/auth?mode=login` still opens Connexion. |
| Signed-in splash | Session cookie, `GET /signup` | 303 to the unfinished step (`/email-verification` when the step is `email`). |
| Widths | Splash at 360, 390, 768, 1024, 1280, 1440 | `scrollWidth <= innerWidth`. Both buttons fully inside the viewport, stacked, same width, height ≥ 44. |

## Test data

- Use an existing staging account for sign-in. Do not create extra accounts to prove the splash. Do not trip `rl_auth_per_min`.
- Unit captcha token is `test-ok`. Staging uses the Google test widget already in Compose.

## My results

- `v2-flow.test.ts`: 14 passed. `native-dialog.test.ts`: 1 passed in the run before the last assertion (15 tests across both files).
- `v2-responsive.test.ts`: 1 passed. Splash buttons measured at all six widths. Shots rewritten at 360 and 1440.
- Web image `sha256:620c2469e5f8d214d4de36a40c38a4d8fe503679f7400ae644ac637b9ce1ccaf`, container recreated `2026-10-12T00:06:14Z`, healthy. Api `2026-10-11T20:49:39Z`, worker same minute, postgres and redis and bucket still 5 October. `0.0.0.0:4012->3000` still bound.
- `GET https://staging.ankanu.com/signup` 200 with both anchors and no « Continuer ». `GET /auth` and `GET /auth?mode=login` 200 on the Connexion panel. `GET /auth?mode=signup` 303 to `/signup`. Landing has four `/signup` links and two `/auth` links.
- Headless Chrome on `https://staging.ankanu.com`: « Se connecter » landed on `/auth` with email, password, and the login captcha slot, and left `ankanu.signup.v2` in place. « Créer un compte » landed on `/signup/identity` with `#first-name` and the draft removed. The « Créer un compte » tab on `/auth` returned to `/signup`. At 390px both buttons were 48px tall. At 360 and 1440, `scrollWidth` stayed within the viewport and the buttons stayed stacked.

## Three validation passes

1. Routes and draft: splash anchors, outline and primary rules, signup click clears only the two draft keys, sign-in submit does not write or remove the draft, landing hrefs unchanged, `/auth?mode=login` is the Connexion panel, signed-in `/signup` still redirects.
2. Screen: one splash state from the existing mark. No Google button, no « Continuer », no Stitch state switcher, no second demo state.
3. Widths: Chrome check at 360, 390, 768, 1024, 1280, and 1440. Proof is `scrollWidth <= innerWidth`, no box outside the viewport, and both splash buttons visible, stacked, same width, and at least 44px tall. Screenshots at 360 and 1440.

## Solution-design sections

`SOLUTION-DESIGN.md` §7 Auth paragraph: `POST /v1/sessions` still requires `recaptcha_token`. `GET /v1/accounts/gate` still chooses the step. No new relationship. The session cookie flags are unchanged.

## Stitch files

- Rest of Step 0: `code/design-stitch/ankanu-v2/01-splash/screen.png`. That folder's HTML is still not served.
- Button area is the founder deviation: primary keeps the splash navy button; secondary copies the outline control in `code/design-stitch/ankanu-v2/02-auth/screen.html` (cream, hairline border, navy text, 8px radius).
- Step 1 is still `03-age-gate/screen.html`. Sign-in is still `02-auth/screen.html`.

## Known gaps

- « Créer un compte » still does not clear `ankanu.signup.email` or `ankanu.signup.phone`. The splash clear never did. Email and phone screens can still show a previous address or number.
- Push to `main` waits for the QA pass on [ANK-92](/ANK/issues/ANK-92).
