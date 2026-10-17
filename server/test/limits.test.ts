import { describe, expect, it } from "vitest";
import { costUsd, helsinkiDayKey, LiveGuard } from "../src/limits";

function clockAt(iso: string) {
  let now = new Date(iso);
  return {
    clock: () => now,
    set: (next: string) => {
      now = new Date(next);
    },
    advance: (ms: number) => {
      now = new Date(now.getTime() + ms);
    },
  };
}

const MIN = 60_000;

describe("LiveGuard", () => {
  it("allows RATE_PER_IP_10MIN live checks per client in a sliding 10-minute window", () => {
    const t = clockAt("2026-10-18T09:00:00Z");
    const g = new LiveGuard(
      { perIpPer10Min: 12, dailyLive: 400, dailySpendCapUsd: 40, estCostPerCallUsd: 0.05 },
      t.clock,
    );
    for (let i = 0; i < 12; i++) expect(g.tryReserve("a").ok).toBe(true);
    expect(g.tryReserve("a")).toEqual({ ok: false, reason: "per_ip" });
    expect(g.tryReserve("b").ok).toBe(true); // other clients are independent
    t.advance(9 * MIN);
    expect(g.tryReserve("a").ok).toBe(false);
    t.advance(1 * MIN + 1);
    expect(g.tryReserve("a").ok).toBe(true);
  });

  it("stops at DAILY_LIVE_LIMIT and resets at midnight Helsinki time", () => {
    // 20:59 UTC on 18 Oct is 23:59 in Helsinki (EEST, UTC+3).
    const t = clockAt("2026-10-18T20:00:00Z");
    const g = new LiveGuard(
      { perIpPer10Min: 100, dailyLive: 3, dailySpendCapUsd: 40, estCostPerCallUsd: 0.05 },
      t.clock,
    );
    for (let i = 0; i < 3; i++) expect(g.tryReserve(`c${i}`).ok).toBe(true);
    expect(g.tryReserve("d")).toEqual({ ok: false, reason: "daily" });
    expect(g.dailyAvailable()).toBe(false);
    t.set("2026-10-18T20:59:59Z");
    expect(g.tryReserve("d").ok).toBe(false);
    t.set("2026-10-18T21:00:01Z");
    expect(g.snapshot()).toMatchObject({ usedToday: 0, day: "2026-10-19" });
    expect(g.tryReserve("d").ok).toBe(true);
  });

  it("stops when the estimated spend would pass DAILY_SPEND_CAP_USD, and settles with the real cost", () => {
    const t = clockAt("2026-10-18T09:00:00Z");
    const g = new LiveGuard(
      { perIpPer10Min: 100, dailyLive: 400, dailySpendCapUsd: 0.12, estCostPerCallUsd: 0.05 },
      t.clock,
    );
    const first = g.tryReserve("a");
    const second = g.tryReserve("b");
    expect(first.ok && second.ok).toBe(true);
    expect(g.tryReserve("c")).toEqual({ ok: false, reason: "daily" });
    if (first.ok) g.settle(first.ticket, 0.01); // the real call was cheaper than the estimate
    expect(g.snapshot().spentTodayUsd).toBeCloseTo(0.06, 6);
    expect(g.tryReserve("c").ok).toBe(true);
  });

  it("prices calls by model, falling back to the most expensive row", () => {
    expect(costUsd("claude-sonnet-5-5", { inputTokens: 1_000_000, outputTokens: 0 })).toBeCloseTo(
      2,
    );
    expect(costUsd("claude-sonnet-5-5", { inputTokens: 0, outputTokens: 1_000_000 })).toBeCloseTo(
      10,
    );
    expect(
      costUsd("claude-opus-5-5", { inputTokens: 1_000_000, outputTokens: 1_000_000 }),
    ).toBeCloseTo(24);
    expect(costUsd("some-future-model", { inputTokens: 1_000_000, outputTokens: 0 })).toBeCloseTo(
      10,
    );
  });

  it("computes the Helsinki day across the DST change", () => {
    expect(helsinkiDayKey(new Date("2026-10-24T20:59:00Z"))).toBe("2026-10-24"); // EEST
    expect(helsinkiDayKey(new Date("2026-10-25T21:59:00Z"))).toBe("2026-10-25"); // EET after the change
    expect(helsinkiDayKey(new Date("2026-10-25T22:00:00Z"))).toBe("2026-10-26");
  });
});
