import { View } from "react-native";

import { useTheme } from "../context";
import { PressableScale } from "./Pressable";
import { Txt } from "./Text";

/** A row of choices (Yes/No, languages, home types). Each option is a 48 px tap target. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  testIDPrefix,
  inverse,
}: {
  options: { value: T; label: string }[];
  value: T | null;
  onChange: (v: T) => void;
  testIDPrefix: string;
  inverse?: boolean;
}) {
  const theme = useTheme();
  const c = theme.colors;
  return (
    <View
      accessibilityRole="radiogroup"
      style={{ flexDirection: "row", flexWrap: "wrap", gap: theme.space.sm }}
    >
      {options.map((o) => {
        const selected = o.value === value;
        const fg = selected ? c.primaryText : inverse ? c.textInverse : c.text;
        return (
          <PressableScale
            key={o.value}
            testID={`${testIDPrefix}-${o.value}`}
            accessibilityRole="radio"
            accessibilityState={{ selected, checked: selected }}
            accessibilityLabel={o.label}
            onPress={() => onChange(o.value)}
            style={{
              minHeight: theme.layout.button,
              minWidth: 72,
              paddingHorizontal: theme.space.lg,
              borderRadius: theme.radius.button,
              borderWidth: 1.5,
              borderColor: selected ? c.primary : inverse ? c.textInverseMuted : c.line,
              backgroundColor: selected ? c.primary : inverse ? "transparent" : c.surface,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Txt color={fg}>{o.label}</Txt>
          </PressableScale>
        );
      })}
    </View>
  );
}
