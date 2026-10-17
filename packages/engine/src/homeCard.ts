// The Home Card: a one-page summary of the home's checks, status and next reminder.

import type { CheckRecord, FrostForecast, Home, HomeCard, Lang } from "./types";
import { checksFor } from "./checks";
import { toDay } from "./dates";
import { DISCLAIMER, TEXT, fill, formatDay } from "./i18n";
import { reminders } from "./reminders";
import { effectiveRecords, ownRecords, perilStatuses } from "./status";

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
