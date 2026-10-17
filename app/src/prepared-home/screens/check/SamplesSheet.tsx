import type { HomeType } from "@prepared-home/engine";
import { useCallback, useEffect, useRef, useState } from "react";

import type { SamplePhoto } from "../../api";
import { usePreparedHome } from "../../context";
import { BottomSheet, Gap, Txt } from "../../ui";
import { SampleList, type SamplesState } from "./SampleList";

/** The example photos, loaded the first time the sheet opens. */
export function SamplesSheet({
  open,
  onClose,
  checkId,
  homeType,
  onPick,
  disabled,
}: {
  open: boolean;
  onClose: () => void;
  checkId: string;
  homeType: HomeType;
  onPick: (sample: SamplePhoto) => void;
  disabled: boolean;
}) {
  const { t, lang, api } = usePreparedHome();
  const [samples, setSamples] = useState<SamplesState>({ status: "idle" });
  const requested = useRef(false);

  const fetchSamples = useCallback(
    () =>
      api
        .samples(lang)
        .then((list) => setSamples({ status: "ok", list }))
        .catch(() => setSamples({ status: "error" })),
    [api, lang],
  );

  useEffect(() => {
    if (!open || requested.current) return;
    requested.current = true;
    void fetchSamples();
  }, [open, fetchSamples]);

  return (
    <BottomSheet open={open} onClose={onClose} label={t("samplesTitle")} testID="samples-sheet">
      <Txt variant="h2">{t("samplesTitle")}</Txt>
      <Gap size="sm" />
      <SampleList
        state={samples}
        checkId={checkId}
        homeType={homeType}
        onPick={onPick}
        onRetry={() => {
          setSamples({ status: "loading" });
          void fetchSamples();
        }}
        disabled={disabled}
        resolve={api.resolveAssetUrl}
      />
    </BottomSheet>
  );
}
