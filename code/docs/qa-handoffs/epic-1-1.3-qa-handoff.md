# Epic 1 Story 1.3 QA handoff

## What was built

The same `code/apps/api` image can start as the worker process. `PROCESS_ROLE=worker` does not bind an HTTP server. It writes `role=worker redis=unavailable` and exits non-zero. There is no Redis connection setting, no BullMQ client, and no processor registration API. The live Redis connection and the no-op job stay on Story 1.6.

## Where

- `code/apps/api/src/main.ts`
- `code/apps/api/src/worker-shell.ts`
- `code/apps/api/src/worker-shell.test.ts`

## How to run

From `code/`:

```bash
npx vitest run apps/api/src/worker-shell.test.ts apps/api/src/api.test.ts
npm run typecheck
npm run lint
```

Manual process check, after `npm run build` in `code/`:

```bash
cd apps/api
PROCESS_ROLE=worker PORT=3999 node dist/main.js
```

Expected: exit code 1, stderr contains `role=worker redis=unavailable`, and nothing accepts TCP on port 3999.

```bash
PROCESS_ROLE=api PORT=3999 node dist/main.js
```

Expected: `GET http://127.0.0.1:3999/v1/health` returns 200 with exactly `status`, `role`, and `request_id`.

## Test cases

| Case | Input | Expected |
| --- | --- | --- |
| Worker | `PROCESS_ROLE=worker` | Exit non-zero. Stderr contains `role=worker redis=unavailable`. No TCP accept on `PORT` while the process is alive. |
| Padded worker | `PROCESS_ROLE=' worker '` | Same as worker. |
| API | `PROCESS_ROLE=api` | `GET /v1/health` is 200 and the body keys are `request_id`, `role`, `status`. `status` is `ok`. `role` is `api`. |
| Unset role | `PROCESS_ROLE` removed | Same health body as API. |
| Blank role | `PROCESS_ROLE=` or whitespace | Same health body as API. |
| Unknown `/v1` route | existing Story 1.2 test | AD-7 envelope, code `UNHANDLED`, no stack, no banned lexicon. |

## Test data

No database, Redis, or fixtures. Ports come from an ephemeral bind in the test. The manual check uses port 3999.

## My results

`npx vitest run apps/api/src/worker-shell.test.ts apps/api/src/api.test.ts` — 8 passed. `npm run typecheck` passed. `npm run lint` passed.

## Three validation passes

1. Worker process: `dist/main.js` with `PROCESS_ROLE=worker` and padded `worker` exits non-zero, prints the stderr line, and refuses TCP on `PORT` while the process is alive.
2. API regression: unset, blank, whitespace, and `api` each serve the Story 1.2 health body from `dist/main.js`. `api.test.ts` still covers unknown `/v1` routes.
3. Static pass: `npm run typecheck` and `npm run lint` on `code/` produced no errors. Shipped strings do not contain `dating` or `rencontre romantique`.

## Solution-design sections

- §3 Paradigm and module boundaries — worker role only, no modules, no tables.
- §4 Stack — existing Nest pin. BullMQ was not added.
- §6 Entity catalog preamble — no tables.
- §7 and §7.1 APIs — no resource-map routes. Worker does not bind HTTP. `GET /v1/health` stays on the api role.
- §8 Moderation pipeline — host only. No scan processors and no `moderation_job` or `flag_queue` writes.
- §14 Deployment — not deployed.

## Stitch files

None. This story has no screen.

## Known gaps

- No live Redis connection and no no-op job. Those are Story 1.6.
- No retry loop. Redis-down is an immediate non-zero exit.
- No Dockerfile, compose, scan handler, or SMS dispatch.
