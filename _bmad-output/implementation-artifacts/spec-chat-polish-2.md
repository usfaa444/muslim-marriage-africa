---
title: 'Chat polish 2: collapsible list, fewer words, simple cards, presence, profile links, icon recorder, live waveform, replies, no chrome on sign-in'
type: 'feature'
created: '2026-10-24'
status: 'ready'
route: 'factory'
story_id: 'chat-polish-2'
depends_on: 'chat-polish (PR #14, merged; branch factory/chat-polish-2 from main 184afa9)'
---

## Intent

**Requests (product owner, Faycal, 2026-10-24, verbatim, in three messages):**

1. « good, just minor tweaks: let's add possibility for the user to collapse and reveal back the list of discussion on the left, on screens that it is visible, to have more space and focus on the current open discussion. Also, no header/footer on sign-in and sign-up. On the discussion page, remove the following texts: "ÉCHANGES CONCERTÉS & BIENSÉANCE", "Pour les invitations envoyées en attente, le fil de discussion ne s'ouvre qu'après acceptation formelle de la sœur.", "Registre des échanges : 1 fil actif", "Réponse réfléchie et posée", "Étape : discussion". also, in the list of discussion where screen do not show in split screen, we should make the discussion card simpler, just like we show it when we are in split screen. Right now, when not split, we have a bunch of info not relevant for the chat, that can be found in the user profile, like city, identity verified, and the button to go to the discussion, let's remove all these and user can just click on the card to open the discussion, and simplify the card beautifuly to show only relevant info like in split screen, also profile picture should be circular instead of square rounded. also let's make the badge circle color amber or orange to attract attention. also for button to send message, instead of text, let's put an icon in circular background shape, just like whatsapp. same thing for when recording, let's replace the texts with icons that are meaningful, with square icon and color read to cancel, a "v" kind of icon with our navy color to stop the recording before sending, (also let's offer to listen before sending). Also, let's track online, and when was the last time a user was online, these will be added to the premium package later, but not now, let's just implement it now, and add it in the header showing the user name, maybe just before or after the user city. and that should also be a setting user can turn on/off and it should act as whatsapp. Also in the same user header, clicking on the user profile picture or username should open the user profile page. »
2. « Also when listening for an audio someone sent, let's animage the waves so it shows as the audio progress, ofcourse it should pause when ended or when audio is paused. And the waves display should be a bit wider, extend to close to the end of the message card, instead of being just half inside the message card. Add that to the same fix »
3. « Let's also add reply functionality: 1. Reply arrow indicator: Show an arrow, just like WhatsApp does. Its placement depends on who sent the message: (a) On the left side if we sent it (b) On the right side if it's a message we received 2. Swipe-to-reply gesture: Add a swipe-to-reply gesture, similar to Telegram or WhatsApp, allowing the reply to target a specific message in the chat. 3. Quoted message card: The reply message card should reflect the targeted message, showing the beginning of that text. If it is long, trim it with three dots (...) up to a maximum of two lines, so the user can easily see what they are replying to, or what was replied to. add that to the current ongoing fix »

**Approach:**

- **Collapsible list (split view, ≥ 768 px).** A 44 px icon button `Liste des discussions` (`aria-expanded`, `aria-controls="discussions"`) in the thread header. Collapsed, the list column goes to 0, the list is `inert` and hidden, and the thread takes the full width (a transition under `prefers-reduced-motion: no-preference` only). The choice is kept per device in `localStorage` (`ankanu_chat_list_collapsed`, read and written in `try/catch`). Phones never show the toggle: the list is its own screen there.
- **Removed texts.** The five strings are gone. The composer keeps an accessible name, « Votre message », as a visually hidden label. « Étape » is removed entirely (`STAGE_LABEL` dropped).
- **List cards.** One card design at every width: round avatar, name and age, last-message preview (with my receipt), short time, and the unread badge. No city, no « Identité vérifiée », no « Accéder » button. A single link covers the card (its name is « Accéder à la conversation avec X[, N messages non lus] »).
- **Amber badges.** The unread badge and the bottom-nav badges are `#F59E0B` with navy `#0B1D36` text (7.86:1). The count stays in words for screen readers.
- **Round icon buttons.** « Envoyer » is a 44 px navy circle with a send icon. The recorder is icons only: a red square trash « Annuler » (`#B42318`, 6.57:1 on white), a navy round check « Arrêter l'enregistrement ». After stopping, a preview: play / pause « Écouter la note vocale », the same waveform, the language select, the trash, and a round send « Envoyer la note vocale ». Nothing is posted until send.
- **Waveform.** 36 bars span the bubble (the bars end within 24 px of the bubble edge at 320, 390 and 1280 px). They fill as the note plays (each frame, or at `timeupdate` under reduced motion). They hold on pause and go back to the start at the end, like WhatsApp. The waveform is a `slider` « Position dans la note vocale » with `aria-valuetext` « 0:12 sur 0:48 ». Arrow keys move 5 s, Home and End go to the ends, and a tap seeks. The real audio length wins over the stored one once the browser knows it.
- **Presence.** This is real presence, from realtime socket connections, never invented. The PRD rejects fake « online now » chrome (FR-024, UX-DR32) and lists FR-035 « Online-now indicator » as NEXT; the owner brought FR-035 forward here, with its hide-online control.
  - « En ligne » while the member has at least one socket open (several tabs count once). A tab that closes or reconnects within 15 s does not flicker.
  - After the grace period: « Vu pour la dernière fois aujourd'hui à 14:05 / hier à … / le 12 octobre à … » (Ouagadougou time). `last_seen_at` is the time the last socket closed, stored in `chat_presence` (migration `0028`).
  - The thread head (`GET /v1/conversations/:id`) carries `presence: { online, last_seen_at } | null`. `presence.changed { account_id }` (ids only) tells chat partners to reload the head.
  - It shows after the city in the thread header. It never appears on browse, profile or list cards.
- **Presence switch.** Paramètres gets « Statut en ligne et dernière connexion », on by default and reciprocal like WhatsApp: off, nobody sees mine and I see nobody's. It uses `PUT /v1/chat/settings { presence }`. One `GET` paints both chat switches, and each switch saves only its own field.
- **Profile links.** The header name is a link to `/profil/<other_id>` (one tab stop). The photo links to the same place for pointer users (`tabindex="-1"`, `aria-hidden`). An unavailable member gets no link.
- **Sign-in and sign-up.** `/auth`, `/signup/account`, `/signup/identity`, `/signup/pseudonym` and `/password-reset` use the header-less shell: no site header, no footer, only the « Confidentialité » legal line. The landing page `/` keeps its own header and footer.
- **Replies.**
  - Server: `message.reply_to_message_id` (migration `0029`, a self-reference FK). `POST …/messages` accepts an optional `reply_to_message_id` for text, photo and voice. A malformed id is a 400 naming the field. An unknown id, or a message of another conversation, is a 404 « Ce message est introuvable. », and nothing is stored (no object, no row, no scan job).
  - Each message carries `reply_to`: `{ id, available: true, sender_id, mine, kind, text }`, where `text` is the start of a text target (at most 160 characters, then « … ») and null for media. It is `{ id, available: false }` when the target cannot be shown (missing, unreadable, or in another conversation). The quote is decrypted at read time from the target's sealed body, like any text, and is never stored in clear.
  - Page: a 44 px « Répondre » arrow, left of my bubbles and right of theirs. It shows on hover or focus with a mouse, and takes no room on touch screens.
  - A swipe right of 60 px on a bubble (Pointer Events, touch and pen) starts a reply. The bubble follows the finger (up to 88 px) and an arrow hint fills. A vertical move is left to the scroll, and the tap that ends a swipe never opens the Photo viewer.
  - The composer shows a preview « Réponse à X » with the start of the message (two lines, then « … »), a cross « Annuler la réponse », and Escape.
  - The sent bubble shows the quoted card (two lines, `-webkit-line-clamp: 2`; Photo and Note vocale with an icon). A tap on the card scrolls to the quoted message and highlights it for 1.6 s. Older pages are loaded first if needed, up to 20 pages; failing that, « Le message cité n'est plus disponible dans cette discussion. »
  - A closed, blocked or unavailable conversation shows no arrow and no reply.

**D36 / FR-036 (anonymous mode, NEXT).** D36 hides last-seen in anonymous mode. That mode is not built. When it is, it must force `presence` off for the member (the same path as the switch), so no extra rule is needed here.

**Premium seam.** `presenceAllowed(viewerId)` in `chat-presence.ts` returns true today. The future paid gate decides there, for the viewer only. It never changes what is stored or announced.

## Boundaries & Constraints

**Always:**

- Presence is only between the two members of a conversation (`chatPartners`: accepted invite, a conversation, no Block). A Block either way hides it (`null`) and stops `presence.changed`. If either member hides it, the head says `null` and no event announces the hidden member, so nobody can time her comings and goings from the events.
- The reply target is checked on the server, for the conversation of the send. The quote is built only from a target of the same conversation, even if a stored id somehow pointed elsewhere.
- Events carry ids only. Chat settings changes reuse `chat.receipts { account_id }` (« a chat privacy setting changed »), sent to my tabs and my unblocked partners.
- French only. 44 × 44 targets. WCAG 2.2 AA (axe zero serious or critical, measured with the real compiled Tailwind on the list and the settings). No horizontal scroll at the factory widths. API text goes through `textContent`, never `innerHTML`.

**Never:**

- No fake or estimated presence; no presence on Discover, Search, profile or list cards.
- No reply quote stored in clear; no media URL in a quote.
- No BillingPort call on chat routes (the premium seam is a stub).

## Acceptance criteria

1. In the split view, « Liste des discussions » collapses and reveals the list (`aria-expanded`). Collapsed, the thread uses the full width, and the choice survives a reload. It works without storage. There is no toggle on phones.
2. None of the five removed texts (nor « Étape ») appear on the list or the thread.
3. The composer's accessible name is « Votre message », with no visible label.
4. A list card shows only the round avatar, name and age, preview, time, receipt and unread badge: no city, no verified pill, no button.
5. The whole card opens the thread. Avatars are circles on phones and in split rows.
6. Unread and bottom-nav badges are amber with navy text (≥ 4.5:1) and keep their word count for screen readers.
7. « Envoyer » is a 44 px navy circle with an icon and a visually hidden name.
8. Presence: « En ligne », or « Vu pour la dernière fois … », after the city, live on `presence.changed` for the open thread only. It is multi-tab aware with a grace period, and `last_seen_at` is persisted. Nothing shows across a Block, when either member hides it, or for an unavailable member.
9. « Statut en ligne et dernière connexion » in Paramètres is on by default, reciprocal, members only and booleans only. It saves only its own field, and one read paints both switches.
10. The header name links to `/profil/<other_id>` and is keyboard reachable. The photo links there too but is not a second tab stop. No link for an unavailable member.
11. Sign-in, sign-up and reset pages have no site header, footer or bottom nav, and keep the « Confidentialité » link.
12. The landing page keeps its own header and footer.
13. Recorder: icon buttons with accessible names. « Annuler » is a red square, « Arrêter » a navy check; 44 px targets.
14. « Annuler » discards the note at any step and sends nothing.
15. After « Arrêter », the member can listen (play / pause, waveform) before the round « Envoyer la note vocale ». Nothing is posted before.
16. A playing note fills the waveform, holds on pause and resets at the end; under reduced motion it still shows progress.
17. The waveform is a slider (arrow keys ±5 s, Home, End, tap to seek, « m:ss sur m:ss ») that spans the bubble without overflow.
18. A « Répondre » arrow (left of mine, right of theirs, keyboard focusable) starts a reply. The composer previews it in two lines with « … » and can cancel it (cross, Escape).
19. A touch swipe right past 60 px starts a reply. Shorter or vertical moves do not.
20. A reply (text, photo or voice) stores its target. Both members see the quoted card (text start, or « Photo » / « Note vocale »), two lines at most.
21. A reply target that is malformed (400), unknown or from another conversation (404) is refused, and nothing is stored. The page keeps the text and drops the reply.
22. A quote that cannot be read shows « Message indisponible ». A tap on a quote goes to the quoted message and highlights it, loading older pages first if needed.
23. A closed, blocked or unavailable conversation offers no reply, and the server refuses one (409).

## Trace

| AC | Proof |
| --- | --- |
| 1 | `e2e/chat-polish-2.spec.ts` « AC 1: the toggle hides the list… », « …on a phone there is no toggle… », « …without storage… » |
| 2, 3 | `chat-polish-2.spec.ts` « AC 2 / 3 »; `discussions-page.test.ts` « …none of the texts Faycal removed » |
| 4, 5, 6 | `chat-polish-2.spec.ts` « AC 4 / 5 » (real Tailwind, axe), « AC 6 »; `chat.spec.ts` list test |
| 7 | `chat-polish-2.spec.ts` « AC 7 » |
| 8 | `chat-messages.test.ts` « chat-polish-2 AC 8 » (×2); `chat-polish-2.spec.ts` « AC 8 » (×2); PG: `operator-config.migrate.test.ts` |
| 9 | `chat-messages.test.ts` « chat-polish-2 AC 9 » (×2); `settings-lite.test.ts`; `chat-polish-2.spec.ts` « AC 9 » (×2) |
| 10 | `chat-polish-2.spec.ts` « AC 10 » (×2) |
| 11, 12 | `e2e/app-shell.spec.ts` signed-out pages and landing; `app-shell.test.tsx` |
| 13–15 | `e2e/chat-media.spec.ts` « AC 13 / 14 / 15 », « AC 14 » |
| 16, 17 | `chat-media.spec.ts` « AC 16 », « AC 17 » |
| 18 | `chat-polish-2.spec.ts` « AC 18 / 19 », « AC 18 keyboard » |
| 19 | `chat-polish-2.spec.ts` « AC 19 swipe » |
| 20 | `chat-messages.test.ts` « chat-polish-2 AC 20 »; `chat-media.test.ts` « chat-polish-2 AC 20 »; PG migrate test |
| 21 | `chat-messages.test.ts` « chat-polish-2 AC 21 »; `chat-polish-2.spec.ts` « AC 21: a reply whose target is gone » |
| 22 | `chat-messages.test.ts` « chat-polish-2 AC 22 »; `chat-polish-2.spec.ts` « AC 22 », « AC 21 / 23 » |
| 23 | `chat-messages.test.ts` « chat-polish-2 AC 23 »; `chat-polish-2.spec.ts` « AC 21 / 23 » |
| Responsive | `chat-polish-2.spec.ts` « fits every factory width… »; `chat-media.spec.ts` width sweep |
