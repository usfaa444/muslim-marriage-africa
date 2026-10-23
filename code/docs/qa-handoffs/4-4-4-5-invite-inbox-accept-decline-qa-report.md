# 4-4-4-5-invite-inbox-accept-decline QA report

Verdict: **BLOCKED** (2026-10-23, local app in the cloud container, branch `factory/invite-inbox`, commit b099b61, QA model claude-sonnet-5-5).

No product defect was found. The verdict is BLOCKED because the visual, touch-target, contrast and performance gates (G4, parts of G5, G6, G7) and the real-stack walk need `cdn.tailwindcss.com` (every Stitch screen styles itself with the Tailwind play CDN) and Google reCAPTCHA, and the sandbox blocks both. I did not work around the block by injecting a substitute Tailwind build. Those checks must be run on the owner's machine (list at the end).

## Gate summary

| Gate | Result | Evidence |
| --- | --- | --- |
| G1 Static | PASS with a pre-existing note: lint 0 errors (3 old warnings), typecheck, build, `migration-check` all clean; `npm audit` reports 1 critical in `next` 16.0 to 16.4 (also on main, no dependency changed by this diff); no secrets or debug leftovers in the diff | `g1-lint.txt`, `g1-typecheck.txt`, `g1-build.txt`, `g1-migration.txt`, `g1-audit.txt` |
| G2 Automated tests | PASS for API and web unit and Postgres integration; e2e passes except for failures caused by the missing Tailwind CDN (see below) | `g2-unit.txt`, `g2-targeted-unit.txt`, `g2-integration-pg.txt`, `g2-mutation.txt`, `g2-e2e-new-repeat3.txt` |
| G3 Functional (real browser) | PARTIAL: flows run in Playwright against the web app with route-mocked `/v1` (the only mode the config allows without a full stack); real-data walk BLOCKED (reCAPTCHA) | `g2-e2e-new-repeat3.txt` |
| G4 UI fidelity | BLOCKED (no Tailwind, pages are unstyled; no comparison with Stitch 19 is meaningful) | `g8-e2e-full.txt` |
| G5 UX | PARTIAL: states, copy, quiet decline, status messages and focus are asserted by passing e2e; 44 px targets and visual check BLOCKED | e2e output |
| G6 Accessibility | PARTIAL: axe passes on every state except where it flags target size on the unstyled page; keyboard flow test passes; contrast, 200 % zoom BLOCKED | e2e output |
| G7 Non-functional | Security and reliability PASS at API level; Lighthouse and Web Vitals BLOCKED | `g2-targeted-unit.txt`, `g2-integration-pg.txt` |
| G8 Regression | PASS for app-shell and invite-compose e2e; other failing specs are the Tailwind-missing environment failures, same cause | `g8-e2e-full.txt` |

## Commands I ran and results

- `npm run lint`: exit 0, 3 warnings (pre-existing files).
- `npm run typecheck`, `npm run build`: clean. `npm run migration-check`: "Everything's fine".
- `npm run test:unit`: 3 failed, 580 passed. The failing files are the browser tests that need the CDN (`v2-responsive.test.ts` timed out at 360 s waiting for it; the others match the developer's note, `ank-148-fix`, `photo-rules`). Same on main per the handoff; not caused by this story.
- Targeted: `invite-inbox.test.ts`, `invites.test.ts`, `invite-inbox-page.test.ts`, `member-route.test.ts`, `app-shell.test.tsx`: 5 files, 88 tests passed.
- Postgres integration `operator-config.migrate.test.ts`: 16 of 16 passed, including the Stories 4.4/4.5 transaction test (accept, quiet decline, parallel accepts, one conversation per invite, `invite_quota` unchanged).
- E2E, `invite-inbox`, `invite-compose`, `app-shell`, `--repeat-each=3`, run with `E2E_ALLOW_ERRORS` for the CDN host only: 162 passed, 15 skipped (project-conditional), 9 failed. All 9 failures are in two tests, in all three repeats, deterministic (no flake):
  - AC 4.4-1 test: asserts every inbox button is at least 44 px; got 33. Every button carries `min-h-[44px]` (a Tailwind class), so with no Tailwind CSS the height collapses.
  - "sender no longer available" test: axe `target-size` on "Refuser discrètement" (21 px high) for the same reason.
  - These are expected to pass with the CDN (the developer reports them green with a Tailwind substitute). I could not confirm that. Not counted as pass.
- Full e2e suite: 99 passed, 25 skipped, 30 failed. The extra 28 failures are in `profile-edit-flow`, `staff-review`, `staff-shell`; the checked ones fail with "The Tailwind CDN did not load, so the Stitch screen is unstyled", axe target size, or a layout width assertion. Same environment cause, in files this story does not touch. I did not run main for a baseline; this is an inference from the error messages.

## Mutation spot-checks (G2)

Each mutation was applied to `apps/api/src/invites.ts`, the tests run, then the file restored (`git status` clean afterwards).

| Mutation | Result |
| --- | --- |
| Remove the declined-resend guard (FR-043) | AC 4.5-2 test fails. Protected. |
| Drop the recipient-only check on accept/decline | AC 4.5-4 test fails. Protected. |
| Stop writing `sister_accepted_at` on accept | Memory-store unit tests still pass (13 of 13); the Postgres integration test fails. Protected only by the Postgres test. See finding 3. |

## Verification matrix

| ID | Criterion or check | Expected | Actual | Result | Evidence |
| --- | --- | --- | --- | --- | --- |
| 4.4-1 | Pending Brother-sent invite on Received shows marital status and polygamy intent before accept | Both shown | API test and e2e assert the values and labels | PASS (styled 44 px assertion pending, see above) | unit, e2e |
| 4.4-2 | Sent shows pending, accepted, declined; declined has no guilt copy | Date and pill only | API and e2e assert exact row text, no receipt, timer or guilt line | PASS | unit, e2e |
| 4.4-3 | Report reason `misrepresented marital status` available | Available once Report API exists | Not built; deferred to Story 8.5 by the developer and spec | NOT TESTED (spec defers) | spec interpretation notes |
| 4.5-1 | Accept opens `conversation`, stage `chat`, via `ChatPort.openFromInvite` | One conversation | API, static "only chat.ts inserts" test, Postgres test | PASS | unit, integration |
| 4.5-2 | Quiet decline: no Chat, sender sees declined without receipt, no resend | As stated | API (403 `invite_declined`), Postgres, e2e (no dialog, one POST) | PASS | unit, e2e |
| 4.5-3 | Sister-sent invite accepted by Brother opens Chat | Conversation, consent = send time | API test passes; field value only enforced by Postgres test | PASS | unit, integration |
| 4.5-4 | No thread on a pending invite he sent | `/v1/conversations` empty, sender accept 403 | API test | PASS | unit |
| AUTH | No session, staff, mahram, non-party, bad id, sender acting | 401 / 403 / 404 / 403 | API test; mutation M2 proves it protects | PASS | unit, mutation |
| EDGE | Unavailable sender, accepted cannot decline, crossing invites, parallel accept/decline, double submit | Consistent | API, Postgres and e2e tests | PASS | unit, integration, e2e |
| EDGE | Empty, loading, load error with retry, tab hash, keyboard tabs | As spec | e2e tests pass | PASS | e2e |
| PRIVACY | No read time, decision time or `sister_accepted_at` in responses; blur photo only | None exposed | API key-scan test | PASS | unit |
| BILLING | No BillingPort call or quota write | None | Static test and Postgres count | PASS | unit, integration |
| HEADERS | `Cache-Control: no-store` on invites routes | Present | `no-store` present in `invites.controller.ts` and `conversations.controller.ts` (source read; not checked on a live response) | PASS (static) | source read |
| XSS | Pseudonym rendering | Text, not HTML | `invite-inbox-page.ts` has no `innerHTML`/`insertAdjacentHTML` | PASS (static) | grep |
| UI | Widths 360 to 1440, Stitch 19 fidelity, 44 px, contrast, 200 % zoom | Matches | Cannot run unstyled | BLOCKED | n/a |
| PERF | LCP, CLS, INP, request pattern | Budgets | Needs CDN and Lighthouse | BLOCKED | n/a |
| REAL | Two real accounts through the docker stack | Full walk | reCAPTCHA unreachable from the container | BLOCKED | n/a |

## Findings

| # | Severity | Gate | Steps | Expected | Actual | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Minor (accepted risk) | G3 | B and S send an invite to each other in the same instant | One pair, one conversation | The `invite_received` check is read-then-write, so both can be created pending and each can be accepted into its own conversation. Documented by the developer (handoff 7.5). Recommend a pair-level unique index or lock | handoff 7.5, `invites.ts` ~600 to 614 |
| 2 | Minor (pre-existing) | G1 | `npm audit --omit=dev --audit-level=high` | No high or critical | 1 critical in `next` 16.0 to 16.4; not introduced here, but the owner should plan the upgrade | `g1-audit.txt` |
| 3 | Minor | G2 | Mutation: stop writing `sister_accepted_at` | A unit test fails | Only the Postgres test fails; the memory-store tests do not assert the value for AC 4.5-3 | `g2-mutation.txt` |
| 4 | Info | Spec | AC 4.4-3 | Report reason exists | Not built, deferred to Story 8.5; the orchestrator must keep it on the 8.5 list | spec |

Open `known-issues.ts` entries this run relied on: favicon 404, no API behind `/v1` in web-only runs, and four reCAPTCHA third-party entries. I added no entry; `E2E_ALLOW_ERRORS` (the file's own mechanism) covered only `cdn.tailwindcss.com` and "tailwind is not defined".

## Not tested and why

Environment limitations (not product failures); a live check on the owner's machine with normal network must confirm:

1. `npm run test:e2e` full green with the Tailwind CDN reachable, in particular the two failing inbox tests (44 px targets, axe target size on "Refuser discrètement") and `fits every factory width on each tab`.
2. Visual match to Stitch `19-invite-inbox` at 360, 390, 768, 1024, 1280, 1440 on all three tabs, and no overflow when styled.
3. Contrast, focus visibility and 200 % zoom on the styled page.
4. Lighthouse mobile and Web Vitals on `/invitations`.
5. The real-data walk on `docker compose` at `http://localhost:4012`, with two real accounts (reCAPTCHA needs Google): handoff cases 1 to 19, plus the `no-store` header on `GET /v1/conversations`, and a slow-network (3G) load of the inbox.
6. `compose.test.ts` and the docker stack build were not run (TLS interception on `npm ci`, per the handoff).
