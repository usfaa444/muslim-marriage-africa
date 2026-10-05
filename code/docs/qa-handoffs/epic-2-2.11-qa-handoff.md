# Epic 2 Story 2.11 QA handoff

## What was built

A member can deactivate with a named life-pause and one-tap reactivate. Identity writes only `account.status`. The reason and the free-text note are validated and discarded. Nothing else is written.

`GET /v1/me/deactivate` returns `200 {"status":"Active"|"deactivated"|"held"}`.

`POST /v1/me/deactivate` body `{"reason":"ramadan"|"exams"|"travel"|"mourning","note"?: string}`. `reason` is required. `mourning` is the PRD grief pause. `note` is optional, trimmed, 0 to 200 characters after trim, empty means absent. A control character (`U+0000`–`U+001F` or `U+007F`) in the trimmed note is rejected. Success is `200 {"status":"deactivated"}`. A second post while already deactivated returns the same `200`. The write is `UPDATE account SET status='deactivated' WHERE id=<me> AND status IN ('Active','deactivated')`.

`POST /v1/me/reactivate` ignores the body. Success is `200 {"status":"Active"}`. Already `Active` returns the same `200`. The write is `UPDATE account SET status='Active' WHERE id=<me> AND status IN ('deactivated','Active')`.

The three routes use the session cookie and the existing PIN gate (`applySessionGate`). They are not on the exempt list. The caller must be a member session (`roles` includes `member`). There is no extra CSRF token, no migration, no new column, no rate-limit key, no `Idempotency-Key`, and no `BillingPort` call.

Errors use the AD-7 envelope and no new code: `401 UNAUTHENTICATED`; `401 PIN_REQUIRED` with message `Code PIN requis.` from the existing gate; `400 UNHANDLED` with `details.field` `reason` or `note` and a French message (`reason : un motif est requis.`, `note : le texte est illisible.`, `note : caractères de contrôle refusés.`, `note : 200 caractères au maximum.`); `403 FORBIDDEN` with `details {"status":"held"}` and message `La pause ne modifie pas un compte en attente.` when `account.status` is `held`; `403 FORBIDDEN` with `details` null and message `Cette session ne peut pas modifier ce compte.` for a non-member session.

`profile.visibility` is not written. Verification, credential, email verification, session, PIN, and profile rows are not inserted, updated, or deleted. Sessions stay open. `create-session` does not read status, so a deactivated member can sign in and reactivate from the screen. The reason is not returned, logged, or put in error details.

`GET /profile-edit` serves `code/design-stitch/21-profile-edit/screen.html` with `content-type: text/html; charset=utf-8`, `cache-control: no-store`, and `referrer-policy: no-referrer`. The Stitch file is not edited. This file has no Scaleway, Paris, Île-de-France, fr-par, or « hébergée souverainement » line. The PIN guard script is injected. `/profil` stays the JSON member shell.

On load the page calls `GET /v1/me/deactivate`. While `Active`, `#togglePauseBtn` toggles `#pauseDrawer`. The checked `pause_reason` radio is `reason`. The unnamed text input in the drawer is `note`. `#saveButton` posts deactivate only when the drawer is open. The printed spinner shows and the label becomes `Examen de conformité...`. Success sets `#alertSuccess` title to `Pause enregistrée` and the second line to `Réactivation en un clic sans reprise du parcours initial — vérifications d'identité préservées.` Failure puts the server message in `#alertErrorMessage`. `Annuler` closes the drawer and does not call. While `deactivated`, the same `#togglePauseBtn` shows icon `play_circle` and label `Réactiver mon profil`, the drawer stays closed, and one click posts `/v1/me/reactivate` with body `{}`. Success title is `Profil réactivé` and the second line is `Votre compte est de nouveau actif.` While `held`, the button is disabled, color `#B5A894`, and no call is made. Profile fields, photos, and PIN enable stay unwired.

## Where

- `code/apps/api/src/life-pause.ts` — reason and note checks. The accepted values are not returned.
- `code/apps/api/src/life-pause-store.ts` — `readAccountStatus` and the two conditional status writes.
- `code/apps/api/src/me.controller.ts` — `GET/POST /v1/me/deactivate`, `POST /v1/me/reactivate`.
- `code/apps/api/src/app.module.ts` — registers `MeController`.
- `code/apps/api/src/create-account.ts` — `deactivated` is a legal in-memory status. Signup still writes only `Active` or `held`.
- `code/apps/api/src/life-pause.test.ts`
- `code/apps/web/src/profile-edit-page.ts`
- `code/apps/web/src/profile-edit-page.test.ts`
- `code/apps/web/app/profile-edit/route.ts` — `GET /profile-edit`

## How to run

From `code/`:

```bash
npx vitest run --config vitest.unit.config.ts apps/api/src/life-pause.test.ts apps/web/src/profile-edit-page.test.ts
npx tsc -p apps/api/tsconfig.json --noEmit
npx tsc -p apps/web/tsconfig.json --noEmit
```

Sign in, then:

```bash
curl -sS -H 'content-type: application/json' \
  -d '{"identifier":"pause1@example.bf","password":"phrase avec espaces","remember_me":false}' \
  http://127.0.0.1:3000/v1/sessions

curl -sS -H "cookie: ankanu_session=SESSION_ID" http://127.0.0.1:3000/v1/me/deactivate

curl -sS -X POST http://127.0.0.1:3000/v1/me/deactivate \
  -H 'content-type: application/json' \
  -H "cookie: ankanu_session=SESSION_ID" \
  -d '{"reason":"ramadan","note":"recueillement"}'
```

Expected GET before a pause: `200` `{"status":"Active"}`. Expected POST: `200` `{"status":"deactivated"}`. The body has no `reason` and no `note`.

Open `GET /profile-edit` in the signed-in browser. The folio is the Stitch screen. `Configurer une pause` opens the drawer. Save posts the checked radio. The button then reads `Réactiver mon profil`.

## Test cases

| Case | Input | Expected |
| --- | --- | --- |
| No session | `GET /v1/me/deactivate` | `401` `UNAUTHENTICATED` |
| Active read | Member cookie | `200` `{"status":"Active"}` |
| Named pause | `POST /v1/me/deactivate` `{"reason":"mourning","note":"  une note  "}` | `200` `{"status":"deactivated"}`. Response has no reason and no note. Profile, credential, and `expires_at` stay. Status is `deactivated` |
| Idempotent pause | Same post again with `reason` `ramadan` | `200` `{"status":"deactivated"}` |
| Sign in while paused | `POST /v1/sessions` with the same password | `201`. `GET /v1/me/deactivate` is still `deactivated`. The older session is still live |
| Reactivate | `POST /v1/me/reactivate` with `{"ignored":true}` or an empty body | `200` `{"status":"Active"}`. A second call is the same `200`. Profile and credential match the pre-pause snapshot |
| Bad reason | `{}` or `{"reason":"grief"}` | `400` `UNHANDLED`, `details.field` `reason`, message `reason : un motif est requis.`. Status stays `Active`. The body does not echo `grief` |
| Bad note | note is a number, `a\nb`, or 201 `é` | `400` `UNHANDLED`, `details.field` `note`. Status stays `Active` |
| Blank note | `{"reason":"exams","note":"   "}` | `200` `{"status":"deactivated"}` |
| Held | `account.status` `held`, either POST | `403` `FORBIDDEN`, `details` `{"status":"held"}`. Status stays `held`. GET returns `{"status":"held"}` |
| Non-member | roles `['mahram']` | `403` `FORBIDDEN`, `details` null. Status stays `Active` |
| PIN locked | PIN set, then `POST /v1/pin/lock`, then deactivate | `401` `PIN_REQUIRED`. Status stays `Active` |
| Screen file | `GET /profile-edit` | Stitch folio, `Configurer une pause`, fetch to both routes, PIN guard. No `Réactiver mon profil` in the Stitch file. No Scaleway line |
| Drawer | Active, drawer closed, click save | No POST. Opening the drawer and saving posts `{"reason":"exams","note":"  concours  "}`, then the button is `Réactiver mon profil` / `play_circle` and the drawer is closed |
| One tap | Click that button | `POST /v1/me/reactivate` body `{}`. Button returns to `Configurer une pause` / `pause_circle`. Alert title `Profil réactivé` |
| Annuler | Open drawer, then Annuler | Drawer closes. No extra POST |
| Held screen | GET status `held` | Button disabled. A click does not POST |

## Test data

Sister accounts `pauseN@example.bf` / `Pause_N`, password `phrase avec espaces`, date of birth `1990-01-15`. PIN `1357` only in the locked-gate case. No Redis. Status lives on the account row.

## My results

- `npx vitest run --config vitest.unit.config.ts apps/api/src/life-pause.test.ts apps/web/src/profile-edit-page.test.ts`: 2 files, 7 tests passed.
- `npx tsc -p apps/api/tsconfig.json --noEmit` and `npx tsc -p apps/web/tsconfig.json --noEmit` passed.
- I did not open a graphical browser. `GET /profile-edit` ran through the route function. Drawer, save, reactivate, Annuler, and the held button ran in the unit harness.

## Three validation passes

1. API: the three routes, discarded reason, held and non-member refusals, PIN gate, and unchanged profile, credential, and session expiry.
2. Screen: served HTML is the Stitch folio; the injected script only changes the printed pause button, spinner, and alerts.
3. Static: `tsc` on the API and web packages.

## Solution-design sections

Founder card `280860bb` on [ANK-66](/ANK/issues/ANK-66). `account.status` is `Active` / `deactivated` / `held` (SOLUTION-DESIGN account table; migration `0001` already allows it). `profile.visibility` is not a pause value and is not written. `conversation.paused_by` is not written. The invite table gains no column. FR-018 is identity / AD-8. AD-7 envelope. No new relationship.

Later packs, not built here: a member is listable only when `profile.visibility = 'public'` AND `account.status = 'Active'` (status read through identity). A chat thread shows a pause when the other participant's `account.status` is `deactivated`, at read time, with nothing stored. FR-038 rejects a submit when the recipient's `account.status` is `deactivated`.

## Stitch files

- `code/design-stitch/21-profile-edit/screen.html`
- `code/design-stitch/21-profile-edit/screen.png`

`DESIGN.md` is not the layout. The served page keeps the Stitch folio. Deactivated and held states change only the printed pause button, the existing alerts, and the existing spinner.

## Known gaps

- Browse, invites, and chat are not in this repo. The three later-story rules above are not implemented here.
- Profile save, photos, completeness, and reveal policy are Story 3.1. `#saveButton` does not call `PUT /v1/me/profile`.
- PIN enable on this screen is not wired. The existing PIN gate still blocks these routes when the session is locked.
- The named reason is not stored.
- `/profil` stays JSON. The folio is `GET /profile-edit`.
- Google sign-in stays deferred. This screen has no Google button.
- This commit stays local until QA passes. Do not treat it as pushed.
