import { describe, expect, it } from "vitest";
import { CHECKS, CLAUSES, checksFor, getCheck, ownerFor } from "../src/index";
import type { Lang, Localized } from "../src/index";

const LANGS: Lang[] = ["fi", "sv", "en"];
const filled = (l: Localized) => LANGS.every((lang) => typeof l[lang] === "string" && l[lang].trim().length > 0);

describe("check definitions", () => {
  it("has the 14 checks in order", () => {
    expect(CHECKS.map((c) => c.id)).toEqual(["L1", "L2", "L3", "L4", "L5", "L6", "F1", "F2", "F3", "F4", "F5", "Z1", "Z2", "S1"]);
  });

  it("gives 11 checks for a flat, 14 for a house and 13 for a cottage", () => {
    expect(checksFor("flat").map((c) => c.id)).toEqual(["L1", "L2", "L3", "L4", "L5", "L6", "F1", "F2", "F3", "F4", "F5"]);
    expect(checksFor("house")).toHaveLength(14);
    expect(checksFor("cottage").map((c) => c.id)).toEqual(["L1", "L2", "L3", "L4", "L5", "L6", "F1", "F2", "F3", "F4", "F5", "Z1", "Z2"]);
  });

  it("uses only clause ids that exist in CLAUSES", () => {
    for (const homeType of ["flat", "house", "cottage"] as const) {
      for (const check of [...CHECKS, ...checksFor(homeType)]) {
        for (const id of check.clauseIds) expect(CLAUSES[id], `${check.id} -> ${id}`).toBeDefined();
      }
    }
  });

  it("has a guide note exactly when there is no clause", () => {
    for (const check of CHECKS) {
      if (check.clauseFit === "none") {
        expect(check.clauseIds).toEqual([]);
        expect(check.guideNote && filled(check.guideNote)).toBe(true);
      } else {
        expect(check.clauseIds.length).toBeGreaterThan(0);
      }
    }
  });

  it("has fi, sv and en text for every title, coach, criterion, fix hint and guide note", () => {
    for (const homeType of ["flat", "house", "cottage"] as const) {
      for (const check of checksFor(homeType)) {
        expect(filled(check.title), check.id).toBe(true);
        expect(filled(check.coach), check.id).toBe(true);
        expect(filled(check.fixHint), check.id).toBe(true);
        for (const c of check.criteria) expect(filled(c.text), c.id).toBe(true);
      }
    }
  });

  it("has unique, prefixed criterion ids with at least one visibility criterion", () => {
    const seen = new Set<string>();
    for (const check of CHECKS) {
      expect(check.criteria.some((c) => c.kind === "visibility")).toBe(true);
      for (const c of check.criteria) {
        expect(c.id.startsWith(`${check.id}.`)).toBe(true);
        expect(seen.has(c.id)).toBe(false);
        seen.add(c.id);
      }
    }
  });

  it("matches the contract's kinds, N/A flags, owners and rechecks", () => {
    const kinds = (id: string) => getCheck(id).criteria.map((c) => c.kind[0]).join("");
    expect(kinds("L1")).toBe("vvcu");
    expect(kinds("L2")).toBe("vvc");
    expect(kinds("L3")).toBe("vcc");
    expect(kinds("F1")).toBe("vcu");
    expect(kinds("F2")).toBe("vccc");
    expect(kinds("Z1")).toBe("vu");
    expect(kinds("Z2")).toBe("vcu");
    expect(CHECKS.filter((c) => c.notApplicableAllowed).map((c) => c.id)).toEqual(["L2", "L3", "Z2"]);
    expect(ownerFor(getCheck("L1"), "flat")).toBe("property_manager");
    expect(ownerFor(getCheck("L1"), "house")).toBe("me");
    expect(ownerFor(getCheck("F2"), "flat")).toBe("professional");
    expect(getCheck("Z1").recheck).toEqual({ kind: "seasonal", months: [9] });
    expect(getCheck("Z2").recheck).toEqual({ kind: "frost" });
    expect(getCheck("S1").recheck).toEqual({ kind: "seasonal", months: [4, 10] });
    expect(getCheck("S1").peril).toBe("storm_water");
    expect(getCheck("L6").clauseFit).toBe("exclusion");
  });

  it("applies home-type wording and clause fit", () => {
    expect(getCheck("L1", "house").clauseFit).toBe("direct");
    expect(getCheck("L1", "flat").clauseFit).toBe("section");
    expect(getCheck("L1", "house").criteria[0]!.text.en).toMatch(/main water/);
    expect(getCheck("L1", "flat").criteria[0]!.text.en).toMatch(/flat's/);
    expect(getCheck("Z1", "house").clauseIds).toEqual(["OMA-5.5.1"]);
    expect(getCheck("Z1", "cottage").clauseIds).toEqual(["OMA-5.5.1", "OMA-5.5.2"]);
    expect(getCheck("Z1", "cottage").criteria[1]!.text.en).toMatch(/drained/);
    // The shared definitions are not mutated by specialisation.
    expect(getCheck("L1").criteria[0]!.text.en).toBe("A water shut-off valve is visible");
  });

  it("throws for an unknown check", () => {
    expect(() => getCheck("X9")).toThrow();
  });
});
