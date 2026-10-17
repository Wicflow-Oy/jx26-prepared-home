# Deploying the public demo (UpCloud, Helsinki)

Shared conventions: `../../HOSTING.md`. Compose project **`jx-preparedhome`** runs behind the box's existing Traefik, at hostname `preparedhome.demo.wicflow.com`, with a 1 GB memory limit, no published ports, `noindex` headers and no request-body logging.

## Wait for the team lead's three confirmations before deploying
1. **Is it the same box as wicflow.com?** If yes, it's production. Touch only `jx-preparedhome`: never `wicflow-site`, never Traefik's config, never restart Traefik. That box "never builds" heavy images, which is why the image here only copies a prebuilt artifact.
2. **DNS:** `preparedhome.demo.wicflow.com`, or a `*.demo.wicflow.com` wildcard, points at the box. Until then, use `PH_HOST=preparedhome.<server-ip>.sslip.io`.
3. **SSH:** the host alias this PC uses (below called `jxbox`), or the team lead runs the first deploy himself. Nobody creates users or keys on the box.

Also check on the box: the Traefik network name (`docker network ls`; wicflow-site uses `n8n_default`) and the cert resolver (`zerossl` there). Set `TRAEFIK_NETWORK` and `PH_CERTRESOLVER` in `.env` if they differ.

## 1. Build the artifact on this PC
```bash
bash deploy/pack.sh
```
This creates `deploy/artifact/`: the bundled server (`server.mjs`), the web export (`web/`), the licensed sample photos (`samples/`) and the recorded results (`cache/`).

## 2. Upload (mirrors the repo layout under /opt/jx/preparedhome)
```bash
tar czf - Dockerfile .dockerignore deploy/compose.yml deploy/artifact | ssh jxbox "mkdir -p /opt/jx/preparedhome && tar xzf - -C /opt/jx/preparedhome"
```

## 3. Secrets (first time only, on the box)
Create `/opt/jx/preparedhome/.env` from `deploy/.env.example` with this app's own Claude key. Then:
```bash
ssh jxbox "chmod 600 /opt/jx/preparedhome/.env"
```

## 4. Start or update
```bash
ssh jxbox "cd /opt/jx/preparedhome && docker compose -p jx-preparedhome -f deploy/compose.yml --env-file .env up -d --build"
```

## 5. Check
```bash
curl -sI https://preparedhome.demo.wicflow.com/ | grep -i -E "HTTP/|x-robots-tag"
```
```bash
curl -s https://preparedhome.demo.wicflow.com/api/v1/health
```
The health response shows `keySet: true` and the limits; it never shows the key.

## Roll back
Tag before updating: `docker tag jx-preparedhome:live jx-preparedhome:prev`. Then run `PH_TAG=prev docker compose -p jx-preparedhome -f deploy/compose.yml --env-file .env up -d --no-build`.
