# Prepared Home (Valmis koti): build contracts

> **Design history.** This is the build spec as it was agreed during the event. Where it and the code differ, the code, the [README](../README.md) and [ARCHITECTURE.md](ARCHITECTURE.md) are current (for example, the vision call uses `tool_choice: auto` with a strict tool, and the If branding was added later). Paths under `../../context/` are the team's research notes, which are not in this repo.

Frozen Sat 17 Oct 2026, 19:40. The engine, server and app build against this file and `packages/engine/src/types.ts`. Additive changes are fine; breaking changes need a joint decision. Product context: `../../context/dossier-if.md` (★ section, §9.0) and `../../context/if-brainstorm-research.md` §8.

**The product in one line:** a voluntary moving-day check-up in the home insurance app. A dozen guided photo checks, each checked by a vision model against fixed criteria. While a risk's checks are current, its deductible is lower (**a concept; If decides the amounts**). The adjuster sees the dated checks at claim time. Photos stay on the device.

**Hero:** "your new home, checked and safe". The deductible is the reward, not the headline.

## 1. Layout and ownership
```
builds/prepared-home/
  docs/CONTRACTS.md          this spec
  packages/engine/           pure TypeScript, no dependencies, used by server and app
  server/                    Node 24 + TypeScript (tsx), Express, Anthropic SDK behind one interface
  server/eval/               photo eval set, runner and reports
  app/                       Expo SDK 58, expo-router, Android + web from one codebase
```
**Rules for every part:**
- **Separate installs:** each package has its own `package.json` and `node_modules`, with no root workspace. Server and app depend on the engine via `"@prepared-home/engine": "file:../packages/engine"` (the app may use Metro `watchFolders` instead).
- **Engine source:** TypeScript only (`"type": "module"`), extensionless relative imports. No JSON imports in the engine (data lives in `.ts` modules), and no Node APIs. It must run in Node, Metro (Android) and the browser.
- **Git:** only green commits go to `main` (tests pass, lint is clean, it builds). No deploys from a dev machine; the operator deploys from GitHub (`DEPLOY.md`).
- **New code only:** all code is written now (hackathon rule). Don't copy code from other projects or folders. Data may be copied from `../../context/analysis/if/` as listed below.
- **Secrets:** read the Claude key only from the env var `ANTHROPIC_API_KEY`. Never read keys or `.env` files from other folders, never log a key, and never put one in the app bundle.
- **Outbound requests:** use a generic User-Agent, `prepared-home-prototype/0.1`. Never send personal names or emails.
- **Tests:** never make paid API calls or need a device; mock the vision provider.

## 2. Engine API (`packages/engine/src/index.ts` exports)
```ts
export * from "./types";
export const CHECKS: CheckDefinition[];                       // the 14 checks in §4
export function checksFor(homeType: HomeType): CheckDefinition[]; // flat: L1-L6, F1-F5 (11); house: all 14; cottage: L1-L6, F1-F5, Z1, Z2 (13)
export function getCheck(id: string): CheckDefinition;
export const CLAUSES: Record<string, Clause>;                 // from the three clause files (fi, sv, en official)
export function clauseText(id: string, lang: Lang): string;   // falls back to fi, then en
export function decideVerdict(check: CheckDefinition, a: VisionAssessment | null, userAnswers: Record<string, boolean>, lang: Lang, homeType: HomeType, now?: Date | string): CheckOutcome; // now: default the current time (cold-season criteria)
export function recordFromOutcome(homeId: string, outcome: CheckOutcome, checkedAt: Date, photoSha256: string | null, homeType: HomeType): CheckRecord; // sets dueAt by Recheck rule
export function perilStatuses(home: Home, records: CheckRecord[], now: Date, deductibles?: DeductibleConfig): PerilStatus[];
export function reminders(home: Home, records: CheckRecord[], now: Date, frost: FrostForecast | null): Reminder[];
export function homeCard(home: Home, records: CheckRecord[], now: Date, frost: FrostForecast | null, lang: Lang): HomeCard;
export function adjusterView(input: { claimId: string; home: Home; records: CheckRecord[]; peril: Peril; lossDate: string; shared: { checkId: string; sha256: string }[] }, deductibles?: DeductibleConfig): AdjusterView;
export type DeductibleConfig = Record<Peril, { standard: number; prepared: number }>; // default 300 -> 100 for every peril
export const DEMO: { homes: Home[]; records: CheckRecord[] };   // §6
```
**Verdict rules (in code, never in the model):**
1. Any visibility criterion that is false or null gives **retake**.
2. Otherwise, any condition criterion that is null gives **retake**.
3. Otherwise, any condition or user criterion that is false gives **fix_first**.
4. Otherwise, the check is **verified**.

A criterion marked `coldSeasonOnly` (Z2's hose) counts only from October to April (`COLD_SEASON_MONTHS`). Outside that, it is still judged and shown with a note, but it never gives retake or fix_first.

"Not applicable" comes only from the user, and only where `notApplicableAllowed` is true. A missing vision assessment (offline, error) gives **retake** with the hint "Couldn't check the photo. Try again."

**Due dates:**
- yearly: `checkedAt` + 12 months;
- seasonal: the next listed month start after `checkedAt`, at most 12 months away;
- frost: next 1 October, or 12 months, whichever is sooner.

**Peril status:**
- **prepared:** every required check is verified (or not applicable), and none is past its due date.
- **lapsed:** it was prepared, but one or more checks are now past due.
- **not_started:** no records.
- **in_progress:** anything else.
- `preparedUntil` is the earliest due date. The deductible's `current` is `prepared` only when prepared, otherwise `standard`.

**Adjuster:** the relief applies only if the peril was prepared on the loss date (records checked before it, due after it) **and** every shared photo's hash matches the record. Otherwise the bonus isn't applied. The reasons list says which check failed. Cover is never affected.

## 3. Vision provider (server side)
```ts
interface VisionProvider {
  readonly name: string;   // "anthropic" | "cached" | "mock"
  readonly model: string;  // e.g. "claude-sonnet-5-5"
  assess(input: { check: CheckDefinition; lang: Lang; image: { base64: string; mediaType: "image/jpeg"; width: number; height: number } }): Promise<VisionAssessment>;
}
```
- **AnthropicVisionProvider:** model from env `VISION_MODEL`, default `claude-sonnet-5-5`. Forced tool use with a JSON schema returns only the check's visibility and condition criteria, plus boxes in pixel coordinates of the image as sent, `retakeHint`, `fixSuggestion` and `urgent`. Never ask the model whether a valve is open or closed. Images are at most 2576 px on the long edge, JPEG.
- **CachedVisionProvider:** looks up the assessment by the photo's SHA-256 in `server/cache/assessments/<sha>.json`. A miss falls through to the next provider.
- **Chain:** cached → anthropic (when the key is set) → mock. The mock returns all criteria `null`, which becomes **retake** with "Offline demo: no live check".
- **Every response says which provider answered:** `source: "cached" | "live" | "offline"`.

## 4. The checks (fixed criteria; v = visibility, c = condition, u = user)
Clause ids must exist in the clause data. "Section" = the clause covers the area without naming the item.

| id | peril | homes | title (en) | criteria | clauses (fit) | owner | recheck | N/A allowed |
|---|---|---|---|---|---|---|---|---|
| L1 | leak | all | Where the water shuts off | v: a water shut-off valve is visible (house and cottage: the main valve; flat: an appliance's shut-off valve, since only the housing company uses the main and flat shut-offs) · v: its handle or lever is visible · c: no leak, drip, corrosion or water stains at the valve · u: "I know how to close it" (flat: "I know how to close my appliance valves, and I have the maintenance company's emergency number") | house, cottage: OMA-5.5.3 (direct), relation note "close this valve when the home is empty for more than a week (5.5.3)"; flat: none, guide note "only the housing company uses the water shut-off; close appliance valves when not in use" | flat: property_manager, else me | yearly | no |
| L2 | leak | all | Washing-machine hose and its own tap | v: the fill hose is visible from the tap to the machine · v: the machine's own shut-off tap is visible · c: no drip, kink, bulge, crack or rust on the hose or its connections | OMA-5.5.6 (direct) | me | yearly | yes (no washing machine) |
| L3 | leak | all | Dishwasher hose and tap | v: the dishwasher's water connection is visible · c: a shut-off tap for the dishwasher is visible · c: no drip, kink, bulge or water stains | OMA-5.5.6, OMA-5.5.8 (section); guide note "If's guidance applies these instructions to dishwashers" | me | yearly | yes (no dishwasher) |
| L4 | leak | all | Drip trays under the washing machine and fridge | v: the floor under the appliance is visible · c: a drip tray is under it, or the room has a floor drain and a leak would show at once · c: no water or stains on the floor or tray | OMA-5.5.8 (direct) | me | yearly | no |
| L5 | leak | all | Floor drain and sink trap | v: a floor drain or a sink trap is visible · c: no blockage, standing water or leak at the drain or trap | OMA-5.5.7, OMA-5.5.9 (direct; one fit per check) | me | yearly | no |
| L6 | leak | all | Bathroom silicone seams | v: the seams at floor-wall joints and shower or bath edges are visible up close · c: seams intact, with no cracks, gaps, peeling or black mould | OMA-4.1-vesieriste (exclusion: water through or without a waterproofing layer isn't covered) | me | yearly | no |
| F1 | fire | all | Working smoke alarm | v: a smoke alarm is visible · c: it is mounted, not removed or covered · u: "I pressed the test button and it beeped" | OMA-5.2.6 (direct) | flat: property_manager (the building owner fits and maintains alarms since 1.1.2026), else me | yearly | no |
| F2 | fire | all | Fuse box | v: the fuse box or distribution board is visible · c: no damage, scorch marks, missing cover or exposed live parts · c: nothing stored against or in front of it (a safety tip, said in the guide note) | OMA-5.2.7, OMA-5.2.8 (section); guide note: the clear front is a tip, and a missing RCD is allowed in older wiring (not a criterion) | professional | yearly | no |
| F3 | fire | all | Behind the fridge | v: the back of the fridge or freezer (coil, cords) is visible · c: no thick dust on the coil or compressor · c: cords and plugs undamaged | OMA-5.2.7 (section); guide note: dust is a safety tip, 5.2.7 covers the cords and plugs | me | yearly | no |
| F4 | fire | all | Stove top clear | v: the stove top is visible · c: nothing stored on it (no paper, boxes, towels or pans left on) | OMA-5.2.15 (direct); guide note "In stove-fire insurance claims, things left on the stove were the most common cause (SPEK 2023)" | me | yearly | no |
| F5 | fire | all | Where you charge devices | v: the charging spot for phones, laptops or e-bike batteries is visible · c: charging happens away from beds, sofas, curtains and other textiles | OMA-5.2.17 (direct) | me | yearly | no |
| Z1 | freeze | house, cottage | Heating for the cold season | v: a thermostat, heating controller or radiator setting is visible · u: "Heating is on in every room with water pipes" (cottage: "or the water system is drained") | OMA-5.5.1 (direct), OMA-5.5.2 (direct, cottages) | me | seasonal [9] | no |
| Z2 | freeze | house, cottage | Outdoor tap before frost | v: the outdoor tap is visible · c: no hose attached (counts only from October to April, `coldSeasonOnly`) · u: "I closed the indoor shut-off valve for the outdoor tap, or it is a frost-proof tap" | OMA-5.5.4 (direct) | me | frost | yes (no outdoor tap) |
| S1 | storm_water | house | Gutters and downpipes | v: a gutter or downpipe is visible · c: no leaves, debris or overflow; the downpipe leads water away from the wall | OMA-5.4.1, OMA-5.4.2 (section; gutters aren't named) | me | seasonal [4, 10] | no |

- **Peril grouping for the deductible:** leak, fire, freeze. Storm water (S1) counts toward **leak** for houses.
- **Leak alarm:** when the home has one, leak status shows the 6.4.1 line: "No deductible if an alarm device prevented or limited the damage (terms 6.4.1)."
- **Translations:** fi and sv titles and criteria are needed for the app's language switch. Keep them plain.

## 5. Server HTTP API (JSON; base `/api`; CORS open for the web app in dev)
| Method and path | Request | Response |
|---|---|---|
| GET `/health` | – | `{ ok, provider: "anthropic"/"cached"/"mock", model, keySet: boolean }` (never the key) |
| GET `/checks?homeType=flat&lang=en` | – | `CheckDefinition[]` plus `clause: { id, text }[]` per check |
| POST `/homes` | `{ homeType, label?, moveInDate, hasLeakAlarm }` | `Home` |
| GET `/homes/:homeId/status?lang=en` | – | `HomeStatus` (uses the frost forecast) |
| POST `/homes/:homeId/checks/:checkId` | `{ lang, imageBase64, width, height, photoSha256, userAnswers }` | `{ outcome: CheckOutcome, record: CheckRecord, source, model, clause: { id, text }[] }` |
| POST `/homes/:homeId/checks/:checkId/not-applicable` | `{ }` | `{ record }` (400 unless allowed) |
| POST `/homes/:homeId/reset` | – | `{ ok }` (demo homes only) |
| GET `/demo/homes` | – | `Home[]` (the two demo homes) |
| POST `/claims` | `{ homeId, peril, lossDate, shared: [{ checkId, imageBase64 }] }` | `AdjusterView` (the server hashes the shared images, compares and discards them) |
| GET `/claims/:claimId` | – | `AdjusterView` |
| GET `/frost?place=Turku` | – | `FrostForecast` (FMI open data, keyless; fixture fallback) |

**Server privacy rules:**
- Recompute the SHA-256 of the received JPEG bytes. Reject a mismatch with the client's `photoSha256` (409).
- Image bytes are never written to disk or logs. Logs hold only check id, verdict, source and duration.
- The store, a JSON file in `server/data/`, holds `Home` and `CheckRecord` only.

## 6. Demo data (in the engine's `DEMO`, seeded by the server at start)
- **`demo-turku-flat`** ("Demo flat, Turku", flat, moved in 2026-10-10, no leak alarm). Checks are dated 2026-10-12, so the "now" in demos is about Oct 2026:
  - verified: L1, L2, L3, L5, L6, F1, F2, F3;
  - fix_first: L4 (no drip tray under the fridge);
  - not started: F4, F5.
  - That gives Leak 5/6 (in progress) and Fire 3/5.
- **`demo-fresh`** ("New home", flat, moved in today, no records).
- **`demo-house`** (optional, P1): a house with all 14 checks verified, used for the freeze reminders and S1.
- **Demo claim, built on request:** a leak claim on `demo-turku-flat`, loss date 2027-02-03. Before L4 is fixed it shows "bonus not applied"; after a verified L4 it shows "relief applies".

## 7. Eval (gates any model swap)
- **Photo set:** `server/eval/photos/`, the 24 licensed photos from `../../context/analysis/if/vision-test-24/` (copy them **with** their README attribution), plus the team's own photos later.
- **Manifest:** `server/eval/manifest.json` with `{ file, checkId, expectedVerdict, note }`. Map the photo groups: A → L1, B → L2/L3/L5 by content, C → F2. Expected verdicts come from the team's earlier pre-test of the same 24 photos, translated to the new rules.
- **Runner:** `npm run eval -- --model <id>` writes `server/eval/reports/<timestamp>-<model>.{json,md}` with accuracy, a confusion matrix, false "verified" count and per-photo rows.
- **Gate:** a model may replace the current default only if accuracy is at least the baseline's and false-verified is not higher. `npm run eval:gate -- --candidate <report> --baseline <report>` exits non-zero on failure.
- **Without a key** the runner prints "ANTHROPIC_API_KEY not set" and exits 2. Unit tests cover the runner with a mock provider.

## 8. App (Expo) essentials
- **Embeddable:** the feature lives in `app/src/prepared-home/` (screens, components, `api.ts`, `theme.ts`). Route files in `app/app/` are thin wrappers. The API base URL and theme are props or context, so it can later sit inside another app.
- **Screens:**
  - Home ("Your new home");
  - Checks list by peril;
  - Check (coach → camera or picker → upload → result);
  - Result (Verified / Retake / Fix first, with criteria, clause and owner);
  - Status and deductible preview;
  - Home Card;
  - Reminders;
  - Adjuster view (`/adjuster/[claimId]`, works on web);
  - Demo picker;
  - Settings (language fi/sv/en, server URL).
- **Photo pipeline on the device:** resize to at most 2576 px on the long edge, JPEG ~0.85, EXIF stripped (re-encode). SHA-256 of the exact bytes sent (expo-crypto). The photo stays in app storage. "Share with claim" sends it only to `/claims`.
- **Label on every screen:** "Prototype for JunctionX, not an If service". No If logo.
- **Networking:** Android over USB uses `adb reverse tcp:8787 tcp:8787`, so the server runs on port 8787 and the app defaults to `http://localhost:8787/api`.
- **Theme:** neutral tokens in `theme.ts` for now. Phase 3 applies the chosen design option.

## 9. Addendum (Sat 20:00): public web demo, native builds, hosting
Judges try the real product online on their own device, and the team installs it on their phones on Sunday. This section overrides §5 and §8 where they conflict.

### 9.1 State lives on the device; the server is stateless for the public demo
- **The app keeps Home and CheckRecords locally** (AsyncStorage on native, localStorage on web) and computes status, reminders and the Home Card with the engine (`perilStatuses`, `reminders`, `homeCard`). Demo homes come from the engine's `DEMO`.
- **Server env `STORE_MODE=stateless|file`** (default `stateless`). In stateless mode the server writes nothing to disk and keeps no records. `file` keeps §5's store; it models "the insurer holds status, date and hash" for a later integration.
- **Stateless endpoints** (always available; the app uses these):

| Method and path | Request | Response |
|---|---|---|
| POST `/api/v1/check` | `{ homeId, homeType, checkId, lang, imageBase64, width, height, photoSha256, userAnswers }` | `{ outcome: CheckOutcome, record: CheckRecord, source: "live"/"cached"/"offline", sourceNote?, model, clause: { id, text }[] }` |
| POST `/api/v1/claims` | `{ home: Home, records: CheckRecord[], peril, lossDate, shared: [{ checkId, imageBase64 }] }` | `AdjusterView` (images hashed in memory, compared, discarded) |
| GET `/api/v1/checks?homeType&lang` | – | as §5 |
| GET `/api/v1/frost?place=Turku` | – | `FrostForecast` |
| GET `/api/v1/health` | – | `{ ok, provider, model, keySet, liveAvailable, limits: { perIpPer10Min, dailyLive, usedToday } }` |
| GET `/api/v1/samples` | – | the sample photos list (§9.3) with URLs |

- The §5 home-based routes stay, for `STORE_MODE=file` only.
- **Photos:** processed in memory and never stored or logged. The app shows the line "Photos are checked and then discarded. Nothing is saved on our server." near the shutter.

### 9.2 Abuse and cost guard on the vision endpoint
- **Per-IP limit:** env `RATE_PER_IP_10MIN`, default 12 live checks per 10 minutes. Behind a proxy, honour `X-Forwarded-For` only when `TRUST_PROXY=1`.
- **Daily live cap:** env `DAILY_LIVE_LIMIT`, default 400 calls; `DAILY_SPEND_CAP_USD` (default 40) is checked with a per-call cost estimate. The counter resets at midnight Europe/Helsinki and is in memory, which is fine for one instance.
- **When a limit is hit, never error to the judge.** Fall back to cached if the hash is cached, otherwise offline. Set `source` and `sourceNote` ("Live checks are paused for today; this is a recorded result." / "Live check limit reached; try a sample photo."), and say so in the UI.
- **Body size limit:** 12 MB. Only `image/jpeg` is accepted; reject anything above 2576 px on the long edge.

### 9.3 Sample photos (desktop judges have no camera)
- **In-app "Use a sample photo"** on every check screen. Bundled, licensed examples cover all three outcomes. They come from `server/eval/photos/` (Wikimedia Commons, with attribution), and each sample shows its credit line ("Photo: <author>, <licence>, Wikimedia Commons").
- **Proposed set** (confirmed against the eval manifest):

| Sample | Check | Expected |
|---|---|---|
| A07 | L1 | verified |
| C01 | F2 | verified |
| B03 | L5 | fix_first, urgent (dripping trap) |
| C04 | F2 | fix_first, urgent (cover removed) |
| B07 | L5 | retake (cupboard closed) |
| A05 | L1 | retake (no valve in frame) |

- **Sample results are served from the cache**, recorded from a real live check (recorded with `CACHE_WRITE=1` once the key is set), so they are instant, free and deterministic. Until recorded they go live (or offline without a key). The cache file records the model and the date; the UI labels them "Recorded live result (<date>)".
- On mobile, the camera and file picker come first, and samples are a secondary link.

### 9.4 Web build
- **Phone frame:** a landing page `/` with a realistic phone frame (390 × 844) running the app, a QR code to open it on your own phone, and a one-line pitch. On a narrow screen (≤500 px) the app opens full screen. **Built after the team lead picks a style.** The app lives at `/app` and the landing page at `/`.
- **PWA:** manifest (name "Prepared Home", short name "Prepared Home", theme colour from the chosen style, icons), installable to the home screen.
- **`noindex`:** `<meta name="robots" content="noindex, nofollow">` on every page, plus `robots.txt` with `Disallow: /`.
- **Naming:** no domain, title or app name that implies If owns it. "Prototype for JunctionX, not an If service" stays on every screen.
- **API base URL from env `EXPO_PUBLIC_API_BASE_URL`.** The default is a same-origin `/api` on web and `http://localhost:8787/api` in native dev builds.

### 9.5 Native builds (EAS)
- **`app.json`:** name "Prepared Home"; slug `prepared-home`; scheme `preparedhome`; `ios.bundleIdentifier` and `android.package` = `fi.wicflow.preparedhome`; camera and photo-library usage strings (plain English: "Prepared Home uses the camera to photograph the points you check. Photos are checked and then discarded."). A "Prototype" note sits in the app's settings and on the start screen.
- **`eas.json` profiles:**
  - `development` (dev client, internal);
  - `preview` (Android `buildType: "apk"`, internal distribution);
  - `production` (iOS store build for TestFlight internal testing; Android aab).
  - Each sets `EXPO_PUBLIC_API_BASE_URL` (the hosted URL, filled in once hosting is chosen).
- **Logins are the team lead's alone:** the team lead runs `eas login` and the Apple sign-in himself; nobody else handles Apple or Expo credentials. Commands are in `docs/NATIVE-BUILDS.md`.

### 9.6 Hosting (decided: UpCloud Helsinki behind Traefik; runbook deploy/README.md)
- **One Docker image:** `server/` serves `/api/*` and the static web export (`app/dist`) from one Node process. `Dockerfile` at the repo root; config only via env vars.
- **Also works as:** static hosting for `app/dist`, with the API on any Node host (set `EXPO_PUBLIC_API_BASE_URL` at build time).
- **Deploy only after the team lead logs in to the chosen host himself.** Nobody creates accounts on his behalf. Commands are in `docs/HOSTING.md`.

### 9.7 Polish bar (Phase 3, but don't block it now)
- **Copy:** real copy, no placeholder text anywhere a judge can reach.
- **States:** loading, empty and error states on every screen.
- **Motion:** smooth but restrained (respect reduced motion).
- **Accessibility:** WCAG AA contrast, tap targets ≥44 px.
- **Languages:** fi/sv/en switch.
