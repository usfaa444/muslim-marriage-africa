#!/bin/sh
set -eu
root=$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)
compose() {
  docker compose -p ankanu -f "$root/compose.yaml" "$@"
}
compose exec -T -u postgres postgres rm -rf /var/lib/postgresql/basebackups/latest.tmp
compose exec -T -u postgres postgres pg_basebackup -D /var/lib/postgresql/basebackups/latest.tmp -F p -X fetch -U ankanu -h 127.0.0.1 --checkpoint=fast
compose exec -T -u postgres postgres rm -rf /var/lib/postgresql/basebackups/latest
compose exec -T -u postgres postgres mv /var/lib/postgresql/basebackups/latest.tmp /var/lib/postgresql/basebackups/latest
