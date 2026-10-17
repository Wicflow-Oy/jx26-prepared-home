import { useEffect } from "react";
import { View } from "react-native";
import Animated, {
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
} from "react-native-reanimated";
import Svg, { Circle, Line } from "react-native-svg";

import { useTheme } from "../context";
import { springs, useMotion } from "../motion";
import { Txt } from "./Text";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const RING_SIZE = 136;
const STROKE = 4;
const RADIUS = 64;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/**
 * Segmented progress ring: done checks in blue, fix-first checks in amber, the rest as a track.
 * The arcs fill by animating strokeDashoffset on the UI thread.
 */
export function ProgressRing({
  done,
  fixFirst,
  total,
  label,
  sublabel,
  gapColor,
  testID,
}: {
  done: number;
  fixFirst: number;
  total: number;
  label: string;
  sublabel: string;
  /** The screen background, used to cut the gaps between segments. */
  gapColor: string;
  testID?: string;
}) {
  const theme = useTheme();
  const { reduced } = useMotion();
  const doneFrac = total > 0 ? done / total : 0;
  const reachFrac = total > 0 ? (done + fixFirst) / total : 0;
  const doneSV = useSharedValue(reduced ? doneFrac : 0);
  const reachSV = useSharedValue(reduced ? reachFrac : 0);

  useEffect(() => {
    doneSV.set(reduced ? doneFrac : withSpring(doneFrac, springs.gentle));
    reachSV.set(reduced ? reachFrac : withSpring(reachFrac, springs.gentle));
  }, [doneFrac, reachFrac, reduced, doneSV, reachSV]);

  const doneProps = useAnimatedProps(() => ({
    strokeDashoffset: CIRCUMFERENCE * (1 - doneSV.get()),
  }));
  const reachProps = useAnimatedProps(() => ({
    strokeDashoffset: CIRCUMFERENCE * (1 - reachSV.get()),
  }));
  const c = RING_SIZE / 2;

  return (
    <View
      testID={testID}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={`${label} ${sublabel}`}
      accessibilityValue={{ min: 0, max: total, now: done }}
      style={{ width: RING_SIZE, height: RING_SIZE }}
    >
      {/* Rotated a quarter turn so the arcs start at twelve o'clock. */}
      <Svg
        width={RING_SIZE}
        height={RING_SIZE}
        viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
        style={{ transform: [{ rotate: "-90deg" }] }}
      >
        <Circle
          cx={c}
          cy={c}
          r={RADIUS}
          stroke={theme.colors.line}
          strokeWidth={STROKE}
          fill="none"
        />
        <AnimatedCircle
          cx={c}
          cy={c}
          r={RADIUS}
          stroke={theme.colors.warningMark}
          strokeWidth={STROKE}
          fill="none"
          strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
          animatedProps={reachProps}
        />
        <AnimatedCircle
          cx={c}
          cy={c}
          r={RADIUS}
          stroke={theme.colors.primary}
          strokeWidth={STROKE}
          fill="none"
          strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
          animatedProps={doneProps}
        />
        {total > 1
          ? Array.from({ length: total }, (_, i) => {
              const a = (i / total) * 2 * Math.PI;
              const inner = RADIUS - STROKE;
              const outer = RADIUS + STROKE;
              return (
                <Line
                  key={i}
                  x1={c + inner * Math.cos(a)}
                  y1={c + inner * Math.sin(a)}
                  x2={c + outer * Math.cos(a)}
                  y2={c + outer * Math.sin(a)}
                  stroke={gapColor}
                  strokeWidth={4}
                />
              );
            })
          : null}
      </Svg>
      <View
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Txt variant="title">{label}</Txt>
        <Txt variant="label">{sublabel}</Txt>
      </View>
    </View>
  );
}

export type SegmentState = "done" | "fix" | "open";

/** One short bar per check; filled segments grow in with a slight stagger. */
export function SegmentBar({ segments, testID }: { segments: SegmentState[]; testID?: string }) {
  const theme = useTheme();
  return (
    <View testID={testID} style={{ flexDirection: "row", gap: theme.space.xs }} aria-hidden>
      {segments.map((s, i) => (
        <Segment
          key={i}
          index={i}
          color={
            s === "done" ? theme.colors.primary : s === "fix" ? theme.colors.warningMark : null
          }
        />
      ))}
    </View>
  );
}

function Segment({ index, color }: { index: number; color: string | null }) {
  const theme = useTheme();
  const { reduced } = useMotion();
  const fill = useSharedValue(reduced ? 1 : 0);
  useEffect(() => {
    fill.set(reduced ? 1 : withDelay(index * 40, withSpring(1, springs.gentle)));
  }, [fill, index, reduced]);
  const style = useAnimatedStyle(() => ({ transform: [{ scaleX: fill.get() }] }));
  return (
    <View
      style={{
        flex: 1,
        height: 4,
        borderRadius: 2,
        backgroundColor: theme.colors.line,
        overflow: "hidden",
      }}
    >
      {color ? (
        <Animated.View
          style={[{ flex: 1, backgroundColor: color, transformOrigin: "left" }, style]}
        />
      ) : null}
    </View>
  );
}
