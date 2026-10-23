# QA handoff: Invite inbox with marital honesty (4.4) and accept, quiet decline, Chat only after Sister consent (4.5)

- Story id: `4-4-4-5-invite-inbox-accept-decline`. Spec: `_bmad-output/implementation-artifacts/spec-4-4-4-5-invite-inbox-accept-decline.md` (epics.md Epic 4, Stories 4.4 and 4.5).
- Branch: `factory/invite-inbox` (from `main` at `1f40702`, the PR #9 merge). Committed locally. Not pushed, no PR, not deployed.
- Developer: Claude (factory-dev). Nothing below says "verified" unless it was run; section 8 has the real result lines.

## 1. What was built

### API (all under `/v1`, member session cookie, `Cache-Control: no-store`)

**`GET /v1/invites?box=received|sent|accepted`** (default `received`). Same viewer gate as Story 4.1 (`assertBrowseViewer`: no session 401, staff 403 `staff_session`, mahram 403 `mahram_session`, own profile not listable 403 `viewer_not_listable`). Any other `box` is 400 `box : valeur non reconnue.` Own rows only, newest first, at most 200.

- `received`: invites sent to me, all states. `sent`: invites I sent, all states. `accepted`: accepted invites where I am either side.
- Each item: `{ id, state, created_at, direction, from_id | to_id, other_id, pseudonym, conversation_id, other }`. The Story 4.1 fields are unchanged; the rest is new.
  - `conversation_id` is set only for an accepted invite.
  - `other` is `{ available: true, age, city, marital_status, polygamy_intent, verified, photo }` while the other member is an Active member with a public profile, else `{ available: false }` with no values. `marital_status` / `polygamy_intent` are the stored tokens (`single|married|divorced|widowed`, `no|yes`) or null. `photo` is the live MAIN photo as a **blur** grant (`/v1/media/get?token=…`, derivative `blur`), or null.
  - No item has a read time, decision time, `sister_accepted_at` or anything that says whether the recipient opened it (FR-042).
- Never calls `BillingPort`.

**`POST /v1/invites/:id/accept`** (no body). Order of checks, nothing written when one fails:

1. Viewer gate (as above).
2. Bad id, unknown id, or I am neither side: **404 `NOT_FOUND` « Cette invitation n'existe pas. »** (`details: null`; another member's invite does not leak).
3. I am the sender: **403 `FORBIDDEN` « Seule la personne invitée peut répondre à cette invitation. »** `details: { reason: "not_recipient" }`.
4. Already `accepted`: 200 with the same conversation (double tap safe). `declined`: **409 « Cette invitation n'est plus en attente. »** `details: { reason: "invite_not_pending", state: "declined" }`.
5. The sender is no longer available (account not Active, or profile not public): **404 « Ce profil n'est pas disponible. »**; the invite stays pending.
6. One transaction: guarded `UPDATE invite SET state='accepted', sister_accepted_at=… WHERE id AND to_id=me AND state='pending'`, then `ChatPort.openFromInvite(tx, { inviteId })` inserts `conversation { id, invite_id, stage: 'chat' }` (unique on `invite_id`). **200** `{ invite: { id, state: "accepted", created_at }, conversation: { id, stage: "chat" } }`.
   - `sister_accepted_at` = now when the recipient is the Sister; = the invite's `created_at` when the Sister sent it (her send was her consent, FR-039).
   - No `BillingPort` call, no `invite_quota` write.

**`POST /v1/invites/:id/decline`** (no body). Steps 1 to 3 as accept. `pending` becomes `declined` (guarded update). Already `declined`: 200 (idempotent). `accepted`: 409 `{ reason: "invite_not_pending", state: "accepted" }`. **200** `{ invite: { id, state: "declined", created_at } }`. No conversation, no quota refund, nothing sent to the sender. Allowed even when the sender is no longer available.

**`POST /v1/invites` (Story 4.1 send), new rules after the recipient check and before the quota:**

- Already pending from me, or an accepted invite between us in either direction: 200 with that invite, no row, no count.
- A declined invite from me to this recipient: **403 `FORBIDDEN` « Vous ne pouvez plus envoyer d'invitation à ce profil. »** `{ reason: "invite_declined" }` (FR-043, no resend). Nothing written, nothing counted.
- A pending invite from the recipient to me: **409 « Cette personne vous a déjà invité. Répondez à son invitation. »** `{ reason: "invite_received" }`, so two crossing invites cannot open two conversations.

**`GET /v1/conversations`** (new, chat module, read only): `{ count, items: [{ id, invite_id, stage, other_id }] }`, same viewer gate. Chat finds the viewer's accepted invites through `InvitesPort.acceptedFor`, never by reading `invite`. A pending or declined invite has no conversation.

**`ChatPort`** (`packages/ports`): `openFromInvite(tx, { inviteId, now })` (the only `conversation` insert in the api; a test enforces it) and `conversationsForInvites(ids)`.

**Audit:** none written. AD-18's mandatory list has no invite accept/decline event (and invites must not emit config events).

### Web: `/invitations` (Stitch `19-invite-inbox`, inside the shared app shell, nav item « Invitations » current)

Renders for a live member session and for the `web` / `capacitor` dev stubs (like `/invitations/envoyer/<id>`); staff and mahram stubs keep the member-route JSON refusal; signed out goes to `/auth`. The page loads the three boxes in the browser.

- Eyebrow « Espace de concertation » in gold (`#7D5F27`, see section 9, finding 2), title « Invitations Ta'aruf ».
- Tabs (WAI-ARIA tablist, arrow keys / Home / End, `#envoyees` / `#acceptees` in the URL open that tab): « Reçues N » (pending received only), « Envoyées N », « Acceptées N »; the current tab's count is navy.
- **Reçues** row: initial or blur thumb, « <pseudonyme>, <âge> ans », « Identité vérifiée » if verified, city; then « Situation matrimoniale » (Célibataire / Marié(e) / Divorcé(e) / Veuf(ve) / Non renseignée), « Déclaration de polygamie » (Projet monogame / Ouvert à la polygamie / Non renseignée), « Statut actuel » « Étape : Invitation Ta'aruf ». Buttons « Accepter la démarche » (primary), link « Consulter le profil » (`/profil/<id>`), « Refuser discrètement » (`button-quiet`: text only, no dialog, no confirm). Unavailable sender: « Ce profil n'est plus disponible. » and only « Refuser discrètement ».
- **Envoyées** row: name, age, city, « Envoyée le <date> » (Ouagadougou, e.g. « 8 octobre 2026 »), pill « En attente » / « Acceptée » (+ « Ouvrir la discussion ») / « Déclinée ». Nothing else on a pending or declined row.
- **Acceptées** row: name, age, badge « Démarche confirmée », « <city> • Reçue le / Envoyée le <date> », « Ouvrir la discussion » to `/discussions` (Chat screen is Epic 5).
- After accept: status « Invitation acceptée. La discussion est ouverte. », list reloads (row moves to Acceptées), focus on the Reçues tab. After decline: « Invitation refusée. », row leaves Reçues. While a request is in flight that row's buttons are disabled. A 404/409 answer reloads the list and shows the API message in the status line; other failures show « Action impossible. Vérifiez votre connexion et réessayez. » (or the API's French message) under the row.
- States: « Chargement… »; empty « Aucune invitation. » + « Votre espace d'invitations s'actualise au fur et à mesure des présentations conformes. »; load error « Chargement impossible. Vérifiez votre connexion et réessayez. » + « Réessayer » (5xx never shows the English API message).
- Dropped from the Stitch export: sample rows and photos, « Mot d'introduction » (Message Flash, Story 4.3), « Examen en cours » (read receipt), « Processus clôturé avec sérénité » (guilt line), « Accord formel du Wali transmis » and « Tuteur : Référent informé » (the product does not do these). The soft-gold « Étape » text is navy for contrast.

**Invite compose** (`/invitations/envoyer/<id>`): `invite_declined` shows the API message and keeps the send disabled; `invite_received` shows its message, keeps the send disabled, and shows the link « Voir mes invitations » (`/invitations`).

## 2. Where

- Migration `code/apps/api/drizzle/0022_conversation.sql` (+ `meta/0022_snapshot.json`, `_journal.json`): table `conversation` (`id`, `invite_id` FK invite NOT NULL, `stage` CHECK in `invite|chat|meeting|married`, `paused_by` FK account, `ended_at`, `flash_id`), unique index `conversation_one_per_invite`.
- API: `apps/api/src/account-schema.ts`, `chat.ts` (new), `conversations.controller.ts` (new), `app.module.ts`, `invites.ts`, `invites.controller.ts`, `invites-port.ts` (`acceptedFor`), `public-profile.ts` (exports `verificationFlags`); `packages/ports/src/index.ts` (`ChatPort`, `OpenedConversation`, `ConversationStage`).
- Web: `apps/web/src/invite-inbox-page.ts` (new), `app/invitations/route.ts`, `src/v2-serve.ts` (`invitationsResponse`; `memberGuarded` keeps `/discussions` and `/profil`), `src/member-section-page.ts` (Discussions only now), `src/invite-compose-page.ts`, `apps/web/Dockerfile` and `code/.dockerignore` (ship `19-invite-inbox/screen.html`).
- Tests: `apps/api/src/invite-inbox.test.ts` (new), `apps/api/src/operator-config.migrate.test.ts` (Postgres), `apps/api/src/invites.test.ts`, `apps/api/src/visit-signals.test.ts`, `apps/web/src/invite-inbox-page.test.ts` (new), `apps/web/src/app-shell.test.tsx`, `apps/web/src/app-shell-browser.test.ts`, `apps/web/src/member-route.test.ts`, `e2e/invite-inbox.spec.ts` (new), `e2e/invite-compose.spec.ts`, `e2e/app-shell.spec.ts`.
- No new env vars, flags or dependencies.

## 3. How to run

From `code/`: `npm ci`; `npm run lint`; `npm run typecheck`; `npm run build`; `npm run migration-check`; `npm run test:unit`; `npm run test:integration` (Docker); `npm run test:e2e` (web-only server on 3100, `/v1` answered by each test's route mocks).

Full stack: as in `.factory/config.md` (`docker compose … up -d --build --wait`, then `npx drizzle-kit migrate` from `apps/api` — **this story adds migration 0022, so run migrate again**). Data setup for a manual walk: two disposable accounts, a Brother and a Sister, both through onboarding, profile published by staff review, each with a live main photo. Brother: profile « Marié », polygamie « Oui ». Brother opens the Sister's profile → « Envoyer une invitation Ta'aruf » → send. Sister opens « Invitations ».

## 4. AC trace table

API tests: `apps/api/src/invite-inbox.test.ts` (memory stores, in `npm run test:unit`). PG: `apps/api/src/operator-config.migrate.test.ts` › "accepts in one transaction with ChatPort.openFromInvite, declines quietly, and keeps one conversation per invite on migrated Postgres (Stories 4.4, 4.5)" (`npm run test:integration`). Web unit: `apps/web/src/invite-inbox-page.test.ts`. E2E: `e2e/invite-inbox.spec.ts`, `e2e/invite-compose.spec.ts`, `e2e/app-shell.spec.ts`. Status "pass" means the test ran green here (section 8).

| ID | Criterion (verbatim from epics.md) | How it is proven | Status |
|---|---|---|---|
| 4.4-1 | Given a Brother-sent Invite is pending, when I open Received, then I see marital_status and polygamy_intent before accept. | API "AC 4.4-1: a pending Brother-sent Invite shows his marital status and polygamy intent on Received before accept"; web unit "shows marital status and polygamy intent on received rows, and decline is the quiet button"; e2e "AC 4.4-1: received rows show marital status and polygamy intent before accept, inside the shared shell" | pass |
| 4.4-2 | Given I open Sent, when rows render, then pending / accepted / declined — declined has no guilt copy. | API "AC 4.4-2: Sent shows pending, accepted and declined, with no guilt copy, read receipt or timer"; web unit "keeps sent rows to a date and a state: no read receipt, timer or guilt line"; e2e "AC 4.4-2: Sent shows pending, accepted and declined, and a declined row carries no guilt copy, receipt or timer" (exact row text) | pass |
| 4.4-3 | Given I report « misrepresented marital status », when submit, then the Report reason `misrepresented marital status` is available (the Report API is Story 8.5). | **Deferred to Story 8.5.** No shared Report reason list exists anywhere in the code (searched api, ports, kernel, web), and the orchestrator said to add the value only if one exists. Nothing built. | not built (flag) |
| 4.5-1 | Given he sent the Invite, when I accept, then `ChatPort.openFromInvite` inserts `conversation` and stage is `chat`. | API "AC 4.5-1: her accept of his Invite opens one conversation at stage chat through ChatPort.openFromInvite"; API "only chat.ts inserts a conversation, and only inside openFromInvite" (static); PG test (real transaction, unique index); e2e "AC 4.5-1: accept posts once, then the row moves to Acceptées with the discussion link" | pass |
| 4.5-2 | Given he sent the Invite, when I decline with button-quiet, then no Chat exists; he sees declined without a read receipt or guilt timer; he cannot resend. | API "AC 4.5-2: her quiet decline opens no Chat, shows him declined with no receipt, and he cannot resend"; PG test; e2e "AC 4.5-2: decline is quiet: one post, a short status, the row leaves Reçues, no confirmation or lecture"; e2e compose "Story 4.5: after her decline the send stays closed, with a quiet message (no resend)" | pass |
| 4.5-3 | Given I sent the Invite, when he accepts, then Chat opens (my send counted as consent). | API "AC 4.5-3: when she sent the Invite, his accept opens Chat; her send counted as consent" (`sister_accepted_at` = invite `created_at`) | pass |
| 4.5-4 | Given he opens messages on a pending Invite he sent, when he looks for a thread, then there is none. | API "AC 4.5-4: on a pending Invite he sent there is no thread, and he cannot accept it himself" (`GET /v1/conversations` empty; sender accept 403). "Opens messages" read as the conversations read; the Chat UI is Epic 5. | pass (interpretation flagged) |
| AUTH | Only the recipient may act; server-side authorization | API "only the recipient may act: no session, staff, mahram, another member, and a bad or unknown id are refused"; web unit "guards the route: signed out to /auth, staff and mahram refused, a member gets the page"; `member-route.test.ts` | pass |
| EDGE-unavail | Sender no longer available | API "an unavailable sender: his fields are hidden, accept is refused and stays pending, decline still works"; e2e "a sender who is no longer available shows only the quiet decline; a refused accept reloads with its message" | pass |
| EDGE-state | Accepted cannot be declined; already connected / crossing invites | API "an accepted Invite cannot be declined, and a pair already connected or invited the other way gets no second Invite"; e2e compose "Story 4.5: when she already invited him, the send points to the inbox instead" | pass |
| EDGE-race | Double submit, parallel accept, accept vs decline | API "parallel accepts open one conversation; a parallel accept and decline leave one consistent outcome"; PG test (parallel on real Postgres, 23505 on duplicate insert); e2e accept/decline "posts once" (busy guard) | pass |
| EDGE-states | Empty, loading, error + retry, reload, `#tab` | web unit "renders the three tabs…"; e2e "a load failure shows the retry, and the retry loads the inbox"; e2e AC 4.4-1 (empty Acceptées) | pass |
| PORTS | Chat reads accepted invites only through `InvitesPort` | API "InvitesPort.acceptedFor reports accepted invites from both sides for chat" | pass |
| BILLING | AD-21/27: no BillingPort, no quota write on accept/decline/list | API "accept, decline, the inbox list and the conversations read never reach BillingPort" (static); PG test (`invite_quota` count unchanged) | pass |
| AUDIT | AD-18 | No invite accept/decline event in AD-18's mandatory list; none written. | n/a (by design) |
| A11Y | WCAG 2.2 AA, keyboard | Every e2e test runs `expectAccessible` (axe); e2e "the tabs work from the keyboard, and accept is reachable without a mouse" | pass |
| RESP | 360 to 1440, no horizontal scroll | e2e "fits every factory width on each tab"; app-shell e2e `/invitations` row; browser screenshots 360/1440 all tabs (section 8) | pass |
| PRIVACY | No read receipt, no decision time, no `sister_accepted_at` in responses; blur photo only | API AC 4.4-1 (blur grant) and AC 4.4-2 (no receipt keys); web unit "keeps sent rows to a date and a state…" | pass |
| I18N | All UI in French; no English API text shown | web unit "renders the three tabs…" (copy); e2e load-failure test (5xx shows French fallback) | pass |
| CONSOLE | No console errors / unexpected failed requests | e2e fixtures fail on console errors and failed requests; all inbox e2e tests green | pass |

## 5. Test cases for QA

Use two members, Brother B and Sister S (plus S2 and a stranger O), as in section 3.

| # | Input | Expected |
|---|---|---|
| 1 | B (profile Marié, polygamie Oui) invites S. S opens `/invitations`. | Reçues 1. Row shows B's pseudonym, age, city, « Situation matrimoniale : Marié(e) », « Déclaration de polygamie : Ouvert à la polygamie », « Étape : Invitation Ta'aruf », buttons « Accepter la démarche », « Consulter le profil », « Refuser discrètement ». Photo blurred. |
| 2 | B opens `/invitations#envoyees`. | Row with « Envoyée le <date> » and pill « En attente ». No « lu », « vu », timer, countdown or decision time. |
| 3 | S clicks « Accepter la démarche ». | One `POST /v1/invites/<id>/accept` → 200 with `conversation.stage = "chat"`. Status « Invitation acceptée. La discussion est ouverte. ». Row moves to Acceptées with « Démarche confirmée » and « Ouvrir la discussion ». DB: one `conversation` row for the invite, `stage='chat'`; `invite.sister_accepted_at` set. |
| 4 | S double-clicks accept / sends two accepts in parallel (curl). | One conversation only; both answers 200 with the same conversation id. |
| 5 | B: `GET /v1/conversations`. | One item with `other_id = S`. |
| 6 | B invites S2; S2 clicks « Refuser discrètement ». | No dialog. Status « Invitation refusée. ». No conversation row. `invite_quota` not refunded. |
| 7 | B opens Envoyées after 6. | S2 row: date and « Déclinée » only. No guilt line, no receipt, no timer. |
| 8 | B tries to invite S2 again (profile → Envoyer). | 403 « Vous ne pouvez plus envoyer d'invitation à ce profil. »; send stays disabled; no new row, quota unchanged. |
| 9 | S invites a Brother B2; B2 accepts. | 200, conversation opened; `sister_accepted_at` = invite `created_at`. |
| 10 | B (sender) calls accept or decline on his own pending invite. | 403 « Seule la personne invitée peut répondre à cette invitation. » Nothing changes. |
| 11 | O (not a party) calls accept/decline on B→S2 invite; also a random UUID and `abc`. | 404 « Cette invitation n'existe pas. » for all. |
| 12 | No cookie / staff session / mahram session on accept, decline, list, conversations. | 401 / 403 `staff_session` / 403 `mahram_session`. `/invitations` signed out → `/auth`. |
| 13 | Decline after accept; accept after decline. | 409 « Cette invitation n'est plus en attente. » with `state`. |
| 14 | B's profile set non-public (or account suspended) while B→S is pending; S opens Reçues. | « Ce profil n'est plus disponible. », only « Refuser discrètement ». Accept via API → 404 « Ce profil n'est pas disponible. », invite stays pending; decline works. |
| 15 | S has a pending invite from B; S tries to invite B. | 409 « Cette personne vous a déjà invité. Répondez à son invitation. »; compose shows « Voir mes invitations ». |
| 16 | `GET /v1/invites?box=foo`. | 400 « box : valeur non reconnue. » |
| 17 | Keyboard: Tab to tablist, ArrowRight/Left, Home/End; Enter on « Accepter la démarche ». | Tabs switch with focus; accept works without a mouse. |
| 18 | Widths 360, 390, 768, 1024, 1280, 1440 on each tab. | No horizontal scroll; layout as Stitch 19. |
| 19 | Network failure on list load (block `/v1/invites`). | « Chargement impossible. Vérifiez votre connexion et réessayez. » + « Réessayer » which reloads. |

## 6. Out of scope

- Message Flash on invite (Stories 4.3, 4.6): the Stitch « Mot d'introduction » block is removed.
- Operator reach mode (Story 4.7).
- Chat screens and messages (Epic 5): `/discussions` stays a placeholder; « Ouvrir la discussion » links there. `conversation` has no messages table.
- Report API and its reason list (Story 8.5), including AC 4.4-3.
- Payments, quota refunds, any BillingPort use.
- Notifications to the sender on accept/decline (not in these ACs).

## 7. Assumptions and known issues

1. **AC 4.4-3 not built.** No shared Report reason list exists; per the orchestrator, the value is added only if one exists. Story 8.5 must add `misrepresented marital status`. Flag for the orchestrator/QA.
2. **AC 4.5-4 interpretation:** « opens messages » = `GET /v1/conversations` (no Chat UI yet). The thread being absent is proven at the API.
3. Eyebrow « Espace de concertation » kept from Stitch 19; the product owner may want to review the wording.
4. Decline has no confirm dialog and cannot be undone (UX-DR2 button-quiet; « refuser discrètement »). Intended, but irreversible.
5. Two **crossing sends at the same instant** (B→S and S→B in parallel) could both pass the 409 `invite_received` check and create two pending invites; accepting one does not close the other. The unique conversation index is per invite, so this could give two conversations for one pair. Very unlikely; a pair-level lock or unique index is a follow-up if wanted.
6. `/invitations` now renders for the `web`/`capacitor` dev stub cookies like `/invitations/envoyer/<id>` (it was a member placeholder). The old stub 401 assertion in `member-route.test.ts` moved to `/discussions`, and a mahram 403 assertion for `/invitations` was added. The test was not weakened, only re-pointed because the route behaviour changed by design.
7. `sister_accepted_at` for a Sister-sent invite is the invite's `created_at` (her send is her consent, FR-039).
8. Accepted invites and declined invites from me block a new send; a pending one from me returns 200 with the existing invite (Story 4.1 behaviour kept).
9. **`npm audit`**: 1 critical in `next` 16.0–16.4, pre-existing on `main` (same result on a clean worktree); this story changes no dependency.
10. **Environment (this sandbox), not code:**
    - `cdn.tailwindcss.com` and `cdn.playwright.dev` are blocked by the egress proxy. E2E and the browser screenshots ran through a local-only Playwright wrapper (not committed) that serves the same Tailwind play script (npm `tailwindcss-cdn@3.4.10`) for that host. QA should rerun `npm run test:e2e` with normal network.
    - 3 browser unit tests (`ank-148-fix.test.ts`, `photo-rules.test.ts`, `v2-responsive.test.ts`) fail here for the same CDN reason; they fail identically on a clean `main` worktree.
    - `compose.test.ts` (integration) fails because `docker compose build` inside the test hits TLS interception on `npm ci`. Images were built separately with the CA as a build secret (repo Dockerfiles untouched), and the stack came up healthy with migration 0022 applied.
    - **Real-data UI walk not done.** The local API verifies reCAPTCHA with Google, which the API container cannot reach, so accounts could not be created on the running stack. The accept/decline paths on real Postgres are covered by the PG integration test instead.

## 8. Self-check results

All from `code/`, on this branch, in this sandbox.

- `npm run lint`: exit 0. 3 warnings, all pre-existing (`life-pause.ts`, `v2-flow.test.ts`, `photo-rules.test.ts`).
- `npm run typecheck`: exit 0.
- `npm run build`: exit 0.
- `npm run migration-check`: `Everything's fine 🐶🔥`.
- `npm audit --omit=dev --audit-level=high`: 1 critical (`next`), pre-existing on `main`.
- `npm run test:unit`: `Test Files  3 failed | 75 passed (78)` / `Tests  3 failed | 580 passed (583)`. Failing: `ank-148-fix`, `photo-rules`, `v2-responsive` (environment, same on `main`; see 7.10).
- Rerun after the last change: `invite-inbox-page`, `app-shell`, `member-route`, `invite-inbox`, `invites`: `Test Files  5 passed (5)` / `Tests  88 passed (88)`.
- `npm run test:integration` (Docker up): `Test Files  1 failed | 4 passed (5)` / `Tests  31 passed | 2 skipped`. Failing file: `compose.test.ts` (build TLS, see 7.10). `operator-config.migrate.test.ts`: 16/16 passed, including the new Stories 4.4/4.5 Postgres test.
- E2E (local Tailwind wrapper, both projects): `invite-inbox` + `app-shell` + `invite-compose`: `53 passed, 5 skipped` (skips are existing project-conditional skips). `invite-inbox.spec.ts`: 8 tests × 2 projects all passed.
- Browser (Playwright Chromium, dev server): `/invitations` all three tabs at 360 and 1440 with sample data: horizontal overflow 0, no console errors, no unexpected failed requests, layout matches Stitch `19-invite-inbox` minus the removed lines (section 1).
- Full stack (`docker compose`, images built from this branch): `/v1/health` → `{"status":"ok","role":"api"}`; `drizzle-kit migrate` applied through 0022; `select count(*) from conversation` → `0`.

## 9. Retest: QA visual findings (live QA on the owner's Mac, after commit e739572)

| # | Finding | Fix | Test |
|---|---|---|---|
| 1 | At 390px on Envoyées, when the city wraps under a long name, a lone « • » is left at the end of the name line. | The separator and the text after it are now one non-breaking group (`withSep`, class `inbox-sep-group`, `inline-flex whitespace-nowrap`) in a `flex-wrap` line, so a wrap moves « • ville » down together. Used on Envoyées (name • city) and Acceptées (city • date, which was a plain string and had the same risk). Reçues puts the city on its own line, so it has no separator. | e2e "when the city wraps under a long name, the « • » wraps with it on Envoyées and Acceptées" (360 and 390, long pseudonyms; checks every « • » sits on the same line as its text, and that the city really wrapped at 390). It fails on the previous page code and passes now. Web unit "renders the three tabs…" / "keeps sent rows…" assert the grouping and no `' • '` concatenation. |
| 2 | « ESPACE DE CONCERTATION » is navy/grey; Stitch 19 has it in soft gold. | Now gold. Stitch's exact `soft-gold` (#C9A86C) on the cream page is about 2.2:1, below WCAG AA 4.5:1 for 12px text, so axe would fail it. The eyebrow uses `#7D5F27`, the darker gold the project already uses for gold text that must pass AA (`AUTH_LINK_GOLD`, brand hover). | Web unit "renders the three tabs…" asserts the class; every inbox e2e test runs axe. |

Results after the fix (from `code/`):
- `npm run lint`: exit 0, the same 3 pre-existing warnings. `npm run typecheck`: exit 0.
- `npx vitest run apps/web/src/invite-inbox-page.test.ts`: `Tests  6 passed (6)`.
- E2E (local Tailwind wrapper): `invite-inbox` + `app-shell`: `40 passed, 6 skipped`.
