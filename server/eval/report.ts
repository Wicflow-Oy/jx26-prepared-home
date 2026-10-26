// Eval report: scoring, the markdown summary, report files and the model gate (CONTRACTS §7).

import { promises as fs } from "node:fs";
import path from "node:path";
import type { Verdict } from "@prepared-home/engine";
import { VERDICTS } from "../src/validate";

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
const cell = (s: string) => s.replace(/\\/g, "\\\\").replace(/\|/g, "\\|").replace(/\s+/g, " ");

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
