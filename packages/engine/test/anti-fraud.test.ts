import { describe, expect, it } from "vitest";
import {
  adjusterView,
  decideVerdict,
  getCheck,
  perilStatuses,
  recordFromOutcome,
  type CheckRecord,
  type Home,
  type VisionAssessment,
} from "../src";

const home: Home = {
  homeId: "h1",
  homeType: "flat",
  label: "Test flat",
  moveInDate: "2026-10-01",
  hasLeakAlarm: false,
};

function allMet(checkId: string, extra: Partial<VisionAssessment> = {}): VisionAssessment {
  const check = getCheck(checkId, "flat");
  return {
    criteria: check.criteria.filter((c) => c.kind !== "user").map((c) => ({ id: c.id, met: true })),
    boxes: [],
    model: "test",
    ...extra,
  };
}

function answers(checkId: string): Record<string, boolean> {
  const check = getCheck(checkId, "flat");
  return Object.fromEntries(
    check.criteria.filter((c) => c.kind === "user").map((c) => [c.id, true]),
  );
}

const leakIds = ["L1", "L2", "L3", "L4", "L5", "L6"];
const checkedAt = new Date("2026-10-12T10:00:00Z");

function leakRecords(capture: CheckRecord["capture"]): CheckRecord[] {
  return leakIds.map((id, i) => {
    const outcome = decideVerdict(getCheck(id, "flat"), allMet(id), answers(id), "en", "flat");
    const record = recordFromOutcome("h1", outcome, checkedAt, `${i}`.repeat(64), "flat", capture);
    return { ...record, secondPhotoSha256: `${i}`.repeat(63) + "a" };
  });
}

describe("photos of screens and printouts", () => {
  it("are a retake whatever the criteria say", () => {
    const check = getCheck("L2", "flat");
    const outcome = decideVerdict(check, allMet("L2", { reproduction: true }), {}, "en", "flat");
    expect(outcome.verdict).toBe("retake");
    expect(outcome.retakeHint).toContain("not a screen");
  });
});

describe("only in-app camera photos count toward the relief", () => {
  const now = new Date("2026-10-20T10:00:00Z");

  it("camera photos make a risk prepared", () => {
    const leak = perilStatuses(home, leakRecords("camera"), now).find((p) => p.peril === "leak")!;
    expect(leak.state).toBe("prepared");
    expect(leak.notCounted).toEqual([]);
  });

  it("gallery photos are listed but don't make it prepared", () => {
    const leak = perilStatuses(home, leakRecords("library"), now).find((p) => p.peril === "leak")!;
    expect(leak.state).not.toBe("prepared");
    expect(leak.notCounted).toEqual(leakIds);
  });

  it("the claim decision refuses example photos with a reason", () => {
    const view = adjusterView({
      claimId: "c1",
      home,
      records: leakRecords("sample"),
      peril: "leak",
      lossDate: "2026-11-01",
      shared: [],
    });
    expect(view.decision).toBe("bonus_not_applied");
    expect(view.reasons.join(" ")).toContain("does not count");
  });
});

describe("a second angle of the same item", () => {
  it("can be shared at claim time and still matches the check", () => {
    const records = leakRecords("camera").map((r) => ({ ...r, secondPhotoSha256: "f".repeat(64) }));
    const view = adjusterView({
      claimId: "c2",
      home,
      records,
      peril: "leak",
      lossDate: "2026-11-01",
      shared: [{ checkId: "L2", sha256: "f".repeat(64) }],
    });
    expect(view.records.find((r) => r.checkId === "L2")?.hashMatches).toBe(true);
  });
});

describe("what counts toward the relief", () => {
  const now = new Date("2026-10-20T10:00:00Z");

  it("a camera photo without the second angle doesn't count", () => {
    const records = leakRecords("camera").map((r) => ({ ...r, secondPhotoSha256: null }));
    const leak = perilStatuses(home, records, now).find((p) => p.peril === "leak")!;
    expect(leak.state).not.toBe("prepared");
    expect(leak.notCounted).toEqual(leakIds);
  });

  it("a record with no photo source doesn't count", () => {
    const records = leakRecords("camera").map((r) => ({ ...r, capture: undefined }));
    const leak = perilStatuses(home, records, now).find((p) => p.peril === "leak")!;
    expect(leak.state).not.toBe("prepared");
  });
});
