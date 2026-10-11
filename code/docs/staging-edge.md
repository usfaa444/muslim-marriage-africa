# Staging edge

AnKanu is one Docker Compose project, `ankanu`. Its web container listens on container port 3000. The host bind is not in `code/compose.yaml`. It is `4012:3000` in `/root/ankanu-epic2/compose.ports.yml`. Every deploy of this project must include that file. A command that omits it drops `0.0.0.0:4012`.

From `code/`:

```bash
docker compose -p ankanu --env-file /var/lib/ankanu/compose.interpolate.env \
  -f compose.yaml -f /root/ankanu-epic2/compose.ports.yml \
  up -d --build --no-deps web api worker
```

Do not run `docker compose -p ankanu down`. Do not recreate postgres, redis, or the bucket unless that is the change. Do not stop other projects.

## Upstream

Caddy is the container `sotigi-staging-edge-1` (image Caddy 2.11, project `sotigi-staging`). It is not a systemd service. It runs `caddy run --config /data/Caddyfile --adapter caddyfile`. The live file on the host is `/var/lib/docker/volumes/sotigi-staging_edge_state/_data/Caddyfile`. Global options include `admin off`.

The upstream for this app is `http://172.24.0.1:4012`. `172.24.0.1` is the gateway of the `sotigi-staging_frontend_internal` bridge, which is the same hop the `sarati.net` block uses. From inside the Caddy container, `GET /` and `GET /v1/health` on that address returned 200 on 2026-10-11. The proxy target is the web port, not the api container.

## Site block

The block to append, and nothing else, is:

```
staging.ankanu.com {
	reverse_proxy 172.24.0.1:4012
}
```

Backup taken before the append: `/var/lib/docker/volumes/sotigi-staging_edge_state/_data/Caddyfile.bak-20261011-204734`.

`docker exec sotigi-staging-edge-1 caddy validate --config /data/Caddyfile --adapter caddyfile` returned `Valid configuration`.

`docker exec sotigi-staging-edge-1 caddy reload --config /data/Caddyfile --adapter caddyfile` failed: `Post "http://localhost:2019/load": dial tcp [::1]:2019: connect: connection refused`. Nothing is listening on port 2019 because the file sets `admin off`. The backup was copied back over the live file. The running process was not restarted.

Before and after that restore, with `curl -k` and no redirect follow: `https://sarati.net` 200, `https://choupi.sarati.net` 200, `https://paperclip.sotigi.com` 200, `https://staging.sotigi.com` 502, `https://sotigi.com` TLS alert (that name is not the edge hostname). `https://staging.ankanu.com` is the same TLS alert because the site is not loaded.

Reload command, once the admin endpoint can accept it:

```bash
docker exec sotigi-staging-edge-1 caddy reload --config /data/Caddyfile --adapter caddyfile
```

Do not restart, recreate, or stop `sotigi-staging-edge-1` unless the founder allows that one container. Do not edit any other block, the global options, the published ports, or the firewall.
