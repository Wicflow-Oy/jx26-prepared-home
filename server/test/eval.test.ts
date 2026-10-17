import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { gate, isReport, toMarkdown, writeReport, type EvalReport } from "../eval/report";
import { loadEvalImage, loadManifest, runEval } from "../eval/runner";
import { FakeProvider, photosDir, scriptedAssessment, serverDir, tempDir } from "./helpers";

const manifestPath = path.join(serverDir, "eval", "manifest.json");

async function run(
  answer: (file: string) => "verified" | "retake" | "fix_first",
  model = "fake-model",
): Promise<EvalReport> {
  const rows = await loadManifest(manifestPath);
  const byCheckAndSize = new Map<string, string>(); // image sha -> file, to know which photo the provider sees
  for (const r of rows) {
    const img = await loadEvalImage(path.join(photosDir, r.file));
    byCheckAndSize.set(img.sha256, r.file);
  }
  const { sha256Hex } = await import("../src/hash");
  const provider = new FakeProvider(model, (input) => {
    const file = byCheckAndSize.get(sha256Hex(Buffer.from(input.image.base64, "base64")))!;
    return scriptedAssessment(input.check, answer(file), model);
  });
  return runEval({
    rows,
    photosDir,
    provider,
    concurrency: 4,
    clock: () => new Date("2026-10-18T12:00:00Z"),
  });
}

describe("eval manifest", () => {
  it("maps all 24 photos to checks with expected verdicts and notes", async () => {
    const rows = await loadManifest(manifestPath);
    expect(rows).toHaveLength(24);
    const count = (v: string) => rows.filter((r) => r.expectedVerdict === v).length;
    expect({
      verified: count("verified"),
      retake: count("retake"),
      fix_first: count("fix_first"),
    }).toEqual({ verified: 7, retake: 12, fix_first: 5 });
    expect(rows.every((r) => r.note.length > 10)).toBe(true);
    expect(new Set(rows.filter((r) => r.file.startsWith("A")).map((r) => r.checkId))).toEqual(
      new Set(["L1"]),
    );
    expect(new Set(rows.filter((r) => r.file.startsWith("C")).map((r) => r.checkId))).toEqual(
      new Set(["F2"]),
    );
    // The samples served to judges agree with the manifest.
    const { SAMPLE_DEFS } = await import("../src/samples");
    for (const s of SAMPLE_DEFS) {
      const row = rows.find((r) => r.file === s.file)!;
      expect([row.checkId, row.expectedVerdict]).toEqual([s.checkId, s.expectedVerdict]);
    }
    expect(readFileSync(path.join(photosDir, "README.md"), "utf8")).toContain("Wikimedia Commons");
  });

  it("sends the photos as they are (all at most 2576 px)", async () => {
    const img = await loadEvalImage(path.join(photosDir, "A07.jpg"));
    expect(img).toMatchObject({ width: 1280, height: 1707, resized: false });
  });
});

describe("eval runner with a mock provider", () => {
  it("scores a perfect provider at 100% with no false verified", async () => {
    const rows = await loadManifest(manifestPath);
    const expected = new Map(
      rows.map((r) => [r.file, r.expectedVerdict as "verified" | "retake" | "fix_first"]),
    );
    const report = await run((file) => expected.get(file)!);
    expect(report.accuracy).toBe(1);
    expect(report.falseVerified).toBe(0);
    expect(report.confusion.verified.verified).toBe(7);
    expect(report.confusion.fix_first.fix_first).toBe(5);
    expect(
      report.rows.every(
        (r) =>
          r.criteria.some((c) => c.kind === "user" && c.met === true) ||
          r.criteria.every((c) => c.kind !== "user"),
      ),
    ).toBe(true);
  });

  it("counts an always-verified provider's false verifieds, and the all-null mock as all retake", async () => {
    const always = await run(() => "verified", "always-verified");
    expect(always.falseVerified).toBe(17);
    expect(always.accuracy).toBeCloseTo(7 / 24, 4);

    const allNull = await run(() => "retake", "mock");
    expect(allNull.rows.every((r) => r.actual === "retake")).toBe(true);
    expect(allNull.accuracy).toBe(0.5);
    expect(allNull.falseVerified).toBe(0);
    expect(allNull.lenientAccuracy).toBeGreaterThan(allNull.accuracy); // A02 and C07 accept retake too
  });

  it("records provider errors as retake with the error tag, without failing the run", async () => {
    const rows = (await loadManifest(manifestPath)).slice(0, 2);
    const provider = new FakeProvider("flaky", () => {
      throw Object.assign(new Error("secret body"), { status: 529, name: "APIError" });
    });
    const report = await runEval({ rows, photosDir, provider });
    expect(report.errors).toBe(2);
    expect(report.rows[0]).toMatchObject({ actual: "retake", error: "APIError 529" });
    expect(JSON.stringify(report)).not.toContain("secret body");
  });

  it("writes JSON and markdown reports with the confusion matrix", async () => {
    const report = await run(() => "retake", "claude-test");
    const dir = tempDir();
    const files = await writeReport(report, dir, new Date("2026-10-18T12:00:00Z"));
    expect(path.basename(files.json)).toBe("2026-10-18T12-00-00Z-claude-test.json");
    expect(isReport(JSON.parse(readFileSync(files.json, "utf8")))).toBe(true);
    const md = readFileSync(files.md, "utf8");
    expect(md).toContain("Confusion matrix");
    expect(md).toContain("| verified | 0 | 7 | 0 |");
    expect(toMarkdown(report)).toContain('False "verified"');
  });
});

describe("eval gate", () => {
  it("passes only when accuracy is not lower and false verified is not higher", async () => {
    const rows = await loadManifest(manifestPath);
    const expected = new Map(
      rows.map((r) => [r.file, r.expectedVerdict as "verified" | "retake" | "fix_first"]),
    );
    const perfect = await run((f) => expected.get(f)!, "a");
    const cautious = await run(() => "retake", "b");
    const reckless = await run(() => "verified", "c");
    expect(gate(perfect, cautious).pass).toBe(true);
    expect(gate(cautious, perfect)).toMatchObject({ pass: false });
    const r = gate(reckless, cautious);
    expect(r.pass).toBe(false);
    expect(r.reasons.join(" ")).toMatch(/false "verified" 17/);
    const fewer = { ...perfect, rows: perfect.rows.slice(1) };
    expect(gate(fewer, perfect).reasons.join(" ")).toMatch(/different photo sets/);
  });

  it("the CLIs exit 2 without a key or without arguments", () => {
    const env = { ...process.env };
    delete env.ANTHROPIC_API_KEY;
    const tsx = path.join(serverDir, "node_modules", "tsx", "dist", "cli.mjs");
    const evalRun = spawnSync(process.execPath, [tsx, "eval/run.ts", "--model", "x"], {
      cwd: serverDir,
      env,
      encoding: "utf8",
    });
    expect(evalRun.status).toBe(2);
    expect(evalRun.stderr).toContain("ANTHROPIC_API_KEY not set");
    const gateRun = spawnSync(process.execPath, [tsx, "eval/gate.ts"], {
      cwd: serverDir,
      env,
      encoding: "utf8",
    });
    expect(gateRun.status).toBe(2);
  });
});
