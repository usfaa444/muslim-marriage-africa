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

```
staging.ankanu.com {
	reverse_proxy 172.24.0.1:4012
}
```

`admin off` means `caddy reload` cannot reach port 2019. A file change is loaded by `docker restart sotigi-staging-edge-1` only. Do not recreate the container, and do not change other blocks, global options, ports, or the firewall.

`paperclip-https.service` runs `/root/paperclip-https/apply.sh` on every start of this container. That script rebuilds `/data/Caddyfile` from the image Caddyfile plus `/root/paperclip-https/site.caddy.template`, then restarts the container if the live file differs. An append that exists only on the live file is removed by the next apply. The staging block is in that template as `reverse_proxy __GATEWAY__:4012`, which renders to `172.24.0.1:4012`.

Backups:

- `/var/lib/docker/volumes/sotigi-staging_edge_state/_data/Caddyfile.bak-20261011-204734` — before the first append. Reload failed, so this copy was restored and the container was not restarted.
- `/var/lib/docker/volumes/sotigi-staging_edge_state/_data/Caddyfile.bak-20261011-211534` — before the approved restart. The first restart loaded the site, then `apply.sh` wrote the old desired file and restarted again, which dropped the site.
- `/root/paperclip-https/site.caddy.template.bak-20261011-211810` — template before the staging block.

After the template and the live file matched, one restart at `2026-10-11T21:18:21Z` loaded the site. The follow-up apply saw the same file and did not restart again. Let's Encrypt issued `CN=staging.ankanu.com` (issuer `YE2`, notAfter `Jan 9 2027`). `https://staging.ankanu.com/` and `/v1/health` returned 200. `https://sarati.net`, `https://choupi.sarati.net`, and `https://paperclip.sotigi.com` stayed 200. `https://staging.sotigi.com` stayed 502. `https://sotigi.com` is not this edge's hostname.
