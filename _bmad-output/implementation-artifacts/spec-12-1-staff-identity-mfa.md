---
title: 'Staff identity, authenticator-app MFA and staff-only chrome'
type: 'feature'
created: '2026-10-22'
status: 'ready'
route: 'factory'
story_id: '12-1-staff-identity-mfa'
---

## Intent

**Problem:** Staff endpoints (`code/apps/api/src/staff.controller.ts`) only check that a member session's account has the `moderator` or `operator` role. There is no staff sign-in, no MFA, no way to create a staff account, and nothing stops a staff account from using member chrome. AD-8 (individual staff logins, never shared) and AD-17 (staff MFA) are not met, and the staff review screen (next story) needs this first.

**Approach (Fay, 2026-10-22: "Server command + authenticator app"):** Staff accounts are created on the server by a command, never from the web. Staff sign in on a separate staff sign-in page with email and password, then a six-digit TOTP code from an authenticator app (RFC 6238, SHA-1, 30 s, 6 digits, the defaults Google Authenticator and Authy use). The first sign-in enrolls the app from a QR code and a manual key. A staff session is `session.kind = 'staff'` and is only usable after MFA. Staff pages carry the staff-only badge and no member nav.

Source: epics.md Story 12.1; MVP plan doc step 1 ("staff two-factor login"); AD-8, AD-17, NFR-001, NFR-009; UX EXPERIENCE.md (Staff row, `staff-only-badge`, staff two-pane from 768 px, "Staff has no member nav").

## Boundaries & Constraints

**Always:**
- **Provisioning command**, run inside the api container, e.g. `node apps/api/dist/staff-cli.js create --email <e> --role moderator|operator` and `reset-mfa --email <e>` and `disable --email <e>`. `create` makes a new account with that role only (never adds a staff role to an existing member account; refuse if the email exists), generates a strong one-time password printed once to the terminal, and requires a password change at first sign-in. `reset-mfa` clears the enrollment so the next sign-in enrolls again. `disable` ends the account's sessions and blocks sign-in. Each writes an audit event. Document the commands in `code/README.md` and `.factory/config.md` (local deployment).
- **Sign-in** at a staff-only page (`/staff/connexion`) and API (`POST /v1/staff/sessions` with email, password, captcha; then `POST /v1/staff/sessions/mfa` with the code). Same argon2id, captcha, generic wrong-credentials message and auth rate limits as member sign-in. A member account (no staff role) gets the same generic failure. Until MFA succeeds the session is MFA-pending and every other endpoint refuses it.
- **Enrollment** on first sign-in (and after `reset-mfa`): show a QR code of the `otpauth://totp/AnKanu:<email>?secret=…&issuer=AnKanu` URI and the base32 key for manual entry; enrollment completes only when a valid code is entered. One small, maintained QR dependency is allowed (pinned, `npm audit` clean) if the repo has none; TOTP itself uses `node:crypto` only.
- **TOTP rules:** accept the current step ±1; a code is accepted once only (store the last used step); 5 wrong codes lock the staff sign-in for 15 minutes, using the existing auth limit machinery. Secrets are stored encrypted (AES-256-GCM) with a server key from env (e.g. `STAFF_MFA_KEY`, `STAFF_MFA_KID`), never logged, never sent again after enrollment. The api refuses to boot in production without the key (same style as `assertEmailBoot` / `assertSmsBoot`); compose passes it from the env file; local docs add it to `~/.ankanu/api.env`.
- **Separation:** every `/v1/staff/*` endpoint requires `session.kind = 'staff'` with MFA done and the role; member and Mahram sessions get 403 even if the account has a staff role. Member endpoints refuse a staff session (403), and member pages send a staff session to the staff home. Staff sessions use a shorter idle timeout than members (30 min) and are never PIN sessions.
- **Chrome:** a staff shell with the `staff-only-badge` visible on every staff surface, no member nav, two-pane from 768 px with the queue stacked above the case below 768 (use Stitch screens 41 and 52 for look and copy). A minimal staff home after sign-in that links to the existing staff pages is enough; the review console is the next story.
- **Audit (NFR-009):** staff sign-in success, failure, lockout, MFA enrollment, MFA reset, account create and disable go to the existing `audit_event` chain without passwords, codes or secrets.
- French UI only, copy from Stitch or existing strings; any new string is listed in the handoff for Fay.
- Keep the staging test path working: `STAGING_STAFF_VERIFICATION_GRANT` and every existing test or e2e that uses staff roles must keep passing, moved onto a real staff session (with a test TOTP secret) rather than weakened.

**Never:**
- No web or API route that creates staff accounts or grants roles. No shared logins. No SMS second step.
- No secret, password, code or otpauth URI in logs, URLs, error details, fixtures committed with real values, or commit messages.
- Do not change member sign-in, member PIN, or the review decisions themselves.

## Acceptance Criteria

1. **Given** the provisioning command, **when** an operator runs `create` with an email and role, **then** a staff account exists with that role, a one-time password is printed once, an audit event is written, and running it for an existing email fails without changing anything. `reset-mfa` and `disable` behave as described and are audited.
2. **Given** a staff account without MFA, **when** it signs in at `/staff/connexion` with the right password, **then** it must set a new password, then sees a QR code and manual key, and the session becomes a full staff session only after a valid code; a wrong code keeps it MFA-pending.
3. **Given** an enrolled staff account, **when** it signs in, **then** email + password + a valid code give `session.kind = 'staff'`; a reused code, a code outside ±1 step, or a wrong code is refused; 5 wrong codes lock sign-in for 15 minutes; failures are generic and rate-limited.
4. **Given** an MFA-pending session, a member session, or a Mahram session (even on an account with a staff role), **when** it calls any `/v1/staff/*` endpoint, **then** 403. **Given** a staff session, **when** it calls a member endpoint or opens a member page, **then** 403 or a redirect to the staff home.
5. **Given** every staff surface, **when** it renders, **then** the staff-only badge is visible and no member nav is shown; at 768 px and wider the layout is two panes, below 768 the queue stacks above the case; no horizontal scroll at 360–1440.
6. **Given** sign-in, MFA and provisioning events, **then** each writes an audit event with no secret, and the api log has no password, code, secret or otpauth URI. The api refuses a production boot without the MFA key.
7. **Given** the full local stack, **when** it starts with the documented env, **then** it boots, existing e2e (including staff-role tests) pass, and the commands and env are documented.

## Code Map (starting points)

- `code/apps/api/src/staff.controller.ts` — `staffAccount()` role check to replace with a staff-session guard.
- `code/apps/api/src/session-store.ts`, `create-session.ts`, `sessions.controller.ts`, `session-cookie.ts`, `pin-session.ts`, `session-touch.ts`, `auth-limit.ts`, `auth-rate.ts` — sessions, idle timeouts, rate limits.
- `code/apps/api/src/account-schema.ts` — `session.kind` already allows `staff`; `credential.kind` check; `audit_event`. New columns or tables need a Drizzle migration.
- `code/apps/web/src/member-route.ts` — already knows `kind === 'staff'`.
- `code/apps/api/src/staff-verification-grant.ts` and tests using staff roles.
- Stitch `code/design-stitch/ankanu-v2/41-admin-flag-queue`, `52-ts-visit-signals` (badge, staff shell). Remember the web Dockerfile and `.dockerignore` copy list (`web-image.test.ts`).
