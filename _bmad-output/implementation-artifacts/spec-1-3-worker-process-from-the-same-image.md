---
title: 'Story 1.3 — Worker process from the same image'
type: 'feature'
created: '2026-10-03'
status: 'draft'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `code/apps/api` always listens for HTTP. Operators cannot start that same image as the BullMQ worker.

**Approach:** Branch the existing ESM Nest entry on `PROCESS_ROLE`. `worker` must not bind the public HTTP port. Unset or `api` stays Story 1.2. Do not choose a Redis env name or a job handler until the open questions are answered.

## Boundaries & Constraints

**Always:** Same `code/apps/api` image and entry. `PROCESS_ROLE=worker` does not call `createApp` or `listen`. Redis that cannot be reached exits non-zero and does not start an HTTP server. No retry interval (the pack allows exit or visible retry, and it does not give a schedule). Pins: Node 24.21.0, TypeScript 7.0.2, NestJS 12.1.0, BullMQ 6.3.9. Shipped strings must not contain `dating` or `rencontre romantique`.

**Never:** A second codebase, Dockerfile, compose file, product table, scan or SMS handler, Redis/S3 adapter module, worker HTTP route, or AuthContext. Do not change the Story 1.2 health body. Do not deploy.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| API role | `PROCESS_ROLE` unset or `api` | Story 1.2 HTTP, including `GET /v1/health` | Unchanged |
| Worker role | `PROCESS_ROLE=worker` | No public HTTP bind. No health server. | Processor registration is an open question |
| Redis down | `PROCESS_ROLE=worker` and Redis cannot be reached | Process exits non-zero. No HTTP server. | No retry loop |

</frozen-after-approval>

## Open Questions

- Redis connection — the ticket, `ARCHITECTURE-SPINE.md`, `SOLUTION-DESIGN.md`, and Epic 1 stories do not name an env var or a host/port/url shape. Story 1.6 owns `Redis connection`. Options: paste the governing sentence that names the variable and shape (worker uses that and nothing else) / amend this story so the BullMQ connection waits for Story 1.6 (the current AC still requires a Redis-down exit, so the ticket text must change with that choice).
- Queue processors — the AC says the worker registers them. No module may contribute a handler yet. The no-op job ack is Story 1.6. Scan and SMS processors are later stories. No queue name is given. Options: paste the queue name and the registration rule (this story registers that and nothing else) / accept an empty registry and no BullMQ `Worker` until a later story contributes a handler (may fail the AC as written) / keep the no-op job in Story 1.6 and amend this AC so 1.3 does not invent a handler.

## Code Map

- `code/apps/api/src/main.ts` — always `createApp()` then `listen`. Worker must branch before that. Do not change the api path.
- `code/apps/api/src/create-app.ts` — HTTP Nest app, prefix `/v1`. Worker must not call it.
- `code/apps/api/src/health.controller.ts` — success body `{ status: "ok", role: "api", request_id }`. Leave it.
- `code/apps/api/package.json` — no `bullmq` dependency yet. Do not add it until both open questions have a sentence.
- `code/apps/api/src/api.test.ts` — Story 1.2 HTTP tests. Keep them green.
- `code/packages/ports/src/index.ts` — no queue port. Do not add `enqueueScan` or a job type.

## Tasks & Acceptance

**Execution:**
- [ ] `code/apps/api` — `PROCESS_ROLE=worker` path with no HTTP bind — blocked on both open questions
- [ ] `code/apps/api` tests — worker does not listen; Redis down exits non-zero — blocked on the Redis sentence

**Acceptance Criteria:**
- Given the same api image, when it starts with `PROCESS_ROLE=worker`, then it registers the queue processors the answer names and does not bind the public HTTP port.
- Given Redis is down, when the worker starts, then it exits non-zero and does not start an HTTP server.

## Implementation Notes

## Spec Change Log

## Review Triage Log

## Verification

**Commands:**
- From `code/`: the worker test file plus the existing `apps/api/src/api.test.ts`, then `npm run typecheck` and `npm run lint` — expected: api health stays exact, worker binds no port, Redis-down exits non-zero.
