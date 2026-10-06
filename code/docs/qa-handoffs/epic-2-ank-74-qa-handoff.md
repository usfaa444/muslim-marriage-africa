# ANK-74 strip Stitch state switchers QA handoff

## What was built

Each Epic 2 screen now shows one Stitch state, the one that matches the real client or API result. The review tabs, demo buttons, and the signup specimen gallery are removed when the page is served. The Stitch HTML files on disk are unchanged.

- `/otp` opens on the idle card. Error and success banners start hidden. Sent appears only after send `201`. Error appears only after a failed verify. Success appears only after verify `200` `{ status: "granted" }`. The typed digits stay. The submit label stays "Confirmer le code scellé" and that button stays disabled. The resend clock stops, and "Renvoyer maintenant" stays disabled. "Modifier le numéro" is hidden and disabled, and send, resend, and modify do not post.
- A later `POST /v1/verifications/otp` `{ action: "send" }` on a granted phone returns `200` `{ expires_at }` for the existing code, including when that phone is already at the hourly cap. The granted check happens before the cap. It does not send SMS and does not set the row back to `pending`. The update also refuses a row that is already `granted`. A phone that is still `pending` and at the cap still gets `429`.
- `/email-verification` opens on waiting. Expired appears only when consume is not `200`. Success appears only on consume `200`. A load with no token does not post and does not change state.
- `/id-liveness` opens on ready. Loading, mismatch, minor hold, and success come from the ID and liveness responses. Both `pending` is the only success path.
- `/password-reset` opens on the request form. Sent (`state-2`) appears only after `201`. The new-password form (`state-3`) appears when the address has `token`. Success (`state-5`) appears only after consume `200`. The error panel (`state-4`) appears only for `PASSWORD_RESET_INVALID`. "Réessayer" and "Reprendre la demande" return to the request form.
- `/auth` keeps the signup and login tabs. The three always-visible rejection banners are gone. Login still prints the API message. Signup still stores the draft and opens `/age-gate`.

## Where

- `code/apps/web/src/design-artifact.ts`
- `code/apps/web/src/otp-page.ts`
- `code/apps/web/src/email-verification-page.ts`
- `code/apps/web/src/id-liveness-page.ts`
- `code/apps/web/src/password-reset-page.ts`
- `code/apps/web/src/auth-page.ts`
- `code/apps/api/src/phone-otp-store.ts`
- Tests beside those pages, plus `code/apps/web/src/native-dialog.test.ts` and `code/apps/api/src/phone-otp.test.ts`

## How to run

From `code/`:

```bash
npx vitest run --config vitest.unit.config.ts \
  apps/web/src/otp-page.test.ts \
  apps/web/src/email-verification-page.test.ts \
  apps/web/src/id-liveness-page.test.ts \
  apps/web/src/password-reset-page.test.ts \
  apps/web/src/auth-page.test.ts \
  apps/web/src/native-dialog.test.ts \
  apps/api/src/phone-otp.test.ts
npx oxlint apps/web/src/design-artifact.ts apps/web/src/otp-page.ts apps/web/src/email-verification-page.ts apps/web/src/id-liveness-page.ts apps/web/src/password-reset-page.ts apps/web/src/auth-page.ts apps/web/src/native-dialog.test.ts apps/api/src/phone-otp-store.ts
npx tsc -p apps/web/tsconfig.json --noEmit
npx tsc -p apps/api/tsconfig.json --noEmit
```

Open `/otp`, `/email-verification`, `/id-liveness`, `/password-reset`, and `/auth`. Confirm there is no state tab bar and no "Simuler" control. On `/auth`, confirm Inscription and Connexion still switch panels.

## Test cases

| Case | Action | Expected |
| --- | --- | --- |
| OTP idle | Open `/otp` | Phone card. No "En attente / Code envoyé / Erreur / Succès" tabs. Error and success banners hidden. |
| OTP send | Post a real E.164 number | `201`. Sent headline. No success banner. |
| OTP bad code | Submit six digits the server rejects | Error banner. Status stays ungranted. Confirm can be used again. |
| OTP success | Submit the code the server accepts, for example `222222` | `200` `{ status: "granted" }`. Success banner. The six boxes still show `222222` and are read-only. A red error border from an earlier reject is cleared. Submit label stays "Confirmer le code scellé" and the button stays disabled. "Renvoyer maintenant" stays disabled after the clock is cleared. "Modifier le numéro" hidden. Another modify or resend does not post. |
| OTP granted send | `POST` send again on that account, including when the hourly cap is already reached | `200` with the old `expires_at`. Row stays `granted`. No new SMS. A still-pending phone at the cap gets `429` and writes nothing. |
| Email idle | Open `/email-verification` with no token | Waiting panel. No "Simuler les états" tabs. No request. |
| Email bad token | Open `?token=` that consume rejects | Expired panel. Not success. |
| Email good token | Open `?token=` that consume accepts | Success panel. Token removed from the address. |
| ID ready | Open `/id-liveness` with no rows | Ready panel. No simulator buttons. |
| ID outcomes | Rejected, held, or both pending | Mismatch, minor hold, or success. One pending capture stays ready. |
| Reset idle | Open `/password-reset` | Request form. No five tabs. No "Simuler l'ouverture du lien reçu". |
| Reset sent | Submit an email and get `201` | Sent panel only. |
| Reset link | Open `?token=abc` | New-password form, not success. |
| Reset bad link | Submit that form and get `PASSWORD_RESET_INVALID` | Error panel. |
| Reset good link | Submit a matching password and get `200` | Success panel. Token removed from the address. |
| Auth | Open `/auth` and `/auth?mode=login` | Signup or login panel. No three rejection banners. Tabs still switch. |
| Sweep | View source of the served Epic 2 pages | No `btn-state-`, `btn-tab-`, `tab-state-`, `Simuler`, or specimen gallery. No `alert`, `confirm`, or `prompt`. |

## Test data

Phone OTP tests use `aminata@example.bf`, password `phrase avec espaces`, pseudonym `Aminata_Ouaga`, phone `+22670123484`. The code is the test SMS log, not a fixed specimen. Email and reset screen tests use `fatim@example.bf` and token `abc` against a stub. Auth has no account post on that page.

## Results

- ANK-75 failed local commit `c04ced5` on the success paint and the granted hourly cap. This handoff is the retest of those two fixes.
- The vitest command above: 7 files, 35 tests passed. The OTP success case submits `222222` and checks the boxes stay `222222`.
- `oxlint` on the touched sources: clean.
- `tsc` for `apps/web` and `apps/api`: passed.
- Headless Chromium served `/otp` on localhost, sent `+22670123484`, and verified `222222`. The boxes stayed `222222`, the success banner showed, the submit label stayed "Confirmer le code scellé", the submit button stayed disabled, "Modifier le numéro" was hidden, and "Renvoyer maintenant" stayed disabled after the clock was cleared. The page did not show "Accéder à l'étape Wali".
- Headless Chromium at 1280×900 rendered the served HTML for OTP, email, auth, password reset, and ID. OTP had no switcher; error and success were hidden. Email showed waiting only. Auth showed signup, hid login, and kept both tabs, with no specimen text. Reset showed the request form only. ID showed ready only. The OTP card matches `14-otp/screen.png` except the "Audit de conformité" tab bar, which is the artifact this ticket removes. The auth card matches `11-auth/screen.png` except the three example banners at the bottom.
- ANK-77 passed `a91fddedd304d562aff34df8e64cc52fd3adc5e2`. Staging `http://72.61.0.79:4012` is serving that build. Only the `ankanu` web and api containers were recreated.

## Three validation passes

1. API and solution design. Pending resend still replaces the hash. After grant, send returns `200` before the hourly cap, keeps `granted`, and does not add an SMS row. A pending phone at the cap still returns `429`. Wrong and expired verifies stay `OTP_INVALID`. No new route.
2. Logic, including deep links. Email `?token=` succeeds only on `200` and expires otherwise. A token-less email load does not post. Password `?token=` opens the form, not success. OTP modify and resend after grant do not post. A granted verify does not call the Stitch success switch, so the typed digits and the confirm label stay. Served HTML for every Epic 2 page in `native-dialog.test.ts` has no switcher strings, balanced `div` tags, and scripts that pass `node --check`.
3. Visual. Headless render of each idle page, compared with the Stitch PNG for OTP and auth. The remaining panel is the Stitch panel. The switcher chrome is absent.

## Solution-design sections

- `verification_record`: `status` is granted, pending, rejected, or held. `phone_e164` is the member phone for `kind=phone_otp`.
- Section 7: `POST /v1/verifications/otp`, `POST /v1/accounts/email-verifications` and consume, `POST /v1/password-resets` and consume. No new endpoint.
- FR-002 phone OTP, FR-006 email link, FR-007 captcha and rate limit (the auth gallery was not a live error), FR-008 password reset.
- Verification stays free. Public visibility is not written by this screen.

## Stitch files

Matched, not edited:

- `code/design-stitch/14-otp/screen.html` and `screen.png`
- `code/design-stitch/13-email-verification/screen.html` and `screen.png`
- `code/design-stitch/17-id-liveness/screen.html` and `screen.png`
- `code/design-stitch/15-password-reset/screen.html` and `screen.png`
- `code/design-stitch/11-auth/screen.html` and `screen.png`

The served page keeps that screen's real panel and omits the review chrome.

## Known gaps

- A reload of `/otp` still shows the Stitch first paint, including the masked specimen number. This screen has no read of the stored phone.
- Wrong and expired codes share `OTP_INVALID` and the same error panel.
- Signup conflicts are still reported on the age gate. `/auth` does not post the account.
- "Réessayer" after a reset send, and "Reprendre la demande" after a reset error, return to the request form. They do not open success.
- Devtools can still call the state function. The served success branch no longer writes `840192` or "Accéder à l'étape Wali". No tab, demo button, or query on these pages opens success or error by itself.
- Staging `http://72.61.0.79:4012` is serving the pushed `main` build. Only the `ankanu` web and api containers were recreated.
