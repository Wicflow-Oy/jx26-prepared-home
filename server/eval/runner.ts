// Eval runner core (CONTRACTS §7): photos → vision provider → engine verdict → report. CLI in run.ts.

import { promises as fs } from "node:fs";
import path from "node:path";
import {
  decideVerdict,
  getCheck,
  type HomeType,
  type Verdict,
  type VisionAssessment,
} from "@prepared-home/engine";
import { sha256Hex } from "../src/hash";
import { isJpeg, jpegSize, MAX_LONG_EDGE } from "../src/jpeg";
import type { VisionProvider } from "../src/vision/types";

export interface ManifestRow {
  file: string;
  checkId: string;
  expectedVerdict: Verdict;
  note: string;
  alsoAcceptable?: Verdict[];
  expectedUrgent?: boolean;
  homeType?: HomeType;
}

export interface EvalImage {
  base64: string;
  width: number;
  height: number;
  sha256: string;
  resized: boolean;
}

export interface EvalRow {
  file: string;
  checkId: string;
  expected: Verdict;
  actual: Verdict;
  correct: boolean;
  lenientCorrect: boolean;
  urgent: boolean;
  expectedUrgent: boolean;
  criteria: { id: string; kind: string; met: boolean | null; note?: string }[];
  retakeHint: string | null;
  fix: string | null;
  sha256: string;
  resized: boolean;
  ms: number;
  error?: string;
  note: string;
}

export const VERDICTS: Verdict[] = ["verified", "retake", "fix_first", "not_applicable"];

export interface EvalReport {
  kind: "prepared-home-eval";
  version: 1;
  model: string;
  provider: string;
  startedAt: string;
  finishedAt: string;
  total: number;
  correct: number;
  accuracy: number; // strict: actual === expected
  lenientAccuracy: number; // also counts the manifest's alsoAcceptable verdicts
  falseVerified: number; // "verified" where the manifest doesn't accept it: the safety-critical error
  falseVerifiedFiles: string[];
  errors: number;
  urgent: { expected: number; flaggedOnExpected: number; flaggedElsewhere: number };
  confusion: Record<Verdict, Record<Verdict, number>>; // confusion[expected][actual]
  rows: EvalRow[];
}

export async function loadManifest(file: string): Promise<ManifestRow[]> {
  const raw = JSON.parse(await fs.readFile(file, "utf8")) as unknown;
  if (!Array.isArray(raw)) throw new Error("manifest must be an array");
  return raw.map((r, i) => {
    const row = r as ManifestRow;
    if (
      typeof row.file !== "string" ||
      typeof row.checkId !== "string" ||
      !VERDICTS.includes(row.expectedVerdict)
    ) {
      throw new Error(`manifest row ${i} is invalid`);
    }
    getCheck(row.checkId); // throws on an unknown check id
    return row;
  });
}

/** Prepares a photo as the app would: JPEG, at most 2576 px on the long edge, EXIF dropped when re-encoded. */
export async function loadEvalImage(file: string): Promise<EvalImage> {
  const bytes = await fs.readFile(file);
  const size = jpegSize(bytes);
  if (isJpeg(bytes) && size && Math.max(size.width, size.height) <= MAX_LONG_EDGE) {
    return {
      base64: bytes.toString("base64"),
      width: size.width,
      height: size.height,
      sha256: sha256Hex(bytes),
      resized: false,
    };
  }
  // Larger or non-JPEG photos (the team's own phone shots): resize and re-encode with sharp, like the app does.
  const sharp = (await import("sharp")).default;
  const out = await sharp(bytes)
    .rotate()
    .resize({
      width: MAX_LONG_EDGE,
      height: MAX_LONG_EDGE,
      fit: "inside",
      withoutEnlargement: true,
    })
    .jpeg({ quality: 85 })
    .toBuffer({ resolveWithObject: true });
  return {
    base64: out.data.toString("base64"),
    width: out.info.width,
    height: out.info.height,
    sha256: sha256Hex(out.data),
    resized: true,
  };
}

function errorTag(err: unknown): string {
  const e = err as { name?: unknown; status?: unknown; message?: unknown };
  const name = typeof e?.name === "string" ? e.name : "Error";
  return typeof e?.status === "number" ? `${name} ${e.status}` : name;
}

function defaultHomeType(checkId: string): HomeType {
  const types = getCheck(checkId).homeTypes;
  return types.includes("flat") ? "flat" : types[0];
}

async function mapLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i]);
    }
  });
  await Promise.all(workers);
  return out;
}

export interface RunOptions {
  rows: ManifestRow[];
  photosDir: string;
  provider: VisionProvider;
  concurrency?: number;
  loadImage?: (file: string) => Promise<EvalImage>;
  clock?: () => Date;
  onRow?: (row: EvalRow) => void;
}

export async function runEval(opts: RunOptions): Promise<EvalReport> {
  const clock = opts.clock ?? (() => new Date());
  const load = opts.loadImage ?? loadEvalImage;
  const startedAt = clock().toISOString();

  const rows = await mapLimit(opts.rows, opts.concurrency ?? 3, async (m): Promise<EvalRow> => {
    const homeType = m.homeType ?? defaultHomeType(m.checkId);
    const check = getCheck(m.checkId, homeType); // the home type's wording, as the app sends it
    // User criteria are the customer's answers; for the eval they are all "yes".
    const userAnswers = Object.fromEntries(
      check.criteria.filter((c) => c.kind === "user").map((c) => [c.id, true]),
    );
    const image = await load(path.join(opts.photosDir, m.file));
    const t0 = Date.now();
    let assessment: VisionAssessment | null = null;
    let error: string | undefined;
    try {
      assessment = await opts.provider.assess({
        check,
        lang: "en",
        image: {
          base64: image.base64,
          mediaType: "image/jpeg",
          width: image.width,
          height: image.height,
        },
      });
    } catch (err) {
      error = errorTag(err);
    }
    const ms = Date.now() - t0;
    const outcome = decideVerdict(check, assessment, userAnswers, "en", homeType);
    const accepted = [m.expectedVerdict, ...(m.alsoAcceptable ?? [])];
    const row: EvalRow = {
      file: m.file,
      checkId: m.checkId,
      expected: m.expectedVerdict,
      actual: outcome.verdict,
      correct: outcome.verdict === m.expectedVerdict,
      lenientCorrect: accepted.includes(outcome.verdict),
      urgent: outcome.urgent,
      expectedUrgent: m.expectedUrgent === true,
      criteria: outcome.criteria.map((c) => ({
        id: c.id,
        kind: c.kind,
        met: c.met,
        ...(c.note ? { note: c.note } : {}),
      })),
      retakeHint: outcome.retakeHint,
      fix: outcome.fix ? outcome.fix.text : null,
      sha256: image.sha256,
      resized: image.resized,
      ms,
      note: m.note,
    };
    if (error) row.error = error;
    opts.onRow?.(row);
    return row;
  });

  return summarize(rows, {
    model: opts.provider.model,
    provider: opts.provider.name,
    startedAt,
    finishedAt: clock().toISOString(),
    accepted: new Map(
      opts.rows.map((m) => [m.file, [m.expectedVerdict, ...(m.alsoAcceptable ?? [])]]),
    ),
  });
}

export function emptyConfusion(): Record<Verdict, Record<Verdict, number>> {
  const out = {} as Record<Verdict, Record<Verdict, number>>;
  for (const e of VERDICTS) {
    out[e] = {} as Record<Verdict, number>;
    for (const a of VERDICTS) out[e][a] = 0;
  }
  return out;
}

export function summarize(
  rows: EvalRow[],
  meta: {
    model: string;
    provider: string;
    startedAt: string;
    finishedAt: string;
    accepted: Map<string, Verdict[]>;
  },
): EvalReport {
  const confusion = emptyConfusion();
  for (const r of rows) confusion[r.expected][r.actual] += 1;
  const total = rows.length;
  const correct = rows.filter((r) => r.correct).length;
  const lenient = rows.filter((r) => r.lenientCorrect).length;
  const falseVerifiedRows = rows.filter(
    (r) =>
      r.actual === "verified" && !(meta.accepted.get(r.file) ?? [r.expected]).includes("verified"),
  );
  const round = (n: number) => Math.round(n * 10000) / 10000;
  return {
    kind: "prepared-home-eval",
    version: 1,
    model: meta.model,
    provider: meta.provider,
    startedAt: meta.startedAt,
    finishedAt: meta.finishedAt,
    total,
    correct,
    accuracy: total ? round(correct / total) : 0,
    lenientAccuracy: total ? round(lenient / total) : 0,
    falseVerified: falseVerifiedRows.length,
    falseVerifiedFiles: falseVerifiedRows.map((r) => r.file),
    errors: rows.filter((r) => r.error).length,
    urgent: {
      expected: rows.filter((r) => r.expectedUrgent).length,
      flaggedOnExpected: rows.filter((r) => r.expectedUrgent && r.urgent).length,
      flaggedElsewhere: rows.filter((r) => !r.expectedUrgent && r.urgent).length,
    },
    confusion,
    rows,
  };
}

const pct = (n: number) => `${(n * 100).toFixed(1)}%`;
const cell = (s: string) => s.replace(/\|/g, "\\|").replace(/\s+/g, " ");

export function toMarkdown(report: EvalReport): string {
  const shown: Verdict[] = ["verified", "retake", "fix_first"];
  const lines: string[] = [
    `# Vision eval: ${report.model}`,
    "",
    `Provider ${report.provider}, ${report.startedAt} to ${report.finishedAt}. Photos: ${report.total}.`,
    "",
    "| Metric | Value |",
    "|---|---|",
    `| Accuracy (strict) | ${pct(report.accuracy)} (${report.correct}/${report.total}) |`,
    `| Accuracy (lenient, alsoAcceptable counts) | ${pct(report.lenientAccuracy)} |`,
    `| False "verified" | ${report.falseVerified}${report.falseVerifiedFiles.length ? ` (${report.falseVerifiedFiles.join(", ")})` : ""} |`,
    `| Errors (no assessment) | ${report.errors} |`,
    `| Urgent flagged on expected-urgent photos | ${report.urgent.flaggedOnExpected}/${report.urgent.expected} (elsewhere: ${report.urgent.flaggedElsewhere}) |`,
    "",
    "## Confusion matrix (rows: expected, columns: actual)",
    "",
    `| expected \\ actual | ${shown.join(" | ")} |`,
    `|---|${shown.map(() => "---").join("|")}|`,
    ...shown.map(
      (e) => `| ${e} | ${shown.map((a) => String(report.confusion[e][a])).join(" | ")} |`,
    ),
    "",
    "## Per photo",
    "",
    "| Photo | Check | Expected | Actual | OK | Urgent | Criteria (met) | ms |",
    "|---|---|---|---|---|---|---|---|",
    ...report.rows.map((r) => {
      const crit = r.criteria
        .filter((c) => c.kind !== "user")
        .map((c) => `${c.id.split(".").pop()}=${c.met === null ? "?" : c.met ? "y" : "n"}`)
        .join(" ");
      const ok = r.correct ? "yes" : r.lenientCorrect ? "ok*" : "NO";
      return `| ${r.file} | ${r.checkId} | ${r.expected} | ${r.actual}${r.error ? ` (${cell(r.error)})` : ""} | ${ok} | ${r.urgent ? "yes" : ""} | ${cell(crit)} | ${r.ms} |`;
    }),
    "",
    "ok* = matches an alsoAcceptable verdict in the manifest.",
    "",
  ];
  return lines.join("\n");
}

export function reportBaseName(model: string, at: Date): string {
  const stamp = at
    .toISOString()
    .replace(/\.\d{3}Z$/, "Z")
    .replace(/:/g, "-");
  return `${stamp}-${model.replace(/[^A-Za-z0-9._-]/g, "_")}`;
}

export async function writeReport(
  report: EvalReport,
  dir: string,
  at: Date,
): Promise<{ json: string; md: string }> {
  await fs.mkdir(dir, { recursive: true });
  const base = path.join(dir, reportBaseName(report.model, at));
  await fs.writeFile(`${base}.json`, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  await fs.writeFile(`${base}.md`, toMarkdown(report), "utf8");
  return { json: `${base}.json`, md: `${base}.md` };
}

export interface GateResult {
  pass: boolean;
  reasons: string[];
}

/** CONTRACTS §7: a model may replace the default only if accuracy >= baseline and false-verified is not higher. */
export function gate(candidate: EvalReport, baseline: EvalReport): GateResult {
  const reasons: string[] = [];
  const files = (r: EvalReport) =>
    r.rows
      .map((x) => `${x.file}:${x.checkId}:${x.expected}`)
      .sort()
      .join("|");
  if (files(candidate) !== files(baseline))
    reasons.push("the two reports were run on different photo sets or manifests");
  if (candidate.accuracy < baseline.accuracy) {
    reasons.push(
      `accuracy ${pct(candidate.accuracy)} is below the baseline's ${pct(baseline.accuracy)}`,
    );
  }
  if (candidate.falseVerified > baseline.falseVerified) {
    reasons.push(
      `false "verified" ${candidate.falseVerified} is higher than the baseline's ${baseline.falseVerified}`,
    );
  }
  return { pass: reasons.length === 0, reasons };
}

export function isReport(v: unknown): v is EvalReport {
  const r = v as EvalReport;
  return (
    !!r &&
    r.kind === "prepared-home-eval" &&
    typeof r.accuracy === "number" &&
    typeof r.falseVerified === "number" &&
    Array.isArray(r.rows)
  );
}
