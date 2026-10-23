---
title: 'Staff review console: profile, photos, ID and random-pose liveness selfie'
type: 'feature'
created: '2026-10-22'
status: 'ready'
route: 'factory'
story_id: 'staff-review-console'
depends_on: '12-1-staff-identity-mfa (PR #6, branch factory/staff-mfa)'
---

## Intent

**Problem:** Members can capture an ID and a selfie (Story 2.8, `apps/api/src/id-liveness.ts`): the images are sealed with `EVIDENCE_KEY`, stored in the private bucket and marked `pending`. Nothing reviews them. The profile review API exists (Story 3.3, `profile-review.ts`, `GET/POST /v1/staff/cases?kind=profile_review`) but has no staff screen, and outside staging the only way to grant ID and liveness is the test-only `STAGING_STAFF_VERIFICATION_GRANT`. So no real member can become public.

**Approach (Fay, 2026-10-22: "Human review + random pose"):** no verification vendor. At capture the server gives the member a random pose to perform in the selfie. A Moderator, signed in with the Story 12.1 staff session and MFA, opens one case per member in a two-pane staff console and sees the profile, the profile photos, the ID image, the selfie and the pose that was asked. The Moderator approves or rejects the ID, the liveness selfie (pose done and same person as the ID and photos) and each photo. A member is published only when phone OTP, ID, liveness and the profile review are all granted (existing `publishIfEligible`). A rejected ID or selfie asks the member to retake, never to pay (Story 2.8 AC 2).

Sources: epics.md Stories 2.8, 3.3, 2.6 (suspected-minor hold), 12.1; MVP plan doc step 1 "staff review screen for profiles/IDs/selfies"; AD-8, AD-9, AD-10, AD-13, AD-17, AD-18, NFR-001, NFR-009; Stitch `07-id-liveness`, `41-admin-flag-queue`, `42-case-file`.

## Boundaries & Constraints

**Always:**
- **Random pose.** Before the selfie, the member gets a pose from a fixed server-side list of at least 6 simple poses that need no reading skill (e.g. raise the right hand, touch the left ear, look to the left, hand on the chin, thumbs up, two fingers raised), each with a pictogram on the member screen (`07-id-liveness` look). The server picks it at random (crypto RNG), stores it with a challenge id and a 10-minute expiry, and `POST /v1/verifications/liveness` must carry a valid, unexpired, unused challenge id of that member, otherwise `VERIFICATION_RETAKE`. The pose is stored on the liveness `verification_record` (no image data in the row). A new challenge replaces the old one. French copy only; list new strings for Fay. Audio for poses is out of scope (Mooré/Dioula audio is deferred).
- **Staff queue** at `/staff/revue` (or the staff home's queue pane): one case per member who has anything pending (profile, photo, ID or liveness), Premium ahead of Free, oldest first, SLA breach shown from `free_review_sla_hours` (existing). Two panes from 768 px, queue stacked above the case below 768, staff-only badge (Story 12.1 shell).
- **Case view:** profile fields, photos, ID image, selfie, the pose asked, capture times, the account's age from DOB, and earlier decisions on this member. Evidence images are decrypted on the server and streamed from a staff-only endpoint with `Cache-Control: no-store`, `Content-Disposition: inline`, no bucket URL, no long-lived link. Every evidence view writes an audit event (staff id, record id, time). Profile photos follow AD-9: blurred by default for staff, and a Moderator unblurs only after typing a reason, which is audited. An Operator cannot unblur and cannot decide (AD-8): Operators may see the queue counts only.
- **Decisions (Moderator only)**, each with a reason from a short fixed list plus an optional note:
  - ID: approve, or reject (unreadable, not an ID, name or face mismatch, expired). Reject: member asked to retake the ID.
  - Liveness: approve, or reject (pose not done, not the same person as the ID or photos, photo of a photo or screen, unclear). Reject: member asked to retake the selfie with a new pose.
  - Suspected minor (ID DOB or appearance): puts the account on the existing age hold (Story 2.6 / FR-091) instead of approving.
  - Photos and profile: the existing `POST /v1/staff/cases` profile decisions, reused, not reimplemented.
  - A decision on a record that changed since the case was opened answers 409 `REVIEW_STALE` (existing pattern). Every decision is audited (AD-18) with no image data.
- **Member side:** after a rejection, `/id-liveness` shows which step to redo and the reason category in plain French, and offers the retake (new pose for the selfie). No payment prompt anywhere on this path.
- **Publishing:** keep `publishIfEligible` as the single place that makes a profile public; it now sees ID and liveness granted by a Moderator.
- **Staging grant:** keep `STAGING_STAFF_VERIFICATION_GRANT` working for e2e, unchanged.
- Server authorization on every endpoint (staff kind + MFA done + moderator role for decisions and evidence). Rate-limit evidence fetches per staff session. No bulk export, no download button, no evidence in logs, URLs or client storage.

**Never:**
- No verification vendor, no automatic face matching, no biometric template stored.
- Never send evidence images to members, Operators, other services, or the browser cache.
- Do not change OTP rules, the evidence sealing format, or member sign-in.

## Acceptance Criteria

1. **Given** a member with phone OTP granted, **when** she opens the selfie step, **then** she gets a random pose from the server with its pictogram, and the selfie upload is refused without a valid, unexpired, unused challenge of hers; the pose is stored with the liveness record.
2. **Given** members with pending items, **when** a Moderator opens the staff review console, **then** the queue lists one case per member, Premium first then oldest first, with SLA breach marked, in the two-pane staff shell with the staff-only badge, and no horizontal scroll from 360 to 1440.
3. **Given** a case, **when** the Moderator opens it, **then** the ID, the selfie and the pose asked are shown from a no-store staff-only endpoint, each view is audited, and profile photos stay blurred until the Moderator types an unblur reason (audited). An Operator sees no evidence and cannot unblur or decide; a member, Mahram, MFA-pending or signed-out caller gets 401/403 on every console and evidence endpoint.
4. **Given** the Moderator approves ID and liveness and the profile review, **when** phone OTP is granted, **then** the member becomes public through `publishIfEligible`; **given** any of them is missing or rejected, **then** she stays hidden.
5. **Given** the Moderator rejects the ID or the selfie with a reason, **then** the member's `/id-liveness` shows that step to redo with the reason category, the selfie retake gets a new pose, and nothing asks her to pay. **Given** "suspected minor", **then** the account goes on the age hold and is not published.
6. **Given** two Moderators decide the same case, or the member retakes after the case was opened, **then** the later stale decision gets 409 `REVIEW_STALE` and nothing is overwritten. Every decision and evidence view is in `audit_event` with no image data or secrets.
7. **Given** the full local stack with the documented env, **when** it starts, **then** it boots, existing e2e (including the staging grant path) pass, and the console flow from capture to publish passes an e2e with a real staff session.

## Code Map (starting points)

- `code/apps/api/src/id-liveness.ts`, `verifications.controller.ts`: capture, sealing (`sealEvidence`), records.
- `code/apps/api/src/object-storage-adapter.ts`: reading sealed evidence back.
- `code/apps/api/src/profile-review.ts`, `staff.controller.ts`: queue, decisions, `publishIfEligible`, `REVIEW_STALE`, SLA.
- `code/apps/api/src/staff-verification-grant.ts`: staging-only grant to keep.
- Story 12.1 staff session guard and staff shell on this branch (`staff-session.ts`, `pin-session.ts`, staff pages in `apps/web/src`).
- `code/apps/api/src/account-schema.ts`: `verification_record`, `audit_event`; new columns need a Drizzle migration.
- Web: `/id-liveness` member page and its client script; Stitch `07-id-liveness`, `41-admin-flag-queue`, `42-case-file` (add any new Stitch file to the web Dockerfile and `.dockerignore`; `web-image.test.ts` enforces it).
