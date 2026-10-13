# Epic 3 Story 3.8 QA handoff

## What was built

The API branch of the optional Lite grid only. `GET /v1/browse?view=grid` returns a page of opposite-gender listable profiles. `view=card` and a missing `view` return 404 until Story 3.13. There is no web grid and no Découvrir screen. Those wait for the founder-approved AnKanu v2 Discover and grid-state HTML/PNG.

The catalogue is board comment [63acb586](/ANK/issues/ANK-124#comment-63acb586-9c85-4b61-ba25-e9196517a472). `_bmad-output/` was not rewritten.

## Where

- `code/apps/api/src/browse.controller.ts` — `GET /v1/browse`, `Cache-Control: no-store`
- `code/apps/api/src/browse-grid.ts` — the grid read
- `code/apps/api/src/browse-grid.test.ts`
- `code/apps/api/src/profile-store.ts` — one page query, `browseGrid`
- `code/apps/api/src/media-store.ts` — `liveMainProfilePhotos` for the page
- `code/apps/api/src/public-profile.ts` — shared viewer gate (staff, mahram, listable)
- `code/apps/api/src/app.module.ts`

## How to run

From `code/`:

```bash
pnpm exec vitest run --config vitest.unit.config.ts --testTimeout 180000 apps/api/src/browse-grid.test.ts apps/api/src/public-profile.test.ts
pnpm exec tsc -p apps/api/tsconfig.json --noEmit
```

No browser path yet. Do not open Découvrir expecting a grid.

## Test cases

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

## Test data

Memory accounts. Password `phrase avec espaces`. Date of birth `1990-01-15`. Clock `2026-10-13` gives age 36. Publish by saving the profile, then set `visibility` to `public` while `account.status` is `Active`.

## My results

- `browse-grid.test.ts`: 8 passed.
- `public-profile.test.ts`: 5 passed (viewer gate refactor).
- `tsc -p apps/api/tsconfig.json --noEmit`: exit 0.
- First page JSON of 12 text tiles was under 150KB. That page had no photo URLs. Thumbnail bytes are not in the JSON. QA still measures JSON plus real `sm` and `blur` derivative bytes when the UI exists.

## Three validation passes

1. Behavior: the grid read matches the board catalogue on [ANK-124](/ANK/issues/ANK-124). Empty is an empty page. No billing call. No `view=card` payload.
2. Contract: item fields, French labels, blur vs `sm`, keyset of 12, and the error codes above. API typecheck is clean.
3. Responsive: not run. There is no Discover or grid screen in this change. Widths 360, 390, 768, 1024, 1280, and 1440 wait for the founder-approved Stitch files.

## Solution-design sections followed

- `GET /v1/browse?view=grid` as a page. `view=card` is not this story.
- `profile` columns already stored. No kids column, no likes table, no counts.
- `photo_asset` / `derivative`: list thumbs are blur, or `sm` when `photo_blur` is false. `original` is never returned.
- `operator_config.rl_browse_per_min` via the existing browse slot.
- AD-7 error envelope. AD-9 signing. AD-16 first-page budget is only partly measured (JSON, not thumbnail bytes). AD-28: the grid is not the default.

## Stitch files matched

None. Discover is still a v2 coverage gap. Screen 13 is the focused-card search state, not a grid. No grid markup was added.

## Known gaps

- No web toggle, no Découvrir route, no grid layout. Card [71bcc3a7](/ANK/issues/ANK-126#comment-71bcc3a7-0a39-4309-b95d-89720dddb582) is still pending.
- Story 3.13 owns the focused card, pass, Invite, and quick message.
- Story 3.9 owns filters. This route ignores filter query keys.
- Story 3.10 owns the tile bookmark.
- Story 3.12 owns the settings Lite toggle. Text-before-image and the Slow 3G check are web behavior and are not in this API change.
- The web session cache of grid text is not built.
- Do not pass [ANK-125](/ANK/issues/ANK-125) on this handoff alone. The approved Discover and grid-state files are not on disk.
