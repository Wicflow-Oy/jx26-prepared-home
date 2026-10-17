import { useEffect, useState } from "react";
import { AccessibilityInfo } from "react-native";

/** Whether the phone's screen reader (TalkBack, VoiceOver) is on, kept up to date while the app runs. */
export function useScreenReader(): boolean {
  const [on, setOn] = useState(false);
  useEffect(() => {
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
