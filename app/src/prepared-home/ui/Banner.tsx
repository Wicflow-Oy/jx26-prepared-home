import type { ReactNode } from "react";
import { View } from "react-native";

import { useTheme } from "../context";
import { Icon, type IconName } from "../icons";
import type { Tone } from "../model";
import { Txt } from "./Text";
import { toneColors } from "./Tag";

export function Banner({
  tone,
  icon,
  children,
  testID,
}: {
  tone: Tone;
  icon?: IconName;
  children: ReactNode;
  testID?: string;
}) {
  const theme = useTheme();
  const colors = toneColors(theme, tone);
  return (
    <View
      testID={testID}
      accessibilityRole={tone === "danger" || tone === "warning" ? "alert" : undefined}
      style={{
        backgroundColor: colors.bg,
        borderRadius: theme.radius.button,
        padding: theme.space.md,
        marginBottom: theme.space.lg,
        flexDirection: "row",
        gap: theme.space.md,
        alignItems: "flex-start",
      }}
    >
      {icon ? <Icon name={icon} size={20} color={colors.fg} /> : null}
      <View style={{ flex: 1 }}>
        {typeof children === "string" ? (
          <Txt variant="small" color={tone === "neutral" ? theme.colors.text : colors.fg}>
            {children}
          </Txt>
        ) : (
          children
        )}
      </View>
    </View>
  );
}

/** One line with a leading icon, used for facts such as the alarm line and the next re-check. */
export function Fact({
  icon,
  children,
  testID,
}: {
  icon: IconName;
  children: ReactNode;
  testID?: string;
}) {
  const theme = useTheme();
  return (
    <View
      testID={testID}
      style={{
        flexDirection: "row",
        gap: theme.space.md,
        paddingVertical: theme.space.sm,
        alignItems: "flex-start",
      }}
    >
      <Icon name={icon} size={20} color={theme.colors.textMuted} />
      <View style={{ flex: 1 }}>{children}</View>
    </View>
  );
}
