// The sentences around a verdict: what it means, where it came from and what to photograph next.
import type { CheckRecord, Lang, Verdict } from "@prepared-home/engine";

import { formatDate, localizeDates, type StringKey, type Translate } from "../../i18n";
import type { StoredOutcome } from "../../state/storage";

export function explainKey(verdict: Verdict, hasDueDate: boolean): StringKey {
  switch (verdict) {
    case "verified":
      return hasDueDate ? "verdictExplainVerified" : "verdictExplainVerifiedNoDate";
    case "retake":
      return "verdictExplainRetake";
    case "fix_first":
      return "verdictExplainFix";
    case "not_applicable":
      return "verdictExplainNA";
  }
}

/** Where the result came from. The server's own note (a saved result and its date) is the most specific. */
export function sourceLine(
  stored: StoredOutcome | undefined,
  record: CheckRecord | undefined,
  lang: Lang,
  t: Translate,
): string | null {
  if (!stored) return record ? t("recordedOn", { date: formatDate(record.checkedAt, lang) }) : null;
  if (stored.outcome.verdict === "not_applicable") return null;
  if (stored.sourceNote && stored.lang === lang) return localizeDates(stored.sourceNote, lang);
  if (stored.source === "live") return t("sourceLive", { model: stored.model });
  if (stored.source === "offline") return t("sourceOffline");
  const savedOn = stored.sourceNote?.match(/\d{4}-\d{2}-\d{2}/)?.[0];
  return savedOn ? t("sourceCachedOn", { date: formatDate(savedOn, lang) }) : t("sourceCached");
}

/**
 * Free text from the server (model notes and hints) is shown only in the language it was written in.
 * Saved results come from an English recording, so outside English the app's own texts are used.
 */
export const serverTextFits = (stored: StoredOutcome | undefined, lang: Lang) =>
  !!stored && stored.lang === lang && (stored.source === "live" || lang === "en");
