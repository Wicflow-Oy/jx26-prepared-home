import { DEDUCTIBLE_CONCEPT_LABEL } from "@prepared-home/engine";
import { View } from "react-native";

import { usePreparedHome, useTheme } from "../context";
import type { Tone } from "../model";
import type { Theme } from "../theme";
import { Txt } from "./Text";

export function toneColors(theme: Theme, tone: Tone): { fg: string; bg: string } {
  const c = theme.colors;
  switch (tone) {
    case "success":
      return { fg: c.success, bg: c.successBg };
    case "warning":
      return { fg: c.warning, bg: c.warningBg };
    case "danger":
      return { fg: c.danger, bg: c.dangerBg };
    case "info":
      return { fg: c.info, bg: c.infoBg };
    default:
      return { fg: c.textMuted, bg: c.sand };
  }
}

/** A small status label (Fix first, Verified …). */
export function Tag({
  label,
  tone = "neutral",
  testID,
}: {
  label: string;
  tone?: Tone;
  testID?: string;
}) {
  const theme = useTheme();
  const colors = toneColors(theme, tone);
  return (
    <View
      testID={testID}
      style={{
        backgroundColor: colors.bg,
        borderRadius: theme.radius.sm,
        paddingHorizontal: theme.space.sm,
        minHeight: 24,
        justifyContent: "center",
        alignSelf: "flex-start",
      }}
    >
      <Txt variant="caption" color={colors.fg}>
        {label}
      </Txt>
    </View>
  );
}

/** "Concept: If decides the amount", shown next to every deductible figure. */
export function AmountsTag({ testID }: { testID?: string }) {
  const theme = useTheme();
  const { lang } = usePreparedHome();
  return (
    <View
      testID={testID}
      style={{
        borderWidth: 1,
        borderColor: theme.colors.line,
        backgroundColor: theme.colors.surface,
        borderRadius: theme.radius.sm,
        paddingHorizontal: 6,
        alignSelf: "flex-start",
      }}
    >
      <Txt variant="caption">{DEDUCTIBLE_CONCEPT_LABEL[lang]}</Txt>
    </View>
  );
}
