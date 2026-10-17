import { useTheme } from "../../context";
import { Icon, type IconName } from "../../icons";
import { PressableScale, Txt } from "../../ui";

/** A tappable line on a risk card that opens the check it is about. */
export function ActionRow({
  icon,
  tone,
  text,
  onPress,
  testID,
}: {
  icon: IconName;
  tone: "fix" | "todo";
  text: string;
  onPress: () => void;
  testID?: string;
}) {
  const theme = useTheme();
  const fix = tone === "fix";
  return (
    <PressableScale
      testID={testID}
      onPress={onPress}
      accessibilityLabel={text}
      style={{
        marginTop: theme.space.md,
        flexDirection: "row",
        alignItems: "center",
        gap: theme.space.md,
        minHeight: theme.layout.tapTarget,
        paddingHorizontal: theme.space.md,
        paddingVertical: theme.space.sm,
        borderRadius: theme.radius.button,
        backgroundColor: fix ? theme.colors.warningBg : theme.colors.backgroundAlt,
      }}
    >
      <Icon name={icon} size={20} color={fix ? theme.colors.warning : theme.colors.textMuted} />
      <Txt variant="small" style={{ flex: 1 }}>
        {text}
      </Txt>
      <Icon name="chevronRight" size={20} color={theme.colors.textMuted} />
    </PressableScale>
  );
}
