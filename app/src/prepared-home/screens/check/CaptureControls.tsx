import { View } from "react-native";

import { useT, useTheme } from "../../context";
import { Icon, type IconName } from "../../icons";
import { PressableScale, TextLink, Txt } from "../../ui";

const SHUTTER = 76;
const SIDE = 96;

/**
 * Under the viewfinder: the shutter with the gallery and examples beside it, the ways to skip a check,
 * and a calm note that photos taken here count, with how photos are handled one tap away.
 */
export function CaptureControls({
  showShutter,
  shutterDisabled,
  onShoot,
  onGallery,
  onExamples,
  onLater,
  onNotInHome,
  onPhotoInfo,
}: {
  showShutter: boolean;
  shutterDisabled: boolean;
  onShoot: () => void;
  onGallery: () => void;
  onExamples: () => void;
  onLater: () => void;
  /** Only for checks that may not exist in every home. */
  onNotInHome?: () => void;
  onPhotoInfo: () => void;
}) {
  const { t } = useT();
  const theme = useTheme();
  return (
    <View style={{ flex: 1, justifyContent: "center" }}>
      <View
        style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-around" }}
      >
        <RoundAction icon="image" label={t("gallery")} onPress={onGallery} testID="pick-photo" />
        {showShutter ? (
          <Shutter label={t("takePhoto")} onPress={onShoot} disabled={shutterDisabled} />
        ) : (
          <View style={{ width: SIDE }} />
        )}
        <RoundAction
          icon="card"
          label={t("samplesShort")}
          onPress={onExamples}
          testID="use-sample"
        />
      </View>
      <View style={{ flexDirection: "row", justifyContent: "center", gap: theme.space.lg }}>
        <TextLink label={t("doLater")} onPress={onLater} inverse center testID="do-later" />
        {onNotInHome ? (
          <TextLink label={t("notInHome")} onPress={onNotInHome} inverse center testID="mark-na" />
        ) : null}
      </View>
      <PressableScale
        testID="photo-info"
        onPress={onPhotoInfo}
        accessibilityLabel={`${t("cameraNote")} ${t("privacyLink")}`}
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: theme.space.xs,
          minHeight: 32,
          paddingHorizontal: theme.space.xl,
        }}
      >
        <Icon name="lock" size={14} color={theme.colors.textInverseMuted} />
        <Txt variant="caption" inverse muted numberOfLines={2} style={{ textAlign: "center" }}>
          {t("cameraNote")}{" "}
          <Txt variant="caption" inverse style={{ textDecorationLine: "underline" }}>
            {t("privacyLink")}
          </Txt>
        </Txt>
      </PressableScale>
    </View>
  );
}

function Shutter({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled: boolean;
}) {
  const theme = useTheme();
  return (
    <View style={{ alignItems: "center", width: SIDE }}>
      <PressableScale
        testID="take-photo"
        accessibilityLabel={label}
        onPress={onPress}
        disabled={disabled}
        style={{
          width: SHUTTER,
          height: SHUTTER,
          borderRadius: SHUTTER / 2,
          borderWidth: 4,
          borderColor: theme.colors.textInverse,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <View
          style={{
            width: 60,
            height: 60,
            borderRadius: 30,
            backgroundColor: theme.colors.textInverse,
          }}
        />
      </PressableScale>
    </View>
  );
}

function RoundAction({
  icon,
  label,
  onPress,
  testID,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  testID: string;
}) {
  const theme = useTheme();
  return (
    <View style={{ alignItems: "center", gap: theme.space.xs, width: SIDE, paddingTop: 12 }}>
      <PressableScale
        testID={testID}
        accessibilityLabel={label}
        onPress={onPress}
        style={{
          width: 52,
          height: 52,
          borderRadius: 26,
          backgroundColor: "rgba(250, 249, 247, 0.14)",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon name={icon} size={22} color={theme.colors.textInverse} />
      </PressableScale>
      <Txt variant="caption" inverse>
        {label}
      </Txt>
    </View>
  );
}
