// Verdicts and records. The vision model only reports visibility and condition criteria;
// the verdict, the due date and the record are decided here, in code.

import type {
  CaptureSource,
  CheckDefinition,
  CheckOutcome,
  CheckRecord,
  CriterionResult,
  HomeType,
  Lang,
  Recheck,
  VisionAssessment,
} from "./types";
import { appliesTo, criterionText, fixHintFor, getCheck, ownerFor } from "./checks";
import { addMonths, minDay, nextMonthStart, nextOctoberFirst, toDay } from "./dates";
import { TEXT, fill, quote } from "./i18n";

function matchCriterionId(check: CheckDefinition, rawId: string): string | null {
  const ids = check.criteria.filter((c) => c.kind !== "user").map((c) => c.id);
  if (ids.includes(rawId)) return rawId;
  const prefixed = `${check.id}.${rawId}`;
  return ids.includes(prefixed) ? prefixed : null;
}

function answerFor(
  userAnswers: Record<string, boolean> | undefined,
  check: CheckDefinition,
  criterionId: string,
): boolean | null {
  if (!userAnswers) return null;
  const short = criterionId.startsWith(`${check.id}.`)
    ? criterionId.slice(check.id.length + 1)
    : criterionId;
  const value = userAnswers[criterionId] ?? userAnswers[short];
  return typeof value === "boolean" ? value : null;
}

const nonEmpty = (s: string | null | undefined): string | null =>
  typeof s === "string" && s.trim() ? s.trim() : null;

/** Months (1-12) of the cold season for criteria marked `coldSeasonOnly` (OMA 5.5.4 "during the cold season";
 *  the terms give no dates, so the engine reads it as 1 October to 30 April, UTC). */
export const COLD_SEASON_MONTHS: readonly number[] = [10, 11, 12, 1, 2, 3, 4];

export function isColdSeason(now: Date | string): boolean {
  return COLD_SEASON_MONTHS.includes(Number(toDay(now).slice(5, 7)));
}

/**
 * Verdict rules (CONTRACTS §2), in this order:
 * 1. any visibility criterion false or null -> retake;
 * 2. any condition criterion null, or any user answer missing -> retake;
 * 3. any condition or user criterion false -> fix_first;
 * 4. otherwise verified.
 * A missing assessment (offline, error) -> retake. User criteria come only from userAnswers, never from the model.
 * A `coldSeasonOnly` criterion outside the cold season (judged on `now`, default: the current time) is shown with
 * a note but left out of rules 1-3.
 * "not_applicable" never comes from here; see notApplicableOutcome.
 */
export function decideVerdict(
  check: CheckDefinition,
  a: VisionAssessment | null,
  userAnswers: Record<string, boolean>,
  lang: Lang,
  homeType: HomeType,
  now: Date | string = new Date(),
): CheckOutcome {
  const offSeason = new Set(
    isColdSeason(now) ? [] : check.criteria.filter((c) => c.coldSeasonOnly).map((c) => c.id),
  );

  const fromModel = new Map<string, { met: boolean | null; note?: string }>();
  for (const c of a?.criteria ?? []) {
    const id = c && typeof c.id === "string" ? matchCriterionId(check, c.id) : null;
    if (id)
      fromModel.set(id, {
        met: typeof c.met === "boolean" ? c.met : null,
        ...(nonEmpty(c.note) ? { note: c.note!.trim() } : {}),
      });
  }

  const criteria: CriterionResult[] = check.criteria.map((c) => {
    const text = (criterionText(check, c.id, homeType) ?? c.text)[lang];
    const m = c.kind === "user" ? undefined : a ? fromModel.get(c.id) : undefined;
    const met = c.kind === "user" ? answerFor(userAnswers, check, c.id) : (m?.met ?? null);
    const note = offSeason.has(c.id) && met !== true ? TEXT.coldSeasonOnly[lang] : m?.note;
    return { id: c.id, kind: c.kind, text, met, ...(note ? { note } : {}) };
  });

  const base = {
    checkId: check.id,
    criteria,
    urgent: a?.urgent === true,
    boxes: Array.isArray(a?.boxes) ? a!.boxes : [],
  };
  const retake = (hint: string): CheckOutcome => ({
    ...base,
    verdict: "retake",
    retakeHint: hint,
    fix: null,
  });

  if (!a) return retake(TEXT.couldNotCheck[lang]);
  // A photo of a screen or a printout proves nothing about the home, whatever it shows.
  if (a.reproduction === true) return retake(TEXT.reproduction[lang]);

  // Off-season criteria are shown but never decide the verdict.
  const counted = criteria.filter((c) => !offSeason.has(c.id));
  const of = (kind: CriterionResult["kind"]) => counted.filter((c) => c.kind === kind);
  const list = (items: CriterionResult[]) => items.map((c) => c.text).join("; ");
  const modelHint = nonEmpty(a.retakeHint);
  const missingAnswers = of("user").filter((c) => c.met === null);
  const answerHint = missingAnswers.length
    ? fill(TEXT.answerPrompt[lang], {
        items: missingAnswers.map((c) => quote(c.text, lang)).join(", "),
      })
    : null;
  const join = (...hints: (string | null)[]) => hints.filter((h): h is string => !!h).join(" ");

  // 1. Visibility
  const notVisible = of("visibility").filter((c) => c.met !== true);
  if (notVisible.length)
    return retake(
      join(modelHint ?? fill(TEXT.retakeVisible[lang], { items: list(notVisible) }), answerHint),
    );

  // 2. Unjudged condition, or a missing answer
  const unjudged = of("condition").filter((c) => c.met === null);
  if (unjudged.length || missingAnswers.length) {
    const photoHint = unjudged.length
      ? (modelHint ?? fill(TEXT.retakeCondition[lang], { items: list(unjudged) }))
      : null;
    return retake(join(photoHint, answerHint));
  }

  // 3. A failed condition or user criterion
  const failed = counted.filter(
    (c) => (c.kind === "condition" || c.kind === "user") && c.met === false,
  );
  if (failed.length) {
    return {
      ...base,
      verdict: "fix_first",
      retakeHint: null,
      fix: { text: fixHintFor(check, homeType)[lang], owner: ownerFor(check, homeType) },
    };
  }

  // 4. Verified
  return { ...base, verdict: "verified", retakeHint: null, fix: null };
}

/** The outcome when the customer marks a check "not applicable". Throws unless the check allows it. */
export function notApplicableOutcome(
  check: CheckDefinition,
  lang: Lang,
  homeType: HomeType,
): CheckOutcome {
  if (!check.notApplicableAllowed)
    throw new Error(`Check ${check.id} cannot be marked not applicable`);
  return {
    checkId: check.id,
    verdict: "not_applicable",
    criteria: check.criteria.map((c) => ({
      id: c.id,
      kind: c.kind,
      text: (criterionText(check, c.id, homeType) ?? c.text)[lang],
      met: null,
    })),
    retakeHint: null,
    fix: null,
    urgent: false,
    boxes: [],
  };
}

/**
 * Due date for a check done on `checkedAt` (UTC day):
 * yearly: +12 months; seasonal: the next listed month start, at most 12 months away;
 * frost: the next 1 October, or 12 months, whichever is sooner.
 */
export function dueDateFor(recheck: Recheck, checkedAt: Date | string): string {
  const day = toDay(checkedAt);
  const yearLater = addMonths(day, 12);
  switch (recheck.kind) {
    case "yearly":
      return yearLater;
    case "seasonal": {
      const next = nextMonthStart(day, recheck.months);
      return next ? minDay(next, yearLater) : yearLater;
    }
    case "frost":
      return minDay(nextOctoberFirst(day), yearLater);
  }
}

export function recordFromOutcome(
  homeId: string,
  outcome: CheckOutcome,
  checkedAt: Date,
  photoSha256: string | null,
  homeType: HomeType,
  capture?: CaptureSource,
): CheckRecord {
  const check = getCheck(outcome.checkId);
  if (!appliesTo(check, homeType))
    throw new Error(`Check ${check.id} does not apply to a ${homeType}`);
  const current = outcome.verdict === "verified" || outcome.verdict === "not_applicable";
  const userAnswers: Record<string, boolean> = {};
  for (const c of outcome.criteria) {
    if (c.kind === "user" && typeof c.met === "boolean") userAnswers[c.id] = c.met;
  }
  return {
    homeId,
    checkId: check.id,
    verdict: outcome.verdict,
    checkedAt: checkedAt.toISOString(),
    dueAt: current ? dueDateFor(check.recheck, checkedAt) : null,
    photoSha256:
      outcome.verdict === "not_applicable" ? null : (nonEmpty(photoSha256)?.toLowerCase() ?? null),
    ...(Object.keys(userAnswers).length ? { userAnswers } : {}),
    ...(capture ? { capture } : {}),
  };
}
