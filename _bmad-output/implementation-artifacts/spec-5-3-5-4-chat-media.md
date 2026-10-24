---
title: 'Send a Chat Photo: delivered, then enqueue scan (5.3) and Send a Voice note: playable immediately (5.4)'
type: 'feature'
created: '2026-10-24'
status: 'ready'
route: 'factory'
story_id: '5-3-5-4-chat-media'
depends_on: '5-1-5-2-text-chat (PR #11, merged) and 8-5-8-6-report-and-block (PR #12, open; this branch is based on it)'
---

## Intent

**Problem:** since Stories 5.1 and 5.2 a conversation carries text only. The Stitch Chat thread (screen 21) has a camera and a microphone button and a Voice note bubble, but Story 5.1 dropped them because nothing stood behind them. `message.kind` already allows `photo` and `voice`, `message.media_id` exists, and `photo_asset.kind` already allows `chat_photo` and `voice_note`, but no command stores one, no route signs one, and the send command refuses any kind but `text`.

**Approach:** the same send command (`POST /v1/conversations/:id/messages`) accepts `kind: 'photo'` and `kind: 'voice'`. Every kind goes through the same participant check, closed / Block check, other-member check, cap seam (`checkMessageCap`, Story 5.11) and chat-key check, in that order, before anything is written. The media module (new `media-chat.ts`) validates the bytes, removes metadata, makes the Photo's server blur, and writes the objects and one `photo_asset` row (`chat_photo` or `voice_note`, no moderation state). Chat then inserts the `message` (`state = 'delivered'`, `media_id` set, a sealed metadata envelope as `body`), emits `message.delivered` (ids only), and only then calls `ModerationPort.enqueueScan` once, keyed by the message id, with the media id in the payload. A reader gets the Photo's blur signed for them in the message list and fetches the clear Photo or the Voice note audio through a new per-caller signing route. The web brings back the Stitch camera and microphone buttons, compresses the Photo in the browser, records the Voice note with MediaRecorder, and renders both bubbles. French only. No GIF picker.

Sources: epics.md Stories 5.3, 5.4 (and 5.11 for the seam); PRD FR-050, FR-051, FR-063, FR-064, FR-146, FR-056 to FR-059, NFR-005; ARCHITECTURE-SPINE AD-9 (only a signer mints a URL; capability token to the media gateway; TTL ≤ 60 s; never `original`), AD-10 (persist `delivered`, then `enqueueScan`; `applyModeration` only for `profile_photo` and bio; sign for `chat_photo` / `voice_note` must not wait on it; Chat Voice is not `content.audio_asset`), AD-11 (Mooré / Dioula never hold), AD-15 (events carry `media_id` at most, never a signed URL; each reader signs at read time), AD-16 (Lite: deferred images, no autoplay; chat first page ≤ 80 KB), AD-21 / AD-29 (no BillingPort on chat; the cap is consulted before insert); SOLUTION-DESIGN §6 `photo_asset`, `message`, §8 chat path, §9 photo privacy; review-security-privacy SEC-1 (non-transferable tokens; sign at read time per caller); EXPERIENCE.md « Chat thread », `voice-note`, `lite-placeholder`; DESIGN.md `chat-bubble`, `voice-note`; Stitch `21-chat-thread`.

## Boundaries & Constraints

**Always:**

- **Send order** (`POST /v1/conversations/:id/messages`), nothing written when a step refuses:
  1. Viewer gate (live session, PIN gate, `assertBrowseViewer`), then participant check (404 « Cette discussion n'existe pas. »).
  2. Body by `kind`:
     - `text`: as Story 5.2.
     - `photo` `{ image: base64 }`: JPEG or PNG only (magic bytes), at most 2 MiB (2 097 152 bytes) decoded, longest edge at most 6000 px read from the header before any decode. Errors 400 `UNHANDLED`: « Une photo JPEG ou PNG est requise. » `{ field: 'image' }`, « Photo trop lourde (2 Mo au plus). » `{ field: 'image', max: 2097152 }`, « Photo trop grande (6000 pixels de côté au plus). » `{ field: 'image', max: 6000 }`. Metadata is removed before storage: JPEG APP1 to APP15 (EXIF, XMP, GPS) and comments; PNG keeps only image chunks (no `eXIf`, `tEXt`, `zTXt`, `iTXt`, `tIME`). A file that does not decode is « Une photo JPEG ou PNG est requise. ».
     - `voice` `{ audio: base64, duration_ms, language? }`: WebM, Ogg or MP4 container (magic bytes), at most 1 MiB (1 048 576 bytes); `duration_ms` an integer from 1000 to 120 000; `language` absent, null, `fr`, `mos` or `dyu`. Errors 400: « Une note vocale est requise. » `{ field: 'audio' }`, « Note vocale trop lourde (1 Mo au plus). » `{ field: 'audio', max: 1048576 }`, « Note vocale trop longue (2 minutes au plus). » `{ field: 'duration_ms', max: 120000 }`, « Note vocale trop courte (1 seconde au moins). » `{ field: 'duration_ms' }`, « duration_ms : valeur non reconnue. », « language : valeur non reconnue. ».
     - Any other kind (`gif`, `sticker`, …): « kind : valeur non reconnue. » `{ field: 'kind' }`.
  3. Closed (ended, paused, or a Block either way): 409 « Cette discussion est fermée. » `{ reason: 'conversation_closed' }`. Other member not available: 409 « Ce profil n'est plus disponible. » `{ reason: 'other_unavailable' }`.
  4. `checkMessageCap({ senderId, kind: 'photo' | 'voice', now })`. A refusal answers 429 `MESSAGE_CAP_EXCEEDED` « Limite de messages du jour atteinte. » `{ cap, resets_at }`, and nothing is stored, held or enqueued (no object, no `photo_asset`, no `message`, no job). Today it always allows (Story 5.11 owns the real check and `message_quota`).
  5. Chat key present, else 503 « Envoi indisponible pour le moment. Réessayez plus tard. » `retryable: true`.
  6. Media module stores the objects and the `photo_asset` row: Chat Photo `chat-photo/<id>/original`, `/md` (clear, same cleaned bytes), `/blur` (server blur, as for profile photos) with `derivative` rows `blur` and `md`; Voice note `voice-note/<id>/original`. `moderation_state` null, `is_main` false. Object storage missing: 503 with the same message, no message, no job.
  7. Insert `message { kind: 'photo' | 'voice', state: 'delivered', media_id, body }`. `body` is the AES-GCM envelope of a small JSON (`{ w, h }` for a Photo, `{ d, l }` for a Voice note), bound to its conversation and message id like a text.
  8. Emit `message.delivered` `{ conversation_id, message_id, sender_id }` to both members. No media id, no URL.
  9. `ModerationPort.enqueueScan({ itemId: message.id, itemKind: 'message', accountId, payload })`, awaited at most 1 s, failures logged and ignored as in Story 5.2. Payload `{ kind: 'photo', mediaId, contentType }` or `{ kind: 'voice', mediaId, contentType, durationMs, language }`. One job per message (not a second one keyed by asset). The worker (Epic 8) reads the bytes with `fetchChatMediaForScan(mediaId)`.
  10. 201 `{ message }`.
- **Message item** (list, catch-up and send answer): as Story 5.1 plus, for `photo` and `voice` only, `media`: Photo `{ id, kind: 'photo', width, height, blur_url }`, Voice note `{ id, kind: 'voice', duration_ms }`. `text` is null for both. `blur_url` is signed for this reader at read time (null when signing fails, the message is still listed). No transcript field exists. `last_message` in `GET /v1/conversations` keeps `kind` and `preview: null` for media.
- **`GET /v1/conversations/:id/messages/:messageId/media`** (new): viewer gate, participant check (404 « Cette discussion n'existe pas. »); the message must be in that conversation and be a Photo or a Voice note, else 404 `NOT_FOUND` « Ce média est introuvable. ». Answers `{ url, expires_at }` (`Cache-Control: no-store`): the clear Photo (`md`) or the Voice note audio, signed for the caller. A closed or blocked conversation stays readable (history is evidence for a Report). TTL unreadable: 503.
- **Signing and serving** (AD-9, SEC-1): `signChatMedia(asset, 'blur' | 'clear', viewer)` is the only signer of Chat media, and only Chat calls it, after its participant check, for the caller. It reads no moderation state and waits on nothing. The generic profile signer `signMedia` refuses any asset that is not a `profile_photo`. The media gateway (`/v1/media/get?token=`) serves a Chat Photo's `blur` or `md` and a Voice note's audio only to the account the grant was minted for, before `expires_at` (TTL from `signed_url_ttl_seconds`, capped at 60 s). The stored `original` of a Chat Photo is never served (a grant for `original` is refused). Serializers never emit a storage key.
- **Schema** (migration `0025_message_media`): `message.media_id` references `photo_asset.id`, and a check keeps kind and media together (`(kind = 'text') = (media_id is null)`).
- **JSON body limit** for `/v1/conversations`: 3 MiB (base64 of a 2 MiB Photo plus the JSON).
- **Web, screen 21** (French only):
  - The Stitch « Joindre une photo sobre » (camera) and « Enregistrer une note vocale sobre » (microphone) buttons, 44 × 44, before the text box; disabled with the composer when the thread is closed or the other member is unavailable.
  - Photo: the button opens the file picker (`accept="image/*"`, so a phone offers camera and gallery). The page re-encodes the image in the browser to JPEG, longest edge 1600 px, quality 0.82, stepping down (1280 / 0.7, 960 / 0.6) until it fits 2 Mo; this also drops EXIF. A panel shows « Préparation de la photo… », then a thumbnail « Aperçu de la photo à envoyer » with « Envoyer la photo » and « Annuler ». Errors: « Ce format de photo n'est pas pris en charge. Choisissez une photo JPEG ou PNG. », « Photo trop lourde (2 Mo au plus). ». After a send the bubble appears from the POST answer and a polite status says « Photo envoyée ».
  - Voice note: the button asks for the microphone, then a panel shows « Enregistrement en cours », a timer « 0:12 / 2:00 », « Arrêter l'enregistrement » and « Annuler ». Opus at 32 kbit/s in WebM (or Ogg / MP4 when the browser only has those). At 2 minutes the recording stops by itself with « Durée maximale atteinte (2 minutes). ». Then « Note vocale prête : 0:12 », a select « Langue de la note » (Français, Mooré, Dioula; Français first), « Envoyer la note vocale » and « Annuler ». Under 1 s: « Note vocale trop courte (1 seconde au moins). »; over 1 Mo: « Note vocale trop lourde (1 Mo au plus). »; no microphone permission: « Micro indisponible. Autorisez l'accès au micro pour enregistrer une note vocale. »; no MediaRecorder: « L'enregistrement vocal n'est pas pris en charge par ce navigateur. ». After a send: « Note vocale envoyée ».
  - A refused media send shows the API message in the alert (cap, 400) and keeps the panel ready; 409 closes the composer as for text; 401 shows the session-expired line.
  - Photo bubble: the server blur (signed, a few hundred bytes) at once, with the size of the Photo reserved (no layout shift). Outside Lite mode the clear Photo is fetched at once through the media route; in Lite mode (2G / 3G, data saver, 1 GB devices, or the member's Lite setting) the bubble shows « Afficher la photo » and fetches nothing more until the tap. Alt text « Photo de <pseudonyme> » or « Votre photo ». On a fetch error: « Photo indisponible pour le moment. » and the button again.
  - Voice note bubble (Stitch): graphic_eq icon, « Note vocale », duration chip « 0:48 », a 44 px play button « Écouter la note vocale » / « Mettre en pause la note vocale », a decorative waveform. Nothing is fetched before the tap (no autoplay, `preload = none`); on tap the page signs, downloads the note once, and plays it; the chip shows « 0:05 / 0:48 » while playing. On error: « Lecture impossible. Réessayez. ». One note plays at a time.
  - « Signaler ce message » under each of the other member's bubbles, media included (Story 8.5).
  - Discussions list: a Photo or Voice note last message reads « Photo » / « Note vocale » (« Vous : Photo » when mine).
  - Touch targets get their 44 px size from the page's own style block too, so they hold even when the Tailwind CDN does not load (2G).

**Never:**

- No hold, pending, scan, verification or moderation state or wording for media; no member-facing transcript; no `applyModeration` on `chat_photo` / `voice_note`; no wait on any review before signing.
- No signed URL, media id or storage key in a realtime event; no URL that works for another account; no `original` served.
- No BillingPort, entitlement or `message_quota` read or write (Story 5.11).
- No GIF picker, GIF kind, sticker or video (FR-054 is NEXT).
- No `content.audio_asset` row for a Voice note.

## Acceptance Criteria

Story 5.3:

1. **Given** I upload a Chat Photo and I am under the FR-146 cap (or Premium), **when** it is stored `kind=chat_photo`, **then** the recipient's thread shows it without waiting for AI, **and** unauthorized viewers still never get originals, **and** if I am Premium, `message_quota` is not incremented.
2. **Given** I am Free and at the FR-146 cap, **when** I try to send a Chat Photo, **then** I get `MESSAGE_CAP_EXCEEDED` and nothing is stored or held. **Seam proven, real cap deferred to Story 5.11.**
3. **Given** sign for chat_photo, **when** MediaPort.sign is called, **then** it must not wait on applyModeration.
4. **Given** GIF picker, **when** I compose, **then** no picker (flag off).

Story 5.4:

5. **Given** I send a Voice note and I am under the FR-146 cap (or Premium), **when** it is stored `kind=voice_note`, **then** the recipient can play it immediately; no member-facing transcript, **and** if I am Premium, `message_quota` is not incremented.
6. **Given** I am Free and at the FR-146 cap, **when** I try to send a Voice note, **then** I get `MESSAGE_CAP_EXCEEDED` and nothing is stored or held. **Seam proven, real cap deferred to Story 5.11.**
7. **Given** Premium is inactive and I am under the cap, **when** I send, **then** the action is not blocked as a safety paywall; it still counts against FR-146.
8. **Given** language is mos/dyu, **when** enqueueScan runs later on an allowed Voice note, **then** delivery already happened — AD-11 does not hold.

Interpretation notes (flagged in the handoff):

- « Unauthorized viewers still never get originals » (AC 1): only the two conversation members can mint a URL; tokens are bound to the caller and live at most 60 s; the stored `original` object is never served to anyone (members get the cleaned `md` copy). **Decision taken for the spec:** the recipient sees the Photo clear. Sending a Photo in a conversation is the sender's per-viewer choice; the Profile « flou protecteur » setting (FR-056 to FR-059) governs Profile Photos, not a Photo a member deliberately sends. The blur is shown first as a placeholder, and in Lite mode until the tap. If the product owner wants Chat Photos to follow the sender's blur setting instead, it is one rule in `signChatMedia`.
- « Premium: `message_quota` not incremented » (AC 1, 5) and « still counts against FR-146 » (AC 7): no `message_quota` exists before Story 5.11. Proven today: no BillingPort read, every media send goes through `checkMessageCap` with its kind, and a refusing seam stores nothing.
- « MediaPort.sign » (AC 3): there is no `MediaPort` interface in `@ankanu/ports` yet; the media module's signer for Chat media is `signChatMedia`. It reads no moderation state; tests prove a send and a sign succeed while the scan enqueue hangs.
- « Flag off » (AC 4): there is no GIF feature flag; no picker, kind or code path exists, and a `gif` kind is refused.
- « Language is mos/dyu » (AC 8): the member picks the note's language (default Français); the API accepts `fr | mos | dyu`; the value only travels to the scan payload.
- Voice note limits (2 minutes, 1 Mo) and Photo limits (2 Mo after browser compression, 1600 px) are not in the PRD; chosen for 2G / 3G (NFR-005) and stated in the copy.

## Deferred

- **Free-tier cap and `message_quota`**: Story 5.11, through `checkMessageCap`.
- **Scan worker** (image classifier, STT, lexicons, `flag_queue`): Epic 8; it reads bytes with `fetchChatMediaForScan`.
- **Chat Photo strikes** (PRD: three rejected Profile or Chat Photos block uploads for 24 h): no Chat Photo is ever « rejected » before Epic 8; the strike gate stays on Profile Photos.
- **Mahram reads of media**: Epic 6.
- **Offline outbox / resumable upload** on a broken 2G link: not in this story; a failed send keeps the panel so the member can retry.
- **Orphan objects** when the message insert fails after the media write: a sweep belongs to the erase / retention work (AD-19).

## Code Map

- `code/packages/ports/src/index.ts`: `ScanPayload` photo and voice variants, `VoiceLanguage`.
- `code/apps/api/src/media-chat.ts` (new): validation, metadata stripping, `storeChatPhoto`, `storeVoiceNote`, `signChatMedia`, `fetchChatMediaForScan`.
- `code/apps/api/src/media.ts`: `signMedia` refuses non-profile assets; the gateway serves Chat media grants (`readChatGrant`); `audioContentType`. `media-blur.ts`: `imageSize`.
- `code/apps/api/src/chat-messages.ts`: `sendMessage` (was `sendText`), media items, `mediaAccess`. `conversations.controller.ts`: media route. `create-app.ts`: 3 MiB JSON limit on `/v1/conversations`. `moderation.ts`: comment only.
- `code/apps/api/src/account-schema.ts`, `drizzle/0025_message_media.sql` (+ snapshot, journal).
- Web: `code/apps/web/src/discussions-page.ts`.
- Tests: `apps/api/src/chat-media.test.ts` (new), `chat-messages.test.ts` (the `photo` kind is no longer « non reconnue »: the case now uses `gif`), `operator-config.migrate.test.ts` (new Postgres case, migration count), `apps/web/src/discussions-page.test.ts`, `e2e/chat-media.spec.ts` (new).
