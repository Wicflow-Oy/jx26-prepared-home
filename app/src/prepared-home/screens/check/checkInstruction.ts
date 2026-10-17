import type { HomeType } from "@prepared-home/engine";

import type { StringKey, Translate } from "../../i18n";

/**
 * The one-line instruction under a check's title. In a flat the water check is about an appliance's own
 * shut-off valve: the main and flat shut-offs belong to the housing company.
 */
export function checkInstruction(checkId: string, homeType: HomeType, t: Translate): string {
  if (checkId === "L1" && homeType === "flat") return t("short.L1.flat");
  return t(`short.${checkId}` as StringKey);
}
