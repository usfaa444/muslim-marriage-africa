# QA handoff: Realtime Chat thread without a hold state (5.1) and Send Chat text: delivered, then enqueue scan (5.2)

- Story id: `5-1-5-2-text-chat`. Spec: `_bmad-output/implementation-artifacts/spec-5-1-5-2-text-chat.md` (epics.md Epic 5, Stories 5.1 and 5.2).
- Branch: `factory/text-chat` (from `main` at `58f121d`, the PR #10 merge). Committed locally. Not pushed, no PR, not deployed.
- Product-owner scope (Faycal, 2026-10-23): 5.1 and 5.2 only. The Free-tier daily message cap (Story 5.11, FR-146, `MESSAGE_CAP_EXCEEDED`, `message_quota`) is **out**; the send has a seam that always allows. No photos, no voice notes.
- Developer: Claude (factory-dev). Nothing below says "verified" unless it was run; section 8 has the real result lines.

## 1. What was built

### API (all under `/v1`, member session cookie, `Cache-Control: no-store`)

Every route runs the same viewer gate as Stories 4.1 to 4.5: live session (`requireLiveSession`, PIN lock `PIN_REQUIRED`), then `assertBrowseViewer` (no session 401, staff 403, mahram 403, viewer not listable 403). A conversation is visible only to the two members of its accepted invite, found through `InvitesPort.acceptedFor(me)`; chat never reads `invite`. A `:id` that is not a UUID, does not exist, or is not mine is the same **404 `NOT_FOUND` « Cette discussion n'existe pas. »**. No route calls `BillingPort`.

**`GET /v1/conversations`** (extends 4.5): `{ count, items }`, latest activity first (last message time, or the conversation's own time when it has none). Item: `{ id, invite_id, stage, other_id, pseudonym, other, last_message }`.
- `other`: `{ available: true, age, city, verified, photo }` while the other account is an Active member with a public profile, else `{ available: false }`. `photo` is the live MAIN photo as a **blur** grant `{ id, url }`, or null.
- `last_message`: `{ id, mine, kind, preview, created_at }` or null. `preview` is the decrypted text cut to 120 characters, counted as graphemes so an emoji is never split (retest F2), (null if it cannot be decrypted). No unread count, no read receipt.

**`GET /v1/conversations/:id`**: `{ conversation: { id, stage, other_id, pseudonym, other, closed }, me: { id } }`. `closed` is true when the conversation is paused or ended (retest F3).

**`GET /v1/conversations/:id/messages`** `?limit=1..50` (default 30), and at most one of `before=<message id>` (older page) or `after=<message id>` (catch-up after an event).
- Items oldest first: `{ id, conversation_id, sender_id, mine, kind: 'text', state: 'delivered', text, created_at }`, plus `has_more`. With `after`, `has_more` means newer messages exist past this page; otherwise it means older messages exist before the first item.
- A bad `limit`, `before` or `after`, or both cursors at once, is 400 `UNHANDLED` naming the field.
- A text that cannot be decrypted (unknown `kid`, missing key) comes back as `text: null`.

**`POST /v1/conversations/:id/messages`** `{ kind: 'text', text }` → **201** `{ message: <item, mine: true> }`. The checks run in this order, and nothing is written when one fails:
1. Viewer gate, then the participant check (404).
2. `kind` other than `text` is 400 « kind : valeur non reconnue. » `{ field: 'kind' }`.
3. `text` is trimmed. Empty is 400 « Écrivez un message. » `{ field: 'text' }`. Over 2000 characters is 400 « Message trop long (2000 caractères au plus). » `{ field: 'text', max: 2000 }`.
4. A paused or ended conversation is 409 « Cette discussion est fermée. » `{ reason: 'conversation_closed' }`. Another member who is no longer available is 409 « Ce profil n'est plus disponible. » `{ reason: 'other_unavailable' }`.
5. `checkMessageCap` (seam for Story 5.11): always allows today and reads nothing.
6. No chat key configured is 503 « Envoi indisponible pour le moment. Réessayez plus tard. » `retryable: true`.
7. Insert `message` with `state = 'delivered'`. The body is the envelope `{ v, alg: 'A256GCM', kid, iv, ct }`, with AES-256-GCM additional data `<conversation id>:<message id>`.
8. Emit `message.delivered` `{ conversation_id, message_id, sender_id }` to both members.
9. `ModerationPort.enqueueScan({ itemId, itemKind: 'message', accountId, payload: { kind: 'text', text } })`, awaited for at most 1 s. A throw, a rejection or a timeout logs `chat scan_enqueue_failed message=<id>` (ids only) and leaves the 201 unchanged.

**ModerationPort** (`packages/ports`) and `moderation.ts`:
- `moderation.ts` is the only code that inserts `moderation_job`; a source test enforces this.
- Each send writes one row `{ id, message_id, outcome: null }` (null = queued).
- The plaintext payload is accepted and **not stored**: no scanner exists until Epic 8, and storing it would undo the encryption at rest.

**Realtime** (`/v1/realtime`, Socket.IO 4.8.4, attached to the api HTTP server):
- The client script is served at `/v1/realtime/socket.io.min.js`. The path has no trailing slash (`addTrailingSlash: false`), because Next answers `/v1/realtime/` with a 308.
- Handshake checks:
  - An `Origin` outside `ANKANU_ALLOWED_ORIGINS` is refused before the upgrade.
  - No live session is `UNAUTHENTICATED`.
  - A PIN lock is `PIN_REQUIRED`.
  - Staff, mahram or an unlisted viewer is `FORBIDDEN`.
- A socket joins only `account:<its id>`.
- Server to client: `message.delivered` `{ conversation_id, message_id, sender_id }`. Ids only: no text, no pseudonym, no URL.
- Client to server: `conversation.typing` `{ conversation_id }`. The server re-checks the session and the participant check, relays at most once per second per socket and conversation, and sends `{ conversation_id, account_id }` to the other member only. A non-participant gets no answer.
- No `pending`, `held` or `blocked` event exists.

**Schema** (migration `0023_message.sql`):
- `message`:
  - check `kind in ('text','photo','voice')`,
  - check `state = 'delivered'`,
  - FKs to `conversation` and `account`,
  - index `(conversation_id, id)`.
- `moderation_job`:
  - `outcome` is nullable, with an enum check for set values,
  - exactly one of `message_id`, `asset_id` or `flash_id` is set,
  - `message_id` is unique.

**Key:** `CHAT_KEY` (base64 of 32 bytes) and `CHAT_KID`.
- A malformed key refuses to boot.
- A missing key refuses a production boot unless `RECAPTCHA_ALLOW_TEST_KEYS=1` (local and staging compose). In that case the api starts and every send answers 503.

### Web

**`/discussions`** (Stitch `20-discussions-list`, inside the shared app shell, nav item « Discussions » current). It replaces the title-only placeholder (`member-section-page.ts` is removed).
- Header: eyebrow « Échanges concertés & bienséance » in gold, title « Discussions Ta'aruf ».
- Each row shows:
  - a blur thumbnail or the initial,
  - « <pseudonyme>, <âge> ans » and the city,
  - « Identité vérifiée » when verified,
  - the last message in « … », prefixed « Vous : » when mine, or « Aucun message pour l'instant. » when there is none,
  - the time (« Aujourd'hui à 10:15 », « Hier à 17:40 », « 12 octobre à 09:05 »),
  - the link « Accéder à la conversation », whose accessible name includes the pseudonym.
- An unavailable member shows « Profil indisponible », with no pseudonym and no link (retest F5).
- The link's accessible name comes from its content (« Accéder à la conversation » plus a screen-reader-only « avec <pseudonyme> »), not from an `aria-label` (retest F1).
- Footer: « Pour les invitations envoyées en attente, le fil de discussion ne s'ouvre qu'après acceptation formelle de la sœur. » and « Registre des échanges : N fil(s) actif(s) ».
- States:
  - « Chargement… ».
  - Empty: « Aucune discussion. » + « Une discussion s'ouvre quand une invitation Ta'aruf est acceptée. » + « Voir mes invitations ».
  - Error: « Chargement impossible. Vérifiez votre connexion et réessayez. » + « Réessayer ».
- A `message.delivered` event reloads the list.

**`/discussions/<id>`** (Stitch `21-chat-thread`). A non-UUID id redirects to `/discussions`.
- « Retour aux discussions ».
- Header: blur avatar, « <pseudonyme>, <âge> ans », verified mark, city, chip « Étape : discussion ».
- The message list is `role="log"`, with day separators « Aujourd'hui », « Hier » or the date.
- Bubbles: mine are navy on the right, theirs cream on the left. The meta line shows the **time only**: no tick, no « Lu », no state.
- « Messages précédents » loads older messages while `has_more`.
- Empty thread: « Aucun message pour l'instant. Commencez la discussion avec bienséance. ».
- Typing: « <pseudonyme> écrit… » in a polite status, hidden 4 s after the last event. The page emits at most one typing event every 1.5 s.
- Composer:
  - Label « Réponse réfléchie et posée », placeholder « Rédigez votre message dans le respect des convenances... ».
  - « Envoyer » is disabled while the box is empty or a send is in flight. Ctrl/Cmd+Enter also sends.
  - The counter « n/2000 » appears from 1800 characters.
  - After a send, the bubble comes from the POST answer and the status says « Message envoyé ».
  - On error the text stays in the box and an alert shows the API message, or « Envoi impossible. Vérifiez votre connexion et réessayez. ».
- Golden rule, with Stitch's spelling corrected: « Règle d'or AnKanu : Évitez d'échanger vos contacts personnels, gardez toute discussion sur la plateforme AnKanu afin de préserver votre sécurité. »
- A conversation that is not mine: « Cette discussion n'existe pas. » + « Retour aux discussions ».
- An unavailable member: « Ce profil n'est plus disponible. », and the composer is disabled.
- A paused or ended conversation: « Cette discussion est fermée. » up front, and the composer is disabled. A 409 `conversation_closed` or `other_unavailable` on send also disables it (retest F3).
- Session expired (a 401 on send or load): « Votre session a expiré. Reconnectez-vous : votre message est gardé pour cette discussion. » with the link « Se reconnecter » (`/auth`). The unsent text is kept in `sessionStorage` for this conversation and returned once on the next successful load of the same thread (retest F4). `/auth` has no `next` parameter, so the member reopens the thread after signing in.
- If the realtime script or socket fails, the page still loads and sends, with no error shown.
- Dropped Stitch lines (the product does not do these):
  - « Wali notifié », « Accord mutuel validé », « Un wali peut lire cette conversation! », « Demander la levée du flou », « Signaler / Bloquer »;
  - « Quota du jour : 4/5 messages » (Story 5.11);
  - the camera and microphone buttons (Stories 5.3, 5.4);
  - the tabs « Non lues » / « Sans réponse », « 1 non lu », « Lu »;
  - « Discussion toujours sécurisés sur AnKanu! »;
  - the sample people and photos.
- The Invite inbox « Ouvrir la discussion » now links to `/discussions/<conversation id>`.

## 2. Where

- Spec: `_bmad-output/implementation-artifacts/spec-5-1-5-2-text-chat.md`.
- Ports: `code/packages/ports/src/index.ts` (`ModerationPort`, `ScanItemKind`, `ScanPayload`).
- New api modules:
  - `code/apps/api/src/chat-key.ts`
  - `code/apps/api/src/chat-messages.ts`
  - `code/apps/api/src/chat-realtime.ts`
  - `code/apps/api/src/moderation.ts`
- Changed api files:
  - `code/apps/api/src/chat.ts` (`find`; the list moved to `chat-messages.ts`)
  - `code/apps/api/src/conversations.controller.ts`
  - `code/apps/api/src/create-app.ts` (attaches and closes realtime)
  - `code/apps/api/src/main.ts` (key boot check)
  - `code/apps/api/src/account-schema.ts`
  - `code/apps/api/package.json` (`socket.io` and `socket.io-client` 4.8.4, exact versions)
- Migration: `code/apps/api/drizzle/0023_message.sql`, plus `meta/0023_snapshot.json` and `_journal.json`. **Run migrate again.**
- Web:
  - `code/apps/web/src/discussions-page.ts` (new, screens 20 and 21)
  - `code/apps/web/src/v2-serve.ts`
  - `code/apps/web/app/discussions/route.ts`
  - `code/apps/web/app/discussions/[id]/route.ts` (new)
  - `code/apps/web/src/entry-guard.ts` (the thread path is account-gated)
  - `code/apps/web/src/invite-inbox-page.ts`
  - `code/apps/web/src/member-section-page.ts` (deleted)
  - `code/apps/web/Dockerfile` and `code/.dockerignore` (Stitch 20, 21)
- Tests:
  - `code/apps/api/src/chat-messages.test.ts` (new)
  - `code/apps/api/src/operator-config.migrate.test.ts`
  - `code/apps/api/src/invite-inbox.test.ts` (shape assertions loosened to `objectContaining` because items grew)
  - `code/apps/web/src/discussions-page.test.ts` (new)
  - `code/apps/web/src/app-shell.test.tsx`
  - `code/apps/web/src/member-route.test.ts`
  - `code/e2e/chat.spec.ts` (new)
  - `code/e2e/app-shell.spec.ts`
  - `code/e2e/invite-inbox.spec.ts`
- **New env vars:** `CHAT_KEY`, `CHAT_KID`, documented in `.factory/config.md` (`~/.ankanu/api.env`) and `code/README.md` (« Chat (text messages and realtime) »).

## 3. How to run

From `code/`: `npm ci`; `npm run lint`; `npm run typecheck`; `npm run build`; `npm run migration-check`; `npm run test:unit`; `npm run test:integration` (Docker); `npm run test:e2e` (web-only on 3100, `/v1` and the realtime script mocked per test).

Full stack (`.factory/config.md`):
1. Add the chat key once:
   ```
   printf 'CHAT_KEY=%s\nCHAT_KID=local-chat-1\n' "$(openssl rand -base64 32)" >> ~/.ankanu/api.env
   ```
2. Run `docker compose -p ankanu-local … up -d --build --wait`.
3. From `apps/api`, run `npx drizzle-kit migrate` (applies `0023_message`).

Manual walk for Faycal on `http://localhost:4012`:
1. Use two disposable accounts, a Brother and a Sister, both fully onboarded, profiles published by staff review, each with a live main photo. Use two browsers, or one normal window and one private window.
2. The Brother sends the Sister an invitation (« Envoyer une invitation Ta'aruf »). The Sister opens « Invitations » and taps « Accepter la démarche ».
3. Both open « Discussions ». Each sees one row for the other member: blurred photo, « Aucun message pour l'instant. ». The Sister taps « Accéder à la conversation ».
4. Brother: open the same thread. Type a few letters. Within about 2 s the Sister sees « <pseudonyme du frère> écrit… ». It disappears about 4 s after he stops.
5. Brother: write « As-salāmu ʿalaykum » and press « Envoyer ». His bubble appears at once on the right with the time only, the box clears, and « Message envoyé » is announced. On the Sister's screen the message appears on the left without a reload.
6. Check nothing says « En cours de vérification », « vérification », « modération », « scan », « Lu » or « non lu », on either screen, at any moment.
7. Sister: go back to « Discussions ». The row shows « …As-salāmu ʿalaykum… » and today's time.
8. Optional DB check (`docker compose -p ankanu-local exec postgres psql -U ankanu -d ankanu`):
   - `select state, kind, body->>'alg', body::text like '%salāmu%' from message;` gives `delivered | text | A256GCM | f`.
   - `select count(*), max(outcome) from moderation_job;` gives one row per message, outcome empty.
   - The api log has no message text: `docker compose -p ankanu-local logs api | grep -i salāmu` prints nothing.
9. Optional: without `CHAT_KEY` in `api.env` (restart the api), a send shows « Envoi indisponible pour le moment. Réessayez plus tard. » and the text stays in the box.

## 4. AC trace table

The test names in `chat-messages.test.ts` number the Story 5.2 criteria 5.2-1 to 5.2-4. The table below uses the spec's 1 to 7.

| ID | Criterion (verbatim) | How it is proven | Status |
|---|---|---|---|
| AC1 (5.1) | Given Chat exists, when I open Discussions, then thread open ≤ 4 s; no hold badge; TalkBack says nothing about scan. | API: `chat-messages.test.ts` « AC 5.1-1: the Discussions list and the thread show the other member blurred, the last message and no hold badge ». Web unit: `discussions-page.test.ts` « AC 5.1-1: no hold badge, no scan wording… » and « AC 5.1-1 / 5.1-3 … » (visible text and all copy against the hold regex). E2e: `chat.spec.ts` « AC 5.1-1: lists each Chat… », « AC 5.1-1: the thread opens within 4 s… » (also checks accessible names), « AC 5.1-1 / NFR-005 on a throttled 3G profile… » (mobile: open 1529 ms). | Done (automated, mocked API). Real TalkBack and a real 3G device are not run. |
| AC2 (5.1) | Given I type, when the other Member is on median 3G, then they see typing within 2 s. | API: « AC 5.1-2: typing reaches the other member within 2 s, only the other member, at most once a second » (real Socket.IO clients). E2e: « AC 5.1-2: typing shows « <pseudonyme> écrit… » and clears… ». Full stack through web:4012 over WebSocket: relay in 8 ms (section 8). | Done (server relay time). Real 3G latency is not measured. |
| AC3 (5.1) | Given I inspect `message.state` in API/DB, when I look for pending/held, then the only created state is `delivered`. No member copy « En cours de vérification ». | DB check `state = 'delivered'` (migration). « AC 5.1-3: every created message is delivered… » (API, including a SQL check). Boundary « no pending, held or blocked Chat event or state exists in the chat sources ». Postgres integration « stores Chat text delivered as ciphertext… ». Web unit and e2e copy regex. | Done |
| AC4 (5.2) | Given I tap send and I am under the FR-146 cap (or Premium), when the row is persisted, then the recipient sees the text without waiting for AI, and Chat calls `ModerationPort.enqueueScan` after persist, and if I am Premium, `message_quota` is not incremented. | « AC 5.2-1: a sent text is stored delivered as ciphertext, the recipient reads it at once, and the scan is enqueued after persist » (order recorded by the port; billing calls 0). « AC 5.2-1 realtime: … message.delivered with ids only, at persist, before any scan » (emitted while the enqueue hangs). E2e « AC 5.2-1: send posts kind text once… » and « AC 5.2-1 realtime: … ». Full stack: 201 `delivered`, event, 1 `moderation_job` row. | Done. `message_quota` does not exist in this story, so the « not incremented » part holds trivially (interpretation, see 7). |
| AC5 (5.2) | Given I am Free and at the FR-146 cap, when I tap send, then I get `MESSAGE_CAP_EXCEEDED` and nothing is stored or held, and no `moderation_job` is enqueued. | Seam only: « AC 5.2-2 seam (deferred to Story 5.11): a refusing cap check stores nothing and enqueues nothing; today it always allows ». | **Deferred to Story 5.11** (product-owner scope decision) |
| AC6 (5.2) | Given AI is down, when I send an allowed text, then ack still returns; scan-deferred is Epic 8's job, not a send block. | « AC 5.2-3: when AI is down or slow the send still acknowledges… »: an enqueue that throws, and one that never resolves, both still give 201 within 2 s, with the ids-only log line. | Done |
| AC7 (5.2) | Given I send an allowed text from 3G, when ack timing, then send-text ack ≤ 2 s (NFR-005). | The same API tests assert < 2 s. E2e throttled 3G (mobile): ack 854 ms. Full stack through 4012: ack 37 ms (section 8). | Done (mocked latency). A real 3G device belongs to QA on staging. |
| Auth | Participants only, server side, every route and the socket | « participants only: no session, staff, mahram, another member and malformed ids are refused on every route and socket ». « refuses a socket from another origin, without a session, or behind a PIN lock ». Full stack: foreign origin refused, unknown session `UNAUTHENTICATED`. | Done |
| Privacy | Body stored as ciphertext; events ids only; no text in logs | « … stored delivered as ciphertext … »; « without CHAT_KEY a send is 503 and stores nothing; a moved or foreign envelope never decrypts »; Postgres integration; full stack: the DB body does not contain the text. | Done |
| AD-21 | No `BillingPort` on chat GET, list, send, typing or join | Boundary « chat routes, send, typing and the socket never reach BillingPort in this story » (source) and billing call counts of 0. | Done |
| AD-10 | Moderation is the only writer of `moderation_job` and never reads `message` | Boundary tests « only moderation.ts inserts moderation_job… » and « only chat-messages.ts inserts message ». | Done |
| Edge | Validation, closed conversation, unavailable member, pending invite, missing key | « validates kind and text, and writes nothing on a refusal »; « a pending Invite has no thread; a closed conversation or an unavailable member refuses the send »; « without CHAT_KEY … ». | Done |
| Edge | Paging, ordering | « orders Discussions by latest activity and pages messages with before, after and limit ». | Done |
| Edge (web) | Empty, error, retry, double click, Ctrl+Enter, refused send, network failure, not mine, unavailable, bad id | `chat.spec.ts`: « shows the empty state… and a retry… », « AC 5.2-1: send posts kind text once… » (double click), « a refused send keeps the text… », « a conversation that is not mine… », « a malformed thread id goes back to the list »; `discussions-page.test.ts` routes tests (staff and mahram 403 JSON, anonymous to `/auth`). | Done |
| Responsive / a11y | No horizontal scroll 360 to 1440, axe WCAG 2.2 AA, 44 px targets | `chat.spec.ts` « fits every factory width » (list and thread, 6 widths, axe on each). | Done, **unstyled** (Tailwind CDN unreachable here). Styled check pending on Faycal's Mac. |
| Local stack | WebSocket through the web proxy on 4012 | Full stack script (section 8): `transport=websocket` connected via `http://localhost:4012`; polling `/v1/realtime?EIO=4&transport=polling` 200. | Done |

## 5. Test cases for QA

| # | Input | Expected |
|---|---|---|
| 1 | Open `/discussions` with no conversation | « Aucune discussion. », the explanation line, « Voir mes invitations » linking to `/invitations` |
| 2 | Accept an invite, open `/discussions` | One row, blur photo, « Aucun message pour l'instant. », « Registre des échanges : 1 fil actif » |
| 3 | Send « Bonjour » | Bubble right, time only, box clears, « Message envoyé »; the other member sees it without a reload |
| 4 | Double-click « Envoyer » quickly | Exactly one message |
| 5 | Send spaces only | Button stays disabled; via the API, 400 « Écrivez un message. » |
| 6 | Paste 2001 characters | Counter « 2001/2000 »; the API answers 400 « Message trop long (2000 caractères au plus). »; the text stays in the box |
| 7 | Type in one browser | The other browser shows « <pseudonyme> écrit… » within 2 s; gone about 4 s after typing stops |
| 8 | Open `/discussions/<another pair's conversation id>` | « Cette discussion n'existe pas. »; API 404 |
| 9 | Open `/discussions/abc` | Redirect to `/discussions` |
| 10 | Signed out, open `/discussions/<id>` | Redirect to `/auth` |
| 11 | Staff session on `/v1/conversations` | 403 |
| 12 | `POST …/messages` with `{kind:'photo'}` | 400 « kind : valeur non reconnue. », nothing stored |
| 13 | Other member's account suspended | Thread shows « Ce profil n'est plus disponible. », composer disabled; send 409 `other_unavailable` |
| 14 | Remove `CHAT_KEY`, restart api, send | 503 « Envoi indisponible pour le moment. Réessayez plus tard. », nothing stored |
| 15 | Socket from another origin (`Origin: https://evil.example`) | Handshake refused |
| 16 | Inspect DB after sends | `message.state` only `delivered`; `body` has `v, alg, kid, iv, ct`, no plaintext; one `moderation_job` per message, `outcome` null |
| 17 | Look for hold or scan copy at every moment of a send, on both screens, with TalkBack or VoiceOver | Nothing about scan, verification, moderation, pending or read state |
| 18 | 360 px and 1440 px, both screens | No horizontal scroll; composer and send button reachable by keyboard |
| 19 | More than 30 messages, scroll up | « Messages précédents » loads older ones in order |

## 6. Out of scope

- Free-tier cap and `message_quota`, `MESSAGE_CAP_EXCEEDED`, Premium distinction (Story 5.11).
- Photos (5.3), voice notes (5.4), contact-share and money-ask education, stage changes beyond display, reactions (5.5 to 5.10).
- Mahram thread reads (Epic 6). Scanner worker, scan-deferred bookkeeping, holds and blocks (Epic 8).
- Push or SMS notifications, outbox, read receipts, unread counts.
- The Redis Socket.IO adapter (see 7).

## 7. Assumptions and known issues

**Interpretations:**
- AC4 « `message_quota` not incremented »: no `message_quota` exists for anyone in this story.
- AC1 « TalkBack says nothing about scan »: no element contains such wording, visible or screen-reader only. This is checked on the rendered text and accessible names, not with a real screen reader.
- AC2 and AC7 « 3G »: measured as server relay and acknowledgement time, plus an e2e run with a CDP Fast-3G profile. CDP throttling does not apply to route-fulfilled requests, so the test adds 712.5 ms of explicit latency to each mocked API answer. A real 3G device is QA on staging.

**Design decisions:**
- **`moderation_job.outcome` is nullable** (null = queued), against SOLUTION-DESIGN §6's NOT NULL. A job enqueued after persist has no outcome until Epic 8 scans it.
- **The scan payload is not persisted** by the Postgres moderation adapter (no scanner yet; storing plaintext would undo the encryption). Epic 8 must decide how the worker gets the text, for example by decrypting by message id inside moderation, or through a queue.
- **Redis adapter (AD-15) deferred.** Socket.IO uses its in-memory adapter. That is correct with the one api process the compose stack runs; a second api process will need the Redis adapter. It was left out because a dropped Redis connection can reject publishes, which this story has no reason to risk.

**Copy:**
- The Stitch golden-rule typos were corrected (« Evitez d'echanger vos contact personel … plateform … preserver votre securite »).
- The Stitch lines listed in section 1 are dropped.

**Environment:**
- **Site-wide 3G risk, not this story's code.** The Stitch page head loads the Tailwind CDN and Google Fonts render-blocking. On real 3G that alone can exceed the 4 s open budget. The throttled e2e answers those hosts with empty bodies to measure first-party payload only. Worth a separate story (self-hosted CSS).
- **The cloud container cannot reach the Tailwind CDN or reCAPTCHA.** All browser checks here ran unstyled (`E2E_ALLOW_ERRORS='cdn\.tailwindcss\.com,tailwind is not defined'`). Styled visual comparison with Stitch 20 and 21, and the real signup flow, are for Faycal's Mac.
- Pre-existing failures in this container, identical on `main` at `58f121d`:
  - **3 unit tests:** `photo-rules.test.ts` « keeps a 32px play circle… », `ank-148-fix.test.ts`, `v2-responsive.test.ts`.
  - **30 e2e tests:** `invite-inbox` target sizes, `profile-edit-flow`, `staff-review`, `staff-shell`. They are size and contrast checks that need the Tailwind styles.
  - None of these tests touch chat.
- `compose.test.ts` (integration) fails here because `npm ci` inside the Docker build hits the proxy's self-signed certificate. For the manual full-stack run I built the images with scratch Dockerfiles that mount the CA as a build secret; the repo Dockerfiles are unchanged.
- `npm audit --omit=dev --audit-level=high`: 1 critical in `next` 16.0.0 to 16.4.0, also on `main`. The fix is `next@16.4.3`, outside this story. The socket.io packages have no advisories.
- Running the web dev server creates `apps/web/AGENTS.md` and `apps/web/CLAUDE.md` (Next tooling), and the unit/e2e runs rewrite screenshots under `docs/qa-handoffs/ank-83-widths` and `epic-3-*`. I discarded both; they are not part of the commits.

**Not verified:**
- The `/discussions` HTML pages on the full stack with a real account. My seeded DB accounts had no email verification or ID steps, so the entry guard sent them to `/email-verification`, exactly as `/invitations` does. The pages were exercised with mocked APIs in e2e and with the dev stubs in unit tests.

## 8. Self-check results (real output, `code/`, branch `factory/text-chat`)

- `npm run lint`: exit 0. Only the 3 pre-existing warnings (`life-pause.ts` no-control-regex, `photo-rules.test.ts` no-this-alias, `v2-flow.test.ts` unused `editBtn`).
- `npm run typecheck`: exit 0.
- `npm run migration-check`: `Everything's fine 🐶🔥`.
- `npm run test:unit`: `Test Files 3 failed | 77 passed (80)`, `Tests 3 failed | 608 passed (611)`. The 3 failures are the pre-existing Chrome ones in 7 (also failing on `main`). `chat-messages.test.ts` (18) and `discussions-page.test.ts` pass.
- `npm run test:integration`: `Test Files 1 failed | 4 passed (5)`, `Tests 32 passed | 2 skipped (34)`. The failure is `compose.test.ts` (Docker build TLS, see 7). `operator-config.migrate.test.ts` alone: `Tests 17 passed (17)`, including « stores Chat text delivered as ciphertext, pages it, and queues one moderation_job per message on migrated Postgres (Stories 5.1, 5.2) ».
- E2e, touched area (`chat.spec.ts`, `app-shell.spec.ts`, `invite-inbox.spec.ts`): `66 passed`, `11 skipped`, `3 failed`.
  - All `chat.spec.ts` tests pass on mobile and desktop. The throttled-3G test is mobile only.
  - The 3 failures are pre-existing `invite-inbox` target-size and axe failures, identical on `main`.
- E2e, full suite: `129 passed`, `31 skipped`, `30 failed`. The same 30 tests fail on `main` at `58f121d` with the same environment (sorted failure lists identical apart from one shifted line number).
- `npm audit --omit=dev --audit-level=high`: 1 critical (`next`, pre-existing on `main`).
- Full stack, local compose (`ankanu-local`, rebuilt images, migration 0023 applied, `CHAT_KEY` set). Two members seeded in Postgres with an accepted invite and a conversation; Node `socket.io-client` through `http://localhost:4012`:
  ```
  GET /v1/conversations (sister) 200 count=1 other=Frere_6830q last_message=null
  websocket via web:4012 connected sister=true brother=true transport=websocket
  foreign origin refused: websocket error
  unknown session refused: UNAUTHENTICATED {"code":"UNAUTHENTICATED"}
  typing relayed {"conversation_id":"…","account_id":"…"} in 8 ms
  POST message 201 state=delivered ack 37 ms
  message.delivered keys=conversation_id,message_id,sender_id … at +37 ms
  GET messages (brother) 200 [{"mine":false,"state":"delivered","text":"As-salāmu ʿalaykum, test de bout en bout."}]
  DB message: delivered text true false kid=local-chat-1     (has envelope, plaintext not in body)
  DB moderation_job: 1 outcome=null
  stranger session GET thread 401
  ```
  The seeded rows were deleted afterwards.

## 9. Retest: QA round 1 (report `5-1-5-2-text-chat-qa-report.md`, commit be0e671)

| Finding | Fix | Regression test |
|---|---|---|
| F1 (minor, a11y) `label-content-name-mismatch` on the list link when the icon font is missing | The link no longer has an `aria-label`. Its name comes from its content: visible « Accéder à la conversation », a screen-reader-only « avec <pseudonyme> », and the icon span stays `aria-hidden`. | `e2e/chat.spec.ts` « QA F1: the row link is named by its visible words, with no aria-label and the icon kept out of the name » (fails on the old markup; checked by reverting); `discussions-page.test.ts` (no `aria-label` set on the row link) |
| F2 (minor) The preview cut split an emoji | `preview()` cuts on graphemes with `Intl.Segmenter`, so it never lands inside a surrogate pair or a ZWJ sequence | `chat-messages.test.ts` « AC 5.1-1: the Discussions list… » now sends 300 × 🌙 and 200 × 👨‍👩‍👧 and checks the exact cut and `isWellFormed()` |
| F3 (minor) A closed conversation was only discovered on send | `GET /v1/conversations/:id` returns `closed`. The thread shows « Cette discussion est fermée. » and disables the composer. A 409 `conversation_closed` or `other_unavailable` on send disables it too. | `chat-messages.test.ts` « a pending Invite has no thread; a closed conversation… » (`closed` false, then true when ended, true when paused, 409 when paused); e2e « QA F3: a paused or ended conversation says so up front… » and the extended « a refused send keeps the text… » |
| F4 (minor) An expired session gave no way back | A 401 on send shows the expiry message with « Se reconnecter » (`/auth`) and keeps the text in the box and in `sessionStorage` for this thread. A 401 on load shows the same message and link. The next successful load of the thread restores the draft once. | e2e « QA F4: a session that expires mid-thread offers « Se reconnecter » and keeps the draft for the next visit » |
| F5 (minor) The row for an unavailable member still showed the name and link | The row shows « Profil indisponible », the initial « ? », the last message and time, and no link | e2e « QA F5: a row for a member who is no longer available… »; `discussions-page.test.ts` |
| F6 (minor) Malformed JSON gives the parser's English text | Not changed, as asked. This is the global body parser, not chat. Noted under Deferred in the spec. | n/a |
| F7 (design note) No job and no retry after an enqueue failure | Not changed, as asked. Noted for Epic 8 (reconciliation sweep) under Deferred in the spec. | n/a |
| F8 (process) `test:integration` wiped `pg-data` of the running local stack | `test:integration` was **not** run in this retest; the `ankanu-local` stack is still up. Run it only with the local stack stopped. | n/a |

Retest self-check (real output):
- `npm run lint`: exit 0, only the 3 pre-existing warnings.
- `npm run typecheck`: exit 0.
- `npx vitest run apps/api/src/chat-messages.test.ts`: `Tests 18 passed (18)`.
- `discussions-page.test.ts` + `app-shell.test.tsx`: `Tests 53 passed (53)`.
- `npm run test:unit`: `Test Files 2 failed | 78 passed (80)`, `Tests 2 failed | 609 passed (611)`. The 2 failures are the pre-existing Chrome checks `photo-rules` and `v2-responsive` (`ank-148-fix` passed this run).
- `npx playwright test e2e/chat.spec.ts`: `31 passed`, `3 skipped` (the width sweeps and the throttled test run on one project each).
  - Run with `E2E_ALLOW_ERRORS` for the Tailwind CDN, Google Fonts and `ERR_NETWORK_CHANGED`, this environment only.
- `npm run test:integration`: not run (F8).

F1 has not been checked with the Material Symbols font loaded; that check is for the Mac. The e2e test proves there is no `aria-label`, and axe passes with the ligature shown as text.
