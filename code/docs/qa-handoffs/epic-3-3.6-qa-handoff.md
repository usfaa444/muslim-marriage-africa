# Epic 3 Story 3.6 QA handoff

## What was built

A human block of a Profile Photo writes one trust `strike` row with `ladder` `photo_floor`. `POST /v1/media` reads that floor before it decodes the image or stores anything. When the configured count is reached, the upload is refused with the existing `RATE_LIMITED` envelope until the block window ends. After the window, those rejects stop counting and a new floor needs that many new rejects.

Chat Photo rejects are not counted. That path is Epic 5 Story 5.3 (FR-063). The guard still runs for every `POST /v1/media`, so a later Chat upload inherits the refusal. This story does not add a Chat upload.

The operator editor for the floor is later (FR-140). This story only reads `operator_config.photo_strike_count` and `photo_strike_block_hours`.

## Where

- `code/apps/api/drizzle/0014_strike.sql` — catalog table `strike`. No `created_at`. No ladder check. `case_id` has no foreign key.
- `code/apps/api/src/account-schema.ts` — `strike`
- `code/apps/api/src/photo-strike.ts` — trust write `recordPhotoFloorStrike` and trust read `photoStrikeBlock`
- `code/apps/api/src/profile-review.ts` — a staff `profile_review` photo `block` writes the strike in the same transaction
- `code/apps/api/src/media.ts` — upload guard before decode
- `code/apps/api/src/media.controller.ts` and `code/apps/api/src/inbound-exception.filter.ts` — `Retry-After`
- `code/apps/web/src/v2-client.ts` — `#profile-save-status` sentence after a real refusal
- `code/apps/web/src/v2-pages.ts` — the existing status line wraps on a narrow screen

## How to run

From `code/`:

```bash
npx vitest run --config vitest.unit.config.ts --fileParallelism false apps/api/src/photo-strike.test.ts apps/api/src/media.test.ts apps/api/src/profile-review.test.ts apps/web/src/profile-edit-page.test.ts apps/web/src/v2-responsive.test.ts
npx vitest run --config vitest.integration.config.ts --fileParallelism false apps/api/src/operator-config.migrate.test.ts
npx tsc -p apps/api/tsconfig.json --noEmit
npx tsc -p apps/web/tsconfig.json --noEmit
npm run migration-check
```

On a running API and web app, sign in as a member, upload a profile photo, and have staff block it from `POST /v1/staff/cases` with `{ "kind": "profile_review" }`. Repeat until `photo_strike_count` blocks (seed 3). The next `POST /v1/media` returns 429 and `/profile-edit` shows the timed sentence only after that refusal. « Mettre à jour la photo » stays enabled. The previous live photo stays.

## Test cases

| Case | Input | Expected |
| --- | --- | --- |
| Under the floor | Two blocked Profile Photos, then `POST /v1/media` | 201. A `pending` photo is stored |
| At the floor | A third block, then another upload inside `photo_strike_block_hours` | 429 `RATE_LIMITED`, `retryable` true, `details.reason` `photo_strike`, `details.blocked_until` ISO UTC, `Retry-After` seconds. Message `Envoi de photos suspendu : 3 photos ont été refusées.` No new `photo_asset` and no object |
| Bad bytes while blocked | Upload `image` `@@@` during the block | 429, not 400. Nothing stored |
| Screen | That 429 on `/profile-edit` | `#profile-save-status` shows `Envoi de photos suspendu jusqu'au JJ/MM à HH:MM : N photos ont été refusées.` in local time. No new banner. The photo button stays enabled. An unparseable `blocked_until` shows the API `message` |
| Window end | Clock at `blocked_until`, then upload | 201. One new block after that does not refuse the next upload |
| Config | `photo_strike_count` `2` | The third upload is 429 and the message says `2` |
| Bad config | `photo_strike_count` or `photo_strike_block_hours` missing or not a positive integer | 503 `UNHANDLED`, `details.field` is that key, nothing stored |
| Bio | Staff blocks a bio and allows no photo | No `strike` row |
| Same asset | A second write for `photo_asset:<id>` | Still one row |
| Live photo | Block a replacement | The previous `live` photo and its signed blur stay. A strike does not blank it |
| Widths | Profile edit with the strike sentence visible | 360, 390, 768, 1024, 1280, 1440. `scrollWidth <= innerWidth`. Nothing sticks out |
| Stories 3.1–3.5 | Existing media, profile review, and profile edit tests | Still pass |

## Test data

Memory accounts created by the tests. Password `phrase avec espaces`. Staff role is `moderator`. Block reason `La photo ne respecte pas les règles publiées.` Seed config is `photo_strike_count` `3` and `photo_strike_block_hours` `24`. The count-2 case changes only the test reader, not the migration seed.

## My results

- `photo-strike.test.ts`: 4 passed. Two rejects still upload. The fourth upload is 429 with nothing stored. The window end accepts an upload, and one new reject does not block. Count 2 blocks at 2. A bio block writes no strike. A repeat of the same asset stays one row. The live photo and its blur grant stay.
- `media.test.ts` and `profile-review.test.ts`: passed in the same run as the first strike test (22 passed across those files before the session-clock fix; strike tests re-run 4 passed after it).
- `profile-edit-page.test.ts` and `v2-responsive.test.ts`: 10 passed. `13d-profile-strike` is inside the six widths.
- `tsc` for `apps/api` and `apps/web`: exit 0.
- `npm run migration-check`: `drizzle-kit check` reports the snapshots are fine.
- `operator-config.migrate.test.ts`: 9 passed. Postgres 17 applies `0014_strike` (15 migrations). A second insert of the same `photo_floor` evidence does nothing and leaves `case_id` null.

## Three validation passes

1. Behavior: trust writes one `photo_floor` strike per blocked Profile Photo. Media refuses with `RATE_LIMITED` before decode. The window resets. Config is read. A bio block and a repeat asset do not add a second row. The live photo stays.
2. Screen: `/profile-edit` is still `11-profile-edit`. The sentence uses the existing `#profile-save-status` line and only after a real refusal. No banner, no disabled button, no state tab, no demo toggle. Stitch HTML and PNG are unchanged.
3. Widths: Chrome checks `13d-profile-strike` with the other profile screens at 360, 390, 768, 1024, 1280, and 1440. `document.documentElement.scrollWidth <= window.innerWidth`.

## Solution-design sections

`strike` columns are `id`, `account_id`, `case_id`, `ladder`, `evidence`. `strike` N:1 `account` via `account_id`. `case_id` stays null. There is no `moderation_case` row and no profile column on `moderation_case` (board on [ANK-104](/ANK/issues/ANK-104)). Trust writes `strike`. Media writes `photo_asset`. Operator writes `operator_config`. Media reads the block through `photoStrikeBlock` and does not select `strike`. `POST /v1/media` uses the AD-7 envelope. The code is the existing `RATE_LIMITED`. Profile publish-gate behavior from AD-10 is unchanged.

## Stitch files

- `code/design-stitch/ankanu-v2/11-profile-edit/screen.html`
- `code/design-stitch/ankanu-v2/11-profile-edit/screen.png`

The board supplied the member sentence. It is not a new Stitch frame. Screen 11 and screen 12 routing from Story 3.4 is unchanged.

## Known gaps

- Chat Photo upload and Chat Photo rejects are Epic 5 Story 5.3 (FR-063). They are not counted here.
- Changing `photo_strike_count` and `photo_strike_block_hours` in an operator screen is FR-140. This story only reads them.
- The Report → Strike → Ban ladder (FR-085 / FR-087) is later. `ladder` has no check constraint so those values can be added later.
- `strike.case_id` has no foreign key because `moderation_case` does not exist yet.
- No deploy. No Story 3.7.
