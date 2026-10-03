---
title: 'Story 1.3 — Worker process from the same image'
type: 'feature'
created: '2026-10-03'
status: 'done'
route: 'dispatch'
baseline_commit: '35f718f7e540348f9f850d7b171f466dc4907757'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `code/apps/api` always listens for HTTP. Operators cannot start that same image as the worker.

**Approach:** Branch the existing ESM entry on `PROCESS_ROLE=worker`. That branch is the worker process shell from the same image. It does not bind an HTTP server, does not open a Redis connection, and does not expose a processor registration API. The live Redis connection and the no-op job stay on Story 1.6. Worker start in this story is the Redis-down case: exit non-zero with a visible stderr line. Unset or `api` stays Story 1.2.

## Boundaries & Constraints

**Always:** Same `code/apps/api` entry. `PROCESS_ROLE=worker` does not call `createApp` or `listen`. Exit code is non-zero. Stderr contains `role=worker redis=unavailable`. No retry interval. Pins stay Node 24.21.0, TypeScript 7.0.2, NestJS 12.1.0. Shipped strings must not contain `dating` or `rencontre romantique`.

**Never:** A Redis connection setting, BullMQ, a processor registration API, a no-op job, a second codebase, a Dockerfile, a product table, scan or SMS handlers, worker HTTP, or an AuthContext. Do not change the Story 1.2 health body. Do not rewrite planning docs. Do not deploy.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| API role | `PROCESS_ROLE` unset or `api` | Story 1.2 HTTP, including `GET /v1/health` | Unchanged |
| Worker shell | `PROCESS_ROLE=worker` | Same image entry. No HTTP server. No Redis connection. No processor API. | N/A |
| Redis down | `PROCESS_ROLE=worker` with no live Redis connection | Exit non-zero. Stderr shows `role=worker redis=unavailable`. No HTTP server. | No retry loop |

</frozen-after-approval>

## Code Map

- `code/apps/api/src/main.ts` — always listens. Branch to the worker shell before `createApp`. Do not change the api listen path.
- `code/apps/api/src/create-app.ts` — HTTP Nest app. Worker must not call it.
- `code/apps/api/src/health.controller.ts` — `{ status: "ok", role: "api", request_id }`. Leave it.
- `code/apps/api/package.json` — do not add `bullmq` or a Redis client.
- `code/apps/api/src/api.test.ts` — Story 1.2 HTTP tests. Keep them green.
- `code/packages/ports/src/index.ts` — no queue port. Do not add one.

## Tasks & Acceptance

**Execution:**
- [x] `code/apps/api/src/main.ts` — `PROCESS_ROLE=worker` runs the shell and does not listen — so the same image has a worker role
- [x] `code/apps/api/src/worker-shell.ts` — exit non-zero and a visible stderr line, with no connection setting — so Redis-down does not start HTTP
- [x] `code/apps/api/src/worker-shell.test.ts` — role, exit, and no bound port — so the matrix rows are executed

**Acceptance Criteria:**
- Given the same api image, when it starts with `PROCESS_ROLE=worker`, then the worker process is that role, it does not bind an HTTP server, and it does not register a processor API.
- Given Redis is not connected, when the worker starts, then it exits non-zero, the failure is visible on stderr, and it does not start an HTTP server.

## Implementation Notes

- `PROCESS_ROLE=worker` writes `role=worker redis=unavailable` and exits 1 before the HTTP modules load. No Redis env var. No BullMQ.
- Spawned `dist/main.js` for `worker`, padded `worker`, unset, blank, whitespace, and `api`. Worker exits non-zero and the port stays closed while the process is alive. The api cases return the Story 1.2 health body.
- `npx vitest run apps/api/src/worker-shell.test.ts apps/api/src/api.test.ts` — 8 passed. `npm run typecheck` and `npm run lint` passed.

## Spec Change Log

- Founder comment on ANK-23: live Redis connection and the no-op job stay on Story 1.6. This story is the process shell and the Redis-down exit only. No Redis setting. No processor registration API.

## Review Triage Log

- stderr may vanish before `process.exit`, and HTTP is not in an `else` — false. A short stderr write is already in the pipe; the spawn test reads `role=worker redis=unavailable` after exit. `process.exit` does not return, so `createApp` does not run.
- Port check only after exit — medium — patched. The worker spawn probes the port while the child is alive and fails if any probe connects.
- `WORKER` and typos start HTTP — false. The frozen role is exact `worker` after trim. Other values stay on the Story 1.2 api path.
- Worker always exits, with no live Redis check — false. The founder left the live connection on Story 1.6 and said this story must not require one.
- "Always" exit text could be read as applying to the api role — false. The api spawn still returns HTTP 200. The matrix row is the api behavior.
- Notes claimed unset and blank were spawn-tested — low — patched. Those values, plus padded `worker`, now spawn `dist/main.js`.
- Piped stdio can stall, a missing `dist` can hang, kernel `dist` is unbuilt — false. Stdout is ignored, stderr is read, and the health spawn completed. `node dist/main.js` exits if the file is missing. The passing health body shows `@ankanu/kernel` resolved.
- Code map still says `main.ts` always listens — false. That sentence is spec text. The entry branches before listen.
- Epic AC still says register processors — false. The founder comment on this ticket narrowed 1.3 to the shell and the Redis-down exit. Planning docs were not rewritten.
- Tests do not forbid a Redis client import — low — rejected. A ban would fail Story 1.6, which owns the live connection.
- Freed port can be taken before bind — low — rejected. Everyday runs do not hit that race, and a retry loop is extra machinery.
- Worker that never exits hangs the file — low — rejected. The helper now throws at 5s and stops the child. Vitest would also time the test out.
- `once('exit')` after the child already exited hangs cleanup — medium — patched. `stopChild` kills and waits only while the child is still running.
- Health `fetch` can ignore the deadline — low — patched. Each attempt uses `AbortSignal.timeout(200)`.
- Verification gap: no-bind asserted only after exit — medium — patched. Same probe-while-alive change.
- Verification gap: unset, blank, and padded `worker` never spawn — medium — patched. Those env values now spawn `dist/main.js`.

## Verification

**Commands:**
- From `code/`: `npx vitest run apps/api/src/worker-shell.test.ts apps/api/src/api.test.ts`, then `npm run typecheck` and `npm run lint` — expected: worker exits non-zero with no port, health body stays exact.
