// Status-bar and navigation-bar icon colour per screen: dark icons on sand, light icons on the camera screen.
// The bars themselves are transparent (edge-to-edge), so each screen's own background shows behind them.
import * as NavigationBar from "expo-navigation-bar";
import { useFocusEffect } from "expo-router";
import { setStatusBarStyle } from "expo-status-bar";
import { useCallback } from "react";
import { Platform } from "react-native";

type Icons = "dark" | "light";

function apply(icons: Icons) {
  setStatusBarStyle(icons, true);
  if (Platform.OS === "android") NavigationBar.setStyle(icons);
}

/** Sets the system-bar icons while the screen is focused, and restores the default after. */
export function useSystemBarIcons(icons: Icons) {
  useFocusEffect(
    useCallback(() => {
      apply(icons);
      return () => apply("dark");
    }, [icons]),
  );
}
