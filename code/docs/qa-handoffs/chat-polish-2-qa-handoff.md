# QA handoff: Chat polish 2 (collapsible list, fewer words, simple cards, presence, profile links, icon recorder, live waveform, replies, no chrome on sign-in)

Spec: `_bmad-output/implementation-artifacts/spec-chat-polish-2.md` (Faycal's three requests verbatim, the approach, 23 ACs and the trace). Branch `factory/chat-polish-2` from `main` 184afa9. Not pushed.

## 1. What was built

**Discussions (list and thread)**

- **Collapsible list, split view (≥ 768 px).** An icon button « Liste des discussions » sits in the thread header (44 px, `aria-expanded`, `aria-controls="discussions"`). Collapsed:
  - the list column is 0 wide, the list is hidden and `inert`, and the thread takes the full width;
  - a slide transition plays under `prefers-reduced-motion: no-preference` only;
  - the choice is kept per device in `localStorage` key `ankanu_chat_list_collapsed`, wrapped in `try/catch`, so without storage it works for the visit.
  - There is no toggle on phones, and the phone list screen is always shown.
- **Removed texts.** These are gone: « ÉCHANGES CONCERTÉS & BIENSÉANCE », the pending-invitations note, « Registre des échanges : N fil(s) actif(s) », « Réponse réfléchie et posée » and « Étape : discussion » (« Étape » is removed entirely). The composer keeps a visually hidden label, « Votre message ».
- **List card, every width.**
  - The card holds a round avatar, « Pseudonyme, 29 ans », the last message preview (« Vous : … », Photo, Note vocale, with my tick), a short time (HH:MM today, « Hier », or a short date) and the unread badge.
  - No city, no « Identité vérifiée », no « Accéder » button.
  - One link covers the card. Its name is « Accéder à la conversation avec X[, N messages non lus] ».
- **Badges.** The unread badge and the bottom-nav badges are amber `#F59E0B` with navy `#0B1D36` text (7.86:1), and the count is still given in words for screen readers.
- **Send.** « Envoyer » is a 44 px navy circle with a send icon. Its name is visually hidden text.

**Presence and profile links**

- **Presence**, in the thread header after the city:
  - « En ligne » (green dot plus the words);
  - « Vu pour la dernière fois aujourd'hui à 14:05 », « … hier à 21:05 » or « … le 2 mars à 08:30 », in Ouagadougou time;
  - nothing at all when hidden, blocked, unavailable or never seen.
  - It updates live on `presence.changed { account_id }` for the open thread's member only. The page reloads the head, and the event carries no state.
- **Presence switch.** Paramètres has « Statut en ligne et dernière connexion », after « Confirmations de lecture ».
  - On by default, reciprocal like WhatsApp: off, nobody sees mine and I see nobody's.
  - The explanation reads: « Désactivé, vos interlocuteurs ne voient pas quand vous êtes en ligne ni quand vous l'étiez pour la dernière fois, et vous ne voyez pas non plus les leurs. »
  - Both switches are painted by one `GET /v1/chat/settings`. Each `PUT` carries only its own field (`{ presence: false }`).
  - A failed save puts the switch back and shows « Réglage non enregistré. Réessayez. ».
- **Profile links.** The header name is a link to `/profil/<other_id>` (title « Voir le profil de X »). The photo links to the same place for the pointer but is not a tab stop. An unavailable member has no link.

**Recorder and voice notes**

- **Recorder (icons only).** While recording:
  - a red dot, « Enregistrement en cours » for screen readers, and the timer « 0:03 / 2:00 »;
  - a red square trash « Annuler » (`#B42318`);
  - a navy round check « Arrêter l'enregistrement ».
- **After stopping:**
  - play / pause « Écouter la note vocale » / « Mettre en pause la note vocale » and the waveform (listen before sending);
  - the language select, the trash, and a round navy « Envoyer la note vocale ».
  - Nothing is posted before send.
- **Waveform** (received, sent and preview):
  - 36 bars fill the bubble width;
  - they fill as the note plays, hold on pause and reset at the end;
  - it is a slider « Position dans la note vocale » with « 0:12 sur 0:48 »: arrows ±5 s, Home, End, and a tap to seek;
  - the real audio length replaces the stored one when the browser knows it.

**Replies**

- **Starting a reply.** A « Répondre » arrow sits left of my bubbles and right of theirs. With a mouse it shows on hover or focus. On touch screens it takes no room, but it stays keyboard focusable.
- **Swipe.** A swipe right of 60 px on a bubble (touch or pen) starts a reply. The bubble follows up to 88 px and the arrow hint turns navy once armed.
- **Composer preview.** « Réponse à X » (or « Réponse à Vous ») with the start of the message in two lines, then « … », and a cross « Annuler la réponse ». Escape also cancels.
- **Sent reply.** The bubble shows a quoted card: « X » plus the text start (two lines, then « … »), or a camera / mic icon with « Photo » / « Note vocale ».
  - Tapping the card scrolls to the quoted message and highlights it for 1.6 s, loading up to 20 older pages if needed. If it still cannot be found: « Le message cité n'est plus disponible dans cette discussion. »
  - A target that cannot be read shows « Message indisponible ».
- **No reply** in a closed, blocked or unavailable conversation.
- **API.**
  - `POST /v1/conversations/:id/messages` takes an optional `reply_to_message_id`, for every kind.
  - Malformed: 400 « reply_to_message_id : valeur non reconnue. ».
  - Unknown, or from another conversation: 404 `NOT_FOUND` « Ce message est introuvable. » with `details.field`. Nothing is stored or enqueued.
  - Messages carry `reply_to` (see spec). The quote text is at most 160 characters, then « … ».

**Sign-in and sign-up.** `/auth`, `/signup/account`, `/signup/identity`, `/signup/pseudonym` and `/password-reset` have no site header, footer or bottom nav. Only the « Confidentialité » line (`/#legal`) remains. The landing page `/` keeps its own header and footer.

## 2. Where

**API**
- `apps/api/src/chat-presence.ts` is new: store (memory / Postgres), live registry, grace, `presenceBetween`, `presence.changed`, premium seam `presenceAllowed`.
- `chat-realtime.ts`: connect / disconnect hooks and the event emitter.
- `chat-messages.ts`:
  - presence in the head, `presence` in chat settings;
  - `reply_to_message_id` on send, `reply_to` on read, `QUOTE_MAX = 160`.
- `account-schema.ts`: `chat_presence`, and `message.reply_to_message_id`.

**Migrations**
- `apps/api/drizzle/0028_chat_presence.sql`
- `0029_message_reply.sql`
- snapshots and the journal

**Web**
- `apps/web/src/discussions-page.ts`
- `read-receipts-setting.ts` (now two switches)
- `v2-pages.ts` (the `AUTH` shell, the presence card in Paramètres)
- `app-shell.ts` (amber nav badge)

**Tests**
- `apps/api/src/chat-messages.test.ts`, `chat-media.test.ts`, `operator-config.migrate.test.ts`
- `apps/web/src/discussions-page.test.ts`, `settings-lite.test.ts`, `app-shell.test.tsx`
- `e2e/chat-polish-2.spec.ts` (new), `e2e/chat-media.spec.ts`, `e2e/chat-polish-mock.ts`, `e2e/app-shell.spec.ts`
- label and list updates in `chat.spec.ts`, `chat-polish*.spec.ts`, `report-block.spec.ts`

No new env vars or flags.

## 3. How to run

From `code/`:

- `npm run lint`
- `npm run typecheck`
- `npm run build`
- `npm run migration-check`
- `npm run test:unit`
- `npm run test:integration` (needs Docker for the Postgres 17 migrate test)

E2E (web-only dev server, stub cookies, every `/v1` call mocked):

```
PLAYWRIGHT_CHROMIUM_EXECUTABLE=/opt/pw-browsers/chromium E2E_ALLOW_ERRORS='cdn\.tailwindcss\.com,tailwind is not defined,fonts\.googleapis\.com,fonts\.gstatic\.com,ERR_NETWORK_CHANGED' npx playwright test e2e/chat-polish-2.spec.ts e2e/chat-media.spec.ts e2e/app-shell.spec.ts
```

Full stack (`docker compose up`): two members with an accepted invite. Open `/discussions/<id>` for each in two browsers to see « En ligne ». Close one browser: after 15 s the other reads « Vu pour la dernière fois aujourd'hui à … ».

## 4. AC trace table

| ID | Criterion | Proof | Status |
| --- | --- | --- | --- |
| 1 | Collapse and reveal the list in the split view; full width; remembered; none on phones | `chat-polish-2.spec.ts` « AC 1 » ×3; mutation L1 | Pass |
| 2 | Five texts (and « Étape ») removed | `chat-polish-2.spec.ts` « AC 2 / 3 »; `discussions-page.test.ts` | Pass |
| 3 | Composer named « Votre message », no visible label | same | Pass |
| 4 | Simple card: no city, pill, button | « AC 4 / 5 »; `chat.spec.ts` list test | Pass |
| 5 | Whole card is the link; round avatars (phone and split) | « AC 4 / 5 » | Pass |
| 6 | Amber badges, navy text, words kept | « AC 4 / 5 » (real Tailwind + axe), « AC 6 »; mutation B1 | Pass |
| 7 | Round 44 px send icon | « AC 7 » | Pass |
| 8 | Real presence, multi-tab, grace, last seen, live, never across Block or hidden | `chat-messages.test.ts` AC 8 ×2; e2e « AC 8 » ×2; PG migrate; mutations P1–P5, P3, P4 | Pass |
| 9 | Reciprocal switch in Paramètres, own field only, one read | `chat-messages.test.ts` AC 9 ×2; `settings-lite.test.ts`; e2e « AC 9 » ×2; mutations S1, P6 | Pass |
| 10 | Name and photo open `/profil/<id>`; one tab stop; none when unavailable | e2e « AC 10 » ×2; mutation P2 | Pass |
| 11 | No header or footer on sign-in, sign-up, reset; legal link kept | `app-shell.spec.ts` signed-out pages; `app-shell.test.tsx`; mutation A1 | Pass |
| 12 | Landing keeps its header and footer | `app-shell.spec.ts` landing | Pass |
| 13 | Icon recorder, red square cancel, navy check stop, 44 px | `chat-media.spec.ts` « AC 13 / 14 / 15 » | Pass |
| 14 | Cancel discards at any step | « AC 14 »; existing refused-mic test | Pass |
| 15 | Listen before sending; round send | « AC 13 / 14 / 15 »; mutation W5 | Pass |
| 16 | Waveform fills, holds on pause, resets at end | « AC 16 »; mutations W1, W2, W3 | Pass |
| 17 | Slider keys, tap seek, spans the bubble | « AC 17 »; mutation W4 | Pass |
| 18 | Arrow left of mine, right of theirs; keyboard; two-line preview; cancel | « AC 18 / 19 », « AC 18 keyboard »; mutations M2, M3, M4, M6 | Pass |
| 19 | Swipe ≥ 60 px replies; short or vertical does not | « AC 19 swipe »; mutation M1 | Pass |
| 20 | Reply stored; both see the quote (text start or media kind) | API AC 20 (text, media); PG migrate; mutations R4, R5, R6 | Pass |
| 21 | Malformed (400), unknown or foreign (404) refused, nothing stored; page keeps the text | API AC 21; e2e « AC 21 »; mutations R1, R3 | Pass |
| 22 | Unreadable quote: « Message indisponible »; tap goes to the message (older pages) | API AC 22; e2e « AC 22 », « AC 21 / 23 »; mutations R2, M7 | Pass |
| 23 | No reply in a closed, blocked or unavailable conversation | API AC 23 (409); e2e « AC 21 / 23 »; mutation M5 | Pass |
| A11y | axe AA, names, 44 px, focus | axe in each e2e above (real Tailwind on list and settings) | Pass |
| Responsive | No horizontal scroll at 320 to 1440 px | « fits every factory width… »; chat-media sweep | Pass |
| Privacy / authz | Presence only between partners, never across a Block; quote only from the same conversation | API AC 8, 21, 22, 23 | Pass |

Mutation proofs (each mutation applied alone, the named test run, the file restored):

- **Web: each killed.** M1 to M7 (replies), W1 to W5 (waveform and preview), L1 (toggle persistence), P1 (presence for the open thread only), P2 (profile href), B1 (nav badge colour), S1 (settings own field), A1 (auth shell).
- **API: each killed.** R1 to R6 (reply target, quote guard, id format, 160 cut, media check, stored id), P1 to P5 (hidden never announced, recipients filter, Block, grace with two tabs, reciprocal), P6 (presence field message).
- **Tightened after a mutation survived.** W1 and W3 survived the first run. The tests then gained the painted-bar count and the held position.
- **Defence in depth.** P3 and P4 survived the first run, for two different reasons. P3: the head already hides an unavailable / blocked member. P4: the test had no wait after the first tab closed. The tests then gained a direct `presenceBetween(…, blocked)` assertion and a wait after the first tab closes.

## 5. Test cases for QA

**List and send**

1. At 1280 px, open a thread and press « Liste des discussions ». The list disappears and the thread widens. Reload: it is still collapsed. Press it again (keyboard, Enter): the list comes back.
2. At 390 px there is no toggle. The list screen always shows the list.
3. The list card shows no city, no « Identité vérifiée » and no button. Tap anywhere on it: the thread opens. The badge is amber.
4. The bottom-nav badge is amber with navy text.

**Presence**

5. Two members chat. A sees « En ligne ». B closes every tab: after about 15 s, A sees « Vu pour la dernière fois aujourd'hui à HH:MM ».
6. B turns « Statut en ligne et dernière connexion » off. A sees nothing, and B sees nothing of A either. With B off, B's coming and going sends A no events (check WS frames).
7. A blocks B: no presence either way.
8. A stranger never receives `presence.changed` (check WS frames).

**Profile and sign-in**

9. Click the name in the header: `/profil/<id>`. Tab through the header: the name is one stop, the photo is not.
10. `/auth`, `/signup/identity`, `/signup/pseudonym`, `/password-reset`: no header, no footer, the « Confidentialité » link at the bottom. `/` keeps its header and footer.

**Recorder and voice notes**

11. Record: the red square trash, then the navy check. Then the play button and the waveform (listen), and the round send. The trash at any step sends nothing.
12. Play a received note: the bars fill. Pause: they stop. At the end: back to the start. Arrow keys on the waveform move 5 s and are announced as « 0:05 sur 0:48 ».

**Replies**

13. Hover a received bubble: the arrow is on its right. On mine: on the left. Reply: the preview shows « Réponse à X » and two lines with « … ». Send: the quoted card shows. Tap it: it jumps to the quoted message and highlights it.
14. On a phone, swipe a bubble right about 2 cm: the reply starts. A short or mostly vertical swipe does nothing. A tap on a photo still opens the viewer.
15. API: `reply_to_message_id` of another conversation gives 404 and nothing is stored. `"abc"` gives 400. Into a blocked conversation: 409.
16. A closed conversation shows no arrow.

## 6. Out of scope

- Premium gating of presence (only the seam).
- Anonymous mode D36 / FR-036 (NEXT; it must force presence off when built).
- Reply notifications, and replies in the list preview.
- Editing or deleting messages.
- Swipe with a mouse (the arrow covers it).

## 7. Assumptions, decisions and known issues

**Presence**
- **Default on**, like WhatsApp. FR-035's « hide-online control » is the switch.
- **Live state is per api process.** The stack runs one api container today. With several api instances, presence would need the Redis substrate (`last_seen_at` is already in Postgres).
- **Last seen** is when the last socket closed, stored after the 15 s grace period. A member whose browser keeps a socket open in the background stays « En ligne » (WhatsApp shows the same while the app is open).
- **Reused event.** `chat.receipts` is reused as « a chat privacy setting changed » (receipts or presence); threads and Paramètres reload on it. No new event name.

**Copy and pages**
- **« Étape »** is removed entirely, not only hidden.
- **Auth pages** use the existing header-less shell with the legal line.

**Voice notes**
- **Waveform** resets to the start at the end (WhatsApp). The arrow keys move 5 s.

**Replies**
- **Quote text** is cut at 160 characters on the server (the page clamps to two lines).
- **Highlight.** A tap on a quote jumps at once (no smooth scroll: the same rule as the jump to the latest message, for 2G phones) and highlights for 1.6 s.
- **Arrow name.** The touch-screen arrow is hidden but keyboard focusable. Its name is « Répondre » for every bubble; the bubble's own content precedes it in reading order.

**Navigation**
- The bottom nav stays hidden on the phone thread screen, as before.

**Known**
- The baseline e2e failures (invite-inbox, profile-edit-flow, staff-review, staff-shell) and the unit `photo-rules` failure predate this story (see §8).

## 8. Self-check (real output, this container, 2026-10-24)

- `npm run lint`: 0 errors, 17 warnings (the pre-existing 17).
- `npm run typecheck`: clean.
- `npm run build`: clean.
- `npm run migration-check`: « Everything's fine 🐶🔥 ».
- `npm run test:unit`: Test Files 1 failed | 82 passed | 2 skipped (85); Tests 1 failed | 696 passed | 12 skipped (709). The one failure is the baseline `photo-rules.test.ts` « keeps a 32px play circle in Chrome… ».
- **Migrate test on local Postgres 16.** A temporary copy of `operator-config.migrate.test.ts` was used, with its Docker block replaced by `postgres://ankanu:ankanu@127.0.0.1:5432/ankanu_mig` and the version check widened to 16 / 17 (Docker is not available here). Result: Tests 20 passed (20). The copy was deleted afterwards.
- **Chat-area e2e** (chat, chat-media, chat-polish*, report-block, app-shell, blocked-list, auth-entry, smoke): 197 passed, 2 failed (QA R3-1 counted two settings reads once the second switch existed). Fixed by one shared read; green in the full run below.
- `e2e/chat-polish-2.spec.ts`: 31 passed, plus the width sweep (1 passed).
- New chat-media tests: 8 passed.
- **Full e2e:** 30 failed | 53 skipped | 295 passed (7.9 min). The 30 failures are exactly the baseline: invite-inbox 3, profile-edit-flow 16, staff-review 6, staff-shell 5. No chat, settings, shell or auth failure.
