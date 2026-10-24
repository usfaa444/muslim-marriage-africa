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

## Retest (QA report `chat-polish-qa-report.md`, PASS with minors F1 to F4)

| Finding | Fix | Proof |
| --- | --- | --- |
| F1 (e2e did not protect the AC 7 guards and the Block tick) | QA's adversarial spec is now a kept file, `e2e/chat-polish-gates.spec.ts`, on the shared fixtures (console and request guards, `expectAccessible`). Kept: hidden tab, scrolled up, spoofed and broken `conversation.read` events, Block `read: null` row and « 99+ », read POST failures, keyboard-only viewer, older-messages anchor, malformed and unknown links, 44 px targets, hostile content. Dropped: the screenshot and axe-dump sweep, the Fast 3G timing probe and every `writeFileSync` evidence write. The TS error and lint warnings are gone. « No POST was sent » is checked without waiting: an init script records each read `fetch` the moment the page starts it. The mock is shared with `chat-polish.spec.ts` through the new `e2e/chat-polish-mock.ts`. It now serves `?before=` pages; the old mock answered the latest page again, so QA's anchor check moved nothing. | Mutations, each restored afterwards, each failing the new spec on both projects: `nearBottom()` guard removed in `markSeen` (the « scrolled up » test fails); `visibilityState` guard removed (« hidden tab » fails); row tick drawn for `read: null` (« Block » fails); `onRead` conversation check removed (« spoofed events » fails); older-page scroll compensation removed (« Messages précédents » fails). |
| F2 (reads made during a Block show as « Lu » after unblock) | No change: a product question, listed with the receipts-setting question (D36) in section 7. | — |
| F3 (a failed read POST waited for the next trigger) | `markSeen` now retries a read lost to the network or a 5xx **once**, after `READ_RETRY_MS` (2 s). A 4xx is final. After the retry, or a 4xx, the page stops posting for that message; scrolls and focus no longer re-post it in a burst (QA saw 4 to 5 posts in 2.5 s). A newer message of theirs, or reopening the thread, starts again. The member never sees an error. Switching thread cancels a pending retry. | e2e `F3: one 500, then success: retried once and stored`, `always 500: one retry, then nothing`, `network failure: one retry, then nothing`, `403: final, no retry`. Each also checks that the thread stays usable (a send works) and that no error shows. Unit `QA F3: …`. Mutations: retry removed (3 cases fail per project); give-up guard removed (3 cases fail per project). |
| F4 (`npm audit`) | No change: pre-existing, no dependency touched. | — |

Retest self-check (this container, 2026-10-24):

- `npm run lint`: exit 0, 17 warnings, all pre-existing (none in the changed files).
- `npm run typecheck`: exit 0.
- `npm run test:unit`: `Test Files  1 failed | 82 passed | 2 skipped (85)`, `Tests  1 failed | 677 passed | 12 skipped (690)`. The failure is `photo-rules`, the known baseline.
- e2e for the chat area, both projects: `chat`, `chat-media`, `chat-polish`, `chat-polish-gates`, `report-block`, `app-shell` and `blocked-list` give `146 passed (3.6m)`, `18 skipped`, 0 failed.

## Retest, round 2 (Faycal's changes, CI race, Mac live QA D1 to D3)

Spec: AC 18 to 24 and the two notes under AC 4 and AC 11 in `spec-chat-polish.md`. The code map lists every file.

| Ask or finding | Fix | Proof |
| --- | --- | --- |
| CI race, `e2e/chat-polish.spec.ts:99` « AC 4 / 7 » on desktop | Root cause, reproduced by injecting the stylesheet 1.5 s and 2.5 s after opening: the page scrolled to the end once, after the first render. On CI the Tailwind CDN styles landed later, the content grew, and the view was left short of the end. The scroll event of that layout change then counted as « the member scrolled up », so nothing re-pinned and the read was never posted. Fix in the product: the thread follows the end (`pinned`) until the member scrolls herself. Only her own scrolling (wheel, touch, a scroll key, a held pointer, within 1 s) unpins. A `ResizeObserver` on the message box and its content re-pins after any layout change. The test is unchanged and still strict. | New gate `AC 4: a stylesheet that lands 1.5 s after opening (the Tailwind CDN on CI) still leaves the latest message and the composer in view` (`chat-polish-gates.spec.ts`). Mutations: follower removed (that gate fails on both projects); intent check removed, so any scroll away unpins (11 tests fail across `chat-polish`, `chat-polish-gates` and `chat-polish-app`, including `:99`). |
| Mac live QA D1 (major): with the real Tailwind CDN the thread did not open at the latest message | Same fix as the CI race. | Same as above. Tests that scroll up now use a real mouse wheel over the message box (`wheelThreadToTop`), because a programmatic `scrollTop` no longer counts as the member scrolling. |
| Mac live QA D2 (minor): under a Block my messages still showed « Envoyé » | Under a Block (`read.receipts: 'blocked'`) my bubbles draw no tick at all, both on first render and on a live redraw. | e2e `Mac QA D2: under a Block the thread draws no tick at all on my messages`. Mutation: the Block guard removed in `messageNode` (fails on both projects). |
| Mac live QA D3: at 1280 × 900 the thread had about 400 px | The thread fills the screen above the bottom nav (AC 23). The old `calc(100dvh - 13rem)` height is gone. | e2e `AC 23: at every factory width the thread fills the screen above the bottom nav …` checks the six widths at 640 px and 900 px high. |
| Faycal, option B: « Confirmations de lecture » | AC 18 to 20. The setting is stored in `read_receipt_setting` (migration `0027`) and enforced by the server in the list, the thread head and the read event. Reciprocal: if either member is off, neither sees « Lu ». Pointers keep moving while off, so my unread badges clear, and turning it back on shows the reads made meanwhile. The live update is `chat.receipts`. Under a Block: no ticks. With receipts off: « Envoyé ». | API `chat-polish AC 18`, `AC 19`, `AC 20` (`chat-messages.test.ts`). e2e `AC 18: the switch reads the stored value …`, `AC 19: with receipts off my messages show « Envoyé » only; turned back on, « Lu » comes back live`. Migrate test on Postgres. API mutations, each restored and each failing its test: the list ignores the setting; the head ignores it; the read event ignores it; the validation accepts any value; `chat.receipts` ignores the Block; the members-only gate removed. |
| Faycal: no header or footer on app screens | `withAppShell` now has three kinds. `member`: bottom nav only. `gated` (signed-in steps without a nav, such as onboarding after sign-in): no header or footer, and one « Confidentialité » line. `public` (sign-in, sign-up identity and pseudonym, password reset): header and footer as before. The landing page is unchanged. The staff console keeps its own header: it has no bottom nav, and the header holds sign-out. No mahram pages exist yet. **What moved:** « Confidentialité » moved from the footer to a Paramètres row and to the gated line. The header's brand link to Découvrir is dropped, because the bottom nav has Découvrir. | e2e `app-shell.spec.ts`: `has the bottom nav with its section current, and no site header or footer` (each member page), `« Confidentialité » is one tap away in Paramètres`, `signed-out page … has the header and footer but no bottom nav`, `the landing page keeps its own header and footer`, `fits every factory width …`. **Changed tests and why:** the unit tests in `app-shell.test.tsx`, `app-shell-browser.test.ts`, `blocked-list-page.test.ts`, `invite-inbox-page.test.ts`, `report-block-page.test.ts` and `discussions-page.test.ts` asserted that the header and footer were present on member pages; they now assert they are absent, which is the new requirement. `app-shell.test.tsx` adds per-kind counts and the legal line. The e2e nav-link name check is now a regex, because the accessible name may end with the badge text. |
| Faycal: pinned header and composer | AC 23. `html.chat-fixed` is set when a thread is open, or in the split view. The document and body do not scroll, and the height cascades `100vh` → `100dvh` → `--chat-vh` (`visualViewport`, for the keyboard). The bottom nav and safe areas are accounted for. Only `#thread-scroll` scrolls; the list column scrolls on its own. While the textarea has focus, the nav steps aside. Below 560 px high, the header and composer compact. Small absolutely positioned screen-reader texts used to stretch the document; the body and the box are now their containing blocks. | e2e `AC 23: the page never scrolls; after scrolling the messages up, who I talk to and the composer are still in view`, `… at every factory width …`, `… the on-screen keyboard shrinks the screen …` (resize to 360 × 380 with the composer focused), `… on a phone the list still scrolls like a page …`, plus the late-stylesheet gate. Mutation: `chat-fixed` never set (5 AC 23 tests fail). |
| Faycal: bottom nav badges | AC 21 and 22. `GET /v1/me/badges` returns `{ invitations, discussions }`. The nav script (`data-ank-keep`, kept by `stripDemoScripts`) paints the badges, debounces refreshes (300 ms), and refreshes on focus, visibility and `pageshow`. It opens its own socket except on the Discussions page, which reuses its socket and calls `__ankBadges.refresh()`. `invite.changed` goes to the recipient on send, and to her own tabs on accept or decline. | API `chat-polish AC 21`, `AC 22`. e2e `AC 21 / 22: on another screen (Paramètres) the badges count, update live once per burst, cap at 99+ and hide at 0`, `AC 22: on the Discussions page its own socket keeps the badges right (one socket) …`. Mutations: the shell stops listening to `invite.changed` (the Paramètres test fails); the Discussions page stops refreshing on `invite.changed` (the Discussions test fails); the members-only gate removed (API test fails). |

Judgement calls (round 2):

- Receipts are reciprocal, like WhatsApp: if either member is off, neither sees « Lu ». Pointers are kept while off.
- Discussions badge: the number of conversations with unread messages, excluding blocked members.
- Invitations badge: the invite model has no expiry state, so « pending » means not yet accepted or declined, from a member not hidden by a Block.
- A Block or unblock changes the badges at the next focus, visibility change or event. No event is sent for it.
- On phones the bottom nav hides while the composer has focus, so that the keyboard leaves room for the thread.
- iOS Safari's keyboard behaviour is untested here (no device). The `visualViewport` path is covered by a resize test in Chromium.
- F2 (reads made during a Block show after unblock) stays a product question.

Retest self-check, round 2 (this container, 2026-10-24):

- `npm run lint`: exit 0, 17 warnings, all pre-existing (none in the changed files).
- `npm run typecheck`: exit 0.
- `npm run test:unit`: `Test Files  1 failed | 82 passed | 2 skipped (85)`, `Tests  1 failed | 682 passed | 12 skipped (695)`. The failure is `photo-rules`, the known baseline.
- `npm run migration-check`: « Everything's fine ».
- `operator-config.migrate.test.ts` on a local Postgres 16 (no Docker here, so it ran through a temporary copy pointed at a fresh database, deleted afterwards): `Tests  20 passed (20)`, including `0027` and the `read_receipt_setting` foreign key.
- Chat-area e2e, both projects (`chat-polish-gates`, `chat-polish`, `chat-polish-app`, `chat`, `chat-media`, `report-block`, `app-shell`, `blocked-list`, `invite-inbox`): `178 passed`, `23 skipped`, 3 failed. The 3 failures are the known `invite-inbox` baseline, and they fail the same way with these changes stashed.
- Full e2e, both projects: `241 passed (6.9m)`, `43 skipped`, `30 failed`. The 30 are exactly the known baseline: `invite-inbox` 3, `profile-edit-flow` 16, `staff-review` 6, `staff-shell` 5.

## Retest, round 3 (cloud QA round 2 FAIL; Mac live QA round 2 minors)

Spec: AC 25 and AC 26, and the note under AC 22, in `spec-chat-polish.md`. R2-3 (the header and footer kept on signed-out pages and the staff console) is unchanged, as asked; the coordinator is confirming it with Faycal.

| Finding | Fix | Proof |
| --- | --- | --- |
| R2-1 (major) and Mac issue 3: on phones the messages got 44 to 244 px | A phone thread (under 768 px) is now a sub-screen, like WhatsApp (AC 25). There is no bottom nav; « Retour aux discussions » goes back to the list, where the nav is. The header is one slim row: a back arrow, a 36 px photo, the name on one line with the city under it, and « Signaler / Bloquer » as a shield icon. The stage pill is kept for screen readers only. The composer is one row: Photo and Voice note icons, a text box that starts on one line and grows to about five lines (132 px) and then scrolls, and « Envoyer » as an icon button. The « Règle d'or » line stays under it and is hidden while typing. The short-screen compact mode, which QA saw act backwards, is gone; below 560 px high only the city, the stage and the rule step aside. The split view from 768 px is unchanged. | Measured with compiled Tailwind (the QA probe's method, now `e2e/real-css.ts`), message box height: **360 × 600: 435 px (73 %); 360 × 640: 475 px (74 %); 360 × 667: 502 px (75 %); 360 × 720: 555 px (77 %); 390 × 800: 635 px (79 %)**. Round 2 gave 44, 84, 111, 164 and 244 px. e2e `AC 25: at 360x640 …` and `AC 25: at 390x800 the messages get at least 60 % of the screen; with the keyboard up they still get half`. Each run checks: ratio ≥ 0.6; no nav; name and composer in view; page still; no horizontal scroll; five 44 × 44 named targets; axe. With the keyboard (300 px less): ratio ≥ 0.5 and the latest message in view. The composer grows and caps, and the view stays at the end. Mutations: `chat-sub` never set (both AC 25 tests fail); `grow()` returning at once (both fail). |
| R2-2 (major test gap): `message.delivered` was not protected on its own | Three one-event tests on Paramètres. Découvrir needs a live session on the server, so the web-only harness cannot open it (`app-shell.spec.ts` says so too); Paramètres is another screen with the same nav script. A single `message.delivered`, a single `conversation.read` and a single `invite.changed` each update the badge with exactly one request. | e2e `QA R2-2: a single message.delivered / conversation.read / invite.changed on Paramètres updates the « … » badge`. Mutations: the shell's `message.delivered` listener removed (that test fails on both projects); `conversation.read` removed (that test fails on both). `invite.changed` was already proved in round 2. |
| Mac 1: a stale Paramètres window | The nav's socket now hands `chat.receipts` to the page (a DOM event). « Confirmations de lecture » reloads on it, and on focus, visibility and back-forward. A click saves the value the switch offers, `!shown`, sent explicitly. A read that a click overtook is ignored (version counter), so it cannot repaint the old value. | e2e `Mac QA round 2: a second Paramètres window follows a change live and on focus; a click saves what it shows the member asking for`. Unit `settings-lite.test.ts` (wiring). Mutations: the DOM event listener removed (fails on both projects); the focus listener removed (fails on both). |
| Mac 2: the flaky switch test | The switch is no longer `disabled` during a save (`aria-busy` instead, so it keeps focus). The test waits for `aria-busy` to clear and for focus before pressing Space. No sleeps. | `AC 18` test. Stability: run with the full suite (below), and repeated runs of `chat-polish-app.spec.ts` throughout this round. |
| R2-4: the unnamed Lite and PIN switches | `settingsHtml` makes both `role="switch"` with the names of their cards: « Mode Allégé (Basse consommation) » and « Code secret PIN d'accès ». `app-shell.spec.ts` now runs whole-page axe on `/settings`. | e2e `QA R2-4: Paramètres passes axe as a whole page; …`, `app-shell.spec.ts` `/settings` (`wholePage: true`). Unit `settings-lite.test.ts`. Mutation: names removed (fails on both projects). |

**Changed existing tests and why:**
- `chat-polish-app.spec.ts`:
  - The AC 23 width sweep and the keyboard test now expect no nav on a phone thread, and the nav back on the list.
  - The AC 22 test goes back to the list on phones before it reads the nav. Same page and same socket.
- `app-shell.spec.ts`: the thread path is a `subScreen`. Under 768 px it must have no nav and a visible back link; the nav checks run from 1024 px.
- `discussions-page.test.ts`: two string assertions follow the new `chat-send-text` and `chat-report-text` classes. The words are unchanged and still give the accessible names.

**Judgement calls:**
- On a phone thread the bottom nav is hidden all the time, not only while typing (the stronger of the two options offered). Its badges show again on the list.
- The stage pill is hidden on phones but still read by screen readers.
- The name can be cut with « … » at 360 px when the verified badge is shown.
- The real-CSS check compiles Tailwind 4 from the page's own tokens. It applies layout, not the Stitch colours. Seeing it in the real CDN theme is for the Mac run.

Retest self-check, round 3 (this container, 2026-10-24):

- `npm run lint`: exit 0, 17 warnings, all pre-existing.
- `npm run typecheck`: exit 0.
- `npm run test:unit`: `Test Files  1 failed | 82 passed | 2 skipped (85)`, `Tests  1 failed | 684 passed | 12 skipped (697)` (`photo-rules`, baseline).
- `npm run migration-check`: « Everything's fine ». No schema change this round.
- Full e2e, both projects: `253 passed (7.3m)`, `45 skipped`, `30 failed`. The 30 failures are exactly the baseline: `invite-inbox` 3, `profile-edit-flow` 16, `staff-review` 6, `staff-shell` 5.

## Retest, round 4 (Mac live QA round 3 FAIL on Paramètres contrast, CI red; QA round 3 R3-1)

| Finding | Fix | Proof |
| --- | --- | --- |
| CI and Mac (major): whole-page axe on Paramètres fails `color-contrast` with the real CDN CSS (`app-shell.spec.ts:78` `/settings`, `chat-polish-app.spec.ts:222`) | Reproduced here: `e2e/real-css.ts` now gives compiled Tailwind the page's Stitch colours (its `tailwind-config`) as a `@theme`. axe then reported the same 7 nodes as the Mac: « PRÉFÉRENCES & CONFIDENTIALITÉ » 2.0:1, « Voir les formules » 2.12:1, and five `text-deep-navy/60` descriptions at 4.33 to 4.41:1. Fix on Paramètres only (`settingsHtml`, `SETTINGS_AA_TOKENS`): `text-soft-gold` becomes `text-[#7D5F27]` (5.26:1 on #F7F1E3, 5.6:1 on #FBF8F1), and `text-deep-navy/60` becomes `/70` (5.95:1 on #F4F1EB, the worst background). Every soft-gold text sat on a light card, never on navy. Hover-only variants are left. The axe check stays strict (serious or critical fail). | e2e `QA R2-4 / Mac QA round 3: Paramètres passes axe as a whole page with the real stylesheet; …` now serves compiled CSS with the Stitch colours, so the cloud run measures contrast on the real tokens on both projects. Unit `settings-lite.test.ts` (no old tokens left). Mutation: the AA token pass removed (that e2e fails on both projects). |
| R3-1 (test gap): the `asked !== version` guard | QA's overtaken-read probe is now a kept test. A focus starts a GET that is held with the old value « on ». The member clicks « off » and the PUT settles. The held GET is then released, and the switch must still say « off ». | e2e `QA R3-1: a read that a click overtook cannot repaint the old value`. Mutation: the guard removed (fails on both projects). |
| Mac cosmetic: placeholder cut mid-word at 360 px | A phone thread (under 768 px) shows « Votre message… »; the split view keeps the full placeholder. The label « Réponse réfléchie et posée » is unchanged. | AC 25 e2e: the placeholder value, and a measurement that it fits the text box at 360 and 390 px. `chat.spec.ts` AC 5.1-1 expects the short placeholder on mobile (changed test: the copy is the fix). Mutation: the swap removed (both AC 25 tests fail). |
| Mac cosmetic: square focus ring inside the rounded composer | The ring moved to the rounded composer box (`#thread-compose:has(#thread-input:focus-visible)`): 2 px dark gold #7D5F27, offset 2 px, 5.9:1 on white. The text box's own outline is removed only where `:has` is supported, so older browsers keep their square ring rather than none. | AC 25 e2e: on focus the box has a 2 px solid rgb(125, 95, 39) outline with a radius over 8 px, and the text box has none. Mutation: the box ring removed (both fail). |

Retest self-check, round 4 (this container, 2026-10-24):

- `npm run lint`: exit 0, 17 warnings, all pre-existing.
- `npm run typecheck`: exit 0.
- `npm run test:unit`: `Test Files  1 failed | 82 passed | 2 skipped (85)`, `Tests  1 failed | 685 passed | 12 skipped (698)` (`photo-rules`, baseline).
- Chat-area e2e, both projects (`chat-polish-gates`, `chat-polish`, `chat-polish-app`, `chat`, `chat-media`, `report-block`, `app-shell`, `blocked-list`, `invite-inbox`): `192 passed`, `25 skipped`, `3 failed`, the known `invite-inbox` baseline.
- Not seen here: the real Tailwind CDN. `app-shell.spec.ts` `/settings` runs axe unstyled locally; on CI it gets the CDN, and the tokens it failed on are gone from the page.
