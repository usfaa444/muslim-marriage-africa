# Epic 3 Story 3.2 QA handoff

## What was built

A signed-in member can upload a profile photo. Media stores the original bytes and a separate server-made blur JPEG. The photo stays `pending`. It is not public. The owner sees the caption « Photo en revue — pas encore publique. » Other members cannot read it. Discovery omits it until `moderation_state` is `live`. There is no staff route that sets `live`.

`POST /v1/media` body is JSON `{ "kind": "profile_photo", "image": "<base64 jpeg or png>" }`. SOLUTION-DESIGN names the route and not the body. The image uses the same 5,242,880 byte cap as the existing ID and liveness capture. The route allows the same JSON size as the verification routes. `kind` other than `profile_photo` writes nothing. `chat_photo` and `voice_note` are rejected here. `applyModeration` is a predicate only: legal for `profile_photo` and `bio`, never for `chat_photo` or `voice_note`. No HTTP call applies moderation.

Success is `201` with only these fields:

```json
{
  "id": "<uuid>",
  "kind": "profile_photo",
  "moderation_state": "pending",
  "caption": "Photo en revue — pas encore publique.",
  "blur_url": "/v1/media/get?token=<signed grant id>"
}
```

The caption uses the em dash from `code/design-stitch/ankanu-v2/12-profile-not-yet-public/screen.html`. The response never includes `original_key`, `blur_key`, or `object_key`. `GET /v1/me/profile` and `PUT /v1/me/profile` add `photo` with that same card, or `photo: null` when the member has no profile photo. Story 3.1 fields, the meter, and « Mettre en pause » are unchanged.

`blur_url` is a capability token for `GET /v1/media/get`, not a bucket URL. The gateway checks the viewer, `revoked_at`, expiry, and that the derivative is `blur`, then returns the blur JPEG as `image/jpeg`. TTL comes from `signed_url_ttl_seconds` and is capped at 60. Signing `original`, `xs`, `sm`, or `md` is `403` `REVEAL_DENIED` with message `Révélation refusée.` A pending profile photo signed or fetched by anyone except the owner is `403` `FORBIDDEN` with message `Photo non publique.` A missing or foreign token is `403` `Accès au média refusé.` No session is `401`.

`discoveryPhoto` returns null unless `kind` is `profile_photo` and `moderation_state` is `live`. There is no discovery HTTP route in this story. A test may set a memory row to `live` to prove the sign rule. That mutation is not an endpoint.

A JPEG or PNG at or under 5,242,880 bytes is accepted, including a 4032×3024 phone JPEG. The decoder reads the PNG IHDR, or the JPEG frame size, before it allocates the bitmap. A header above 100 megapixels is refused before that read. That ceiling is the decoder's own default. It is not an 8 megapixel cap.

The edit screen stays `code/design-stitch/ankanu-v2/11-profile-edit/screen.html`. « Mettre à jour la photo » opens a file input for jpeg or png, posts `/v1/media`, and on `pending` goes to `/profile-review`. If a pending photo is already stored, the photo note on the edit screen becomes the caption. The account-circle placeholder stays. The script does not set an `<img>` src and does not CSS-blur the original. `backdrop-blur-sm` on the review card is the Stitch frame. It is not a blur of the uploaded file.

`/profile-review` is screen 12. The server asks `GET /v1/me/profile`. It sends the HTML only when `photo.moderation_state` is `pending`. Otherwise it redirects to `/profile-edit`. An anonymous request goes to `/auth`. The inline script repeats that check. The page is the downloaded Stitch frame: photo caption, bio « En revue », pudeur « En cours d'évaluation », and « 12 à 24 heures ouvrées ». Those extra lines are the frame. This story does not decide bio, pudeur, or a review SLA.

## Where

- `code/apps/api/drizzle/0011_photo_asset.sql` — `photo_asset`, `derivative`, `signed_grant`
- `code/apps/api/src/account-schema.ts` — those tables
- `code/apps/api/src/media-blur.ts` — decode png/jpeg, longest edge 32, box blur, new JPEG
- `code/apps/api/src/media-store.ts` — memory store for tests; postgres plus object storage otherwise
- `code/apps/api/src/media.ts` — upload, owner card, sign, gateway read, `discoveryPhoto`, `applyModerationAllowed`
- `code/apps/api/src/media.controller.ts` — `POST /v1/media`, `GET /v1/media/get`
- `code/apps/api/src/media.test.ts`
- `code/apps/api/src/profile.controller.ts` — `photo` on GET and PUT
- `code/apps/api/src/create-app.ts` — JSON limit on `/v1/media`
- `code/apps/api/src/app.module.ts` — `MediaController`
- `code/apps/web/src/v2-pages.ts` — hidden file input, photo-note id, `reviewHtml`
- `code/apps/web/src/v2-client.ts` — `profileScript` upload and `reviewScript`
- `code/apps/web/src/v2-serve.ts` — `profileReviewResponse`
- `code/apps/web/app/profile-review/route.ts`
- `code/apps/web/src/entry-guard.ts` — `/profile-review` is an account path
- `code/apps/web/src/profile-edit-page.test.ts`
- `code/apps/web/src/v2-flow.test.ts`
- `code/apps/web/src/native-dialog.test.ts`
- `code/apps/web/src/v2-responsive.test.ts` — page `13b-profile-review`

## How to run

From `code/`:

```bash
npx vitest run --config vitest.unit.config.ts apps/api/src/media.test.ts apps/api/src/profile.test.ts apps/web/src/profile-edit-page.test.ts apps/web/src/v2-flow.test.ts apps/web/src/native-dialog.test.ts apps/web/src/v2-responsive.test.ts
npx tsc -p apps/api/tsconfig.json --noEmit
npx tsc -p apps/web/tsconfig.json --noEmit
```

Sign in, open `/profile-edit`, choose a jpeg or png with « Mettre à jour la photo ». The browser should land on `/profile-review` and the heading should be the caption. Opening `/profile-review` with no pending photo should return to `/profile-edit`.

## Test cases

| Case | Input | Expected |
| --- | --- | --- |
| No session | `POST /v1/media` with a png | `401`. No `photo_asset` row |
| Wrong kind | `kind` `chat_photo` | `400`. `details.field` `kind`. No row |
| Not an image | `image` base64 of plain text | `400`. `details.field` `image`. No row |
| Png upload | `kind` `profile_photo`, base64 png | `201`. `moderation_state` `pending`. Caption is the Stitch sentence. Keys are only `blur_url`, `caption`, `id`, `kind`, `moderation_state`. JSON has no `original_key` |
| Phone jpeg | 4032×3024 JPEG, quality 30, file under 5,242,880 bytes | `201`. Same pending card. Keys are only those five |
| Huge png header | IHDR 100000×100000, no pixel data | `PhotoDecodeError` before the bitmap is read. No row |
| Stored bytes | That upload | `original_key` and `blur_key` differ. One `derivative` row, `size` `blur`, `object_key` equals `blur_key`. Blur bytes are a different JPEG. A two-tone png's blur has a pixel with both red and blue |
| Owner profile | `GET /v1/me/profile` | `photo.caption` is the Stitch sentence. JSON has no `original_key` and no original object key |
| Owner GET | `GET` `photo.blur_url` with the owner cookie | `200` `image/jpeg`. Body equals the blur bytes and not the original |
| Other member | Sign `blur` for the other account, and GET the owner token with the other cookie | Sign returns `FORBIDDEN` and writes no grant. GET is `403` |
| Clear size | Sign `original` or `md` as the owner | `REVEAL_DENIED` |
| Revoke | Set `revoked_at` on the grant, then GET | `403` |
| Expiry | Clock plus 61 seconds, then GET | `403` |
| TTL cap | Reader returns 900 | Grant expiry is 60 seconds after the upload clock |
| Discovery pending | `discoveryPhoto` on the pending row | `null` |
| Discovery live | Test sets `moderation_state` to `live` | `{ id, kind: profile_photo, moderation_state: live }`. The other member can GET blur bytes, not the original. `md` is still `REVEAL_DENIED` |
| Moderation target | `applyModerationAllowed` | true for `profile_photo` and `bio`. false for `chat_photo` and `voice_note` |
| Edit upload | Click « Mettre à jour la photo », choose a file | `POST /v1/media` body `{ kind: profile_photo, image }`. Location becomes `/profile-review` |
| Pending note | Profile body `photo.moderation_state` `pending` | Photo note text is the caption. No `filter:blur` and no `original_key` in the HTML |
| Review gate | `/profile-review` when the profile photo is not pending | Redirect to `/profile-edit`. Anonymous `/profile-review` goes to `/auth` |
| Story 3.1 | Save and pause on `/profile-edit` | Still `PUT /v1/me/profile` and `POST /v1/me/deactivate`. Meter tests still pass. Response now includes `photo` |
| Widths | 360, 390, 768, 1024, 1280, 1440 on profile edit and profile review | `scrollWidth <= innerWidth`. No box outside the viewport |
| Unwired controls | « Consignes de pudeur » and the three visibility radios | Still visible. They do not post and they do not call `/v1/reveals` |

## Test data

`media.test.ts` creates `photoN@example.bf`, password `phrase avec espaces`, gender sister, dob `1990-01-15`, captcha `test-ok`. Clock starts at `2026-10-13T02:00:00.000Z`. The image is an 8×8 png, red on the left and blue on the right. `signed_url_ttl_seconds` is injected as 60, then 900 for the cap case.

## My results

- QA fail on a 4032×3024 JPEG: fixed. `media.test.ts` now has that upload and a 100000×100000 PNG header. Re-ran `media.test.ts`: 4 passed. `tsc -p apps/api/tsconfig.json`: exit 0.
- Earlier run of `media.test.ts`, `profile.test.ts`, `profile-edit-page.test.ts`, `v2-flow.test.ts`, and `native-dialog.test.ts`: 40 passed. That run did not include the phone JPEG. The phone JPEG case is the new `media.test.ts` result above.
- `v2-responsive.test.ts`: 2 passed. Profile review is `13b-profile-review` at 360, 390, 768, 1024, 1280, and 1440. `scrollWidth <= innerWidth`. Shots: `code/docs/qa-handoffs/ank-83-widths/13b-profile-review-360.png` and `13b-profile-review-1440.png`. Profile edit remains `13-profile` in that run.
- `tsc -p apps/api/tsconfig.json` and `tsc -p apps/web/tsconfig.json`: exit 0.
- `operator-config.migrate.test.ts` lists `photo_asset`, `derivative`, and `signed_grant`, and expects 12 journal rows. The unit config excludes that file. I did not run it. It needs Postgres.
- I did not click a signed-in browser session against a running app. Chrome loaded the built HTML at each required width. The upload script ran against a fake document. The API cases ran against the in-memory media store.

## Three validation passes

1. Behavior: upload stores original plus blur, response omits `original_key`, pending photos are omitted for other members and for `discoveryPhoto`, the gateway re-checks the grant, clear derivatives are refused, and Story 3.1 save and pause still run.
2. Screen: `/profile-edit` stays screen 11. A pending photo changes the photo note to the caption and does not show the original. `/profile-review` is screen 12 only when the API says the photo is pending. No state tabs, demo toggles, or galleries. Sample Stitch profile text is not used as live data.
3. Widths: Chrome on the built profile and review HTML at 360, 390, 768, 1024, 1280, and 1440. `document.documentElement.scrollWidth <= window.innerWidth`, and no measured box outside the viewport.

## Solution-design sections

Followed `photo_asset`, `derivative`, and `signed_grant` in the entity catalog. Media owns those rows (AD-3). `POST /v1/media` and `GET /v1/media/get` from the API table. AD-9: server blur, sign only `blur` without a reveal grant, no `original_key` in HTTP, TTL capped at 60, gateway re-check. AD-10: this is the profile publish gate, not a chat hold. FR-056 and FR-065. FR-016's invite block stays Story 4.1. No `reveal_grant` rows.

## Stitch files

- `code/design-stitch/ankanu-v2/11-profile-edit/screen.html`
- `code/design-stitch/ankanu-v2/11-profile-edit/screen.png`
- `code/design-stitch/ankanu-v2/12-profile-not-yet-public/screen.html`
- `code/design-stitch/ankanu-v2/12-profile-not-yet-public/screen.png`

Matched those screens' sections, order, copy, and tokens. The edit screen adds a hidden file input. When a photo is pending, the photo note text becomes the caption from screen 12. Narrow widths keep the same controls and reflow.

## Known gaps

- « Consignes de pudeur » is Epic 3 Story 3.5 (FR-070). The button is visible and does nothing.
- Visibility radios `on_accept` / `on_request` / `never` are Epic 6 Stories 6.2–6.4 (FR-057, FR-058, FR-059). There is no profile column for a default policy. They are not saved. `/v1/reveals` is not called.
- Staff allow/block, the review SLA, and a paid queue are Epic 3 Story 3.3 (FR-012, FR-013). Screen 12 shows the Stitch lines « En revue », « En cours d'évaluation », and « 12 à 24 heures ouvrées » because that is the downloaded frame for a pending photo. This story does not create a staff queue or a timer.
- An older live photo staying up until the new one is approved is Epic 3 Story 3.4 (FR-017). A second upload stores another pending row. The owner card is the latest profile photo.
- Photo strike is Epic 3 Story 3.6 (FR-069).
- Blocking Invite send when there is no profile photo is Epic 4 Story 4.1 (FR-016). This story does not send an Invite.
- Moderator unblur is FR-093 and is not this story. There is no unblur grant.
- `xs`, `sm`, and `md` derivatives are not created. Signing those sizes is refused.
- Account erase of object versions is not this story.
- Not pushed. After QA passes, push this commit and comment the SHA on [ANK-101](/ANK/issues/ANK-101).
