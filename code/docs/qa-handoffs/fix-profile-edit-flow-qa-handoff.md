# fix-profile-edit-flow QA handoff

Fay tested the local stack (`http://localhost:4012`, `main`) and found five faults around `/profile-edit`. Spec: `_bmad-output/implementation-artifacts/spec-fix-profile-edit-flow.md` (five ACs; AC 5 is Fay's decision of 2026-10-22: the PIN is six digits).

Branch `factory/fix-profile-edit-flow`, based on `origin/main` at `2603ef7`, with `origin/main` at `d60e97e` (PR #4, e2e auth smoke) merged in by a merge commit. No PR.

## What was built

### AC 1: every Stitch screen the web reads is in the web image

Root cause: the web reads Stitch HTML from disk at request time (`stitchFile()` in `v2-serve.ts`, `loadStitch()` in `discover-page.ts`). `apps/web/Dockerfile` copies those files one by one, and `code/.dockerignore` lets only an allow list into the build context. Both lists had stopped at 14 screens. Nine files the web reads were in neither, so every page built on them answered 500 in the image while all unit tests (which read the repo) stayed green:

| Missing file | Pages that answered 500 in the image |
| --- | --- |
| `12-profile-not-yet-public/screen.html` | `/profile-review` (Fay's report) |
| `57-discover/screen.html`, `57-discover/grid.html` | `/decouvrir` for any signed-in member (found by the other QA run) |
| `17-favourites/screen.html` | `/favoris` for any signed-in member (same) |
| `13-search/screen.html`, `14-filters/screen.html` | the search and filter panels of `/decouvrir` (`discover-page.ts`) |
| `15-profile-detail/screen.html` | `/profil/<id>` (another member's profile) |
| `52-ts-visit-signals/screen.html` | `/staff/visit-signals` |
| `53-barre-de-navigation/screen.html` | the « not yet public » hold on `/decouvrir` and on `/profil/<id>` |

The change:

- `apps/web/Dockerfile` copies all 23 files the web reads (sorted, one `COPY` per file, same form as before).
- `code/.dockerignore` lets those files into the build context in the existing allow-list style. Captures (`screen.png`) and screens the web does not read stay out.
- New `apps/web/src/web-image.test.ts` ties the three lists together. It parses every `stitchFile('…'[, '…'])` and `loadStitch('…')` call in the web runtime source (`src`, `app`, `middleware.ts`, `next.config.ts`; test files excluded), and fails when:
  - a read file is not copied by the Dockerfile;
  - a copied file is left out of the build context by `.dockerignore` (last matching pattern wins, as Docker does);
  - the Dockerfile copies a file that does not exist or that nothing reads, or copies it to another path;
  - a call names its screen with anything but a string literal (the test could not see it);
  - any other runtime file starts reading design files (`readFile`/`readFileSync`/`design-stitch`) outside the two parsed loaders.

The `.dockerignore` gap only showed when the image was built for real: the Dockerfile fix alone failed with `"/app/design-stitch/ankanu-v2/57-discover/screen.html": not found`. The `.dockerignore` check in the test was written first and failed on the nine files.

### AC 2: a photo never stays broken after Back or an expired grant

Root cause (reproduced in real Chromium): `GET /v1/me/profile` answered with no `Cache-Control` (Express adds an `ETag`), and every photo URL in it is a signed grant (`/v1/media/get?token=…`) that expires after `signed_url_ttl_seconds` (60 s here). On a back/forward navigation Chromium loads subresources and `fetch()` calls made before the load event from its HTTP cache without revalidating. So after upload → `/profile-review` → wait more than 60 s → Back, `/profile-edit` painted the grants from the cached profile read, `/v1/media/get` answered 403 and the photos stayed broken until a manual reload. A probe page in Chromium showed `afterBack grant-1, serverReads 1` with the old headers, and `grant-2` (a new read) with `no-store` on either side.

The change:

- API (`profile.controller.ts`): `GET /v1/me/profile`, `PUT /v1/me/profile` and `PATCH` (blur) answer `Cache-Control: no-store`, on success and on error.
- Page (`profileScript` in `v2-client.ts`): every profile read uses `cache: 'no-store'` (the review page's read too).
- `pageshow` with `persisted: true` (a back/forward cache restore): the page re-reads the profile and repaints only the photo grid with fresh grants. Typed edits stay; nothing reloads.
- An `<img>` in the photo grid that fails to load (expired grant) triggers one coalesced re-read and repaint, at most twice per page view, so a photo that truly cannot load does not loop. A restore resets the count.
- Unchanged: the TTL, the API's signed URLs, the blur flag and the owner preview URL are painted exactly as the API sends them (AD-9; a test pins this). No media is cached in the page.

### AC 3: the PIN switch returns to `/profile-edit`

Turning on « Activer le code PIN d'accès » now opens `/pin?next=%2Fprofile-edit`. After the PIN is saved, `/pin` returns to `/profile-edit`. The existing `next` rule on `/pin` is unchanged: only a same-origin path (`/x`; not `//x`, not `/\x`, not `https://…`) is followed, otherwise `/onboarding`.

### AC 4: unsaved edits are saved before the PIN screen opens

- The page counts edits to the profile fields (date of birth, origin, country and city, education, job, marital status, polygyny intent, madhhab, practice, timeframe, intentions, bio). With nothing unsaved, the switch opens `/pin` directly and sends no save.
- With unsaved edits, the switch sends the same `PUT /v1/me/profile` payload as « Enregistrer les modifications ». On success it opens `/pin?next=%2Fprofile-edit`; the edits are stored, so they are on the page on return.
- On failure (4xx with an API message, 5xx or network): the member stays on `/profile-edit`, the switch goes back off, the edits stay in the form, and the existing save status line shows the API message, or « Enregistrement impossible. » when there is none.
- Edits typed before the first profile read finishes wait for it; if that read fails the page stays with the same error line rather than saving over unknown data.
- A second tap while the save is in flight is ignored. Unticking the switch or a PIN that is already on does not navigate.
- On a back/forward restore the switch shows the real PIN state again (no-store read of `GET /v1/pin`).

### AC 5: the PIN is six digits; a stored four-digit PIN still unlocks

- `@ankanu/kernel` exports `PIN_LENGTH = 6` and `LEGACY_PIN_LENGTH = 4` (`packages/kernel/src/pin.ts`). The API and the web client both use them.
- `PUT /v1/pin` accepts exactly six digits. Four, five or seven digits, letters or an empty body answer `400` with the field message `pin : six chiffres sont requis.` (was `quatre`).
- `POST /v1/pin/unlock` accepts four or six digits, so a PIN stored before this change still unlocks until the member sets a new one. After a new six-digit PIN is set, the old four-digit PIN is refused (`PIN_INVALID`).
- PIN screen (`pinScript`): all six dots fill. Setting a new PIN submits only on the sixth digit; « Déverrouiller l'espace » with four digits does nothing while no PIN is set. Unlocking a six-digit PIN submits on the sixth digit; a four-digit PIN unlocks with four digits and « Déverrouiller l'espace ». Five digits never submit. A refused PIN clears the dots. Keys, backspace and clear are ignored while a request is in flight.
- The screen now reads the write's answer before it navigates. Without that, Chromium reported the already-applied `PUT /v1/pin` (and the unlock) as `net::ERR_ABORTED`, which the e2e guards caught on the built stack.

### Accessibility (found by the new e2e axe checks)

The PIN switch, the blur switch and the photo picker had no accessible name (axe critical `label`). They now carry `aria-label`s from their existing screen copy: « Activer le code PIN d'accès », « Activer le flou protecteur », « Ajouter une photo ». No visible change.

## Where

| File | Change |
| --- | --- |
| `code/apps/web/Dockerfile` | Copies the 9 missing Stitch files (23 in all). |
| `code/.dockerignore` | Lets those files into the build context. |
| `code/apps/web/src/web-image.test.ts` | New. AC 1 test (Dockerfile, `.dockerignore`, web source). |
| `code/packages/kernel/src/pin.ts`, `index.ts`, `kernel.test.ts` | `PIN_LENGTH`, `LEGACY_PIN_LENGTH` and their test. |
| `code/apps/api/src/pin-session.ts`, `pin.controller.ts` | Set needs six digits; unlock takes four or six. |
| `code/apps/api/src/pin.test.ts`, `life-pause.test.ts` | Six-digit PINs; new set/unlock length test. |
| `code/apps/api/src/profile.controller.ts`, `profile.test.ts` | `Cache-Control: no-store` on the profile read and writes, and its test. |
| `code/apps/web/src/v2-client.ts` | `pinScript` (length, read before leave), `profileScript` (no-store reads, restore and image-error repair, pre-PIN save, `next`), `reviewScript` (no-store read). |
| `code/apps/web/src/v2-pages.ts` | The three `aria-label`s. |
| `code/apps/web/src/profile-edit-page.test.ts` | Harness extended; 11 new tests (AC 2, 3, 4, labels); the existing PIN test now expects `next`. |
| `code/apps/web/src/pin-screen.test.ts` | New. Runs the PIN script (AC 3 `next`, AC 5). |
| `code/apps/web/src/profile-edit-back.test.ts` | New. Real Chromium and a real HTTP cache (AC 2 Back after expiry). Skips only when no Chromium binary is found. |
| `code/apps/web/src/v2-flow.test.ts` | PIN length assertions moved to six. |
| `code/e2e/profile-edit-flow.spec.ts` | New e2e spec (AC 1, 2, 3, 4, 5). |
| `_bmad-output/implementation-artifacts/spec-fix-profile-edit-flow.md` | The story spec. |

No migration, flag or env var. No new dependency, endpoint, field or copy.

## How to run

From `code/`:

```bash
npm ci
npm run lint && npm run typecheck && npm run build
npm run test:unit
npx vitest run --config vitest.unit.config.ts apps/web/src/web-image.test.ts apps/web/src/pin-screen.test.ts \
  apps/web/src/profile-edit-page.test.ts apps/web/src/profile-edit-back.test.ts apps/api/src/pin.test.ts apps/api/src/profile.test.ts
npx playwright test e2e/profile-edit-flow.spec.ts          # web only, port 3100
E2E_BASE_URL=http://localhost:4012 npm run test:e2e        # against the local Docker stack
```

`profile-edit-back.test.ts` needs a Chromium binary. It looks at `ANKANU_CHROME`, the system Chrome/Chromium paths, `~/.cache/ms-playwright` and `PLAYWRIGHT_BROWSERS_PATH` (after `npx playwright install chromium` it finds it on its own).

Full stack: follow "Local deployment" in `.factory/config.md` (`up -d --build --wait`, migrate, create the bucket). Then, as a disposable member who passed the signup gate:

1. Open `/profile-edit`, add a photo. The page goes to `/profile-review` (200, « Délai habituel de modération : 24 heures »).
2. Wait more than 60 s (`signed_url_ttl_seconds`), press Back. The photo shows; no `/v1/media/get` answers 403.
3. Type a new « Origine / Région d'attache » without saving, tap « Activer le code PIN d'accès ». The page saves, then opens `/pin?next=%2Fprofile-edit`.
4. Type six digits. On the sixth the page returns to `/profile-edit`; the origin is still there and the switch is on.
5. Open `/decouvrir` and `/favoris`: both 200.

## AC trace table

| ID | Criterion (short) | How it is proven | Status |
| --- | --- | --- | --- |
| AC 1 | `/profile-review` renders from the image, not 500 | `web-image.test.ts` › "copies every Stitch file the web reads at runtime into the image" (failed on main with 9 missing files) and › "keeps every copied Stitch file in the build context that .dockerignore allows" (failed before the `.dockerignore` change). Built image: all 23 read files present; real member `GET /profile-review` 200 | Done, run |
| AC 1 | `/decouvrir` renders from the image (57-discover) | Same two tests (`57-discover/screen.html`, `57-discover/grid.html`) and › "finds the screens the web reads, including the review, discover grid and filter screens". Built image: real member `GET /decouvrir` 200 | Done, run |
| AC 1 | `/favoris` renders from the image (17-favourites) | Same tests (`17-favourites/screen.html`). Built image: real member `GET /favoris` 200 | Done, run |
| AC 1 | Test fails for any runtime-read design file not copied | `web-image.test.ts` › "copies only Stitch files that exist and that the web still reads", › "reads design files only through the two parsed loaders", › "rejects a non-literal screen name and a copy to another path" | Done, run |
| AC 1 | Image e2e | `profile-edit-flow.spec.ts` › "web image screens › screens read from the image answer without a server error" (`/staff/visit-signals`, 52; runs only with `E2E_BASE_URL`) | Done, run on the stack |
| AC 2 | Profile read is `no-store` (API) | `profile.test.ts` › "answers the profile read and both writes with no-store, so a back navigation never reuses expired photo grants" (401, GET, PUT 200, PUT 400, PATCH) | Done, run |
| AC 2 | Page reads with `cache: 'no-store'` | `profile-edit-page.test.ts` › "reads the profile and the PIN state without the HTTP cache" | Done, run |
| AC 2 | Back after expiry in a real browser | `profile-edit-back.test.ts` › "reads fresh grants on Back instead of the cached profile, so no photo is broken" (fails with main's script, and with this script minus `no-store`) | Done, run |
| AC 2 | Back/forward cache restore | `profile-edit-page.test.ts` › "reads fresh photo grants when the page comes back from the back/forward cache"; e2e › "a page restored from the back/forward cache reads fresh photo grants" | Done, run |
| AC 2 | Expired grant repaired without reload, bounded | `profile-edit-page.test.ts` › "repairs a photo whose signed URL failed, at most twice per page view"; e2e › "a photo whose signed URL expired is read again and shown without a reload" | Done, run |
| AC 2 | TTL and privacy unchanged | `profile-edit-page.test.ts` › "keeps the blur rule and the owner preview URL as the API sends them"; no change to `media.ts` or the TTL | Done, run |
| AC 2 | Real stack | Browser walk at 360: upload → `/profile-review` → 65 s → Back: photo loaded, the only media answer is `200` | Done, run |
| AC 3 | PIN switch opens `/pin?next=%2Fprofile-edit` | `profile-edit-page.test.ts` › "opens pin setup when the access code is turned on", › "returns to the profile from the PIN screen and sends no save when nothing changed" | Done, run |
| AC 3 | `/pin` returns to `next` after the PIN is saved | `pin-screen.test.ts` › "fills all six dots and saves a new PIN only after the sixth digit"; e2e › "turning the PIN on saves unsaved edits, sets a six-digit PIN and returns to the profile" | Done, run |
| AC 3 | Same-origin `next` only | `pin-screen.test.ts` › "returns only to a same-origin path" (`//`, `/\`, `https://`, empty); e2e › "the PIN screen never returns to another origin" | Done, run |
| AC 4 | Unsaved edits saved before `/pin` | `profile-edit-page.test.ts` › "saves unsaved edits through the profile save before opening the PIN screen" (also double tap, untick); e2e (first PIN test: PUT body has the edit; value present on return) | Done, run |
| AC 4 | No second save after an explicit save | › "does not save again after the member already saved her edits" | Done, run |
| AC 4 | Save fails: stay, error line, switch off | › "stays on the profile with the save error and the switch off when the save fails" (400 with message, network → « Enregistrement impossible. »); e2e › "a refused save keeps the member on the profile with the error and the PIN off" | Done, run |
| AC 4 | Early edits / failed first read | › "waits for the profile read before saving edits typed early, and stays when that read fails" | Done, run |
| AC 4 | Back/forward restore shows the real PIN state | › "shows the real PIN state again when the page comes back from the back/forward cache" | Done, run |
| AC 5 | One shared constant | `kernel.test.ts` › "is six digits for a new PIN and keeps four only for a PIN saved before that rule"; `pin-screen.test.ts` › "uses the six slots of the Stitch screen and the shared kernel length" | Done, run |
| AC 5 | `PUT /v1/pin` exactly six; unlock four or six | `pin.test.ts` › "sets only a six-digit PIN and still unlocks a four-digit PIN saved before that rule" (4, 5, 7 digits, letters, empty → 400; legacy hash unlocks; wrong legacy → `PIN_INVALID`; after a new six-digit PIN the old one is refused) | Done, run |
| AC 5 | Client submits only after the sixth digit | `pin-screen.test.ts` › "fills all six dots and saves a new PIN only after the sixth digit", › "unlocks a six-digit PIN on the sixth digit and a stored four-digit PIN with the unlock button"; `v2-flow.test.ts` › "asks for a reset link and unlocks a six-digit PIN" | Done, run |
| AC 5 | Legacy four-digit unlock on screen | e2e › "a PIN saved with four digits before the six-digit rule still unlocks with the unlock button" | Done, run |
| AC 5 | Refused PIN clears; write not cancelled | `pin-screen.test.ts` › "clears the dots and stays after a refused PIN", › "reads the answer to the write before leaving, so the browser does not cancel it" | Done, run |
| NFR a11y | Zero serious/critical axe violations on `/profile-edit` and `/pin` | Every e2e test above calls `expectAccessible`; `profile-edit-page.test.ts` › "names the PIN switch, the blur switch and the photo picker with their screen copy" | Done, run (see known issues: unstyled sandbox) |
| NFR responsive | No horizontal scroll at 360 and 1440 | Browser walk on the stack: `overflow=0` on `/profile-edit`, `/profile-review`, `/pin` at 360 and 1440 | Done, run |
| NFR security | `next` stays same-origin; no new endpoint; PIN rule server-side | AC 3 and AC 5 rows | Done, run |
| NFR privacy | Blur and owner preview unchanged; no media cached | AC 2 privacy row | Done, run |

## Test cases for QA

| # | Input | Expected |
| --- | --- | --- |
| 1 | Built stack, member with a pending photo: `GET /profile-review` | 200, Stitch 12, « Délai habituel de modération : 24 heures » |
| 2 | Built stack, signed-in member: `GET /decouvrir`, `/decouvrir?vue=grille`, `/favoris` | 200 each, no `is not on disk` in the web log |
| 3 | `npx vitest run --config vitest.unit.config.ts apps/web/src/web-image.test.ts` after removing one `COPY` line, or one `!design-stitch/…` line from `.dockerignore` | Fails, naming the file |
| 4 | Upload a photo on `/profile-edit`, stay on `/profile-review` over 60 s, Back | Photo visible; no 403 from `/v1/media/get`; no reload |
| 5 | `/profile-edit` with a photo, wait over 60 s, then in DevTools run `img = document.querySelector('#profile-photo-grid img'); img.src = img.src + '&again=1'` (same expired token) | One 403, then a profile re-read and the photo shows with a new token. Repeated failures stop after two repairs per page view; never a loop |
| 6 | `curl -sD - -o /dev/null -H 'cookie: …' $BASE/v1/me/profile` | `cache-control: no-store` |
| 7 | No edits, tap « Activer le code PIN d'accès » | `/pin?next=%2Fprofile-edit`, no `PUT /v1/me/profile` |
| 8 | Edit « Origine / Région d'attache », tap the PIN switch | One `PUT /v1/me/profile` with the edit, then `/pin?next=%2Fprofile-edit` |
| 9 | Same, with a value the API refuses (for example an under-age date of birth) | Stays on `/profile-edit`, switch off, edits kept, API message on the save line |
| 10 | Same, API down (network error) | Stays, switch off, « Enregistrement impossible. » |
| 11 | Double tap the PIN switch with edits | One save, one navigation |
| 12 | On `/pin` with no PIN set: type 4 digits, tap « Déverrouiller l'espace » | Nothing sent; 4 dots stay |
| 13 | Type 5 digits | Nothing sent; 5 dots |
| 14 | Type the 6th digit | `PUT /v1/pin` with six digits, back to `/profile-edit` with the switch on |
| 15 | `PUT /v1/pin` with `1234`, `12345`, `1234567`, `abcdef`, `{}` | 400, `pin : six chiffres sont requis.` |
| 16 | Account with a stored four-digit PIN (set with the `main` build, or an argon2 hash of four digits written to `pin_lock`): type 4 digits, « Déverrouiller l'espace » | Unlocks, goes to `next` |
| 17 | Same account sets a new six-digit PIN, then tries the old four digits | `PIN_INVALID`; the six-digit PIN unlocks |
| 18 | `/pin?next=%2F%2Fevil.example`, `/pin?next=https%3A%2F%2Fevil.example`, `/pin?next=%2F%5Cevil.example` | Goes to `/onboarding` after the PIN |
| 19 | Screen reader or keyboard only on `/profile-edit` | The PIN switch, the blur switch and the photo picker are announced by their screen copy |

## Out of scope

- `/profil`, `/discussions` and `/invitations` answer `401 UNAUTHENTICATED` (JSON) for a real member on the built stack. They are member-route placeholders (`memberRouteResponse`), unchanged here and not Stitch reads.
- Other screens that navigate right after a write without reading the answer (sign-up steps, settings) were not changed; only the PIN screen was, because its e2e caught it.
- The Stitch copy « Exige un code à 4 ou 6 chiffres à chaque réouverture de la session. » on `/profile-edit` is unchanged (copy only from Stitch). With this change a new PIN is always six digits; Fay may want the copy updated in the design.
- The old `design-stitch/11-auth/` … `17-id-liveness/` allow-list entries in `code/.dockerignore` (the pre-v2 Stitch folders) were left as they are; nothing copies them.

## Assumptions and known issues

- **Reading of AC 1.** "Any page that reads a Stitch screen at runtime" covers both loaders (`stitchFile`, `loadStitch`) and every literal screen name in the web runtime source. The test also checks `.dockerignore`, since a file the Dockerfile copies but the context leaves out breaks the build instead. `deferred-work.md`'s Dockerfile drift entry is now covered by this test.
- **AC 1 e2e.** `/profile-review`, `/decouvrir` and `/favoris` need a real member past the signup gate, which the e2e suite cannot create (reCAPTCHA, emailed link, SMS code). The e2e covers the image through `/staff/visit-signals` (the staff stub cookie); the three member pages were checked on the built stack with a scripted disposable member (results below).
- **AC 2 e2e.** Playwright request routing turns off the HTTP cache, so the e2e test sends the `pageshow` event a restore sends. The real-cache Back case runs in `profile-edit-back.test.ts` (Chromium, local server) and in the browser walk on the stack.
- **AC 5 API message.** The field message changed from `pin : quatre chiffres sont requis.` to `pin : six chiffres sont requis.`.
- **Sandbox limits.** The Tailwind CDN, Google Fonts and Google (reCAPTCHA) are blocked here, so the Stitch screens render unstyled and the browser logs `tailwind is not defined`. In round 1 two e2e helpers left the keypad and the small text buttons out of the axe target-size rule when `'tailwind' in window` was false; round 2 removed that (see Round 2, finding 1). The full-stack runs used `E2E_ALLOW_ERRORS` for the blocked CDN and reCAPTCHA hosts. The api container could not reach Google's `siteverify`, so my scratch compose override (outside the repo) loaded `dist/test-recaptcha.js` (`token === 'test-ok'`, as the unit suites do) to sign up disposable members. The real images were built from scratch copies of the repo Dockerfiles that only add the proxy CA for `npm ci`.
- **favicon known issue is pinned to port 3100.** `e2e/known-issues.ts` tolerates `localhost:3100/favicon.ico` only. Against any other base URL (my stack on 4031, Fay's on 4012, staging if it serves no favicon) every smoke and auth-entry test fails on the favicon 404 (20 tests on my stack run). Pre-existing, not changed here; my full-stack run added `localhost:4031/favicon\.ico` to `E2E_ALLOW_ERRORS`. The orchestrator should decide whether that entry should match any origin.
- **Integration.** `compose.test.ts` fails in this sandbox because the repo's api Dockerfile runs `npm ci` without the sandbox proxy CA (`SELF_SIGNED_CERT_IN_CHAIN`); the other four integration files pass. It does not depend on this change.
- **Pre-existing browser unit failures (environment).** With a Chromium binary, `photo-rules.test.ts`, the ANK-148 width test and the `v2-responsive` scrollWidth test also fail on a `main` snapshot in the same sandbox (unstyled pages, blocked CDN). Running the browser unit tests also rewrites evidence PNGs under `code/docs/qa-handoffs/*-widths/`; I restored them and did not commit them.

## Self-check results

All on the merged branch (`origin/main` at `d60e97e` merged), in this cloud sandbox, 2026-10-22. Logs are not committed.

**Lint, typecheck, build**

```
npm run lint        -> exit 0, 0 errors, 3 warnings (photo-rules.test.ts no-this-alias, life-pause.ts no-control-regex, v2-flow.test.ts unused editBtn; all pre-existing, none in changed lines)
npm run typecheck   -> exit 0
npm run build       -> exit 0
(apps/web) npx next build -> exit 0
```

**Unit, full suite with a Chromium binary** (`npm run test:unit`)

```
 Test Files  3 failed | 63 passed (66)
      Tests  3 failed | 411 passed (414)
 FAIL  apps/web/src/ank-148-fix.test.ts > founder staging fixes > wires onboarding, the browse hold, and the first photo, and fits six widths
 FAIL  apps/web/src/photo-rules.test.ts > photo rules > keeps a 32px play circle in Chrome and opens profile edit from the acknowledgement button
 FAIL  apps/web/src/v2-responsive.test.ts > v2 screens fit the required widths > keeps scrollWidth within the viewport at every required width
```

The same three fail with the same errors on a `main` snapshot in the same sandbox (`expected 'undefined' to contain 'règles'`, `Test timed out in 5000ms`, `Test timed out in 360000ms`): unstyled pages with the Tailwind CDN blocked, and a slow width sweep. Without a Chromium binary (as on `main` before this work) the suite was `1 failed | 370 passed | 12 skipped`, the one failure being `photo-rules.test.ts` looking for the binary.

**Unit, this story's files**

```
npx vitest run --config vitest.unit.config.ts web-image pin-screen profile-edit-page profile-edit-back pin profile life-pause kernel v2-flow
 Test Files  9 passed (9)
      Tests  102 passed (102)
```

Fail-first evidence: `web-image.test.ts` failed on `main` listing the 9 files (and again on the 9 `.dockerignore` entries before that change); 11 of the new `profile-edit-page.test.ts` tests fail with `main`'s page script; `profile-edit-back.test.ts` fails with `main`'s script and with this script minus `no-store`; the new `pin.test.ts`, `profile.test.ts` and `pin-screen.test.ts` tests fail on `main`'s API and client (four-digit set, no `Cache-Control`, submit on the fourth digit, no read before leaving).

**Integration** (`npm run test:integration`, Docker, no other stack running)

```
 FAIL  apps/api/src/compose.test.ts > docker compose up
 target api: failed to solve: process "/bin/sh -c npm ci --omit=dev" did not complete successfully: exit code: 1
 Test Files  1 failed | 4 passed (5)
      Tests  25 passed | 2 skipped (27)
```

`compose.test.ts` cannot build the api image here (`npm ci` behind the sandbox proxy CA); see known issues.

**E2E, web only** (`npm run test:e2e`, port 3100, `E2E_ALLOW_ERRORS` for the blocked CDN and reCAPTCHA hosts)

```
  10 skipped
  36 passed (47.5s)
```

`e2e/profile-edit-flow.spec.ts` alone, web only: 12 passed, 2 skipped (the image test needs `E2E_BASE_URL`). With `main`'s client the same spec had 6 failures.

**Built Docker stack** (my own compose project `ankanu-dev3`, web on `localhost:4031`, images built from this branch, migrations applied, bucket created; env and override files outside the repo; stack, volumes and images removed afterwards)

Every file the web reads is in the web image: `23 ok` (none missing) for the 23 parsed `stitchFile`/`loadStitch` names, checked under `/app/design-stitch/ankanu-v2/` in the image.

Disposable member (signup gate walked with the log mail and SMS adapters, one pending profile photo):

```
first profile photo: 201 {"id":"…","kind":"profile_photo","moderation_state":"pending",…
profile read cache-control: cache-control: no-store
GET /profile-review -> 200 Délai habituel de modération : 24 heures
GET /profile-edit -> 200 Activer le code PIN d'accès
GET /decouvrir -> 200
GET /favoris -> 200
GET /pin -> 200 pin-dot
```

Titles: `/profile-review` « AnKanu — Espace Personnel & Statut du Profil », `/decouvrir` « AnKanu - Découvrir », `/favoris` « Mes profils mis en réserve — AnKanu | Ta'aruf & Mariage Noble ». `/decouvrir?vue=grille`, `/onboarding`, `/settings`, `/photo-rules`, `/splash`, `/password-reset` also 200; no `not on disk` line in the web log.

```
E2E_BASE_URL=http://localhost:4031 npx playwright test e2e/profile-edit-flow.spec.ts  -> 14 passed (23.5s)
E2E_BASE_URL=http://localhost:4031 npm run test:e2e (+ localhost:4031/favicon\.ico in E2E_ALLOW_ERRORS) -> 38 passed, 8 skipped
```

The first full-stack run of my spec found two things the web-only run could not, both fixed in `f1e86aa`: the PIN write reported as `net::ERR_ABORTED` (the page now reads the answer before leaving), and the refused-save test clearing the console log before the browser had written it. Without the favicon pattern the full suite had 20 failures, all `404 … localhost:4031/favicon.ico` (see known issues).

**Browser walk on the stack** (Chromium, real member, real API, no request routing; widths 360 and 1440)

```
[360] profile-edit http://localhost:4031/profile-edit overflow=0
[360] after upload http://localhost:4031/profile-review overflow=0
[360] waiting 65 s, past signed_url_ttl_seconds = 60
[360] back http://localhost:4031/profile-edit
[360] photo loaded after back: true src=/v1/media/get?token=…
[360] media answers after back: ["200 http://localhost:4031/v1/media/get?token=…"]
[360] after PIN switch http://localhost:4031/pin?next=%2Fprofile-edit
[360] pin overflow=0 dots=6
[360] after 5 digits still http://localhost:4031/pin?next=%2Fprofile-edit
[360] after 6th digit http://localhost:4031/profile-edit
[360] origin=Kadiogo pinChecked=true overflow=0
[1440] profile-edit http://localhost:4031/profile-edit overflow=0
[1440] after PIN switch http://localhost:4031/pin?next=%2Fprofile-edit
[1440] pin overflow=0 dots=6
[1440] after 5 digits still http://localhost:4031/pin?next=%2Fprofile-edit
[1440] after 6th digit http://localhost:4031/profile-edit
[1440] origin=Kadiogo pinChecked=true overflow=0
```

The only browser errors in the walk were `tailwind is not defined` (CDN blocked). No failed request, no 4xx or 5xx from our origin. The pages render unstyled here, so I could not compare them with the Stitch captures visually; the markup is the Stitch HTML plus the three `aria-label`s.

## Round 2 (QA round 1: FAIL)

QA report: `docs/qa-handoffs/fix-profile-edit-flow-qa-report.md` (evidence in `fix-profile-edit-flow-evidence/`). This round fixes findings 1, 2, 3 and 6, and the cheap minors 7, 9, 11 and 14. Finding 8 (the Stitch copy « Exige un code à 4 ou 6 chiffres… ») is unchanged; the orchestrator raises it with Fay. Findings 4 (outside the PIN screen), 5, 10, 12, 13 and 15 are left as they are, as asked. `origin/main` has not moved since round 1 (`d60e97e`, already merged).

| QA finding | Fix | Test that fails without it |
| --- | --- | --- |
| 1 Major: new e2e spec red when styled | PIN screen markup: the backspace icon is an empty `aria-hidden` span drawn from `data-icon` (no ligature text in the accessible name), `#btn-clear` and the status hint move from `/60` and `/50` to `text-deep-navy/70`, and the hint's icon is `aria-hidden`. The spec now refuses an unstyled page and checks everything else; pre-existing Stitch contrast issues on `/profile-edit` are excluded by named selector with exact counts | `e2e/profile-edit-flow.spec.ts`, styled: 18 of 18 on the stack. Round 1 code: 12 of 12 red (QA). `v2-flow.test.ts` › "asks for a reset link and unlocks a six-digit PIN" pins the PIN markup |
| 2 Major: `/pin?next=` open redirect | `nextPath()` in `pinScript`: `next` must start with `/`, have no control character and no backslash, and `new URL(next, location.origin)` must keep this origin with a path that starts with a single `/`; otherwise `/onboarding` | `pin-screen.test.ts` › "returns only to a same-origin path" (22 cases); e2e › "the PIN screen never returns to another origin" (8 cases) |
| 3 Major: refused pre-PIN save shown off screen | New `#profile-pin-status` (`role="alert"`) right under the PIN switch, scrolled into view; the bottom save line stays hidden for this case. Cleared on the next switch tap and on a successful save | `profile-edit-page.test.ts` › "stays on the profile with the save error and the switch off when the save fails", › "waits for the profile read…", › "puts a status line right under the PIN switch, read out when written"; e2e › "a refused save keeps the member on the profile, PIN off, with the reason on screen beside the switch at 390 px" and "…at 1440 px" (`toBeInViewport`) |
| 6 Major, pre-existing: locked session sent to `/auth` | `entry-guard.ts`: a gate `401` whose code is `PIN_REQUIRED` is a new step `locked`. A locked session gets `/pin`; any other member page answers 303 to `/pin?next=<path>`; sign-in, sign-up and password reset stay open. Any other 401 is still signed out (`/auth`) | New `pin-locked-entry.test.ts` (4 tests; 3 fail on the round 1 guard, the 4th pins that a signed-out visitor still goes to `/auth`) |
| 7 Minor: wrong PIN and lockout silent | The PIN screen writes the API's message into the Stitch status hint (`role="status"`): « Code incorrect. », « Session verrouillée. », then « Authentification requise. »; the Stitch progress line « Validation du code en cours... » while checking; « La connexion a échoué. » (existing string) on a network error | `pin-screen.test.ts` › "clears the dots, stays and says why after a refused PIN", › "says the session is locked after the last wrong PIN…", › "shows the Stitch progress line…"; e2e › "a wrong PIN and the lockout are said on the PIN screen" |
| 9 Minor: no hint below six digits | Setting a PIN, « Déverrouiller l'espace » with fewer than six digits shows `pin : six chiffres sont requis.` and keeps the digits; the next key restores the resting hint | `pin-screen.test.ts` › "fills all six dots and saves a new PIN only after the sixth digit"; e2e first test |
| 11 Minor: direct design read in a reader not caught | `web-image.test.ts` › `loaderBypasses()`: in `v2-serve.ts` and `discover-page.ts`, only the loader's own `readFileSync(found, …)` may read; any other `readFileSync`/`readFile`/`createReadStream`/`openSync`, or an `ankanu-v2/` path not built from the loader's name, fails | QA's mutation M6 now fails › "reads design files only through the two parsed loaders"; new › "catches a design file read directly inside a reader" |
| 14 Minor: unlock length message | `@ankanu/kernel` `PIN_SET_LENGTH_MESSAGE` and `PIN_UNLOCK_LENGTH_MESSAGE` (`pin : quatre ou six chiffres sont requis.`); the API's unlock refusal and the screen use it | `kernel.test.ts` › "names the lengths each refusal accepts…"; `pin.test.ts` › "sets only a six-digit PIN and still unlocks…" (five digits at unlock) |

Also changed on the PIN screen: « S'identifier à nouveau » pointed at `#`; it now goes to `/auth`, which a locked session can open. The new unlock message is the only new copy, written on the pattern of the existing `pin : six chiffres sont requis.`; Fay may want to word it.

### Finding 1 in detail

- `expectAccessibleAsShipped` replaces round 1's `accessibleAsShipped`. It first polls `'tailwind' in window` and fails with « The Tailwind CDN did not load, so the Stitch screen is unstyled and cannot be checked as shipped. » So the spec now fails on a machine that cannot reach the CDN (this sandbox) unless Tailwind is served locally, instead of passing with weaker checks. No axe rule is turned off anywhere.
- `/pin` runs axe with no exclusion at all.
- `/profile-edit` excludes only `PROFILE_EDIT_PRE_EXISTING`, commented as known pre-existing issues (QA round 1, finding 4). Each selector must match exactly its count, so an exclusion cannot grow to cover a new element, and the test fails if any element this story added or changed (`#profile-pin`, `#profile-pin-status`, `#profile-photo-blur`, `#profile-photo-file`, `#profile-photo-grid`, `#profile-save-status`) sits inside one:

  | Selector | Count | What (axe `color-contrast`, Stitch markup) |
  | --- | --- | --- |
  | `p.text-xs.text-deep-navy\/60.mt-1` | 8 | section subtitles (4.34:1) |
  | `span.text-\[11px\].text-deep-navy\/60` | 1 | « Condition formelle préalable » |
  | `p.text-\[11px\].text-deep-navy\/60` | 1 | « Mentionnez vos perspectives de vie commune… » |
  | `span[data-icon="lock"]` | 1 | lock icon of « Sécurité sur l'appareil » |
  | `span[data-icon="check_circle"]` | 1 | gold check in the madhhab block |
  | `span.material-symbols-outlined.text-\[13px\].text-soft-gold` | 1 | gold cake icon beside the age |
  | `span.material-symbols-outlined.text-deep-navy\/40` | 1 | calendar icon in the date field |
  | `#profile-meter-banner span[data-icon="info"]` | 1 | gold info icon of the « Il manque » banner (found on the real stack) |

  I kept the list in the spec rather than `e2e/known-issues.ts`, which holds console and request patterns, as the round 2 instruction allowed (named selectors with a comment). Moving it there is a small change if the orchestrator prefers.
- Not covered by these exclusions and not seen by the e2e (its photos are approved): the gold « En revue » badge on a pending photo tile is also below 4.5:1 on the real stack. Pre-existing (same on `main`), part of finding 4.
- How to run it styled where the CDN is blocked (as QA did, `fix-profile-edit-flow-evidence/scripts/tailwind-build.mjs`, `cdn-stub-server.mjs`, `chrome-wrap.sh`): in a scratch folder outside the repo, install `tailwindcss@3.4.17`, `@tailwindcss/forms` and `@tailwindcss/container-queries`; compile the CSS from the Stitch `tailwind.config` of `11-profile-edit`, scanning the three Stitch screens and `v2-pages.ts`, `v2-client.ts`, `v2-document.ts`; wrap it in a script that sets `window.tailwind` and injects the CSS; serve it over HTTPS (self-signed) for `cdn.tailwindcss.com` and `fonts.googleapis.com`; then point Playwright at a Chromium wrapper with `--host-resolver-rules="MAP cdn.tailwindcss.com 127.0.0.1:<port>, MAP fonts.googleapis.com 127.0.0.1:<port>, MAP * ~NOTFOUND, EXCLUDE localhost, EXCLUDE 127.0.0.1" --ignore-certificate-errors --no-proxy-server` via `PLAYWRIGHT_CHROMIUM_EXECUTABLE`. `MAP * ~NOTFOUND` makes other blocked hosts fail fast instead of hanging the load event. On a machine with internet (Fay's, CI) nothing is needed.

### Finding 3 on the real stack

Real member whose save the API refuses (no marital status), Chromium on the stack, styled:

```
[390]  refused save: url=http://localhost:4031/profile-edit alert="marital_status : la situation matrimoniale est requise." top=480 bottom=496 viewport=844 inView=true switchChecked=false overflow=0
[1440] refused save: url=http://localhost:4031/profile-edit alert="marital_status : la situation matrimoniale est requise." top=500 bottom=516 viewport=900 inView=true switchChecked=false overflow=0
[390]  profile-edit axe (pre-existing excluded): []
[1440] profile-edit axe (pre-existing excluded): []
```

### Finding 6 on the real stack

Real member, PIN `135790` set, then `POST /v1/pin/lock` (`curl` with the session cookie, web on 4031):

```
GET /v1/accounts/gate -> 401 PIN_REQUIRED
200 <- GET /pin
200 <- GET /pin?next=%2Fdecouvrir
303 /pin?next=%2Fdecouvrir      <- GET /decouvrir
303 /pin?next=%2Fprofile-edit   <- GET /profile-edit
303 /pin?next=%2Ffavoris        <- GET /favoris
303 /pin?next=%2Fprofile-review <- GET /profile-review
303 /pin?next=%2Fsettings       <- GET /settings
200 <- GET /auth
unlock 5 digits -> 400 "pin : quatre ou six chiffres sont requis."
unlock wrong    -> 400 PIN_INVALID "Code incorrect." attempts_left 4
unlock right    -> {"locked":false}
200 <- GET /decouvrir
no cookie or unknown session: 303 /auth <- GET /pin
```

In Chromium on the same stack, at 390 and 1440: a locked member opening `/decouvrir` lands on `/pin?next=%2Fdecouvrir`, axe finds nothing on `/pin` (also after a wrong PIN, which shows « Code incorrect. »), the right PIN returns to `/decouvrir`, and the `next` values `/%09/evil.example/x`, `%0A`, `%0D`, `/%09\evil.example` and `/.//evil.example` all end on `/onboarding` (all five at 390; only the tab case at 1440, because of the rate limit below).

Stack note: the API's auth rate limit (`rl_auth_per_min`) counts per IP, and through the web proxy every member shares one bucket, so scripted walks that sign in and unlock many times in a minute get `429 RATE_LIMITED`. I waited it out; nothing changed.

### Round 2 self-check results

On the branch with `origin/main` at `d60e97e` merged, this sandbox, 2026-10-22.

```
npm run lint        -> exit 0 (the same 3 pre-existing warnings)
npm run typecheck   -> exit 0
npm run build       -> exit 0
npm run build -w @ankanu/web (next build) -> exit 0
npm run test:unit (with Chromium) -> Tests 3 failed | 420 passed (423)
   the same 3 environment failures as round 1 and main: ank-148-fix, photo-rules, v2-responsive
npm run test:integration -> 25 passed, 2 skipped; compose.test.ts fails at the api image's npm ci, as in round 1
```

Fail-first: with the round 1 `v2-client.ts`, `v2-pages.ts`, `entry-guard.ts` and `pin-session.ts` put back, 14 of the 73 tests in `pin-screen`, `pin-locked-entry`, `profile-edit-page`, `v2-flow` and `pin.test.ts` fail (redirect cases, PIN feedback, the status line under the switch, the locked step, the unlock message). QA's M6 mutation in `discover-page.ts` fails `web-image.test.ts`.

E2E, styled (local Tailwind as above; `E2E_ALLOW_ERRORS` for the blocked reCAPTCHA script, and the 4031 favicon on the stack):

```
web only, port 3100:  e2e/profile-edit-flow.spec.ts -> 16 passed, 2 skipped (the image test needs E2E_BASE_URL)
web only, full suite  -> 35 passed, 5 failed, 10 skipped
stack, port 4031:     e2e/profile-edit-flow.spec.ts -> 18 passed
stack, full suite     -> 37 passed, 5 failed, 8 skipped
```

The 5 failures are the same in both full runs and are all in `e2e/smoke.spec.ts`, on pages this story does not touch: `/auth` and `/password-reset` axe (desktop and mobile; `label-content-name-mismatch` on the password toggle, `color-contrast` on the `lock_reset`, gold `.shrink-0` and mail icons) and `/` « fits every factory width » on desktop (`scrollWidth 1068 > 1024`). The markup, scripts and spec for those pages are unchanged from `origin/main`, and the local Tailwind build only scans the screens this story touches, so those pages are only partly styled in it; QA also saw the styled full suite fail existing tests. Unstyled (CDN blocked, no local Tailwind), the new spec now fails at its first accessibility check with the « Tailwind CDN did not load » message, by design.

The stack (`ankanu-dev3`), its volumes and images, the scratch Postgres folders, the dev server and my CDN stub are removed or stopped. Files changed in this round: `packages/kernel/src/pin.ts`, `index.ts`, `kernel.test.ts`; `apps/api/src/pin-session.ts`, `pin.test.ts`; `apps/web/src/entry-guard.ts`, `v2-client.ts`, `v2-pages.ts`, `pin-screen.test.ts`, `pin-locked-entry.test.ts` (new), `profile-edit-page.test.ts`, `v2-flow.test.ts`, `web-image.test.ts`; `e2e/profile-edit-flow.spec.ts`; the spec (AC 3, 4 and 5 updated, AC 6 added) and this handoff.
