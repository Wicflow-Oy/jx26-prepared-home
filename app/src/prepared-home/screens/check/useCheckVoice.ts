// Voice guidance through a check: the step when it opens, "hold still" while checking, the second angle,
// and the result with what to do next. Silent unless voice guidance is on.
import { useEffect, useRef } from "react";

import { useT } from "../../context";
import { useVoice } from "../../voice";
import type { ReviewRun } from "./useCheckRun";

export function useCheckVoice({
  checkId,
  run,
  intro,
  result,
}: {
  checkId: string;
  run: ReviewRun;
  intro: string;
  result: string;
}) {
  const { t } = useT();
  const { say, quiet, screenReader } = useVoice();
  // Each step is said once, however often the screen re-renders.
  const introFor = useRef<string | null>(null);
  const lastRun = useRef<ReviewRun | null>(null);

  // A new check, or back to the camera after "Try again": say what to photograph.
  useEffect(() => {
    if (run.status !== "idle") {
      introFor.current = null;
      return;
    }
    if (introFor.current === checkId) return;
    introFor.current = checkId;
    // A screen reader reads the step itself: focus moves to the heading (CheckHeading).
    if (!screenReader) say(intro);
  }, [run.status, checkId, intro, say, screenReader]);

  useEffect(() => {
    if (lastRun.current === run) return;
    lastRun.current = run;
    if (run.status === "checking") say(t("sayChecking"));
    else if (run.status === "secondAngle") say(t("sayMoveAside"));
    // With a screen reader, focus moves to the result (ResultSummary), which reads it.
    else if (run.status === "done" || run.status === "error" || run.status === "allDone") {
      if (!screenReader) say(result);
    }
  }, [run, result, say, t, screenReader]);

  useEffect(() => quiet, [quiet]);
}
