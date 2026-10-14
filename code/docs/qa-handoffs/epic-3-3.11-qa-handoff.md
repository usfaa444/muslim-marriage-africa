# Epic 3 Story 3.11 QA handoff

## What was built

Moderators and operators can read visit signals. A member is listed only when they opened more than 50 distinct profiles in the last 24 hours and sent zero Ta'aruf invites in that same window. The catalogue is the board comment on [ANK-136](/ANK/issues/ANK-136). `_bmad-output/` was not rewritten.

`GET /v1/staff/signals/visits` has no required query. Unknown query params are ignored. Auth is a live session whose roles include `moderator` or `operator`, the same staff gate as `GET /v1/staff/cases`. Staff MFA stays Story 12.1. `Cache-Control: no-store`. There is no new rate-limit key.

200 is `{ threshold: 50, window_hours: 24, generated_at, count, truncated, rows }`. Each row is `{ account_id, pseudonym, gender, age, city, member_since, id_verified, profiles_viewed_24h, invites_sent_24h, over_threshold_at }`. A row is a member with `profiles_viewed_24h > 50` and `invites_sent_24h = 0` in `[generated_at - 24h, generated_at]`. Order is `over_threshold_at` descending, then `account_id` ascending. There is no pagination. At most 100 rows are returned. `count` is every qualifying member. `truncated` is true when `count > 100`. The body never includes phone, WhatsApp, or email.

`gender` is `sister` or `brother`. `age` is an integer or null. `city` is the stored profile token or null. `member_since` is the UUID v7 timestamp of `account.id` (there is no `account.created_at`). `id_verified` is true only when the latest `id_document` and the latest `liveness` are both granted. `profiles_viewed_24h` is the count of distinct `target_id` in the window. `over_threshold_at` is the first `created_at` of each target in the window, sorted ascending, then the 51st (index 50). `invites_sent_24h` is `InvitesPort.sentCountSince`. The invite table does not exist until Story 4.1, so the adapter returns 0. This story does not create that table. Story 4.1 must replace the adapter.

Errors use the AD-7 envelope. 401 is `UNAUTHENTICATED`, message `Authentification requise.` 403 is `FORBIDDEN` via `staffForbidden()`, message `Accès réservé au personnel de modération.` A store failure is 500 `UNHANDLED`, message `Les signaux de visite sont indisponibles.`, `retryable: true`.

`GET /v1/profiles/:id` inserts one `profile_visit` only when `readPublicProfile` returns 200. `account_id` is the viewer session account, `target_id` is the path id, `created_at` is server time. Nothing is written on 401, 403, 404, 429, or 5xx, and nothing is written for self, staff, or mahram, because those fail before 200. If the insert throws, the error is logged and the 200 profile body is still returned. `GET /v1/browse`, `GET /v1/favourites`, and Discover or Search impressions do not write. There is no member-facing `profile_visit` read.

Migration `0017_profile_visit` has exactly `account_id`, `target_id`, and `created_at`. The primary key is `(account_id, target_id, created_at)`. Both ids reference `account(id)`. The index is `(account_id, created_at)`. There is no `id` column, no update, no delete, and no purge. Repeat opens add rows. Threshold 50 is the code constant `VISIT_THRESHOLD`. There is no `operator_config` key.

`/staff/visit-signals` is screen 52 for staff sessions. A `web`, `capacitor`, or `mahram` stub cookie redirects to `/decouvrir`. No cookie redirects to `/auth`. An opaque cookie probes `GET /v1/staff/signals/visits`: 401 goes to `/auth`, 403 goes to `/decouvrir`, and a failed probe fails closed to `/auth`. The live page fetches the same route. 401 sends the browser to `/auth`. 403 sends it to `/decouvrir`. Any other error shows the error banner with the French AD-7 line and `Réessayer`, which repeats the GET.

Copy uses the response, not the Stitch sample. The header count is `{count} cas actif` for 0 and 1, and `{count} cas actifs` otherwise. `Horodatage officiel :` is `generated_at` in Africa/Ouagadougou as `24 Mai 2026 • 15:42:19 GMT (Ouagadougou)`. `Membre depuis {mois AAAA}` uses that same zone, and appends ` • {city}` only when city is not null. City tokens use the existing French labels. `Consultations 24h` is `{n} fiches` plus `(+{n−50}/seuil)`. `Invitations Ta'aruf` is `{invites_sent_24h} transmise`. `Dépassement enregistré il y a {durée}` is `generated_at − over_threshold_at` (under 60 minutes as `N min`, otherwise `Hh Mmin`). The dossier line is `Membre ciblé : {pseudonym} ({M|F} / {age} ans)` and drops ` / {age} ans` when age is null (`sister` is F, `brother` is M). The ratio is `{profiles_viewed_24h} / {invites_sent_24h} (24h)`. Threshold sentences interpolate `threshold` and `window_hours`. The verified chip says `Identité vérifiée` only when `id_verified` is true. It does not say `CNIB Vérifiée (BF)`.

`Examiner la fiche` selects that row in the browser and fills the dossier from the same list. The first row is selected on load. The selected card shows `En cours d'examen` and `Fiche active` with the Stitch selected border. That selection is not stored. Zero rows keep the top bar, timestamp, title, intro, ethical frame, golden rule, and `0 cas actif`. The cards are replaced by `Aucun membre n'a consulté plus de 50 fiches en 24h sans envoyer d'invitation.` and `Actualiser`, which repeats the GET. There is no dossier and no sample card. `Actualiser`, `Réessayer`, and `Examiner la fiche` use `min-h-[44px]`.

These blocks are not rendered, and the task cites the later story: the whole `Décision de l'arbitre référent` block is Story 8.7; `Antécédents d'avertissement` is Story 8.7; the audit register (`SHA256` / operator / protocol) is Story 12.7; `Retour à la console de modération` waits for the Story 12.1 staff home. `Moyenne de séjour par profil` never renders because there is no dwell field. Sample names, `REF-TS-2026-0884`, and `MED-OUAGA-7704` are not rendered. Settings screen 27 is unchanged and has no who-viewed list.

## Where

- `code/apps/api/src/account-schema.ts` — `profile_visit`
- `code/apps/api/drizzle/0017_profile_visit.sql` and `code/apps/api/drizzle/meta/0017_snapshot.json`
- `code/apps/api/drizzle/meta/_journal.json` — migration `when` `1792400000000`, after `0016_favourite`
- `code/apps/api/src/invites-port.ts` — Story 4.1 adapter, returns 0
- `code/apps/api/src/visit-signals.ts` — insert, qualify, list
- `code/apps/api/src/visit-signals.controller.ts` — `GET /v1/staff/signals/visits`
- `code/apps/api/src/profiles.controller.ts` — insert only after a 200 profile read
- `code/apps/api/src/app.module.ts`
- `code/apps/api/src/visit-signals.test.ts`
- `code/apps/api/src/operator-config.migrate.test.ts` — expects 18 migrations and `profile_visit`
- `code/apps/web/src/visit-signals-page.ts` — screen 52
- `code/apps/web/app/staff/visit-signals/route.ts`
- `code/apps/web/src/v2-serve.ts` — `visitSignalsResponse`
- `code/apps/web/src/visit-signals-page.test.ts`
- `code/apps/web/src/v2-responsive.test.ts` — empty and filled screen 52 added to the width suite

## How to run

From `code/`:

```bash
./node_modules/.bin/vitest run --config vitest.unit.config.ts --fileParallelism false apps/api/src/visit-signals.test.ts apps/web/src/visit-signals-page.test.ts
./node_modules/.bin/vitest run --config vitest.unit.config.ts --fileParallelism false apps/api/src/public-profile.test.ts
./node_modules/.bin/tsc -p apps/api/tsconfig.json --noEmit
./node_modules/.bin/tsc -p apps/web/tsconfig.json --noEmit
```

The Postgres migration check is the existing integration file. It was not run in this heartbeat:

```bash
./node_modules/.bin/vitest run --config vitest.integration.config.ts --fileParallelism false apps/api/src/operator-config.migrate.test.ts
```

`drizzle-kit check` was run from `code/apps/api` and reported a clean snapshot chain.

Open `/staff/visit-signals` with a moderator or operator session. A member session should leave for `/decouvrir`. An anonymous visitor should leave for `/auth`.

## API test cases

| Case | Input | Expected |
| --- | --- | --- |
| Under the line | 50 distinct targets, plus repeats of the first target | 200 `{ count: 0, truncated: false, rows: [] }`, `threshold` 50, `window_hours` 24, `Cache-Control: no-store`. Unknown query params are ignored |
| Over the line | 51 distinct targets, zero invites, granted id and liveness, city `ouagadougou` | 200, one row, `profiles_viewed_24h` 51, `invites_sent_24h` 0, `id_verified` true, `age` 36, `over_threshold_at` is the 51st first open, `member_since` is the UUID v7 instant. No email, phone, or WhatsApp |
| Invite | The same member, port returns 1 | `{ count: 0, rows: [] }` |
| Cap | 101 qualifying members, operator session | `count` 101, `truncated` true, 100 rows, latest crossing first |
| Store down | `listInWindow` throws | 500 `UNHANDLED`, `Les signaux de visite sont indisponibles.`, `retryable` true |
| Member | Signed-in member | 403 `FORBIDDEN`, `Accès réservé au personnel de modération.` |
| Anonymous | No cookie | 401 `UNAUTHENTICATED`, `Authentification requise.` |
| Profile 200 | Opposite-gender public read | One `profile_visit` row. A second 200 adds another row |
| Profile miss | Self 404, or staff 403 | No new row |
| Insert throws | Store insert throws on a 200 read | Profile body is still 200 |
| Other reads | Browse and favourites controllers | They do not call `recordProfileVisit` |
| Table | `0017_profile_visit.sql` | Three columns, primary key `(account_id, target_id, created_at)`, both foreign keys, index `(account_id, created_at)`, no `id` column |
| Qualify | 50 distinct, then a repeat, then a 51st target | Absent, still absent, then one qualified row. Two accounts sort by later crossing first |

## Web test cases

| Case | Input | Expected |
| --- | --- | --- |
| Empty | Static paint with zero rows | Title, ethical frame, golden rule, `0 cas actif`, the empty sentence with 50 and 24, `Actualiser` at least 44px, official stamp `24 Mai 2026 • 15:42:19 GMT (Ouagadougou)`. No Souleymane, Al-Hassan, Oumar_K, CNIB, SHA256, moyenne de séjour, décision, retour, REF-TS, or MED-OUAGA. No fetch |
| Filled | Two static rows, first selected | `2 cas actifs`, `Identité vérifiée`, `En cours d'examen`, `Fiche active`, `Examiner la fiche`, selected `border-2 border-deep-navy`, `64 fiches`, `(+14/seuil)`, `0 transmise`, dossier `Aminata_KDG_long_pseudonym_that_wraps (F / 29 ans)` and `64 / 0 (24h)`, `Membre depuis Janvier 2026 • Ouagadougou` |
| Null age | One brother row with `age` null | `Moussa_BF_long_pseudonym (M)` and not ` (M /` |
| Live script | `visitSignalsHtml` with null paint | `data-visit-signals="live"`, fetch `GET /v1/staff/signals/visits`, script parses |
| Live browser | Two JSON rows, then click the second, then refresh into HTTP 500 | Dossier becomes `Moussa_BF_long_pseudonym (M)` and `52 / 0 (24h)` with `En cours d'examen`. The error text is `Les signaux de visite sont indisponibles.` |
| Settings | Screen 27 | No `qui a consulté`, no `profile_visit`, no `who_viewed` |
| Route | `GET /staff/visit-signals` | Staff stub 200 live HTML. `web` and `mahram` stubs 303 to `/decouvrir`. No cookie, and an opaque cookie when the API probe fails, 303 to `/auth` |
| Widths | Empty and filled at 360, 390, 768, 1024, 1280, 1440 | `document.documentElement.scrollWidth <= window.innerWidth`. Shots at 360 and 1440 |

## Test data

API memory accounts. Password `phrase avec espaces`. Date of birth `1990-01-15`. The visit clock starts at `2026-10-13T12:00:00.000Z`, so age is 36. The listed brother is published with city `ouagadougou` and both verification captures granted. Visit rows are seeded in the memory store; the profile-read test is the one that inserts through `GET /v1/profiles/:id`. The browser cards use `Aminata_KDG_long_pseudonym_that_wraps` (64 views, age 29, Ouagadougou, verified) and `Moussa_BF_long_pseudonym` (52 views, age null, no city). Generated time for the stamp is `2026-05-24T15:42:19.000Z`.

## My results

- `visit-signals.test.ts` and `visit-signals-page.test.ts`: 16 passed.
- `public-profile.test.ts`: 5 passed. A 200 profile read still returns the profile body.
- `tsc -p apps/api/tsconfig.json --noEmit` and `tsc -p apps/web/tsconfig.json --noEmit`: exit 0.
- `drizzle-kit check` from `code/apps/api`: clean.
- Empty and filled screen 52 passed all six widths. Shots: `code/docs/qa-handoffs/epic-3-3.11-widths/empty-360.png`, `empty-1440.png`, `filled-360.png`, `filled-1440.png`.
- `operator-config.migrate.test.ts` was not run here. It needs Postgres 17. The expected migration count is now 18 and both table lists include `profile_visit`.

## Three validation passes

1. Behavior: a 200 profile read appends a visit; misses do not; a failed insert still returns the profile; staff see only members over 50 distinct opens with zero invites; the first card is selected; `Examiner la fiche` fills the dossier from that list; empty state and retry use the real response; settings has no who-viewed list; sample names and later-story controls are absent.
2. Contract: `GET /v1/staff/signals/visits` body, order, cap, and AD-7 errors from the board comment. `profile_visit` primary key `(account_id, target_id, created_at)`. Invite count stays behind `InvitesPort` and is 0 until Story 4.1. API and web typecheck are clean. `drizzle-kit check` is clean.
3. Responsive: empty and filled screen 52 passed `scrollWidth <= innerWidth` at 360, 390, 768, 1024, 1280, and 1440. The same two states are in `v2-responsive.test.ts`.

## Solution-design sections followed

- Entity `profile_visit`: `account_id`, `target_id`, `created_at`. Discovery-owned. The board comment adds the primary key `(account_id, target_id, created_at)`, the index `(account_id, created_at)`, and both foreign keys. No `id`, update, delete, or purge.
- `GET /v1/staff/signals/visits` is the board comment. SOLUTION-DESIGN §7.1 did not name this route; the board record is the contract that was built.
- AD-7 error envelope. Staff gate matches `GET /v1/staff/cases`.
- `id_verified` matches screen 15: latest `id_document` and `liveness` both granted.
- `InvitesPort.sentCountSince` is the invite read. The invite table is Story 4.1 and was not created.

## Stitch files matched

- `code/design-stitch/ankanu-v2/52-ts-visit-signals/screen.html` and `screen.png` — shell, stamp, title, ethical frame, golden rule, case count, selected card, dossier qualification. Sample cards, the decision block, dwell, audit, case number, and `Retour à la console de modération` are not rendered.
- `code/design-stitch/ankanu-v2/27-settings/screen.html` — unchanged. No who-viewed list was added.

## Known gaps

- Story 4.1 must replace `InvitesPort.sentCountSince`. Until then every member has `invites_sent_24h` 0, so a member over the visit threshold is listed. Do not create the invite table in this story.
- Story 8.7 owns the arbitre decision block and warning history. Those controls are not on the page.
- Story 12.1 owns staff home, so `Retour à la console de modération` is not rendered. Staff MFA is also Story 12.1.
- Story 12.7 owns the audit register. SHA256, operator, and protocol lines are not rendered.
- `Moyenne de séjour par profil` is not rendered. There is no dwell field.
- The Postgres migration test was not executed in this heartbeat.
- This commit is local. It is not pushed. Push waits until QA passes.
