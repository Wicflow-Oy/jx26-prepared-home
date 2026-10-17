import { describe, expect, it } from "vitest";
import { dueDateFor, getCheck } from "../src/index";
import { addMonths, lastJulyFirst, nextMonthStart, toDay } from "../src/dates";

describe("due dates", () => {
  it("yearly: checkedAt + 12 months", () => {
    expect(dueDateFor({ kind: "yearly" }, new Date("2026-10-12T09:04:00Z"))).toBe("2027-10-12");
    expect(dueDateFor({ kind: "yearly" }, "2028-02-29T12:00:00Z")).toBe("2029-02-28");
  });

  it("uses the UTC day", () => {
    // 23:30 UTC on 31 Dec is already 1 Jan in Finland, but the engine works in UTC.
    expect(dueDateFor({ kind: "yearly" }, "2026-12-31T23:30:00Z")).toBe("2027-12-31");
    expect(toDay("2026-10-12T23:59:59+03:00")).toBe("2026-10-12");
  });

  it("seasonal: the next listed month start after checkedAt", () => {
    const z1 = getCheck("Z1").recheck;
    const s1 = getCheck("S1").recheck;
    expect(dueDateFor(z1, "2026-10-12T10:00:00Z")).toBe("2027-09-01");
    expect(dueDateFor(z1, "2026-08-20T10:00:00Z")).toBe("2026-09-01");
    expect(dueDateFor(s1, "2026-10-12T10:00:00Z")).toBe("2027-04-01");
    expect(dueDateFor(s1, "2026-04-15T10:00:00Z")).toBe("2026-10-01");
    expect(dueDateFor(s1, "2026-01-05T10:00:00Z")).toBe("2026-04-01");
  });

  it("seasonal: at most 12 months away", () => {
    // Checked on the 1 September itself: the next 1 September is exactly 12 months later.
    expect(dueDateFor({ kind: "seasonal", months: [9] }, "2026-09-01T08:00:00Z")).toBe(
      "2027-09-01",
    );
    expect(dueDateFor({ kind: "seasonal", months: [] }, "2026-09-15T08:00:00Z")).toBe("2027-09-15");
  });

  it("frost: the next 1 October, or 12 months, whichever is sooner", () => {
    const z2 = getCheck("Z2").recheck;
    expect(dueDateFor(z2, "2026-10-12T10:00:00Z")).toBe("2027-10-01");
    expect(dueDateFor(z2, "2026-06-14T08:00:00Z")).toBe("2026-10-01");
    expect(dueDateFor(z2, "2026-10-01T08:00:00Z")).toBe("2027-10-01");
    expect(dueDateFor(z2, "2026-12-01T08:00:00Z")).toBe("2027-10-01");
  });

  it("date helpers", () => {
    expect(addMonths("2026-01-31", 1)).toBe("2026-02-28");
    expect(addMonths("2026-11-15", 3)).toBe("2027-02-15");
    expect(nextMonthStart("2026-12-15", [4, 10])).toBe("2027-04-01");
    expect(lastJulyFirst("2026-10-17")).toBe("2026-07-01");
    expect(lastJulyFirst("2027-03-01")).toBe("2026-07-01");
    expect(lastJulyFirst("2026-07-01")).toBe("2026-07-01");
  });
});
