---
title: 'Fix the profile edit flow: review page, photos after back, PIN return, unsaved edits, six-digit PIN'
type: 'bugfix'
created: '2026-10-22'
status: 'ready'
route: 'factory'
story_id: 'fix-profile-edit-flow'
---

## Intent

**Problem:** Fay tested the local stack (`http://localhost:4012`) on `main` and found five faults around `/profile-edit`:

1. `/profile-review` answers 500. The web image copies only 14 Stitch screens (`code/apps/web/Dockerfile`), but `apps/web/src/v2-serve.ts` also reads `12-profile-not-yet-public` (and other screens), so the web log says `code/design-stitch/ankanu-v2/12-profile-not-yet-public/screen.html is not on disk`. `deferred-work.md` already flags this drift: no test ties the Dockerfile to the files the web reads.
2. After uploading a photo and going back to `/profile-edit`, photos sometimes show as broken images until a manual refresh.
3. Turning on "Activer le code PIN d'accès" opens `/pin`, which always returns to `/onboarding` after saving, because the link passes no `next`.
4. Turning the PIN on loses whatever the member typed but had not saved.
5. The PIN screen (Stitch `10-pin-lock`) shows six dots, but the client submits after four digits and the API accepts only four. Fay decided on 2026-10-22: the PIN is six digits.

**Approach:** Copy every Stitch file the web reads into the image and add a unit test that parses the Dockerfile and the web source. Make `GET /v1/me/profile` uncacheable and have `/profile-edit` re-read its signed photo URLs when the page is restored or an image fails. Send `/pin?next=/profile-edit` from the profile screen after saving pending edits through the existing `PUT /v1/me/profile`. One shared `PIN_LENGTH = 6` in `@ankanu/kernel`, used by the API and the web client; unlock still accepts a stored four-digit PIN.

## Boundaries & Constraints

**Always:**
- Signed URL TTL (`operator_config.signed_url_ttl_seconds`, capped at 60 s) and the photo privacy rules (blur for other members, AD-9, owner-only clear preview) stay exactly as they are.
- `/pin` keeps its `next` validation: a same-origin path only (`/x`, not `//x`, not `/\x`), otherwise `/onboarding`.
- Saving before the PIN uses the existing `PUT /v1/me/profile` with the same payload as "Enregistrer les modifications". No new fields, endpoints or copy.
- French UI copy only from the Stitch design or existing strings.
- No new dependencies. Never skip or weaken a test.

**Never:**
- Do not lengthen or shorten signed URL lifetimes, do not cache signed media in the page, and do not expose `original` or clear derivatives to anyone new.
- Do not reload the whole page or lose the member's edits to repair a photo.
- Do not navigate to `/pin` when the pre-PIN save fails.
- Do not refuse a stored four-digit PIN at unlock.

## Acceptance Criteria

1. **Given** the web image built from `code/apps/web/Dockerfile`, **when** a member opens `/profile-review` (or any page that reads a Stitch screen at runtime), **then** the screen file is in the image and the page renders, not 500. **And** a unit test fails if any `stitchFile(...)`/`loadStitch(...)` name (or another runtime-read design file) used by the web source is not copied by the Dockerfile.
2. **Given** a member on `/profile-edit` with photos, **when** the page is shown again from the back/forward cache, is loaded by a back/forward navigation, or an image's signed URL has expired, **then** the photo grid re-reads `/v1/me/profile` and shows fresh signed URLs without the member reloading, and no photo stays broken. `GET /v1/me/profile` answers `Cache-Control: no-store` and the page reads it with `cache: 'no-store'`. TTL and privacy rules are unchanged.
3. **Given** a member on `/profile-edit` without a PIN, **when** she turns on "Activer le code PIN d'accès" and saves a PIN on `/pin`, **then** she returns to `/profile-edit`. The existing `next` validation on `/pin` still refuses other origins.
4. **Given** a member who edited fields on `/profile-edit` without saving, **when** she turns on the PIN, **then** the edits are saved through `PUT /v1/me/profile` before `/pin` opens, and they are on the page when she returns. **When** that save fails, she stays on `/profile-edit`, the PIN switch goes back off, and the existing save error line shows the API message (or `Enregistrement impossible.`).
5. **Given** the PIN screen, **when** a member sets a new PIN, **then** all six dots fill and the client submits only after the sixth digit; `PUT /v1/pin` accepts exactly six digits and refuses four. **When** a member whose stored PIN is still four digits unlocks, **then** `POST /v1/pin/unlock` accepts four or six digits and her four-digit PIN still unlocks until she sets a new one; on the screen she unlocks with four digits and "Déverrouiller l'espace". The length is one constant in `@ankanu/kernel` used by the API and the web client.

## Code Map

- `code/apps/web/Dockerfile` — COPY lines for the Stitch files.
- `code/apps/web/src/v2-serve.ts`, `code/apps/web/src/discover-page.ts` — the two runtime readers of `code/design-stitch/ankanu-v2`.
- `code/apps/web/src/v2-client.ts` — `profileScript` (photos, PIN switch, pre-PIN save), `pinScript` (length, `next`), `reviewScript`.
- `code/apps/api/src/profile.controller.ts` — `Cache-Control: no-store` on the member profile read and writes.
- `code/apps/api/src/pin-session.ts` — `readPin` for set (six) and unlock (four or six).
- `code/packages/kernel/src/pin.ts` — `PIN_LENGTH`, `LEGACY_PIN_LENGTH`.
- Tests: `apps/web/src/web-image.test.ts` (new), `apps/web/src/profile-edit-page.test.ts`, `apps/web/src/pin-screen.test.ts` (new), `apps/web/src/v2-flow.test.ts`, `apps/api/src/pin.test.ts`, `apps/api/src/profile.test.ts`, `packages/kernel/src/kernel.test.ts`, `e2e/profile-edit-flow.spec.ts` (new).
