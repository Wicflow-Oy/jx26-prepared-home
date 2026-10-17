import { describe, expect, it } from "vitest";
import { CHECKS, CLAUSES, checksFor, getCheck, ownerFor } from "../src/index";
import type { Lang, Localized } from "../src/index";

const LANGS: Lang[] = ["fi", "sv", "en"];
const filled = (l: Localized) =>
  LANGS.every((lang) => typeof l[lang] === "string" && l[lang].trim().length > 0);

describe("check definitions", () => {
  it("has the 14 checks in order", () => {
    expect(CHECKS.map((c) => c.id)).toEqual([
      "L1",
      "L2",
      "L3",
      "L4",
      "L5",
      "L6",
      "F1",
      "F2",
      "F3",
      "F4",
      "F5",
      "Z1",
      "Z2",
      "S1",
    ]);
  });

  it("gives 11 checks for a flat, 14 for a house and 13 for a cottage", () => {
    expect(checksFor("flat").map((c) => c.id)).toEqual([
      "L1",
      "L2",
      "L3",
      "L4",
      "L5",
      "L6",
      "F1",
      "F2",
      "F3",
      "F4",
      "F5",
    ]);
    expect(checksFor("house")).toHaveLength(14);
    expect(checksFor("cottage").map((c) => c.id)).toEqual([
      "L1",
      "L2",
      "L3",
      "L4",
      "L5",
      "L6",
      "F1",
      "F2",
      "F3",
      "F4",
      "F5",
      "Z1",
      "Z2",
    ]);
  });

  it("uses only clause ids that exist in CLAUSES", () => {
    for (const homeType of ["flat", "house", "cottage"] as const) {
      for (const check of [...CHECKS, ...checksFor(homeType)]) {
        for (const id of check.clauseIds) expect(CLAUSES[id], `${check.id} -> ${id}`).toBeDefined();
      }
    }
  });

  it("has a guide note whenever there is no clause, for every home type", () => {
    for (const check of [
      ...CHECKS,
      ...checksFor("flat"),
      ...checksFor("house"),
      ...checksFor("cottage"),
    ]) {
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
        if (check.guideNote) expect(filled(check.guideNote), check.id).toBe(true);
        if (check.relationNote) expect(filled(check.relationNote), check.id).toBe(true);
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
    const kinds = (id: string) =>
      getCheck(id)
        .criteria.map((c) => c.kind[0])
        .join("");
    expect(kinds("L1")).toBe("vvcu");
    expect(kinds("L2")).toBe("vvc");
    expect(kinds("L3")).toBe("vcc");
    expect(kinds("F1")).toBe("vcu");
    expect(kinds("F2")).toBe("vcc");
    expect(kinds("Z1")).toBe("vu");
    expect(kinds("Z2")).toBe("vcu");
    expect(CHECKS.filter((c) => c.notApplicableAllowed).map((c) => c.id)).toEqual([
      "L2",
      "L3",
      "Z2",
    ]);
    expect(ownerFor(getCheck("L1"), "flat")).toBe("property_manager");
    expect(ownerFor(getCheck("L1"), "house")).toBe("me");
    expect(ownerFor(getCheck("F2"), "flat")).toBe("professional");
    expect(ownerFor(getCheck("F1"), "flat")).toBe("property_manager");
    expect(ownerFor(getCheck("F1"), "house")).toBe("me");
    expect(getCheck("Z1").recheck).toEqual({ kind: "seasonal", months: [9] });
    expect(getCheck("Z2").recheck).toEqual({ kind: "frost" });
    expect(getCheck("S1").recheck).toEqual({ kind: "seasonal", months: [4, 10] });
    expect(getCheck("S1").peril).toBe("storm_water");
    expect(getCheck("L6").clauseFit).toBe("exclusion");
  });

  it("applies home-type wording and clause fit", () => {
    expect(getCheck("L1", "house").clauseFit).toBe("direct");
    expect(getCheck("L1", "house").clauseIds).toEqual(["OMA-5.5.3"]);
    expect(getCheck("L1", "house").criteria[0]!.text.en).toMatch(/main water/);
    expect(getCheck("L1", "house").relationNote?.en).toMatch(
      /empty for more than a week \(5\.5\.3\)/,
    );
    expect(getCheck("L1", "cottage").relationNote?.fi).toMatch(/yli viikon/);
    expect(getCheck("Z1", "house").clauseIds).toEqual(["OMA-5.5.1"]);
    expect(getCheck("Z1", "cottage").clauseIds).toEqual(["OMA-5.5.1", "OMA-5.5.2"]);
    expect(getCheck("Z1", "cottage").criteria[1]!.text.en).toMatch(/drained/);
    // The shared definitions are not mutated by specialisation.
    expect(getCheck("L1").criteria[0]!.text.en).toBe("A water shut-off valve is visible");
  });

  it("gives flats an appliance-valve L1 with no clause and a guide note (FIX 7)", () => {
    const flat = getCheck("L1", "flat");
    expect(flat.clauseIds).toEqual([]);
    expect(flat.clauseFit).toBe("none");
    expect(flat.relationNote).toBeUndefined();
    expect(flat.coach.en).toMatch(/^Take a photo of an appliance's shut-off valve/);
    expect(flat.coach.en).toMatch(/belong to the housing company: don't use them\.$/);
    expect(flat.criteria.map((c) => c.id)).toEqual([
      "L1.valve_visible",
      "L1.handle_visible",
      "L1.no_leak",
      "L1.know_how",
    ]);
    expect(flat.criteria[0]!.text).toEqual({
      fi: "Kodinkoneen sulkuventtiili näkyy",
      sv: "En maskins avstängningsventil syns",
      en: "An appliance's shut-off valve is visible",
    });
    expect(flat.criteria[3]!.text.en).toBe(
      "I know how to close my appliance valves, and I have the maintenance company's emergency number",
    );
    expect(flat.guideNote?.en).toBe(
      "In a block of flats or terraced house, only the housing company uses the water shut-off. Close appliance valves when not in use.",
    );
    expect(flat.fixHint.en).toMatch(/Learn how to close the appliance valve\.$/);
    expect(flat.fixHint.fi).toMatch(/Opettele sulkemaan kodinkoneen venttiili\.$/);
    expect(flat.fixHint.sv).toMatch(/Lär dig stänga maskinens ventil\.$/);
    expect(ownerFor(flat, "flat")).toBe("property_manager");
  });

  it("cites the terms for F4 and L3, and tags the F2 and F3 tips (FIX 1, 18, 19, 33)", () => {
    const f4 = getCheck("F4", "flat");
    expect(f4.clauseIds).toEqual(["OMA-5.2.15"]);
    expect(f4.clauseFit).toBe("direct");
    expect(f4.guideNote?.en).toBe(
      "In stove-fire insurance claims, things left on the stove were the most common cause (SPEK 2023).",
    );
    const l3 = getCheck("L3", "flat");
    expect(l3.clauseIds).toEqual(["OMA-5.5.6", "OMA-5.5.8"]);
    expect(l3.clauseFit).toBe("section");
    expect(l3.guideNote?.en).toMatch(/^If's guidance applies these instructions to dishwashers/);
    expect(getCheck("F2").guideNote?.en).toMatch(
      /^Keeping the front of the fuse box clear is a safety tip/,
    );
    expect(getCheck("F2").guideNote?.en).toMatch(/No RCD visible\? Older wiring often has none/);
    expect(getCheck("F3").guideNote?.en).toMatch(
      /^Removing thick dust from the coil is a safety tip/,
    );
    expect(getCheck("F5").criteria[1]!.text.en).toBe(
      "Charging happens away from beds, sofas, curtains and other textiles",
    );
    expect(getCheck("L4").criteria[1]!.text.en).toBe(
      "There is a drip tray under the appliance, or the room has a floor drain and a leak would show at once",
    );
  });

  it("drops the RCD from F2's criteria and fix hint (FIX 9)", () => {
    const f2 = getCheck("F2");
    expect(f2.criteria.map((c) => c.id)).toEqual([
      "F2.board_visible",
      "F2.no_damage",
      "F2.clear_front",
    ]);
    expect(f2.fixHint.en).not.toMatch(/RCD/);
    expect(f2.fixHint.fi).not.toMatch(/vikavirtasuoja/);
    expect(f2.fixHint.sv).not.toMatch(/jordfelsbrytare/);
  });

  it("gives flats the housing-company smoke-alarm hint and houses the 60 m² rule (FIX 8)", () => {
    expect(getCheck("F1", "flat").fixHint.en).toMatch(/tell your housing company or landlord/);
    expect(getCheck("F1", "house").fixHint.en).toMatch(/every started 60 m² of each floor/);
    expect(getCheck("F1", "cottage").fixHint.sv).toMatch(/per påbörjade 60 m²/);
  });

  it("applies Z2's hose condition only in the cold season (FIX 32)", () => {
    const z2 = getCheck("Z2", "house");
    expect(z2.criteria.filter((c) => c.coldSeasonOnly).map((c) => c.id)).toEqual(["Z2.no_hose"]);
    expect(z2.criteria[2]!.text.en).toBe(
      "I closed the indoor shut-off valve for the outdoor tap, or it is a frost-proof tap",
    );
  });

  it("throws for an unknown check", () => {
    expect(() => getCheck("X9")).toThrow();
  });
});
