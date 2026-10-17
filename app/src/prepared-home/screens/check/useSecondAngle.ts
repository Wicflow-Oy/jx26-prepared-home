// While the second angle is awaited: take the photo when the phone has moved and is held still, and offer
// a button if that does not happen. Voice guidance says the prompt (useCheckVoice).
import { useEffect, useRef, useState } from "react";

import { watchSecondAngle } from "./watchSecondAngle";

/** If the phone has not settled in a new position by then, a button takes the second photo. */
const BUTTON_AFTER_MS = 4000;

export function useSecondAngle({ active, onCapture }: { active: boolean; onCapture: () => void }) {
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
    const stop = watchSecondAngle(() => {
      if (fired.current) return;
      fired.current = true;
      capture.current();
    });
    const timer = setTimeout(() => setShowButton(true), BUTTON_AFTER_MS);
    return () => {
      stop();
      clearTimeout(timer);
      setShowButton(false);
    };
  }, [active]);

  return { showButton, take };
}
