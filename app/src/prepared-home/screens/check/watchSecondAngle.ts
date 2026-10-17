// The second angle is taken without a tap: once the phone has clearly moved (a step to the side, or turned)
// and is then held still for a moment, the camera takes the photo.
import { DeviceMotion, type DeviceMotionMeasurement } from "expo-sensors";

/** About 11 degrees of turn counts as a new position. */
const MOVED_ANGLE = 0.2;
/** Acceleration without gravity (m/s²) from taking a step. */
const MOVED_ACCEL = 1.2;
/** Below these the phone counts as held still. */
const STILL_RATE = 15; // degrees per second
const STILL_ACCEL = 0.35;
const STILL_MS = 300;
/** The hand is still moving from the shutter press; motion before this does not count. */
const SETTLE_MS = 400;
const INTERVAL_MS = 50;

const angleDelta = (a: number, b: number) => {
  const d = Math.abs(a - b) % (2 * Math.PI);
  return d > Math.PI ? 2 * Math.PI - d : d;
};
const magnitude = (v: { x: number; y: number; z: number } | null | undefined) =>
  v ? Math.hypot(v.x, v.y, v.z) : 0;

/** Calls onReady once when the phone has moved and is held still. Returns a function that stops watching. */
export function watchSecondAngle(onReady: () => void): () => void {
  const startedAt = Date.now();
  let base: DeviceMotionMeasurement["rotation"] | null = null;
  let moved = false;
  let stillSince: number | null = null;
  let done = false;

  DeviceMotion.setUpdateInterval(INTERVAL_MS);
  const subscription = DeviceMotion.addListener((m) => {
    if (done || !m.rotation) return;
    const now = Date.now();
    if (now - startedAt < SETTLE_MS) {
      base = m.rotation;
      return;
    }
    base ??= m.rotation;
    const turned = Math.max(
      angleDelta(m.rotation.alpha, base.alpha),
      angleDelta(m.rotation.beta, base.beta),
      angleDelta(m.rotation.gamma, base.gamma),
    );
    const accel = magnitude(m.acceleration);
    if (turned > MOVED_ANGLE || accel > MOVED_ACCEL) moved = true;

    const rate = m.rotationRate
      ? Math.hypot(m.rotationRate.alpha, m.rotationRate.beta, m.rotationRate.gamma)
      : 0;
    const still = rate < STILL_RATE && accel < STILL_ACCEL;
    if (!moved || !still) {
      stillSince = null;
      return;
    }
    stillSince ??= now;
    if (now - stillSince >= STILL_MS) {
      done = true;
      subscription.remove();
      onReady();
    }
  });

  return () => {
    done = true;
    subscription.remove();
  };
}
