#!/bin/sh
set -eu
if [ "$#" -ne 1 ]; then
  echo "usage: postgres-pitr-restore.sh 'YYYY-MM-DD HH:MM:SS+00'" >&2
  exit 1
fi
target=$1
if ! printf '%s' "$target" | grep -Eq '^[0-9]{4}-[0-9]{2}-[0-9]{2} [0-9]{2}:[0-9]{2}:[0-9]{2}(\.[0-9]{1,6})?\+00$'; then
  echo "recovery target must be UTC YYYY-MM-DD HH:MM:SS+00" >&2
  exit 1
fi
root=$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)
if [ ! -f "$root/pg-base/latest/PG_VERSION" ]; then
  echo "base backup missing" >&2
  exit 1
fi
compose() {
  docker compose -p ankanu -f "$root/compose.yaml" "$@"
}
psql_at() {
  compose exec -T -u postgres postgres psql -U ankanu -d ankanu -h 127.0.0.1 -v ON_ERROR_STOP=1 -tAc "$1"
}
wal_file=$(psql_at "select pg_walfile_name(pg_current_wal_lsn())")
wal_file=$(printf '%s' "$wal_file" | tr -d '[:space:]')
if ! printf '%s' "$wal_file" | grep -Eq '^[0-9A-F]{24}$'; then
  echo "WAL segment name missing" >&2
  exit 1
fi
psql_at "select pg_switch_wal()" >/dev/null
i=0
while [ "$i" -lt 60 ]; do
  if [ -f "$root/pg-wal/$wal_file" ]; then
    break
  fi
  i=$((i + 1))
  sleep 1
done
if [ ! -f "$root/pg-wal/$wal_file" ]; then
  echo "WAL segment was not archived" >&2
  exit 1
fi
compose stop postgres
compose run --rm --no-deps --user root --entrypoint /bin/sh postgres -c "set -eu
if [ ! -f /var/lib/postgresql/basebackups/latest/PG_VERSION ]; then
  echo base backup missing >&2
  exit 1
fi
find /var/lib/postgresql/data -mindepth 1 -delete
cp -a /var/lib/postgresql/basebackups/latest/. /var/lib/postgresql/data/
printf '%s\n' \"restore_command = 'cp /var/lib/postgresql/wal-archive/%f %p'\" \"recovery_target_time = '${target}'\" \"recovery_target_action = 'promote'\" >> /var/lib/postgresql/data/postgresql.auto.conf
touch /var/lib/postgresql/data/recovery.signal
chown -R postgres:postgres /var/lib/postgresql/data
"
compose start postgres
i=0
while [ "$i" -lt 60 ]; do
  recovery=$(psql_at "select pg_is_in_recovery()" 2>/dev/null || true)
  recovery=$(printf '%s' "$recovery" | tr -d '[:space:]')
  if [ "$recovery" = "f" ]; then
    exit 0
  fi
  i=$((i + 1))
  sleep 1
done
echo "postgres did not leave recovery after restore" >&2
exit 1
