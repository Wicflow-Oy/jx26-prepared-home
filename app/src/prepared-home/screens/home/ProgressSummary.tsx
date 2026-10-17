import { View } from "react-native";

import { useT, useTheme } from "../../context";
import { Icon, PERIL_ICON } from "../../icons";
import { doneCount, isDoneRow, perilLabel, type HomeModel } from "../../model";
import { ProgressRing, Txt } from "../../ui";

/** The ring with checks done, a line per risk, and the first few checks still to go. */
export function ProgressSummary({ model }: { model: HomeModel }) {
  const { t, lang } = useT();
  const theme = useTheme();
  const fixCount = model.perils.reduce((n, p) => n + p.fixFirst.length, 0);
  const remaining = model.checks.filter((c) => !isDoneRow(model.rowState(c.id)));
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: theme.space.xl,
        marginTop: theme.space.xl,
        flexWrap: "wrap",
      }}
    >
      <ProgressRing
        testID="home-progress"
        done={model.done}
        fixFirst={fixCount}
        total={model.total}
        label={t("countOf", { done: model.done, total: model.total })}
        sublabel={t("ringChecked")}
        gapColor={theme.colors.background}
      />
      <View style={{ flex: 1, minWidth: 160 }}>
        {model.perils.map((p) => (
          <View
            key={p.peril}
            accessible
            accessibilityLabel={`${perilLabel(p.peril, lang)}: ${t("countOf", { done: doneCount(p), total: p.required.length })}`}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: theme.space.sm,
              minHeight: 32,
            }}
          >
            <Icon name={PERIL_ICON[p.peril]} size={20} color={theme.colors.textMuted} />
            <Txt style={{ flex: 1 }}>{perilLabel(p.peril, lang)}</Txt>
            <Txt testID={`home-peril-count-${p.peril}`}>
              {t("countOf", { done: doneCount(p), total: p.required.length })}
            </Txt>
          </View>
        ))}
        {remaining.length > 0 ? (
          <View
            style={{
              marginTop: theme.space.sm,
              paddingTop: theme.space.sm,
              borderTopWidth: 1,
              borderTopColor: theme.colors.line,
            }}
          >
            <Txt variant="small" muted>
              {t("toGo", {
                count: remaining.length,
                items: remaining
                  .slice(0, 3)
                  .map((c) => c.title[lang].toLowerCase())
                  .join(", "),
              })}
            </Txt>
          </View>
        ) : null}
      </View>
    </View>
  );
}
