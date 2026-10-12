# ANK-96 QA report — id-liveness gate and v2 colors

Verdict (2026-10-12): **pass**.

Tested from `code/docs/qa-handoffs/epic-2-ank-95-qa-handoff.md` in headless Chrome on `https://staging.ankanu.com`. Code review of `d4e828c` against `spec-ank-95-id-liveness-and-pseudonym-colors.md`. Do not push from QA. Do not deploy. Do not call the board webhook. Do not open Epic 3.

Disposable accounts were created with `POST /v1/accounts` and `recaptcha_token: test-ok`, then walked with the log mail link and the log OTP. Addresses, tokens, and codes are not recorded here. The headless browser does not check the reCAPTCHA checkbox. Not a product fail.

## /signup/pseudonym colors

Opened after an identity draft in `sessionStorage`. Final URL stayed `/signup/pseudonym`. Source contains `tailwind.config` and `#F7F1E3`. No `CNIB_recto`, no `alert(`.

| Sample | Served | v2 `54-pseudonym-dob/screen.png` |
| --- | --- | --- |
| Page pixel (12, 12) and computed body | `(247, 241, 227)` `rgb(247, 241, 227)` `#F7F1E3` | PNG corner `(247, 241, 227)` |
| Title computed | `rgb(11, 29, 54)` `#0B1D36` | navy type |
| Card computed | `rgba(251, 248, 241, 0.9)` `#FBF8F1` at 90% | card field |
| Card pixel | `(251, 248, 240)` | composite of that token on cream |
| Muted line computed | `rgb(122, 117, 105)` `#7A7569` | `text-brand-muted` |
| Field border computed | `rgba(226, 212, 184, 0.9)` `#E2D4B8` at 90% | `brand.border` |
| « Continuer → » pixel and computed | `(11, 29, 54)` `rgb(11, 29, 54)`, text `rgb(247, 241, 227)`, opacity 1 | PNG navy sample `(11, 28, 54)` |
| Hover pixel and computed | `(18, 40, 73)` `rgb(18, 40, 73)` `#122849`, text still cream | `hover:bg-[#122849]` |

The page is cream, not white. The button is navy with cream text.

## /id-liveness

| Case | Expected | Actual |
| --- | --- | --- |
| Nothing chosen, confirm | Stay. `La pièce d'identité et la photo de présence sont manquantes.` No gate. No dialog. | Stay on `/id-liveness`. That sentence. Calls after the click: `GET /v1/verifications/id`, `GET /v1/verifications/liveness`. No gate. No dialog. |
| JPEG plus one fake-camera photo, confirm | `POST` id 201, `POST` liveness 201, then the reads and the gate, then `/onboarding`. Reload stays. | Calls: both POSTs, both GETs, `GET /v1/accounts/gate`, then `/onboarding`. Title was `piece.jpg`. Reload stayed on `/onboarding`. |
| Both already `pending`, one click | No new POST. `/onboarding`. | API posts returned `201` `pending` while the page was open. The click sent no POST. Calls: both GETs and the gate. Landed on `/onboarding`. Reload stayed. A later open of `/id-liveness` also ended on `/onboarding`. |
| Selfie only | Stay. `La pièce d'identité est manquante.` | Stay. That sentence. One liveness POST, then the two reads. No gate. |
| ID only | Stay. `La photo de présence est manquante.` | Stay. That sentence. Title `piece.jpg`. One id POST, then the two reads. No gate. |
| Unsupported file | Inline error. Stay. Button usable again. | `Reprenez la capture.` Stay. Button enabled. |
| Camera `NotAllowedError` | `La caméra a été refusée.` No navigation. | That sentence. Stay on `/id-liveness`. |
| « Se connecter avec un autre compte » | Session ends, sign-in panel. | Landed on `/auth` and stayed there (the leave handler redirects `/auth?leave=1` to `/auth`). |
| Served HTML | No specimen filename, no dialog, no state switcher. | No `CNIB_recto`, no `alert(`, no switcher. « Remplacer » is on the page. The issuer line is the Stitch line under the empty title. |

Page background `rgb(247, 241, 227)`. Confirm button `rgb(11, 29, 54)` / `rgb(247, 241, 227)`, opacity 1. The error line was hidden until the empty confirm.

## Color sweep at 1440

Computed body background `#F7F1E3` and body text `#0B1D36` on every row. Primary control background `#0B1D36` and text `#F7F1E3`, except the opacity tokens below.

| Screen | Control | Input / card |
| --- | --- | --- |
| `/signup` | « Créer un compte » navy / cream, opacity 1 | Hand-built. No field. |
| `/signup/identity` empty | `rgba(11, 29, 54, 0.4)`, opacity 0.5 | `#first-name` `rgba(247, 241, 227, 0.9)`, border `#E2D4B8` |
| `/signup/identity` filled | solid navy / cream, opacity 1 | same field |
| `/signup/pseudonym` | navy / cream, opacity 1 | card and field as the table above |
| `/signup/account` | `#signup-submit` navy / cream, opacity 0.5 until captcha | `#signup-email` cream, border `#E2D4B8` |
| `/auth` | `#login-submit` navy / cream, opacity 0.5 until captcha | `#login-email` cream, border `#E2D4B8` |
| `/email-verification` | `#resendBtn` navy / cream, opacity 1 | no new input |
| `/phone` | `#send-code-btn` navy / cream, opacity 1 | phone wrapper cream, border `#E2D4B8` |
| `/otp` | `#submit-btn` navy / cream, opacity 1 | second box cream, border `#E2D4B8` |
| `/id-liveness` | confirm navy / cream, opacity 1 | error `#9B2C2C` when shown |
| `/password-reset` | submit navy / cream, opacity 1 | email wrapper cream, border `#E2D4B8` |
| `/pin` | `#btn-submit` text cream. Computed background `rgba(11, 29, 54, 0.9)`, the Stitch `hover:bg-deep-navy/90` token. Resting class is `bg-deep-navy`. | no text field |
| `/onboarding` | consultation link navy / cream, opacity 1 | no new input |

## Widths

360, 390, 768, 1024, 1280, 1440. `scrollWidth <= innerWidth` and no visible box outside the viewport on splash, identity, pseudonym, account, auth, reset, email verification, phone, OTP, id-liveness, the id error line, onboarding, and PIN.

Shots: `code/docs/qa-handoffs/ank-96-evidence/`. Pseudonym at 360 and 1440, id-liveness at 360 and 1440, the error line at 360 and 1440, onboarding at 1440.

## Code review

`d4e828c` against the ANK-95 spec. Acceptance check: the diff keeps the Tailwind config script, posts only an unsent capture, follows the gate, and uses the missing-capture sentences only for status `none`. No spec violation.

The idle viseur, the « Reprendre la capture » control with no handler, and the browser encode before the 5 MB cap are the known gaps already in the handoff. They are not new fails. The fake-camera confirm on staging stored a capture and reached `/onboarding`.

## Next

QA is done. A pass with no GitHub push is not done for the next story. Yacouba pushes the story's code, tests, and QA handoff under `code/`. Awa waits for that push. QA does not push, deploy, or open Epic 3.
