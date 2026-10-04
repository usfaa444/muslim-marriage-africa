# Epic 1 Story 1.9 QA handoff

## What was built

GitHub Actions runs five checks on a pull request: oxlint, types, unit, integration, and migration check. The workflow file is `.github/workflows/ci.yml` because that is the directory GitHub Actions loads. Each job uses `working-directory: code`. No secret is stored in the file.

The API and worker process install an OpenTelemetry meter with `scan_deferred_count` and `scan_failed_count`. Both stay visible at zero. A later `recordScanDeferred()` or `recordScanFailed()` increases the matching count. No collector, region, or default exporter host was added. An OTLP exporter is attached only when `OTEL_EXPORTER_OTLP_ENDPOINT` is set.

The one compose stack keeps PostgreSQL PITR (daily base backup plus WAL, `archive_timeout=60`) and object versioning. `code/docs/restore-runbook.md` is the quarterly drill. It restores that same environment. No second compose project was added.

`audit_event` was not created. The Operator metrics screen was not built.

## Where

- `.github/workflows/ci.yml`
- `code/package.json`
- `code/vitest.unit.config.ts`
- `code/vitest.integration.config.ts`
- `code/apps/api/src/otel-contract.ts`
- `code/apps/api/src/main.ts`
- `code/apps/api/src/object-storage-adapter.ts`
- `code/compose.yaml`
- `code/scripts/postgres-base-backup.sh`
- `code/scripts/postgres-pitr-restore.sh`
- `code/docs/restore-runbook.md`
- `code/.dockerignore`
- `code/apps/api/src/otel-contract.test.ts`
- `code/apps/api/src/ci-contract.test.ts`
- `code/apps/api/src/object-version.test.ts`
- `code/apps/api/src/restore-drill.test.ts`

## How to run

From `code/`. Docker is required for the integration commands only.

```bash
npx vitest run --config vitest.unit.config.ts apps/api/src/otel-contract.test.ts apps/api/src/ci-contract.test.ts
npx vitest run --config vitest.integration.config.ts --fileParallelism false apps/api/src/object-version.test.ts apps/api/src/restore-drill.test.ts
npx tsc -p apps/api/tsconfig.json --pretty false
npx tsc -p tsconfig.tests.json --pretty false
npx oxlint apps/api/src/otel-contract.ts apps/api/src/otel-contract.test.ts apps/api/src/ci-contract.test.ts apps/api/src/object-storage-adapter.ts apps/api/src/object-version.test.ts apps/api/src/restore-drill.test.ts apps/api/src/main.ts
npm run migration-check
```

The unit command does not need Docker. The integration command starts MinIO and project `ankanu` postgres, then removes that project. Do not deploy this story.

## Test cases

| Case | Input | Expected |
| --- | --- | --- |
| Workflow path | Read `.github/workflows/ci.yml` | File is at the repo-root workflows directory. It triggers on `pull_request`. Jobs are `oxlint`, `types`, `unit`, `integration`, and `migration-check` (display name `migration check`). Each runs in `code/` on Node `24.21.0`. Commands are `npm run lint`, `npm run typecheck`, `npm run test:unit`, `npm run test:integration`, and `npm run migration-check`. The file does not contain `secrets.`. |
| Scan counts at zero | `installScanMetrics({})` then `queryScanMetrics()` | `{ scan_deferred_count: 0, scan_failed_count: 0 }`. |
| Scan counts after a record | `recordScanDeferred()` twice and `recordScanFailed()` once | `{ scan_deferred_count: 2, scan_failed_count: 1 }`. |
| Hidden name | `requireScanMetrics` without one of the two names | Throws `scan_deferred_count is hidden` or `scan_failed_count is hidden`. |
| No exporter host | `otlpMetricsUrl({})` and a whitespace endpoint | `null`. A caller-supplied endpoint is used, with `/v1/metrics` appended when missing. |
| One stack | Read `code/compose.yaml` | Services stay `web`, `api`, `worker`, `postgres`, `redis`, `bucket`. Postgres sets `wal_level=replica`, `archive_mode=on`, `archive_timeout=60`, and archives WAL under `/var/lib/postgresql/wal-archive`. Bind mounts are `./pg-data`, `./pg-wal`, and `./pg-base`. No `ports` key. No `dev`, `staging`, or `prod` word. |
| Object version | Create a private bucket, write bytes, overwrite them, restore the first version id | Versioning status is `Enabled`. A second create still leaves it enabled. The current object reads back as the first bytes. |
| PITR drill | Follow the runbook scripts only: base backup, insert a row, delete it, then `postgres-pitr-restore.sh` to the timestamp after the insert. The test does not call `pg_switch_wal()` and does not retry the count. | Before restore the count is `0`. The script archives the open WAL segment, then restores. When the script exits 0, `pg_is_in_recovery()` is `f` and the count is `1`. `wal_level` is `replica` and `archive_mode` is `on`. |
| Bad restore target | `sh scripts/postgres-pitr-restore.sh not-a-time` | Exit 1. Stderr names `YYYY-MM-DD HH:MM:SS+00`. Docker is not started. |
| Migration check | `npm run migration-check` from `code/` | `drizzle-kit check` prints that everything is fine. |

## Test data

No accounts. Object-storage credentials in the MinIO test are random bytes, not a committed secret. Postgres uses the existing trust auth for user `ankanu` on the compose network. The PITR probe table is `probe(id int)` with one row, id `1`. The restore timestamp is UTC from `clock_timestamp()` with microseconds.

## My results

`npx vitest run --config vitest.unit.config.ts` — 10 files, 54 tests passed. `npx vitest run --config vitest.integration.config.ts --fileParallelism false apps/api/src/object-version.test.ts apps/api/src/restore-drill.test.ts` — 2 files, 2 tests passed. `npx tsc -p apps/api/tsconfig.json` and `npx tsc -p tsconfig.tests.json` passed. `npx oxlint` on the touched TypeScript files passed. `npm run migration-check` passed (`drizzle-kit check`). The compose file assertion in `apps/api/src/compose.test.ts` (`names the project`) passed. `apps/api/src/self-managed-environment.test.ts` and `apps/api/src/secrets-baked.test.ts` passed.

After the [ANK-41](/ANK/issues/ANK-41) restore fail: `npx vitest run --config vitest.unit.config.ts apps/api/src/ci-contract.test.ts` — 4 tests passed. `npx vitest run --config vitest.integration.config.ts --fileParallelism false apps/api/src/restore-drill.test.ts` — 1 test passed in 15.93s. The drill calls only the runbook scripts. When the restore script exits 0, `pg_is_in_recovery()` is `f` and the probe count is `1`.

## Three validation passes

1. CI contract: the workflow GitHub loads names the five checks, runs them under `code/` on Node 24.21.0, and does not embed a secret. `drizzle-kit check` passes. The unit suite passes without Docker.
2. Scan metrics: both instruments are present at zero, stay present after a record, and a missing name throws. An empty endpoint does not select a host.
3. Restore: the object-version test brings the first bytes back on the MinIO image used by compose. The PITR drill brings row `1` back from WAL that the base backup did not contain. The restore script itself archives the open WAL segment before it replaces the data directory, and it exits 0 only after `pg_is_in_recovery()` is false. The compose service list is unchanged. `pg-data`, `pg-wal`, and `pg-base` are listed in `code/.dockerignore`.

## Solution-design sections

- `audit_event`: not created. Catalog only.
- AD-18: no hash-chain writer and no audit table.
- AD-20: one self-managed environment. GitHub Actions runs oxlint, types, unit, integration, and the migration check. OpenTelemetry exposes `scan_deferred_count` and the scan-failed count. PostgreSQL PITR is daily base backup plus WAL. Object versioning is on. The quarterly drill is the runbook. No OpenTofu, no `infra/` module, no isolated `dev | staging | prod`, no extra replica service.
- AD-6: the Story 1.7 compose stack stays the runtime.
- AD-10: the instruments exist so a later scan-deferred or scan-failed record cannot be hidden. `flag_queue` was not added.
- §7: no new HTTP route and no metrics scrape path.
- §14: not followed where it asks for isolated environments or a Paris region. This story does not deploy.

## Stitch files

None matched. Do not build Operator metrics.

These files are on disk and were not used as layout:

- `code/design-stitch/63-operator-metrics/screen.html`
- `code/design-stitch/63-operator-metrics/screen.png`
- `code/design-stitch/tokens/DESIGN.md`

`DESIGN.md` is tokens only. Matching its tone or colors is a fail.

## Known gaps

- OTLP export happens only when `OTEL_EXPORTER_OTLP_ENDPOINT` is set. No collector image and no region were added.
- `code/pg-data`, `code/pg-wal`, and `code/pg-base` are on the same disk. WAL is not pruned. Those three directories are excluded from the Docker build context.
- The API process does not create the bucket at boot. Versioning turns on when `createPrivateBucket` runs.
- This story was not deployed. Epic 1 stays on this compose stack until the full epic check passes.
