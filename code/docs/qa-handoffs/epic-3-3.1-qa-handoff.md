# Epic 3 Story 3.1 QA handoff

## What was built

A signed-in member can read and save their profile fields, and the profile-edit screen shows a completeness meter that names missing Invite criteria. Completeness is computed. It is not a table.

`GET /v1/me/profile` and `PUT /v1/me/profile` use the session cookie and the existing PIN gate. The caller must be a member. There is no new column and no migration. `bio_live` and `visibility` are not written. A body key that is not a profile column (`visibility`, photo visibility, confrérie, hijra) is ignored.

`PUT` body keys are the catalog columns the screen edits: `dob`, `city`, `country`, `origin`, `marital_status`, `polygamy_intent`, `education`, `profession`, `madhhab`, `practice`, `life_plans`, `bio_pending`. A missing key keeps the stored column. An empty string or null clears that optional field. `dob` is required on every save and must be a real `YYYY-MM-DD` at or above `min_age` (still 19 unless operator config says otherwise). A younger date is rejected and the stored date of birth stays. The age-gate hold is not changed. A rejected save does not write.

Glossary values only:

- `marital_status`: `single` | `married` | `divorced` | `widowed`
- `polygamy_intent`: `no` | `yes`

The screen radios map to those values (`celibataire`/`marie`/`divorce`/`veuf`, `non`/`oui`). Sending a screen token such as `celibataire` is `400`.

After the body is merged with the stored row, a brother must have both marital status and polygamy intent. A missing key keeps the stored value. If the merged marital status or polygamy intent is empty, the save is `400`. If marital status is `married`, polygamy intent must be `yes` or the save is `400`. A sister may leave both empty. Polygamy intent is stored when a sister sends a legal value; it is not required.

`life_plans` is the one intentions column. The screen's delay radio and the intentions text are stored together: `tf:immediate`, `tf:6months`, `tf:1year`, or `tf:serene`, then a newline, then the text. Text alone is stored when no delay is chosen. `tf:` plus any other token is `400`.

The description textarea writes `bio_pending` only. `bio_live` stays as it was. The screen shows `bio_pending` when set, otherwise `bio_live`. There is no « Photo en revue » line.

Success is `200` with the saved columns, `bio_live`, and `completeness`:

```json
{ "percent": 100, "missing": [], "ready": true }
```

`missing` uses these names, in this order, and never « profil faible »:

- `madhhab`
- `pratique`
- `intentions`
- `situation matrimoniale` (brother only)
- `intention de polygamie` (brother only, including a married brother whose intent is not `yes`)

`ready` is true only when that list is empty. The bar is navy until then. At 100% the bar is `#C9A86C`. The banner that holds the info icon, the missing line, and the helper is hidden when `missing` is empty, and shown again when the response names a gap. The helper sentence from the Stitch screen shows only while `madhhab` is in `missing`.

Errors are the AD-7 envelope. `401 UNAUTHENTICATED` with no session or no profile row. `400 UNHANDLED` with `details.field` and a French message that names the field. `503` when `min_age` cannot be read, message `min_age : la configuration est illisible.`, `retryable` true. Married-brother message: `polygamy_intent : l'intention de polygamie doit être oui lorsque le frère est marié.`

`GET /profile-edit` still serves `code/design-stitch/ankanu-v2/11-profile-edit/screen.html`. The Stitch file is not edited. Sample date, origin, bio, intentions text, 70%, checked radios, and the preselected marital pill are cleared. The page loads `GET /v1/me/profile` and fills the real row. « Enregistrer les modifications » does nothing until that GET succeeds. If the member edits a control before the GET returns, that control keeps what they typed and the response fills only the controls they have not touched. The delay radio and the intentions text are separate controls of the one `life_plans` column: editing one before the GET returns does not clear the other. A later save sends the form. « Mettre en pause » still posts `POST /v1/me/deactivate` with the existing reason map (`ramadan`, `exams`, `travel`, `mourning`).

The PIN checkbox reads `GET /v1/pin`. Turning it on opens `/pin` (Story 2.10). Story 2.10 has no disable route, so unchecking does not turn a PIN off.

## Where

- `code/apps/api/src/profile-fields.ts` — column checks and `completenessFor`
- `code/apps/api/src/profile-store.ts` — read and update. Memory store for tests. Postgres update does not touch `bio_live` or `visibility`
- `code/apps/api/src/profile.controller.ts` — `GET` and `PUT /v1/me/profile`
- `code/apps/api/src/app.module.ts` — registers `ProfileController`
- `code/apps/api/src/profile.test.ts`
- `code/apps/web/src/v2-pages.ts` — `profileHtml` clears specimens and adds meter ids. The missing banner starts hidden
- `code/apps/web/src/v2-client.ts` — `profileScript` load, save, meter, age, pause, PIN. Save waits for a successful GET. A late GET does not overwrite controls the member already edited
- `code/apps/web/src/profile-edit-page.test.ts` — early save, untouched fill, and the ready/gap banner
- `code/apps/web/src/v2-flow.test.ts` — specimen and save-call checks
- `code/apps/web/app/profile-edit/route.ts` — unchanged route

## How to run

From `code/`:

```bash
npx vitest run --config vitest.unit.config.ts apps/api/src/profile.test.ts apps/web/src/profile-edit-page.test.ts apps/web/src/v2-flow.test.ts apps/web/src/v2-responsive.test.ts apps/api/src/life-pause.test.ts
npx tsc -p apps/api/tsconfig.json --noEmit
npx tsc -p apps/web/tsconfig.json --noEmit
```

Sign in, then open `/profile-edit`. Save posts `/v1/me/profile`. A brother who is `married` with polygamy `non` sees the field error and nothing new is stored.

## Test cases

| Case | Input | Expected |
| --- | --- | --- |
| No session | `GET /v1/me/profile` | `401` `UNAUTHENTICATED` |
| New sister | `GET` after signup | `dob` from signup. `completeness.missing` is `madhhab`, `pratique`, `intentions`. `ready` false. No « profil faible » |
| Sister save | city `ouagadougou`, country `BF`, origin, education `licence`, profession `enseignement`, madhhab `maliki`, practice `assidue`, `life_plans` `tf:6months\nUnion stable`, `bio_pending` set, `visibility` `public` in the body | `200`. Those fields echo. `bio_live` null. `completeness` `{percent:100, missing:[], ready:true}`. Response has no `visibility`. Stored `visibility` stays null |
| Married brother, polygamy no | `marital_status` `married`, `polygamy_intent` `no` | `400`. `details.field` `polygamy_intent`. Message says the intent must be oui. Stored fields stay |
| Brother under min age | `dob` `2010-01-01` with legal marital fields | `400`. `details.field` `dob`. Stored dob stays the signup date |
| Married brother, polygamy yes | marital `married`, polygamy `yes`, Islamic fields set | `200`. `GET` returns the same marital, polygamy, and madhhab. `bio_live` null. Meter ready |
| Partial body | After that brother save, `PUT` `{ "dob": "1992-03-04" }` only | `200`. Dob changes. Marital, polygamy, madhhab, practice, and life plans stay |
| Partial sister body | After a sister save with city `ouagadougou` and the Islamic fields, `PUT` `{ "dob": "1991-02-02" }` only | `200`. City, country, origin, education, profession, madhhab, practice, life plans, and bio pending stay |
| Clear on purpose | `city` `""` and `madhhab` `null` on that sister | Those two become null. Country, practice, life plans, and bio pending stay. Meter missing is `madhhab` |
| Clear text on purpose | `origin` `""`, `bio_pending` `null`, `life_plans` `""` | Those three become null. Country and practice stay. Following `GET` matches |
| Married, polygamy key omitted | Brother stored as `single` / `no`, then `PUT` with `marital_status` `married` and no polygamy key | `400`. Polygamy message. Following `GET` is still `single` / `no` and the Islamic fields stay |
| UI token | `marital_status` `celibataire` | `400`. `details.field` `marital_status`. Following `GET` still has the stored city and madhhab |
| Bad delay token | `life_plans` `tf:nope` | `400`. `details.field` `life_plans`. Following `GET` still has the stored life plans |
| Brother missing marital | polygamy `yes`, no marital status, Islamic fields in the body | `400`. `details.field` `marital_status`. Message `marital_status : la situation matrimoniale est requise.` Following `GET` still has the signup dob and null madhhab |
| Brother meter | `GET` for a new brother | `missing` is `madhhab`, `pratique`, `intentions`, `situation matrimoniale`, `intention de polygamie`. Percent 0 |
| Unreadable min age | `min_age` cannot be read | `503`. Message `min_age : la configuration est illisible.` `retryable` true. Following `GET` unchanged |
| Early save | Type a dob and an origin, then click « Enregistrer les modifications » before `GET /v1/me/profile` returns | No `PUT`. When the GET arrives, the typed dob and origin stay. Untouched controls fill from the response |
| Early intentions edit | Type intentions text before the GET, leaving the delay radio alone | The stored delay stays selected. The typed text stays. The later save sends `tf:<delay>` plus a newline plus that text |
| Ready meter | Response `missing` is empty | The banner (info icon, missing line, and helper) is hidden. The bar is `#C9A86C` |
| Gap again | A later response names `madhhab` | The banner is shown. The helper is shown. The missing line is `« Il manque : madhhab »` |
| Pause | « Mettre en pause » with Ramadan | Still `POST /v1/me/deactivate` `{"reason":"ramadan"}`. Life-pause tests still pass |
| Specimens | Built `/profile-edit` HTML | No `1996-09-14`, `29 ans`, `70% complété`, `Projet d'édification`, `Je suis une personne calme`, checked `celibataire` |
| Absent NEXT fields | Page and JSON | No confrérie, hijra, who-favourited, visitors, online-now, anonymous |
| Widths | 360, 390, 768, 1024, 1280, 1440 | `scrollWidth <= innerWidth`. No box outside the viewport |

## Test data

Signup body used by `profile.test.ts`: email `profilN@example.bf`, password `phrase avec espaces`, gender `sister` or `brother`, dob `1990-01-15`, pledge accepted, captcha `test-ok`. Clock in that test is `2026-10-12`. `min_age` is 19.

## My results

- `profile.test.ts`, `profile-edit-page.test.ts`, and `v2-flow.test.ts`: 36 passed. That includes the partial body, `celibataire`, `tf:nope`, a brother with no marital status, the brother missing-label list, unreadable `min_age` 503, a GET after each 400, and a married brother whose omitted polygamy intent is still `no`.
- `v2-responsive.test.ts` and `life-pause.test.ts`: 6 passed. Profile edit is page `13-profile` in the width run (360, 390, 768, 1024, 1280, 1440). `scrollWidth <= innerWidth`. Shots: `code/docs/qa-handoffs/ank-83-widths/13-profile-360.png` and `13-profile-1440.png`.
- `tsc -p apps/api/tsconfig.json` and `tsc -p apps/web/tsconfig.json`: exit 0.
- I did not click a signed-in browser session against a running app. Chrome did load the built profile HTML at each required width. The early-save and banner cases ran against the profile script with a fake document.

## Three validation passes

1. Behavior: session required; sister save persists the catalog columns; brother married without polygamy `yes` is rejected; meter names the missing fields; `bio_live` and `visibility` stay; pause still posts deactivate.
2. Screen: one state from `GET /v1/me/profile`. Sample Stitch values are not rendered. The missing banner, including the info icon, stays hidden until the response names real gaps, then shows again. The helper stays limited to a missing madhhab. The gold bar is only when `ready` is true. Save does not run before that GET. No state tabs, demo toggles, or all-states gallery.
3. Widths: Chrome on the built profile HTML at 360, 390, 768, 1024, 1280, and 1440. `document.documentElement.scrollWidth <= window.innerWidth`, and no measured box outside the viewport.

## Solution-design sections

Followed `profile` in the entity catalog (columns above; no `profile_field` table; completeness computed). APIs row `profiles` `/v1/me/profile`. AD-3: this write is the profiles update of those columns; account create still inserts only `account_id` and `dob`. AD-26: brother marital status and, when `married`, polygamy intent `yes`. FR-021, FR-022, FR-023, and the FR-037 save rule. Invite inbox visibility and the misrepresentation report are not in this story. OQ-1 first-wife notification is unbuilt.

## Stitch files

- `code/design-stitch/ankanu-v2/11-profile-edit/screen.html`
- `code/design-stitch/ankanu-v2/11-profile-edit/screen.png`

Matched that screen's sections, order, copy, and tokens. Sample member text is not rendered. Narrow widths keep the same controls and reflow.

## Known gaps

- « Mettre à jour la photo » is Epic 3 Story 3.2. It does not upload.
- « Consignes de pudeur » is Epic 3 Story 3.5. It does not open rules.
- Photo visibility (`on_accept` / `on_request` / `never`) is Epic 3 Story 3.2 / FR-056. The radios are on screen and are not saved.
- « Photo en revue » is Epic 3 Stories 3.2 and 3.3. This story does not show that line. Bio stays on `bio_pending`.
- Invite send when a required field is empty is a later Invite story. This story only returns the meter and the save rules.
- The PIN checkbox cannot disable a PIN. Story 2.10 exposes set, lock, and unlock, not delete. Turning the box on opens `/pin`.
- City and country are the Stitch option tokens (`ouagadougou`, `BF`, `autre`, `OTHER`). There is no free-text city.
- The meter does not name city, origin, education, profession, or bio. The pack names Islamic criteria (madhhab, practice, intentions) plus the brother marital-honesty fields.
- `life_plans` uses the Stitch delay tokens, not the glossary assumption enum `ready_now` / `within_year` / `exploring`.
- Not pushed. After QA passes, push this commit and comment the SHA on [ANK-98](/ANK/issues/ANK-98).
