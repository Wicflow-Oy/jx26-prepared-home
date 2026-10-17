// PreparedHomeProvider: the embeddable root of the feature. It owns the settings, the homes and records kept
// on this device, and the API client. Status, reminders and the Home Card are computed with the engine.
import type { AdjusterView, CheckRecord, Home, Lang } from "@prepared-home/engine";
import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";

import { createApi, type Api } from "./api";
import { defaultApiBaseUrl } from "./config";
import { translate, type Translate } from "./i18n";
import { makePaths, type Paths } from "./paths";
import { useDeviceStore } from "./state/useDeviceStore";
import { useFrost, type FrostState } from "./state/useFrost";
import {
  useHomeActions,
  type CheckResultInput,
  type NewHome,
  type SaveResult,
} from "./state/useHomeActions";
import { useScreenReader } from "./state/useScreenReader";
import type { Claims, StoredOutcome } from "./storage";
import { ifTheme, type Theme } from "./theme";

export type { Paths } from "./paths";
export type { FrostState } from "./state/useFrost";
export type { SaveResult } from "./state/useHomeActions";
export { makePaths };

export interface PreparedHomeContextValue {
  ready: boolean;
  storageProblem: boolean;
  lang: Lang;
  setLang: (lang: Lang) => void;
  /** Steps and results are said aloud, or sent to the screen reader when one is on. */
  voiceGuidance: boolean;
  setVoiceGuidance: (on: boolean) => void;
  screenReader: boolean;
  t: Translate;
  theme: Theme;
  paths: Paths;

  api: Api;
  apiBaseUrl: string;
  defaultApiBaseUrl: string;
  customApiBaseUrl: string | null;
  setApiBaseUrl: (url: string | null) => void;

  homes: Home[];
  currentHome: Home | null;
  recordsFor: (homeId: string) => CheckRecord[];
  openDemo: (homeId: string) => Home | null;
  createHome: (input: NewHome) => Home;
  selectHome: (homeId: string) => void;

  outcomeFor: (homeId: string, checkId: string) => StoredOutcome | undefined;
  saveCheckResult: (input: CheckResultInput) => Promise<SaveResult>;
  markNotApplicable: (home: Home, checkId: string) => SaveResult;

  claims: Claims;
  saveClaim: (homeId: string, view: AdjusterView) => void;

  frost: FrostState;
  refreshFrost: () => void;

  clearDeviceData: () => Promise<void>;
}

const Ctx = createContext<PreparedHomeContextValue | null>(null);

export interface PreparedHomeProviderProps {
  /** Default API base; a URL saved in Settings overrides it. */
  apiBaseUrl?: string;
  /** Default UI language; the language chosen in Settings overrides it. */
  lang?: Lang;
  theme?: Theme;
  /** Where the feature's routes live, relative to the router root (default: the root). */
  basePath?: string;
  /** Where the claims handler route lives (default "/adjuster"). */
  adjusterBasePath?: string;
  children: ReactNode;
}

export function PreparedHomeProvider({
  apiBaseUrl,
  lang: defaultLang = "en",
  theme = ifTheme,
  basePath = "",
  adjusterBasePath = "/adjuster",
  children,
}: PreparedHomeProviderProps) {
  const store = useDeviceStore();
  const { value: settings, latest: settingsNow, update: updateSettings } = store.settings;
  const { value: local } = store.homes;

  const fallbackBase = apiBaseUrl ?? defaultApiBaseUrl();
  const lang: Lang = settings.lang ?? defaultLang;
  const effectiveBase = settings.apiBaseUrl ?? fallbackBase;
  const api = useMemo(() => createApi(effectiveBase), [effectiveBase]);
  const t = useCallback<Translate>((key, params) => translate(lang, key, params), [lang]);
  const paths = useMemo(() => makePaths(basePath, adjusterBasePath), [basePath, adjusterBasePath]);

  const setLang = useCallback(
    (next: Lang) => updateSettings({ ...settingsNow.current, lang: next }),
    [settingsNow, updateSettings],
  );
  const setApiBaseUrl = useCallback(
    (url: string | null) => {
      const clean = url && url.trim().length > 0 ? url.trim() : null;
      updateSettings({ ...settingsNow.current, apiBaseUrl: clean });
    },
    [settingsNow, updateSettings],
  );

  const screenReader = useScreenReader();
  const setVoiceGuidance = useCallback(
    (on: boolean) => updateSettings({ ...settingsNow.current, voiceGuidance: on }),
    [settingsNow, updateSettings],
  );

  const actions = useHomeActions(store, lang);
  const { frost, refreshFrost } = useFrost(api, store.ready);
  const outcomes = store.outcomes.value;

  const value: PreparedHomeContextValue = {
    ready: store.ready,
    storageProblem: store.storageProblem,
    lang,
    setLang,
    voiceGuidance: settings.voiceGuidance ?? screenReader,
    setVoiceGuidance,
    screenReader,
    t,
    theme,
    paths,
    api,
    apiBaseUrl: effectiveBase,
    defaultApiBaseUrl: fallbackBase,
    customApiBaseUrl: settings.apiBaseUrl,
    setApiBaseUrl,
    homes: Object.values(local.homes),
    currentHome: local.currentHomeId ? (local.homes[local.currentHomeId] ?? null) : null,
    recordsFor: (homeId) => local.records[homeId] ?? [],
    ...actions,
    outcomeFor: (homeId, checkId) => outcomes[homeId]?.[checkId],
    claims: store.claims.value,
    frost,
    refreshFrost,
    clearDeviceData: store.clearHomeData,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePreparedHome(): PreparedHomeContextValue {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("usePreparedHome must be used inside <PreparedHomeProvider>");
  return ctx;
}

/** The translate function and the current language: the one hook screens need for text. */
export function useT(): { t: Translate; lang: Lang } {
  const { t, lang } = usePreparedHome();
  return { t, lang };
}

export function useTheme(): Theme {
  return usePreparedHome().theme;
}
