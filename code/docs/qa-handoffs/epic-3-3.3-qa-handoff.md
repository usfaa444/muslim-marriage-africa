# Epic 3 Story 3.3 QA handoff

## What was built

A Profile, a pending profile photo, and a pending bio stay off other members' lists until a human allows them. The queue is the Profile row. This story does not insert `moderation_case`.

`profile` gains two nullable timestamps: `review_queued_at` and `review_passed_at`. `review_queued_at` is the SLA clock. Null means nothing is waiting. `review_passed_at` is the first human allow of the whole Profile. There is no stored Premium flag.

The clock starts only when it is null and an item appears: a profile save while `review_passed_at` is null, a `bio_pending` write, or a `profile_photo` upload. Media calls `ProfileStore.noteQueued` and does not write `profile`. A null visibility becomes `unpublished` on that first queue. `held`, `emergency_hidden`, and `public` stay as they are. A client cannot send visibility `public`.

`GET /v1/staff/cases?kind=profile_review` is moderator or operator. Any other role is `403`. Any other `kind` is `400` with `details.field` `kind`. Rows are profiles with `review_queued_at` set. `BillingPort.isEntitled === true` sorts first, then `review_queued_at` ascending. `false` and `unavailable` sort as Free and never hide a row. The default adapter returns `unavailable`. Each row has `account_id`, `pseudonym`, `priority` `premium` or `free`, `review_queued_at`, `sla_breach`, the profile fields, `bio_pending`, `bio_live`, and each pending `profile_photo` as `{ asset_id, blur_url }`. The blur URL is signed for that staff viewer. TTL is `signed_url_ttl_seconds`, capped at 60. A queue read that signs photos writes one `audit_event`: actor is the staff id, action `moderator_profile_review_view`, payload `asset_ids` only. The JSON never includes `phone_e164` or `original_key`.

`sla_breach` is true only when now minus `review_queued_at` is strictly greater than `free_review_sla_hours`. Equal to the SLA is not a breach. The hours come from `operator_config` key `free_review_sla_hours`. The SQL seed is 24. Product code does not hardcode 24. An unreadable value is `503` with `details.field` `free_review_sla_hours`.

`POST /v1/staff/cases` returns `200`. Body:

```json
{
  "kind": "profile_review",
  "account_id": "<uuid>",
  "profile": "allow",
  "bio": "allow",
  "photos": [{ "asset_id": "<uuid>", "decision": "allow" }],
  "reason": "required when any item is block"
}
```

`profile` is required only while `review_passed_at` is null. `bio` is required only when `bio_pending` is not null. `photos` must be exactly the current pending `profile_photo` ids. A mismatch is `409` `REVIEW_STALE` and nothing is written. A profile that is not in the queue is `404` `NOT_FOUND`. A bad body is `400`. A block without `reason` is `400` and nothing is written.

One decision applies every item. Allow on a photo sets `moderation_state` `live`. Block sets `blocked`. Bio allow copies `bio_pending` to `bio_live` and clears `bio_pending`. Bio block clears `bio_pending` and leaves `bio_live`. Profile allow sets `review_passed_at` to now. Then `review_queued_at` becomes null. One audit row: action `moderator_profile_review_decision`, payload `account_id`, `profile`, `bio`, `photo_ids`, `photo_decisions`, `reason`, all strings.

Visibility becomes `public` only when `review_passed_at` is set, visibility is `unpublished`, and the latest `phone_otp`, `liveness`, and `id_document` rows are each `granted`. `held` and `emergency_hidden` are not lifted. Premium does not write visibility. The same check runs again after a later phone OTP grant.

`GET /v1/staff/metrics` uses the same roles. Body:

```json
{ "free_review": { "sla_hours": 24, "waiting": 0, "sla_breach": 0 } }
```

`sla_breach` counts every waiting profile past the SLA, Free or Premium. It does not call BillingPort. Zero is valid. Screen 49 is not built. Indicateur 03 and Indicateur 06 stay the report SLA.

`GET /v1/me/profile` and `PUT /v1/me/profile` add `review_sla_hours` from that same config key. They still omit `visibility`.

`/profile-review` is screen 12. It still renders only when `photo.moderation_state` is `pending`. Otherwise it redirects to `/profile-edit`. Anonymous goes to `/auth`. The Stitch file on disk is unchanged. The served sentence replaces only the value: `Délai habituel de modération : {n} heures.` It never prints `12 à` or `ouvrées`. If the SLA is not a positive integer, the page redirects to `/profile-edit`. The photo row and « Conformité aux règles de pudeur » stay while that photo is pending. « Présentation & Bio » is sent only when `bio_pending` is a non-empty string.

`isListableProfile` is `visibility === 'public' && accountStatus === 'Active'`. `GET /v1/profiles/:id` and `GET /v1/browse` are not in this story.

A staff session can `GET /v1/media/get` for a blur grant it holds. Upload stays member-only. A non-owner still cannot sign a pending photo unless the sign call is the staff review path.

## Where

- `code/apps/api/drizzle/0012_profile_review.sql`
- `code/apps/api/drizzle/meta/0012_snapshot.json`
- `code/apps/api/drizzle/meta/_journal.json`
- `code/apps/api/src/account-schema.ts`
- `code/apps/api/src/profile-store.ts`
- `code/apps/api/src/profile-review.ts`
- `code/apps/api/src/profile-review.test.ts`
- `code/apps/api/src/staff.controller.ts`
- `code/apps/api/src/profile.controller.ts`
- `code/apps/api/src/media.ts`
- `code/apps/api/src/media-store.ts`
- `code/apps/api/src/media.controller.ts`
- `code/apps/api/src/billing-port.ts`
- `code/apps/api/src/audit-port.ts`
- `code/apps/api/src/phone-otp.ts`
- `code/apps/api/src/app.module.ts`
- `code/packages/ports/src/index.ts` — `BillingPort`
- `code/apps/web/src/v2-pages.ts`
- `code/apps/web/src/v2-serve.ts`
- `code/apps/web/src/v2-flow.test.ts`
- `code/apps/web/src/v2-responsive.test.ts` — `13b-profile-review` and `13c-profile-review-no-bio`
- `code/apps/web/src/native-dialog.test.ts`

## How to run

From `code/`:

```bash
npx vitest run --config vitest.unit.config.ts --fileParallelism false apps/api/src/profile-review.test.ts apps/api/src/profile.test.ts apps/api/src/media.test.ts apps/web/src/v2-flow.test.ts apps/web/src/v2-responsive.test.ts apps/web/src/native-dialog.test.ts
npx tsc -p apps/api/tsconfig.json --noEmit
npx tsc -p apps/web/tsconfig.json --noEmit
```

Sign in as a member, save a profile, upload a profile photo, and open `/profile-review`. The timing line should be one configured hour count. A moderator or operator lists `GET /v1/staff/cases?kind=profile_review` and posts one decision. A member calling those staff routes should get `403`.

## Test cases

| Case | Input | Expected |
| --- | --- | --- |
| Listable | visibility not `public`, or account status not `Active` | `isListableProfile` false. `public` plus `Active` is true |
| Empty metrics | Operator, nothing queued | `200` `{ free_review: { sla_hours, waiting: 0, sla_breach: 0 } }`. No billing call |
| Member staff | Member `GET /v1/staff/cases?kind=profile_review` | `403` |
| First save | `PUT /v1/me/profile` while never allowed | `review_queued_at` set. Null visibility becomes `unpublished`. Response has `review_sla_hours` and no `visibility` |
| Sort | Premium `isEntitled === true`, another account `unavailable`, Premium queued later | Premium row first. Both still need a decision. `unavailable` stays in the list as `free` |
| Breach | Queued longer than the SLA | Row and metrics `sla_breach` count it, Premium included. A larger SLA makes the count 0. Metrics does not call billing |
| Staff blur | Pending photo on the queue row | `blur_url` works for that moderator. Audit `moderator_profile_review_view` lists the asset id. JSON has no `original_key` and no `phone_e164` |
| Block without reason | Any item `block` and no `reason` | `400`. Photo stays `pending` |
| Stale photos | Photo id set does not match pending ids | `409` `REVIEW_STALE`. Nothing written |
| Not queued | Unknown account id | `404` `NOT_FOUND` |
| Allow before grants | Profile, bio, and photo `allow`, verification gates closed | `200`. Photo `live`. Bio copied to `bio_live`. `review_queued_at` null. Visibility stays `unpublished` |
| Later grant | Same profile, gates then open | `publishIfEligible` sets visibility `public`. `isListableProfile` true |
| Quiet save | Allowed profile, no new `bio_pending` | Stays out of the queue |
| Held | Visibility `held` before the save, then block photo and profile with a reason | Visibility stays `held`. Photo `blocked`. Not listable |
| Screen 12 | `slaHours` 24 and no pending bio | Sentence `Délai habituel de modération : 24 heures.` No `12 à`. No `ouvrées`. No « Présentation & Bio ». Photo and pudeur rows remain |
| Screen 12 bio | `slaHours` 48 and `bio_pending` set | Sentence uses 48. Bio row is present |
| Widths | 360, 390, 768, 1024, 1280, 1440 on both review states | `scrollWidth <= innerWidth`. No box outside the viewport |

## Test data

`profile-review.test.ts` creates `revueN@example.bf`, password `phrase avec espaces`, gender sister, dob `1990-01-15`, captcha `test-ok`. Clock starts at `2026-10-13T00:00:00.000Z`. SLA reader returns 24, then 1000 for the calm metrics case. Billing returns `true` only for the premium account and `unavailable` otherwise. Verification gates are a test reader. The image is an 8×8 png. Signed TTL reader returns 60. Staff is the same account with `roles` set to `moderator` or `operator` after sign-in. A staff session does not also have `member`.

## My results

- `profile-review.test.ts`, `profile.test.ts`, `media.test.ts`, `v2-flow.test.ts`, `v2-responsive.test.ts`, `native-dialog.test.ts` with `--fileParallelism false`: 6 files, 45 tests passed.
- `tsc -p apps/api/tsconfig.json --noEmit` and `tsc -p apps/web/tsconfig.json --noEmit`: exit 0.
- Width proof includes `13b-profile-review` and `13c-profile-review-no-bio` at 360 and 1440. Shots: `code/docs/qa-handoffs/ank-83-widths/13b-profile-review-360.png`, `13b-profile-review-1440.png`, `13c-profile-review-no-bio-360.png`, `13c-profile-review-no-bio-1440.png`. The run checks all six widths.
- `operator-config.migrate.test.ts` now expects `0012_profile_review.sql` in the migration list. The unit config excludes that file. I did not run it. It needs Postgres.
- I did not click a signed-in browser session against a running app. Chrome loaded the built review HTML at each required width. The API cases ran against the in-memory stores.

## Three validation passes

1. Behavior: an unapproved profile is not listable; Premium sorts first and still needs a decision; a breach counts without billing; a mismatched decision writes nothing; publish requires the human allow, `unpublished`, and the three grants; `held` stays held.
2. Screen: `/profile-review` is screen 12 only while the API photo is pending. The served sentence is the one configured hour count. The bio row is present only when `bio_pending` is set. No state tabs, demo toggles, or galleries. Sample Stitch names are not live data. The Stitch HTML file itself is unchanged.
3. Widths: Chrome on both review states at 360, 390, 768, 1024, 1280, and 1440. `document.documentElement.scrollWidth <= window.innerWidth`, and no measured box outside the viewport.

## Solution-design sections

The board decision on ANK-104 is the catalog change for this story. Do not insert `moderation_case`. The two new fields are `profile.review_queued_at` and `profile.review_passed_at`. Profiles owns them and `profile.visibility`. Media owns `photo_asset.moderation_state` and applies allow or block for `profile_photo` only. `BillingPort.isEntitled` is read for sort order and is not a visibility writer. Operator remains the only writer of `operator_config.free_review_sla_hours`. Audit actions are `moderator_profile_review_view` and `moderator_profile_review_decision`.

`GET /v1/profiles/:id` and `GET /v1/browse` are Stories 3.7, 3.8, and 3.13. This story only exports `isListableProfile`.

## Stitch files

- `code/design-stitch/ankanu-v2/12-profile-not-yet-public/screen.html`
- `code/design-stitch/ankanu-v2/12-profile-not-yet-public/screen.png`

Matched that screen's sections, order, copy, and tokens. The served HTML changes only the approved timing sentence and hides the bio row when no bio is pending. Narrow widths keep the remaining controls and reflow.

## Known gaps

- Screen 49 does not show the free-review breach. `GET /v1/staff/metrics` is the number. The card on screen 49 is Story 12.5. Indicateur 03 and Indicateur 06 stay the report SLA.
- A public page that states the SLA is deferred. Public pricing is Story 10.6. FAQ and contact are Story 11.5. Screens 25 and 46 are untouched. This story meets the public-SLA acceptance on screen 12 and on `review_sla_hours`, which share `free_review_sla_hours`.
- Rejection copy is Epic 3 Story 3.5 (FR-070).
- An older live photo staying up is Epic 3 Story 3.4 (FR-017).
- Photo strike is Epic 3 Story 3.6 (FR-069).
- The chat flag queue is Epic 8, screen 41. Sanction screen 43 is not this story.
- Not pushed. After QA passes, push this commit and comment the SHA on [ANK-104](/ANK/issues/ANK-104).
