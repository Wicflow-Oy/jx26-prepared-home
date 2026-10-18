// When the three-monthly quick check was last done, per home. Kept on the device like the rest.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useState } from "react";

const KEY = "prepared-home/quick-check/v1";
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

type LastDone = Record<string, string>; // homeId -> ISO day of the last quick check

async function load(): Promise<LastDone> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    if (!parsed || typeof parsed !== "object") return {};
    return Object.fromEntries(
      Object.entries(parsed).filter(([, day]) => typeof day === "string" && ISO_DAY.test(day)),
    ) as LastDone;
  } catch {
    return {};
  }
}

export function useQuickCheck(homeId: string | null) {
  const [lastDone, setLastDone] = useState<LastDone | null>(null);

  useEffect(() => {
    let live = true;
    void load().then((value) => live && setLastDone(value));
    return () => {
      live = false;
    };
  }, []);

  const markDone = useCallback(
    async (day: string) => {
      if (!homeId) return;
      const next = { ...(await load()), [homeId]: day };
      setLastDone(next);
      await AsyncStorage.setItem(KEY, JSON.stringify(next));
    },
    [homeId],
  );

  return {
    ready: lastDone !== null,
    lastDone: homeId && lastDone ? (lastDone[homeId] ?? null) : null,
    markDone,
  };
}
