# Epic 1 Story 1.7 QA handoff

## What was built

`code/compose.yaml` starts `web`, `api`, `worker`, `postgres`, `redis`, and `bucket` as project `ankanu`. Api and worker use one image tagged `api` and different commands. Web is a second image tagged `web`. No host ports are published. Postgres is 17.11 with trust auth. Redis is 8.6.3 with no password. The bucket server is the same S3-compatible image Story 1.6 already used. Bucket root credentials come from the process environment at `docker compose up`.

## Where

- `code/apps/api/Dockerfile`
- `code/apps/web/Dockerfile`
- `code/compose.yaml`
- `code/.dockerignore`
- `code/apps/api/src/compose.test.ts`
- `code/apps/api/src/secrets-baked.test.ts`

## How to run

From `code/`, with Docker available. Set `S3_ACCESS_KEY_ID` and `S3_SECRET_ACCESS_KEY` in the environment before the stack starts. Do not commit those values.

```bash
npx vitest run --fileParallelism false apps/api/src/compose.test.ts apps/api/src/secrets-baked.test.ts
npx tsc -p tsconfig.tests.json --pretty false
```

The compose test builds the images, waits until every service is healthy, checks the shared image, and removes project `ankanu` only. Do not stop, restart, or prune any other compose project.

Manual stack, still from `code/`:

```bash
docker compose up -d --build --wait --wait-timeout 600
docker compose ps
docker compose down --remove-orphans -v
```

`docker compose ps` should show the six services healthy, and `docker port` should not show a host binding.

## Test cases

| Case | Input | Expected |
| --- | --- | --- |
| Health | Compose up with both bucket env vars set | `web`, `api`, `worker`, `postgres`, `redis`, and `bucket` are healthy. No host port is published. `GET /v1/health` inside api is 200 with `status`, `role` `api`, and `request_id`. Web responds on the compose network. Postgres answers as user `ankanu`. Redis answers `PONG`. The bucket live check succeeds. |
| Same image | Inspect api and worker | Both image ids match and the tag is `api`. Commands differ. The worker command includes `PROCESS_ROLE=worker`. The worker does not listen, except Docker's own address `127.0.0.11`. |
| Pins | Inspect running containers | Postgres image is `postgres:17.11`. Redis image is `redis:8.6.3`. Bucket image is `minio/minio:RELEASE.2025-07-23T15-54-02Z`. `node -v` in api and web is `v24.21.0`. |
| Bucket env missing | Either bucket env var unset or only whitespace, and no project env file | The bucket container exits non-zero before `minio server` and is not healthy. Spaces and tabs do not start the built-in account. |
| Secrets | Image files and git | No quoted bucket key, Redis password, or database password literal. A thrown-away `apps/web/app/.env.local` is not in the web image. |
| Pre-existing web env | `apps/web/app/.env.local` already has bytes | The compose test overwrites that file for the image build, then writes the original bytes back. It deletes the file only when this test created it. |
| Image secret spellings | Image file text | A `DATABASE_URL` with a password, `ENV S3_SECRET_ACCESS_KEY hunter2`, `${MINIO_ROOT_PASSWORD-hunter2}`, and `${AWS_SECRET_ACCESS_KEY-secret}` fail the image scan. `postgres://ankanu@postgres:5432/ankanu` and `"${S3_SECRET_ACCESS_KEY}"` do not. |

## Test data

The test generates both bucket values with `randomBytes`. Postgres user and database are `ankanu`, with trust auth and no password. Redis has no password. `DATABASE_URL` is `postgres://ankanu@postgres:5432/ankanu`. `S3_ENDPOINT` is `http://bucket:9000`. `S3_BUCKET` is `ankanu`. `S3_REGION` is unset, so the adapter default remains `fr-par`. No secret file is committed.

## My results

`npx vitest run --fileParallelism false apps/api/src/compose.test.ts apps/api/src/secrets-baked.test.ts` — 2 files, 7 tests passed in 46.05s after the review patches. Project `ankanu` was removed. The other compose projects on this host were still running.

QA fail patch, without another full `docker compose up`: `npx vitest run --fileParallelism false apps/api/src/secrets-baked.test.ts apps/api/src/compose.test.ts -t "allows code image files|names the project|does not become healthy"` — 8 passed, 3 skipped in 9.27s. The skipped cases are the full stack build from the 46.05s run. Whitespace credentials were still present in the bucket container env, the container exited non-zero, and its logs did not contain the built-in account. `npx tsc -p tsconfig.tests.json --pretty false` passed. `npx oxlint apps/api/src/compose.test.ts apps/api/src/secrets-baked.test.ts compose.yaml` passed. Project `ankanu` was removed.

## Three validation passes

1. Compose health: all six services healthy, no host ports, api health body intact, web reachable on the compose network, Postgres and Redis answer, bucket live check succeeds, worker is the worker role and does not listen.
2. Same image and missing credentials: api and worker share image `api` with different commands. Unset or whitespace-only bucket credentials exit non-zero before `minio server`. Running containers match the pinned Postgres, Redis, bucket, and Node versions, and the api env matches the bucket credentials that were supplied.
3. Secrets and types: the secrets scan allows only the three image files under `code/` and rejects baked literals, including a password in `DATABASE_URL`, a Dockerfile `ENV` space assignment, and `${VAR-default}` secret defaults. A passwordless `postgres://ankanu@postgres:5432/ankanu` and `"${S3_SECRET_ACCESS_KEY}"` stay allowed. A pre-existing web env file is restored. The dockerignore fixture is absent from the web image. Test typecheck passed.

## Solution-design sections

- Entity catalog: no new table.
- AD-1: api and worker are one image, different command. `PROCESS_ROLE=worker` does not bind HTTP.
- AD-6: standard PostgreSQL 17.11, Redis 8.6.3, S3-compatible storage. Secrets are process env, not the image or git.
- AD-20: local compose only. No OpenTofu, isolated envs, CI, or Secret Manager.
- §4 / §5.2: the pins above. Redis versus Valkey stays open. The client is still the Redis protocol.
- §7: no new route. Reachability is `GET /v1/health`.
- §14: not deployed. No migrate-on-start.

## Stitch files

None. This story has no screen.

## Known gaps

- No host port is published. A browser on the host cannot open the site. Check health inside the compose network.
- The bucket does not start until both bucket env vars contain a non-whitespace character. There is no default credential.
- Postgres comes up empty. Drizzle migrate stays a separate command.
- Starting only the worker before image `api` exists fails, because that service does not build a second image.
- A Valkey server was not started.
- Unquoted password assignments in non-image text are still outside the image-file scan. Quoted `POSTGRES_PASSWORD`, `S3_ACCESS_KEY_ID`, and `MINIO_ROOT_USER` in non-image files stay on the pre-existing scan.
- This commit stays local until QA passes. It is not pushed.
