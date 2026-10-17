// Motion tokens. Every animation in the app uses these, and all of them run on the UI thread (Reanimated).
// With "Reduce motion" on, movement is replaced by short fades.
import { Easing, useReducedMotion, type WithSpringConfig } from "react-native-reanimated";

export const durations = { fast: 200, base: 280 } as const;

export const easeOut = Easing.out(Easing.cubic);

// Reanimated spring durations are perceptual: the motion settles in about 1.5 times the value.
export const springs = {
  /** Taps and small state changes (settles in about 270 ms). */
  snappy: { duration: 180, dampingRatio: 0.9 },
  /** Content settling into place: rings, bars, verdicts (about 345 ms). */
  gentle: { duration: 230, dampingRatio: 1 },
  /** Bottom sheets; slightly underdamped so a fling feels physical. */
  sheet: { damping: 28, stiffness: 280, mass: 1 },
} satisfies Record<string, WithSpringConfig>;

/** Pressed state: applied within a frame of the touch. */
export const press = { scale: 0.97, opacity: 0.88 } as const;

/** List items enter one after another, capped so long lists never feel slow. */
export const stagger = { stepMs: 35, maxSteps: 8, distance: 8 } as const;

export function useMotion() {
  return { reduced: useReducedMotion() };
}
