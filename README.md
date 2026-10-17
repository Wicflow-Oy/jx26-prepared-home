# Prepared Home (Valmis koti)

A voluntary moving-day check-up for your home, inside a home insurance app. You photograph about a dozen everyday risk points, a vision model checks each photo against fixed criteria, and while the checks are current your deductible for that risk could be lower (a concept; the insurer decides). Prototype for JunctionX Turku 2026, If track. Not an If service.

**Screenshot:** added with the final UI.

**Live demo:** https://preparedhome.demo.wicflow.com (online after the first deploy; see `DEPLOY.md`).

## Run it
```bash
npm ci && npm --prefix packages/engine ci
npm run check
```
`npm run check` runs formatting, lint, typecheck and the tests. The server and app run commands are added here when they land.

## Architecture
- **`packages/engine`:** pure TypeScript rules shared by the server and the app. It holds the 14 checks with fixed criteria, the verdict rules, status per risk, the deductible preview, reminders, the Home Card and the claim-time adjuster view. No dependencies, no I/O.
- **`server`:** a small Node API. It verifies each photo's SHA-256, asks the vision model about the check's criteria (one `VisionProvider` interface: live, cached or offline), applies the engine's rules and returns the outcome. It stores nothing by default, and has per-IP and daily spend limits.
- **`app`:** an Expo app for Android, iOS and web. State stays on the device; status is computed locally with the engine.
- **The model only answers "is this visible / is this OK in the photo".** Verified, Retake and Fix first are decided in code, and so are the deductible and the claim decision.
- **Privacy:** photos are checked in memory and discarded. The record is a verdict, a date and a photo hash.

## Folder map
```
packages/engine/   rules, check definitions, clause data, demo data, tests
server/            API, vision providers, limits, FMI frost forecast, photo eval
app/               Expo app (screens in app/src/prepared-home)
deploy/            compose files and the pack script
release/artifact/  prebuilt server bundle and web export that the image copies
docs/              contracts, hosting and native-build notes
```

## Where the key logic lives
- `packages/engine/src/checks.ts`: the 14 checks, their criteria and their If-terms clauses in fi, sv and en.
- `packages/engine/src/rules.ts`: verdicts, due dates, status per risk, reminders, the Home Card and the adjuster decision.
- `server/src/vision/`: the model behind one interface, with the prompt and output validation.

## Tests
`npm run check`. Tests run offline with mocked model calls. A separate photo eval (`server/eval`) runs on demand against a fixed set of licensed photos, so any model change is measured before it ships.

## Implementing it at If
`docs/IMPLEMENTING-AT-IF.md`: what is ready today, the decisions only If can make, the integration points (identity and policy, records, claims handling, reminders) and a privacy checklist for a pilot.

## What's real and what's mocked
- **Real:** the vision checks (Claude API); If's public home-insurance terms (OMA 200.27, YLE 900.14) quoted per check; the FMI open-data frost forecast; the photo hashing.
- **Mocked or concept:** the insurer's systems and the adjuster view; the deductible amounts ("Concept: If decides the amount"); the demo homes and their records.

## Data sources and licences
- **If's home insurance terms:** public documents, quoted per check in Finnish, Swedish and If's official English translation (Finnish prevails).
- **Sample and eval photos:** Wikimedia Commons, under CC0, CC BY and CC BY-SA. Credits are in `server/eval/photos/README.md` and shown in the app.
- **Weather:** Finnish Meteorological Institute open data (CC BY 4.0).

All code in this repo was written during the event.
