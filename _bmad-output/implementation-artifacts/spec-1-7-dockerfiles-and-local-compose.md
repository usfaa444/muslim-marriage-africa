---
title: 'Story 1.7 — Dockerfiles and local compose'
type: 'feature'
created: '2026-10-04'
status: 'done'
baseline_commit: '8f3c7e151889ebf545b0280baf253785f8bab578'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** A new clone cannot start web, api, worker, Postgres, Redis, and the bucket together. Stories 1.2–1.6 shipped the processes and adapters, and left Dockerfiles and compose for this story.

**Approach:** Add one api/worker image and one web image under `code/`, plus `code/compose.yaml` for Postgres 17.11, Redis 8.6.3, and the S3-compatible bucket server already used by the Story 1.6 test. Api and worker share that image and use different commands. No host ports are published.

## Boundaries & Constraints

**Always:** Service names are `web`, `api`, `worker`, `postgres`, `redis`, and `bucket`. The shared image tag is `api`. The web image tag is `web`. Worker command sets `PROCESS_ROLE=worker` and does not listen. Postgres image is `postgres:17.11`. Redis image is `redis:8.6.3`. The bucket image is the Story 1.6 test image (`minio/minio:RELEASE.2025-07-23T15-54-02Z`); the service name stays `bucket`. Node image is `node:24.21.0`. Api listen default stays 3000. Redis port inside the network stays 6379. Compose project name is `ankanu`. Secrets are read from the process environment at `docker compose up`. Postgres uses trust auth with user and database `ankanu` so no DB password is stored. Redis has no password. Bucket root credentials are `S3_ACCESS_KEY_ID` and `S3_SECRET_ACCESS_KEY`.

**Never:** Host port bindings. A second worker image. `infra/` OpenTofu, Kapsule, Secret Manager, CI, OTel, a privacy page, Operator screens, Socket.IO, SMS, or media tables. Secrets, `minioadmin`, or a Redis password written into git or an image. Closing Redis vs Valkey. A migrate-on-start job. UI changes. Deploying this epic. Stopping containers outside project `ankanu`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Health | `docker compose up` in `code/` with bucket credentials in the environment | `web`, `api`, `worker`, `postgres`, `redis`, and `bucket` become healthy. No host ports are published. | N/A |
| Same image | Inspect api and worker | Both use image `api`. Commands differ. Worker has `PROCESS_ROLE=worker` and does not listen. | N/A |
| Secrets | Image files and git | No bucket key, Redis password, or DB password literal. | N/A |
| Bucket env missing | `S3_ACCESS_KEY_ID` or `S3_SECRET_ACCESS_KEY` unset | The bucket service does not become healthy. Credentials are not defaulted in the file. | Compose health fails |

</frozen-after-approval>

## Code Map

- `code/apps/api/src/main.ts` — `PROCESS_ROLE=worker` skips HTTP. Reuse. Do not change the health body.
- `code/apps/api/src/listen-port.ts` — unset `PORT` listens on 3000. Do not publish that port on the host.
- `code/apps/api/src/redis-substrate.ts` — `REDIS_HOST` plus default port 6379. Empty password is allowed.
- `code/apps/api/src/object-storage-adapter.ts` — `S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`. Unset `S3_REGION` is `fr-par`.
- `code/apps/api/src/substrate.test.ts` — bucket image tag to reuse. Do not copy its generated passwords into git.
- `code/apps/api/src/secrets-baked.test.ts` — today it rejects every Dockerfile and compose file. Change it so `code/` image files may exist and still must not contain secrets.
- `code/apps/api/src/operator-config.migrate.test.ts` — user and database `ankanu` on Postgres 17. Do not add compose there.
- `code/apps/web` — French shell already built. Image runs `next start`. Do not edit the UI.
- `code/package.json` — Node 24.21.0 and the workspace build (`tsc` for kernel, ports, api).

## Tasks & Acceptance

**Execution:**
- [x] `code/apps/api/Dockerfile` — one image for api and worker — so both roles share a tag
- [x] `code/apps/web/Dockerfile` — web image — so the public shell starts without Scaleway
- [x] `code/compose.yaml` — `web`, `api`, `worker`, `postgres`, `redis`, `bucket` — so `docker compose up` can be health-checked
- [x] `code/.dockerignore` — keep secrets, dependencies, and build output out of the build context
- [x] `code/apps/api/src/secrets-baked.test.ts` — allow those image files and still reject baked secrets
- [x] `code/apps/api/src/compose.test.ts` — health, same image, different command, no host ports

**Acceptance Criteria:**
- Given `docker compose up`, when health is checked, then `web`, `api`, `worker`, Postgres, Redis, and the bucket are reachable.
- Given the api/worker image is inspected, when tags are compared, then api and worker are the same image, different command.

## Implementation Notes

- Api receives `DATABASE_URL=postgres://ankanu@postgres:5432/ankanu` with no password, matching Postgres trust auth.
- Bucket credentials stay in the process environment. An empty value makes the bucket command exit 1 so MinIO cannot fall back to its built-in account.
- Worker uses image `api` with `pull_policy: never` and command `PROCESS_ROLE=worker exec node apps/api/dist/main.js`.
- `npx vitest run --fileParallelism false apps/api/src/compose.test.ts apps/api/src/secrets-baked.test.ts` — 2 files, 7 tests passed in 40.50s. Project `ankanu` was removed at the end. Other compose projects were still running.
- Review patches: quoted secret interpolation, `/proc/net` worker health, empty `--env-file`, running image and env assertions, `node -v`, and a dockerignore fixture. Re-ran the same Vitest command — 7 passed in 46.05s. `npx oxlint` on the two test files passed.

## Spec Change Log

## Review Triage Log

- false — Diff paths are `code/apps/api/Dockerfile`, `code/apps/web/Dockerfile`, and `code/compose.yaml`. The allowlist matches those paths.
- low — Worker healthcheck treated a 400ms connect timeout as healthy. Patched to a `/proc/net` listen check with no success-on-timeout.
- false — Unset `S3_REGION` stays `fr-par`, and the matrix only requires the bucket server to be healthy. CreateBucket is Story 1.6.
- medium — Unquoted secret assignments in image files were not scanned. Patched the image literal pattern, and quoted interpolations are not treated as literals.
- false — The working-tree walk already requires the exact image allowlist. The git check only keeps tracked image files under `code/`.
- medium — A project `.env` could refill deleted bucket credentials. Compose test commands now pass an empty `--env-file`.
- low — Running compose inside the default Vitest file list matches Stories 1.5 and 1.6. Rejected.
- low — Web PID 1 was npm, and the runtime image copied `src`. Patched: `node` runs `next start`, and `src` is not copied.
- low — Non-root `USER` and a slimmer workspace install add image policy this story does not require. Rejected.
- false — `pull_policy: never` is what keeps api and worker on one image id. `docker compose up` builds `api` first.
- false — Redis loss after a successful start is not the Story 1.3 exit. That exit is when Redis is down at start.
- false — A migrate step is forbidden. Postgres reachability is `pg_isready`, not a seeded schema.
- medium — `.dockerignore` was not proven. The compose test writes `apps/web/app/.env.local` and asserts it is absent from the web image. Ignore rules now also cover `id_rsa`, `.npmrc`, `.p12`, and `.pfx`.
- false — Trust auth, one compose network, and ephemeral data are the local reachability design. The test removes project `ankanu` volumes only.
- low — `composeDown` swallowed a failed `down`. It now throws.
- false — `docker compose ps -aq <service>` returns that service's container. The last id is the one just started.
- false — The bucket health test ran `curl` inside the MinIO image and got a healthy container.
- medium — Same unquoted image-secret hole as the secrets finding. Patched with it.
- defer — Unquoted `POSTGRES_PASSWORD` or `REDIS_PASSWORD` in non-image text is the pre-existing quoted-only scan. Recorded in deferred-work.
- false — A Dockerfile under `dist` is skipped by the walk and is gitignored, so it is not a tracked image file.
- false — Filtering only port 53 on `127.0.0.11` marks the worker unhealthy. This Docker DNS stub was observed listening on `0B00007F:A9C9`. The check ignores that address and fails any other listener.
- medium — Unquoted interpolated secrets can break on YAML-special characters. Compose now quotes those interpolations.
- low — A worker listen on an address other than `127.0.0.1:3000` could pass the old healthcheck. The `/proc/net` check fails any listener except `127.0.0.11`.
- false — Giving the worker its own `build` can produce a second image id. The shared tag is the acceptance criterion.
- false — The bucket service is reachable when MinIO's live check passes. Creating bucket `ankanu` is not this story's matrix.
- medium — Claim that bare `docker compose up` is healthy without bucket credentials contradicts the matrix row that those credentials are required.
- medium — Running API env did not assert Redis or bucket settings. The inspect test now checks those values and the bucket's root user and password.
- medium — Postgres, Redis, and bucket image tags were only grepped from the file. The running containers are now checked.
- medium — Node 24.21.0 was not observed. The running test asserts `node -v` is `v24.21.0` in api and web.
- low — The 400ms healthcheck timeout is the same worker-health finding. Patched with the `/proc/net` check.

## Verification

**Commands:**
- `npx vitest run --fileParallelism false apps/api/src/compose.test.ts apps/api/src/secrets-baked.test.ts` from `code/` — expected: pass
