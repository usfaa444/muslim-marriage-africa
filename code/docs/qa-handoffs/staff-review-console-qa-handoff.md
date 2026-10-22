# QA handoff: staff review console (human review + random pose)

- Story: `_bmad-output/implementation-artifacts/spec-staff-review-console.md` (epics Stories 2.8, 3.3, 2.6, 12.1)
- Branch: `factory/staff-review-console`, stacked on `factory/staff-mfa` (Story 12.1, PR #6). No PR opened.
- Developer: Claude (factory-dev). Nothing below says "verified" unless it was run; the self-check section has the real result lines.

## 1. What was built

### Member side: random pose on `/id-liveness`

- When the selfie step opens (selfie missing or refused) the page asks the server for a challenge: `POST /v1/verifications/liveness-challenge` (session cookie, phone OTP must be granted, else 403 `{required: 'phone_otp'}`). Answer 201 `{challenge_id, pose, pose_label, expires_at}`.
- The server picks the pose with `crypto.randomInt` from 6 fixed poses (`apps/api/src/liveness-pose.ts`), each with a French label and a pictogram (inline SVG, no network):
  - `raise_right_hand` "Levez la main droite"
  - `touch_left_ear` "Touchez votre oreille gauche"
  - `look_left` "Regardez vers la gauche"
  - `hand_on_chin` "Posez la main sous le menton"
  - `thumbs_up` "Levez le pouce"
  - `two_fingers` "Montrez deux doigts"
- Challenge: one per member (a new one replaces the old one), 10 minutes, single use. `POST /v1/verifications/liveness` must carry `challenge_id`. A missing, foreign, replaced, used or expired id gives 400 `VERIFICATION_RETAKE` with `details {field: 'challenge_id', reason: 'challenge'}`, and nothing is stored. The challenge is consumed in the same transaction as the record insert, under an account row lock. The pose id is stored on the liveness `verification_record` (`pose` column; no image data in the row).
- Pose card above the camera: "Geste demandé pour le selfie", the label, the pictogram, and "Faites ce geste face à la caméra au moment de la photo." Pressing the camera button shows a mirrored live preview inside the viewfinder and a 3-step countdown "Photo dans 3…", "2…", "1…", then takes the photo.
- If the challenge expired before the upload, the page gets a new pose and says "Le geste a expiré. Reprenez le selfie avec le nouveau geste." "Reprendre la capture" also draws a new pose.
- After a refusal, the step that must be redone shows a notice with the reason category in plain French. There is no payment prompt anywhere on this path.
  - ID: "Votre pièce d'identité n'a pas été acceptée : <reason>. Envoyez une nouvelle photo de votre pièce avec le bouton « Remplacer »."
  - Selfie: "Votre selfie n'a pas été accepté : <reason>. Reprenez le selfie en faisant le nouveau geste demandé." A new pose is shown.
- Held account (suspected minor): "Votre compte est en attente d'une vérification complémentaire. Aucune action n'est demandée pour le moment." No retake is offered: "Remplacer", the camera button, "Reprendre la capture" and "Confirmer…" are hidden and inert (round 2, F4). The API still accepts an upload from a held account and stores it as `held`; this is Story 2.6 behaviour, pinned by `id-liveness.test.ts` "holds a suspected-minor account and does not lift an existing hold". Such a capture never publishes and never lifts the hold.

### Staff side: `/staff/revue` "Revue des inscriptions"

- Server-rendered in the Story 12.1 staff shell: Stitch 52 head, staff-only badge, no member nav. The layout follows Stitch 41 (queue) and 42 (case file).
  - The page gate checks the session with the API (`GET /v1/staff/sessions/current`) on built images. A stub cookie is never trusted in production.
  - Signed-out or MFA-pending callers are sent to `/staff/connexion`. Members and Mahrams are sent to `/decouvrir`.
  - The staff home has a link card to it: "Revue des inscriptions".
- Two panes from 768 px: "Liste des fiches à examiner" and "Détails du dossier sélectionné". Below 768 px the queue sits above the case.
- Queue (`GET /v1/staff/review/queue`):
  - One row per member with anything pending: profile, bio, photos, ID or selfie.
  - Order: Premium first, then the oldest pending item.
  - "Hors délai" marks rows older than `free_review_sla_hours`.
  - Counts line: "En attente : N • Hors délai (24 h) : N • Premium : N".
- Operator: the API answers `{role: 'operator', sla_hours, counts}` only. The page shows the counts and "Les dossiers, les pièces et les décisions sont réservés aux modérateurs. Vous voyez les compteurs de la file." (AD-8)
- Case (`GET /v1/staff/review/cases/:accountId`, Moderator only, audited `moderator_review_case_view`):
  - Header: pseudonym, Premium or free, age from the date of birth, gender, account status and profile visibility.
  - ID and selfie: status, capture time, "Afficher la pièce" / "Afficher le selfie", and the pose asked (label and pictogram).
  - Evidence is fetched only on click, from `GET /v1/staff/review/evidence/:recordId`. The server decrypts it and streams it with `Cache-Control: no-store, private, max-age=0`, `Pragma: no-cache`, `nosniff`, `Content-Security-Policy: default-src 'none'` and disposition inline. The page shows it from an in-memory `blob:` URL, revoked when the case closes. There is no bucket URL and no download button.
  - Every view writes the audit event `moderator_evidence_view` `{account_id, record_id, kind, at}` before the bytes are sent. Evidence views are limited to 30 per minute per staff session, then 429 "Trop de consultations. Réessayez dans une minute."
- Photos are blurred (blur derivative). To unblur, the Moderator types a reason of 10 to 300 characters; "Déflouter" stays disabled below 10.
  - `POST /v1/staff/review/photos/unblur` writes `moderator_photo_unblur` `{account_id, asset_id, reason}` and returns a 60-second signed grant bound to that staff session.
  - The grant is read through `GET /v1/staff/review/photo?token=` (no-store).
- Decisions (`POST /v1/staff/review/decisions`, Moderator only), one form each for the ID and the selfie: "Approuver", "Refuser et demander une nouvelle prise" (with "Motif du refus") or "Mineure présumée (mise en attente)", plus "Note interne (facultative)" (max 500 characters).
  - ID reasons: Illisible / Pas une pièce d'identité / Nom ou visage différent / Pièce expirée (`unreadable`, `not_an_id`, `mismatch`, `expired`).
  - Selfie reasons: Geste demandé non fait / Pas la même personne que la pièce ou les photos / Photo d'une photo ou d'un écran / Selfie pas assez net (`pose_not_done`, `not_same_person`, `photo_of_photo`, `unclear`).
  - Approve sets the status to `granted`, then calls `publishIfEligible` in the same transaction.
  - Reject sets `rejected` with the reason.
  - Suspected minor sets the record to `held` and puts the account on the existing age hold (`status = 'held'`). She is never published.
  - A decision on a record that is no longer the latest of its kind, or no longer pending, answers 409 `REVIEW_STALE` and changes nothing.
  - Audit `moderator_verification_decision`: `{account_id, record_id, kind, decision, reason, note: 'yes'|'no'}`. The note text is never in the audit; it is stored on the row.
- Profile and photos: the existing `POST /v1/staff/cases` is reused from a form.
  - Each element is decided with "Accepter" or "Refuser".
  - If anything is refused, "Motif si un élément est refusé" is required, from a fixed list: Photo non conforme aux règles / Présentation (bio) non conforme / Informations du profil inappropriées.
- "Décisions antérieures" lists earlier ID and selfie decisions with their reason and date.
- Success line (role=status): "Décision enregistrée : Approuvé. Visibilité du profil : publiée." Errors show in a role=alert line with the API's French message.

## 2. Where

API (`code/apps/api/`):
- `src/account-schema.ts`:
  - `verification_record` gains `pose`, `decision_reason`, `decision_note`, `decided_at` and `decided_by`, plus the index `verification_record_account_kind_id` and the check `verification_record_pose_check`.
  - New table `liveness_challenge`.
- `drizzle/0020_review_console.sql` with its snapshot and journal entry (migration 21).
- `src/liveness-pose.ts` (new): poses, labels, `pickPose`, 10-minute TTL.
- `src/id-liveness.ts`, `src/id-liveness-store.ts`: challenge issue and consume, pose on the row, `pendingLatest`, `history`, `decide` (row lock + conditional update), `holdAccount`.
- `src/verifications.controller.ts`: `POST /v1/verifications/liveness-challenge`.
- `src/staff-review.ts`, `src/staff-review.controller.ts` (new): `/v1/staff/review/*`, registered in `src/app.module.ts`.
- `src/staff.controller.ts`: `GET` and `POST /v1/staff/cases` are now Moderator-only (403 `{reason: 'moderator_required'}`).
- `src/profile-review.ts`: `publishIfEligible` gates need ID and liveness `granted`.

Web (`code/apps/web/`):
- `src/staff-review-page.ts` (new): page and client script.
- `app/staff/revue/route.ts` (new).
- `src/v2-serve.ts`: `staffReviewResponse` behind `staffPageGate`.
- `src/staff-pages.ts`: `staffPage` exported, plus the home link card.
- `src/liveness-pose-ui.ts` (new): labels, pictograms and notices.
- `src/v2-pages.ts`: pose card, notices and viewfinder id on `/id-liveness`.
- `src/v2-client.ts`: `idScript` challenge, countdown, preview, retake and notices.

Tests:
- New: `apps/api/src/staff-review.test.ts`, `apps/web/src/staff-review-page.test.ts`, `apps/web/src/liveness-pose-ui.test.ts`, `e2e/staff-review.spec.ts`.
- Updated: `apps/api/src/id-liveness.test.ts`, `apps/api/src/profile-review.test.ts`, `apps/api/src/operator-config.migrate.test.ts`, `apps/web/src/v2-id-liveness.test.ts`.

No new env var. No new Stitch file is served, so the web Dockerfile and `.dockerignore` are unchanged.

## 3. How to run

Unit, integration, e2e: see `.factory/config.md`. Full-stack e2e for this story:

```bash
# fresh accounts, each one-time password is spent by the run
docker compose -p ankanu-local exec api node apps/api/dist/staff-cli.js create --email <mod-email> --role moderator
docker compose -p ankanu-local exec api node apps/api/dist/staff-cli.js create --email <op-email> --role operator   # optional
E2E_BASE_URL=http://localhost:4012 E2E_COMPOSE_PROJECT=ankanu-local \
E2E_MODERATOR_EMAIL=<mod-email> E2E_MODERATOR_ONE_TIME_PASSWORD=<printed> \
E2E_OPERATOR_EMAIL=<op-email> E2E_OPERATOR_ONE_TIME_PASSWORD=<printed> \
npm run test:e2e -- e2e/staff-review.spec.ts --project desktop
```

How the full-stack test works:
- It reads the email link and the phone code from `docker compose -p $E2E_COMPOSE_PROJECT logs api`.
- It uses Chromium's synthetic camera (`--use-fake-device-for-media-stream`, a generated test pattern) and synthetic ID bytes.
- If the stack answers 429 on a sign-in post, the test waits 61 s once and retries. All sign-in posts from one machine share `rl_auth_per_min` (10).

Run the migration first: `DATABASE_URL=postgres://ankanu@127.0.0.1:55432/ankanu npx drizzle-kit migrate` from `code/apps/api`. This story adds migration 0020.

### Manual steps for Fay (local stack `ankanu-local`, http://localhost:4012)

1. Update and start the stack as in `.factory/config.md`, "Each story". Run the migrate command: it adds migration 0020.
2. Create a Moderator (your Operator account sees counts only):
   `docker compose -p ankanu-local exec api node apps/api/dist/staff-cli.js create --email <your-moderator-email> --role moderator`
   Note the one-time password it prints.
3. Member, in a normal window:
   1. Sign up a test member and confirm the email (link in `docker compose -p ankanu-local logs api | grep 'email '`) and the phone (code in `... | grep otp`).
   2. Fill the profile, add a photo, then open the ID and selfie step.
   3. Expect the "Geste demandé pour le selfie" card with a pose and its drawing.
   4. Choose an ID photo (any test image, not a real ID), press "Activer la caméra pour la capture", do the pose during "Photo dans 3… 2… 1…", then "Confirmer et transmettre pour vérification".
4. Moderator, in a private window: open http://localhost:4012/staff/connexion and sign in with the Moderator (new password, scan the QR code, enter the code). Then:
   1. Click "Revue des inscriptions". Your member is in the list with chips (Profil, Présentation, Photos, Pièce d'identité, Selfie).
   2. Click the member. The case shows the pose asked. Press "Afficher la pièce" and "Afficher le selfie".
   3. Photo: "Déflouter" stays grey until you type at least 10 characters of reason; then the photo shows unblurred.
   4. Selfie: choose "Refuser et demander une nouvelle prise", reason "Geste demandé non fait", then "Enregistrer la décision".
5. Member: reload `/id-liveness`. Expect the red notice "Votre selfie n'a pas été accepté : le geste demandé n'apparaît pas sur le selfie…" and a new pose. Retake the selfie and confirm.
6. Moderator: reload, open the member. "Décisions antérieures" shows the refusal and the new pose is shown. Then:
   1. Approve the ID and the selfie. The chip still says "Visibilité : non publiée".
   2. Accept everything in the profile form and "Enregistrer la revue du profil". Expect "Visibilité du profil : publiée".
7. Operator: sign in with your Operator account and open `/staff/revue`. You should see the counts line and "Les dossiers… sont réservés aux modérateurs", and no list.
8. Optional, suspected minor: with another test member, choose "Mineure présumée (mise en attente)" on the ID. The member's `/id-liveness` shows the hold notice and the profile never becomes public.
9. Optional: open `/staff/revue` at phone width. The queue sits above the case, with no sideways scroll.

## 4. AC trace

| ID | Criterion (summary of the spec's wording) | How it is proven | Status |
| --- | --- | --- | --- |
| AC1 | Member with phone OTP gets a random server pose with pictogram; upload refused without a valid, unexpired, unused challenge of hers; pose stored with the record | `staff-review.test.ts` "AC1 random pose…" (3 tests: RNG over all 6 poses, 403 before OTP, missing/replaced/foreign/expired/reused → 400, pose on row; JSON limit); `operator-config.migrate.test.ts` "keeps the liveness challenge single-use…" (Postgres, parallel consume); `liveness-pose-ui.test.ts` (labels and pictograms match the API list); `v2-id-liveness.test.ts` (pose card, challenge sent, expiry → new pose); `e2e/staff-review.spec.ts` full stack (real pose card, fake camera upload 201, Moderator sees the same pose label) | Pass |
| AC2 | Queue: one case per member, Premium then oldest, SLA breach, two-pane staff shell with badge, no horizontal scroll 360–1440 | `staff-review.test.ts` "AC2 queue"; `staff-review-page.test.ts` (panes, badge, no member nav, gate); e2e web-only "a Moderator opens a case…" (width sweep 360–1440 on desktop project, axe); full-stack e2e (360 and 1440 overflow, axe); browser walk at 360 and 1440 | Pass |
| AC3 | ID, selfie, pose from a no-store staff endpoint, each view audited; photos blurred until a typed, audited reason; Operator sees no evidence, cannot unblur or decide; member, Mahram, MFA-pending and signed-out callers get 401/403 everywhere | `staff-review.test.ts` "AC3" (headers, audit before bytes, unblur grant bound to that Moderator, 30/min limit with parallel requests, every route × every caller kind, and a route pin that fails if a route is added or made non-Moderator); e2e web-only (blur, unblur disabled below 10 characters, blob URL, no client storage); full-stack e2e (Operator 403 on the case, member 403 on the queue) | Pass |
| AC4 | Approved ID, liveness and profile review plus phone OTP → public via `publishIfEligible`; any missing or rejected → hidden | `staff-review.test.ts` "AC4" (2 tests); `profile-review.test.ts` (pending ID or selfie stays unpublished); migrate test (publish on Postgres); full-stack e2e (still "non publiée" after ID and selfie, "publiée" after the profile review) | Pass |
| AC5 | Rejection shows the step to redo with its reason category; selfie retake gets a new pose; no payment; suspected minor → age hold, not published | `staff-review.test.ts` "AC5" (2 tests, incl. no "pay"/Premium text); `v2-id-liveness.test.ts` (notices, held notice, no payment wording); full-stack e2e (reject `pose_not_done` → member notice text → new pose → retake 201); migrate test (suspected minor on Postgres) | Pass |
| AC6 | Two Moderators, or a retake after the case opened → later decision 409 `REVIEW_STALE`, nothing overwritten; every decision and evidence view audited with no image data or secrets | `staff-review.test.ts` "AC6" (2 tests); migrate test (parallel decide on Postgres: one 200, one 409; stale after retake) | Pass |
| AC7 | Full local stack boots, existing e2e (incl. staging grant path) pass, console flow from capture to publish passes an e2e with a real staff session | Stack `ankanu-dev-review` built from this branch: all e2e 36 passed / 46 skipped (stub-only tests skip on a built image); staging grant unit tests in the full unit run | Pass (see 7 for the environment stand-ins) |
| NFR sec | Server authorization on every endpoint; no evidence in logs, URLs or client storage | AC3 rows; unblur token is a short signed grant bound to the staff session; e2e checks `localStorage`/`sessionStorage` empty | Pass |
| NFR a11y | axe 2.2 AA, 44 px targets, keyboard | `expectAccessible` in the web-only and full-stack e2e; radio labels, fieldsets with legends, labelled selects, focus moves to the case title | Pass (automated only; no manual screen-reader pass) |
| NFR i18n | French only | All copy French (list in 8) | Pass |
| Edge | Empty queue, error, signed out mid-session, double submit, 409 refresh | "Aucun dossier en attente."; API errors in role=alert; a 401 from any call sends to `/staff/connexion`; submit buttons disabled while posting; a 409 reloads the queue and case | Empty and 409 covered by tests; double submit and mid-session 401 by code review only |

## 5. Test cases for QA

1. Selfie upload without `challenge_id`, with another member's, with a replaced one, or after 10 minutes → 400 `VERIFICATION_RETAKE` `reason: 'challenge'`. Reusing a consumed id → 400.
2. `POST /v1/verifications/liveness-challenge` before phone OTP → 403. Signed out → 401.
3. Operator: `GET /v1/staff/review/queue` → 200 counts only. Case, evidence, unblur, photo and decisions → 403. `GET`/`POST /v1/staff/cases` → 403 `moderator_required`.
4. Member, Mahram or MFA-pending staff cookie on any `/v1/staff/review/*` → 403. No cookie → 401.
5. 31st evidence view in one minute by one staff session → 429.
6. Unblur with a 9-character reason → 400 "Saisissez un motif de 10 à 300 caractères.". 10 characters → 201. The token from another staff session → refused.
7. Reject without a reason, or with an ID reason on the selfie → 400.
8. Two Moderators decide the same record → one 200, one 409. Moderator opens the case, the member retakes, the Moderator decides the old record → 409.
9. Suspected minor → account `held`, record `held`, member sees the hold notice, never public, even after the other approvals.
10. Approve ID and selfie with the profile review pending → still not public. Profile review approved → public.
11. `/staff/revue` with no cookie → 303 to `/staff/connexion`. With a member session → 303 to `/decouvrir`. With a stub `staff` cookie on a built image → `/staff/connexion`.
12. Width sweep 360 / 390 / 768 / 1024 / 1280 / 1440 on `/staff/revue` with a case open: no horizontal scroll; two panes from 768 px.
13. Check `audit_event` rows for the four actions: no image bytes, no note text, no token.

## 6. Out of scope

- Audio for poses (Mooré/Dioula).
- Automatic face matching or a vendor.
- Reports or flag cases on Stitch 41 (this console handles registration review only).
- Bulk export.
- Lifting the age hold (existing Story 2.6 path).

## 7. Assumptions, decisions and known issues

Decisions where the spec and the existing code disagreed (AD-8, AD-9, AD-13, AD-17):
- **Publishing needs `granted` (AD-13).** Before this story, `publishIfEligible` accepted a `pending` ID or selfie as passed. It now needs `granted`, so a pending capture never publishes. 8 existing tests that expected pending→public or a selfie without a challenge were updated to the new rule; none were skipped. `profile-review.test.ts` gained an assertion that pending stays unpublished.
- **`/v1/staff/cases` is Moderator-only (AD-8).** It used to accept any staff session; Operators may not decide. Metrics and the staging grant are unchanged.
- **Unblur (AD-9)** is an audited, 60-second signed grant bound to the Moderator's session. There is no lasting unblurred URL.
- **Route name.** The challenge route is `/v1/verifications/liveness-challenge`, not `/liveness/challenge`, so it keeps the default JSON body limit instead of the 8 MB upload prefix limit. A test pins this.
- **Decision note** is stored on the record (`decision_note`). The audit only says `note: 'yes'|'no'`, so free text never lands in the hash-chained audit.
- **Rate limits.** The evidence rate limit is in-process (`takeAuthSlot`), like the auth limiter. It is exact for the single API instance in `compose.yaml`. Several API instances would each count separately.
- **Shell.** The console reuses the Story 12.1 staff shell (Stitch 52 head) with the layout of Stitch 41/42. The 41/42 HTML is not served, so the web image list is unchanged.

Sandbox stand-ins used for the self-check (none committed):
- A scratch Dockerfile pair that adds the proxy CA, because `npm ci` fails on the proxy CA here.
- A reCAPTCHA siteverify stub (`NODE_OPTIONS --require`).
- A local Tailwind CDN stand-in (precompiled CSS) mapped with Chromium `--host-resolver-rules`.
- `E2E_ALLOW_ERRORS` for blocked Google Fonts/reCAPTCHA and the app's missing `/favicon.ico`.

Known issues:
- Red on main too: `photo-rules.test.ts` (no Chromium at the fixed paths) and `compose.test.ts` (`npm ci` behind the proxy CA).
- In the browser walk, the evidence `<img>` showed a broken-image icon. The walk uploaded synthetic JPEG-signed bytes that are not a decodable picture. The full-stack e2e uses a real camera frame and the selfie displays.
- Lint: 3 warnings, all in files this story does not touch.

## 8. Self-check results (run on 2026-10-22, worktree `/home/claude/ankanu-review-console`)

- Lint, `npm run lint`: exit 0. 3 warnings, all in existing files (`v2-flow.test.ts`, `photo-rules.test.ts`, `life-pause.ts`).
- Typecheck, `npm run typecheck`: pass.
- Build, `npm run build`: pass. The web Next build passed inside the image build.
- `npm run migration-check`: "Everything's fine".
- Unit, `npm run test:unit`: `Test Files 1 failed | 69 passed | 2 skipped (72)`, `Tests 1 failed | 475 passed | 12 skipped (488)`. The one failure is the known `photo-rules.test.ts` Chromium path. The web suite re-run after the last change: 174 passed, same single known failure.
- Integration, `npm run test:integration`: `Test Files 1 failed | 4 passed (5)`, `Tests 29 passed | 2 skipped (31)`. The failure is the known `compose.test.ts` `npm ci` failure.
- E2E web-only, full suite: `64 passed`, `18 skipped`.
- E2E against the stack `ankanu-dev-review` (built from this branch, migrated, bucket created), full suite with fresh staff accounts: `36 passed (1.9m)`, `46 skipped`. This includes the 12.1 first sign-in and this story's capture-to-publish test.
- Browser walk on the stack with a real Moderator session:
  - No horizontal scroll: `queue-360 {"sw":360}`, `case-360 {"sw":360}`, `case-1440 {"sw":1440}`.
  - "Revue du profil enregistrée. Visibilité du profil : publiée."
  - No console errors except the missing favicon 404.

## 9. New French strings (for Fay)

Member (`/id-liveness`):
- The six pose labels listed in section 1.
- "Geste demandé pour le selfie"; "Faites ce geste face à la caméra au moment de la photo."; "Photo dans 3…" (then 2…, 1…).
- "Votre pièce d'identité n'a pas été acceptée"; "Envoyez une nouvelle photo de votre pièce avec le bouton « Remplacer »."
- "Votre selfie n'a pas été accepté"; "Reprenez le selfie en faisant le nouveau geste demandé."
- Reasons shown to the member:
  - "la photo de la pièce est illisible"
  - "le document envoyé n'est pas une pièce d'identité"
  - "le nom ou le visage ne correspond pas"
  - "la pièce est expirée"
  - "le geste demandé n'apparaît pas sur le selfie"
  - "le visage ne correspond pas à la pièce ou aux photos du profil"
  - "le selfie semble être la photo d'une photo ou d'un écran"
  - "le selfie n'est pas assez net"
- "Votre compte est en attente d'une vérification complémentaire. Aucune action n'est demandée pour le moment."
- "Le geste a expiré. Reprenez le selfie avec le nouveau geste."; "Le geste à faire n'a pas pu être chargé. Réessayez."

Staff:
- Page and queue:
  - "Revue des inscriptions" (title and home link); "Retour à la console"; "Chargement de la file…"
  - "File d'examen"; "Premium d'abord, puis les plus anciens"; "Aucun dossier en attente."
  - "Les dossiers, les pièces et les décisions sont réservés aux modérateurs. Vous voyez les compteurs de la file."
  - Counts: "En attente : … • Hors délai (… h) : … • Premium : …"
  - Queue chips: "Premium", "Gratuit", "Hors délai", "Profil", "Présentation", "Photos : N", "Pièce d'identité", "Selfie"; "En attente depuis le …"
- Case:
  - "Dossier d'inscription"; "Instruction du dossier"; "Sélectionnez une fiche dans la file."
  - Chips: "N ans", "Âge inconnu", "Sœur", "Frère", "Compte : actif", "Compte : retenu (contrôle d'âge)", "Visibilité : publiée / non publiée / retenue (contrôle d'âge) / masquée d'urgence"; "Date de naissance déclarée : …"
  - "Selfie avec geste"; "Geste demandé"; "Aucun geste enregistré"; "Afficher la pièce"; "Afficher le selfie"; "Envoyée le …"; "Aucune pièce envoyée."; "Aucun selfie envoyé."
  - "Chaque consultation est consignée au registre d'audit."; "Vérifiez que le geste est fait et que la personne est la même que sur la pièce et les photos."
- Decisions:
  - "Décision sur la pièce d'identité"; "Décision sur le selfie"; "Approuver"; "Refuser et demander une nouvelle prise"; "Mineure présumée (mise en attente)"
  - "Motif du refus"; "Choisissez un motif"; "Note interne (facultative)"; "Enregistrer la décision"
  - Staff reason labels: as listed in section 1.
  - Statuses: "En attente", "Approuvé", "Refusé", "Retenu (contrôle d'âge)"
- Photos and profile:
  - "Photos du profil"; "Aucune photo."; "En revue"; "Publiée"; "Principale"
  - "Motif pour déflouter (consigné à l'audit)"; "Ex. comparer avec le selfie et la pièce"; "Déflouter"; "Défloutée (consigné)"; "Photo du profil (floutée)"; "Photo du profil (défloutée pour la revue)"
  - "Profil"; the field labels (Ville, Pays, Origine, Situation matrimoniale, Polygamie, Études, Profession, Madhhab, Pratique, Projets de vie, Présentation publiée, Présentation en attente)
  - "Fiche du profil"; "Présentation en attente"; "Photo en revue N"; "Accepter"; "Refuser"; "Motif si un élément est refusé"; "Aucun refus"; the three profile refusal reasons; "Enregistrer la revue du profil"
  - "Profil approuvé le …"; "Aucune revue de profil en attente."
- History, messages and errors:
  - "Décisions antérieures"; "Aucune décision antérieure."; "Mineure présumée"; "(décidé le …)"
  - "Décision enregistrée : … Visibilité du profil : …"; "Revue du profil enregistrée. Visibilité du profil : …"
  - "Choisissez une décision."; "Choisissez un motif de refus."; "Décidez chaque élément du profil."; "La requête a échoué."; "La connexion a échoué."
- API messages: "Réservé aux modérateurs."; "Ce dossier n'est pas dans la file."; "Trop de consultations. Réessayez dans une minute."; "La pièce est indisponible."; "Saisissez un motif de 10 à 300 caractères."

## Round 2 (QA round 1 FAIL on 648dd58)

QA report: `code/docs/qa-handoffs/staff-review-console-qa-report.md` (copied from the QA worktree; evidence not copied). Each finding has a test that failed before the fix. I checked this by running the new tests against the round-1 sources.

| Finding | Fix | Test (fails without the fix) |
| --- | --- | --- |
| F1 Major: stale decision gives no message | Any refused decision (409 or other) on the ID, selfie or profile form now reloads the queue and the case, then shows the message in the `role="alert"` line, scrolled into view and focused. For 409: "Ce dossier a changé depuis son ouverture (autre décision ou nouvelle prise du membre). Votre décision n'a pas été enregistrée : le dossier a été rechargé, vérifiez son état avant de décider." Before, the reload cleared the alert. | e2e web-only "a stale decision says so in an alert, in view, and reloads the case (QA round 1, F1)" (stubbed 409); the full-stack test also decides the ID by API first, then clicks the stale form and checks the alert, its visibility and the reloaded state |
| F2: raw English enum values | The case view shows French values from the member profile's labels (`PROFILE_VALUE_LABEL`, now exported from `profile-detail.ts`): city, country, profession, marital status, polygamy, madhhab, practice, and education (Stitch 11 wording). It also shows the life-plans timeframe. | `staff-review-page.test.ts` "names every stored profile token in French…" (each API enum list must have a label); e2e "the case shows French values…" (`Célibataire`, `Ouagadougou`, no `single`) |
| F3: superseded captures listed as "En attente" | The case API returns `status: 'superseded'` for an earlier capture replaced before any decision. The page shows "Remplacée par une nouvelle prise (non examinée)". | `staff-review.test.ts` "labels a capture replaced by a retake…"; e2e "…labels replaced captures" |
| F4: held member still sees capture controls | When the ID or selfie is `held`, the page hides and disables "Remplacer", the camera button, "Reprendre la capture" and "Confirmer…", and their handlers do nothing. The API is unchanged (see section 1). The existing test "asks for a new capture when the stored photo is held" expected "Reprenez la capture.", which contradicts the hold notice, so it now checks the opposite. The test history is in a comment. | `v2-id-liveness.test.ts` "shows the age-hold notice instead of a retake…" (controls hidden, disabled, inert) and "neither asks for a new capture nor opens onboarding when the stored photo is held" |
| F5: no Retry-After, in-process counter | The evidence 429 carries `Retry-After: 60`. The counter stays in process; the restart reset is noted in section 7. | `staff-review.test.ts` "rate-limits evidence views…" (header, French message, new minute allowed) |
| F6: no `no-store` on `/v1/staff/cases` and `/v1/staff/metrics` | `Cache-Control: no-store` on `GET /v1/staff/cases`, `POST /v1/staff/cases` and `GET /v1/staff/metrics`. | `staff-review.test.ts` "answers no-store on the reused profile-review and metrics routes" |
| F7: 30 per minute not pinned | The test now uses the literal 30 (40 parallel views: 30 × 200, 10 × 429) and asserts the constant is 30. | same test |
| F8: "Request failed" on a queue failure | A 5xx or unreadable answer shows French text: queue "La file n'a pas pu être chargée. Réessayez dans un instant."; other calls "La requête a échoué. Réessayez dans un instant." The API's own 4xx messages, already French, are kept. | e2e "a queue that fails to load says so in French" |
| F9: small targets on `/id-liveness` | The controls are old, but this story changed the page, so they are fixed here. "Remplacer" is now at least 44 by 44 px; "Se connecter avec un autre compte" is at least 44 px high; the "CNIB • Passeport • Carte Consulaire" line goes from navy/60 to navy/80 for contrast. | `v2-id-liveness.test.ts` "gives \"Remplacer\" and the switch-account link 44 px targets" |
| F10: `next` audit | Old issue; left as is, as agreed. | — |

New French strings in round 2:
- "Ce dossier a changé depuis son ouverture (autre décision ou nouvelle prise du membre). Votre décision n'a pas été enregistrée : le dossier a été rechargé, vérifiez son état avant de décider."
- "La file n'a pas pu être chargée. Réessayez dans un instant."; "La requête a échoué. Réessayez dans un instant."
- "Remplacée par une nouvelle prise (non examinée)"
- Education values: "Baccalauréat / Secondaire", "Licence / Bac+3", "Master en Sciences Économiques", "Master / Bac+5", "Doctorat / Études supérieures approfondies", "Autre / Formation spécialisée". These are the Stitch 11 wording. The other values reuse the member profile labels, for example "Célibataire", "Non", "Ouagadougou".

### Round 2 self-check (2026-10-22, same worktree)

- Lint: exit 0, the same 3 warnings in files this story does not touch. Typecheck: pass. Build: pass.
- Unit, `npm run test:unit`: `Test Files 1 failed | 69 passed | 2 skipped (72)`, `Tests 1 failed | 480 passed | 12 skipped (493)`. The failure is the known `photo-rules.test.ts`.
- Integration, run with no stack up: `Test Files 1 failed | 4 passed (5)`, `Tests 29 passed | 2 skipped (31)`. The failure is the known `compose.test.ts`.
- E2E web-only, full suite: `70 passed`, 18 skipped. That includes the 16 tests of `e2e/staff-review.spec.ts` on mobile and desktop.
- E2E against a fresh stack (`ankanu-dev-review`, built from this commit, migrated, bucket created), full suite with fresh staff accounts: `36 passed (1.8m)`, `52 skipped`. The full-stack review test now includes the real stale 409.
- Browser walk on the stack with a real Moderator:
  - No horizontal scroll at 360 and 1440.
  - The profile shows "Situation matrimoniale Célibataire" and "Études Licence / Bac+3".
  - After "Mineure présumée", the member's `/id-liveness` at 390 px shows the hold notice and none of the four capture buttons (count 0 each), with no horizontal scroll.

## Round 3 (QA round 2 FAIL on 203c273: R2-1)

The updated QA report has been copied to `code/docs/qa-handoffs/staff-review-console-qa-report.md`.

| Finding | Fix | Test (fails without the fix) |
| --- | --- | --- |
| R2-1 Major: axe `serious` color-contrast 4.41:1 on the 11 px "Caméra frontale" label of `/id-liveness` | "Caméra frontale" goes from `text-deep-navy/60` to `/80`. Its sibling "Délivrée par l'Office National d'Identification (Burkina Faso)" (11 px, `/65`) also goes to `/80`. | `v2-id-liveness.test.ts` "keeps no 11 px text on the page lighter than navy/70": every 11 px class on the served page must be navy/70 or darker. The new e2e sweep below fails on the old class with "serious color-contrast … 4.41 … Caméra frontale" (checked by putting `/60` back). |

Also fixed during the sweep: when the pose service answered 5xx, the member page showed the API's English "Request failed". It now shows "Le geste à faire n'a pas pu être chargé. Réessayez." The API's French message is still shown for a 4xx. The sweep checks this text.

### Axe sweep of every touched state (serious and critical, WCAG 2.2 AA)

New web-only e2e, styled with the Tailwind stand-in: `e2e/staff-review.spec.ts`, "contrast sweep of the touched states". It runs `expectAccessible` and the overflow check at 360, 390 and 1440 on these states:
- `/id-liveness`:
  - ID and selfie steps with a pose card
  - ID refusal and selfie refusal notices
  - held notice
  - pose expired after a real fake-camera capture and upload
  - pose unavailable (challenge 503 on "Reprendre la capture")
- `/staff/revue`:
  - queue
  - case, with evidence shown from blob URLs
  - alert after a 409
  - Operator view

Results:
- All states passed with no serious or critical violation, and with no horizontal scroll.
- In my runs axe reported no icon-ligature hits. QA's run did show hits on the gold icon ligature text, because the stand-in cannot load the Material Symbols font. Those are environmental: with the real font the ligature renders as an icon, not text.
- On the stack, a real member's `/id-liveness` (pose step) gave `serious/critical []` at 360, 390 and 1440.

### Round 3 self-check (2026-10-22)

- Lint: exit 0, the same 3 warnings in files this story does not touch. Typecheck: pass. Build: pass.
- Unit: `Test Files 1 failed | 69 passed | 2 skipped (72)`, `Tests 1 failed | 481 passed | 12 skipped (494)`. The failure is the known `photo-rules.test.ts`.
- Integration, run with no stack up: `Test Files 1 failed | 4 passed (5)`, `Tests 29 passed | 2 skipped (31)`. The failure is the known `compose.test.ts`.
- E2E web-only, full suite: `72 passed`, 20 skipped.
- E2E against a fresh `ankanu-dev-review` stack built from this commit, with fresh staff accounts: `36 passed (1.8m)`, 56 skipped. The two sweep tests and the other stub tests skip on a built image.
