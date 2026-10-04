# Epic 1 Story 1.6 QA handoff

## What was built

`code/apps/api` can write one test object to a private S3-compatible bucket and enqueue one BullMQ no-op job. `PROCESS_ROLE=worker` on that same entry acks the job when Redis answers. The same Redis host also does cache and pubsub. If `REDIS_HOST` is missing, or the port refuses the connection, the worker still exits 1 with `role=worker redis=unavailable` and does not bind HTTP. No route, table, Dockerfile, or compose file was added.

## Where

- `code/apps/api/src/object-storage-adapter.ts`
- `code/apps/api/src/redis-substrate.ts`
- `code/apps/api/src/substrate.ts`
- `code/apps/api/src/worker-shell.ts`
- `code/apps/api/src/main.ts`
- `code/apps/api/src/substrate.test.ts`
- `code/apps/api/src/secrets-baked.test.ts`
- `code/apps/api/src/worker-shell.test.ts`
- `code/apps/api/package.json`

## How to run

From `code/`, with Docker available:

```bash
npx vitest run --fileParallelism false apps/api/src/substrate.test.ts apps/api/src/secrets-baked.test.ts apps/api/src/worker-shell.test.ts apps/api/src/api.test.ts
npm run typecheck
npm run lint
```

The substrate test starts throwaway `redis:8.6.3` and `minio/minio:RELEASE.2025-07-23T15-54-02Z` containers and removes them. Passwords are `randomBytes` in the test process. Do not add compose for this story.

## Test cases

| Case | Input | Expected |
| --- | --- | --- |
| Settings | No `REDIS_HOST` / no S3 env | Both settings helpers return null. Host only, or host plus an empty password, is `{ host: '127.0.0.1', port: 6379 }` with no password. Unset `S3_REGION` is `fr-par`. |
| Cache and pubsub | Redis 8.6.3 with a generated password | `INFO` matches `redis_version:8.6.3` at a word boundary. SET/GET returns `cache-ok`. SUBSCRIBE then PUBLISH returns `pubsub-ok`. |
| Round trip | Private bucket and the worker process | Api writes 4 bytes at a `substrate-test/` key and enqueues `noop`. Read-back matches. Unsigned GET is 403. Job state is `waiting`, then `completed` after `PROCESS_ROLE=worker`. That process does not accept TCP on `PORT`. Stderr does not contain the password or `role=worker redis=unavailable`. |
| Redis down | `REDIS_HOST=127.0.0.1` and a closed port | Exit code 1 within 5 seconds. Stderr contains `role=worker redis=unavailable`. No HTTP listen. |
| Redis unset | `PROCESS_ROLE=worker` with Redis env removed | Same Story 1.3 exit. `GET /v1/health` is unchanged for the api role. |
| Secrets | Repo tree | No Dockerfile or compose file. No quoted bucket key or Redis password in `code/` text. |

## Test data

Throwaway Redis 8.6.3 and one MinIO bucket. The test generates the Redis password and the MinIO root user and password. The object body is the bytes `01 02 03 04`. The queue name and job name are `noop`. The MinIO call uses `S3_REGION=us-east-1` so `CreateBucket` is accepted. No fixtures are committed.

## My results

`npx vitest run --fileParallelism false apps/api/src/substrate.test.ts apps/api/src/secrets-baked.test.ts apps/api/src/worker-shell.test.ts apps/api/src/api.test.ts` — 13 passed. `npm run typecheck` passed. `npm run lint` passed.

## Three validation passes

1. Round trip on Redis 8.6.3 and MinIO: object bytes match, unsigned GET is 403, the job is `waiting` before the worker and `completed` after it, and the worker process does not listen.
2. Cache SET/GET and pubsub on that same Redis. A closed port exits in under 5 seconds with the Story 1.3 stderr line and no HTTP listener. Host-only Redis settings use port 6379 and do not invent a password.
3. Static pass: `npm run typecheck` and `npm run lint`. The secrets scan finds no image definition and no baked bucket key or Redis password. `GET /v1/health` is still `{ status, role: "api", request_id }`.

## Solution-design sections

- Entity catalog: no new table. The test object is not a `photo_asset` row.
- AD-6: Redis protocol (Valkey-compatible client) and S3-compatible storage. Secrets are process env, not source.
- AD-2: `ObjectStorageAdapter` is the outbound adapter. No `MediaPort.sign`.
- AD-1: one worker role, BullMQ, no second queue deployment, no worker HTTP.
- §4 / §5.2: Redis 8.6.3 and S3-compatible storage. The test bucket client is path-style.
- §7: no new route.
- §9: private bucket and one test object. No presign and no gateway.
- §14: not deployed.

## Stitch files

None. This story has no screen.

## Known gaps

- Compose and Dockerfiles are Story 1.7. This story only starts throwaway containers from the test.
- The no-op processor does not read the bucket. Worker-to-bucket traffic is later media work.
- `MediaPort.sign`, `photo_asset`, `derivative`, and `signed_grant` are not created.
- The MinIO test sets `S3_REGION=us-east-1`. Production region `fr-par` is the default only when `S3_REGION` is unset.
- A Valkey server was not started. The client is the Redis protocol, which is the portable contract.
- This story's commit is local until QA passes. It is not pushed yet.
