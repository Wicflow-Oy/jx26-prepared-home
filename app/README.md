# Prepared Home app

The Expo app (Android, iOS and web from one codebase). Prototype for JunctionX, not an If service.

## Run

```bash
npm install
npx expo start            # Expo Go on a phone, or press w for the web
npx expo export -p web    # static web build in dist/, served under /app
```

The API runs from `../server` on port 8787. The app finds it at `EXPO_PUBLIC_API_BASE_URL`, or by default at `/api` on the web build and `http://localhost:8787/api` in development. On an Android phone over USB, run `adb reverse tcp:8787 tcp:8787` and `adb reverse tcp:8081 tcp:8081`.

## Where things are

- `app/`: thin route files (expo-router). The web build lives under the base path `/app`.
- `src/prepared-home/`: the feature, mountable in another app through `PreparedHomeProvider`.
  - `screens/`: start, home, check (with the result sheet), result, status, Home Card, reminders, claim, adjuster, settings.
  - `ui/`: shared components, including the gesture-driven bottom sheet and the progress ring.
  - `theme.ts` (colours, type, spacing), `motion.ts` (springs and durations), `i18n.ts` (fi, sv, en).
  - `context.tsx` and `model.ts`: homes and records kept on the device; status, reminders and the Home Card come from `@prepared-home/engine`.
  - `api.ts`: typed client for the server routes; `photoPipeline.ts`: resize, JPEG re-encode and SHA-256 on the device.
- `maestro/`: end-to-end flows for Expo Go (`maestro test maestro/`).

## Checks

```bash
npx tsc --noEmit
npx expo lint
```
