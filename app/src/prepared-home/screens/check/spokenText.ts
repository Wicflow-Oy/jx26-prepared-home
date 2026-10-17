// The sentences voice guidance says, also used as the screen-reader label of each step and result.
import type { CheckDefinition, Home, Lang } from "@prepared-home/engine";

import type { Translate } from "../../i18n";
import { ownerLabel, photoCount, PHOTO_COUNT_NOTE } from "../../model";
import { checkInstruction } from "./checkInstruction";
import { guidanceFor } from "./guidance";
import type { ReviewRun } from "./useCheckRun";

const sentence = (text: string) => (/[.!?…]$/.test(text.trim()) ? text.trim() : `${text.trim()}.`);
const join = (...parts: (string | false | null | undefined)[]) =>
  parts.filter((p): p is string => !!p).join(" ");

/** "Check 3 of 11. Washing machine hose and valve. Show the hose and its valve. Tap the big button…" */
export function spokenIntro(input: {
  check: CheckDefinition;
  home: Home;
  position: number;
  total: number;
  camera: "ready" | "needsPermission" | "none";
  lang: Lang;
  t: Translate;
}): string {
  const { check, home, position, total, camera, lang, t } = input;
  return join(
    t("sayCheck", {
      position: t("checkPosition", { n: position, total }),
      title: check.title[lang],
      instruction: checkInstruction(check.id, home.homeType, t),
    }),
    t(
      camera === "ready"
        ? "sayShutter"
        : camera === "needsPermission"
          ? "sayAllowCamera"
          : "sayNoCamera",
    ),
  );
}

/** The verdict and what to do next, e.g. "Not yet. The photo is too dark. Turn on the light…" */
export function spokenResult(input: {
  run: ReviewRun;
  check: CheckDefinition;
  home: Home;
  next: CheckDefinition | null;
  lang: Lang;
  t: Translate;
}): string {
  const { run, check, home, next, lang, t } = input;
  if (run.status === "error") return run.message;
  if (run.status === "allDone") return join(sentence(t("allChecksDone")), t("allChecksDoneBody"));
  if (run.status !== "done") return "";

  const { outcome, source, capture, secondPhotoSha256 } = run.stored;
  const count = photoCount(capture, secondPhotoSha256);
  const guidance = guidanceFor({ check, home, outcome, source, lang, t });
  if (guidance.kind === "ok") {
    return join(
      t("sayDone", { title: check.title[lang] }),
      count !== "counts" && t(PHOTO_COUNT_NOTE[count]),
      next && t("sayNext", { title: next.title[lang] }),
    );
  }
  if (guidance.kind === "retake") {
    return join(
      t("sayNotYet"),
      sentence(guidance.problem),
      ...guidance.tips.map(sentence),
      t("sayThenRetry"),
    );
  }
  return join(
    t("sayFixFirst"),
    outcome.urgent && t("urgent"),
    sentence(guidance.fix),
    sentence(t("whoFixes", { owner: ownerLabel(guidance.owner, lang) })),
  );
}
