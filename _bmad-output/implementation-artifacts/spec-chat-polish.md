---
title: 'Chat polish: full-screen Chat Photo, open at the latest message, read receipts, split view on tablet and desktop'
type: 'feature'
created: '2026-10-24'
status: 'ready'
route: 'factory'
story_id: 'chat-polish'
depends_on: '5-3-5-4-chat-media (PR #13, open; branch factory/chat-polish is based on factory/chat-media)'
---

## Intent

**Problem (product owner, Faycal, 2026-10-24, verbatim):** « I cannot click on a sent image to view it in full, neither the sender nor the receiver can, they should be able to. Also when we open the discussion page, we should have the page scroll all the way at the bottom where the text field to send message is, so the user does not have to scroll himself. Also, let's add the marker like we have in whatsapp, that shows if a user has read our message or not. Also, where the width of the screen allows it (maybe desktop and tablette, phone would probably not allow it), we should show the other discussion on the left side as a simplified list, with the sender name, profile picture, last message in the thread, the time of the last message, and wether I read the message or not if the last message was sent by the other user, how many messages I did not read from him, wether the last message if sent by us was read by the other user or not, just like typical whatsapp or telegram does, with all threads of discussion on the left, and the current open discusssion on the right. I want it to feel really like a smooth and live discussion. »

**Approach:**

- **Photo viewer.** A revealed Chat Photo bubble becomes a button. It opens an accessible full-screen dialog that shows the clear copy the page already downloaded through `GET /v1/conversations/:id/messages/:messageId/media` (a fresh URL signed for the caller, Story 5.3). No new rendition, no extra download, never the stored original.
- **Open at the latest message.** The thread follows the bottom (« pinned ») while the member is at the bottom. It does not move when they scroll up to read history; a « Nouveaux messages » button appears instead.
- **Read receipts.** A new chat-owned table `conversation_read` (migration `0026`) keeps one read pointer per member and conversation. The pointer only moves forward. `POST /v1/conversations/:id/read` moves it and emits `conversation.read` (ids only) over the existing Socket.IO channel. The list and the thread derive unread counts and « Lu » ticks from the pointers.
- **Split view from 768 px.** One page serves `/discussions` and `/discussions/<id>`. Under 768 px it shows the list or the thread, as today. From 768 px it shows both: the list on the left, the thread on the right. Switching threads uses `history.pushState`, with no page reload, and back / forward / deep links still work.

**Breakpoint:** 768 px is Tailwind `md` and the app shell's own tablet breakpoint (`app-shell.ts`). At 768 px the thread pane keeps more than 400 px, enough for a Photo or Voice note bubble without a horizontal scroll. Phones, including most phones in landscape (≤ 767 px wide), keep the separate list and thread screens. That was the owner's own guess (« phone would probably not allow it »).

**Delivered state.** AnKanu has one message state, `delivered`, written at persist (AD-10). There is no separate « reached the device » signal. The receipts are therefore one tick « Envoyé » (stored and delivered) and two ticks « Lu ». A WhatsApp-style « two grey ticks » middle state would differ from « Lu » by colour alone, so it is left out (WCAG 1.4.1).

Sources: PRD FR-050 (real-time Chat), FR-036 / D36 (anonymous mode: hide last-seen, NEXT, not offered in MVP), NFR-002, NFR-005; ARCHITECTURE-SPINE AD-7, AD-9, AD-10, AD-15 (events carry ids only; rooms per account), AD-16 (chat first page ≤ 80 KB), AD-21 / AD-29 (no BillingPort on chat GET, list, socket); EXPERIENCE.md « Discussions list » (« unread increment »), « Chat thread »; DESIGN.md `chat-bubble`; Stitch `20-discussions-list`, `21-chat-thread` (the Stitch « 1 non lu » and « Lu » that Story 5.1 dropped now have a feature behind them).

## Boundaries & Constraints

**Always:**

- Server-side authorization on the new route like every chat route: live session, PIN gate, `assertBrowseViewer` (staff / mahram 403), participant check (404 « Cette discussion n'existe pas. »).
- Read state is shown only to the two members of the conversation: on HTTP through the participant check, on the socket through the `account:<id>` rooms. While a Block holds either way (Story 8.6), the other member's read state is hidden (`null`) and no `conversation.read` reaches them. The reader's own pointer still works, so their own unread counts stay right.
- Events carry ids only: `conversation.read { conversation_id, account_id, message_id }`.
- The Photo privacy rules of Story 5.3 do not change: blur first, then the clear `md` copy for the two members only. In Lite mode the Photo stays blurred until « Afficher la photo ». Profile photos in the list stay blurred derivatives (Story 5.1).
- French only; 44 × 44 targets that hold without the Tailwind CDN; WCAG 2.2 AA (axe: zero serious or critical); no horizontal scroll at 360, 390, 768, 1024, 1280 and 1440 px.
- NFR-005: one `GET /v1/conversations` per list refresh (debounced 300 ms), no list refresh while the list is hidden (phone thread screen), no new image rendition, and the viewer reuses the clear copy already downloaded.

**Never:**

- No last-seen, online-now or presence (PRD: « Given MVP, online-now is not shown »; D36 is NEXT).
- No signed URL, text or pseudonym in a realtime event. No `original` served.
- No BillingPort on the new route or event.
- No hold, pending or scan wording.

## Acceptance Criteria

Photo viewer:

1. **Given** a Chat Photo bubble whose clear image is shown (mine or theirs), **when** I tap or click it (or press Enter / Space on it), **then** a full-screen dialog opens (`role="dialog"`, `aria-modal="true"`, named « Votre photo » or « Photo de <pseudonyme> ») that shows the whole Photo, uncropped and fitted to the screen.
2. **Given** the viewer is open, **when** I press « Fermer la photo », press Escape or tap the backdrop, **then** it closes. While it is open, focus is on « Fermer la photo » and Tab cannot leave the dialog, and the page behind does not scroll. On close, focus returns to the Photo I opened.
3. **Given** Lite mode, **when** a Photo arrives, **then** it stays blurred with « Afficher la photo » and cannot be opened in the viewer until I tap that button. In every mode the viewer shows the copy already downloaded through the media route (signed for me), never the stored original, and opening it makes no extra request.

Open at the latest message:

4. **Given** I open a thread (link, deep link, reload, or a switch in the split view), **when** it has loaded, **then** the latest message and the composer are in view without my scrolling.
5. **Given** I am at the bottom of the thread, **when** I send a message or one arrives, **then** the view stays at the latest message. **Given** I scrolled up to read history, **when** a message from the other member arrives, **then** the view does not move and a « Nouveaux messages » button appears. Tapping it, or scrolling back to the bottom, brings me to the latest message and hides the button. Sending always brings me to my new message. Loading « Messages précédents » keeps the message I was reading in place.

Read receipts:

6. **Given** a message I sent, **when** the other member has not read it, **then** its meta line shows one tick « Envoyé »; **when** they have read it, **then** two ticks « Lu ». The two states differ by shape (one tick or two), colour and text for assistive technology (« Envoyé » / « Lu », also as a tooltip), never by colour alone.
7. **Given** the thread is open, the page visible and the latest message in view, **when** a message from the other member is shown, **then** the page calls `POST /v1/conversations/:id/read { message_id }` with the latest message. It does not call it when the tab is hidden or I have scrolled up (it calls it once I come back to the bottom or to the tab).
8. **Given** my read pointer moves, **when** the other member has the thread open, **then** their ticks turn to « Lu » live (`conversation.read`), without a reload; my other tabs update their unread counts too.
9. **Given** read state is stored, **when** I read `GET /v1/conversations`, **then** each item carries `unread` (messages from the other member after my pointer) and `last_message.read` (mine: read by the other member, `null` while a Block holds; theirs: read by me). `GET /v1/conversations/:id` carries `read: { me, other }` (`other` is `null` while a Block holds). The pointer is stored server-side in `conversation_read` (migration `0026`) and only moves forward.
10. **Given** the read route, **when** the caller has no session (401), is staff or mahram (403), is not a member of the conversation or names a malformed or unknown conversation (404 « Cette discussion n'existe pas. »), sends a malformed `message_id` (400 « message_id : valeur non reconnue. ») or a message of another conversation (404 « Ce message est introuvable. »), **then** nothing is stored and no event is sent.
11. **Given** a Block either way, **when** either member reads, **then** the blocked pair sees no read state of the other (`null`, no ticks) and no `conversation.read` crosses the Block. A closed conversation, paused or ended without a Block, keeps its read state, because its history stays readable.

Split view and list:

12. **Given** a window at least 768 px wide, **when** I open `/discussions`, **then** the list is on the left and the right pane says « Sélectionnez une discussion pour l'afficher ici. ». **When** I open `/discussions/<id>`, **then** the list is on the left, with that conversation marked current (`aria-current="page"`), and the thread is on the right. Under 768 px, `/discussions` shows the list only and `/discussions/<id>` the thread only, as before.
13. **Given** the list (both layouts), **then** each row shows: the profile photo (blurred as before, or the initial), the pseudonym and age, the time of the last message (split view: « 10:15 », « Hier », « 12 oct. »; phone: « Aujourd'hui à 10:15 » as before), the last message preview (text in « … », « Photo », « Note vocale », « Vous : » when mine), one or two ticks when the last message is mine, and an unread badge with the number of their messages I have not read (« 99+ » above 99, screen-reader text « 1 message non lu » / « N messages non lus »). A row with unread messages has a bold name.
14. **Given** the list is on screen, **when** a message is delivered in any of my conversations or a read pointer moves, **then** the list refreshes from one `GET /v1/conversations`: preview, order (newest activity first), unread badge and ticks. When I read the open thread, its badge clears.
15. **Given** the split view, **when** I click another row, **then** the thread switches without a page reload: the URL becomes `/discussions/<id>` (back and forward work, a deep link opens the same view), the title and the current row follow, an unsent draft stays with its thread for the session, and an open recorder or Photo panel of the old thread is cancelled. The same in-page navigation applies to phones between the list and a thread, and to « Retour aux discussions ». A malformed id in the address goes back to the list.

NFR (traced as their own rows):

16. French only, copy consistent with `CHAT_COPY`; 44 × 44 targets; WCAG 2.2 AA (axe) on both layouts, in the viewer, and with unread badges and ticks; no horizontal scroll at the six widths.
17. NFR-005: the list is still one request; the thread still opens within 4 s on the throttled Fast 3G profile; the viewer adds no request; the list refresh is debounced and skipped while the list is hidden.

Interpretation notes (flagged in the handoff):

- « Two grey ticks » (delivered to the device) is not offered: the platform has no device delivery signal, and a third state would differ from « Lu » by colour only.
- « Whether I read the message or not if the last message was sent by the other user »: shown as the unread badge and a bold name, like WhatsApp and Telegram.
- « Mode anonyme » / hide last-seen (D36, FR-036) is NEXT and not implemented. Read receipts are not last-seen, but some Sisters may want to hide them. **Open question for the product owner:** should D36 (or a separate setting) also turn read receipts off, both ways like WhatsApp? No setting is invented here.
- The viewer shows the `md` clear copy (≤ 1600 px after browser compression). No larger rendition exists, and the original is never served (Story 5.3).

## Deferred

- A read-receipts privacy setting (see the open question above).
- Mahram reads (Epic 6): a mahram reading a granted thread must not move the member's pointer. There is no mahram reading today.
- Push notifications and badge counts outside the Discussions screen (bottom nav badge): not asked.
- Typing and online state in the list rows: not asked (and presence is excluded).

## Code Map

- `code/apps/api/src/account-schema.ts`, `drizzle/0026_conversation_read.sql` (+ snapshot, journal): `conversation_read`.
- `code/apps/api/src/chat-read.ts` (new): read store (memory, Postgres), forward-only `mark`, `pointers`.
- `code/apps/api/src/chat-messages.ts`: `unreadCounts` on the message store, `unread` and `last_message.read` in the list, `read` in the thread head, `markRead` command, `conversationRead` event hook.
- `code/apps/api/src/chat-realtime.ts`: `conversation.read` emit. `conversations.controller.ts`: `POST :id/read`.
- `code/apps/web/src/discussions-page.ts`: one page for both routes (split view, router, live list, receipts, pinned scroll, Photo viewer).
- Tests: `apps/api/src/chat-messages.test.ts`, `chat-media.test.ts`, `operator-config.migrate.test.ts`, `apps/web/src/discussions-page.test.ts`, `e2e/chat.spec.ts`, `e2e/chat-media.spec.ts`, `e2e/chat-polish.spec.ts` (new).
