import { describe, expect, it } from "vitest";
import { DEMO, DEMO_CLAIM, adjusterView, homeCard } from "../src/index";
import type { Peril } from "../src/index";
import { NOW, demoHome, demoRecords, rec } from "./helpers";

const FLAT = "demo-turku-flat";

describe("homeCard", () => {
  it("demo flat card", () => {
    const card = homeCard(demoHome(FLAT), DEMO.records, NOW, null, "en");
    expect(card).toMatchObject({
      homeId: FLAT,
      label: "Demo flat, Turku",
      homeType: "flat",
      generatedAt: "2026-10-17T12:00:00.000Z",
      shutOffNote: "Water shut-off checked on 12 Oct 2026.",
      disclaimer: "A prompt to check, not an inspection.",
    });
    expect(card.perils).toEqual([
      { peril: "leak", state: "in_progress", preparedUntil: null },
      { peril: "fire", state: "in_progress", preparedUntil: null },
    ]);
    expect(card.records.map((r) => r.checkId)).toEqual(["L1", "L2", "L3", "L4", "L5", "L6", "F1", "F2", "F3"]);
    const l1 = card.records[0]!;
    expect(l1).toEqual({
      checkId: "L1",
      verdict: "verified",
      checkedAt: "2026-10-12T09:04:00.000Z",
      photoSha256Short: "9e5e1a8ee40d",
    });
    expect(card.nextReminder).toMatchObject({ kind: "fix_first", checkIds: ["L4"] });
  });

  it("localises the shut-off note and disclaimer", () => {
    const fi = homeCard(demoHome(FLAT), DEMO.records, NOW, null, "fi");
    expect(fi.shutOffNote).toBe("Veden sulku tarkistettu 12.10.2026.");
    expect(fi.disclaimer).toBe("Muistutus tarkistaa, ei tarkastus.");
    const sv = homeCard(demoHome(FLAT), DEMO.records, NOW, null, "sv");
    expect(sv.shutOffNote).toBe("Vattenavstängningen kontrollerad 12.10.2026.");
  });

  it("fresh home card is empty", () => {
    const card = homeCard(demoHome("demo-fresh"), DEMO.records, NOW, null, "en");
    expect(card.records).toEqual([]);
    expect(card.shutOffNote).toBeNull();
    expect(card.nextReminder).toBeNull();
    expect(card.perils.map((p) => p.state)).toEqual(["not_started", "not_started"]);
  });
});

describe("adjusterView", () => {
  const claim = (records = demoRecords(FLAT), shared: { checkId: string; sha256: string }[] = [], peril: Peril = DEMO_CLAIM.peril, lossDate = DEMO_CLAIM.lossDate) =>
    adjusterView({ claimId: "c-1", home: demoHome(FLAT), records, peril, lossDate, shared });

  it("demo claim before L4 is fixed: bonus not applied, says why", () => {
    const v = claim();
    expect(v.decision).toBe("bonus_not_applied");
    expect(v.perilStateAtLoss).toBe("in_progress");
    expect(v.deductible).toEqual({ standard: 300, prepared: 100, current: 300, label: "concept" });
    expect(v.reasons).toContain("L4 was fix_first and never re-taken before the loss date.");
    expect(v.note).toBe("Cover is unchanged either way; only the deductible relief depends on the checks. A person decides.");
    expect(v.records.find((r) => r.checkId === "L4")).toMatchObject({ verdict: "fix_first", validAtLoss: false, photoShared: false, hashMatches: null });
  });

  it("after a verified L4 with a matching shared photo: relief applies", () => {
    const l4Hash = "0123456789abcdef".repeat(4);
    const records = [...demoRecords(FLAT), rec(FLAT, "L4", "verified", "2026-10-17T10:00:00Z", l4Hash)];
    const v = claim(records, [{ checkId: "L4", sha256: l4Hash.toUpperCase() }]);
    expect(v.decision).toBe("relief_applies");
    expect(v.perilStateAtLoss).toBe("prepared");
    expect(v.deductible.current).toBe(100);
    expect(v.records).toHaveLength(6);
    expect(v.records.every((r) => r.validAtLoss)).toBe(true);
    expect(v.records.find((r) => r.checkId === "L4")).toMatchObject({ verdict: "verified", photoShared: true, hashMatches: true });
    expect(v.reasons[0]).toBe("Leak was prepared on 2027-02-03: all 6 checks were current.");
    expect(v.reasons).toContain("The shared photo matches the stored hash.");
  });

  it("relief applies with no shared photos, using the dated records", () => {
    const records = [...demoRecords(FLAT), rec(FLAT, "L4", "verified", "2026-10-17T10:00:00Z")];
    const v = claim(records);
    expect(v.decision).toBe("relief_applies");
    expect(v.reasons).toContain("No photos were shared; the dated records were used.");
  });

  it("a hash mismatch means the bonus is not applied", () => {
    const records = [...demoRecords(FLAT), rec(FLAT, "L4", "verified", "2026-10-17T10:00:00Z")];
    const v = claim(records, [{ checkId: "L2", sha256: "e".repeat(64) }]);
    expect(v.perilStateAtLoss).toBe("prepared");
    expect(v.decision).toBe("bonus_not_applied");
    expect(v.deductible.current).toBe(300);
    expect(v.reasons).toContain("The shared photo for L2 does not match the stored hash.");
    expect(v.records.find((r) => r.checkId === "L2")).toMatchObject({ photoShared: true, hashMatches: false });
  });

  it("an unprepared peril means the bonus is not applied, naming the missing checks", () => {
    const v = claim(demoRecords(FLAT), [], "fire");
    expect(v.decision).toBe("bonus_not_applied");
    expect(v.perilStateAtLoss).toBe("in_progress");
    expect(v.reasons).toEqual([
      "Fire was not prepared on 2027-02-03 (in progress).",
      "F4 was never checked before the loss date.",
      "F5 was never checked before the loss date.",
    ]);
  });

  it("checks done after the loss date do not count", () => {
    const records = [...demoRecords(FLAT), rec(FLAT, "F4", "verified", "2027-02-04T10:00:00Z"), rec(FLAT, "F5", "verified", "2026-10-20T10:00:00Z")];
    const v = claim(records, [], "fire");
    expect(v.decision).toBe("bonus_not_applied");
    expect(v.reasons).toContain("F4 was first checked after the loss date (2027-02-04).");
  });

  it("a lapsed peril on the loss date: bonus not applied", () => {
    const records = [...demoRecords(FLAT), rec(FLAT, "L4", "verified", "2026-10-17T10:00:00Z")];
    const v = claim(records, [], "leak", "2027-11-01");
    expect(v.perilStateAtLoss).toBe("lapsed");
    expect(v.decision).toBe("bonus_not_applied");
    expect(v.reasons).toContain("L1 was past its due date (2027-10-12) on the loss date.");
    expect(v.records.find((r) => r.checkId === "L1")!.validAtLoss).toBe(false);
  });

  it("a shared photo with no record before the loss is a mismatch", () => {
    const records = [...demoRecords(FLAT), rec(FLAT, "L4", "verified", "2026-10-17T10:00:00Z")];
    const v = claim(records, [{ checkId: "F5", sha256: "a".repeat(64) }]);
    expect(v.decision).toBe("bonus_not_applied");
    expect(v.reasons).toContain("The shared photo for F5 has no check record from before the loss date.");
  });

  it("storm water on a house uses the leak checks and its own deductible", () => {
    const house = demoHome("demo-house");
    const v = adjusterView(
      { claimId: "c-2", home: house, records: DEMO.records, peril: "storm_water", lossDate: "2026-11-20", shared: [] },
      { leak: { standard: 300, prepared: 100 }, fire: { standard: 300, prepared: 100 }, freeze: { standard: 300, prepared: 100 }, storm_water: { standard: 400, prepared: 200 } },
    );
    expect(v.decision).toBe("relief_applies");
    expect(v.records.map((r) => r.checkId)).toContain("S1");
    expect(v.deductible).toEqual({ standard: 400, prepared: 200, current: 200, label: "concept" });
  });
});
