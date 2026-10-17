// The claims handler's reasons, written from the claim view in the current language. The server's own reasons
// are plain English with ids; these say the same with check titles, verdict labels and local dates.
import {
  getCheck,
  isCheckId,
  perilGroup,
  requiredChecks,
  type AdjusterView,
  type CheckRecord,
  type Home,
  type Lang,
} from "@prepared-home/engine";

import { formatDate, type Translate } from "../../i18n";
import { perilLabel, photoCount, stateLabel, verdictLabel } from "../../model";

/** Check title in the current language, next to its id (the claims handler works with both). */
export function checkName(id: string, home: Home | null, lang: Lang): string {
  return isCheckId(id) ? `${id} · ${getCheck(id, home?.homeType).title[lang]}` : id;
}

export function adjusterReasons(
  view: AdjusterView,
  home: Home | null,
  records: CheckRecord[],
  t: Translate,
  lang: Lang,
): string[] {
  const group = perilGroup(view.peril);
  const peril = perilLabel(group, lang);
  const date = formatDate(view.lossDate, lang);
  const title = (id: string) => (isCheckId(id) ? getCheck(id, home?.homeType).title[lang] : id);
  const byId = new Map(view.records.map((r) => [r.checkId, r]));
  // Verified photos count only from the in-app camera with both angles; the record on this device says which.
  const countOf = (id: string, checkedAt: string) => {
    const local = records.find((r) => r.checkId === id && r.checkedAt === checkedAt);
    return local ? photoCount(local.capture, local.secondPhotoSha256) : "counts";
  };
  // Without the home on this device, only the checks the claim lists can be judged.
  const required = home ? requiredChecks(home.homeType, group) : [...byId.keys()];

  const out = [
    view.perilStateAtLoss === "prepared"
      ? t("reasonPrepared", { peril, date, count: required.length })
      : t("reasonNotPrepared", {
          peril,
          date,
          state: stateLabel(view.perilStateAtLoss, lang).toLowerCase(),
        }),
  ];
  for (const id of required) {
    const r = byId.get(id);
    if (!r) out.push(t("reasonMissing", { title: title(id), date }));
    else if (r.verdict === "fix_first")
      out.push(t("reasonFix", { title: title(id), verdict: verdictLabel(r.verdict, lang), date }));
    else if (r.verdict === "retake") out.push(t("reasonRetake", { title: title(id), date }));
    else if (r.verdict === "verified" && countOf(id, r.checkedAt) !== "counts")
      out.push(
        t(countOf(id, r.checkedAt) === "oneAngle" ? "reasonOneAngle" : "reasonNotCounted", {
          title: title(id),
        }),
      );
    else if (!r.validAtLoss) out.push(t("reasonOverdue", { title: title(id), date }));
  }
  const shared = view.records.filter((r) => r.photoShared);
  for (const r of shared) {
    if (r.hashMatches === false) out.push(t("reasonHashMismatch", { title: title(r.checkId) }));
  }
  const matched = shared.filter((r) => r.hashMatches === true).length;
  out.push(shared.length ? t("reasonHashesMatch", { count: matched }) : t("reasonNoPhotos"));
  return out;
}
