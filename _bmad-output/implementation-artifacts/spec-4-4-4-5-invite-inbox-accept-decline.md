---
title: 'Invite inbox with marital honesty (4.4) and accept, quiet decline, Chat only after Sister consent (4.5)'
type: 'feature'
created: '2026-10-23'
status: 'ready'
route: 'factory'
story_id: '4-4-4-5-invite-inbox-accept-decline'
depends_on: 'discover-app-shell (PR #9, merged into main at 1f40702); 4-1-4-2-send-invite-and-quota'
---

## Intent

**Problem:** Stories 4.1 and 4.2 let a member send an Invite, and the recipient can read a bare `GET /v1/invites?box=received` list, but nobody can answer it. The Invitations tab of the shared app shell is a title-only placeholder (`member-section-page.ts`). There is no accept or decline command, no `conversation` table and no chat module, so a Sister cannot consent, and nothing stops a Brother from sending again after a refusal.

**Approach:** the invites module gets two commands, `POST /v1/invites/:id/accept` and `POST /v1/invites/:id/decline`, recipient only, server-side authorization. Accept updates the invite and, in the same transaction, calls `ChatPort.openFromInvite`, which is the only code that inserts `conversation` (new minimal `chat` module, stage `chat`, no messages). Decline creates nothing and blocks a resend from the same sender (FR-043). The list grows to three boxes (`received`, `sent`, `accepted`) with the other member's age, city, verified flag, blur thumb and, before accept, marital status and polygamy intent (FR-037). A minimal `GET /v1/conversations` lets either member check that a thread exists only after consent (FR-041). The web fills the Invitations tab with the Stitch screen `19-invite-inbox` (tabs Reçues, Envoyées, Acceptées) inside the shared app shell.

Sources: epics.md Stories 4.4 and 4.5; PRD FR-037, FR-039, FR-040, FR-041, FR-042, FR-043; ARCHITECTURE-SPINE AD-3, AD-21 (accept and `openFromInvite` never call `BillingPort`), AD-23 (only `ChatPort.openFromInvite` inserts `conversation`; decline creates no conversation and no resend), AD-26, AD-27 (`invite_quota` never written on accept, no refund on decline), AD-18 (mandatory audit events); SOLUTION-DESIGN §6 `invite`, `conversation`; EXPERIENCE.md rows « Invite inbox », `invite-row`, `button-quiet`, Invite inbox state row; DESIGN.md `button-quiet`, `invite-row`; Stitch `19-invite-inbox`.

## Boundaries & Constraints

**Always:**

- **List** `GET /v1/invites?box=received|sent|accepted` (default `received`), member session only (`requireLiveSession`, `assertBrowseViewer`: staff 403, mahram 403, not listable 403). Own rows only, newest first, at most 200:
  - `received`: invites where I am `to_id` (all states; the web shows the pending ones under « Reçues »).
  - `sent`: invites where I am `from_id` (all states).
  - `accepted`: accepted invites where I am either party, each with its `conversation_id`.
  - Item: `{ id, state, created_at, direction: 'received'|'sent', from_id | to_id, other_id, pseudonym, conversation_id, other }`. `conversation_id` is null unless the invite is accepted. `other` is `{ available: true, age, city, marital_status, polygamy_intent, verified, photo }` when the other member's account is `Active`, member and the profile `public`; otherwise `{ available: false }` with no field values. `marital_status` and `polygamy_intent` are the stored tokens (`single|married|divorced|widowed`, `no|yes`, or null when not filled). `photo` is the live MAIN Profile Photo as a blur derivative (`{ id, url }`), or null; never a clear image.
  - No item carries a read time, decision time, `sister_accepted_at`, or anything that says when or whether the recipient opened it (FR-042, no read receipt). The list never calls `BillingPort`.
- **Accept** `POST /v1/invites/:id/accept`, no body. Checks in this order; nothing is written when one fails:
  1. Viewer gate as above.
  2. `:id` is not a UUID v7, or the invite does not exist, or I am neither sender nor recipient: 404 `NOT_FOUND` « Cette invitation n'existe pas. » (same body, so another member's invite does not leak).
  3. I am the sender: 403 `FORBIDDEN` « Seule la personne invitée peut répondre à cette invitation. » `{ reason: 'not_recipient' }`.
  4. State: already `accepted` returns 200 with the same conversation (double tap safe, no second conversation). `declined`: 409 « Cette invitation n'est plus en attente. » `{ reason: 'invite_not_pending', state: 'declined' }`.
  5. The sender is no longer available (account not `Active`, profile not `public`): 404 `NOT_FOUND` « Ce profil n'est pas disponible. »; the invite stays pending.
  6. One transaction: guarded update `state = 'accepted'` only while `pending` and `to_id = me`, sets `sister_accepted_at` (now when the recipient is the Sister; the invite's `created_at` when the Sister sent it: her send was her consent), then `ChatPort.openFromInvite(tx, { inviteId })` inserts `conversation { id, invite_id, stage: 'chat' }`. A unique index on `conversation.invite_id` makes a second insert impossible. 200 `{ invite: { id, state: 'accepted', created_at }, conversation: { id, stage: 'chat' } }`.
  - Either gender may be the recipient. A Sister accepting a Brother's Invite is her consent; a Brother accepting a Sister's Invite opens Chat because her send counted as consent (FR-039 `[ASSUMPTION]`).
  - Accept never calls `BillingPort` and never writes `invite_quota`.
- **Decline** `POST /v1/invites/:id/decline`, no body. Same steps 1 to 3. `pending` becomes `declined` (guarded update); already `declined` is 200 (idempotent); `accepted` is 409 `{ reason: 'invite_not_pending', state: 'accepted' }`. 200 `{ invite: { id, state: 'declined', created_at } }`. No conversation, no `invite_quota` refund, no message to the sender. Declining is allowed even when the sender is no longer available.
- **No resend after decline** (FR-043): `POST /v1/invites` from the same sender to a recipient who declined one of his invites is 403 `FORBIDDEN` « Vous ne pouvez plus envoyer d'invitation à ce profil. » `{ reason: 'invite_declined' }`. Nothing is written and no quota is counted. The check runs after the recipient check (so an unavailable recipient stays the one 404) and before the quota.
- **Already connected:** a send to someone I already have an accepted invite with (either direction) is 200 with that invite, no new row, no quota. A send to someone who has a pending invite to me is 409 « Cette personne vous a déjà invité. Répondez à son invitation. » `{ reason: 'invite_received' }`, so two crossing invites cannot open two conversations.
- **Conversations** `GET /v1/conversations` (chat module, read only): the viewer's conversations `{ count, items: [{ id, invite_id, stage, other_id }] }`. Same viewer gate. Chat finds the viewer's accepted invites through `InvitesPort.acceptedFor(accountId)`, never by reading the `invite` table. A pending or declined invite has no conversation.
- **ChatPort** (`packages/ports`): `openFromInvite(tx, { inviteId, now })` and `conversationsForInvites(inviteIds)`. Only `chat.ts` inserts `conversation`; a test asserts no other api file inserts it.
- **Web** `/invitations` (Stitch 19) inside the shared app shell (`withAppShell`, Invitations nav item current). Rendered for a live member session and for the `web` / `capacitor` dev stubs (like `/invitations/envoyer/<id>`); the page loads the three boxes in the browser, so the API decides every refusal. Staff and mahram stubs keep the member-route JSON refusal. Copy, French only:
  - Eyebrow « Espace de concertation », title « Invitations Ta'aruf ». Tabs « Reçues », « Envoyées », « Acceptées », each with a count (Reçues counts pending received only). Tabs are a WAI-ARIA tablist (arrow keys, `aria-selected`, `aria-controls`).
  - Received row (`invite-row`, UX-DR15): blur thumb or initial, « <pseudonyme>, <âge> ans », « Identité vérifiée » when verified, city; « Situation matrimoniale » and « Déclaration de polygamie » with values (Célibataire, Marié(e), Divorcé(e), Veuf(ve); « Projet monogame » for `no`, « Ouvert à la polygamie » for `yes`; « Non renseignée » when null); « Statut actuel » « Étape : Invitation Ta'aruf ». Actions: « Accepter la démarche » (primary), « Consulter le profil » (link `/profil/<id>`), « Refuser discrètement » (`button-quiet`, UX-DR2: text only, no confirm, no lecture). An unavailable sender shows « Ce profil n'est plus disponible. » and only « Refuser discrètement ».
  - Sent row: name, age, city, « Envoyée le <date> », a pill « En attente », « Acceptée » (with « Ouvrir la discussion ») or « Déclinée ». No other line on a declined or pending row: no « Examen en cours », no « Processus clôturé… », no timer, no read receipt.
  - Accepted row: name, age, city, badge « Démarche confirmée », « Ouvrir la discussion » to `/discussions` (the Chat screen is Epic 5).
  - After accept: status « Invitation acceptée. La discussion est ouverte. » and the row moves to Acceptées. After decline: status « Invitation refusée. » and the row leaves Reçues. While a request is in flight both buttons of that row are disabled (double submit blocked).
  - States: loading « Chargement… », empty « Aucune invitation. » + « Votre espace d'invitations s'actualise au fur et à mesure des présentations conformes. », load error « Chargement impossible. Vérifiez votre connexion et réessayez. » + « Réessayer », action error (API message, or « Action impossible. Vérifiez votre connexion et réessayez. »).
  - No horizontal scroll from 360 to 1440, keyboard reachable, axe clean (WCAG 2.2 AA), 44 px targets.
- **Invite compose** (`/invitations/envoyer/<id>`): a `invite_declined` refusal shows the API message and keeps the send button disabled; `invite_received` shows its message and a link « Voir mes invitations » to `/invitations`.

**Never:**

- No `BillingPort` call on list, accept, decline, or `GET /v1/conversations`. No `invite_quota` write on accept or decline.
- No `conversation` insert outside `ChatPort.openFromInvite`; no conversation on decline or on a pending invite.
- No messages, message table, Chat screen, Socket.IO, Message Flash, Ice Breakers (Stories 4.3, 4.6, Epic 5). The Stitch « Mot d'introduction » block is Message Flash (Story 4.3) and does not ship here.
- No operator reach mode (4.7), no payments.
- No Report API (Story 8.5). There is no shared Report reason list in the code yet, so this story adds none (see interpretation notes).
- No dishonest copy from the Stitch export: « Accord formel du Wali transmis », « Tuteur : Référent informé », « Examen en cours » and « Processus clôturé avec sérénité » are dropped (nothing in the product does these, and the last two are a read receipt and guilt copy).

## Acceptance Criteria

Story 4.4:

1. **Given** a Brother-sent Invite is pending, **when** I open Received, **then** I see marital_status and polygamy_intent before accept.
2. **Given** I open Sent, **when** rows render, **then** pending / accepted / declined — declined has no guilt copy.
3. **Given** I report « misrepresented marital status », **when** submit, **then** the Report reason `misrepresented marital status` is available (the Report API is Story 8.5).

Story 4.5:

4. **Given** he sent the Invite, **when** I accept, **then** `ChatPort.openFromInvite` inserts `conversation` and stage is `chat`.
5. **Given** he sent the Invite, **when** I decline with button-quiet, **then** no Chat exists; he sees declined without a read receipt or guilt timer; he cannot resend.
6. **Given** I sent the Invite, **when** he accepts, **then** Chat opens (my send counted as consent).
7. **Given** he opens messages on a pending Invite he sent, **when** he looks for a thread, **then** there is none.

PRD rows the stories implement, also traced: FR-040 « Accepted: each row opens the Chat » (here: links to `/discussions`, Chat screen is Epic 5); FR-042 « the Sister is not prompted to explain »; only the recipient may act (server-side authorization).

Interpretation notes (flagged in the handoff):

- AC 3: the PRD makes the reason a Report reason (FR-037) and the Report API is Story 8.5. No Report reason list, type or table exists in the code today, and the orchestrator's scope note says to add the value only to an existing list. So AC 3 is **deferred to Story 8.5**: nothing is built, and the handoff says so. The inbox shows no Report control.
- « Accepted » box: the PRD lists Sent, Received and Accepted; the Stitch screen has the same three tabs. Accepted holds accepted invites in both directions.
- « Opens messages » (AC 7) is read as the conversations list: `GET /v1/conversations` is empty for him while the invite is pending. The Discussions screen itself stays the placeholder until Epic 5.
- Audit: AD-18's mandatory list does not include invite accept or decline, so no `audit_event` is written (and invites must not emit the config events).

## Code Map

- `code/packages/ports/src/index.ts`: `ChatPort` type.
- `code/apps/api/src/account-schema.ts`: `conversation` table; `drizzle/0022_conversation.sql` (+ snapshot, journal).
- `code/apps/api/src/chat.ts` (new): conversation store (memory + Postgres), `ChatPort`, `listConversations`. `conversations.controller.ts` (new), `app.module.ts`.
- `code/apps/api/src/invites.ts`: three boxes, `other` details, accept, decline, resend guard. `invites.controller.ts`: two POST routes. `invites-port.ts`: `acceptedFor`.
- `code/apps/api/src/public-profile.ts`: export the verification read used by the list.
- Web: `apps/web/src/invite-inbox-page.ts` (new), `v2-serve.ts` (`/invitations`), `member-section-page.ts` (Discussions only), `invite-compose-page.ts` (two refusals), Dockerfile + `.dockerignore` (Stitch 19).
- Tests: `apps/api/src/invite-inbox.test.ts` (new), `operator-config.migrate.test.ts` (Postgres), `apps/web/src/invite-inbox-page.test.ts` (new), `app-shell.test.tsx`, `member-route.test.ts`, `e2e/invite-inbox.spec.ts` (new), `e2e/app-shell.spec.ts`.
