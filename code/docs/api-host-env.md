# API host env

The ankanu `api` service reads `/var/lib/ankanu/api.env` from `env_file` in `code/compose.yaml`. The file is on the host, mode `600`, outside this repo and outside the image. It holds `SMTP_URL`, `EVIDENCE_KEY`, and `EVIDENCE_KID`. Do not commit it. Do not print it. `api.env` is gitignored if a copy lands in the tree.

`required: false` so a checkout without that file still starts the api. This host has the file. The worker does not read it. Mail and evidence sealing run in the api process.

`SMTP_URL` may use `smtp:`, `smtps:`, or `log:`. A `log:` URL writes one stdout line per message: `email <recipient> AnKanu <full link>`. QA reads those links with `docker logs ankanu-api-1`. The guards that refuse empty text, angle brackets, and control characters still apply.

The api image sets `NODE_ENV=production` on every boot, so that variable cannot by itself separate this host from a production boot. Log mail is allowed only when `RECAPTCHA_ALLOW_TEST_KEYS=1`, the same opt-in as the reCAPTCHA test keys. Any other boot with a `log:` URL exits at startup.

Bucket credentials stay in the compose process environment (`S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`). They are not in the host env file.

`ANKANU_COOKIE_SECURE` defaults to `true` when unset or empty. The only other accepted value is `false`. Any other string refuses to start. `false` omits `Secure` on every `ankanu_session` set and clear (`HttpOnly`, `SameSite=Lax`, `Path=/`, no `Domain`). The ankanu staging compose sets `false` on the api service because staging is plain http. Production stays `true`.

`ANKANU_PUBLIC_ORIGIN` is the configured public origin. When `ANKANU_COOKIE_SECURE=false` and that origin is `https` (or the value starts with `https:`), the api refuses to start. An unset origin is not https, so http staging does not set it. A production https origin must be set so a `false` cookie flag cannot boot.
