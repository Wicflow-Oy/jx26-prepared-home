import { View } from "react-native";

import { useT, useTheme } from "../../context";
import { Icon } from "../../icons";
import { PressableScale, Txt } from "../../ui";
import type { DemoScene } from "./demoScenes";
import { SampleCredit } from "./SampleCredit";

/** Height kept under the viewfinder for this footer. */
export const DEMO_FOOTER_HEIGHT = 58;

/** Under the demo camera: what it is, whose photo the scene is, and the way to another scene. */
export function DemoFooter({
  checkId,
  scene,
  onNext,
}: {
  checkId: string;
  scene: DemoScene | null;
  /** Only when the check has another scene. */
  onNext?: () => void;
}) {
  const { t } = useT();
  const theme = useTheme();
  return (
    <View
      testID="demo-footer"
      style={{
        height: DEMO_FOOTER_HEIGHT,
        paddingHorizontal: theme.space.lg + theme.space.xs,
        justifyContent: "center",
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: theme.space.sm }}>
        <Icon name="camera" size={14} color={theme.colors.textInverse} />
        <Txt variant="caption" inverse style={{ flex: 1 }} numberOfLines={1} maxScale={1.3}>
          {t("demoCamera")}
        </Txt>
        {onNext ? (
          <PressableScale
            testID="demo-next-scene"
            accessibilityLabel={t("nextScene")}
            onPress={onNext}
            hitSlop={10}
          >
            <Txt variant="caption" inverse style={{ textDecorationLine: "underline" }}>
              {t("nextScene")} ›
            </Txt>
          </PressableScale>
        ) : null}
      </View>
      {scene ? (
        <SampleCredit
          inverse
          sample={{ id: `demo-${checkId}`, checkId, url: scene.file, credit: "", ...scene }}
        />
      ) : null}
    </View>
  );
}
