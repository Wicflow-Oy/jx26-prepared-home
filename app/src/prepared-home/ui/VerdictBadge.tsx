import { useEffect } from "react";
import { View } from "react-native";
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";

import { useTheme } from "../context";
import { springs, useMotion } from "../motion";

const AnimatedPath = Animated.createAnimatedComponent(Path);

// Lengths of the strokes in the 24-unit icon grid, used for the draw-in.
const CHECK_PATH = "M5.5 12.5l4 4L18.5 7.5";
const CHECK_LENGTH = 19;
const CROSS_A = "M7 7l10 10";
const CROSS_B = "M17 7L7 17";
const CROSS_LENGTH = 14.2;
const DRAW_MS = 320;

/** The round badge on the photo card: a check mark or a cross that draws itself in. */
export function VerdictBadge({ good, size = 64 }: { good: boolean; size?: number }) {
  const theme = useTheme();
  const { reduced } = useMotion();
  const pop = useSharedValue(reduced ? 1 : 0.4);
  const draw = useSharedValue(reduced ? 1 : 0);

  useEffect(() => {
    if (reduced) return;
    pop.set(withSpring(1, springs.snappy));
    draw.set(withDelay(90, withTiming(1, { duration: DRAW_MS, easing: Easing.out(Easing.cubic) })));
  }, [pop, draw, reduced]);

  const circle = useAnimatedStyle(() => ({ transform: [{ scale: pop.get() }] }));
  const checkProps = useAnimatedProps(() => ({
    strokeDashoffset: CHECK_LENGTH * (1 - draw.get()),
  }));
  // The cross draws one stroke after the other.
  const crossA = useAnimatedProps(() => ({
    strokeDashoffset: CROSS_LENGTH * (1 - Math.min(1, draw.get() * 2)),
  }));
  const crossB = useAnimatedProps(() => ({
    strokeDashoffset: CROSS_LENGTH * (1 - Math.max(0, draw.get() * 2 - 1)),
  }));

  return (
    <Animated.View
      testID={good ? "badge-good" : "badge-bad"}
      accessibilityElementsHidden
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: 3,
          borderColor: theme.colors.textInverse,
          backgroundColor: good ? theme.colors.success : theme.colors.danger,
          alignItems: "center",
          justifyContent: "center",
          boxShadow: theme.shadow.card,
        },
        circle,
      ]}
    >
      <View>
        <Svg width={size * 0.56} height={size * 0.56} viewBox="0 0 24 24" fill="none">
          {good ? (
            <AnimatedPath
              d={CHECK_PATH}
              stroke={theme.colors.textInverse}
              strokeWidth={2.6}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={`${CHECK_LENGTH} ${CHECK_LENGTH}`}
              animatedProps={checkProps}
            />
          ) : (
            <>
              <AnimatedPath
                d={CROSS_A}
                stroke={theme.colors.textInverse}
                strokeWidth={2.6}
                strokeLinecap="round"
                strokeDasharray={`${CROSS_LENGTH} ${CROSS_LENGTH}`}
                animatedProps={crossA}
              />
              <AnimatedPath
                d={CROSS_B}
                stroke={theme.colors.textInverse}
                strokeWidth={2.6}
                strokeLinecap="round"
                strokeDasharray={`${CROSS_LENGTH} ${CROSS_LENGTH}`}
                animatedProps={crossB}
              />
            </>
          )}
        </Svg>
      </View>
    </Animated.View>
  );
}
