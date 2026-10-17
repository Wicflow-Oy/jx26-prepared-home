// PreparedHomeProvider: the embeddable root of the feature. It owns settings, the homes and records kept on
// this device, and the API client. Status, reminders and the Home Card are computed with the engine.
import {
  makeDemo,
  notApplicableOutcome,
  perilStatuses,
  recordFromOutcome,
  getCheck,
  type AdjusterView,
  type CheckRecord,
  type FrostForecast,
  type Home,
  type HomeType,
  type Lang,
  type Peril,
} from "@prepared-home/engine";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { createApi, type Api, type CheckResponse } from "./api";
import { defaultApiBaseUrl, FROST_PLACE } from "./config";
import { translate, todayIso, type Translate } from "./i18n";
import { clearPhotos, savePhoto } from "./photoStore";
import {
  clearHomeData,
  EMPTY_SETTINGS,
  EMPTY_STATE,
  loadAll,
  saveClaims,
  saveOutcomes,
  saveSettings,
  saveState,
  type Claims,
  type LocalState,
  type Outcomes,
  type Settings,
  type StoredOutcome,
} from "./storage";
import { ifTheme, type Theme } from "./theme";

export interface Paths {
  start: string;
  newHome: string;
  home: string;
  check: (checkId: string) => string;
  result: (checkId: string) => string;
  status: string;
  card: string;
  reminders: string;
  claim: string;
  settings: string;
  adjuster: (claimId: string) => string;
}

export function makePaths(basePath: string, adjusterBase: string): Paths {
  const b = basePath.replace(/\/+$/, "");
  const a = adjusterBase.replace(/\/+$/, "");
  return {
    start: b || "/",
    newHome: `${b}/new`,
    home: `${b}/home`,
    check: (id) => `${b}/check/${encodeURIComponent(id)}`,
    result: (id) => `${b}/result/${encodeURIComponent(id)}`,
    status: `${b}/status`,
    card: `${b}/card`,
    reminders: `${b}/reminders`,
    claim: `${b}/claim`,
    settings: `${b}/settings`,
    adjuster: (id) => `${a}/${encodeURIComponent(id)}`,
  };
}

export interface SaveResult {
  stored: StoredOutcome;
  /** Risks that became prepared with this record. */
  newlyPrepared: Peril[];
}

export type FrostState =
  { status: "loading" } | { status: "ok"; value: FrostForecast } | { status: "error" };

export interface PreparedHomeContextValue {
  ready: boolean;
  storageProblem: boolean;
  lang: Lang;
  setLang: (lang: Lang) => void;
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
  createHome: (input: { homeType: HomeType; hasLeakAlarm: boolean; label: string }) => Home;
  selectHome: (homeId: string) => void;

  outcomeFor: (homeId: string, checkId: string) => StoredOutcome | undefined;
  saveCheckResult: (input: {
    home: Home;
    response: CheckResponse;
    photo: { sha256: string; bytes: Uint8Array };
    previousVerdict: CheckRecord["verdict"] | undefined;
  }) => Promise<SaveResult>;
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
  /** Where the adjuster route lives (default "/adjuster"). */
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
  const fallbackBase = apiBaseUrl ?? defaultApiBaseUrl();
  const [ready, setReady] = useState(false);
  const [storageProblem, setStorageProblem] = useState(false);
  const [settings, setSettings] = useState<Settings>(EMPTY_SETTINGS);
  const [state, setState] = useState<LocalState>(EMPTY_STATE);
  const [outcomes, setOutcomes] = useState<Outcomes>({});
  const [claims, setClaims] = useState<Claims>({});
  const [frost, setFrost] = useState<FrostState>({ status: "loading" });

  // Latest values for callbacks that persist after a state change.
  const stateRef = useRef(state);
  const outcomesRef = useRef(outcomes);
  const claimsRef = useRef(claims);
  const settingsRef = useRef(settings);

  useEffect(() => {
    let alive = true;
    loadAll()
      .then((loaded) => {
        if (!alive) return;
        settingsRef.current = loaded.settings.value;
        stateRef.current = loaded.state.value;
        outcomesRef.current = loaded.outcomes.value;
        claimsRef.current = loaded.claims.value;
        setSettings(loaded.settings.value);
        setState(loaded.state.value);
        setOutcomes(loaded.outcomes.value);
        setClaims(loaded.claims.value);
        setStorageProblem(
          loaded.settings.corrupt ||
            loaded.state.corrupt ||
            loaded.outcomes.corrupt ||
            loaded.claims.corrupt,
        );
      })
      .catch(() => {
        if (alive) setStorageProblem(true);
      })
      .finally(() => {
        if (alive) setReady(true);
      });
    return () => {
      alive = false;
    };
  }, []);

  const lang: Lang = settings.lang ?? defaultLang;
  const effectiveBase = settings.apiBaseUrl ?? fallbackBase;
  const api = useMemo(() => createApi(effectiveBase), [effectiveBase]);
  const t = useCallback<Translate>((key, params) => translate(lang, key, params), [lang]);
  const paths = useMemo(() => makePaths(basePath, adjusterBasePath), [basePath, adjusterBasePath]);

  const updateSettings = useCallback((next: Settings) => {
    settingsRef.current = next;
    setSettings(next);
    saveSettings(next).catch(() => setStorageProblem(true));
  }, []);

  const updateState = useCallback((next: LocalState) => {
    stateRef.current = next;
    setState(next);
    saveState(next).catch(() => setStorageProblem(true));
  }, []);

  const updateOutcomes = useCallback((next: Outcomes) => {
    outcomesRef.current = next;
    setOutcomes(next);
    saveOutcomes(next).catch(() => setStorageProblem(true));
  }, []);

  const setLang = useCallback(
    (next: Lang) => updateSettings({ ...settingsRef.current, lang: next }),
    [updateSettings],
  );

  const setApiBaseUrl = useCallback(
    (url: string | null) => {
      const clean = url && url.trim().length > 0 ? url.trim() : null;
      updateSettings({ ...settingsRef.current, apiBaseUrl: clean });
    },
    [updateSettings],
  );

  const openDemo = useCallback(
    (homeId: string): Home | null => {
      const demo = makeDemo(new Date());
      const home = demo.homes.find((h) => h.homeId === homeId);
      if (!home) return null;
      const records = demo.records.filter((r) => r.homeId === homeId);
      const cur = stateRef.current;
      updateState({
        homes: { ...cur.homes, [homeId]: home },
        records: { ...cur.records, [homeId]: records },
        currentHomeId: homeId,
      });
      const rest = { ...outcomesRef.current };
      delete rest[homeId];
      updateOutcomes(rest);
      return home;
    },
    [updateState, updateOutcomes],
  );

  const createHome = useCallback(
    (input: { homeType: HomeType; hasLeakAlarm: boolean; label: string }): Home => {
      const home: Home = {
        homeId: `home-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
        homeType: input.homeType,
        label: input.label,
        moveInDate: todayIso(),
        hasLeakAlarm: input.hasLeakAlarm,
      };
      const cur = stateRef.current;
      updateState({
        homes: { ...cur.homes, [home.homeId]: home },
        records: { ...cur.records, [home.homeId]: [] },
        currentHomeId: home.homeId,
      });
      return home;
    },
    [updateState],
  );

  const selectHome = useCallback(
    (homeId: string) => {
      const cur = stateRef.current;
      if (cur.homes[homeId]) updateState({ ...cur, currentHomeId: homeId });
    },
    [updateState],
  );

  const recordsFor = useCallback((homeId: string) => state.records[homeId] ?? [], [state.records]);

  const outcomeFor = useCallback(
    (homeId: string, checkId: string) => outcomes[homeId]?.[checkId],
    [outcomes],
  );

  /** Adds a record and reports the risks that this record made prepared (for a calm confirmation). */
  const appendRecord = useCallback(
    (home: Home, record: CheckRecord): Peril[] => {
      const cur = stateRef.current;
      const before = cur.records[home.homeId] ?? [];
      const after = [...before, record];
      updateState({ ...cur, records: { ...cur.records, [home.homeId]: after } });
      const now = new Date();
      const wasPrepared = new Set(
        perilStatuses(home, before, now)
          .filter((p) => p.state === "prepared")
          .map((p) => p.peril),
      );
      return perilStatuses(home, after, now)
        .filter((p) => p.state === "prepared" && !wasPrepared.has(p.peril))
        .map((p) => p.peril);
    },
    [updateState],
  );

  const putOutcome = useCallback(
    (stored: StoredOutcome) => {
      const cur = outcomesRef.current;
      updateOutcomes({
        ...cur,
        [stored.homeId]: { ...(cur[stored.homeId] ?? {}), [stored.checkId]: stored },
      });
    },
    [updateOutcomes],
  );

  const saveCheckResult = useCallback<PreparedHomeContextValue["saveCheckResult"]>(
    async ({ home, response, photo, previousVerdict }) => {
      // The photo stays on the device, keyed by the hash in the record.
      await savePhoto(photo.sha256, photo.bytes);
      const record: CheckRecord = { ...response.record, homeId: home.homeId };
      const newlyPrepared = appendRecord(home, record);
      // A retake (unclear photo) never undoes an earlier decided result; the engine applies the same rule.
      const keptEarlier =
        response.outcome.verdict === "retake" && !!previousVerdict && previousVerdict !== "retake";
      const stored: StoredOutcome = {
        homeId: home.homeId,
        checkId: record.checkId,
        outcome: response.outcome,
        source: response.source,
        sourceNote: response.sourceNote,
        model: response.model,
        clause: response.clause ?? [],
        checkedAt: record.checkedAt,
        photoSha256: record.photoSha256,
        recordReplaced: !keptEarlier,
        previousVerdict,
      };
      putOutcome(stored);
      return { stored, newlyPrepared };
    },
    [appendRecord, putOutcome],
  );

  const markNotApplicable = useCallback(
    (home: Home, checkId: string): SaveResult => {
      const check = getCheck(checkId, home.homeType);
      const outcome = notApplicableOutcome(
        check,
        settingsRef.current.lang ?? defaultLang,
        home.homeType,
      );
      const record = recordFromOutcome(home.homeId, outcome, new Date(), null, home.homeType);
      const newlyPrepared = appendRecord(home, record);
      const stored: StoredOutcome = {
        homeId: home.homeId,
        checkId,
        outcome,
        source: "offline",
        model: "",
        clause: [],
        checkedAt: record.checkedAt,
        photoSha256: null,
        recordReplaced: true,
      };
      putOutcome(stored);
      return { stored, newlyPrepared };
    },
    [appendRecord, putOutcome, defaultLang],
  );

  const saveClaim = useCallback((homeId: string, view: AdjusterView) => {
    const next = {
      ...claimsRef.current,
      [view.claimId]: { view, homeId, createdAt: new Date().toISOString() },
    };
    claimsRef.current = next;
    setClaims(next);
    saveClaims(next).catch(() => setStorageProblem(true));
  }, []);

  const loadFrost = useCallback(
    () =>
      api
        .frost(FROST_PLACE)
        .then((value) =>
          setFrost(
            value && typeof value === "object" ? { status: "ok", value } : { status: "error" },
          ),
        )
        .catch(() => setFrost({ status: "error" })),
    [api],
  );

  const refreshFrost = useCallback(() => {
    setFrost({ status: "loading" });
    void loadFrost();
  }, [loadFrost]);

  // One frost fetch per server address; reminders fall back to the usual dates without it.
  useEffect(() => {
    if (ready) void loadFrost();
  }, [ready, loadFrost]);

  const clearDeviceData = useCallback(async () => {
    await clearHomeData();
    await clearPhotos();
    stateRef.current = EMPTY_STATE;
    outcomesRef.current = {};
    claimsRef.current = {};
    setState(EMPTY_STATE);
    setOutcomes({});
    setClaims({});
  }, []);

  const homes = useMemo(() => Object.values(state.homes), [state.homes]);
  const currentHome = state.currentHomeId ? (state.homes[state.currentHomeId] ?? null) : null;

  const value = useMemo<PreparedHomeContextValue>(
    () => ({
      ready,
      storageProblem,
      lang,
      setLang,
      t,
      theme,
      paths,
      api,
      apiBaseUrl: effectiveBase,
      defaultApiBaseUrl: fallbackBase,
      customApiBaseUrl: settings.apiBaseUrl,
      setApiBaseUrl,
      homes,
      currentHome,
      recordsFor,
      openDemo,
      createHome,
      selectHome,
      outcomeFor,
      saveCheckResult,
      markNotApplicable,
      claims,
      saveClaim,
      frost,
      refreshFrost,
      clearDeviceData,
    }),
    [
      ready,
      storageProblem,
      lang,
      setLang,
      t,
      theme,
      paths,
      api,
      effectiveBase,
      fallbackBase,
      settings.apiBaseUrl,
      setApiBaseUrl,
      homes,
      currentHome,
      recordsFor,
      openDemo,
      createHome,
      selectHome,
      outcomeFor,
      saveCheckResult,
      markNotApplicable,
      claims,
      saveClaim,
      frost,
      refreshFrost,
      clearDeviceData,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePreparedHome(): PreparedHomeContextValue {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("usePreparedHome must be used inside <PreparedHomeProvider>");
  return ctx;
}

export function useTheme(): Theme {
  return usePreparedHome().theme;
}
