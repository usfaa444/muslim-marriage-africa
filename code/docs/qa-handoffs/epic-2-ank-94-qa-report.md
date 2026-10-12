# ANK-94 QA report — no sample data

Verdict (2026-10-12, retest): **pass**.

Tested from `code/docs/qa-handoffs/epic-2-ank-93-qa-handoff.md` in headless Chrome on `https://staging.ankanu.com`. The web container had been recreated. The api container was not. Do not push from QA. Do not deploy. Do not call the board webhook. Do not open Epic 3.

The first pass on this ticket failed two items. Both are fixed on staging. The earlier pass table still holds. This retest covers the two fails.

## Retest

Disposable account, fresh session, no signup `sessionStorage`. Expiry: `UPDATE password_reset SET expires_at = now() - interval '5 minutes' WHERE token_hash` is the sha256 of that link's token. Result `UPDATE 1`.

| Case | Expected | Actual |
| --- | --- | --- |
| Served `/password-reset?token=` | `POST /v1/password-resets/consume` is in the script. No `if (!form) return`. | Match. |
| `/email-verification` | Own address. « Se connecter avec un autre compte ». No specimen. | Own address. Link present under the resend note. |
| Click with `DELETE /v1/sessions/current` aborted | Still opens the `/auth` sign-in panel. Cookie gone. Reload stays. | Match. |
| Widths of that control on `/email-verification`, `/phone`, `/otp`, `/id-liveness` | Fit at 360, 390, 768, 1024, 1280, 1440. `scrollWidth <= innerWidth`. Link box inside. | Fit. |
| `/phone` | Control in the existing trust footnote under the form. | Match. |
| `/otp` | Control immediately after « Modifier le numéro ». Pill is the real mask, not a specimen. | Match. |
| `/id-liveness` | Control after the confidentiality note under « Confirmer et transmettre ». | In the HTML after that note. Click issued `DELETE` `204`, then `/auth`. Reload stayed on the sign-in panel. |
| Superseded reset submit | `400 PASSWORD_RESET_INVALID`. Title `Lien expiré ou adresse inconnue`. « Reprendre la demande » to `/password-reset`. No `Illegal return statement`. | Match. |
| Short password on a live token | `400 UNHANDLED`. Renew form stays (`Réinitialisation du mot de passe`). No reprise link. | Match. |
| Expired, used, and unknown reset submit | Same invalid card and « Reprendre la demande ». | Match. |
| Valid token | `200`. Title includes `Mot de passe renouvelé`. | `Mot de passe renouvelé · Anciennes sessions révoquées`. |
| Invalid reset card widths | Fit at the six widths. | `scrollWidth` equals `innerWidth` at each width. No box outside. This page has no switch link. |
| Sign-in after the switch, with the renewed password | `201`. | Match. |

Shots: `code/docs/qa-handoffs/ank-94-evidence/switch-email-360.png`, `switch-phone-360.png`, `switch-otp-360.png`, `switch-id-360.png`, `switch-id-1440.png`, `reset-invalid-retest-360.png`, plus the 1440 pair for each. The identity page is taller than the viewport, so the switch link sits below the confidentiality note and is not in the top of those two shots. The click on that page is the proof it is there.

The headless browser still does not check the reCAPTCHA test checkbox. Sessions were opened with `POST /v1/sessions` and `recaptcha_token: test-ok`, which is what the panel sends. Not a product fail.

## Earlier pass, still in force

Served HTML on 17 paths had no specimen text and no demo switcher. Unsigned email read is `401`. Two accounts each see only their own email. Signed-out `/email-verification` goes to `/auth`. Landing « Commencer l'inscription » returns an email-step member to `/email-verification` with the saved address. Change-email updates the span, including a 56-character address, at all six widths. Superseded, expired, and unknown verification links show the invalid card and an empty address. Signed-in « Renvoyer un lien » posts and shows the banner. Signed-out « Se connecter » stays on `/auth`. A failed email read leaves the span empty. A valid verification link reaches `/phone` with an empty phone field. A used verification link stays on the error card.

## Next

QA is done. A pass with no GitHub push is not done for the next story. Yacouba commits the story's code, tests, and QA handoff under `code/` and pushes. Awa waits for that push. QA does not push, deploy, or open Epic 3.
