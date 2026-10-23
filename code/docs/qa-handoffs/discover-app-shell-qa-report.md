# discover-app-shell QA report

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
