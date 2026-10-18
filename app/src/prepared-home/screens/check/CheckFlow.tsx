// One check per screen with a live camera (on the web, a demo camera over a licensed photo of the spot),
// then shrink → scan → verdict. The next check swaps in place, so the camera stays open between checks.
import { getCheck } from "@prepared-home/engine";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { usePreparedHome, useTheme } from "../../context";
import { useEmbedStatus } from "../../embed";
import { haptics } from "../../haptics";
import { nextOpenCheck, type HomeModel } from "../../model";
import { durations, useMotion } from "../../motion";
import { useBehindSheet, useFontScale, useSystemBarIcons } from "../../ui";
import { CaptureControls } from "./CaptureControls";
import { CheckHeading } from "./CheckHeading";
import { CheckTopBar } from "./CheckTopBar";
import { DemoFooter } from "./DemoFooter";
import { PhotoInfoSheet } from "./PhotoInfoSheet";
import { ReviewLayer } from "./ReviewLayer";
import { ReviewMessage } from "./ReviewMessage";
import { SamplesSheet } from "./SamplesSheet";
import { spokenIntro, spokenResult } from "./spokenText";
import { useCamera } from "./useCamera";
import { useCapture } from "./useCapture";
import { useCheckRun } from "./useCheckRun";
import { useCheckVoice } from "./useCheckVoice";
import { useDemoCamera } from "./useDemoCamera";
import { useSecondAngle } from "./useSecondAngle";
import { Viewfinder } from "./Viewfinder";

const CONTROLS_HEIGHT = 196;
/** Extra room under the viewfinder per step of the phone's font scale, so large text never clips. */
const CONTROLS_PER_SCALE = 90;

export function CheckFlow({ model, initialId }: { model: HomeModel; initialId: string }) {
  const { t, lang, paths, markNotApplicable, voiceGuidance } = usePreparedHome();
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const motion = useMotion();
  useSystemBarIcons("light");

  const home = model.home;
  const [currentId, setCurrentId] = useState(initialId);
  const check = getCheck(currentId, home.homeType);
  const camera = useCamera();
  const flow = useCheckRun(home, check, model.effective.get(check.id)?.verdict);
  const [samplesOpen, setSamplesOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [stage, setStage] = useState({ width: 0, height: 0 });
  const fontScale = useFontScale();
  const behindSheet = useBehindSheet();
  const reviewing = flow.run.status !== "idle";
  useEmbedStatus(flow.run, check.title[lang]);
  const review = useSharedValue(0);
  const flash = useSharedValue(0);
  useEffect(() => {
    review.set(withTiming(reviewing ? 1 : 0, { duration: durations.fast }));
  }, [reviewing, review]);
  const overlayStyle = useAnimatedStyle(() => ({ opacity: review.get() }));
  const controlsStyle = useAnimatedStyle(() => ({ opacity: 1 - review.get() }));

  const retry = () => {
    flow.reset();
    camera.resume();
  };

  const next = nextOpenCheck(model, currentId);
  const goNext = () => {
    if (!next) return flow.finish();
    retry();
    setCurrentId(next.id);
    router.setParams({ checkId: next.id });
  };

  const capture = useCapture({ camera, flow, flash, busy: reviewing, onAbort: retry });
  const demo = useDemoCamera({
    checkId: check.id,
    enabled: !camera.native,
    run: flow.run,
    capture,
  });
  const secondAngle = useSecondAngle({
    active: flow.run.status === "secondAngle",
    onCapture: () => void capture.shootSecond(),
  });

  const intro = spokenIntro({
    check,
    home,
    position: model.checks.findIndex((c) => c.id === currentId) + 1,
    total: model.checks.length,
    camera: camera.granted ? "ready" : camera.needsPermission ? "needsPermission" : "none",
    lang,
    t,
  });
  const result = spokenResult({ run: flow.run, check, home, next, lang, t });
  useCheckVoice({ checkId: currentId, run: flow.run, intro, result });

  const notInHome = () => {
    markNotApplicable(home, check.id);
    haptics.success();
    goNext();
  };

  const footerHeight = demo.footerHeight;
  const controlsHeight = CONTROLS_HEIGHT + (fontScale - 1) * CONTROLS_PER_SCALE;
  const viewfinderHeight = Math.max(0, stage.height - controlsHeight - footerHeight);
  const close = () => (router.canGoBack() ? router.back() : router.replace(paths.home));

  return (
    <View testID="check-screen" style={{ flex: 1, backgroundColor: theme.colors.dark }}>
      <View
        aria-hidden={behindSheet}
        style={{
          flex: 1,
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
          paddingLeft: insets.left,
          paddingRight: insets.right,
        }}
      >
        <CheckTopBar
          model={model}
          currentId={currentId}
          onClose={close}
          torch={camera.native ? { on: camera.torch, toggle: camera.toggleTorch } : undefined}
        />

        <CheckHeading
          check={check}
          homeType={home.homeType}
          spoken={intro}
          focusKey={reviewing ? null : currentId}
        />

        <View style={{ flex: 1 }} onLayout={(e) => setStage(e.nativeEvent.layout)}>
          <Viewfinder
            hidden={reviewing}
            cameraRef={camera.cameraRef}
            live={
              camera.granted
                ? {
                    torch: camera.torch,
                    pictureSize: camera.pictureSize,
                    onReady: () => void camera.onReady(),
                  }
                : undefined
            }
            needsPermission={camera.needsPermission}
            onAllow={() => void camera.requestPermission()}
            height={viewfinderHeight}
            flash={flash}
            onUpload={() => void capture.fromGallery()}
            onExamples={() => setSamplesOpen(true)}
            demo={demo.view}
          />
          <Animated.View
            pointerEvents={reviewing ? "none" : "auto"}
            aria-hidden={reviewing}
            style={[
              { position: "absolute", left: 0, right: 0, bottom: 0 },
              { height: controlsHeight + footerHeight },
              controlsStyle,
            ]}
          >
            {demo.scene ? (
              <DemoFooter checkId={check.id} scene={demo.scene} onNext={demo.next} />
            ) : null}
            <CaptureControls
              showShutter={camera.native || !!demo.scene}
              shutterDisabled={(camera.native ? !camera.ready : !demo.canShoot) || reviewing}
              onShoot={() => void (camera.native ? capture.shoot() : demo.shoot())}
              onGallery={() => void capture.fromGallery()}
              onExamples={() => setSamplesOpen(true)}
              onLater={goNext}
              onNotInHome={check.notApplicableAllowed ? notInHome : undefined}
              onPhotoInfo={() => setInfoOpen(true)}
              note={demo.scene ? t("demoNote") : undefined}
            />
          </Animated.View>

          {reviewing ? (
            <Animated.View style={[StyleSheet.absoluteFill, overlayStyle]}>
              <ReviewLayer
                key={currentId}
                run={flow.run}
                photoUri={flow.photoUri}
                check={check}
                stage={stage}
                viewfinderHeight={viewfinderHeight}
              >
                <ReviewMessage
                  flow={flow}
                  check={check}
                  home={home}
                  onRetry={retry}
                  onNext={goNext}
                  onDetails={() => router.push(paths.result(check.id))}
                  onHome={() => router.replace(paths.home)}
                  // Moving on by itself would cut off a spoken result or a guided tour step.
                  autoAdvance={!motion.reduced && !voiceGuidance && !demo.touring}
                  secondAngle={{ showButton: secondAngle.showButton, onTake: secondAngle.take }}
                  spokenResult={result}
                  onTakeSecond={() => {
                    camera.resume();
                    flow.retakeSecond();
                  }}
                />
              </ReviewLayer>
            </Animated.View>
          ) : null}
        </View>
      </View>

      <PhotoInfoSheet open={infoOpen} onClose={() => setInfoOpen(false)} />
      <SamplesSheet
        open={samplesOpen}
        onClose={() => setSamplesOpen(false)}
        checkId={check.id}
        homeType={home.homeType}
        onPick={(s) => {
          setSamplesOpen(false);
          void capture.fromSample(s);
        }}
        disabled={reviewing}
      />
    </View>
  );
}
