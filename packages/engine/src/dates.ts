// Pure date maths on ISO strings, in UTC. Days are "YYYY-MM-DD" strings, which compare correctly as strings.

const DAY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** The UTC calendar day of a Date, an ISO datetime or an ISO date, as "YYYY-MM-DD". */
export function toDay(value: Date | string): string {
  if (typeof value === "string") {
    if (DAY_RE.test(value)) return value;
    const ms = Date.parse(value);
    if (Number.isNaN(ms)) throw new Error(`Invalid date: ${value}`);
    return new Date(ms).toISOString().slice(0, 10);
  }
  if (Number.isNaN(value.getTime())) throw new Error("Invalid date");
  return value.toISOString().slice(0, 10);
}

function parts(day: string): [number, number, number] {
  const m = DAY_RE.exec(day);
  if (!m) throw new Error(`Not an ISO date: ${day}`);
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

function fromParts(y: number, m: number, d: number): string {
  return new Date(Date.UTC(y, m - 1, d)).toISOString().slice(0, 10);
}

function daysInMonth(y: number, m: number): number {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

/** Adds calendar months; the day is clamped to the month's length (2024-02-29 + 12 months = 2025-02-28). */
export function addMonths(day: string, months: number): string {
  const [y, m, d] = parts(day);
  const total = y * 12 + (m - 1) + months;
  const ny = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  return fromParts(ny, nm, Math.min(d, daysInMonth(ny, nm)));
}

export function addDays(day: string, days: number): string {
  const [y, m, d] = parts(day);
  return fromParts(y, m, d + days);
}

/** Whole days from a to b (b - a). */
export function daysBetween(a: string, b: string): number {
  const [ay, am, ad] = parts(a);
  const [by, bm, bd] = parts(b);
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86_400_000);
}

export function minDay(a: string, b: string): string {
  return a <= b ? a : b;
}

export function maxDay(a: string, b: string): string {
  return a >= b ? a : b;
}

/** The first day of the earliest listed month (1-12) that falls strictly after `day`. */
export function nextMonthStart(day: string, months: number[]): string | null {
  const valid = [...new Set(months)].filter((m) => Number.isInteger(m) && m >= 1 && m <= 12);
  if (valid.length === 0) return null;
  const [y] = parts(day);
  let best: string | null = null;
  for (const year of [y, y + 1]) {
    for (const m of valid) {
      const candidate = fromParts(year, m, 1);
      if (candidate > day && (best === null || candidate < best)) best = candidate;
    }
  }
  return best;
}

/** The next 1 October strictly after `day`. */
export function nextOctoberFirst(day: string): string {
  return nextMonthStart(day, [10]) as string;
}

/** The latest 1 July on or before `day` (the start of the frost season used for reminders). */
export function lastJulyFirst(day: string): string {
  const [y] = parts(day);
  const thisYear = fromParts(y, 7, 1);
  return thisYear <= day ? thisYear : fromParts(y - 1, 7, 1);
}

/** Midnight UTC at the start of a day, as a Date. */
export function dayStart(day: string): Date {
  const [y, m, d] = parts(day);
  return new Date(Date.UTC(y, m - 1, d));
}
