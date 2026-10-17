// Status per peril: which records count, whether each peril group is prepared, and the deductible preview.

import type {
  CheckRecord,
  DeductiblePreview,
  Home,
  HomeType,
  Peril,
  PerilState,
  PerilStatus,
} from "./types";
import { checksFor, getCheck, isCheckId } from "./checks";
import { minDay, toDay } from "./dates";
import { dueDateFor } from "./verdict";

export type DeductibleConfig = Record<Peril, { standard: number; prepared: number }>;

/** Concept amounts only; If decides the real ones. */
export const DEFAULT_DEDUCTIBLES: DeductibleConfig = {
  leak: { standard: 300, prepared: 100 },
  fire: { standard: 300, prepared: 100 },
  freeze: { standard: 300, prepared: 100 },
  storm_water: { standard: 300, prepared: 100 },
};

export function deductibleConfig(overrides?: Partial<DeductibleConfig>): DeductibleConfig {
  return { ...DEFAULT_DEDUCTIBLES, ...(overrides ?? {}) };
}

export function preview(cfg: DeductibleConfig, peril: Peril, relief: boolean): DeductiblePreview {
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

/** Only photos taken with the in-app camera count; gallery and example photos are shown but don't count. */
export function countsForRelief(record: CheckRecord): boolean {
  if (record.capture === undefined) return true;
  if (record.capture !== "camera") return false;
  return !REQUIRE_SECOND_ANGLE || !!record.secondPhotoSha256;
}

/**
 * A second photo from another angle makes a screen or printout much harder to pass off as the real item.
 * Required for camera photos to count once the app always takes the pair.
 */
export const REQUIRE_SECOND_ANGLE = false;

/** When a record was checked, in ms; an unreadable date sorts first. */
export const timeOf = (r: CheckRecord) => {
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

/** The record's due date, worked out again if it was stored without one. */
export function dueOf(record: CheckRecord): string {
  return record.dueAt ?? dueDateFor(getCheck(record.checkId).recheck, record.checkedAt);
}

/** This home's records for known checks; anything else is ignored. */
export function ownRecords(home: Home, records: CheckRecord[]): CheckRecord[] {
  return records.filter((r) => r.homeId === home.homeId && isCheckId(r.checkId));
}

type Slot = "verified" | "notApplicable" | "fixFirst" | "missing" | "overdue" | "notCounted";

/** A record is current through its due date; it is overdue from the next day. */
function slotOf(record: CheckRecord | undefined, today: string): Slot {
  if (!record || record.verdict === "retake") return "missing";
  if (record.verdict === "fix_first") return "fixFirst";
  if (today > dueOf(record)) return "overdue";
  if (record.verdict === "verified" && !countsForRelief(record)) return "notCounted";
  return record.verdict === "verified" ? "verified" : "notApplicable";
}

export function groupStatus(
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
