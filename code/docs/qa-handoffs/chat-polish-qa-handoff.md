# QA handoff: Chat polish (full-screen Photo, open at the latest message, read receipts, split view)

Branch `factory/chat-polish`, based on `factory/chat-media` (PR #13, Stories 5.3 / 5.4, not merged yet). Spec: `_bmad-output/implementation-artifacts/spec-chat-polish.md` (story id `chat-polish`, 17 numbered AC). The request came from the product owner (Faycal, 2026-10-24); his words are quoted at the top of the spec.

## 1. What was built

**API**

- Migration `0026_conversation_read` adds the table `conversation_read (conversation_id → conversation, account_id → account, last_read_message_id → message, read_at)`, primary key `(conversation_id, account_id)`. It holds one read pointer per member and conversation. The pointer only moves forward: an older id leaves it where it is (Postgres `ON CONFLICT … DO UPDATE … WHERE last_read_message_id < excluded`).
- New `POST /v1/conversations/:id/read` `{ message_id }` answers 200 `{ read: { message_id: <stored pointer> } }` with `no-store`. Order of checks: live session (401), viewer gate (staff / mahram 403), participant check (404 « Cette discussion n'existe pas. »), `message_id` a UUID v7 (400 « message_id : valeur non reconnue. » `{ field: 'message_id' }`), message in this conversation (404 « Ce message est introuvable. »). Nothing is stored on a refusal. A closed conversation (paused or ended) still records reads. No BillingPort.
- New realtime event `conversation.read { conversation_id, account_id, message_id }` (ids only). It goes to the reader's own room (their other tabs) and to the other member's room, except while a Block holds either way.
- `GET /v1/conversations`: each item gains `unread` (messages from the other member after my pointer) and `last_message.read`. For my own last message, `read` says whether the other member has read it (`null` while a Block holds). For theirs, it says whether I have. Unread counts come from **one** grouped query for the whole list (`MessageStore.unreadCounts`). The list is still one request.
- `GET /v1/conversations/:id` gains `read: { me, other }` (pointer ids; `other` is `null` while a Block holds).

**Web: `/discussions` and `/discussions/<id>` are now one page** (`apps/web/src/discussions-page.ts`). French only.

- **Under 768 px (phones):** two screens, as before. `/discussions` shows the list (Stitch 20 look, now with its own CSS so it holds without the Tailwind CDN) and `/discussions/<id>` the thread. A tap on a row, « Retour aux discussions », and the browser back and forward buttons move between them **without reloading the page** (`history.pushState` / `popstate`).
- **From 768 px (tablet, desktop):** split view in a fixed-height frame between the header and the bottom nav. The list is on the left (20 rem, 22.5 rem from 1024 px) and the thread on the right. Each pane scrolls on its own, and the composer stays at the bottom of the thread pane.
  - `/discussions` shows the placeholder « Sélectionnez une discussion pour l'afficher ici. » on the right.
  - The open conversation's row is highlighted with a gold left border and carries `aria-current="page"`.
  - Clicking a row switches the thread in place: the URL changes to `/discussions/<id>`, the title becomes « AnKanu • Discussion », and back, forward and deep links work.
  - « Retour aux discussions » is hidden, because the list is right there.
  - Headings: with a thread open, the thread's name is the `h1` and « Discussions Ta'aruf » steps down to `h2`.
- **Rows (both layouts):**
  - Content: the blurred profile photo or the initial, « pseudonyme, âge ans », the last message preview (« … », « Photo », « Note vocale », prefixed « Vous : » when mine), and the time.
  - Time: on phones, « Aujourd'hui à 10:15 » with the clock icon, as before. In the split view, « 10:15 », « Hier » or « 12 oct. » at the top right.
  - **Unread badge:** a gold pill with the count (« 99+ » above 99) and screen-reader text « 1 message non lu » / « N messages non lus », which is also part of the row link's name. The name is bold while the count is above 0.
  - **Ticks** before the preview when my message is last: one tick « Envoyé », two ticks « Lu ». They are hidden while a Block holds (`read: null`).
  - Phones keep the city, « Identité vérifiée » and the « Accéder à la conversation » button. In the split view the whole row is the link, and the city and pill are hidden.
- **Live list:**
  - `message.delivered` and `conversation.read` refresh the list (preview, order, badge, ticks) from one `GET /v1/conversations`, debounced by 300 ms, so a burst of events makes one request.
  - There is no refresh while the list is not on screen (phone thread screen). The list is refreshed when it comes back.
  - Avatars are reused across refreshes while the photo id stays the same, so the blur is not downloaded again.
  - Reading a thread clears its badge at once.
- **Read receipts in the thread:**
  - Each of my bubbles shows, after the time, one tick « Envoyé » (grey) or two ticks « Lu » (dark gold). The ticks are inline SVG, so they show without the icon font. The state is also in screen-reader text and in a `title` tooltip.
  - The ticks turn to « Lu » live on `conversation.read`, without refetching the thread.
  - Their bubbles have no tick.
- **Marking as read:** the page posts `POST …/read` with the newest loaded message when all of these hold:
  - a thread is open;
  - the tab is visible (`visibilityState`);
  - the latest message is in view;
  - a message of theirs lies past my pointer.

  Triggers: open, new message while at the bottom, scroll back to the bottom, tab back to visible or focused. There is never a second post for the same pointer.
- **Open at the latest message:**
  - On open (first load, deep link, switch), the thread lands at the end with the composer in view. On phones the page scrolls so the composer sits above the bottom nav. In the split view the thread pane scrolls to its end.
  - It re-follows for 1 s while fonts and the CDN settle, unless the member scrolls.
  - While the member is at the end, new messages keep the view there. My own sends always do.
  - Scrolled up, a message from them does not move the view: a « Nouveaux messages » button appears (fixed above the composer on phones, sticky at the bottom of the pane in the split view). Tapping it, or scrolling back down, returns to the end and hides it.
  - « Messages précédents » now keeps the message being read in place.
- **Full-screen Photo:**
  - Once a Chat Photo's clear image shows (at once outside Lite, after « Afficher la photo » in Lite), the image is a button named « <alt> – Agrandir la photo ».
  - It opens `#photo-viewer`: `role="dialog"`, `aria-modal="true"`, named by the alt text « Photo de <pseudonyme> » / « Votre photo ». It has a navy backdrop and shows the whole Photo (`object-fit: contain`, never larger than the screen), with a 44 px round « Fermer la photo » button at the top right.
  - On open, focus goes to the close button, and Tab / Shift+Tab stay on it. Escape, the close button or a tap on the backdrop closes the viewer, and focus returns to the Photo. The page behind cannot scroll.
  - The viewer shows the object URL the bubble already downloaded through the media route (signed for the caller). **Opening it makes no request**, and nothing in the page ever asks for an `original`.
- **Switching threads** cancels an open recorder or Photo panel and pauses a playing Voice note. It drops the old thread's object URLs and ignores late answers for the old thread (a generation counter). It keeps the unsent text per thread for the visit; the session-expiry draft in `sessionStorage` (QA F4 of 5.1) is unchanged.

## 2. Where

- API: `apps/api/src/account-schema.ts` (`conversationRead`), `apps/api/drizzle/0026_conversation_read.sql` + `meta/0026_snapshot.json` + `_journal.json`, `apps/api/src/chat-read.ts` (new: read store, memory + Postgres), `apps/api/src/chat-messages.ts` (`unreadCounts`, list / head fields, `markRead`, `conversationRead` hook), `apps/api/src/chat-realtime.ts` (emit), `apps/api/src/conversations.controller.ts` (`POST :id/read`).
- Web: `apps/web/src/discussions-page.ts` (rewritten around one page; the media composer, the Voice note bubble and the copy of Stories 5.1 to 5.4 are unchanged).
- Tests: `apps/api/src/chat-messages.test.ts` (4 new cases), `chat-media.test.ts` and `operator-config.migrate.test.ts` (new Postgres case, migration list and count, table list), `apps/web/src/discussions-page.test.ts` (7 new cases), `e2e/chat-polish.spec.ts` (new, 10 tests), `e2e/chat.spec.ts` and `e2e/chat-media.spec.ts` (mocks answer `…/read`; see section 7 for the three changed assertions).
- No new env var, no flag, no new dependency.

## 3. How to run

From `code/`:

```bash
npm run lint && npm run typecheck && npm run test:unit && npm run migration-check
PLAYWRIGHT_CHROMIUM_EXECUTABLE=/opt/pw-browsers/chromium \
E2E_ALLOW_ERRORS='cdn\.tailwindcss\.com,tailwind is not defined,fonts\.googleapis\.com,fonts\.gstatic\.com,ERR_NETWORK_CHANGED' \
npx playwright test e2e/chat-polish.spec.ts e2e/chat.spec.ts e2e/chat-media.spec.ts
npm run test:integration   # needs Docker: migration 0026 on Postgres 17
```

Full stack, two members (local Docker, see `.factory/config.md`):

1. Apply the migrations again (`npx drizzle-kit migrate`): `0026` is new.
2. Use two browsers (or one normal window and one private window). Sign up a Brother and a Sister, the Brother invites, the Sister accepts.
3. Open `/discussions` on a phone width (DevTools 390 px) for one member and at 1280 px for the other.
4. Send texts and Photos both ways. Watch the ticks, the badges, the order and the « Nouveaux messages » button. Block from screen 23 and check the ticks disappear for the blocked pair.

## 4. AC trace table

| ID | Criterion (short; full text in the spec) | How it is proven | Status |
| --- | --- | --- | --- |
| AC 1 | A revealed Chat Photo, mine or theirs, opens a full-screen dialog named after the Photo, uncropped and fitted to the screen | e2e `chat-polish.spec.ts` « AC 1 / 2 / 3: the recipient and the sender open a Photo full screen… » (role dialog, `aria-modal`, name, `object-fit: contain`, ratio kept, inside the viewport); unit « AC 1 / 2 / 3: a revealed Photo opens an accessible full-screen viewer… » | Done (both projects green) |
| AC 2 | Close with the button, Escape or the backdrop; focus on close, trapped, returned; no page scroll behind | Same e2e: Escape, Enter to reopen, close button, backdrop click at a corner, `toBeFocused` before and after, Tab / Shift+Tab stay, `html.chat-viewer-open` on and off | Done |
| AC 3 | Lite: blurred until « Afficher la photo », not openable before; the viewer reuses the downloaded copy, no extra request, never the original | e2e « AC 3: in Lite mode the Photo stays blurred… » (no `chat-photo-open`, no media access before the tap); e2e AC 1 asserts no media call while the viewer opens and no `original` in any call; unit asserts no `original` in the page script; 5.3 Lite e2e still green | Done |
| AC 4 | Opening a thread shows the latest message and the composer without scrolling | e2e « AC 4 / 7: the thread opens at the latest message with the composer in view… » (24 extra messages, `toBeInViewport` on the last bubble and the composer, both projects); split-view e2e and width sweep check the composer at every width | Done |
| AC 5 | Follows new messages only at the bottom; « Nouveaux messages » when scrolled up; sending always shows my message; older page keeps position | e2e « AC 5 / 7: scrolled up, a new message does not move the view… » (first bubble stays in view, button in view, click returns, at-bottom message followed, send followed); older-page anchoring is code only (`loadOlder`), no e2e | Done (older-page anchor: code review) |
| AC 6 | One tick « Envoyé » / two ticks « Lu » on my messages, not colour alone | e2e « AC 6 / 8: my messages show « Envoyé » until he reads them… » (`data-state`, 1 or 2 SVG paths, sr text); unit « AC 6 / 8 » | Done |
| AC 7 | Marks read only when the thread is visible and at the bottom, with the latest message | e2e AC 4 / 7 (one POST with the newest id, no repeat) and AC 5 / 7 (no POST while scrolled up, POST after the jump); unit « AC 7 » (`visibilityState`, `nearBottom`) | Done (hidden-tab case: code and unit only, not driven in e2e) |
| AC 8 | Ticks turn « Lu » live; my other tabs update | e2e AC 6 / 8 (no thread refetch); API « chat-polish AC 12 » (reader's own socket gets the event too) | Done |
| AC 9 | `unread`, `last_message.read`, `read { me, other }`; forward-only pointer stored server-side | API « chat-polish AC 9-11 » (memory store); Postgres case « keeps one forward-only read pointer per member… » (`unreadCounts` SQL, forward-only upsert, FKs, primary key) | Done |
| AC 10 | Read route authorization and validation; nothing stored on a refusal | API « chat-polish AC 13 » (401, 404 foreign / malformed / unknown conversation, 400 × 4 bodies, 404 other conversation's message, 403 mahram, nothing stored) | Done |
| AC 11 | Block hides read state both ways, no event across a Block; closed keeps reads | API « chat-polish AC 14 » (`read: null`, head `other: null` both sides, no event to the blocker, the reader's own socket still synced, unblock restores) | Done (closed-without-Block: code path shared with open; no dedicated test) |
| AC 12 | Split view ≥ 768 px with placeholder and current row; phones keep separate screens | e2e « AC 12 / 15: list on the left, thread on the right… » (desktop) and « …on a phone… » (mobile); unit « AC 12 » | Done |
| AC 13 | Row content: photo, name, time, preview, ticks, unread badge (99+, sr text), bold name | e2e « AC 13: each row shows the unread count… » (both projects); unit « AC 13 / 14 » (99+ cap); 5.1 / 5.3 list tests still green | Done |
| AC 14 | Live list: one request per burst; badge clears on read | e2e « AC 14: delivered and read events refresh the list once per burst… » (3 events, 1 request); split e2e (badge clears) | Done |
| AC 15 | Switch without reload, URL / history / deep link, draft per thread, panels cancelled | e2e split (window marker survives, back / back / forward, deep link, draft kept) and phone; unit « AC 15 » (pushState, popstate, generation guard, no `location.reload`) | Done |
| AC 16 | French, 44 × 44, WCAG 2.2 AA, no horizontal scroll at 6 widths | `expectAccessible` in 8 new e2e states (list, thread, viewer open, jump visible, split list and thread, phone); width sweep `chat-polish` « fits every factory width » (list, split thread, viewer); 5.3 F2 44 px test now also covers the split-view row link | Done |
| AC 17 | NFR-005: one list request, thread open ≤ 4 s Fast 3G, no extra payload | 5.1 Fast 3G e2e still green (mobile); AC 14 e2e (one request per burst); AC 1 e2e (viewer: zero requests) | Done |
| Security | Server-side authorization on the new route and event; ids only in events | API AC 13 / AC 12 / AC 14; existing « participants only » test unchanged | Done |
| Privacy | No last-seen or presence; read state only to members | Code: no presence field anywhere; API AC 13 (stranger's list empty); open question D36 (section 7) | Done, open question |
| Regression | Stories 5.1 to 5.4, 8.5 / 8.6 | `chat.spec`, `chat-media.spec`, `report-block.spec`, `app-shell.spec`, `blocked-list.spec`: green on both projects | Done |

## 5. Test cases for QA

| # | Input | Expected |
| --- | --- | --- |
| 1 | 1280 px, `/discussions` | List left, « Sélectionnez une discussion pour l'afficher ici. » right, h1 « Discussions Ta'aruf » |
| 2 | Click a row | No reload (DevTools: no document request), URL `/discussions/<id>`, thread right, row highlighted, h1 is the name, composer visible |
| 3 | Back, back, forward | Previous thread, then the placeholder, then the thread again |
| 4 | Type a draft, switch thread, come back | Draft back in the box |
| 5 | Other member sends 3 messages while I am on another thread | Their row moves to the top, badge « 3 », bold name |
| 6 | Open that thread | Badge goes; other member sees my messages turn « Lu » live |
| 7 | Scroll up in a long thread, other member sends | View does not move; « Nouveaux messages »; tap it, view at the end |
| 8 | Send while scrolled up | View jumps to my new message, one tick « Envoyé » |
| 9 | Tap a received Photo, then my own Photo | Full-screen viewer; Escape, the × button and a backdrop tap each close it; focus back on the Photo; DevTools shows no new request |
| 10 | Lite on (Paramètres), receive a Photo | Blur and « Afficher la photo »; the Photo cannot be enlarged before the tap |
| 11 | 390 px phone: list → row → « Retour aux discussions » → browser back | Separate screens, no reload, unread badges on the list |
| 12 | Block the other member (screen 23), look at the list and the thread | No ticks for my messages (`read: null`), no live « Lu » for either side |
| 13 | `curl -X POST …/read` with another member's cookie, a bad `message_id`, a message of another conversation | 404 / 400 / 404 as in AC 10, nothing stored |
| 14 | Widths 360, 390, 768, 1024, 1280, 1440 | No horizontal scroll; at 768 the split view starts; a Photo and a Voice note bubble fit the pane |
| 15 | Screen reader on a row | « Accéder à la conversation avec X, 3 messages non lus »; ticks read « Envoyé » / « Lu » |

## 6. Out of scope

- A setting to turn read receipts off (see the open question in section 7), D36 anonymous mode (NEXT).
- Device delivery receipts (« two grey ticks »), presence, last-seen, typing in list rows.
- Unread badge on the bottom nav or push notifications.
- Mahram reads (Epic 6): a mahram read must not move a member's pointer once that exists.
- Larger Photo rendition or pinch-zoom in the viewer: the viewer shows the `md` copy (≤ 1600 px after browser compression), never the original.

## 7. Assumptions, decisions and known issues

**Decisions taken for the product owner (flagged):**

1. **Breakpoint 768 px** for the split view (Tailwind `md`, the app shell's tablet breakpoint; the thread pane keeps more than 400 px there). Phones and most phones in landscape keep the separate screens.
2. **Two states, not three:** one tick « Envoyé » and two ticks « Lu ». AnKanu has no device-delivery signal (a message is `delivered` when stored, AD-10), and a WhatsApp-like « two grey ticks » state would differ from « Lu » by colour only (WCAG 1.4.1). Read ticks are dark gold (#7D5F27), not blue, to stay in the AnKanu palette.
3. **When a message counts as read:** the thread is open, the tab visible and the latest message in view. Opening the thread is enough, as on WhatsApp. Being scrolled up is not.
4. **Block hides read state** both ways (consistent with Story 8.6, where a Block hides the members from each other). A paused or ended conversation without a Block keeps its receipts, because its history stays readable.
5. **The viewer reuses the downloaded clear copy** instead of fetching a new signed URL. The bubble already obtained it through the media route, signed for the caller, minutes or seconds before. This saves a download on 2G / 3G. No original, no new rendition.
6. **Phones also move between list and thread without a reload.** It is the same code path, and it makes the « live » feel the owner asked for.

**Open question for the product owner:** D36 / FR-036 (« mode anonyme »: hide last-seen) is NEXT and not implemented. Read receipts are not last-seen, but some Sisters may want to hide when they read. Should a future setting (D36 or its own) turn receipts off, both ways like WhatsApp? Nothing was invented here.

**Existing tests changed (requirement change, not to get green):**

- `e2e/chat.spec.ts` and `e2e/chat-media.spec.ts`: `HOLD_COPY` no longer bans « Lu » and « non lu ». Story 5.1 dropped read receipts because nothing stood behind them, and the owner asked for them now. Hold and scan copy stays banned.
- `e2e/chat.spec.ts` « AC 5.1-1 … thread opens » and `e2e/chat-media.spec.ts` « QA F2 … 44 x 44 »: « Retour aux discussions » is checked on the phone project only. From 768 px the list sits beside the thread, so the link is hidden; on desktop the tests check the list rows (presence, 44 px target) instead.
- `apps/web/src/discussions-page.test.ts`: assertions that read the old source strings (the list's own `<main>`, `var DRAFT_KEY`, the `md:inline` dot of QA D2, `'message.delivered': reloadSoon`) now read the new code for the same behaviour. `non lu` left the banned list (`done_all` stays banned: the ticks are SVG).
- `apps/api/src/chat-messages.test.ts` / `chat-media.test.ts`: `toEqual` on the list item and the thread head include the new `unread`, `read` and `last_message.read` fields.

**Known issues / environment:**

- **No Docker here**, so `npm run test:integration` could not run (no Testcontainers start of `operator-config.migrate.test.ts`, no compose, substrate, restore-drill or object-version suites). Substitute: all cases of `operator-config.migrate.test.ts` were run against the container's local PostgreSQL **16** (container start replaced by a local URL in a temporary copy, deleted afterwards, version check relaxed to 16 / 17): see section 8. It must run on a machine with Docker.
- The sandbox cannot reach the Tailwind CDN or Google Fonts, so e2e runs unstyled, as for the earlier chat stories. The new layout (split grid, rows, receipts, viewer, jump button, placeholder) has **its own CSS** and works without the CDN. For a visual check I compiled the page's Tailwind classes locally (Tailwind 4 from `node_modules`) and screenshotted 360, 390, 768, 1024 and 1440 px. Screenshots are not committed.
- Unit `photo-rules.test.ts` fails here without a Chromium path (known baseline, unrelated).
- Full e2e suite: the baseline failures in `invite-inbox`, `profile-edit-flow`, `staff-review`, `staff-shell` are unrelated to this story (section 8 has the count).

## 8. Self-check (real output, this container, 2026-10-24)

From `code/`, on the head of `factory/chat-polish`:

| Check | Command | Result |
| --- | --- | --- |
| Lint | `npm run lint` | exit 0; 17 warnings, all pre-existing (none in files of this story), 0 errors |
| Typecheck | `npm run typecheck` | exit 0 (kernel, ports, api, web, tests) |
| Unit | `npm run test:unit` | `Test Files  1 failed \| 82 passed \| 2 skipped (85)` / `Tests  1 failed \| 676 passed \| 12 skipped (689)`; the one failure is `photo-rules.test.ts > keeps a 32px play circle in Chrome…` (needs a Chromium path; same failure on the baseline before this story: `1 failed \| 665 passed \| 12 skipped`) |
| API chat suites | `npx vitest run chat-messages chat-media reports-blocks report-block-gates` | 69 passed |
| Migration check | `npm run migration-check` | `Everything's fine` |
| Migration on Postgres | `operator-config.migrate.test.ts` against local PostgreSQL 16 (Docker missing, see section 7) | 20 passed, including the new `conversation_read` case |
| Integration | `npm run test:integration` | **not run**: no Docker in this container |
| e2e, touched area | `npx playwright test e2e/chat.spec.ts e2e/chat-media.spec.ts e2e/chat-polish.spec.ts e2e/report-block.spec.ts e2e/app-shell.spec.ts e2e/blocked-list.spec.ts` (mobile + desktop projects) | `120 passed (3.1m)`, `18 skipped` (project-specific skips), 0 failed |
| e2e, full suite | `npx playwright test` | `196 passed (5.7m)`, `40 skipped`, `30 failed`. All 30 failures are the known baseline: invite-inbox 3, profile-edit-flow 16, staff-review 6, staff-shell 5. None in chat, discussions, report-block or app-shell |
| Browser walk | Playwright probes at 360, 390, 768, 1024, 1440 px with the page's Tailwind compiled locally | Split view from 768 px, phone opens at the composer, viewer full-screen, badges and ticks on phone rows, no horizontal scroll; no console error apart from the allowed CDN / font ones. Screenshots not committed |
