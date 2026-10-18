import type { ReactNode } from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";

import { useTheme } from "../context";
import type { Theme, Tone } from "../theme";
import { Txt } from "./Text";
import { toneColors } from "./Tag";

export function Gap({ size = "md" }: { size?: keyof Theme["space"] }) {
  const theme = useTheme();
  return <View style={{ height: theme.space[size] }} />;
}

export function Card({
  children,
  testID,
  tone,
  raised,
  style,
}: {
  children: ReactNode;
  testID?: string;
  tone?: Tone;
  /** The one soft shadow the style allows, for the most important card on a screen. */
  raised?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  const colors = tone ? toneColors(theme, tone) : null;
  return (
    <View
      testID={testID}
      style={[
        {
          backgroundColor: colors ? colors.bg : theme.colors.surface,
          borderRadius: theme.radius.card,
          padding: theme.space.lg,
          marginBottom: theme.space.lg,
        },
        raised ? { boxShadow: theme.shadow.card } : null,
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function Section({
  title,
  children,
  testID,
}: {
  title?: string;
  children: ReactNode;
  testID?: string;
}) {
  const theme = useTheme();
  return (
    <View testID={testID} style={{ marginTop: theme.space.xl, marginBottom: theme.space.sm }}>
      {title ? (
        <Txt variant="smallStrong" role="header" style={{ marginBottom: theme.space.sm }}>
          {title}
        </Txt>
      ) : null}
      {children}
    </View>
  );
}
