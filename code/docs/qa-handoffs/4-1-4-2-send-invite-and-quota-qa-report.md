# 4-1-4-2-send-invite-and-quota QA report

Verdict: **PASS** (2026-10-23, branch `factory/send-invite`, commit `c5b3099`, QA on Claude Sonnet 5.5). No blocker, critical or major finding. Gates that could not run exactly as configured are listed under "Not tested" and each was covered by an equivalent or by automated tests.

Environment (no deployed environment exists): this container, Node 22.22 (repo pins 24.21), Docker available.
- Local web e2e (`npm run test:e2e`, port 3100): ran.
- Full stack: `docker compose up --build` could NOT run (the image build's `npm ci` has no registry access; the repo's own `compose.test.ts` fails the same way). Instead I brought up an equivalent stack: real Postgres 17.11, Redis 8.6.3 and MinIO in Docker, all 22 migrations applied with drizzle-kit, the built API (`apps/api/dist/main.js`) native, and the Next dev web on 3100 proxying `/v1`. Real HTTP and a real Chromium drove it. Harness only (no product code touched): reCAPTCHA siteverify stubbed to success by a preloaded fetch shim, ID/phone/email gate and photo moderation seeded by SQL, rate-limit config raised, Tailwind CDN replaced by Tailwind 3.4.17 compiled from the Stitch config, Google Fonts replaced by local Material Symbols / Newsreader / Plus Jakarta Sans files. Scripts are in `...-evidence/qa-scripts/`.

## Gate summary
| Gate | Result | Evidence |
| --- | --- | --- |
| G1 Static | PASS. Lint 0 errors (3 warnings in untouched files), typecheck, build, migration-check pass. `npm audit --omit=dev --audit-level=high` reports 1 critical (`next` 16.0.0-16.4.0) but package.json/lock are untouched by this commit, so not new (see finding 3). No secrets or debug leftovers in the diff (only test-fixture passwords). | g1-static.txt, g1-secrets-scan.txt |
| G2 Tests | PASS. Unit 506 passed, 1 failed (`photo-rules.test.ts` needs a system Chrome binary at hard-coded paths, unrelated). Integration: 4 files / 30 tests passed, `compose.test.ts` fails on image build (environment). New e2e `invite-compose.spec.ts` x3 repeats: 42/42 passed, no flake. Mutation checks done (below). | g2-*.txt |
| G3 Functional | PASS, 56 API checks on real Postgres plus 68 browser checks (the 1 "FAIL" in each is a QA-script artefact, see matrix notes). | g3-api-matrix.*, g3-ui-matrix.json, g3-ui-run3.txt |
| G4 UI fidelity | PASS. Six widths 360-1440, no horizontal scroll in free, wall states; matches Stitch 18 except the intended omissions (Message Flash composer 4.3, false AI line). | ui-free-*.png, ui-wall-*.png |
| G5 UX | PASS with minor notes | screenshots, matrix |
| G6 Accessibility | PASS. axe (wcag2a/aa, 21a/aa, 22aa) zero violations on free, wall, no-photo states with icon font loaded; keyboard-only send works; aria-live status; focus moves to "Ajouter une photo" on refusal; 200% zoom equivalents (640 and 180 css px) no h-scroll. | axe-*.json, ui-focus-send.png |
| G7 Non-functional | PASS with caveats (no Lighthouse run; Playwright vitals only; ZAP not configured). | g7-perf-headers.txt |
| G8 Regression | PASS. Full web e2e: 59 passed / 27 failed / 20 skipped on the branch; the base commit `e5faf53` has the identical 27 failures (same list, diffed). | g8-e2e-full.txt, g8-base-failures.txt |

## Mutation spot-checks (api unit tests, then restored; `git diff` clean)
| Mutation | Result |
| --- | --- |
| Sister branch condition inverted (`=== free_unlimited` to `!==`) | 6 tests fail (AC 4.1-4, 4.1-5, 4.2-2 ...) |
| Photo requirement disabled | AC 4.1-2 fails |
| Billing always "entitled" | 8 tests fail |
| Cap guards off by one in BOTH pre-check and store guard | 6 tests fail (AC 4.1-5, 4.2-1, parallel race, 4.2-4) |
| Store guard only off by one / pending-duplicate branch skipped | tests still pass: defence in depth, the other layer enforces the same result, equivalent mutants (Postgres guard is covered by the integration race test). Not a finding. |

## Verification matrix
| ID | Check | Expected | Actual | Result |
| --- | --- | --- | --- | --- |
| AC1 | Ready brother POSTs /v1/invites | 201 pending, on recipient's received list, sender's sent list, persisted | 201, listed, `invite` row + `invite_quota` count 1 | PASS |
| AC1 | Entry points | Discover card button and profile detail link open `/invitations/envoyer/<id>` | both open it; back and cancel return correctly | PASS |
| AC2 | No photo / pending-only photo / unlisted sender | 403 `photo_required` with message, no row, UI prompt + link, focus on link | as expected; unlisted sender 403 `viewer_not_listable` | PASS |
| AC3 | Recipient deactivated, held, pending_deletion, emergency_hidden, unpublished, visibility held, unknown, same gender | identical 404 "Ce profil n'est pas disponible.", nothing written | identical 404 each, 0 rows, 0 quota rows; UI shows unavailable block, no send button | PASS (Banned/married not representable yet, per spec note) |
| AC4 | Sister in `free_unlimited` | 5 sends all 201 uncapped, no quota row, UI "Invitations illimitées." without count or Premium line | as expected; Brother still capped in that mode. BillingPort non-call proven by unit test only | PASS |
| AC5 | Default-config Sister, 4th invite | 3x201 then 429; UI wall | 6 parallel sends: exactly 3x201 + 3x429, count 3; UI wall + disabled button | PASS |
| AC6 | Free Brother 4th | 429 `QUOTA_EXCEEDED` with `resets_at` 2026-10-24T00:00:00.000Z, `details` exactly `{reason,cap,remaining,resets_at}`, retryable false | as expected; no 4th row; pending replay at cap returns 200 | PASS |
| AC7 | Premium unlimited | no cap | not reproducible on a real stack (no billing adapter; default answers unavailable). Unit test only | NOT RUN LIVE |
| AC8/9 | Billing unavailable | Sister free_unlimited ok; default mode capped | default real stack is "unavailable": capped at 3 as required | PASS |
| AC10 | No paid ranking boost | browse untouched | unit source test passes; diff does not touch browse | PASS |
| AC11 | Fresh DB after migrations | `sister_reach_mode = same_quota_as_brothers`; missing row also defaults | confirmed on real Postgres after all migrations; deleting the row gives capped default | PASS |
| AC12 | Wall copy, one link, no pack | reset time, "Découvrir Premium" only, no pack in UI or API | exactly one `/premium` link; text matches spec; no pack/price keys in error | PASS (link 404s until Epic 10, flagged by spec) |
| E-1 | Double submit, reload, parallel same pair, double-click on slow 3G | one row, counted once | 3 parallel POSTs: 200,201,200, 1 row, count 1; throttled double-click: 1 POST; reload then resend: "Invitation déjà envoyée." | PASS |
| E-3 | Broken cap value | 500, never a free pass | 500 on read and send, no row | PASS |
| SEC | No session on 3 routes | 401 | 401 x3 | PASS |
| SEC | Staff / mahram session | 403 | covered by unit tests only, not reproduced live (staff sign-in needs MFA) | NOT RUN LIVE |
| SEC | Bodies: missing, {}, "abc", uuid v4, self, SQL, `<script>`, array, null, 100k chars, number | 400 `field: to_id` | all 400 | PASS |
| SEC | IDOR | other member sees nothing of mine; `from_id` query ignored; bad `box` 400 | as expected | PASS |
| SEC | Cache headers | `no-store` on API and page | present | PASS |
| G3 | Signed out deep link / bad id / unknown id | `/auth`, `/decouvrir`, unavailable block | as expected | PASS |
| G7 | Send network error, send 500, quota load failure, retry | handled messages, button re-enabled, retry recovers | all handled, no blank page (ui-send-network-error.png, ui-load-error.png) | PASS |
| G7 | Vitals, 360px, slow 3G + 4x CPU | LCP < 2.5 s, CLS < 0.1, ack < 2 s | LCP 400 ms, CLS 0.002, send ack 237 ms; 4 API calls on load+send, no N+1 | PASS |
| G7 | Console / network during G3 | zero unexpected errors | only the deliberately provoked 403/404/429/500 responses and blocked CDN fonts | PASS |
| G4 | Copy | spec text exactly, French; Stitch AI line dropped; typo fixes | matches | PASS |

Notes on the two "FAIL" rows in raw logs: (a) `g3-api-matrix` row "error has no pack/price keys" is a QA typo in my expected sort order; the keys are `cap, reason, remaining, resets_at` and the regex check for pack/price is clean (verified separately). (b) `g3-ui-matrix` last row lists the two intentional 404 console lines from the unavailable-recipient cases.

## Findings
| # | Severity | Gate | Description | Evidence |
| --- | --- | --- | --- | --- |
| 1 | Minor | G5 | "Découvrir Premium" targets `/premium`, which returns 404 (Epic 10). Requested by the spec decision, so accepted, but a member who hits the wall lands on a not-found page. | g3-ui-run3.txt (KNOWN row) |
| 2 | Minor | G5 | The send button stays enabled for a sender with no photo (the page shows the block and the refusal prompt on click). Matches the developer's reading of AC 4.1-2; consider disabling it. | ui-nophoto-390.png |
| 3 | Minor (pre-existing, not from this story) | G1 | `npm audit` critical on `next` 16.0.0-16.4.0 (fix 16.4.2). package.json/lock unchanged by the commit. Needs its own upgrade story. | g1-static.txt |
| 4 | Minor | G6 | With the icon font blocked axe reports icon-ligature text as low contrast (gold on cream 1.97). With Material Symbols loaded locally axe is clean. Existing pages (profile, Discover) show the same design-token pattern. Re-confirm once on a networked environment. | axe-*.json |
| 5 | Minor | G2 | New e2e specs run without Tailwind and fonts in this sandbox, so their axe and overflow assertions did not exercise real CSS (a hidden-attribute versus flex-class override would not be caught there). I checked this by hand in the browser: all `[hidden]` blocks are truly hidden. | g3-ui-matrix.json |

## Not tested and why
- Full `docker compose` image build and compose-level e2e: image `npm ci` cannot reach a registry here. Equivalent native stack used instead (above). Re-run on Fay's machine at deploy.
- Premium (entitled) live path, BillingPort non-call proof, staff and mahram session 403: no billing adapter or staff MFA in this stack; covered only by unit tests (`invites.test.ts`).
- Ouaga midnight rollover live: only the unit test (clock injected); live run showed correct `resets_at`.
- Lighthouse and OWASP ZAP: not run (ZAP not configured; Lighthouse replaced by Playwright vitals). Security headers and cookie flags are set at the edge in production and were not present on the Next dev server, so not checked.
- WebKit/mobile-profile: Chromium only (+ Pixel 7 profile in repo e2e).
- Known-issues file: `e2e/known-issues.ts` entries not changed by this story.
- Real Tailwind CDN / Google Fonts: substituted by locally built equivalents, so pixel-level fidelity vs Stitch is by eye, not a baseline diff.
