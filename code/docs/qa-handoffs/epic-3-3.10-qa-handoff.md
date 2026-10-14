# Epic 3 Story 3.10 QA handoff

## What was built

A member can save a public opposite-gender profile to a private list that only they can read, and can remove one row. The catalogue is the board comment on [ANK-132](/ANK/issues/ANK-132) (`0a490c46-7304-4140-99f0-5f1936bab667`). `_bmad-output/` was not rewritten.

`POST /v1/favourites` accepts JSON `{ "target_id": "<uuid v7>" }` only. `target_id` is the favourited account id. `account_id` comes from the session and is never in the body. The first insert is 201 `{ account_id, target_id, created_at }`. The same grain is 200 with the existing row and does not insert again. A missing, non-v7, or self `target_id` is 400 `UNHANDLED`, `details.field` `target_id`, message `target_id : valeur non reconnue.` An unknown target, or a target that is not a listable opposite-gender public Member, is 404 `NOT_FOUND`, message `Ce profil n'est pas disponible.`

`GET /v1/favourites` has no query and no body. It fills screen 17. 200 is `{ count, items }` ordered by `created_at` descending, then `target_id` descending when the timestamps match. Each item is `{ target_id, created_at, pseudonym, age, city, profession, madhhab, practice, marital_status, polygamy_intent, verified, photo_blur, photo, bio }`. Labels reuse the browse maps. `profession` stays the stored token. `bio` is trimmed `bio_live` or null. `verified` is the latest `id_document` and `liveness` both granted. `photo` is the live MAIN `profile_photo` signed with `MediaPort.sign` at size `blur`, or null. `photo_blur` is true only when that blur URL was signed. Zero rows are 200 `{ count: 0, items: [] }`. A vanished target is omitted, so `count` equals `items.length`.

`DELETE /v1/favourites/:target_id` has no body. The path is `favourite.target_id` and the owner is the session. Success is 200 `{}`. A missing row, or a path that is not a UUID v7, is 404 `NOT_FOUND`, message `Ce favori n'existe pas.` There is no `removed_at`. A retry after 404 stays 404.

Auth on all three is `requireLiveSession` then `assertBrowseViewer`, the same gate as `GET /v1/browse`. 401 is `UNAUTHENTICATED`. 403 is `FORBIDDEN` with `details.reason` `staff_session`, `mahram_session`, or `viewer_not_listable`, and the same messages as browse. `Cache-Control: no-store`. None of the three takes a browse rate slot. None calls `BillingPort`. GET does not insert or delete a favourite. Signing a blur URL writes a `signed_grant`, the same as browse. Other methods on the collection, and `GET /v1/who-favourited-me`, stay 404. There is no likes table and no `who_favourited_me` side effect.

The bookmark on the Découvrir grid (screen 57) and on profile detail (screen 15) posts `{ target_id }` to `/v1/favourites`. It is a bookmark, not a heart. A 200 or 201 marks the control pressed and does not navigate. Pass stays `POST` on browse, unchanged. `view=card` stays 404. Settings does not gain a who-favourited list.

`/favoris` is screen 17. A staff or mahram cookie gets the member JSON envelope. An anonymous visitor is sent to `/auth`. A live session gets the private list. Zero rows keep the screen 17 shell (back « Mon espace personnel » to `/profil`, title « Profils favoris », the privacy callout) plus « Aucun favori. » and a Découvrir link to `/decouvrir`. One or more rows paint the real GET items: count pill « 1 profil enregistré » or « N profils enregistrés », chips for madhhab, practice, marital status, and polygamy when set, city only (no quartier), « Photographie réservée » only when `photo` is null, « Consulter la fiche détaillée » to `/profil/:id`, and « Retirer de ma sélection » as `DELETE`. Sample names, « Secteur 15 », and the two-card gallery are not rendered.

## Where

- `code/apps/api/src/account-schema.ts` — `favourite` grain `(account_id, target_id)`
- `code/apps/api/drizzle/0016_favourite.sql` and `code/apps/api/drizzle/meta/0016_snapshot.json`
- `code/apps/api/src/favourites.ts` — memory and Postgres store, list, save, remove
- `code/apps/api/src/favourites.controller.ts` — `GET`, `POST`, `DELETE /v1/favourites/:target_id`
- `code/apps/api/src/app.module.ts`
- `code/apps/api/src/favourites.test.ts`
- `code/apps/web/src/favourites-page.ts` — screen 17
- `code/apps/web/app/favoris/route.ts`
- `code/apps/web/src/v2-serve.ts` — `favouritesResponse`
- `code/apps/web/src/entry-guard.ts` and `code/apps/web/src/member-route.ts` — `/favoris`
- `code/apps/web/src/discover-page.ts` — grid bookmark posts
- `code/apps/web/src/profile-detail.ts` — screen 15 bookmark posts
- `code/apps/web/src/favourites-page.test.ts`

## How to run

From `code/`:

```bash
./node_modules/.bin/vitest run --config vitest.unit.config.ts --testTimeout 180000 apps/api/src/favourites.test.ts apps/web/src/favourites-page.test.ts apps/web/src/discover-page.test.ts apps/web/src/profile-detail.test.ts apps/web/src/member-route.test.ts apps/web/src/v2-flow.test.ts
./node_modules/.bin/tsc -p apps/api/tsconfig.json --noEmit
./node_modules/.bin/tsc -p apps/web/tsconfig.json --noEmit
```

Sign in as a listable member, open `/favoris` (empty copy, then save a profile from the Découvrir grid or from `/profil/:id`), confirm the row is only on that member's list, then « Retirer de ma sélection ».

## API test cases

| Case | Input | Expected |
| --- | --- | --- |
| Save | Listable sister, published opposite brother, `POST { target_id }` | 201 `{ account_id, target_id, created_at }`, `Cache-Control: no-store` |
| Again | Same body | 200 with the same `created_at`. One row |
| List | `GET /v1/favourites` as the owner | 200, `count` 1, labels, raw `profession`, `verified` true, blur `photo.url`, `bio`, no quartier |
| Private | `GET` as the target | 200 `{ count: 0, items: [] }` |
| Who | `GET /v1/who-favourited-me` | 404 |
| Order | Two saves, later `created_at` second | Newer row first |
| Remove | `DELETE /v1/favourites/:target_id` | 200 `{}`, then the list has the other row. A second DELETE is 404 `Ce favori n'existe pas.` |
| No session | `POST` | 401 `UNAUTHENTICATED` |
| Not listable | Viewer profile is not public | 403 `viewer_not_listable` |
| Self / missing / bad id | `target_id` self, absent, or not uuid v7 | 400 `UNHANDLED`, `details.field` `target_id` |
| Hidden | Unknown id, unpublished, or same gender | 404 `Ce profil n'est pas disponible.` |
| Staff / mahram | Roles `moderator` or `mahram` | 403 `staff_session` or `mahram_session` |
| Other method | `PUT /v1/favourites` | 404 |
| Slot | `rl_browse_per_min` is 1 and browse already used it | POST 201 and GET 200 |
| No photo | No live MAIN | `photo` null, `photo_blur` false, `bio` null, `verified` false |
| Billing | The calls above | `BillingPort.isEntitled` is not called |
| Table | `0016_favourite.sql` | Primary key `(account_id, target_id)` |

## Web test cases

| Case | Input | Expected |
| --- | --- | --- |
| Empty | `favouritesHtml` with `[]` | « Aucun favori. », Découvrir to `/decouvrir`, back to `/profil`, count and aside hidden. No Al-Hassan, Ibrahim_S, or Secteur 15 |
| One card | Static card | « 1 profil enregistré », labeled place, madhhab chip, blur image, Consulter to `/profil/:id`, Retirer. The painted card has no lock |
| Live | `favouritesHtml` with no array | `data-favourites="live"`, GET `/v1/favourites`, DELETE on Retirer |
| Settings | Screen 27 | No « favori », no `who_favourited`, no « qui vous a ajouté » |
| Staff / anon | `GET /favoris` | Staff cookie 403 JSON. No cookie 303 to `/auth` |
| Discover | Bookmark click and Enter on a grid tile | Two POSTs to `/v1/favourites`. Path stays `/`. The tile click still goes to `/profil/:id` |
| Profile | Screen 15 | `data-target-id` and `fetch('/v1/favourites'` |
| Widths | Empty and one card at 360, 390, 768, 1024, 1280, 1440 | `document.documentElement.scrollWidth <= window.innerWidth` |

## Test data

API memory accounts. Password `phrase avec espaces`. Date of birth `1990-01-15`. Clock `2026-10-13` gives age 36. The brother is published with city `ouagadougou`, profession `ingenierie`, madhhab `maliki`, practice `assidue`, marital `single`, polygamy `no`, `bio_live` `Foyer posé.`, granted id and liveness, and one live MAIN photo. The browser card uses pseudonym `Aminata_KDG_long_pseudonym`, age 29, and a blur URL `/v1/media/get?token=blur`.

## My results

- `favourites.test.ts` and `favourites-page.test.ts`: 10 passed after the final type fix. The earlier run of those two plus `discover-page.test.ts`, `profile-detail.test.ts`, `member-route.test.ts`, and `v2-flow.test.ts` was 53 passed.
- Bookmark click and Enter posted twice and stayed on `/`.
- Empty and filled `/favoris` passed all six widths. Shots: `code/docs/qa-handoffs/epic-3-3.10-widths/empty-360.png`, `empty-1440.png`, `filled-360.png`, `filled-1440.png`.
- `tsc -p apps/api/tsconfig.json --noEmit` and `tsc -p apps/web/tsconfig.json --noEmit`: exit 0.

## Three validation passes

1. Behavior: save, idempotent save, private list, delete, grid bookmark, profile bookmark, empty copy, no sample members, no who-favourited list, no billing call.
2. Contract: POST, GET, and DELETE bodies and errors from the board comment. `favourite` primary key. AD-7 envelope. No browse slot. API and web typecheck are clean.
3. Responsive: empty and filled screen 17 passed `scrollWidth <= innerWidth` at 360, 390, 768, 1024, 1280, and 1440.

## Solution-design sections followed

- Entity `favourite`: `account_id`, `target_id`, `created_at`. Primary key `(account_id, target_id)`. Discovery-owned. Not a pass.
- SOLUTION-DESIGN §7.1 names `/v1/favourites`. Methods, bodies, and errors are the board comment, not a new catalogue file.
- AD-7 error envelope. AD-12: a mahram session has no favourites path. AD-20: city only, no quartier.
- Browse viewer gate and listability. `MediaPort.sign` size `blur` for a live MAIN. No `BillingPort`. FR-033 stays off.

## Stitch files matched

- `code/design-stitch/ankanu-v2/17-favourites/screen.html` and `screen.png` — shell, privacy callout, count pill, card actions, aside. Sample cards are not rendered. The empty state is the shell plus « Aucun favori. » There is no separate empty frame.
- `code/design-stitch/ankanu-v2/57-discover/grid.html` — quiet bookmark on each tile.
- `code/design-stitch/ankanu-v2/15-profile-detail/screen.html` — « Mémoriser discrètement ce profil ».

## Known gaps

- Screen 13 (`code/design-stitch/ankanu-v2/13-search/screen.html`) has no shipped route and no search-read contract, so its bookmark is not wired.
- The focused card on screen 57 is still stripped. `view=card` stays 404 until Story 3.13, so that card's bookmark is not in the DOM.
- « Mon espace personnel » goes to `/profil`, which is still the existing member stub for a live cookie.
- The count pill uses « 1 profil enregistré » for one row and « N profils enregistrés » otherwise.
- Equal `created_at` values are ordered by `target_id` descending. The board comment did not name a tie-break.
- `GET /v1/favourites` writes `signed_grant` rows when it signs a blur URL. It does not write a favourite.
- The Postgres store and `0016_favourite.sql` were not executed against a database in this run. The automated tests use the memory store.
- Not pushed. After QA passes, push this commit and comment the SHA on [ANK-132](/ANK/issues/ANK-132). No next story. No deploy. Parent [ANK-97](/ANK/issues/ANK-97) stays open.
