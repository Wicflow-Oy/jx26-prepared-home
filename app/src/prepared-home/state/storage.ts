// Local persistence: homes, check records, results, claims and settings live on the device.
// AsyncStorage uses native storage on Android/iOS and localStorage on web.
import AsyncStorage from "@react-native-async-storage/async-storage";
import type {
  AdjusterView,
  CaptureSource,
  CheckOutcome,
  CheckRecord,
  Home,
  Lang,
  Verdict,
} from "@prepared-home/engine";

import type { CheckSource } from "../api";

const KEYS = {
  settings: "prepared-home/settings/v1",
  state: "prepared-home/state/v1",
  outcomes: "prepared-home/outcomes/v1",
  claims: "prepared-home/claims/v1",
} as const;

export interface Settings {
  lang: Lang | null; // null: use the provider's default
  apiBaseUrl: string | null; // null: use the provider's default
  voiceGuidance: boolean | null; // null: on while the phone's screen reader is on
}

export interface LocalState {
  homes: Record<string, Home>;
  records: Record<string, CheckRecord[]>; // by homeId, at most one per check
  currentHomeId: string | null;
}

export interface StoredOutcome {
  homeId: string;
  checkId: string;
  outcome: CheckOutcome;
  source: CheckSource;
  sourceNote?: string;
  /** Language of the server texts (source note, model notes and hints) in this result. */
  lang?: Lang;
  model: string;
  checkedAt: string;
  photoSha256: string | null;
  /** How the photo was taken; missing on older results, which count as camera photos. */
  capture?: CaptureSource;
  /** The second angle of the same item, when one was taken. */
  secondPhotoSha256?: string | null;
  /** false when a retake did not replace an earlier, stronger record */
  recordReplaced: boolean;
  previousVerdict?: Verdict;
}

export type Outcomes = Record<string, Record<string, StoredOutcome>>; // homeId -> checkId -> latest outcome
export type Claims = Record<string, { view: AdjusterView; createdAt: string; homeId: string }>;

export const EMPTY_SETTINGS: Settings = { lang: null, apiBaseUrl: null, voiceGuidance: null };
export const EMPTY_STATE: LocalState = { homes: {}, records: {}, currentHomeId: null };

export interface LoadResult<T> {
  value: T;
  /** true if stored data could not be read; it was kept under a backup key, not deleted */
  corrupt: boolean;
}

async function readJson<T>(
  key: string,
  fallback: T,
  isValid: (v: unknown) => boolean,
): Promise<LoadResult<T>> {
  const raw = await AsyncStorage.getItem(key);
  if (raw == null) return { value: fallback, corrupt: false };
  try {
    const parsed: unknown = JSON.parse(raw);
    if (isValid(parsed)) return { value: parsed as T, corrupt: false };
  } catch {
    // fall through
  }
  await AsyncStorage.setItem(`${key}/unreadable-${Date.now()}`, raw);
  return { value: fallback, corrupt: true };
}

const isObject = (v: unknown) => !!v && typeof v === "object" && !Array.isArray(v);

export async function loadAll(): Promise<{
  settings: LoadResult<Settings>;
  state: LoadResult<LocalState>;
  outcomes: LoadResult<Outcomes>;
  claims: LoadResult<Claims>;
}> {
  const [settings, state, outcomes, claims] = await Promise.all([
    readJson<Settings>(KEYS.settings, EMPTY_SETTINGS, isObject),
    readJson<LocalState>(
      KEYS.state,
      EMPTY_STATE,
      (v) =>
        isObject(v) && isObject((v as LocalState).homes) && isObject((v as LocalState).records),
    ),
    readJson<Outcomes>(KEYS.outcomes, {}, isObject),
    readJson<Claims>(KEYS.claims, {}, isObject),
  ]);
  return {
    settings: { ...settings, value: { ...EMPTY_SETTINGS, ...settings.value } },
    state,
    outcomes,
    claims,
  };
}

export const saveSettings = (s: Settings) => AsyncStorage.setItem(KEYS.settings, JSON.stringify(s));
export const saveState = (s: LocalState) => AsyncStorage.setItem(KEYS.state, JSON.stringify(s));
export const saveOutcomes = (o: Outcomes) => AsyncStorage.setItem(KEYS.outcomes, JSON.stringify(o));
export const saveClaims = (c: Claims) => AsyncStorage.setItem(KEYS.claims, JSON.stringify(c));

/** Removes homes, records, results and claims. Settings stay. */
export async function clearHomeData(): Promise<void> {
  await AsyncStorage.multiRemove([KEYS.state, KEYS.outcomes, KEYS.claims]);
}
