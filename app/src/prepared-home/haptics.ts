// Haptics that can be told apart without looking: one soft tap for done, two short ones for "not yet".
// Browsers have no haptics, so the web is silent.
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

const available = Platform.OS !== "web";
const GAP_MS = 140;

function impact(style: Haptics.ImpactFeedbackStyle) {
  if (!available) return;
  // A device without a vibration motor rejects; the UI never depends on the feedback.
  Haptics.impactAsync(style).catch(() => undefined);
}

export const haptics = {
  shutter: () => impact(Haptics.ImpactFeedbackStyle.Light),
  /** Done: one soft tap. */
  success: () => impact(Haptics.ImpactFeedbackStyle.Soft),
  /** Not yet (a new photo or a fix is needed): two short taps. */
  retry: () => {
    impact(Haptics.ImpactFeedbackStyle.Rigid);
    setTimeout(() => impact(Haptics.ImpactFeedbackStyle.Rigid), GAP_MS);
  },
};
