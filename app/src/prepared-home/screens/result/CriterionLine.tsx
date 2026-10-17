import type { CriterionResult } from "@prepared-home/engine";
import { View } from "react-native";

import { useT, useTheme } from "../../context";
import { kindKey } from "../../i18n";
import { Icon } from "../../icons";
import { Txt } from "../../ui";

/**
 * One judged point of a check. The customer's own answers read as yes or no; points from the photo read
 * as OK or not OK. A cold-season point outside October to April is shown but not counted.
 */
export function CriterionLine({
  c,
  text,
  note,
  offSeason,
}: {
  c: CriterionResult;
  text: string;
  note: string | undefined;
  offSeason: boolean;
}) {
  const { t } = useT();
  const theme = useTheme();
  const user = c.kind === "user";
  const notCounted = offSeason && c.met !== true;
  const status = notCounted
    ? t("metSeasonal")
    : c.met === true
      ? t(user ? "yes" : "metYes")
      : c.met === false
        ? t(user ? "no" : "metNo")
        : t("metUnknown");
  const color =
    c.met === true
      ? theme.colors.primary
      : c.met === false && !notCounted
        ? theme.colors.danger
        : theme.colors.textMuted;
  const shownNote = notCounted ? t("coldSeasonOnly") : note;
  return (
    <View
      testID={`criterion-${c.id}`}
      accessible
      accessibilityLabel={`${status}: ${text}`}
      style={{
        flexDirection: "row",
        gap: theme.space.md,
        paddingVertical: theme.space.xs,
        alignItems: "flex-start",
      }}
    >
      <View style={{ width: 20, alignItems: "center", paddingTop: 2 }}>
        {notCounted ? (
          <Icon name="snow" size={20} color={color} />
        ) : c.met === null ? (
          <Txt variant="bodyStrong" color={color}>
            ?
          </Txt>
        ) : (
          <Icon name={c.met ? "check" : "close"} size={20} color={color} strokeWidth={2} />
        )}
      </View>
      <View style={{ flex: 1 }}>
        <Txt>{text}</Txt>
        <Txt variant="caption">
          {t(kindKey(c.kind))} · {status}
          {shownNote ? ` · ${shownNote}` : ""}
        </Txt>
      </View>
    </View>
  );
}
