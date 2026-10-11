# Epic 2 ANK-85 QA handoff

QA return for ANK-84. Same checkout. Not a new story. Staging to retest: `http://72.61.0.79:4012`. Do not open the next story. Push waits until this retest passes.

Prior fail list: `code/docs/qa-handoffs/epic-2-ank-84-qa-report.md`. The board comment on ANK-85 replaces the earlier "hide change-email / do not draw a new-password form" note.

## What was built

1. Step 0 is the hand-built mark from `code/design-stitch/ankanu-v2/01-splash/screen.png`: cream page, faint outer circle, axis-aligned square, teardrop, dotted inner ring, center dot, title AnKanu, gold rule, Continuer, three dots. `01-splash/screen.html` is not served (it is a Google sign-in export).
2. PIN `next` is kept only when it is a same-origin path (`/` and not `//` or `/\`). Anything else goes to `/onboarding`.
3. Settings delete posts `{ "confirm": true }` to `POST /v1/me/delete`.
4. After a failed create or sign-in, including a thrown fetch, `finally` calls `grecaptcha.reset` on that widget and re-enables the button unless navigation already started.
5. Onboarding and photo rules inject the existing `audioPromptScript`. No audio files were added. The pictogram path runs when no file is configured. Photo-rule buttons use `aria-label` "Écouter en Mooré" / "Écouter en Dioula".
6. A gate error does not 303 to `/auth` when the request is already `/auth` or `/password-reset`.
7. Gate redirects use the request `Host` (or `x-forwarded-host`) so a browser on port 4012 is not sent to `http://0.0.0.0:3000`.

`POST /v1/accounts/email` (no new table, no migration):

- Auth: live web session cookie, same check as `POST /v1/accounts/email-verifications`. No session → `401 UNAUTHENTICATED`.
- Counted by `rejectIfAuthRateLimited`. Over limit → `429 RATE_LIMITED`. Nothing changes.
- Body `{ email }`. Trim, lowercase, same check as `POST /v1/accounts`. Missing or invalid → `400 UNHANDLED`, `details.field` `email`, message `email : une adresse inutilisée est requise.`
- Password credential `email_verified_at` set → `409 UNHANDLED`, field `email`, message `email : l'adresse est déjà vérifiée.` A verified address is never changed.
- Same as `account.email` → `400 UNHANDLED`, field `email`, message `email : c'est déjà l'adresse enregistrée.`
- Taken by another account → `409 UNHANDLED`, field `email`, message `email : ce champ est déjà utilisé.` Unique index `account_email_unique` is the race guard.
- Success sends the Story 2.3 verification mail (30-minute link, same `EmailPort`, body is the link alone) to the new address first. Then one transaction: set `account.email`, set `superseded_at` on every unconsumed `email_verification` row for that account, insert the new row. `200 { email, expires_at }`. `email_verified_at` stays null. Sessions are not revoked. The old link then fails `EMAIL_LINK_INVALID`.
- Send or save fails, including a missing public origin → `503 EMAIL_DELIVERY_FAILED`, `retryable` true, message `L'envoi du lien a échoué.` Address and the old link stay.

Screen `04-email-verification`: "Modifier l'adresse" opens inline "Corriger l'adresse de réception" and "Enregistrer". Enregistrer posts the route. Only after 200 the shown address becomes the server email, the field closes, and the banner reads `Un nouveau message de confirmation vient de vous être adressé.` Errors stay on `#email-change-error` with the server message. Resend stays `POST /v1/accounts/email-verifications`.

Password reset has no API change. `POST /v1/password-resets/consume` `{ token, password }` is the existing route: `200 { id, kind: "web", expires_at }` plus the session cookie and other sessions revoked; `400 PASSWORD_RESET_INVALID`; `400 UNHANDLED` field `password` when the published rule fails (`password : la règle publiée n'est pas respectée.`).

`GET /password-reset` renders one state:

- No token: the v2 request screen, unchanged.
- `?token=` non-empty: same frame, email block replaced by "Nouveau mot de passe" (hint `Au minimum 12 caractères avec lettres, chiffres et symbole noble.`) and "Confirmation du mot de passe", built from the v2 password field (h-12, show/hide eye). Button `Valider et renouveler l'accès`. Note: `La validation de ce nouveau mot de passe invalidera immédiatement toutes les sessions antérieures actives sur d'autres appareils, à l'exception de la session présente.`
- Mismatch is local and sends nothing. Message: `password : la confirmation ne correspond pas.` (the board did not supply this sentence).
- After `400 PASSWORD_RESET_INVALID` only: title `Lien expiré ou adresse inconnue`, text `Par mesure de discrétion et de protection de la pudeur, aucun indice public sur l'existence du compte n'est divulgué.`, button `Reprendre la demande` → `/password-reset`. The URL is not replaced, so a refresh with the token returns to the renew form.
- After `200` only: `history.replaceState` to `/password-reset`, then title `Mot de passe renouvelé · Anciennes sessions révoquées`, text `Session locale active et reconnue pour 30 jours.`, button `#reset-enter` `Accéder à mon espace Ta'aruf` calls `goToGate()`.

Copy is from the founder-reviewed earlier Stitch states in git `23a7151^:code/design-stitch/15-password-reset/screen.html`, without the Scaleway line. That old file is not served. There is no `?view=` switch and no way to open invalid or done from the URL. No token is the request screen. `?token=` is the renew form only. Invalid and done render in the browser only after `400 PASSWORD_RESET_INVALID` or `200`. The six-width shots `09b-reset-renew`, `09c-reset-invalid`, and `09d-reset-done` were produced by calling `resetHtml` inside `v2-responsive.test.ts`, not by a public route.

## Where

- `code/apps/api/src/change-email.ts`, `change-email.test.ts`
- `code/apps/api/src/accounts.controller.ts`, `email-verification-store.ts`, `create-account.ts` (`normalizeAccountEmail`)
- `code/apps/web/src/v2-pages.ts`, `v2-client.ts`, `v2-serve.ts`, `entry-guard.ts`, `audio-prompt.ts`
- `code/apps/web/src/v2-flow.test.ts`, `v2-responsive.test.ts`
- Catalog: `_bmad-output/planning-artifacts/architecture/architecture-muslim-marriage-africa-2026-09-27/SOLUTION-DESIGN.md` account invariants, the auth paragraph, and the §7.1 identity row
- Width shots: `code/docs/qa-handoffs/ank-83-widths/` including `09b-reset-renew`, `09c-reset-invalid`, `09d-reset-done`

## How to run

Staging is already up: `http://72.61.0.79:4012`. Web image recreated `2026-10-11T06:41:49Z`. API image recreated `2026-10-11T06:39:43Z`. Worker, postgres, redis, and bucket were not recreated (still 5 October). Migration `0010_account_civil_name` was already applied (`civil_given_name`, `civil_family_name` exist). It was not run again.

From `code/`:

```bash
npx vitest run --fileParallelism false \
  apps/api/src/change-email.test.ts \
  apps/api/src/create-account.test.ts \
  apps/api/src/email-verification.test.ts \
  apps/web/src/v2-flow.test.ts \
  apps/web/src/native-dialog.test.ts
npx vitest run --fileParallelism false apps/web/src/v2-responsive.test.ts
npx tsc -p apps/api --noEmit
npx tsc -p apps/web --noEmit
```

`v2-responsive.test.ts` needs the cached Playwright Chrome or `ANKANU_CHROME`. It fails if `document.documentElement.scrollWidth > window.innerWidth` or a visible box crosses the viewport at 360, 390, 768, 1024, 1280, or 1440.

Unit tests accept captcha token `test-ok`. Staging uses the public Google test key pair already in Compose.

## Test cases

| Case | Input | Expected |
| --- | --- | --- |
| Splash | `GET /signup` | 200. Square `rect`, dotted ring `stroke-dasharray`. No `rotate(`, no Google button, no `01-splash/screen.html` markup. |
| Auth | `GET /auth` | 200. `Se connecter`. `grecaptcha.reset` in the page script. No Google button. |
| Gate error on auth | Session cookie whose gate call fails, `GET /auth` or `GET /password-reset` | 200, not 303. |
| Gate error elsewhere | Same cookie, `GET /onboarding` | 303 to `/auth` on the public host (`http://72.61.0.79:4012/auth`), not `0.0.0.0:3000`. |
| Anonymous member route | `GET /onboarding` with no cookie | 303 `http://72.61.0.79:4012/auth`. |
| PIN next | Open `/pin?next=https://evil.example` or `?next=//evil.example` after a real PIN | Lands on `/onboarding`. `?next=/onboarding` stays. |
| Settings delete | Confirm delete | `POST /v1/me/delete` body `{ "confirm": true }`. |
| Captcha after failure | Wrong password, or a failed fetch | Widget resets. Button is enabled again once the fields and a new token are present. |
| Audio | `/onboarding`, `/photo-rules` | Existing prompt script is in the page. No new audio file. Buttons do not construct `Audio` when no file is configured. |
| Change email, no session | `POST /v1/accounts/email` `{ "email": "a@b.c" }` | `401 UNAUTHENTICATED`. |
| Change email, invalid | Signed in, `{ "email": "not-an-email" }` | `400`, field `email`, `email : une adresse inutilisée est requise.` Address unchanged. |
| Change email, same | Signed in, current address (any case) | `400`, `email : c'est déjà l'adresse enregistrée.` |
| Change email, taken | Signed in, another account's email | `409`, `email : ce champ est déjà utilisé.` |
| Change email, verified | After the new link is consumed | `409`, `email : l'adresse est déjà vérifiée.` No extra send. |
| Change email, success | Unverified account, unused address | Mail goes to the new address first. `200 { email, expires_at }`. Shown address updates. Banner `Un nouveau message de confirmation vient de vous être adressé.` Old link `400 EMAIL_LINK_INVALID`. New link verifies. Session cookie still works. |
| Change email, send fails | Mail port throws, or origin missing | `503 EMAIL_DELIVERY_FAILED`, `retryable` true, `L'envoi du lien a échoué.` Old address and old link stay. |
| Change email, rate limit | Auth limiter exceeded | `429 RATE_LIMITED`. Address unchanged. |
| Reset, no token | `GET /password-reset` | Request form `#email`. No `#reset-password`. |
| Reset, token | `GET /password-reset?token=<link token>` | Renew form. Posts `{ token, password }` to `/v1/password-resets/consume`. |
| Reset, mismatch | Two different passwords | Nothing is sent. `password : la confirmation ne correspond pas.` |
| Reset, short password | Under 12 characters, matching | `400 UNHANDLED` field `password`, `password : la règle publiée n'est pas respectée.` |
| Reset, bad or reused link | `400 PASSWORD_RESET_INVALID` | Bad-link copy and `Reprendre la demande`. Refresh with the token still shows the renew form. |
| Reset, success | Valid token and password | URL becomes `/password-reset` with no token. Done copy. `#reset-enter` opens the first unfinished step or `/onboarding`. Other sessions are revoked. This session stays. |
| Widths | Both screens, request / renew / invalid / done, and the ANK-84 screens | `scrollWidth <= innerWidth` at 360, 390, 768, 1024, 1280, 1440. No horizontal scroll, clip, or overflow. |

## My results

- `change-email.test.ts`, `create-account.test.ts`, `email-verification.test.ts`, `v2-flow.test.ts`, `native-dialog.test.ts`: passed (20 tests in the combined run that included change-email, v2-flow, and native-dialog; create-account and email-verification were included in the earlier API run).
- `v2-responsive.test.ts`: 1 passed, about 72s, including `09b-reset-renew`, `09c-reset-invalid`, `09d-reset-done`.
- `tsc -p apps/api` and `tsc -p apps/web`: passed.
- Staging `127.0.0.1:4012` (same web as `http://72.61.0.79:4012`): `GET /signup` 200 with `rect` and `stroke-dasharray`, no `rotate(`, no Google. `GET /auth` 200 with `Se connecter` and `grecaptcha.reset`. `GET /password-reset` 200 with `#email` and no `#reset-password`. `GET /password-reset?token=sample-token` 200 with `Nouveau mot de passe` and the consume URL, no `#email`. `POST /v1/accounts/email` without a cookie: `401 UNAUTHENTICATED`. `POST /v1/password-resets/consume` with a fake token: `400 PASSWORD_RESET_INVALID`. `GET /onboarding` with `Host: 72.61.0.79:4012`: `303` `location: http://72.61.0.79:4012/auth`.

## Three validation passes

1. API and client behavior: change-email cases above, captcha reset in `finally`, PIN `next` guard, delete body `{ "confirm": true }`, gate error stays on `/auth` and `/password-reset`.
2. One real state per response. Splash matches the PNG, not `01-splash/screen.html`. No Google button. No Scaleway line. No Stitch state tab, scenario switcher, or all-states gallery.
3. Widths: Chrome `scrollWidth <= innerWidth` at 360, 390, 768, 1024, 1280, and 1440. Screenshots at 360 and 1440 under `code/docs/qa-handoffs/ank-83-widths/`.

## Solution design

`SOLUTION-DESIGN.md` account invariants, the auth paragraph, and the §7.1 identity row. `POST /v1/password-resets/consume` is unchanged. No new table and no new relationship.

## Stitch files

- `code/design-stitch/ankanu-v2/01-splash/screen.png` (Step 0 mark; HTML not served)
- `code/design-stitch/ankanu-v2/02-auth/screen.html` (password field used inside the reset renew state)
- `code/design-stitch/ankanu-v2/04-email-verification/screen.html`
- `code/design-stitch/ankanu-v2/05-password-reset/screen.html` (request state; renew / invalid / done replace only the email block and title)
- `code/design-stitch/ankanu-v2/08-onboarding/screen.html`
- `code/design-stitch/ankanu-v2/09-photo-rules/screen.html`
- `code/design-stitch/ankanu-v2/10-pin-lock/screen.html`
- `code/design-stitch/ankanu-v2/27-settings/screen.html`

## Known gaps

- The local mismatch sentence `password : la confirmation ne correspond pas.` was not in the board text.
- Push is not done. It waits for the ANK-84 pass.
- Rows sealed under the previous evidence key, or under no key, do not open with the new key. No migration was added. The founder accepted that.

The SMTP and evidence notes in the sections above are the state before the founder log-mail decision. The section at the end is the current api.

## Second QA return (2026-10-11, retest fail)

Two web-only fixes, already on `ankanu-web-1`. After that, only `ankanu-api-1` was recreated so the recovered evidence env is in the process. Worker, postgres, redis, bucket, and every other project were left running. `SMTP_URL` is still absent and was not invented. Evidence lengths: key 44, kid 5.

1. `applyResetView` renew now removes the request sentence `Renseignez l'adresse email…`. The request screen still has it. `GET /password-reset?token=` has the password fields and does not have that sentence or `#email`.
2. Landing header at 768: the section links sit on their own wrapped row; the mark and `Commencer l'inscription` stay on the first row. At 1024 and above the single row returns. Nothing was removed.

Web container `ankanu-web-1` recreated after this change. API, worker, postgres, redis, and bucket were left running.

Checked on `http://127.0.0.1:4012`. Cells are `document.documentElement.scrollWidth`. `window.innerWidth` is the column header. Every `scrollWidth` is less than or equal to `innerWidth`, and no element box crossed the viewport.

| Page | 360 | 390 | 768 | 1024 | 1280 | 1440 |
| --- | --- | --- | --- | --- | --- | --- |
| `/` | 360 | 390 | 753 | 1009 | 1265 | 1425 |
| `/password-reset` | 360 | 390 | 768 | 1024 | 1280 | 1440 |
| `/password-reset?token=sample-token` | 360 | 390 | 753 | 1009 | 1265 | 1425 |

`npx vitest run --fileParallelism false apps/web/src/v2-flow.test.ts apps/web/src/landing-auth-links.test.ts`: 2 files, 14 tests passed.

A later check on the same web, after `document.fonts.ready`, measured `scrollWidth` equal to `innerWidth` at 768 and 1024 on `/`. Before the webfonts load, the 1024 header can report a wider fallback and is not the pass measurement.

## Log mail and evidence (2026-10-11)

Founder-approved staging mail is log-only. The host file `/var/lib/ankanu/api.env` (mode `600`, outside the repo and the image) supplies `SMTP_URL`, `EVIDENCE_KEY`, and `EVIDENCE_KID` through `env_file` on the api service only. The worker does not read it. Path note: `code/docs/api-host-env.md`. Values are not in git and are not printed here.

`SMTP_URL` uses the `log:` scheme. Each send writes one API stdout line: `email <recipient> AnKanu <full link>`. Read it with `docker logs ankanu-api-1`. The same guards still refuse empty text, angle brackets, and control characters. The api image sets `NODE_ENV=production`, so log mail is allowed only when `RECAPTCHA_ALLOW_TEST_KEYS=1`. Any other boot with a `log:` URL exits at startup.

Phone OTP lines stay `otp <six digits>` in the same logs.

Only `ankanu-api-1` was recreated for this step (`2026-10-11T07:18:09Z`). Web, worker, postgres, redis, and bucket were left running. Lengths on the running process: `SMTP_URL` 6, scheme `log`; `EVIDENCE_KEY` 44; `EVIDENCE_KID` 25. S3 lengths unchanged: access key 16, secret 36.

Smoke on `http://127.0.0.1:4012`, statuses only:

- `POST /v1/accounts` 201, then `POST /v1/accounts/email-verifications` 201, log line contained `email-verification`, consume 200.
- `POST /v1/password-resets` 201, log line contained `password-reset`.
- `POST /v1/verifications/otp` send 201, verify 200 `granted`.
- `POST /v1/verifications/id` 201 `pending`. No `EVIDENCE_KEY` line and no production log-mail refusal in that log window.

`npx vitest run --config vitest.unit.config.ts apps/api/src/email-port.test.ts`: 1 file, 8 tests passed.

QA still retests change-email (old link dies, new link verifies), a real reset link plus a reused link, and Step 7 upload/liveness in the browser. Links and the OTP code come from `docker logs ankanu-api-1`. This is not a full ANK-84 pass. Do not push yet.

## Log mail and evidence key (2026-10-11)

Founder decision: log-only email on this host, and a fresh evidence key. The two width fixes already passed and were not redone.

`SMTP_URL`, `EVIDENCE_KEY`, and `EVIDENCE_KID` are in the host file `/var/lib/ankanu/api.env` (mode `600`, outside the repo and outside the image). `code/compose.yaml` gives that file to the `api` service only (`env_file`, `required: false`). The worker does not get it. Path and rules: `code/docs/api-host-env.md`. Do not print the file.

Log transport: when `SMTP_URL` uses the `log:` scheme, each message is one api stdout line:

```text
email <recipient> AnKanu <full link>
```

The same refusal rules as SMTP still apply (empty text, angle brackets, control characters). The api image sets `NODE_ENV=production` on every boot, so log mail is allowed only when `RECAPTCHA_ALLOW_TEST_KEYS=1`. Any other boot with `log:` exits at startup.

Read links with `docker logs ankanu-api-1`. A verification send contains `/email-verification?token=`. A reset send contains `/password-reset?token=`. Phone OTP is still the existing line `otp <six digits>`. Do not paste those lines into tickets.

`ankanu-api-1` was recreated at `2026-10-11T07:15:27Z` and is healthy. Web, worker, postgres, redis, bucket, and every other project were left running. Inside the process: `SMTP_URL` scheme `log` length 6, evidence key 32 bytes, kid length 25, `RECAPTCHA_ALLOW_TEST_KEYS=1`. S3 credentials still match the bucket process (lengths 16 and 36). The `ankanu` bucket was missing (`NoSuchBucket`), so it was created with the existing private-bucket call and versioning enabled. That is why an earlier upload returned 503 `Request failed` even with the key present.

Smoke on `http://127.0.0.1:4012`, no secret values printed:

- Signup `201`. `POST /v1/accounts/email-verifications` `201`. `docker logs` has the verification line with the recipient, subject `AnKanu`, and the full link. Consume `200`.
- `POST /v1/password-resets` for that verified address `201`. `docker logs` has the reset line with the full link.
- After phone OTP grant, `POST /v1/verifications/id` `201` `{ kind: id_document, status: pending }`.
- A second account: `POST /v1/verifications/liveness` `201` `{ kind: liveness, status: pending }`.

`npx vitest run --config vitest.unit.config.ts apps/api/src/email-port.test.ts apps/api/src/self-managed-environment.test.ts apps/api/src/secrets-baked.test.ts`: 3 files, 11 tests passed.

Remaining for QA on ANK-84, using `docker logs ankanu-api-1` for the links: change email (old link dies, new link verifies), a real reset link plus a reused link, and the Step 7 upload/liveness screens. Push still waits for that pass.
