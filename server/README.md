# Prepared Home server

A small Node API for Prepared Home (Valmis koti), a prototype for JunctionX, not an If service. It checks one photo against a check's fixed criteria with the Claude API, turns the answer into a verdict with the shared rules engine (`packages/engine`), and serves the frost forecast, sample photos and the web app. It stores nothing: photos are hashed and checked in memory, then dropped.

## Run it

```bash
npm install
npm run dev        # http://localhost:8787, reloads on change
npm test           # offline: no paid API calls, no devices
```

`npm run dev`, `npm start`, `npm run eval` and `npm run record:samples` load `../.env.local` (that is, `builds/prepared-home/.env.local`) if it exists. No other env file is read. Without a key the server runs in offline mode: every check answers "retake" with "Offline demo: no live check".

**Android phone over USB:** run `adb reverse tcp:8787 tcp:8787`, and the app's default `http://localhost:8787/api` reaches this server.

## Environment

Empty values mean "use the default".

| Variable | Default | Meaning |
|---|---|---|
| `ANTHROPIC_API_KEY` | unset | Enables live checks. Never logged, never sent to the browser. |
| `VISION_MODEL` | `claude-sonnet-5-5` | Change only after `npm run eval:gate` passes. |
| `VISION_EFFORT` | model default | Optional `low`, `medium`, `high`, `xhigh` or `max`. |
| `PORT` | `8787` | |
| `RATE_PER_IP_10MIN` | `12` | Live checks per client per 10 minutes. |
| `DAILY_LIVE_LIMIT` | `400` | Live calls per day; resets at midnight Helsinki time. |
| `DAILY_SPEND_CAP_USD` | `40` | Daily spend cap: an estimate before each call, corrected with real token usage after it. |
| `EST_COST_PER_CALL_USD` | `0.05` | The per-call estimate used for that check. |
| `TRUST_PROXY` | off | `1` trusts one proxy hop's `X-Forwarded-For` (Traefik). Leave off when the server is reached directly. |
| `CACHE_WRITE` | off | `1` records every live answer to the cache (see below). |
| `CACHE_DIR` | `cache` (bundle: `./cache`) | Recorded answers live in `<CACHE_DIR>/assessments/<sha256>.json`. |
| `SAMPLES_DIR` | `eval/photos` (bundle: `./samples`) | Where the six sample photos are read from. |
| `WEB_DIST` | `../app/dist` (bundle: `./web`) | Landing page `index.html` plus the Expo app in `app/`. |
| `CORS_ORIGIN` | `*` | |
| `LOG_SALT` | random per start | Salt for the short IP hash in logs. |

Relative paths resolve against `server/` when run from source, and against the folder of `server.mjs` when bundled.

## API

Stateless routes the app uses:

| Route | What it does |
|---|---|
| `GET /api/v1/health` | `{ ok, provider, model, keySet, liveAvailable, limits }`. Returns 200 without a key. |
| `GET /api/v1/checks?homeType&lang` | Checks with the home type's wording and their clause texts. |
| `POST /api/v1/check` | `{ homeId, homeType, checkId, lang, imageBase64, width, height, photoSha256, userAnswers }` → `{ outcome, record, source, sourceNote?, model, clause }`. |
| `POST /api/v1/claims` | `{ home, records, peril, lossDate, shared: [{ checkId, imageBase64 }] }` → adjuster view. Shared photos are hashed, compared and dropped. |
| `GET /api/v1/frost?place=Turku` | First forecast frost day from FMI open data (1-hour cache, captured fixture when offline). |
| `GET /api/v1/samples?lang` | The six sample photos with check, expected verdict, credit line, URL and SHA-256. |
| `GET /samples/<file>` | The sample image itself (only the six listed files). |

Everything else: `/app/*` serves the Expo web app (unknown paths fall back to `app/index.html`), and any other page path serves the landing page. Every response carries `X-Robots-Tag: noindex, nofollow`.

**Checks of the photo:** the server recomputes the SHA-256 of the JPEG bytes and answers 409 if it differs from `photoSha256`. It accepts JPEG only (415), at most 2576 px on the long edge (413), and bodies up to 12 MB.

## How a check is answered

1. **Recorded result:** if this exact photo (by SHA-256) was recorded for this check, the cached answer is used: `source: "cached"`, `sourceNote: "Recorded live result (<date>)"`.
2. **Live:** with a key and within the limits, the Claude API judges only the check's visibility and condition criteria, each as true, false or null ("can't tell from this photo"). It never judges whether a valve is open or closed and never describes people. The answer comes back through one strict tool schema; anything malformed becomes all-null, which means a retake. `source: "live"`.
3. **Offline:** no key, a limit reached, or the call failed. `source: "offline"` with a `sourceNote` saying which. A limit never shows up as an error.

The verdict is always decided by the engine, never by the model: a visibility criterion that is false or null gives a retake, an unclear condition gives a retake, a failed condition or a "no" from the customer gives fix first, and otherwise the check is verified.

## Sample photos and the recorded cache

The six samples (A07, C01, B03, C04, B07, A05) come from `eval/photos/` (Wikimedia Commons; credits in `eval/photos/README.md`). To make them instant, free and repeatable for the demo, record them once with a key:

```bash
npm run record:samples            # one live call per sample not yet recorded
npm run record:samples -- --force # re-record all six
```

This writes `cache/assessments/<sha256>.json` with the model and the date, and prints any sample whose verdict differs from the expected one. The app must send a sample's exact bytes (don't re-encode it), or the hash won't match. Running the server with `CACHE_WRITE=1` records every live answer the same way.

## Vision eval

`eval/manifest.json` maps the 24 photos to a check and the expected verdict (7 verified, 12 retake, 5 fix first), with a note per photo and, where a second verdict is defensible, `alsoAcceptable`.

```bash
npm run eval -- --model claude-sonnet-5-5     # 24 paid calls; reports in eval/reports/
npm run eval:gate -- --candidate eval/reports/<new>.json --baseline eval/reports/<current>.json
```

Reports give strict and lenient accuracy, a confusion matrix, the false "verified" count (the safety-critical error) and per-photo rows. A model may replace the default only if its accuracy is at least the baseline's and its false "verified" count is not higher; the gate exits 1 otherwise. Without `ANTHROPIC_API_KEY` the eval prints "ANTHROPIC_API_KEY not set" and exits 2.

## Bundle and container

`npm run bundle` writes one ESM file with the engine and every dependency, `../release/artifact/server.mjs`, which runs with plain `node server.mjs` and no `node_modules`. The root `Dockerfile` only copies `release/artifact/` (with `web/`, `samples/` and `cache/` beside `server.mjs`) into `node:24-alpine`.

## Privacy

- Image bytes are never written to disk or logs. Logs hold method, path, status, duration and a short salted IP hash; for checks, the check id, verdict, source and duration.
- Live checks send the photo to the Claude API (Anthropic) for that one request.
- The FMI request uses the generic User-Agent `prepared-home-prototype/0.1` and no key.

## Layout

| Path | Contents |
|---|---|
| `src/index.ts` | Entry point: config, dependencies, listen, graceful shutdown |
| `src/config.ts`, `src/deps.ts` | Environment variables (the only place they are read), and the dependencies built from them |
| `src/app.ts` | Routes, headers, static files, error handling |
| `src/routes/` | `v1.ts` (stateless API), `common.ts` (a check from photo to record) |
| `src/validate.ts`, `src/hash.ts`, `src/jpeg.ts` | Request validation, SHA-256 and base64, the JPEG size reader |
| `src/vision/` | The provider interface, the Claude provider and its prompt, the cache, the offline mock and the chain |
| `src/limits.ts` | Per-IP and daily limits |
| `src/fmi.ts` | Frost forecast |
| `src/samples.ts` | Sample photo list and credits |
| `eval/` | Photos, manifest, runner (`run.ts`, `runner.ts`), scoring and gate (`report.ts`, `gate.ts`) and reports |
| `scripts/` | `bundle.mjs`, `record-samples.ts` |
| `test/` | Vitest suites (mocked vision provider, fake FMI) |
