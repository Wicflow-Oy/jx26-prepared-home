import { DEDUCTIBLE_CONCEPT_LABEL } from "@prepared-home/engine";
import type { ReactNode } from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";

import { usePreparedHome, useTheme } from "../context";
import { Icon, type IconName } from "../icons";
import type { Tone } from "../model";
import type { Theme } from "../theme";
import { Appear } from "./Appear";
import { PressableScale } from "./Pressable";
import { Txt } from "./Text";

export function toneColors(theme: Theme, tone: Tone): { fg: string; bg: string } {
  const c = theme.colors;
  switch (tone) {
    case "success":
      return { fg: c.success, bg: c.successBg };
    case "warning":
      return { fg: c.warning, bg: c.warningBg };
    case "danger":
      return { fg: c.danger, bg: c.dangerBg };
    case "info":
      return { fg: c.info, bg: c.infoBg };
    default:
      return { fg: c.textMuted, bg: c.sand };
  }
}

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
          marginBottom: theme.space.md,
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
    <View testID={testID} style={{ marginTop: theme.space.lg, marginBottom: theme.space.lg }}>
      {title ? (
        <Txt variant="smallStrong" role="header" style={{ marginBottom: theme.space.sm }}>
          {title}
        </Txt>
      ) : null}
      {children}
    </View>
  );
}

/** A small status label (Fix first, Verified …). */
export function Tag({
  label,
  tone = "neutral",
  testID,
}: {
  label: string;
  tone?: Tone;
  testID?: string;
}) {
  const theme = useTheme();
  const colors = toneColors(theme, tone);
  return (
    <View
      testID={testID}
      style={{
        backgroundColor: colors.bg,
        borderRadius: theme.radius.sm,
        paddingHorizontal: theme.space.sm,
        minHeight: 24,
        justifyContent: "center",
        alignSelf: "flex-start",
      }}
    >
      <Txt variant="caption" color={colors.fg}>
        {label}
      </Txt>
    </View>
  );
}

/** "Concept: If decides the amount", shown next to every deductible figure. */
export function ConceptTag({ testID }: { testID?: string }) {
  const theme = useTheme();
  const { lang } = usePreparedHome();
  return (
    <View
      testID={testID}
      style={{
        borderWidth: 1,
        borderColor: theme.colors.line,
        backgroundColor: theme.colors.surface,
        borderRadius: theme.radius.sm,
        paddingHorizontal: 6,
        alignSelf: "flex-start",
      }}
    >
      <Txt variant="caption">{DEDUCTIBLE_CONCEPT_LABEL[lang]}</Txt>
    </View>
  );
}

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
        marginBottom: theme.space.md,
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

/** A row in a grouped list, with a tag and a chevron. Enters with a gentle stagger. */
export function ListRow({
  title,
  subtitle,
  tag,
  icon,
  onPress,
  testID,
  index = 0,
  last,
}: {
  title: string;
  subtitle?: string;
  tag?: { label: string; tone: Tone; testID?: string };
  icon?: IconName;
  onPress?: () => void;
  testID?: string;
  index?: number;
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
  return (
    <Appear index={index}>
      {onPress ? (
        <PressableScale
          testID={testID}
          onPress={onPress}
          accessibilityLabel={tag ? `${title}, ${tag.label}` : title}
        >
          {content}
        </PressableScale>
      ) : (
        <View
          testID={testID}
          accessible
          accessibilityLabel={tag ? `${title}, ${tag.label}` : title}
        >
          {content}
        </View>
      )}
    </Appear>
  );
}

/** A white rounded group that holds ListRows. */
export function ListGroup({ children, testID }: { children: ReactNode; testID?: string }) {
  const theme = useTheme();
  return (
    <View
      testID={testID}
      style={{
        backgroundColor: theme.colors.surface,
        borderRadius: theme.radius.card,
        overflow: "hidden",
        marginBottom: theme.space.md,
      }}
    >
      {children}
    </View>
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
