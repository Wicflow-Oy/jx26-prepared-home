import { readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { LiveGuard } from "../src/limits";
import { CachedVisionProvider } from "../src/vision/cached";
import { VisionChain } from "../src/vision/chain";
import { MockVisionProvider } from "../src/vision/mock";
import { check, FakeProvider, photo, scriptedAssessment, tempDir } from "./helpers";

const l1 = check("L1");
const a07 = photo("A07.jpg");
const input = (clientKey = "ip-a") => ({
  check: l1,
  lang: "en" as const,
  image: { base64: a07.base64, mediaType: "image/jpeg" as const, width: 1280, height: 1707 },
  sha256: a07.sha256,
  clientKey,
});

const guard = (perIp = 12, daily = 400, cap = 40) =>
  new LiveGuard({
    perIpPer10Min: perIp,
    dailyLive: daily,
    dailySpendCapUsd: cap,
    estCostPerCallUsd: 0.05,
  });

describe("VisionChain", () => {
  it("answers offline with all-null criteria when there is no key", async () => {
    const chain = new VisionChain({
      cache: new CachedVisionProvider(tempDir(), false),
      live: null,
    });
    const r = await chain.assess(input());
    expect(r.source).toBe("offline");
    expect(r.model).toBe("mock");
    expect(r.sourceNote).toBe("Offline demo: no live check.");
    expect(r.assessment!.criteria.every((c) => c.met === null)).toBe(true);
    expect(r.assessment!.retakeHint).toBe("Offline demo: no live check");
    expect(chain.liveAvailable()).toBe(false);
  });

  it("goes live on a cache miss and records only when CACHE_WRITE is on", async () => {
    for (const writable of [false, true]) {
      const dir = tempDir();
      const live = new FakeProvider(
        "claude-sonnet-5-5",
        (i) =>
          ({
            ...scriptedAssessment(i.check, "verified", "claude-sonnet-5-5"),
            usage: { inputTokens: 1000, outputTokens: 100 },
          }) as never,
      );
      const chain = new VisionChain({
        cache: new CachedVisionProvider(dir, writable),
        live,
        guard: guard(),
        clock: () => new Date("2026-10-18T09:00:00Z"),
      });
      const r = await chain.assess(input());
      expect(r.source).toBe("live");
      expect(r.model).toBe("claude-sonnet-5-5");
      expect(r.sourceNote).toBeUndefined();
      expect((r.assessment as unknown as { usage?: unknown }).usage).toBeUndefined();
      const files = (() => {
        try {
          return readdirSync(path.join(dir, "assessments"));
        } catch {
          return [];
        }
      })();
      expect(files).toEqual(writable ? [`${a07.sha256}.json`] : []);
    }
  });

  it("serves a recorded result from the cache with its date, without a live call, even when limits are exhausted", async () => {
    const dir = tempDir();
    const cache = new CachedVisionProvider(dir, true);
    await cache.store(
      a07.sha256,
      "L1",
      scriptedAssessment(l1, "verified", "claude-sonnet-5-5"),
      new Date("2026-10-18T09:30:00Z"),
    );
    const live = new FakeProvider("claude-sonnet-5-5", (i) =>
      scriptedAssessment(i.check, "retake"),
    );
    const chain = new VisionChain({
      cache: new CachedVisionProvider(dir, false),
      live,
      guard: guard(0, 0, 0),
    });
    const r = await chain.assess(input());
    expect(r.source).toBe("cached");
    expect(r.model).toBe("claude-sonnet-5-5");
    expect(r.sourceNote).toBe("Recorded live result (2026-10-18)");
    expect(r.recordedAt).toBe("2026-10-18T09:30:00.000Z");
    expect(live.calls).toBe(0);
    // Same photo recorded for another check is a miss.
    const other = await chain.assess({ ...input(), check: check("L2") });
    expect(other.source).not.toBe("cached");
  });

  it("never answers a two-angle check from the single-photo cache", async () => {
    const dir = tempDir();
    const cache = new CachedVisionProvider(dir, true);
    await cache.store(
      a07.sha256,
      "L1",
      scriptedAssessment(l1, "verified", "claude-sonnet-5-5"),
      new Date("2026-10-18T09:30:00Z"),
    );
    const live = new FakeProvider("claude-sonnet-5-5", (i) =>
      scriptedAssessment(i.check, "retake"),
    );
    const chain = new VisionChain({ cache: new CachedVisionProvider(dir, false), live });
    const pair = await chain.assess({ ...input(), secondImage: input().image });
    expect(pair.source).toBe("live");
    expect(live.calls).toBe(1);
  });

  it("falls back to offline with a note when the per-IP limit is hit, never an error", async () => {
    const live = new FakeProvider("m", (i) => scriptedAssessment(i.check, "verified"));
    const chain = new VisionChain({
      cache: new CachedVisionProvider(tempDir(), false),
      live,
      guard: guard(2),
    });
    expect((await chain.assess(input("ip-a"))).source).toBe("live");
    expect((await chain.assess(input("ip-a"))).source).toBe("live");
    const third = await chain.assess(input("ip-a"));
    expect(third.source).toBe("offline");
    expect(third.sourceNote).toBe("Live check limit reached; try a sample photo.");
    expect(third.assessment!.retakeHint).toBe("Live check limit reached; try a sample photo.");
    expect(third.assessment!.criteria.every((c) => c.met === null)).toBe(true);
    expect(live.calls).toBe(2);
    expect((await chain.assess(input("ip-b"))).source).toBe("live");
  });

  it("falls back to offline with the daily note when the daily cap is hit, in the user's language", async () => {
    const live = new FakeProvider("m", (i) => scriptedAssessment(i.check, "verified"));
    const chain = new VisionChain({
      cache: new CachedVisionProvider(tempDir(), false),
      live,
      guard: guard(12, 1),
    });
    expect((await chain.assess(input())).source).toBe("live");
    expect(chain.liveAvailable()).toBe(false);
    const r = await chain.assess({ ...input("ip-z"), lang: "sv" });
    expect(r.source).toBe("offline");
    expect(r.sourceNote).toBe("Kontrollerna är pausade för i dag; prova ett exempelfoto.");
  });

  it("reports a failed live call as no assessment (the engine says couldn't check), not as an error", async () => {
    const live = new FakeProvider("m", () => {
      throw Object.assign(new Error("boom"), { status: 500 });
    });
    const chain = new VisionChain({
      cache: new CachedVisionProvider(tempDir(), false),
      live,
      guard: guard(),
    });
    const r = await chain.assess(input());
    expect(r.assessment).toBeNull();
    expect(r.source).toBe("offline");
    expect(r.sourceNote).toBe("Couldn't reach the photo check. Try again.");
  });

  it("the cached provider satisfies the VisionProvider interface and misses cleanly", async () => {
    const cache = new CachedVisionProvider(tempDir(), false);
    await expect(cache.assess(input())).rejects.toThrow("No recorded assessment");
    expect(
      await cache.store(a07.sha256, "L1", scriptedAssessment(l1, "verified"), new Date()),
    ).toBe(false);
    expect(await cache.lookup("../../etc/passwd", "L1")).toBeNull();
    expect(await new MockVisionProvider().assess({ ...input(), lang: "fi" })).toMatchObject({
      model: "mock",
      retakeHint: "Offline-demo: kuvaa ei tarkistettu",
    });
  });
});
