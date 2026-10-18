import { describe, expect, it } from "vitest";
import { checksFor, quickCheckDue, quickCheckItems } from "../src/index";

const ids = (items: { id: string }[]) => items.map((i) => i.id);
const CORE = ["under-sink", "washer", "floor-drain", "smoke-alarm", "fridge-dust"];

describe("quick check every three months", () => {
  it("is due three months after moving in, then three months after the last one", () => {
    expect(quickCheckDue("2026-10-12", null)).toBe("2027-01-12");
    expect(quickCheckDue("2026-10-12", "2027-01-20")).toBe("2027-04-20");
    expect(quickCheckDue("2026-11-30", null)).toBe("2027-02-28");
  });

  it("a flat gets the five core items in every season, and no house-only items", () => {
    for (const day of ["2026-01-15", "2026-04-15", "2026-07-15", "2026-10-15"]) {
      expect(ids(quickCheckItems("flat", day))).toEqual(CORE);
    }
  });

  it("a house adds the season's items: autumn gutters and outdoor tap, winter heating, spring gutters", () => {
    expect(ids(quickCheckItems("house", "2026-10-15"))).toEqual([
      ...CORE,
      "gutters-autumn",
      "outdoor-tap",
    ]);
    expect(ids(quickCheckItems("house", "2027-01-15"))).toEqual([...CORE, "heating"]);
    expect(ids(quickCheckItems("house", "2027-04-15"))).toEqual([...CORE, "gutters-spring"]);
    expect(ids(quickCheckItems("house", "2027-07-15"))).toEqual(CORE);
  });

  it("every item relates to a check the home has, with text in all three languages", () => {
    for (const homeType of ["flat", "house", "cottage"] as const) {
      const checkIds = new Set(checksFor(homeType).map((c) => c.id));
      for (const month of ["01", "04", "07", "10"]) {
        for (const item of quickCheckItems(homeType, `2026-${month}-15`)) {
          expect(checkIds.has(item.checkId)).toBe(true);
          expect(item.text.fi && item.text.sv && item.text.en).toBeTruthy();
        }
      }
    }
  });
});
