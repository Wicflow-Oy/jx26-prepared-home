// The landing page's guided tour: it posts a step, the app opens that screen with in-app navigation and
// says when the step is done. Tour photos are recorded samples, so no step calls the model.
import { DEMO_CLAIM, DEMO_FLAT_ID, makeDemo } from "@prepared-home/engine";
import { router } from "expo-router";
import { useEffect, useRef } from "react";

import { usePreparedHome, type PreparedHomeContextValue } from "./context";
import { getTour, listenForTour, setTour, tourDone, type TourStep } from "./embed";

/** Screen transitions have finished by then. */
const SETTLE_MS = 700;
/** A tour shot already fired has saved its recorded result by then. */
const SHOT_LANDS_MS = 2000;

/** Checks whose recorded sample answers Verified and Fix first. */
const SHOTS = {
  capture: { checkId: "F2", sampleId: "C01" },
  fix: { checkId: "L5", sampleId: "B03" },
} as const;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const go = (path: string) => {
  if (router.canDismiss()) router.dismissAll();
  router.replace(path);
};

async function showStep(
  step: TourStep,
  app: PreparedHomeContextValue,
  current: () => boolean,
): Promise<void> {
  // A shot in flight would save its result into the home this step resets, so it lands first.
  const cue = getTour().cue;
  if (cue?.kind === "shot" && cue.fired) await wait(SHOT_LANDS_MS);
  if (!current()) return;
  setTour({ active: step !== "end", cue: null });
  const flat = () =>
    app.currentHome?.homeId === DEMO_FLAT_ID ? app.currentHome : app.openDemo(DEMO_FLAT_ID);
  switch (step) {
    case "start":
    case "choose":
      await app.clearDeviceData();
      if (!current()) return;
      go(app.paths.start);
      if (step === "choose") router.push(app.paths.newHome);
      break;
    case "capture":
    case "fix": {
      const { checkId, sampleId } = SHOTS[step];
      const sample = (await app.api.samples(app.lang)).find((s) => s.id === sampleId);
      if (!current() || !sample) return;
      app.openDemo(DEMO_FLAT_ID);
      setTour({ cue: { kind: "shot", step, checkId, sample, fired: false } });
      go(app.paths.check(checkId));
      // The check flow says it is done once the result shows.
      return;
    }
    case "status":
      app.openDemo(DEMO_FLAT_ID);
      go(app.paths.status);
      break;
    case "deductible":
      flat();
      go(app.paths.status);
      setTour({ cue: { kind: "deductible" } });
      break;
    case "quick":
      flat();
      go(app.paths.quick);
      break;
    case "card":
      flat();
      go(app.paths.card);
      break;
    case "claim": {
      const home = app.openDemo(DEMO_FLAT_ID);
      if (!home) return;
      const records = makeDemo(new Date()).records.filter((r) => r.homeId === home.homeId);
      const { peril, lossDate } = DEMO_CLAIM;
      const view = await app.api.claim({ home, records, peril, lossDate, shared: [] });
      if (!current()) return;
      app.saveClaim(home.homeId, view);
      go(app.paths.adjuster(view.claimId));
      break;
    }
    case "settings":
      go(app.paths.settings);
      break;
    case "end":
      flat();
      go(app.paths.home);
      break;
  }
  await wait(SETTLE_MS);
  if (current()) tourDone(step);
}

/** Mounted once in the root layout. A newer step makes any unfinished one give up. */
export function GuidedTour(): null {
  const app = usePreparedHome();
  const latest = useRef(app);
  useEffect(() => {
    latest.current = app;
  });
  const run = useRef(0);
  // Listening starts once the device store has loaded, so a step is never overwritten by it.
  useEffect(() => {
    if (!app.ready) return;
    return listenForTour((step) => {
      const id = ++run.current;
      setTour({ step });
      showStep(step, latest.current, () => id === run.current).catch(() => undefined);
    });
  }, [app.ready]);
  return null;
}
