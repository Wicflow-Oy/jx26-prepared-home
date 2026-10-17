import type { HomeType } from "@prepared-home/engine";
import { Image } from "expo-image";
import { View } from "react-native";

import type { SamplePhoto } from "../../api";
import { useT, useTheme } from "../../context";
import { formatDate } from "../../i18n";
import { verdictLabel } from "../../model";
import { Appear, EmptyState, ErrorState, LoadingState, PressableScale, Txt } from "../../ui";
import { SampleCredit } from "./SampleCredit";

export type SamplesState =
  { status: "idle" | "loading" | "error" } | { status: "ok"; list: SamplePhoto[] };

/**
 * Whether an example photo fits this check. In a flat the water check is about an appliance's own
 * shut-off valve, so the main-valve photos are offered only for houses and cottages.
 */
const fitsCheck = (s: SamplePhoto, checkId: string, homeType: HomeType) =>
  s.checkId === checkId && !(checkId === "L1" && homeType === "flat");

/** Example photos for people without a camera at hand, each with its credit line. */
export function SampleList({
  state,
  checkId,
  homeType,
  onPick,
  onRetry,
  disabled,
  resolve,
}: {
  state: SamplesState;
  checkId: string;
  homeType: HomeType;
  onPick: (s: SamplePhoto) => void;
  onRetry: () => void;
  disabled: boolean;
  resolve: (url: string) => string;
}) {
  const { t, lang } = useT();
  const theme = useTheme();
  if (state.status === "error") {
    return (
      <ErrorState
        message={`${t("samplesError")} ${t("errOffline")}`}
        onRetry={onRetry}
        testID="samples-error"
        retryTestID="samples-retry"
      />
    );
  }
  if (state.status !== "ok")
    return <LoadingState label={t("samplesLoading")} testID="samples-loading" />;
  if (state.list.length === 0)
    return <EmptyState message={t("samplesEmpty")} testID="samples-empty" />;

  const matching = state.list.filter((s) => fitsCheck(s, checkId, homeType));
  const shown = matching.length > 0 ? matching : state.list;
  return (
    <View testID="samples-list">
      {matching.length === 0 ? (
        <Txt variant="small" muted style={{ marginBottom: theme.space.sm }}>
          {t("samplesOtherCheck")}
        </Txt>
      ) : null}
      {shown.map((s, i) => (
        <Appear key={s.id} index={i}>
          <PressableScale
            testID={`sample-${s.id}`}
            accessibilityLabel={`${t("useSample")}: ${s.title ?? t("sampleFor", { id: s.checkId })}`}
            disabled={disabled}
            onPress={() => onPick(s)}
            style={{
              flexDirection: "row",
              gap: theme.space.md,
              padding: theme.space.sm,
              borderRadius: theme.radius.card,
              backgroundColor: theme.colors.surface,
              marginBottom: theme.space.sm,
            }}
          >
            <Image
              source={{ uri: resolve(s.url) }}
              style={{
                width: 72,
                height: 72,
                borderRadius: theme.radius.button,
                backgroundColor: theme.colors.viewfinder,
              }}
              contentFit="cover"
              transition={200}
              accessibilityIgnoresInvertColors
            />
            <View style={{ flex: 1, justifyContent: "center", gap: theme.space.xxs }}>
              <Txt variant="small">{s.title ?? t("sampleFor", { id: s.checkId })}</Txt>
              <Txt variant="caption">
                {t("sampleFor", { id: s.checkId })}
                {s.expectedVerdict
                  ? ` · ${t("sampleShows", { verdict: verdictLabel(s.expectedVerdict, lang) })}`
                  : ""}
                {s.recordedAt ? ` · ${t("sourceCached")} (${formatDate(s.recordedAt, lang)})` : ""}
              </Txt>
              <SampleCredit sample={s} />
            </View>
          </PressableScale>
        </Appear>
      ))}
    </View>
  );
}
