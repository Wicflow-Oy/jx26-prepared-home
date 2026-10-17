import type { HomeType } from "@prepared-home/engine";
import { useRouter, type Href } from "expo-router";
import { useState } from "react";

import { usePreparedHome } from "../context";
import { formatDate, todayIso, type StringKey } from "../i18n";
import { Button, Gap, LoadingState, Screen, Section, Segmented, Txt } from "../ui";

const HOME_TYPES: HomeType[] = ["flat", "house", "cottage"];

export function NewHomeScreen() {
  const { t, lang, paths, ready, createHome } = usePreparedHome();
  const router = useRouter();
  const [homeType, setHomeType] = useState<HomeType>("flat");
  const [alarm, setAlarm] = useState<"yes" | "no">("no");

  const start = () => {
    createHome({ homeType, hasLeakAlarm: alarm === "yes", label: t("newHomeLabel") });
    router.replace(paths.home as Href);
  };

  return (
    <Screen testID="new-home-screen" backTo={paths.start}>
      <Txt variant="display">{t("startFresh")}</Txt>
      {!ready ? (
        <LoadingState />
      ) : (
        <>
          <Section title={t("homeTypeQuestion")}>
            <Segmented
              testIDPrefix="home-type"
              value={homeType}
              onChange={setHomeType}
              options={HOME_TYPES.map((v) => ({
                value: v,
                label: t(`homeType.${v}` as StringKey),
              }))}
            />
          </Section>
          <Section title={t("leakAlarmQuestion")}>
            <Segmented
              testIDPrefix="leak-alarm"
              value={alarm}
              onChange={setAlarm}
              options={[
                { value: "yes", label: t("yes") },
                { value: "no", label: t("no") },
              ]}
            />
          </Section>
          <Txt variant="small" muted>
            {t("moveInToday", { date: formatDate(todayIso(), lang) })}
          </Txt>
          <Gap size="lg" />
          <Button label={t("startCheckup")} onPress={start} testID="fresh-confirm" />
        </>
      )}
    </Screen>
  );
}
