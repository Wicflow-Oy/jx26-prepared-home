import type { PerilStatus } from "@prepared-home/engine";
import { View } from "react-native";

import { useT, useTheme } from "../../context";
import { formatDate, formatMoney } from "../../i18n";
import { perilLabel } from "../../model";
import { AmountsTag, TextLink, Txt } from "../../ui";

/** The deductible for one risk, always labelled a concept, with how the lower deductible works. */
export function DeductibleLine({
  status: p,
  onExplain,
}: {
  status: PerilStatus;
  onExplain: () => void;
}) {
  const { t, lang } = useT();
  const theme = useTheme();
  const name = perilLabel(p.peril, lang);
  const money = (amount: number) => formatMoney(amount, lang);
  return (
    <View
      testID={`deductible-${p.peril}`}
      style={{
        marginTop: theme.space.md,
        paddingTop: theme.space.sm,
        borderTopWidth: 1,
        borderTopColor: theme.colors.line,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: theme.space.sm,
          flexWrap: "wrap",
        }}
      >
        <Txt variant="caption">{t("deductiblePreview")}</Txt>
        <AmountsTag testID={`status-amounts-tag-${p.peril}`} />
      </View>
      <Txt style={{ marginTop: theme.space.xs }}>
        {p.state === "prepared" && p.preparedUntil
          ? t("deductibleNowPrepared", {
              peril: name,
              prepared: money(p.deductible.prepared),
              date: formatDate(p.preparedUntil, lang),
            })
          : t("deductibleWhen", {
              peril: name,
              standard: money(p.deductible.standard),
              prepared: money(p.deductible.prepared),
            })}
      </Txt>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: theme.space.sm,
        }}
      >
        <Txt variant="caption">{t("deductibleNow", { current: money(p.deductible.current) })}</Txt>
        <TextLink
          label={t("ddLink")}
          onPress={onExplain}
          tone="primary"
          testID={`deductible-explain-${p.peril}`}
        />
      </View>
    </View>
  );
}
