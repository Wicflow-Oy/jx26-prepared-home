// Derived view of one home, computed on the device with the engine (docs/CONTRACTS.md §9.1).
import {
  DEMO_FLAT_ID,
  DEMO_FRESH_ID,
  DEMO_HOUSE_ID,
  checksFor,
  effectiveRecords,
  homeCard,
  OWNER_LABELS,
  PERIL_LABELS,
  perilStatuses,
  reminders as engineReminders,
  STATE_LABELS,
  VERDICT_LABELS,
  type CheckDefinition,
  type CheckRecord,
  type Home,
  type HomeCard,
  type Lang,
  type Owner,
  type Peril,
  type PerilState,
  type PerilStatus,
  type Reminder,
  type Verdict,
} from "@prepared-home/engine";
import { useMemo } from "react";

import { usePreparedHome } from "./context";
import { allTranslations, type Translate } from "./i18n";

/** needs_camera: verified with a gallery or example photo, so it shows as done but does not count. */
export type RowState =
  | "verified"
  | "needs_camera"
  | "not_applicable"
  | "fix_first"
  | "retake"
  | "overdue"
  | "not_checked";

export interface NextStep {
  kind: "fix" | "retake" | "missing" | "overdue" | "camera";
  check: CheckDefinition;
}

export interface HomeModel {
  home: Home;
  checks: CheckDefinition[];
  checkById: Map<string, CheckDefinition>;
  records: CheckRecord[];
  effective: Map<string, CheckRecord>;
  perils: PerilStatus[];
  reminders: Reminder[];
  card: HomeCard;
  done: number;
  total: number;
  rowState: (checkId: string) => RowState;
  nextStep: NextStep | null;
  nextRecheck: { date: string; checkIds: string[] } | null;
}

export function buildHomeModel(
  home: Home,
  records: CheckRecord[],
  now: Date,
  frost: Parameters<typeof engineReminders>[3],
  lang: Lang,
): HomeModel {
  const checks = checksFor(home.homeType);
  const checkById = new Map(checks.map((c) => [c.id, c]));
  const effective = effectiveRecords(records.filter((r) => r.homeId === home.homeId));
  const perils = perilStatuses(home, records, now);
  const reminders = [...engineReminders(home, records, now, frost)].sort((a, b) =>
    a.dueAt.localeCompare(b.dueAt),
  );
  const card = homeCard(home, records, now, frost, lang);

  const slot = new Map<string, RowState>();
  for (const p of perils) {
    p.verified.forEach((id) => slot.set(id, "verified"));
    p.notCounted.forEach((id) => slot.set(id, "needs_camera"));
    p.notApplicable.forEach((id) => slot.set(id, "not_applicable"));
    p.fixFirst.forEach((id) => slot.set(id, "fix_first"));
    p.overdue.forEach((id) => slot.set(id, "overdue"));
    p.missing.forEach((id) =>
      slot.set(id, effective.get(id)?.verdict === "retake" ? "retake" : "not_checked"),
    );
  }
  const rowState = (checkId: string): RowState => slot.get(checkId) ?? "not_checked";

  const total = perils.reduce((n, p) => n + p.required.length, 0);
  const done = perils.reduce((n, p) => n + doneCount(p), 0);

  const order: { state: RowState; kind: NextStep["kind"] }[] = [
    { state: "fix_first", kind: "fix" },
    { state: "overdue", kind: "overdue" },
    { state: "retake", kind: "retake" },
    { state: "not_checked", kind: "missing" },
    { state: "needs_camera", kind: "camera" },
  ];
  let nextStep: NextStep | null = null;
  for (const { state, kind } of order) {
    const check = checks.find((c) => rowState(c.id) === state);
    if (check) {
      nextStep = { kind, check };
      break;
    }
  }

  let nextRecheck: HomeModel["nextRecheck"] = null;
  for (const c of checks) {
    const r = effective.get(c.id);
    const state = rowState(c.id);
    if (!r?.dueAt || (state !== "verified" && state !== "not_applicable")) continue;
    if (!nextRecheck || r.dueAt < nextRecheck.date)
      nextRecheck = { date: r.dueAt, checkIds: [c.id] };
    else if (r.dueAt === nextRecheck.date) nextRecheck.checkIds.push(c.id);
  }

  return {
    home,
    checks,
    checkById,
    records,
    effective,
    perils,
    reminders,
    card,
    done,
    total,
    rowState,
    nextStep,
    nextRecheck,
  };
}

/** Checks that show as done: verified (also with a photo that does not count) or not applicable. */
export const doneCount = (p: PerilStatus) =>
  p.verified.length + p.notCounted.length + p.notApplicable.length;

/** True for rows the check flow can skip: done, even if a camera photo is still needed. */
export const isDoneRow = (s: RowState) =>
  s === "verified" || s === "needs_camera" || s === "not_applicable";

/** The model for the current home, or null when no home is open. */
export function useHomeModel(): HomeModel | null {
  const { currentHome, recordsFor, frost, lang } = usePreparedHome();
  const records = currentHome ? recordsFor(currentHome.homeId) : null;
  const frostValue = frost.status === "ok" ? frost.value : null;
  return useMemo(() => {
    if (!currentHome || !records) return null;
    return buildHomeModel(currentHome, records, new Date(), frostValue, lang);
  }, [currentHome, records, frostValue, lang]);
}

const NEW_HOME_LABELS = new Set(allTranslations("homeName"));

/** The home's name in the current language: example homes and new homes are named by the app. */
export function homeLabel(home: Home, t: Translate): string {
  if (home.homeId === DEMO_FLAT_ID) return t("demoFlatLabel");
  if (home.homeId === DEMO_HOUSE_ID) return t("demoHouseLabel");
  if (home.homeId === DEMO_FRESH_ID || NEW_HOME_LABELS.has(home.label)) return t("homeName");
  return home.label;
}

export const perilLabel = (p: Peril, lang: Lang) => PERIL_LABELS[p][lang];
export const stateLabel = (s: PerilState, lang: Lang) => STATE_LABELS[s][lang];
export const verdictLabel = (v: Verdict, lang: Lang) => VERDICT_LABELS[v][lang];

/** The short state shown on a check row. */
export function rowLabel(state: RowState, t: Translate, lang: Lang): string {
  if (state === "not_checked") return t("row.notChecked");
  if (state === "overdue") return t("row.overdue");
  if (state === "needs_camera") return t("row.needsCamera");
  return verdictLabel(state, lang);
}
export const ownerLabel = (o: Owner, lang: Lang) => OWNER_LABELS[o][lang];

export type Tone = "success" | "warning" | "danger" | "info" | "neutral";

export const verdictTone = (v: Verdict): Tone =>
  v === "verified"
    ? "success"
    : v === "fix_first"
      ? "warning"
      : v === "retake"
        ? "info"
        : "neutral";

export const rowTone = (s: RowState): Tone =>
  s === "verified"
    ? "success"
    : s === "needs_camera"
      ? "info"
      : s === "fix_first" || s === "overdue"
        ? "warning"
        : s === "retake"
          ? "info"
          : "neutral";

export const stateTone = (s: PerilState): Tone =>
  s === "prepared"
    ? "success"
    : s === "lapsed"
      ? "warning"
      : s === "in_progress"
        ? "info"
        : "neutral";
