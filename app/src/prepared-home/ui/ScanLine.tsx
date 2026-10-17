import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

import { useTheme } from "../context";
import { useMotion } from "../motion";

const BAND = 72;

/** A calm If-blue line sweeping over the photo while it is checked. With Reduce motion, a still tint. */
export function ScanLine({ height }: { height: number }) {
  const theme = useTheme();
  const { reduced } = useMotion();
  const sweep = useSharedValue(0);

  useEffect(() => {
    if (reduced) return;
    sweep.set(
      withRepeat(withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.quad) }), -1, true),
    );
    return () => cancelAnimation(sweep);
  }, [sweep, reduced]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: sweep.get() * (height - BAND / 2) - BAND / 2 }],
  }));

  if (reduced) {
    return (
      <View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(168, 194, 240, 0.16)" }]}
      />
    );
  }

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        { position: "absolute", left: 0, right: 0, top: 0, height: BAND, justifyContent: "center" },
        style,
      ]}
    >
      <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(168, 194, 240, 0.18)" }]} />
      <View
        style={{
          height: 3,
          backgroundColor: theme.colors.primary,
          boxShadow: "0px 0px 12px rgba(0, 84, 240, 0.9)",
        }}
      />
    </Animated.View>
  );
}
