# Prepared Home (Valmis koti): build contracts

Frozen Sat 17 Oct 2026, 19:40, by the lead. Every workstream builds against this file and `packages/engine/src/types.ts`. Additive changes are fine; anything breaking needs the lead's OK. Product context: `../../context/dossier-if.md` (★ section, §9.0) and `../../context/if-brainstorm-research.md` §8.

**The product in one line:** a voluntary moving-day check-up in the home insurance app. A dozen guided photo checks, each checked by a vision model against fixed criteria. While a risk's checks are current, its deductible is lower (**a concept; If decides the amounts**). The adjuster sees the dated checks at claim time. Photos stay on the device.

**Hero:** "your new home, checked and safe". The deductible is the reward, not the headline.

## 1. Layout and ownership
```
builds/prepared-home/
  docs/CONTRACTS.md          lead
  packages/engine/           W-ENGINE: pure TypeScript, no dependencies, used by server and app
  server/                    W-SERVER: Node 24 + TypeScript (tsx), Express, Anthropic SDK behind one interface
  server/eval/               W-SERVER: photo eval set, runner and reports
  app/                       W-APP: Expo SDK 58, expo-router, Android + web from one codebase
```
**Rules for every workstream:**
- **Separate installs:** each package has its own `package.json` and `node_modules`, with no root workspace. Server and app depend on the engine via `"@prepared-home/engine": "file:../packages/engine"` (the app may use Metro `watchFolders` instead).
- **Engine source:** TypeScript only (`"type": "module"`), extensionless relative imports. No JSON imports in the engine (data lives in `.ts` modules), and no Node APIs. It must run in Node, Metro (Android) and the browser.
- **Git:** **don't commit** and don't push; the lead commits. Don't create GitHub repos or deploy.
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
export function decideVerdict(check: CheckDefinition, a: VisionAssessment | null, userAnswers: Record<string, boolean>, lang: Lang, homeType: HomeType): CheckOutcome;
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
| L1 | leak | all | Where the water shuts off | v: a water shut-off valve is visible (house: main valve; flat: the apartment or appliance shut-off) · v: its handle or lever is visible · c: no leak, drip, corrosion or water stains at the valve · u: "I know how to close it" | OMA-5.5.3 (direct for houses; section for flats) | flat: property_manager, else me | yearly | no |
| L2 | leak | all | Washing-machine hose and its own tap | v: the fill hose is visible from the tap to the machine · v: the machine's own shut-off tap is visible · c: no drip, kink, bulge, crack or rust on the hose or its connections | OMA-5.5.6 (direct) | me | yearly | yes (no washing machine) |
| L3 | leak | all | Dishwasher hose and tap | v: the dishwasher's water connection is visible · c: a shut-off tap for the dishwasher is visible · c: no drip, kink, bulge or water stains | none; guide note "If's home guide: a shut-off tap and a drip tray for the dishwasher; 5.5.6 by analogy" | me | yearly | yes (no dishwasher) |
| L4 | leak | all | Drip trays under the washing machine and fridge | v: the floor under the appliance is visible · c: a drip tray is under it, or a floor drain is right next to it · c: no water or stains on the floor or tray | OMA-5.5.8 (direct) | me | yearly | no |
| L5 | leak | all | Floor drain and sink trap | v: a floor drain or a sink trap is visible · c: no blockage, standing water or leak at the drain or trap | OMA-5.5.7 (direct), OMA-5.5.9 (section) | me | yearly | no |
| L6 | leak | all | Bathroom silicone seams | v: the seams at floor-wall joints and shower or bath edges are visible up close · c: seams intact, with no cracks, gaps, peeling or black mould | OMA-4.1-vesieriste (exclusion: water through or without a waterproofing layer isn't covered) | me | yearly | no |
| F1 | fire | all | Working smoke alarm | v: a smoke alarm is visible · c: it is mounted, not removed or covered · u: "I pressed the test button and it beeped" | OMA-5.2.6 (direct) | me | yearly | no |
| F2 | fire | all | Fuse box | v: the fuse box or distribution board is visible · c: no damage, scorch marks, missing cover or exposed live parts · c: a residual-current device (RCD, with a TEST button) is visible · c: nothing stored against or in front of it | OMA-5.2.7, OMA-5.2.8 (section) | professional | yearly | no |
| F3 | fire | all | Behind the fridge | v: the back of the fridge or freezer (coil, cords) is visible · c: no thick dust on the coil or compressor · c: cords and plugs undamaged | OMA-5.2.7 (section) | me | yearly | no |
| F4 | fire | all | Stove top clear | v: the stove top is visible · c: nothing stored on it (no paper, boxes, towels or pans left on) | none; guide note "Items on or near the stove are the top cause of kitchen fires (SPEK)" | me | yearly | no |
| F5 | fire | all | Where you charge devices | v: the charging spot for phones, laptops or e-bike batteries is visible · c: charging on a hard surface, away from beds, sofas, curtains and textiles | OMA-5.2.17 (direct) | me | yearly | no |
| Z1 | freeze | house, cottage | Heating for the cold season | v: a thermostat, heating controller or radiator setting is visible · u: "Heating is on in every room with water pipes" (cottage: "or the water system is drained") | OMA-5.5.1 (direct), OMA-5.5.2 (direct, cottages) | me | seasonal [9] | no |
| Z2 | freeze | house, cottage | Outdoor tap before frost | v: the outdoor tap is visible · c: no hose attached · u: "I closed the indoor valve for the outdoor tap" | OMA-5.5.4 (direct) | me | frost | yes (no outdoor tap) |
| S1 | storm_water | house | Gutters and downpipes | v: a gutter or downpipe is visible · c: no leaves, debris or overflow; the downpipe leads water away from the wall | OMA-5.4.1, OMA-5.4.2 (section; gutters aren't named) | me | seasonal [4, 10] | no |

- **Peril grouping for the deductible:** leak, fire, freeze. Storm water (S1) counts toward **leak** for houses.
- **Leak alarm:** when the home has one, leak status shows the 6.4.1 line: "No deductible if an alarm device prevented or limited the damage (terms 6.4.1)."
- **Translations:** fi and sv titles and criteria are needed for the app's language switch. The engine owner writes them; keep them plain.

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
- **Manifest:** `server/eval/manifest.json` with `{ file, checkId, expectedVerdict, note }`. Map the old missions: A → L1, B → L2/L3/L5 by content, C → F2. Expected verdicts come from `lead-vision-pretest-24.md`, translated to the new rules.
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
