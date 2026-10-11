# Epic 2 ANK-83 QA handoff

Founder rework of every built sign-up and sign-in screen (Epics 1–2, not the public landing visual) onto AnKanu v2, Step 0 through Step 7. One task under the Epic 2 parent. This is not a deploy. Do not open the next epic.

## What was built

The account is created once, at Step 3, after a server age and pseudonym check. Steps 1–2 stay in `sessionStorage` key `ankanu.signup.v2` (no password). That draft is cleared on create success and when Step 0 loads. Email and phone may sit in `ankanu.signup.email` and `ankanu.signup.phone`.

`POST /v1/accounts/precheck` body `{pseudonym, dob}` returns `200 {pseudonym_available, age_eligible}` or `400` naming `pseudonym` or `dob`. It writes nothing. Step 2 advances only when both booleans are true. Under 19 uses the existing sentence `Accès réservé aux personnes majeures de 19 ans et plus.`

`POST /v1/accounts` and `POST /v1/sessions` require `recaptcha_token`. Failure is `400 CAPTCHA_FAILED` with `details.field` `recaptcha_token` and writes nothing. Google siteverify runs once. Account create then opens the web session in the same request (`remember_me` false) and sets `ankanu_session`. A missing session store does not turn a created account into a 500. Password reset stays rate-limit only.

`account.civil_given_name` and `account.civil_family_name` are `text NOT NULL` (migration `0010_account_civil_name`). Existing rows are backfilled `''`. New creates require both, non-empty, max 80. They are owner-only: omitted from the create HTTP body, included in the owner export, cleared when deletion is scheduled. Never in Discover, profile, search, chat, notifications, logs, or analytics.

`GET /v1/accounts/gate` returns `{step: email|phone|otp|identity|account}` or `401` with no session. No account can open only Steps 0–3. Email unverified stays on Step 4. Phone unverified stays on Step 5 or 6. ID or liveness not passed stays on Step 7. Both `pending` or `granted` means the account step and `/onboarding`. `held`, `rejected`, and `none` stay on identity. Sign-in resumes at the first unfinished step. `/password-reset` stays reachable with a session. `/age-gate` redirects (anonymous to `/signup/identity`, otherwise the gate step). `/auth?mode=signup` is `303 /signup`.

Landing markup is unchanged except four signup links to `/signup` and two login links to `/auth`.

Served screens render one real state. Stitch state tabs, scenario switchers, demo toggles, and the Google button are not in the response. `01-splash/screen.html` is a Google sign-in page and is not served. Step 0 is built from the splash PNG (cream page, gold mark, AnKanu, rule, Continuer, three dots).

Stitch canvas locks (`html` style `width: 1280px; height: …; overflow: hidden`) are stripped before serve, and the responsive style forces `width`/`height: auto` and `max-width: 100%` so a desktop frame cannot clip a narrow viewport.

## Where

- `code/apps/api/src/recaptcha.ts`, `account-precheck.ts`, `signup-gate.ts`, `accounts.controller.ts`, `sessions.controller.ts`, `create-account.ts`, `cil-rights.ts`, `main.ts`
- `code/apps/api/drizzle/0010_account_civil_name.sql`
- `code/apps/web/src/v2-document.ts`, `v2-client.ts`, `v2-pages.ts`, `v2-serve.ts`, `entry-guard.ts`
- `code/apps/web/src/v2-flow.test.ts`, `v2-responsive.test.ts`
- `code/apps/web/app/` routes listed below
- `code/compose.yaml` — `RECAPTCHA_SITE_KEY`, `RECAPTCHA_SECRET_KEY`, `RECAPTCHA_ALLOW_TEST_KEYS=1`, `ANKANU_API_ORIGIN=http://api:3000`
- Screenshots: `code/docs/qa-handoffs/ank-83-widths/<screen>-<360|1440>.png`

## Routes

| Path | Screen |
| --- | --- |
| `GET /signup` | Step 0 splash |
| `GET /signup/identity` | `03-age-gate` |
| `GET /signup/pseudonym` | `54-pseudonym-dob` |
| `GET /signup/account` | `02-auth` signup panel |
| `GET /auth` | `02-auth` login panel |
| `GET /email-verification` | `04-email-verification` |
| `GET /phone` | phone half of `06-otp` |
| `GET /otp` | `56-otp-alt` |
| `GET /id-liveness` | `07-id-liveness` |
| `GET /password-reset` | `05-password-reset` request form |
| `GET /pin` | `10-pin-lock` |
| `GET /onboarding` | `08-onboarding` |
| `GET /photo-rules` | `09-photo-rules` |
| `GET /profile-edit` | `11-profile-edit` |
| `GET /settings` | `27-settings` |
| `GET /privacy/status/:ticketId` | `28-delete-export-status` |
| `GET /decouvrir`, `/discussions`, `/invitations`, `/profil` | existing JSON, behind the gate |

Anonymous member routes are `303 /auth`. Cookies `ankanu_session=staff|mahram|web|capacitor` skip the gate so the old JSON envelopes stay. A real cookie calls the gate.

## How to run

From `code/`:

```bash
npx vitest run --config vitest.unit.config.ts \
  apps/web/src/v2-flow.test.ts \
  apps/web/src/v2-responsive.test.ts \
  apps/web/src/landing-auth-links.test.ts \
  apps/web/src/native-dialog.test.ts \
  apps/web/src/self-managed-environment.test.ts \
  apps/api/src/account-precheck.test.ts \
  apps/api/src/create-account.test.ts \
  apps/api/src/create-session.test.ts
```

`v2-responsive.test.ts` needs the cached Playwright Chrome (`~/.cache/ms-playwright/chromium-1243/...`) or `ANKANU_CHROME`. It skips only when no binary exists. It serves each screen and fails if `document.documentElement.scrollWidth > window.innerWidth` or any visible box crosses the viewport at 360, 390, 768, 1024, 1280, or 1440.

Unit tests accept captcha token `test-ok` only. Compose uses the public Google test key pair with `RECAPTCHA_ALLOW_TEST_KEYS=1`. Production boot refuses that pair and refuses empty keys.

## Test cases

| Case | Input | Expected |
| --- | --- | --- |
| Step 0 | `GET /signup` | 200, Continuer to `/signup/identity`, no `accounts.google.com`, no Stitch state switcher |
| Step 1 | Civil name, Sœur or Frère, Continuer | Draft saved. No `POST /v1/accounts`. Next is `/signup/pseudonym` |
| Step 2 under 19 | DOB that is under 19 | Stays on the step. Copy `Accès réservé aux personnes majeures de 19 ans et plus.` Nothing stored |
| Step 2 taken pseudonym | Existing pseudonym | `pseudonym_available: false`. Does not advance |
| Step 2 adult free name | `Awa_94`, `1990-04-02` | `200` both true. Advances to `/signup/account` |
| Create | Email, password of 12–128, pledge, captcha | One `POST /v1/accounts`. Response has no civil names. Cookie set. Lands on `/email-verification` |
| Create without captcha | Same body, no token | `400 CAPTCHA_FAILED`, field `recaptcha_token`, no row |
| Sign-in | Email, password, captcha | `POST /v1/sessions` then the first unfinished gate step |
| Sign-in without captcha | Credentials only | `400 CAPTCHA_FAILED`. Incomplete bodies still get field errors, not a captcha error first |
| Tab | Créer un compte on `/auth` | Goes to `/signup`, not a client-only panel swap |
| Google | Any auth screen | No `Continuer avec Google` |
| Email | Open `/email-verification`, resend, or `?token=` | Consume or resend hits the existing email routes. A new address field does not claim success |
| Phone | 8 national digits | Sends `+226` plus those digits. The specimen `70 24 58 19` is not in the field. Next is `/otp` |
| OTP | 6 digits, confirm | `POST /v1/verifications/otp` `{action:'verify'}`. Granted goes to `/id-liveness`. Modifier le numéro is `/phone` |
| ID | File or camera, then liveness | Both posts. Specimen filename `CNIB_recto_verso.pdf` is absent until a real 201. Both pending or granted go to `/onboarding` |
| Reset | Email on `/password-reset` | `POST /v1/password-resets` only. Retour is `/auth`. No new-password screen |
| PIN | 4 digits | `PUT /v1/pin` when unset, otherwise `POST /v1/pin/unlock`. Six drawn slots; submit is at 4 |
| Gate | Signed-in visit to `/onboarding` before liveness | `303 /id-liveness` |
| Member stub | Cookie `ankanu_session=staff` on `/decouvrir` | 403 JSON, not the signup screen |
| Widths | Each screen above | `scrollWidth <= innerWidth` at 360, 390, 768, 1024, 1280, 1440. No box past the viewport. Screenshots at 360 and 1440 |

## Test data

- Precheck: pseudonym `Awa_94`, dob `1990-04-02`, today `2026-10-11`, min age 19.
- Create: `civil_given_name` `Fatim`, password `phrase avec espaces`, captcha `test-ok` in unit tests.
- Phone national number is 8 digits and is sent as `+226`.
- Staging captcha is the Google test widget (`This reCAPTCHA is for testing purposes only`).

## My results

- `v2-flow.test.ts`: 12 passed.
- `v2-responsive.test.ts`: 1 passed (16 screens × 6 widths). Screenshots written under `code/docs/qa-handoffs/ank-83-widths/`.
- `landing-auth-links.test.ts`, `native-dialog.test.ts`, `self-managed-environment.test.ts`, `account-precheck.test.ts`, `create-account.test.ts`, `create-session.test.ts`: 6 files, 38 passed.
- `drizzle-kit check` was clean on the migration commit `5da8f94`.
- Not pushed. QA pass still needs a GitHub push before the next story.

## Three validation passes

1. API: precheck writes nothing, captcha gates create and login, civil names stay out of the public create body, gate step matches email, phone, OTP, and ID/liveness.
2. Screens: each route serves the matching v2 file (Step 0 from the splash PNG), one state, no Google button, no specimen success, no Stitch canvas lock.
3. Widths: automated Chrome check at 360, 390, 768, 1024, 1280, and 1440. Proof is `scrollWidth <= innerWidth` and no element box outside the viewport. Screenshots at 360 and 1440.

## Solution-design sections

`account.civil_given_name` and `account.civil_family_name` rows. Auth paragraph: `recaptcha_token` on `POST /v1/accounts` and `POST /v1/sessions`, `POST /v1/accounts/precheck`, `GET /v1/accounts/gate`. No new relationship.

## Stitch files

- Step 0 visual: `code/design-stitch/ankanu-v2/01-splash/screen.png` (HTML of that folder is not served)
- `02-auth/screen.html` — signup and sign-in
- `03-age-gate/screen.html`
- `54-pseudonym-dob/screen.html`
- `04-email-verification/screen.html`
- `06-otp/screen.html` — phone step
- `56-otp-alt/screen.html`
- `07-id-liveness/screen.html`
- `05-password-reset/screen.html`
- `10-pin-lock/screen.html`
- `08-onboarding/screen.html`
- `09-photo-rules/screen.html`
- `11-profile-edit/screen.html`
- `27-settings/screen.html`
- `28-delete-export-status/screen.html`

## Known gaps

- Step 4 can show another email. There is no change-email endpoint, so that control does not claim success.
- The v2 helper says 8 characters. The API accepts 12–128. The button enables at length 12. The helper text is unchanged.
- The PIN art shows 6 slots. `PIN_PATTERN` is 4 digits, and the keypad submits at 4.
- Password-reset v2 is the request form only. There is no v2 screen for `POST /v1/password-resets/consume`.
- The phone country control is Burkina `+226` only.
- This commit is local until QA passes. Do not treat it as on GitHub.
