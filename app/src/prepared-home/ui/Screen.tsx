import { useRouter, type Href } from "expo-router";
import type { ReactNode } from "react";
import { Platform, ScrollView, View, type StyleProp, type ViewStyle } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { usePreparedHome, useTheme } from "../context";
import { durations } from "../motion";
import { Appear } from "./Appear";
import { IconButton } from "./Pressable";
import { Txt } from "./Text";

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
  const background = dark
    ? theme.colors.dark
    : tone === "sandAlt"
      ? theme.colors.backgroundAlt
      : theme.colors.background;
  const maxWidth = wide ? theme.layout.maxWideWidth : theme.layout.maxContentWidth;

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace((backTo ?? paths.home) as Href);
  };

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={{ flex: 1, backgroundColor: background }}>
      <PrototypeLabel inverse={dark} />
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
        <View style={{ flex: 1, alignItems: "center" }}>
          <Txt variant="body" inverse={dark} numberOfLines={1}>
            {barTitle ?? t("appName")}
          </Txt>
          <Txt variant="caption" inverse={dark} muted numberOfLines={1}>
            {barSubtitle ?? t("appNameLocal")}
          </Txt>
        </View>
        <View style={{ width: theme.layout.tapTarget, alignItems: "flex-end" }}>{right}</View>
      </View>
      <ScrollView
        testID={testID}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: theme.space.xxl * 2 }}
        keyboardShouldPersistTaps="handled"
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
      </ScrollView>
      {overlay}
    </SafeAreaView>
  );
}
