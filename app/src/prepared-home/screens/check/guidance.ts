// Turns a check result into short, human guidance: what went wrong and one to three things to do next.
// The rules live here, in one place, so every screen says the same thing.
import {
  fixHintFor,
  ownerFor,
  type CheckDefinition,
  type CheckOutcome,
  type Home,
  type Lang,
  type Owner,
} from "@prepared-home/engine";

import type { CheckSource } from "../../api";
import type { StringKey, Translate } from "../../i18n";
import { checkInstruction } from "./checkInstruction";

export type Guidance =
  | { kind: "ok" }
  | { kind: "retake"; problem: string; tips: string[] }
  | { kind: "fix"; problem: string; fix: string; owner: Owner };

/**
 * Words in the model's (English) photo hint that point to a specific photo problem. Recorded results
 * keep their English hint, so the same rules work whatever language the app is in.
 * A tip of "include" shows the check's own one-line instruction.
 */
const HINT_RULES: { pattern: RegExp; problem: StringKey; tip: StringKey | "include" }[] = [
  {
    pattern: /\b(dark|dim|black|underexposed|lighting|shadow)/i,
    problem: "gTooDark",
    tip: "tipLight",
  },
  {
    pattern: /\b(blur|blurry|out of focus|focus|sharp|motion)/i,
    problem: "gBlurry",
    tip: "tipFocus",
  },
  {
    pattern:
      /\b(different|wrong|not (a|an|the) (valve|hose|drain|trap|alarm|fuse|fridge|stove)|no (valve|hose|drain|trap|smoke alarm|fuse box))/i,
    problem: "gDifferentSpot",
    tip: "include",
  },
  {
    pattern: /\b(closer|far away|too far|crop|cut off|whole|entire|frame)/i,
    problem: "gCantSee",
    tip: "tipStepBack",
  },
];

/**
 * A photo of a screen, a printout or another photo. The server sends a fixed hint for this in the
 * request language, so the words of all three languages are matched.
 */
const REPRODUCTION = /(\bscreen\b|\bprint(ed|out)\b|näyttö|tulost|skärm|utskriv)/i;

export function guidanceFor(input: {
  check: CheckDefinition;
  home: Home;
  outcome: CheckOutcome;
  source: CheckSource;
  lang: Lang;
  t: Translate;
}): Guidance {
  const { check, home, outcome, source, lang, t } = input;
  const include = checkInstruction(check.id, home.homeType, t);

  if (outcome.verdict === "verified" || outcome.verdict === "not_applicable") return { kind: "ok" };

  if (outcome.verdict === "fix_first") {
    return {
      kind: "fix",
      problem: t("gFix"),
      fix: fixHintFor(check, home.homeType)[lang],
      owner: outcome.fix?.owner ?? ownerFor(check, home.homeType),
    };
  }

  // Retake: the photo could not be judged.
  if (source === "offline")
    return { kind: "retake", problem: t("gOffline"), tips: [t("tipOffline")] };

  const hint = outcome.retakeHint ?? "";
  if (REPRODUCTION.test(hint))
    return { kind: "retake", problem: t("gReproduction"), tips: [t("tipRealItem"), include] };

  const tips: string[] = [];
  let problem: string | null = null;
  for (const rule of HINT_RULES) {
    if (!rule.pattern.test(hint)) continue;
    problem ??= t(rule.problem);
    const tip = rule.tip === "include" ? include : t(rule.tip);
    if (!tips.includes(tip)) tips.push(tip);
  }

  const missing = outcome.criteria.filter((c) => c.kind === "visibility" && c.met !== true);
  problem ??= missing.length ? t("gCantSee") : t("gNotClear");
  if (!tips.includes(include)) tips.push(include);
  if (tips.length < 2) tips.push(missing.length ? t("tipStepBack") : t("tipLight"));
  return { kind: "retake", problem, tips: tips.slice(0, 3) };
}
