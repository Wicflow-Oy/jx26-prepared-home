import { useEffect, useState } from "react";

/** Long enough for the native push transition to finish. */
const AFTER_TRANSITION_MS = 400;

/**
 * True once the screen's opening transition is over. Content below the fold renders then, so the
 * transition itself only has to mount what is on screen (measured on a Galaxy S24+ in Expo Go).
 */
export function useAfterTransition(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setReady(true), AFTER_TRANSITION_MS);
    return () => clearTimeout(timer);
  }, []);
  return ready;
}
