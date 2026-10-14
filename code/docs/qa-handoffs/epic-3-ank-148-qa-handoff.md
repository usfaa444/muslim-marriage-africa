# Epic 3 ANK-148 QA handoff

Founder staging bugs from 2026-10-14. One fix under Epic 3. Not Epic 4. Not pushed. Not deployed.

## What was built

Three founder bugs on the current `main` behavior.

1. The onboarding primary control « Accéder à l'espace de consultation » reads `GET /v1/accounts/gate` and opens the real next step. Step `account` goes to `/photo-rules`. Earlier steps go to their existing gate paths. A failed read shows « La connexion a échoué. » The invite control stays disabled.
2. A member who is not listable no longer leaves `/decouvrir` or `/profil/:id` for `/profile-edit`. Both screens stay put and name the real pending items from server state. The listable gate is unchanged: `visibility === 'public'` and account `Active`. Nothing is published before review and the ID gates. `403` still uses `viewer_not_listable`, and `details.reasons` names the pending items with no phone, name, bio, or evidence URI.
3. The first profile-photo pick is no longer dropped. The file input stays in the page (screen-reader class, not `hidden`). The add control opens the picker on the next turn and ignores a second click for 1.2 seconds. A failed upload shows the French message on the photo status line. A pending upload with no live photo opens `/profile-review`, including when the profile re-read fails. A live photo with a pending replacement stays on the edit screen.

## Where

- `code/apps/web/src/v2-pages.ts` — onboarding control and photo input
- `code/apps/web/src/v2-client.ts` — photo picker and upload
- `code/apps/web/src/not-listable.ts` — hold card and Discover chrome
- `code/apps/web/src/discover-page.ts` — hold instead of the redirect
- `code/apps/web/src/v2-serve.ts` — `/profil/:id` hold page
- `code/apps/api/src/public-profile.ts` — `details.reasons`
- `code/apps/api/src/browse-grid.ts`, `discovery-exclusion.ts`, `favourites.ts` — same details type
- `code/apps/web/src/not-listable.test.ts`
- `code/apps/web/src/ank-148-fix.test.ts`
- `code/apps/web/src/profile-edit-page.test.ts`
- `code/apps/web/src/discover-page.test.ts`
- `code/apps/api/src/public-profile.test.ts`

## How to run

From `code/`:

```bash
./node_modules/.bin/vitest run --config vitest.unit.config.ts apps/web/src/not-listable.test.ts apps/web/src/profile-edit-page.test.ts apps/web/src/ank-148-fix.test.ts apps/web/src/v2-flow.test.ts apps/api/src/public-profile.test.ts apps/web/src/discover-page.test.ts
./node_modules/.bin/tsc -p apps/api/tsconfig.json --noEmit
./node_modules/.bin/tsc -p apps/web/tsconfig.json --noEmit
```

Signed in, after ID and liveness: on `/onboarding`, use « Accéder à l'espace de consultation ». It opens `/photo-rules`, then the rules control opens `/profile-edit`. On a fresh profile, « Ajouter une photo » and one file pick uploads. A bad file shows a French line under the grid. A pending photo opens `/profile-review`. With a 100% profile that is still unpublished, open `/decouvrir` and `/profil/:id`. Both stay on that URL and name the real pending items. The only « fiche personnelle » link is when the profile itself is incomplete.

## Test cases

| Case | Input | Expected |
| --- | --- | --- |
| Onboarding, step account | Click « Accéder à l'espace de consultation » | `GET /v1/accounts/gate`, then `/photo-rules`. Invite stays disabled |
| Onboarding, earlier step | Gate returns `identity` | `/id-liveness`. No dead `#consultation` link |
| Onboarding, gate down | The gate request fails | « La connexion a échoué. » The page stays |
| Discover, not listable | `GET /v1/browse` 403 `viewer_not_listable` | Path stays `/decouvrir`. Card and grid hide. Hold names the server reasons. No English error text |
| Profile, not listable | `GET /v1/profiles/:id` 403 `viewer_not_listable` | HTML hold, not a redirect to `/profile-edit` |
| Incomplete profile | `profile_incomplete` with `missing` | « Il manque : … » and one link to `/profile-edit` |
| Complete profile, ID open | No `profile_incomplete` | No `/profile-edit` link. ID and liveness rows use the real state |
| Review pending | `profile_review` or `photo_review` with `sla_hours` | « En revue » and « Délai habituel de modération : N heures. » |
| Staff or mahram | Existing 403 | `staff_session` or `mahram_session`. No member reason list |
| Reasons payload | 403 body | `details.reason` stays `viewer_not_listable`. No civil name, email, password, phone, or bio text |
| Gate | Unpublished or ID pending | Still 403. Visibility is not set to `public` |
| First photo | One pick on an empty grid | `POST /v1/media` with `kind=profile_photo`. Pending and no live photo opens `/profile-review` |
| Bad photo | Upload rejected | File input clears. French message on `#profile-photo-status` and the save line. Page stays |
| Live plus pending | Replacement upload | Stays on `/profile-edit` and paints both tiles |
| Widths | Onboarding, profile edit, Discover hold, profile hold | `scrollWidth <= innerWidth` at 360, 390, 768, 1024, 1280, 1440 |

## Test data

`public-profile.test.ts` creates a sister and a brother. Password `phrase avec espaces`. Civil name Awa Sawadogo. The 403 JSON must not contain that name, the email, the password, or a phone. The brother is published. The sister is not. After her profile save, reasons include `profile_review`, `bio_review`, `id_document_pending` (`open` after a pending capture), and `liveness_pending` (`absent`). Her visibility stays off `public`.

The browser hold uses `profile_incomplete` missing `madhhab`, ID `absent`, liveness `open`. The photo file in `ank-148-fix.test.ts` is a 1×1 PNG.

## My results

- `not-listable.test.ts`, `profile-edit-page.test.ts`, `v2-flow.test.ts`, `public-profile.test.ts`: 47 passed.
- `ank-148-fix.test.ts`: 1 passed. Onboarding click reached `/photo-rules` and, with step `identity`, `/id-liveness`. Discover stayed on `/decouvrir` and showed the hold, including « La pièce d'identité est manquante. » and « fiche personnelle ». A rejected photo showed `image : une image JPEG ou PNG est requise.` on `#profile-photo-status`. The next pick opened `/profile-review`.
- `discover-page.test.ts` filtered to « follows the live session »: 1 passed. The 403 no longer waits for a navigation to `/profile-edit`.
- `tsc -p apps/api/tsconfig.json --noEmit` and `tsc -p apps/web/tsconfig.json --noEmit`: passed.
- Widths: onboarding, profile edit, Discover hold, and the profile hold passed `scrollWidth <= innerWidth` at 360, 390, 768, 1024, 1280, and 1440. Shots at 360 and 1440 are in `code/docs/qa-handoffs/epic-3-ank-148-widths/`.

## Three validation passes

1. Behavior: the onboarding control follows the gate. Discover and `/profil/:id` stay put and name server reasons. The first photo upload either shows a French failure or opens review when the photo is pending and none is live. Staff, mahram, blur, and the listable gate are unchanged.
2. Responsive: the four surfaces passed `scrollWidth <= innerWidth` at 360, 390, 768, 1024, 1280, and 1440. Proof shots are the 360 and 1440 files above. `17c-not-listable` is also in the shared width list for the full pass.
3. Stitch: onboarding keeps screen 08, with the primary control pointed at the real next step. The hold uses the screen 12 card (hourglass, rows, privacy sentence) and Discover chrome from screen 57 and screen 53. Sample names, the sample « Conformité aux règles de pudeur » row, and the sample « 12 à 24 heures ouvrées » line are not rendered. No state tabs or demo toggles.

## Solution-design sections followed

- `GET /v1/accounts/gate` for the onboarding step. No `PUT /v1/me/onboarding`.
- `GET` and `PUT /v1/me/profile` for completeness and review queue.
- `POST /v1/media` for `kind=profile_photo`. Serializers still omit `original_key`.
- `GET /v1/browse` and `GET /v1/profiles/:id` still call `assertBrowseViewer`. `isListableProfile` is unchanged.
- The 403 envelope keeps `code=FORBIDDEN` and `details.reason=viewer_not_listable`. `details.reasons` is extra detail on that same error.
- Photo and profile stay unpublished until human review and the existing ID gates.

## Stitch files matched

- `code/design-stitch/ankanu-v2/08-onboarding/screen.html` — primary consultation control. The invite control stays disabled.
- `code/design-stitch/ankanu-v2/09-photo-rules/screen.html` — destination after onboarding. Its own control still opens `/profile-edit`.
- `code/design-stitch/ankanu-v2/11-profile-edit/screen.html` — « Ajouter une photo ».
- `code/design-stitch/ankanu-v2/12-profile-not-yet-public/screen.html` — hold card. Sample rows are not copied.
- `code/design-stitch/ankanu-v2/57-discover/screen.html` — mobile Discover bar.
- `code/design-stitch/ankanu-v2/53-barre-de-navigation/screen.html` — desktop pill, with Découvrir selected.

## Known gaps

- The listable gate is unchanged. A review-approved member with ID still pending cannot browse. Whether that member may browse is the founder question already in flight. The hold works either way.
- This environment did not open a native mobile file dialog. The picker lock is covered by the unit test, and the upload, the French failure, and the review navigation were run in headless Chrome with a real file on the input.
- « Envoyer une invitation directe » stays disabled. Minimum onboarding still cannot send an Invite.
- This commit is local. It is not pushed. Push waits until QA passes. No deploy. Epic 4 stays closed. Parent [ANK-97](/ANK/issues/ANK-97) stays open.
