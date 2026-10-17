# Hosting the public demo

**Decided Sat 17 Oct: the team lead's UpCloud server in Helsinki**, behind the box's existing Traefik. Vercel is off.

- **Runbook:** `DEPLOY.md` at the repo root, for the operator. He deploys from GitHub; nobody else SSHes in. It covers a read-only preflight, both proxy cases (Traefik labels, or Caddy/nginx with `127.0.0.1:8787`), verify and rollback.
- **Compose:** `deploy/compose.yml` plus `compose.traefik.yml` or `compose.port.yml` (project `jx-preparedhome`, 1 GB, `noindex` headers). Secrets template: `.env.example` (every variable, none filled in). the team lead's local key: `.env.local` (gitignored).
- **The box never builds heavy images.** `deploy/pack.sh` bundles the server and exports the web app on the dev PC into `release/artifact/` (committed); the Dockerfile only copies it.

## Environment variables (server)
| Variable | Value | Notes |
|---|---|---|
| `ANTHROPIC_API_KEY` | this app's own key | the operator sets it in `.env` on the server; the team lead keeps his local one in `.env.local`. Never in the app, the repo or logs |
| `VISION_MODEL` | `claude-sonnet-5-5` | Change only after `npm run eval:gate` passes |
| `STORE_MODE` | `stateless` | The public demo stores nothing |
| `TRUST_PROXY` | `1` | Traefik in front; needed for per-IP limits |
| `RATE_PER_IP_10MIN` | `12` | Live checks per IP per 10 minutes |
| `DAILY_LIVE_LIMIT` | `400` | Live calls per day (Helsinki midnight reset) |
| `DAILY_SPEND_CAP_USD` | `40` | Estimated spend cap per day |
| `PH_HOST` | `preparedhome.demo.wicflow.com` | Fallback: `preparedhome.<server-ip>.sslip.io` |

When a limit is hit, the app falls back to recorded results and says so. Judges never see an error.

## Privacy story (true as stated)
- **Hosting:** say "Hosted in Helsinki (UpCloud)" only once the deployment there is confirmed. The app stores nothing on the server; state stays in the visitor's browser or phone.
- **Photos:** processed in memory, sent to the Claude API for the check, then discarded. The Claude call goes to Anthropic, so say so if asked; don't call it EU storage.
- **Indexing and tracking:** `noindex` header and meta on every page, plus `robots.txt` `Disallow: /`. No analytics, no trackers, no request-body logs.
