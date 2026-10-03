---
title: 'Story 1.2 — API process with health and versioned REST'
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

**Problem:** Operators have no NestJS `api` process that can prove `/v1` is alive. Story 1.1 shipped `@ankanu/kernel` and `@ankanu/ports` only.

**Approach:** Add `code/apps/api` as the ESM NestJS HTTP process for role `api`. Serve `GET /v1/health` and map unknown `/v1` routes through the existing AD-7 envelope. Do not choose the success `request_id` placement or the `status` string until the open questions are answered.

## Boundaries & Constraints

**Always:** JSON REST under `/v1`. Health body names `status` and `role`, and `role` is `"api"`. No extra health fields. Unknown `/v1` routes return only `{ error: { code, message, details, request_id, retryable } }` with a machine `code` already produced by `mapInboundException` (a Nest 404 with no machine code becomes `UNHANDLED`). Never a stack trace. Shipped strings must not contain `dating` or `rencontre romantique`. Use `@ankanu/kernel` and `@ankanu/ports`. Pins: Node 24.21.0, TypeScript 7.0.2, NestJS 12.1.0, oxlint, Vitest.

**Never:** Worker, `PROCESS_ROLE=worker`, BullMQ, Socket.IO, `/v2`, session auth, payments, webhooks, product tables, UI, billing, or a new error-code family such as `NOT_FOUND`. Do not change the kernel envelope or the ports mapper. Do not deploy.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Health | `GET /v1/health` while the api process is up | 200. Body includes `status` and `role: "api"`. `request_id` placement and the `status` string are open questions. No other fields. | N/A |
| Unknown `/v1` route | Any method on an unlisted `/v1` path | AD-7 envelope. `code` is `UNHANDLED` unless the thrown body already carries a kernel machine code. | No stack trace. No second error shape. |

</frozen-after-approval>

## Open Questions

- Success `request_id` on `GET /v1/health` — the AC, epic context, AD-7, and SOLUTION-DESIGN do not say JSON field or header. Error `request_id` is already a JSON field inside `error` and is not this choice. Options: JSON field `request_id` beside `status` and `role` (callers read the body) / response header `request_id` (body stays `{ status, role }` only) / response header `x-request-id` (same body, different header name).
- Health `status` value — the field is required and no source gives the string. Options: `ok` / `up` / `healthy` / another exact string supplied in the answer. Do not add fields beyond `status` and `role`.

## Code Map

- `code/package.json` — workspaces are `packages/*` only. An app under `code/apps/api` is invisible to npm until `apps/*` is added. Do not move kernel or ports.
- `code/packages/kernel/src/error.ts` — `errorEnvelope`, `ERROR_CODES.UNHANDLED`. Reuse. Do not add a health type or a new code.
- `code/packages/ports/src/map-inbound-exception.ts` — `mapInboundException(thrown, requestId?)` recognizes Nest `getStatus` / `getResponse` and returns only the envelope. Pass unknown-route exceptions through it.
- `code/vitest.config.ts` — includes `packages/*/src/**/*.test.ts` and aliases `@ankanu/kernel` to source. API tests need an include. Do not weaken package tests.
- `code/tsconfig.base.json` — ESM `NodeNext`. `apps/api` stays ESM. No listen port is named; this story does not own compose. Prove the routes on an ephemeral port.

## Tasks & Acceptance

**Execution:**
- [ ] `code/apps/api` — NestJS ESM process, `GET /v1/health`, unknown `/v1` routes via `mapInboundException` — blocked on the two open questions
- [ ] `code/package.json` — include `apps/*` in workspaces and the smallest test script that runs the new tests — so the app is installable beside the existing packages
- [ ] `code/apps/api` tests — health body and unknown-route envelope — proves the AC without a full-suite run

**Acceptance Criteria:**
- Given the api process is running, when `GET /v1/health`, then 200 with `{ status, role: "api" }` and a `request_id` placed as answered.
- Given an unknown `/v1` route, when the request finishes, then the AD-7 envelope with a kernel machine `code` and no stack trace.

## Implementation Notes

## Spec Change Log

## Review Triage Log

## Verification

**Commands:**
- From `code/`: the api package test, then `npm run typecheck` and `npm run lint` scoped to packages plus `apps/api` — expected: health and unknown-route cases pass, no new lint or type errors in those projects.
