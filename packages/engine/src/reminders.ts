// Reminders: frost (from the FMI forecast), fix-first follow-ups and scheduled re-checks.

import type {
  CheckDefinition,
  CheckRecord,
  FrostForecast,
  Home,
  Reminder,
  ReminderKind,
} from "./types";
import { checksFor } from "./checks";
import { addDays, daysBetween, lastJulyFirst, maxDay, toDay } from "./dates";
import { TEXT, localize } from "./i18n";
import { dueOf, effectiveRecords, ownRecords } from "./status";

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
