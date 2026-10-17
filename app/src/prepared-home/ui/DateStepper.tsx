import { View } from "react-native";

import { usePreparedHome, useTheme } from "../context";
import { formatDate, todayIso } from "../i18n";
import { Button, IconButton } from "./Pressable";
import { Txt } from "./Text";

/** Moves an ISO date (YYYY-MM-DD) by whole days, in UTC so daylight saving never shifts it. */
export function addDaysIso(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/** A day picker that works the same on phones and the web: previous day, the date, next day. */
export function DateStepper({
  value,
  onChange,
  max,
  testID,
}: {
  value: string;
  onChange: (iso: string) => void;
  /** Latest selectable day, e.g. today for a damage date. */
  max?: string;
  testID?: string;
}) {
  const theme = useTheme();
  const { t, lang } = usePreparedHome();
  const today = todayIso();
  const atMax = !!max && value >= max;
  return (
    <View testID={testID}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: theme.colors.surface,
          borderRadius: theme.radius.card,
          padding: theme.space.xs,
        }}
      >
        <IconButton
          icon="chevronLeft"
          label={t("previousDay")}
          onPress={() => onChange(addDaysIso(value, -1))}
          testID={testID ? `${testID}-previous` : undefined}
        />
        <Txt
          variant="h2"
          style={{ flex: 1, textAlign: "center" }}
          testID={testID ? `${testID}-value` : undefined}
        >
          {formatDate(value, lang)}
        </Txt>
        {atMax ? (
          <View style={{ width: theme.layout.tapTarget }} />
        ) : (
          <IconButton
            icon="chevronRight"
            label={t("nextDay")}
            onPress={() => onChange(addDaysIso(value, 1))}
            testID={testID ? `${testID}-next` : undefined}
          />
        )}
      </View>
      {value !== today ? (
        <Button label={t("today")} onPress={() => onChange(today)} variant="ghost" />
      ) : null}
    </View>
  );
}
