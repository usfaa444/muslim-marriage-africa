---
title: 'Story 1.1 — Shared kernel and port types'
type: 'feature'
created: '2026-10-03'
status: 'done'
route: 'oneshot'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Later modules have no shared contract for UUID v7 ids, the AD-7 error envelope, AuthContext, or Africa/Ouagadougou clocks, so each one could invent a second error shape.

**Approach:** Add `code/packages/kernel` and `code/packages/ports` only. Kernel generates UUID v7, builds the envelope `{ error: { code, message, details, request_id, retryable } }`, defines AuthContext `{ accountId, roles[], gender?, mahramWardId? }` with roles `member | mahram | moderator | operator | system` and gender `sister | brother` required on `member` sessions, and exposes UTC storage plus Africa/Ouagadougou display. Ports publish those shared types and the inbound mapper that turns a raw Nest exception into that envelope and nothing else. No HTTP routes, tables, product screens, or module ports.

</frozen-after-approval>

## Implementation Notes

- Product packages live under `code/packages/kernel` (`@ankanu/kernel`) and `code/packages/ports` (`@ankanu/ports`). The workspace root is `code/`, matching the company rule that application code stays there.
- UUID v7 is minted in kernel with `node:crypto` (RFC 9562). No uuid library: the spine pins none, and host Postgres 17 has no `uuidv7()`.
- Kernel does not import Nest. `mapInboundException` in ports recognizes `getStatus` / `getResponse` and returns only `{ error: { code, message, details, request_id, retryable } }`.
- 401 maps to `UNAUTHENTICATED`, 403 to `FORBIDDEN`. A machine `code` already on the thrown body is kept. Any other raw throw uses `UNHANDLED` (not a closed product enum; envelope `code` stays `string`, AD-22). `retryable` stays false unless the thrown body says otherwise. `details` stays null unless the thrown body already has `details`.
- `assertAuthContext` rejects unknown fields (including `entitled`), empty roles, non-v7 ids, `member` without `gender` `sister|brother`, `member` combined with `moderator` or `operator`, and `member` combined with `mahram`. `system` is not treated as staff.
- Clocks: `toUtcStorage` is `Date.toISOString()`. `toOuagadougouDisplay` is `YYYY-MM-DDTHH:mm:ss±HH:MM` via `Intl` `Africa/Ouagadougou`. `civilDayOuagadougou` is that civil date for later quota windows.
- Pins used here: TypeScript 7.0.2, Vitest 5.0.3, oxlint 1.86.0, `@types/node` 24.19.1. `engines.node` is `24.21.0`. This sandbox is Node v24.5.0; tests passed there. TypeScript 7 needs `compilerOptions.types: ["node"]` and rejects `baseUrl`.
- Verified: `npm test` (19 passed), `npm run typecheck` (packages plus `tsconfig.tests.json`), `npm run lint`, and a built-dist import of `newId` plus a 401 map.
- Review patches: UUID v7 rejects timestamps outside 48 bits; Ouagadougou offsets may include seconds; returned AuthContext and the role/gender/code tables are frozen; plain throws do not copy `Error.message`; envelope `details: undefined` becomes null; machine codes are at most 64 characters; a throwing Nest getter still returns the envelope.

## Review Triage Log

- newId pre-epoch wrap — low — patched. Negative timestamps were stored as unsigned 48-bit values and still matched `isUuidV7`.
- Ouagadougou offset seconds — low — patched. `1900-01-01T00:00:00Z` threw `Unexpected zone offset GMT-00:16:08`.
- Hour 24 civil-day rewrite — maybe-false — deferred. A 48-hour scan on this Node 24.5 ICU emitted hour `00`, so the wrong-day branch was not observed. An ICU that emits hour `24` for `Africa/Ouagadougou` would settle it.
- Mutable returned roles — low — patched by freezing the context and its role list.
- Mutable `ROLES` / `GENDERS` / `ERROR_CODES` — low — patched with `Object.freeze`.
- `mahramWardId` not tied to the mahram role — false. The story type leaves `mahramWardId?` optional on the context; requiring it only for mahram would invent a rule.
- Extra role combinations and duplicates — false. The story bans `member` with staff and `member` with `mahram`. It does not ban `mahram`+`operator`, duplicate roles, or `member`+`system`.
- Plain `Error.message` copied to the client — medium — patched. Non-Nest throws now use `Request failed`. Control characters are dropped from Nest response messages.
- Envelope could omit `details` or take an empty code — medium — patched. `undefined` details become null, blank request ids are replaced, codes must be 1–64 characters.
- Pass-through keeps the envelope request id and details reference — low, not patched. Keeping `request_id` on an already-valid envelope is intentional. Cyclic `details` was not shown on a path this story reaches, and a deep copy is more than a simple correction.
- Unbounded machine code from a thrown body — low — patched with the same 64-character cap.
- Throwing `getStatus` escaped the mapper — medium — patched. The mapper catches it and returns `UNHANDLED`.
- Tests were outside `tsc` — medium — patched. `tsconfig.tests.json` is part of `npm run typecheck`.
