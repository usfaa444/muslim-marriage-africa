# Stories 8.5 / 8.6 (and 4.4 AC 3) QA report

**Verdict: PASS** (with two checks pending on Fay's Mac, see *Not tested and why*)

- Date: 2026-10-23
- Branch `factory/report-block`, commit `db16287`
- Environment: cloud container, local only. Web app on port 3100 (`npm run test:e2e` web server), API exercised through a real Nest server bound on 127.0.0.1 in vitest, Postgres 17 (`mirror.gcr.io/library/postgres:17`) for the migration/integration tests. No compose stack, no staging deploy.
- Spec: `_bmad-output/implementation-artifacts/spec-8-5-8-6-report-and-block.md`; ACs from `_bmad-output/planning-artifacts/epics.md` (8.5, 8.6, 4.4 AC 3).
- Evidence: `code/docs/qa-handoffs/8-5-8-6-report-and-block-evidence/`
- Independence: the verification matrix was built from the epics ACs, the spec and the UX/Stitch screen before reading the developer handoff. All API and browser checks below were written by QA (`qa-reports-blocks.test.ts.txt`, `qa-report-block.spec.ts.txt` in the evidence folder) and run by QA; the developer's own suites were re-run, never quoted. QA's own test files were removed from the working tree after the runs; no product code was changed, nothing was pushed or deployed.

## Gate summary

| Gate | Result | Evidence |
| --- | --- | --- |
| G1 Static (lint, typecheck, build, migration-check, audit, secrets, debug leftovers) | PASS | `static-gates.txt`, `npm-audit.txt`. Lint exit 0 with 3 pre-existing warnings; typecheck, build, `migration-check` (`Everything's fine`) exit 0. `npm audit --omit=dev --audit-level=high` reports high/critical advisories in `next` and `body-parser`, **pre-existing**: the diff against `main` touches no `package.json` / `package-lock.json`. Diff scan for keys/tokens/passwords and `console.log`/`debugger`: only test fixtures (`password: 'phrase avec espaces'`) and the Drizzle snapshot column `secret_hash`. |
| G2 Automated tests + quality + mutation + flake | PASS | `unit-suite.txt`, `integration-suite.txt`, `dev-unit-tests.txt`, `qa-api-tests.txt`, `e2e-full-branch.txt`. Unit 634 passed / 1 failed (pre-existing `photo-rules` Chrome check, fails on `main`). Integration 33 passed / 2 skipped, 1 file failed (`compose.test.ts`, Docker Hub 429 on `node:24.21.0`, pre-existing). E2E `report-block.spec.ts` with `--repeat-each=3`: 30 passed, 0 flaky. Mutation spot-check: 3 mutants (case `sla_started_at` shifted by 1 s → 2 tests fail; breach comparison inverted → AC 8.5-2 test fails; `hiddenFor` returns `[]` → 4 Block tests fail), all caught, all restored (`git status` clean of product changes). |
| G3 Functional in a real browser + API | PASS | `qa-e2e.txt`, `qa-api-tests.txt`, screenshots. 12 QA browser checks (desktop + mobile) and 9 QA API checks, all green. |
| G4 UI fidelity, 360–1440 | PASS for layout / copy, **styled pass pending** | `screen23-360/390/768/1024/1280/1440.png`, `screen21-thread.png`. No horizontal scroll at any width (`scrollWidth <= innerWidth`), no clipped text, copy matches the spec verbatim (nine reasons in Stitch order, none preselected, Block checked by default). Colours, spacing and icons cannot be judged here: the Tailwind CDN, Google Fonts and Material Symbols are unreachable in this container, so the page renders unstyled. |
| G5 UX | PASS | `screen23-no-reason-error.png`, `screen23-error-abort.png`, `screen23-error-429.png`, `screen23-sent.png`, `screen23-blocked.png`. Loading (`aria-busy`), empty-reason error, API error, network error, 401 with a sign-in link, success and block-only states all present; the reason and the free-text note survive every error; both error and success states offer a way back; double submit posts once; back button returns to the thread. |
| G6 Accessibility | PASS (automated + keyboard) | `qa-e2e.txt`. axe-core WCAG 2.0/2.1/2.2 A+AA on the form, the no-reason error state, the sent state and the blocked state: zero serious or critical violations. Full flow completed keyboard-only (arrow keys on the radio group, Tab to the note, Space on the Block checkbox, Enter to submit); focus lands on « Signalement transmis » after sending; status node is `role="status" aria-live="polite"`; markup has 44 px targets (`min-h-[44px]`, a 44 × 44 checkbox label, 48 px reason rows) — the rendered pixel check needs the styled build. |
| G7 Non-functional (performance, reliability, security, privacy, i18n) | PASS | `qa-vitals.txt`, `qa-api-tests.txt`. Mobile profile, 4× CPU throttle, ~1.6 Mbps / 300 ms RTT: LCP 1120 ms, CLS 0, interaction 108 ms, transferred 0.9 KB (unstyled). Page open at 400 ms latency: < 2 s, well inside NFR-005's 8 s. Zero console errors and zero unexpected 4xx/5xx across every browser check (the suite's guards fail a test on either). Blocked API request → handled French error state, not a blank page. Security and privacy: see the matrix rows S1–S7. All copy French. |
| G8 Regression | PASS | `e2e-full-branch.txt` vs `e2e-full-main.txt`, `e2e-failures-branch.txt` vs `e2e-failures-main.txt`. Full e2e on the branch: 147 passed, 33 skipped, 30 failed. Same suite on `main` at `38a6a63` in the same container: 137 passed, 31 skipped, 30 failed. `diff` of the sorted failure lists: **identical**, so the 30 failures (Tailwind CDN guard and unstyled axe/layout checks in `invite-inbox`, `profile-edit-flow`, `staff-review`, `staff-shell`, `smoke`) are environmental and not caused by this story. Neighbouring flows that share code (browse grid, profile detail, favourites, invites, chat send and typing) are covered by the QA API checks and by the unchanged suites. |

## Verification matrix

| ID | Criterion or check | Expected | Actual | Result | Evidence |
| --- | --- | --- | --- | --- | --- |
| AC 8.5-1 | Report submitted → a `moderation_case` exists with `sla_started_at` = submit time | Report row + exactly one case, same `sla_started_at` as the submit clock, `first_human_at` null | Both rows written in one submit; `report.sla_started_at` = `case.sla_started_at` = the clock at submit, to the millisecond; `first_human_at` null; response `case.sla_state: 'open'`, `sla_hours: 24` | PASS | `qa-api-tests.txt` « QA: AC 8.5-1 persistence… » |
| AC 8.5-1b | Report from Chat on one message | `target_kind: 'message'`, `target_id` = message id, `conversation_id` set | As expected; reported account = the sender | PASS | `qa-api-tests.txt` « QA: a message Report never stores the message text » |
| AC 8.5-2 | 24 h with no first human → SLA-breach in Operator metrics | strict boundary: exactly 24 h open, 24 h + 1 s breach; first touch clears it | At `start + 24h`: `open 1, sla_breach 0`. At `+1 s`: `sla_breach 1`. With `report_sla_hours: 6`: `sla_hours 6`, breach at 25 h. With `first_human_at` set: `open 0`, `sla_breach 0`, `oldest_open_started_at null`, `caseSlaState` = `first_touch_late`. Unreadable config → 503 | PASS | `qa-api-tests.txt` « QA: AC 8.5-2 SLA boundary… » |
| AC 8.6-1 | After a Block, my Profile is absent when they browse | absent from grid and card, profile detail 404, favourite dropped | Both directions: absent from `/v1/browse?view=grid`, `/v1/profiles/:id` 404, the favourite no longer listed | PASS | `qa-api-tests.txt` « QA: AC 8.6 — Block closes… » |
| AC 8.6-2 | After a Block, Invite or Chat is rejected by the API | Invite 404; message send 409 `conversation_closed`; thread shows unavailable/closed | `POST /v1/invites` 404; send 409 with `details.reason = 'conversation_closed'` from **both** sides; `GET /v1/conversations/:id` → `closed: true`, `other.available: false` | PASS | same |
| AC 4.4-3 | Report reason « misrepresented marital status » available | code `misrepresented_marital_status` accepted; label « Dissimulation ou fausse déclaration de situation matrimoniale » in the UI, ninth and last | Submitted end-to-end from the browser; the posted body carries the code; the label is the ninth radio | PASS | `qa-e2e.txt` « widths, screenshots, axe… », `screen23-sent.png` |
| E1 | Reason missing | « Choisissez un motif. » in an alert, focus to the radios, no POST | As expected, nothing posted | PASS | `screen23-no-reason-error.png` |
| E2 | `details` 1000 vs 1001 characters (accented, so code points, not bytes) | 201 vs 400 « Précisions trop longues (1000 caractères au plus). », nothing written on the refusal | As expected; browser `maxlength` also caps typing at 1000 | PASS | `qa-api-tests.txt` « QA: details boundary… », `qa-e2e.txt` |
| E3 | Accents and non-Latin text, leading/trailing spaces | stored trimmed, verbatim | `  Accents éàç 中文 <script>…  ` stored trimmed and unchanged | PASS | `qa-api-tests.txt` |
| E4 | Invalid / odd bodies: null, a bare string, missing reason, SQL-ish id and reason, wrong-case kind, `block: "true"`, numeric details, self-report | each 400 or 404, nothing written | 9/9 refused, `report` and `moderation_case` both empty afterwards | PASS | `qa-api-tests.txt` « QA: injection-shaped… » |
| E5 | Double submit / in-flight submit | one POST | dblclick plus an Enter while the request is in flight → exactly 1 POST | PASS | `qa-e2e.txt` « double submit… » |
| E6 | Rate limit | at the limit 429 `RATE_LIMITED`, `retryable: true`, nothing written; window slides; unreadable config fails closed 503 | limit 3 → 4th is 429, 3 rows stored; 61 min later 201; config null → 503 | PASS | `qa-api-tests.txt` « QA: rate limit… » |
| E7 | Reload mid-flow, back button, deep link | page re-renders; back returns to the thread; `/signaler/<id>?discussion&message` deep link works | As expected | PASS | `qa-e2e.txt` « XSS pseudonym… » |
| E8 | Network failure and API failure | French recoverable error, input kept, retry succeeds | aborted request → « Envoi impossible… »; 429 → API message; 401 → « Votre session a expiré. » + « Se reconnecter »; retry after recovery sends the kept reason and note | PASS | `screen23-error-abort.png`, `screen23-error-429.png` |
| E9 | Slow network (3G-like, 400 ms latency) | usable, no error state | page ready in well under the 8 s NFR budget | PASS | `qa-e2e.txt` annotation `load-3g-ms` |
| S1 | Signed out | 401 on both endpoints, nothing written | 401 / 401 | PASS | `qa-api-tests.txt` « QA: authorization… » |
| S2 | Wrong role (staff session with MFA done) | 403 on both endpoints | 403 / 403, nothing written | PASS | same |
| S3 | IDOR: report another conversation's message | 404 « Ce message est introuvable. » | 404 from a third member; also 404 when reporting my own message | PASS | `qa-api-tests.txt` « QA: IDOR… » |
| S4 | Block isolation (no collateral) | a third member is unaffected | the stranger still browses and opens the brother's profile while the sister no longer can | PASS | same |
| S5 | Member calling the Operator metric | refused | `GET /v1/staff/metrics` with a member session → 403 | PASS | `qa-api-tests.txt` « QA: authorization… » |
| S6 | XSS through server-rendered member data | escaped, no script execution | pseudonym `<img src=x onerror=…>` renders as text, no `img[src=x]`, no side effect; the same payload in `details` is round-tripped as text | PASS | `qa-e2e.txt` « XSS pseudonym… » |
| S7 | Caching of the two commands | `Cache-Control: no-store` | present on `POST /v1/reports` | PASS | `qa-api-tests.txt` |
| P1 | Privacy: message text never stored in a Report | row holds ids only | the message text is absent from every `report` row | PASS | `qa-api-tests.txt` |
| P2 | Privacy: no personal data in the response | no e-mail or contact data | response body contains neither member's e-mail | PASS | same |
| P3 | Privacy: nobody learns who blocked whom | both sides get the same unavailable/closed answers | identical answers both ways | PASS | `qa-api-tests.txt` « QA: AC 8.6 … » |
| N1 | Real Postgres (migration 0024) | report + case + block rows and SLA-breach counting on migrated Postgres | `operator-config.migrate.test.ts` green on `mirror.gcr.io/library/postgres:17` | PASS | `integration-suite.txt` |
| N2 | Web Vitals, mobile throttled | LCP < 2.5 s, CLS < 0.1, INP < 200 ms | LCP 1120 ms, CLS 0, interaction 108 ms (unstyled page) | PASS, to be confirmed styled | `qa-vitals.txt` |
| N3 | No horizontal scroll 360–1440 | none | none at 6 widths | PASS | `screen23-*.png` |
| N4 | French only | all copy French, matching the spec | matches | PASS | screenshots |

## Findings

| # | Severity | Gate | Steps to reproduce | Expected | Actual | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| F1 | Minor (accepted, documented) | G7 | Two Reports submitted in parallel at the hourly limit | the limit holds exactly | count-then-insert lets at most one extra Report through; documented in the spec's *Deferred* and in the handoff | spec §Deferred |
| F2 | Minor (accepted, documented) | G7 | File a Report or a Block | some factories expect an audit trail | no `audit_event` is written; AD-18's mandatory list does not name Report or Block, so this is in line with the architecture, but the product owner should confirm it stays out until 8.7 | handoff §7.8 |
| F3 | Minor (pre-existing, not caused by this story) | G1 | `npm audit --omit=dev --audit-level=high` | no high/critical | high/critical advisories in `next` and `body-parser`; this branch changes no dependency, so the gate ("no **new** high or critical") holds. Worth its own upgrade story | `npm-audit.txt` |

No blocker, critical or major finding.

## Not tested and why

- **Styled visual fidelity against the Stitch design (colours, spacing, icon glyphs) and measured 44 × 44 px targets on screens 23 and 21.** The container cannot reach the Tailwind CDN, Google Fonts or Material Symbols, so every page renders unstyled. Layout, copy, overflow, axe and the keyboard path were verified unstyled; **pending on Fay's Mac / staging** for the styled pass. (As instructed, this is marked pending rather than failed.)
- **Full compose stack flow** (section 3 of the handoff: real database rows, operator metrics over HTTP on a running stack, the `/decouvrir` redirect after a Block in the built image). No compose stack is available here; `compose.test.ts` also fails on a Docker Hub 429 for `node:24.21.0`, identically on `main`. Pending on the local deployment step.
- **Lighthouse** (binary not available): Web Vitals were measured directly in Playwright under mobile CPU and network throttling instead; the numbers are from the unstyled page, so re-check once styled.
- **Real-device screen reader (TalkBack) and 200 % zoom on a real device**: not possible here; axe, the keyboard path and `role=status` announcements were verified programmatically.
- **Staging**: no deploy from this container, by instruction.


---

# Round 2: blocked list and unblock

**Verdict: FAIL** (2026-10-24, one Major finding in product behaviour, one Major test-protection gap; no blocker or critical; styled checks pending on Fay's Mac)

- Model: this QA round ran on **Claude Sonnet 5.5** (`claude-sonnet-5-5`), the model pinned by `.claude/agents/factory-qa.md`.
- Branch `factory/report-block`, commit `99fb942` (merge of `factory/report-block-unblock`; round 2 delta is `ba61db0..99fb942`, 14 files).
- Environment: cloud container, local only. Web on port 3100 (web-only e2e, `/v1` mocked per test), API through a real Nest server on 127.0.0.1 in vitest (in-memory stores), Postgres 17 (`postgres:17` tagged from `mirror.gcr.io/library/postgres:17`) for the migrate test. Tailwind CDN, Google Fonts and Material Symbols are unreachable, so every page is unstyled; e2e ran with `E2E_ALLOW_ERRORS` for those hosts only.
- Scope: spec rows U-1 to U-4, handoff test cases 19 to 23, `GET /v1/blocks`, `DELETE /v1/blocks/:blocked_id`, web `/settings/bloques`, effects of unblock, mutual blocks, plus a regression pass on 8.5/8.6.
- Evidence: `code/docs/qa-handoffs/8-5-8-6-report-and-block-evidence/round-2/`.
- Independence: the matrix was built from the owner's request, the spec rows and epics before reading the handoff. QA added `apps/api/src/qa-round2-unblock.test.ts` (4 API tests) and `e2e/qa-round2-blocked.spec.ts` (5 browser tests). No product code was left modified (two temporary mutations, restored; `git status` shows only the new QA files and evidence).

## Gate summary (round 2)

| Gate | Result | Evidence |
| --- | --- | --- |
| G1 Static | PASS | Lint exit 0 (3 pre-existing warnings), typecheck and build exit 0, `npm audit` high advisories in `body-parser` / `multer` / `next` are pre-existing (`package-lock.json` unchanged between `ba61db0` and `99fb942`, round-1 F3). No secrets or debug leftovers in the delta. `npm-audit.txt` |
| G2 Automated tests, mutation, flake | PASS with finding F-2 | Unit 639 passed, 1 failed (`photo-rules` Chrome check, times out in this container, same as round 1, unrelated). `reports-blocks.test.ts` 22/22 and `blocked-list-page.test.ts` 5/5 green. Integration: 33 passed; `compose.test.ts` fails because `npm ci` inside the docker build has no network (same as round 1). `operator-config.migrate.test.ts` (real Postgres, includes `blocksBy`/`removeBlock`) green. New e2e (`blocked-list`, `report-block`, `app-shell`) 138 passed over `--repeat-each=3`, 0 flaky. Mutation results below. `unit-suite.txt`, `integration.txt`, `qa-api-tests.txt` |
| G3 Functional, browser and API | FAIL (F-1) | 4 QA API tests, 5 QA browser tests (3 consecutive runs, 5/5 each), observations in `observations.txt` |
| G4 UI fidelity 360 to 1440 | PASS for layout and copy, styled pass pending | `list-360/390/768/1024/1280/1440.png`, `confirm-long-name-1440.png`; no horizontal scroll at any width, with a 56-character accented name, an Arabic name and an HTML-looking pseudonym |
| G5 UX | FAIL (F-1) for the non-listable blocker; otherwise PASS | `state-403.png`, `state-delete-403.png`, `state-loading.png`, `state-empty-after-last.png` |
| G6 Accessibility | PASS (automated and keyboard) | axe WCAG 2.0/2.1/2.2 A+AA, zero serious or critical on the list, the open confirmation, after unblock and the empty state; keyboard path (Enter, Tab, Enter) green, focus returns to « Débloquer » on Annuler and to the h1 after success. Contrast and 44 px targets are pending (unstyled) |
| G7 Non-functional | PASS with minor findings | IDOR, auth, payload and method checks green (API table below). Lighthouse not available; the list is one request and measures nothing meaningful unstyled, re-check styled |
| G8 Regression | PASS | Full e2e on `99fb942`: 151 passed, 35 skipped, 32 failed. The same 32 fail on round-1 commit `ba61db0` in the same container (5 spec files re-run there: 32 failed, 63 passed). Causes: Tailwind CDN missing (`The Tailwind CDN did not load…`, 16), axe contrast on unstyled pages (11), 2 touch-target checks measured unstyled, 1 staff two-pane layout unstyled, and the 2 chat « Aujourd'hui » tests, which fail because the run was at 00:2x Africa/Ouagadougou (UTC+0), just after midnight. None touches Report/Block. `report-block.spec.ts`, `blocked-list.spec.ts`, `app-shell.spec.ts` all pass. `e2e-full-branch.txt` |

## Verification matrix (round 2)

| ID | Criterion or check | Expected | Actual | Result | Evidence |
| --- | --- | --- | --- | --- | --- |
| U-1 | List shows blocked members, pseudonym and blurred photo only, never who blocked me | Only my rows, newest first, exact keys, `blur` grant | Dev suite green; QA IDOR check: a third member sees an empty list and cannot delete my Block (404); a Block on me never appears | PASS | `qa-api-tests.txt` |
| U-1b | Hostile, long, non-Latin names | Rendered as text, no overflow | `<img src=x onerror=…>` stays text (`__xss` undefined, no stray `<img>`), 56-char accented name and Arabic name fit at 6 widths, date « Bloqué le 21 octobre 2026 » for 23:30 UTC | PASS | `list-*.png`, `confirm-long-name-1440.png` |
| U-1c | Blocker whose own profile is not listable (private, paused, in review) | Can still see and lift the Blocks she placed | `GET /v1/blocks` and `DELETE` both 403 `viewer_not_listable`; the page shows « Votre profil doit être validé avant de consulter d'autres profils. » with « Réessayer » | **FAIL (F-1)** | `qa-api-tests.txt`, `state-403.png`, `state-delete-403.png`, `observations.txt` |
| U-2 | Cancel changes nothing; confirm removes my own Block only | No DELETE on cancel; one DELETE for that id on confirm | Dev e2e green; QA: a double click sends one DELETE; a failed DELETE (network abort, 500, 403) keeps the row and says why; retry works; removing the last member shows « Vous n'avez bloqué aucun membre. » | PASS | `observations.txt`, `state-empty-after-last.png` |
| U-2b | I cannot remove the other member's Block, including by sending my own id | 404 « Ce blocage n'existe pas. », nothing deleted | Real code: 404 and the Block stands (QA test). Mutation M1 shows the dev API tests do not guard this (F-2) | PASS (product), test gap F-2 | `qa-api-tests.txt` |
| U-3 | After unblock: browse, profile, favourites, Invites, Chat | All back both ways; thread reopens with history | Dev suite green. QA adds: an Invite sent before the Block can be accepted again after unblock (accept 404 while blocked, 200 after); favourite add refused while blocked and allowed after; a Report can still be filed on a blocked member and on a message of the closed thread; re-block after unblock returns 201 then 200, one list row | PASS | `qa-api-tests.txt` |
| U-4 | Mutual Block, one unblock | Hidden and closed until both lift | Dev test green; QA reproduced via mutation M2 that it fails when the list leaks | PASS | `qa-api-tests.txt` |
| 23 | Keyboard only | Enter, Tab, Enter unblocks, focus on h1 | Green on desktop profile, 3 runs | PASS | `blocked-list.spec.ts` |
| Auth | No session, staff, mahram, malformed ids, payloads | 401 / 403 / 404, nothing changed | No session redirects the page to `/auth`; API 401 and staff 403 (dev suite); ids `' OR 1=1 --`, `<script>`, `%00`, `..%2f`, 5000 characters all 404 with the Block intact; `PUT` and `PATCH` on `/v1/blocks/:id` 404 or 405; an upper-case UUID is accepted (200) | PASS | `qa-api-tests.txt`, `observations.txt` |
| UX | Load, slow, error, back button | Loading state, error with retry, fresh data after back | `aria-busy` with the page head while a 3 s list loads; 500 on list shows the load error with « Réessayer »; back after an unblock re-reads the API (2 rows) | PASS | `state-loading.png` |
| Reg | 8.5 / 8.6 flows | Unchanged | 22 API tests, `report-block.spec.ts` 6 x 3 runs green, boundaries tests green, Report and Block never reach BillingPort | PASS | `unit-suite.txt`, `e2e-full-branch.txt` |

### Mutation spot-check (round 2)

| # | Mutation (restored afterwards) | Result |
| --- | --- | --- |
| M1 | `memoryTrustStore.removeBlock` ignores `blocker_id` (deletes any row for that `blocked_id`) | `reports-blocks.test.ts` **still passes 22/22**: no dev test sends my own id to `DELETE`. QA's test `QA: DELETE with my OWN id cannot lift the Block…` fails on the mutant and passes on the real code (F-2). |
| M2 | `memoryTrustStore.blocksBy` stops filtering by blocker | Caught: 2 dev tests fail (list and mutual unblock) |
| M3 | Web page sends `POST` instead of `DELETE` | Caught: 1 web unit test and 3 e2e tests fail |

## Findings (round 2)

| # | Severity | Gate | Steps to reproduce | Expected | Actual | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| F-1 | **Major** (product decision may downgrade) | G3, G5 | Member B blocks A. B's own profile later becomes not listable (private, paused, profile in review, ID or liveness pending). B opens « Membres bloqués », or calls `DELETE /v1/blocks/<A>` | The owner's request is that the person who blocked can see and unblock. B should still reach the list and lift the Block. | 403 `viewer_not_listable` on both calls (same gate as browse, `assertBrowseViewer`). The page shows « Votre profil doit être validé avant de consulter d'autres profils. » and « Réessayer », which cannot succeed. B has no way to lift the Block, and the message talks about browsing, not blocking. The same gate is used by the round-1 `POST /v1/blocks`, so a Block can be placed and then cannot be lifted once the profile stops being listable. | `state-403.png`, `state-delete-403.png`, `observations.txt`, `qa-api-tests.txt` |
| F-2 | **Major** (test does not protect U-2) | G2 | Apply mutation M1 | A test fails | No dev test fails; the product code is correct (Postgres uses `blocker_id AND blocked_id`, QA test passes) but nothing at API level guards « I cannot remove the other member's Block » against the case where the caller sends their own id. | `qa-api-tests.txt`; QA test left in `apps/api/src/qa-round2-unblock.test.ts` for the developer to fold in |
| F-3 | Minor | G7 | `GET /v1/blocks` with many Blocks | One query per list | `listMyBlocks` calls `loadAccount` and `signMedia` once per row (N+1) and the list has no pagination; fine at a handful of Blocks, worth a cap or a batch read before large lists | code read of `apps/api/src/reports.ts` |
| F-4 | Minor | G1 | Upper-case UUID in `DELETE /v1/blocks/:id` | n/a | Accepted and lower-cased (200). Harmless, noted for consistency with `POST` | `qa-api-tests.txt` |
| F-5 | Minor (pre-existing) | G1, G2 | `npm audit`; `photo-rules` Chrome test; `compose.test.ts` | green | Unchanged from round 1 (F3 there) and environmental here | `npm-audit.txt`, `unit-suite.txt`, `integration.txt` |

## Not tested and why (round 2)

- Styled visual fidelity of « Membres bloqués » and of the new Paramètres card, colours, spacing, icon glyphs, contrast, and measured 44 x 44 px targets for « Débloquer », « Confirmer le déblocage » and « Annuler ». Tailwind CDN and fonts are unreachable here. Pending live QA on the owner's Mac. There is no Stitch screen for this page (built on screen 27), so the check is against the spec copy and the Paramètres style.
- Full compose stack: the Postgres-backed API path (`GET`/`DELETE /v1/blocks` over HTTP against real rows, `select * from block`), handoff section 3 step 7 end to end in the built image. Only the Postgres store was run (migrate test). Pending on the Mac.
- Lighthouse and 3G throttling of the styled page, TalkBack, 200 % zoom on a device.
- OWASP ZAP and security headers: not configured here.
- Real Socket.IO typing relay after unblock was covered by the dev API test (re-run green); QA did not duplicate it.

## Retest guidance

After F-1 is decided (allow list and unblock for any signed-in member regardless of listability, or accept and show a block-specific message with no « Réessayer ») and F-2 is covered (keep or merge `QA: DELETE with my OWN id…`), re-run G2, G6, G7, G8 in full.


---

# Round 3: retest of round 2 findings

**Verdict: PASS** (2026-10-24, Retest of F-1 to F-4 plus full G2, G6, G7, G8; styled checks and the full compose stack stay pending on Fay's Mac)

- Model: this QA round ran on **Claude Sonnet 5.5** (`claude-sonnet-5-5`).
- Branch `factory/report-block`, commit `0557ae6` (fix commit `78c7273`; delta from round 2 is `assertMemberViewer`, the list cap, tests, handoff).
- Environment: same as round 2 (cloud container, in-memory API stores through a real Nest server, Postgres 17 for the migrate test, web-only e2e unstyled with `E2E_ALLOW_ERRORS` for Tailwind CDN and Google Fonts).
- Evidence: `code/docs/qa-handoffs/8-5-8-6-report-and-block-evidence/round-3/` (`static-gates.txt`, `unit-suite.txt`, `integration.txt`, `e2e-full-branch.txt`, `qa-api-tests.txt`, `mutations.txt`, `npm-audit.txt`).
- Independence: QA wrote new tests, `apps/api/src/qa-round3-gates.test.ts` (4 API tests, left in the repo untracked for the developer to keep or fold in). The round 2 QA files were folded into the dev suites by the developer; I re-checked their behaviour with my own tests rather than trusting the fold.

## Retest of round 2 findings

| # | Round 2 finding | Retest | Result |
| --- | --- | --- | --- |
| F-1 | Non-listable blocker got 403 on list, unblock (and Block/Report) | New `assertMemberViewer`. QA test walks 7 states (`unpublished/Active`, `held`, `private`, no visibility, `public/deactivated`, `public/held`, `public/pending_deletion`): Report with Block 201, list 200 with her Block, DELETE 200, target rules intact (same-gender 404, self 400, no BillingPort call). In every one of those states browse, a profile read, favourites (GET and POST), invites (GET and POST), conversations (list, one, send) and filters remain 403. Staff (`moderator`, `operator`, staff session) get 403 `staff_session`, `mahram` and no-role accounts get 403 `mahram_session`, no session 401, on all four safety paths, and nothing was written. The web page needs no change; the 403 message of `state-403.png` can no longer be produced for a member. | **FIXED** |
| F-2 | Dev tests did not protect « I cannot remove the other member's Block » | M1 re-run (`removeBlock` ignores `blocker_id`): the dev test « QA F-2 … » and my test now fail, real code passes. | **FIXED** |
| F-3 | N+1 and no cap on `GET /v1/blocks` | Cap of 100 newest (limit pushed into the Postgres query), `has_more`, one batch photo read, account and blur reads in parallel. QA test with 101 rows: first page shows the newest first, `has_more: true`; with exactly 100 rows `has_more: false`; ghost accounts are left out and `count` equals `items.length`. Per-row account and blur reads remain but are bounded by 100. | **FIXED** (see M-1) |
| F-4 | Upper-case UUID accepted | Kept by design, asserted: `DELETE /v1/blocks/<UPPER>` returns 200 and removes my row only. | **ACCEPTED** |

## Mutation spot-check (round 3)

| # | Mutation (restored afterwards) | Result |
| --- | --- | --- |
| M1 | `removeBlock` ignores `blocker_id` | Caught by the dev F-2 test and by QA |
| M5 | `assertMemberViewer` staff check disabled | Dev suite stays green (staff falls to the mahram branch, still 403); QA test fails on the reason code `staff_session`. Minor gap, see M-2 |
| M6 | Invites POST gate swapped to `assertMemberViewer` | Dev suite stays green; QA test fails (non-listable viewer must stay 403 on invites). Minor gap, see M-2 |

## Gate summary (round 3)

| Gate | Result | Evidence |
| --- | --- | --- |
| G1 Static | PASS | Lint exit 0 (pre-existing warnings plus unused helper warnings in QA's own test file), typecheck, build, `migration-check` clean; `package-lock.json` and `package.json` unchanged since round 2, so the `npm audit` high advisories are the same pre-existing ones (round-1 F3). No secrets or debug leftovers in the delta. `static-gates.txt`, `npm-audit.txt` |
| G2 Automated tests | PASS | Unit 643 passed, 1 failed (`photo-rules` Chrome check, same environmental failure as rounds 1 and 2). Integration 33 passed; `compose.test.ts` fails only because `npm ci` in the docker build has no network (same as before); the Postgres migrate test (includes `blocksBy` with limit and `removeBlock`) is green. `blocked-list`, `report-block`, `app-shell` e2e: 147 passed over `--repeat-each=3`, 0 flaky. Mutations above. |
| G3 Functional | PASS | QA API tests and the folded browser edges (hostile, long and Arabic names, failed DELETE keeps the row, signed out to sign-in) green. |
| G4 UI fidelity | PASS for layout and copy, **styled pass pending** | Unchanged page; round-2 screenshots still valid, no web file changed except the e2e spec. |
| G5 UX | PASS | The dead end of F-1 is gone; load error, empty state, confirm and success states unchanged. |
| G6 Accessibility | PASS (automated and keyboard) | axe serious or critical: 0 in the blocked-list e2e on every state; keyboard path green. Contrast and 44 px targets pending (unstyled). |
| G7 Non-functional | PASS | Authorization matrix above, IDOR and payload checks from round 2 still hold (dev F-2 test covers hostile ids). No Lighthouse here. |
| G8 Regression | PASS | Full e2e: 154 passed, 36 skipped, 32 failed. The sorted list of the 32 failures is identical to round 2, and those 32 were shown in round 2 to fail identically on round-1 commit `ba61db0`. Causes: Tailwind CDN missing, axe contrast and layout checks on unstyled pages, and the two chat « AC 5.1-1 » tests, which are clock-dependent: the fixture message is 26 h old, which is labelled « Hier » only after about 02:00 Ouagadougou time, and this run was at 01:1x (shows « 22 octobre »). No Report/Block test is among them. |

## Findings (round 3)

| # | Severity | Gate | Observation |
| --- | --- | --- | --- |
| M-1 | Minor | G5 | A member with more than 100 Blocks sees only the newest 100 and the page does not use `has_more`; older ones cannot be lifted from the UI. Accepted by the developer as not expected; worth a line of copy or paging if it ever happens. |
| M-2 | Minor | G2 | The dev suite does not guard the staff-reason branch of `assertMemberViewer` (M5) nor that invites stay behind the listable gate (M6); QA's `qa-round3-gates.test.ts` does. Suggest keeping it. |
| M-3 | Minor | G7 | `assertMemberViewer` requires only an existing account with the `member` role, so a member in `held`, `deactivated` or `pending_deletion` status can still Report, Block and Unblock. This is the intended design (safety paths), tested in all three; noted so it is a conscious choice. Report rate limit still applies. |
| M-4 | Minor (pre-existing) | G1, G2 | `npm audit`, `photo-rules` Chrome test, `compose.test.ts`, and the unstyled/CDN e2e failures are environmental and unchanged. |

No blocker, critical or major finding.

## Not tested and why (round 3)

- Styled visual fidelity of « Membres bloqués » and the Paramètres card (colours, spacing, icons, contrast, measured 44 x 44 px targets): Tailwind CDN and fonts are unreachable here. Pending live QA on the owner's Mac.
- Full compose stack: `GET` and `DELETE /v1/blocks` over HTTP against real Postgres rows and the built web image (including whether the web entry guard lets a non-listable member reach `/settings/bloques` in the built image; the web-only stub session was used here). Pending on the Mac.
- Lighthouse, 3G throttling of the styled page, TalkBack, 200 % zoom on a device, ZAP and security headers.
