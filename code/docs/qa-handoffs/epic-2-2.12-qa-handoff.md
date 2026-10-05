# Epic 2 Story 2.12 QA handoff

## What was built

A member can confirm account deletion, request a data export, and reopen a status URL. Identity writes `account.status`. Operator is the only writer of `cil_ticket`. Audit is append-only.

Board comment `4505be17-a317-417c-906e-c397c6f200bf` on [ANK-68](/ANK/issues/ANK-68) is the contract. The ticket-body paste (`account_id`, `deletion`, `due_at`, `completed_at`, 48h) is void.

`cil_ticket` columns: `id` uuid v7, `subject_account_id`, `kind` `export|erase|access`, `status` `ready|scheduled|stalled|completed`. No `due_at` or `completed_at` column. `requested_at` is the time inside the uuid v7. `due_at` is computed at read: erase `requested_at + 30 days` (30 × 24h), export `requested_at + 72 hours`. Both clocks stay `[ASSUMPTION]`. This story creates `export` and `erase` only. `completed` is not written here.

Migration `0009_cil_ticket` widens `account_status_check` with `pending_deletion`, creates `cil_ticket` and `audit_event`, adds partial unique index `cil_ticket_open_subject_kind` on `(subject_account_id, kind) WHERE status IN ('ready','scheduled')`, and a trigger that raises on `UPDATE` or `DELETE` of `audit_event`.

Ticket object `T`: `{"id","kind":"export"|"erase","status","requested_at","due_at","status_url":"/privacy/status/<id>","download_url":"/v1/me/export" only when kind is export and status is ready, else null}`. Times are UTC ISO-8601.

Routes use the session cookie and the existing PIN gate. They are not on the exempt list. The caller must be a member session, otherwise `403 FORBIDDEN`. No extra CSRF token. No `Idempotency-Key`.

- `POST /v1/me/delete` body `{"confirm":true}` only. Anything else is `400 UNHANDLED` `details {"field":"confirm"}` message `confirm : true est requis.` One transaction: `UPDATE account SET status='pending_deletion' WHERE id=<me> AND status IN ('Active','deactivated','held')`, then `OperatorPort.openCilTicket` kind `erase` status `scheduled`, plus audit `cil_ticket.opened` with payload `{ticket_id, kind}` only when a row is inserted. `200 {"account_status":"pending_deletion","ticket":T}`. Already `pending_deletion` returns the same `200` and the existing scheduled erase ticket. Sessions are not revoked. Sign-in stays allowed.
- `POST /v1/me/export` body empty or `{}`. Otherwise `400 UNHANDLED` details null, message `Le corps de la requête doit être vide.` Opens kind `export` status `ready`, or returns the existing open export ticket. `200 {"ticket":T}`. Allowed for `Active`, `deactivated`, `held`, and `pending_deletion`.
- `GET /v1/me/export` is the download: `200 application/json`, `Content-Disposition: attachment; filename="ankanu-export-<ticket id>.json"`, `Cache-Control: no-store`. Requires a ready export ticket, otherwise `409 EXPORT_NOT_READY` retryable false, message `L'archive n'est pas prête.` If building the file throws, that ticket becomes `stalled` and the route returns `503 EXPORT_FAILED` retryable false, message `La génération de l'archive a échoué.` A throw from the stall itself still returns that `503`. An audit failure after the file is built does not stall the ticket. Each success appends audit `subject_access_export` with `{ticket_id}`.
- `GET /v1/me/export-status` returns `200 {"account_status","tickets":[T…]}` newest first (uuid v7 order).

Export file, built from live rows, never stored: top-level `{"format":"ankanu-export-v1","ticket_id","generated_at", account, credential, profile, verification_record, sms_dispatch, pin_lock, session, cil_ticket}`. Account fields are `id, email, pseudonym, gender, roles, status, age_attested, coc_version`. Credential is `kind` and `email_verified_at` only. Profile is all columns through `readProfile`, or null. Verification rows are `kind, status, vendor, phone_e164, expires_at` (no hash, no evidence URI). SMS is `template, created_at`. `pin_lock` is `{"pin_set":true|false}`. Session is `kind, expires_at, last_seen_at` with no id. `cil_ticket` rows are the stored columns.

Audit hash is sha256 hex of `prev_hash`, `id`, `actor_id` (empty when null), `action`, and sorted-key JSON payload, joined by newlines. The first row's `prev_hash` is 64 zeros. The next row links to the chain tail (the hash no other row uses as `prev_hash`), not the greatest UUID. Appends take `pg_advisory_xact_lock(hashtext('ankanu.audit_event'))` on Postgres. Payload is ids and action only. The memory store still links by array order.

`POST /v1/me/deactivate` and `POST /v1/me/reactivate` return `403 FORBIDDEN` `details {"status":"pending_deletion"}` message `Un compte en suppression ne se met pas en pause.` when status is `pending_deletion`. `GET /v1/me/deactivate` returns that status. `profile.visibility` is not touched. No SMS, invite, or media write.

`GET /settings` serves `code/design-stitch/40-settings/screen.html`. `GET /privacy/status/:ticketId` serves `code/design-stitch/41-delete-export-status/screen.html` only when `ticketId` is a UUID v7. Any other id is `404` and the Stitch page is not rendered. The ticket id inside the status script escapes `<` as `\u003c`. Both responses are `text/html; charset=utf-8`, `cache-control: no-store`, `referrer-policy: no-referrer`. The Stitch files are not edited. Scaleway, Paris, Île-de-France, fr-par, and « hébergée souverainement » lines are removed with nothing in their place. The deletion paragraph is the only settings sentence removed from that card. Mode Allégé, Langue des Directives Vocales, Sécurité du Sanctuaire, Formule d’Engagement, and the export button stay in the markup. Status also drops the Wali ZIP blurb, the ZIP download label, the 24 octobre 2025 line, and the tuteur dissolution title, with nothing in their place. The PIN guard is injected. Google stays unwired. Lite, audio, PIN, and packs stay as they were.

Settings: « Exporter mon dossier civil » posts export and opens `origin + status_url`. « Demande de suppression définitive » opens `#modal-deletion`. « Conserver mon sanctuaire » closes it. « Confirmer le scellage définitif » posts delete and opens `status_url`. The remaining modal bullet reads `Émission d’un ticket CIL de clôture.`

Status URL is owner session only. The page reads export-status and shows that ticket. An id that is not the caller's, or a non-200 status read, navigates to `/privacy/status`, which has no route and is the app's existing not-found view. Export `ready` shows `#content-ready` and badge `Archive scellée & prête`, and the download button calls `GET /v1/me/export`. Erase `scheduled` shows `#content-purging` and badge `Effacement programmé sous 30 jours`. `stalled` shows `#content-incident` and `#incident-banner` and badge `File opérateur assermentée active`. `#content-processing` is not in the DOM. A completed ticket shows the panel for its kind without the download button. Clock row 1 stays and is shown only when `account_status` is `pending_deletion`. Rows 2–4 are replaced by « [ASSUMPTION] Effacement du compte » / `30 jours` (time left, or `Non demandé`) and « [ASSUMPTION] Export des données » / `72 heures` (`Exécuté` when an export ticket is ready, otherwise `Non demandé`). Clock instants use `Africa/Ouagadougou`. The page prints `Ticket n° <id>`, the absolute status URL, and `ankanu-export-<id>.json`.

## Where

- `code/apps/api/drizzle/0009_cil_ticket.sql` and `code/apps/api/drizzle/meta/0009_snapshot.json`
- `code/apps/api/src/account-schema.ts` — `pending_deletion`, `cil_ticket`, `audit_event`
- `code/apps/api/src/operator-port.ts` — `OperatorPort` is the only `cil_ticket` writer
- `code/apps/api/src/audit-port.ts` — `AuditPort.append` and the chain tail
- `code/packages/ports/src/index.ts` — `OperatorPort` and `AuditPort`
- `code/apps/api/src/cil-rights.ts` — identity calls those ports. It does not insert or update `cil_ticket` or `audit_event`
- `code/apps/api/src/cil.controller.ts` — the four routes. Stall only on `ExportBuildError`
- `code/apps/api/src/cil-rights.test.ts`
- `code/apps/api/src/me.controller.ts` — pause and reactivate refuse `pending_deletion`
- `code/apps/api/src/life-pause.ts` and `life-pause-store.ts`
- `code/packages/kernel/src/error.ts` — `EXPORT_NOT_READY`, `EXPORT_FAILED`
- `code/packages/kernel/src/id.ts` — `uuidV7Instant`
- `code/apps/web/src/settings-page.ts` and `code/apps/web/app/settings/route.ts`
- `code/apps/web/src/status-page.ts` and `code/apps/web/app/privacy/status/[ticketId]/route.ts`

## How to run

From `code/`:

```bash
npx vitest run --config vitest.unit.config.ts apps/api/src/cil-rights.test.ts apps/web/src/settings-page.test.ts apps/web/src/status-page.test.ts apps/api/src/life-pause.test.ts
npx tsc -p apps/api/tsconfig.json --noEmit
npx tsc -p apps/web/tsconfig.json --noEmit
```

Sign in, then:

```bash
curl -sS -X POST http://127.0.0.1:3000/v1/me/export \
  -H 'content-type: application/json' -H "cookie: ankanu_session=SESSION_ID" -d '{}'

curl -sS -D - -H "cookie: ankanu_session=SESSION_ID" http://127.0.0.1:3000/v1/me/export

curl -sS -X POST http://127.0.0.1:3000/v1/me/delete \
  -H 'content-type: application/json' -H "cookie: ankanu_session=SESSION_ID" \
  -d '{"confirm":true}'
```

Open `GET /settings`, confirm delete, and land on `/privacy/status/<ticket id>`.

## Test cases

| Case | Input | Expected |
| --- | --- | --- |
| Bad confirm | `POST /v1/me/delete` `{"confirm":false}` | `400` `UNHANDLED`, `details.field` `confirm`. Status stays `Active` |
| Delete | `{"confirm":true}` | `200` `pending_deletion`, erase ticket `scheduled`, `download_url` null, due is requested + 30 days. Profile visibility stays null. One `cil_ticket.opened` audit |
| Delete again | Same post | `200` and the same ticket id. No second open audit |
| Pause after delete | `POST /v1/me/deactivate` or `reactivate` | `403` `FORBIDDEN`, `details {"status":"pending_deletion"}`. `GET /v1/me/deactivate` returns `pending_deletion` |
| Sign-in after delete | `POST /v1/sessions` | `201`. The older cookie still reads export-status |
| Export before a ticket | `GET /v1/me/export` | `409` `EXPORT_NOT_READY`, retryable false |
| Open export | `POST /v1/me/export` `{}` | `200`, kind `export`, status `ready`, `download_url` `/v1/me/export`, due is requested + 72 hours. A second post returns the same id |
| Download | `GET /v1/me/export` | `200`, attachment `ankanu-export-<id>.json`, `cache-control: no-store`, format `ankanu-export-v1`. No `secret_hash`, no verification hash, `pin_set` false, session has no id. One `subject_access_export` audit. Account status stays `Active` |
| Build throws | export builder throws | `503` `EXPORT_FAILED`, retryable false. That ticket is `stalled` |
| Settings HTML | `GET /settings` | Export and delete labels, `#modal-deletion`, both buttons, CIL bullet without `vérifiable publiquement`. No Oumar, no Scaleway. Fetches both posts. PIN guard present |
| Status HTML | `GET /privacy/status/<uuid v7>` | Ready, purging, incident panels. No ZIP blurb, no ZIP label, no `24 octobre 2025`, no `regard du tuteur`. No `content-processing`, no `btn-state-`, no Scaleway |
| Bad status id | `GET /privacy/status/abc</script>` | `404`. The response does not render the Stitch page |
| Audit after a built file | download while the access audit throws | Not `409` and not `503`. The export ticket stays `ready` |
| Stall throws | build throws and stall throws | `503` `EXPORT_FAILED`. The ticket stays `ready` |

## Test data

Sister accounts `cilN@example.bf` / `Cil_N`, password `phrase avec espaces`, date of birth `1990-01-15`. One phone verification `+22670000000` and one SMS template `otp` are pushed only in the export test. No Redis. The memory rights store stands in for Postgres in these unit tests. Migration SQL is asserted, not applied, in the unit run.

## My results

- `npx vitest run --config vitest.unit.config.ts apps/api/src/cil-rights.test.ts apps/web/src/settings-page.test.ts apps/web/src/status-page.test.ts apps/api/src/life-pause.test.ts`: 4 files, 12 tests passed after QA fail `479031ae`.
- `npx tsc -p apps/api/tsconfig.json --noEmit` and `npx tsc -p apps/web/tsconfig.json --noEmit` passed after `tsc -p packages/kernel/tsconfig.json` (the API package reads kernel `dist`).
- I did not open a graphical browser. Settings and status HTML ran through the route functions.

## Three validation passes

1. API: delete, idempotent delete, export open, download shape, stall, and pause refusal while `pending_deletion`.
2. Screens: served HTML is the Stitch file with the board's drops and the two injected scripts.
3. Static: `tsc` on the API and web packages.

## Solution-design sections

Board comment on [ANK-68](/ANK/issues/ANK-68). SOLUTION-DESIGN `cil_ticket` row (`subject_account_id`, kind `export|erase|access`, status text) plus the board's status check and `pending_deletion`. `audit_event` catalog row (`actor_id`, `action`, `payload`, `prev_hash`, `hash`). AD-3 operator owns `cil_ticket`; identity calls `OperatorPort.openCilTicket` and does not insert it. AD-19 `IdentityPort.deleteAccount` / `exportAccount`. AD-7 envelope. AD-18 append-only audit. NFR-008 clocks 30 days and 72 hours, `[ASSUMPTION]`. No new relationship beyond `account` to `cil_ticket` and `account` to `audit_event`.

## Stitch files

- `code/design-stitch/40-settings/screen.html`
- `code/design-stitch/40-settings/screen.png`
- `code/design-stitch/41-delete-export-status/screen.html`
- `code/design-stitch/41-delete-export-status/screen.png`

`DESIGN.md` is not the layout. The served pages keep the Stitch folio after the named drops.

## Known gaps

QA does not fail Story 2.12 for these. The board listed them.

- The day-30 erasure executor is not built. Erase tickets stay `scheduled`.
- Liveness and ID evidence images are not in the export.
- Ticket `completed` belongs to Story 12.6. Audit role grants and nightly chain-verify belong to Story 12.7.
- `#content-processing` is not rendered.
- Unit tests use the memory rights store. They do not apply `0009_cil_ticket.sql` to Postgres.
- A ticket id that is not the caller's navigates to `/privacy/status`, which has no page, so the framework not-found view shows.
- Google sign-in stays deferred. Lite, audio, PIN, and packs are not this story.
- No deploy. Epic 3 stays closed. This commit stays local until QA passes.
