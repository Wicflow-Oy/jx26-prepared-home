import { Platform } from "react-native";

/**
 * Default API base URL (docs/CONTRACTS.md §9.4):
 * - EXPO_PUBLIC_API_BASE_URL when set at build time;
 * - web production build: same-origin "/api";
 * - web dev server (expo start --web runs on its own port) and native dev: http://localhost:8787/api
 *   (Android over USB reaches it through `adb reverse tcp:8787 tcp:8787`).
 */
export function defaultApiBaseUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_BASE_URL;
  if (fromEnv && fromEnv.trim().length > 0) return fromEnv.trim();
  if (Platform.OS === "web" && !__DEV__) return "/api";
  return "http://localhost:8787/api";
}

/** Demo claim, as in docs/CONTRACTS.md §6. */
export const DEMO_CLAIM = { peril: "leak" as const, lossDate: "2027-02-03" };

/** Place used for the FMI frost forecast. */
export const FROST_PLACE = "Turku";

/** Photo pipeline limits (docs/CONTRACTS.md §8). */
export const PHOTO = { maxLongEdge: 2576, jpegQuality: 0.85 };
