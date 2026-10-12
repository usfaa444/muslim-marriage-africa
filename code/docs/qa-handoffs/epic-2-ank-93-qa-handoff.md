# Epic 2 ANK-93 QA handoff

No sample data on a served v2 screen. A member who signs in at the email step sees their own address. A dead verification or reset link shows a real error instead of a silent page.

Handoff for [ANK-94](/ANK/issues/ANK-94). Staging target: `https://staging.ankanu.com`. Do not open Epic 3. The GitHub push waits until this QA pass is recorded; a pass with no push is not done.

## What was built

`GET /v1/accounts/email-verifications` requires the session cookie. `401 UNAUTHENTICATED` with no session. `200` is only `{ email, email_verified_at }` for the signed-in account. `email_verified_at` is `null` until a link is consumed. `GET /v1/accounts/gate` is still `{ step }`. No new table.

`/email-verification` no longer contains `ibrahim.sawadogo@exemple.bf`. The address span starts empty. The page then fills it from that GET. `sessionStorage` (`ankanu.signup.email`) is not the source. A change of address (`POST /v1/accounts/email` `200`) replaces the span with `email` from that response. A failed read leaves the span empty. The grey placeholder `votre.nom@exemple.bf` on the empty change field stays.

A `?token=` on `/email-verification` is not redirected by the step guard, signed in or not, including when the gate step is later than email. `POST /v1/accounts/email-verifications/consume` still moves to `/phone` on `200`. Any other status shows the error in the same card: title `Lien expiré ou adresse inconnue` (the password-reset invalid title), intro and error line set to the server message `Lien expiré ou caduc.` The error line is the `02-auth` style: `text-[#9B2C2C]` and the `error` icon. The address stays empty. Signed in, the button reads « Renvoyer un lien » and POSTs `/v1/accounts/email-verifications` (banner on `201`, server message on a real error). Signed out, that control becomes « Se connecter » to `/auth`. The state is not in the HTML until the consume response is a non-200.

Expired, already used, superseded, and unknown verification tokens, including a change-email link that was superseded, all return `400 EMAIL_LINK_INVALID` / `Lien expiré ou caduc.` One shared code. No new code.

Expired, already used, superseded, and unknown reset tokens all return `400 PASSWORD_RESET_INVALID` / `Lien expiré ou adresse inconnue.` One shared code. The renew form still shows « Reprendre la demande » → `/password-reset` for that code. A live token with a password that fails the published rule stays `UNHANDLED` on the password fields and does not open the invalid view. A valid reset still renews the password. There is no new endpoint, so a dead reset link reaches that view when consume is submitted, not before.

`/otp` shows `phone_masked` from `GET /v1/verifications/otp` in the v2 pill « Numéro renseigné : » (the `06-otp` step-2 pill). The span is empty until that read returns `pending` or `granted`. No sample mask is in the HTML.

## Sweep

Served screen, what was in the Stitch file, what the browser gets:

| Screen | Found | Now |
| --- | --- | --- |
| Splash (`/signup`) | No specimen. Hand-built, not the broken stitch file. | Unchanged. |
| `03-age-gate` | Placeholders `Maitchibi` and `Faycal` on empty inputs. | Kept. They are hints, not values. |
| `54-pseudonym-dob` | Placeholder `Ex. kader_226, awa_94`. Day/month/year start at JJ / MM / AAAA. | Kept. |
| `02-auth` | Placeholder `nom@exemple.bf` and `••••••••••••`. | Kept. No `value`. |
| `04-email-verification` | `ibrahim.sawadogo@exemple.bf` in `#currentEmail`. Placeholder `votre.nom@exemple.bf`. | Address removed. Placeholder kept. Real address from the GET. |
| `06-otp` (`/phone`) | `value="70 24 58 19"`, display `+226 70 24 58 19`. Placeholder `70 00 00 00`. Script fallback `70 00 00 00`. | Value and display cleared. Placeholder kept. Stitch script stripped. OTP step stays hidden. |
| `56-otp-alt` (`/otp`) | No phone specimen. | Empty pill, then `phone_masked` from `GET /v1/verifications/otp`. |
| `07-id-liveness` | `CNIB_recto_verso.pdf` | Still stripped. Title stays empty until a real capture. |
| `05-password-reset` | Placeholder `nom@exemple.bf`. | Kept. Invalid view unchanged. |
| `10-pin-lock` | No name, number, or email specimen. | Unchanged. |
| `08-onboarding` | `70% complété`, bar `width: 70%`, `Il manque : madhhab`. | Percentage and the missing-field line removed. Bar width `0%`. |
| `09-photo-rules` | No specimen. | Unchanged. |
| `11-profile-edit` | `29 ans`, `1996-09-14`, `Région du Centre, Plateau-Central`, the bio paragraph, `70% complété`, bar `70%`, pre-selected city, country, education, and job, pre-checked marital, practice, timeframe, photo visibility, and PIN. Photo slot is an icon, not a picture. | Those values, checks, and selections cleared. Each select starts on an empty option. No profile-read endpoint exists, so nothing is invented in their place. |
| `27-settings` | No specimen name, email, or number. | Unchanged. |
| `28-delete-export-status` | `exp-84092-bf`, `47:55:56`, `00:00:00`. | All three removed. The live ticket still fills the link and clock from `GET /v1/me/export-status`. |

Unbuilt screens (invites, discussions, mahram, admin, operator) are not served. The same rule applies when they are built. Sample content in Stitch HTML is never rendered.

## Where

- `code/apps/api/src/accounts.controller.ts` — `GET /v1/accounts/email-verifications`
- `code/apps/api/src/email-verification-store.ts` — `readAccountEmail`
- `code/apps/api/src/email-verification.test.ts`, `change-email.test.ts`, `password-reset.test.ts`
- `code/apps/web/src/v2-pages.ts` — strip samples, error line, OTP pill, profile and onboarding empties
- `code/apps/web/src/v2-client.ts` — email read, consume error, OTP mask
- `code/apps/web/src/entry-guard.ts` — do not redirect `/email-verification?token=…`
- `code/apps/web/src/v2-flow.test.ts`, `v2-responsive.test.ts`
- Width shots: `code/docs/qa-handoffs/ank-83-widths/05-email-360.png`, `05-email-1440.png`, `05b-email-long-360.png`, `05b-email-long-1440.png`, `05c-email-expired-360.png`, `05c-email-expired-1440.png`, `07-otp-360.png`, `07-otp-1440.png`, `11-onboarding-360.png`, `11-onboarding-1440.png`, `13-profile-360.png`, `13-profile-1440.png`, `15-status-1440.png`

## How to run

From `code/`:

```bash
npx vitest run --config vitest.unit.config.ts \
  apps/api/src/email-verification.test.ts \
  apps/api/src/change-email.test.ts \
  apps/api/src/password-reset.test.ts \
  apps/web/src/v2-flow.test.ts \
  apps/web/src/native-dialog.test.ts
npx vitest run --config vitest.unit.config.ts apps/web/src/v2-responsive.test.ts
```

The width file needs Chrome. It fails if `scrollWidth > innerWidth` or a visible box leaves the viewport at 360, 390, 768, 1024, 1280, or 1440.

Browser pass: `https://staging.ankanu.com`. Sign in as a member still at the email step. The card must show that member's address, not `ibrahim.sawadogo@exemple.bf`. Open an old verification link while signed in and while signed out. Open a used reset link and submit a new password.

## Test cases

| Case | Expected |
| --- | --- |
| `GET /v1/accounts/email-verifications` with no cookie | `401 UNAUTHENTICATED` |
| Same GET with the session | `200` and only `email` plus `email_verified_at` for that account |
| Second account's GET | That account's email only |
| After a successful consume | Same GET returns the new `email_verified_at` |
| Valid verification `?token=` | `200`, then `/phone` |
| Expired, used, superseded, or unknown verification token, including a superseded change-email link | `400 EMAIL_LINK_INVALID`, message `Lien expiré ou caduc.` Page title `Lien expiré ou adresse inconnue`. No sample address. |
| That page while signed in | « Renvoyer un lien » calls `POST /v1/accounts/email-verifications` |
| That page while signed out | « Se connecter » goes to `/auth` |
| `/email-verification?token=…` when the gate step is not email, or there is no session | The page stays. It is not redirected before consume. |
| `/email-verification` with no token, signed out | Still `303` to `/auth` |
| Expired, used, superseded, or unknown reset token on consume | `400 PASSWORD_RESET_INVALID`, message `Lien expiré ou adresse inconnue.`, then « Reprendre la demande » |
| Valid reset consume | `200`, password changed, invalid view not shown |
| Bad password on a live reset token | `UNHANDLED` on the field, form stays |
| `/otp` after sign-in at that step | Masked number from `GET /v1/verifications/otp`, or empty if `status` is `none` |
| Served HTML for each screen in the sweep | None of the specimen strings in the table |

Test data already in the API tests: `fatim@example.bf` / `phrase avec espaces`, second account `awa.read@example.bf`. A long address used only in the width fixture: `prenom.tres.long.ibrahim.sawadogo.ouagadougou@exemple-domaine.bf`.

## My results

- `email-verification.test.ts`, `change-email.test.ts`, `password-reset.test.ts`, and `v2-login.test.ts`: 4 files, 28 tests passed.
- `v2-flow.test.ts`, `native-dialog.test.ts`, and `v2-responsive.test.ts`: 3 files, 23 tests passed. Widths include the empty email card, a 40+ character address, the expired card, and the OTP pill.

## Three validation passes

1. Reads and links: own email only, `401` without a session, consume codes shared as above, valid consume still `200`, step guard holds a token URL, signed-in resend vs signed-out sign-in.
2. Screen: one state from the real response. No specimen string, no Stitch script, no expired card until consume is not `200`. Placeholders on empty inputs stay.
3. Widths: Chrome at 360, 390, 768, 1024, 1280, and 1440. `scrollWidth <= innerWidth` and no box outside the viewport, including the long address and the expired line. Shots at 360 and 1440 for the email, long email, expired email, OTP, onboarding, and profile.

## Solution-design sections

Existing envelope codes only. `EMAIL_LINK_INVALID` already covers every dead verification token. `PASSWORD_RESET_INVALID` already covers every dead reset token. `GET /v1/accounts/gate` stays `{ step }`. The new read follows the same session-scoped pattern as `GET /v1/verifications/otp`, `/id`, and `/liveness`. No new relationship.

## Stitch files

- `code/design-stitch/ankanu-v2/04-email-verification/screen.html` and `screen.png` — card kept; specimen address removed; error line uses the `02-auth` error treatment.
- `code/design-stitch/ankanu-v2/06-otp/screen.html` — phone values cleared; OTP pill copied onto `56-otp-alt` for `/otp`.
- `code/design-stitch/ankanu-v2/56-otp-alt/screen.html` — served OTP screen.
- `code/design-stitch/ankanu-v2/05-password-reset/screen.html` — invalid view reused, not redrawn.
- `code/design-stitch/ankanu-v2/07-id-liveness/screen.html`, `08-onboarding`, `11-profile-edit`, `28-delete-export-status` — specimens removed, layout kept.
- `02-auth`, `03-age-gate`, `54-pseudonym-dob`, `09-photo-rules`, `10-pin-lock`, `27-settings` — checked; only empty-input placeholders.

## Known gaps

- Profile and onboarding have no read of the member's real profile. Empty fields, not invented values. A later story needs an existing profile read before those fields can show real data.
- OTP resend still sends the number stored in `ankanu.signup.phone`. The screen shows only `phone_masked`. After a sign-in that did not set that key, « Renvoyer le code » goes to `/phone`.
- A dead reset link shows the renew form until the member submits. Consume needs a password, and this ticket adds no endpoint. The invalid view appears on `PASSWORD_RESET_INVALID`.
- This handoff is local until QA passes. Push the commit and comment the SHA on [ANK-93](/ANK/issues/ANK-93) after the pass.
