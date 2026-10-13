# Epic 3 Story 3.6a QA handoff

## What was built

A member can keep up to six profile photos. One live photo is MAIN. The others stay live. A new upload stays pending and does not replace the live photos. The owner sets one blur for every photo.

`/profile-edit` paints that gallery from the real `GET /v1/me/profile` payload. Sample faces from the Stitch file are not served.

Screen 15 is downloaded and is not a served page. `GET /v1/profiles/:id` and browse are not in the catalog, and the board said not to invent them. `/profil` is still the member JSON stub.

## Where

- `code/apps/api/drizzle/0015_profile_photo_gallery.sql` — `profile.photo_blur`, `photo_asset.is_main`, one-MAIN index, drop the one-live index
- `code/apps/api/src/account-schema.ts`
- `code/apps/api/src/media.ts` — cap 6, MAIN, remove, blur signing
- `code/apps/api/src/media.controller.ts` — `PUT /v1/media/:id/main`, `DELETE /v1/media/:id`
- `code/apps/api/src/profile.controller.ts` — `photos`, `photo_blur`, `PATCH /v1/me/profile`
- `code/apps/api/src/profile-photos.test.ts`
- `code/apps/web/src/v2-pages.ts` — screen 11 grid, cap line, blur checkbox
- `code/apps/web/src/v2-client.ts` — paint and bind the gallery
- `code/apps/web/src/profile-edit-page.test.ts`
- `code/apps/web/src/v2-responsive.test.ts` — `13b-profile-replacement`, `13e-profile-cap`

## How to run

From `code/`:

```bash
npx vitest run --config vitest.unit.config.ts --fileParallelism false apps/api/src/profile-photos.test.ts apps/web/src/profile-edit-page.test.ts apps/web/src/v2-flow.test.ts apps/web/src/v2-responsive.test.ts
npx tsc -p apps/web/tsconfig.json --noEmit
```

On a running API and web app, sign in as a member and open `/profile-edit`.

## Test cases

| Case | Input | Expected |
| --- | --- | --- |
| First photo | `POST /v1/media` while nothing is live | 201 `pending`. `/profile-edit` goes to `/profile-review` |
| Later photo | Upload while a live MAIN exists | Other live photos stay live. The new tile is « Photographie de profil » / « En revue », with no image, no « Principale », and no remove. The page stays on `/profile-edit`. The privacy note stays |
| Add tile | Fewer than 6 live+pending | « Ajouter une photo » opens the file input. JPEG or PNG only |
| Cap | 6 live+pending, then another upload | No add tile. The line `6 photos maximum. Retirez une photo pour en ajouter une autre.` is visible. `POST /v1/media` is 409 `PHOTO_LIMIT_REACHED`, `details.reason` `profile_photo_cap`, `details.cap` 6. No new object and no new row |
| MAIN | « Définir comme principale » on a live non-MAIN photo | `PUT /v1/media/:id/main` with an empty body. 200 `{ photos }`. That photo is « Principale ». No re-review |
| Remove | The close control, aria-label « Retirer la photo », on a live non-MAIN photo | `DELETE /v1/media/:id`. 200 `{ photos }`. That photo is gone. MAIN has no remove control |
| Remove refused | MAIN, pending, or a photo that is not live | 403. Reasons `main_photo`, `pending_photo`, `not_live`. Messages: `La photo principale ne peut pas être retirée.` / `Une photo en revue ne peut pas être retirée.` / `Cette photo n’est pas en ligne.` |
| Blur | The checkbox « Activer le flou protecteur » | No on/off words. Helper `Vos photographies restent floutées pour les autres membres.` `PATCH /v1/me/profile` body `{ "photo_blur": true \| false }`. A profile save does not send `photo_blur` |
| Clear bytes | `photo_blur` false, member viewer, live photo | Gateway may sign `sm` or `md`. `original` is never signed. Pending, blocked, and replaced stay unsigned for other members. Staff review does not get `sm`/`md` just because blur is off |
| Strike | A strike refusal on upload | The existing `#profile-save-status` sentence. The add tile stays |
| Widths | Add-tile gallery and the six-photo cap | 360, 390, 768, 1024, 1280, 1440. `scrollWidth <= innerWidth` |
| Rules | « Consignes de pudeur » | Opens `GET /photo-rules` (Story 3.5). Same copy and classes. No new route |
| Screen 15 | Open a member profile | Not in this story. Do not look for the Stitch hero on `/profil` |

## Test data

Memory accounts from the API tests. Password `phrase avec espaces`. Owner gallery uses the signed `photos[].url` from `GET /v1/me/profile`. Pending caption `Photo en revue — pas encore publique.` is stored and is not painted on the tile.

## My results

- `profile-photos.test.ts`: 3 passed. Seventh upload is 409 and keeps six rows. One of two parallel uploads wins. MAIN switches without review. Remove refuses MAIN, pending, and not-live. Clear `sm`/`md` match the original bytes only while `photo_blur` is false, then the gateway stops. Staff review is refused.
- `profile-edit-page.test.ts` and `v2-flow.test.ts`: 37 passed. The served HTML has no `googleusercontent` sample face. The first pending photo still opens `/profile-review`. A later pending photo stays on screen 11. « Consignes de pudeur » assigns `/photo-rules`.
- `v2-responsive.test.ts` width check: passed. `13b-profile-replacement` shows Principale, Définir comme principale, En revue, and Ajouter une photo inside the viewport. `13e-profile-cap` shows the six-photo line and no add tile.
- `tsc -p apps/web/tsconfig.json --noEmit`: exit 0.

## Three validation passes

1. Behavior: six photos, one MAIN, remove only a live non-MAIN photo, one `photo_blur`, cap before any object write. The first pending photo still uses `/profile-review`.
2. Screen: `/profile-edit` is `11-profile-edit`. The grid is the real state only. No state tab, demo toggle, annotation, or sample face. The cap line is hidden until six photos.
3. Widths: Chrome checks the add-tile gallery and the cap state with the other v2 screens at 360, 390, 768, 1024, 1280, and 1440.

## Solution-design sections

Board card on [ANK-114](/ANK/issues/ANK-114): `profile.photo_blur` boolean, default true, written only by `PATCH /v1/me/profile`. `photo_asset.is_main` boolean. One MAIN per owner among live profile photos. Up to 6 pending+live. `PUT /v1/media/:id/main` and `DELETE /v1/media/:id` return the owner `photos` list. `PHOTO_LIMIT_REACHED` is 409. `GET /v1/me/profile` adds `photos` and `photo_blur`. The existing `photo` field stays the MAIN, or the first pending when nothing is live.

## Stitch files

- `code/design-stitch/ankanu-v2/11-profile-edit/screen.html`
- `code/design-stitch/ankanu-v2/11-profile-edit/screen.png`
- `code/design-stitch/ankanu-v2/11-profile-edit/cap-reached.html`
- `code/design-stitch/ankanu-v2/11-profile-edit/cap-reached.png`
- `code/design-stitch/ankanu-v2/15-profile-detail/screen.html` — downloaded, not served
- `code/design-stitch/ankanu-v2/15-profile-detail/screen.png` — downloaded, not served

## Known gaps

- Screen 15 is not in this QA. The board said it waits until a catalogued public-profile route exists. Do not invent `GET /v1/profiles/:id`. « Demander l'accès à la photographie » is Epic 6 Stories 6.2–6.4.
- Reveal radios `on_accept`, `on_request`, and `never` stay unbuilt until Epic 6 Stories 6.2–6.4.
- Screen 13 discovery card is unchanged. Browse is not a route. `discoveryPhoto` already requires `is_main`.
- Local commits are not on GitHub. Push waits until QA passes.
- No deploy. No Story 3.7.
