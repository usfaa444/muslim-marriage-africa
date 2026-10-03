# Epic 1 Story 1.2 QA handoff

## What was built

`code/apps/api` is the ESM NestJS process for role `api`. `GET /v1/health` returns `{ "status": "ok", "role": "api", "request_id": "<uuid v7>" }` and nothing else. Unknown routes, including paths outside `/v1`, return the AD-7 envelope as JSON. No tables, Redis, worker, or screens.

## Where

- `code/apps/api/src/main.ts`
- `code/apps/api/src/create-app.ts`
- `code/apps/api/src/app.module.ts`
- `code/apps/api/src/health.controller.ts`
- `code/apps/api/src/inbound-exception.filter.ts`
- `code/apps/api/src/listen-port.ts`
- `code/apps/api/src/api.test.ts`

## How to run

From `code/`:

```bash
npx vitest run apps/api/src/api.test.ts
npm run typecheck
npm run lint
```

## Test cases

| Case | Input | Expected |
| --- | --- | --- |
| Health | `GET /v1/health` | 200. Keys are exactly `request_id`, `role`, `status`. `status` is `ok`. `role` is `api`. `request_id` is a UUID v7. |
| Unknown `/v1` | `GET` and `POST /v1/not-a-route` | 404. AD-7 envelope. `code` is `UNHANDLED`. `details` is null. `retryable` is false. No stack text. |
| Banned path | `GET /v1/dating` and `GET /dating` | 404 JSON. `content-type` contains `application/json`. Message is `Request failed`. Body does not match `dating` or `rencontre romantique`. |
| Port | `PORT` unset, empty, or whitespace | `listenPort` returns 3000. `PORT=-0` and a non-integer throw `PORT must be an integer`. |

## Test data

No database or fixtures. The test binds `127.0.0.1` on an ephemeral port.

## My results

`npx vitest run packages/kernel/src/kernel.test.ts packages/ports/src/map-inbound-exception.test.ts apps/api/src/api.test.ts` — 3 files, 29 passed. `npm run typecheck` passed. `npm run lint` passed.

## Three validation passes

1. Health body: `api.test.ts` checks the three keys, `ok`, `api`, and a UUID v7 `request_id`.
2. Error paths: unknown `/v1` methods and both dating URLs return the AD-7 JSON envelope with no stack and no banned lexicon in the body.
3. Static pass: `npm run typecheck` and `npm run lint` on `code/`. `listenPort` covers unset, blank, `-0`, and a non-integer.

## Solution-design sections

- AD-7 envelope for unknown routes. Success health body is only `status`, `role`, and `request_id`.
- No resource-map routes and no tables.
- `GET /v1/health` is the api role. This story does not bind the worker.

## Stitch files

None. This story has no screen.

## Known gaps

- The worker role is Story 1.3. Redis is Story 1.6.
- A thrown machine code is covered in `mapInboundException` tests, not by an extra HTTP route.
- No Dockerfile or compose.
