// While the second angle is awaited: say "Now move a step to the side" (on screen, aloud and to screen readers),
// take the photo when the phone has moved and is held still, and offer a button if that does not happen.
import type { Lang } from "@prepared-home/engine";
import * as Speech from "expo-speech";
import { useEffect, useRef, useState } from "react";
import { AccessibilityInfo } from "react-native";

import { watchSecondAngle } from "./watchSecondAngle";

/** If the phone has not settled in a new position by then, a button takes the second photo. */
const BUTTON_AFTER_MS = 4000;

const VOICE: Record<Lang, string> = { en: "en-GB", fi: "fi-FI", sv: "sv-SE" };

export function useSecondAngle({
  active,
  prompt,
  lang,
  onCapture,
}: {
  active: boolean;
  prompt: string;
  lang: Lang;
  onCapture: () => void;
}) {
  const [showButton, setShowButton] = useState(false);
  // The watcher runs once per wait and calls the newest handler; the button and the watcher fire only once.
  const capture = useRef(onCapture);
  const fired = useRef(false);
  useEffect(() => {
    capture.current = onCapture;
  }, [onCapture]);
  const take = () => {
    if (fired.current) return;
    fired.current = true;
    capture.current();
  };

  useEffect(() => {
    if (!active) return;
    fired.current = false;
    AccessibilityInfo.announceForAccessibility(prompt);
    Speech.speak(prompt, { language: VOICE[lang] });
    const stop = watchSecondAngle(() => {
      if (fired.current) return;
      fired.current = true;
      capture.current();
    });
    const timer = setTimeout(() => setShowButton(true), BUTTON_AFTER_MS);
    return () => {
      stop();
      clearTimeout(timer);
      Speech.stop().catch(() => undefined);
      setShowButton(false);
    };
  }, [active, prompt, lang]);

  return { showButton, take };
}
