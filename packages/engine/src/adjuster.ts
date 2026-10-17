// The claims handler's view: was the peril prepared on the loss date, and do the shared photos match?

import type { AdjusterView, CheckRecord, Home, Peril, PerilState } from "./types";
import { toDay } from "./dates";
import { ADJUSTER_NOTE, PERIL_LABELS } from "./i18n";
import {
  countsForRelief,
  deductibleConfig,
  dueOf,
  effectiveRecords,
  groupStatus,
  ownRecords,
  perilGroup,
  preview,
  requiredChecks,
  timeOf,
  type DeductibleConfig,
} from "./status";

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
