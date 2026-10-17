// The rules: verdicts, records, peril status, deductible preview, reminders, Home Card and adjuster view.
// Everything here is decided in code. The vision model only reports visibility and condition criteria.

import type {
  CaptureSource,
  AdjusterView,
  CheckDefinition,
  CheckOutcome,
  CheckRecord,
  CriterionResult,
  DeductiblePreview,
  FrostForecast,
  Home,
  HomeCard,
  HomeType,
  Lang,
  Peril,
  PerilState,
  PerilStatus,
  Recheck,
  Reminder,
  ReminderKind,
  VisionAssessment,
} from "./types";
import {
  appliesTo,
  checksFor,
  criterionText,
  fixHintFor,
  getCheck,
  isCheckId,
  ownerFor,
} from "./checks";
import {
  addDays,
  addMonths,
  daysBetween,
  lastJulyFirst,
  maxDay,
  minDay,
  nextMonthStart,
  nextOctoberFirst,
  toDay,
} from "./dates";
import {
  ADJUSTER_NOTE,
  DISCLAIMER,
  PERIL_LABELS,
  TEXT,
  fill,
  formatDay,
  localize,
  quote,
} from "./i18n";

// ------------------------------------------------------------------ deductibles

export type DeductibleConfig = Record<Peril, { standard: number; prepared: number }>;

/** Concept amounts only; If decides the real ones. */
export const DEFAULT_DEDUCTIBLES: DeductibleConfig = {
  leak: { standard: 300, prepared: 100 },
  fire: { standard: 300, prepared: 100 },
  freeze: { standard: 300, prepared: 100 },
  storm_water: { standard: 300, prepared: 100 },
};

function deductibleConfig(overrides?: Partial<DeductibleConfig>): DeductibleConfig {
  return { ...DEFAULT_DEDUCTIBLES, ...(overrides ?? {}) };
}

function preview(cfg: DeductibleConfig, peril: Peril, relief: boolean): DeductiblePreview {
  const { standard, prepared } = cfg[peril];
  return { standard, prepared, current: relief ? prepared : standard, label: "concept" };
}

/** The perils shown with their own status and deductible. */
export type PerilGroup = "leak" | "fire" | "freeze";
export const PERIL_GROUPS: PerilGroup[] = ["leak", "fire", "freeze"];

/** Storm water (S1) counts toward leak. */
export function perilGroup(peril: Peril): PerilGroup {
  return peril === "storm_water" ? "leak" : peril;
}

// ------------------------------------------------------------------ verdicts

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

// ------------------------------------------------------------------ records and due dates

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

/** Only photos taken with the in-app camera count; gallery and example photos are shown but don't count. */
export function countsForRelief(record: CheckRecord): boolean {
  return record.capture === undefined || record.capture === "camera";
}

const timeOf = (r: CheckRecord) => {
  const ms = Date.parse(r.checkedAt);
  return Number.isNaN(ms) ? 0 : ms;
};

/**
 * The record that counts for each check: the latest verified, not_applicable or fix_first record.
 * A later retake (an unclear photo) does not undo an earlier result; a retake counts only if nothing else exists.
 */
export function effectiveRecords(records: CheckRecord[]): Map<string, CheckRecord> {
  const sorted = records
    .map((r, i) => ({ r, i }))
    .sort((x, y) => timeOf(x.r) - timeOf(y.r) || x.i - y.i)
    .map((x) => x.r);
  const decided = new Map<string, CheckRecord>();
  const retakes = new Map<string, CheckRecord>();
  for (const r of sorted) (r.verdict === "retake" ? retakes : decided).set(r.checkId, r);
  for (const [id, r] of retakes) if (!decided.has(id)) decided.set(id, r);
  return decided;
}

function dueOf(record: CheckRecord): string {
  return record.dueAt ?? dueDateFor(getCheck(record.checkId).recheck, record.checkedAt);
}

function ownRecords(home: Home, records: CheckRecord[]): CheckRecord[] {
  return records.filter((r) => r.homeId === home.homeId && isCheckId(r.checkId));
}

// ------------------------------------------------------------------ peril status

type Slot = "verified" | "notApplicable" | "fixFirst" | "missing" | "overdue" | "notCounted";

/** A record is current through its due date; it is overdue from the next day. */
function slotOf(record: CheckRecord | undefined, today: string): Slot {
  if (!record || record.verdict === "retake") return "missing";
  if (record.verdict === "fix_first") return "fixFirst";
  if (today > dueOf(record)) return "overdue";
  if (record.verdict === "verified" && !countsForRelief(record)) return "notCounted";
  return record.verdict === "verified" ? "verified" : "notApplicable";
}

function groupStatus(
  group: PerilGroup,
  home: Home,
  required: string[],
  own: CheckRecord[],
  effective: Map<string, CheckRecord>,
  today: string,
  cfg: DeductibleConfig,
): PerilStatus {
  const lists: Record<Slot, string[]> = {
    verified: [],
    notApplicable: [],
    fixFirst: [],
    missing: [],
    overdue: [],
    notCounted: [],
  };
  for (const id of required) lists[slotOf(effective.get(id), today)].push(id);

  const touched = own.some((r) => required.includes(r.checkId));
  const covered =
    lists.verified.length + lists.notApplicable.length + lists.overdue.length === required.length;
  let state: PerilState;
  if (!touched) state = "not_started";
  else if (covered && lists.overdue.length === 0) state = "prepared";
  else if (covered) state = "lapsed";
  else state = "in_progress";

  let preparedUntil: string | null = null;
  if (state === "prepared") {
    for (const id of required) {
      const due = dueOf(effective.get(id)!);
      preparedUntil = preparedUntil ? minDay(preparedUntil, due) : due;
    }
  }

  return {
    peril: group,
    state,
    required: [...required],
    verified: lists.verified,
    notApplicable: lists.notApplicable,
    fixFirst: lists.fixFirst,
    missing: lists.missing,
    overdue: lists.overdue,
    notCounted: lists.notCounted,
    preparedUntil,
    deductible: preview(cfg, group, state === "prepared"),
    alarmDeviceLine: group === "leak" && home.hasLeakAlarm,
  };
}

/** Required check ids per peril group for a home type (storm water counts toward leak). */
export function requiredChecks(homeType: HomeType, group: PerilGroup): string[] {
  return checksFor(homeType)
    .filter((c) => perilGroup(c.peril) === group)
    .map((c) => c.id);
}

/** Status per peril group (leak, fire, freeze). Groups without checks for the home type are left out (flats have no freeze). */
export function perilStatuses(
  home: Home,
  records: CheckRecord[],
  now: Date,
  deductibles?: DeductibleConfig,
): PerilStatus[] {
  const today = toDay(now);
  const cfg = deductibleConfig(deductibles);
  const own = ownRecords(home, records);
  const effective = effectiveRecords(own);
  const out: PerilStatus[] = [];
  for (const group of PERIL_GROUPS) {
    const required = requiredChecks(home.homeType, group);
    if (required.length) out.push(groupStatus(group, home, required, own, effective, today, cfg));
  }
  return out;
}

// ------------------------------------------------------------------ reminders

/** A fix_first reminder comes this many days after the check. */
export const FIX_FIRST_REMINDER_DAYS = 7;
/** A frost reminder fires when the first forecast frost is at most this many days away. */
export const FROST_WINDOW_DAYS = 7;

const KIND_ORDER: Record<ReminderKind, number> = { frost: 0, fix_first: 1, seasonal: 2, yearly: 3 };

function frostTrigger(frost: FrostForecast, frostDay: string): string {
  const where = frost.source === "fixture" ? "FMI forecast (fixture)" : "FMI forecast";
  return frost.minTempC === null
    ? `${where}: first frost on ${frostDay}`
    : `${where} minimum ${frost.minTempC.toFixed(1)} °C on ${frostDay}`;
}

export function reminders(
  home: Home,
  records: CheckRecord[],
  now: Date,
  frost: FrostForecast | null,
): Reminder[] {
  const today = toDay(now);
  const checks = checksFor(home.homeType);
  const effective = effectiveRecords(ownRecords(home, records));
  const out: Reminder[] = [];

  // Frost: Z2 not verified since the last 1 July, and the first forecast frost within 7 days.
  const frostChecks = new Set<string>();
  if (frost?.firstFrostDate) {
    const frostDay = toDay(frost.firstFrostDate);
    const daysAway = daysBetween(today, frostDay);
    if (daysAway >= 0 && daysAway <= FROST_WINDOW_DAYS) {
      const seasonStart = lastJulyFirst(today);
      for (const check of checks.filter((c) => c.recheck.kind === "frost")) {
        const rec = effective.get(check.id);
        const doneThisSeason = rec?.verdict === "verified" && toDay(rec.checkedAt) >= seasonStart;
        if (doneThisSeason || rec?.verdict === "not_applicable") continue;
        frostChecks.add(check.id);
        out.push({
          id: `frost-${check.id}-${frostDay}`,
          kind: "frost",
          checkIds: [check.id],
          dueAt: maxDay(today, addDays(frostDay, -1)),
          title: { ...TEXT.frost },
          trigger: frostTrigger(frost, frostDay),
        });
      }
    }
  }

  // Fix-first and scheduled re-checks.
  const groups = new Map<
    string,
    { kind: ReminderKind; dueAt: string; checks: CheckDefinition[] }
  >();
  for (const check of checks) {
    if (frostChecks.has(check.id)) continue;
    const rec = effective.get(check.id);
    if (!rec || rec.verdict === "retake") continue;
    if (rec.verdict === "fix_first") {
      out.push({
        id: `fix_first-${check.id}`,
        kind: "fix_first",
        checkIds: [check.id],
        dueAt: addDays(toDay(rec.checkedAt), FIX_FIRST_REMINDER_DAYS),
        title: localize(TEXT.fixFirst, (l) => ({ title: check.title[l] })),
      });
      continue;
    }
    const kind: ReminderKind = check.recheck.kind === "yearly" ? "yearly" : "seasonal";
    const dueAt = dueOf(rec);
    const key = `${kind}|${dueAt}`;
    const group = groups.get(key) ?? { kind, dueAt, checks: [] };
    group.checks.push(check);
    groups.set(key, group);
  }
  for (const g of groups.values()) {
    const one = g.checks.length === 1 ? g.checks[0]! : null;
    const title = one
      ? localize(g.kind === "yearly" ? TEXT.yearlyOne : TEXT.seasonalOne, (l) => ({
          title: one.title[l],
        }))
      : localize(g.kind === "yearly" ? TEXT.yearlyMany : TEXT.seasonalMany, () => ({
          n: g.checks.length,
        }));
    out.push({
      id: `${g.kind}-${g.dueAt}`,
      kind: g.kind,
      checkIds: g.checks.map((c) => c.id),
      dueAt: g.dueAt,
      title,
    });
  }

  return out.sort((x, y) =>
    x.dueAt < y.dueAt ? -1 : x.dueAt > y.dueAt ? 1 : KIND_ORDER[x.kind] - KIND_ORDER[y.kind],
  );
}

// ------------------------------------------------------------------ Home Card

export const SHA_SHORT_LENGTH = 12;

export function homeCard(
  home: Home,
  records: CheckRecord[],
  now: Date,
  frost: FrostForecast | null,
  lang: Lang,
): HomeCard {
  const effective = effectiveRecords(ownRecords(home, records));
  const checks = checksFor(home.homeType);

  const cardRecords: HomeCard["records"] = [];
  for (const check of checks) {
    const rec = effective.get(check.id);
    if (!rec || rec.verdict === "retake") continue;
    cardRecords.push({
      checkId: check.id,
      verdict: rec.verdict,
      checkedAt: rec.checkedAt,
      photoSha256Short: rec.photoSha256 ? rec.photoSha256.slice(0, SHA_SHORT_LENGTH) : null,
    });
  }

  const l1 = effective.get("L1");
  let shutOffNote: string | null = null;
  if (l1?.verdict === "verified")
    shutOffNote = fill(TEXT.shutOffChecked[lang], { date: formatDay(toDay(l1.checkedAt), lang) });
  else if (l1?.verdict === "fix_first")
    shutOffNote = fill(TEXT.shutOffFix[lang], { date: formatDay(toDay(l1.checkedAt), lang) });

  return {
    homeId: home.homeId,
    label: home.label,
    homeType: home.homeType,
    generatedAt: now.toISOString(),
    perils: perilStatuses(home, records, now).map((p) => ({
      peril: p.peril,
      state: p.state,
      preparedUntil: p.preparedUntil,
    })),
    records: cardRecords,
    shutOffNote,
    nextReminder: reminders(home, records, now, frost)[0] ?? null,
    disclaimer: DISCLAIMER[lang],
  };
}

// ------------------------------------------------------------------ adjuster view

const normHash = (h: string | null | undefined) =>
  typeof h === "string" ? h.trim().toLowerCase() : "";

/**
 * Relief applies only if the peril (its group) was prepared on the loss date, using records checked before
 * that date and due on or after it, and every shared photo's hash matches the record that counted.
 * Cover is never affected.
 */
export function adjusterView(
  input: {
    claimId: string;
    home: Home;
    records: CheckRecord[];
    peril: Peril;
    lossDate: string;
    shared: { checkId: string; sha256: string }[];
  },
  deductibles?: DeductibleConfig,
): AdjusterView {
  const { claimId, home, peril } = input;
  const lossDay = toDay(input.lossDate);
  const shared = input.shared ?? [];
  const cfg = deductibleConfig(deductibles);
  const group = perilGroup(peril);
  const perilName = PERIL_LABELS[group].en;

  const own = ownRecords(home, input.records);
  const before = own.filter((r) => toDay(r.checkedAt) < lossDay);
  const effective = effectiveRecords(before);
  const required = requiredChecks(home.homeType, group);
  const status = required.length
    ? groupStatus(group, home, required, before, effective, lossDay, cfg)
    : null;
  const state: PerilState = status?.state ?? "not_started";

  const reasons: string[] = [];
  if (!status) reasons.push(`No checks cover ${perilName.toLowerCase()} for a ${home.homeType}.`);
  else if (state !== "prepared")
    reasons.push(`${perilName} was not prepared on ${lossDay} (${state.replace("_", " ")}).`);

  // Per required check
  const view: AdjusterView["records"] = [];
  const listed = new Set<string>();
  const addRecord = (checkId: string, rec: CheckRecord) => {
    const photos = shared.filter((s) => s.checkId === checkId);
    const current =
      (rec.verdict === "verified" || rec.verdict === "not_applicable") &&
      dueOf(rec) >= lossDay &&
      countsForRelief(rec);
    view.push({
      checkId,
      verdict: rec.verdict,
      checkedAt: rec.checkedAt,
      validAtLoss: current,
      photoShared: photos.length > 0,
      hashMatches: photos.length
        ? photos.every((p) => !!rec.photoSha256 && normHash(p.sha256) === normHash(rec.photoSha256))
        : null,
    });
    listed.add(checkId);
  };

  for (const id of required) {
    const rec = effective.get(id);
    if (!rec) {
      const later = own.filter((r) => r.checkId === id).sort((a, b) => timeOf(a) - timeOf(b))[0];
      reasons.push(
        later
          ? `${id} was first checked after the loss date (${toDay(later.checkedAt)}).`
          : `${id} was never checked before the loss date.`,
      );
      continue;
    }
    addRecord(id, rec);
    if (rec.verdict === "fix_first")
      reasons.push(`${id} was fix_first and never re-taken before the loss date.`);
    else if (rec.verdict === "retake")
      reasons.push(`${id} had only unclear photos (retake) before the loss date.`);
    else if (!countsForRelief(rec))
      reasons.push(`${id} was checked with a gallery or example photo, which does not count.`);
    else if (dueOf(rec) < lossDay)
      reasons.push(`${id} was past its due date (${dueOf(rec)}) on the loss date.`);
  }

  // Shared photos
  let hashesOk = true;
  let matched = 0;
  for (const s of shared) {
    const rec = effective.get(s.checkId);
    if (!rec) {
      hashesOk = false;
      reasons.push(
        `The shared photo for ${s.checkId} has no check record from before the loss date.`,
      );
      continue;
    }
    if (!listed.has(s.checkId)) addRecord(s.checkId, rec);
    if (!rec.photoSha256) {
      hashesOk = false;
      reasons.push(
        `The shared photo for ${s.checkId} cannot be compared: that record has no photo.`,
      );
    } else if (normHash(s.sha256) !== normHash(rec.photoSha256)) {
      hashesOk = false;
      reasons.push(`The shared photo for ${s.checkId} does not match the stored hash.`);
    } else {
      matched++;
    }
  }

  const relief = state === "prepared" && hashesOk;
  if (relief) {
    reasons.unshift(
      `${perilName} was prepared on ${lossDay}: all ${required.length} checks were current.`,
    );
    reasons.push(
      shared.length
        ? matched === 1
          ? "The shared photo matches the stored hash."
          : `All ${matched} shared photos match the stored hashes.`
        : "No photos were shared; the dated records were used.",
    );
  }

  return {
    claimId,
    homeId: home.homeId,
    peril,
    lossDate: lossDay,
    perilStateAtLoss: state,
    records: view,
    decision: relief ? "relief_applies" : "bonus_not_applied",
    deductible: preview(cfg, peril, relief),
    reasons,
    note: ADJUSTER_NOTE,
  };
}
