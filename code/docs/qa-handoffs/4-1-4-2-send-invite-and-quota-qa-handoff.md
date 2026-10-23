# QA handoff: Send an Invite (4.1) and the daily Invite quota (4.2)

- Story id: `4-1-4-2-send-invite-and-quota`. Spec: `_bmad-output/implementation-artifacts/spec-4-1-4-2-send-invite-and-quota.md` (epics.md Epic 4, Stories 4.1 and 4.2).
- Branch: `factory/send-invite` (from `main` at `e5faf53`). Committed locally. Not pushed, no PR, not deployed.
- Developer: Claude (factory-dev). Nothing below says "verified" unless it was run; section 8 has the real result lines.

## 0. Product decisions on 2026-10-23 (Fay), which change the story as written

1. **The Free Invite quota applies to Sisters too.** Fay: « For the invite quota, it should also apply to sisters, not only for brothers. » and « same as other restrictions like messages ... ». Rule: every Free-tier limit (the daily Invite quota now, the daily message cap FR-146 later) applies the same to Sisters and Brothers, and Premium lifts it for both.
   - The default `sister_reach_mode` is now `same_quota_as_brothers`. Migration `0021_invite.sql` flips the seeded row (`free_unlimited` to `same_quota_as_brothers`), and the code default when the row is missing is the same (`DEFAULT_SISTER_REACH_MODE`).
   - `free_unlimited` stays valid in code and in the DB check (the Story 4.7 operator switch comes later), and its behaviour and tests stay: a Sister in `free_unlimited` is uncapped and her send path never calls `BillingPort`.
   - The only gender branch in the quota logic is that existing `sister_reach_mode` switch.
   - This supersedes the `free_unlimited` default in epics.md, PRD FR-045/FR-145, AD-27, SOLUTION-DESIGN and EXPERIENCE.md. Those documents were not rewritten. There is an amendment line in `docs/pipeline-status.md`.
2. **Free or Premium, nothing in between.** Fay: « ... there is no such thing as buying a pack of just a couple of messages or invites. The only option shown will be the subscription page... »
   - The quota wall shows the reset time and one link, « Découvrir Premium ».
   - No API response names a pack, a price or a count to buy.
   - This supersedes « offered the pack purchase » (FR-044 AC 1) and the « reach-pack / pack-card CTA » wording in EXPERIENCE.md.
3. **Premium is one monthly subscription** (no 3 or 6 months). Renewal is a payment prompt, never an automatic debit, and unpaid Premium pauses the perks. This is for Epic 10. Here it only means that no copy names a pack or a duration. There is no billing code in this story. It is recorded in `docs/pipeline-status.md`.

## 1. What was built

### API (all under `/v1`, member session cookie, `Cache-Control: no-store`)

**`POST /v1/invites`** with body `{ "to_id": "<uuid v7>" }`. The checks run in this order, and nothing is written when one fails:

1. Viewer gate (the existing `assertBrowseViewer`):
   - No session: 401.
   - Staff session: 403 `staff_session`. Mahram session: 403 `mahram_session`.
   - A sender whose own profile is not public and Active: 403 `viewer_not_listable`.
2. Body: `to_id` missing, not a UUID v7, or the sender's own id: 400, `details: { field: "to_id" }`, message `to_id : valeur non reconnue.`
3. Sender readiness:
   - No live MAIN Profile Photo: 403 `FORBIDDEN`, `details: { reason: "photo_required" }`, message **« Ajoutez une photo de profil pour envoyer une invitation. »**
   - Invite-ready fields missing: 403, `details: { reason: "profile_incomplete", missing: [...] }`, message **« Complétez votre profil pour envoyer une invitation. »**
4. Recipient must be a `member` account of the opposite gender, Active, with a `public` profile.
   - Anything else (deactivated, held, pending deletion, emergency-hidden, unpublished, same gender, unknown id) gets one 404 `NOT_FOUND` « Ce profil n'est pas disponible. » (the same body as the profile read).
5. A pending Invite from this sender to this recipient already exists: 200 with that Invite. No second row, no count. A double submit is safe.
6. Quota (below). Over the cap: **429 `QUOTA_EXCEEDED`**, message **« Envoi refusé. Quota du jour atteint. »**, `details: { reason: "invite_quota", cap, remaining: 0, resets_at }`, `retryable: false`. There is nothing pack-specific in the error.
7. Persist: one transaction does a guarded `invite_quota` upsert (`sent_count < cap`), then inserts the `invite` (`state = pending`). Two parallel sends cannot both take the last slot. Answer: **201** `{ invite: { id, to_id, state, created_at }, quota }`.

**Quota predicate.** One function serves both send and read. It reads `operator_config` on every call, with no cache.

| Sender | Mode | BillingPort | Body |
| --- | --- | --- | --- |
| Sister | `free_unlimited` | never called | `{ capped: false, sister_reach_mode: "free_unlimited" }` |
| Sister | `same_quota_as_brothers` (default) | `isEntitled` | like a Brother, plus `sister_reach_mode: "same_quota_as_brothers"` |
| Brother | any | `isEntitled` | `true` gives `{ capped: false, unlimited: true }` (`brother_invite_quota_premium = unlimited`). `false`, `unavailable` or a thrown error give `{ capped: true, cap, remaining, resets_at }`, with `cap` = `brother_invite_quota_free` (seed 3) |

- The day is the `Africa/Ouagadougou` civil day. `resets_at` is the next Ouagadougou midnight in UTC ISO. Ouagadougou is UTC+0, so this is `YYYY-MM-DDT00:00:00.000Z`.
- `invite_quota` is written only on a quota-class send. Premium sends are counted but never refused.
- A Sister send in `free_unlimited` writes no count. If the mode then switches, the earlier sends that day do not count toward the new cap (AD-27).
- A broken cap value in `operator_config` gives 500, never a free pass. A missing `sister_reach_mode` row means `same_quota_as_brothers`.

**`GET /v1/invites/quota`** returns the same body plus `sender: { photo, profile_ready }`. The viewer gate is the same as for the send.

**`GET /v1/invites?box=received|sent`** (default `received`): `{ box, count, items: [{ id, state, created_at, from_id | to_id, pseudonym }] }`, newest first, own rows only. Any other `box` gives 400 `box : valeur non reconnue.` This is the minimal list behind the AC « appears on the recipient's received list ». The real inbox is Story 4.4.

**`InvitesPort.sentCountSince`**, used by the T&S visit signals, now counts real invite rows by UUID v7 time instead of always returning 0.

### Web

**`/invitations/envoyer/<id>`** is Stitch screen 18 (`18-invite-compose-flash`), without the Message Flash composer and Ice Breakers (those are Story 4.3).

- Route guard: signed out goes to `/auth`. The onboarding steps redirect as on other member pages. Staff or mahram get the member-route 403. A non-UUID id goes to `/decouvrir`.
- The page loads `GET /v1/profiles/<id>` and `GET /v1/invites/quota` in the browser, then shows:
  - The back link « Retour au profil de <pseudo> ».
  - Recipient « À l'attention de : <pseudo>, <âge> ans • <ville> », with the « Profil engagé & vérifié » pill when ID and liveness are both granted.
  - Photo precondition. With a photo: « Condition préalable : Photographie de profil conforme enregistrée. » / « Conforme ». Without one: « Condition préalable : une photographie de profil est requise. », « Ajoutez une photo de profil pour envoyer une invitation. » and a link « Ajouter une photo » to `/profile-edit`.
  - Profile incomplete: « Condition préalable : profil incomplet. », « Complétez votre profil pour envoyer une invitation. » and a link « Compléter mon profil ».
  - The Wali protocol note.
  - « Disponibilité journalière », in one of these states:
    - Free: « Invitations libres restantes aujourd'hui : N invitation(s) disponible(s) », the pill « Invitations restantes aujourd'hui : N », « Invitations illimitées pour les abonnements engagés. » and « Vous voulez des invitations illimitées ? Abonnez-vous ! »
    - Premium: « Invitations illimitées (Premium). » only.
    - Sister in `free_unlimited`: « Invitations illimitées. » only. No count and no Premium line.
  - **Quota wall** (`role=alert`). It shows when remaining is 0, or after a `QUOTA_EXCEEDED` answer: « Envoi refusé. Quota du jour atteint. », « Nouvelles invitations demain à partir de 00:00 (heure de Ouagadougou). », « Avec Premium, invitations et messages illimités. » and one link « Découvrir Premium » to **`/premium`**. The send button is disabled.
  - The send button « Envoyer l'invitation Ta'aruf ». It is disabled while loading and while a send is in flight. Success shows the status « Invitation envoyée. » and the button becomes « Invitation envoyée » (disabled). A 200 replay shows « Invitation déjà envoyée. »
  - Errors: 404 « Ce profil n'est pas disponible. » with « Retour à Découvrir ». A load error shows « Chargement impossible. Vérifiez votre connexion et réessayez. » with « Réessayer ». A send network error shows « Envoi impossible. Vérifiez votre connexion et réessayez. » and the button is enabled again. A 403 `photo_required` shows the no-photo block and the server message, and moves focus to « Ajouter une photo ».
  - « Annuler et revenir au profil ».
- **Discover card**: « Envoyer une invitation Ta'aruf » (now `data-card-invite`, was the inert `data-later="invite"`) opens `/invitations/envoyer/<card id>`.
- **Profile detail**: the same button is now a link to `/invitations/envoyer/<id>`.
- The Stitch line « Transmission chiffrée et immédiate. Aucune intelligence artificielle n'interfère dans vos échanges. » was dropped on purpose. It is false under passive AI moderation (D6).

### New French strings (for Fay)

« Votre démarche sera transmise dans la solennité et le respect des convenances. », « Chargement… », « Ce profil n'est pas disponible. » (existing), « Retour à Découvrir », « Chargement impossible. Vérifiez votre connexion et réessayez. », « Réessayer », « Retour au profil de <pseudo> », « Condition préalable : une photographie de profil est requise. », « Ajoutez une photo de profil pour envoyer une invitation. », « Ajouter une photo », « Condition préalable : profil incomplet. », « Complétez votre profil pour envoyer une invitation. », « Compléter mon profil », « Invitations libres restantes aujourd'hui : N invitation(s) disponible(s) », « Invitations restantes aujourd'hui : N », « Invitations illimitées. », « Invitations illimitées (Premium). », « Envoi refusé. Quota du jour atteint. », « Nouvelles invitations demain à partir de 00:00 (heure de Ouagadougou). », « Avec Premium, invitations et messages illimités. », « Découvrir Premium », « Invitation envoyée. », « Invitation envoyée », « Invitation déjà envoyée. », « Envoi impossible. Vérifiez votre connexion et réessayez. », `to_id : valeur non reconnue.`, `box : valeur non reconnue.`

Kept from Stitch, with small fixes: « L'envoi de demande est permis » (was « permise »), « si l'un d'entre vous l'a inclus à la conversation » (was « inclu a »), and « Vous voulez des invitations illimitées ? Abonnez-vous ! » (French spacing).

## 2. Where

- Migration: `code/apps/api/drizzle/0021_invite.sql` (+ `meta/0021_snapshot.json`, `_journal.json`).
  - Tables `invite` and `invite_quota`.
  - Partial unique index: one pending Invite per pair.
  - Checks: state, no self-invite, `sent_count >= 0`.
  - Plus the `sister_reach_mode` UPDATE.
- API:
  - New: `apps/api/src/invites.ts`, `invites.controller.ts`.
  - Changed: `account-schema.ts`, `app.module.ts`, `invites-port.ts`, `operator-config.ts` (`DEFAULT_SISTER_REACH_MODE`), `public-profile.ts` (`loadAccount` exported).
- Web:
  - New: `apps/web/src/invite-compose-page.ts`, `apps/web/app/invitations/envoyer/[id]/route.ts`.
  - Changed: `v2-serve.ts`, `entry-guard.ts`, `discover-page.ts`, `profile-detail.ts`.
  - Docker: `apps/web/Dockerfile` and `code/.dockerignore` (Stitch 18 copied into the image).
- Tests:
  - New: `apps/api/src/invites.test.ts`, `apps/web/src/invite-compose-page.test.ts`, `e2e/invite-compose.spec.ts`.
  - Changed: `operator-config.migrate.test.ts`, `discover-page.test.ts`.
- Docs: the spec, `docs/pipeline-status.md` (amendment lines) and this handoff.
- No new env vars and no feature flags.

## 3. How to run

From `code/`:

- `npm run lint`, `npm run typecheck`, `npm run test:unit`, `npm run test:integration` (Docker), `npm run migration-check`.
- `npx vitest run --config vitest.unit.config.ts apps/api/src/invites.test.ts apps/web/src/invite-compose-page.test.ts`
- `npm run test:e2e -- e2e/invite-compose.spec.ts` (web-only, stub cookie, API mocked by `page.route`).

Full stack (config.md, Local deployment): `up -d --build --wait`, then run **the migrate command again** (0021 is new). Then:

1. Make two disposable members: a Brother and a Sister. For each, publish the profile, add a photo approved by a Moderator in `/staff/revue`, and get phone, ID and liveness granted.
2. As the Brother, open the Sister's card on `/decouvrir` and press « Envoyer une invitation Ta'aruf ».
3. Send. Then, as the Sister, call `GET /v1/invites?box=received`.
4. To test the cap, prepare 4 recipients of the opposite gender.
5. To test `free_unlimited`:

   ```sql
   update operator_config set value = 'free_unlimited' where key = 'sister_reach_mode'
   ```

   There is no operator UI before Story 4.7. Put the value back to `same_quota_as_brothers` afterwards.
6. Billing: the default `BillingPort` answers `unavailable` (no billing yet), so every quota-class member is Free on a real stack. Premium can only be exercised in the unit tests, through `setBillingPort`.

## 4. AC trace table

| ID | Criterion | How it is proven | Status |
| --- | --- | --- | --- |
| 4.1-1 | Given I have a Profile Photo and Invite-ready fields, when I POST `/v1/invites`, then it appears on the recipient's received list | `invites.test.ts` « AC 4.1-1 … received list » (201 body, row, quota row, `GET ?box=received` for the recipient, `sent` for the sender, the sender's own received list empty, bad box 400). Postgres: `operator-config.migrate.test.ts` « stores invites … » (list received / sent). e2e « a Free member … sends once » | Pass (run) |
| 4.1-2 | Given I have no Profile Photo, when I try to send, then the action is blocked with a prompt to add a Photo | `invites.test.ts` « AC 4.1-2 » (403 `photo_required`, French message, no row or count, no BillingPort call, quota `sender.photo=false`, a pending-only photo also refused). Web: e2e « no Profile Photo … » (precondition block, « Ajouter une photo » to `/profile-edit`, refused send shows the message and focuses the link) | Pass (run) |
| 4.1-3 | Given the recipient is deactivated, Banned, or married, when I submit, then the Invite is rejected | `invites.test.ts` « AC 4.1-3 »: deactivated, held, pending_deletion, emergency_hidden, visibility held, unpublished, same gender and unknown id all give the same 404; self and bad bodies give 400; no rows. **Interpretation:** Banned and married have no state yet (bans are Epic 8, marriage outcomes Epic 9). They will leave the account non-Active or the profile non-public, and the same predicate then rejects them | Pass (run), flagged |
| 4.1-4 | Given I am a Sister and `free_unlimited`, when I send my Nth Invite, then it is not blocked by a paid quota and I am not asked to buy a pack, and the send path does not call `BillingPort` | `invites.test.ts` « AC 4.1-4 and 4.2-3 »: 6 sends all 201 with `{capped:false, sister_reach_mode:'free_unlimited'}`; quota GET the same; `billingCalls === 0`; no `invite_quota` row; repeated with billing `false`, `unavailable` and throwing. Web e2e « a Sister in free_unlimited … »: no count, no Premium or pack line | Pass (run) |
| 4.1-5 | Given I am a Sister in `same_quota_as_brothers` with no pack, when I send a 4th Invite the same Ouaga day, then `QUOTA_EXCEEDED` with the reset time | `invites.test.ts` « AC 4.1-5 » (3 × 201, 4th 429 with `resets_at` 2026-10-24T00:00Z, 3 rows, quota GET remaining 0 with `sister_reach_mode`). Also the default-config test (decision 1) | Pass (run) |
| 4.2-1 | Given I am Free and already sent 3 today, when I send a fourth, then `QUOTA_EXCEEDED` with the Ouaga-day reset time, and it is Invite-only, never the FR-146 cap | `invites.test.ts` « AC 4.2-1 » (Brother: 3 sends at 23:58, 4th 429, `details` exactly `{reason, cap, remaining, resets_at}` with no pack wording; at 00:00 Ouaga the next day it succeeds and a new day row appears). « QUOTA_EXCEEDED is Invite-only in api code » (only `invites.ts` uses it). Parallel race test: 201 + 429, count 3. Postgres guarded increment: migrate test (race, 1 ok + 1 quota) | Pass (run) |
| 4.2-2 | Given I am Premium, when I send Invites, then there is no daily cap (4th, 16th, Nth succeed) | `invites.test.ts` « AC 4.2-2 » (Brother 16 × 201 `{capped:false, unlimited:true}`, counted 16; a Premium Sister in the default mode 5 × 201). Postgres: `cap: null` charge counts past 3 | Pass (run) |
| 4.2-3 | Given billing `unavailable` and a Sister in `free_unlimited`, when I send, then success and no `BillingPort` call | Same test as 4.1-4 (loop with `unavailable` and a throwing adapter, `billingCalls === 0`) | Pass (run) |
| 4.2-4 | Given billing `unavailable` and a Sister in `same_quota_as_brothers`, when I send, then the Free cap applies; safety is not blocked | `invites.test.ts` « AC 4.2-4 » (`unavailable` and throwing: 3 × 201, 4th 429; the profile read 200 and the favourite save 201 still work) | Pass (run) |
| 4.2-5 | Given browse ranking is inspected, when MVP Premium, then no paid ranking boost (FR-111 off) | `invites.test.ts` « AC 4.2-5 »: browse, public-profile, favourites, discovery, filters, profiles controller and visit-signals sources never import `billing-port` or call `isEntitled`. Browse ranking was not touched | Pass (run) |
| D-1 | Decision 2026-10-23: the default is `same_quota_as_brothers`; a Free Sister is capped like a Brother; Premium Sister unlimited; `free_unlimited` still valid | `operator-config.migrate.test.ts` (live `sister_reach_mode = same_quota_as_brothers` after migrate; 0021 contains the UPDATE; both values accepted by the check, others refused). `invites.test.ts` « decision 2026-10-23 … » (no row means `same_quota_as_brothers`, Sister capped). Mode switch mid-day: earlier `free_unlimited` sends do not count | Pass (run) |
| D-2 | Decision 2026-10-23: at the limit, only Premium is offered; no pack; API error has the reset time and nothing pack-specific | `invites.test.ts` (details exact, no `pack/price/prix/xof`). `invite-compose-page.test.ts` (one `href="/premium"`, no « pack de / achet / recharge »). e2e « the quota wall … » (« Avec Premium … », link « Découvrir Premium » to `/premium`) | Pass (run) |
| D-3 | Decision 2026-10-23: copy names no 1/3/6-month packs | `invite-compose-page.ts` has no duration copy (grep « mois », « month »: none) | Pass (inspected) |
| E-1 | Double submit / reload | API: a second POST gives 200 with the same Invite, count unchanged; two parallel POSTs to the same pair store one row (memory) and the Postgres partial unique index refuses a second pending row (migrate test `duplicate`). Web: the button is disabled in flight and after success | Pass (run) |
| E-2 | Signed out, wrong role, another member's resource | `invites.test.ts` « refuses no session, staff, mahram and a sender who is not listable » (401 × 3 routes, 403 staff, 403 mahram, 403 `viewer_not_listable`). Lists only return the caller's own rows. Web route: `invite-compose-page.test.ts` (anon to `/auth`, staff and mahram 403, bad id to `/decouvrir`) | Pass (run) |
| E-3 | Broken config | `invites.test.ts` « a broken cap … 500 »; migrate test (`brother_invite_quota_free = 'abc'` gives null config) | Pass (run) |
| E-4 | Empty / loading / error / unavailable states (web) | e2e « an unavailable recipient … »; unit test checks the loading, retry and error copy in the page script | Pass (run) |
| NFR-a11y | WCAG 2.2 AA, 44 px targets, keyboard | e2e `expectAccessible` on the Free, wall and no-photo states (zero serious or critical). The send button is 328×68 (360 px) and 391×48 (1440 px); links and buttons have `min-h-[44px]`. Status uses `role=status`, the wall and errors use `role=alert`. Caveat: axe ran on pages without the Tailwind CDN in this sandbox (see section 7) | Pass with caveat |
| NFR-responsive | No horizontal scroll from 360 to 1440 | e2e « fits every required width » (6 widths, no CDN). Manual Playwright run with Tailwind CSS built locally from the same config at 360 and 1440: `scrollWidth == innerWidth` for the Free, wall and no-photo states | Pass with caveat |
| NFR-security | Server authorization on every endpoint; no personal data in URLs | All three routes run `requireLiveSession` + `assertBrowseViewer`. The only URL id is the recipient's opaque UUID (same as `/profil/<id>`). No email, phone or civil name in any invite body | Pass (run) |
| NFR-billing isolation | AD-21 / AD-27 | Covered by 4.1-4, 4.2-3 and 4.2-5. List and browse never call billing | Pass (run) |
| NFR-audit | NFR-009 | An Invite send is not an NFR-009 event. No audit write was added | N/A |
| NFR-i18n | French only | All new strings are French (section 1) | Pass (inspected) |

## 5. Test cases for QA

| # | Setup | Action | Expected |
| --- | --- | --- | --- |
| 1 | Free Brother with live photo and complete fields; public Sister | Discover card, then « Envoyer une invitation Ta'aruf », then « Envoyer l'invitation Ta'aruf » | 201; « Invitation envoyée. »; remaining 2; the Sister's `GET /v1/invites?box=received` lists him with `state: pending` |
| 2 | Same pair | Send again (or reload and send) | 200, « Invitation déjà envoyée. »; still one row; remaining unchanged |
| 3 | Brother has sent 3 today | Open compose for a 4th Sister | Quota wall on load, button disabled, reset 00:00, « Découvrir Premium » to `/premium` (404 until Epic 10) |
| 4 | Same, via the API | `POST /v1/invites` | 429 `QUOTA_EXCEEDED`, `details {reason:'invite_quota', cap:3, remaining:0, resets_at:'<tomorrow>T00:00:00.000Z'}` |
| 5 | Free Sister, default config | 4 Invites to 4 Brothers | 3 × 201, 4th 429 (same as Brothers) |
| 6 | `sister_reach_mode = free_unlimited` (SQL) | Sister sends 5 or more | All 201; compose shows « Invitations illimitées. » with no count; no Premium or pack line |
| 7 | Brother whose only photo is pending or rejected | Compose page | No-photo block with « Ajouter une photo »; send gives 403 and the prompt, focus on the link |
| 8 | Recipient deactivated (Settings, pause) or emergency-hidden | Send | 404 « Ce profil n'est pas disponible. »; compose shows the unavailable block |
| 9 | Same-gender target or own id | `POST /v1/invites` | 404 / 400 |
| 10 | Signed out | Open `/invitations/envoyer/<id>` | 303 to `/auth`; API 401 |
| 11 | Staff session | Open the page / call the API | 403 |
| 12 | Brother at 23:59 Ouaga with 3 sent | Wait until 00:00 Ouaga | Sending works again; `invite_quota` gets a new civil-day row |
| 13 | 360, 390, 768, 1024, 1280, 1440 | Compose page in each state | No horizontal scroll; matches Stitch 18 minus the Flash composer |

## 6. Out of scope

- Message Flash, Ice Breakers, `message_flash`, `ChatPort.consumeMessageQuota`, `MESSAGE_CAP_EXCEEDED`: Story 4.3.
- The Invite inbox UI (sent / received / accepted with marital honesty): Story 4.4. `/invitations` is still the member stub.
- Accept, quiet decline, no resend after decline (FR-043), Chat / `conversation`: Story 4.5.
- Operator PATCH of `sister_reach_mode` and its audit: Story 4.7 (read only here).
- The Premium page, packs and payments: Epic 10. `/premium` is a placeholder link.
- The `rl_invite_per_day` (30) abuse rate limit exists in config but is not enforced here. It would cap Premium below « Nth succeeds » and belongs to the rate-limit / Trust stories.
- Notifications to the recipient (`invite.received`): the Notifications epic.

## 7. Assumptions and known issues

- **Dead link:** « Découvrir Premium » points to `/premium`, which does not exist until Epic 10. QA will see a 404 there. This was asked for (decision 2).
- The send button stays enabled when the sender has no photo. The precondition block already says a photo is required, and pressing send gives the server refusal with the prompt and moves focus to « Ajouter une photo ». This is how I read « when I try to send, the action is blocked with a prompt ».
- Banned and married: see 4.1-3.
- The received list shows every Invite addressed to the member, including from a sender who later became unlisted. Story 4.4 decides the inbox rules.
- `invite.created_at` was added next to the catalog fields (`id, from_id, to_id, state, sister_accepted_at`). `flash_id` comes with Story 4.3 together with its FK.
- The Material Symbols font and Tailwind come from CDNs that this sandbox cannot reach. Screenshots made here show icon names as text. On a real network the glyphs render.
- Existing test changed on purpose: `operator-config.migrate.test.ts` now expects the live `sister_reach_mode = same_quota_as_brothers` (decision 1). The 0000 seed still contains `free_unlimited` as history, and both values are still checked as allowed.

## 8. Self-check (real results, this container, 2026-10-23)

Environment: Node 22.22 (repo pins 24.21). Docker daemon started in the container. `cdn.playwright.dev`, `cdn.tailwindcss.com` and Google Fonts are blocked by the egress proxy. Chromium is the preinstalled `/opt/pw-browsers/chromium-1194`.

- `npm run lint`: exit 0. 3 warnings, all in untouched files (`life-pause.ts`, `photo-rules.test.ts`, `v2-flow.test.ts`). 0 errors.
- `npm run typecheck`: exit 0.
- `npm run build`: exit 0.
- `npm run migration-check`: `Everything's fine 🐶🔥`.
- `npm run test:unit`: `Test Files 1 failed | 71 passed | 2 skipped (74)`, `Tests 1 failed | 506 passed | 12 skipped (519)`.
  - The one failure is `photo-rules.test.ts` « keeps a 32px play circle in Chrome … ». It asserts that a Chrome binary exists at hard-coded paths, and none exists in this container. It is not related to this story and fails the same way without these changes.
  - The new tests are 20 in `invites.test.ts` and 5 in `invite-compose-page.test.ts`, all passing.
- `npm run test:integration` (Docker ran): `Test Files 1 failed | 4 passed (5)`, `Tests 30 passed | 2 skipped (32)`.
  - The failing file is `compose.test.ts`: `docker compose … up --build` fails at `npm ci --omit=dev` inside the image build (no registry or proxy CA inside the build). That is the environment, not this change.
  - A re-run of the other four files after the last edits: `Test Files 4 passed (4)`, `Tests 22 passed (22)`. This includes `operator-config.migrate.test.ts` with the new Postgres 17 invite test (migrates 22 migrations, guarded increment race, partial unique index, self-invite check, config parsing).
- `npm run test:e2e`, web-only, with `E2E_ALLOW_ERRORS='cdn\.tailwindcss\.com,tailwind is not defined,fonts\.googleapis\.com,fonts\.gstatic\.com'` and `PLAYWRIGHT_CHROMIUM_EXECUTABLE=/opt/pw-browsers/chromium-1194/chrome-linux/chrome`:
  - `e2e/invite-compose.spec.ts`: **14 passed** (7 tests × mobile and desktop).
  - Full suite: 27 failed, 20 skipped, 59 passed. The same 27 tests fail on the base commit without these changes (diffed, identical lists). They are layout and axe checks of other pages that need the blocked Tailwind CDN.
- Browser walk: Playwright against `next dev` with Tailwind CSS built offline from the Stitch config (CDN routed locally), Free, wall and no-photo states at 360 and 1440. `scrollWidth == innerWidth` in all six, no page errors. The layout matches Stitch 18 minus the Flash block.
- Not run: the full-stack e2e against a running compose stack (the image build cannot run here), and the Lighthouse budgets.
