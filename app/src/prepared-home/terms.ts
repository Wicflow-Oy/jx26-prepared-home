// How If's terms are cited in the app, and the proposed terms text for the lower deductible.
import { CLAUSES, type Lang } from "@prepared-home/engine";

import type { Translate } from "./i18n";

/** Protective instructions are numbered items under these sections ("5.5.3" is section 5.5, item 3). */
const ITEM_SECTIONS = ["5.2.", "5.4.", "5.5."];

/** Clauses whose section is cited without an item: the text sits in an unnumbered paragraph. */
const SECTION_ONLY: Record<string, string> = { "OMA-4.1-vesieriste": "4" };

/** The verbatim lead-in of the paragraph a clause fragment belongs to, so it reads as an exclusion. */
const LEAD_IN: Record<string, Record<Lang, string>> = {
  "OMA-4.1-vesieriste": {
    en: "The Insurance does not cover loss or damage",
    fi: "Vakuutuksesta ei korvata vahinkoja, joissa",
    sv: "Försäkringen ersätter inte skador, där",
  },
};

/** "If home terms OMA 200.27 (valid from 1 Jan 2026), 5.5, item 3", never the internal id. */
export function clauseLabel(id: string, t: Translate): string {
  const doc = id.startsWith("YLE-") ? t("docYle") : t("docOma");
  const sectionOnly = SECTION_ONLY[id];
  if (sectionOnly) return t("termsSection", { doc, section: sectionOnly });
  const section = CLAUSES[id]?.section ?? "";
  const intro = section.match(/^(\d+) \(johdanto\)$/);
  if (intro) return t("termsIntro", { doc, section: intro[1] });
  const listed = section.match(/^(\d+) \(item (\d+)\)$/);
  if (listed) return t("termsItem", { doc, section: listed[1], item: listed[2] });
  if (!id.startsWith("YLE-") && ITEM_SECTIONS.some((p) => section.startsWith(p))) {
    const parts = section.split(".");
    return t("termsItem", { doc, section: parts.slice(0, 2).join("."), item: parts[2] });
  }
  return t("termsSection", { doc, section });
}

/** The clause text, with its lead-in and an ellipsis when the text is a fragment of a longer sentence. */
export function clauseBody(id: string, text: string, lang: Lang): string {
  const lead = LEAD_IN[id]?.[lang];
  if (!lead || text.startsWith(lead)) return text;
  return `${lead} … ${text}`;
}

/** The proposed terms wording for If's legal team (docs/IMPLEMENTING-AT-IF.md). English only for now. */
export const PROPOSED_TERMS = {
  title: "Lower deductible for a prepared home.",
  body: "The deductible for leak, fire or freeze damage is [amount] instead of [standard amount] if, on the date of the damage, all Prepared Home checks for that risk were completed and current. The checks count only when they were made with photos taken in the If app of the insured home. When you make a claim, we may ask you to share the photos; they must match the checks and the insured home. If they don't, or if a photo shows something other than the insured home (for example a screen or a printed picture), the standard deductible applies. Prepared Home never reduces your cover.",
};
