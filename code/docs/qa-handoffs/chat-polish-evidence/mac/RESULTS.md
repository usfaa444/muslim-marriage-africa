# Live QA on Faycal's Mac: story chat-polish (full-screen Photo, open at the latest message, read ticks, split view)

**Round 4 (de48b62): PASS, see Round 4 at the end.** **Round 3 (0a6beb7): FAIL on one item only.** Paramètres still fails axe colour contrast with the real theme, so 4 new e2e tests are red. Everything Faycal asked for passes. See Round 3 at the end. **Round 2 (c4274f8): PASS.** Round 1 below is kept as it was.

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


---

# Round 2 (c4274f8, 2026-10-24, UTC 13:45–14:05)

Faycal's changes after round 1: the « Confirmations de lecture » setting (option B), no site header or footer on member screens, the thread pinned (only the messages scroll), and the bottom-nav badges. Also the fixes for D1, D2 and D3. Same stack, same accounts (A, B, C, D) and the same conversations as round 1.

**Verdict: PASS.** D1 (major), D2 and D3 are fixed. Every requested behaviour works live. There are three minor findings (R2-1 to R2-3). The accessibility findings in older screens (R2-4) are out of this story.

## R2.1 Deploy and e2e

| Step | Result |
|---|---|
| `checkout` + `pull` | `c4274f8` (includes round 1 `ad83986`) |
| `npm ci`, `up -d --build --wait` (temporary `DOCKER_CONFIG`) | OK, all 6 services healthy |
| `drizzle-kit migrate` | applied `0027_read_receipt_setting` |
| `/`, `/v1/health` | 200, `{"status":"ok"}` |
| Full-stack e2e (`E2E_BASE_URL=http://localhost:4012`) | **44 passed, 0 failed**, 270 skipped. `r2-e2e-fullstack.txt` |
| Web-only e2e (real CDN and fonts) | **269 passed, 2 failed**, 43 skipped. `r2-e2e-webonly.txt`. Both failures are `chat-polish-app.spec.ts:148` (AC 18), mobile and desktop. Alone it passes **6/6** (`--repeat-each=3`). See R2-2 |
| Round 1's failing test `chat-polish.spec.ts:99`, `--repeat-each=5`, both projects | **10 passed**. `r2-d1-e2e-repeat5.txt` |

## R2.2 Live checks (real accounts, real Socket.IO, real CDN)

Scripts (on the Mac, not committed): `scripts/r2.mjs`, `scripts/r2-receipts-retest.mjs`, `scripts/axe-settings.mjs`. Data: `r2-live-d1-pin.json`, `r2-live-chrome-receipts.json`, `r2-receipts-retest.json`, `r2-badges.txt`, `r2-live-sweep.json`.

| # | Check | Actual | Result |
|---|---|---|---|
| R1 | D1: open AB (45+ messages) in a fresh browser, 6 widths × 5 | **30/30**: the last bubble is fully visible inside the message box, the composer and the name are visible, and `scrollY` is 0 | PASS |
| R2 | Pinned: 12 mouse-wheel scrolls up over the messages, then typing | at all 6 widths the page never scrolls (`scrollY` 0, document height = window height). The messages moved 3,500 to 4,500 px. The name, photo, « Signaler / Bloquer », textarea and « Envoyer » stay visible while scrolled up and while typing | PASS |
| R2k | Phone keyboard: composer focused, window cut to 360/390 × 380 | name, composer, « Envoyer » and the last message are visible; the bottom nav steps aside; the page does not scroll | PASS |
| R2p | Panels at 360 / 768 / 1280: Photo preview, recorder (synthetic mic), Voice note ready, viewer | « Envoyer la photo », « Arrêter », the timer, the language select and « Envoyer la note vocale » are all visible, with the name still on top and no page scroll; the viewer's × and the image fit | PASS |
| R3 | No site chrome on member screens, 390 and 1280: `/decouvrir`, `/discussions`, a thread, `/invitations`, `/profil`, `/settings`, `/settings/bloques`, `/signaler/<id>` | 0 header, 0 footer, bottom nav present, no horizontal scroll on all 16 | PASS |
| R3b | Public pages | `/auth`, `/signup/identity` and `/password-reset` keep the header and footer, with no nav. The landing `/` keeps its own header and footer (my selector missed the nested `<header>`, but the page has one). `/staff/connexion` keeps its header. « Confidentialité » in Paramètres → `/#legal`, 200 | PASS |
| R4 | B turns receipts off in Paramètres | PUT 200. A's open thread turned every « Lu » into « Envoyé » **live** (17 ms after the save, no reload). A's next message, read by B, stays « Envoyé ». B's own messages show « Envoyé » only. B's unread count still clears | PASS |
| R4b | B back on | A's last message turns « Lu » **65 ms** after the save, and B's own **1 ms** after; no reload. The reads made while off show up | PASS |
| R4c | A off, then on (reciprocal) | off: B's thread all « Envoyé » after 63 ms and A's after 3 ms; on: « Lu » again after 68 ms / 2 ms | PASS |
| R4x | A second Paramètres tab of B | not updated live; it shows the new value after a focus / visibility event. See R2-1 | Minor |
| R5 | D2: B blocks A | **0 ticks** on either side (A 0, B 0) and no tick on A's row. B turning receipts off and on during the Block changes nothing on A (0). After the unblock, 16 ticks come back | PASS |
| R6a | Discussions badge, A on Découvrir (390) | hidden at start. B sends → « 1 » after **323 ms**; C sends 2 → « 2 » after **324 ms**. Screen reader text « 1 discussion non lue » / « 2 discussions non lues », part of the nav link's name. 0 reloads | PASS |
| R6b | Read AB from the nav, then Profil | « 1 » (AC still unread) on the thread and on Profil | PASS |
| R6c | A blocks C | the badge hides (AC excluded) at the next focus; after unblocking it comes back to « 1 » | PASS |
| R6d | Read everything | badge hidden at 0 | PASS |
| R6e | Invitations badge: B on Profil (1280), D invites B | « 1 » after **325 ms**, « 1 invitation en attente », 0 reloads | PASS |
| R6f | B blocks D | hidden at the next focus; after unblocking, back to 1 | PASS |
| R6g | B declines (from the API, as from another tab) | the badge hides after **397 ms** (`invite.changed`) | PASS |
| R6h | 99+ cap | not driven live (it would need 100 conversations or invites); covered by e2e AC 21 / 22 | e2e only |

## R2.3 Styled sweep

A, 6 states × 6 widths (360 to 1440): Découvrir, Invitations, the Discussions list, the thread, the viewer, Paramètres. `r2-live-sweep.json`.

| Check | Chat screens (list, thread, viewer, Invitations): 24 states | Découvrir, Paramètres: 12 states |
|---|---|---|
| Horizontal scroll | none | none |
| Targets < 44 px | 0 | see R2-4 (older parts) |
| axe serious / critical | **0** | see R2-4 (none in the new receipts section) |
| Console errors on member screens | **0** | 0 |

The signed-out `/auth` and `/staff/connexion` log `requestStorageAccess: Permission denied` from the reCAPTCHA frame in headless Chromium. The `known-issues` spec already tolerates it; it does not come from a member screen.

**Compared with Stitch 20 and 21:** the same as in round 1, plus what changed. On phones the thread looks like screen 21 in a frame: the « Retour aux discussions » link, the header card, the message box, and the composer card at the bottom. The bottom nav replaces the site chrome, which Stitch also shows on its app screens. The nav badges are small navy-ringed white pills on the icons; Stitch 53 has no badge to compare with.

**Feel:** this time it feels like a messaging app. A conversation opens on the latest message every time (30/30). The name stays on top while you scroll back and while you type. Ticks change within 0.07 s of the other side opening the conversation or toggling the setting. Badges change within about 0.3 s on any screen. Rough edges: R2-3 on small phones, and R2-1.

## R2.4 Findings

| # | Severity | Steps | Expected | Actual | Evidence |
|---|---|---|---|---|---|
| R2-1 | Minor | B has Paramètres open in two tabs or windows and changes « Confirmations de lecture » in the first | the second follows | the second keeps the old position until it gets focus or a visibility change (then it corrects itself). With two windows side by side, a click on the stale one can save the opposite of what it shows (my headless run saved `false` from a tab that showed « on »). The open threads do follow live | `r2-receipts-retest.json` (`secondTabLiveMs: -1`, `secondTabAfterFocus: "false"`) |
| R2-2 | Minor (test) | full web-only suite | `chat-polish-app.spec.ts:148` stable | fails on both projects under full-suite load, and passes 6/6 alone. It presses Space right after the first click, while the switch is still `disabled` during the save, so the key is dropped. Make the test wait for `toBeEnabled()` before the second toggle. Optionally, the switch could stay focusable during a save (`aria-disabled`) | `r2-e2e-webonly.txt` |
| R2-3 | Minor (UX) | 360 / 390 phone, thread open | most of the screen for messages | the pinned header (back link, name, city, stage, « Signaler / Bloquer ») and composer (label, icons, textarea, full-width « Envoyer », « Règle d'or ») leave about **450 px of 900** for messages, and about **145 px** with the keyboard at 380 px high. Suggest a more compact phone layout: stage and report on the name line, the « Règle d'or » line only when the box is empty, « Envoyer » beside the textarea | `shots/r2-pin-scrolled-up-390.png`, `shots/r2-pin-keyboard-390.png` |
| R2-4 | Pre-existing, outside this story | axe on Paramètres and Découvrir | 0 serious / critical | Paramètres: **critical** `button-name` on the Lite switch `#lite-mode-toggle` and `#pin-toggle` (no accessible name); `color-contrast` on `text-[11px]` / `text-deep-navy/60` texts. Découvrir: `color-contrast` (3 nodes). Targets: the Découvrir save button is 38 px wide; on Paramètres, « Retour au profil » is 20 px high and « Télécharger » / « Supprimer » are 34 px high. The new « Confirmations de lecture » switch is clean (a 48 px hit area, named, described). These parts are unchanged since stories 2950d5e / 103b8ad. Worth a small follow-up | `scripts/axe-settings.mjs` output |

Fixed from round 1: **D1** (30/30 opens, e2e `:99` 10/10), **D2** (0 ticks under a Block), **D3** (at 1280 × 900 the thread now fills the space above the nav, with about 550 px for messages, against about 400 before).

Not covered: a real phone keyboard (iOS / Android), Safari, real 3G, and the 99+ cap live. No product code was changed.

Committed for round 2: this section, `r2-e2e-fullstack.txt`, `r2-e2e-webonly.txt`, `r2-d1-e2e-repeat5.txt`, `r2-live-d1-pin.json`, `r2-live-chrome-receipts.json`, `r2-receipts-retest.json`, `r2-badges.txt`, `r2-live-sweep.json`. On the Mac only: `shots/r2-*` and `scripts/`.


---

# Round 3 (0a6beb7, 2026-10-24, UTC 14:50–15:15)

Changes since round 2: the phone thread is a sub-screen (no nav, one-row header and composer), Paramètres follows « Confirmations de lecture » across windows, the switch stays focusable while saving, and the Lite and PIN switches are named. Same stack and accounts; no new migration.

**Verdict: FAIL, on one item only (R3-A).** Every behaviour Faycal asked for passes live, and round 2's minors 1 and 2 are fixed. But « Paramètres passes axe » (QA R2-4) is not true with the real Tailwind CDN theme. 7 older text elements on Paramètres fail colour contrast, so the 4 new whole-page axe tests fail in the web-only suite on this Mac. The fix is small: darken those texts.

## R3.1 Deploy and e2e

| Step | Result |
|---|---|
| `checkout` + `pull`, `npm ci`, `up -d --build --wait`, `migrate` | `0a6beb7`; 6 services healthy; no new migration; `/` 200, `/v1/health` ok |
| Full-stack e2e | **44 passed, 0 failed**, 284 skipped. `r3-e2e-fullstack.txt` |
| Web-only e2e (real CDN and fonts) | **279 passed, 4 failed**, 45 skipped. `r3-e2e-webonly.txt`. The 4 failures are `app-shell.spec.ts:78` « member page /settings » and `chat-polish-app.spec.ts:222` « QA R2-4: Paramètres passes axe as a whole page », both projects, all `color-contrast` (R3-A) |
| Round 2 flaky test `chat-polish-app.spec.ts:158` (AC 18) | **10/10** (`--repeat-each=5`, both projects; `r3-switch-test-repeat.txt`), and it passed inside the full suite on both projects |

## R3.2 Live checks

Scripts (on the Mac): `scripts/r3.mjs`, and `scripts/r2.mjs` for the regression (the invite now goes D → C, because D's invite to B was used up in round 2). Data: `r3-live.json`, `r3-regr-live-d1-pin-chrome-receipts-badges.json`.

**1. Phone thread sub-screen** (A on AB, real CDN):

| Size | Messages box | No nav | Header | Targets < 44 | axe | Composer | Keyboard (300 px less) | Back |
|---|---|---|---|---|---|---|---|---|
| 360 × 640 | **475 px = 74 %** | yes | one row (centres within 9 px): ←, photo, name + city, shield « Signaler / Bloquer » | 0 | 0 | 44 px, grows 66 → 88 → 110 → **132 px and caps**; the latest message stays in view while typing (68 %) | 340 px high: messages **136 px = 40 %**; name, back, composer and the latest message visible; page still | to `/discussions` with no reload; nav back with badge « 1 », row badge « 1 » |
| 390 × 800 | **635 px = 79 %** | yes | same | 0 | 0 | same; 74 % while typing | 500 px high: **296 px = 59 %**, everything visible | same |
| 360 × 600 | **435 px = 72 %** | yes | same | 0 | 0 | same; 66 % while typing | 300 px high: **96 px = 32 %**; name and composer visible, the latest bubble only partly | same |

Result: PASS (≥ 60 % at every size). With the keyboard up and a 5-line draft, a small phone keeps 1 or 2 bubbles visible; WhatsApp behaves much the same. See R3-B.

**Look and feel compared with WhatsApp:** close. One slim row on top, messages filling the screen, a pill composer with camera, microphone and a round send button that turns navy, and back to a list where the badges are. It reads as AnKanu (cream, navy and gold, the Newsreader name) and no longer as a web page around a chat. Rough edges, all cosmetic (R3-C): at 360 the placeholder is cut mid-word (« Rédigez votre message dans le… »), and the focused text box draws a square gold outline inside the rounded pill. Screenshots: `shots/r3-phone-thread-*.png`, `r3-phone-typing-*.png`, `r3-phone-keyboard-*.png`, `r3-phone-list-after-back-*.png`.

**2. Two Paramètres windows** (B, three windows):

| Check | Actual | Result |
|---|---|---|
| Toggle in window 1 | window 2 follows **live in 249 ms**, with no focus | PASS |
| Window 3 with Socket.IO blocked and no focus (truly stale: it still shows « on » while « off » is stored) | the click sent `{read_receipts:false}`, the value the stale switch offered. Stored `false`, and all three windows show `false`. It never saves the opposite of what it shows | PASS |
| Keyboard: Space, then Space again right away | during the save `aria-busy="true"`, not disabled, focus kept; the two presses gave on → off, both stored | PASS |

**4. Paramètres:** the switches are named « Mode Allégé (Basse consommation) », « Code secret PIN d'accès » and « Confirmations de lecture » (PASS). axe at 6 widths: **`color-contrast` serious, 7 nodes, at every width** (R3-A).

**5. Round 2 regression** (32 checks, all PASS):

| Check | Result |
|---|---|
| Open at the latest message, 6 widths × 5 | 30/30 |
| Pinned layout, 6 widths (12 wheel scrolls, typing) | the page never scrolls; name, photo, report, composer and send stay visible |
| Keyboard at 360 / 390 × 380 | name, composer, send and the latest message visible |
| Panels (Photo preview, recorder, Voice note ready, viewer) at 360 / 768 / 1280 | fit, with the name on top |
| No site header or footer on 8 member screens at 390 / 1280; « Confidentialité » in Paramètres (200) | PASS. The landing keeps its own header and footer (my selector misses its nested `<header>`, as in round 2); `/auth`, sign-up, password reset and the staff page keep theirs |
| Receipts: B off → A all « Envoyé » after 11 ms; B's second Paramètres tab synced after 1 ms; B on → « Lu » after 65 ms; A off / on reciprocal | PASS |
| Block: 0 ticks on both sides, nothing leaks when toggling during the Block; unblock brings back 16 | PASS |
| Badges on Découvrir / Profil: 1 → 2 in about 0.33–0.39 s with no reload, cleared on read and on decline (325 ms), blocked excluded, hidden at 0, screen-reader text | PASS |

Console: 0 errors on member screens. The 6 errors logged are reCAPTCHA's `requestStorageAccess` on the signed-out `/auth` and `/staff/connexion` (known, tolerated), plus my own blocked socket in window 3.

## R3.3 Findings

| # | Severity | Steps | Expected | Actual | Evidence |
|---|---|---|---|---|---|
| R3-A | **Major (gate)**, pre-existing contrast that this story now asserts | axe on `/settings` with the real Tailwind CDN theme, at any width | 0 serious (QA R2-4 « Paramètres passes axe as a whole page ») | `color-contrast` serious ×7. The « PRÉFÉRENCES » eyebrow `text-[11px]` soft gold `#C9A86C` on `#F7F1E3` (**2.0:1**); « Voir les formules » soft gold on `#FBF8F1` (**2.12:1**); 5 `text-deep-navy/60` descriptions (« Burkina Faso (Centre & Nord) », « Format standard textuel & vocal », the export and delete hints) at **4.33–4.38:1**. This makes 4 e2e tests red on the Mac; the cloud did not see it because its axe ran without the theme colours. Fix: the gold eyebrow and link → `#7D5F27` (the dark gold already used for « Lu »), and `text-deep-navy/60` → `/75` on Paramètres | `r3-e2e-webonly.txt`, `r3-live.json` `R3-4-settings-*` |
| R3-B | Minor (note) | 360 × 600 with the keyboard (300 px high) and a 5-line draft | the latest message readable | the message box is 96 px; the latest bubble is only partly visible. On 640 px and taller phones it is fine (136 px / 40 %, and 296 px / 59 % at 800). Acceptable; it could shrink the draft cap to 3 lines when the screen is under 400 px high | `shots/r3-phone-keyboard-360x340.png` |
| R3-C | Cosmetic | 360 px thread | a clean composer | the placeholder is cut mid-word; the focus ring is a square inside the rounded pill. Suggest a shorter phone placeholder (« Votre message… ») and a rounded or pill-level focus ring | `shots/r3-phone-thread-360x640.png`, `shots/r3-phone-typing-390x800.png` |

Fixed from round 2: R2-1 (stale second window), R2-2 (flaky switch test, 10/10), R2-3 (phone message area: 72–79 % instead of about 50 %), and the R2-4 unnamed switches (the R2-4 contrast part is still open as R3-A).

Committed for round 3: this section, `r3-e2e-fullstack.txt`, `r3-e2e-webonly.txt`, `r3-switch-test-repeat.txt`, `r3-live.json`, `r3-regr-live-d1-pin-chrome-receipts-badges.json`. On the Mac only: `shots/r3-*`, `scripts/`.


---

# Round 4 (de48b62, 2026-10-24, UTC 15:32–15:50)

A short check of the round 3 fixes: contrast on Paramètres, and the phone composer's placeholder and focus ring.

**Verdict: PASS.** No open findings for this story.

| Check | Result |
|---|---|
| Deploy: `pull`, `npm ci`, `up -d --build --wait`, `migrate` | `de48b62`; healthy; no new migration; `/` 200, `/v1/health` ok |
| Web-only e2e (real CDN and fonts), full run | **285 passed, 0 failed**, 45 skipped. `r4-e2e-webonly.txt`. No fake-microphone failures either |
| axe whole page `/settings` at 360 / 390 / 768 / 1024 / 1280 / 1440 | **0 violations of any impact** at every width; no horizontal scroll. The eyebrow and « Voir les formules » are now `#7D5F27` (the dark gold of the « Lu » ticks, about 5.6:1 on cream); the descriptions are navy at 70 % |
| Look compared with Stitch | it still reads as the Stitch palette. The darker gold is the deep-gold token already used for accents and ticks, and the descriptions are slightly darker grey. Nothing looks out of place (`shots/r4-settings-*.png`) |
| Phone composer 360 × 640 / 390 × 800 | placeholder « Votre message… » is 110 px wide in a 199 px / 229 px box, so it fits. On focus the textarea has no outline of its own; a 2 px ring is drawn on the composer pill (22 px radius) and follows its rounded shape (`shots/r4-composer-focus-*.png`) |
| Regression: open at the latest message, 6 widths × 5 | **30/30** |
| Regression: receipts in two windows | B off: A all « Envoyé » after 10 ms, B's other tab synced after 1 ms; on again: « Lu » after 65 ms; A off / on reciprocal; Block 0 ticks, unblock 16 |
| Regression: Discussions badge on Découvrir / Profil | 1 → 2 live in 0.39 s, clears on read, blocked excluded, hidden at 0 |
| Regression: Invitations badge | not re-run live. The disposable Brother has already invited both test Sisters, so a new invite is refused (403, by design); it passed live in rounds 2 and 3 and in e2e this round |

Data: `r4-live.json`, `r4-regr-live-d1-receipts-badges.json`. Scripts on the Mac: `scripts/r4.mjs`, `scripts/r2.mjs`.
