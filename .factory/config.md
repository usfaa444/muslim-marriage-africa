# Software factory config: AnKanu

Read by the `factory-dev`, `factory-qa` and `feature-factory` skills. Keep it short and true. When a fact here changes, change it in the same PR.

## Models

- QA agent: **Claude Sonnet 5.5** (`claude-sonnet-5-5`), always. The orchestrator starts QA with the `factory-qa` agent in `.claude/agents/factory-qa.md`, which pins this model. A QA run on any other model is not a valid QA verdict.
- Developer agent: the session's default model.

## Sources of truth

- Stories and acceptance criteria: `_bmad-output/planning-artifacts/epics.md`, story specs in `_bmad-output/implementation-artifacts/spec-*.md`
- Functional and non-functional requirements: `_bmad-output/planning-artifacts/prds/prd-muslim-marriage-africa-2026-09-27/prd.md` (§5 for NFR targets)
- Architecture: `_bmad-output/planning-artifacts/architecture/architecture-muslim-marriage-africa-2026-09-27/`
- UX: `_bmad-output/planning-artifacts/ux-designs/ux-muslim-marriage-africa-2026-10-01/` (`EXPERIENCE.md`, `DESIGN.md`, `review-accessibility.md`)
- Screen designs: `code/design-stitch/ankanu-v2/<nn-name>/screen.png` and `screen.html` (`MANIFEST.md` maps screens)
- Story status: BMAD sprint status (`bmad-sprint-planning`)

## Commands (run from `code/`)

| Step | Command |
| --- | --- |
| Install | `npm ci`, then `npx playwright install --with-deps chromium` |
| Lint | `npm run lint` |
| Typecheck | `npm run typecheck` |
| Unit | `npm run test:unit` |
| Integration | `npm run test:integration` (needs Docker) |
| Migration check | `npm run migration-check` |
| E2E, local web only | `npm run test:e2e` (starts the web app on port 3100; no API behind `/v1`) |
| E2E, against staging | `E2E_BASE_URL=https://staging.ankanu.com npm run test:e2e` |
| Full local stack | `docker compose up` (see `code/README.md`) |
| Dependency audit | `npm audit --omit=dev --audit-level=high` |

E2E tests live in `code/e2e/`. Import `test`, `expect`, `expectAccessible` and `expectNoHorizontalOverflow` from `./fixtures`. Every test already fails on console errors, page errors, failed requests and 5xx responses. Failure artefacts land in `code/e2e/test-results/` and `code/e2e/report/`. Tolerated errors live in `code/e2e/known-issues.ts`, each with a reason; QA lists every open entry in its report.

## Environments

- Staging: `https://staging.ankanu.com` (Next.js web in front of the API under `/v1`)
- Staff sign-in: `/staff/connexion` (email, password, captcha, then an authenticator code). On staging open the first step with `POST /v1/staff/sessions` and `recaptcha_token: test-ok`, like member sign-in. Staff accounts come only from `staff-cli.js` in the api container.
- reCAPTCHA on staging uses Google's test keys. A headless browser cannot tick the checkbox; open sessions with `POST /v1/sessions` and `recaptcha_token: test-ok`, which is what the panel sends.
- Test accounts: create disposable accounts per run. Staff verification on staging uses `STAGING_STAFF_VERIFICATION_GRANT`. Never use real member data.

## QA standards

- Widths: 360, 390, 768, 1024, 1280, 1440. No horizontal scroll at any width.
- Language: every MVP screen in French. Copy must match the Stitch design or the story exactly.
- Accessibility: WCAG 2.1 AA minimum (axe runs 2.2 AA tags); zero serious or critical violations; touch targets at least 44 by 44 px; keyboard-only path for every flow.
- Performance (NFR-005, low-end Android on 2G to 3G): Lite first grid at most 8 s, Chat open at most 4 s, send-text acknowledgement at most 2 s, no autoplay. Lighthouse mobile: LCP under 2.5 s, CLS under 0.1, INP under 200 ms on public pages.
- Security (NFR-001): server-side authorization on every endpoint (no session, other member, lower role); auth rate limits; argon2id passwords; no personal data in URLs, logs or client storage beyond the spec.
- Privacy (NFR-002, NFR-008): coarse geo only; photos stay blurred unless the spec allows.
- Auditability (NFR-009): events listed in the NFR are written for the actions this story touches.

## Local deployment (after every story)

After QA passes, the factory deploys the story's branch on Fay's computer with Docker so Fay can test it. It runs there through a Remote Control session, never from the cloud container. The repo keeps one compose stack (`code/compose.yaml`, enforced by `self-managed-environment.test.ts`), so the local port and origins live outside the repo in `~/.ankanu/`, the same way staging keeps `compose.ports.yml` on its host.

First time only, create:

- `~/.ankanu/compose.local.yml`:

  ```yaml
  services:
    web:
      ports: ["4012:3000"]
    postgres:
      ports: ["127.0.0.1:55432:5432"]
    api:
      env_file:
        - path: /Users/<you>/.ankanu/api.env
          required: true
  ```

  The Postgres port is bound to this computer only, so the migrations can run from the host. The api's own env file stands in for staging's `/var/lib/ankanu/api.env`, which does not exist locally.

- `~/.ankanu/api.env` (mode 600):

  ```bash
  SMTP_URL=log://
  EVIDENCE_KEY=<openssl rand -base64 32>
  EVIDENCE_KID=local-ankanu-1
  STAFF_MFA_KEY=<openssl rand -base64 32>
  STAFF_MFA_KID=local-staff-mfa-1
  ```

  Without `SMTP_URL` every email send is 503 `EMAIL_DELIVERY_FAILED`; with `log://` the api log prints `email <address> AnKanu <link>`. Without the evidence key, ID and liveness uploads are 503. Without the staff MFA key, staff sign-in is 503 (a real production boot refuses to start); staging needs the same two lines in `/var/lib/ankanu/api.env`.

- `~/.ankanu/local.env`:

  ```bash
  S3_ACCESS_KEY_ID=<random local-only value>
  S3_SECRET_ACCESS_KEY=<random local-only value>
  ANKANU_PUBLIC_ORIGIN=http://localhost:4012
  ANKANU_ALLOWED_ORIGINS=http://localhost:4012
  SMS_PROVIDER=log
  # To send real SMS through Aqilas instead (key from Fay's Aqilas account, never committed):
  # SMS_PROVIDER=aqilas
  # AQILAS_API_KEY=<key>
  # AQILAS_SENDER_ID=AnKanu
  # AQILAS_API_URL=<only to point at a stub; leave unset for the real vendor>
  ```

  `SMS_PROVIDER=log` (also the default when unset) prints the phone code in the api log (`docker compose -p ankanu-local logs api | grep otp`). With `SMS_PROVIDER=aqilas` and no `AQILAS_API_KEY` the api refuses to boot. See `code/README.md`, "SMS".

  `compose.yaml` reads both origins from the env file (staging keeps its own in `/var/lib/ankanu/compose.interpolate.env`), and the api refuses to boot without them. Object storage uses the `pgsty/minio` image, since `minio/minio` is no longer published.

After the first `up`, set up the database and the bucket. Nothing in the stack does this on start. Run `npm ci` in `code/` first if `node_modules` is missing.

```bash
# from code/apps/api: apply every Drizzle migration (the repo's only runner)
DATABASE_URL=postgres://ankanu@127.0.0.1:55432/ankanu npx drizzle-kit migrate
# from code/: create the private, versioned evidence bucket with the app's own adapter
docker compose -p ankanu-local exec -T api node -e "import('/app/apps/api/dist/object-storage-adapter.js').then((m) => m.ObjectStorageAdapter.fromSettings(m.objectStorageSettings(process.env)).createPrivateBucket())"
```

Without the migrations every database call is 500 `Request failed`; without the bucket, ID and liveness uploads are 503. Run the migrate command again whenever a story adds a migration. The database lives in the bind mount `code/pg-data` and survives `down`. The bucket lives in an anonymous volume, so after any `down` (with or without `-v`) run the bucket command again; uploads stored before are gone.

Each story, from `code/` on the story branch:

```bash
git fetch origin && git checkout <story-branch> && git pull
docker compose -p ankanu-local --env-file ~/.ankanu/local.env \
  -f compose.yaml -f ~/.ankanu/compose.local.yml up -d --build --wait
(cd apps/api && DATABASE_URL=postgres://ankanu@127.0.0.1:55432/ankanu npx drizzle-kit migrate)
curl -fsS http://localhost:4012/ >/dev/null && curl -fsS http://localhost:4012/v1/health
E2E_BASE_URL=http://localhost:4012 npm run test:e2e
```

Staff accounts (Story 12.1) come only from the server command, run in the api container (see `code/README.md`, "Staff accounts"):

```bash
docker compose -p ankanu-local exec api node apps/api/dist/staff-cli.js create --email <email> --role moderator|operator
docker compose -p ankanu-local exec api node apps/api/dist/staff-cli.js reset-mfa --email <email>
docker compose -p ankanu-local exec api node apps/api/dist/staff-cli.js disable --email <email>
```

`create` prints a one-time password once. Sign in at `http://localhost:4012/staff/connexion`, set a new password, scan the QR code with an authenticator app and enter its code. The full-stack e2e spends a fresh account: `E2E_STAFF_EMAIL=<email> E2E_STAFF_ONE_TIME_PASSWORD=<printed password> E2E_BASE_URL=http://localhost:4012 npm run test:e2e`.

Then send Fay `http://localhost:4012` and the story's test steps from the QA handoff. Phone codes and emails go to the api log locally: `docker compose -p ankanu-local logs api | grep -E 'otp |email '`. Use the project name `ankanu-local` so the local stack never touches another project. Prefer `up` over `down`: a `down` loses the evidence bucket's contents, and `down -v` also drops the other anonymous volumes. Deleting `code/pg-data` deletes the local database. To reset local data, ask Fay first.

## Handoffs and reports

- Developer handoff: `code/docs/qa-handoffs/<story-id>-qa-handoff.md`
- QA report: `code/docs/qa-handoffs/<story-id>-qa-report.md`, evidence in `code/docs/qa-handoffs/<story-id>-evidence/`

## Forbidden

- QA never edits product code, never pushes, never deploys, never changes staging data beyond disposable test accounts.
- No agent deploys to production, merges a PR, or opens a new epic without Fay's approval.
- Never skip, quarantine or weaken a test to get green.
