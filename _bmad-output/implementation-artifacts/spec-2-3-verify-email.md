---
title: 'Verify email'
type: 'feature'
created: '2026-10-04'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: '86c775c54ff3d26b398e7360ea9ef9a551d5166a'
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** A new member cannot confirm the inbox with an expiring link and a resend.

**Approach:** `email_verification` stores the link hash. `POST /v1/accounts/email-verifications` sends one SMTP message. `POST /v1/accounts/email-verifications/consume` marks the password credential verified. The Stitch screen is the page.

## Boundaries & Constraints

**Always:** Entity `email_verification`, owner identity. Fields: `id` uuid v7 NO; `account_id` uuid v7 NO; `token_hash` text NO (SHA-256, raw token never stored); `expires_at` timestamptz NO; `consumed_at` timestamptz YES; `superseded_at` timestamptz YES; `created_at` timestamptz NO. N:1 account via `account_id`. `credential.email_verified_at` is the only verified marker. No verified column on `account`. `POST /v1/accounts/email-verifications` uses the session cookie, no body, 201 `{ expires_at }`. No token in JSON. Already verified: 200 `{}` and do not send. No session: 401 `UNAUTHENTICATED`. Send failure: 503 `EMAIL_DELIVERY_FAILED`, retryable, no live row. Consume: `POST /v1/accounts/email-verifications/consume` `{ token }`, no session, 200 `{ email_verified_at }`. Bad token: 400 `EMAIL_LINK_INVALID` for invalid, expired, consumed, or superseded. Expiry is 30 minutes from `created_at`. The 60s grace and the two-minute spam hint are not server rules. `EmailPort` sends one SMTP email to `account.email`. Live adapter reads `SMTP_URL`. Tests use a fake that records the link. Not `SmsPort`, not notification, not `sms_dispatch`. The link origin is the request `Origin` header when it is `http` or `https`. If that header is missing, the issue call is `EMAIL_DELIVERY_FAILED` and no row is written. The link path is `/email-verification?token=`. That screen calls consume. Issue only after send succeeds. Open sets `consumed_at` and `credential.email_verified_at` on the password credential. Expire leaves the row unused and `email_verified_at` null. Resend sets `superseded_at` on older unconsumed rows, then inserts a new row. The old token fails immediately. Pixel copy is `code/design-stitch/ankanu-v2/04-email-verification/screen.html`. Show `account.email` instead of the specimen address. The screen reads `x-account-email` so the JSON bodies stay as named. Resend calls the issue POST. `Modifier l'adresse` is visible and does not change the email. Add `EMAIL_LINK_INVALID` and `EMAIL_DELIVERY_FAILED` to the AD-7 code list. Opening the screen without a token calls the issue POST. Opening it with a token calls consume only.

**Never:** No SMS. No second verified column. No password reset, phone OTP, Google, or age gate. Do not treat the 60s line or the two-minute hint as server rules. Do not rewrite `_bmad-output` planning docs.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
| --- | --- | --- | --- |
| Issue | Session cookie, `Origin` http(s), password credential unverified | 201 `{ expires_at }` 30 minutes ahead. One email to `account.email`. Row stores SHA-256 only | N/A |
| Already verified | `email_verified_at` set | 200 `{}`. No send. No new row | N/A |
| No session | Missing or expired cookie | No row | 401 `UNAUTHENTICATED`, retryable false |
| Send fails | Port throws, or `Origin` missing | No new row. Older live row stays | 503 `EMAIL_DELIVERY_FAILED`, retryable true |
| Open | Valid unexpired unconsumed token | 200 `{ email_verified_at }`. `consumed_at` set. Password credential stamped | N/A |
| Bad link | Invalid, expired, consumed, or superseded | Row unused when expired. Verified stamp unchanged | 400 `EMAIL_LINK_INVALID`, retryable false |
| Resend | Unverified session after a prior link | Older unconsumed rows get `superseded_at`. New row. Old token fails | N/A |
| Screen | Stitch HTML | Specimen replaced by `account.email` when known. Resend posts the issue route. Change-address stays and does not write | N/A |

</frozen-after-approval>

## Code Map

- `code/packages/kernel/src/error.ts` — add the two AD-7 codes
- `code/apps/api/src/account-schema.ts` — `email_verification` table
- `code/apps/api/drizzle/0003_email_verification.sql` — migration
- `code/apps/api/src/email-verification.ts` — issue and consume rules
- `code/apps/api/src/email-verification-store.ts` — memory and Postgres
- `code/apps/api/src/email-port.ts` — `EmailPort` and `SMTP_URL`
- `code/apps/api/src/accounts.controller.ts` — the two posts
- `code/apps/web/src/email-verification-page.ts` — Stitch page plus the two posts
- `code/apps/web/app/email-verification/route.ts` — serves the screen
- Do not add the route to `rl_auth_per_min`. Do not change the Stitch file.

## Tasks & Acceptance

**Execution:**
- [x] `code/apps/api/src/email-verification.ts` -- issue and consume -- founder sentences
- [x] `code/apps/api/src/email-port.ts` -- one SMTP send -- `SMTP_URL`, fake in tests
- [x] `code/apps/web/src/email-verification-page.ts` -- match the Stitch screen -- resend posts, address control is inert

**Acceptance Criteria:**
- Given a valid unexpired link, when it is opened, then email is marked verified.
- Given the link expired, when resend is requested, then a new link is issued and the old one fails.

## Implementation Notes

Review patches: consume updates only a live unexpired row; issue locks the account and skips the insert when the password credential is already verified; the SMTP reader fails closed on a dropped socket and does not treat a failed QUIT as a failed send.

## Review Triage Log

- `markConsumed` stamps a superseded or expired row — **high** — patch. The update now requires `superseded_at` null and `expires_at` after `at`. The unit test calls that write on an exactly-expired row and on a superseded row whose expiry was moved forward.
- Two issue calls can both insert, and a verify that lands during SMTP still inserts — **high** — patch. `supersedeAndInsert` locks the account row and returns `already_verified` instead of inserting.
- Insert throws after SMTP accepts the message — **low** — rejected. The insert is one transaction with the supersede, so a throw leaves the previous row live. The frozen order is send, then insert. A database failure is the existing 500 path.
- Envelope sender is the member address, so SPF may fail — **maybe-false** — defer. Whether a relay rejects that `MAIL FROM` depends on that relay. No from-address was named.
- `smtp://` never uses STARTTLS — **false**. The `smtp` scheme is cleartext. `smtps://` opens TLS.
- AUTH PLAIN on cleartext `smtp://` — **medium** — patch. A username on `smtp://` throws before the socket opens.
- A bare `250` reply waits until timeout — **medium** — patch. A line that is only the three-digit code completes the reply. The SMTP test covers it.
- No `Date` or `Message-ID` — **low** — rejected. The message still sends. Those headers were not required.
- The body is only the URL — **false**. The frozen rule is one SMTP email that carries the link.
- A signup address can contain `<` or a NUL and is copied into the envelope — **medium** — patch. C0, DEL, `<`, and `>` are refused before connect.
- Compose never sets `SMTP_URL` — **false**. A missing `SMTP_URL` throws, and the issue route returns 503 with no row. No URL was named for compose.
- A session holder can put their own `Origin` on the link — **false**. The frozen rule uses that header. `SameSite=Lax` keeps a cross-site POST from sending the session cookie.
- After consume, the token stays in the query, and a reload shows the expired state — **medium** — patch. A 200 consume calls `history.replaceState` to the path. The script test asserts that path and `success`.
- The HTML response sets no `Cache-Control` or `Referrer-Policy` — **medium** — patch. `GET /email-verification` sets `no-store` and `no-referrer`.
- Every non-200 consume, including 500, shows the expired stitch state — **low** — rejected. That file has no other failure state. 400 is the specified bad-link result.
- `issueLink` ignores 401 and 503, and a thrown fetch leaves the waiting screen — **low** — rejected. Mapping those to expired would show the wrong sentence. The resend control returns to idle.
- "Continuer vers l'espace de convenance" stays `href="#"` — **false**. That is the pixel copy. No destination was named.
- First paint shows the specimen address — **low** — rejected. The route does not know the inbox. The client replaces the specimen from `x-account-email` after issue or consume. The web image has no database.
- `x-account-email` is omitted for a non-ASCII inbox — **medium** — patch. The header is `encodeURIComponent`, and the script decodes it.
- A logged-out open keeps the specimen — **false**. Without a session the issue route is 401 and there is no inbox to show. Consume of a real token still returns the header.
- Passing the inbox into the HTML can close a script — **medium** — patch. The server replace escapes HTML. The page test uses `a</script>@example.com`.
- Opening the screen without a token supersedes the live link — **false**. The frozen sentence says that open calls the issue POST, and issue supersedes older unconsumed rows.
- Nothing limits how often a session can send — **false**. The 60-second grace is not a server rule.
- `email_verification.account_id` has no index — **low** — rejected. Resend touches a handful of rows. An extra index was not named.
- The foreign key is `ON DELETE NO ACTION` — **false**. This story has no account delete.
- The migration files have no trailing newline — **low** — rejected. Cosmetic. `drizzle-kit check` passed.
- The migration test only checks the table name — **medium** — patch. The Postgres test now reads the seven columns, issues a link, and reads `token_hash`, `consumed_at`, and `credential.email_verified_at`.
- The SMTP test does not cover AUTH, a bare reply, or a dropped QUIT — **medium** — patch. Those cases are in `email-port.test.ts`.
- The HTTP tests share one memory store and depend on order — **low** — rejected. They assert the row they just wrote. File order is the existing Vitest style.
- The page test searches script source and does not run it — **medium** — patch. The page test runs the injected script with a stubbed `fetch` for a token, no token, and a 400.
- A recipient can open the link before the hash insert commits — **false**. The frozen order is send, then insert. That consume returns `EMAIL_LINK_INVALID` and does not mark the row, so a later open still works.
- QUIT fails after DATA 250, so delivery is reported failed — **medium** — patch. QUIT is ignored after DATA 250. The SMTP test ends the socket there and the send resolves.
- A socket close with no waiter leaves the next expect pending — **high** — patch. The reader stores that error and rejects the next expect.
- A peer that keeps sending bytes resets the idle timeout — **medium** — patch. The reader uses one 10-second deadline that does not reset.
- A consume whose fetch throws stays on the waiting screen — **low** — rejected. The server may already have consumed. A reload calls consume again. Showing expired would be the wrong sentence if the response was only lost.
- Resend can run while consume is in flight — **medium** — patch. Consume sets the resend control busy until the response returns.
- The Postgres store is only covered by memory tests — **medium** — patch. Same Postgres test as the column check. It passed.
- The web image copy of the screen is not what the page test reads — **defer**. The auth screen is copied the same way and is also read from the repo in its unit test. An image build is outside this change's existing check.
