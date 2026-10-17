import type { ReactNode } from "react";
import { Text, type StyleProp, type TextStyle } from "react-native";

import { useTheme } from "../context";
import type { Theme } from "../theme";
import { MAX_FONT_SCALE } from "./a11y";

export type TxtVariant =
  | "display"
  | "title"
  | "h2"
  | "lead"
  | "body"
  | "bodyStrong"
  | "small"
  | "smallStrong"
  | "caption"
  | "label";

function variantStyle(theme: Theme, variant: TxtVariant): TextStyle {
  const { size, lineHeight, weight } = theme.font;
  const muted = theme.colors.textMuted;
  switch (variant) {
    case "display":
      return {
        fontSize: size.display,
        lineHeight: lineHeight.display,
        fontWeight: weight.light,
        letterSpacing: -0.2,
      };
    case "title":
      return { fontSize: size.title, lineHeight: lineHeight.title, fontWeight: weight.light };
    case "h2":
      return { fontSize: size.h2, lineHeight: lineHeight.h2, fontWeight: weight.light };
    case "lead":
      return { fontSize: size.lead, lineHeight: lineHeight.lead, fontWeight: weight.light };
    case "body":
      return { fontSize: size.body, lineHeight: lineHeight.body };
    case "bodyStrong":
      return { fontSize: size.body, lineHeight: lineHeight.body, fontWeight: weight.bold };
    case "small":
      return { fontSize: size.small, lineHeight: lineHeight.small };
    case "smallStrong":
      return { fontSize: size.small, lineHeight: lineHeight.small, fontWeight: weight.bold };
    case "caption":
      return { fontSize: size.caption, lineHeight: lineHeight.caption, color: muted };
    case "label":
      return { fontSize: size.small, lineHeight: lineHeight.small, color: muted };
  }
}

const HEADINGS: TxtVariant[] = ["display", "title", "h2"];

export function Txt({
  variant = "body",
  children,
  style,
  testID,
  color,
  muted,
  inverse,
  numberOfLines,
  role,
  selectable,
  onPress,
  maxScale = MAX_FONT_SCALE,
}: {
  variant?: TxtVariant;
  children: ReactNode;
  style?: StyleProp<TextStyle>;
  testID?: string;
  color?: string;
  muted?: boolean;
  inverse?: boolean;
  numberOfLines?: number;
  /** "none" when the text sits inside a heading that already speaks for it. */
  role?: "header" | "alert" | "none";
  selectable?: boolean;
  /** Makes the text a link (also inside another Txt). */
  onPress?: () => void;
  /** A lower cap for text that must stay on one line, such as the app bar. */
  maxScale?: number;
}) {
  const theme = useTheme();
  const base: TextStyle = { color: theme.colors.text, fontFamily: theme.font.family };
  const tone = inverse
    ? { color: muted ? theme.colors.textInverseMuted : theme.colors.textInverse }
    : muted
      ? { color: theme.colors.textMuted }
      : null;
  return (
    <Text
      testID={testID}
      // Text grows with the phone's font size up to twice the design size; layouts are checked at that size.
      maxFontSizeMultiplier={maxScale}
      numberOfLines={numberOfLines}
      selectable={selectable}
      onPress={onPress}
      accessibilityRole={
        role ?? (onPress ? "link" : HEADINGS.includes(variant) ? "header" : undefined)
      }
      style={[base, variantStyle(theme, variant), tone, color ? { color } : null, style]}
    >
      {children}
    </Text>
  );
}
