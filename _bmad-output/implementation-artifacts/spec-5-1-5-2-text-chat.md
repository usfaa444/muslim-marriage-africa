---
title: 'Realtime Chat thread without a hold state (5.1) and Send Chat text: delivered, then enqueue scan (5.2)'
type: 'feature'
created: '2026-10-23'
status: 'ready'
route: 'factory'
story_id: '5-1-5-2-text-chat'
depends_on: '4-4-4-5-invite-inbox-accept-decline (PR #10, merged into main at 58f121d)'
---

## Intent

**Problem:** since Stories 4.4 and 4.5 an accepted Invite opens a `conversation` (stage `chat`), but nobody can talk in it. There is no `message` table, no send command, no `ModerationPort`, no realtime channel, and the Discussions tab of the shared app shell is a title-only placeholder (`member-section-page.ts`). The « Ouvrir la discussion » links of the Invite inbox lead to that placeholder.

**Approach:** the chat module grows a `message` store (new migration `0023`), three member routes and a send command. A text is encrypted at rest (`{v, alg, kid, iv, ct}`, AES-256-GCM, key `CHAT_KEY` / `CHAT_KID`), stored with `state = 'delivered'` (the only state the schema allows), pushed to both members as `message.delivered` (ids only) over Socket.IO on `/v1/realtime`, and only then handed to `ModerationPort.enqueueScan` (new minimal moderation module, the only writer of `moderation_job`). A failing or slow enqueue never fails or delays the send acknowledgement. Typing is a Socket.IO event between the two members. The web replaces the Discussions placeholder with the Stitch screen 20 (list) and adds screen 21 (thread) at `/discussions/<id>`, both inside the shared app shell, French only. No hold badge, no pending state, no « En cours de vérification », no scan wording anywhere.

The Free-tier daily message cap (Story 5.11, FR-146, `MESSAGE_CAP_EXCEEDED`, `message_quota`) is **out of scope** by product-owner decision (Faycal, 2026-10-23). The send command has one documented seam, `checkMessageCap`, that today always allows and never calls `BillingPort`.

Sources: epics.md Stories 5.1, 5.2 (and 5.11 for the seam); PRD FR-050, FR-062, NFR-003, NFR-005; ARCHITECTURE-SPINE AD-7 (Socket.IO `/v1/realtime`, error envelope), AD-10 (persist `delivered`, then `ModerationPort.enqueueScan`; AI never blocks a send; moderation never SELECTs `message`), AD-15 (events `conversation.typing`, `message.delivered`; ids only; handshake carries the HTTP `AuthContext`; Redis adapter), AD-16 (chat first page ≤ 80 KB), AD-17 (chat ciphertext envelope, CSRF on cookie WS), AD-21 / AD-29 (no `BillingPort` on GET, list, typing or socket join), AD-23 (chat refuses messages without the conversation FK); SOLUTION-DESIGN §6 `message`, `moderation_job`, §7 resource map, §8 chat path; EXPERIENCE.md rows « Discussions list », « Chat thread », `chat-bubble`; DESIGN.md `chat-bubble`; Stitch `20-discussions-list`, `21-chat-thread`; mockup `mockups/chat-thread.html`.

## Boundaries & Constraints

**Always:**

- **Viewer gate** on every chat route and on the socket handshake: live session (`requireLiveSession`, PIN gate as for HTTP), then `assertBrowseViewer` (staff 403, mahram 403, viewer not listable 403). Mahram thread reads are Epic 6.
- **Participant check:** a conversation is visible only to the two members of its accepted invite, found through `InvitesPort.acceptedFor(me)` (chat never reads the `invite` table). A conversation `:id` that is not a UUID v7, does not exist, or is not mine is the same 404 `NOT_FOUND` « Cette discussion n'existe pas. ».
- **`GET /v1/conversations`** (extends 4.5): `{ count, items }`, newest activity first. Item: `{ id, invite_id, stage, other_id, pseudonym, other, last_message }`. `other` is `{ available: true, age, city, verified, photo }` when the other account is `Active`, member, profile `public`; else `{ available: false }`. `photo` is the live MAIN Profile Photo as a blur derivative `{ id, url }` or null, never a clear image. `last_message` is `{ id, mine, kind, preview, created_at }` or null; `preview` is the decrypted text cut to 120 characters (null when the text cannot be decrypted). No read receipt, no unread count.
- **`GET /v1/conversations/:id`**: `{ conversation: { id, stage, other_id, pseudonym, other }, me: { id } }`.
- **`GET /v1/conversations/:id/messages`** `?limit=1..50` (default 30), and at most one of `before=<message id>` (older page) or `after=<message id>` (catch-up after an event). Items oldest first: `{ id, conversation_id, sender_id, mine, kind: 'text', state: 'delivered', text, created_at }` plus `has_more` (with `after`: newer messages exist past this page; otherwise: older messages exist before the first item). Bad `limit`, `before`, `after` or both cursors: 400 `UNHANDLED` naming the field. A text that cannot be decrypted (unknown `kid`, missing key) is `text: null`. Default page: 30 × 2000 characters stays under the AD-16 80 KB first page.
- **`POST /v1/conversations/:id/messages`** `{ kind: 'text', text }`. Order, nothing written when a step fails:
  1. Viewer gate, then participant check (404).
  2. `kind` must be `text`: else 400 « kind : valeur non reconnue. » `{ field: 'kind' }` (photo and voice are Stories 5.3, 5.4).
  3. `text` is a string, trimmed, 1 to 2000 characters: empty 400 « Écrivez un message. » `{ field: 'text' }`; too long 400 « Message trop long (2000 caractères au plus). » `{ field: 'text', max: 2000 }`.
  4. Conversation open: `ended_at` or `paused_by` set is 409 « Cette discussion est fermée. » `{ reason: 'conversation_closed' }`. The other member not available is 409 « Ce profil n'est plus disponible. » `{ reason: 'other_unavailable' }`.
  5. `checkMessageCap({ senderId, kind, now })` (seam for Story 5.11, always `{ allowed: true }` today, no `BillingPort`, no `message_quota`). When 5.11 makes it refuse, the command must answer `MESSAGE_CAP_EXCEEDED` and stop here: nothing stored, no job.
  6. Chat key present, else 503 `UNHANDLED` « Envoi indisponible pour le moment. Réessayez plus tard. » `retryable: true`, nothing stored.
  7. Insert `message { id (v7), conversation_id, sender_id, kind: 'text', state: 'delivered', body: envelope, media_id: null, created_at }`. The envelope's GCM additional data binds it to its conversation and message id.
  8. Emit `message.delivered` `{ conversation_id, message_id, sender_id }` to both members' rooms.
  9. `ModerationPort.enqueueScan({ itemId: message.id, itemKind: 'message', accountId: sender, payload: { kind: 'text', text } })`, awaited at most 1 s; a throw, a rejection or a timeout is logged as `chat scan_enqueue_failed message=<id>` (ids only) and does not change the answer. Scan-deferred bookkeeping is Epic 8.
  10. 201 `{ message: <item as in the list, mine: true> }`.
- **ModerationPort** (`packages/ports`): `enqueueScan(input) → { jobId }`. Moderation module (`moderation.ts`) is the only code that inserts `moderation_job` (a test asserts it). Row: `{ id, message_id, asset_id, flash_id, scores, outcome, vendor, latency_ms }`; this story writes `message_id` and leaves `outcome` null (queued, not yet scanned). The plaintext payload is accepted by the port and is **not** persisted by this adapter (no scanner exists until Epic 8; storing plaintext in Postgres or Redis would undo the encryption). Moderation never reads `message` and never writes `message.state`.
- **Realtime** (AD-15): Socket.IO server on path `/v1/realtime`, attached to the api HTTP server (api role only), Socket.IO's in-memory adapter. The compose stack runs one api process, so rooms are complete; the AD-15 Redis adapter is deferred until a second api process exists (flagged in the handoff: a Redis adapter whose connection drops can reject publishes, and this story has no reason to take that risk on one process). The client script is served by the api at `/v1/realtime/socket.io.min.js`. Handshake: an `Origin` header outside `ANKANU_ALLOWED_ORIGINS` is refused (same rule as cookie POSTs, AD-17 CSRF); then the HTTP session gate (no session `UNAUTHENTICATED`, PIN lock `PIN_REQUIRED`), then the viewer gate (`FORBIDDEN`). A connected socket joins only its own room `account:<id>`. Events:
  - server → client `message.delivered` `{ conversation_id, message_id, sender_id }`; the reader then fetches the text over HTTP (`after=`). Never a body, a signed URL or a pseudonym.
  - client → server `conversation.typing` `{ conversation_id }`: the server re-checks the session and the participant check, rate-limits to one relay per second per socket and conversation, and emits `conversation.typing` `{ conversation_id, account_id }` to the other member only. No answer to a non-participant.
  - No `message.pending`, `message.held` or `message.blocked` event exists.
- **Encryption key:** `CHAT_KEY` (base64 for 32 bytes) and `CHAT_KID`, like `STAFF_MFA_KEY`. A malformed key never boots; a missing key refuses a production boot unless `RECAPTCHA_ALLOW_TEST_KEYS=1` (local and staging compose), and then sends answer 503 as above. Documented in `.factory/config.md` (`~/.ankanu/api.env`) and `code/README.md`.
- **Web `/discussions`** (Stitch 20) inside the shared app shell (Discussions nav item current), for a live member session and the `web` / `capacitor` dev stubs; staff and mahram stubs keep the member-route refusal. Copy, French only:
  - Eyebrow « Échanges concertés & bienséance », title « Discussions Ta'aruf ».
  - Row: blur thumb or initial, « <pseudonyme>, <âge> ans » · city, « Identité vérifiée » when verified, last-message preview in « … » (prefixed « Vous : » when mine; « Aucun message pour l'instant. » when none), time (« Aujourd'hui à 10:15 », « Hier à 17:40 », « 12 octobre à 09:05 »), link « Accéder à la conversation » to `/discussions/<id>` (accessible name includes the pseudonym). Unavailable other member: « Profil indisponible » instead of name details.
  - Footer: « Pour les invitations envoyées en attente, le fil de discussion ne s'ouvre qu'après acceptation formelle de la sœur. » and « Registre des échanges : N fil(s) actif(s) ».
  - States: loading « Chargement… », empty « Aucune discussion. » + « Une discussion s'ouvre quand une invitation Ta'aruf est acceptée. » + link « Voir mes invitations », load error « Chargement impossible. Vérifiez votre connexion et réessayez. » + « Réessayer ». A `message.delivered` event refreshes the list.
- **Web `/discussions/<id>`** (Stitch 21), a non-UUID id redirects to `/discussions`:
  - « Retour aux discussions » link; header with blur avatar, « <pseudonyme>, <âge> ans », verified mark (accessible name « Identité vérifiée »), city, stage chip « Étape : discussion ».
  - Message list `role="log"`, day separators « Aujourd'hui », « Hier », or the date; bubbles `chat-bubble` (mine navy on the right, theirs cream on the left), meta line time only (DESIGN.md). « Messages précédents » loads the older page when `has_more`.
  - Empty thread: « Aucun message pour l'instant. Commencez la discussion avec bienséance. »
  - Typing: « <pseudonyme> écrit… » in a polite status region, hidden 4 s after the last event; the page emits `conversation.typing` at most every 1.5 s while the member types.
  - Composer: visible label « Réponse réfléchie et posée », textarea placeholder « Rédigez votre message dans le respect des convenances... », button « Envoyer » (disabled while empty or in flight; Ctrl/Cmd+Enter also sends). After a send the bubble appears from the POST answer and a polite status says « Message envoyé ». On error the text stays in the box and the API message (or « Envoi impossible. Vérifiez votre connexion et réessayez. ») shows in an alert. A character counter « n/2000 » appears from 1800 characters.
  - « Règle d'or AnKanu : Évitez d'échanger vos contacts personnels, gardez toute discussion sur la plateforme AnKanu afin de préserver votre sécurité. »
  - Unknown or foreign conversation: « Cette discussion n'existe pas. » + « Retour aux discussions ». Other member unavailable: « Ce profil n'est plus disponible. » and the composer is disabled.
  - Without a realtime connection (script or socket fails) the page still loads and sends; it shows no error for that.
  - No horizontal scroll from 360 to 1440, keyboard reachable, axe clean (WCAG 2.2 AA), 44 px targets.
- **Local stack:** the web container's `/v1/:path*` rewrite proxies the WebSocket upgrade for `/v1/realtime` (Next.js `next start` proxies upgrades on external rewrites); polling works through the same rewrite.

**Never:**

- No `pending`, `held`, `blocked`, `scan-wait` message state (a DB check allows only `delivered`), no hold badge, no « En cours de vérification », no member-facing « scan », « vérification » or « modération » wording on these screens, no `aria-live` text about scanning.
- No `BillingPort` call on any chat route, send, typing or socket join in this story. No `message_quota` table or write (Story 5.11).
- No plaintext body in Postgres, Redis, logs or events. No signed URL or text in a realtime event.
- No photos, voice notes, reactions, contact-share matcher, money-ask education, stages beyond display, push or SMS notifications, outbox, long-poll fallback beyond Socket.IO's own polling transport, mahram reads (Stories 5.3 to 5.10, Epic 6, Epic 8).
- No Stitch copy that describes things the product does not do: « Wali notifié », « Accord mutuel validé », « Un wali peut lire cette conversation! », « Demander la levée du flou », « Signaler / Bloquer », « Quota du jour : 4/5 messages », the camera and microphone buttons, the tabs « Non lues » and « Sans réponse », « 1 non lu » and « Lu » (read receipts), « Discussion toujours sécurisés sur AnKanu! ».
- No audit event: AD-18's mandatory list does not include a chat send.

## Acceptance Criteria

Story 5.1:

1. **Given** Chat exists, **when** I open Discussions, **then** thread open ≤ 4 s; no hold badge; TalkBack says nothing about scan.
2. **Given** I type, **when** the other Member is on median 3G, **then** they see typing within 2 s.
3. **Given** I inspect `message.state` in API/DB, **when** I look for pending/held, **then** the only created state is `delivered`. No member copy « En cours de vérification ».

Story 5.2:

4. **Given** I tap send and I am under the FR-146 cap (or Premium), **when** the row is persisted, **then** the recipient sees the text without waiting for AI, **and** Chat calls `ModerationPort.enqueueScan` after persist, **and** if I am Premium, `message_quota` is not incremented.
5. **Given** I am Free and at the FR-146 cap, **when** I tap send, **then** I get `MESSAGE_CAP_EXCEEDED` and nothing is stored or held, **and** no `moderation_job` is enqueued. **Deferred to Story 5.11** (product-owner scope decision); the seam is `checkMessageCap`.
6. **Given** AI is down, **when** I send an allowed text, **then** ack still returns; scan-deferred is Epic 8's job, not a send block.
7. **Given** I send an allowed text from 3G, **when** ack timing, **then** send-text ack ≤ 2 s (NFR-005).

Also traced: participants only (server-side authorization on every route and the socket), body stored as ciphertext, events carry ids only, no `BillingPort` on chat GET/list/typing/join.

Interpretation notes (flagged in the handoff):

- AC 4 « if I am Premium, `message_quota` is not incremented »: no `message_quota` exists in this story for anyone, so it holds trivially; the Premium/Free distinction is Story 5.11.
- AC 1 « TalkBack says nothing about scan »: no element on either screen contains scan or moderation wording, visible or screen-reader only; checked by unit and e2e tests on the rendered text and accessible names.
- AC 2 « on median 3G … within 2 s » and AC 7 « from 3G … ≤ 2 s »: measured as server relay / acknowledgement time in tests plus an e2e run with a throttled-network profile on the page; a real 3G device measurement belongs to QA on staging.
- `moderation_job.outcome` is NOT NULL in SOLUTION-DESIGN §6, but a job enqueued after persist has no outcome until the Epic 8 worker scans it; this story makes `outcome` nullable (null = queued) and keeps the enum check for set values.

## Code Map

- `code/packages/ports/src/index.ts`: `ModerationPort`, `ScanItemKind`, `ScanPayload`.
- `code/apps/api/src/account-schema.ts`: `message`, `moderationJob`; `drizzle/0023_message.sql` (+ snapshot, journal).
- `code/apps/api/src/chat-key.ts` (new): `CHAT_KEY` / `CHAT_KID`, seal and open with AAD, boot check. `main.ts`: boot check.
- `code/apps/api/src/chat.ts`: conversation lookup (`find`) on the chat store.
- `code/apps/api/src/chat-messages.ts` (new): message store (memory + Postgres), Discussions list with other member and last message, read thread, list messages, `sendText`, `checkMessageCap` seam.
- `code/apps/api/src/moderation.ts` (new): `ModerationPort` adapters, only writer of `moderation_job`.
- `code/apps/api/src/chat-realtime.ts` (new): Socket.IO server on `/v1/realtime`, handshake gate, rooms, typing relay, `message.delivered` emit. `create-app.ts`: attach.
- `code/apps/api/src/conversations.controller.ts`: three routes.
- Web: `apps/web/src/discussions-page.ts` (new, screens 20 and 21), `src/entry-guard.ts` (thread path is account-gated), `src/invite-inbox-page.ts` (« Ouvrir la discussion » goes to the thread), `src/v2-serve.ts`, `app/discussions/route.ts`, `app/discussions/[id]/route.ts`, `src/member-section-page.ts` (removed), `apps/web/Dockerfile` + `.dockerignore` (Stitch 20, 21).
- Tests: `apps/api/src/chat-messages.test.ts` (new, memory stores + real Socket.IO client), `operator-config.migrate.test.ts` (Postgres), `apps/web/src/discussions-page.test.ts` (new), `app-shell.test.tsx`, `member-route.test.ts`, `e2e/chat.spec.ts` (new), `e2e/app-shell.spec.ts`.
- Docs: `.factory/config.md`, `code/README.md` (`CHAT_KEY`, `CHAT_KID`).
