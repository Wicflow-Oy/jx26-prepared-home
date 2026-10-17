import type { ReactNode } from "react";
import { View } from "react-native";

import { useTheme } from "../../context";
import { Icon, type IconName } from "../../icons";

/** A quiet sand box with an icon: one piece of supporting information on the result page. */
export function InfoBlock({
  icon,
  tone,
  children,
  testID,
}: {
  icon: IconName;
  tone?: "warning";
  children: ReactNode;
  testID?: string;
}) {
  const theme = useTheme();
  const warning = tone === "warning";
  return (
    <View
      testID={testID}
      style={{
        flexDirection: "row",
        gap: theme.space.md,
        marginTop: theme.space.md,
        paddingVertical: theme.space.sm,
        paddingHorizontal: theme.space.md,
        borderRadius: theme.radius.card,
        backgroundColor: warning ? theme.colors.warningBg : theme.colors.sand,
      }}
    >
      <Icon name={icon} size={20} color={warning ? theme.colors.warning : theme.colors.textMuted} />
      <View style={{ flex: 1, gap: theme.space.xxs }}>{children}</View>
    </View>
  );
}
