// Dates, money and numbers in each language's own style, and the ISO date helpers the screens share.
import type { Lang } from "@prepared-home/engine";

const MONTHS: Record<"en" | "sv", string[]> = {
  en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
  sv: [
    "jan.",
    "feb.",
    "mars",
    "apr.",
    "maj",
    "juni",
    "juli",
    "aug.",
    "sep.",
    "okt.",
    "nov.",
    "dec.",
  ],
};

const LOCALE: Record<Lang, string> = { en: "en-IE", fi: "fi-FI", sv: "sv-FI" };

/** An ISO date or datetime as a calendar date. Uses the date part only, so no time-zone shift. */
export function formatDate(iso: string | null | undefined, lang: Lang): string {
  if (!iso) return "–";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return iso;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (lang === "fi") return `${d}.${mo}.${y}`;
  return `${d} ${MONTHS[lang][mo - 1] ?? mo} ${y}`;
}

/** Today's date as YYYY-MM-DD in local time. */
export function todayIso(now: Date = new Date()): string {
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${m}-${d}`;
}

/** Moves an ISO date (YYYY-MM-DD) by whole days, in UTC so daylight saving never shifts it. */
export function addDaysIso(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/** Whole euros: "€300" in English, "300 €" in Finnish and Swedish. */
export function formatMoney(amount: number, lang: Lang): string {
  return new Intl.NumberFormat(LOCALE[lang], {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(amount);
}

/** A decimal number with the language's separator ("-1.1" in English, "-1,1" in Finnish and Swedish). */
export function formatDecimal(value: number, lang: Lang, digits = 1): string {
  return new Intl.NumberFormat(LOCALE[lang], {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

/**
 * Rewrites dates inside a text from the engine or the server (ISO "2026-10-17" or "17.10.2026") in the
 * app's own style, so every date on screen looks the same.
 */
export function localizeDates(text: string, lang: Lang): string {
  return text
    .replace(/\b\d{4}-\d{2}-\d{2}\b/g, (iso) => formatDate(iso, lang))
    .replace(/\b(\d{1,2})\.(\d{1,2})\.(\d{4})\b/g, (_, d: string, m: string, y: string) =>
      formatDate(`${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`, lang),
    );
}
