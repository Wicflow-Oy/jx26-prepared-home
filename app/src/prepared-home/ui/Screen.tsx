import { useRouter, type Href } from "expo-router";
import type { ReactNode } from "react";
import { Platform, View, type StyleProp, type ViewStyle } from "react-native";
import Animated, {
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { IF_BRANDED } from "../brand";
import { usePreparedHome, useTheme } from "../context";
import { durations } from "../motion";
import { useSystemBarIcons } from "../systemBars";
import { Appear } from "./Appear";
import { IfLogo } from "./IfLogo";
import { useBehindSheet } from "./a11y";
import { IconButton } from "./Pressable";
import { Txt } from "./Text";

/** The neutral build's banner. The If-branded build shows a small Concept pill in the header instead. */
export function PrototypeLabel({ inverse }: { inverse?: boolean }) {
  const theme = useTheme();
  const { t } = usePreparedHome();
  return (
    <View style={{ alignItems: "center", paddingTop: theme.space.xs }}>
      <View
        style={{
          backgroundColor: inverse ? "rgba(250, 249, 247, 0.12)" : theme.colors.sand,
          borderRadius: theme.radius.sm,
          paddingHorizontal: theme.space.sm,
          paddingVertical: theme.space.xxs,
        }}
      >
        <Txt variant="caption" inverse={inverse} muted testID="prototype-label">
          {t("prototypeLabel")}
        </Txt>
      </View>
    </View>
  );
}

/** A small, honest marker next to the logo: this is a concept, not a live If service. */
function ConceptPill() {
  const theme = useTheme();
  const { t } = usePreparedHome();
  return (
    <View
      testID="concept-pill"
      style={{
        borderRadius: theme.radius.pill,
        backgroundColor: theme.colors.primaryTint,
        paddingHorizontal: theme.space.sm,
        paddingVertical: theme.space.xxs,
      }}
    >
      <Txt variant="caption" color={theme.colors.info}>
        {t("conceptPill")}
      </Txt>
    </View>
  );
}

// The web has no native stack transition, so pages fade in quickly instead.
function PageBody({ style, children }: { style: StyleProp<ViewStyle>; children: ReactNode }) {
  return Platform.OS === "web" ? (
    <Appear duration={durations.fast} style={style}>
      {children}
    </Appear>
  ) : (
    <View style={style}>{children}</View>
  );
}

export type ScreenTone = "sand" | "sandAlt" | "dark";

export function Screen({
  testID,
  children,
  back = true,
  backTo,
  backIcon = "chevronLeft",
  barTitle,
  barSubtitle,
  right,
  tone = "sand",
  wide = false,
  overlay,
}: {
  testID: string;
  children: ReactNode;
  back?: boolean;
  /** Where Back goes when there is no history, e.g. after a web deep link. */
  backTo?: string;
  backIcon?: "chevronLeft" | "close";
  barTitle?: string;
  barSubtitle?: string;
  right?: ReactNode;
  tone?: ScreenTone;
  wide?: boolean;
  /** Rendered above the scrolling content, e.g. a bottom sheet. */
  overlay?: ReactNode;
}) {
  const theme = useTheme();
  const router = useRouter();
  const { t, paths } = usePreparedHome();
  const dark = tone === "dark";
  const insets = useSafeAreaInsets();
  const behindSheet = useBehindSheet();
  useSystemBarIcons(dark ? "light" : "dark");
  const background = dark
    ? theme.colors.dark
    : tone === "sandAlt"
      ? theme.colors.backgroundAlt
      : theme.colors.background;
  const maxWidth = wide ? theme.layout.maxWideWidth : theme.layout.maxContentWidth;

  // A hairline under the app bar fades in once the page scrolls under it.
  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => {
    scrollY.set(e.contentOffset.y);
  });
  const hairline = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.get(), [0, 24], [0, 1], "clamp"),
  }));

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace((backTo ?? paths.home) as Href);
  };

  return (
    // The background fills behind both system bars; content keeps clear of them with the insets.
    // Overlays (sheets) sit outside the padding so their scrim also covers the status bar.
    <View style={{ flex: 1, backgroundColor: background }}>
      <View
        aria-hidden={behindSheet}
        style={{
          flex: 1,
          paddingTop: insets.top,
          paddingLeft: insets.left,
          paddingRight: insets.right,
        }}
      >
        {IF_BRANDED ? null : <PrototypeLabel inverse={dark} />}
        <View
          style={{
            width: "100%",
            maxWidth,
            alignSelf: "center",
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: theme.space.md,
            minHeight: 52,
          }}
        >
          <View style={{ width: theme.layout.tapTarget }}>
            {back ? (
              <IconButton
                icon={backIcon}
                label={t("back")}
                onPress={goBack}
                testID="back-button"
                inverse={dark}
              />
            ) : null}
          </View>
          <View
            style={{
              flex: 1,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: theme.space.sm,
            }}
          >
            {IF_BRANDED && !barTitle ? <IfLogo size={30} /> : null}
            <View
              accessible
              accessibilityLabel={`${barTitle ?? t("appName")}, ${barSubtitle ?? t("appNameLocal")}`}
              style={{
                alignItems: IF_BRANDED && !barTitle ? "flex-start" : "center",
                flexShrink: 1,
              }}
            >
              <Txt variant="body" inverse={dark} numberOfLines={1} maxScale={1.5}>
                {barTitle ?? t("appName")}
              </Txt>
              <Txt variant="caption" inverse={dark} muted numberOfLines={1} maxScale={1.5}>
                {barSubtitle ?? t("appNameLocal")}
              </Txt>
            </View>
            {IF_BRANDED && !barTitle ? <ConceptPill /> : null}
          </View>
          <View style={{ width: theme.layout.tapTarget, alignItems: "flex-end" }}>{right}</View>
        </View>
        <Animated.View
          style={[
            { height: 1, backgroundColor: dark ? "rgba(250, 249, 247, 0.12)" : theme.colors.line },
            hairline,
          ]}
        />
        <Animated.ScrollView
          testID={testID}
          style={{ flex: 1 }}
          // The page runs behind the navigation bar; the last item still clears it.
          contentContainerStyle={{ paddingBottom: theme.space.xxl + insets.bottom }}
          keyboardShouldPersistTaps="handled"
          onScroll={onScroll}
          scrollEventThrottle={16}
        >
          <PageBody
            style={{
              width: "100%",
              maxWidth,
              alignSelf: "center",
              paddingHorizontal: theme.space.xl,
              paddingTop: theme.space.sm,
            }}
          >
            {children}
          </PageBody>
        </Animated.ScrollView>
      </View>
      {overlay}
    </View>
  );
}
