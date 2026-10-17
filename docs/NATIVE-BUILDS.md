# Native builds: iOS (TestFlight) and Android (APK)

For the team lead. **Every login below is yours.** Nobody else handles Expo or Apple credentials. Run the commands in a terminal in `app/`. They need the EAS CLI (`npm install -g eas-cli`; built with 24.13.0).

Bundle id and package: `fi.wicflow.preparedhome`. Display name: "Prepared Home". The app shows a "Prototype" note on the start screen and in settings.

## 0. Before the first build
1. **Set the hosted API URL.** `app/eas.json` sets `EXPO_PUBLIC_API_BASE_URL=https://preparedhome.demo.wicflow.com/api` in each profile. A build bakes this value in; the phones can't use `localhost`.
2. **Skip the export-compliance question in App Store Connect:** `app.json` should have `"ios": { "config": { "usesNonExemptEncryption": false } }`. The app only uses HTTPS.

## 1. Log in and link the project (once)
```bash
eas login
```
```bash
eas init
```
`eas init` creates the Expo project and writes `extra.eas.projectId` into `app.json`. Commit that change.

## 2. iOS: start tonight (Apple processing takes time)
```bash
eas build --platform ios --profile production
```
- **EAS asks you to sign in to your Apple Developer account.** Do it yourself in the terminal. Let EAS create the distribution certificate and provisioning profile, and register the bundle id `fi.wicflow.preparedhome`.
- **Timing:** the build runs in Expo's cloud. On the free plan the queue can take a while; it's quicker with priority builds.

When the build has finished:
```bash
eas submit --platform ios --latest
```
- **App record:** `eas submit` uploads the build to App Store Connect. If no app record exists, it offers to create one ("Prepared Home", bundle id `fi.wicflow.preparedhome`, primary language English; the SKU can be `prepared-home-proto`).
- **Processing:** after upload, Apple processes the build. It often takes 10–30 minutes, sometimes longer, before it appears in TestFlight.

**TestFlight internal testing (no Apple review for internal testers):**
1. App Store Connect → Users and Access → add **a teammate** and **the operator** as users. Use the role "Developer" or "Marketing"; internal testers must be App Store Connect users on your team. They accept the email invite.
2. App Store Connect → the app → TestFlight → Internal Testing → create a group, e.g. "JunctionX team" → add yourself, a teammate and the operator → enable the processed build for the group.
3. Each tester installs the **TestFlight** app on their iPhone and accepts the invite.

## 3. Android: an internal APK
```bash
eas build --platform android --profile preview
```
- **Install:** the `preview` profile builds an APK with internal distribution. When it finishes, EAS shows a link and a QR code; anyone with the link can install it (allow "install unknown apps" on the phone).
- **Alternative over USB, with no cloud build:** a local development build needs the Android SDK, `adb` on PATH and `npx expo run:android` (this runs prebuild locally). For quick checks during the build, Expo Go is enough: run `npx expo start` and scan the QR code.

## 4. Quick on-device testing during the night (Expo Go, USB)
The app is built to run in Expo Go.
```bash
adb reverse tcp:8787 tcp:8787
```
```bash
npx expo start
```
Start the API first (`server/`: `npm run dev`). Then open the project in Expo Go on the phone; with `adb reverse`, `http://localhost:8787/api` reaches the PC's server.

## 5. What never goes into a build
- No API keys. The Claude key lives only on the server (`ANTHROPIC_API_KEY`).
- **Branding:** the app name is "Prepared Home". The build is If-branded (If logo and a "Concept" pill in the header; About says "Concept for If, built at JunctionX Turku 2026. Not a live If service.").
  - **Why:** the team lead's decision on 17 Oct, pending If's written consent.
  - **If If says no:** set `IF_BRANDED = false` in `app/src/prepared-home/brand.ts` before building.
