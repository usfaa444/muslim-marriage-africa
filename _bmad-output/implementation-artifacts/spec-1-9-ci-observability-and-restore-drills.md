---
title: 'Story 1.9 — CI, observability, and restore drills'
type: 'feature'
created: '2026-10-04'
status: 'done'
baseline_commit: '268ddffe6d81537f4c2170db8ce37c45f1593c0a'
route: 'oneshot'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Scan-deferred gaps and unrestorable backups can hide. The one compose environment has no GitHub Actions checks, no OpenTelemetry `scan_deferred_count` instrument, and no quarterly way to bring PostgreSQL PITR and object versions back.

**Approach:** Add the five named CI checks, an OpenTelemetry metrics contract that already exposes `scan_deferred_count` and the scan-failed count, PostgreSQL PITR (daily base backup plus WAL) and object versioning on the existing compose stack, and a quarterly restore runbook for that one environment.

</frozen-after-approval>

## Implementation Notes

- GitHub Actions only loads `.github/workflows/` at the repo root. The workflow is `.github/workflows/ci.yml`. Jobs run with `working-directory: code`. No secret is in the file. Triggers are pull requests only.
- `scan_deferred_count` and `scan_failed_count` are observable counters on an in-process meter. Zero is exported. `OTEL_EXPORTER_OTLP_ENDPOINT` is used only when set; there is no default host, collector, or region. `service.instance.id` is `worker` or `api`.
- PITR uses the existing `postgres` service: `wal_level=replica`, `archive_mode=on`, `archive_timeout=60`, and an archive command that skips a finished segment and writes a temp file before rename. Bind mounts are `code/pg-data`, `code/pg-wal`, and `code/pg-base`. No new compose service.
- Daily backup writes `latest.tmp` and replaces `latest` only after `pg_basebackup` succeeds. Restore refuses to delete the data directory unless that backup has `PG_VERSION`, then waits until `pg_isready`.
- Object versioning is enabled in `createPrivateBucket`, including when the bucket already exists. `restoreObjectVersion` writes the chosen version back onto the key.
- `npm test` runs files one at a time so the restore drill does not share project `ankanu` with the compose tests. CI unit and integration stay separate. `drizzle-kit check` is the migration check. It does not open a database.

## Review Triage Log

- medium — `archive_command` failed when the segment already existed and could leave a short file. Patched: exit 0 if the segment is present; copy to a temp name, then rename.
- medium — The open WAL segment was not archived until it filled. Patched: `archive_timeout=60`.
- defer — Data, WAL, and base backups are bind mounts on one disk. No second disk is named. Recorded in deferred-work.
- medium — The daily script deleted `latest` before `pg_basebackup`. Patched: write `latest.tmp`, then replace `latest`.
- false — No cron was added. The runbook is the daily and quarterly instruction. A scheduler was not named.
- defer — WAL is not pruned. No retention window was named, and pruning can make the backup unrestorable. Recorded in deferred-work.
- high — Restore deleted the data directory before proving the backup existed, so a missing backup could `initdb` an empty cluster. Patched: require `PG_VERSION` before the delete.
- medium — The restore script returned before Postgres accepted connections. Patched: wait for `pg_isready`.
- false — The timestamp regex is a shell allowlist. Impossible dates fail inside Postgres, and the ready-wait then exits non-zero. `Z` and `+00:00` are outside the form the runbook names.
- medium — The drill could treat an older archive file as the delete segment. Patched: wait for a new filename after each `pg_switch_wal`.
- medium — `rmSync` on root-owned mount points throws `EACCES`. Patched: a root container clears the contents, and a failed `rmSync` does not fail the test.
- low — Repo walks entered `pg-data`. Patched: those directories are skipped.
- medium — `npm test` could run the drill beside the compose tests. Patched: `fileParallelism: false`.
- medium — A second `createPrivateBucket` died after the bucket existed and could leave versioning off. Patched: an existing bucket still gets versioning.
- false — The API process does not call `createPrivateBucket` at boot. That method is the existing bucket-creation path. No startup creator was named.
- medium — Version listing stopped after one page. Patched: follow `IsTruncated`.
- false — A delete marker does not remove prior version ids from `Versions`.
- false — `writeObject` sets no metadata, so restore does not drop any.
- false — The runbook names `restoreObjectVersion`. No shell CLI was specified.
- false — Object restore is `object-version.test.ts`. The Postgres drill covers the Postgres section of the same runbook.
- false — No collector, region, or default OTLP host. Those were not named, and the stop rule forbids inventing them. The query path is in-process.
- false — Logs and traces are not this story's acceptance criteria. The required instrument is `scan_deferred_count`.
- medium — API and worker would export the same `service.name`. Patched: `service.instance.id` is `api` or `worker`.
- medium — Shutdown zeroed the counters and could flush that zero. Patched: shut down first, then zero.
- medium — `@opentelemetry/core` and `@opentelemetry/resources` were only transitive. Patched: direct dependencies.
- false — The metrics test reads the in-process export. No scrape path was named.
- false — `drizzle-kit check` is the named migration check. It does not apply SQL. The integration suite already applies the migration on PostgreSQL 17.11.
