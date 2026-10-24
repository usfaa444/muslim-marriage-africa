# QA handoff: Send a Chat Photo (5.3) and Send a Voice note (5.4)

Branch `factory/chat-media`, based on `factory/report-block` at `da82726` (PR #12, not merged yet: this branch carries Stories 8.5 / 8.6 underneath). Spec: `_bmad-output/implementation-artifacts/spec-5-3-5-4-chat-media.md`. Builds on text Chat (Stories 5.1, 5.2, PR #11).

## 1. What was built

**API.**

- `POST /v1/conversations/:id/messages` now takes three kinds (one command, `sendMessage`):
  - `{ kind: 'photo', image: <base64> }`: JPEG or PNG, ≤ 2 MiB decoded, longest edge ≤ 6000 px (read from the header before decoding). Metadata is removed before storage (JPEG APP1–APP15 = EXIF / XMP / GPS, and comments; PNG keeps image chunks only). The server makes the blur derivative (same blur as profile photos).
  - `{ kind: 'voice', audio: <base64>, duration_ms, language? }`: WebM, Ogg or MP4 container, ≤ 1 MiB, `duration_ms` integer 1000–120000, `language` absent / null / `fr` / `mos` / `dyu`.
  - Order, nothing written on a refusal: viewer gate → participant (404) → body (400) → closed / Block / ended / paused (409 `conversation_closed`) → other member unavailable (409 `other_unavailable`) → **cap seam `checkMessageCap({ senderId, kind: 'photo' | 'voice', now })`** (429 `MESSAGE_CAP_EXCEEDED` when it refuses) → chat key (503) → media objects + `photo_asset` (503 if object storage is missing) → `message` row `delivered` → `message.delivered` event (ids only) → `ModerationPort.enqueueScan` once, keyed by the message id, payload `{ kind: 'photo', mediaId, contentType }` or `{ kind: 'voice', mediaId, contentType, durationMs, language }` (≤ 1 s wait, failure logged, never changes the answer) → 201.
  - Errors (French, `UNHANDLED` 400 with `details.field`): « Une photo JPEG ou PNG est requise. », « Photo trop lourde (2 Mo au plus). » (`max: 2097152`), « Photo trop grande (6000 pixels de côté au plus). » (`max: 6000`), « Une note vocale est requise. », « Note vocale trop lourde (1 Mo au plus). » (`max: 1048576`), « Note vocale trop longue (2 minutes au plus). » (`max: 120000`), « Note vocale trop courte (1 seconde au moins). », « duration_ms : valeur non reconnue. », « language : valeur non reconnue. », « kind : valeur non reconnue. » (gif, sticker, video…).
- Storage: Chat Photo = `photo_asset { kind: 'chat_photo', moderation_state: null }` with objects `chat-photo/<id>/original`, `/md` (clear copy), `/blur` and `derivative` rows `blur`, `md`. Voice note = `photo_asset { kind: 'voice_note', moderation_state: null, blur_key: null }`, object `voice-note/<id>/original`. The `message.body` is the AES-GCM envelope of `{ w, h }` or `{ d, l }` (size / duration / language are not readable at rest).
- Message items (list, catch-up, send answer) gain `media` for photo and voice only: `{ id, kind: 'photo', width, height, blur_url }` (blur signed for this reader now) / `{ id, kind: 'voice', duration_ms }`; `text` is null. Text items are unchanged (no `media` key). `GET /v1/conversations` `last_message` keeps `kind` with `preview: null`.
- New `GET /v1/conversations/:id/messages/:messageId/media` → `{ url, expires_at }`, `no-store`: the clear Photo (`md`) or the Voice note audio, signed **for the caller**. Participants only; another member, a text message, an unknown or malformed id → 404 « Ce média est introuvable. » (or « Cette discussion n'existe pas. » for a foreign conversation). A closed / blocked thread stays readable. TTL config unreadable → 503.
- Media gateway `/v1/media/get?token=` serves Chat media only to the grant's own account, before expiry (`signed_url_ttl_seconds`, capped 60 s). A Chat Photo's stored `original` is never served; the generic profile signer `signMedia` now refuses any non-`profile_photo` asset.
- Migration `0025_message_media`: FK `message.media_id → photo_asset.id`, check `(kind = 'text') = (media_id is null)`.
- JSON body limit on `/v1/conversations` raised to 3 MiB.
- `fetchChatMediaForScan(mediaId)` (media module) returns the bytes for the Epic 8 worker; moderation still never reads `message`.

**Web, screen 21 `/discussions/<id>`** (French only):

- Composer: the Stitch « Joindre une photo sobre » (camera) and « Enregistrer une note vocale sobre » (microphone) icon buttons, 44 × 44, disabled with the composer when the thread is closed / the other member unavailable.
- Photo: file picker `accept="image/*"` → « Préparation de la photo… » → browser re-encode to JPEG, longest edge 1600 px, q 0.82 (then 1280 / 0.7, 960 / 0.6 until ≤ 2 Mo) → panel with thumbnail « Aperçu de la photo à envoyer », « Envoyer la photo », « Annuler » → bubble from the POST answer + status « Photo envoyée ». Errors « Ce format de photo n'est pas pris en charge. Choisissez une photo JPEG ou PNG. », « Photo trop lourde (2 Mo au plus). ».
- Voice note: microphone permission → « Enregistrement en cours » + « 0:12 / 2:00 » + « Arrêter l'enregistrement » + « Annuler »; Opus 32 kbit/s; auto-stop at 2:00 with « Durée maximale atteinte (2 minutes). » → « Note vocale prête : 0:12 » + select « Langue de la note » (Français / Mooré / Dioula) + « Envoyer la note vocale » + « Annuler » → bubble + « Note vocale envoyée ». Errors « Note vocale trop courte (1 seconde au moins). », « Note vocale trop lourde (1 Mo au plus). », « Micro indisponible. Autorisez l'accès au micro pour enregistrer une note vocale. », « L'enregistrement vocal n'est pas pris en charge par ce navigateur. ».
- A refused media send (cap 429, 400) shows the API message in the alert and keeps the panel; 409 closes the composer like text; 401 shows the session-expired line.
- Photo bubble: server blur at once with the Photo's aspect ratio reserved; outside Lite the clear image loads at once via the media route; **in Lite** « Afficher la photo » and nothing more is downloaded until the tap. Alt « Photo de <pseudonyme> » / « Votre photo ». Fetch error « Photo indisponible pour le moment. ».
- Media bubbles: Photo 260 px wide, Voice note 300 px, both shrink to the screen at 360 px (`min(…, 100vw - 112px)`).
- Voice note bubble (Stitch): icon, « Note vocale », chip « 0:48 », 44 px button « Écouter la note vocale » / « Mettre en pause la note vocale », decorative waveform; **nothing fetched before the tap** (no autoplay); chip « 0:05 / 0:48 » while playing; « Lecture impossible. Réessayez. » on error; one note at a time. No transcript anywhere.
- « Signaler ce message » under the other member's media bubbles too (Story 8.5 works on media messages).
- Discussions list: last message « Photo » / « Note vocale » (« Vous : … » when mine).
- No GIF picker.

## 2. Where

- New: `code/apps/api/src/media-chat.ts`, `code/apps/api/drizzle/0025_message_media.sql` + `meta/0025_snapshot.json`, `_journal.json`.
- Changed API: `packages/ports/src/index.ts` (`ScanPayload` photo / voice, `VoiceLanguage`), `apps/api/src/chat-messages.ts` (`sendMessage`, media items, `mediaAccess`), `conversations.controller.ts` (media route), `media.ts` (gateway branch, `signMedia` guard, `audioContentType`), `media-blur.ts` (`imageSize`), `account-schema.ts`, `create-app.ts` (3 MiB), `moderation.ts` (comment).
- Changed web: `apps/web/src/discussions-page.ts`.
- Tests: new `apps/api/src/chat-media.test.ts`, new `e2e/chat-media.spec.ts`; changed `apps/api/src/chat-messages.test.ts`, `operator-config.migrate.test.ts`, `apps/web/src/discussions-page.test.ts` (see 7).
- No new env var, flag or secret. Uses `CHAT_KEY` / `CHAT_KID` (5.1) and object storage (`S3_*`, as profile photos). Config key read: `signed_url_ttl_seconds` (seed 60).

## 3. How to run

From `code/`: `npm ci`; `npm run lint`; `npm run typecheck`; `npm run build`; `npm run migration-check`; `npm run test:unit`; `npm run test:integration` (Docker; never while a local compose stack is up); `npm run test:e2e` (web-only on 3100, `/v1` mocked; `chat-media.spec.ts` launches Chromium with the fake microphone flags itself).

Full stack (Fay's Mac, `.factory/config.md`): rebuild, **run the migrate command again (migration 0025)**, and make sure the bucket exists (Chat media use the same private bucket as profile photos). Chrome only allows the microphone on `https://` or `http://localhost`, so test the Voice note at `http://localhost:4012`, not a LAN IP.

1. Two disposable public members A (brother) and B (sister); A invites, B accepts; open the thread on both (two browsers).
2. As B: camera button → pick a phone photo (with GPS) → preview → « Envoyer la photo ». A's thread shows the bubble without a reload (blur first, then the clear image).
3. DB: `select kind, state, media_id from message order by id desc limit 1;` → `photo | delivered | <uuid>`; `select kind, moderation_state from photo_asset where id = '<uuid>';` → `chat_photo | null`; `select message_id, asset_id, outcome from moderation_job order by id desc limit 1;` → the message id, null, null.
4. Download the clear photo through the page (right click → open image) and check it has no EXIF / GPS (`exiftool`).
5. Copy the clear image URL (`/v1/media/get?token=…`) into a third member's browser → 403; in A's browser after 60 s → 403.
6. As A: microphone button → allow → speak ~5 s → « Arrêter l'enregistrement » → « Langue de la note » = Mooré → « Envoyer la note vocale ». B's thread shows the note; nothing downloads until « Écouter la note vocale »; it plays.
7. As B: flag under A's Voice note → Report → `report.target_id` = that message id.
8. As B: Block A → both camera / microphone buttons disabled; a direct `POST …/messages {kind:'photo'}` from A is 409 and nothing is stored; earlier media still open.
9. Turn on Lite in Paramètres (or a 3G throttle) → reopen the thread: Photos show the blur and « Afficher la photo ».

## 4. AC trace table

| ID | Criterion (verbatim) | How it is proven | Status |
| --- | --- | --- | --- |
| 5.3-1 | Given I upload a Chat Photo and I am under the FR-146 cap (or Premium), When it is stored `kind=chat_photo`, Then the recipient's thread shows it without waiting for AI | API « AC 5.3-1: a Chat Photo is stored chat_photo and delivered, the recipient sees it at once, then one scan job is enqueued » (row `delivered`, asset `chat_photo` / `moderation_state` null, recipient list has it with a working blur URL, clear image served, `message.delivered` ids only, moderation called only after persist, one job keyed by message); « AC 5.3-3 … even while the scan enqueue hangs » (ack < 2 s, recipient can fetch the clear image); Postgres case « stores a Chat Photo and a Voice note … (Stories 5.3, 5.4) »; e2e « AC 5.3-1 / 5.4-1: a received Photo shows at once … », « AC 5.3-1: « Joindre une photo sobre » compresses … » | Done (run, green) |
| 5.3-1b | And unauthorized viewers still never get originals | API « AC 5.3-1: unauthorized viewers never get the Photo; tokens are per caller, short-lived, and never the original » (stranger 404 on route and conversation, no session 401, recipient's token 403 for stranger / sender / signed out, expired after 61 s, `signMedia` refuses chat media, a forged `original` grant 403, no storage key in answers); metadata stripped (same test file, AC 5.3-1 and helper test); Postgres case (grant row bound to the viewer, other viewer 403) | Done (run, green) |
| 5.3-1c | And if I am Premium, `message_quota` is not incremented | No `message_quota` exists before Story 5.11; API tests assert `billingCalls === 0` on every media send; boundary « Chat media never reaches BillingPort … » | Holds trivially; Premium path is Story 5.11 (flagged) |
| 5.3-2 | Given I am Free and at the FR-146 cap, When I try to send a Chat Photo, Then I get `MESSAGE_CAP_EXCEEDED` and nothing is stored or held | API « AC 5.3-2 / AC 5.4-2 seam (Story 5.11): a refusing cap check answers MESSAGE_CAP_EXCEEDED and stores, holds or enqueues nothing » (test double refusing; seam called with `photo`; no object, asset, message, job); e2e « AC 5.3-2 / 5.4-2 (UI side of the 5.11 seam) » (API message shown, Photo kept) | Seam proven; real cap check deferred to Story 5.11 |
| 5.3-3 | Given sign for chat_photo, When MediaPort.sign is called, Then it must not wait on applyModeration | API « AC 5.3-3: signing a chat_photo never waits on applyModeration, even while the scan enqueue hangs » (`applyModerationAllowed('chat_photo')` false, asset `moderation_state` null, `signChatMedia` OK, bytes served); boundary « the chat_photo and voice_note signer and reader never read a moderation state » | Done (run, green) |
| 5.3-4 | Given GIF picker, When I compose, Then no picker (flag off) | Web unit « … no GIF picker » (no `gif` / giphy / tenor in the page); e2e « … nothing offers a GIF »; API refuses `kind: 'gif'` (validation test); boundary test (no GIF kind in chat sources) | Done (run, green) |
| 5.4-1 | Given I send a Voice note and I am under the FR-146 cap (or Premium), When it is stored `kind=voice_note`, Then the recipient can play it immediately; no member-facing transcript | API « AC 5.4-1: a Voice note is stored voice_note and delivered, playable at once, with no transcript, then one scan job » (exact item shape, `audio/webm` bytes identical, sender can replay, stranger 403, no `transcript` key); e2e « AC 5.3-1 / 5.4-1 … plays on tap only » (no fetch before the tap, plays, 44 px control); e2e « AC 5.4-1 / 5.4-4: … records … sends » (real MediaRecorder with Chromium's fake mic, WebM magic, ≤ 1 Mo) | Done (run, green) |
| 5.4-1b | And if I am Premium, `message_quota` is not incremented | As 5.3-1c | Holds trivially; Story 5.11 |
| 5.4-2 | Given I am Free and at the FR-146 cap, When I try to send a Voice note, Then I get `MESSAGE_CAP_EXCEEDED` and nothing is stored or held | Same seam test as 5.3-2 (`voice` kind) | Seam proven; Story 5.11 |
| 5.4-3 | Given Premium is inactive and I am under the cap, When I send, Then the action is not blocked as a safety paywall; it still counts against FR-146 | API « AC 5.4-3: a Free member under the cap sends a Voice note without any paywall, and the send still goes through the cap seam » (billing double says « not entitled » for everyone; 201; seam saw `voice`, `photo`; no BillingPort call) | Done for what exists; the count itself is Story 5.11 |
| 5.4-4 | Given language is mos/dyu, When enqueueScan runs later on an allowed Voice note, Then delivery already happened — AD-11 does not hold | API « AC 5.4-4: a Mooré or Dioula Voice note is delivered before any scan runs; the language never holds it » (the moderation double asserts the message and asset already exist when it is called; recipient plays before / regardless; payload carries the language); e2e picks Mooré and posts `language: 'mos'` | Done (run, green) |
| Story | Report on a media message (8.5) | API « Report (8.5) works on the other member's Photo or Voice note, never on my own » (ids only stored); e2e flag link under their Photo and Voice bubbles, not under mine | Done |
| Story | Blocked conversation refuses media (8.6) | API « a closed, blocked or unavailable conversation refuses a Photo and a Voice note; earlier media stays readable to both » (Block either way, ended, other suspended: 409, nothing stored; unblock); e2e « a closed or blocked conversation disables the Photo and Voice buttons; a 409 on a media send closes the composer » | Done |
| Edge | Invalid and boundary input | API « validates the Photo and the Voice note and writes nothing on a refusal » (missing, bad base64, GIF bytes, truncated JPEG, 2 MiB + 1, 7000 px header, WAV, 1 MiB + 1, 120001 / 999 / string / 1.5 ms, `en`, kinds gif / sticker / video; 1000 and 120000 ms accepted) | Done |
| Edge | No chat key, no object storage, TTL unreadable | API « without CHAT_KEY or object storage a media send is 503 … »; « a signed-URL TTL that cannot be read keeps the Photo delivered and listed » | Done |
| Edge | Mic refused, cancel, Lite, double submit | e2e « a refused microphone explains itself; « Annuler » … sends nothing »; « Lite mode (2G/3G) … waits for « Afficher la photo » »; send buttons disabled while in flight (`busy`) | Done |
| Security (NFR-001) | Server-side authorization, non-transferable tokens, no original, no URL in events | 5.3-1b row; realtime payload asserted exactly | Done |
| Privacy (NFR-002, NFR-008) | No GPS / EXIF kept; size, duration, language sealed at rest | « strips EXIF, XMP and comments … » helper test; AC 5.3-1 gateway bytes check; AC 5.4-1 « not readable at rest »; browser re-encode drops EXIF before upload | Done |
| Performance (NFR-005) | 2G/3G: no autoplay, small first page, bounded uploads | Blur ≈ 1 KB per Photo, URLs only in the page; clear image deferred in Lite; voice fetched on tap only; Photo ≤ 2 Mo (typ. 150–400 KB at 1600 px), voice ≤ 1 Mo (32 kbit/s ≈ 480 KB for 2 min); ack < 2 s in API tests (no network latency) | Done in tests; real 3G timing for QA on staging |
| a11y | WCAG 2.2 AA, 44 px targets, keyboard | e2e `expectAccessible` on thread, Lite, photo preview, voice ready; 44 px asserted on play; sizes also in the page's style block (hold without the CDN); styled check (section 8) | Done |
| Responsive | 360–1440, no horizontal scroll | e2e « fits every factory width with Photo and Voice note bubbles and an open recorder »; styled check at 6 widths | Done |
| i18n | French only | All copy in `CHAT_COPY`; tests assert the strings | Done |
| Auditability (NFR-009) | Events for touched actions | AD-18 lists no chat send event; none written | n/a |

## 5. Test cases for QA

| # | Input | Expected |
| --- | --- | --- |
| 1 | Photo 12 MP JPEG from a phone (with GPS) via the page | Uploaded ≤ 2 Mo, 1600 px; recipient sees blur then clear; stored and served bytes have no EXIF |
| 2 | `POST …/messages {kind:'photo', image:<3 MB jpeg base64>}` | 400 « Photo trop lourde (2 Mo au plus). », nothing stored |
| 3 | Photo PNG header claiming 7000 px | 400 « Photo trop grande (6000 pixels de côté au plus). » |
| 4 | `kind: 'gif'` / `sticker` | 400 « kind : valeur non reconnue. » |
| 5 | Voice note 0.5 s / 2 min 10 s via the page | « Note vocale trop courte … » / auto-stop at 2:00 with « Durée maximale atteinte (2 minutes). », note sendable |
| 6 | `duration_ms: 120001`, `999`, `"5000"`, `language: 'en'` | 400 with the matching message |
| 7 | Recipient opens the thread, does not tap play | No request for the note's audio (Network tab) |
| 8 | Lite on | Blur and « Afficher la photo »; no clear image request before the tap |
| 9 | Third member calls `GET /v1/conversations/<id>/messages/<mid>/media` | 404 « Cette discussion n'existe pas. » |
| 10 | Recipient's `/v1/media/get?token=…` used by the sender, a third member, signed out, or after 60 s | 403 / 403 / 401 / 403 |
| 11 | Blocked or ended conversation, photo or voice send | 409 « Cette discussion est fermée. », no `photo_asset` row added |
| 12 | Refuse the microphone permission | « Micro indisponible. Autorisez l'accès au micro pour enregistrer une note vocale. » |
| 13 | Report « Signaler ce message » under their Photo / Voice note | Report filed with the message id; no flag under my own media |
| 14 | Discussions list after a Photo / Voice note | « Photo » / « Note vocale » (« Vous : Photo ») |
| 15 | Keyboard only: Tab to the camera / microphone buttons, Enter, Tab through the panel, Enter on send | Works; « Annuler » returns focus to the button that opened the panel |
| 16 | Widths 360–1440 with the recorder and the photo preview open | No horizontal scroll |

## 6. Out of scope

- Free-tier daily cap, `message_quota`, Premium bypass, the pack upsell: Story 5.11 (seam `checkMessageCap` is in place and covers photo and voice).
- Background scan (image classifier, STT, Mooré / Dioula lexicons, `flag_queue`, scan-deferred): Epic 8; it reads bytes through `fetchChatMediaForScan`.
- GIFs (FR-054 NEXT), video, live audio (khalwa, LATER).
- Mahram reads of media: Epic 6. Contact-share matcher: Story 5.5 (image / voice phone numbers are an after-delivery flag per AD-10, not a send block).
- Chat Photo strikes (never « rejected » before Epic 8), offline outbox / resumable upload, orphan-object sweep.

## 7. Assumptions and known issues

Decisions taken on the spec's behalf (product owner should confirm):

1. **The recipient sees a Chat Photo clear.** Sending a Photo in a conversation is the sender's per-viewer choice; the Profile « flou protecteur » (FR-056–FR-059) governs Profile Photos. The server blur is shown first as placeholder (and in Lite until a tap). If Chat Photos must follow the sender's blur setting, it is one rule in `signChatMedia`.
2. **Limits** not fixed by the PRD: Photo ≤ 2 Mo after browser compression (1600 px JPEG), ≤ 6000 px edge on the server; Voice note 1 s – 2 min, ≤ 1 Mo, Opus 32 kbit/s. Stated in the copy.
3. **Language select** on the Voice note (Français default, Mooré, Dioula): the AC is about `mos` / `dyu`, so the member says which; it only goes to the scan payload.
4. **One scan job per media message**, keyed by `message_id` (not a second job by `asset_id`, per the adversarial review « one send → two jobs »).
5. **Metadata stripped on the server too** (a direct API upload may carry GPS), not only by the browser re-encode.
6. **Clear media fetched through a short-lived per-caller URL**, then kept as an object URL in the page (so a replay does not refetch, and an expired token never breaks a playing note).
7. **« MediaPort.sign »** does not exist as a port interface yet; `signChatMedia` is the media module's signer for Chat media.
8. Stitch voice title « Note vocale de présentation sobre » is sample text; the bubble says « Note vocale ».
9. Touch-target sizes for the new controls are also in the page's own `<style>` block, so they hold when the Tailwind CDN does not load (2G) and in the CDN-less e2e run.

Existing tests changed (not weakened):

- `chat-messages.test.ts` « validates kind and text »: the case `['photo', 'x', 'kind : valeur non reconnue.']` became `['gif', …]`, because `photo` is now a valid kind (its validation is covered in `chat-media.test.ts`).
- `discussions-page.test.ts`: `photo_camera`, « Joindre une photo » and « note vocale » left the list of Stitch lines the product does not ship (this story ships them); the Stitch sample « Note vocale de présentation sobre » was added to it; four new tests.
- `operator-config.migrate.test.ts`: migration list and applied count (25 → 26) include `0025_message_media`; one new Postgres case.

Accessible names: the camera, microphone and play / pause buttons are named by visually hidden text (`chat-sr`), not `aria-label`, so axe's `label-content-name-mismatch` holds even when the Material Symbols font does not load and the ligature word (`photo_camera`, `play_arrow`) is visible. The voice icon on the other member's light bubble and in the « Note vocale prête » panel is `#7D5F27` (soft-gold failed contrast there, as on screen 27 in 8.6).

Known issues of this environment:

- **Docker is not available here** (`/var/run/docker.sock` missing), so `npm run test:integration` could not run. Not run: `compose.test.ts`, the substrate / restore-drill / object-version suites, and the Testcontainers start of `operator-config.migrate.test.ts`. As a substitute, all 19 cases of `operator-config.migrate.test.ts` were run against a local PostgreSQL 16 (same migrations, the container start replaced by a local URL in a temporary copy, deleted afterwards): `19 passed`, including the new 5.3 / 5.4 case. The real `npm run test:integration` must be run on a machine with Docker (no compose stack up).
- Google Fonts and the Tailwind CDN are unreachable from this container. Icons show as ligature words in the screenshots; the styled check uses Tailwind 3.4.17 built locally from the screen 21 config.
- Not tried on a real phone: real camera photos (HEIC from iOS is converted by the browser canvas only where the browser decodes HEIC; Safari does, Chrome Android gets JPEG from the camera), Safari's MediaRecorder (MP4 / AAC, accepted by the server) and real 3G timing. Voice recording was exercised with Chromium's fake microphone only.
- Pre-existing failures, unchanged: unit `photo-rules.test.ts` « keeps a 32px play circle in Chrome … »; e2e list in section 8.

## 8. Self-check (real output, this container, 2026-10-24)

- `npm run lint`: exit 0, 17 warnings, all in files this story does not touch (`report-block-gates.test.ts` unused helpers, `v2-flow.test.ts`, `life-pause.ts` control regex, …).
- `npm run typecheck`: exit 0.
- `npm run build`: exit 0.
- `npm run migration-check`: `Everything's fine`.
- `npm run test:unit`: `Test Files  1 failed | 82 passed | 2 skipped (85)`, `Tests  1 failed | 663 passed | 12 skipped (676)`. The failure is the pre-existing `photo-rules.test.ts` « keeps a 32px play circle in Chrome … » (fails on the base too). `chat-media.test.ts` 16 passed (new); `chat-messages.test.ts` all passed; `discussions-page.test.ts` 14 passed (4 new). Web unit tests rerun after the last web fix: `Tests  1 failed | 262 passed | 12 skipped (275)`, same single failure.
- `npm run test:integration`: **not run, Docker unavailable** (section 7). Substitute: `operator-config.migrate.test.ts` on local PostgreSQL 16, `19 passed`.
- `npx playwright test e2e/chat-media.spec.ts` (`PLAYWRIGHT_CHROMIUM_EXECUTABLE=/opt/pw-browsers/chromium`, `E2E_ALLOW_ERRORS='cdn\.tailwindcss\.com,tailwind is not defined,fonts\.googleapis\.com,fonts\.gstatic\.com,ERR_NETWORK_CHANGED'`): `17 passed`, `1 skipped` (width sweep runs on desktop only). With `report-block.spec.ts` and the other chat specs: `58 passed`, `6 skipped`.
- Full e2e suite, same setup: `173 passed`, `37 skipped`, `30 failed`. The 30 are in `invite-inbox` (3), `profile-edit-flow` (16), `staff-review` (6), `staff-shell` (5): the same files and count as the 8.5 / 8.6 handoff's baseline (unstyled Tailwind-CDN axe and layout checks), none in a file this story touches.
  - The first full run had 32 failures: the 2 extra were `report-block.spec.ts` « Signaler ce message … » on both projects, `label-content-name-mismatch` on `#thread-photo` / `#thread-voice` (`aria-label` vs. the visible ligature word when the icon font is missing). Fixed by naming the buttons with hidden text (section 7); now green.
- Styled browser check (scratch Playwright script, Tailwind 3.4.17 built locally from the screen 21 config, API mocked, long pseudonym, two Photos and two Voice notes, Chromium fake microphone) at 360, 390, 768, 1024, 1280, 1440, full and Lite, for the thread, recording, « Note vocale prête » and the Photo preview (30 states): horizontal overflow 0, no bubble outside the viewport, zero serious or critical axe violations (WCAG 2.2 AA tags), no visible control under 44 × 44 px, no console error. It caught three problems, all fixed before this handoff:
  1. With Tailwind's shrink-to-fit bubble, `width: min(260px, 100%)` collapsed the Photo to 0 px once the clear image replaced the blur (the unstyled e2e could not see it). Now `min(260px, 100vw - 112px)`.
  2. At 360 px the 320 px Voice note card pushed its bubble past both screen edges (clipped by the thread, so overflow read 0). Now `min(300px, 100vw - 112px)`; the check now also measures each bubble against the viewport.
  3. The play / pause `aria-label` mismatch and the soft-gold voice icon contrast on light backgrounds (section 7).
- Screenshots (360 and 1440: thread full and Lite, recording, voice ready, Photo preview) are in `code/docs/qa-handoffs/5-3-5-4-chat-media-evidence/`, **left untracked on purpose** (not committed).
