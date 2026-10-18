import type { ComponentProps } from "react";
import { useEffect } from "react";
import { StyleSheet } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

import { useTheme } from "../../context";
import { durations } from "../../motion";
import { CheckReview } from "./CheckReview";

/**
 * The layer over the camera after the shutter. While the second angle is awaited it stays see-through, so
 * the customer can aim from the new position; then it closes over the camera for the verdict.
 */
export function ReviewLayer(props: ComponentProps<typeof CheckReview>) {
  const theme = useTheme();
  const waitingForAngle = props.run.status === "secondAngle";
  const backdrop = useSharedValue(1);
  useEffect(() => {
    backdrop.set(withTiming(waitingForAngle ? 0.45 : 1, { duration: durations.base }));
  }, [waitingForAngle, backdrop]);
  const backdropStyle = useAnimatedStyle(() => ({ opacity: backdrop.get() }));

  return (
    <>
      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { backgroundColor: theme.colors.dark }, backdropStyle]}
      />
      <CheckReview {...props} />
    </>
  );
}
