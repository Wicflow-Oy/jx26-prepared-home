import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useRef } from "react";
import { View } from "react-native";

import { usePreparedHome, useTheme } from "../context";
import { EXAMPLES, isExampleKey } from "../examples";
import { Icon } from "../icons";
import {
  Appear,
  Banner,
  Button,
  Gap,
  IconButton,
  LanguageSwitch,
  LoadingState,
  Screen,
  Txt,
  VoiceGuidanceToggle,
} from "../ui";

/** Welcome for a new customer. With a home already set up, or an example link, it goes straight on. */
export function StartScreen({ example }: { example?: string }) {
  const { t, paths, ready, currentHome, openDemo, storageProblem } = usePreparedHome();
  const theme = useTheme();
  const router = useRouter();
  const goesOn = ready && (isExampleKey(example) || !!currentHome);
  // Opening an example resets it, so it must happen once per link, not on every state change.
  const openedExample = useRef<string | null>(null);
  const redirecting = useRef(false);
  useFocusEffect(
    useCallback(
      () => () => {
        redirecting.current = false;
      },
      [],
    ),
  );
  // Only while this screen is in front: a home set up from here must not pull the next screen back home.
  useFocusEffect(
    useCallback(() => {
      if (!ready || redirecting.current) return;
      if (isExampleKey(example) && openedExample.current !== example) {
        openedExample.current = example;
        if (!openDemo(EXAMPLES[example].homeId)) return;
      } else if (!currentHome) return;
      redirecting.current = true;
      router.replace(paths.home);
    }, [ready, example, currentHome, openDemo, router, paths.home]),
  );

  const settingsButton = (
    <IconButton
      icon="sliders"
      label={t("settings")}
      onPress={() => router.push(paths.settings)}
      testID="open-settings"
    />
  );

  if (!ready || goesOn) {
    return (
      <Screen testID="start-screen" back={false} right={settingsButton}>
        <LoadingState testID="start-loading" />
      </Screen>
    );
  }

  return (
    <Screen testID="start-screen" back={false} right={settingsButton}>
      <LanguageSwitch />
      <Gap size="sm" />
      <VoiceGuidanceToggle />
      <Gap size="lg" />
      {storageProblem ? <Banner tone="warning">{t("errStorage")}</Banner> : null}
      <Appear>
        <View style={{ flexDirection: "row", gap: theme.space.md, marginBottom: theme.space.lg }}>
          {(["drop", "flame", "home"] as const).map((icon) => (
            <View
              key={icon}
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
          ))}
        </View>
        <Txt variant="display">{t("tagline")}</Txt>
        <Gap size="sm" />
        <Txt muted>{t("welcomeBody")}</Txt>
      </Appear>
      <Gap size="xl" />
      <Appear index={1}>
        <Button
          label={t("getStarted")}
          onPress={() => router.push(paths.newHome)}
          testID="get-started"
        />
      </Appear>
    </Screen>
  );
}
