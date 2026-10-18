# Prepared Home app

The Expo app (Android, iOS and web from one codebase). A concept for If, not a live If service.

## Run

```bash
npm install
npx expo start            # Expo Go on a phone, or press w for the web
npx expo export -p web    # static web build in dist/, served under /app
```

The API runs from `../server` on port 8787. The app finds it at `EXPO_PUBLIC_API_BASE_URL`, or by default at `/api` on the web build and `http://localhost:8787/api` in development. On an Android phone over USB, run `adb reverse tcp:8787 tcp:8787` and `adb reverse tcp:8081 tcp:8081`.

Example homes open from Settings, or with a link: `/app/?example=flat|house|fresh` on the web, `preparedhome://?example=flat` in a development build.

## How a check works

1. One check per screen with the in-app camera (the web uses a file picker and example photos).
2. The photo is resized to 1600 px, re-encoded as JPEG and fingerprinted (SHA-256) on the device.
3. The server checks it with the Claude API and keeps nothing; the result and a copy of the photo stay on the device.
4. Only photos taken with the in-app camera count toward the lower deductible. Gallery and example photos are shown with a note.

## Where things are

- `app/`: thin route files (expo-router). The web build lives under the base path `/app`.
- `src/prepared-home/`: the feature, mountable in another app through `PreparedHomeProvider`.
  - `screens/`: one folder per screen group (`check/`, `result/`, `home/`, `status/`, `claim/`) and single-file screens.
  - `ui/`: shared components, including the gesture-driven bottom sheet and the progress ring.
  - `i18n/`: typed dictionaries by area (en, fi, sv); screens read them with `useT()`.
  - `state/`: data kept on the device (`storage.ts`) and the actions that change it; `context.tsx` wires them up.
  - `model.ts`: status, reminders and the Home Card from `@prepared-home/engine`.
  - `api/`: typed client for the stateless `/api/v1` routes.
  - `photo/`: resize, JPEG and SHA-256 (`pipeline.ts`), and the copies kept on the device (`store.ts`, `store.web.ts`).
- `maestro/`: end-to-end flows for Expo Go (`maestro test maestro/`).

## Checks

```bash
npx tsc --noEmit
npx expo lint
npx prettier --check .
```
