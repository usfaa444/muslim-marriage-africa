# Epic 2 Story 2.9 QA handoff

## What was built

`GET /onboarding` serves `code/design-stitch/16-onboarding/screen.html`. `GET /photo-rules` serves `code/design-stitch/18-photo-rules/screen.html`. Both responses use `content-type: text/html; charset=utf-8`, `cache-control: no-store`, and `referrer-policy: no-referrer`. The Stitch files are not edited.

The photo-rules hosting line comes off the served page and nothing replaces it: `Infrastructure de confiance hébergée souverainement · Scaleway Paris & Relais Ouagadougou · Conformité CIL Burkina Faso`. The served photo-rules body does not contain `Scaleway`, `Paris`, `Île-de-France`, `fr-par`, or `hébergée souverainement`. The onboarding footer `Hébergement souverain chiffré • Ouagadougou, Burkina Faso` stays. It is not that sentence.

The minimum-to-browse versus Invite-ready split is the drawing already in the onboarding HTML. Section A is marked `Requis pour consultation`. The later section is marked `Requis pour envoyer des invitations`. The meter text `Il manque : madhhab, intention matrimoniale` stays. The finish control is the Stitch submit `Finaliser et débloquer les invitations`, and the browse control is `Découverte en lecture seule`. Both stay on the page. Submit does not navigate and does not save.

Form values stay in the page only. The injected script does not call `fetch`, and it does not touch `localStorage`, `sessionStorage`, `indexedDB`, or `document.cookie`. There is no `PUT /v1/me/onboarding` and no other new API route. There is no profile migration and no completeness column. The wali fields stay visible and do not attach a Mahram. The portrait button stays visible and does not upload.

`audio-prompt` is `code/apps/web/src/audio-prompt.ts`. Onboarding and photo rules both mount it. Mooré maps to `mos` and Dioula maps to `dyu`. The served pages pass no file. A click then does not construct `Audio`, does not change the photo-rules play icon away from `play_circle`, and leaves the rule pictograms in the page. If a later caller passes a file and `play()` rejects, the photo-rules labels return through `resetAudioUI`. There is no autoplay. The onboarding language buttons and the `w-9` speaker disc get a 44px minimum in the served page. The photo-rules language buttons are already `min-h-[44px] h-12`.

## Where

- `code/apps/web/src/audio-prompt.ts`
- `code/apps/web/src/onboarding-page.ts`
- `code/apps/web/src/photo-rules-page.ts`
- `code/apps/web/src/guided-onboarding-page.test.ts`
- `code/apps/web/app/onboarding/route.ts`
- `code/apps/web/app/photo-rules/route.ts`

## How to run

From `code/`:

```bash
npx vitest run --config vitest.unit.config.ts apps/web/src/guided-onboarding-page.test.ts
npx tsc -p apps/web/tsconfig.json --noEmit
```

Open `GET /onboarding` and `GET /photo-rules` on the web app. No session is required. No API is required.

## Test cases

| Case | Input | Expected |
| --- | --- | --- |
| Onboarding HTML | `GET /onboarding` | 200, `text/html; charset=utf-8`, `cache-control: no-store`, `referrer-policy: no-referrer`. Body contains `Requis pour consultation`, `Requis pour envoyer des invitations`, `Il manque : madhhab, intention matrimoniale`, `Découverte en lecture seule`, and `Finaliser et débloquer les invitations`. |
| Onboarding footer | Same body | Contains `Hébergement souverain chiffré`. Does not contain `Scaleway`. |
| Photo-rules HTML | `GET /photo-rules` | 200 with the same three headers. Body contains `Exigences pour votre portrait matrimonial`, `#btn-moore`, `#btn-dioula`, and `J'ai compris ces exigences`. |
| Hosting line | Photo-rules body | Does not contain `Scaleway`, `hébergée souverainement`, `Paris`, `Île-de-France`, or `fr-par`. The Stitch file on disk still contains the Scaleway sentence. |
| No save | Either page source | No `fetch(`, no `localStorage`, no `sessionStorage`, no `indexedDB`, no `/v1/`. |
| Lexicon | Either page | No `dating` and no `rencontre romantique`. |
| No audio file | Click Mooré or Dioula | No `Audio` element. Photo-rules `#status-moore` stays `Kẽng n kẽele gom-biisã` and `#icon-moore` stays `play_circle`. Rule pictograms stay. |
| Failed file | Pass `mos: 'mos.opus'` and reject `play()` | One `Audio` with that src. The photo-rules label and icon return to the pictogram state. |
| Targets | Onboarding script | Language buttons and the `w-9` speaker disc get `minHeight` `44px`. |
| Finish | Onboarding submit listener | `preventDefault` runs. No request. |

## Test data

No account, phone, or image. The empty audio map is the served case. The failure case uses the string `mos.opus` and a rejected `play()`.

## My results

- `apps/web/src/guided-onboarding-page.test.ts`: 7 passed.
- `npx tsc -p apps/web/tsconfig.json --noEmit` passed.
- `npx oxlint` on the new web files passed with no findings.
- `GET http://127.0.0.1:3456/onboarding` and `GET http://127.0.0.1:3456/photo-rules` on the already-running web dev server returned 200 with `cache-control: no-store` and `referrer-policy: no-referrer`. Onboarding contained the consultation and invitation labels. Photo rules did not contain `Scaleway` or `hébergée souverainement`. Neither body contained `fetch(`.
- I did not drive a browser click. Playwright is not installed in this checkout. The click path ran in the unit harness.

## Three validation passes

1. Screen source: onboarding keeps the drawn split and the Ouagadougou footer; photo rules drops the named hosting line and keeps the rules, the consent control, and the copyright.
2. Audio: no file stays on pictograms; a rejected file returns to pictograms; neither page saves or calls the API.
3. Static: web typecheck and the unit file above.

## Solution-design sections

Founder sentences on this ticket. This story does not call `PUT /v1/me/onboarding` and adds no route. Profiles in the resource map stay `/v1/me/profile` and `/v1/profiles/:id`, and those are not built here. Completeness is not stored. `audio_asset` rows are not inserted. No key string was invented.

## Stitch files

- `code/design-stitch/16-onboarding/screen.html`
- `code/design-stitch/16-onboarding/screen.png`
- `code/design-stitch/18-photo-rules/screen.html`
- `code/design-stitch/18-photo-rules/screen.png`

`code/design-stitch/tokens/DESIGN.md` is not the layout. The HTML files were not edited. The served photo-rules page removes one hosting div. The served onboarding page adds the audio script only, and that script sets a 44px minimum on the language buttons and the speaker disc.

## Known gaps

- FR-010 no-auto-renew audio is deferred to Story 10.1 pack-card; the component is delivered here.
- FR-009 save and the browse-yes / Invite-no gate are wired in Story 3.1 (PUT /v1/me/profile) and verified with Discovery and Invites; not testable end-to-end in Story 2.9.
- No audio file is shipped. The pictogram path is the path QA can run.
- The wali block does not send a Mahram invite. The portrait button does not upload.
- The onboarding browse link is still `href="#"`. It does not open Discover.
- Photo-rules submit still runs the Stitch `alert` when the consent box is checked. It does not upload.
- Google sign-in stays deferred. These two screens have no Google button.
- This commit stays local until QA passes. Do not treat it as pushed.
