import { checksFor, type HomeType } from "@prepared-home/engine";
import { useRouter, type Href } from "expo-router";
import { useState } from "react";
import { View } from "react-native";

import { usePreparedHome, useTheme } from "../context";
import { formatDate, todayIso, type StringKey } from "../i18n";
import { Icon, type IconName } from "../icons";
import { Appear, Gap, PressableScale, Screen, Segmented, Txt } from "../ui";
import { DateStepper } from "../ui/DateStepper";

const HOME_TYPES: { type: HomeType; icon: IconName }[] = [
  { type: "flat", icon: "building" },
  { type: "house", icon: "home" },
  { type: "cottage", icon: "cabin" },
];

/** One tap on a home type sets up the home and opens the first check. The details are optional. */
export function NewHomeScreen() {
  const { t, lang, paths, createHome } = usePreparedHome();
  const theme = useTheme();
  const router = useRouter();
  const [moveInDate, setMoveInDate] = useState(todayIso());
  const [changingDate, setChangingDate] = useState(false);
  const [alarm, setAlarm] = useState<"yes" | "no">("no");

  const start = (homeType: HomeType) => {
    createHome({ homeType, moveInDate, hasLeakAlarm: alarm === "yes", label: t("homeName") });
    const first = checksFor(homeType)[0];
    router.replace((first ? paths.check(first.id) : paths.home) as Href);
  };

  return (
    <Screen testID="new-home-screen" backTo={paths.start}>
      <Txt variant="display">{t("homeTypeQuestion")}</Txt>
      <Gap size="lg" />
      {HOME_TYPES.map(({ type, icon }, i) => (
        <Appear key={type} index={i}>
          <PressableScale
            testID={`home-type-${type}`}
            accessibilityRole="button"
            accessibilityLabel={t(`homeType.${type}` as StringKey)}
            onPress={() => start(type)}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: theme.space.lg,
              minHeight: 88,
              paddingHorizontal: theme.space.xl,
              marginBottom: theme.space.md,
              borderRadius: theme.radius.card,
              backgroundColor: theme.colors.surface,
              boxShadow: theme.shadow.card,
            }}
          >
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: theme.colors.primaryTint,
              }}
            >
              <Icon name={icon} color={theme.colors.primary} />
            </View>
            <Txt variant="lead" style={{ flex: 1 }}>
              {t(`homeType.${type}` as StringKey)}
            </Txt>
            <Icon name="chevronRight" color={theme.colors.textMuted} />
          </PressableScale>
        </Appear>
      ))}

      <Gap size="md" />
      <View style={{ flexDirection: "row", alignItems: "center", gap: theme.space.sm }}>
        <Txt variant="small" muted>
          {moveInDate === todayIso()
            ? t("moveInToday")
            : t("moveInOn", { date: formatDate(moveInDate, lang) })}
        </Txt>
        <PressableScale
          testID="change-move-in"
          accessibilityRole="button"
          accessibilityLabel={t("change")}
          onPress={() => setChangingDate((v) => !v)}
          style={{ minHeight: theme.layout.tapTarget, justifyContent: "center" }}
        >
          <Txt variant="smallStrong" color={theme.colors.primary}>
            {t("change")}
          </Txt>
        </PressableScale>
      </View>
      {changingDate ? (
        <DateStepper value={moveInDate} onChange={setMoveInDate} testID="move-in-date" />
      ) : null}

      <Gap size="sm" />
      <Txt variant="small" muted style={{ marginBottom: theme.space.sm }}>
        {t("leakAlarmQuestion")}
      </Txt>
      <Segmented
        testIDPrefix="leak-alarm"
        value={alarm}
        onChange={setAlarm}
        options={[
          { value: "yes", label: t("yes") },
          { value: "no", label: t("no") },
        ]}
      />
    </Screen>
  );
}
