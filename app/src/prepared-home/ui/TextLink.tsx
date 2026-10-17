import { useTheme } from "../context";
import { Icon, type IconName } from "../icons";
import { PressableScale } from "./Pressable";
import { Txt } from "./Text";

/**
 * A text-only action with a full-size tap target. "quiet" is an underlined secondary choice
 * (Do later, Details); "primary" is a blue link, optionally with an icon.
 */
export function TextLink({
  label,
  onPress,
  testID,
  tone = "quiet",
  inverse,
  icon,
  center,
  hint,
}: {
  label: string;
  onPress: () => void;
  testID?: string;
  tone?: "quiet" | "primary";
  inverse?: boolean;
  icon?: IconName;
  center?: boolean;
  hint?: string;
}) {
  const theme = useTheme();
  const primary = tone === "primary";
  const color = primary
    ? inverse
      ? theme.colors.textInverse
      : theme.colors.primary
    : inverse
      ? theme.colors.textInverseMuted
      : theme.colors.textMuted;
  return (
    <PressableScale
      testID={testID}
      onPress={onPress}
      accessibilityRole={primary ? "link" : "button"}
      accessibilityLabel={label}
      accessibilityHint={hint}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: theme.space.xs,
        minHeight: theme.layout.tapTarget,
        alignSelf: center ? "center" : "flex-start",
        paddingHorizontal: center ? theme.space.sm : 0,
      }}
    >
      {icon ? <Icon name={icon} size={18} color={color} /> : null}
      <Txt
        variant={primary ? "smallStrong" : "small"}
        color={color}
        style={primary ? undefined : { textDecorationLine: "underline" }}
      >
        {label}
      </Txt>
    </PressableScale>
  );
}
