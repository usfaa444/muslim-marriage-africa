# Epic 3 Story 3.5 QA handoff

## What was built

`GET /photo-rules` serves AnKanu v2 `09-photo-rules`. The screen shows the Stitch intro and the four pictogram cards: Pudeur & Modestie, Clarté récente, Authenticité réelle, Personne seule, each with its caption.

Play is the Story 2.9 `audio-prompt` player with no file. Board card `09459686` (comment `b6757187`) says this story ships the pictogram path only. There is no `audio_asset` key, no `audio_asset` query, and no audio URL. A click on Mooré or Dioula does not construct `Audio` and does not change the icon from `play_arrow`. The pictograms stay. The Stitch script that only swaps the icon to `pause` is stripped with the other demo scripts.

The painted play circle stays `w-8 h-8` (32px). The same button carries an empty 44px hit span. The speaker discs stay the Stitch `w-9 h-9` divs. They are not resized.

« J'ai pris connaissance des règles » navigates the client to `/profile-edit`. There is no acknowledgement request, field, or other destination. That is the same board card.

## Where

- `code/apps/web/src/v2-pages.ts` — `photoHtml`, `photoRulesScript`
- `code/apps/web/src/audio-prompt.ts` — missing file stays on the pictogram path; 32px play circle; 44px hit span
- `code/apps/web/src/v2-serve.ts` — existing `GET /photo-rules`
- `code/apps/web/src/photo-rules.test.ts`

## How to run

From `code/`:

```bash
npx vitest run --config vitest.unit.config.ts --fileParallelism false apps/web/src/photo-rules.test.ts apps/web/src/v2-flow.test.ts apps/web/src/native-dialog.test.ts apps/web/src/v2-responsive.test.ts
npx tsc -p apps/web/tsconfig.json --noEmit
```

Open `GET /photo-rules` on the web app as an account that has finished signup (`entry-guard` already sends an anonymous visitor to `/auth`). No photo-rules API is required.

Click Mooré, then Dioula. The icon stays `play_arrow`. The four pictograms stay. Click « J'ai pris connaissance des règles ». The browser goes to `/profile-edit`. No photo-rules request is sent.

## Test cases

| Case | Input | Expected |
| --- | --- | --- |
| Open rules | `GET /photo-rules` | 200 HTML. Intro and four captions are present: Modeste, Récente, Réelle, Sans tiers. No `pause` toggle script. No `audio_asset`. No `/v1/academie` |
| Play with no file | Click Mooré, then Dioula | No `Audio`. Both icons stay `play_arrow`. Pictograms stay |
| Hit area | Mooré play control | Painted box is 32×32. A point 4px outside that box is the 44px hit span on the same button. The `w-9` speaker parent is not given a 44px minimum |
| Acknowledge | Click « J'ai pris connaissance des règles » | Browser location is `/profile-edit`. No acknowledgement POST |
| Widths | Screen at 360, 390, 768, 1024, 1280, 1440 | `document.documentElement.scrollWidth <= window.innerWidth`. No element sticks out of the viewport |
| Stories 3.1–3.4 | Existing v2 flow and native-dialog tests | Still pass |

## Test data

No new account, photo, or audio file. The page does not read a profile. An anonymous request is still redirected by the existing account gate.

## My results

- `photo-rules.test.ts`, `v2-flow.test.ts`: 29 tests passed. Chrome clicked Mooré, saw a 32px circle, a 44px hit span, no `Audio`, and landed on `/profile-edit`.
- `native-dialog.test.ts` was included in the earlier 30-test run and passed.
- `v2-responsive.test.ts`: 2 tests passed, including `12-photo` at 360, 390, 768, 1024, 1280, and 1440.
- `tsc -p apps/web/tsconfig.json --noEmit`: exit 0.
- Screenshots from that width run: `code/docs/qa-handoffs/ank-83-widths/12-photo-360.png` and `code/docs/qa-handoffs/ank-83-widths/12-photo-1440.png`.

## Three validation passes

1. Behavior: pictograms stay up with no audio file. Play does not invent a playing state. The acknowledgement button opens `/profile-edit` and does not post.
2. Screen: the served page is `09-photo-rules` with the Stitch intro, four captions, and both play rows. The demo pause script does not ship. No state tabs, demo toggles, or galleries. The Stitch HTML file is unchanged.
3. Widths: Chrome checks `12-photo` at 360, 390, 768, 1024, 1280, and 1440. `document.documentElement.scrollWidth <= window.innerWidth`.

## Solution-design sections

`locale_string` and `audio_asset` are content-owned. This story does not write either table and does not add a relationship. Content HTTP stays `GET /v1/academie` and `GET /v1/board`; neither is called for this screen. Chat Voice stays `photo_asset.kind=voice_note`. The acknowledgement is client navigation only.

## Stitch files

- `code/design-stitch/ankanu-v2/09-photo-rules/screen.html`
- `code/design-stitch/ankanu-v2/09-photo-rules/screen.png`

## Known gaps

- No photo-rules `audio_asset.key` strings. Board card `09459686` says not to invent them. Native-speaker audio is Story 11.8.
- No stored acknowledgement. The board said not to add a field or an API.
- Photo Strike is Epic 3 Story 3.6.
- The pack names no control that opens this screen. It is `GET /photo-rules`. The only named navigation is the acknowledgement button to `/profile-edit`.
