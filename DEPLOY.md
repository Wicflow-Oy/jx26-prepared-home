# Deploying Prepared Home (for the operator)

**What it is:** a public demo for JunctionX Turku (If track). One container serves the web app and a small API at a single hostname, `preparedhome.demo.wicflow.com`.
- **Compose project:** `jx-preparedhome`. Container: `jx-preparedhome`. Memory limit 1 GB, 1 CPU.
- **The image only copies a prebuilt artifact** (`release/artifact/`, committed). It runs no npm install and no web build on the box, so it adds no build load next to the other internal services.
- **The app stores nothing on the server.** Photos are checked in memory and discarded; app state stays in each visitor's browser. Logs hold no request bodies. Every response carries `X-Robots-Tag: noindex`.

**Production rules:**
- Treat the box as production, because it runs the other internal services.
- Only ever run commands with `-p jx-preparedhome`.
- Never touch other compose projects, their containers or networks, or the proxy's own config.
- Never restart Traefik, Caddy or nginx.

## 0. Read-only preflight (change nothing)
```bash
docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Ports}}\t{{.Status}}"
```
```bash
sudo ss -ltnp | grep -E ':(80|443)\s'
```
```bash
docker network ls
```
```bash
df -h /
```
```bash
free -m
```
```bash
docker compose version
```
**Decide from the output:**
- **Who owns 80/443?** A `traefik` container → **case A**. A host `caddy` or `nginx` process → **case B**.
- **Traefik's network and cert resolver (case A):**
  ```bash
  docker inspect <traefik-container> --format '{{json .NetworkSettings.Networks}}'
  ```
  ```bash
  docker inspect <traefik-container> --format '{{json .Args}}'
  ```
  Look for the network name (wicflow.com's setup uses `n8n_default`) and the resolver name (`zerossl` there).
- **Memory:** at least ~1.2 GB free for the 1 GB container. Free disk: the image is about 200 MB.
- **Compose:** version 2.24 or newer (the compose file uses `env_file` with `required`).
- **Port check, case B only:** make sure 8787 isn't already taken.
  ```bash
  sudo ss -ltnp | grep 8787
  ```
  If it is, pick another port with `PH_PORT` in `.env`.

## 1. Get the code
Repo URL: [TEAM: the private Wicflow-Oy repo, once the team lead creates it].
```bash
sudo mkdir -p /opt/jx && sudo chown "$USER" /opt/jx && git clone <repo-url> /opt/jx/preparedhome
```
```bash
cd /opt/jx/preparedhome
```

## 2. Secrets (first time only)
```bash
cp .env.example .env && chmod 600 .env
```
Fill in `.env`:
- **`ANTHROPIC_API_KEY`:** this app's own key, from the team lead.
- **`PH_HOST`:** the hostname.
- **Case A:** `TRAEFIK_NETWORK` and `PH_CERTRESOLVER`, from the preflight.
- **Case B:** `PH_PORT` if 8787 is taken.

Leave everything else empty to use the defaults: $40/day cap, 12 live checks per IP per 10 minutes, 400 live calls per day. Never paste the key into chat, git or logs.

**No DNS yet?** Use `PH_HOST=preparedhome.<server-ip>.sslip.io`.

## 3a. Case A: Traefik (Docker labels)
```bash
docker compose -p jx-preparedhome -f deploy/compose.yml -f deploy/compose.traefik.yml --env-file .env up -d --build
```
This attaches only to Traefik's existing network, with no host ports. The router, service and middleware names are all prefixed `jx-preparedhome`.

## 3b. Case B: Caddy or nginx on the host
```bash
docker compose -p jx-preparedhome -f deploy/compose.yml -f deploy/compose.port.yml --env-file .env up -d --build
```
This publishes on `127.0.0.1:8787` only. Add **one** site block for this hostname. Don't edit other sites.

**Caddy:**
```
preparedhome.demo.wicflow.com {
	reverse_proxy 127.0.0.1:8787
	header X-Robots-Tag "noindex, nofollow"
	request_body {
		max_size 12MB
	}
}
```
Then:
```bash
sudo caddy validate --config /etc/caddy/Caddyfile
```
```bash
sudo systemctl reload caddy
```

**nginx** (TLS via your usual certbot flow):
```
server {
    server_name preparedhome.demo.wicflow.com;
    client_max_body_size 12m;
    add_header X-Robots-Tag "noindex, nofollow" always;
    location / {
        proxy_pass http://127.0.0.1:8787;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```
Then:
```bash
sudo nginx -t
```
```bash
sudo systemctl reload nginx
```
A reload, not a restart.

## 4. Verify
```bash
docker compose -p jx-preparedhome ps
```
```bash
curl -s https://preparedhome.demo.wicflow.com/api/v1/health
```
```bash
curl -sI https://preparedhome.demo.wicflow.com/ | grep -i -E "^HTTP|x-robots-tag"
```
- **Health:** expect `"ok":true` and `"keySet":true` (the key itself is never shown). It returns 200 even before the key is set.
- **Headers:** expect HTTP 200 and `x-robots-tag: noindex`.

**Logs** (method, path, status and duration only):
```bash
docker logs --tail 50 jx-preparedhome
```

## 5. Update to a new release
```bash
cd /opt/jx/preparedhome && docker tag jx-preparedhome:live jx-preparedhome:prev && git pull
```
Then the same `up -d --build` command as in 3a or 3b.

## 6. Roll back or remove (this project only)
**Back to the previous image** (case A shown; use `compose.port.yml` for case B):
```bash
PH_TAG=prev docker compose -p jx-preparedhome -f deploy/compose.yml -f deploy/compose.traefik.yml --env-file .env up -d --no-build
```
**Stop and remove this demo completely:**
```bash
docker compose -p jx-preparedhome -f deploy/compose.yml -f deploy/compose.traefik.yml --env-file .env down
```
In case B, also remove its Caddy or nginx site block and reload. Nothing else on the box is affected.
