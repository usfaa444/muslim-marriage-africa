# Epic 3 Story 3.4 QA handoff

## What was built

A Member can upload a new profile photo and save a new bio while an already-allowed photo and bio stay up. A rejection of the new item does not clear the live one. When staff allow the new photo, the previous live photo becomes `replaced`. That is the board record on ANK-107 (comment `630c11a0-d1cb-461e-b015-b356839fc945`). It is not a strike.

`photo_asset.moderation_state` stays text plus a CHECK, still nullable. The allowed values are `pending`, `live`, `blocked`, and `replaced`. Null stays for `chat_photo` and `voice_note`. `replaced` is only for kind `profile_photo`: a row that was `live` and has been superseded by a newer allowed `profile_photo` of the same owner.

Migration `0013_photo_replaced` widens `photo_asset_moderation_state_check` to those four values. Before the index, it sets every `live` `profile_photo` except the newest per owner (highest id) to `replaced`. No row is deleted. Then it creates partial unique index `photo_asset_one_live_profile_photo` on `photo_asset(owner_id)` where `kind = 'profile_photo'` and `moderation_state = 'live'`. Two `live` profile photos for one owner are impossible in the database.

Allow of a pending `profile_photo` on `POST /v1/staff/cases` (`kind` `profile_review`) runs in the existing decision transaction, in this order, for each allowed photo in body order:

1. Every `live` `profile_photo` of that `owner_id` becomes `replaced`.
2. Every unrevoked `signed_grant` for those replaced rows gets `revoked_at` set to the decision time.
3. The allowed row goes `pending` to `live`.

If the owner had no live photo, step 1 changes nothing and only step 3 runs. If any step fails, the whole decision rolls back and the old photo stays `live`. The decision JSON still reports `live` for the allowed item. Several allows in one body each run that order, so the last allow in the body is the one `live` row.

Block is unchanged. The pending row becomes `blocked`. The existing `live` row stays `live`.

`replaced` writes no strike, counts nothing, and shows no strike copy. There is no strike table. Story 3.6 counts only `blocked` rows. `operator_config` keys `photo_strike_count` and `photo_strike_block_hours` are not read or written here.

Nothing serves a `replaced` row. The owner's `GET` and `PUT /v1/me/profile` use the one `live` row as `photo`. When a live photo exists and a newer photo is still `pending`, the response also includes `pending_photo`. When there is no live photo, `photo` stays the latest non-replaced row (pending or blocked) and `pending_photo` is omitted, which is the Story 3.2 and 3.3 shape. `MediaPort.sign` and `GET /v1/media/get` refuse a `replaced` profile photo for every Member, owner included, with `403` and message `Photo non publique.` A `replaced` row cannot go back to `live` through `setModerationState`, which still updates only a `pending` row. Using that picture again means a new upload and a new review.

This story deletes nothing. The replaced row, its original object, and its derivatives stay. Account erase is unchanged. `reveal_grant` is untouched.

Bio allow and bio block stay the Story 3.3 path. A replacement allow does not send `profile`, so `review_passed_at` is not cleared. Visibility stays `public` unless it is `held` or `emergency_hidden`. A new upload is `pending` and does not change the existing live row. Discovery still returns a photo only when that photo is `live`.

`/profile-review` stays on screen 12 when `photo` is pending or when `pending_photo` is pending. A live photo alone redirects to `/profile-edit`. The pending caption on screen 11 is still written only when `photo` itself is pending, so a live photo during a replacement does not pick up the pending note.

## Where

- `code/apps/api/drizzle/0013_photo_replaced.sql`
- `code/apps/api/drizzle/meta/0013_snapshot.json`
- `code/apps/api/drizzle/meta/_journal.json`
- `code/apps/api/src/account-schema.ts`
- `code/apps/api/src/media-store.ts`
- `code/apps/api/src/media.ts`
- `code/apps/api/src/media.controller.ts`
- `code/apps/api/src/profile.controller.ts`
- `code/apps/api/src/profile-review.ts`
- `code/apps/api/src/profile-review.test.ts`
- `code/apps/api/src/operator-config.migrate.test.ts`
- `code/apps/web/src/v2-pages.ts`
- `code/apps/web/src/v2-client.ts`
- `code/apps/web/src/v2-flow.test.ts`

## How to run

From `code/`:

```bash
npx vitest run --config vitest.unit.config.ts --fileParallelism false apps/api/src/profile-review.test.ts apps/api/src/profile.test.ts apps/api/src/media.test.ts apps/web/src/v2-flow.test.ts apps/web/src/v2-responsive.test.ts apps/web/src/native-dialog.test.ts
npx vitest run --config vitest.integration.config.ts apps/api/src/operator-config.migrate.test.ts
npx tsc -p apps/api/tsconfig.json --noEmit
npx tsc -p apps/web/tsconfig.json --noEmit
```

The integration file needs Docker and Postgres 17. The unit config excludes it.

Sign in as a member who already has an allowed profile photo. Upload another profile photo. `GET /v1/me/profile` should show the old photo as `photo` with `moderation_state` `live` and the new one as `pending_photo`. Open `/profile-review`. A moderator allow of that pending photo should leave exactly one `live` row, mark the previous row `replaced`, and make the old blur URL return `403`. A block of a later upload should leave the live photo in place.

## Test cases

| Case | Input | Expected |
| --- | --- | --- |
| Replacement upload | Approved profile, one `live` photo, `POST /v1/media` | New row is `pending`. Previous row stays `live`. `GET /v1/me/profile` `photo` is the live row. `pending_photo` is the new row. `bio_live` is unchanged |
| Allow replacement | Staff `photos[].decision` `allow` on the pending photo, no `profile` field | `200`. Response photo state is `live`. Previous row is `replaced`. Exactly one `live` profile photo for that owner. `review_passed_at` unchanged. Visibility stays `public` |
| Grants | Allow that replacement | Every `signed_grant` for the replaced asset has `revoked_at` set. `GET /v1/media/get` of the old token is `403`. `signMedia` of the replaced asset for the owner fails. `signMedia` of the new live asset succeeds |
| Second live | Insert or update a second `live` `profile_photo` for the same owner | Postgres `23505` from `photo_asset_one_live_profile_photo`. Memory `setModerationState` to `live` returns false when another live profile photo exists, and the decision rolls back |
| Migration data fix | Two `live` profile photos, index dropped, then the `0013` update | Older id becomes `replaced`. Newer id stays `live`. Recreating the index rejects a third `live` insert. No row is deleted |
| Block replacement | Staff `block` with a reason on a newer pending photo | Pending row becomes `blocked`. Previous `live` row stays `live`. The already `replaced` row stays `replaced`. `pending_photo` is absent. `photo` is the live row |
| Bio block | `bio_pending` set, staff `bio` `block`, `photos` `[]`, with a reason | `bio_live` stays the previous allowed text. `bio_pending` is null. `review_passed_at` unchanged |
| First allow | No live photo yet | Only the pending row becomes `live`. No `replaced` row |
| Not a strike | Allow that replaces a live photo | No strike row. `photo_strike_count` and `photo_strike_block_hours` are not written. States used are only `pending`, `live`, `blocked`, and `replaced` |
| Screen 12 | `photo` live and `pending_photo` pending | `pendingProfilePhoto` is true, so `/profile-review` stays. A live photo alone is false and the script goes to `/profile-edit` |
| Stories 3.1–3.3 | Existing profile, media, review, and screen tests | Still pass |

## Test data

`profile-review.test.ts` case `keeps the previous live photo until a replacement is allowed, then marks that photo replaced` uses the same member helper as Story 3.3: password `phrase avec espaces`, gender sister, dob `1990-01-15`, captcha `test-ok`. Clock is `2026-10-19T00:00:00.000Z`, then two seconds later for the second upload. Bios are `Première bio.` and `Nouvelle bio.`. The block reason is `La photo ne respecte pas les règles publiées.` The bio-block reason is `La présentation ne peut pas être publiée.` Phone OTP is `granted`. ID and liveness are `pending`. The image is the same 8×8 png as the other review tests.

The Postgres case uses account `018f3a40-7c2a-7000-8000-0000000000a1`, email `replaced-probe@example.bf`, pseudonym `ReplacedProbe`, and photo ids `...0000a2`, `...0000a3`, and `...0000a4`. It deletes those rows and the account at the end.

## My results

- `profile-review.test.ts`, `profile.test.ts`, `media.test.ts`, and `v2-flow.test.ts` with `--fileParallelism false`: 4 files, 45 tests passed. That includes the replacement allow, the revoked old URL, the block that leaves the live photo, the bio block that leaves `bio_live`, and `pendingProfilePhoto` for a live photo plus a pending replacement.
- `v2-responsive.test.ts`, `native-dialog.test.ts`, and `profile-edit-page.test.ts` with `--fileParallelism false`: 3 files, 9 tests passed.
- `tsc -p apps/api/tsconfig.json --noEmit` and `tsc -p apps/web/tsconfig.json --noEmit`: exit 0.
- `operator-config.migrate.test.ts`: 8 tests passed on Postgres 17. The new case rejects a second live insert with `23505`, and the `0013` update marks the older live row `replaced` before the unique index is created. Applied migration count is 14 (journal entries `0000` through `0013`).
- I did not click a signed-in browser session. Screen 12 staying open for `pending_photo` is covered by `pendingProfilePhoto` and by `reviewScript` reading `body.pending_photo`. Width proof is the existing responsive run. Layout was not redesigned, so I did not take new screenshots.

## Three validation passes

1. Behavior: a new upload stays pending beside the live photo; an allow leaves exactly one live row and marks the previous one replaced; the old signed URL stops; a second live row is rejected; a block leaves the live photo; a blocked bio leaves `bio_live`; `review_passed_at` stays; no strike is written.
2. Screen: screen 11 and screen 12 still match the AnKanu v2 HTML and PNG. `/profile-review` renders only while a real pending photo exists (`photo` or `pending_photo`). A replaced photo is not a screen. No state tabs, demo toggles, or galleries. Sample Stitch names are not live data. The Stitch HTML files are unchanged.
3. Widths: the existing Chrome checks for screens 11 and 12 at 360, 390, 768, 1024, 1280, and 1440 still pass. `document.documentElement.scrollWidth <= window.innerWidth`. No new layout.

## Solution-design sections

The board comment on ANK-107 is the catalog change. `photo_asset.moderation_state` gains `replaced`. Media owns that column. Profiles still owns `bio_live`, `bio_pending`, `visibility`, `review_queued_at`, and `review_passed_at`. The allow path is the Story 3.3 `POST /v1/staff/cases` transaction, extended only for a `profile_photo` allow. The partial unique index is the one-live invariant. `signed_grant.revoked_at` is set for the replaced assets in that same transaction. Account erase and `reveal_grant` are not changed.

## Stitch files

- `code/design-stitch/ankanu-v2/11-profile-edit/screen.html`
- `code/design-stitch/ankanu-v2/11-profile-edit/screen.png`
- `code/design-stitch/ankanu-v2/12-profile-not-yet-public/screen.html`
- `code/design-stitch/ankanu-v2/12-profile-not-yet-public/screen.png`

Screen 11 still shows the live photo. The pending note is not applied to a live photo. Screen 12 is still the pending review only. The served SLA sentence stays `Délai habituel de modération : {n} heures.`

## Known gaps

- Rejection copy is Epic 3 Story 3.5 (FR-070). Screen 12 has no rejection state.
- Photo strike is Epic 3 Story 3.6 (FR-069). This story does not count `replaced`.
- Blur, reveal, and revoke radios on screen 11 are Epic 6 (Stories 6.2–6.4).
- Screen 49 is Story 12.5. This story does not change staff metrics.
- Objects for a replaced photo stay until the existing account-erase rule. A purge of replaced photos is not this story.
- Not pushed. After QA passes, push this commit and comment the SHA on ANK-107. No Story 3.5. No deploy. Parent ANK-97 stays open.
