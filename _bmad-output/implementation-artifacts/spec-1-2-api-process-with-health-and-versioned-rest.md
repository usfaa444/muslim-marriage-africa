---
title: 'Story 1.2 — API process with health and versioned REST'
type: 'feature'
created: '2026-10-03'
status: 'done'
route: 'dispatch'
baseline_commit: '7897f5f585720bbbabd2988eaa0797a9c3072bc7'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Operators have no NestJS `api` process that can prove `/v1` is alive. Story 1.1 shipped `@ankanu/kernel` and `@ankanu/ports` only.

**Approach:** Add `code/apps/api` as the ESM NestJS HTTP process for role `api`. Serve `GET /v1/health` and map unknown `/v1` routes through the existing AD-7 envelope. Founder decision: success `request_id` is a JSON field on the health body, and `status` is exactly `ok`. The success body is `{ "status": "ok", "role": "api", "request_id": "<id>" }` and nothing else.

## Boundaries & Constraints

**Always:** JSON REST under `/v1`. Health body names `status` and `role`, and `role` is `"api"`. No extra health fields. Unknown `/v1` routes return only `{ error: { code, message, details, request_id, retryable } }` with a machine `code` already produced by `mapInboundException` (a Nest 404 with no machine code becomes `UNHANDLED`). Never a stack trace. Shipped strings must not contain `dating` or `rencontre romantique`. Use `@ankanu/kernel` and `@ankanu/ports`. Pins: Node 24.21.0, TypeScript 7.0.2, NestJS 12.1.0, oxlint, Vitest.

**Never:** Worker, `PROCESS_ROLE=worker`, BullMQ, Socket.IO, `/v2`, session auth, payments, webhooks, product tables, UI, billing, or a new error-code family such as `NOT_FOUND`. Do not change the kernel envelope or the ports mapper. Do not deploy.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Health | `GET /v1/health` while the api process is up | 200. Body is exactly `{ "status": "ok", "role": "api", "request_id": "<id>" }`. `request_id` is a JSON field, minted with kernel `newId`. | N/A |
| Unknown `/v1` route | Any method on an unlisted `/v1` path | AD-7 envelope. `code` is `UNHANDLED` unless the thrown body already carries a kernel machine code. | No stack trace. No second error shape. |

</frozen-after-approval>

## Code Map

- `code/package.json` — workspaces are `packages/*` only. An app under `code/apps/api` is invisible to npm until `apps/*` is added. Do not move kernel or ports.
- `code/packages/kernel/src/error.ts` — `errorEnvelope`, `ERROR_CODES.UNHANDLED`. Reuse. Do not add a health type or a new code.
- `code/packages/ports/src/map-inbound-exception.ts` — `mapInboundException(thrown, requestId?)` recognizes Nest `getStatus` / `getResponse` and returns only the envelope. Pass unknown-route exceptions through it.
- `code/vitest.config.ts` — includes `packages/*/src/**/*.test.ts` and aliases `@ankanu/kernel` to source. API tests need an include. Do not weaken package tests.
- `code/tsconfig.base.json` — ESM `NodeNext`. `apps/api` stays ESM. No listen port is named; this story does not own compose. Prove the routes on an ephemeral port.

## Tasks & Acceptance

**Execution:**
- [x] `code/apps/api` — NestJS ESM process, `GET /v1/health`, unknown `/v1` routes via `mapInboundException`
- [x] `code/package.json` — include `apps/*` in workspaces and the smallest test script that runs the new tests — so the app is installable beside the existing packages
- [x] `code/apps/api` tests — health body and unknown-route envelope — proves the AC without a full-suite run

**Acceptance Criteria:**
- Given the api process is running, when `GET /v1/health`, then 200 with exactly `{ "status": "ok", "role": "api", "request_id": "<id>" }`.
- Given an unknown `/v1` route, when the request finishes, then the AD-7 envelope with a kernel machine `code` and no stack trace.

## Implementation Notes

- `code/apps/api` is an ESM NestJS 12.1.0 process. `GET /v1/health` returns exactly `{ status: "ok", role: "api", request_id }` with `request_id` from kernel `newId`.
- Unknown routes go through `InboundExceptionFilter` → `mapInboundException`. A Nest 404 with no machine code is `UNHANDLED`. The HTTP body is only the AD-7 envelope.
- When `PORT` is unset, the process listens on 3000. Tests bind port 0. Compose still owns the published port (Story 1.7).
- Verified: `npx vitest run apps/api/src/api.test.ts` (4 passed), `npm run typecheck`, `npm run lint`.
- Review patches: a `/v1` path that contains the banned lexicon no longer ships in `message` (`Request failed`). Paths outside `/v1` return the same JSON envelope, not an HTML page. Blank `PORT` listens on 3000. `-0` is rejected. Vitest resolves `@ankanu/ports` from source.

## Spec Change Log

## Review Triage Log

- Banned path copied into `message` — medium — patched. `GET /v1/dating` returned `Cannot GET /v1/dating`. The filter now replaces a banned or stack-like message with `Request failed`.
- HTML 404 outside `/v1` — medium — patched. `GET /dating` was `text/html`. A final JSON handler now returns the AD-7 envelope.
- Only GET was tested — low — patched. The unknown-route test also POSTs and expects `UNHANDLED`.
- No HTTP test that a thrown machine code is kept — false. That would add a route this story does not have. `mapInboundException` already keeps a machine code, and the filter forwards the exception.
- Blank `PORT` binds port 0 — low — patched. Empty and whitespace `PORT` use 3000.
- Negative-zero `PORT` binds an ephemeral port — low — patched. `PORT=-0` throws.
- `afterAll` hides a startup failure — low — patched. Close runs only after `app` is assigned.
- Stack text inside `message` stays green — low — patched. The test rejects raw and escaped `    at ` sequences.
- `listenPort` was untested — low — patched. Tests cover unset, blank, `-0`, and a non-integer.
- Clean checkout resolves `@ankanu/ports` to gitignored `dist` — medium — patched. Vitest aliases `@ankanu/ports` to source, matching kernel.
- `useDefineForClassFields` would blank a future constructor inject — false. This app has no constructor injection, so nothing is overwritten.
- Stale code map, empty change log, and thinner acceptance text — false as code defects. Those fixes only edit the spec. The founder body is already in the frozen block.

## Verification

**Commands:**
- From `code/`: the api package test, then `npm run typecheck` and `npm run lint` scoped to packages plus `apps/api` — expected: health and unknown-route cases pass, no new lint or type errors in those projects.
