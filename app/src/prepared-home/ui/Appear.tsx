import { useEffect, type ReactNode } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";

import { durations, easeOut, stagger, useMotion } from "../motion";

/**
 * Fades and lifts its content in on mount, staggered by `index`. Driven by a shared value rather than a
 * layout animation, so it behaves the same on web and native and never changes layout.
 */
export function Appear({
  index = 0,
  duration = durations.base,
  children,
  style,
  testID,
}: {
  index?: number;
  duration?: number;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}) {
  const { reduced } = useMotion();
  const progress = useSharedValue(0);
  useEffect(() => {
    const delay = Math.min(index, stagger.maxSteps) * stagger.stepMs;
    progress.set(
      withDelay(
        delay,
        withTiming(1, { duration: reduced ? durations.fast : duration, easing: easeOut }),
      ),
    );
  }, [progress, index, duration, reduced]);
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: progress.get(),
    transform: [{ translateY: reduced ? 0 : (1 - progress.get()) * stagger.distance }],
  }));
  return (
    <Animated.View testID={testID} style={[style, animatedStyle]}>
      {children}
    </Animated.View>
  );
}
