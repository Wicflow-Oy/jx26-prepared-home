import { Pressable, View } from "react-native";

import { useTheme } from "../context";
import { Txt } from "./Text";

const TRACK_WIDTH = 52;
const TRACK_HEIGHT = 32;
const THUMB = 26;

/** A setting that is on or off: the whole row is one switch for touch, keyboards and screen readers. */
export function ToggleRow({
  label,
  hint,
  value,
  onChange,
  testID,
}: {
  label: string;
  hint?: string;
  value: boolean;
  onChange: (value: boolean) => void;
  testID?: string;
}) {
  const theme = useTheme();
  return (
    <Pressable
      testID={testID}
      onPress={() => onChange(!value)}
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityHint={hint}
      accessibilityState={{ checked: value }}
      aria-checked={value}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: theme.space.md,
        minHeight: theme.layout.button,
        paddingVertical: theme.space.sm,
      }}
    >
      <View style={{ flex: 1 }}>
        <Txt variant="bodyStrong">{label}</Txt>
        {hint ? (
          <Txt variant="caption" style={{ marginTop: theme.space.xxs }}>
            {hint}
          </Txt>
        ) : null}
      </View>
      <View
        aria-hidden
        style={{
          width: TRACK_WIDTH,
          height: TRACK_HEIGHT,
          borderRadius: TRACK_HEIGHT / 2,
          padding: (TRACK_HEIGHT - THUMB) / 2,
          alignItems: value ? "flex-end" : "flex-start",
          backgroundColor: value ? theme.colors.primary : theme.colors.line,
        }}
      >
        <View
          style={{
            width: THUMB,
            height: THUMB,
            borderRadius: THUMB / 2,
            backgroundColor: theme.colors.surface,
          }}
        />
      </View>
    </Pressable>
  );
}
