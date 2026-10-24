# QA handoff: Report with a 24h SLA (8.5) and Block (8.6), with Unblock

Branch `factory/report-block` (from `main` at `38a6a63`). Spec: `_bmad-output/implementation-artifacts/spec-8-5-8-6-report-and-block.md`. Also closes the deferred Story 4.4 AC 3 (Report reason « misrepresented marital status »).

**Revision 2 (branch `factory/report-block-unblock`, on top of `db16287`):** the product owner confirmed Block both ways and added « Membres bloqués » with Unblock (rows U-1 to U-4 below). Everything from revision 1 is unchanged.

## 1. What was built

**API (trust module, new).**

- `POST /v1/reports` `{ target_kind: 'profile' | 'message', target_id, reason, details?, block? }` files a Member Report and, in the same transaction, one `moderation_case` with `sla_started_at` = submit time and `first_human_at` null. `block: true` also writes the Block in that transaction. 201 body: `{ report: { id, target_kind, reason, sla_started_at }, case: { id, sla_started_at, sla_state: 'open' }, blocked, sla_hours }`.
  - Reasons (one shared list, `@ankanu/kernel` `REPORT_REASONS`, Stitch order): `indecency`, `sexual_content`, `impersonation`, `multiple_accounts`, `harassment`, `money_scam`, `hateful`, `non_matrimonial`, `misrepresented_marital_status`.
  - Profile target: any member of the other gender, not me, any status (a member who left or was blocked can still be reported). Else 404 « Ce profil n'est pas disponible. ».
  - Message target: `target_id` is the message id; it must be in one of my conversations and sent by the other member. Else 404 « Ce message est introuvable. ». The row stores the message id and conversation id, never the text.
  - Errors: 400 « target_kind : valeur non reconnue. », « target_id : valeur non reconnue. », « Choisissez un motif. » (`field: 'reason'`), « details : valeur non reconnue. », « Précisions trop longues (1000 caractères au plus). » (`max: 1000`), « block : valeur non reconnue. ». 429 `RATE_LIMITED` « Trop de signalements en peu de temps. Réessayez plus tard. » after `operator_config.rl_report_per_hour` (seed 10) Reports in the last hour; 503 if that row is unreadable. Nothing is written on any refusal.
- `POST /v1/blocks` `{ blocked_id }`: 201 first time, 200 for the same pair, body `{ block: { blocked_id, created_at } }`. 400 « blocked_id : valeur non reconnue. » (self, malformed, missing); 404 « Ce profil n'est pas disponible. » (unknown or same gender).
- Both: no session 401; staff session 403 `staff_session`; mahram 403; viewer whose own profile is not listable 403 (same gate as Chat). No BillingPort.
- **A Block hides both ways** (decision, see 7): browse card and grid exclude both members; `/v1/profiles/:id` is 404 both ways; favourites drop the profile and refuse adding it; `POST /v1/invites` either way is 404 « Ce profil n'est pas disponible. »; a pending invite between them shows `other: { available: false }` and its accept is 404; **the existing conversation is closed for both**: `/v1/conversations` and `/:id` show `other: { available: false }`, `/:id` has `closed: true`, a send from either side is 409 « Cette discussion est fermée. » `{ reason: 'conversation_closed' }` with nothing stored, and the socket `conversation.typing` relay sends nothing. History stays readable. The close is computed from the Block; `conversation.ended_at` / `paused_by` are not written.
- **Unblock (revision 2).**
  - `GET /v1/blocks`: `{ count, items: [{ blocked_id, pseudonym, created_at, photo }] }`, the Blocks I placed, newest first. `photo` is always the blurred derivative signed for me, or null; no other profile field. A Block placed on me is never listed. `no-store`.
  - `DELETE /v1/blocks/:blocked_id`: removes my own row only, 200 `{}`. The other member's Block on me, no Block, unknown or malformed id: the same 404 « Ce blocage n'existe pas. », nothing changed. The row is deleted (the table has no `revoked_at`; no audit event).
  - Effect: everything a Block does is computed per request, so with no Block left either way, browse, profile, favourites (the favourite row was kept) and Invites come back, and **the conversation the Block closed reopens for both with its history**: `closed: false`, sends accepted under the usual rules, typing relayed again. If the other member also blocked me, nothing comes back until they unblock too, and nothing tells me their Block exists.
- **Operator metrics** `GET /v1/staff/metrics` now returns `reports: { sla_hours, open, sla_breach, oldest_open_started_at }`. `open` = cases with no first human touch; `sla_breach` = open cases older than `operator_config.report_sla_hours` (seed 24), strict `>`. `caseSlaState()` (`trust.ts`) names `open | sla_breach | first_touch_in_sla | first_touch_late` for one case (for Story 8.7).

**Web.**

- New screen 23 at `/signaler/<member id>` (from a Profile) and `/signaler/<member id>?discussion=<conversation id>[&message=<message id>]` (from Chat), inside the shared app shell. Exact copy:
  - « Retour au profil » / « Retour à la discussion »; eyebrow « SÉCURITÉ & BIENSÉANCE »; h1 « Signaler ou bloquer ce profil »; the Stitch intro paragraph; chip « Profil concerné : <pseudonyme> (<ville>) »; with a message « Le message choisi dans la discussion est joint à ce signalement. ».
  - « Motif du signalement (requis) » / « Sélectionnez le motif principal », nine radios, the last one « Dissimulation ou fausse déclaration de situation matrimoniale ». **None preselected.**
  - « Précisions utiles pour les modérateurs (facultatif) », placeholder « Mentionnez respectueusement les éléments observés afin d'orienter notre vérification... », 1000 characters max, counter from 900.
  - « Bloquer également ce profil » (checked by default, as Stitch) + « En cochant cette option, ce membre ne pourra plus consulter votre fiche ni vous envoyer d'invitation ou de message. Cette action s'applique immédiatement et avec discrétion. »
  - « Transmettre le signalement », « Annuler et retourner au profil » / « Annuler et retourner à la discussion ».
  - « Bloquer sans signaler » + « Ce membre ne pourra plus consulter votre fiche ni vous envoyer d'invitation ou de message. » + button « Bloquer ce profil ».
  - Sent: « Signalement transmis » (focused) + « Un membre de l'équipe de modération l'examinera dans les 24 heures. » (+ « Ce membre ne peut plus consulter votre fiche ni vous contacter. » when blocked) + « Retour à la découverte » or « Retour aux discussions ». Block only: « Profil bloqué » + the same sentence.
  - States: « Chargement… »; « Choisissez un motif. » (no POST, focus to first radio); API message in an alert (rate limit etc.); 401 « Votre session a expiré. Reconnectez-vous. » + « Se reconnecter »; network « Envoi impossible. Vérifiez votre connexion et réessayez. »; unavailable / mismatched member « Ce profil n'est pas disponible. »; load error + « Réessayer ».
- Profile page (screen 15): « Signaler / Bloquer le profil » is now a link to `/signaler/<id>`.
- « Membres bloqués » at `/settings/bloques` (revision 2; no Stitch screen exists, so it is built on the screen 27 document and Paramètres style, Profil tab current). Paramètres gets a card « Membres bloqués » / « Consultez les membres que vous avez bloqués et levez un blocage si vous le souhaitez. » / « Gérer » after the PIN card. Exact copy:
  - « Retour aux paramètres »; eyebrow « PRÉFÉRENCES & CONFIDENTIALITÉ »; h1 « Membres bloqués »; « Les membres que vous avez bloqués ne voient pas votre fiche et ne peuvent pas vous contacter. Vous pouvez lever un blocage à tout moment. »; chip « 1 membre bloqué » / « n membres bloqués ».
  - Row: blurred photo (56 px circle, person icon without one), pseudonym, « Bloqué le 22 octobre 2026 », button « Débloquer » (name « Débloquer <pseudonyme> »).
  - Confirmation, inline in the row: « Débloquer <pseudonyme> ? » (focused), « Ce membre pourra de nouveau voir votre fiche, vous envoyer une invitation et vous écrire dans une discussion existante. », « Confirmer le déblocage », « Annuler » (focus back to « Débloquer »). Only the confirm button sends the DELETE; double click sends one.
  - Done: row removed, « Blocage levé pour <pseudonyme>. », focus on the h1, count updated. 404: row removed with « Ce blocage n'existe plus. ». 401: « Votre session a expiré. Reconnectez-vous. » + « Se reconnecter » in the row. Other errors: the API message or « Envoi impossible. Vérifiez votre connexion et réessayez. », row kept.
  - States: « Chargement… »; « Vous n'avez bloqué aucun membre. »; « Chargement impossible. Vérifiez votre connexion et réessayez. » + « Réessayer ».
- Chat thread (screen 21): « Signaler / Bloquer » link in the header; a 44 × 44 flag link « Signaler ce message » (screen-reader name) under each of the other member's bubbles, never under mine.

## 2. Where

- Migration `code/apps/api/drizzle/0024_report_block.sql` (tables `report`, `moderation_case`, `block`; checks on reason list, target shape, no self-report, no self-block, case origin; unique pair; partial index on open cases) + `meta/0024_snapshot.json`, `_journal.json`.
- New: `packages/kernel/src/report.ts`; `apps/api/src/trust.ts`, `trust-port.ts`, `reports.ts`, `trust.controller.ts`; `apps/web/src/report-block-page.ts`, `apps/web/app/signaler/[id]/route.ts`.
- Changed: `packages/kernel/src/index.ts`, `packages/ports/src/index.ts` (`TrustPort`), `apps/api/src/account-schema.ts`, `app.module.ts`, `chat-messages.ts`, `browse-grid.ts`, `public-profile.ts`, `favourites.ts`, `invites.ts`, `staff.controller.ts`; `apps/web/src/v2-serve.ts`, `entry-guard.ts`, `profile-detail.ts`, `discussions-page.ts`; `apps/web/Dockerfile`, `.dockerignore` (Stitch 23 in the image).
- Revision 2: `apps/api/src/trust.ts` (`blocksBy`, `removeBlock`), `reports.ts` (`listMyBlocks`, `unblockMember`), `trust.controller.ts` (`GET /v1/blocks`, `DELETE /v1/blocks/:blockedId`); new `apps/web/src/blocked-list-page.ts`, `apps/web/app/settings/bloques/route.ts`; changed `apps/web/src/v2-serve.ts` (`blockedListResponse`), `entry-guard.ts` (`/settings/bloques`), `v2-pages.ts` (Paramètres card). No migration (0024 already has `block`). Tests: new `apps/web/src/blocked-list-page.test.ts`, `e2e/blocked-list.spec.ts`; new cases in `reports-blocks.test.ts` and `operator-config.migrate.test.ts`.
- Tests: `apps/api/src/reports-blocks.test.ts` (new), `operator-config.migrate.test.ts`, `profile-review.test.ts`; `apps/web/src/report-block-page.test.ts` (new), `discussions-page.test.ts`, `profile-detail.test.ts`; `e2e/report-block.spec.ts` (new).
- No new env var, flag or secret. Config keys used: `rl_report_per_hour`, `report_sla_hours` (both seeded since migration 0000).

## 3. How to run

From `code/`: `npm ci`; `npm run lint`; `npm run typecheck`; `npm run build`; `npm run migration-check`; `npm run test:unit`; `npm run test:integration` (Docker; never while a local compose stack is up); `npm run test:e2e` (web-only on 3100, `/v1` mocked per test).

Full stack (Fay's Mac, per `.factory/config.md`): rebuild, then run the migrate command once more (migration 0024). Then:

1. Two disposable members (Brother A, Sister B), both public; A invites B, B accepts, they exchange a message.
2. As B open A's profile `/profil/<A>` → « Signaler / Bloquer le profil » → choose « Dissimulation ou fausse déclaration de situation matrimoniale », leave Block checked, submit → « Signalement transmis ».
3. DB: `select reason, sla_started_at, first_human_at from report; select report_id, sla_started_at, first_human_at from moderation_case; select * from block;` → one row each, both `sla_started_at` equal to the submit time, `first_human_at` null.
4. As A: `/decouvrir` no longer shows B; `/profil/<B>` redirects to `/decouvrir`; the thread shows « Ce profil n'est plus disponible. » with the composer disabled; `POST /v1/invites {to_id: B}` is 404; a send is 409. Same from B's side towards A.
5. Operator: `GET /v1/staff/metrics` → `reports.open` counts the case, `sla_breach` 0. To see a breach without waiting: `update moderation_case set sla_started_at = now() - interval '25 hours'` → `sla_breach` 1; `update moderation_case set first_human_at = now()` → `open` and `sla_breach` drop.
6. From Chat: in a thread, the flag under the other member's bubble opens the page with « Le message choisi… »; submit → `report.target_kind = 'message'`, `target_id` = that message id, `conversation_id` set.
7. Unblock (revision 2): as B open `/settings` → « Membres bloqués » → A is listed with a blurred photo → « Débloquer » → « Annuler » (nothing in DB changes) → « Débloquer » → « Confirmer le déblocage » → « Blocage levé pour … ». DB: `select * from block` is empty. As A: B is back in `/decouvrir` and `/profil/<B>` opens; the old thread no longer says « Ce profil n'est plus disponible. » and a send is 201. Mutual case: block A from B and B from A, unblock from B only → A still cannot see B and the thread stays closed; unblock from A too → everything comes back.

## 4. AC trace table

| ID | Criterion (verbatim) | How it is proven | Status |
| --- | --- | --- | --- |
| 8.5-1 | Given I submit a Report, When a moderation_case exists, Then sla_started_at is submit time | API « AC 8.5-1: a Profile Report opens one moderation_case whose sla_started_at is the submit time » (exact rows, `first_human_at` null, no BillingPort, no moderation_job); « AC 8.5-1 from Chat: a message Report references the message id and its conversation; only the other member's message »; Postgres « files a Report with its moderation_case, keeps Blocks both ways, and counts SLA-breach on migrated Postgres (Stories 8.5, 8.6) »; e2e « AC 8.5-1 and AC 4.4-3: … shows the 24 h SLA », « AC 8.5-1 from Chat: « Signaler ce message » … » | Done (run, green) |
| 8.5-2 | Given 24h elapse with no first human, When Operator metrics, Then the case is SLA-breach | API « AC 8.5-2: a case with no first human touch after 24 h is SLA-breach in operator metrics » (23 h 59 open, 24 h + 1 s breach, first touch clears it, SLA hours read from config, member 401); « caseSlaState names the four SLA states at the 24 h boundary »; Postgres test (`openCases` breach and clear on real SQL) | Done (run, green) |
| 8.6-1 | Given I Block, When they browse, Then my Profile is absent | API « AC 8.6-1: after a Block my Profile is absent when they browse, open it, or list favourites; and theirs for me » (grid, card, detail 404, favourites, both ways, third member unaffected); « a Block by the brother hides and closes the same way » | Done (run, green) |
| 8.6-2 | Given they send an Invite or Chat, When the API, Then rejects | API « AC 8.6-2: the API rejects an Invite either way after a Block, and a pending Invite can no longer be accepted »; « AC 8.6-2: an existing conversation closes for both; Chat sends are rejected either way and typing is not relayed » (real Socket.IO clients); e2e « AC 8.5-1 from Chat … » ends on the closed thread (composer disabled) | Done (run, green) |
| 4.4-3 | Given I report « misrepresented marital status », when submit, then the Report reason `misrepresented marital status` is available | API « AC 4.4-3: « misrepresented marital status » is a Report reason, in the one shared list the API and web use » (every reason accepted); boundary « the migration reason check lists exactly the shared Report reasons »; web unit « AC 4.4-3 / 8.5: the nine reasons come from the one shared list, in Stitch order, with none preselected »; e2e « AC 8.5-1 and AC 4.4-3 » posts `misrepresented_marital_status` | Done (run, green) |
| Story | Report a Profile **or message** | API message-Report test above (own message, stranger, unknown id → 404; text never stored) | Done |
| Story | Block **from Profile or Chat** | Web unit « Stories 8.5, 8.6: « Signaler / Bloquer le profil » is a link … » (screen 15), « … the header links « Signaler / Bloquer » and each of their bubbles « Signaler ce message » … » (screen 21); e2e chat entry test; e2e « AC 8.6: « Bloquer ce profil » blocks without a Report » | Done |
| U-1 | Given I blocked members, when I open « Membres bloqués » from Paramètres, then I see each member I blocked (pseudonym and blurred photo only), and never a member who blocked me | API « GET /v1/blocks lists only the Blocks I placed, newest first, with the pseudonym and the blurred photo only » (exact keys, the signed grant is the `blur` derivative, a Block on me is not listed, no photo → null); web unit « lists pseudonym and blurred photo only … », « Paramètres links to the list from a card after the PIN card … »; e2e « from Paramètres: lists pseudonym and blurred photo, asks to confirm, then unblocks one member » | Done (run, green) |
| U-2 | Given I choose « Débloquer », when I have not confirmed, then nothing changes; when I confirm, then my own Block is removed, and I cannot remove the other member's Block | API « GET and DELETE /v1/blocks refuse no session, staff and malformed ids; I can only remove my own Block »; Postgres test (`removeBlock` deletes only the blocker's row); e2e cancel sends nothing, confirm (double click) sends one DELETE for that id; e2e keyboard path; web unit (DELETE only inside the confirm handler, no native dialog) | Done (run, green) |
| U-3 | Given I unblocked and the other member has not blocked me, then visibility returns both ways, and Invites and Chat are allowed again | API « after an unblock browse, profile and favourites come back both ways, and Invites are allowed again »; « unblocking reopens the conversation the Block closed: sends and typing work again, history intact » (also proves the Block wrote nothing on the conversation; real Socket.IO typing) | Done (run, green) |
| U-4 | Given the other member also blocked me, when I unblock, then everything stays hidden and closed until they unblock too | API « when both blocked, one unblock keeps everything hidden and closed until the other also unblocks »; Postgres test (`blockedBetween` stays true after one removal) | Done (run, green) |
| Edge (U) | Empty list, load error + retry, 401 on DELETE, 404 (already lifted), signed out, staff, mahram | e2e « shows the empty state, a load error with retry, the sign-in link on 401, and drops a Block already lifted »; web route test « is an account page … » | Done |
| Edge | Invalid and boundary input (kind, id, reason, details 1000 / 1001, block flag, self, same gender, unknown) | API « validates the body and the target, and writes nothing on a refusal »; « POST /v1/blocks: 201 then 200 … refused » | Done |
| Edge | Double submit, reason missing, rate limit, 401, 404, load error | API rate-limit test (3 then 429, window slides, unreadable config 503); e2e dblclick posts once, « Choisissez un motif. », « shows the API message on a rate limit, the sign-in link on 401, and « Ce profil n'est pas disponible. » on 404 » | Done |
| Edge | Signed out, wrong role (staff, mahram), malformed id | API « refuses no session and staff sessions … »; web route test « is an account page: signed out goes to sign-in, a malformed id to Discover, staff and mahram stubs are refused »; malformed query values dropped (« reads only UUID query values … ») | Done |
| Security (NFR-001) | Server-side authorization; another member's message; Report rate limit (AD-17) | API tests above; another member's message → 404 | Done |
| Boundaries (AD-3, AD-10, AD-21) | Only trust writes report / moderation_case / block; nobody else reads block; no BillingPort | « only trust.ts writes report, moderation_case and block; trust never writes moderation_job », « no module but trust reads the block table », « Report and Block never reach BillingPort »; `billingCalls` stays 0 in every API test | Done |
| Privacy (NFR-002) | No message text in a Report; no who-blocked-whom signal | message-Report test (`not.toContain` the text); every Block effect reuses the unavailable / closed answers (tests above) | Done |
| a11y | WCAG 2.2 AA, keyboard path, 44 px targets | e2e `expectAccessible` on every state; « keyboard only: pick a reason, untick Block, and send with the keyboard »; styled browser check (section 8) | Done (unstyled in e2e, styled in the manual check) |
| Responsive | 360–1440, no horizontal scroll | e2e « fits every factory width » (report page from Chat); e2e « fits every factory width, with the confirmation open » (Membres bloqués); styled check at 6 widths for screen 23, 21, Membres bloqués and the Paramètres card | Done |
| i18n | French only | All copy in `REPORT_COPY` / `CHAT_COPY`; tests assert the strings | Done |
| Auditability (NFR-009) | Events for touched actions | AD-18's mandatory list has no Report or Block event; none written (flagged in 7) | n/a |

## 5. Test cases for QA

| # | Input | Expected |
| --- | --- | --- |
| 1 | Profile Report, reason `harassment`, details with spaces | 201; `report` + `moderation_case` with the same `sla_started_at` = submit time, `first_human_at` null; details trimmed |
| 2 | Reason `misrepresented_marital_status` | 201, stored as that code; label in UI « Dissimulation ou fausse déclaration de situation matrimoniale » |
| 3 | Reason missing / `other` | 400 « Choisissez un motif. »; UI: alert, focus first radio, no POST |
| 4 | details 1000 vs 1001 characters | 201 vs 400 « Précisions trop longues (1000 caractères au plus). » |
| 5 | Message Report on his message / on my message / from a stranger | 201 with `target_id` = message id and `conversation_id`; 404 « Ce message est introuvable. » for the other two |
| 6 | 11th Report within an hour (seed 10) | 429 « Trop de signalements en peu de temps. Réessayez plus tard. », nothing stored |
| 7 | Report with `block: true` twice | 2 reports, 2 cases, 1 block |
| 8 | `POST /v1/blocks` self / malformed / same gender / again | 400 / 400 / 404 / 200 |
| 9 | After a Block, the blocked member browses grid and card, opens the profile, lists favourites | Blocker absent; profile 404 (web redirects to `/decouvrir`); favourite gone |
| 10 | After a Block, the blocker browses | Blocked member absent too |
| 11 | After a Block, Invite either way; accept of a pending invite between them | 404 « Ce profil n'est pas disponible. »; no conversation |
| 12 | After a Block, send in the existing thread from either side; typing | 409 « Cette discussion est fermée. »; nothing stored; no typing event; thread shows « Ce profil n'est plus disponible. », composer disabled |
| 13 | Metrics: case at 23 h 59 / 24 h + 1 s / after `first_human_at` set | `sla_breach` 0 / 1 / 0 and `open` drops |
| 14 | `report_sla_hours` changed to 6 | metrics `sla_hours: 6`, breach follows |
| 15 | `/signaler/not-a-uuid`; signed out; staff session | redirect `/decouvrir`; redirect `/auth`; staff home |
| 16 | `/signaler/<id>?discussion=<other conversation>` where `other_id` ≠ id | « Ce profil n'est pas disponible. » |
| 17 | Keyboard only on screen 23 | Arrow keys pick a reason, Tab reaches details, checkbox (Space), submit (Enter); focus moves to « Signalement transmis » |
| 18 | Chat thread | « Signaler / Bloquer » in header; flag under his bubbles only; no scan or moderation wording on screen 21 |
| 19 | `GET /v1/blocks` as the blocker / as the blocked member | the blocked member listed with `pseudonym`, `created_at`, blurred `photo` only / empty list |
| 20 | `DELETE /v1/blocks/<id>` for my Block / for theirs on me / twice / `not-a-uuid` | 200 `{}` / 404 « Ce blocage n'existe pas. » / 404 / 404 |
| 21 | Unblock, then browse, profile, favourites, Invite, old thread send, typing | all back; thread `closed: false`, send 201, typing relayed |
| 22 | Both blocked, one unblocks | still hidden, thread closed, Invite 404, until the second unblock |
| 23 | « Débloquer » then « Annuler »; keyboard only (Enter, Tab, Enter) | no DELETE, focus back on « Débloquer »; keyboard unblocks, focus on the h1 |

## 6. Out of scope

- Case console, first human touch (`first_human_at`), strikes, sanctions, Ban: Story 8.7. Flag-originated cases: Story 8.3. Report outcome notifications to the reporter.
- A limit on block / unblock loops; the blocked-members list in the CIL data export.
- Screenshot upload on a Report (Stitch « Pièce justificative ou capture d'écran »): no evidence pipeline for Reports.
- Remove / Report Mahram (FR-077), Mahram flag (screens 38, 40): Epic 6.
- Member data export listing own Reports and Blocks.

## 7. Assumptions and known issues

Decisions the product owner should know:

1. **A Block hides both ways** (confirmed by the product owner on 2026-10-24) (FR-084 says the blocked member cannot see or contact the blocker; SOLUTION-DESIGN `block.blocked_id` says the same). I also hide the blocked member from the blocker, so she cannot keep opening a profile that can no longer answer. If you want one-way only, the change is `TrustPort.hiddenFor` / `blockedBetween` (one place).
2. **Existing conversation: closed for both, computed.** Both members see « Ce profil n'est plus disponible. », the composer is off, sends are 409, typing is not relayed, history stays readable (also as Report evidence). Nothing writes `conversation.ended_at` or `paused_by` (their meaning is « ended » / « paused by mahram, Sister or moderator »), so a future unblock reopens the thread without a data fix. In the Discussions list the row shows « Profil indisponible » with no link (existing 5.1 behaviour for an unavailable member).
3. **No one learns who blocked whom**: every effect reuses the existing unavailable / closed answers.
4. **No reason preselected** (Stitch preselects the first): a Report should be a deliberate choice. « Bloquer également ce profil » stays checked by default, as in Stitch.
5. **Added copy not in Stitch**: « Bloquer sans signaler » section (Story 8.6 needs a Block without a Report), « Le message choisi dans la discussion est joint à ce signalement. », the sent / blocked / unavailable / error states, « Signaler ce message » (screen-reader name of the bubble flag), « Retour à la discussion » / « Annuler et retourner à la discussion ». The success line names the SLA hours from `report_sla_hours` (« … dans les 24 heures. »): that is the published 24h SLA of FR-083.
6. **Screenshot upload dropped** from the Stitch form (no pipeline).
7. **Report rate limit fails closed** (503) when `rl_report_per_hour` is unreadable; the SLA-hours display value does not block a Report (null → sentence without hours).
8. **No audit event**: AD-18's mandatory list does not include Report or Block.
9. Opening the Report page from a Profile reads `/v1/profiles/<id>`, which records a profile visit (same as opening the profile).
10. **Concurrency**: the hourly Report limit is count-then-insert; two parallel submits at the limit can both pass (at most one over).
11. A message Report is accepted after a Block (the reporter can still report what was said); the thread is reachable by direct URL (`/discussions/<id>`), not from the list (no link for an unavailable member).

12. **Unblock (revision 2): the conversation the Block closed reopens for both**, with its history. The architecture has no « closed by block » conversation state, chat is the only writer of `ended_at` / `paused_by` and those mean ended / paused by mahram, Sister or moderator, so keeping the thread closed would need a new state. The member who wants it closed can Block again, end it, or Report. Tested in the API suite.
13. **Unblock deletes the row** (no `revoked_at` in SOLUTION-DESIGN, no audit event in AD-18). Nothing is notified to the other member.
14. **Mutual Blocks**: my unblock only removes my row; the other member's Block keeps both hidden and the thread closed, and my list does not reveal it.
15. **« Membres bloqués » has no Stitch screen or EXPERIENCE.md row**; it reuses the screen 27 document and Paramètres card style. Its route is `/settings/bloques` (Paramètres is `/settings`). The confirmation is inline in the row, not a modal (the project forbids native dialogs and has no modal component).
16. The list shows a member who has since left or been suspended (pseudonym kept) so the Block can still be lifted; a deleted account is left out.

Existing tests changed (not weakened):

- `discussions-page.test.ts`: « Signaler / Bloquer » removed from the list of Stitch lines the product does not ship, because this story ships it; a new test asserts the link and the per-bubble flag.
- `profile-review.test.ts`: the exact `/v1/staff/metrics` body now includes the `reports` block.
- `operator-config.migrate.test.ts`: table lists, migration list and count include `0024_report_block`.

Known issues of this environment (not of the story):

- The cloud container cannot reach the Tailwind CDN, Google Fonts or the Material Symbols font. E2e ran unstyled with `E2E_ALLOW_ERRORS`. I did a separate styled check (section 8) with Tailwind 3.4.17 built locally from each Stitch page's own config; icons still render as ligature text. A visual pass with the real CDN and icon font is for Fay's Mac / staging.
- Docker Hub answered 429 for `postgres:17`; I pulled `mirror.gcr.io/library/postgres:17` and tagged it `postgres:17` for the integration run. `compose.test.ts` fails here because `npm ci` inside the Docker build hits the proxy's certificate (same as 5.1/5.2).
- Pre-existing failures, identical on `main`: unit `photo-rules.test.ts` « keeps a 32px play circle in Chrome … » (no Chrome at its hardcoded paths); 30 e2e tests in `invite-inbox`, `profile-edit-flow`, `staff-review`, `staff-shell` (Tailwind CDN guard and unstyled axe/layout checks). The sorted failure list on this branch equals the one on `main` at `38a6a63`.
- Revision 2 e2e ran on a private port (3201, a local copy of the Playwright config that was not committed) so it could not collide with a QA run on 3100. Two suite files hardcode `localhost:3100` or depend on the clock: `app-shell.spec.ts` « each item opens its section » (a regex on `localhost:3100`) and `chat.spec.ts` two « AC 5.1-1 » tests (they expect « Aujourd'hui » for a message a few minutes old; the run was just after midnight in Ouagadougou, so it showed « Hier »). These 6 fail identically on `db16287` with the same setup (checked).
- Not run: the full-stack flow in section 3 (no compose stack in this container), real-device TalkBack, Lighthouse.

## 8. Self-check, revision 2 (real output, worktree `/home/claude/rb-unblock`, 2026-10-24)

- `npm run lint`: exit 0; only the 3 pre-existing warnings (`life-pause.ts`, `photo-rules.test.ts`, `v2-flow.test.ts`).
- `npm run typecheck`: exit 0. `npm run build`: exit 0.
- `npm run migration-check`: `Everything's fine 🐶🔥` (no new migration).
- `npm run test:unit`: `Test Files  1 failed | 80 passed | 2 skipped (83)`, `Tests  1 failed | 635 passed | 12 skipped (648)`. The failure is the pre-existing `photo-rules` Chrome check. `reports-blocks.test.ts` 22 passed (5 new), `blocked-list-page.test.ts` 5 passed (new), `report-block-page.test.ts` 8 passed.
- `npm run test:integration` (no compose stack up): `Test Files  1 failed | 4 passed (5)`, `Tests  33 passed | 2 skipped (35)`; the failure is `compose.test.ts` (`npm ci --omit=dev` in the Docker build, proxy TLS). `operator-config.migrate.test.ts` alone: `Tests  18 passed (18)`, including « files a Report with its moderation_case, keeps Blocks both ways, lifts only my own Block, and counts SLA-breach on migrated Postgres (Stories 8.5, 8.6) ».
- e2e (`PLAYWRIGHT_CHROMIUM_EXECUTABLE=/opt/pw-browsers/chromium`, `E2E_ALLOW_ERRORS` for the Tailwind CDN and Google Fonts plus `localhost:3201/v1/` and `localhost:3201/favicon.ico`, the port-3201 copies of the two 3100 known issues): `blocked-list.spec.ts` 6 passed, 2 skipped (keyboard and width sweep run on desktop only); `report-block.spec.ts` 10 passed, 2 skipped.
- Full e2e suite, same setup: `147 passed`, `35 skipped`, `36 failed`. 30 are the revision 1 list (identical to `main`); the other 6 are the port / clock tests above, which fail the same way on `db16287`.
- Styled browser check (scratch script, Tailwind 3.4.17 built locally from the screen 27 config, API mocked, long pseudonym) at 360, 390, 768, 1024, 1280, 1440 for « Membres bloqués », the same with the confirmation open, and the new Paramètres card: horizontal overflow 0, zero serious or critical axe violations, no visible target under 44 × 44 px, no console error. It caught one problem, now fixed: the card's decorative icon in `soft-gold` failed contrast as ligature text; it is now `#7D5F27` as on screen 23.

## 9. Self-check, revision 1 (real output, this container, 2026-10-23)

- `npm run lint`: exit 0; only the 3 pre-existing warnings (`life-pause.ts` no-control-regex, `photo-rules.test.ts` no-this-alias, `v2-flow.test.ts` unused `editBtn`).
- `npm run typecheck`: exit 0.
- `npm run build`: exit 0.
- `npm run migration-check`: `Everything's fine 🐶🔥`.
- `npm run test:unit`: `Test Files  1 failed | 79 passed | 2 skipped (82)`, `Tests  1 failed | 625 passed | 12 skipped (638)`. The failure is the pre-existing `photo-rules` Chrome check (fails on `main` too). New files: `reports-blocks.test.ts` 17 passed; `report-block-page.test.ts` 8 passed.
- `npm run test:integration` (no compose stack up): `Test Files  1 failed | 4 passed (5)`, `Tests  33 passed | 2 skipped (35)`; the failure is `compose.test.ts` (Docker build TLS). `operator-config.migrate.test.ts` alone: `Tests  18 passed (18)`, including « files a Report with its moderation_case, keeps Blocks both ways, and counts SLA-breach on migrated Postgres (Stories 8.5, 8.6) ».
- `npx playwright test e2e/report-block.spec.ts` (`PLAYWRIGHT_CHROMIUM_EXECUTABLE=/opt/pw-browsers/chromium`, `E2E_ALLOW_ERRORS='cdn\.tailwindcss\.com,tailwind is not defined,fonts\.googleapis\.com,fonts\.gstatic\.com,ERR_NETWORK_CHANGED'`): `10 passed`, `2 skipped` (keyboard path and width sweep run on the desktop project only).
- `npm run test:e2e` full suite, same env: `147 passed`, `33 skipped`, `30 failed`. On `main` (stashed tree, same env): `137 passed`, `31 skipped`, `30 failed`; the sorted failure lists are identical.
- Styled browser check (scratch script, not committed: page HTML from the dev server, Tailwind 3.4.17 + forms + container-queries built from each Stitch config, API mocked) at 360, 390, 768, 1024, 1280, 1440 for screen 23 (from Chat, with a message) and screen 21: horizontal overflow 0, zero serious or critical axe violations, no visible interactive target under 44 × 44 px, no console error. It caught and I fixed: the decorative reason icon contrast (now `#7D5F27`), the checkbox target (now a 44 px label), and the bubble flag width (the thread's `min-width: 0` rule beat `min-w-[44px]`; now `w-[44px] h-[44px]`). Screenshots compared with Stitch 23: same card, order and copy, minus the screenshot upload, plus « Bloquer sans signaler ».
