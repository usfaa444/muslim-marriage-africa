---
title: 'Send an Invite (4.1) and the daily Invite quota (4.2)'
type: 'feature'
created: '2026-10-23'
status: 'ready'
route: 'factory'
story_id: '4-1-4-2-send-invite-and-quota'
depends_on: 'staff-review-console (PR #7, merged into main at e5faf53)'
---

## Intent

**Problem:** Members can browse (Epic 3) but cannot reach anyone. The Discover card and the profile detail both show « Envoyer une invitation Ta'aruf », and the button does nothing (`data-later="invite"`). There is no `invite` table, the `InvitesPort` used by the T&S visit signals always answers zero, and nothing enforces the Free daily Invite quota.

**Approach:** the invites module gets two tables (`invite`, `invite_quota`), one send command `POST /v1/invites`, one quota read `GET /v1/invites/quota`, and a minimal list `GET /v1/invites?box=received|sent` so a recipient can see what arrived. The quota is computed live at every send and every read from `operator_config` and, only when legal, `BillingPort.isEntitled` (AD-21, AD-27). The web gets the Invite compose screen (Stitch `18-invite-compose-flash`, without the Message Flash composer, which is Story 4.3), opened from the Discover card and from the profile detail, with the no-photo prompt and the quota wall.

Sources: epics.md Stories 4.1 and 4.2; PRD FR-016, FR-038, FR-044, FR-045, FR-110 (Invite half), FR-145; ARCHITECTURE-SPINE AD-3, AD-21, AD-23, AD-27; SOLUTION-DESIGN §6 `invite`, `invite_quota`, `operator_config`, and the `GET /v1/invites/quota` table; EXPERIENCE.md rows « Invite compose + Message Flash », « Sister invite quota wall », the Invite compose state rows; Stitch `18-invite-compose-flash`, `15-profile-detail`, `57-discover`.

## Product decision 2026-10-23 (Fay): the Free Invite quota applies to Sisters too

Fay (product owner), 2026-10-23: « For the invite quota, it should also apply to sisters, not only for brothers. » and, as a follow-up, « same as other restrictions like messages ... ».

The rule is general: **every Free-tier limit applies the same way to Sisters and Brothers, and Premium lifts it for both.** Today that is the daily Invite quota (this story); later it is the daily message cap FR-146 (Epic 5, not built, no code in this story).

How it is built, without a new gender branch:

- The default of `operator_config.sister_reach_mode` becomes `same_quota_as_brothers`. Migration `0021_invite.sql` flips the seeded row from `free_unlimited` to `same_quota_as_brothers`, and the code default when the row is missing is `same_quota_as_brothers`.
- So by default a Sister gets the same Free cap (3 per Ouagadougou civil day, `brother_invite_quota_free`), the same `QUOTA_EXCEEDED` with the reset time, and a Premium Sister is unlimited, exactly like a Brother.
- `free_unlimited` stays a valid value in code and in the database check (the operator switch of Story 4.7 still comes later). Its behaviour and tests stay: in `free_unlimited` the Sister send and quota read never call `BillingPort` and never return `QUOTA_EXCEEDED`.
- The only place gender is read in the quota logic is the existing `sister_reach_mode` switch (a Sister in `free_unlimited` is uncapped). There is no other gender-specific branch.

This **supersedes** the default `free_unlimited` written in epics.md (Epic 4 intro, Story 4.1 AC 4 framing), PRD FR-045 / FR-145 / glossary, ARCHITECTURE-SPINE AD-27 (« `free_unlimited` (DEFAULT) »), SOLUTION-DESIGN `operator_config` and EXPERIENCE.md. Those documents are not rewritten by this story; the amendment line is in `docs/pipeline-status.md`.

## Product decision 2026-10-23 (Fay): Free or Premium, nothing in between

Fay, 2026-10-23: « when the daily quota of invites or messages is reached, there is no such thing as buying a pack of just a couple of messages or invites. The only option shown will be the subscription page... It's just going to be either you're on free with the daily limit, or you're on the premium version with the premium perks. »

- The Invite quota wall shows the Ouagadougou reset time and **one** call to action, « Découvrir Premium », to the Premium page. No « buy N invites », no reach pack, no per-Invite or per-message pack, anywhere.
- No Premium or pricing route exists yet. The link points at `/premium`, the route Epic 10 (Story 10.1, one pricing page) will own; until then it is a dead link, flagged in the handoff.
- The API `QUOTA_EXCEEDED` error carries `{ reason: "invite_quota", cap, remaining: 0, resets_at }` and nothing pack-specific. No API response in this story names a pack, a price or a count to buy.
- This supersedes the EXPERIENCE.md wording « reach-pack offer » / « pack-card CTA » on the Invite quota wall and the epics/PRD « offered the pack purchase » wording (FR-044 AC 1): the offer is the Premium subscription only.

Fay, 2026-10-23 (for Epic 10, affects copy here): Premium is a one-month subscription renewed monthly, with no 3- or 6-month periods; renewal is a payment prompt on any live mobile-money rail, never an automatic debit; unpaid Premium pauses the perks. In this story the quota wall and the Premium link say nothing about 1/3/6-month packs or durations. No billing code here.

## Boundaries & Constraints

**Always:**

- **Send** `POST /v1/invites` `{ "to_id": "<uuid v7>" }`, member session only (`requireLiveSession`; PIN rules apply). Checks in this order, and nothing is written when one fails:
  1. Viewer gate (`assertBrowseViewer`): staff or mahram session 403; a sender whose own profile is not listable 403 `viewer_not_listable`.
  2. Body: `to_id` must be a UUID v7 and not the sender, else 400 `{ field: "to_id" }`.
  3. Sender Invite-ready: a live MAIN Profile Photo (FR-016) else 403 `FORBIDDEN` `{ reason: "photo_required" }`, message « Ajoutez une photo de profil pour envoyer une invitation. »; Invite-ready fields (`completenessFor(...).ready`) else 403 `{ reason: "profile_incomplete", missing: [...] }`, message « Complétez votre profil pour envoyer une invitation. ».
  4. Recipient: an existing `member` account of the opposite gender whose account is `Active` and whose profile is `public`. Anything else (deactivated, held, pending deletion, emergency-hidden, unpublished, same gender, unknown) is 404 `NOT_FOUND` « Ce profil n'est pas disponible. », the same body as the profile read, so the reason does not leak.
  5. Already pending from this sender to this recipient: 200 with the existing invite and the current quota; no second row, no quota count (double submit is safe).
  6. Quota (below). Over the cap: 429 `QUOTA_EXCEEDED`, message « Envoi refusé. Quota du jour atteint. », `details: { reason: "invite_quota", cap, remaining: 0, resets_at }`, `retryable: false`. No invite row, no count.
  7. Persist: one transaction inserts `invite` (`state = 'pending'`) and, when the sender is quota-class, upserts `invite_quota` with a guarded increment (`sent_count < cap`), so two parallel sends cannot both take the last slot. 201 `{ invite: { id, to_id, state, created_at }, quota }`.
- Over the cap, `details` carries only `reason`, `cap`, `remaining` and `resets_at` (no pack, price or count to buy).
- **Quota predicate** (one function for send and read, AD-27):
  - Sister and `sister_reach_mode = free_unlimited`: uncapped; `BillingPort` is never called; no `invite_quota` row is read or written. Body `{ capped: false, sister_reach_mode: "free_unlimited" }`.
  - Brother (any mode), or Sister and `same_quota_as_brothers` (the default since 2026-10-23): quota-class. `BillingPort.isEntitled(accountId)` is read live. `true` uses `brother_invite_quota_premium` (`unlimited` means no cap: body `{ capped: false, unlimited: true }`); `false` or `unavailable` uses `brother_invite_quota_free` (seed 3): body `{ capped: true, cap, remaining, resets_at }`. A Sister's body also carries `sister_reach_mode`. A billing outage therefore means the Free cap, never a block.
  - The day is the `Africa/Ouagadougou` civil day (`civilDayOuagadougou`), not UTC. `resets_at` is the next Ouagadougou midnight as a UTC ISO string.
  - `sister_reach_mode` and the caps are read from `operator_config` on every send and read (no cache). A missing `sister_reach_mode` row means `same_quota_as_brothers`; a broken cap value is 500, not a free pass.
  - `invite_quota` grain `{ account_id, civil_day_ouaga, sent_count }` is written only by a successful quota-class send (Premium sends count too, so the row is the truth if the pack ends that day). Billing never writes it. A Sister send in `free_unlimited` writes nothing, so sends made before a switch to `same_quota_as_brothers` do not count against the new cap that day (AD-27).
- **Quota read** `GET /v1/invites/quota`: the same body, plus `sender: { photo: boolean, profile_ready: boolean }` so the compose screen can show the precondition before a send. Same viewer gate as send.
- **Received / sent list** `GET /v1/invites?box=received|sent` (default `received`): the member's own invites, newest first: `{ count, items: [{ id, state, created_at, from_id | to_id, pseudonym }] }`. Minimal on purpose; the full inbox with marital honesty is Story 4.4.
- **InvitesPort** `sentCountSince` (used by T&S visit signals) now counts real `invite` rows whose UUID v7 id is at or after `since`.
- **Web**: `/invitations/envoyer/<id>` (Stitch 18) opened by « Envoyer une invitation Ta'aruf » on the Discover card and on the profile detail. It shows the recipient (pseudonym, age, city, verified pill), the photo precondition (« Conforme », or the no-photo prompt with a link to `/profile-edit`), the Wali protocol note, the daily availability block in the four states below, and the send button. States: loading, sent (« Invitation envoyée. »), quota wall, no-photo prompt, profile incomplete, recipient unavailable, network error with retry, double submit blocked while in flight. No horizontal scroll from 360 to 1440, keyboard reachable, axe clean, 44 px targets.
  - Free quota-class: « Invitations restantes aujourd'hui : N » and « Invitations illimitées pour les abonnements engagés. »
  - Premium: « Invitations illimitées (Premium). », no count, no pack line.
  - Sister in `free_unlimited`: « Invitations illimitées. », no count, no pack line.
  - Quota wall (remaining 0, or a `QUOTA_EXCEEDED` answer): « Envoi refusé. Quota du jour atteint. », « Nouvelles invitations demain à partir de 00:00 (heure de Ouagadougou). », « Avec Premium, invitations et messages illimités. » and one link « Découvrir Premium » to `/premium` (decision above); send button disabled.

**Never:**

- No `BillingPort` call on a Sister send or quota read in `free_unlimited`. No `BillingPort` call from browse, profile read, favourites or the invite list.
- No Message Flash, Ice Breaker, `message_flash` table or `MESSAGE_CAP_EXCEEDED` here (Story 4.3). `QUOTA_EXCEEDED` is Invite-only and is never used for a message cap.
- No accept, decline, resend-after-decline, Chat or `conversation` (Story 4.5). No inbox UI (Story 4.4). No operator PATCH of `sister_reach_mode` (Story 4.7). No payment or pack checkout (Epic 10). No paid ranking boost (FR-111 stays off: browse ranking is not touched).
- No dishonest copy: the Stitch line « Aucune intelligence artificielle n'interfère dans vos échanges. » is dropped (passive AI moderation exists, D6).

## Acceptance Criteria

Story 4.1:

1. **Given** I have a Profile Photo and Invite-ready fields, **when** I POST `/v1/invites`, **then** it appears on the recipient's received list.
2. **Given** I have no Profile Photo, **when** I try to send, **then** the action is blocked with a prompt to add a Photo.
3. **Given** the recipient is deactivated, Banned, or married, **when** I submit, **then** the Invite is rejected.
4. **Given** I am a Sister and `sister_reach_mode` is `free_unlimited`, **when** I send my Nth Invite, **then** it is not blocked by a paid quota and I am not asked to buy a pack, **and** the send path does not call `BillingPort`.
5. **Given** I am a Sister and `sister_reach_mode` is `same_quota_as_brothers` with no pack, **when** I send a 4th Invite the same Ouaga day, **then** I get `QUOTA_EXCEEDED` with the reset time (same Free cap as Brothers).

Story 4.2:

6. **Given** I am Free and already sent 3 today, **when** I send a fourth, **then** I get `QUOTA_EXCEEDED` with the Ouaga-day reset time, **and** `QUOTA_EXCEEDED` is Invite-only, never used for the FR-146 message cap.
7. **Given** I am Premium, **when** I send Invites, **then** there is no daily Invite cap (the 4th, 16th and Nth succeed).
8. **Given** billing is `unavailable` and I am a Sister in `free_unlimited`, **when** I send an Invite, **then** the send succeeds and the Invite path does not call `BillingPort`.
9. **Given** billing is `unavailable` and I am a Sister in `same_quota_as_brothers`, **when** I send Invites, **then** the Free Invite cap applies (same as Brothers); safety is not blocked.
10. **Given** browse ranking is inspected, **when** MVP Premium, **then** there is no paid ranking boost (FR-111 stays off).

Decision 2026-10-23:

11. **Given** a fresh database, **when** migrations run, **then** `sister_reach_mode` is `same_quota_as_brothers`, so a Free Sister is capped at 3 per Ouaga day like a Brother, and a Premium Sister is unlimited.
12. **Given** the daily Invite quota is reached, **when** the member sees the refusal, **then** the wall shows the Ouaga reset time and one link to the Premium page, no pack of Invites or messages is offered anywhere, and the API error carries the reset time and nothing pack-specific.

Interpretation notes (flagged in the handoff): « Banned » and « married » have no account state yet (bans are Epic 8, marriage outcomes Epic 9). Both will leave the account non-`Active` or the profile non-`public`, which the recipient predicate already rejects; the tests cover every state that exists today (deactivated, held, pending deletion, emergency-hidden, unpublished).

## Code Map

- `code/apps/api/src/account-schema.ts`: `invite`, `invite_quota` tables; `drizzle/0021_invite.sql` (+ snapshot, journal) also flips `sister_reach_mode`.
- `code/apps/api/src/invites.ts` (new): store (memory + Postgres), config reader, quota predicate, send, quota read, list. `invites.controller.ts` (new), `app.module.ts`.
- `code/apps/api/src/invites-port.ts`: default port counts real rows.
- `code/apps/api/src/operator-config.ts`: `DEFAULT_SISTER_REACH_MODE`.
- Web: `apps/web/src/invite-compose-page.ts` (new), `app/invitations/envoyer/[id]/route.ts` (new), `v2-serve.ts`, `entry-guard.ts`, `discover-page.ts` (card button), `profile-detail.ts` (button), Dockerfile + `.dockerignore` (Stitch 18).
- Tests: `apps/api/src/invites.test.ts`, `operator-config.migrate.test.ts` (Postgres), `apps/web/src/invite-compose-page.test.ts`, `e2e/invite-compose.spec.ts`.
