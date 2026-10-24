# Stories 5.3 and 5.4 (Chat Photo, Voice note) QA report

Verdict: **FAIL** (2026-10-24, local app only: web dev server on port 3100 with `/v1` mocked, API tests in-memory; branch `factory/chat-media`, commit 78a18b8; QA agent Claude Sonnet 5.5). Several gates are also BLOCKED in this container (see "Not tested"); they must run on Fay's Mac or CI after the finding below is fixed.

Cloud settings used: `PLAYWRIGHT_CHROMIUM_EXECUTABLE=/opt/pw-browsers/chromium`; `E2E_ALLOW_ERRORS` for `tailwind is not defined`, cdn.tailwindcss.com, Google Fonts and proxy errors. Because the Tailwind CDN is blocked, every screenshot is unstyled: styled UI fidelity (G4) and contrast checks are NOT done here.

## Gate summary

| Gate | Result | Evidence |
| --- | --- | --- |
| G1 Static | PASS with notes | lint 0 errors (warnings only, none in the story's files); typecheck and build clean; no new dependency (package files unchanged vs da82726), so the 5 audit findings (4 high, 1 critical) pre-exist; no secrets or debug leftovers in the diff |
| G2 Automated | FAIL (test gap, F1) | unit: 663 passed, 1 failed (`photo-rules.test.ts`, no Chromium at its hard-coded paths; environmental, not this story); chat-media e2e 17 passed, 1 skipped (by design), `--repeat-each=3` 51 passed, 0 flakes; mutation checks below |
| G3 Functional | PASS on what the mocked-API browser can show | matrix below; real API only through in-memory API tests |
| G4 UI fidelity | BLOCKED (styled) / PASS (layout) | no horizontal scroll at 360, 390, 768, 1024, 1280, 1440 in thread, recording and voice-ready states; styling needs the CDN |
| G5 UX | PASS with minors | states and copy checked in screenshots |
| G6 Accessibility | PASS (axe) / partial manual | axe WCAG 2.0 to 2.2 A/AA: zero violations at all 6 widths in 3 states (`axe-and-targets.json`); keyboard check partial |
| G7 Non-functional | partial: BLOCKED for Lighthouse, real-API security, ZAP | media-access 500 handled; no console errors |
| G8 Regression | PASS | full e2e: 30 failures at HEAD and the same 30 at parent da82726 (invite-inbox 3, profile-edit-flow 16, staff-review 6, staff-shell 5); none in chat, report-block, blocked-list, app-shell |

## Verification matrix

| ID | Check | Expected | Actual | Result | Evidence |
| --- | --- | --- | --- | --- | --- |
| M1 | AC 5.3-1 received Photo shows without waiting for AI | clear image shown at once, blur first, no hold copy | shown; no hold or transcript copy | PASS | chat-media.spec (re-run x3), thread-*.png |
| M2 | Unauthorized viewers never get originals | stranger 404, no session 401, token bound to caller, original never served | covered by `chat-media.test.ts`; stranger and tampered cases pass | PASS | unit run |
| M3 | Media route refuses a message of ANOTHER conversation | 404 | code is correct (my probe test passed), but no committed test asserts it | FAIL (test gap) | F1 |
| M4 | AC 5.3-1 / 5.4-1 Premium does not increment `message_quota` | n/a | no quota exists; owned by Story 5.11 seam | NOT TESTABLE (deferred per spec) | spec lines 31, 58 |
| M5 | AC 5.3-2 / 5.4-2 cap refusal: `MESSAGE_CAP_EXCEEDED`, nothing stored or held | 429 and nothing written | seam test passes; mutation M-a below proves it protects the AC; UI keeps the panel and shows the message | PASS (seam only) | unit, e2e |
| M6 | AC 5.3-3 sign for chat_photo does not wait on applyModeration | no wait | chat_photo has `moderation_state null`; unit tests assert delivered before scan, enqueue failure does not change the answer | PASS | unit |
| M7 | AC 5.3-4 no GIF picker | none | no GIF text or button in thread | PASS | e2e |
| M8 | AC 5.4-1 Voice note plays on tap only, no transcript | nothing fetched before tap | confirmed by mediaCalls assertion; play button at least 44x44 | PASS | e2e |
| M9 | AC 5.4-3 Premium inactive still sends, counts against cap | not blocked | unit test passes | PASS | unit |
| M10 | AC 5.4-4 mos/dyu delivered before scan | delivered first | passes; `language` stored and passed to scan | PASS | unit, e2e |
| M11 | Enqueue happens after persist | job enqueued once | mutation M-b removes enqueue: 5 tests fail | PASS | mutation |
| M12 | Double submit (Enter twice on "Envoyer la photo") | one POST | 1 post | PASS | g3-notes.json |
| M13 | Non-image file (text/plain) | refusal in French | « Ce format de photo n'est pas pris en charge. Choisissez une photo JPEG ou PNG. » | PASS | txt-pick-360.png |
| M14 | A `.gif` pick | not sent as a GIF | accepted into the preview because the browser re-encodes it to JPEG (a real GIF, first frame); a corrupt GIF also reached the preview | PASS with note (F3) | gif-pick-360.png |
| M15 | Media access route returns 500 | handled state | « Photo indisponible pour le moment. », page intact | PASS | access-500-360.png, g7-notes.json |
| M16 | Recorder: record, stop, language select, cancel | works with fake mic | works at all widths | PASS | recording-*.png, voice-ready-*.png |
| M17 | Touch targets of the new controls | at least 44x44 | camera, microphone, play: OK. Smaller (all in earlier stories' UI): Retour link 172x17, Signaler / Bloquer 141x17, "Signaler ce message" 24x17, textarea 36 high, Envoyer 89x33 | PASS for story controls; F2 | axe-and-targets.json |
| M18 | Lite mode: blur only until tap | no clear download | passes | PASS | e2e |
| M19 | Real browser against a real API (slow network, session expiry, real EXIF removal) | n/a | not possible here | BLOCKED | see below |

Mutation spot-checks (implementation broken, then restored; `git status` clean afterwards):
- M-a cap check disabled (`if (!cap.allowed)` to `if (false)`): 2 tests fail. Protects AC 5.3-2 / 5.4-2.
- M-b `enqueueAfterPersist` removed: 5 tests fail. Protects the enqueue step of AC 5.3-1 / 5.4-1.
- M-c cross-conversation check removed in `mediaAccess` (`row.conversation_id !== found.row.id`): **0 tests fail**. See F1.

## Findings

| # | Severity | Gate | Steps to reproduce | Expected | Actual | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| F1 | Major | G2 | In `apps/api/src/chat-messages.ts` `mediaAccess`, delete `row.conversation_id !== found.row.id ||`; run `npx vitest run --config vitest.unit.config.ts apps/api/src/chat-media.test.ts` | a test fails: a member must not obtain a signed URL for a Chat Photo or Voice note of a conversation they are not in (IDOR) | all 16 tests pass. The "unauthorized viewers" test only uses a freshly generated random id, never a real media message of another conversation. With the mutation, my probe (brother requests sister's photo message of a second conversation) returned 200 instead of 404. Product code is correct today; the guard is unprotected. Fix: add that assertion to the AC 5.3-1 test (probe: send a photo in a second conversation, request it through the first, expect 404). | mutation run, probe run |
| F2 | Minor | G5 | open `/discussions/<id>` | touch targets at least 44x44 | existing thread controls are smaller (list in M17); not introduced by this story but sit next to the new media bubbles ("Signaler ce message" on media is 24x17) | axe-and-targets.json |
| F3 | Minor | G3 | choose a corrupt `.gif` in the Photo picker | refusal | reaches the preview and "Envoyer la photo"; the server would refuse a bad re-encode but this was not seen against a real API | gif-pick-360.png |
| F4 | Minor | G1 | `npm audit --omit=dev --audit-level=high` | none | 5 vulnerabilities (4 high, 1 critical) exist; dependencies are unchanged vs da82726, so not caused by this story | audit output |
| F5 | Info | G2 | `npm run test:unit` | all pass | `photo-rules.test.ts` fails only because no Chromium exists at its hard-coded paths (`/usr/bin/chromium` etc.); environmental | unit run |

Open known issues (`e2e/known-issues.ts`) were not changed by this story. The extra `E2E_ALLOW_ERRORS` patterns above are only local, cloud-network workarounds.

## Not tested and why

- Integration suites and `npm run migration-check` (migration 0025: FK and check constraint): need Docker, not available. Must run on Fay's Mac or CI.
- Real-stack checks: real EXIF/GPS removal and server blur, signed-URL TTL, object storage, direct API calls with no session, another user's session or lower role, SQL and script payloads server-side. Covered only through the in-memory API tests that the developer wrote and that I ran.
- Lighthouse and Web Vitals, 3G throttling, session expiry, WebKit: not run (styles blocked, no real stack).
- OWASP ZAP: not configured here.
- Styled fidelity against Stitch screen 21 (colours, spacing, icons, contrast) and 200% zoom: need the Tailwind CDN; screenshots here are unstyled. To be done on the owner's Mac.
- Full keyboard-only walk through the recorder: only Enter on the send button was verified.
- Story 5.11 behaviour (real cap, `message_quota` for Premium): deferred by the spec.

Evidence: `code/docs/qa-handoffs/5-3-5-4-chat-media-evidence/` (screenshots, `axe-and-targets.json`, `g3-notes.json`, `g7-notes.json`, and my gate spec as `qa-chat-media.spec.ts.txt`).
