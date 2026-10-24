---
title: 'Report with a 24h SLA (8.5) and Block (8.6), with Unblock'
type: 'feature'
created: '2026-10-23'
status: 'ready'
route: 'factory'
story_id: '8-5-8-6-report-and-block'
depends_on: '5-1-5-2-text-chat (PR #11, merged into main at 38a6a63)'
---

## Intent

**Problem:** a member has no way to tell the platform that a profile or a Chat message is abusive, and no way to stop someone from seeing or contacting her. The Profile page (Stitch 15) carries a dead « Signaler / Bloquer le profil » button, the Chat thread (Stitch 21) dropped its « Signaler / Bloquer » button in Story 5.1 because nothing stood behind it, and Story 4.4 AC 3 (« misrepresented marital status » as a Report reason) was deferred here because no Report reason list existed.

**Approach:** a new trust module (`trust.ts`, the only writer of `report`, `moderation_case` and `block`, AD-3) and migration `0024_report_block`. `POST /v1/reports` files a Report on a Profile or on one Chat message and opens one `moderation_case` in the same transaction, with `sla_started_at` = submit time and `first_human_at` null; an optional `block: true` writes the Block in that same transaction. `POST /v1/blocks` blocks without a Report. Other modules ask a new `TrustPort` (`blockedBetween`, `hiddenFor`) and never read `block`. Operator metrics (`GET /v1/staff/metrics`) gain a `reports` block whose `sla_breach` counts open cases past `operator_config.report_sla_hours`. The web adds Stitch screen 23 at `/signaler/<member id>` inside the shared app shell, opened from the Profile page and from the Chat thread (thread header and each of the other member's bubbles). One shared Report reason list lives in `@ankanu/kernel` and includes `misrepresented_marital_status`.

Scope chosen by the product owner (Faycal, 2026-10-23): Report and Block from the Profile page and from the Chat thread; one shared reason list with the 4.4 AC 3 reason; the SLA-breach state is computed and queryable, the staff case console is Story 8.7.

Scope added by the product owner (Faycal, 2026-10-24): Block both ways is confirmed. Add « Membres bloqués », a screen where the blocker sees the members she blocked and unblocks each one after a confirmation, reachable from Paramètres. Unblock removes my own Block only (`DELETE /v1/blocks/:blocked_id`); afterwards browse, profile and favourites visibility returns, and Invites and Chat are allowed again, unless the other member also blocked me. The list shows the pseudonym and blurred photo only. Decide and document what an unblock does to the conversation the Block closed.

Sources: epics.md Stories 8.5, 8.6 (and 4.4 AC 3); PRD FR-083, FR-084, NFR-003, NFR-004 (Report and Block on the core path), UJ-1 step 12; ARCHITECTURE-SPINE AD-3 (table ownership: `report`, `moderation_case`, `block` are trust's; `moderation_job`, `flag_queue` stay moderation's), AD-10 (a Member Report opens a `moderation_case` written only by trust; the passive flag writes `flag_queue` only), AD-17 (Report rate limit from `operator_config`), AD-18 (audit list: no Report or Block event is mandatory), AD-21 (Report and Block never call BillingPort); SOLUTION-DESIGN §6 `report`, `moderation_case`, `block`, §7 resource map (trust: `/v1/reports`, `/v1/blocks`); EXPERIENCE.md rows « Report / Block », « Profile detail », states row « Report / Block » (reason required, submit in flight, rate limit, SLA started, hidden); Stitch `23-report-block`, `15-profile-detail`, `21-chat-thread`.

## Boundaries & Constraints

**Always:**

- **Viewer gate** on every trust command (Report, Block, the blocked list, Unblock): live session (`requireLiveSession`, PIN gate), then `assertMemberViewer` (staff 403 `staff_session`, mahram 403 `mahram_session`, the member's account must exist). No session 401. **The viewer's own profile does not have to be listable** (revision 3, QA round 2 F-1): a member whose profile is unpublished (private, in review, waiting for ID or liveness), held, or paused can still Report, Block, see her Blocks and Unblock. Browse, profiles, favourites, Invites and Chat keep `assertBrowseViewer`.
- **`GET /v1/blocks` is capped** at `BLOCK_LIST_MAX` = 100 newest Blocks with `has_more` when older ones exist (revision 3, F-3); the store query carries the limit and the per-row account and blur reads run in parallel.
- **One shared reason list** `REPORT_REASONS` in `packages/kernel/src/report.ts`, in Stitch order: `indecency` « Indécence ou tenue inappropriée », `sexual_content` « Propos à caractère sexuel », `impersonation` « Usurpation d'identité », `multiple_accounts` « Comptes multiples », `harassment` « Harcèlement ou insistance déplacée », `money_scam` « Demande d'argent ou tentative d'escroquerie », `hateful` « Propos haineux ou irrespectueux », `non_matrimonial` « Usage non matrimonial », `misrepresented_marital_status` « Dissimulation ou fausse déclaration de situation matrimoniale ». The api validates against it, the web renders it, the migration's check constraint lists the same codes (a test compares them).
- **`POST /v1/reports`** `{ target_kind: 'profile' | 'message', target_id, reason, details?, block? }`. Order, nothing written when a step fails:
  1. Viewer gate.
  2. `target_kind` else 400 « target_kind : valeur non reconnue. » `{ field }`; `target_id` a UUID v7 else 400 « target_id : valeur non reconnue. »; `reason` in the list else 400 « Choisissez un motif. » `{ field: 'reason' }`; `details` absent, null or a string, trimmed, at most 1000 characters (else 400 « details : valeur non reconnue. » or « Précisions trop longues (1000 caractères au plus). » `{ field, max: 1000 }`), empty becomes null; `block` absent or boolean else 400 « block : valeur non reconnue. ».
  3. Target. Profile: a member account of the other gender, not me, any status (a member who left or was blocked can still be reported), else 404 « Ce profil n'est pas disponible. ». Message: through chat's `messageForReport(viewer, messageId)`: the message exists, is in a conversation I take part in, and was sent by the other member; else 404 « Ce message est introuvable. ». The reported member is the sender.
  4. Rate limit: reports filed by me in the last hour from `operator_config.rl_report_per_hour` (seed 10). At the limit 429 `RATE_LIMITED` « Trop de signalements en peu de temps. Réessayez plus tard. » `retryable: true`. Unreadable config 503 (fail closed on the limit, nothing written).
  5. One transaction: `report { id, reporter_id, target_kind, target_id, reported_account_id, conversation_id (message only), reason, details, sla_started_at = now, first_human_at: null }`, `moderation_case { id, report_id, flag_queue_id: null, sla_started_at = now, first_human_at: null }`, and with `block: true` a `block { blocker_id: me, blocked_id: reported }` (an existing pair is kept, not duplicated).
  6. 201 `{ report: { id, target_kind, reason, sla_started_at }, case: { id, sla_started_at, sla_state: 'open' }, blocked, sla_hours }`. `sla_hours` is `operator_config.report_sla_hours`, or null when unreadable (the Report is filed anyway: a safety path does not fail on a display value).
  - Stored: ids only for a message Report (`target_id` = message id, `conversation_id`), never the message text.
- **`POST /v1/blocks`** `{ blocked_id }`: viewer gate; a UUID v7 that is not me else 400 « blocked_id : valeur non reconnue. » `{ field: 'blocked_id' }`; a member of the other gender (any status) else 404 « Ce profil n'est pas disponible. ». First Block 201, the same pair again 200, body `{ block: { blocked_id, created_at } }`.
- **What a Block does** (FR-084 « they can no longer see or contact you »). A Block hides **both ways**: SOLUTION-DESIGN says the blocked member cannot see or contact the blocker, and keeping the blocker's view of the blocked member would let her keep opening a profile that can no longer answer her. Every effect is the same answer as an unavailable member, so nobody learns who blocked whom:
  - Browse card and grid (`/v1/browse`): both members are excluded (`excludeIds` = passed ∪ `TrustPort.hiddenFor`).
  - Profile detail (`/v1/profiles/:id`): 404 « Ce profil n'est pas disponible. » both ways; no visit is recorded.
  - Favourites: the blocked profile drops out of the list; adding it is 404.
  - Invites: `POST /v1/invites` either way is 404 « Ce profil n'est pas disponible. », nothing stored; a pending invite between them shows `other: { available: false }` and its accept is 404, so no conversation opens.
  - **Existing conversation: closed for both**, computed, not written. `GET /v1/conversations` and `/:id` show `other: { available: false }`, and `/:id` says `closed: true`. `POST …/messages` from either member is 409 « Cette discussion est fermée. » `{ reason: 'conversation_closed' }`, nothing stored, no scan job, no event. The socket `conversation.typing` relay refuses both (no event to anyone). The history stays readable to both (it is their own, and it is evidence for a Report filed after the Block). Chat does not write `conversation.ended_at` or `paused_by`: those mean « ended » and « paused by mahram / Sister / moderator » (SOLUTION-DESIGN), chat is their only writer, and a computed close stays right if an unblock ships later.
- **`GET /v1/blocks`** (viewer gate as above): `{ count, items: [{ blocked_id, pseudonym, created_at, photo }] }`, the Blocks **I placed**, newest first. `photo` is the member's live main Profile Photo signed as the **blurred** derivative for me (`signMedia(…, 'blur', me)`), whatever Reveal the pair once had; null without one. No age, city, bio, marital fields or verification. A Block placed **on me** is never listed (nobody learns who blocked them). A member whose account is gone is left out. `Cache-Control: no-store`.
- **`DELETE /v1/blocks/:blocked_id`** (viewer gate): deletes **my own** row for that pair (`blocker_id = me`), 200 `{}`. No row of mine (none, the other member's Block on me, unknown or malformed id) is the same 404 `NOT_FOUND` « Ce blocage n'existe pas. », nothing changed. The row is deleted, not soft-deleted: SOLUTION-DESIGN `block` has no `revoked_at`, nothing else references it, and AD-18 lists no Block event. No BillingPort.
- **What an Unblock does.** Every Block effect is computed through `TrustPort` (`blockedBetween`, `hiddenFor`) on each request, and the Block wrote nothing else, so deleting my row is the whole change:
  - With no Block left in either direction: browse card and grid, profile detail and favourites show both members again (a favourite row was never deleted by the Block, so it comes back); Invites either way are allowed again under the usual rules; a pending invite between them can be accepted again.
  - **The conversation the Block closed reopens for both**, with its full history: `other` is available again, `closed` is false unless the conversation was ended or paused for another reason (`ended_at` / `paused_by`, which the Block never wrote), sends are accepted under the usual rules (cap, contact-share) and the socket typing relay works again. This follows from the architecture: chat is the only writer of `conversation.ended_at` / `paused_by`, and those mean « ended » and « paused by mahram / Sister / moderator », not « blocked ». Keeping the thread closed after an unblock would need a new conversation state the architecture does not have; the member who wants it closed can still Block again, end it, or Report.
  - **If the other member also blocked me**, their Block still hides both of us and keeps the conversation closed; my list no longer shows them, theirs still shows me; nothing tells me their Block exists. Everything comes back only when both rows are gone.
- **Operator metrics** `GET /v1/staff/metrics` (any staff session with MFA done): `{ free_review: …, reports: { sla_hours, open, sla_breach, oldest_open_started_at } }`. `open` = cases with `first_human_at` null; `sla_breach` = open cases whose `sla_started_at` is more than `report_sla_hours` ago; unreadable config 503 « report_sla_hours : la configuration est illisible. ». A pure `caseSlaState(case, now, hours)` names the four states `open | sla_breach | first_touch_in_sla | first_touch_late` for Story 8.7's console. A partial index on open cases backs the count.
- **Web `/signaler/<member id>`** (Stitch 23) inside the shared app shell (Découvrir current from a Profile, Discussions current from Chat). Account-gated like the other member pages; staff and mahram stubs get the member-route refusal; a malformed id redirects to `/decouvrir`. Query `?discussion=<id>` (and `&message=<id>`) from Chat; malformed values are dropped, a message without its conversation is dropped. The page loads the member in the browser (`/v1/profiles/<id>`, or `/v1/conversations/<id>` from Chat, whose `other_id` must match), so the API decides every refusal. Copy, French only:
  - « Retour au profil » / « Retour à la discussion »; eyebrow « Sécurité & bienséance »; title « Signaler ou bloquer ce profil »; the Stitch intro « Afin de préserver la solennité de la démarche et la dignité des échanges, tout comportement non conforme fait l'objet d'un examen attentif par notre pôle de modération éthique. »; chip « Profil concerné : <pseudonyme> (<ville>) »; from a message, « Le message choisi dans la discussion est joint à ce signalement. ».
  - Fieldset « Motif du signalement (requis) » + « Sélectionnez le motif principal », the nine reasons as radios (48 px rows), **none preselected**. Submitting without one: « Choisissez un motif. » in an alert and focus on the first radio; nothing is posted.
  - « Précisions utiles pour les modérateurs (facultatif) », Stitch placeholder, `maxlength` 1000, counter « n/1000 » from 900.
  - « Bloquer également ce profil » + the Stitch explanation, **checked by default** as in Stitch; its 44 px label wraps the checkbox.
  - « Transmettre le signalement » (disabled while in flight, double click posts once) and « Annuler et retourner au profil » / « … à la discussion ».
  - « Bloquer sans signaler » + « Ce membre ne pourra plus consulter votre fiche ni vous envoyer d'invitation ou de message. » + button « Bloquer ce profil » (Story 8.6 needs a Block without a Report).
  - Sent: heading « Signalement transmis » (focused) and « Un membre de l'équipe de modération l'examinera dans les 24 heures. » (hours from the API; without them « Un membre de l'équipe de modération l'examinera. »), plus « Ce membre ne peut plus consulter votre fiche ni vous contacter. » when blocked; link « Retour à la découverte » (`/decouvrir`) or « Retour aux discussions ». Block only: « Profil bloqué » + the same sentence.
  - Errors: the API message in an alert (rate limit, 400); 401 « Votre session a expiré. Reconnectez-vous. » with « Se reconnecter » (`/auth`); network « Envoi impossible. Vérifiez votre connexion et réessayez. ». Unknown, hidden or mismatched member: « Ce profil n'est pas disponible. » with the after-link. Load error with « Réessayer ».
  - No horizontal scroll from 360 to 1440, keyboard path (radios with arrows, Tab to details, checkbox, submit), axe clean (WCAG 2.2 AA), 44 px targets.
- **Web « Membres bloqués »** at `/settings/bloques`, account-gated like `/settings` (staff and mahram stubs get the member-route refusal), inside the shared app shell with Profil current. No Stitch screen or EXPERIENCE.md row exists for it, so it is built on the screen 27 document (same head, header, footer), with the Paramètres header style and its cream rounded cards. Reached from Paramètres: a new card « Membres bloqués » + « Consultez les membres que vous avez bloqués et levez un blocage si vous le souhaitez. » + « Gérer », in the « Formules & Packs » link-card style, after the PIN card. Copy, French only:
  - « Retour aux paramètres »; eyebrow « Préférences & confidentialité »; h1 « Membres bloqués »; « Les membres que vous avez bloqués ne voient pas votre fiche et ne peuvent pas vous contacter. Vous pouvez lever un blocage à tout moment. »; count chip « 1 membre bloqué » / « n membres bloqués ».
  - One row per member: the blurred photo in a 56 px circle (a person icon without one), the pseudonym, « Bloqué le <date> » (French date, Ouagadougou time), and « Débloquer » (accessible name « Débloquer <pseudonyme> », `aria-expanded`).
  - **Confirmation before unblocking**, inline in the row (no native dialog): « Débloquer <pseudonyme> ? » (focused), « Ce membre pourra de nouveau voir votre fiche, vous envoyer une invitation et vous écrire dans une discussion existante. », « Confirmer le déblocage » and « Annuler » (focus back to « Débloquer »). Only « Confirmer le déblocage » sends the DELETE; a double click sends one.
  - Done: the row leaves the list, « Blocage levé pour <pseudonyme>. » in a status line, focus on the h1, the count updates. A 404 (already lifted elsewhere) drops the row with « Ce blocage n'existe plus. ». 401 « Votre session a expiré. Reconnectez-vous. » + « Se reconnecter » in the row; other errors keep the row with the API message or « Envoi impossible. Vérifiez votre connexion et réessayez. ».
  - States: « Chargement… »; empty « Vous n'avez bloqué aucun membre. »; load error « Chargement impossible. Vérifiez votre connexion et réessayez. » + « Réessayer »; 401 + « Se reconnecter ».
  - No horizontal scroll from 360 to 1440 (with the confirmation open), keyboard path, axe clean, 44 px targets.
- **Entries:** Profile page (Stitch 15): the « Signaler / Bloquer le profil » button becomes a link to `/signaler/<id>`. Chat thread (Stitch 21): « Signaler / Bloquer » in the header (`/signaler/<other>?discussion=<id>`) and a 44 × 44 flag link named « Signaler ce message » under each of the other member's bubbles (`…&message=<id>`), never under mine. Chat still has no scan or moderation wording.

**Never:**

- No BillingPort, entitlement or quota on Report, Block, or anything they change (AD-21; boundary test).
- No write of `report`, `moderation_case` or `block` outside `trust.ts`; no read of `block` outside `trust.ts`; trust never writes `moderation_job` or `flag_queue`; moderation never touches trust tables (boundary tests).
- No message text, phone or name in a `report` row, a log or a metric. Staff metrics are counts only.
- No AI decision, auto-sanction, strike or Ban from a Report (Story 8.7 is human). No `first_human_at` write in this story.
- No member-visible hint of who blocked whom: every Block effect reuses the unavailable / closed answers.
- No screenshot upload (Stitch « Pièce justificative ou capture d'écran »): there is no evidence pipeline for Reports yet (media kinds are `profile_photo | chat_photo | voice_note`).

## Acceptance Criteria

Story 8.5:

1. **Given** I submit a Report, **when** a moderation_case exists, **then** sla_started_at is submit time.
2. **Given** 24h elapse with no first human, **when** Operator metrics, **then** the case is SLA-breach.

Story 8.6:

3. **Given** I Block, **when** they browse, **then** my Profile is absent.
4. **Given** they send an Invite or Chat, **when** the API, **then** rejects.

Story 4.4 (deferred here):

5. **Given** I report « misrepresented marital status », **when** submit, **then** the Report reason `misrepresented marital status` is available.

Unblock (product owner, 2026-10-24; IDs used in the handoff):

6. **U-1** Given I blocked members, when I open « Membres bloqués » from Paramètres, then I see each member I blocked (pseudonym and blurred photo only), and never a member who blocked me.
7. **U-2** Given I choose « Débloquer », when I have not confirmed, then nothing changes; when I confirm, then my own Block is removed (`DELETE /v1/blocks/:id`), and I cannot remove the other member's Block.
8. **U-3** Given I unblocked and the other member has not blocked me, then browse, profile and favourites visibility returns both ways, and Invites and Chat are allowed again (the conversation the Block closed reopens with its history).
9. **U-4** Given the other member also blocked me, when I unblock, then everything stays hidden and closed until they unblock too.

Interpretation notes (flagged in the handoff):

- AC 2 « when Operator metrics »: the operator metric is the `reports` block of `GET /v1/staff/metrics` (counts), plus `caseSlaState` for one case. The breach test is strict (`> report_sla_hours`), the same rule as the Free-review SLA. There is no metrics screen yet; Story 8.7 / the operator dashboard will read these.
- AC 3 « when they browse »: browse card and grid, profile detail and favourites. Hidden both ways (see Boundaries).
- AC 4 « they send an Invite or Chat »: Invite send either way, accept of a pending invite between them, Chat send either way, and the socket typing relay. The existing conversation closes for both (computed).
- AC 5: the code is `misrepresented_marital_status`; the member sees « Dissimulation ou fausse déclaration de situation matrimoniale » (the Stitch label).
- « Report a Profile or message » (story statement): a message Report references the message id and its conversation; only the other member's message.

## Deferred

- **Unblock rate or cool-down** (block / unblock / block again in a loop): not asked; no limit today, every step is the member's own choice and nothing is notified.
- **The blocked members list in the CIL data export.**
- **Screenshot evidence on a Report**: needs a `report_evidence` media kind and its scan path.
- **First human touch (`first_human_at`)**, the case console, sanctions: Story 8.7. Flag-originated cases (`flag_queue_id`): Story 8.3.
- **Report rate limit under concurrency**: count-then-insert, so two parallel submits at the limit can both pass (at most one over). Acceptable for an abuse limit; a per-reporter advisory lock can tighten it.
- **Member data export (CIL, FR-019)** does not yet list a member's own Reports and Blocks.
- **Visit signal:** opening the Report page from a Profile reads `/v1/profiles/<id>`, which records a profile visit like any profile open.

## Code Map

- `code/packages/kernel/src/report.ts` (new): `REPORT_REASONS`, `isReportReason`, `REPORT_DETAILS_MAX`; exported from `index.ts`.
- `code/packages/ports/src/index.ts`: `TrustPort`.
- `code/apps/api/src/account-schema.ts`: `report`, `moderationCase`, `block`; `drizzle/0024_report_block.sql` (+ snapshot, journal).
- `code/apps/api/src/trust.ts` (new): trust store (memory + Postgres), `storeTrustPort`, `caseSlaState`, `report_sla_hours` / `rl_report_per_hour` readers. `trust-port.ts` (new): get/set `TrustPort`.
- `code/apps/api/src/reports.ts` (new): `submitReport`, `blockMember`, `readReportMetrics`. `trust.controller.ts` (new): `ReportsController`, `BlocksController`; `app.module.ts`.
- `code/apps/api/src/chat-messages.ts`: `MessageStore.find`, `messageForReport`, Block close in list / read / send / typing. `browse-grid.ts`, `public-profile.ts`, `favourites.ts`, `invites.ts`: `TrustPort` checks. `staff.controller.ts`: `reports` metrics.
- Unblock: `trust.ts` (`blocksBy`, `removeBlock`), `reports.ts` (`listMyBlocks`, `unblockMember`), `trust.controller.ts` (`GET /blocks`, `DELETE /blocks/:blockedId`); web `apps/web/src/blocked-list-page.ts` (new), `app/settings/bloques/route.ts` (new), `src/v2-serve.ts` (`blockedListResponse`), `src/entry-guard.ts` (`/settings/bloques`), `src/v2-pages.ts` (Paramètres card); tests `blocked-list-page.test.ts` (new), `e2e/blocked-list.spec.ts` (new), new cases in `reports-blocks.test.ts` and the Postgres test.
- Web: `apps/web/src/report-block-page.ts` (new, screen 23), `app/signaler/[id]/route.ts` (new), `src/v2-serve.ts` (`reportBlockResponse`), `src/entry-guard.ts` (`isReportPath`), `src/profile-detail.ts` (link), `src/discussions-page.ts` (header and bubble links), `apps/web/Dockerfile` + `.dockerignore` (Stitch 23).
- Tests: `apps/api/src/reports-blocks.test.ts` (new), `operator-config.migrate.test.ts` (Postgres), `profile-review.test.ts` (metrics shape), `apps/web/src/report-block-page.test.ts` (new), `discussions-page.test.ts`, `profile-detail.test.ts`, `e2e/report-block.spec.ts` (new).
