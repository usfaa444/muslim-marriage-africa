# Live QA on Faycal's Mac: Stories 5.3 + 5.4 (Chat Photo, Voice note)

Date 2026-10-24 (UTC 07:45–08:10). Branch `factory/chat-media` at `d8beeed`. Stack `ankanu-local` on http://localhost:4012, left running.

**Verdict: PASS.** The product has no blocker, critical or major finding. One minor UX finding (D1). On this Mac, 5 web-only e2e tests fail because Chromium's fake microphone never answers here (D2). That is a property of the environment, not a product defect: the same recorder flow passes on the real stack when the stream comes from WebAudio (W6b, sweep).

## 1. Deploy

| Step | Result |
|---|---|
| `git fetch`, `checkout factory/chat-media`, `pull` | at `d8beeed`, up to date |
| `npm ci` in `code/` | OK |
| `up -d --build --wait` | all 6 services healthy. I built with a temporary `DOCKER_CONFIG` without `credsStore` from the start (the keychain hang seen in 8.5/8.6). `~/.docker/config.json` was not changed |
| `drizzle-kit migrate` | applied (0025 `message_media`); `moderation_job` has `moderation_job_one_per_message` |
| `curl /` and `/v1/health` | 200, `{"status":"ok"}` |
| Evidence bucket | not recreated: no `down` happened, and every upload worked (ID, selfie, profile and Chat Photos 201) |
| `npm run test:integration` | not run (stack up, per config; CI ran it green) |

## 2. E2E

| Run | Result |
|---|---|
| `E2E_BASE_URL=http://localhost:4012 npm run test:e2e` | **44 passed, 0 failed, 200 skipped** (`chat-media.spec.ts` is stub-based and skips on a stack). `e2e-fullstack.txt` |
| `npm run test:e2e` (web-only, real CDN and fonts, no `E2E_ALLOW_ERRORS`) | **202 passed, 5 failed, 37 skipped.** `e2e-webonly.txt` |

The 5 failures are all in `chat-media.spec.ts` and all wait for « Enregistrement en cours »: `:381` record + Mooré + send (mobile, desktop), `:413` refused microphone (mobile, desktop), and `:557` width sweep with an open recorder (desktop). The cause is the environment (D2). `mic-probe.mjs` shows that `getUserMedia({audio:true})` never resolves or rejects within 8 s here. That held for Playwright's headless shell, the new headless mode, a headed window, Google Chrome 156, and `--use-file-for-fake-audio-capture` with a WAV file (`mic-probe.txt`). In 8.5/8.6 the clock-dependent « Hier » test failed; it passed this time.

## 3. Styled checks (Playwright, real stack, real Tailwind CDN, Google Fonts, Material Symbols)

A's view of the A–B thread, with B's two Photos and A's three Voice notes (two through the API, one recorded in the page), at 360, 390, 768, 1024, 1280 and 1440. Five states per width: `thread-media` (clear Photos), `recording` (recorder open, timer running), `voice-ready` (« Note vocale prête », language select), `photo-preview` (« Aperçu de la photo à envoyer »), and `thread-lite` (`ankanu_lite=1`). The microphone stream is a synthetic WebAudio tone (see D2); MediaRecorder is real.

| Check | Result (30 states) |
|---|---|
| Horizontal scroll | none (`scrollWidth == innerWidth` everywhere) |
| Bubble outside the viewport | 0 |
| Visible link/button/select/textarea < 44×44 | 0 |
| axe wcag2a/aa, 21a/aa, 22aa serious/critical | 0; no violation of any impact |
| Console errors (all pages and walkthrough contexts) | 0 |
| `window.tailwind`, Material Symbols loaded, `lang=fr` | true on every state |
| Lite | 4 « Afficher la photo » buttons; **0** `/messages/<id>/media` requests before a tap (only the blur and avatar tokens load) |

Data is in `live-qa.json` (`widths`, `lite-*`) and the screenshots are in `shots/<state>-<width>.png` (not committed).

Match with Stitch 21 (`design-stitch/ankanu-v2/21-chat-thread/screen.png` vs `shots/thread-media-1280.png`): **match** for this story's parts. The Voice note card has the waveform icon, « Note vocale » (the handoff says the Stitch title is sample text), the time chip in a dark pill, a round play button and the decorative waveform. It renders navy for my own notes and light for the other member's. The composer has the camera and microphone icons left of the textarea and the navy « Envoyer → ». Stitch has no Photo bubble. Ours is a rounded image card in a hairline frame, with the time and flag under it like a text bubble. Out of this story and absent on purpose: the wali banner, « Demander la levée du flou », « Quota du jour », and the read ticks. The fixed bottom nav floats over the middle of full-page screenshots; in a real viewport it sits at the bottom (same as 5.1/5.2, 8.5).

## 4. Full-stack walkthrough (real accounts)

Accounts were created only through the real API (`scripts/setup-quad.mjs`): `/v1/accounts` with `recaptcha_token: test-ok`, the email link and phone code read from the api log, then synthetic ID, selfie and photo uploads. A disposable moderator (`staff-cli create`, password change, TOTP) approved all four members. A = Brother `Issa…`, B = Sister `Mariam08917`, matched A→B (invite, accept). C (brother) and D (sister) were matched in their own conversation CD and act as outsiders. The walkthrough is `scripts/live-qa.mjs` (UI at 390 px), plus `scripts/blur-then-clear.mjs`.

| # | Step | Expected | Actual | Result |
|---|---|---|---|---|
| W1 | A has the thread open; B `POST …/messages {kind:'photo'}` with a 1200×900 JPEG carrying EXIF (`Make`, `Model`) and **GPS IFD** (`APP1:Exif`, tag 0x8825) | A sees it without a reload | 201; the bubble appeared in A's open page **212 ms** after the POST, with no page reload (1 document load) | PASS |
| W1b | Same, with the signed-URL request held 1.5 s (slow link) | blur first, then clear | at first: 4 blur images loaded, 0 clear; 3.5 s later: 0 blur, 4 clear (`walk-01b`, `walk-01c`) | PASS |
| W2 | Bytes A gets for the clear image and the blur | no EXIF / GPS | clear: `image/jpeg`, 1200×900, segments `DQT DQT SOF0 DHT×4 SOS`: **no APP1, no XMP, no COM, no GPS bytes**; blur: 633 B, no GPS. `sent-gps.jpg` vs `served-clear.jpg` in `shots/` | PASS |
| W2b | Signed URL TTL | ≈ 60 s | `expires_at` − mint = **60 s** | PASS |
| W3 | A's clear-image URL used by others | per caller | sender B **403**, third member C **403**, signed out **401**, A again 200 | PASS |
| W4 | `GET /v1/conversations/<AB>/messages/<photo>/media` | outsiders refused | no session **401** « Authentification requise. »; C through AB **404** « Cette discussion n'existe pas. »; C through **his own** CD **404** « Ce média est introuvable. »; D through CD **404**; C listing AB 404 | PASS |
| W5 | A sends a 4 s WebM/Opus Voice note (`language: 'mos'`); B opens the thread | plays on tap only | before the tap: **0** requests for the note's media, no audio element; tap « Écouter la note vocale » → 1 access + 1 `/v1/media/get`, chip « 0:01 / 0:04 », « Mettre en pause la note vocale » shown; served `audio/webm` byte-identical to the upload; no `transcript` key | PASS |
| W6a | B picks a GPS JPEG in the page → preview → « Envoyer la photo » | sent; A sees it live | the browser re-encode uploaded 1200×900 `APP0:JFIF, APP2:ICC` (**no EXIF**); 201; A's open thread went from 3 to 4 Photos without a reload | PASS |
| W6b | A: « Enregistrer une note vocale sobre » → ~2.7 s → « Arrêter l'enregistrement » → « Langue de la note » = Mooré → « Envoyer la note vocale » | sent | body `{kind:'voice', language:'mos', duration_ms:2771}`, 11 KB WebM (magic `1a45dfa3`); B's open thread shows it. Mic = synthetic WebAudio stream (D2) | PASS |
| W7 | Postgres for the 4 media messages | one scan job each, after delivery | each `message` is `delivered`; `moderation_job` by `message_id` = **1** each, by `asset_id` = 0; `photo_asset.kind` `chat_photo` / `voice_note`, `moderation_state` null | PASS |
| W8 | GIF, WebP, `kind:'gif'`, WAV voice | refused, nothing stored | 400 « Une photo JPEG ou PNG est requise. » ×2, 400 « kind : valeur non reconnue. », 400 « Une note vocale est requise. »; `message` and `photo_asset` counts unchanged | PASS |
| W9 | A: « Signaler ce message » under B's Photo → reason → Block unchecked → submit | report on the media message | href `/signaler/<B>?discussion=<AB>&message=<photo id>`; 201 `target_kind:'message'`, `blocked:false`, `sla_hours:24`; the `report` row has `target_id` = the Photo message (kind `photo`, sender B); **no flag under A's own Voice notes** | PASS |
| W10 | B blocks A (`POST /v1/blocks`) | media closed both ways | Photo and Voice from A and from B: all **409** « Cette discussion est fermée. »; `message` / `photo_asset` counts unchanged (`10/43` before and after); A can still open the earlier Photo (200); in A's page the camera, microphone and Envoyer buttons are disabled (`walk-08`). The Block was lifted afterwards (DELETE 200) | PASS |
| W11 | A's first clear-image URL, 83 s after it was minted | expired | **403** | PASS |

Note on W9: the script's first pass flagged the Photo from my first run (still B's Photo message), so the strict id check printed FAIL. The DB rows confirm the report targets a `photo` message sent by B. That was a script artifact, not a product failure.

## 5. Findings

| # | Severity | Steps | Expected | Actual | Evidence |
|---|---|---|---|---|---|
| D1 | Minor (UX) | Full mode (not Lite), on a slow link: open a thread with a Photo | While the clear image loads, the blur shows with a neutral loading state | The blur shows **« Afficher la photo »** over it (disabled, `aria-busy`) until the clear image arrives, so on 2G/3G it looks like a button that does nothing. In Lite this button is correct | `shots/walk-01b-blur-first-A-390.png`; `discussions-page.ts` `photoNode` → `reveal()` |
| D2 | Environment (not a product defect) | On this Mac, Chromium with `--use-fake-device-for-media-stream` | `getUserMedia` returns the fake device | It never settles, in any Chromium mode, with or without a WAV file, and in Chrome 156 too. Probably macOS microphone privacy (TCC) waiting on a prompt nobody can answer in a Remote Control session. This makes 5 web-only `chat-media.spec.ts` tests fail here; CI (Linux) runs them green | `mic-probe.txt`, `e2e-webonly.txt` |

Not covered here: a real phone camera photo (HEIC/12 MP), Safari's MP4/AAC recorder, a real microphone, and real 3G timing. The browser re-encode was exercised with a 1200 px JPEG only. Nothing in product code was changed.

## Files

`e2e-fullstack.txt`, `e2e-webonly.txt`, `live-qa.json` (tokens redacted), `mic-probe.txt`. Not committed (local on the Mac): `shots/` (30 sweep states + `walk-01…08` + `sent-gps.jpg` / `served-clear.jpg`) and `scripts/` (`setup-quad.mjs`, `live-qa.mjs`, `blur-then-clear.mjs`, `mic-probe.mjs`, `gps-probe.mjs`). Session cookies and passwords stayed outside the repo.
