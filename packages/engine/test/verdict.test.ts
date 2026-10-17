import { describe, expect, it } from "vitest";
import { decideVerdict, getCheck, notApplicableOutcome, recordFromOutcome } from "../src/index";
import type { VisionAssessment } from "../src/index";

const assess = (
  met: Record<string, boolean | null>,
  extra: Partial<VisionAssessment> = {},
): VisionAssessment => ({
  criteria: Object.entries(met).map(([id, m]) => ({ id, met: m })),
  boxes: [],
  model: "mock",
  ...extra,
});

const L1 = getCheck("L1");
const allGood = { "L1.valve_visible": true, "L1.handle_visible": true, "L1.no_leak": true };
const knows = { "L1.know_how": true };

describe("decideVerdict", () => {
  it("retakes with the fixed hint when there is no assessment", () => {
    const o = decideVerdict(L1, null, knows, "en", "house");
    expect(o.verdict).toBe("retake");
    expect(o.retakeHint).toBe("Could not check the photo. Try again.");
    expect(decideVerdict(L1, null, knows, "fi", "house").retakeHint).toBe(
      "Kuvaa ei voitu tarkistaa. Yritä uudelleen.",
    );
    expect(o.fix).toBeNull();
  });

  it("retakes when a visibility criterion is false", () => {
    const o = decideVerdict(
      L1,
      assess({ ...allGood, "L1.handle_visible": false }),
      knows,
      "en",
      "house",
    );
    expect(o.verdict).toBe("retake");
    expect(o.retakeHint).toContain("The valve's handle or lever is visible");
  });

  it("retakes when a visibility criterion is null or missing, even if a condition fails", () => {
    const o = decideVerdict(
      L1,
      assess({ "L1.valve_visible": true, "L1.no_leak": false }),
      knows,
      "en",
      "house",
    );
    expect(o.verdict).toBe("retake");
  });

  it("uses the model's retake hint when given", () => {
    const o = decideVerdict(
      L1,
      assess(
        { ...allGood, "L1.valve_visible": null },
        { retakeHint: "Offline demo: no live check" },
      ),
      knows,
      "en",
      "house",
    );
    expect(o.verdict).toBe("retake");
    expect(o.retakeHint).toBe("Offline demo: no live check");
  });

  it("retakes when a condition criterion is null", () => {
    const o = decideVerdict(L1, assess({ ...allGood, "L1.no_leak": null }), knows, "en", "house");
    expect(o.verdict).toBe("retake");
    expect(o.retakeHint).toContain("No leaks, drips, corrosion or water stains at the valve");
  });

  it("retakes and asks for the answer when a user answer is missing", () => {
    const o = decideVerdict(L1, assess(allGood), {}, "en", "house");
    expect(o.verdict).toBe("retake");
    expect(o.retakeHint).toBe("Answer yes or no: “I know how to close it”.");
    const sv = decideVerdict(L1, assess(allGood), {}, "sv", "house");
    expect(sv.retakeHint).toBe("Svara ja eller nej: ”Jag vet hur man stänger den”.");
  });

  it("ignores a model's answer to a user criterion", () => {
    const o = decideVerdict(L1, assess({ ...allGood, "L1.know_how": true }), {}, "en", "house");
    expect(o.verdict).toBe("retake");
    expect(o.criteria.find((c) => c.id === "L1.know_how")!.met).toBeNull();
  });

  it("gives fix_first when a condition criterion is false, with the owner for the home type", () => {
    const house = decideVerdict(
      L1,
      assess({ ...allGood, "L1.no_leak": false }, { urgent: true }),
      knows,
      "en",
      "house",
    );
    expect(house.verdict).toBe("fix_first");
    expect(house.fix?.owner).toBe("me");
    expect(house.urgent).toBe(true);
    expect(house.retakeHint).toBeNull();
    const flat = decideVerdict(
      L1,
      assess({ ...allGood, "L1.no_leak": false }),
      knows,
      "fi",
      "flat",
    );
    expect(flat.fix?.owner).toBe("property_manager");
    expect(flat.fix?.text).toContain("isännöitsijä");
  });

  it("gives fix_first when a user criterion is false", () => {
    const o = decideVerdict(L1, assess(allGood), { "L1.know_how": false }, "en", "flat");
    expect(o.verdict).toBe("fix_first");
    expect(o.fix?.text).toBeTruthy();
  });

  it("verifies when everything is met, and keeps criteria text, notes and boxes", () => {
    const box = { label: "valve", bbox_px: [10, 20, 110, 220] as [number, number, number, number] };
    const a: VisionAssessment = {
      criteria: [
        { id: "L1.valve_visible", met: true, note: "Ball valve under the sink" },
        { id: "handle_visible", met: true }, // short id is accepted
        { id: "L1.no_leak", met: true },
      ],
      boxes: [box],
      model: "mock",
    };
    const o = decideVerdict(getCheck("L1", "flat"), a, knows, "sv", "flat");
    expect(o.verdict).toBe("verified");
    expect(o.fix).toBeNull();
    expect(o.retakeHint).toBeNull();
    expect(o.boxes).toEqual([box]);
    expect(o.criteria.map((c) => c.met)).toEqual([true, true, true, true]);
    expect(o.criteria[0]!.note).toBe("Ball valve under the sink");
    expect(o.criteria[0]!.text).toBe("En maskins avstängningsventil syns");
  });

  it("uses the flat's appliance-valve wording, fix hint and owner for L1 (FIX 7)", () => {
    const flatL1 = getCheck("L1", "flat");
    const o = decideVerdict(flatL1, assess(allGood), { "L1.know_how": false }, "en", "flat");
    expect(o.verdict).toBe("fix_first");
    expect(o.fix?.owner).toBe("property_manager");
    expect(o.fix?.text).toBe(
      "If the valve drips or is stuck, tell the property manager or the maintenance company. Learn how to close the appliance valve.",
    );
    expect(o.criteria.map((c) => c.text)).toEqual([
      "An appliance's shut-off valve is visible",
      "The valve's handle or lever is visible",
      "No leaks, drips, corrosion or water stains at the valve",
      "I know how to close my appliance valves, and I have the maintenance company's emergency number",
    ]);
    const asked = decideVerdict(flatL1, assess(allGood), {}, "en", "flat");
    expect(asked.retakeHint).toBe(
      "Answer yes or no: “I know how to close my appliance valves, and I have the maintenance company's emergency number”.",
    );
  });

  it("never fails F2 on a missing RCD (FIX 9)", () => {
    const F2 = getCheck("F2", "house");
    const good = { "F2.board_visible": true, "F2.no_damage": true, "F2.clear_front": true };
    // An old cached assessment may still carry the removed criterion; it is ignored.
    const o = decideVerdict(F2, assess({ ...good, "F2.rcd_visible": false }), {}, "en", "house");
    expect(o.verdict).toBe("verified");
    expect(o.criteria.map((c) => c.id)).not.toContain("F2.rcd_visible");
    const damaged = decideVerdict(
      F2,
      assess({ ...good, "F2.no_damage": false }, { urgent: true }),
      {},
      "en",
      "house",
    );
    expect(damaged.verdict).toBe("fix_first");
    expect(damaged.fix).toEqual({
      text: "Clear the space in front of the fuse box. If you see damage or scorch marks, call an authorised electrician. Do not fix it yourself.",
      owner: "professional",
    });
  });

  it("gives the flat F1 fix to the housing company (FIX 8)", () => {
    const F1 = getCheck("F1", "flat");
    const seen = { "F1.alarm_visible": true, "F1.mounted": true };
    const o = decideVerdict(F1, assess(seen), { "F1.beeped": false }, "fi", "flat");
    expect(o.verdict).toBe("fix_first");
    expect(o.fix?.owner).toBe("property_manager");
    expect(o.fix?.text).toMatch(/^Jos palovaroitin ei piippaa, ilmoita heti taloyhtiölle/);
    const house = decideVerdict(
      getCheck("F1", "house"),
      assess(seen),
      { "F1.beeped": false },
      "en",
      "house",
    );
    expect(house.fix?.owner).toBe("me");
    expect(house.fix?.text).toMatch(/every started 60 m² of each floor\.$/);
  });

  describe("Z2's hose condition counts only in the cold season (FIX 32)", () => {
    const Z2 = getCheck("Z2", "house");
    const closed = { "Z2.indoor_valve_closed": true };
    const seen = { "Z2.tap_visible": true };

    it("gives fix_first for an attached hose from October to April", () => {
      for (const day of ["2026-10-01", "2026-12-15", "2027-04-30"]) {
        const o = decideVerdict(
          Z2,
          assess({ ...seen, "Z2.no_hose": false }),
          closed,
          "en",
          "house",
          day,
        );
        expect(o.verdict, day).toBe("fix_first");
      }
      const unclear = decideVerdict(
        Z2,
        assess({ ...seen, "Z2.no_hose": null }),
        closed,
        "en",
        "house",
        "2026-11-02",
      );
      expect(unclear.verdict).toBe("retake");
    });

    it("shows but doesn't count an attached hose from May to September", () => {
      const o = decideVerdict(
        Z2,
        assess({ ...seen, "Z2.no_hose": false }),
        closed,
        "en",
        "house",
        new Date("2026-07-10T12:00:00Z"),
      );
      expect(o.verdict).toBe("verified");
      const hose = o.criteria.find((c) => c.id === "Z2.no_hose")!;
      expect(hose.met).toBe(false);
      expect(hose.note).toBe("Counts only in the cold season, from October to April.");
      const unclear = decideVerdict(
        Z2,
        assess({ ...seen, "Z2.no_hose": null }),
        closed,
        "sv",
        "house",
        "2026-09-30",
      );
      expect(unclear.verdict).toBe("verified");
      expect(unclear.criteria[1]!.note).toBe(
        "Räknas bara under den kalla årstiden, från oktober till april.",
      );
      // The user answer still counts all year.
      const open = decideVerdict(
        Z2,
        assess({ ...seen, "Z2.no_hose": true }),
        { "Z2.indoor_valve_closed": false },
        "en",
        "house",
        "2026-07-10",
      );
      expect(open.verdict).toBe("fix_first");
    });
  });

  it("verifies a check with no user criteria without any answers", () => {
    const L4 = getCheck("L4");
    const o = decideVerdict(
      L4,
      assess({ "L4.floor_visible": true, "L4.tray_or_drain": true, "L4.dry": true }),
      {},
      "en",
      "flat",
    );
    expect(o.verdict).toBe("verified");
  });

  it("allows not applicable only where the check allows it", () => {
    expect(notApplicableOutcome(getCheck("L2"), "en", "flat").verdict).toBe("not_applicable");
    expect(() => notApplicableOutcome(getCheck("L1"), "en", "flat")).toThrow();
  });
});

describe("recordFromOutcome", () => {
  it("stores verdict, ISO times, due date, hash and user answers", () => {
    const o = decideVerdict(L1, assess(allGood), knows, "en", "flat");
    const r = recordFromOutcome("h1", o, new Date("2026-10-12T09:04:00Z"), "ABCDEF0123", "flat");
    expect(r).toEqual({
      homeId: "h1",
      checkId: "L1",
      verdict: "verified",
      checkedAt: "2026-10-12T09:04:00.000Z",
      dueAt: "2027-10-12",
      photoSha256: "abcdef0123",
      userAnswers: { "L1.know_how": true },
    });
  });

  it("has no due date for fix_first or retake, and no hash for not applicable", () => {
    const fix = recordFromOutcome(
      "h1",
      decideVerdict(L1, assess(allGood), { "L1.know_how": false }, "en", "flat"),
      new Date("2026-10-12T09:00:00Z"),
      "aa",
      "flat",
    );
    expect(fix.dueAt).toBeNull();
    const retake = recordFromOutcome(
      "h1",
      decideVerdict(L1, null, {}, "en", "flat"),
      new Date("2026-10-12T09:00:00Z"),
      "aa",
      "flat",
    );
    expect(retake.dueAt).toBeNull();
    const na = recordFromOutcome(
      "h1",
      notApplicableOutcome(getCheck("L2"), "en", "flat"),
      new Date("2026-10-12T09:00:00Z"),
      "aa",
      "flat",
    );
    expect(na.dueAt).toBe("2027-10-12");
    expect(na.photoSha256).toBeNull();
  });

  it("rejects a check that does not apply to the home type", () => {
    const o = notApplicableOutcome(getCheck("Z2"), "en", "house");
    expect(() => recordFromOutcome("h1", o, new Date(), null, "flat")).toThrow();
  });
});
