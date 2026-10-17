import { useEffect, useState, type ReactNode } from "react";
import { Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from "react-native";
import { GestureDetector, usePanGesture } from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { scheduleOnRN } from "react-native-worklets";

import { usePreparedHome, useTheme } from "../context";
import { durations, springs, useMotion } from "../motion";
import { IconButton } from "./Pressable";

/** How far (share of the sheet height) or how fast (px/s) a downward drag must go to dismiss. */
const DISMISS_SHARE = 0.3;
const DISMISS_VELOCITY = 900;
/** Dragging upward past the open position is resisted, like iOS sheets. */
const OVERDRAG_RESISTANCE = 0.2;

/**
 * A gesture-driven bottom sheet built on Reanimated and Gesture Handler.
 * Only the grab handle row is draggable, so content scrolls normally and page scroll is never blocked.
 * With Reduce motion the sheet fades instead of sliding.
 */
export function BottomSheet({
  open,
  onClose,
  children,
  label,
  testID,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  label: string;
  testID?: string;
}) {
  const theme = useTheme();
  const { t } = usePreparedHome();
  const { reduced } = useMotion();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const maxHeight = Math.round(windowHeight * 0.88);

  const [mounted, setMounted] = useState(open);
  const offset = useSharedValue(maxHeight); // px below the open position
  const sheetHeight = useSharedValue(maxHeight);
  const fade = useSharedValue(reduced ? 0 : 1);
  const dragStart = useSharedValue(0);
  const dragOrigin = useSharedValue(0);
  const dismissedByDrag = useSharedValue(false);

  // Mount as soon as the sheet is asked to open; unmount only after the closing animation.
  if (open && !mounted) setMounted(true);

  useEffect(() => {
    if (!mounted) return;
    const unmountWhenDone = (finished?: boolean) => {
      "worklet";
      if (finished) scheduleOnRN(setMounted, false);
    };
    if (open) {
      dismissedByDrag.set(false);
      if (reduced) {
        offset.set(0);
        fade.set(withTiming(1, { duration: durations.fast }));
      } else {
        fade.set(1);
        offset.set(withSpring(0, springs.sheet));
      }
    } else if (!dismissedByDrag.get()) {
      if (reduced) fade.set(withTiming(0, { duration: durations.fast }, unmountWhenDone));
      else offset.set(withTiming(sheetHeight.get(), { duration: durations.base }, unmountWhenDone));
    }
  }, [open, mounted, reduced, offset, fade, sheetHeight, dismissedByDrag]);

  // Distance is measured from where the pointer went down, not from activation, so the few pixels
  // before the gesture activates still move the sheet and a single long move still counts.
  const pan = usePanGesture({
    activeOffsetY: [-6, 6],
    onBegin: (e) => {
      dragOrigin.set(e.absoluteY);
      dragStart.set(offset.get());
    },
    onUpdate: (e) => {
      const next = dragStart.get() + (e.absoluteY - dragOrigin.get());
      offset.set(next < 0 ? next * OVERDRAG_RESISTANCE : next);
    },
    onDeactivate: (e) => {
      const travelled = dragStart.get() + (e.absoluteY - dragOrigin.get());
      const dismiss =
        travelled > sheetHeight.get() * DISMISS_SHARE || e.velocityY > DISMISS_VELOCITY;
      if (dismiss) {
        // The fling keeps its velocity all the way out; the effect then skips its own close animation.
        dismissedByDrag.set(true);
        offset.set(
          withSpring(sheetHeight.get(), { ...springs.sheet, velocity: e.velocityY }, (finished) => {
            if (finished) scheduleOnRN(setMounted, false);
          }),
        );
        scheduleOnRN(onClose);
      } else {
        offset.set(withSpring(0, { ...springs.sheet, velocity: e.velocityY }));
      }
    },
  });

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: reduced
      ? fade.get()
      : Math.max(0, Math.min(1, 1 - offset.get() / Math.max(1, sheetHeight.get()))),
  }));
  const sheetStyle = useAnimatedStyle(() => ({
    opacity: fade.get(),
    transform: [{ translateY: offset.get() }],
  }));

  if (!mounted) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Animated.View
        style={[StyleSheet.absoluteFill, { backgroundColor: theme.colors.scrim }, backdropStyle]}
      >
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={t("close")}
          testID={testID ? `${testID}-backdrop` : undefined}
        />
      </Animated.View>
      <Animated.View
        testID={testID}
        accessibilityViewIsModal
        accessibilityLabel={label}
        onLayout={(e) => sheetHeight.set(e.nativeEvent.layout.height)}
        style={[
          {
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            maxHeight,
            backgroundColor: theme.colors.background,
            borderTopLeftRadius: theme.radius.sheet,
            borderTopRightRadius: theme.radius.sheet,
            paddingBottom: insets.bottom,
            boxShadow: theme.shadow.card,
          },
          sheetStyle,
        ]}
      >
        <View
          style={{
            width: "100%",
            maxWidth: theme.layout.maxContentWidth,
            alignSelf: "center",
            flexShrink: 1,
          }}
        >
          <GestureDetector gesture={pan}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingHorizontal: theme.space.md,
                minHeight: theme.layout.tapTarget,
              }}
            >
              <View style={{ width: theme.layout.tapTarget }} />
              <View
                style={{
                  flex: 1,
                  alignItems: "center",
                  justifyContent: "center",
                  minHeight: theme.layout.tapTarget,
                }}
              >
                <View
                  style={{
                    width: 40,
                    height: 4,
                    borderRadius: 2,
                    backgroundColor: theme.colors.line,
                  }}
                />
              </View>
              <IconButton icon="close" label={t("close")} onPress={onClose} testID="sheet-close" />
            </View>
          </GestureDetector>
          <ScrollView
            style={{ flexShrink: 1 }}
            contentContainerStyle={{
              paddingHorizontal: theme.space.xl,
              paddingBottom: theme.space.xl,
            }}
            keyboardShouldPersistTaps="handled"
          >
            {children}
          </ScrollView>
        </View>
      </Animated.View>
    </View>
  );
}
