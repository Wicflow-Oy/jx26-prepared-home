import { CameraView } from "expo-camera";
import type { RefObject } from "react";
import { StyleSheet, View } from "react-native";
import Animated, { useAnimatedStyle, type SharedValue } from "react-native-reanimated";

import { useT, useTheme } from "../../context";
import { Icon } from "../../icons";
import { Button, Txt } from "../../ui";

/** The live camera inside framing brackets, or, without a camera, buttons to upload or use an example. */
export function Viewfinder({
  cameraRef,
  live,
  needsPermission,
  onAllow,
  height,
  flash,
  onUpload,
  onExamples,
}: {
  cameraRef: RefObject<CameraView | null>;
  /** Settings for the live camera; absent when there is none or it is not allowed. */
  live?: { torch: boolean; pictureSize?: string; onReady: () => void };
  needsPermission: boolean;
  onAllow: () => void;
  height: number;
  flash: SharedValue<number>;
  onUpload: () => void;
  onExamples: () => void;
}) {
  const theme = useTheme();
  const flashStyle = useAnimatedStyle(() => ({ opacity: flash.get() }));
  return (
    <View
      testID="viewfinder"
      style={{
        position: "absolute",
        left: theme.space.lg,
        right: theme.space.lg,
        top: 0,
        height,
        borderRadius: theme.radius.sheet,
        overflow: "hidden",
        backgroundColor: theme.colors.viewfinder,
      }}
    >
      {live ? (
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          facing="back"
          enableTorch={live.torch}
          animateShutter={false}
          pictureSize={live.pictureSize}
          onCameraReady={live.onReady}
        />
      ) : (
        <NoCameraPanel
          needsPermission={needsPermission}
          onAllow={onAllow}
          onUpload={onUpload}
          onExamples={onExamples}
        />
      )}
      <Brackets />
      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { backgroundColor: "#FFFFFF" }, flashStyle]}
      />
    </View>
  );
}

function NoCameraPanel({
  needsPermission,
  onAllow,
  onUpload,
  onExamples,
}: {
  needsPermission: boolean;
  onAllow: () => void;
  onUpload: () => void;
  onExamples: () => void;
}) {
  const theme = useTheme();
  const { t } = useT();
  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        padding: theme.space.xl,
        gap: theme.space.md,
      }}
    >
      <Icon name="camera" size={40} color={theme.colors.textInverseMuted} strokeWidth={1.2} />
      {needsPermission ? (
        <>
          <Txt inverse muted style={{ textAlign: "center" }}>
            {t("cameraNeeded")}
          </Txt>
          <Button
            label={t("allowCamera")}
            onPress={onAllow}
            variant="light"
            testID="allow-camera"
          />
        </>
      ) : (
        <>
          <Button
            label={t("uploadPhoto")}
            onPress={onUpload}
            variant="light"
            icon="image"
            testID="upload-photo"
          />
          <Button
            label={t("useSample")}
            onPress={onExamples}
            variant="inverse"
            testID="use-sample-panel"
          />
        </>
      )}
    </View>
  );
}

const CORNERS = [
  { top: 16, left: 16, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 6 },
  { top: 16, right: 16, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 6 },
  { bottom: 16, left: 16, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 6 },
  { bottom: 16, right: 16, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 6 },
];

/** Framing corners: they suggest where the spot should sit without hiding the picture. */
function Brackets() {
  const theme = useTheme();
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {CORNERS.map((corner, i) => (
        <View
          key={i}
          style={[
            { position: "absolute", width: 28, height: 28, borderColor: theme.colors.textInverse },
            corner,
          ]}
        />
      ))}
    </View>
  );
}
