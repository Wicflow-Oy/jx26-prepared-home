// The FMI frost forecast for reminders. One fetch per server address; reminders use the usual dates without it.
import type { FrostForecast } from "@prepared-home/engine";
import { useCallback, useEffect, useState } from "react";

import type { Api } from "../api";
import { FROST_PLACE } from "../config";

export type FrostState =
  { status: "loading" } | { status: "ok"; value: FrostForecast } | { status: "error" };

export function useFrost(api: Api, ready: boolean) {
  const [frost, setFrost] = useState<FrostState>({ status: "loading" });

  const load = useCallback(
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
    void load();
  }, [load]);

  useEffect(() => {
    if (ready) void load();
  }, [ready, load]);

  return { frost, refreshFrost };
}
