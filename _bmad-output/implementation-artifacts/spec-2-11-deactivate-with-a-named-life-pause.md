---
title: 'Deactivate with a named life-pause'
type: 'feature'
created: '2026-10-05'
status: 'draft'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: '4b4536a8f13d524ab371c02927242b65e42cf0b3'
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** A Member cannot deactivate for a named life-pause and one-tap reactivate, so they cannot leave browse without repeating onboarding (FR-018).

**Approach:** Not chosen. The start-here routes, the reason store, the browse hide, the chat pause, and the one-tap control are absent from the catalog and from the Stitch file. Do not invent them.

## Boundaries & Constraints

**Always:** Identity is the only writer of `account`. Profiles is the only writer of `profile`. `account.status` is `Active` / `deactivated` / `held`. `profile.visibility` is `unpublished|public|held|emergency_hidden` and is the browse gate. Errors use the AD-7 envelope. The life-pause layout is `code/design-stitch/ankanu-v2/11-profile-edit/screen.html` and `screen.png`. Do not add chrome they do not print. Google stays deferred. Do not build FR-017, FR-021, FR-022, FR-023, or `PUT /v1/me/profile`. PIN enable stays Story 2.10 / 2.12.

**Never:** Do not add a pause-reason column. Do not set `profile.visibility` outside its enum. Do not use `held` or `emergency_hidden` as a life-pause. Do not write `conversation.paused_by` for a life-pause. Do not invent request or response bodies for `POST /v1/me/deactivate` or `POST /v1/me/reactivate`. Do not add an invite column. Do not invent a verification-invalidation flow. Do not edit the Stitch HTML or PNG. Do not deploy. Do not open Story 2.12.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
| --- | --- | --- | --- |
| Named deactivate | Active member, named reason | Leaves browse, cannot receive new Invites, existing Chats show a pause state | No request table |
| One-tap reactivate | Deactivated member | Visibility returns; verification and review stay valid unless Photos changed | No flow table |

</frozen-after-approval>

## Open Questions

- Request and response for `POST /v1/me/deactivate` and `POST /v1/me/reactivate` — options: founder supplies the body, success JSON, and error codes (the routes can be built) / founder says the routes stay unbuilt until the resource map lists them (this story ships no HTTP)
- Where the named reason is stored — options: founder names an existing field (store there; add no column) / founder authorizes one new column and names its owner, name, type, and nullability / founder says the reason is chosen on screen and is not stored
- How browse hides a deactivated member — options: founder names an existing `profile.visibility` value and the value reactivate restores (`held` is suspected-minor; `emergency_hidden` is Mahram `emergencyHide`) / founder says a later browse read excludes `account.status=deactivated` and this story only writes that status
- How existing chats show a pause state — options: founder names a field and its owning writer other than `conversation.paused_by` / founder says a later chat story owns the pause read and states the rule / founder says this acceptance line is not part of Story 2.11
- Which existing control submits deactivate, and which existing control is the one-tap reactivate — options: founder names elements already printed in `ankanu-v2/11-profile-edit/screen.html` (`#togglePauseBtn` only toggles `#pauseDrawer`; there is no confirm and no reactivate control) / founder says the drawer stays a toggle and this story does not POST
- What “verification and review remain valid unless Photos changed” requires here — options: this story does not write `verification_record` or review state, and the photo exception waits for Story 3.1 / founder supplies the flow, including what changes when Photos change

## Code Map

- `code/apps/api/src/account-schema.ts` — `account.status` is `Active|deactivated|held`. `profile.visibility` has no `deactivated`. Add no column unless a founder answer names one.
- `code/apps/api/drizzle/0001_account_credential.sql` and `code/apps/api/drizzle/0005_profile.sql` — same checks. Do not change them on a guess.
- `code/apps/api/src/app.module.ts` — controllers are health, accounts, sessions, password resets, verifications, and pin. No deactivate route. No browse, invite, or chat module.
- `code/apps/api/src/accounts.controller.ts` — `POST /v1/accounts` only. Do not attach an invented deactivate contract.
- `code/apps/web/app/profil/route.ts` — member shell for `/profil`. Profile edit is not served.
- `code/design-stitch/ankanu-v2/11-profile-edit/screen.html` and `screen.png` — `#togglePauseBtn` (“Configurer une pause”) toggles `#pauseDrawer`. Radios: `ramadan`, `exams`, `travel`, `mourning`. The free-text input has no name. No confirm. No reactivate button. No Scaleway, Paris, or hébergée line.
- `code/apps/web/src/pin-page.ts` — pattern for serving Stitch HTML. Do not copy it onto profile edit until the control question is answered.
- SOLUTION-DESIGN §7.1 — identity routes are `/v1/accounts`, `/v1/sessions`, `/v1/password-resets`, `/v1/pin`. Profiles are `/v1/me/profile` and `/v1/profiles/:id`. The deactivate routes are absent. §16 maps FR-018 to identity / AD-8. The story line also names AD-3 and AD-23.
- `reviews/reconcile-prd.md` — “status exists; pauses unbound.”

## Tasks & Acceptance

**Execution:**
- [ ] Do not implement until Open Questions is empty.

**Acceptance Criteria:**
- Given an active Member, when they deactivate with a named reason, then they disappear from browse, cannot receive new Invites, and existing Chats show a pause state.
- Given a deactivated Member, when they one-tap reactivate, then visibility returns and verification and review remain valid unless Photos changed.

## Implementation Notes

## Spec Change Log

## Review Triage Log
