import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { DEMO, DEMO_CLAIM, type CheckRecord } from "@prepared-home/engine";
import { createApp } from "../src/app";
import type { ServerConfig } from "../src/config";
import type { FetchLike } from "../src/fmi";
import type { Logger } from "../src/log";
import { buildDeps } from "../src/server";
import type { VisionProvider } from "../src/vision/types";
import {
  fakeJpeg,
  FakeProvider,
  photo,
  quietLogger,
  scriptedAssessment,
  tempDir,
  testConfig,
} from "./helpers";

const offlineFetch: FetchLike = async () => {
  throw new Error("offline in tests");
};

async function makeApp(
  opts: { config?: Partial<ServerConfig>; live?: VisionProvider | null; logger?: Logger } = {},
) {
  const config = testConfig(opts.config);
  const deps = await buildDeps(config, {
    live: opts.live ?? null,
    fetchImpl: offlineFetch,
    logger: opts.logger ?? quietLogger,
  });
  return { app: createApp(deps), deps, config };
}

const a07 = photo("A07.jpg");
const checkBody = (over: Record<string, unknown> = {}) => ({
  homeId: "local-123",
  homeType: "flat",
  checkId: "L1",
  lang: "en",
  imageBase64: a07.base64,
  width: 1280,
  height: 1707,
  photoSha256: a07.sha256,
  userAnswers: { "L1.know_how": true, "not.a.criterion": true },
  ...over,
});

describe("stateless API (/api/v1)", () => {
  it("health works without a key and never exposes one", async () => {
    const { app } = await makeApp();
    const res = await request(app).get("/api/v1/health").expect(200);
    expect(res.body).toEqual({
      ok: true,
      provider: "mock",
      model: "mock",
      keySet: false,
      liveAvailable: false,
      storeMode: "stateless",
      limits: {
        perIpPer10Min: 12,
        dailyLive: 400,
        usedToday: 0,
        dailySpendCapUsd: 40,
        spentTodayUsd: 0,
      },
    });
    expect(res.headers["x-robots-tag"]).toBe("noindex, nofollow");
    expect(res.headers["access-control-allow-origin"]).toBe("*");
  });

  it("reports the live provider without the key", async () => {
    const { app } = await makeApp({
      live: new FakeProvider("claude-sonnet-5-5", (i) => scriptedAssessment(i.check, "verified")),
    });
    const res = await request(app).get("/api/v1/health").expect(200);
    expect(res.body).toMatchObject({
      provider: "anthropic",
      model: "claude-sonnet-5-5",
      keySet: true,
      liveAvailable: true,
    });
  });

  it("lists checks with clause texts per home type", async () => {
    const { app } = await makeApp();
    const flat = await request(app).get("/api/v1/checks?homeType=flat&lang=fi").expect(200);
    expect(flat.body.map((c: { id: string }) => c.id)).toEqual([
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
    expect(flat.body[0].clause).toEqual([]); // flat L1 checks an appliance valve and cites no clause
    expect(flat.body[9].clause[0]).toMatchObject({ id: "OMA-5.2.15" }); // F4
    expect(typeof flat.body[9].clause[0].text).toBe("string");
    expect((await request(app).get("/api/v1/checks?homeType=house").expect(200)).body).toHaveLength(
      14,
    );
    expect((await request(app).get("/api/v1/checks").expect(200)).body).toHaveLength(14);
    await request(app).get("/api/v1/checks?homeType=castle").expect(400);
  });

  it("serves the frost forecast (fixture when FMI is unreachable)", async () => {
    const { app } = await makeApp();
    const res = await request(app).get("/api/v1/frost?place=Turku").expect(200);
    expect(res.body).toMatchObject({ place: "Turku", source: "fixture" });
  });

  it("lists the six samples with credits and serves only those files", async () => {
    const { app } = await makeApp();
    const res = await request(app).get("/api/v1/samples?lang=sv").expect(200);
    expect(res.body.map((s: { id: string }) => s.id)).toEqual([
      "A07",
      "C01",
      "B03",
      "C04",
      "B07",
      "A05",
    ]);
    expect(res.body[0]).toMatchObject({
      checkId: "L1",
      expectedVerdict: "verified",
      url: "/samples/A07.jpg",
      credit: "Photo: Tony Webster, CC BY 2.0, Wikimedia Commons",
      sha256: a07.sha256,
      recorded: false,
      caption: "Kulventil på ett kopparrör",
    });
    const img = await request(app).get("/samples/A07.jpg").expect(200);
    expect(img.headers["content-type"]).toBe("image/jpeg");
    expect(Buffer.compare(img.body as Buffer, a07.bytes)).toBe(0);
    await request(app).get("/samples/A01.jpg").expect(404); // in the folder, but not a sample
    await request(app).get("/samples/..%2Fmanifest.json").expect(404);
  });

  it("checks a photo offline without a key: retake with a note, record built from the body, nothing stored", async () => {
    const { app, config } = await makeApp();
    const res = await request(app).post("/api/v1/check").send(checkBody()).expect(200);
    expect(res.body.source).toBe("offline");
    expect(res.body.model).toBe("mock");
    expect(res.body.sourceNote).toBe("Offline demo: no live check.");
    expect(res.body.outcome.verdict).toBe("retake");
    expect(res.body.record).toMatchObject({
      homeId: "local-123",
      checkId: "L1",
      verdict: "retake",
      photoSha256: a07.sha256,
      dueAt: null,
    });
    expect(res.body.clause).toEqual([]); // flat L1 cites no clause
    const { existsSync } = await import("node:fs");
    expect(existsSync(config.storePath)).toBe(false);
  });

  it("checks a photo live: verified with a due date, user answers only for the check's own criteria", async () => {
    const live = new FakeProvider("claude-sonnet-5-5", (i) =>
      scriptedAssessment(i.check, "verified", "claude-sonnet-5-5"),
    );
    const { app } = await makeApp({ live });
    const res = await request(app).post("/api/v1/check").send(checkBody()).expect(200);
    expect(res.body).toMatchObject({ source: "live", model: "claude-sonnet-5-5" });
    expect(res.body.outcome.verdict).toBe("verified");
    expect(res.body.record.dueAt).toMatch(/^2027-/);
    expect(res.body.record.userAnswers).toEqual({ "L1.know_how": true });
  });

  it("falls back to offline with a note when the per-IP limit is reached (no error)", async () => {
    const live = new FakeProvider("m", (i) => scriptedAssessment(i.check, "verified"));
    const { app } = await makeApp({ live, config: { ratePerIp10Min: 1 } });
    await request(app).post("/api/v1/check").send(checkBody()).expect(200);
    const second = await request(app).post("/api/v1/check").send(checkBody()).expect(200);
    expect(second.body.source).toBe("offline");
    expect(second.body.sourceNote).toBe("Live check limit reached; try a sample photo.");
    expect(live.calls).toBe(1);
  });

  it("honours X-Forwarded-For only with TRUST_PROXY", async () => {
    const live = new FakeProvider("m", (i) => scriptedAssessment(i.check, "verified"));
    const trusted = await makeApp({ live, config: { ratePerIp10Min: 1, trustProxy: 1 } });
    await request(trusted.app)
      .post("/api/v1/check")
      .set("X-Forwarded-For", "198.51.100.1")
      .send(checkBody())
      .expect(200);
    const other = await request(trusted.app)
      .post("/api/v1/check")
      .set("X-Forwarded-For", "198.51.100.2")
      .send(checkBody())
      .expect(200);
    expect(other.body.source).toBe("live");

    const live2 = new FakeProvider("m", (i) => scriptedAssessment(i.check, "verified"));
    const untrusted = await makeApp({ live: live2, config: { ratePerIp10Min: 1 } });
    await request(untrusted.app)
      .post("/api/v1/check")
      .set("X-Forwarded-For", "198.51.100.1")
      .send(checkBody())
      .expect(200);
    const spoofed = await request(untrusted.app)
      .post("/api/v1/check")
      .set("X-Forwarded-For", "198.51.100.2")
      .send(checkBody())
      .expect(200);
    expect(spoofed.body.source).toBe("offline");
  });

  it("serves a recorded sample from the cache with its date", async () => {
    const cacheDir = tempDir();
    const { app, deps } = await makeApp({ config: { cacheDir } });
    const { CachedVisionProvider } = await import("../src/vision/cached");
    const writer = new CachedVisionProvider(cacheDir, true);
    const { getCheck } = await import("@prepared-home/engine");
    await writer.store(
      a07.sha256,
      "L1",
      scriptedAssessment(getCheck("L1", "flat"), "verified", "claude-sonnet-5-5"),
      new Date("2026-10-18T08:00:00Z"),
    );
    const res = await request(app).post("/api/v1/check").send(checkBody()).expect(200);
    expect(res.body).toMatchObject({
      source: "cached",
      model: "claude-sonnet-5-5",
      sourceNote: "Recorded live result (2026-10-18)",
    });
    expect(res.body.outcome.verdict).toBe("verified");
    const samples = await request(app).get("/api/v1/samples").expect(200);
    expect(samples.body[0]).toMatchObject({
      id: "A07",
      recorded: true,
      recordedAt: "2026-10-18T08:00:00.000Z",
    });
    expect((await request(app).get("/api/v1/health")).body.provider).toBe("cached");
    expect(deps.config.storeMode).toBe("stateless");
  });

  it("rejects a hash mismatch (409), non-JPEG (415), oversize images (413), unknown checks (404) and bad bodies (400)", async () => {
    const { app } = await makeApp();
    await request(app)
      .post("/api/v1/check")
      .send(checkBody({ photoSha256: "0".repeat(64) }))
      .expect(409);
    const gif = Buffer.from("GIF89a-not-a-jpeg").toString("base64");
    await request(app)
      .post("/api/v1/check")
      .send(checkBody({ imageBase64: gif, photoSha256: undefined }))
      .expect(400); // sha required
    const { sha256Hex } = await import("../src/hash");
    await request(app)
      .post("/api/v1/check")
      .send(
        checkBody({ imageBase64: gif, photoSha256: sha256Hex(Buffer.from("GIF89a-not-a-jpeg")) }),
      )
      .expect(415);
    const big = fakeJpeg(3000, 2000);
    const r413 = await request(app)
      .post("/api/v1/check")
      .send(checkBody({ imageBase64: big.toString("base64"), photoSha256: sha256Hex(big) }))
      .expect(413);
    expect(r413.body.error).toBe("image_too_large");
    await request(app)
      .post("/api/v1/check")
      .send(checkBody({ checkId: "Q9" }))
      .expect(404);
    await request(app)
      .post("/api/v1/check")
      .send(checkBody({ checkId: "S1" }))
      .expect(400); // gutters: houses only
    await request(app)
      .post("/api/v1/check")
      .send(checkBody({ homeType: "boat" }))
      .expect(400);
    await request(app)
      .post("/api/v1/check")
      .set("Content-Type", "application/json")
      .send("{oops")
      .expect(400);
  });

  it("limits the body to 12 MB", async () => {
    const { app } = await makeApp();
    const res = await request(app)
      .post("/api/v1/check")
      .send(checkBody({ imageBase64: "A".repeat(12.5 * 1024 * 1024) }))
      .expect(413);
    expect(res.body.error).toBe("payload_too_large");
  });

  it("builds an adjuster view from the body: bonus not applied before L4 is fixed, relief after", async () => {
    const { app } = await makeApp();
    const home = DEMO.homes.find((h) => h.homeId === DEMO_CLAIM.homeId)!;
    const records: CheckRecord[] = DEMO.records.filter((r) => r.homeId === home.homeId);
    const before = await request(app)
      .post("/api/v1/claims")
      .send({ home, records, peril: DEMO_CLAIM.peril, lossDate: DEMO_CLAIM.lossDate, shared: [] })
      .expect(200);
    expect(before.body.decision).toBe("bonus_not_applied");
    expect(before.body.claimId).toMatch(/^claim-/);

    const fixed: CheckRecord = {
      homeId: home.homeId,
      checkId: "L4",
      verdict: "verified",
      checkedAt: "2026-10-20T10:00:00.000Z",
      dueAt: "2027-10-20",
      photoSha256: a07.sha256,
    };
    const shared = [{ checkId: "L4", imageBase64: a07.base64 }];
    const after = await request(app)
      .post("/api/v1/claims")
      .send({
        home,
        records: [...records, fixed],
        peril: "leak",
        lossDate: DEMO_CLAIM.lossDate,
        shared,
      })
      .expect(200);
    expect(after.body.decision).toBe("relief_applies");
    expect(after.body.records.find((r: { checkId: string }) => r.checkId === "L4")).toMatchObject({
      photoShared: true,
      hashMatches: true,
    });

    const wrongPhoto = [{ checkId: "L4", imageBase64: photo("A05.jpg").base64 }];
    const mismatch = await request(app)
      .post("/api/v1/claims")
      .send({
        home,
        records: [...records, fixed],
        peril: "leak",
        lossDate: DEMO_CLAIM.lossDate,
        shared: wrongPhoto,
      })
      .expect(200);
    expect(mismatch.body.decision).toBe("bonus_not_applied");
    await request(app)
      .post("/api/v1/claims")
      .send({ home, records: "nope", peril: "leak", lossDate: "2027-02-03" })
      .expect(400);
  });

  it("keeps the §5 routes off in stateless mode", async () => {
    const { app } = await makeApp();
    await request(app).get("/api/demo/homes").expect(404);
    await request(app).post("/api/homes").send({}).expect(404);
  });

  it("logs method, path, status, duration and a hashed IP only", async () => {
    const lines: unknown[] = [];
    const logger: Logger = {
      request: (e) => lines.push(e),
      check: (e) => lines.push(e),
      info: () => {},
      warn: (m) => lines.push(m),
    };
    const { app } = await makeApp({ logger });
    await request(app).post("/api/v1/check?secret=1").send(checkBody()).expect(200);
    const text = JSON.stringify(lines);
    expect(text).not.toContain(a07.base64.slice(0, 40));
    expect(text).not.toContain("secret");
    expect(text).not.toContain("127.0.0.1");
    expect(text).not.toContain("local-123");
    expect(lines).toContainEqual(
      expect.objectContaining({ checkId: "L1", verdict: "retake", source: "offline" }),
    );
    expect(lines).toContainEqual(
      expect.objectContaining({ method: "POST", path: "/api/v1/check", status: 200 }),
    );
  });
});

describe("web hosting", () => {
  it("serves the landing page at / and the app SPA under /app/, with noindex everywhere", async () => {
    const webDist = tempDir("ph-web-");
    writeFileSync(path.join(webDist, "index.html"), "<!doctype html><title>Landing</title>");
    writeFileSync(path.join(webDist, "qr.png"), "png");
    mkdirSync(path.join(webDist, "app", "_expo"), { recursive: true });
    writeFileSync(path.join(webDist, "app", "index.html"), "<!doctype html><title>App</title>");
    writeFileSync(path.join(webDist, "app", "_expo", "bundle.js"), "console.log(1)");
    const { app } = await makeApp({ config: { webDist } });

    const root = await request(app).get("/").expect(200);
    expect(root.text).toContain("<title>Landing</title>");
    expect(root.headers["x-robots-tag"]).toBe("noindex, nofollow");
    await request(app).get("/qr.png").expect(200);

    expect((await request(app).get("/app/").expect(200)).text).toContain("<title>App</title>");
    const deep = await request(app).get("/app/adjuster/claim-1").expect(200);
    expect(deep.text).toContain("<title>App</title>");
    expect(deep.headers["x-robots-tag"]).toBe("noindex, nofollow");
    await request(app).get("/app/_expo/bundle.js").expect(200);
    const missing = await request(app).get("/app/_expo/missing.js").expect(404);
    expect(missing.text).toBe("Not found\n");

    expect((await request(app).get("/some/old/link").expect(200)).text).toContain("Landing");
    await request(app).get("/missing.css").expect(404);
    await request(app).get("/api/v1/nope").expect(404);
    await request(app).get("/samples/nope.jpg").expect(404);
    expect((await request(app).get("/robots.txt").expect(200)).text).toContain("Disallow: /");
  });

  it("says what it is at / when no web export is present", async () => {
    const { app } = await makeApp();
    expect((await request(app).get("/").expect(200)).text).toContain("not an If service");
  });
});

describe("file mode (§5 routes)", () => {
  it("creates homes, stores records (never images), reports status, resets demo homes and keeps claims in memory", async () => {
    const dir = tempDir();
    const storePath = path.join(dir, "data", "store.json");
    const live = new FakeProvider("m", (i) => scriptedAssessment(i.check, "fix_first"));
    const { app } = await makeApp({ config: { storeMode: "file", storePath }, live });

    expect((await request(app).get("/api/health").expect(200)).body).toEqual({
      ok: true,
      provider: "anthropic",
      model: "m",
      keySet: true,
    });
    const demo = await request(app).get("/api/demo/homes").expect(200);
    expect(demo.body.map((h: { homeId: string }) => h.homeId)).toContain("demo-turku-flat");

    const created = await request(app)
      .post("/api/homes")
      .send({ homeType: "flat", moveInDate: "2026-10-15", hasLeakAlarm: true })
      .expect(201);
    const homeId = created.body.homeId as string;
    expect(created.body).toMatchObject({ homeType: "flat", label: "My home", hasLeakAlarm: true });

    const checked = await request(app)
      .post(`/api/homes/${homeId}/checks/L5`)
      .send({
        lang: "en",
        imageBase64: a07.base64,
        width: 1280,
        height: 1707,
        photoSha256: a07.sha256,
        userAnswers: {},
      })
      .expect(200);
    expect(checked.body.outcome.verdict).toBe("fix_first");
    await request(app)
      .post(`/api/homes/${homeId}/checks/L5`)
      .send({ imageBase64: a07.base64, photoSha256: "f".repeat(64) })
      .expect(409);

    await request(app).post(`/api/homes/${homeId}/checks/L1/not-applicable`).send({}).expect(400);
    const na = await request(app)
      .post(`/api/homes/${homeId}/checks/L2/not-applicable`)
      .send({})
      .expect(200);
    expect(na.body.record).toMatchObject({ verdict: "not_applicable", photoSha256: null });

    const status = await request(app).get(`/api/homes/${homeId}/status?lang=en`).expect(200);
    expect(status.body.home.homeId).toBe(homeId);
    expect(status.body.perils.find((p: { peril: string }) => p.peril === "leak").state).toBe(
      "in_progress",
    );
    expect(status.body.homeCard.homeId).toBe(homeId);

    const { readFileSync } = await import("node:fs");
    const stored = readFileSync(storePath, "utf8");
    expect(stored).not.toContain(a07.base64.slice(0, 40));
    expect(stored).toContain(a07.sha256);

    await request(app).post(`/api/homes/${homeId}/reset`).expect(400);
    await request(app)
      .post(`/api/homes/demo-turku-flat/checks/L4`)
      .send({ imageBase64: a07.base64, photoSha256: a07.sha256 })
      .expect(200);
    await request(app).post(`/api/homes/demo-turku-flat/reset`).expect(200);

    const claim = await request(app)
      .post("/api/claims")
      .send({ homeId: "demo-turku-flat", peril: "leak", lossDate: "2027-02-03", shared: [] })
      .expect(200);
    expect(claim.body.decision).toBe("bonus_not_applied");
    const again = await request(app).get(`/api/claims/${claim.body.claimId}`).expect(200);
    expect(again.body).toEqual(claim.body);
    await request(app).get("/api/claims/claim-unknown").expect(404);
    await request(app).get("/api/homes/nope/status").expect(404);
  });
});
