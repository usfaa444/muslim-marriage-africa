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
  if compose exec -T postgres pg_isready -U ankanu -d ankanu >/dev/null 2>&1; then
    exit 0
  fi
  i=$((i + 1))
  sleep 1
done
echo "postgres did not become ready after restore" >&2
exit 1
