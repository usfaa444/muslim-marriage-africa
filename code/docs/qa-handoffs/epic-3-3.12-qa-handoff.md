# Epic 3 Story 3.12 QA handoff

## What was built

A member can turn on Lite mode on this device. The value lives in `localStorage` under `ankanu_lite`. `"1"` is on. `"0"` is off. It is not an account field, it is not sent to the server, and sign-out does not clear it. The catalogue is the board comment on [ANK-139](/ANK/issues/ANK-139) (`648d79be-d13a-4352-8a23-dc70e590cbbd`). `_bmad-output/` was not rewritten. There is no `PUT /v1/me/prefs`, no new column, and no migration.

A missing key is the automatic default, and that default is not written until the member taps the switch. Automatic is on when `navigator.connection.saveData === true`, or `effectiveType` is `slow-2g`, `2g`, or `3g`, or `navigator.deviceMemory <= 1`. Otherwise it is off, including when those APIs are missing. A stored `"1"` or `"0"` wins over the automatic default. Any other stored string is ignored and left as it is.

`setLite` writes `"1"` or `"0"` and returns false when storage is missing or `setItem` throws. The switch then keeps the previous value and the previous classes. There is no new error sentence.

Settings is screen 27. The Stitch copy stays: `Mode Allégé (Basse consommation)` and `Optimise la consommation des données mobiles (2G/3G) et désactive le préchargement visuel.` The demo `onclick` is removed. The HTML that arrives from the server has the switch off (`aria-checked="false"`, `bg-hairline`, thumb `translate-x-0.5`) so the Stitch sample does not flash on. The page script then paints `liteEnabled()` before the member can use it. On is `bg-deep-navy` and thumb `translate-x-5`. Off is `bg-hairline` and thumb `translate-x-0.5`. The visible control stays `h-6 w-11`. The tap target is at least 44px through `#lite-mode-toggle::before`, without moving the pill. Click, Space, and Enter use the button's own click. A `storage` event for `ankanu_lite` repaints the switch. Export, delete, the PIN section, and the Mooré / Dioula / Français radios stay as they were. Audio language remains Story 11.8. Delete and export remain Story 2.12.

Discover, including a filtered browse that uses the same tiles, reads `liteEnabled()` when it paints. Text and criteria paint first. Lite off keeps the Story 3.8 image timing: two animation frames, then an `img` whose `src` is set, with no `loading="lazy"`. A reserved photo (`photo_blur === true`) stays on that same Story 3.8 path and keeps `Photographie réservée` and `Visible à l'acceptation mutuelle`. A missing photo still says `Photographie non publiée`.

Lite on defers only a clear photo. The well stays `h-52 sm:h-56`, `bg-[#0B1D36]`, and `bg-dot-pattern`, with no `img`, no icon, and no new sentence until the file loads. The request starts when that well is inside the viewport. The same element is inserted on `load`, with `loading="lazy"`, `decoding="async"`, and `object-cover`. A load error, including an expired signed URL, leaves the well empty. There is no broken icon and no retry. `GET /v1/browse?view=grid` is unchanged: `blur` when `photo_blur` is true, otherwise `sm`. No `md`, `xs`, or original. An open grid does not repaint when another tab changes the key. The next paint does.

Chat Photo is not on this build. Epic 5 Story 5.3 owns it. When that story runs, `liteEnabled()` true means a received Chat Photo makes no `md` request until the member taps it, the bubble keeps its size, and chat media waits for the connection rather than an AI call (AD-16). No autoplay. Voice notes stay Story 5.4. The offline text outbox stays Story 5.10. Card view stays Story 3.13 and should call the same `liteEnabled()`. Favourites and profile detail are not this people list.

## Where

- `code/apps/web/src/lite-mode.ts` — `liteEnabled()` and `setLite()`
- `code/apps/web/src/lite-mode.test.ts`
- `code/apps/web/src/v2-client.ts` — settings script
- `code/apps/web/src/v2-pages.ts` — screen 27, demo onclick removed, first paint off, 44px hit area
- `code/apps/web/src/settings-lite.test.ts`
- `code/apps/web/src/discover-page.ts` — clear-photo deferral
- `code/apps/web/src/discover-page.test.ts`

## How to run

From `code/`:

```bash
./node_modules/.bin/vitest run --config vitest.unit.config.ts --fileParallelism false apps/web/src/lite-mode.test.ts apps/web/src/settings-lite.test.ts apps/web/src/discover-page.test.ts -t "lite mode device preference|settings lite switch|opens on the card chrome|holds the photo well|follows the live session|toggles to a real grid"
./node_modules/.bin/tsc -p apps/web/tsconfig.json --noEmit
```

Open `/settings` with a member session. Open `/decouvrir`, switch to the grid, and compare Lite off with Lite on. The key is `localStorage.ankanu_lite`.

## Test cases

| Case | Input | Expected |
| --- | --- | --- |
| Missing hints | No `saveData`, no `effectiveType`, no `deviceMemory`, no key | Off. The key is not written |
| Save-Data | `saveData === true`, no key | On. The key is not written |
| Slow radio | `effectiveType` `slow-2g`, `2g`, or `3g`, no key | On. The key is not written |
| Small memory | `deviceMemory <= 1`, no key | On. The key is not written |
| Fast device | `4g` and `deviceMemory` 8, no key | Off |
| Stored off | Key `"0"` and `saveData === true` | Off |
| Stored on | Key `"1"` and `4g` with 8 GB | On |
| Other string | Key `"yes"` | Falls through to the automatic default. The key is not rewritten |
| Write failure | `setItem` throws | `setLite` returns false. The previous value remains |
| Settings copy | Screen 27 | Both Stitch sentences. No `onclick`. No `/v1/me/prefs`. Export and delete still call `/v1/me/export` and `/v1/me/delete`. Mooré remains |
| First paint | Served HTML before the script | `aria-checked="false"`, `bg-hairline`, thumb `translate-x-0.5`, control `h-6 w-11` |
| Real value | Key `"1"`, then load `/settings` | Switch on: `aria-checked="true"`, `bg-deep-navy`, thumb `translate-x-5`. Click stores `"0"` and paints off |
| Other tab | `storage` event for `ankanu_lite` set to `"1"` | The switch paints on. Discover's already painted grid does not rebuild |
| Lite off grid | Key `"0"`, Story 3.8 browse | Same image timing as 3.8. Reserved copy stays. The text cache has no photo URL |
| Clear photo, Lite on | Key `"1"`, `photo_blur` false, image loads | Navy dotted well first, then one `img` with `src` of the `sm` URL, `loading="lazy"`, `decoding="async"`. Name, city, and chips stay visible |
| Clear photo error | Key `"1"`, image URL fails | No `img`. No reserved sentence. The well keeps `h-52` and `bg-[#0B1D36]` |
| Reserved photo, Lite on | Key `"1"`, `photo_blur` true | `Photographie réservée` stays. The blur image still follows the Story 3.8 insert. It is not held for a successful load |
| Below the fold | Key `"1"`, a clear photo whose well is outside the viewport | No request for that URL until the well enters the viewport |
| Network | Toggle and browse | No request to `/v1/me/prefs` |
| Widths | Settings and the Lite grid at 360, 390, 768, 1024, 1280, 1440 | `document.documentElement.scrollWidth <= window.innerWidth` |

## Test data

Browser grid: Amina, clear photo, URL `/media/bad` (responds with HTML, so the image errors). Bintou, clear photo, URL `/media/ok` (1×1 gif). Moussa, `photo_blur` true, URL `/media/bad`, city Kaya. Settings uses the Stitch screen 27 document with the sample sentences removed from behavior and the real switch bound. Password and account fixtures are the existing Discover session stub. No new API body.

## My results

- `lite-mode.test.ts`, `settings-lite.test.ts`, and the Discover cases named above: 9 passed, 3 skipped (those three are other Discover cases not selected by the filter).
- `tsc -p apps/web/tsconfig.json --noEmit`: exit 0.
- The Lite grid and Settings passed `scrollWidth <= innerWidth` at 360, 390, 768, 1024, 1280, and 1440 inside the Lite browser test.
- Shots: `code/docs/qa-handoffs/epic-3-3.12-widths/grid-lite-360.png`, `grid-lite-1440.png`, `settings-360.png`, `settings-1440.png`. The settings shots are the off state after the test clicked the switch and stored `"0"`. The grid shots show Amina's failed clear photo as the empty navy well.
- The full `v2-responsive.test.ts` file was not re-run. An earlier run of that file failed only on the existing favourites card at 360 (`18b-favourites-filled`). Settings was not in that failure list. This story does not change favourites.

## Three validation passes

1. Behavior: the device key, the automatic default, a stored value winning, a failed write, the Settings switch, and Discover. Lite off matches Story 3.8. Lite on holds a clear photo until it loads and leaves the well empty on error. A reserved photo keeps its Story 3.8 image and the reserved sentence. No `/v1/me/prefs`.
2. Responsive: Settings and the Lite grid passed `scrollWidth <= innerWidth` at 360, 390, 768, 1024, 1280, and 1440. Shots at 360 and 1440 are in `code/docs/qa-handoffs/epic-3-3.12-widths/`.
3. Stitch: screen 27 copy, pill size, on and off classes, and the removed demo `onclick`. Discover uses the existing 57-discover photo well. There is no new Lite frame, no state tab, and no sample profile.

## Solution-design sections followed

- Board comment `648d79be-d13a-4352-8a23-dc70e590cbbd` on [ANK-139](/ANK/issues/ANK-139). `account` has no lite field. `operator_config` has no lite key. SOLUTION-DESIGN §7.1 has no `PUT /v1/me/prefs`. That route was not added.
- SOLUTION-DESIGN §12 names Lite as a member setting. It does not define a write. The board comment is the write: `localStorage` key `ankanu_lite`.
- Browse stays `GET /v1/browse?view=grid` with `blur` or `sm`, as Story 3.8 already signs it.
- AD-16 is the data-saver behavior for this screen and the rule Story 5.3 must apply to Chat Photo. AD-22 is not given a closed Lite enum, because the value is not in the schema.

## Stitch files matched

- `code/design-stitch/ankanu-v2/27-settings/screen.html` and `screen.png` — the Lite block copy, the pill, and the on/off thumb. The demo `onclick` and the sample "already on" state are not what the member sees before the real value is known.
- `code/design-stitch/ankanu-v2/57-discover/screen.html` and `grid.html` — the existing photo well. There is no separate Lite frame. Sample names in that HTML are not rendered.

## Known gaps

- Story 5.3 owns Chat Photo. Do not treat a missing chat bubble as a fail of this story. The rule for 5.3 is in the first section.
- Story 3.13 owns card view. It should call `liteEnabled()` and is not built here.
- Story 11.8 owns the audio-language radios. They still render and are not reimplemented.
- Story 2.12 owns delete and export. Both buttons still post to the existing routes.
- An open Discover grid does not rebuild when the key changes in another tab.
- Favourites at 360 still has the pre-existing horizontal overflow from before this story. This story does not change that page.
- This commit is local. It is not pushed. Push waits until QA passes. No next story. No deploy. Parent [ANK-97](/ANK/issues/ANK-97) stays open.
