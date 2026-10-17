import { DEMO_FLAT_ID, DEMO_HOUSE_ID, makeDemo } from "@prepared-home/engine";
import { useRouter, type Href } from "expo-router";

import { usePreparedHome, useTheme } from "../context";
import { Appear, Banner, Button, Card, Gap, IconButton, LoadingState, Screen, Txt } from "../ui";

const HAS_HOUSE_DEMO = makeDemo().homes.some((h) => h.homeId === DEMO_HOUSE_ID);

export function StartScreen() {
  const { t, paths, ready, currentHome, openDemo, storageProblem } = usePreparedHome();
  const router = useRouter();
  const theme = useTheme();

  const go = (homeId: string) => {
    if (openDemo(homeId)) router.push(paths.home as Href);
  };

  const actions = [
    currentHome ? (
      <Button
        key="continue"
        label={t("continueHome", { label: currentHome.label })}
        onPress={() => router.push(paths.home as Href)}
        testID="continue-home"
      />
    ) : null,
    <Button
      key="flat"
      label={t("demoFlat")}
      onPress={() => go(DEMO_FLAT_ID)}
      testID="demo-flat"
      variant={currentHome ? "secondary" : "primary"}
    />,
    <Button
      key="fresh"
      label={t("startFresh")}
      onPress={() => router.push(paths.newHome as Href)}
      testID="start-fresh"
      variant="secondary"
    />,
    HAS_HOUSE_DEMO ? (
      <Button
        key="house"
        label={t("houseDemo")}
        onPress={() => go(DEMO_HOUSE_ID)}
        testID="demo-house"
        variant="secondary"
      />
    ) : null,
  ].filter(Boolean);

  return (
    <Screen
      testID="start-screen"
      back={false}
      right={
        <IconButton
          icon="sliders"
          label={t("settings")}
          onPress={() => router.push(paths.settings as Href)}
          testID="open-settings"
        />
      }
    >
      <Gap size="lg" />
      <Txt variant="display">{t("tagline")}</Txt>
      <Gap size="sm" />
      <Txt muted>{t("startIntro")}</Txt>
      <Gap size="xl" />

      {!ready ? (
        <LoadingState testID="start-loading" />
      ) : (
        <>
          {storageProblem ? <Banner tone="warning">{t("errStorage")}</Banner> : null}
          {actions.map((a, i) => (
            <Appear key={i} index={i} style={{ marginBottom: theme.space.md }}>
              {a}
            </Appear>
          ))}
          <Txt variant="caption">{t("demoResetNote")}</Txt>
        </>
      )}

      <Gap size="xl" />
      <Card testID="prototype-note">
        <Txt variant="smallStrong">{t("prototypeTitle")}</Txt>
        <Gap size="xs" />
        <Txt variant="small" muted>
          {t("prototypeNote")}
        </Txt>
      </Card>
    </Screen>
  );
}
