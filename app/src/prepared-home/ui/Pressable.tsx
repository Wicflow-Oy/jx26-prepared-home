import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  View,
  type AccessibilityRole,
  type AccessibilityState,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";

import { useTheme } from "../context";
import { Icon, type IconName } from "../icons";
import { press, springs, useMotion } from "../motion";
import { Txt } from "./Text";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * The one pressable used across the app: it dips on touch-down (UI thread, within a frame) and springs
 * back on release. With Reduce motion it only dims.
 */
export function PressableScale({
  children,
  onPress,
  disabled,
  style,
  testID,
  accessibilityLabel,
  accessibilityHint,
  accessibilityRole = "button",
  accessibilityState,
  hitSlop,
}: {
  children: ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessibilityRole?: AccessibilityRole;
  accessibilityState?: AccessibilityState;
  hitSlop?: number;
}) {
  const { reduced } = useMotion();
  const pressed = useSharedValue(0);
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: (disabled ? 0.45 : 1) * (1 - pressed.get() * (1 - press.opacity)),
    transform: [{ scale: reduced ? 1 : 1 - pressed.get() * (1 - press.scale) }],
  }));
  return (
    <AnimatedPressable
      testID={testID}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!disabled, ...accessibilityState }}
      disabled={disabled}
      hitSlop={hitSlop}
      onPress={onPress}
      onPressIn={() => {
        pressed.set(withSpring(1, springs.snappy));
      }}
      onPressOut={() => {
        pressed.set(withSpring(0, springs.snappy));
      }}
      style={[style, animatedStyle]}
    >
      {children}
    </AnimatedPressable>
  );
}

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "inverse" | "light";

export function Button({
  label,
  sublabel,
  onPress,
  variant = "primary",
  icon,
  testID,
  disabled,
  loading,
  accessibilityHint,
  style,
}: {
  label: string;
  sublabel?: string;
  onPress: () => void;
  variant?: ButtonVariant;
  icon?: IconName;
  testID?: string;
  disabled?: boolean;
  loading?: boolean;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  const c = theme.colors;
  const palette = {
    primary: { bg: c.primary, fg: c.primaryText, border: c.primary },
    secondary: { bg: "transparent", fg: c.primary, border: c.primary },
    ghost: { bg: "transparent", fg: c.primary, border: "transparent" },
    danger: { bg: "transparent", fg: c.danger, border: c.danger },
    inverse: { bg: "rgba(250, 249, 247, 0.12)", fg: c.textInverse, border: "transparent" },
    // The main action on the blue camera screen.
    light: { bg: c.textInverse, fg: c.primary, border: c.textInverse },
  }[variant];
  return (
    <PressableScale
      testID={testID}
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityLabel={sublabel ? `${label}, ${sublabel}` : label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ busy: !!loading }}
      style={[
        {
          minHeight: theme.layout.button,
          borderRadius: theme.radius.button,
          borderWidth: variant === "ghost" || variant === "inverse" ? 0 : 1.5,
          borderColor: palette.border,
          backgroundColor: palette.bg,
          paddingHorizontal: variant === "ghost" ? theme.space.xs : theme.space.lg,
          paddingVertical: theme.space.sm,
          alignItems: variant === "ghost" ? "flex-start" : "center",
          justifyContent: "center",
        },
        style,
      ]}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: theme.space.sm }}>
        {loading ? (
          <ActivityIndicator color={palette.fg} />
        ) : icon ? (
          <Icon name={icon} size={20} color={palette.fg} />
        ) : null}
        <Txt variant="bodyStrong" color={palette.fg} style={{ textAlign: "center" }}>
          {label}
        </Txt>
      </View>
      {sublabel ? (
        <Txt variant="small" color={palette.fg} style={{ opacity: 0.9, textAlign: "center" }}>
          {sublabel}
        </Txt>
      ) : null}
    </PressableScale>
  );
}

/** A round 44 px icon button for app bars. */
export function IconButton({
  icon,
  label,
  onPress,
  testID,
  inverse,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  testID?: string;
  inverse?: boolean;
}) {
  const theme = useTheme();
  return (
    <PressableScale
      testID={testID}
      onPress={onPress}
      accessibilityLabel={label}
      hitSlop={4}
      style={{
        width: theme.layout.tapTarget,
        height: theme.layout.tapTarget,
        borderRadius: theme.layout.tapTarget / 2,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: inverse ? "rgba(250, 249, 247, 0.10)" : "transparent",
      }}
    >
      <Icon name={icon} color={inverse ? theme.colors.textInverse : theme.colors.text} />
    </PressableScale>
  );
}
