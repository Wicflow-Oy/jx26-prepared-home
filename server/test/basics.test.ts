import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { DEMO } from "@prepared-home/engine";
import { loadConfig } from "../src/config";
import { decodeBase64, isSha256Hex, makeIpHasher, sha256Hex } from "../src/hash";
import { isJpeg, jpegSize } from "../src/jpeg";
import { FileStore } from "../src/store";
import { HttpError, receiveImage } from "../src/validate";
import { fakeJpeg, photo, tempDir } from "./helpers";

describe("JPEG and hashing", () => {
  it("reads the size of real and synthetic JPEGs", () => {
    expect(jpegSize(photo("A07.jpg").bytes)).toEqual({ width: 1280, height: 1707 });
    expect(jpegSize(fakeJpeg(3000, 2000))).toEqual({ width: 3000, height: 2000 });
    expect(jpegSize(Buffer.from("\x89PNG\r\n\x1a\n0000"))).toBeNull();
    expect(isJpeg(Buffer.from([0xff, 0xd8, 0xff, 0xe0]))).toBe(true);
  });

  it("decodes base64 with or without a data URL prefix and rejects junk", () => {
    const b = Buffer.from("hello");
    expect(decodeBase64(b.toString("base64"))!.equals(b)).toBe(true);
    expect(decodeBase64(`data:image/jpeg;base64,${b.toString("base64")}`)!.equals(b)).toBe(true);
    expect(decodeBase64("not base64!!")).toBeNull();
    expect(decodeBase64(42)).toBeNull();
    expect(isSha256Hex(sha256Hex(b))).toBe(true);
  });

  it("verifies the client's hash, the JPEG type and the 2576 px limit", () => {
    const p = photo("A07.jpg");
    expect(receiveImage(p.base64, p.sha256.toUpperCase()).sha256).toBe(p.sha256);
    const status = (fn: () => unknown) => {
      try {
        fn();
      } catch (e) {
        return (e as HttpError).status;
      }
      return 200;
    };
    expect(status(() => receiveImage(p.base64, "0".repeat(64)))).toBe(409);
    expect(
      status(() => receiveImage(Buffer.from("GIF89a....").toString("base64"), undefined)),
    ).toBe(415);
    expect(status(() => receiveImage(fakeJpeg(2577, 100).toString("base64"), undefined))).toBe(413);
    expect(status(() => receiveImage(fakeJpeg(2576, 1932).toString("base64"), undefined))).toBe(
      200,
    );
  });

  it("hashes IPs into short salted tags", () => {
    const a = makeIpHasher("salt-1");
    const b = makeIpHasher("salt-2");
    expect(a("203.0.113.9")).toHaveLength(10);
    expect(a("203.0.113.9")).toBe(a("203.0.113.9"));
    expect(a("203.0.113.9")).not.toBe(b("203.0.113.9"));
    expect(a("203.0.113.9")).not.toContain("203");
  });
});

describe("config", () => {
  it("treats empty values as unset", () => {
    const c = loadConfig({
      PORT: "",
      RATE_PER_IP_10MIN: "",
      DAILY_LIVE_LIMIT: "",
      DAILY_SPEND_CAP_USD: "",
      VISION_MODEL: "",
      ANTHROPIC_API_KEY: "",
      STORE_MODE: "",
      TRUST_PROXY: "",
      CACHE_WRITE: "",
      WEB_DIST: "",
    });
    expect(c).toMatchObject({
      port: 8787,
      ratePerIp10Min: 12,
      dailyLiveLimit: 400,
      dailySpendCapUsd: 40,
      visionModel: "claude-sonnet-5-5",
      apiKey: null,
      storeMode: "stateless",
      trustProxy: false,
      cacheWrite: false,
    });
    expect(c.webDist.replace(/\\/g, "/")).toMatch(/app\/dist$/);
  });

  it("reads overrides", () => {
    const c = loadConfig({
      RATE_PER_IP_10MIN: "3",
      DAILY_SPEND_CAP_USD: "7.5",
      TRUST_PROXY: "1",
      STORE_MODE: "file",
      CACHE_WRITE: "1",
      ANTHROPIC_API_KEY: " k ",
    });
    expect(c).toMatchObject({
      ratePerIp10Min: 3,
      dailySpendCapUsd: 7.5,
      trustProxy: 1,
      storeMode: "file",
      cacheWrite: true,
      apiKey: "k",
    });
  });
});

describe("FileStore", () => {
  it("seeds the demo homes, appends records and survives a reload", async () => {
    const file = path.join(tempDir(), "data", "store.json");
    const store = new FileStore(file);
    await store.load();
    await store.addHome({
      homeId: "home-1",
      homeType: "flat",
      label: "Mine",
      moveInDate: "2026-10-01",
      hasLeakAlarm: false,
    });
    await store.seedDemo(DEMO);
    const demoFlat = DEMO.homes[0].homeId;
    expect(store.records(demoFlat).length).toBe(
      DEMO.records.filter((r) => r.homeId === demoFlat).length,
    );
    await store.putRecord({
      homeId: "home-1",
      checkId: "L1",
      verdict: "verified",
      checkedAt: "2026-10-18T10:00:00Z",
      dueAt: "2027-10-18",
      photoSha256: "a".repeat(64),
    });
    const again = new FileStore(file);
    await again.load();
    expect(again.getHome("home-1")?.label).toBe("Mine");
    expect(again.records("home-1")).toHaveLength(1);
    const raw = readFileSync(file, "utf8");
    expect(Object.keys(JSON.parse(raw)).sort()).toEqual(["homes", "records"]);
  });

  it("keeps a corrupt file aside instead of overwriting it", async () => {
    const dir = tempDir();
    const file = path.join(dir, "store.json");
    writeFileSync(file, "{not json");
    const store = new FileStore(file);
    await store.load();
    expect(store.homes()).toEqual([]);
    const { readdirSync } = await import("node:fs");
    expect(readdirSync(dir).some((n) => n.startsWith("store.json.corrupt-"))).toBe(true);
  });
});
