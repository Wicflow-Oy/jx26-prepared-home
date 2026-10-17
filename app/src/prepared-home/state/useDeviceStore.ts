// The data kept on this device: settings, homes with their records, check results and claims.
// Every change is saved at once. The refs give callbacks the latest value before React re-renders.
import { useCallback, useEffect, useRef, useState, type RefObject } from "react";

import { clearPhotos } from "../photoStore";
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
} from "../storage";

export interface Persisted<T> {
  value: T;
  latest: RefObject<T>;
  /** Shows and saves a new value. */
  update: (next: T) => void;
}

export interface DeviceStore {
  ready: boolean;
  /** Stored data could not be read or written; unreadable data was kept under a backup key. */
  storageProblem: boolean;
  settings: Persisted<Settings>;
  homes: Persisted<LocalState>;
  outcomes: Persisted<Outcomes>;
  claims: Persisted<Claims>;
  clearHomeData: () => Promise<void>;
}

function usePersisted<T>(initial: T, save: (value: T) => Promise<void>, onError: () => void) {
  const [value, setValue] = useState(initial);
  const latest = useRef(initial);
  const replace = useCallback((next: T) => {
    latest.current = next;
    setValue(next);
  }, []);
  const update = useCallback(
    (next: T) => {
      replace(next);
      save(next).catch(onError);
    },
    [replace, save, onError],
  );
  return { value, latest, update, replace };
}

export function useDeviceStore(): DeviceStore {
  const [ready, setReady] = useState(false);
  const [storageProblem, setStorageProblem] = useState(false);
  const fail = useCallback(() => setStorageProblem(true), []);

  const settings = usePersisted<Settings>(EMPTY_SETTINGS, saveSettings, fail);
  const homes = usePersisted<LocalState>(EMPTY_STATE, saveState, fail);
  const outcomes = usePersisted<Outcomes>({}, saveOutcomes, fail);
  const claims = usePersisted<Claims>({}, saveClaims, fail);
  const { replace: replaceSettings } = settings;
  const { replace: replaceHomes } = homes;
  const { replace: replaceOutcomes } = outcomes;
  const { replace: replaceClaims } = claims;

  useEffect(() => {
    let alive = true;
    loadAll()
      .then((loaded) => {
        if (!alive) return;
        replaceSettings(loaded.settings.value);
        replaceHomes(loaded.state.value);
        replaceOutcomes(loaded.outcomes.value);
        replaceClaims(loaded.claims.value);
        const corrupt = [loaded.settings, loaded.state, loaded.outcomes, loaded.claims];
        setStorageProblem(corrupt.some((l) => l.corrupt));
      })
      .catch(() => alive && setStorageProblem(true))
      .finally(() => alive && setReady(true));
    return () => {
      alive = false;
    };
  }, [replaceSettings, replaceHomes, replaceOutcomes, replaceClaims]);

  const clear = useCallback(async () => {
    await clearHomeData();
    await clearPhotos();
    replaceHomes(EMPTY_STATE);
    replaceOutcomes({});
    replaceClaims({});
  }, [replaceHomes, replaceOutcomes, replaceClaims]);

  return { ready, storageProblem, settings, homes, outcomes, claims, clearHomeData: clear };
}
