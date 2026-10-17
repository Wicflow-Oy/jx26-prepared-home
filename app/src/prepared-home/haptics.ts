// Subtle haptics for the moments that matter. Browsers have no haptics, so web is a no-op.
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

const available = Platform.OS !== "web";

function tap() {
  if (!available) return;
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
}

function notify(type: Haptics.NotificationFeedbackType) {
  if (!available) return;
  // A device without a vibration motor rejects; the UI never depends on the feedback.
  Haptics.notificationAsync(type).catch(() => undefined);
}

export const haptics = {
  shutter: tap,
  verified: () => notify(Haptics.NotificationFeedbackType.Success),
  fixFirst: () => notify(Haptics.NotificationFeedbackType.Warning),
  prepared: () => notify(Haptics.NotificationFeedbackType.Success),
};
