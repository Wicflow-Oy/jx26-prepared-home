import { Stack } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useReducedMotion } from "react-native-reanimated";

import { GuidedTour, PreparedHomeProvider, ifTheme } from "@/prepared-home";

export default function RootLayout() {
  const reduced = useReducedMotion();
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: ifTheme.colors.background }}>
      <PreparedHomeProvider theme={ifTheme} lang="en">
        <GuidedTour />
        <Stack
          screenOptions={{
            headerShown: false,
            // Native platform transitions with edge swipe-back; a plain fade when Reduce motion is on.
            animation: reduced ? "fade" : "default",
            gestureEnabled: true,
            contentStyle: { backgroundColor: ifTheme.colors.background },
          }}
        >
          <Stack.Screen
            name="check/[checkId]"
            options={{ animation: reduced ? "fade" : "slide_from_bottom" }}
          />
        </Stack>
      </PreparedHomeProvider>
    </GestureHandlerRootView>
  );
}
