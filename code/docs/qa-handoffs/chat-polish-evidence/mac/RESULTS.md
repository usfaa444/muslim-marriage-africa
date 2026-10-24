# Live QA on Faycal's Mac: story chat-polish (full-screen Photo, open at the latest message, read ticks, split view)

Date 2026-10-24 (UTC 12:27–13:00). Branch `factory/chat-polish` at `b2ccb5b`. Stack `ankanu-local` on http://localhost:4012, left running.

**Verdict: FAIL (one major finding).** The thread does not open at the latest message on the real stack (D1). This is the story's AC 4 and the first thing the owner asked for. Everything else works live: ticks, the hidden-tab and scrolled-up guards, « Nouveaux messages », the split view, live list updates, the Photo viewer, Lite, the read route's authorization, and the Block. There is one minor finding (D2). D3 is a note for the next round.

## 1. Deploy

| Step | Result |
|---|---|
| Earlier local branch `factory/chat-live` | does not exist on this Mac; nothing to stash |
| `git fetch`, `checkout factory/chat-polish`, `pull` | at `b2ccb5b`, up to date |
| `npm ci` in `code/` | OK |
| `up -d --build --wait` | all 6 services healthy. Built with a temporary `DOCKER_CONFIG` without `credsStore` (keychain hang seen before); `~/.docker/config.json` not changed |
| `drizzle-kit migrate` | applied; `conversation_read (conversation_id, account_id, last_read_message_id, read_at)` present |
| `curl /` and `/v1/health` | 200, `{"status":"ok"}` |
| `npm run test:integration` | not run (stack up, per config) |
| `down` / data reset | none |

## 2. E2E

| Run | Result |
|---|---|
| `E2E_BASE_URL=http://localhost:4012 npm run test:e2e` | **44 passed, 0 failed, 248 skipped** (the chat-polish specs are stub-based and skip on a stack). `e2e-fullstack.txt` |
| `npm run test:e2e` (web-only, real Tailwind CDN and Google Fonts) | **251 passed, 1 failed, 40 skipped.** `e2e-webonly.txt` |

The one failure is `chat-polish.spec.ts:99` « AC 4 / 7: the thread opens at the latest message with the composer in view » on **desktop**: the last bubble is not in the viewport (« viewport ratio 0 »). It fails **5 of 5** with `--repeat-each=5`. The cloud QA ran without the CDN, so it did not see this. The test's screenshot shows the split-view pane stopped two messages short of the end. This is D1. The fake-microphone recorder tests that failed here in 5.3/5.4 passed this time.

## 3. Live walkthrough (real accounts, real Socket.IO, 2 to 3 browser contexts at once)

Accounts were created only through the real API (`scripts/setup.mjs`): `recaptcha_token: test-ok`, the email link and phone code from the api log, synthetic ID, selfie and photo uploads, approved by a disposable moderator. **A** = Brother `Issa48869`. **B** = Sister `Mariam51943` (A invited). **C** = Sister `Mariam58362` (C invited A). A has 2 conversations, AB and AC. **D** = Brother `Issa63906` is the outsider. Seed: 33 texts in AB, a Photo each way (B 1200×900, A 900×1200), and a Voice note from C in AC. Scripts: `scripts/live.mjs` (first pass), `scripts/retest.mjs` (four checks where the first pass had a script flaw), `scripts/probe-open.mjs` (D1). Data: `live-qa.json`, `retest.json`, with the short-lived media tokens redacted.

| # | Check | Actual | Result |
|---|---|---|---|
| L1 | Open AB at 390 and 1280: latest message and composer in view | **390:** the page stops 861 px above the end. The last bubble's bottom is at 1186 px and the composer's at 1388 px, in a 900 px viewport. **1280:** the composer is in view, but the pane stops 692 px above its end, so B's last text and both Photos are below the fold. It does not correct itself after 7 s | **FAIL → D1** |
| L2 | A (1280) sends: one tick « Envoyé »; B opens the thread (390): A's tick turns « Lu » live | « Envoyé », then « Lu » **1.25 s** after B's page load started, with no reload on A (0 document loads). B made 1 `POST …/read`. Screen-reader text « Lu » | PASS |
| L3 | B's tab hidden (`visibilityState` emulated), A sends | the message reached B over the socket, B made **0** read posts, and A stayed « Envoyé ». Tab visible again: 1 post, and A shows « Lu » after **116 ms** (retest; in the first pass B was not at the end because of D1) | PASS |
| L4 | B (390) scrolled to the top, A sends | the view did not move (`scrollY` 0 → 0, first bubble Δ 0 px), « Nouveaux messages » showed, 0 read posts, A « Envoyé ». A tap went to the end, hid the button, and A turned « Lu » after **53 ms** | PASS |
| L4c | Split view (A 1280): pane `#thread-scroll` scrolled up, B sends | « Nouveaux messages » sticky in the pane, 0 read posts. A tap made 1 post and showed the last message | PASS |
| L5a | A at 1280 on `/discussions` | list left; « Sélectionnez une discussion pour l'afficher ici. » right. Rows: blurred avatar (`/v1/media/get`, the server's blur), « Mariam…, 30 ans », preview (`« … »`, « Note vocale » for C's voice, « Vous : « … » » with ticks for mine), time « 12:34 », gold badge with sr « N messages non lus », bold name while unread | PASS |
| L5b | Click AC | same document (window marker kept), URL `/discussions/<AC>`, title « AnKanu • Discussion », h1 is the name, `aria-current="page"` on AC, badge cleared | PASS |
| L5c | A reads AB; C sends 3 messages in AC | AC moved from 2nd to **1st**, with badge **3** and preview « Retest rafale 3. », **0.98 s** after the first send. **1** list request for the burst. Then A answers in AB: AB back on top, « Vous : « … » », two ticks « Lu » (B had it open) | PASS (retest) |
| L5d | Back, back, forward | `/discussions/<AC>`, then `/discussions` with the placeholder, then AC again; no reload | PASS |
| L5e | Deep link `/discussions/<AC>` | the AC row is current, composer in view | PASS |
| L5f | Split at 768 / 1024 / 1280 / 1440 | list 318 / 358 / 358 / 358 px wide, thread pane 368 / 584 / 840 / 840 px wide, side by side | PASS |
| L6 | 360 and 390: list, then thread, then « Retour aux discussions », then browser back | separate screens, no reload; AC badge « 3 » / « 2 »; one more message from C made the badge go up live; after reading it the badge was gone; link name « Accéder à la conversation avec Mariam58362, 3 messages non lus » | PASS (retest) |
| L7 | Viewer, receiver B 390 / A 1280, their Photo and mine; Escape, × and backdrop each | `role=dialog`, `aria-modal=true`, named « Photo de … » / « Votre photo », `object-fit: contain`, inside the viewport, aspect ratio kept (900×1200 shown 366×488 at 390 and 621×828 at 1280), focus on « Fermer la photo » and kept there by Tab, focus back on the Photo, page scroll locked. **0 requests** while open (blob URL). **0 `original` requests** in the whole session | PASS (B's own Photo retested: the first pass counted a lazy request from scrolling) |
| L7-lite | B 390, Lite on | 0 open buttons and 0 media requests before « Afficher la photo »; after the tap the Photo can be opened, with 0 requests while the viewer is open | PASS |
| L8 | `POST /v1/conversations/<AB>/read` | outsider D **404**, signed out **401**, bad `message_id` **400**, a message from AC **404**, C (A's other match) **404**; 0 rows stored for C or D | PASS |
| L9 | B blocks A | list: `last_message.read` null for A's own last message; head `read.other` null on both sides; A's AB row has no tick. While blocked, A's read post was 200 and B's open page got **no** event (0 « Lu »). The send was refused. **But A's open thread still draws one tick « Envoyé » on all 14 of A's messages, and B's thread on all 16 of hers** | Minor → D2 |
| L9b | Unblock | the ticks come back (14) | PASS |

## 4. Styled checks (real stack, real Tailwind CDN, fonts, Material Symbols)

A's view, 3 states (list, AB thread, viewer open on B's Photo) × 6 widths (360, 390, 768, 1024, 1280, 1440) = 18 states:

| Check | Result |
|---|---|
| Horizontal scroll | none |
| Visible link/button/select/textarea < 44×44 | 0 |
| axe wcag2a/aa, 21a/aa, 22aa | 0 serious or critical, **0 violations of any impact** |
| Console errors (all contexts, both scripts) | **0** |

**Compared with Stitch 20** (`design-stitch/ankanu-v2/20-discussions-list`): the phone list matches (card rows, square avatar, « Pseudonyme, âge ans », city, « Identité vérifiée », italic quoted preview with the gold rule, clock and « Aujourd'hui à … », navy « Accéder à la conversation → », gold double tick for « Lu »). Differences: Stitch's tabs « Toutes / Non lues / Sans réponse » are absent (not in this story), and Stitch's unread tag is a navy « 1 non lu » pill next to the time where ours is a gold count bubble at the end of the preview. Our split view has no Stitch screen of its own; it reuses the same tokens and reads as part of the same app.

**Compared with Stitch 21** (`21-chat-thread`): the header card, the bubbles (light for theirs, navy for mine), the time under each bubble with the gold double tick for « Lu », and the composer (camera, microphone, « Envoyer → », « Règle d'or ») all match. Out of this story: the wali banner, « Demander la levée du flou », « Quota du jour ».

**Feel ("smooth and live"), honestly:** the live parts are good. Ticks turn « Lu » 0.05 to 1.3 s after the other side looks, the list reorders and badges count up within about 1 s, switching threads is instant with no flash, and the viewer opens with no wait. But opening a conversation does not land on the latest message (D1). On a phone you land in the middle of the history with the composer off-screen, which is the opposite of what was asked. In the split view, the header, the « AnKanu » footer line and the floating bottom nav take about 40 % of a 900 px screen, so the thread pane shows only 3 or 4 bubbles (see D3).

## 5. Findings

| # | Severity | Steps | Expected | Actual | Evidence |
|---|---|---|---|---|---|
| D1 | **Major** (AC 4) | With the real Tailwind CDN and fonts: open any thread with more than one screen of messages, at 390 or at 1280 | latest message and composer in view | it stops short and stays there: 861 px above the end at 390 (composer off-screen) and 692 px in the 1280 pane. It is the same with all media requests blocked, so the Photos are not the cause. The web-only e2e `chat-polish.spec.ts:99` fails 5/5 on desktop here for the same reason. Likely cause (code reading, not proven): `settleAtEnd()` re-follows at rAF, 250 ms and 1 s only `if (pinned)`, but the CDN restyle fires a scroll event while the end is out of view, so `onScroll()` sets `pinned = nearBottom()` = false and cancels both re-follows. On phones `form.scrollIntoView({block:'end'})` also runs before the CDN layout. A layout-driven scroll should not count as the member scrolling (e.g. keep following until a real wheel/touch/key input, or use a `ResizeObserver` on the log while pinned) | `shots/L1-open-latest-390.png`, `shots/L1-open-latest-1280.png`, `scripts/probe-open.mjs` output in section 6, `e2e-webonly.txt` |
| D2 | Minor (AC 11 wording) | B blocks A; A (or B) has the thread open or reopens it | « no ticks » for the blocked pair (AC 11) | the list rows hide the tick (correct), but the thread shows one grey tick « Envoyé » on every message of mine, including messages the other member had read. Nothing leaks: no « Lu », no event crosses the Block. Either hide the thread ticks when `read.other` is null, or change AC 11 | `shots/L9-blocked-A-1280.png`; `live-qa.json` `L9-block-hides-read` |
| D3 | Note (UX, for the next round) | 1280×900 split view | a roomy thread | header, footer line and bottom nav leave the pane about 400 px for messages. Faycal's new request (remove the header and footer on app screens) should fix this; to be re-checked in the next live round | `shots/R-L5c-reorder-1280.png` |

## 6. D1 probe output (`scripts/probe-open.mjs`, A on AB)

```
normal 390          500ms … 7000ms  gap=861  lastBottom=1186  composerBottom=1388  vh=900  clearImgs=2  tw=true
normal 1280         500ms … 7000ms  gap=692  (pane)  composerBottom=701
media-blocked 390   500ms … 7000ms  gap=861  clearImgs=0
media-blocked 1280  500ms … 7000ms  gap=692  clearImgs=0
```

Not covered here: a real phone, Safari, real 3G timing, a real hidden tab (the hidden state was emulated by overriding `document.visibilityState` and firing `visibilitychange`), and screen readers. No product code was changed.

## Files

Committed: this file, `e2e-fullstack.txt`, `e2e-webonly.txt`, `live-qa.json`, `retest.json`. Kept on the Mac only: `shots/` (gitignored) and `scripts/` (`setup.mjs`, `live.mjs`, `retest.mjs`, `probe-open.mjs`). Session cookies and passwords stayed outside the repo.
