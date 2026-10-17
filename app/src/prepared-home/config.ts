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

/** Place used for the FMI frost forecast. */
export const FROST_PLACE = "Turku";

/**
 * Photo size sent for checking. 1600 px keeps uploads fast on a phone connection and is above the
 * 1280 px photos the model was evaluated on; the contract allows up to 2576 px.
 */
export const PHOTO = { maxLongEdge: 1600, jpegQuality: 0.8 };
