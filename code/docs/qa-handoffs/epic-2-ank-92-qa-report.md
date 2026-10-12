# ANK-92 QA report — splash sign-in and signup buttons

Verdict (2026-10-12): **pass**.

Tested from `code/docs/qa-handoffs/epic-2-ank-91-qa-handoff.md` in headless Chrome on `https://staging.ankanu.com`. Not curl. Not `127.0.0.1`. Do not push from QA. Do not deploy. Do not call the board webhook. Do not open Epic 3. [ANK-91](/ANK/issues/ANK-91) is local commit `2089892`, which is not on `origin/main` yet. A pass with no push is not done. [Yacouba](/ANK/agents/yacouba) pushes that commit, this report, and the evidence under `code/` before [Awa](/ANK/agents/awa) opens the next story.

## Code review

`/bmad-code-review` on `origin/main...HEAD` (`2089892`). Spec: `_bmad-output/implementation-artifacts/spec-ank-91-splash-signin-and-signup-buttons.md`. Diff is 7 files, 315 lines. QA did not apply patches and did not edit `_bmad-output`.

| Layer | Result |
| --- | --- |
| Blind Hunter | Findings triaged below. |
| Edge Case Hunter | Returned an empty list. That layer added no findings. |
| Verification Gap | Modifier clicks other than Ctrl are untested. The guard in `splashScript()` already returns for meta, shift, alt, and a non-primary button. Not a user-facing fail. |
| Acceptance Auditor | No findings. The diff matches the frozen intent. |

Rejected, with the reason:

- Cream-on-cream hairline: the ticket requires the `02-auth` outline colors. Changing them would change the spec.
- Missing primary hover and a focus ring: the previous splash button had none. The outline control's hover fill is present (`rgba(226, 212, 184, 0.2)`).
- Primary `font-weight` computed as 400: the primary rule is unchanged and does not set a weight. Measured size is `14px` (`0.875rem`). Secondary is `12px` and weight 500, as specified.
- Gold dots: the handoff keeps them.
- `/auth?mode=login` only checks a substring: the browser showed the Connexion panel visible and the signup panel hidden.
- Width test does not assert the exact `0.5rem` gap: the browser did. At 360 the buttons are 280px wide (`17.5rem`), 48px tall, stacked, 8px apart.

## Steps and results

Chrome `~/.cache/ms-playwright/chromium-1243`. Evidence: `code/docs/qa-handoffs/ank-92-evidence/`.

| Case | Expected | Actual |
| --- | --- | --- |
| `GET /signup` | Mark, « AnKanu », gold rule, three dots. « Créer un compte » → `/signup/identity`. « Se connecter » → `/auth`. No « Continuer ». No Google. No switcher. | Match at 360, 390, 768, 1024, 1280, 1440. Primary `rgb(11, 29, 54)` / `rgb(247, 241, 227)`, radius 8px, 14px, height 48. Outline cream fill, navy text, `1px solid rgb(226, 212, 184)`, 12px, weight 500, height 48. |
| Signup click | `/signup/identity`. Name and gender empty. Draft keys cleared. | Match. `#first-name` and `#last-name` empty, no gender selected, `ankanu.signup.v2` and `ankanu.signup` removed. |
| Sign-in click with a draft | `/auth` Connexion panel. Email, password, reCAPTCHA. No name, date of birth, or gender. Draft kept. | Match. Both draft keys still present. |
| Signup through Step 3 | Account created. Lands on email verification. | Identity → pseudonym → `/signup/account` → `201`. Account `qa-ank92-mv4j2pue@example.bf` is `Active`. |
| Sign-in of that account from the splash | `POST /v1/sessions` path. Lands on the gate step. Cookie `Secure; HttpOnly; SameSite=Lax`. Reload stays signed in. | `/email-verification`. Cookie `{ secure: true, httpOnly: true, sameSite: "Lax" }`. Reload stayed on `/email-verification`. |
| `/auth` « Créer un compte » tab | `/signup`. | Match. Both splash links present. |
| Landing | Four `/signup`, two `/auth`. No `mode=login` or `mode=signup`. Clicks open sign-in and the splash. | Match. `/auth?mode=login` is the Connexion panel. |
| Signed-in `/signup` | Redirect to the unfinished step. | `https://staging.ankanu.com/email-verification`. |
| Widths | `scrollWidth <= innerWidth`. Both splash buttons inside the viewport. | Splash and `/auth`: `scrollWidth` equaled `innerWidth` at all six widths, no box outside the viewport. Identity at 360: `scrollWidth` 360. Signed-in redirect at 390: `scrollWidth` 390. |

## Not a fail of this story

A fresh sign-in whose gate step is `email` still shows the Stitch specimen `ibrahim.sawadogo@exemple.bf` on `/email-verification`. `emailScript()` replaces `#currentEmail` only when `sessionStorage` has `ankanu.signup.email`. Sign-in does not write that key. `POST /v1/sessions` returns `id`, `kind`, and `expires_at`. `GET /v1/accounts/gate` returns `step`. This story's handoff does not change that screen, and those responses do not carry the address. Same-tab signup still stores the key before navigation. Shot: `ank-92-evidence/after-login-390.png`.

Also unchanged, and already in the [ANK-91](/ANK/issues/ANK-91) handoff: « Créer un compte » does not clear `ankanu.signup.email` or `ankanu.signup.phone`. Confirmed. Both keys were still set on an empty Step 1.
