# Epic 1 Story 1.1 QA handoff

## What was built

Shared contracts for later modules: UUID v7 ids, the AD-7 error envelope, AuthContext, and Africa/Ouagadougou clocks. `code/packages/ports` maps a raw Nest exception into that envelope and nothing else. No HTTP routes, tables, or screens.

## Where

- `code/packages/kernel/src/id.ts`
- `code/packages/kernel/src/error.ts`
- `code/packages/kernel/src/auth.ts`
- `code/packages/kernel/src/clock.ts`
- `code/packages/ports/src/map-inbound-exception.ts`
- `code/packages/kernel/src/kernel.test.ts`
- `code/packages/ports/src/map-inbound-exception.test.ts`

## How to run

From `code/`:

```bash
npx vitest run packages/kernel/src/kernel.test.ts packages/ports/src/map-inbound-exception.test.ts
npm run typecheck
npm run lint
```

## Test cases

| Case | Input | Expected |
| --- | --- | --- |
| UUID v7 | `newId()` | `isUuidV7` is true and the timestamp is inside the call window. A UUID v4 is rejected. Fifty calls are distinct. A 1960 date throws `RangeError`. |
| Clocks | `2026-01-15T03:04:05.006Z` | UTC storage is that ISO string. Ouagadougou display is `2026-01-15T03:04:05+00:00`. Civil day is `2026-01-15`. An invalid date throws `TypeError`. |
| AuthContext | member with `gender` `sister` or `brother` | Accepted. Roles are frozen. `member` without gender throws. Staff or `mahram` combined with `member` throws. `system` combined with another role throws. Non-v7 ids throw. An `entitled` field throws. |
| Envelope | `errorEnvelope` | Body is only `{ error: { code, message, details, request_id, retryable } }`. Missing `details` becomes null. A blank request id is replaced with a UUID v7. An empty code throws. |
| Mapper | Nest 401 / 403 / raw throw | `UNAUTHENTICATED`, `FORBIDDEN`, or `UNHANDLED`. A machine code already on the body is kept, at most 64 characters. A throwing getter still returns the envelope. `Error.message` is not copied. Ports do not import Nest. |
| Shipped source | kernel sources | No `dating`, `rencontre romantique`, `pending`, `held`, `pending-moderation`, `scan-wait`, `fail-closed`, or `@nestjs`. |

## Test data

No database or fixtures. Account ids are minted UUID v7 values. The clock fixture is `2026-01-15T03:04:05.006Z`. The pre-standard offset fixture is `1900-01-01T00:00:00.000Z`.

## My results

`npx vitest run packages/kernel/src/kernel.test.ts packages/ports/src/map-inbound-exception.test.ts apps/api/src/api.test.ts` — 3 files, 29 passed. `npm run typecheck` passed. `npm run lint` passed.

## Three validation passes

1. Kernel: ids, clocks, AuthContext, and the envelope tests in `kernel.test.ts`.
2. Ports: `mapInboundException` tests, including the QA locks for Nest pass-through and the 64-character code cap.
3. Static pass: `npm run typecheck` and `npm run lint` on `code/`.

## Solution-design sections

- AD-7 error envelope only. No second error shape.
- AD-22: envelope `code` stays a string. `UNHANDLED` is not a closed product enum.
- No tables. Kernel ids are UUID v7. This story creates no `operator_config` row.

## Stitch files

None. This story has no screen.

## Known gaps

- No HTTP server. Story 1.2 owns `GET /v1/health`.
- Hour-24 civil-day rewrite was not observed on this Node ICU and stays deferred.
- A cyclic `details` value is not deep-copied.
