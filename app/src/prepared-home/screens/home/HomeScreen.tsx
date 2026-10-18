// The home: progress, the next step, this week, every check and links to the other screens.
import { useRouter } from "expo-router";
import { View } from "react-native";

import { usePreparedHome, useTheme } from "../../context";
import { formatMoney } from "../../i18n";
import { homeLabel, useHomeModel } from "../../model";
import {
  AmountsTag,
  Gap,
  IconButton,
  ListGroup,
  ListRow,
  LoadingState,
  NoHome,
  Screen,
  Section,
  Txt,
  useAfterTransition,
} from "../../ui";
import { AllChecksList } from "./AllChecksList";
import { NextStepCard } from "./NextStepCard";
import { ProgressSummary } from "./ProgressSummary";
import { WeekSection } from "./WeekSection";

export function HomeScreen() {
  const { t, lang, paths, ready } = usePreparedHome();
  const theme = useTheme();
  const router = useRouter();
  const model = useHomeModel();
  const afterTransition = useAfterTransition();
  const go = (path: string) => router.push(path);

  const settingsButton = (
    <IconButton
      icon="sliders"
      label={t("settings")}
      onPress={() => go(paths.settings)}
      testID="nav-settings"
    />
  );

  if (!ready || !model) {
    return (
      <Screen testID="home-screen" back={false} right={settingsButton}>
        {!ready ? <LoadingState /> : <NoHome />}
      </Screen>
    );
  }

  const deductible = model.perils[0]?.deductible;
  const openCheck = (id: string) => go(paths.check(id));

  return (
    <Screen testID="home-screen" back={false} right={settingsButton}>
      <Txt variant="display">{t("homeTitle")}</Txt>
      <Gap size="xs" />
      <Txt variant="small" muted>
        {homeLabel(model.home, t)}
      </Txt>
      <Gap size="xs" />
      <Txt muted>{t("homeLede")}</Txt>

      <ProgressSummary model={model} />
      <NextStepCard model={model} onOpen={openCheck} />

      {/* Below the fold: rendered once the opening transition is over. */}
      {afterTransition ? (
        <>
          <WeekSection model={model} />

          {deductible ? (
            <View
              testID="reward-card"
              style={{
                paddingTop: theme.space.sm,
                borderTopWidth: 1,
                borderTopColor: theme.colors.line,
              }}
            >
              <Txt variant="small">
                {t("rewardBody", {
                  standard: formatMoney(deductible.standard, lang),
                  prepared: formatMoney(deductible.prepared, lang),
                })}
              </Txt>
              <Gap size="xs" />
              <AmountsTag testID="reward-amounts-tag" />
            </View>
          ) : null}

          <AllChecksList model={model} onOpen={openCheck} />

          <Section title={t("moreTitle")}>
            <ListGroup index={model.perils.length}>
              <ListRow
                icon="drop"
                title={t("navStatus")}
                onPress={() => go(paths.status)}
                testID="nav-status"
              />
              <ListRow
                icon="card"
                title={t("navCard")}
                onPress={() => go(paths.card)}
                testID="nav-card"
              />
              <ListRow
                icon="bell"
                title={t("navReminders")}
                onPress={() => go(paths.reminders)}
                testID="nav-reminders"
              />
              <ListRow
                icon="claim"
                title={t("navClaim")}
                onPress={() => go(paths.claim)}
                testID="nav-claim"
                last
              />
            </ListGroup>
          </Section>
        </>
      ) : null}
    </Screen>
  );
}
