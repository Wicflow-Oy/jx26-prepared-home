// Screen-reader helpers: move focus to new content, and hide the page behind an open sheet.
import { useEffect, useRef, useSyncExternalStore, type ComponentRef } from "react";
import { AccessibilityInfo, Platform, useWindowDimensions, type View } from "react-native";

/**
 * Moves the screen reader's focus to this view when it appears and whenever `key` changes (not while it is
 * null), so a new result or a new step is read without the customer searching for it.
 */
export function useFocusOnShow(key?: unknown) {
  const ref = useRef<ComponentRef<typeof View>>(null);
  useEffect(() => {
    if (Platform.OS === "web" || key === null) return;
    // Give the view a frame to mount before focusing it.
    const timer = setTimeout(() => {
      if (ref.current) AccessibilityInfo.sendAccessibilityEvent(ref.current, "focus");
    }, 120);
    return () => clearTimeout(timer);
  }, [key]);
  return ref;
}

/** The largest font scale text follows (see Txt); layouts that make room for text use the same cap. */
export const MAX_FONT_SCALE = 2;

/** The phone's font scale as text will actually use it: 1 by default, at most MAX_FONT_SCALE. */
export function useFontScale(): number {
  const { fontScale } = useWindowDimensions();
  return Math.min(Math.max(fontScale, 1), MAX_FONT_SCALE);
}

// Open sheets, counted so the page behind them can be hidden from the screen reader (a focus trap).
let openSheets = 0;
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
const notify = () => listeners.forEach((listener) => listener());

/** Registers an open sheet for as long as `open` is true. */
export function useSheetOpen(open: boolean) {
  useEffect(() => {
    if (!open) return;
    openSheets += 1;
    notify();
    return () => {
      openSheets -= 1;
      notify();
    };
  }, [open]);
}

/** True while any sheet is open: the page behind it should be hidden from the screen reader. */
export function useBehindSheet(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => openSheets > 0,
    () => false,
  );
}
