# Hosting the public demo

For the team lead. **You log in to the host yourself.** Agents don't create accounts or deploy before you've done so. The build is host-agnostic: one Node process serves the API (`/api/*`) and the static web export (`app/dist`), configured only by environment variables.

## Environment variables (server)
| Variable | Value | Notes |
|---|---|---|
| `ANTHROPIC_API_KEY` | your key | Set only on the host. Never in the app, the repo or logs |
| `VISION_MODEL` | `claude-sonnet-5-5` | Change only after `npm run eval:gate` passes |
| `PORT` | `8787` | |
| `STORE_MODE` | `stateless` | The public demo stores nothing |
| `TRUST_PROXY` | `1` behind a reverse proxy or a platform | Needed for per-IP limits |
| `RATE_PER_IP_10MIN` | `12` | Live checks per IP per 10 minutes |
| `DAILY_LIVE_LIMIT` | `400` | Live calls per day (Helsinki midnight reset) |
| `DAILY_SPEND_CAP_EUR` | `10` | Estimated spend cap per day |
| `WEB_DIST` | `../app/dist` (or `/app/web` in the container) | Static web export |

When a limit is hit, the app falls back to recorded results and says so. Judges never see an error.

## Option A: Wicflow's EU VPS (Docker)
```bash
docker build -t prepared-home .
```
```bash
docker run -d --name prepared-home -p 127.0.0.1:8787:8787 --env-file prepared-home.env --restart unless-stopped prepared-home
```
- **HTTPS:** put Caddy or nginx in front for TLS, e.g. Caddy: `demo.example.fi { reverse_proxy 127.0.0.1:8787 }`. Set `TRUST_PROXY=1`.
- **The env file** `prepared-home.env` lives on the server only (`chmod 600`), never in git.
- **Domain:** pick one that doesn't imply If owns it, such as a Wicflow subdomain like `prepared-home.<wicflow-domain>`. Avoid "if" in the name.

## Option B: Vercel
- **Static only:** the web export (`app/dist`) deploys as a static site. The API can't run there as-is, because the server is a long-running Express process with in-memory limits.
- **So either** host the API on the VPS (option A) and set `EXPO_PUBLIC_API_BASE_URL=https://<api-host>/api` before `npx expo export -p web`, **or** adapt the API to Vercel Functions. The adapter needs per-request rate limits in a shared store, so it's more work; ask the lead first.
- `vercel login` and `vercel link` are yours.

## Early skeleton tonight (a stable URL for the Project Demo field)
1. You choose the host and log in.
2. The lead deploys the current build, even if it's unstyled. The demo works on recorded and sample results, and live checks work once the key is set on the host.
3. Every later deploy goes to the same URL.

## Privacy notes for the page
- **Photos:** processed in memory, sent to the Claude API for the check, then discarded. Nothing is stored on our server, and app state stays in the visitor's browser.
- **The model call isn't EU storage:** don't claim "stored in the EU" for it. The VPS being in the EU is true; say just that.
- **`noindex`** on every page, plus `robots.txt` `Disallow: /`.
