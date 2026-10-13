# Epic 3 Story 3.7 QA handoff

## What was built

A signed-in member whose own profile is listable can open another member's profile and see only the verification levels that member has actually earned.

`GET /v1/profiles/:id` returns the public profile, `verification.phone` / `verification.id` / `verification.mahram`, `photo_blur`, and the live photos. `GET /profil/:id` paints screen 15 from that JSON. `/profil` with no id stays the member stub.

Phone is true only when the latest `phone_otp` row is `granted`. Identity is true only when the latest `id_document` and the latest `liveness` are both `granted`. Mahram is true only for a sister when `MahramPort.verifiedWali` returns true. The app adapter returns false. This story adds no `mahram_link` table. A brother is always false. There is no pending, grey, or « à venir » level, and no Premium badge.

## Where

- `code/apps/api/src/profiles.controller.ts` — `GET /v1/profiles/:id`, `Cache-Control: no-store`
- `code/apps/api/src/public-profile.ts` — the read
- `code/apps/api/src/browse-rate.ts` — `rl_browse_per_min`, bucket `browse:<account id>`
- `code/apps/api/src/mahram-port.ts` — wali stub
- `code/apps/api/src/public-profile.test.ts`
- `code/packages/kernel/src/error.ts` — `NOT_FOUND`
- `code/apps/api/src/app.module.ts`
- `code/apps/web/app/profil/[id]/route.ts`
- `code/apps/web/src/v2-serve.ts` — `profileDetailResponse`
- `code/apps/web/src/profile-detail.ts` — screen 15 fill
- `code/apps/web/src/profile-detail.test.ts`
- `code/apps/web/src/entry-guard.ts` — `/profil/:id` is an account path
- `code/apps/web/src/v2-flow.test.ts`
- `code/apps/web/src/v2-responsive.test.ts` — `16-profile-detail`, `16b-profile-phone`

## How to run

From `code/`:

```bash
pnpm exec vitest run --config vitest.unit.config.ts --testTimeout 180000 apps/api/src/public-profile.test.ts apps/web/src/profile-detail.test.ts apps/web/src/v2-flow.test.ts apps/web/src/v2-responsive.test.ts
```

On a running API and web app, sign in as a listable member and open `/profil/<other-member-account-id>`.

## Test cases

| Case | Input | Expected |
| --- | --- | --- |
| No session | `GET /v1/profiles/:id` with no cookie | 401 `UNAUTHENTICATED`, `retryable` false, `Cache-Control: no-store` |
| Staff | Viewer roles are `moderator` or `operator` | 403 `FORBIDDEN`, `details.reason` `staff_session`, message `Cette session d'équipe ne peut pas ouvrir un espace membre.` |
| Mahram | Viewer has no `member` role | 403 `FORBIDDEN`, `details.reason` `mahram_session`, message `Une session mahram ne peut pas ouvrir cet espace.` |
| Viewer not listable | Viewer profile is not public, or the account is not `Active`. Even when `rl_browse_per_min` is 1 | 403 `FORBIDDEN`, `details.reason` `viewer_not_listable`, message `Votre profil doit être validé avant de consulter d'autres profils.` A second read is the same 403, not 429. Web redirects 303 to `/profile-edit` |
| Hidden target | Not a uuid, unknown id, self, same gender, no member role, unpublished, held, `emergency_hidden`, deactivated, pending deletion | One 404 body: `NOT_FOUND`, message `Ce profil n'est pas disponible.`, `details` null, `retryable` false. Bodies match apart from `request_id`. Web redirects 303 to `/decouvrir` |
| Phone only | Latest `phone_otp` is `granted`. ID or liveness is pending, held, or rejected | `verification` `{ phone: true, id: false, mahram: false }`. Screen shows « Téléphone vérifié / Sécurisé garantie » only. No « Vérifié » chip |
| Identity | Latest `id_document` and `liveness` are both `granted` | `verification.id` true. Screen shows « Identité vérifiée / CNIB & Preuve de vie » and the « Vérifié » chip |
| Mahram stub | Sister target, default port | `verification.mahram` false. No wali row |
| Mahram port | Test sets `verifiedWali` true. Sister target | Wali row « Tuteur (Wali) associé / Contact validé & notifié ». A brother stays false |
| Premium | Target would be entitled | No premium, plan, or entitlement field. The read does not call `BillingPort` |
| Fields | Profile columns | JSON uses the stored tokens. Null stays null. The page uses the screen 11 French labels and omits a null row. `dob` is not returned. Age is completed years. `life_plans` after `tf:…` feeds « Intention de mariage & Vision du foyer ». The blockquote keeps the guillemets around the real text: `« ` + text + ` »` |
| Photos | Live photos, `photo_blur` true | Blur URLs only, MAIN first, then other live photos by id. Pending, blocked, and replaced are absent. `original` is not signed |
| Clear photos | `photo_blur` false and an `md` derivative exists | Clear `md` URL. The lock overlay and « Demander l'accès à la photographie » are absent |
| Missing clear file | `photo_blur` false and no `md` derivative | 503 `UNHANDLED`, message `Request failed`. The code is not `REVEAL_DENIED` |
| Rate limit | More than `rl_browse_per_min` reads in 60 seconds for one viewer | 429 `RATE_LIMITED`, message `Cadence de requêtes régulée.`, `details` null, `retryable` true |
| Samples | Any 200 page | No `Al-Hassan_BF`, `RÉF. BF-7049`, `Secteur 15`, or `googleusercontent` |
| Back | « Retour à la découverte » | `href="/decouvrir"` |
| Stubs | Web cookie `staff`, `mahram`, `web`, `capacitor` on `/profil/:id` | Same JSON as the other member paths. Mahram is 403 on this path. `/profil` without an id is unchanged |
| Anon | No cookie on `/profil/:id` | 303 to `/auth` |
| PIN lock | Profile read returns 401 `PIN_REQUIRED` | Web 303 to `/pin`. The rendered page mounts the same PIN guard as the other member pages, so an idle lock still leaves the screen |
| Thumbnails | Four live photos | The strip wraps. It is not an `overflow-x` scroller. All four thumbs stay on the page at 360 and 390 |
| Widths | Phone-only and identity+wali, four photos, long name | 360, 390, 768, 1024, 1280, 1440. `documentElement.scrollWidth <= innerWidth`, and no element with `overflow-x: auto` or `scroll` has `scrollWidth > clientWidth` |

## Test data

Memory accounts. Password `phrase avec espaces`. Date of birth `1990-01-15`. Clock `2026-10-13` gives age 36. Publish by saving the profile, then set `visibility` to `public` while `account.status` is `Active`. Phone grant is a `phone_otp` row with status `granted`. The stored phone number must not appear in the JSON.

Direct URL only. This story adds no card, grid, favourite, or invite link.

## My results

- `public-profile.test.ts`: 5 passed. Phone-only then identity. Brother mahram stays false while a stubbed sister wali is true. Eight hidden targets share one 404 body. Staff, mahram, and a non-listable viewer are the three 403 reasons. Two reads by an unpublished viewer at browse limit 1 are both 403 `viewer_not_listable`. Live MAIN is listed, the pending photo is not, clear `md` is served when blur is off, a missing `md` is 503 without `REVEAL_DENIED`, the second listable read at limit 1 is 429, and a missing cookie is 401. `billingCalls` stayed 0.
- `profile-detail.test.ts`: 5 passed. Sample strings are gone. Phone-only has no identity row and no « Vérifié » chip. The intention blockquote is `« Union stable »`. The thumb strip is `flex-wrap` and has no `overflow-x-auto`. The page includes the PIN guard. A `PIN_REQUIRED` profile response is 303 to `/pin`. Null rows are omitted. A clear photo drops the lock and the access button.
- `v2-responsive.test.ts`: 2 passed, including `16-profile-detail` and `16b-profile-phone` (four photos, long name) at 360, 390, 768, 1024, 1280, and 1440. The check now fails an inner `overflow-x` scroller as well as document overflow.
- `tsc -p apps/api/tsconfig.json --noEmit` and `tsc -p apps/web/tsconfig.json --noEmit`: exit 0.

## Three validation passes

1. Behavior: the read matches the board catalogue on [ANK-121](/ANK/issues/ANK-121). One 404 body. No billing call. No mahram table. No level that was not granted.
2. Screen: `15-profile-detail` filled from the API. One real state. No state tab, demo toggle, annotation, gallery of samples, or sample name.
3. Widths: Chrome checks the identity page and the phone-only page, each with four photos, with the other v2 screens at 360, 390, 768, 1024, 1280, and 1440. An inner horizontal scroller fails the same check.

## Solution-design sections

The board comment on [ANK-121](/ANK/issues/ANK-121) is the catalogue. `SOLUTION-DESIGN.md` §7.1 names `/v1/profiles/:id` and does not give the method, payload, or errors. That comment does: `GET`, no body, no query, `:id` is `profile.account_id`, AD-7 only, `Cache-Control: no-store`, `rl_browse_per_min`.

## Stitch files

- `code/design-stitch/ankanu-v2/15-profile-detail/screen.html`
- `code/design-stitch/ankanu-v2/15-profile-detail/screen.png`

French field labels are the screen 11 option text. Screen 15 sample values are not rendered.

## Known gaps

- Bookmark « Mémoriser discrètement ce profil » is Story 3.10. It is visible and does not save.
- « Envoyer une invitation Ta'aruf » is Epic 4. It is visible and does not send.
- « Signaler / Bloquer le profil » is Story 8.6 (FR-083 / FR-084). It is visible and does not report or block.
- « Demander l'accès à la photographie » stays only while `photo_blur` is true. It is Epic 6 Stories 6.2–6.4. It does not request access. When `photo_blur` is false the control is not shown.
- Thumbnail buttons switch the hero among the signed URLs already on the page. They do not fetch another derivative.
- No link from discovery, favourites, or invites. Those arrive with Stories 3.8, 3.13, 3.10, and Epic 4.
- Block (Story 8.6) and married-hide (Epic 9) are not extra 404 cases yet.
- Chat-header Verified-Mahram is Story 7.7. It is not on this page.
- The API session is the existing httpOnly cookie. There is no Bearer parser in the API, so Capacitor uses that same cookie session.
- Not pushed. Not deployed.
