# QA handoff — Owners always see their own photos clearly

Story ticket [ANK-157](/ANK/issues/ANK-157). Coordination [ANK-156](/ANK/issues/ANK-156). Parent [ANK-97](/ANK/issues/ANK-97) stays open. This is not Epic 4.

## What was built

On the owner's own account, pending and live profile photos are shown in clear form. The clear bytes are the `md` derivative, signed only for that owner's session. `photo_blur` still controls what other members see. It does not blur the owner's own tiles.

Surfaces:

- `/profile-edit` (screen 11): the gallery, including a pending tile and the live tiles used to set the main photo
- `/profile-review` (screen 12): the first pending photo, including while the profile is not public yet

A later pending photo stays on `/profile-edit` beside the live photo. Both are clear for the owner.

Labels stay: « En revue », « Photographie de profil », « Principale », « Définir comme principale », « Retirer la photo ». The camera-icon placeholder is not what the owner sees once the photo URL is known. Sample faces from the Stitch HTML are not rendered.

`POST /v1/media` still returns `blur_url` for the blur derivative. The screens do not paint that response. They read `GET /v1/me/profile`.

## Where

- `code/apps/api/src/media.ts` — owner `md` sign and gateway read
- `code/apps/api/src/profile-photos.test.ts`
- `code/apps/web/src/v2-client.ts` — screen 11 grid and screen 12 photo
- `code/apps/web/src/profile-edit-page.test.ts`
- `code/apps/web/src/v2-flow.test.ts`
- `code/apps/web/src/v2-responsive.test.ts`

No new table, column, relationship, or route.

## How to run

From `code/`:

```bash
npx vitest run --config vitest.unit.config.ts apps/api/src/profile-photos.test.ts apps/api/src/media.test.ts apps/web/src/profile-edit-page.test.ts apps/web/src/v2-flow.test.ts
npx vitest run --config vitest.unit.config.ts apps/web/src/v2-responsive.test.ts
npx tsc -p apps/api/tsconfig.json --noEmit
npx tsc -p apps/web/tsconfig.json --noEmit
```

The width test needs Chrome. It skips when Chrome is missing. It checks `document.documentElement.scrollWidth <= window.innerWidth` at 360, 390, 768, 1024, 1280, and 1440.

To click the screens, sign in as the member who uploaded the photo and open `/profile-edit`. The first pending photo opens `/profile-review` after upload. A second photo, while one is already live, stays on `/profile-edit`.

## Test cases

| Case | Input | Expected |
| --- | --- | --- |
| Owner, first photo pending | `photo_blur` true. `GET /v1/me/profile` as the owner | `photos[0].moderation_state` is `pending`. `photos[0].url` and `photo.blur_url` are `/v1/media/get?token=…`. The grant `derivative` is `md` and `viewer_id` is the owner. `GET` of either token as the owner is **200** and the bytes match the uploaded image, not the blur file. The body has no `original_key`. |
| Screen 11, only pending | That profile | The grid shows the clear image, « Photographie de profil », and « En revue ». No camera icon. No « pas encore publique » in the grid. No remove control on that tile. |
| Screen 12 | `photo.moderation_state` is `pending` | The page stays. The camera icon is replaced by the clear photo from `photo.blur_url`. « Photographie de profil », « En revue », and « Photo en revue — pas encore publique. » stay. |
| Other member, pending token | That owner's `md` token, other member cookie | **403**. `signMedia` of `md` for the other member is refused. `livePhotosForMember` is empty while nothing is `live`. |
| Replaced-pending | First photo allowed, second upload still pending, `photo_blur` true | Owner gallery has the live photo and the pending photo. Both owner tokens are `md` and return **200** clear bytes. The other member's token for the pending photo is **403**. The other member's live photo token is `blur` and the bytes match the blur file. |
| Blur off | `PATCH /v1/me/profile` `{ "photo_blur": false }` while a pending photo remains | The other member still gets **403** on the pending token. `livePhotosForMember` returns only the live photo, signed `md`. |
| Delete and set-main | Two live photos. `PUT /v1/media/:id/main` on the non-main one. `DELETE /v1/media/:id` on a non-main live photo | **200** and the gallery ids match that photo. `DELETE` of the main photo is **403** `main_photo`. `DELETE` of a pending photo is **403** `pending_photo`. `PUT` main on a pending photo is **403** `not_live`. |
| Other members, blur on | Live photo, `photo_blur` true | The other member's live token is blur bytes. The owner's live token stays clear. |
| Blocked | A pending row set to `blocked` | It is absent from `photos`, `photo`, and `pending_photo`. The old owner token is **403**. |
| Upload response | `POST /v1/media` | `blur_url` still serves blur bytes. Serializers omit `original_key`. |

## Test data

Memory accounts from `profile-photos.test.ts`. Password `phrase avec espaces`. Captcha `test-ok`. Gender sister. DOB `1990-01-15`. The image is an 8×8 PNG. `photo_blur` defaults to true. Clock starts at `2026-10-13T04:00:00.000Z`.

## My results

- `profile-photos.test.ts`, `profile-edit-page.test.ts`, `v2-flow.test.ts`: 43 passed.
- `media.test.ts`, `photo-strike.test.ts`: passed. A parallel run timed out `profile-photos.test.ts` and `public-profile.test.ts` at 5000ms; both passed on a second run (`public-profile.test.ts`: 6 passed).
- `v2-responsive.test.ts`: 2 passed, including screen 11 pending and replacement tiles and screen 12 after the clear photo is painted.
- `tsc` for `apps/api` and `apps/web`: exit 0.

## Three validation passes

1. Behavior: the owner receives clear `md` bytes for pending and live photos. Another member's session gets 403 on those tokens. With `photo_blur` on, the other member's live photo is blur. Delete and set-main still target the live photo the control names. A pending photo cannot be deleted or set as main.
2. Responsive: `v2-responsive.test.ts` checks scroll width at 360, 390, 768, 1024, 1280, and 1440. Screen 12 is measured after the photo is inserted. The pending label wraps inside the tile.
3. Stitch: screens 11 and 12 keep their copy, order, and tokens. The owner sees one real state. The camera placeholder is not left in place of a known photo. No state tab, demo toggle, annotation, or Google sample face is shipped. No CSS blur of the original.

## Solution-design sections followed

`photo_asset` (`moderation_state` `pending|live|blocked`, plus the shipped `replaced` value), `derivative` size `md`, `signed_grant` (`viewer_id`, `derivative`, 60s TTL). `MediaPort.sign` is the only URL minter. The gateway re-checks the viewer. Serializers do not emit `original_key`. No `reveal_grant` row is created. `GET /v1/me/profile`, `GET /v1/media/get`, `PUT /v1/media/:id/main`, `DELETE /v1/media/:id`, and `PATCH /v1/me/profile` `photo_blur` are the existing routes. Discovery still omits a photo that is not `live`.

## Stitch files matched

- `code/design-stitch/ankanu-v2/11-profile-edit/screen.html`
- `code/design-stitch/ankanu-v2/11-profile-edit/screen.png`
- `code/design-stitch/ankanu-v2/11-profile-edit/cap-reached.html`
- `code/design-stitch/ankanu-v2/11-profile-edit/cap-reached.png`
- `code/design-stitch/ankanu-v2/12-profile-not-yet-public/screen.html`
- `code/design-stitch/ankanu-v2/12-profile-not-yet-public/screen.png`

The pending tile and the screen 12 row in those files use a camera icon. On the owner surfaces the clear photo is painted in that tile and above that row. The labels and the live-tile controls stay.

## Known gaps

- Blocked and `replaced` photos are not returned by `GET /v1/me/profile`. They are not given a new store.
- A pending photo still cannot be deleted or set as main.
- `POST /v1/media` `blur_url` is still the blur derivative. The account screens do not use it.
- Staff review still signs blur. Per-viewer Reveal for other members is Epic 6 and is not built.
- This commit is local until QA passes. Do not treat staging as updated.
