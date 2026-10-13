# Epic 3 Story 3.8 QA handoff

## What was built

`GET /v1/browse?view=grid` returns a page of opposite-gender listable profiles. `view=card` and a missing `view` return 404 until Story 3.13. No web page calls them.

`/decouvrir` opens on the card chrome from the founder-accepted Discover frame. The grid is behind the `grid_view` toggle and is not the home. The choice is not stored. A tile opens `/profil/:id`. Enter on the bookmark stays on Découvrir. Text is painted before any thumbnail request. The thumbnail `src` is set on a second animation frame.

Grid text is kept in `sessionStorage` under `ankanu_browse_grid_text:<account_id>` as `{ account, items }` with no photo URL. The account id is `account_id` from `GET /v1/me/profile`, written on the document as `data-discover-account`. A missing id, or a stored account that does not match, is not painted. Photo URLs stay in memory for 60 seconds, so an immediate card/grid toggle does not refetch. After that, memory is dropped and the next toggle fetches again. A second document for the same account paints the cached name before the fresh read. A late browse response is ignored. An error clears the tiles.

A 401 `PIN_REQUIRED` does not go to `/auth`; the pin guard opens `/pin`. A signed-out 401 still goes to `/auth`. Sample filter chips, including the outer chip shell, are not in the HTML. Réessayer stays hidden until an error. The empty sentence, the error, and Réessayer sit outside the profile grid. A signing failure, including an unreadable `signed_url_ttl_seconds`, is `Request failed`. A 429 stays `Cadence de requêtes régulée.`

The catalogue is board comment [63acb586](/ANK/issues/ANK-124#comment-63acb586-9c85-4b61-ba25-e9196517a472). `_bmad-output/` was not rewritten.

## Where

- `code/apps/api/src/browse.controller.ts` — `GET /v1/browse`, `Cache-Control: no-store`
- `code/apps/api/src/browse-grid.ts` — the grid read
- `code/apps/api/src/browse-grid.test.ts`
- `code/apps/api/src/profile-store.ts` — one page query, `browseGrid`
- `code/apps/api/src/media-store.ts` — `liveMainProfilePhotos` for the page
- `code/apps/api/src/public-profile.ts` — shared viewer gate (staff, mahram, listable)
- `code/apps/api/src/app.module.ts`
- `code/apps/web/src/discover-page.ts` — card chrome plus grid
- `code/apps/web/src/discover-page.test.ts`
- `code/apps/web/app/decouvrir/route.ts`
- `code/apps/web/src/v2-serve.ts` — `discoverResponse`

## How to run

From `code/`:

```bash
pnpm exec vitest run --config vitest.unit.config.ts --testTimeout 180000 apps/api/src/browse-grid.test.ts apps/api/src/public-profile.test.ts apps/web/src/discover-page.test.ts apps/web/src/member-route.test.ts
pnpm exec tsc -p apps/api/tsconfig.json --noEmit
pnpm exec tsc -p apps/web/tsconfig.json --noEmit
```

Sign in as a listable member and open `/decouvrir`. The card toggle is selected. The grid toggle calls `GET /v1/browse?view=grid`. Staff and mahram cookies still get the JSON envelope, not this HTML. A signed-out visit redirects to `/auth`.

## API test cases

| Case | Input | Expected |
| --- | --- | --- |
| No session | `GET /v1/browse?view=grid` with no cookie | 401 `UNAUTHENTICATED`, `retryable` false, `Cache-Control: no-store` |
| Staff | Viewer roles are `moderator` | 403 `FORBIDDEN`, `details.reason` `staff_session` |
| Mahram | Viewer role is `mahram` | 403 `FORBIDDEN`, `details.reason` `mahram_session` |
| Viewer not listable | Viewer profile is not public. `rl_browse_per_min` is 1 | Both reads are 403 `viewer_not_listable`, not 429 |
| Missing view or `view=card` | Listable viewer | 404 `NOT_FOUND`, message `Ce profil n'est pas disponible.`, `details` null. No rate slot |
| Bad view | `view=list` | 400 `UNHANDLED`, `details.field` `view`, `retryable` false |
| Bad cursor | `cursor=not-a-uuid` | 400 `UNHANDLED`, `details.field` `cursor` |
| Empty | Listable viewer, no opposite-gender public profile | 200 `{ "view": "grid", "items": [], "next_cursor": null }` |
| Hidden targets | Same gender, self, unpublished, held, `emergency_hidden`, deactivated, pending deletion, moderator, mahram-only | Absent from `items`. Not an error |
| Labels | Stored tokens `ouagadougou`, `single`, `no`, `maliki`, `assidue` | French labels from screens 11 and 15. Null stays null. Age is completed years. `dob` is not returned |
| Identity | Latest `id_document` and `liveness` both `granted` | `verified` true. Phone grant alone stays false |
| No main photo | No live main profile photo | `photo` null |
| Blur | Live main photo, `photo_blur` true | `photo.url` is a signed blur derivative. Pending photo id is absent |
| Clear | `photo_blur` false and an `sm` derivative exists | Signed `sm` url. Not `md`, `xs`, or `original` |
| Missing clear file | `photo_blur` false and no `sm` derivative | 503 `UNHANDLED`, message `Request failed`, `retryable` true. Body is not a partial page. Code is not `REVEAL_DENIED` |
| Unreadable TTL | Live main photo and `signed_url_ttl_seconds` is not a positive integer | 503 `UNHANDLED`, message `Request failed`. The body does not contain `signed_url_ttl_seconds` or `illisible` |
| Slot | `rl_browse_per_min` is 1. Bad `view`, `view=card`, and a bad `cursor`, then `view=grid` | 400, 404, and 400. The grid read is still 200 |
| Page | 25 opposite-gender public profiles | Pages of 12, 12, and 1. `next_cursor` is the 12th id when a 13th row exists, else null. No duplicate, no gap. Order is `account_id` descending |
| Unknown cursor | Well-formed UUID below every id | 200 empty page |
| Rate limit | Second grid read when `rl_browse_per_min` is 1 | 429 `RATE_LIMITED`, message `Cadence de requêtes régulée.`, `details` null, `retryable` true |
| Billing | Any of the reads above | `BillingPort.isEntitled` is not called |
| Fields | Item keys | `id`, `pseudonym`, `age`, `city`, `marital_status`, `polygamy_intent`, `madhhab`, `practice`, `verified`, `photo_blur`, `photo`. No email, civil name, `dob`, bio, `life_plans`, profession, origin, education, count, or online |

## Web test cases

| Case | Input | Expected |
| --- | --- | --- |
| Home | Open `/decouvrir` | Card chrome. `crop_portrait` selected. No grid tiles. No call to `/v1/browse` |
| Sample | Page source | No `Al-Hassan`, no `Ville : Ouagadougou`, no age-range chip, no Pass / Invite / quick message. No `span` whose class contains `inline-flex` |
| Grid | Click `Grille panoramique` | `GET /v1/browse?view=grid`. Tiles use the API strings. Null chips are absent. `#discover-retry` computed display is `none` |
| Blur photo | `photo_blur` true and a url | « Photographie réservée ». The image `src` is set on the second animation frame |
| Clear photo | `photo_blur` false and a url | « VÉRIFIÉ » when `verified` is true. Both photo wells stay hidden. The image `src` is the clear url |
| No photo | `photo` null | « Photographie non publiée ». No image |
| Empty | `items: []` | « Aucun profil pour ces filtres. » No invented tile |
| Tile | Click the tile, not the bookmark | `/profil/:id` |
| Bookmark | Click or press Enter on « Enregistrer en toute discrétion » | Stays on Découvrir. No favourites request. Story 3.10 |
| Filtres | The button is visible | No filters request. Story 3.9 |
| Toggle back | Card, then grid again within 60 seconds | No second browse request. Text comes from memory |
| Expired memory | The same toggle after 60 seconds | One new browse request |
| Return | A second document for the same account opens the grid before the fresh read returns | The cached pseudonym is painted. Stored JSON has `account` and no `url` |
| Other account | A document whose `data-discover-account` does not match the stored account | The previous pseudonym is not painted |
| Stale read | Réessayer while a browse request is still in flight, then the older response is 429 and the newer one is 200 | The newer tile stays. The 429 message does not replace it |
| Not listable | Grid read 403 `viewer_not_listable` | `/profile-edit` |
| PIN lock | 401 `PIN_REQUIRED` | `/pin`, not `/auth` |
| Signed out on the read | 401 without `PIN_REQUIRED` | `/auth` |
| Other error | 429 or 503 | The API message and « Réessayer ». Tiles are cleared. `#discover-retry` is shown |
| Live cookie | A non-stub `ankanu_session` whose gate step is `account` | HTML, with `data-discover-account` from `GET /v1/me/profile` `account_id` |
| Stub cookie | `ankanu_session=web` or `capacitor` | JSON 401, not this HTML |
| Staff / mahram cookie | `ankanu_session=staff` or `mahram` | JSON 403, not this HTML |
| Widths | Card and grid at 360, 390, 768, 1024, 1280, 1440 | `document.documentElement.scrollWidth <= window.innerWidth` |

## Test data

API memory accounts. Password `phrase avec espaces`. Date of birth `1990-01-15`. Clock `2026-10-13` gives age 36. Publish by saving the profile, then set `visibility` to `public` while `account.status` is `Active`.

Browser fixture in `discover-page.test.ts`: one blurred tile with a long pseudonym and one tile with no photo, then a second page that covers a clear verified photo, the account-scoped cache, an empty page, pin, signed-out, not-listable, 429, 503, a stale 429, and the 60-second refetch.

## My results

- `browse-grid.test.ts`: 10 passed, including a bad view and a bad cursor that do not spend the one browse slot, and an unreadable signed-url TTL that returns `Request failed`.
- `discover-page.test.ts`: 4 passed. That includes the six widths, no empty chip shell, `#discover-retry` display `none` before an error, the account-scoped cache with no `url`, a clear photo with `VÉRIFIÉ`, Enter on the bookmark, pin versus `/auth`, `viewer_not_listable`, 429 and 503 with Réessayer, a stale 429 dropped after a newer success, and a refetch after 60 seconds.
- `member-route.test.ts`: 6 passed.
- `tsc -p apps/api/tsconfig.json --noEmit`: exit 0.
- `tsc -p apps/web/tsconfig.json --noEmit`: exit 0.
- Width shots: `code/docs/qa-handoffs/epic-3-3.8-widths/card-360.png`, `card-1440.png`, `grid-360.png`, `grid-1440.png`.
- First page JSON of 12 text tiles was under 150KB. That page had no photo URLs. Thumbnail bytes are not in that JSON.

## Three validation passes

1. Behavior: the grid read matches the board catalogue. Découvrir opens on the card. The grid is the toggle. Empty is the approved sentence. No billing call. No `view=card` request.
2. Contract: item fields, French labels, blur vs `sm`, keyset of 12, and the error codes above. Web typecheck is clean. Sample Stitch names are not in the served HTML.
3. Responsive: card and grid passed `scrollWidth <= innerWidth` at 360, 390, 768, 1024, 1280, and 1440 in `discover-page.test.ts`. The same screen is also in `v2-responsive.test.ts` as `17-discover` (card shell on load).

## Solution-design sections followed

- `GET /v1/browse?view=grid` as a page. `view=card` is not this story.
- `profile` columns already stored. No kids column, no likes table, no counts.
- `photo_asset` / `derivative`: list thumbs are blur, or `sm` when `photo_blur` is false. `original` is never returned.
- `operator_config.rl_browse_per_min` via the existing browse slot.
- AD-7 error envelope. AD-9 signing. AD-16 first-page budget is only partly measured (JSON, not thumbnail bytes). AD-28: the grid is not the default.

## Stitch files matched

- `code/design-stitch/ankanu-v2/57-discover/screen.html` and `screen.png` — card chrome, toggle, member nav. Stitch id `46688f1db34d426cbff3376743fe8a7e`.
- `code/design-stitch/ankanu-v2/57-discover/grid.html` and `grid.png` — grid headline, toolbar, tile, proverb, nav. Stitch id `a4d448713bcb4ca2829cc8b7f1235d6f`.

Sample profiles, sample filter chips, and the focused-card body were removed. Screen 13 was not used.

## Known gaps

- The focused card body, pass, Invite, and quick message are Story 3.13. The default screen is the card chrome with that body omitted, because `view=card` is 404 and the Stitch card is a sample person.
- Story 3.9 owns Filtres. The button is on both frames and does not call `/v1/filters`.
- Story 3.10 owns the bookmark. The control does not call `/v1/favourites`.
- Story 3.12 owns the settings Lite toggle. Images are always deferred. Slow 3G within 8 seconds was not lab-measured.
- The approved grid frame has no next-page control. The UI requests the first page only. `next_cursor` is covered by the API tests (12, 12, 1).
- Thumbnail bytes plus JSON were not measured against the 150KB cap. The automated cap is the JSON of 12 text tiles.
