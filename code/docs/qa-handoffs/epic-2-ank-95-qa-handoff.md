# Epic 2 ANK-95 QA handoff

`/signup/pseudonym` keeps its v2 cream palette. « Confirmer et transmettre pour vérification » on `/id-liveness` sends any capture that is not already stored, then opens the step `GET /v1/accounts/gate` returns. Pending ID and selfie counts. There is no live-check.

Handoff for the QA ticket on this story. Staging: `https://staging.ankanu.com`. Do not open Epic 3. Push waits until this QA pass is recorded. A pass with no push is not done.

## What was built

`stripDemoScripts` keeps an inline script whose body starts with `tailwind.config =`, with or without `id="tailwind-config"`. A script with `src` is still kept. Any other inline script is still removed. `/signup/pseudonym` is `54-pseudonym-dob`. Its config defines `brand.cream #F7F1E3`, `brand.card #FBF8F1`, `brand.navy #0B1D36`, `brand.gold #C9A86C`, `brand.border #E2D4B8`, `brand.muted #7A7569`, and the Cormorant Garamond / Plus Jakarta Sans families. « Continuer → » stays `bg-brand-navy` / `text-brand-cream`, hover `#122849`, active `#071324`. The script does not dim that button.

`/id-liveness` still posts `POST /v1/verifications/id` and `POST /v1/verifications/liveness` with `{ image }` base64. One captured photo is enough. Nothing waits on a liveness score. « Confirmer et transmettre pour vérification » sends a file or selfie chosen in this visit and not yet accepted, then `GET /v1/verifications/id`, `GET /v1/verifications/liveness`, then `GET /v1/accounts/gate`. Those reads use `cache: 'no-store'`. The button is disabled only while that request runs. It opens the gate step: `account` → `/onboarding`, `phone` → `/phone`, and the other existing steps the same way. If both captures are already `pending` or `granted`, one click does not upload again and still follows the gate.

If a capture status is `none`, the page stays and shows one line in the `02-auth` error style (`text-[#9B2C2C]`, `error` icon, `#id-error`):

- ID only: `La pièce d'identité est manquante.`
- Selfie only: `La photo de présence est manquante.`
- Both: `La pièce d'identité et la photo de présence sont manquantes.`

A non-201 upload shows `error.message` from the server, or `L'envoi a échoué.` A thrown request shows `La connexion a échoué.` A camera permission error (`NotAllowedError`, `PermissionDeniedError`, `SecurityError`) shows `La caméra a été refusée.` No camera API shows `La caméra est indisponible.` Any other capture failure shows `La capture a échoué.` No `alert`, `confirm`, or `prompt`.

The real file name is shown when a file is chosen. A capture already stored shows `Pièce enregistrée` and the « Document conforme » chip. Only that chip is hidden before a stored ID. « Remplacer » stays visible. « Se connecter avec un autre compte » is unchanged. `CNIB_recto_verso.pdf` is not in the HTML.

A stored status other than `pending` or `granted` (`held`, `rejected`) does not use the missing-capture sentence. The page follows the gate. If that step is still `/id-liveness`, it stays and shows `Reprenez la capture.`

## Color sweep

Headless Chrome at 1440, after Tailwind loaded. Page background `#F7F1E3` `rgb(247, 241, 227)`. Body text `#0B1D36` `rgb(11, 29, 54)`. Primary control background `#0B1D36`, text `#F7F1E3`, except where the Stitch class is an opacity token.

| Screen | Page | Primary control | Input / card |
| --- | --- | --- | --- |
| `/signup` | cream, navy text | « Créer un compte » navy / cream | Hand-built CSS, no Tailwind config. |
| `/signup/identity` | cream, navy text | Filled draft: solid navy / cream. Empty Stitch button remains `bg-deep-navy/40` plus `opacity-50`. | `#first-name` cream at 90%, border `#E2D4B8`. |
| `/signup/pseudonym` | cream, navy text | « Continuer » navy / cream | Card `brand.card` at 90% (`#FBF8F1`). Field border `brand.border` at 90% (`#E2D4B8`). Muted line `brand.muted` at 90% (`#7A7569`). |
| `/signup/account` | cream, navy text | `#signup-submit` navy / cream | `#signup-email` cream, border `#E2D4B8`. |
| `/auth` | cream, navy text | `#login-submit` navy / cream | `#login-email` cream, border `#E2D4B8`. |
| `/email-verification` | cream, navy text | `#resendBtn` navy / cream | Address is filled from the API, not a Stitch value. |
| `/phone` | cream, navy text | `#send-code-btn` navy / cream | Phone field wrapper cream, border `#E2D4B8`. |
| `/otp` | cream, navy text | `#submit-btn` navy / cream | Second OTP box cream, border `#E2D4B8`. The first box is autofocused. |
| `/id-liveness` | cream, navy text | Confirm navy / cream | No text field. Error line `#9B2C2C` when shown. |
| `/password-reset` | cream, navy text | Submit navy / cream | Email wrapper cream, border `#E2D4B8`. The input itself is transparent. |
| `/pin` | cream, navy text | `#btn-submit` navy / cream | No text field. |
| `/onboarding` | cream, navy text | Consultation link navy / cream | No new input. |

No served signup or sign-in step was missing `#F7F1E3` or `#0B1D36`. `53-barre-de-navigation` has the same untagged config and is not served.

## Where

- `code/apps/web/src/v2-document.ts` — keep the Tailwind config script
- `code/apps/web/src/v2-client.ts` — confirm, camera, badge chip
- `code/apps/web/src/v2-pages.ts` — `#id-error`
- `code/apps/web/src/v2-id-liveness.test.ts`
- `code/apps/web/src/v2-flow.test.ts`
- `code/apps/web/src/v2-responsive.test.ts`
- Width shots: `code/docs/qa-handoffs/ank-83-widths/02-pseudonym-360.png`, `02-pseudonym-1440.png`, `08-id-360.png`, `08-id-1440.png`, `08b-id-error-360.png`, `08b-id-error-1440.png`

## How to run

From `code/`:

```bash
npx vitest run --config vitest.unit.config.ts \
  apps/web/src/v2-id-liveness.test.ts \
  apps/web/src/v2-flow.test.ts \
  apps/web/src/native-dialog.test.ts
npx vitest run --config vitest.unit.config.ts apps/web/src/v2-responsive.test.ts
```

The width file needs Chrome. It fails if `scrollWidth > innerWidth`, a visible box leaves the viewport, a funnel color above does not match, « Remplacer » is hidden, or the id error line has no height.

Browser pass: `https://staging.ankanu.com`. Open `/signup/pseudonym` after the identity step. The page is cream, the card is warm off-white, and « Continuer → » is navy with cream text. On `/id-liveness`, click the confirm button with nothing chosen, with only an ID, and with only a selfie. Then choose a JPEG and take one photo and confirm. A member who already has both captures pending should reach `/onboarding` in one click. Do not expect a face-scan step.

## Test cases

| Case | Setup | Expected |
| --- | --- | --- |
| Pseudonym colors | Identity draft, then `/signup/pseudonym` | Cream page `#F7F1E3`, navy type, cream-on-navy « Continuer → ». No white page. |
| Config kept | View source of `/signup/pseudonym` | `tailwind.config` and `brand.cream` `#F7F1E3` are present. No demo script. |
| Fresh ID + selfie | Signed in at identity, JPEG chosen, one camera photo, confirm | `POST /v1/verifications/id` 201, `POST /v1/verifications/liveness` 201, then the three reads, then `/onboarding`. |
| Already pending | Both captures already `pending` | One click, no new POST, `/onboarding`. |
| Missing ID | Selfie already stored, no file | Stay. `La pièce d'identité est manquante.` |
| Missing selfie | ID already stored, no photo | Stay. `La photo de présence est manquante.` |
| Both missing | Neither stored | Stay. `La pièce d'identité et la photo de présence sont manquantes.` Gate is not called. |
| Upload error | POST returns 400 `Reprenez la capture.` | That sentence inline. Stay. Button enabled again. |
| Network | POST throws | `La connexion a échoué.` Stay. |
| Camera refused | `getUserMedia` `NotAllowedError` | `La caméra a été refusée.` No navigation. |
| Held capture | ID status `held`, gate step `identity` | Stay. `Reprenez la capture.` Not the missing-ID sentence. |
| Other gate step | Both captures `granted`, gate `phone` | `/phone`. |
| Switch account | Click « Se connecter avec un autre compte » | Session DELETE, then `/auth?leave=1`. |
| No dialog | Every path above | No `alert`, `confirm`, or `prompt`. |
| Widths | 360, 390, 768, 1024, 1280, 1440, including the error line | `scrollWidth <= innerWidth`. « Remplacer » visible. No horizontal scroll. |

## Test data

Use a signed-in member already at the identity step. A tiny JPEG is enough. The unit fixture bytes are `FF D8 FF D9`. No sample name is rendered. `Pièce enregistrée` is the label when the server already has an ID and this visit has not chosen a new file.

## My results

- `v2-id-liveness.test.ts`, `v2-flow.test.ts`, `native-dialog.test.ts`: 40 passed.
- `v2-responsive.test.ts`: 2 passed. Widths 360, 390, 768, 1024, 1280, 1440. Color table above matched at 1440. `08b-id-error` error line was visible and inside the viewport. « Remplacer » was visible. The badge chip was the only hidden document node.

## Three validation passes

1. Behavior: config script kept and a demo script removed. Each id path above, including gate `phone` instead of a hardcoded `/onboarding`. Button disabled only while the confirm request runs. No native dialog.
2. Screen: one state from the real response. Empty title until a file or a stored ID. Error line only after a real miss or failure. No `CNIB_recto_verso.pdf`. No Stitch state switcher.
3. Widths: Chrome at 360, 390, 768, 1024, 1280, and 1440. `scrollWidth <= innerWidth` and no box outside the viewport, including the inline error. Computed colors at 1440 match the table.

## Solution-design sections

No new table, field, relationship, or endpoint. `GET /v1/accounts/gate` still returns `{ step }` with `email`, `phone`, `otp`, `identity`, `account`. `account` means email is verified, phone OTP is granted, and both captures are `pending` or `granted`. `POST /v1/verifications/id` and `POST /v1/verifications/liveness` are the existing image posts. Reads are the existing GET pair.

## Stitch files

- `code/design-stitch/ankanu-v2/54-pseudonym-dob/screen.html` and `screen.png` — cream page, card, navy button. The untagged `tailwind.config` is now kept.
- `code/design-stitch/ankanu-v2/07-id-liveness/screen.html` and `screen.png` — confirm button and idle camera. Error line uses the `02-auth` treatment. Sample file name removed.
- Checked for the same token loss: `03-age-gate`, `02-auth`, `04-email-verification`, `06-otp`, `56-otp-alt`, `05-password-reset`, `10-pin-lock`, `08-onboarding`, and the hand-built splash. Their configs already had `id="tailwind-config"` or literal CSS. Computed colors matched.

## Known gaps

- A `held` or `rejected` capture does not open `/onboarding`. The gate stays on identity until the status is `pending` or `granted`. The page says `Reprenez la capture.` and does not add a hold screen.
- The camera frame stays on the idle Stitch viseur after a photo is taken. « Reprendre la capture » is still the Stitch button and has no handler.
- The upload still encodes the file in the browser before the API applies the 5 MB cap.
- This handoff is local until QA passes. The ankanu web container was recreated with `compose.yaml` and `compose.ports.yml`. Api, worker, postgres, redis, and the bucket were left up. `https://staging.ankanu.com/signup/pseudonym` returns the `tailwind.config` with `brand.cream` `#F7F1E3`. Push the commit and comment the SHA on [ANK-95](/ANK/issues/ANK-95) after QA passes.
