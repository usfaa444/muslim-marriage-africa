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
