# staff-review-console QA report

model: Claude Sonnet 5.5 (claude-sonnet-5-5)

Verdict: **FAIL** (2026-10-22). One Major finding (F1, a stale decision gives the Moderator no message). The API, security, audit, concurrency and publishing rules all held. No Blocker or Critical was found.

- Build: branch `factory/staff-review-console`, commit `648dd58`, in worktree `/home/claude/ankanu-qa-review`.
- Environment: full local stack built from this commit with compose project `ankanu-qa-review`, images `qa-review-web:1` and `qa-review-api:1`, web on `localhost:4022`, Postgres 17, Redis, MinIO and the worker. Migrations 0000 to 0020 were applied from the host and the bucket was created with the app's own adapter.
- Sandbox stand-ins, none committed:
  - Scratch Dockerfiles that add the proxy CA.
  - A reCAPTCHA siteverify stub (`NODE_OPTIONS --require`).
  - A Tailwind v4 compiled stylesheet in place of the blocked CDN, plus empty font and reCAPTCHA scripts, served by a local TLS server mapped in `/etc/hosts` (restored).
  - `E2E_ALLOW_ERRORS` for favicon and Google fonts.
- Because of the Tailwind and font stand-ins, pixel fidelity to Stitch 41, 42 and 07 is approximate. Material icon ligatures render as text.
- Cleanup: stack removed with `down -v`, both images removed, scratch Dockerfiles, CA copy and Playwright config deleted, `/etc/hosts` restored, `pg-data` removed, `next-env.d.ts` restored. Other projects' containers were not touched.
- Evidence: `code/docs/qa-handoffs/staff-review-console-evidence/`. The driver scripts are in `scripts/`.

## Gate summary

| Gate | Result | Evidence |
| --- | --- | --- |
| G1 Static | PASS. Lint and typecheck are green (3 old warnings), migration-check is "Everything's fine", the diff scan found no secrets or debug leftovers, and the Docker build passed. `npm audit` shows 1 critical on `next` 16.0.0 to 16.4.0, but this commit changes no dependency, so it is not new. See F10. | `g1-static-audit-scan.txt`, `g1-npm-audit.txt` |
| G2 Tests | PASS. Mutation spot-check shows two survivors with the reasons below. No flakes in 96 repeated web-only runs. | `unit-run.txt`, `g2-*` |
| G3 Functional | PASS on API and browser except F1 to F4. | `a1` to `a9`, `b1` to `b4` |
| G4 UI fidelity | PARTIAL. No overflow at the 6 widths and the two-pane layout is correct, but the stand-in CSS limits the comparison to Stitch. | `shots/`, `b1-console-walk.txt` |
| G5 UX | FAIL. F1 is Major. | `b3-stale-member.txt`, `shots/stale-409-real.png` |
| G6 Accessibility | PASS on the story's screens. axe has 0 violations on the console, the Operator view and the case with forms. | `b1`, `b2`, `b6` |
| G7 Non-functional | PASS with minor findings. | `a2`, `a3`, `a7`, `b4`, `g7-logs-grep.txt` |
| G8 Regression | PASS for the story's area. The smoke and profile-edit failures are explained below. | `g2-e2e-*.log` |

### G2 test run details

- **Unit.** `Tests 1 failed | 476 passed | 12 skipped (489)`. The one failure is the known `photo-rules.test.ts` (Chromium path).
- **Integration.** `operator-config.migrate.test.ts` alone: 14 passed, including migration 0020 on an empty Postgres 17, parallel decide (one 200 and one 409) and single-use challenge. `compose.test.ts` was not run because it conflicts with a running stack and fails at `npm ci` anyway.
- **E2E on the stack.** 31 passed, 46 skipped (stub-cookie tests skip on a built image), 5 failed.
  - The full-stack "capture to publish" test passed (1.2 min). It covers a real member, the random pose with a fake camera, a Moderator with TOTP, refuse then retake, approve, unblur and publish, and an Operator seeing counts only.
  - The staff-shell first sign-in test passed in this run.
- **The 5 failures** are `smoke.spec.ts` on `/auth`, `/password-reset` and the `/` width test. They are axe `color-contrast` on icon text, `target-size` and `label-content-name-mismatch` on pre-existing public pages, plus 1068 > 1024 on `/`. These pages are not in this story's diff, and the stand-in cannot load the Material Symbols font, so icon names render as text. I judge them environmental. I did not re-run them on a baseline commit, so treat that as likely rather than proven.
- **Web-only e2e with `--repeat-each=3`.** `staff-review`, `staff-shell` and `profile-edit-flow`: 96 passed, 30 skipped, 24 failed. All 24 are the same 4 `profile-edit-flow` PIN tests (6 runs each) failing on axe contrast of the `lock` icon text, which is the stand-in artefact. `staff-review` and `staff-shell` passed on every repeat, so no flakes.

### Mutation spot-check

I broke the code, ran `staff-review.test.ts`, `profile-review.test.ts` and `id-liveness.test.ts`, and restored with `git checkout` (the worktree is clean).

| Mutation | Result |
| --- | --- |
| `moderatorGate` always passes | caught |
| Stale-decision check removed | caught |
| Publishing gate accepts any status except rejected | caught (3 tests) |
| Evidence audit action changed | caught |
| Suspected minor no longer holds the account | caught |
| Unblur reason minimum 10 to 1 | caught |
| Challenge expiry check removed in `liveChallenge` | survived, but it is an equivalent mutation: `save()` re-checks expiry in the same transaction. A live test (A1.14) confirms expired is refused. |
| Evidence limit 30 to 3000 | survived. The tests import the constant, so the number 30 is not pinned (F7). |
| Foreign challenge accepted in the memory consume | survived. The account scoping also sits in `store.challenge(accountId)`, so it is equivalent. Live test A1.8 confirms a foreign id is refused on Postgres. |

The 8 updated existing tests (5 selfie posts in `id-liveness.test.ts` now fetch a challenge first, 3 `profile-review.test.ts` groups now insert `granted` instead of `pending`) were **not weakened**. `profile-review.test.ts` gained assertions that a pending ID or selfie stays unpublished, and `v2-id-liveness.test.ts` gained coverage. Nothing was skipped.

## Verification matrix

Live API rows ran against the real stack (Postgres, MinIO). The numbering follows the evidence files.

| ID | Check | Expected | Actual | Result | Evidence |
| --- | --- | --- | --- | --- | --- |
| AC1.1 | Challenge signed out | 401 | 401 | PASS | `a1` |
| AC1.2 | Challenge before phone OTP | 403 `required: phone_otp` | 403 | PASS | `a1` |
| AC1.3 | Challenge shape and no-store | 201, id, pose, label, expiry, `no-store` | as expected | PASS | `a1` |
| AC1.4 | Pose randomness | all 6 poses over many draws | 60 draws gave all 6 (15, 10, 7, 9, 9, 10). The code uses `crypto.randomInt`. | PASS | `a1` |
| AC1.5 | Replaced challenge | 400 `VERIFICATION_RETAKE` | 400 | PASS | `a1` |
| AC1.6 | Missing, garbage or SQL-style `challenge_id` | 400 | 400 | PASS | `a1` |
| AC1.7 | Another member's challenge | 400, her own challenge not burned | 400, and her own upload was still 201 | PASS | `a1` |
| AC1.8 | Single use and replay | 201 once, then 400 | 201 then 400 | PASS | `a1` |
| AC1.9 | 5 parallel uses of one challenge | exactly one 201 | 201 and 4 x 400 | PASS | `a1` |
| AC1.10 | Expiry | 400 after expiry, TTL about 10 min | 400, TTL 599.99 s | PASS | `a1` |
| AC1.11 | Pose stored on the row, client `pose` ignored | server pose | server pose stored | PASS | `a1` |
| AC1.12 | Pose card with pictogram in the browser | visible | visible at 6 widths, no pay text | PASS | `shots/member-idlive-*` |
| AC2.1 | Queue content, order, SLA | one row per member, oldest first, "Hors délai" at 24 h | 9 rows, the backdated member first with "Hors délai", counts line correct | PASS | `b1` |
| AC2.2 | Premium before free | Premium first | not testable end to end: the billing port is `unavailable`, so everyone is free. Covered by unit tests only. | PARTIAL | `staff-review.test.ts` |
| AC2.3 | Two panes from 768 px, stacked below, badge, no member nav, no horizontal scroll | as stated | `sw == iw` at 360, 390, 768, 1024, 1280, 1440 for the queue and the case; side by side from 768 | PASS | `b1`, `shots/` |
| AC3.1 | Callers x endpoints | none 401; forged uuid, stub, 3000-char cookie 401; member, brother, Mahram, MFA-pending 403; Operator queue 200 and everything else 403; Moderator 200 | exactly that, 10 callers x 10 endpoints | PASS | `a2` |
| AC3.2 | Evidence headers | `no-store`, `Content-Disposition: inline`, `nosniff`, CSP, no bucket URL | `no-store, private, max-age=0`, `Pragma: no-cache`, `inline`, `nosniff`, `default-src 'none'`. The case JSON has no `s3://`, bucket or `evidence_uri`. | PASS | `a3` |
| AC3.3 | Audit per evidence view | one `moderator_evidence_view` per fetch with staff id, record id, kind and time | counts matched served views: 2 to 3, and 30 of 40 in the rate-limit run | PASS | `a3`, `a7` |
| AC3.4 | Invalid and foreign record ids (IDOR) | 404 | `abc`, `../../etc/passwd`, a nil uuid, a photo id, an account id, `%00`, a 5000-char id and a phone OTP record id all gave 404 | PASS | `a3` |
| AC3.5 | Unblur needs a typed reason | 10 to 300 characters | 9 characters, 9 plus padding, 301, missing and non-string all gave 400; valid gave 201 | PASS | `a4` |
| AC3.6 | Unblur scope | only that account's reviewable photo | a foreign asset, swapped account and asset, and an account id used as asset id all gave 404 | PASS | `a4` |
| AC3.7 | Grant holder | only the Moderator who minted it | other Moderator 403, Operator 403, member 403, signed out 401. The grant is not usable on `/v1/media/get` (403 for member A, member B, `REVEAL_DENIED` for the Moderator). A member blur grant on the staff endpoint gave 403. | PASS | `a4` |
| AC3.8 | Grant expiry | 60 s | expires in 59.99 s; 403 after 62 s of real waiting and after forced expiry | PASS | `a4` |
| AC3.9 | Unblur audited with the reason | row with account, asset, grant and reason | present. A SQL and script-style reason is stored literally. | PASS | `a4` |
| AC3.10 | No evidence in URLs, logs, client storage | none | page URL stays `/staff/revue`; `localStorage` and `sessionStorage` are empty; images are `blob:` URLs; no download link; api and web logs have no image bytes, notes, reasons, record or token paths | PASS | `b1`, `g7-logs-grep.txt` |
| AC3.11 | Page gate on `/staff/revue` | signed out, forged, stub, MFA-pending go to `/staff/connexion`; member and Mahram to `/decouvrir` | exactly that (303) | PASS | `b2` |
| AC3.12 | Operator page | counts only | counts line and the reserved message, 0 queue buttons, only `/queue` called | PASS | `b2` |
| AC4.1 | Publishing needs ID, selfie and profile review | public only when all are granted and phone OTP is granted | A: ID approved, still unpublished; profile allowed, public. C (profile first, then ID, then selfie): public only after the last grant. G (ID rejected): stayed hidden. | PASS | `a6` |
| AC4.2 | Old rule (pending counts) is gone | pending never publishes | mutation catches it; the pending state stays unpublished live | PASS | `a6`, `g2-mutation-checks.txt` |
| AC5.1 | Reject shows step and reason, new pose, no payment | notice with category | member sees both notices ("la pièce est expirée", "le selfie n'est pas assez net") and a new pose; no pay wording; the API shows the `reason` category only | PASS | `b3`, `a6` |
| AC5.2 | Suspected minor | account and profile `held`, never public, even after other approvals | H: account `held`, profile `held`, record `held`; approving the selfie and allowing the profile kept it held | PASS | `a6` |
| AC5.3 | Member-side hold page | no action asked | notice shown, but the retake controls stay and uploads are accepted (F4) | PARTIAL | `shots/member-held-390.png` |
| AC6.1 | Two Moderators, same record | one 200 and one 409 | parallel: 200 + 409; 10 parallel: one 200, 9 x 409, one audit row | PASS | `a5` |
| AC6.2 | Retake after the case opened | 409 and nothing overwritten | G and F: 409; the old row untouched | PASS | `a6` |
| AC6.3 | Decision audit with no image data, note or secret | present, `note` is yes or no | present; a planted note was found in 0 audit rows and is stored on the row only | PASS | `a6` |
| AC6.4 | Decision input validation | 400 or 404 | reason missing, wrong or from the other kind, approve with a reason, note of 501 characters or not a string, kind mismatch, wrong account, unknown record, bad decision, array body: all refused with the row still `pending`; an Operator is refused with 403 before validation | PASS | `a5` |
| AC6.5 | Moderator-only `/v1/staff/cases` | Operator 403 `moderator_required`, metrics still open | confirmed | PASS | `a2` |
| AC7 | Stack boots; e2e and staging grant | as stated | stack boots; full-stack capture-to-publish e2e passes; the staging-grant unit tests pass | PASS | `g2-e2e-stack-full.log` |
| NFR rate | 31st evidence view in a minute | 429 | 40 parallel: 30 x 200, 10 x 429, 30 audit rows; unblur shares the same budget; works again after 61 s; another session is unaffected | PASS | `a7` |
| NFR rate (restart) | in-memory limiter | resets on restart | after exhausting the limit, an API restart gave 30 more views in the same minute (F5) | FINDING | `a7` |
| Mig | Migration 0020 | applies cleanly and additively | applies on an empty Postgres 17 (21 migrations) and in the integration test; `drizzle-kit check` is clean | PASS | `g2-integration-migrate.txt` |
| UX-1 | Stale decision in the console | the Moderator is told why | after a 409 the form vanishes and no message appears (F1) | FAIL | `shots/stale-409-real.png` |
| UX-2 | Double click on save | one request | 1 POST for a double click, on both the stale and the approve path | PASS | `b2` |
| UX-3 | Empty and invalid forms | clear French message | "Choisissez une décision.", "Choisissez un motif de refus." | PASS | `b2` |
| UX-4 | API failure states | handled | queue 500 gives an alert ("Request failed", F8); network failure "La connexion a échoué."; evidence 503 "La pièce est indisponible."; evidence 429 "Trop de consultations…" | PASS with F8 | `b4` |
| UX-5 | Session deleted mid-case | redirect to sign-in | redirected to `/staff/connexion` | PASS | `b2` |
| UX-6 | Keyboard and zoom | usable | queue row reached in 3 tabs, Enter opens, focus moves to the case title, visible focus on every control; no overflow at 200% zoom (720 css px) | PASS | `b2`, `b4` |
| UX-7 | Slow network | usable | 50 KB/s and 400 ms latency: queue visible in about 2 s, case opened in 0.8 s | PASS | `b4` |
| i18n | French copy | French only | the case shows raw English tokens (F2) | FINDING | `shots/case-evidence-1440.png` |

## Findings

| # | Severity | Gate | Steps to reproduce | Expected | Actual | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| F1 | **Major** | G5 | As Moderator 1 open a case that has a pending ID. As Moderator 2 (or by API) decide that ID. In the first window, tick "Approuver" and press "Enregistrer la décision". | An error line says what happened ("La file a changé. Rechargez avant de décider.") and how to recover. | The server answers 409 `REVIEW_STALE`, but the page shows nothing. The `role=alert` and `role=status` lines are empty, the ID form disappears, and only a "Décisions antérieures" list changes. The Moderator cannot tell if the decision was taken, refused or lost. The API message exists and is not shown after the reload. | `b3-stale-member.txt`, `shots/stale-409-real.png` |
| F2 | Minor | G4, i18n | Open any case with a profile. | French labels and values. | "Situation matrimoniale : single" and "Polygamie : no" show raw English enum values. | `shots/case-evidence-1440.png` |
| F3 | Minor | G5 | Open a case whose member retook the ID or selfie. | The history lists decisions. | "Décisions antérieures" also lists superseded captures that nobody decided as "En attente", which is misleading. | `shots/stale-409-real.png` |
| F4 | Minor | G3 | Put a member on the age hold with "Mineure présumée", then open her `/id-liveness`. | The handoff says no retake is offered and the notice says no action is asked. | The hold notice shows, but "Remplacer", the camera button and "Confirmer…" stay active, and the API accepts a new ID upload (201, stored as `held`). The hold itself works. | `a6`, `shots/member-held-390.png` |
| F5 | Minor | G7 | Use 30 evidence views, restart the API, then view evidence again. A new staff sign-in also gets a new budget. | A per-session limit; the handoff discloses it is in-process. | The counter resets on restart or on another API instance, so the limit is weak against bulk reading. There is no `Retry-After` header on the 429. This matches the spec's "per staff session" wording, so it is a risk note. | `a7-ratelimit.txt` |
| F6 | Minor | G7 | `GET /v1/staff/cases?kind=profile_review` (Moderator). | `no-store` on staff responses that hold personal data. | No `Cache-Control` on `/v1/staff/cases` and `/v1/staff/metrics` (they carry profile fields and blur grants). Old behaviour, not evidence. | `a2-access-matrix.txt` |
| F7 | Minor | G2 | Change `EVIDENCE_VIEWS_PER_MINUTE` from 30 to 3000. | A test fails. | No test fails, because the test uses the constant. The number 30 is not pinned. | `g2-mutation-checks.txt` |
| F8 | Minor | G5 | Make `/v1/staff/review/queue` answer 500. | A French error. | The alert reads "Request failed" in English. | `b4-states-zoom-3g-kbd.txt` |
| F9 | Minor | G6 | Member `/id-liveness`, 390 px wide. | Targets of at least 44 by 44 px. | "Remplacer" is 61x16 and "Se connecter avec un autre compte" is 308x16. A contrast ratio of 4.41 shows on the 11 px "CNIB • Passeport…" text. These are old controls, not this story's. | `b3-stale-member.txt` |
| F10 | Info | G1 | `npm audit --omit=dev --audit-level=high`. | No new high or critical. | 1 critical on `next` 16.0.0 to 16.4.0, which is not caused by this commit (no dependency change). It needs a separate upgrade decision. | `g1-npm-audit.txt` |

## Retest note

F1 needs a fix and a retest, because it is a Major (G5). After the fix I would re-run G2, G6, G7 and G8 in full, because fixes cause regressions. F2 to F9 may be accepted or fixed at the developer's choice.

## Not tested and why

- **WebKit or a mobile Safari profile.** Only Chromium is installed here.
- **Lighthouse and Web Vitals under the real CDN.** The CDN and fonts are blocked. I measured LCP (516 ms) and load times under throttling with the stand-in CSS only.
- **Pixel match to Stitch 41, 42 and 07.** The stand-in CSS is a Tailwind v4 build, not the CDN, so I only checked layout, copy and the absence of overflow.
- **Premium ahead of free.** The billing port is `unavailable` in production code, so only the unit test covers it (not run end to end).
- **OWASP ZAP.** Not configured.
- **A Mahram with a real wali link.** No Mahram table exists yet, so I used an account with the `mahram` role. It was refused everywhere.
- **Evidence encrypted at rest in MinIO.** Not re-checked, because the sealing format was not changed here.
- **The 5 public smoke and 4 PIN-test failures on a baseline commit.** Not run (see G2).
- **`compose.test.ts`.** Not run, see G2. It conflicts with a running stack and fails at `npm ci` anyway.
