import { useEffect, useRef } from "react";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { useTheme } from "../../context";
import { PressableScale, Txt } from "../../ui";

const AUTO_ADVANCE_MS = 1200;

/** "Next", filling up while it waits, then moving on by itself unless the customer taps first. */
export function AutoNextButton({
  label,
  onPress,
  auto,
}: {
  label: string;
  onPress: () => void;
  auto: boolean;
}) {
  const theme = useTheme();
  const fill = useSharedValue(0);
  const fired = useRef(false);
  // The timer calls the newest handler, so a re-render never restarts the countdown.
  const latest = useRef(onPress);
  useEffect(() => {
    latest.current = onPress;
  }, [onPress]);

  const go = () => {
    if (fired.current) return;
    fired.current = true;
    latest.current();
  };

  useEffect(() => {
    if (!auto) return;
    fill.set(withTiming(1, { duration: AUTO_ADVANCE_MS, easing: Easing.linear }));
    const timer = setTimeout(() => {
      if (fired.current) return;
      fired.current = true;
      latest.current();
    }, AUTO_ADVANCE_MS);
    return () => clearTimeout(timer);
  }, [auto, fill]);

  const fillStyle = useAnimatedStyle(() => ({ width: `${fill.get() * 100}%` }));

  return (
    <PressableScale
      testID="next-check"
      accessibilityLabel={label}
      onPress={go}
      style={{
        marginTop: theme.space.lg,
        minHeight: theme.layout.button,
        borderRadius: theme.radius.button,
        overflow: "hidden",
        backgroundColor: theme.colors.textInverse,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            backgroundColor: theme.colors.primaryTint,
          },
          fillStyle,
        ]}
      />
      <Txt variant="bodyStrong" color={theme.colors.primary}>
        {label}
      </Txt>
    </PressableScale>
  );
}
