# Epic 3 Story 3.9 QA handoff

## What was built

Basic filters from the board catalogue on [ANK-129](/ANK/issues/ANK-129). `GET /v1/filters` returns the same seven keys for every listable member. `GET /v1/browse` accepts those keys on the Story 3.8 grid. Screen 14 is the filter surface on Découvrir. Nothing is stored in `localStorage` or on the server: the applied set is the `/decouvrir` query.

`GET /v1/filters` is read-only. The query is ignored. It uses the same live session and browse viewer gate as browse. `Cache-Control: no-store`. It does not take a browse rate slot, does not write, and does not call `BillingPort`. A 401 is `UNAUTHENTICATED`. A 403 is `FORBIDDEN` with `details.reason` `staff_session`, `mahram_session`, or `viewer_not_listable`. Another method is 404.

`GET /v1/browse` keeps the Story 3.8 route, gate, order, keyset, page size 12, and response fields. Each filter key is optional, exactly one value, and AND. The filter runs before the keyset. Unknown keys (including age, language, and any FR-030 key) are 400 `UNHANDLED`, `retryable` false, message `<key> : filtre non disponible.` A repeated key or a value outside the list is 400, message `<key> : valeur non reconnue.` `radius_km` without `ouagadougou`, `bobo`, or `koudougou`, including `city=autre`, is 400, message `radius_km : choisissez Ouagadougou, Bobo-Dioulasso ou Koudougou.` Order is session, viewer gate, view, cursor, filter keys, one rate slot, then the query. A 400 does not take a rate slot. `view=card` and a missing view stay 404 before any filter check. Zero matches are 200 `{ "view": "grid", "items": [], "next_cursor": null }`. The server does not bind `next_cursor` to the filters. The client resends the same keys.

City radius uses the code constant `CITY_CENTROID` (seven rows, no `autre`, not a table). `citiesWithin` is haversine with earth radius 6371.0088 km and always includes the chosen city. The query is `profile.city IN` that list. `autre`, null, and any other city are outside every radius. With the board coordinates, 10, 25, and 50 km return only the chosen city: Bobo–Banfora is about 79 km and Ouaga–Koudougou is about 93 km. `citiesWithin('bobo', 100)` includes `banfora`. That wider call is not an API radius.

`city=autre` is one radio, « Autre ville / Diaspora ». It matches stored `ouahigouya`, `banfora`, `dedougou`, `fada`, or `autre`, or any non-null `country` other than `BF`. A named city outside BF matches both that city and `autre`.

`life_plans` matches the first stored line only. `ready_now` is `tf:immediate`. `within_year` is `tf:6months` or `tf:1year`. `exploring` is `tf:serene`. A null, blank, or free-text head is excluded. The grid body still does not return `life_plans`.

Madhhab is a free basic filter. There is no premium gate. The select starts on « Indifférent », which sends no `madhhab` key. Stitch's Maliki preselection is not applied.

`/decouvrir` with no filter key still opens on the card chrome and does not call `/v1/filters` or `/v1/browse`. « Filtres » opens screen 14 over Découvrir. The page calls `GET /v1/filters` then, and « Appliquer les filtres » stays disabled until 200. A failure uses the existing error sentence and « Réessayer ». Nothing is pre-checked. Radius radios stay disabled until Ouagadougou, Bobo-Dioulasso, or Koudougou is chosen; then « Toute la ville » is checked until a km radio is picked. « Réinitialiser » clears the controls and does not navigate. « Appliquer les filtres » goes to `/decouvrir` or `/decouvrir?<keys>`. Backdrop click on the canvas and Escape close the modal and leave the URL unchanged. There is no close button in the Stitch file.

A sister who chooses « Marié(e) » also sends `polygamy_intent=yes`. That needs `gender` on `GET /v1/me/profile`. The same GET now returns `account_id` and `gender`. PUT and PATCH do not. The page stamps `data-viewer-gender` and `data-discover-account`.

When the URL has a filter key, Découvrir opens on the grid and loads `GET /v1/browse?view=grid&<same keys>`. The grid text cache key is `ankanu_browse_grid_text:<account>` plus `:` and the canonical filter string when filters are on. Photo URLs stay out of `sessionStorage`. Active chips use the screen 57 chip style on both frames: « Ville : <label> », « Rayon : <n> km » when a km value is set, a practice chip with the check icon, then the screen 14 labels for marital status, madhhab, and life plans. `polygamy_intent` has no chip. There is no age chip and no result count. With no filters, there are no chips.

The card frame with filters and a non-empty first page is screen 57 chrome only: toolbar, chips, « Découverte respectueuse », the toggle, and the under-card Wali sentence. No focused profile card. When that first page is `items: []`, the card slot shows « Aucun profil pour ces filtres. » A browse error uses the existing sentence and « Réessayer » on both frames. The HTML does not contain `view=card`.

## Where

- `code/apps/api/src/filters.controller.ts` — `GET /v1/filters`
- `code/apps/api/src/filters-catalogue.ts` — the response body
- `code/apps/api/src/browse-filters.ts` — parse and match
- `code/apps/api/src/city-centroid.ts` — the seven centroids
- `code/apps/api/src/browse.controller.ts` — passes the query through
- `code/apps/api/src/browse-grid.ts` — view and cursor before filters, then one rate slot
- `code/apps/api/src/profile-store.ts` — memory match and the Postgres WHERE
- `code/apps/api/src/profile.controller.ts` — GET adds `account_id` and `gender`
- `code/apps/api/src/app.module.ts`
- `code/apps/api/src/browse-grid.test.ts`
- `code/apps/web/src/discover-page.ts` — screen 14, chips, URL, cache key
- `code/apps/web/src/discover-page.test.ts`
- `code/apps/web/src/v2-serve.ts` — gender and search on `/decouvrir`
- `code/apps/web/app/decouvrir/route.ts` — unchanged route

## How to run

From `code/`:

```bash
pnpm exec vitest run --config vitest.unit.config.ts --testTimeout 180000 apps/api/src/browse-grid.test.ts apps/web/src/discover-page.test.ts
pnpm exec tsc -p apps/api/tsconfig.json --noEmit
pnpm exec tsc -p apps/web/tsconfig.json --noEmit
```

Sign in as a listable member and open `/decouvrir`. The card frame is showing and neither filters nor browse has been called. « Filtres » opens screen 14 with nothing selected and « Appliquer les filtres » disabled until the catalogue returns. Apply a city, then confirm `/decouvrir?city=<token>` opens the grid.

## API test cases

| Case | Input | Expected |
| --- | --- | --- |
| No session | `GET /v1/filters` | 401 `UNAUTHENTICATED`, `Cache-Control: no-store` |
| Not listable | Listable gate fails | 403 `FORBIDDEN`, `details.reason` `viewer_not_listable` |
| Catalogue | Listable member, including `?age=30&premium=1` | 200, seven keys, radius `null` = « Toute la ville », no counts, premium, online, or language. Same JSON for a sister and a brother |
| Other method | `POST /v1/filters` | 404 |
| Profile gender | `GET /v1/me/profile` | `account_id` and `gender`. PUT and PATCH bodies are unchanged |
| Unknown key | `GET /v1/browse?view=grid&age=1` | 400 `UNHANDLED`, message `age : filtre non disponible.`, `details.field` `age` |
| Repeated key | `city=ouagadougou&city=bobo` | 400, message `city : valeur non reconnue.` |
| Radius | `radius_km=10` with no city, or `city=autre&radius_km=25` | 400, `details.field` `radius_km`, message `radius_km : choisissez Ouagadougou, Bobo-Dioulasso ou Koudougou.` |
| Card first | `view=card&age=1` | 404 `NOT_FOUND`, not the filter 400 |
| Slot | `rl_browse_per_min` is 1. Bad filters, `view=card`, and `GET /v1/filters`, then `view=grid` | The grid read is still 200 |
| Married and yes | `marital_status=married&polygamy_intent=yes` | Only rows that stored both. A null marital status is absent |
| Radius 50 | `city=ouagadougou&radius_km=50` | The Ouagadougou row. The Koudougou row and `city=autre` are absent |
| Exact city | `city=ouagadougou` with no radius | That city only |
| Diaspora | `city=autre` | Stored `autre` / other listed cities, and a named city whose country is not `BF` |
| Life plans | `ready_now`, `within_year`, `exploring` | `tf:immediate`; `tf:6months` or `tf:1year`; `tf:serene`. Free text with no `tf:` head is absent. `life_plans` is not in the grid JSON |
| Empty | `city=koudougou&marital_status=single` when that pair is not stored | 200 `{ "view": "grid", "items": [], "next_cursor": null }` |
| Billing | The reads above | `BillingPort.isEntitled` is not called |
| Centroids | `citiesWithin('ouagadougou', 25)`, `citiesWithin('bobo', 100)`, `citiesWithin('ouagadougou', 50)` | `['ouagadougou']`; includes `banfora`; does not include `koudougou` or `autre` |

## Web test cases

| Case | Input | Expected |
| --- | --- | --- |
| Home | `/decouvrir` with no filter key | Card chrome. No `/v1/filters` and no `/v1/browse`. No sample chips |
| Open | « Filtres » | Screen 14. Apply stays disabled until 200. No radio is checked. Madhhab is « Indifférent ». Radius radios are disabled |
| Close | Escape, or a click on `#filters-canvas` | Modal hides. The URL is unchanged |
| Radius | Choose Ouagadougou | Radius enables. « Toute la ville » is checked. « Réinitialiser » clears that without leaving the page |
| Sister | Choose « Marié(e) » and apply | `/decouvrir?marital_status=married&polygamy_intent=yes`. No « Oui » chip |
| Grid | That URL | Grid is showing. Browse is called with those keys. Chip « Marié(e) » on both frames. Empty first page shows « Aucun profil pour ces filtres. » |
| Card | Toggle back to the card when that page was empty | The card slot shows the same sentence. No sample profile |
| Cache | That filter set | `sessionStorage` key ends with the canonical query. The value has `account` and no photo URL |
| Samples | Page source | No `checked=""`, no `onsubmit`, no `view=card`, no Maliki preselection |
| Widths | Filter modal and filtered grid at 360, 390, 768, 1024, 1280, 1440 | `document.documentElement.scrollWidth <= window.innerWidth` |

## Test data

API memory accounts. Password `phrase avec espaces`. Date of birth `1990-01-15`. Clock `2026-10-13` gives age 36. A brother who is `married` is stored with `polygamy_intent` `yes`. The null marital case is a sister. `city=autre` uses country `FR`. The Bobo row uses city `bobo` and country `FR`, so it matches both `city=bobo` and `city=autre`.

Browser fixture in `discover-page.test.ts`: a sister document, the catalogue above, and an empty grid for the married query.

## My results

- `browse-grid.test.ts`: 13 passed.
- `discover-page.test.ts`: 6 passed. Home still makes no browse call. The filter modal and the filtered empty grid passed all six widths. A sister apply landed on `/decouvrir?marital_status=married&polygamy_intent=yes`. The card empty sentence was « Aucun profil pour ces filtres. »
- `tsc -p apps/api/tsconfig.json --noEmit`: exit 0.
- `tsc -p apps/web/tsconfig.json --noEmit`: exit 0.
- Width shots: `code/docs/qa-handoffs/epic-3-3.9-widths/filters-360.png`, `filters-1440.png`, `filtered-360.png`, `filtered-1440.png`.

## Three validation passes

1. Behavior: catalogue, URL filters, sister polygamy rule, radius lock, empty sentence, and no `view=card` call. No billing call. No sample preselection.
2. Contract: the seven keys, 400 messages, 404 before the filter check, first-line life plans, diaspora, and the unchanged grid body. Web and API typecheck are clean.
3. Responsive: the filter modal and the filtered grid passed `scrollWidth <= innerWidth` at 360, 390, 768, 1024, 1280, and 1440 in `discover-page.test.ts`. The unfiltered card and grid from Story 3.8 still pass in that file.

## Solution-design sections followed

- `GET /v1/filters` and `GET /v1/browse` as named in the board catalogue. No new profile column, table, or migration.
- `CITY_CENTROID` is a code constant. It is not joined in SQL. `profile.city IN (...)` is the query.
- `life_plans` stays one text column. The match is the first line.
- Existing browse gate, keyset, page size, and AD-7 errors. `operator_config.rl_browse_per_min` is unchanged. Filters and a 400 do not take the slot.
- FR-030 stays off. Madhhab ships here as a basic filter.

## Stitch files matched

- `code/design-stitch/ankanu-v2/14-filters/screen.html` and `screen.png` — the filter card. Sample checks are removed. « Indifférent » is the madhhab blank option.
- `code/design-stitch/ankanu-v2/57-discover/screen.html` and `screen.png` — card chrome, chips, toggle.
- `code/design-stitch/ankanu-v2/57-discover/grid.html` and `grid.png` — grid chrome and the same chip style.

Sample profiles, sample chips, and the focused-card body stay out. Stitch state tabs and demo handlers do not ship.

## Known gaps

- The focused card body, pass, Invite, and quick message remain Story 3.13. `view=card` stays 404. With filters and a non-empty page, the card frame is chrome only.
- The bookmark remains Story 3.10. It still does not call favourites.
- 10, 25, and 50 km currently return only the chosen city because the board centroids are farther apart than 50 km. This is the honest result, not a missing city.
- The Postgres WHERE matches the memory predicate and was not executed against a database in this run. The automated browse tests use the memory store.
- The grid still requests the first page only. `next_cursor` is still covered by the Story 3.8 paging test.
