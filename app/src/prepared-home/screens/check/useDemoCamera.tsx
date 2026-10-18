// The web demo camera in the check flow: its scene, readiness and shutter. During the landing page's
// guided tour it shows a recorded sample instead and fires the shutter by itself; the sample goes byte
// for byte, so the server answers from its recording and no tour step calls the model.
import { useEffect, useRef, useState } from "react";
import { View } from "react-native";

import { usePreparedHome } from "../../context";
import { getTour, setTour, tourDone, useTour } from "../../embed";
import { prepareSample } from "../../photo/pipeline";
import { DemoCamera } from "./DemoCamera";
import { DEMO_FOOTER_HEIGHT } from "./DemoFooter";
import { useDemoScenes, type DemoCameraHandle, type DemoScene } from "./demoScenes";
import type { useCapture } from "./useCapture";
import type { ReviewRun } from "./useCheckRun";

/** Long enough to see the scene before the tour's shutter. */
const TOUR_SHOT_DELAY_MS = 1200;
/** How long the tour's scan runs before the recorded answer, which comes back at once. */
const TOUR_SCAN_MS = 1500;
/** The verdict badge has drawn itself in by then. */
const RESULT_SHOWN_MS = 900;

export function useDemoCamera({
  checkId,
  enabled,
  run,
  capture,
}: {
  checkId: string;
  enabled: boolean;
  run: ReviewRun;
  capture: ReturnType<typeof useCapture>;
}) {
  const { t, api } = usePreparedHome();
  const demo = useDemoScenes(checkId, enabled);
  const { active: touring, cue } = useTour();
  const shot = enabled && cue?.kind === "shot" && cue.checkId === checkId ? cue : null;
  const handle = useRef<DemoCameraHandle>(null);
  const [ready, setReady] = useState(false);
  // The tour's timer must not restart when the flow re-renders, so it calls the newest shutter.
  const shootScene = useRef(capture.shootScene);
  useEffect(() => {
    shootScene.current = capture.shootScene;
  });

  const sampleUrl = shot ? api.resolveAssetUrl(shot.sample.url) : null;
  const scene: DemoScene | null =
    shot && sampleUrl
      ? {
          file: shot.sample.id,
          url: sampleUrl,
          author: shot.sample.author ?? "",
          licence: shot.sample.licence ?? "",
          licenceUrl: "",
          sourceUrl: shot.sample.sourceUrl ?? "",
          title: shot.sample.title ?? "",
        }
      : demo.scene;

  useEffect(() => {
    if (!shot || shot.fired || !sampleUrl || !ready || run.status !== "idle") return;
    const timer = setTimeout(() => {
      setTour({ cue: { ...shot, fired: true } });
      const take = () => prepareSample(sampleUrl, shot.sample.id, shot.sample);
      void shootScene.current(take, TOUR_SCAN_MS);
    }, TOUR_SHOT_DELAY_MS);
    return () => clearTimeout(timer);
  }, [shot, sampleUrl, ready, run.status]);

  useEffect(() => {
    if (!shot?.fired || (run.status !== "done" && run.status !== "error")) return;
    const timer = setTimeout(() => {
      setTour({ cue: null });
      // A newer step may have been asked for while the result was coming.
      if (getTour().step === shot.step) tourDone(shot.step);
    }, RESULT_SHOWN_MS);
    return () => clearTimeout(timer);
  }, [shot, run.status]);

  // Blank while the scenes load, so the upload buttons do not flash up first.
  const view = scene ? (
    <DemoCamera
      key={scene.file}
      ref={handle}
      scene={scene}
      onReady={setReady}
      hint={t("demoHint")}
    />
  ) : enabled && !demo.loaded ? (
    <View />
  ) : undefined;

  return {
    scene,
    view,
    touring,
    footerHeight: scene ? DEMO_FOOTER_HEIGHT : 0,
    canShoot: ready && !shot,
    shoot: () => capture.shootScene(async () => handle.current?.capture() ?? null),
    next: demo.count > 1 && !shot ? demo.next : undefined,
  };
}
