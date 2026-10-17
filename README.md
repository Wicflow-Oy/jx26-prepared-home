# Prepared Home (Valmis koti)

A voluntary moving-day check-up for your home, inside a home insurance app. Prototype for JunctionX Turku 2026, If track. Not an If service.

- `packages/engine`: the rules (checks, verdicts, status, deductible preview, reminders, Home Card, adjuster view).
- `server`: a small Node API. It holds the Claude key (`ANTHROPIC_API_KEY`), runs the vision checks and stores only status, dates and photo hashes.
- `app`: an Expo app (Android and web).

Contracts: `docs/CONTRACTS.md`. All code in this repo was written during the event.
