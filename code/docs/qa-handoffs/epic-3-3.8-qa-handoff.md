# Epic 3 Story 3.8 QA handoff

## What was built

`GET /v1/browse?view=grid` returns a page of opposite-gender listable profiles. `view=card` and a missing `view` return 404 until Story 3.13. No web page calls them.

`/decouvrir` opens on the card chrome from the founder-accepted Discover frame. The grid is behind the `grid_view` toggle and is not the home. The choice is not stored. A tile opens `/profil/:id`. Text is painted before any thumbnail request. Grid text for the session is kept in `sessionStorage` under `ankanu_browse_grid_text` (no photo URL). Photo URLs stay in memory for that document, so toggling card/grid does not refetch. Coming back from a profile paints the cached text first, then one fresh read re-signs URLs.

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
| Page | 25 opposite-gender public profiles | Pages of 12, 12, and 1. `next_cursor` is the 12th id when a 13th row exists, else null. No duplicate, no gap. Order is `account_id` descending |
| Unknown cursor | Well-formed UUID below every id | 200 empty page |
| Rate limit | Second grid read when `rl_browse_per_min` is 1 | 429 `RATE_LIMITED`, message `Cadence de requêtes régulée.`, `details` null, `retryable` true |
| Billing | Any of the reads above | `BillingPort.isEntitled` is not called |
| Fields | Item keys | `id`, `pseudonym`, `age`, `city`, `marital_status`, `polygamy_intent`, `madhhab`, `practice`, `verified`, `photo_blur`, `photo`. No email, civil name, `dob`, bio, `life_plans`, profession, origin, education, count, or online |

## Web test cases

| Case | Input | Expected |
| --- | --- | --- |
| Home | Open `/decouvrir` | Card chrome. `crop_portrait` selected. No grid tiles. No call to `/v1/browse` |
| Sample | Page source | No `Al-Hassan`, no `Ville : Ouagadougou`, no age-range chip, no Pass / Invite / quick message |
| Grid | Click `Grille panoramique` | `GET /v1/browse?view=grid`. Tiles use the API strings. Null chips are absent |
| Blur photo | `photo_blur` true and a url | « Photographie réservée ». The image `src` is set on the next frame, not in the first paint |
| No photo | `photo` null | « Photographie non publiée ». No image |
| Empty | `items: []` | « Aucun profil pour ces filtres. » No invented tile |
| Tile | Click the tile, not the bookmark | `/profil/:id` |
| Bookmark | Click « Enregistrer en toute discrétion » | Stays on Découvrir. No favourites request. Story 3.10 |
| Filtres | The button is visible | No filters request. Story 3.9 |
| Toggle back | Card, then grid again in the same document | No second browse request. Text comes from memory |
| Return | Leave to a profile and open `/decouvrir` again | Card is the home again. The grid toggle paints cached text before the fresh read. Cached JSON has no `url` |
| Not listable | Grid read 403 `viewer_not_listable` | `/profile-edit` |
| Signed out on the read | 401 | `/auth` |
| Other error | 429 or 503 | The API message and « Réessayer ». No sample tile |
| Staff / mahram cookie | `ankanu_session=staff` or `mahram` | JSON 403, not this HTML |
| Widths | Card and grid at 360, 390, 768, 1024, 1280, 1440 | `document.documentElement.scrollWidth <= window.innerWidth` |

## Test data

API memory accounts. Password `phrase avec espaces`. Date of birth `1990-01-15`. Clock `2026-10-13` gives age 36. Publish by saving the profile, then set `visibility` to `public` while `account.status` is `Active`.

Browser fixture in `discover-page.test.ts`: one blurred tile with a long pseudonym and one tile with no photo.

## My results

- `browse-grid.test.ts`: 8 passed.
- `public-profile.test.ts`: 5 passed.
- `discover-page.test.ts`: 3 passed, including the browser toggle, the session cache without a photo URL, one browse request across two toggles, tile navigation, and the six widths for card and grid.
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
