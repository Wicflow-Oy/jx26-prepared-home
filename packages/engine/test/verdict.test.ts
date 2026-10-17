import { describe, expect, it } from "vitest";
import { decideVerdict, getCheck, notApplicableOutcome, recordFromOutcome } from "../src/index";
import type { VisionAssessment } from "../src/index";

const assess = (met: Record<string, boolean | null>, extra: Partial<VisionAssessment> = {}): VisionAssessment => ({
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
    expect(o.retakeHint).toBe("Couldn't check the photo. Try again.");
    expect(decideVerdict(L1, null, knows, "fi", "house").retakeHint).toBe("Kuvaa ei voitu tarkistaa. Yritä uudelleen.");
    expect(o.fix).toBeNull();
  });

  it("retakes when a visibility criterion is false", () => {
    const o = decideVerdict(L1, assess({ ...allGood, "L1.handle_visible": false }), knows, "en", "house");
    expect(o.verdict).toBe("retake");
    expect(o.retakeHint).toContain("Its handle or lever is visible");
  });

  it("retakes when a visibility criterion is null or missing, even if a condition fails", () => {
    const o = decideVerdict(L1, assess({ "L1.valve_visible": true, "L1.no_leak": false }), knows, "en", "house");
    expect(o.verdict).toBe("retake");
  });

  it("uses the model's retake hint when given", () => {
    const o = decideVerdict(L1, assess({ ...allGood, "L1.valve_visible": null }, { retakeHint: "Offline demo: no live check" }), knows, "en", "house");
    expect(o.verdict).toBe("retake");
    expect(o.retakeHint).toBe("Offline demo: no live check");
  });

  it("retakes when a condition criterion is null", () => {
    const o = decideVerdict(L1, assess({ ...allGood, "L1.no_leak": null }), knows, "en", "house");
    expect(o.verdict).toBe("retake");
    expect(o.retakeHint).toContain("No leak, drip, corrosion or water stains at the valve");
  });

  it("retakes and asks for the answer when a user answer is missing", () => {
    const o = decideVerdict(L1, assess(allGood), {}, "en", "house");
    expect(o.verdict).toBe("retake");
    expect(o.retakeHint).toBe("Please answer yes or no: “I know how to close it”.");
    const sv = decideVerdict(L1, assess(allGood), {}, "sv", "house");
    expect(sv.retakeHint).toBe("Svara ja eller nej: ”Jag vet hur man stänger den”.");
  });

  it("ignores a model's answer to a user criterion", () => {
    const o = decideVerdict(L1, assess({ ...allGood, "L1.know_how": true }), {}, "en", "house");
    expect(o.verdict).toBe("retake");
    expect(o.criteria.find((c) => c.id === "L1.know_how")!.met).toBeNull();
  });

  it("gives fix_first when a condition criterion is false, with the owner for the home type", () => {
    const house = decideVerdict(L1, assess({ ...allGood, "L1.no_leak": false }, { urgent: true }), knows, "en", "house");
    expect(house.verdict).toBe("fix_first");
    expect(house.fix?.owner).toBe("me");
    expect(house.urgent).toBe(true);
    expect(house.retakeHint).toBeNull();
    const flat = decideVerdict(L1, assess({ ...allGood, "L1.no_leak": false }), knows, "fi", "flat");
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
    expect(o.criteria[0]!.text).toBe("Lägenhetens avstängningsventil eller en maskins egen ventil syns");
  });

  it("verifies a check with no user criteria without any answers", () => {
    const L4 = getCheck("L4");
    const o = decideVerdict(L4, assess({ "L4.floor_visible": true, "L4.tray_or_drain": true, "L4.dry": true }), {}, "en", "flat");
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
    const fix = recordFromOutcome("h1", decideVerdict(L1, assess(allGood), { "L1.know_how": false }, "en", "flat"), new Date("2026-10-12T09:00:00Z"), "aa", "flat");
    expect(fix.dueAt).toBeNull();
    const retake = recordFromOutcome("h1", decideVerdict(L1, null, {}, "en", "flat"), new Date("2026-10-12T09:00:00Z"), "aa", "flat");
    expect(retake.dueAt).toBeNull();
    const na = recordFromOutcome("h1", notApplicableOutcome(getCheck("L2"), "en", "flat"), new Date("2026-10-12T09:00:00Z"), "aa", "flat");
    expect(na.dueAt).toBe("2027-10-12");
    expect(na.photoSha256).toBeNull();
  });

  it("rejects a check that does not apply to the home type", () => {
    const o = notApplicableOutcome(getCheck("Z2"), "en", "house");
    expect(() => recordFromOutcome("h1", o, new Date(), null, "flat")).toThrow();
  });
});
