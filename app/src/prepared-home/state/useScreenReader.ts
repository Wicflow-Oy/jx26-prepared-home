import { useEffect, useState } from "react";
import { AccessibilityInfo, Platform } from "react-native";

/** Whether the phone's screen reader (TalkBack, VoiceOver) is on, kept up to date while the app runs. */
export function useScreenReader(): boolean {
  const [on, setOn] = useState(false);
  useEffect(() => {
    // Browsers don't tell pages about screen readers, and react-native-web always answers "on".
    if (Platform.OS === "web") return;
    let alive = true;
    AccessibilityInfo.isScreenReaderEnabled()
      .then((value) => alive && setOn(value))
      .catch(() => undefined);
    const subscription = AccessibilityInfo.addEventListener("screenReaderChanged", setOn);
    return () => {
      alive = false;
      subscription.remove();
    };
  }, []);
  return on;
}
