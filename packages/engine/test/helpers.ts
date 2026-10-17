import { DEMO, dueDateFor, getCheck } from "../src/index";
import type { CheckRecord, Home, Verdict } from "../src/index";

export const NOW = new Date("2026-10-17T12:00:00Z");

export function demoHome(id: string): Home {
  const home = DEMO.homes.find((h) => h.homeId === id);
  if (!home) throw new Error(`no demo home ${id}`);
  return home;
}

export function demoRecords(homeId: string): CheckRecord[] {
  return DEMO.records.filter((r) => r.homeId === homeId).map((r) => ({ ...r }));
}

export function rec(
  homeId: string,
  checkId: string,
  verdict: Verdict,
  checkedAt: string,
  photoSha256: string | null = "f".repeat(64),
): CheckRecord {
  const current = verdict === "verified" || verdict === "not_applicable";
  return {
    homeId,
    checkId,
    verdict,
    checkedAt,
    dueAt: current ? dueDateFor(getCheck(checkId).recheck, checkedAt) : null,
    photoSha256: verdict === "not_applicable" ? null : photoSha256,
  };
}
