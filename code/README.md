Application code, tests, and QA handoffs live here.

## Full local stack

From `code/`, with a host env file outside the repo (see `.factory/config.md`, "Local deployment"):

```bash
docker compose -p ankanu-local --env-file ~/.ankanu/local.env \
  -f compose.yaml -f ~/.ankanu/compose.local.yml up -d --build --wait
```

## SMS (phone codes)

The api sends phone codes through `SmsPort` (`apps/api/src/sms-port.ts`). These settings come from the host env file. Never commit a key.

| Variable | Default | Meaning |
| --- | --- | --- |
| `SMS_PROVIDER` | `log` | `log` writes `otp <code>` to the api log. `aqilas` sends a real SMS. Any other value refuses to boot. |
| `AQILAS_API_KEY` | none | Required when `SMS_PROVIDER=aqilas`, or the api refuses to boot. |
| `AQILAS_SENDER_ID` | `AnKanu` | Sender name shown on the phone. |
| `AQILAS_API_URL` | `https://www.aqilas.com/api/v1/sms` | Point it at a local stub for QA. |

A request times out after 10 seconds. A timeout, network error or non-2xx answer is a failed send: the member gets 503 `L'envoi du code a échoué.` and nothing is stored. With `aqilas`, the log shows only `sms aqilas status <n>`, `sms aqilas timeout` or `sms aqilas network error`, never the code, the phone or the key.

The image runs with `NODE_ENV=production`, so `log` there needs `RECAPTCHA_ALLOW_TEST_KEYS=1` (local and staging set it). A real production boot must use `aqilas`.

The api also refuses to boot when `AQILAS_API_KEY` or `AQILAS_SENDER_ID` contains a control character (a newline, carriage return, tab and so on). The message names the variable, never the value. The adapter never follows a redirect: a 3xx answer is a failed send, so the key, phone and code never go to another host.

Where to put the variables: compose's `environment:` block for the api sets all four, so it overrides anything in `env_file`. Put them in the file passed to `docker compose --env-file`, never in `api.env`:

- Local: `~/.ankanu/local.env`.
- Staging: the compose interpolation env file, `/var/lib/ankanu/compose.interpolate.env`. A key placed in `/var/lib/ankanu/api.env` is silently ignored and staging stays on `log`.

## Staff accounts (sign-in with an authenticator app)

Staff accounts (`moderator`, `operator`) are created on the server only, never from the web. Each person gets their own account; logins are never shared. Run the command inside the api container:

```bash
# from code/, on the host running the stack (use your compose project name)
docker compose -p ankanu-local exec api node apps/api/dist/staff-cli.js create --email <email> --role moderator
docker compose -p ankanu-local exec api node apps/api/dist/staff-cli.js reset-mfa --email <email>
docker compose -p ankanu-local exec api node apps/api/dist/staff-cli.js disable --email <email>
```

- `create` makes a new account with that role only. It refuses an email that already exists (staff or member) and changes nothing. It prints a one-time password once; nothing else stores it. Hand it over in person.
- First sign-in at `/staff/connexion`: email, that password and the captcha, then a new password (12 to 128 characters), then enroll an authenticator app (Google Authenticator, Authy: TOTP, SHA-1, 30 seconds, 6 digits) from the QR code or the manual key, then a six-digit code. Later sign-ins ask for email, password and a code.
- A code is accepted once, within one 30-second step either side. Five wrong codes lock the account's staff sign-in for 15 minutes. Staff sessions end after 30 minutes without activity and are never PIN sessions.
- `reset-mfa` clears the enrollment and ends the account's sessions; the next sign-in enrolls again (a lost phone). `disable` blocks sign-in and ends the sessions.
- Exit codes: `0` done; `1` refused by the data, nothing changed (the email is already used, or no staff account uses it); `2` bad usage (unknown command, missing or malformed `--email`, a `--role` other than `moderator` or `operator`). An unexpected failure prints only the error class and the database code, never the SQL or its values.
- Every command, sign-in success and failure, lockout, enrollment and password change writes an `audit_event`, never a password, code or secret.

The TOTP secrets are stored encrypted (AES-256-GCM) with a server key. Put both variables in the api's env file (`~/.ankanu/api.env` locally, `/var/lib/ankanu/api.env` on staging), never in the repo:

| Variable | Meaning |
| --- | --- |
| `STAFF_MFA_KEY` | `openssl rand -base64 32`. A value that is not base64 for 32 bytes refuses to boot. |
| `STAFF_MFA_KID` | A name for the key, written in each stored envelope, e.g. `local-staff-mfa-1`. |

Without them the api refuses to boot when `NODE_ENV=production` and `RECAPTCHA_ALLOW_TEST_KEYS` is not `1` (a real production boot). On a stack with the reCAPTCHA test keys (local, staging) it boots, and staff sign-in answers 503 until the key is set. Changing the key makes every enrolled secret unreadable: run `reset-mfa` for each staff account afterwards.

## Chat (text messages and realtime)

Chat text is stored encrypted (AES-256-GCM, envelope `{v, alg, kid, iv, ct}`, bound to its conversation and message id). Put both variables in the api's env file (`~/.ankanu/api.env` locally, `/var/lib/ankanu/api.env` on staging), never in the repo:

| Variable | Meaning |
| --- | --- |
| `CHAT_KEY` | `openssl rand -base64 32`. A value that is not base64 for 32 bytes, or one set without the other, refuses to boot. |
| `CHAT_KID` | A name for the key, written in each stored envelope, e.g. `local-chat-1`. |

Without them the api refuses to boot when `NODE_ENV=production` and `RECAPTCHA_ALLOW_TEST_KEYS` is not `1` (a real production boot). On a stack with the reCAPTCHA test keys (local, staging) it boots, the Discussions screens open, and every send answers 503 « Envoi indisponible pour le moment. Réessayez plus tard. » with nothing stored until the key is set. Changing the key makes older messages unreadable (they show « Message indisponible. »); key rotation with several kids is not built yet.

Realtime is Socket.IO on `/v1/realtime`, served by the api process. The web container's `/v1/:path*` rewrite proxies both the polling requests and the WebSocket upgrade, so the browser only ever talks to the web origin (`http://localhost:4012` locally). The client script is `/v1/realtime/socket.io.min.js`. Events carry ids only (`message.delivered`, `conversation.typing`); the page then reads the text over HTTP. A handshake from an `Origin` outside `ANKANU_ALLOWED_ORIGINS` is refused, like a cookie POST. Rooms live in the api process (one api container in compose); a second api process would need the Socket.IO Redis adapter first.

Each sent message also queues one `moderation_job` row (`outcome` null) after it is delivered. Nothing scans it yet (Epic 8), and a failure to queue never fails the send: the api log shows `chat scan_enqueue_failed message=<id>`.
