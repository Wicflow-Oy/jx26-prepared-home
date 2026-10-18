import { quickCheckDue, quickCheckItems } from "@prepared-home/engine";
import { useState } from "react";
import { Pressable, View } from "react-native";

import { usePreparedHome, useTheme } from "../context";
import { haptics } from "../haptics";
import { formatDate, todayIso } from "../i18n";
import { Icon, PERIL_ICON, type IconName } from "../icons";
import { useQuickCheck } from "../quickCheckStore";
import { Banner, Button, Gap, LoadingState, NoHome, Screen, Txt } from "../ui";

/** Every three months: a two-minute checklist without photos. It never changes the deductible. */
export function QuickCheckScreen() {
  const { t, lang, ready, currentHome } = usePreparedHome();
  const theme = useTheme();
  const quick = useQuickCheck(currentHome?.homeId ?? null);
  const [ticked, setTicked] = useState<ReadonlySet<string>>(new Set());
  const [doneOn, setDoneOn] = useState<string | null>(null);

  if (!ready || !quick.ready || !currentHome) {
    return (
      <Screen testID="quick-screen">
        {!ready || !quick.ready ? <LoadingState /> : <NoHome />}
      </Screen>
    );
  }

  const today = todayIso();
  const items = quickCheckItems(currentHome.homeType, today);
  const toggle = (id: string) =>
    setTicked((prev) => {
      const next = new Set(prev);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  const finish = async () => {
    await quick.markDone(today);
    haptics.success();
    setDoneOn(today);
  };

  return (
    <Screen testID="quick-screen">
      <Txt variant="display">{t("quickTitle")}</Txt>
      <Gap size="xs" />
      <Txt muted>{t("quickIntro")}</Txt>
      <Gap size="md" />
      <Banner tone="info" icon="bell" testID="quick-no-effect">
        {t("quickNoEffect")}
      </Banner>
      <Gap size="lg" />
      <View style={{ gap: theme.space.sm }}>
        {items.map((item) => (
          <ChecklistRow
            key={item.id}
            label={item.text[lang]}
            icon={PERIL_ICON[item.peril]}
            checked={ticked.has(item.id)}
            onPress={() => toggle(item.id)}
            testID={`quick-item-${item.id}`}
          />
        ))}
      </View>
      <Gap size="lg" />
      {doneOn ? (
        <Banner tone="success" icon="check" testID="quick-done">
          {t("quickDoneBanner", {
            date: formatDate(quickCheckDue(currentHome.moveInDate, doneOn), lang),
          })}
        </Banner>
      ) : (
        <>
          <Txt variant="caption">
            {t("quickProgress", { done: ticked.size, total: items.length })} ·{" "}
            {t("quickDue", {
              date: formatDate(quickCheckDue(currentHome.moveInDate, quick.lastDone), lang),
            })}
          </Txt>
          <Gap size="sm" />
          <Button label={t("quickFinish")} icon="check" onPress={finish} testID="quick-finish" />
        </>
      )}
    </Screen>
  );
}

/** One item: the whole row is a checkbox for touch, keyboards and screen readers. */
function ChecklistRow({
  label,
  icon,
  checked,
  onPress,
  testID,
}: {
  label: string;
  icon: IconName;
  checked: boolean;
  onPress: () => void;
  testID: string;
}) {
  const theme = useTheme();
  const box = 28;
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      accessibilityRole="checkbox"
      accessibilityLabel={label}
      accessibilityState={{ checked }}
      aria-checked={checked}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: theme.space.md,
        padding: theme.space.lg,
        borderRadius: theme.radius.card,
        backgroundColor: theme.colors.surface,
      }}
    >
      <Icon name={icon} color={theme.colors.primary} />
      <Txt style={{ flex: 1 }}>{label}</Txt>
      <View
        aria-hidden
        style={{
          width: box,
          height: box,
          borderRadius: box / 2,
          alignItems: "center",
          justifyContent: "center",
          borderWidth: 2,
          borderColor: checked ? theme.colors.primary : theme.colors.line,
          backgroundColor: checked ? theme.colors.primary : "transparent",
        }}
      >
        {checked ? <Icon name="check" size={18} color={theme.colors.textInverse} /> : null}
      </View>
    </Pressable>
  );
}
