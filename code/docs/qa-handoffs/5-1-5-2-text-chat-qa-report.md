# 5-1-5-2-text-chat QA report

Verdict: **BLOCKED** (2026-10-23, branch `factory/text-chat` at 29667db, rebuilt local compose stack `ankanu-local` on http://localhost:4012 with migration 0023 applied and `CHAT_KEY` set). QA model: Claude Sonnet 5.5.

No blocker, critical or major finding. Every check that can run in this container passed. The verdict is BLOCKED only because the styled checks cannot run here (Tailwind CDN, Google Fonts, reCAPTCHA unreachable): visual fidelity to Stitch 20 and 21, touch-target sizes, colour contrast, 200% zoom, real signup, a real screen reader, real 3G. These need Faycal's Mac (see "Not tested"). Findings below are Minor.

Evidence folder: `5-1-5-2-text-chat-evidence/` (logs `g*.txt`, `g6-axe.json`, `shots/`, `scripts/` with the seed SQL and the Playwright and Socket.IO scripts used).

How the real stack was driven: reCAPTCHA blocks real signup, so I seeded 2 paired members (brother, sister, accepted invite, conversation), a second unrelated pair, a staff account (session kind staff), a mahram, and an unlisted member directly in Postgres (`scripts/seed*.sql`) with live sessions, then used the real API, the real web pages and real Socket.IO through the web proxy on 4012.

## Gate summary

| Gate | Result | Evidence |
|---|---|---|
| G1 Static: lint, typecheck, migration-check | PASS (lint exit 0, only the 3 pre-existing warnings; typecheck exit 0; "Everything's fine") | g1-lint.txt, g1-typecheck.txt, g1-migration.txt |
| G1 Dependency audit | PASS for this story: 1 critical (`next` 16.0.0 to 16.4.0) is pre-existing on main and outside the story; `socket.io` 4.8.4 has no advisory. No new high/critical. Needs a separate `next@16.4.3` bump. | g1-audit.txt |
| G1 Secrets / debug leftovers | PASS: `CHAT_KEY` is read from env only; no key in the diff; api log has no message text (see M-16) | g7-db-at-rest.txt |
| G2 Unit | 608 passed, 3 failed. The 3 are Chrome/size tests unrelated to chat (`photo-rules`, `ank-148-fix`, `v2-responsive`), the same 3 the handoff lists as failing on main. I did not re-run them on main myself. | g2-unit.txt |
| G2 Chat unit (`chat-messages.test.ts` 18, `discussions-page.test.ts`) | PASS 27/27 | g2-unit-chat.txt |
| G2 Integration | 32 passed, 2 skipped, 1 file failed: `compose.test.ts` (Docker build of the repo images, proxy TLS), as in the handoff. The migrated-Postgres chat test passes. | g2-integration.txt |
| G2 New e2e x3 (`chat.spec.ts --repeat-each=3`) | PASS 69 passed, 9 skipped (project-specific), 0 flaky | g2-e2e-chat-x3.txt |
| G2 Mutation spot-check | PASS, 4 of 4 caught (see below) | g2-mutations.txt |
| G3 Functional on the real stack | PASS | g3-*.txt |
| G4 UI fidelity | BLOCKED (unstyled only; layout/overflow checked, Stitch comparison needs Tailwind) | shots/ |
| G5 UX | PASS with Minor notes | g3-browser-edges.txt, shots/ |
| G6 Accessibility | PASS for DOM, keyboard, live regions; axe has 1 serious on the list that depends on icon-font loading (F1); contrast and 44 px targets BLOCKED | g6-axe.json, g4-g5-g6-browser.txt |
| G7 Performance | PASS on a throttled profile (see M-31..M-33); Lighthouse N/A (member pages need a session) | g3-browser-edges.txt |
| G7 Reliability | PASS: handled error states for list 500, thread 500, send network failure, send 400, 409, 401 | g3-browser-edges.txt, g4-g5-g6-browser.txt |
| G7 Security | PASS | g3-api-flow.txt, g3-realtime.txt, g7-*.txt |
| G8 Regression (full e2e) | 123 passed, 31 skipped, 36 failed, all in `profile-edit-flow`, `staff-review`, `staff-shell` (Tailwind/size/contrast checks, none touch chat) plus 5 `app-shell` failures caused by Google Fonts `ERR_NETWORK_CHANGED` console errors. Re-run of `app-shell` + `invite-inbox` with fonts allowed: 43 passed, 3 failed (the same 3 `invite-inbox` 44 px target checks the handoff lists as pre-existing). | g8-e2e-full.txt, g8-e2e-appshell-invite.txt |

### Mutation spot-check (product file restored after each; `git diff` on `apps/` is empty)

| Mutation in `chat-messages.ts` | Result |
|---|---|
| Remove the `enqueueAfterPersist` call | 2 tests fail (AC 5.2-1, AC 5.2-3) |
| Drop the `message.delivered` emit | 1 test fails (AC 5.2-1 realtime) |
| `TEXT_MAX` 2000 to 3000 | 1 test fails (validation) |
| Skip the closed-conversation check | 1 test fails |

## Verification matrix

| ID | Check | Expected | Actual | Result | Evidence |
|---|---|---|---|---|---|
| M-01 | AC 5.1-1: open Discussions list/thread, no hold badge, no scan wording | none | List and thread text contain no verification, scan, moderation, "Lu", "non lu" copy. Only hit of my regex was my own test message "scan store down". | PASS | g3-browser-main.txt |
| M-02 | Thread open at most 4 s (NFR-005) | at most 4 s | 1750 ms content visible on CDP 400 ms RTT / 50 KB/s, CDN calls blocked | PASS | g3-browser-edges.txt |
| M-03 | AC 5.1-2: typing seen by the other within 2 s | at most 2 s | "QA_Frere écrit…" visible on sister after 630 ms; gone after about 4 s; socket relay in tens of ms | PASS | g3-browser-main.txt, g3-realtime.txt |
| M-04 | Typing relay only to the other member, at most 1 per second | yes | Sister got 1 event from 6 rapid emits; brother 0 (not echoed); outsider 0; bad payloads (`abc`, `{}`, `null`) answered nothing | PASS | g3-realtime.txt |
| M-05 | AC 5.1-3: only state `delivered`; no pending/held event | yes | DB rows all `delivered`; only events seen are `message.delivered` and `conversation.typing` | PASS | g7-db-at-rest.txt, g3-realtime.txt |
| M-06 | AC 5.2-1: send, recipient reads without waiting for AI | yes | POST 201 `state:delivered`; sister read it via GET and live in browser without reload | PASS | g3-api-flow.txt, g3-browser-main.txt |
| M-07 | Enqueue after persist | yes | 5 jobs for 5 messages with `outcome` null; mutation M1 proves the test; messages without a job: 0 (when the store is up) | PASS | g7-db-at-rest.txt, g2-mutations.txt |
| M-08 | AC 5.2-2 cap (story 5.11) | seam only | Out of scope per product owner; seam covered by a unit test | N/A | scope decision |
| M-09 | AC 5.2-3: AI/scan down, ack still returned | 201, no block | With `moderation_job` renamed (enqueue throws): 201 in 26 ms, message readable by the other, api log `chat scan_enqueue_failed message=<id>` (ids only) | PASS | g3-ai-down.txt |
| M-10 | AC 5.2-4: ack at most 2 s on 3G | at most 2 s | Real stack 26 ms; throttled browser send to bubble 845 ms | PASS | g3-ai-down.txt, g3-browser-edges.txt |
| M-11 | Ciphertext at rest | no plaintext | Body is `{v, alg:A256GCM, kid, iv, ct}`; `like '%salāmu%'` false; plaintext absent from api log | PASS | g7-db-at-rest.txt |
| M-12 | Events ids only | yes | `message.delivered` carries `conversation_id, message_id, sender_id` only | PASS | g3-realtime.txt |
| M-13 | Authorization: no session, staff, mahram, unlisted member, other pair's session on list/thread/messages/send | 401/403/404 | No session 401; staff 403 `staff_session`; mahram 401; unlisted 403 `viewer_not_listable`; other pair 404 "Cette discussion n'existe pas." on GET thread, GET messages, POST | PASS | g3-api-flow.txt |
| M-14 | Socket handshake | refuse | Foreign origin refused; no session `UNAUTHENTICATED`; staff and unlisted `FORBIDDEN`; mahram `UNAUTHENTICATED`; `join` of another account room had no effect, other pair's send reached nobody else | PASS | g3-realtime.txt |
| M-15 | Cross-origin POST (CSRF) | refuse | 403 "Origine refusée." | PASS | g7-security-headers.txt |
| M-16 | Validation | server side | Empty/spaces/missing/non-string 400 "Écrivez un message."; 2000 ASCII and 2000 astral emoji accepted; 2001 400 "Message trop long (2000 caractères au plus)."; `kind` photo/absent 400 "kind : valeur non reconnue."; bad `limit`/`before`/both cursors 400; non-UUID and unknown ids 404 | PASS | g3-api-flow.txt |
| M-17 | Injection | stored and shown as text | `<script>alert(1)</script>` and `'; drop table message;--` stored, returned and rendered as literal text, no execution | PASS | g3-api-flow.txt, g3-browser-main.txt |
| M-18 | Accents, Arabic, emoji | round trip | "As-salāmu ʿalaykum — السلام عليكم 🌙" intact | PASS | g3-browser-main.txt |
| M-19 | Double submit | one message | `dblclick` on Envoyer created exactly one message | PASS | g3-browser-main.txt |
| M-20 | Closed (paused/ended) and unavailable other | 409 French messages | 409 "Cette discussion est fermée." (`conversation_closed`), 409 "Ce profil n'est plus disponible." (`other_unavailable`); thread shows the unavailable message and disables composer and button | PASS | g3-browser-edges.txt |
| M-21 | Composer rules | per handoff | Button disabled on spaces; Ctrl+Enter sends; counter "1850/2000" and "2001/2000"; 2001 gives alert, text kept; status "Message envoyé" announced in `role=status aria-live=polite`; focus stays in the box | PASS | g4-g5-g6-browser.txt |
| M-22 | Network failure on send | text kept, alert | "Envoi impossible. Vérifiez votre connexion et réessayez.", text kept | PASS | g4-g5-g6-browser.txt |
| M-23 | API 500 on list / thread | handled state | List: error + "Réessayer"; thread: error + "Réessayer", not blank | PASS | g4-g5-g6-browser.txt, g3-browser-edges.txt |
| M-24 | Another pair's id in the URL, bad id, signed out | not found / redirect | "Cette discussion n'existe pas." + back link; `/discussions/abc` goes to `/discussions`; signed out goes to `/auth` | PASS | g4-g5-g6-browser.txt |
| M-25 | Persistence | re-read | Reload shows all messages; list shows last message "« As-salāmu ʿalaykum, test navigateur »", time, "Registre des échanges : 1 fil actif" | PASS | g3-browser-main.txt |
| M-26 | French copy: list header, row, golden rule, labels | matches spec | « Échanges concertés & bienséance », « Discussions Ta'aruf », « Identité vérifiée », « Accéder à la conversation », « Étape : discussion », composer label, golden rule with corrected spelling, footers: all present | PASS | g3-browser-main.txt |
| M-27 | No horizontal overflow at 360, 390, 768, 1024, 1280, 1440 (list and thread, including a 2000 character unbroken line) | none | scrollWidth is at most innerWidth in all 12 cases | PASS (unstyled) | g4-g5-g6-browser.txt, shots/list-*.png thread-*.png |
| M-28 | axe WCAG 2.0 to 2.2 A/AA, serious or critical | 0 | Thread: 0 at all 6 widths. List: 1 serious `label-content-name-mismatch` at all widths (F1) | see F1 | g6-axe.json |
| M-29 | Keyboard-only | whole flow | Tab reaches textarea, footer, nav, header, back link; focus ring visible (2 px solid); type then Ctrl+Enter sends and focus stays in the box | PASS | g4-g5-g6-browser.txt |
| M-30 | Live regions | announced | Messages `role=log aria-live=polite`; typing and status `role=status aria-live=polite` | PASS | g3-browser-main.txt |
| M-31 | List open on throttled 3G | at most 4 s | 1734 ms; list payload 1 KB | PASS | g3-browser-edges.txt |
| M-32 | Touch targets at least 44 px | 44 px | Back link 17 px, textarea 36 px, Envoyer 21 px measured **unstyled** (no Tailwind classes apply); markup carries `min-h-[44px]` | BLOCKED | g4-g5-g6-browser.txt |
| M-33 | Colour contrast, fidelity to Stitch 20/21, 200% zoom | per design | Cannot render styles here | BLOCKED | n/a |
| M-34 | Browser storage / URLs | no message data | Page uses `localStorage` only for an existing timestamp (session-timing); URL carries only the conversation id; page sets `cache-control: no-store`, API too | PASS | g7-security-headers.txt |
| M-35 | Missing `CHAT_KEY` gives 503, nothing stored | yes | Covered by unit test "without CHAT_KEY a send is 503…"; I did not restart the live api without the key | PASS (automated only) | g2-unit-chat.txt |
| M-36 | Pagination (more than 30 messages, "Messages précédents") | ordered | Covered by unit and Postgres integration tests; API `limit` and cursors checked live; not clicked in a browser with more than 30 messages | PASS (partial) | g2-integration.txt, g3-api-flow.txt |

## Findings

| # | Severity | Gate | Steps to reproduce | Expected | Actual | Evidence |
|---|---|---|---|---|---|---|
| F1 | Minor (environment-dependent, retest on the Mac) | G6 | Open `/discussions` with a conversation, run axe 2.2 AA with the icon font not loaded | 0 serious | `label-content-name-mismatch`: link `aria-label="Accéder à la conversation avec X"` while the visible content includes the Material icon ligature text `arrow_forward`. Clearing the icon text removes the violation. The developer's e2e passes axe on the same markup, so with the font loaded it probably passes; I could not confirm here. | g6-axe.json, g4-g5-g6-browser.txt |
| F2 | Minor | G3 | Send 2000 emoji, read the list preview | Preview cut at a character boundary | The 120-unit cut can split a surrogate pair: the preview ends with a lone surrogate before the ellipsis (renders as a replacement character) | g3-api-flow.txt (preview check) |
| F3 | Minor | G3/G5 | Thread of a paused or ended conversation | Composer disabled or a notice | Composer stays enabled; the member learns "Cette discussion est fermée." only after pressing send (text kept). `GET /conversations/:id` does not expose the closed state. | g3-browser-edges.txt, shots/thread-paused-send.png |
| F4 | Minor | G5 | Session expires while the thread is open, press send | A way to sign in again | Alert "Authentification requise." with the text kept, no link or redirect to `/auth` | g3-browser-edges.txt, shots/thread-session-expired.png |
| F5 | Minor | G3/G5 | Deactivate the other member, open `/discussions` | Handoff says « Profil indisponible » | Row still shows the pseudonym, last message and « Accéder à la conversation »; « Profil indisponible » is only used when the pseudonym is empty. Thread and send are correct (409, composer disabled). | g3-browser-edges.txt |
| F6 | Minor | G3 | `POST` a malformed JSON body | French generic error | Returns 400 with the parser's English text "Expected property name or '}'…". Likely a pre-existing global filter. | g3-api-flow.txt |
| F7 | Minor (design note for Epic 8) | G7 | Scan store down, send twice | n/a | The message is delivered and logged, but no `moderation_job` is created and nothing retries: 7 messages vs 5 jobs. Epic 8 needs a reconciliation sweep for messages without a job. | g3-ai-down.txt |
| F8 | Process note (not a product defect) | G2 | Run `npm run test:integration` while the local compose stack is up | Isolation | `compose.test.ts` removed the `code/pg-data` bind mount of the running `ankanu-local` stack, which wiped its Postgres data. I recovered it (migrate and reseed). The integration suite should not run next to the live local stack. | g2-integration.txt |

Known tolerated e2e issues: `E2E_ALLOW_ERRORS` for the Tailwind CDN and Google Fonts was set for this environment only; `e2e/known-issues.ts` was not changed.

## Not tested and why (needs Faycal's Mac)

1. Styled UI: comparison with Stitch 20 and 21 at all six widths, colours, spacing, icons, avatar blur, bubble styling, day separators. Tailwind CDN and Google Fonts cannot load here.
2. Touch targets at least 44 px, colour contrast, focus ring appearance, 200% zoom, and axe on the list with the Material Symbols font loaded (F1).
3. Real signup and reCAPTCHA, and the real photo blur thumbnail in the list (seeded accounts have no photo).
4. Real screen reader (TalkBack, VoiceOver): AC 5.1-1 "says nothing about scan" was checked on rendered text and accessible names only.
5. Real 3G or low-end Android device timings; first-party payload only was throttled, since the Tailwind CDN and fonts could not be fetched (the handoff's site-wide render-blocking CDN risk stands).
6. WebKit or a mobile Safari profile (not configured here).
7. Browser check of "Messages précédents" with more than 30 messages, and a live restart of the api without `CHAT_KEY` (both covered by automated tests only).
8. Re-run of the 3 unit and 30 e2e failures on `main` to prove they are pre-existing; I compared them with the handoff's list and their causes (Chrome size, Tailwind, contrast) but did not re-run main.

## What Faycal needs to run on the Mac

The handoff's manual walk (section 3) with two browsers: rows 4 to 7 (typing, send, no hold wording), row 1 of this list (visual compare), and axe on `/discussions` with real fonts.

## Live QA on Faycal's Mac (2026-10-23, branch `factory/text-chat` at d99654a)

Stack: `ankanu-local` rebuilt with `up -d --build --wait`, all 6 services healthy; `drizzle-kit migrate` applied (24 migrations, `0023_message` included); `CHAT_KEY` and `CHAT_KID=local-chat-1` added to `~/.ankanu/api.env` (mode 600) and confirmed set inside the api container. `curl /` OK, `/v1/health` `{"status":"ok"}`. `npm run test:integration` was not run (F8). Normal network: Tailwind CDN, Google Fonts and the Material Symbols font all loaded (checked with `document.fonts.check` and `window.tailwind` on every page measured).

Evidence: `5-1-5-2-text-chat-evidence/mac/` (`e2e-local.txt`, `e2e-fullstack.txt`, `live-qa.json`, `shots/`, `scripts/live-qa.mjs`, `scripts/footer-and-targets.mjs`).

Accounts: two disposable members created through the real API (`/v1/accounts` with `recaptcha_token: test-ok`, email link and phone code from the api log, real ID and liveness uploads, real JPEG main photo), approved through the real staff API by a disposable moderator (`staff-cli create`, password change, TOTP), then a real invite from the brother and a real accept by the sister.

### E2E

| Run | Result |
|---|---|
| `npm run test:e2e` (web-only) | 166 passed, 1 failed, 31 skipped. `chat.spec.ts`: 30 passed, 1 failed, 3 skipped. |
| `E2E_BASE_URL=http://localhost:4012 npm run test:e2e` | 44 passed, 0 failed, 154 skipped. `chat.spec.ts`: 34 skipped (all its tests are stub-based and skip on the full stack). |

The one failure is a test defect (D1 below), not a product defect.

### Mac-only checks

| Check | Result | Detail |
|---|---|---|
| Visual match, `/discussions` vs Stitch 20, 6 widths | PASS (one Minor, D2) | Eyebrow, serif title, card, verified chip, gold-rule quote, clock and time, navy CTA with arrow, footer note and register line all match. Not shown, by scope: tabs « Toutes / Non lues / Sans réponse », « Lu » and « non lu », « Wali notifié ». `shots/list-{360..1440}.png`, `list-empty-390.png` |
| Visual match, thread vs Stitch 21, 6 widths | PASS | Back link, header card with blurred round avatar, name, verified seal, city pin, « AUJOURD'HUI » separator, beige incoming and navy outgoing bubbles with time, composer label, placeholder, Envoyer with arrow, golden rule. « Étape : discussion » chip in place of the out-of-scope blur-lift and report buttons; no wali banner, voice note, quota or camera/mic (out of scope). `shots/thread-{360..1440}.png` |
| No horizontal scroll | PASS | `scrollWidth <= innerWidth` on both screens at all 6 widths |
| 44 px touch targets | PASS | Every visible link, button and textarea is at least 44 px high and wide at all 6 widths (textarea 52 px, Envoyer 44 px, back link 175x44, row CTA 201x44, bottom nav 81x44 and up). The full-page shots show the fixed bottom nav over the footer; scrolled to the bottom in a real viewport nothing is covered (`*-scrolled-bottom.png`) |
| axe WCAG 2.0 to 2.2 AA, icon font loaded (F1 retest) | PASS | 0 serious, 0 critical on both screens at all 6 widths, colour-contrast included. F1 closed. `live-qa.json` |
| Typing indicator between two browsers | PASS | « Bilal819895 écrit… » shown to the sister 392 ms after the brother started typing; cleared 3.9 s after he stopped. `shots/live-typing-sister-390.png` |
| Live delivery between two browsers | PASS | Sender bubble 135 ms after Envoyer, « Message envoyé » announced; recipient bubble without reload after 160 ms; reply back in 120 ms. No « vérification », « modération », « scan », « Lu », « non lu » on either page. `shots/live-brother-390.png`, `live-sister-390.png` |
| Real blurred thumbnail | PASS | List avatar is the live main photo's blur derivative (32x32 natural, shown 46x46, loaded, `alt=""`); thread header shows the same blur. `shots/list-thumbnail-zoom.png` |
| Console errors | PASS | 0 across all pages and both contexts |

### Defects

| # | Severity | Steps | Expected | Actual | Evidence |
|---|---|---|---|---|---|
| D1 | Minor (test defect) | `npm run test:e2e` on a network that reaches the CDN, without `E2E_ALLOW_ERRORS` | Throttled 3G test passes | `[mobile] chat.spec.ts:477` fails with console errors « tailwind is not defined » x2: the test answers the Tailwind CDN with an empty script, so the page's inline `tailwind.config = …` throws. It passed in the cloud only because `E2E_ALLOW_ERRORS` was set. Fix: stub with `window.tailwind = { config: {} }` instead of an empty body, or allow that one error in this test. | `mac/e2e-local.txt` |
| D2 | Minor (visual) | Open `/discussions` at 360 or 390 | « · » stays with the name or is dropped when the city wraps | The city wraps to its own line and starts with a lone « · » (« · Ouagadougou »), the same pattern fixed on the invite inbox in cb8ed9c | `shots/list-390.png`, `list-360.png` |

Verdict for the styled checks: PASS. With the cloud report's checks, stories 5.1 and 5.2 have no blocker, critical or major finding open.
