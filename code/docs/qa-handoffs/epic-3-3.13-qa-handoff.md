# Epic 3 Story 3.13 QA handoff

## What was built

Découvrir opens on one visibility-approved opposite-gender profile. `GET /v1/browse` with `view` omitted, and `view=card`, return `{ view: 'card', item }`. `item` is the existing grid profile plus `sharedTraits: { field, label }[]`, or `null` when nobody matches. There is no `next_cursor` on a card. A cursor on a card is `400` before a browse slot. `view=grid` is unchanged and does not include `sharedTraits`.

Shared chips use columns that already exist: city, polygamy intent, marital status, madhhab, practice, life plans, education, profession, origin, country. A chip is emitted only when both profiles store the same known value. Polygamy is shown only when both are `yes`. The life-plan chip is the timeframe label, not the free-text line. `autre` is not treated as the same city. `OTHER` is not treated as the same country. Bio is not read. There is no kids column.

`POST /v1/browse/pass` with `{ target_id }` writes `discovery_exclusion` (`viewer_id`, `target_id`, `created_at`). The first insert is `201`. The same pair returns `200` and the original `created_at`. The id is stored lowercase. That profile leaves this viewer's card and grid. It is not a like, not a favourite, and not a public counter. No Invite and no message is sent. Browse and pass do not call billing.

The card/grid toggle stays on Découvrir. Zero or one basic filter opens the card. Two or more basic filters open the grid, and the card toggle returns to one focused card. That many-filter card uses the Search chrome. There is no new `/recherche` route.

« Passer avec égards » posts the pass. On success the in-flight browse is dropped and the view that is actually open is loaded again: the grid calls `loadGrid()`, the card calls `loadCard()`. The passed profile leaves both. The bookmark still posts `POST /v1/favourites`. Each new card restores the Stitch bookmark markup and clears `aria-pressed`, so the previous profile's saved state does not carry over. Enter on that bookmark calls `preventDefault` and posts once. The name, the photo, and the trait block open `/profil/:id`. Enter on the card body does the same. « Message d'introduction » and « Envoyer une invitation Ta'aruf » stay visible and do not post.

Trait chips keep the Stitch shell. Découvrir icons are `location_on` (city), `menu_book` (madhhab), `schedule` (practice), and `handshake` (polygamy intent). The Search card uses the same three field icons and does not add `handshake`. A stored field the comp does not icon, such as marital status, stays a label inside the shell. Sample copy (« Projet monogame exclusif », the intention quote, the sample filter chips) is not painted.

Lite still defers a clear photo until the well is in view. A reserved photo keeps the blur thumb and the reserved sentence. Text paints before the image. There is no "en ligne" and no invented count. Sample names, the sample quote, and "1 profil correspondant" are not rendered. The empty sentence is « Aucun profil pour ces filtres. »

## Where

- `code/apps/api/drizzle/0018_discovery_exclusion.sql`
- `code/apps/api/drizzle/meta/0018_snapshot.json`
- `code/apps/api/drizzle/meta/_journal.json`
- `code/apps/api/src/account-schema.ts`
- `code/apps/api/src/discovery-exclusion.ts`
- `code/apps/api/src/browse-traits.ts`
- `code/apps/api/src/browse-grid.ts`
- `code/apps/api/src/browse.controller.ts`
- `code/apps/api/src/profile-store.ts`
- `code/apps/api/src/browse-grid.test.ts`
- `code/apps/api/src/operator-config.migrate.test.ts`
- `code/apps/web/src/discover-page.ts`
- `code/apps/web/src/discover-page.test.ts`

## How to run

From `code/`:

```bash
./node_modules/.bin/vitest run --config vitest.unit.config.ts apps/api/src/browse-grid.test.ts apps/web/src/discover-page.test.ts
./node_modules/.bin/tsc -p apps/api/tsconfig.json --noEmit
./node_modules/.bin/tsc -p apps/web/tsconfig.json --noEmit
```

Open `/decouvrir` with a member session. Pass, bookmark, and the grid toggle. A URL with two filters, for example `/decouvrir?marital_status=married&polygamy_intent=yes`, opens the grid. The card toggle returns to one card.

## Test cases

| Case | Input | Expected |
| --- | --- | --- |
| Omitted view | `GET /v1/browse` | `200`, `{ view: 'card', item }` for one opposite-gender public profile. `sharedTraits` from stored fields only. No `kids`, `has_children`, or bio |
| Explicit card | `GET /v1/browse?view=card` | Same profile as the omitted view |
| Grid | `GET /v1/browse?view=grid` | Page of profiles. No `sharedTraits` |
| Bad view | `view=list` | `400`, field `view`, no browse slot |
| Card cursor | `cursor` present on a card | `400`, field `cursor`, no browse slot |
| Empty | No opposite public profile | `{ view: 'card', item: null }`. The page says « Aucun profil pour ces filtres. » |
| Pass | `POST /v1/browse/pass` `{ target_id }` | `201` then `200` with the same `created_at`. That profile leaves this viewer's card and grid. A grid opened while the POST is in flight is repainted from the exclusion, not from the warm list |
| Other viewer | A second sister browses after the first passes | She still receives that profile |
| Self / same gender | Own id, or an unpublished same-gender id | `400` for self. `404` when the target is not a listable opposite profile |
| Billing | Card, grid, and pass | No billing call |
| Discover HTML | `/decouvrir` | Card visible, grid hidden. Pass, flash, and invite buttons present. No Al-Hassan, no sample quote, no `view=card` in the document. Grid fetch stays `view=grid` |
| Many filters | `marital_status` and `polygamy_intent` | Grid visible, card hidden, Search chrome, no "1 profil correspondant" |
| Toggle | Card then grid then card | One fetch each, then the text cache. Bookmark posts `/v1/favourites`. Pass posts `/v1/browse/pass` and stays on the page. A tile opens `/profil/:id` |
| Trait chips | Shared city, madhhab, practice, polygamy, marital status | Découvrir draws `location_on`, `menu_book`, `schedule`, and `handshake`, then the marital label with no icon. Search draws the first three icons and no `handshake`. No « Projet monogame exclusif » |
| Bookmark | Enter on the card bookmark, then pass to the next profile | One `POST /v1/favourites`. The next card has no `aria-pressed` and the Stitch bookmark glyph |
| Lite | Key `ankanu_lite` = `1` | Clear photos wait for the viewport. A blur photo still uses the Story 3.8 insert |
| Widths | Card and grid at 360, 390, 768, 1024, 1280, 1440 | `document.documentElement.scrollWidth <= window.innerWidth` |

## Test data

Sister and brothers from `browse-grid.test.ts`. Password `phrase avec espaces`. Default published city Ouagadougou, marital `single`, madhhab `maliki`, practice `assidue`, life plans `tf:6months` plus a note, profession `ingenierie`, country `BF`, polygamy `no`. The pass case sets the sister and the newer brother to polygamy `yes`, the older brother to Bobo and polygamy `no`, and the newer brother to Koudougou. Expected chips on the default card: Même ville (Ouagadougou), Célibataire, Madhhab : Maliki, Pratique assidue, D'ici 6 mois, Ingénieur / Technique, Burkina Faso. The note "Union stable" is not a chip.

The browser card is Amina_Bobo_nom_tres_long_pour_la_ligne, 29, Ouagadougou, verified, `photo_blur` true, URL `/media/blur-signed`, traits Même ville (Ouagadougou) and Madhhab : Maliki. The grid adds Moussa, 36, no photo. The Lite grid is the Story 3.12 set: Amina `/media/bad`, Bintou `/media/ok`, Moussa blur.

## My results

- `discover-page.test.ts`: 8 passed (3 page tests, 5 browser tests). Re-checked after the QA fail on chips, pass-vs-grid, and the card bookmark.
- `browse-grid.test.ts`: not re-run. The API and the exclusion table did not change.
- Card and grid passed `scrollWidth <= innerWidth` at 360, 390, 768, 1024, 1280, and 1440.
- Shots: `code/docs/qa-handoffs/epic-3-3.13-widths/card-360.png` through `card-1440.png`, and `grid-360.png` through `grid-1440.png`. The card shots show the city and madhhab icons. The blur URL in that test server is not a file, so the reserved well shows a broken-image mark in the corner. A real signed blur URL covers the well.

## Three validation passes

1. Behavior: omitted view is one card. Traits come from stored fields, with the Stitch icon only when that comp icons the field. Pass writes a viewer-scoped exclusion, drops the in-flight browse, and reloads the open view. Enter on the card bookmark posts once, and the next card does not keep the previous saved state. The grid toggle remains. Two filters open the grid. Invite and Flash do not post. Lite defers a clear photo and keeps a blur thumb.
2. Responsive: card and grid passed `scrollWidth <= innerWidth` at 360, 390, 768, 1024, 1280, and 1440. Shots for every width are in `code/docs/qa-handoffs/epic-3-3.13-widths/`.
3. Stitch: unfiltered Découvrir matches `57-discover/screen.html`, including the chip shell and `location_on`, `menu_book`, `schedule`, and `handshake`. The grid matches `57-discover/grid.html`. A many-filter card matches `13-search/screen.html`, including that screen's chip shell and the bookmark `data-icon`. Sample names, the sample quote, the invented count, and the state switchers are not a member-facing control.

## Solution-design sections followed

- `profile` columns already stored. No kids column. No `sharedTraits` table. The chip list is computed.
- `discovery_exclusion`: `viewer_id`, `target_id`, `created_at`. Primary key is the pair. It is not `favourite`.
- `GET /v1/browse` returns one profile for card and a page for grid. `POST /v1/browse/pass` is the dismiss.
- AD-28: default card, pass is an exclusion, no likes, no invented counts, no online-now.
- AD-16: blur or `sm`, clear photos deferred when Lite is on. No `xs` flag on browse.

## Stitch files matched

- `code/design-stitch/ankanu-v2/57-discover/screen.html` and `screen.png` — the focused card, the toggle, the bookmark, the trait heading, and the three actions.
- `code/design-stitch/ankanu-v2/57-discover/grid.html` and `grid.png` — the optional grid.
- `code/design-stitch/ankanu-v2/13-search/screen.html` and `screen.png` — the card chrome when two or more filters are set. It is not the default Découvrir page.

## Known gaps

- Epic 4 Story 4.1 owns « Envoyer une invitation Ta'aruf ». The button is visible and does not post.
- Epic 4 Story 4.3 owns « Message d'introduction » (Message Flash). The button is visible and does not post.
- Epic 5 Story 5.11 owns `daily_message_cap`. This story does not consume it.
- There is no stored kids field, so that chip is omitted.
- The sample intention quote is omitted. Bio is not on the browse payload.
- "1 profil correspondant" is omitted.
- A long pass history still uses `NOT IN` for the exclusion ids. That is recorded for a later query, not a wrong result.
- This commit is local. It is not pushed. Push waits until QA passes. No next story. No deploy. Parent [ANK-97](/ANK/issues/ANK-97) stays open.
