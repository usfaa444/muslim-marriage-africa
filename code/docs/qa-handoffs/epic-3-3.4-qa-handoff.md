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

The owner surface for a pending replacement is the founder sentence on card `d81a526e-5d37-4ef8-b3ef-c027d2330244`. Screen 12 (`/profile-review`) renders only when `photo.moderation_state` is `pending`. A live photo plus `pending_photo` redirects to `/profile-edit`, and `reviewScript` leaves for `/profile-edit` in that state. `pendingProfilePhoto` is true only for a pending `photo`.

On screen 11 the photo card stays the Stitch card: the thumbnail is unchanged and the note stays `Aucun affichage public. Votre image n'est jamais exposée aux regards ouverts ni aux moteurs de recherche.` The pending caption is written only when `photo` itself is pending. When `photo` is `live` and `pending_photo` is `pending`, the empty slot between that note and the two buttons is filled with screen 12 Element 1 (`photo_camera`, `Photographie de profil`, the `En revue` chip) and the same SLA line screen 12 serves (`Délai habituel de modération : {n} heures.`). Screen 11 does not show `Photo en revue — pas encore publique.`, `Votre profil est actuellement en cours de revue…`, or the hourglass header while `photo` is live. After upload, a pending `photo` still goes to `/profile-review`. A live `photo` stays on `/profile-edit` and the row is painted. After allow, the next read has one live `photo` and no `pending_photo`, so the row is gone. After block, the live photo stays and the row is gone.

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
- `code/apps/web/src/v2-responsive.test.ts`
- `code/apps/web/src/profile-edit-page.test.ts`

## How to run

From `code/`:

```bash
npx vitest run --config vitest.unit.config.ts --fileParallelism false apps/api/src/profile-review.test.ts apps/api/src/profile.test.ts apps/api/src/media.test.ts apps/web/src/v2-flow.test.ts apps/web/src/v2-responsive.test.ts apps/web/src/native-dialog.test.ts
npx vitest run --config vitest.integration.config.ts apps/api/src/operator-config.migrate.test.ts
npx tsc -p apps/api/tsconfig.json --noEmit
npx tsc -p apps/web/tsconfig.json --noEmit
```

The integration file needs Docker and Postgres 17. The unit config excludes it.

Sign in as a member who already has an allowed profile photo. Upload another profile photo. Stay on `/profile-edit`. The thumbnail and the `Aucun affichage public…` note stay. Between that note and the buttons, the card shows `Photographie de profil` with the `En revue` chip and `Délai habituel de modération : {n} heures.` It must not show `Photo en revue — pas encore publique.` or `Votre profil est actuellement en cours de revue…`. Open `/profile-review` directly: it redirects to `/profile-edit`. A first upload, when `photo` itself is `pending`, still lands on screen 12. A moderator allow of the pending photo leaves exactly one `live` row, marks the previous row `replaced`, removes the `En revue` row, and makes the old blur URL return `403`. A block of a later upload leaves the live photo and removes the row.

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
| Screen 11 replacement | `photo` live and `pending_photo` pending | Stay on `/profile-edit`. Note stays `Aucun affichage public…`. The slot shows screen 12 Element 1 (`Photographie de profil` · `En revue`) and the SLA line. No `pas encore publique` and no `en cours de revue` copy. Direct `/profile-review` redirects to `/profile-edit` |
| Screen 12 | `photo` itself pending | `/profile-review` stays on screen 12. A live photo alone, and a live photo plus `pending_photo`, both leave `/profile-review` |
| Stories 3.1–3.3 | Existing profile, media, review, and screen tests | Still pass |

## Test data

`profile-review.test.ts` case `keeps the previous live photo until a replacement is allowed, then marks that photo replaced` uses the same member helper as Story 3.3: password `phrase avec espaces`, gender sister, dob `1990-01-15`, captcha `test-ok`. Clock is `2026-10-19T00:00:00.000Z`, then two seconds later for the second upload. Bios are `Première bio.` and `Nouvelle bio.`. The block reason is `La photo ne respecte pas les règles publiées.` The bio-block reason is `La présentation ne peut pas être publiée.` Phone OTP is `granted`. ID and liveness are `pending`. The image is the same 8×8 png as the other review tests.

The Postgres case uses account `018f3a40-7c2a-7000-8000-0000000000a1`, email `replaced-probe@example.bf`, pseudonym `ReplacedProbe`, and photo ids `...0000a2`, `...0000a3`, and `...0000a4`. It deletes those rows and the account at the end.

## My results

- `profile-review.test.ts`, `profile.test.ts`, `media.test.ts`, and `v2-flow.test.ts` with `--fileParallelism false`: the earlier 45 still cover the replacement allow. This pass re-ran `v2-flow.test.ts` with `profile-edit-page.test.ts`: 2 files, 33 tests passed. `pendingProfilePhoto` is false for a live photo plus a pending replacement, and true only when `photo` is pending.
- `v2-responsive.test.ts`: 2 tests passed, including `13b-profile-replacement` at 360, 390, 768, 1024, 1280, and 1440. The `En revue` row stays inside the viewport and does not show the not-public copy. `profile-edit-page.test.ts` is included in the 33 above.
- `tsc -p apps/api/tsconfig.json --noEmit` and `tsc -p apps/web/tsconfig.json --noEmit`: exit 0.
- `operator-config.migrate.test.ts`: 8 tests passed on Postgres 17. The new case rejects a second live insert with `23505`, and the `0013` update marks the older live row `replaced` before the unique index is created. Applied migration count is 14 (journal entries `0000` through `0013`).
- I did not click a signed-in browser session. The upload stay-on-screen-11 path is the `profile-edit-page.test.ts` case `stays on screen 11 when a live photo has a pending replacement`. Width proof for that row is `13b-profile-replacement` in `v2-responsive.test.ts`. Screenshots: `code/docs/qa-handoffs/ank-83-widths/13b-profile-replacement-360.png` and `code/docs/qa-handoffs/ank-83-widths/13b-profile-replacement-1440.png`.

## Three validation passes

1. Behavior: a new upload stays pending beside the live photo; an allow leaves exactly one live row and marks the previous one replaced; the old signed URL stops; a second live row is rejected; a block leaves the live photo; a blocked bio leaves `bio_live`; `review_passed_at` stays; no strike is written.
2. Screen: screen 11 keeps the Stitch photo card. The `En revue` row is screen 12 Element 1 and appears only when `photo` is live and `pending_photo` is pending. Screen 12 renders only when `photo` itself is pending. A replaced photo is not a screen. No state tabs, demo toggles, or galleries. The Stitch HTML files are unchanged.
3. Widths: Chrome checks for the screens, including the replacement row on screen 11, at 360, 390, 768, 1024, 1280, and 1440. `document.documentElement.scrollWidth <= window.innerWidth`. The chip stays inside the viewport.

## Solution-design sections

The board comment on ANK-107 is the catalog change. `photo_asset.moderation_state` gains `replaced`. Media owns that column. Profiles still owns `bio_live`, `bio_pending`, `visibility`, `review_queued_at`, and `review_passed_at`. The allow path is the Story 3.3 `POST /v1/staff/cases` transaction, extended only for a `profile_photo` allow. The partial unique index is the one-live invariant. `signed_grant.revoked_at` is set for the replaced assets in that same transaction. Account erase and `reveal_grant` are not changed.

## Stitch files

- `code/design-stitch/ankanu-v2/11-profile-edit/screen.html`
- `code/design-stitch/ankanu-v2/11-profile-edit/screen.png`
- `code/design-stitch/ankanu-v2/12-profile-not-yet-public/screen.html`
- `code/design-stitch/ankanu-v2/12-profile-not-yet-public/screen.png`

Screen 11 still shows the Stitch photo card. While a replacement is pending, Element 1 from screen 12 sits between the note and the buttons, with the served SLA sentence `Délai habituel de modération : {n} heures.` Screen 12 is only the case where `photo` itself is pending.

## Known gaps

- Rejection copy is Epic 3 Story 3.5 (FR-070). Screen 12 has no rejection state.
- Photo strike is Epic 3 Story 3.6 (FR-069). This story does not count `replaced`.
- Blur, reveal, and revoke radios on screen 11 are Epic 6 (Stories 6.2–6.4).
- Screen 49 is Story 12.5. This story does not change staff metrics.
- Objects for a replaced photo stay until the existing account-erase rule. A purge of replaced photos is not this story.
- Not pushed. After QA passes, push this commit and comment the SHA on ANK-107. No Story 3.5. No deploy. Parent ANK-97 stays open.
