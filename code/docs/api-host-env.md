# API host env

The ankanu `api` service reads `/var/lib/ankanu/api.env` from `env_file` in `code/compose.yaml`. The file is on the host, mode `600`, outside this repo and outside the image. It holds `SMTP_URL`, `EVIDENCE_KEY`, and `EVIDENCE_KID`. Do not commit it. Do not print it. `api.env` is gitignored if a copy lands in the tree.

`required: false` so a checkout without that file still starts the api. This host has the file. The worker does not read it. Mail and evidence sealing run in the api process.

`SMTP_URL` may use `smtp:`, `smtps:`, or `log:`. A `log:` URL writes one stdout line per message: `email <recipient> AnKanu <full link>`. QA reads those links with `docker logs ankanu-api-1`. The guards that refuse empty text, angle brackets, and control characters still apply.

The api image sets `NODE_ENV=production` on every boot, so that variable cannot by itself separate this host from a production boot. Log mail is allowed only when `RECAPTCHA_ALLOW_TEST_KEYS=1`, the same opt-in as the reCAPTCHA test keys. Any other boot with a `log:` URL exits at startup.

Bucket credentials stay in the compose process environment (`S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`). They are not in the host env file.

`ANKANU_COOKIE_SECURE` defaults to `true` when unset or empty. The only other accepted value is `false`. Any other string refuses to start. With no request in scope, `false` omits `Secure`. On a request, `Secure` stays on when the trusted scheme is https, and it is omitted only when the scheme is plain http and that origin is an allowed http origin. `HttpOnly`, `SameSite=Lax`, `Path=/`, no `Domain`. `ANKANU_COOKIE_SECURE=false` together with an https `ANKANU_PUBLIC_ORIGIN` refuses to start. Staging compose does not set the flag to `false`.

`ANKANU_PUBLIC_ORIGIN` is the only host used for verification, change-email, and password-reset links. The request `Origin` and `Host` are not used. It must be an http(s) origin with no path, query, userinfo, or hash. The api image sets `NODE_ENV=production`, so a missing or invalid value refuses to start, including the worker. Staging compose sets `https://staging.ankanu.com` on api, web, and worker.

`ANKANU_ALLOWED_ORIGINS` is a comma-separated origin list. Staging compose sets `https://staging.ankanu.com,http://72.61.0.79:4012`. In production an empty list refuses to start. When the list is set, a POST, PATCH, PUT, or DELETE under `/v1` that carries an `Origin` outside the list gets `403` `FORBIDDEN` and no CORS header. A request with no `Origin` is unchanged. An empty list outside production does not check.

`X-Forwarded-Proto`, `X-Forwarded-Host`, `X-Forwarded-For`, `x-ankanu-edge-proto`, and `x-ankanu-edge-host` are read only when the peer is loopback or inside `172.16.0.0/12`. The last comma-separated hop is the edge value. Rate limits stay on `request.socket.remoteAddress`.

The edge file, the `172.24.0.1:4012` upstream, and the `compose.ports.yml` requirement are in `code/docs/staging-edge.md`.
