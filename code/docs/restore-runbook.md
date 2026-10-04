# Restore runbook — one self-managed environment

This drill is for the Story 1.7 compose stack only: project `ankanu`, file `code/compose.yaml`. There is no second environment. Run the commands from `code/`. Do this restore quarterly. Take the base backup daily. WAL archiving runs continuously while `postgres` is up.

PostgreSQL keeps `wal_level=replica` and `archive_mode=on`. Completed WAL segments are copied to `pg-wal` (`/var/lib/postgresql/wal-archive` in the container). Daily base backups are written to `pg-base` (`/var/lib/postgresql/basebackups/latest`). Do not commit those directories.

## Daily base backup

```bash
sh scripts/postgres-base-backup.sh
```

`postgres` must already be up. The script runs `pg_basebackup` as the database user `ankanu` over local trust auth.

## Quarterly point-in-time restore

Pick the UTC time you want back. Whole seconds (`YYYY-MM-DD HH:MM:SS+00`) or microseconds (`YYYY-MM-DD HH:MM:SS.ffffff+00`) are accepted. The time must be after the commit you want back, and after the base backup's consistency point. Microseconds avoid stopping on the second before that commit.

```bash
sh scripts/postgres-pitr-restore.sh 'YYYY-MM-DD HH:MM:SS+00'
```

The script stops the `postgres` service in project `ankanu`, replaces the data directory with the latest base backup, writes `restore_command` and `recovery_target_time` into `postgresql.auto.conf`, replays archived WAL until that timestamp, then starts `postgres` again. It does not stop any other compose project.

When `postgres` is accepting connections, rows committed at or before that timestamp are back. Later commits are not.

## Object versions

`ObjectStorageAdapter.createPrivateBucket` enables bucket versioning on the same MinIO service (`bucket`) in this compose file. A later overwrite keeps the previous version id.

To bring a version back, call `restoreObjectVersion(key, versionId)`. That reads the version and writes those bytes onto the same key. The next read of the key returns that version. The older version id remains listed.

Do both the PostgreSQL restore and an object-version restore in the quarterly drill. Scan-deferred metrics are not part of this restore.
