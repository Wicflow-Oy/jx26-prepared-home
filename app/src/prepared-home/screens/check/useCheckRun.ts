// One check after the shutter: show the photo at once, prepare it, take the second angle when there is
// one, ask the quick question if the check has one, send both photos in one request and save the result.
import type { CheckDefinition, Home, Peril, Verdict } from "@prepared-home/engine";
import { useCallback, useRef, useState } from "react";

import { usePreparedHome } from "../../context";
import { errorMessage } from "../../errors";
import { haptics } from "../../haptics";
import type { PreparedPhoto } from "../../photoPipeline";
import type { StoredOutcome } from "../../storage";

export type ReviewRun =
  | { status: "idle" | "preparing" | "secondAngle" | "question" | "checking" | "allDone" }
  | { status: "done"; stored: StoredOutcome; newlyPrepared: Peril[] }
  | { status: "error"; message: string };

interface Photos {
  first: PreparedPhoto;
  second?: PreparedPhoto;
}

export function useCheckRun(home: Home, check: CheckDefinition, previousVerdict?: Verdict) {
  const { t, lang, api, saveCheckResult } = usePreparedHome();
  const [run, setRun] = useState<ReviewRun>({ status: "idle" });
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, boolean>>({});
  // Prepared photos wait here for the second angle and the quick question.
  const photos = useRef<Photos | null>(null);
  const questions = check.criteria.filter((c) => c.kind === "user");
  const answered = (a: Record<string, boolean>) =>
    questions.every((c) => typeof a[c.id] === "boolean");

  const submit = useCallback(
    async ({ first, second }: Photos, userAnswers: Record<string, boolean>) => {
      setRun({ status: "checking" });
      try {
        const response = await api.check({
          homeId: home.homeId,
          homeType: home.homeType,
          checkId: check.id,
          lang,
          imageBase64: first.base64,
          width: first.width,
          height: first.height,
          photoSha256: first.sha256,
          ...(second ? { secondImageBase64: second.base64, secondPhotoSha256: second.sha256 } : {}),
          userAnswers,
          capture: first.origin,
        });
        const saved = await saveCheckResult({
          home,
          response,
          photo: first,
          second,
          previousVerdict,
        });
        if (saved.stored.outcome.verdict === "verified") haptics.success();
        else haptics.retry();
        setRun({ status: "done", ...saved });
      } catch (err) {
        haptics.retry();
        setRun({ status: "error", message: errorMessage(err, t) });
      }
    },
    [api, home, check.id, lang, previousVerdict, saveCheckResult, t],
  );

  /** With both photos (or the only one) ready: ask the question if needed, then send. */
  const proceed = async (ready: Photos) => {
    photos.current = ready;
    if (!answered(answers)) {
      setRun({ status: "question" });
      return;
    }
    await submit(ready, answers);
  };

  const begin = async (
    uri: string,
    prepare: () => Promise<PreparedPhoto>,
    options: { secondAngle?: boolean } = {},
  ) => {
    setPhotoUri(uri);
    setRun({ status: "preparing" });
    let first: PreparedPhoto;
    try {
      first = await prepare();
    } catch (err) {
      setRun({ status: "error", message: errorMessage(err, t) });
      return;
    }
    if (options.secondAngle) {
      photos.current = { first };
      setRun({ status: "secondAngle" });
      return;
    }
    await proceed({ first });
  };

  /** The second angle arrived, or could not be taken (null): the check goes on with what there is. */
  const addSecond = async (prepare: (() => Promise<PreparedPhoto>) | null) => {
    const current = photos.current;
    if (!current) return;
    setRun({ status: "preparing" });
    let second: PreparedPhoto | undefined;
    try {
      second = prepare ? await prepare() : undefined;
    } catch {
      second = undefined;
    }
    await proceed({ ...current, second });
  };

  const answer = (criterionId: string, value: boolean) => {
    const next = { ...answers, [criterionId]: value };
    setAnswers(next);
    if (answered(next) && photos.current) void submit(photos.current, next);
  };

  const reset = () => {
    setRun({ status: "idle" });
    setPhotoUri(null);
    setAnswers({});
    photos.current = null;
  };

  return {
    run,
    photoUri,
    answers,
    questions,
    begin,
    addSecond,
    answer,
    reset,
    /** The shutter was pressed: the card appears at once and the photo fills in when the camera delivers it. */
    capturing: () => {
      setPhotoUri(null);
      setRun({ status: "preparing" });
    },
    /** Takes the second angle again for the photo already here, then checks both. */
    retakeSecond: () => {
      if (photos.current) setRun({ status: "secondAngle" });
    },
    fail: (message: string) => setRun({ status: "error", message }),
    finish: () => setRun({ status: "allDone" }),
  };
}
