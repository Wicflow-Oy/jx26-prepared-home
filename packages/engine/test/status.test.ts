import { describe, expect, it } from "vitest";
import { DEFAULT_DEDUCTIBLES, DEMO, perilStatuses } from "../src/index";
import { NOW, demoHome, demoRecords, rec } from "./helpers";

const FLAT = "demo-turku-flat";

describe("demo data", () => {
  it("has the demo homes and realistic hashes", () => {
    expect(DEMO.homes.map((h) => h.homeId)).toEqual(["demo-turku-flat", "demo-fresh", "demo-house"]);
    expect(demoHome(FLAT)).toMatchObject({ homeType: "flat", label: "Demo flat, Turku", moveInDate: "2026-10-10", hasLeakAlarm: false });
    expect(demoHome("demo-fresh")).toMatchObject({ homeType: "flat", label: "New home" });
    expect(DEMO.records.filter((r) => r.homeId === "demo-fresh")).toEqual([]);
    for (const r of DEMO.records) expect(r.photoSha256).toMatch(/^[0-9a-f]{64}$/);
    expect(new Set(DEMO.records.map((r) => r.photoSha256)).size).toBe(DEMO.records.length);
    const house = DEMO.records.filter((r) => r.homeId === "demo-house");
    expect(house).toHaveLength(14);
    expect(house.every((r) => r.verdict === "verified")).toBe(true);
  });
});

describe("perilStatuses", () => {
  it("demo flat: Leak 5/6 in progress with L4 to fix, Fire 3/5", () => {
    const [leak, fire, ...rest] = perilStatuses(demoHome(FLAT), DEMO.records, NOW);
    expect(rest).toEqual([]); // no freeze checks for a flat
    expect(leak).toMatchObject({
      peril: "leak",
      state: "in_progress",
      required: ["L1", "L2", "L3", "L4", "L5", "L6"],
      verified: ["L1", "L2", "L3", "L5", "L6"],
      fixFirst: ["L4"],
      missing: [],
      overdue: [],
      preparedUntil: null,
      alarmDeviceLine: false,
      deductible: { standard: 300, prepared: 100, current: 300, label: "concept" },
    });
    expect(fire).toMatchObject({
      peril: "fire",
      state: "in_progress",
      verified: ["F1", "F2", "F3"],
      missing: ["F4", "F5"],
    });
    expect(fire!.required).toHaveLength(5);
  });

  it("demo fresh: not started", () => {
    const statuses = perilStatuses(demoHome("demo-fresh"), DEMO.records, NOW);
    expect(statuses.map((s) => s.state)).toEqual(["not_started", "not_started"]);
    expect(statuses[0]!.missing).toHaveLength(6);
  });

  it("goes prepared, then lapsed after the due date", () => {
    const records = [
      ...demoRecords(FLAT),
      rec(FLAT, "L4", "verified", "2026-10-17T10:00:00Z"),
      rec(FLAT, "F4", "verified", "2026-10-17T10:05:00Z"),
      rec(FLAT, "F5", "verified", "2026-10-17T10:10:00Z"),
    ];
    const [leak, fire] = perilStatuses(demoHome(FLAT), records, NOW);
    expect(leak!.state).toBe("prepared");
    expect(leak!.preparedUntil).toBe("2027-10-12");
    expect(leak!.deductible.current).toBe(100);
    expect(fire!.state).toBe("prepared");

    // Still prepared on the due date itself...
    expect(perilStatuses(demoHome(FLAT), records, new Date("2027-10-12T20:00:00Z"))[0]!.state).toBe("prepared");
    // ...lapsed the day after.
    const [lapsed] = perilStatuses(demoHome(FLAT), records, new Date("2027-10-13T08:00:00Z"));
    expect(lapsed!.state).toBe("lapsed");
    expect(lapsed!.overdue).toEqual(["L1", "L2", "L3", "L5", "L6"]);
    expect(lapsed!.verified).toEqual(["L4"]);
    expect(lapsed!.preparedUntil).toBeNull();
    expect(lapsed!.deductible.current).toBe(300);
  });

  it("counts not applicable as done", () => {
    const records = [
      ...demoRecords(FLAT).filter((r) => r.checkId !== "L2"),
      rec(FLAT, "L2", "not_applicable", "2026-10-13T09:00:00Z"),
      rec(FLAT, "L4", "verified", "2026-10-17T10:00:00Z"),
    ];
    const [leak] = perilStatuses(demoHome(FLAT), records, NOW);
    expect(leak!.state).toBe("prepared");
    expect(leak!.notApplicable).toEqual(["L2"]);
  });

  it("does not let a later unclear photo undo a result, and ignores other homes", () => {
    const records = [...demoRecords(FLAT), rec(FLAT, "L1", "retake", "2026-10-16T10:00:00Z"), rec("other", "L4", "verified", "2026-10-16T10:00:00Z")];
    const [leak] = perilStatuses(demoHome(FLAT), records, NOW);
    expect(leak!.verified).toContain("L1");
    expect(leak!.fixFirst).toEqual(["L4"]);
  });

  it("a fix_first after a verified check replaces it", () => {
    const records = [...demoRecords(FLAT), rec(FLAT, "L1", "fix_first", "2026-10-16T10:00:00Z")];
    const [leak] = perilStatuses(demoHome(FLAT), records, NOW);
    expect(leak!.fixFirst).toEqual(["L1", "L4"]);
  });

  it("house: storm water counts toward leak, alarm line shown, freeze lapsed by the June outdoor-tap check", () => {
    const house = demoHome("demo-house");
    const [leak, fire, freeze] = perilStatuses(house, DEMO.records, NOW);
    expect(leak!.required).toEqual(["L1", "L2", "L3", "L4", "L5", "L6", "S1"]);
    expect(leak!.state).toBe("prepared");
    expect(leak!.preparedUntil).toBe("2027-04-01");
    expect(leak!.alarmDeviceLine).toBe(true);
    expect(fire!.alarmDeviceLine).toBe(false);
    expect(fire!.state).toBe("prepared");
    expect(freeze!.peril).toBe("freeze");
    expect(freeze!.state).toBe("lapsed");
    expect(freeze!.overdue).toEqual(["Z2"]);
  });

  it("takes deductible amounts from the config", () => {
    const records = [...demoRecords(FLAT), rec(FLAT, "L4", "verified", "2026-10-17T10:00:00Z")];
    const cfg = { ...DEFAULT_DEDUCTIBLES, leak: { standard: 500, prepared: 150 } };
    const [leak, fire] = perilStatuses(demoHome(FLAT), records, NOW, cfg);
    expect(leak!.deductible).toEqual({ standard: 500, prepared: 150, current: 150, label: "concept" });
    expect(fire!.deductible).toEqual({ standard: 300, prepared: 100, current: 300, label: "concept" });
  });
});
