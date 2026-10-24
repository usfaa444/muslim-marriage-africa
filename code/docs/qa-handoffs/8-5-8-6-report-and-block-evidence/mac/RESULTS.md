# Live QA on Faycal's Mac: Stories 8.5 + 8.6 (Report, Block, Membres bloqués / Unblock)

Date 2026-10-24 (UTC 01:20–01:50). Branch `factory/report-block` at `94f9aaf`. Stack `ankanu-local` on http://localhost:4012, left running.

**Verdict: PASS.** No blocker, critical or major finding in this story. One minor visual finding (D1). The Paramètres page has accessibility and target-size violations that are already on `main` and are not in this story's card (D2).

## 1. Deploy

| Step | Result |
|---|---|
| `git fetch`, `checkout factory/report-block`, `pull` | at `94f9aaf`, up to date |
| `npm ci` in `code/` | OK |
| `up -d --build --wait` | all 6 services healthy (api, web, worker rebuilt; postgres, redis, bucket kept) |
| `drizzle-kit migrate` | applied; `report`, `moderation_case`, `block` exist (0024) |
| `curl /` and `/v1/health` | 200, `{"status":"ok"}` |
| Evidence bucket | not recreated: no `down` happened, and uploads worked (ID, selfie, photos 201) |
| `npm run test:integration` | not run (stack up, per config) |

Environment note: the first `up --build` hung for 15 minutes on `load metadata for docker.io/library/node:24.21.0`. The cause was `docker-credential-desktop get` blocking on the macOS keychain (the screen was probably locked). I built with a temporary `DOCKER_CONFIG` that has no `credsStore` (anonymous pulls). `~/.docker/config.json` was not changed.

## 2. E2E

| Run | Result |
|---|---|
| `E2E_BASE_URL=http://localhost:4012 npm run test:e2e` | **44 passed, 0 failed, 178 skipped.** `report-block.spec.ts` and `blocked-list.spec.ts` skip on a stack because they are stub-based. `e2e-fullstack.txt` |
| `npm run test:e2e` (web-only, port 3100, real CDN and fonts, no `E2E_ALLOW_ERRORS`) | **184 passed, 2 failed, 36 skipped.** report-block + blocked-list: 19 passed, 5 skipped, **0 failed**. `e2e-webonly.txt` |

The 2 failures are `chat.spec.ts:289` « AC 5.1-1 … day separators » on mobile and on desktop. The test expects « Hier » and got « 22 octobre ». This is the known clock-dependent test (run just after midnight in Ouagadougou), already listed in the handoff, section 7. It is **chat, not report, block or the blocked list**, and it is a test defect.

## 3. Styled checks (Playwright, real Tailwind CDN, Google Fonts, Material Symbols)

On every page: `window.tailwind` was defined and `document.fonts.check('24px "Material Symbols Outlined"')` was true. I ran axe with the tags wcag2a, wcag2aa, wcag21a, wcag21aa and wcag22aa. Targets were measured with `getBoundingClientRect`, and a radio or checkbox counts by its label. Data is in `live-qa.json` and the screenshots are in `shots/<screen>-<width>.png`.

| Screen | Widths | H-scroll | Targets < 44×44 | axe serious/critical | Console |
|---|---|---|---|---|---|
| `/signaler/<B>` from the profile (`report-from-profile`) | 360 390 768 1024 1280 1440 | none | 0 | 0 | 0 |
| `/signaler/<B>?discussion=…&message=…` from chat (`report-from-chat`) | all 6 | none | 0 | 0 | 0 |
| Thread after the Block, closed (`thread-closed-A`) | all 6 | none | 0 | 0 | 0 |
| Paramètres card « Membres bloqués » (`settings-card-crop`, axe scoped to the card) | all 6 | none | card link 262×91 (360) to 646×52 (768+) | 0 | 0 |
| Paramètres, whole page (`settings-card`) | all 6 | none | 5 elements outside this story (D2) | 2 rules, outside this story (D2) | 0 |
| `/settings/bloques` list (`bloques-list`) | all 6 | none | 0 | 0 | 0 |
| `/settings/bloques` with the confirmation open (`bloques-confirm`) | all 6 | none | 0 | 0 | 0 |
| `/settings/bloques` empty (`bloques-empty`) | all 6 | none | 0 | 0 | 0 |

Console errors across all pages and walkthrough contexts: **0**. Copy was French everywhere (`lang` is fr), with the exact strings from the handoff.

Match with Stitch 23 (`design-stitch/ankanu-v2/23-report-block/screen.png` vs `shots/report-from-chat-1280.png`): **match**. The back link, shield badge, eyebrow, serif h1, intro, « Profil concerné » chip, the nine reason cards with check icons in Stitch order, the details textarea and placeholder, the Block box (checked) with its text, the navy submit with the send icon and the underlined cancel link are all present. Every deviation is one the handoff already documents: no reason preselected, no screenshot upload, the added « Bloquer sans signaler » section, and the « Le message choisi… » note. The bottom nav floats over the middle of the full-page screenshots because it is fixed; in a real viewport it sits at the bottom (same as in 5.1/5.2).

## 4. Full-stack walkthrough (two real accounts)

Accounts were created only through the real API (`scripts/setup-pair.mjs`): `/v1/accounts` with `recaptcha_token: test-ok`, the email link and phone code read from the api log, then synthetic ID, selfie and photo uploads. A disposable moderator (`staff-cli create`, then password change and TOTP) approved both members, and both became `visibility public`. A = Brother `Issa84526`, B = Sister `Mariam85861`. A invited B, B accepted, and each sent one message. The walkthrough is `scripts/live-qa.mjs`, with UI steps at 390 px.

| # | Step | Expected | Actual | Result |
|---|---|---|---|---|
| W1 | Before: browse and profile both ways | visible | `/v1/browse` includes the other member; `/v1/profiles/<id>` 200 both ways | PASS |
| W2 | A on `/profil/<B>` → « Signaler / Bloquer le profil » | `/signaler/<B>` | href and landing `/signaler/<B>`, chip « Profil concerné : Mariam85861 (Ouagadougou) » | PASS |
| W3 | A in the thread | header « Signaler / Bloquer »; flag under B's bubbles only | header href `/signaler/<B>?discussion=<conv>`; 1 flag « Signaler ce message » (B sent 1 message, none under A's own) | PASS |
| W4 | A taps the flag | page with the message note | URL `…&message=<B's message id>`; « Le message choisi dans la discussion est joint à ce signalement. » | PASS |
| W5 | Reason « Dissimulation ou fausse déclaration de situation matrimoniale », Block left checked (default), details, submit | 201, « Signalement transmis » focused | POST body `{target_kind:'message', target_id:<msg>, reason:'misrepresented_marital_status', block:true, details}` → 201 `blocked:true, sla_hours:24`; h1 « Signalement transmis » focused; « … dans les 24 heures. » + « Ce membre ne peut plus consulter votre fiche ni vous contacter. » + « Retour aux discussions » | PASS |
| W6 | Postgres | report + case, `sla_started_at` = submit time | `report`: 1 row, `target_kind message`, `target_id` = B's message, `conversation_id` set, reason `misrepresented_marital_status`, `sla_started_at 01:42:39.721Z`. `moderation_case`: 1 row, `report_id` = that report, the same `sla_started_at`, `first_human_at` null. Click at `01:42:39.676Z`, response at `01:42:39.733Z`, so `sla_started_at` falls inside the submit window. `block`: 1 row A→B. The message text is not stored in `report` (0 matches) | PASS |
| W7 | After the Block: browse, profile, both ways | hidden | `/v1/browse` excludes the other; `/v1/profiles` 404 both ways; `/profil/<other>` redirects to `/decouvrir` for A and B; `/decouvrir` does not show the other member | PASS |
| W8 | B sends in the thread (and A too) | 409, nothing stored | both 409 « Cette discussion est fermée. » `{reason:'conversation_closed'}`; the message count stays 2 | PASS |
| W9 | B invites A (and A invites B) | refused | both 404 « Ce profil n'est pas disponible. » | PASS |
| W10 | Thread UI after the Block, both sides | closed | A and B see « Ce profil n'est plus disponible. », the composer and Envoyer are disabled, and history stays readable (`walk-04-thread-closed-{A,B}-390.png`). The discussions list row shows « Profil indisponible » | PASS |
| W11 | `GET /v1/staff/metrics` (moderator) | reports block | `reports: {sla_hours:24, open:1, sla_breach:0, oldest_open_started_at:"2026-10-24T01:42:39.721Z"}` | PASS |
| W12 | `GET /v1/blocks` as A / as B | A lists B; B lists nothing | A: `count 1`, `{blocked_id, pseudonym, created_at, photo}` only; B: `count 0` (the Block on B is not revealed) | PASS |
| W13 | A: Paramètres → « Membres bloqués » | B listed | `/settings/bloques`: « 1 membre bloqué », Mariam85861, « Bloqué le 24 octobre 2026 », blurred photo (32×32 derivative shown at 54 px, `alt=""`) | PASS |
| W14 | « Débloquer » → « Annuler » | nothing changes | the confirmation heading was focused; after Annuler, focus is back on « Débloquer Mariam85861 », 0 DELETE requests, and the `block` count stays 1 | PASS |
| W15 | « Débloquer » → « Confirmer le déblocage » | Block lifted | one `DELETE /v1/blocks/<B>`, « Blocage levé pour Mariam85861. », focus on the h1, empty state, `block` count 0 | PASS |
| W16 | After the Unblock | everything back | browse includes the other and profiles are 200 both ways; `/profil/<B>` opens; the thread is no longer closed and the composer is enabled; sends from B and A are both 201 | PASS |

Not covered here (the API suites cover them): the SLA-breach flip at 24 h, mutual blocks, and the typing relay while closed.

## 5. Findings

| # | Severity | Steps | Expected | Actual | Evidence |
|---|---|---|---|---|---|
| D1 | Minor (visual) | Block a member whose pseudonym has no spaces (e.g. « Mariam85861 »), open `/settings/bloques` at 360 px | The pseudonym stays on one line or wraps at a sensible point | The name breaks mid-word, « Mariam8586 » / « 1 », because the « Débloquer » button takes the row's width (break-anywhere wrapping). At 390 px and up it fits | `shots/bloques-confirm-360.png`, `shots/bloques-list-360.png` |
| D2 | Pre-existing, outside this story | Open `/settings` at any width | — | axe: `button-name` (critical) on `#lite-mode-toggle` and `#pin-toggle`, and `color-contrast` (serious) on soft-gold text (#c9a86c on cream, 2:1) and some 60 % navy captions (4.33:1). Targets: « Retour au profil » 109×20, two toggles 44×24, « Télécharger » 102×34, « Supprimer » 95×34. The branch changes only the 8 lines of the new card in `v2-pages.ts`. Scoped to the new card, axe shows 0 violations and its link is ≥ 52 px tall | `live-qa.json` (`settings-card`), `settings-card.json`, `shots/settings-card-*.png` |

Nothing in product code was changed.

## Files

`e2e-fullstack.txt`, `e2e-webonly.txt`, `live-qa.json`, `live-qa.log`, `settings-card.json`, `shots/` (styled sweeps at 6 widths + `walk-01…09`), `scripts/setup-pair.mjs`, `scripts/live-qa.mjs`, `scripts/settings-card.mjs`. Session cookies and passwords were kept outside the repo.
