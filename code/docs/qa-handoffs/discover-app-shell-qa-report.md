# discover-app-shell QA report

**Round 2 verdict: PASS with caveats (see "Round 2 retest" at the end). The round 1 text below is kept as written.**

Verdict: BLOCKED (2026-10-23, cloud container, branch factory/discover-app-shell at e80d21e, web-only). No finding of blocker, critical or major severity was found in the gates that could run. The gates that need a live signed-in session or a styled page with the real CDN are not verified.

## Gate summary
| Gate | Result | Evidence |
| --- | --- | --- |
| G1 lint | PASS (exit 0, 3 pre-existing warnings) | evidence/qa/lint.txt |
| G1 typecheck | PASS (exit 0) | evidence/qa/tc.txt |
| G1 dependency audit | Non-zero exit: 1 critical (next). Not introduced by this story: package.json and lockfiles are unchanged vs f80e259. Pre-existing, raise separately | evidence/qa/audit.txt |
| G1 secrets and debug | PASS: scan of the added lines found no secrets or debug leftovers | grep of the diff |
| G2 unit | 558 pass, 3 fail (ank-148-fix "wires onboarding", photo-rules "32px play circle", v2-responsive "scrollWidth"). All three drive Chrome against pages that need cdn.tailwindcss.com (proxy 403) and match the handoff's baseline. Not re-run on main by me, so "pre-existing" rests on the failure mode (document.body.innerText undefined, timeouts) and the developer's baseline | evidence/qa/unit.txt |
| G2 e2e app-shell.spec, repeat-each=3 | PASS: 63 passed, 9 skipped (width sweep, desktop only), 0 flakes | evidence/qa/e2e-shell.txt |
| G2 mutation spot-check | PASS, source restored and verified clean. M1 nav never sets aria-current: 13 tests fail. M2 keep the removed intro sentence: 1 fails. M3 old eyebrow restored: 2 fail | run output |
| G2 integration, full-stack e2e | BLOCKED: Docker daemon starts here, but Docker Hub returns 429 for postgres:17.11 and redis:8.6.3, so the compose stack cannot be built | docker pull output |
| G3 functional, signed-in /decouvrir | BLOCKED, needs local stack. A live session needs the API (the web redirects to /auth without one) | - |
| G3 functional, rendered with mocked /v1/browse (own harness) | PASS: card to grid toggle, sentence absent, old eyebrow absent, "Faites connaissance" present, exactly 1 header, 1 footer, 1 nav on member pages, 0 nav on /auth | evidence/qa/*.png, walk-log.txt |
| G4 UI fidelity | PARTIAL. Layout, chrome position and widths checked at 360, 390, 768, 1024, 1280, 1440 with Tailwind compiled locally. Icon font and Newsreader blocked, so the icons show as ligature text. Styled comparison to screens 53 and 57 is BLOCKED, needs local stack | evidence/qa/ |
| G4 horizontal scroll | PASS: scrollWidth equals innerWidth for /decouvrir (card and grid), /settings, /invitations and /auth at all six widths | run output |
| G5 UX | Partial. Chrome does not move between views (the shell was identical between the card and grid screenshots). Real data, error, empty and slow-network states: needs local stack | - |
| G6 axe | The shared shell (header, footer, nav) has zero violations in e2e (own scoped axe) and in my whole-page runs. Whole-page axe on Discover (serious color-contrast, label-content-name-mismatch) and /settings (critical button-name on #lite-mode-toggle and #pin-toggle) is dominated by the icon-font-blocked rendering (icons appear as text) and by Stitch content the story does not touch. Needs a rerun with the real font and CDN locally | evidence/qa/walk-log.txt |
| G7 performance, security | BLOCKED/partial: Lighthouse needs the real CDN. No API change, so no new endpoints. Server-side authorization is unchanged for the data. See finding 2 | - |
| G8 regression | e2e web-only full suite not re-run by me. The developer's counts (30 failures on both main and branch, caused by the blocked CDN) are unverified | - |

## Verification matrix
| ID | Check | Result | Evidence |
| --- | --- | --- | --- |
| AC1 | The chrome is identical between single and grid | PASS in the mocked harness (screenshots and app-shell-browser.test.ts). Live data BLOCKED | decouvrir-card-*.png, decouvrir-grid-*.png |
| AC1b | The single card is pixel-identical to main | Not verified by me (developer script only) | - |
| AC2 | The "Consultation sobre" sentence is absent in both views | PASS (mutation M2 protects it) | walk-log.txt |
| AC3 | The eyebrow is renamed | PASS: "Faites connaissance" | walk-log.txt, M3 |
| AC4 | One bottom nav from screen 53, in the same order, on member pages | PASS in unit and e2e (/settings, /profile-edit, invite). Each item navigates: placeholder pages. Live /decouvrir: needs local stack | e2e-shell.txt |
| AC5 | No bottom nav on gated flows | PASS (/auth, identity, pseudonym, password-reset in e2e; /auth in my run) | e2e-shell.txt |
| AC6 | One header | PASS | e2e, walk |
| AC7 | One footer, above the nav | PASS at 6 widths (e2e sweep) | e2e |
| AC8 | Landing unchanged | PASS (e2e) | e2e |
| AC9 | Gates and tests | 3 pre-existing Chrome unit failures. Otherwise PASS | unit.txt |

## Findings
| # | Severity | Gate | Description |
| --- | --- | --- | --- |
| 1 | Minor | G1 | npm audit reports a critical next advisory. Not introduced here, needs its own ticket |
| 2 | Minor | G7 | memberGuarded renders the /invitations and /discussions shell for any non-empty, non-stub ankanu_session cookie, without validating it. The page carries no data, and /decouvrir performs its own checks, but an expired or forged cookie sees the member nav until a data call fails. Confirm that it should validate the session |
| 3 | Minor | G6 | /settings and /profile-edit have axe findings in Stitch content (button-name on two toggles), declared by the developer. The e2e scopes axe to the shell there. A ticket is needed |
| 4 | Minor | G3 | discover-page.ts loadStitch still has the Turbopack-sensitive URL candidate (developer note). Check the filters modal in the built image |

## Not tested and why: run these on the local stack (Fay's machine)
1. A signed-in member on /decouvrir at 360, 390, 768, 1024, 1280, 1440: toggle card to grid with real data several times and compare the boxes of the header, eyebrow, toolbar, toggle, footer and nav (they must not move). Compare the styled result with 57-discover and 53-barre-de-navigation (colours, Newsreader, icons).
2. The single card against main (same name, VÉRIFIÉ, photo well, buttons, Invite link to /invitations/envoyer/<id>).
3. Tap Découvrir, Invitations, Discussions, Profil: /decouvrir, /invitations, /discussions, /profil to /profile-edit with the right item current.
4. Keyboard only, plus a phone with a safe area, plus 200% zoom.
5. The filters modal (finding 4), the Lite mode and the hold state with live data, the 2+ filters URL (grid first).
6. Gated pages as a mid-onboarding member (/email-verification, /phone, /otp, /id-liveness, /onboarding, /photo-rules, /pin): header text only, no nav.
7. Signed out on /invitations goes to /auth, a stub or staff session still gets the JSON.
8. Whole-page axe on /decouvrir and /settings with the real fonts, Lighthouse mobile on /decouvrir, the API-failure state (page.route block), 3G throttle, `E2E_BASE_URL=http://localhost:4012 npm run test:e2e`, and the integration tests.


---

# Round 2 retest

Verdict: **PASS with caveats** (2026-10-23, cloud container, branch factory/discover-app-shell at 364ffe3, diff c2c5f8a..364ffe3, plus the factory's live-stack run on Fay's machine). No blocker, critical or major finding. Gates that were never run anywhere are listed under Caveats; they are not claimed as passed. If the project treats every unrun gate as BLOCKED, read this as BLOCKED only on those caveats.

## Round 1 findings, retested
| # | Finding | Round 2 result |
| --- | --- | --- |
| 4 (minor), and Fay's blocker: Filtres overlay blank, no form, no close | Fixed. The templated `new URL(..., import.meta.url)` candidate is gone from `loadStitch` (diff checked). Live stack evidence (local-stack/round-1-2-local-stack-results.md, cited, not re-run by me): form « Filtres de convenance » with 19 fields at 390 and 1280, on /decouvrir and with 2 filters, 30/30 checks pass. Here: unit, browser tests and mutation checks below | Closed |
| 2 (minor) memberGuarded does not validate the cookie | Developer says `entryRedirect` calls the API gate. Unit test "sends an expired or forged session to sign-in..." passes here (app-shell.test.tsx, 43 passed). Closed | Closed |
| 1 (minor) npm audit next critical | Still open, pre-existing, lockfiles unchanged (evidence qa2/audit.txt). Needs its own ticket | Open, accepted |
| 3 (minor) axe on Stitch content of /settings, /profile-edit | Unchanged, not in scope. Needs its own ticket | Open, accepted |

## Round 2 gates (run by me, evidence in discover-app-shell-evidence/qa2/)
| Gate | Result | Evidence |
| --- | --- | --- |
| G1 lint | PASS, exit 0, same 3 pre-existing warnings | qa2/lint.txt |
| G1 typecheck | PASS, exit 0 | qa2/tc.txt |
| G1 audit | 1 critical (next), pre-existing, same as round 1 | qa2/audit.txt |
| G1 secrets, debug | PASS: round 2 diff is 4 source files and the handoff; no secrets or debug output | git diff c2c5f8a..364ffe3 |
| G2 unit | 561 passed, 3 failed. The failures are the same three as round 1 (ank-148-fix "wires onboarding", photo-rules "32px play circle", v2-responsive "scrollWidth"), all Chrome tests that need cdn.tailwindcss.com. No new failure | qa2/unit.txt |
| G2 browser test (app-shell-browser.test.ts, real Chromium, 6 widths) | PASS, includes the new filters assertions | vitest run |
| G2 e2e app-shell.spec.ts, `--repeat-each=3` | PASS: 63 passed, 9 skipped (desktop-only sweep), 0 flakes. Needed `PLAYWRIGHT_CHROMIUM_EXECUTABLE=/opt/pw-browsers/chromium-1194/chrome-linux/chrome` (the configured browser revision is not installed here) and `E2E_ALLOW_ERRORS` for the blocked CDN, fonts and reCAPTCHA hosts, as in round 1 | qa2/e2e-shell.txt |
| G2 live-stack e2e | Cited: 44 passed, 0 failed, 86 skipped on the Docker stack, both rounds | local-stack/round-1-2-local-stack-results.md |
| G3 functional on live data | Cited from the local stack: filters open, form with 19 fields, close by button, Escape, backdrop, focus returns to Filtres, no horizontal scroll while open, 2-filter URL shows grid then screen 13 card; round 1 layout checks 36/38 (the 2 are footer vertical position following content length, as in round 1) | local-stack results |
| G4, G5 | Cited from the local stack for layout identity and bottom nav navigation. Styled comparison to Stitch screens by image was not redone by me | local-stack results |
| G8 regression | Unit suite and the story e2e above; local stack e2e 44/0 failed. No regression found | above |

## Mutation checks (product file restored after each; `git status` clean for product code)
| # | Mutation | Expected | Result |
| --- | --- | --- | --- |
| M1 | Re-add `fileURLToPath(new URL(\`../../../design-stitch/ankanu-v2/${name}\`, import.meta.url))` as first candidate in `loadStitch` | web-image test fails | FAIL as wanted: "never builds a design path from a template URL relative to import.meta.url" fails (1 failed, 7 passed). The new test catches the exact pattern that caused the blank overlay. The regex also self-checks that a plain `new URL('./fixed.css', import.meta.url)` is allowed |
| M2 | Remove the `FILTERS_CLOSE` button from the modal | tests fail | 2 fail: app-shell.test.tsx "ships the filters form ... and a close control" and the real-Chromium app-shell-browser test |
| M3 | Remove the focus return to Filtres in `closeFilters` | browser test fails | 1 fails (app-shell-browser) |
| M4 | Remove focus to the close button on open | browser test fails | 1 fails (app-shell-browser) |

## Diff review (c2c5f8a..364ffe3)
- Correctness: `closeFilters` now returns early when already hidden, so Escape on a page without the overlay open does not steal focus. The click handler for `[data-close-filters]` is delegated before the opener, fine. Escape, backdrop (existing handler) and the button all go through `closeFilters`. `loadStitch` now fails the same way as before if no candidate exists, with image path `/app/design-stitch` kept.
- Accessibility of the dialog: `role="dialog"`, `aria-modal="true"`, `aria-label="Filtres"`; close button 44x44 px (asserted in Chromium at six widths), named « Fermer les filtres », decorative SVG hidden, visible focus ring; focus moves in on open and back to the opener on close. Gaps, both minor: (a) there is no focus trap and the page behind is not `inert`, so Tab can leave the dialog to the header and nav hidden under the overlay while `aria-modal` promises otherwise; (b) axe was not run on the open dialog (see Caveats).
- Regressions: none found; the diff touches only discover-page.ts and tests.

## New findings
| # | Severity | Gate | Description |
| --- | --- | --- | --- |
| 5 | Minor | G6 | Filters dialog has no focus trap and no `inert` on the background, so keyboard focus can reach page content behind a modal overlay. Suggest a Tab wrap or `inert` on the rest of the page |
| 6 | Minor | G2 | Environment: the Playwright config expects chromium revision 1248 which is not installed in this container; QA used the installed 1194 binary via `PLAYWRIGHT_CHROMIUM_EXECUTABLE`. Not a product issue |
| 7 | Minor | G2 | The developer reports an intermittent pre-existing flake in `discover-page.test.ts` "toggles to a real grid". It did not fail in my full unit run (only the 3 CDN failures). Not caused by this story |

## Caveats (gates not run anywhere, not claimed as passed)
1. Lighthouse mobile and Web Vitals on /decouvrir: never run (needs the real CDN and fonts).
2. Integration tests (`npm run test:integration`) and `migration-check`: need Docker; Docker Hub is rate-limited here and the local-stack run did not include them. This story changes no API or database code.
3. axe-core on the open Filters dialog and whole-page axe on /decouvrir with real fonts: not run by me or by the local-stack run. The shell itself has zero axe violations in e2e.
4. Keyboard-only full flow, 200% zoom, a phone safe area and 3G throttling on the live stack: not run.
5. API-failure state (blocked `/v1/browse` with `page.route`) on the live stack: not run.
6. Live-stack results are cited from the factory's run on Fay's machine, not reproduced by me.
