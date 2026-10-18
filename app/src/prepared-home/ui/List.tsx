import type { ReactNode } from "react";
import { View } from "react-native";

import { useTheme } from "../context";
import { Icon, type IconName } from "../icons";
import type { Tone } from "../theme";
import { Appear } from "./Appear";
import { PressableScale } from "./Pressable";
import { Tag } from "./Tag";
import { Txt } from "./Text";

/** A row in a grouped list, with a tag and a chevron. */
export function ListRow({
  title,
  subtitle,
  tag,
  icon,
  onPress,
  testID,
  last,
}: {
  title: string;
  subtitle?: string;
  tag?: { label: string; tone: Tone; testID?: string };
  icon?: IconName;
  onPress?: () => void;
  testID?: string;
  last?: boolean;
}) {
  const theme = useTheme();
  const content = (
    <View
      style={{
        minHeight: 56,
        flexDirection: "row",
        alignItems: "center",
        gap: theme.space.md,
        paddingVertical: theme.space.sm,
        paddingHorizontal: theme.space.lg,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: theme.colors.line,
      }}
    >
      {icon ? <Icon name={icon} size={20} color={theme.colors.textMuted} /> : null}
      <View style={{ flex: 1, gap: theme.space.xxs }}>
        <Txt>{title}</Txt>
        {subtitle ? <Txt variant="caption">{subtitle}</Txt> : null}
      </View>
      {tag ? (
        <View>
          <Tag label={tag.label} tone={tag.tone} testID={tag.testID} />
        </View>
      ) : null}
      {onPress ? <Icon name="chevronRight" size={20} color={theme.colors.textMuted} /> : null}
    </View>
  );
  const label = tag ? `${title}, ${tag.label}` : title;
  return onPress ? (
    <PressableScale testID={testID} onPress={onPress} accessibilityLabel={label}>
      {content}
    </PressableScale>
  ) : (
    <View testID={testID} accessible accessibilityLabel={label}>
      {content}
    </View>
  );
}

/**
 * A white rounded group that holds ListRows. The group enters as one piece: animating every row
 * separately cost dropped frames on a real phone while the screen was still mounting.
 */
export function ListGroup({
  children,
  testID,
  index = 0,
}: {
  children: ReactNode;
  testID?: string;
  index?: number;
}) {
  const theme = useTheme();
  return (
    <Appear
      index={index}
      testID={testID}
      style={{
        backgroundColor: theme.colors.surface,
        borderRadius: theme.radius.card,
        overflow: "hidden",
        marginBottom: theme.space.lg,
      }}
    >
      {children}
    </Appear>
  );
}

export function KeyValue({
  label,
  value,
  testID,
}: {
  label: string;
  value: string;
  testID?: string;
}) {
  const theme = useTheme();
  return (
    <View
      testID={testID}
      style={{
        flexDirection: "row",
        flexWrap: "wrap",
        columnGap: theme.space.sm,
        marginBottom: theme.space.xs,
      }}
    >
      <Txt variant="label">{label}</Txt>
      <Txt variant="small">{value}</Txt>
    </View>
  );
}
