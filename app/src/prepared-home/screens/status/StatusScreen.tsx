// How prepared the home is: one card per risk, then the alarm note and the next re-check.
import { useRouter } from "expo-router";
import { useState } from "react";
import { View } from "react-native";

import { usePreparedHome, useTheme } from "../../context";
import { formatDate } from "../../i18n";
import { Icon } from "../../icons";
import { homeLabel, useHomeModel, type HomeModel } from "../../model";
import { Appear, Fact, LoadingState, NoHome, Screen, Txt } from "../../ui";
import { DeductibleSheet } from "./DeductibleSheet";
import { RiskCard } from "./RiskCard";

export function StatusScreen() {
  const { t, ready, paths } = usePreparedHome();
  const theme = useTheme();
  const router = useRouter();
  const model = useHomeModel();
  const [explainOpen, setExplainOpen] = useState(false);

  if (!ready || !model) {
    return (
      <Screen testID="status-screen" tone="sandAlt">
        {!ready ? <LoadingState /> : <NoHome />}
      </Screen>
    );
  }

  const leak = model.perils.find((p) => p.peril === "leak");

  return (
    <Screen
      testID="status-screen"
      tone="sandAlt"
      overlay={<DeductibleSheet open={explainOpen} onClose={() => setExplainOpen(false)} />}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: theme.space.xs }}>
        <Icon name="home" size={16} color={theme.colors.textMuted} />
        <Txt variant="small" muted>
          {t("locLine", { label: homeLabel(model.home, t), done: model.done, total: model.total })}
        </Txt>
      </View>
      <Txt variant="display" style={{ marginTop: theme.space.xs, marginBottom: theme.space.lg }}>
        {t("readinessTitle")}
      </Txt>

      {model.perils.map((p, i) => (
        <Appear key={p.peril} index={i}>
          <RiskCard
            status={p}
            model={model}
            onOpen={(id) => router.push(paths.check(id))}
            onExplain={() => setExplainOpen(true)}
          />
        </Appear>
      ))}

      <View style={{ marginTop: theme.space.sm }}>
        {leak?.alarmDeviceLine ? (
          <Fact icon="bell" testID="alarm-line">
            <Txt variant="small">{t("alarmLine")}</Txt>
          </Fact>
        ) : null}
        <NextRecheck model={model} />
      </View>
    </Screen>
  );
}

function NextRecheck({ model }: { model: HomeModel }) {
  const { t, lang } = usePreparedHome();
  const next = model.nextRecheck;
  return (
    <Fact icon="calendar" testID="next-recheck">
      {next ? (
        <>
          <Txt variant="smallStrong">
            {t("recheckTitle", { date: formatDate(next.date, lang) })}
          </Txt>
          <Txt variant="caption">
            {next.checkIds.length > 2
              ? next.checkIds.length === 1
                ? t("recheckCountOne")
                : t("recheckCount", { count: next.checkIds.length })
              : `${next.checkIds.map((id) => model.checkById.get(id)?.title[lang] ?? id).join(", ")}.`}{" "}
            {t("recheckSub")}
          </Txt>
        </>
      ) : (
        <Txt variant="small">{t("noRecheck")}</Txt>
      )}
    </Fact>
  );
}
