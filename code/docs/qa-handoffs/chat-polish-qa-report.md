# chat-polish QA report

Verdict: **PASS** (2026-10-24, local app: Next dev server on port 3100 with mocked `/v1` and a fake Socket.IO, API tests on the in-memory store, migration on local PostgreSQL 16; commit 9957e53 on `factory/chat-polish`; QA agent Claude Sonnet 5.5). Docker-only suites and the styled real-stack checks are listed as pending below, not as failures.

## Gate summary

| Gate | Result | Evidence |
| --- | --- | --- |
| G1 Static | PASS. Lint exit 0 (warnings only, none new in this story's files), typecheck exit 0, `migration-check` "Everything's fine". `npm audit` finds 5 (4 high, 1 critical), all pre-existing: `package.json` and `package-lock.json` are unchanged between 3b87e68 and 9957e53. No secrets or debug leftovers seen in the diff. | `chat-polish-evidence/lint.txt`, `typecheck.txt`, `migcheck.txt`, `audit.txt` |
| G2 Automated | PASS. Unit 676 passed, 1 failed (`photo-rules`, known baseline). Touched-area e2e 120 passed, 18 skipped, 0 failed. New spec x3 (`--repeat-each=3`): 51 passed, 0 flakes. Full e2e 196 passed, 40 skipped, 30 failed = exactly the known baseline (invite-inbox 3, profile-edit-flow 16, staff-review 6, staff-shell 5). Mutation spot-checks below. | `unit.txt`, `e2e-touched.txt`, `e2e-repeat3.txt`, `e2e-full.txt` |
| G3 Functional | PASS (mocked API, real browser). 11 extra adversarial tests of mine all pass (spec copy in evidence). | `qa-chat-polish.spec.ts.txt`, files cited per row |
| G4 UI fidelity | PASS for structure and widths 360, 390, 640, 720, 768, 1024, 1280, 1440: no horizontal scroll, split from 768. Styled (Tailwind CDN) fidelity vs Stitch is PENDING (CDN unreachable here). | `list-*.png`, `thread-*.png`, `viewer-*.png` (gitignored) |
| G5 UX | PASS with minors. | rows below |
| G6 Accessibility | PASS. axe WCAG 2.0 to 2.2 A/AA: zero violations of any impact on list, thread (Photo, ticks, badges) and open viewer at 8 widths (24 scans). Keyboard-only viewer flow passes. | `axe-*.json`, `photo-focus-style.txt` |
| G7 Non-functional | PASS for what runs here. Security: see below. Performance: pending a styled real stack. | rows below |
| G8 Regression | PASS. Chat 5.1 to 5.4, report-block, blocked-list and app-shell e2e green on both projects; full suite equals baseline. | `e2e-touched.txt`, `e2e-full.txt` |

## Spec versus the product owner's request

Faithful. Mapping: "click a sent image, sender and receiver" = AC 1 to 3 (viewer for mine and theirs). "Scroll to the bottom on open" = AC 4, 5. "WhatsApp read marker" = AC 6 to 11. "List on the left on desktop and tablet, phone not" = AC 12, 15 (768 px). "Name, picture, last message, time, I read it or not, how many unread, did he read mine" = AC 13 (photo, pseudonym and age, preview, time, unread badge and bold name for theirs, ticks for mine). "Smooth and live" = AC 14, 15, 17. Three deliberate interpretations are flagged by the developer and are acceptable: no "two grey ticks" middle state (no device-delivery signal exists, and colour alone would not differ from "Lu", WCAG 1.4.1); "did I read his message" is shown as badge plus bold name, as WhatsApp and Telegram do; list photos stay blurred (Story 5.1 rule). One open product question remains for Fay (not a defect): should a future D36 setting turn read receipts off?

## Verification matrix

| ID | Check | Expected | Actual | Result | Evidence |
| --- | --- | --- | --- | --- | --- |
| AC1 | Click a revealed Photo, mine and theirs | Full-screen dialog named "Photo de X" / "Votre photo", uncropped | Dev e2e green both projects; my sweep opened it at 8 widths, no overflow | Pass | `viewer-768.png`, e2e |
| AC2 | Close by button, Escape, backdrop; focus trapped and returned; page behind locked | As spec | Dev e2e; mine: Space opens, Tab and Shift+Tab stay on close, Enter closes, focus back on the Photo, visible focus ring (solid 2px), reopen works | Pass | `photo-focus-style.txt` |
| AC3 | Lite mode and no extra request | Blurred until "Afficher la photo"; no request on open; no original | Dev e2e (media calls unchanged on open); mutation W1 (Lite guard removed) fails unit tests | Pass | e2e |
| AC4 | Opens at the latest message with composer in view | In viewport without scrolling | Dev e2e 24 extra messages both projects; my screenshots at 390 and 1280 show composer in view | Pass | `thread-390.png` |
| AC5 | Follow only at bottom; "Nouveaux messages"; older page keeps position | As spec | Dev e2e. Older-page anchoring (code-only in dev tests) tested by me with 70 older messages: reading position shifts 34 px at 390 and 34 px at 1280 (anchored) | Pass | `older-anchor-390.txt`, `older-anchor-1280.txt` |
| AC6 | One tick "Envoyé" vs two "Lu", not by colour alone | Shape, sr text, tooltip | Dev e2e; my states json `sent` then `read` | Pass | `ticks-states.json` |
| AC7 | POST read only when visible and at the bottom, with latest id | One POST | Dev e2e one POST, none while scrolled up. Mine: with `visibilityState` forced hidden, 0 POSTs in 1.5 s; after returning visible, exactly one POST with the newest id, no repeat | Pass (see F1) | e2e |
| AC8 | Ticks go "Lu" live; no refetch | Live | Dev e2e; mine: events for another conversation, for my own account id, null and partial payloads change nothing; a valid event from the other member flips the ticks | Pass | `ticks-states.json` |
| AC9 | `unread`, `last_message.read`, `read{me,other}`, forward-only, stored server-side | As spec | API suite 22/22; migration applied from zero on PostgreSQL 16 by me with `drizzle-kit migrate`, table, PK and 3 FKs present | Pass | `chat-messages.test.ts`, psql `\d` run |
| AC10 | Read route refusals | 401, 403 mahram, 404 stranger or bad or unknown conversation, 400 bad `message_id`, 404 foreign message, nothing stored | API test AC 13; mutations M5, M6, M10 each make it fail | Pass | below |
| AC11 | Block hides read state both ways, no event across a Block | `null`, no event | API test AC 14; mutations M2, M3, M4, M9 each make it fail; UI: a list with `read:null` shows no tick and no "Lu" and 150 unread caps at "99+" | Pass | `list-blocked-99plus.png` |
| AC12 | Split view from 768 px, placeholder, `aria-current`; phone separate | As spec | Dev e2e both layouts; my sweep: split from 768 up, phone layouts at 360, 390, 640, 720 | Pass | `list-*.png`, `thread-*.png` |
| AC13 | Row content, badge, 99+, bold name, ticks | As spec | Dev e2e; row text reads "3 messages non lus" and "Accéder à la conversation avec Al-Hassan_BF, 3 messages non lus" | Pass | `malformed-url.txt` (row dump) |
| AC14 | Live list, one request per burst | 1 request | Dev e2e (3 events, 1 GET); my 3G run shows one list GET at load | Pass | `fast3g.txt` |
| AC15 | Switch without reload, history, deep link, drafts | As spec | Dev e2e; malformed id `/discussions/not-a-uuid` lands on `/discussions` with the list | Pass | `malformed-url.txt` |
| AC16 | French, 44 x 44, WCAG 2.2 AA, no overflow at six widths | As spec | axe zero violations (24 scans); no overflow at 8 widths; targets: row link 358x72, viewer close 44x44, send 89x44; the Photo button is 260x195 | Pass | `touch-targets.txt`, `axe-*.json` |
| AC17 | NFR-005 | One list request, thread within 4 s, viewer adds none | Dev Fast 3G e2e green (mobile). My real throttled run opened in 9.9 s, but that is the unminified Next dev server over throttled HTTP; not representative, so styled production timing is PENDING. Page HTML is 100 KB raw, 25.7 KB gzip for both routes. | Pass (dev e2e), timing PENDING | `fast3g.txt`, `html-size.txt` |
| X1 | Hostile content | Pseudonym `<img onerror>`, `<script>`, SQL text, 900 unbroken chars, Arabic | `window.__xss` stays undefined, no overflow at 360 and 1280, text shown verbatim | Pass | `hostile-360.png`, `hostile-1280.png` |
| X2 | Read POST answers 500 or 403 repeatedly | Handled, thread usable | Thread stays usable, a send works, 4 attempts in the run, no loop | Pass | `read-failure-attempts.txt` |
| X3 | Slow network, reload mid-flow, back button | Handled | Dev e2e back/back/forward and reload at the latest message pass | Pass | e2e |

## Security and privacy (G7)

- Authorization on `POST /v1/conversations/:id/read`: live session first, then the viewer gate (staff, mahram 403), then the participant check (404 identical for a stranger, a malformed id and an unknown id, so no existence leak), then `message_id` validation, then the "message belongs to this conversation" check. Nothing is stored on any refusal (API test checks `reads.rows` is empty).
- Realtime: `conversation.read` carries ids only. It goes only to `account:<reader>` and `account:<other>`, and only to the reader while a Block holds (stranger socket receives nothing, tested).
- Read state is returned only inside the participant-checked thread head and the caller's own list; `other` is `null` under a Block; no BillingPort call (`billingCalls` asserted 0).
- Mutation spot-checks (restored after each, working tree clean): M2 recipients ignore the Block, M3 list `read` ignores the Block, M4 thread head `other` ignores the Block, M9 reader's own sync removed, M5 foreign-conversation message accepted, M6 `message_id` UUID check removed, M7 forward-only guard removed, M8 unread counts own messages, M10 viewer gate removed: each makes at least one API test fail. Web: Lite guard removed (W1), the `nearBottom` guard (W2) and the hidden-tab guard (W5) removed, the Block-null tick guard (W4) removed: unit tests fail for each; see F1.
- A QA mutation of the web `onRead` conversation check was caught by my spoof test (the developer's tests do not cover it).

## Existing tests the developer changed

All justified, none weakened: (1) `HOLD_COPY` in `chat.spec.ts` and `chat-media.spec.ts` no longer bans "Lu" and "non lu", which is the requested feature; the hold, scan, moderation and transcript bans are intact. (2) "Retour aux discussions" asserted on the phone project only; on desktop the test now asserts the two list rows exist (and the 44 px test measures the row link): correct because the back link is hidden when the list sits beside the thread, and the link itself is still asserted on mobile. (3) `discussions-page.test.ts` string assertions follow the moved code for the same behaviour; `non lu` left the dropped list, `done_all` stays banned. (4) `toEqual` fixtures gained the new `unread` / `read` fields. A diff of the three files shows no assertion removed without a replacement.

## Findings

| # | Severity | Gate | Steps | Expected | Actual | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| F1 | Minor | G2 | Mutate `markSeen` in `discussions-page.ts`: remove the `nearBottom()` check (scrolled up), or the `visibilityState` check, or make the Block tick appear with `read:null`; run `e2e/chat-polish.spec.ts` | An e2e fails | The e2e passes; only the unit tests fail, because they assert source strings, not behaviour. AC 7 hidden-tab and "scrolled up then return to the tab" and the Block-null tick are not driven in a browser by the developer's e2e. My spec `qa-chat-polish.spec.ts.txt` drives the hidden tab, the foreign-event spoof and the `read:null` row, and fails under the matching mutations. | `qa-chat-polish.spec.ts.txt` |
| F2 | Minor | G7 | Unblock after the other member read while blocked | (design choice) | Read pointers keep moving during a Block, so their earlier reads show as "Lu" again after unblock. Consistent with Story 8.6 hiding only while the Block holds; flag to the product owner with the read-receipts setting question. | API test AC 14 last assertion |
| F3 | Minor | G5 | Read POST fails | Retry policy | A failed read POST is retried only on the next trigger (scroll to bottom, tab focus, new message), up to 4 attempts in my run; no loop, no user message, which is fine. Noted for completeness. | `read-failure-attempts.txt` |
| F4 | Minor | G1 | `npm audit --omit=dev` | No new high or critical | 5 vulnerabilities (4 high, 1 critical), unchanged from the parent commit (no dependency change in the diff); not caused by this story. | `audit.txt` |

No blocker, critical or major finding.

## Not tested and why (pending, not failures)

- Integration suites (`npm run test:integration`, Testcontainers, compose, restore drill, `operator-config.migrate.test.ts` on Postgres 17): no Docker here. Partial substitute: I applied every migration including 0026 to an empty local PostgreSQL 16 database with `drizzle-kit migrate` and inspected the table; the developer ran the migrate test on 16. It must run on a machine with Docker.
- Real stack with two members, live Socket.IO across two browsers, and the Postgres `unreadCounts` query under real data: needs the owner's Mac (`docker compose`). Socket authorization was verified on the in-memory store with real Socket.IO clients in the API tests.
- Styled visual fidelity against Stitch 20 and 21 (Tailwind CDN and fonts unreachable here): screenshots here are layout-only. Check on the Mac at 390, 768, 1280: split-view proportions, badge and tick colours (dark gold ticks #7D5F27 against the row), viewer backdrop.
- Lighthouse and real Fast 3G production-build timing; WebKit or iPad Safari; real devices (the 100vh and bottom-nav offset on phones).
- WCAG contrast on the final styled colours (axe here ran without the CDN stylesheet).
- Multi-tab "my other tabs update" on a real stack (covered by the API socket test only).

---

# Round 2 (retest of c4274f8)

Verdict: **FAIL** (2026-10-24, cloud container, branch `factory/chat-polish`, commit c4274f8; no staging, no Docker, styled checks on the owner's Mac pending). Two major findings (R2-1 UX, R2-2 test does not protect an AC); D1 and D2 are truly fixed, D3 is fixed on desktop and tablet but not on small phones.

## Spec fidelity to the owner's requests

| Request | Spec | Verdict |
| --- | --- | --- |
| (a) Option B, read-receipts switch | AC 18 to 20: `role="switch"`, GET/PUT `/v1/chat/settings`, reciprocal, server-enforced | Faithful |
| (a) No header/footer on app screens, only on the landing page | AC 24: removed on member pages and signed-in steps; **kept on signed-out pages** (sign-in, sign-up identity and pseudonym, password reset) and on the staff console | Partly. The owner said "only on the landing page". Keeping them on signed-out pages is a reading of "actual app screens", flagged in the handoff. Minor, owner to confirm. |
| (b) Page never scrolls, banner and composer pinned, all sizes | AC 23 | Faithful on paper; see R2-1 for small phones |
| (c) Badges: pending invitations, threads with unread messages, always current on every screen | AC 21, 22 | Faithful |

## Gate summary

| Gate | Result | Evidence |
| --- | --- | --- |
| G1 Static | PASS | lint exit 0 (17 pre-existing warnings), typecheck exit 0, migration-check "Everything's fine", `npm audit` 5 vulns (4 high, 1 critical) unchanged (no dependency in the diff; F4). No secrets or debug leftovers seen in the diff. |
| G2 Tests | PASS with R2-2 | Unit `1 failed (photo-rules, baseline) / 682 passed / 12 skipped`. Full e2e `30 failed / 241 passed / 43 skipped`: exactly the baseline (invite-inbox 3, profile-edit-flow 16, staff-review 6, staff-shell 5); I re-ran staff-shell and invite-inbox on a worktree of the parent commit ad83986 and the same 4 desktop tests fail there. `--repeat-each=3` on chat-polish, gates, app, app-shell: 276 passed, 36 skipped, 0 flaky. API `chat-messages.test.ts` 27 passed. Mutations below. |
| G3 Functional | PASS with R2-1 | Real-CSS probes below |
| G4 UI fidelity | Partly BLOCKED | Layout checked with Tailwind 4 compiled from the page's own classes (not the CDN, not the Stitch config colours); Stitch visual compare pending on the Mac |
| G5 UX | FAIL (R2-1) | |
| G6 A11y | PASS for this story's screens | axe (WCAG 2.2 AA) with real CSS: thread and list at 390 and 1280, settings at 390 and 1280: 0 serious or critical from this story. Pre-existing R2-4 below. |
| G7 Non-functional | PASS (API), perf pending | Authz and privacy by API tests and mutations; Lighthouse and Fast 3G pending |
| G8 Regression | PASS | Full e2e at baseline, chat, report-block, blocked-list, app-shell green |

## D1 to D3 (real stylesheet, late injection)

Method: a throwaway spec (`chat-polish-evidence/qa-round2-probes.spec.ts.txt`, not committed as a test) learns the page's class names, compiles real Tailwind 4 CSS for them, and serves it as the "CDN script" that appends the stylesheet after 0, 2000 and 6000 ms, with 40 long messages, 6 viewports, desktop and mobile projects.

- **D1 fixed.** At 390x800, 768x1024, 1024x768, 1280x900, 1440x900 and 1280x560, after the late CSS lands: `scrollTop` gap to the end 0, last bubble inside the box, composer inside the viewport, `document.scrollHeight == innerHeight`, no page errors. A real mouse wheel to the top keeps the header and composer in place, `scrollY` 0.
- **D2 fixed.** e2e `Mac QA D2` passes; the Block guard mutation (below) makes it fail on both projects.
- **D3 fixed at 1280x900** (message box 549 px, was about 400), tablet 592 px at 768x1024, 353 px at 1024x768.
- **D3 not fixed on small phones: R2-1.**

## Mutation spot-checks (each restored, `git status` clean)

API (`chat-messages.test.ts`, each makes 1 test fail): read event ignores receipts off; Discussions badge ignores Block; Invitations badge ignores Block; `chat.receipts` crosses a Block; list ignores the partner's setting; thread head ignores the setting; members-only gate on badges (my mutation was a crude one, the 403 tests for mahram and moderator exist). Web e2e: member page gets the site header (6 tests fail); badge not hidden at 0 (1 fails); no "99+" (1 fails); shell stops listening to `invite.changed` (1 fails). **Survived: shell stops listening to `message.delivered` (0 fail), see R2-2.**

## Authorization and privacy

- `GET/PUT /v1/chat/settings` and `GET /v1/me/badges`: 401 without session, 403 for mahram and moderator, `no-store`; PUT accepts booleans only (400 and nothing stored otherwise); the value is per session account, no id in the URL, so no IDOR surface. Responses carry only counts or a boolean.
- Events carry ids only; `chat.receipts` never goes to strangers or across a Block; `conversation.read` is not sent when either side has receipts off; pointers stay in the server (head `read.other: null`).
- Accepted observation: a chat partner sees "Lu" stop appearing and gets a refetch when I toggle, so they can infer when I changed it. Same as WhatsApp.
- Not tested live: CSRF/origin on the PUT (same cookie model as the other mutations), cross-browser live sockets (no real stack here).

## Review of changed existing tests

The unit tests in `app-shell.test.tsx`, `app-shell-browser.test.ts`, `blocked-list-page.test.ts`, `invite-inbox-page.test.ts`, `report-block-page.test.ts` and e2e `app-shell.spec.ts` changed from "exactly one header and footer" to "none on app screens, one on signed-out pages, a legal line on signed-in steps". They reflect the new requirement and stay strict (counts of 0 or 1 asserted, per page kind, plus the privacy link in Paramètres at 44 px). The nav-clearance check moved from the footer to the end of `<main>`, which is the right equivalent. The nav label assertion became a prefix-style regex so the badge words can follow the label (slightly looser, accepted). `discussions-page.test.ts` string assertions follow the code. The scroll helper in e2e tests became a real mouse wheel, which is stricter. No weakening found.

## Findings

| # | Severity | Gate | Steps | Expected | Actual | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| R2-1 | **Major** | G5 / G3 | Open a thread with real CSS at 360x600, 360x640, 360x667, 360x720 and 390x800; read the height of `#thread-scroll` | Owner's complaint D3 (small message area) fixed on every screen size; a few messages visible | Message box is **44 px at 360x600**, 84 px at 360x640, 111 px at 360x667, 164 px at 360x720, 244 px at 390x800 (a third of the screen). The back link, a 3-line header, a 3-row composer and the rule note take the rest. The compact mode starts only below 560 px, so a screen of 540 px high gets 204 px but 600 px gets 44 px (backwards). 360 px and low-end phones are the audience (NFR-005). The page does not scroll and nothing is hidden, but a member sees about one bubble. | `chat-polish-evidence/r2-d1-2000-360.png` (gitignored), probe spec |
| R2-2 | **Major** | G2 | Remove `socket.on('message.delivered', soon)` from `NAV_BADGE_SCRIPT` in `app-shell.ts`; run `chat-polish-app.spec.ts` | A test fails: the owner asked that a new message always reflects in the nav on any screen | All 7 pass. The "AC 21 / 22" test fires three events together (two `message.delivered`, one `conversation.read`) and counts one request, so any one listener satisfies it. My one-event-at-a-time probe (each of `message.delivered`, `invite.changed`, `conversation.read`) passes on the current code and fails under the mutation, so the behaviour works but is unprotected. | probe spec, mutation output |
| R2-3 | Minor | Spec | AC 24 vs the owner's "header and footer only on the landing page" | | Header and footer remain on sign-in, sign-up identity and pseudonym, password reset (and the staff header). Owner to confirm. | `app-shell.spec.ts` PUBLIC_PAGES |
| R2-4 | Minor (pre-existing, not this story) | G6 | Real CSS, Paramètres: axe | | `#lite-mode-toggle` and `#pin-toggle` (Stitch buttons with `aria-checked`, no name) give 2 critical `button-name` violations. Untouched by this diff; the e2e does not run axe on that page. Worth a ticket. | probe run |
| R2-5 | Minor | G5 | Same as R2-1 | | On phones the nav hides while the composer has focus (by design); iOS keyboard behaviour is untested. | handoff |

Carried over unchanged: F2 (product question), F4 (audit, pre-existing).

## Not tested and why (pending, not failures)

- Integration suites (`npm run test:integration`): no Docker here; integration pending CI. The dev's local Postgres 16 run of the migrate test (0027) was not repeated by me.
- Styled checks on the owner's Mac: the real Tailwind CDN and Stitch colours, fonts, contrast, split view proportions and badge look at 390, 768 and 1280; iOS Safari keyboard and `visualViewport`; real phone 100dvh; Lighthouse and Fast 3G.
- Live two-browser realtime on a real API and Postgres `unreadCounts` under data.

---

# Round 3 (retest of 0a6beb7)

Verdict: **PASS** (2026-10-24, cloud container, branch `factory/chat-polish`, commit 0a6beb7; QA agent Claude Sonnet 5.5; no staging, no Docker; the styled real-CDN check runs on the owner's Mac in parallel). No blocker, critical or major finding. Two minors (one new test gap, one observation). R2-3 is the pending owner question, not a finding.

## Round 2 findings and Mac minors

| Finding | Result | Evidence |
| --- | --- | --- |
| R2-1 (major): small-phone message area | **Fixed.** Real compiled Tailwind (`e2e/real-css.ts`, CSS landing 1.5 s late), 40 long messages, my own probe. Message box over screen height: 360x600 **435 px (72 %)**, 360x640 **475 (74 %)**, 360x667 **502 (75 %)**, 360x720 **555 (77 %)**, 390x800 **635 (79 %)**, plus 320x568 403 (71 %), 412x732 567 (77 %). Round 2 gave 44, 84, 111, 164, 244. With a simulated keyboard (viewport minus 300 px, composer focused): 61 %, 66 %, 68 %, 72 %, 77 %, 57 % (320x568), 73 %; latest message in view at every size. With the keyboard and a 7-line draft (composer capped at 132 px) the box drops to 32 to 59 % (24 % at 320x568): by design, same as a messaging app; see R3-2. Page never scrolls (`scrollHeight == innerHeight`), no horizontal scroll, composer bottom inside the viewport, at every size. | `r3-probe-out.txt`, `qa-round3-probes.spec.ts.txt` |
| R2-2 (major): single-event badge test gap | **Fixed.** Three one-event tests on Paramètres. My mutations: `socket.on('message.delivered')` removed fails that test on both projects; `socket.on('conversation.read')` removed fails on both. (`invite.changed` was already covered.) | mutation table below |
| R2-4 (minor): unnamed Lite and PIN switches | **Fixed.** `role="switch"` plus names; `/settings` now whole-page axe in `app-shell.spec.ts`, which passes both projects. | `r3-e2e-full-summary.txt` |
| Mac 1: stale switch across windows | **Fixed.** Two pages in one context (my probe): `chat.receipts` event updates the stale window live; a bare `focus` reloads it; a stale click sends `{read_receipts: !shown}`; a GET held in flight and overtaken by a click does not repaint the old value; Space keeps focus and `aria-busy` clears; a failed PUT reverts and shows the error. Passes on both projects. Mutations: DOM listener removed (dev test fails), focus listener removed (fails). | probe, mutation table |
| Mac 2: flaky switch test | **Fixed.** No `disabled` during save; full suite and `--repeat-each=3` on the touched specs: 351 passed, 75 skipped, 0 failed, 0 flaky. | `r3-repeat3.txt` |
| Mac 3: phone message area | Same as R2-1. | above |
| R2-3 | Pending owner question, not a finding. | |
| R2-5 (iOS keyboard untested) | Still Mac and real-device only; my keyboard model resizes the layout viewport, which is what Android Chrome does. `visualViewport` on iOS is not simulated. | |

## New phone sub-screen (AC 25), regression probes

- **No bottom nav on a phone thread; back always reachable.** `#thread-back` is the first tab stop (Tab from the page start lands on it, solid 2 px focus ring), 44x44, topmost at its centre (`elementFromPoint`), inside the viewport at all seven sizes, also with the keyboard up. It does not overlap the avatar, name, city, verified badge or the report icon. With a 47-character pseudonym the name is cut with an ellipsis, the report icon stays inside the viewport (right edge 356 of 360). In the load-error state (messages GET 500) and the unknown-thread state, the back link is 44x44 and topmost, and the page shows the message plus a second « Retour aux discussions » button. Enter on back goes to the list, where the nav shows; browser Back returns to the thread without the nav, and the unsent draft « Brouillon à garder » is kept; sending resets the composer to one line (44 px).
- **Names for assistive tech.** Back, « Signaler / Bloquer », Photo, Voice note and « Envoyer » keep their accessible names although only icons show; the stage « Étape : discussion » stays in the DOM (visually hidden). Tab order from the field: Photo, then Voice back, then the header. axe (WCAG 2.2 AA) with real CSS on the phone thread, and again with a 900-character draft and counter: zero violations; no horizontal overflow.
- **Split view unchanged.** Crossing 767 to 768 to 767 live (matchMedia change): `chat-sub` off at 768 with the list beside the thread, nav back (96 px body padding), back link hidden, no page scroll; on again at 767. At 768, 1024 and 1280 the class is off, nav present, list visible, page still. The phone list at 360 shows the nav. The full-suite width sweeps and `chat-polish.spec.ts` split tests pass.
- **Not covered here.** iOS `visualViewport` keyboard behaviour, safe-area inset on a notched phone, styled Stitch colours of the new slim header and icon buttons, and tap feel: owner's Mac or a real device.

## Gates (round 3)

| Gate | Result | Evidence |
| --- | --- | --- |
| G1 Static | PASS. Lint exit 0 (17 warnings, pre-existing), typecheck exit 0, migration-check « Everything's fine » (no schema change), `npm audit --omit=dev`: 5 (4 high, 1 critical), unchanged, no dependency change in the diff. No secrets or debug leftovers in the diff. | `r3-lint.txt`, `r3-typecheck.txt`, `r3-migcheck.txt`, `r3-audit.txt` |
| G2 Tests | PASS. Unit: 1 failed (`photo-rules`, baseline) / 684 passed / 12 skipped. Full e2e both projects: **253 passed, 45 skipped, 30 failed** = exactly the baseline (invite-inbox 3, profile-edit-flow 16, staff-review 6, staff-shell 5). Integration (Docker) pending CI. Repeat x3: 0 flakes. | `r3-unit.txt`, `r3-e2e-full-summary.txt`, `r3-repeat3.txt` |
| G3 Functional | PASS (mocked API, real browser): probes above | `qa-round3-probes.spec.ts.txt` |
| G4 UI | PASS for layout at 320 to 412 wide phone sizes and 767/768/1024/1280; styled fidelity vs Stitch pending on the Mac | |
| G5 UX | PASS; no dead end on the phone thread (back reachable in every state). Minor R3-2. | |
| G6 A11y | PASS: axe zero violations on the phone thread (also with grown composer), `/settings` whole page now clean; keyboard path and names checked | probe |
| G7 Non-functional | PASS for what runs here; no API or security code changed this round (diff is web and tests only); perf pending the Mac | |
| G8 Regression | PASS: chat, chat-media, report-block, blocked-list, app-shell, invite-compose, smoke all green; full suite = baseline | |

## Mutation spot-checks (each restored; `git status` clean)

| Mutation | Result |
| --- | --- |
| `chat-sub` class never set | 6 fail (AC 25 x2, AC 23 sweep, AC 23/25 keyboard, `app-shell.spec` /discussions/:id x2) |
| `socket.on('message.delivered')` removed | the R2-2 test fails, both projects |
| `socket.on('conversation.read')` removed | the R2-2 test fails, both projects |
| Paramètres `focus` listener removed | the Mac-1 test fails, both projects |
| `asked !== version` guard (overtaken read) removed | **dev tests all pass**; my probe fails: see R3-1 |

## Review of changed tests

No weakening. `chat-polish-app.spec.ts`: the old « composer ends above the bottom nav » check is kept from 768 px and replaced on phones by « no nav, composer inside the viewport »; the old keyboard test became the AC 23/25 test that still asserts the composer, header and last message stay in view; the AC 22 test now goes back to the list first (same socket, same assertion). `app-shell.spec.ts`: the thread path is a `subScreen` (phone: nav hidden and back visible; nav checks from 1024), `/settings` moved to whole-page axe (stricter). `discussions-page.test.ts`: two class-name string assertions, words unchanged. New unit and e2e tests added for AC 25 and the settings switches.

## Findings

| # | Severity | Gate | Steps | Expected | Actual | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| R3-1 | Minor | G2 | Remove `asked !== version ||` from `read-receipts-setting.ts` `load()`; run `chat-polish-app.spec.ts` | A test fails: a read overtaken by a click must not repaint the old value (stated in the handoff as protected) | All dev tests pass. My two-window probe (GET held in flight, click, release) fails under the mutation and passes on the current code, so the behaviour is right but unprotected. | `qa-round3-probes.spec.ts.txt` (last test), mutation row |
| R3-2 | Minor (observation) | G5 | 360x600 or 320x568 with the keyboard up and a draft of five or more lines | | The message area shrinks to 32 % (24 % at 320x568) while the composer holds its 132 px cap. The latest message stays in view and everything stays reachable. Same trade-off as other messaging apps; noted only. | `r3-probe-out.txt` |

Carried over unchanged: F2 (product question), F4 and the `npm audit` count (pre-existing), R2-3 (owner question), R2-5 (iOS keyboard, Mac).

## Not tested and why (pending, not failures)

- Integration suites (`npm run test:integration`): no Docker here; pending CI. No schema or API change this round.
- Styled real-CDN look (Stitch colours, fonts, contrast of the new slim header, icon buttons and ticks), iOS Safari `visualViewport` and safe-area, real phone 100dvh, Lighthouse and Fast 3G: owner's Mac, running in parallel.
- Live two-browser realtime on a real API: Mac.
