// Runs product vision models on the large set and compares them with the draft labels.
//
// Each run goes through the eval runner (runEval: the same provider, image handling, prompt and engine verdict as
// `npm run eval`); this script only adds token usage for a spend estimate, a budget stop, a per-check breakdown and
// honest wording. Until the team has reviewed the labels, every number here is agreement with draft labels made by
// claude-opus-5-5, not accuracy against ground truth.
//
// From server/:
//   npx tsx --env-file-if-exists=../.env.local eval/large/compare.ts run --model claude-sonnet-5-5 [--budget-usd 15]
//   npx tsx eval/large/compare.ts summary          # comparison table and run-to-run consistency from results.json

import { existsSync, promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import type { Verdict } from "@prepared-home/engine";
import { AnthropicVisionProvider } from "../../src/vision/anthropic";
import type { LiveAssessment, VisionProvider } from "../../src/vision/types";
import { reportBaseName, type EvalReport, type EvalRow } from "../report";
import { loadManifest, runEval, type ManifestRow } from "../runner";
import { writeFormatted } from "./format";

const here = path.dirname(fileURLToPath(import.meta.url));
const RESULTS = path.join(here, "results.json");

// USD per million input / output tokens (Anthropic list prices, October 2026).
const PRICES: Record<string, { input: number; output: number }> = {
  "claude-sonnet-5-5": { input: 2, output: 10 },
  "claude-opus-5-5": { input: 4, output: 20 },
  "claude-haiku-5-5": { input: 0.1, output: 0.5 },
};

type Row = ManifestRow & {
  hardCase?: string;
  synthetic?: string;
  labelSource?: string;
  confidence?: string;
  passesAgree?: boolean;
  excluded?: boolean;
  rationale?: string;
};

interface Tally {
  n: number;
  agree: number;
  falseVerified: number;
}

export interface RunSummary {
  model: string;
  effort: string | null;
  report: string;
  startedAt: string;
  finishedAt: string;
  labels: string;
  total: number;
  agree: number;
  agreement: number;
  falseVerified: number;
  falseVerifiedFiles: string[];
  errors: number;
  medianMs: number;
  p90Ms: number;
  inputTokens: number;
  outputTokens: number;
  estUsd: number;
  budgetStopped: number;
  perCheck: Record<string, Tally>;
  hardCases: Tally;
  regular: Tally;
  bothPassesAgree: Tally;
  byConfidence: Record<string, Tally>;
  confusion: Record<string, Record<string, number>>;
  verdicts: Record<string, Verdict>;
}

const empty = (): Tally => ({ n: 0, agree: 0, falseVerified: 0 });

function add(t: Tally, r: EvalRow) {
  t.n++;
  if (r.actual === r.expected) t.agree++;
  if (r.actual === "verified" && r.expected !== "verified") t.falseVerified++;
}

function quantile(values: number[], q: number): number {
  if (!values.length) return 0;
  const s = [...values].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(q * (s.length - 1) + 0.5))];
}

function labelsDescription(rows: Row[]): string {
  const reviewed = rows.filter((r) => r.labelSource === "reviewed").length;
  if (reviewed === rows.length) return "team-reviewed labels";
  if (reviewed === 0) return "draft labels (claude-opus-5-5, not yet reviewed)";
  return `labels: ${reviewed} team-reviewed, ${rows.length - reviewed} draft`;
}

export function summarizeRun(
  report: EvalReport,
  rows: Row[],
  extra: {
    effort: string | null;
    reportFile: string;
    usage: { input: number; output: number };
    budgetStopped: number;
  },
): RunSummary {
  const byFile = new Map(rows.map((r) => [r.file, r]));
  const perCheck: Record<string, Tally> = {};
  const hardCases = empty();
  const regular = empty();
  const bothPassesAgree = empty();
  const byConfidence: Record<string, Tally> = {};
  const confusion: Record<string, Record<string, number>> = {};
  for (const r of report.rows) {
    const m = byFile.get(r.file);
    add((perCheck[r.checkId] ??= empty()), r);
    add(m?.hardCase ? hardCases : regular, r);
    if (m?.passesAgree) add(bothPassesAgree, r);
    add((byConfidence[m?.confidence ?? "unknown"] ??= empty()), r);
    confusion[r.expected] ??= {};
    confusion[r.expected][r.actual] = (confusion[r.expected][r.actual] ?? 0) + 1;
  }
  const price = PRICES[report.model] ?? { input: 0, output: 0 };
  const estUsd = (extra.usage.input * price.input + extra.usage.output * price.output) / 1e6;
  const timed = report.rows.filter((r) => !r.error).map((r) => r.ms);
  const agree = report.rows.filter((r) => r.actual === r.expected).length;
  const falseVerifiedRows = report.rows.filter(
    (r) => r.actual === "verified" && r.expected !== "verified",
  );
  return {
    model: report.model,
    effort: extra.effort,
    report: path.relative(here, extra.reportFile).replace(/\\/g, "/"),
    startedAt: report.startedAt,
    finishedAt: report.finishedAt,
    labels: labelsDescription(rows),
    total: report.total,
    agree,
    agreement: report.total ? Math.round((agree / report.total) * 10000) / 10000 : 0,
    falseVerified: falseVerifiedRows.length,
    falseVerifiedFiles: falseVerifiedRows.map((r) => r.file),
    errors: report.errors,
    medianMs: quantile(timed, 0.5),
    p90Ms: quantile(timed, 0.9),
    inputTokens: extra.usage.input,
    outputTokens: extra.usage.output,
    estUsd: Math.round(estUsd * 100) / 100,
    budgetStopped: extra.budgetStopped,
    perCheck: Object.fromEntries(Object.entries(perCheck).sort(([a], [b]) => a.localeCompare(b))),
    hardCases,
    regular,
    bothPassesAgree,
    byConfidence,
    confusion,
    verdicts: Object.fromEntries(report.rows.map((r) => [r.file, r.actual])),
  };
}

const pct = (a: number, n: number) => (n ? `${((100 * a) / n).toFixed(1)}%` : "n/a");
const cell = (s: string) => s.replace(/\|/g, "\\|").replace(/\s+/g, " ");

function runMarkdown(s: RunSummary, report: EvalReport, rows: Row[]): string {
  const byFile = new Map(rows.map((r) => [r.file, r]));
  const lines = [
    `# Large set: ${s.model}`,
    "",
    `Compared with ${s.labels}. These numbers are agreement with those labels, not accuracy against ground truth.`,
    "",
    "| Metric | Value |",
    "|---|---|",
    `| Agreement with labels | ${pct(s.agree, s.total)} (${s.agree}/${s.total}) |`,
    `| False "Verified" (labels say retake or fix first) | ${s.falseVerified} |`,
    `| Errors (no assessment, counted as retake) | ${s.errors} |`,
    `| Median / p90 time per photo | ${(s.medianMs / 1000).toFixed(1)} s / ${(s.p90Ms / 1000).toFixed(1)} s |`,
    `| Tokens in / out | ${s.inputTokens} / ${s.outputTokens} |`,
    `| Estimated cost | $${s.estUsd.toFixed(2)} |`,
    "",
    "## Per check",
    "",
    "| Check | Photos | Agreement | False Verified |",
    "|---|---|---|---|",
    ...Object.entries(s.perCheck).map(
      ([id, t]) => `| ${id} | ${t.n} | ${pct(t.agree, t.n)} | ${t.falseVerified} |`,
    ),
    `| Hard cases | ${s.hardCases.n} | ${pct(s.hardCases.agree, s.hardCases.n)} | ${s.hardCases.falseVerified} |`,
    `| Rows where both label passes agree | ${s.bothPassesAgree.n} | ${pct(s.bothPassesAgree.agree, s.bothPassesAgree.n)} | ${s.bothPassesAgree.falseVerified} |`,
    "",
    "## Confusion (rows: label, columns: model)",
    "",
    "| label \\ model | verified | retake | fix_first |",
    "|---|---|---|---|",
    ...["verified", "retake", "fix_first"].map(
      (e) =>
        `| ${e} | ${["verified", "retake", "fix_first"].map((a) => s.confusion[e]?.[a] ?? 0).join(" | ")} |`,
    ),
    "",
    "## Disagreements",
    "",
    "| Photo | Check | Label | Model | Label rationale |",
    "|---|---|---|---|---|",
    ...report.rows
      .filter((r) => r.actual !== r.expected)
      .map(
        (r) =>
          `| ${r.file} | ${r.checkId} | ${r.expected} | ${r.actual}${r.error ? ` (${cell(r.error)})` : ""} | ${cell(byFile.get(r.file)?.rationale ?? "")} |`,
      ),
    "",
  ];
  return lines.join("\n");
}

async function readResults(): Promise<{ runs: RunSummary[] }> {
  return existsSync(RESULTS) ? JSON.parse(await fs.readFile(RESULTS, "utf8")) : { runs: [] };
}

async function run(opts: {
  model: string;
  budgetUsd: number;
  concurrency: number;
  only: Set<string> | null;
}): Promise<number> {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) {
    console.error("ANTHROPIC_API_KEY not set (it is read from builds/prepared-home/.env.local).");
    return 2;
  }
  const effort = (process.env.VISION_EFFORT?.trim() || null) as
    "low" | "medium" | "high" | "xhigh" | "max" | null;
  const all = (await loadManifest(path.join(here, "manifest.json"))) as Row[];
  let rows = all.filter((r) => !r.excluded);
  if (opts.only) rows = rows.filter((r) => opts.only!.has(r.file.replace(/\.jpe?g$/i, "")));
  const price = PRICES[opts.model];
  if (!price) {
    console.error(`No price for ${opts.model}; add it to PRICES first.`);
    return 2;
  }
  const inner = new AnthropicVisionProvider({ apiKey, model: opts.model, effort });
  const usage = { input: 0, output: 0 };
  let budgetStopped = 0;
  const spent = () => (usage.input * price.input + usage.output * price.output) / 1e6;
  let perCall = 0.05;
  let calls = 0;
  const provider: VisionProvider = {
    name: inner.name,
    model: inner.model,
    async assess(input) {
      if (spent() + perCall * opts.concurrency > opts.budgetUsd) {
        budgetStopped++;
        throw Object.assign(new Error("budget stop"), { name: "BudgetStop" });
      }
      const a = (await inner.assess(input)) as LiveAssessment;
      if (a.usage) {
        usage.input += a.usage.inputTokens;
        usage.output += a.usage.outputTokens;
        calls++;
        perCall = Math.max(perCall * 0.8, (spent() / calls) * 2);
      }
      return a;
    },
  };
  console.log(
    `Large set: ${rows.length} photos, model ${opts.model}${effort ? `, effort ${effort}` : ""}, budget $${opts.budgetUsd.toFixed(2)}. Comparing with ${labelsDescription(rows)}.`,
  );
  const report = await runEval({
    rows,
    photosDir: path.join(here, "photos"),
    provider,
    concurrency: opts.concurrency,
    onRow: (r) =>
      console.log(
        `${r.actual === r.expected ? "== " : "!= "}${r.file} ${r.checkId} label=${r.expected} model=${r.actual}${r.error ? ` error=${r.error}` : ""} ${r.ms}ms`,
      ),
  });
  const at = new Date();
  const dir = path.join(here, "reports");
  await fs.mkdir(dir, { recursive: true });
  const base = path.join(dir, reportBaseName(report.model, at));
  const labelNote = `accuracy and lenientAccuracy here mean agreement with ${labelsDescription(rows)}`;
  await writeFormatted(`${base}.json`, JSON.stringify({ ...report, labelNote }), "json");
  const summary = summarizeRun(report, rows, {
    effort,
    reportFile: `${base}.json`,
    usage,
    budgetStopped,
  });
  await fs.writeFile(`${base}.md`, runMarkdown(summary, report, rows), "utf8");
  const results = await readResults();
  results.runs.push(summary);
  await writeFormatted(RESULTS, JSON.stringify(results), "json");
  console.log(
    `Agreement with ${labelsDescription(rows)}: ${pct(summary.agree, summary.total)} (${summary.agree}/${summary.total}); false Verified ${summary.falseVerified}; errors ${summary.errors}; median ${(summary.medianMs / 1000).toFixed(1)} s; est. $${summary.estUsd.toFixed(2)}${budgetStopped ? `; ${budgetStopped} photos skipped by the budget stop` : ""}.`,
  );
  console.log(`Report: ${base}.md`);
  return budgetStopped ? 3 : 0;
}

async function summary(): Promise<number> {
  const { runs } = await readResults();
  const full = runs.filter((r) => r.budgetStopped === 0 && r.total > 50);
  if (!full.length) {
    console.log("No full runs in results.json yet.");
    return 0;
  }
  const checks = [...new Set(full.flatMap((r) => Object.keys(r.perCheck)))].sort();
  const lines = [
    `Compared with ${full[full.length - 1].labels}: agreement, not accuracy against ground truth.`,
    "",
    "| Model | Photos | Agreement | False Verified | Errors | Median time | Est. cost |",
    "|---|---|---|---|---|---|---|",
    ...full.map(
      (r) =>
        `| ${r.model}${r.effort ? ` (${r.effort})` : ""} | ${r.total} | ${pct(r.agree, r.total)} | ${r.falseVerified} | ${r.errors} | ${(r.medianMs / 1000).toFixed(1)} s | $${r.estUsd.toFixed(2)} |`,
    ),
    "",
    `| Check | ${full.map((r) => r.model.replace("claude-", "")).join(" | ")} |`,
    `|---|${full.map(() => "---").join("|")}|`,
    ...checks.map(
      (c) =>
        `| ${c} (${full[0].perCheck[c]?.n ?? 0}) | ${full
          .map((r) => {
            const t = r.perCheck[c];
            return t
              ? `${pct(t.agree, t.n)}${t.falseVerified ? `, ${t.falseVerified} FV` : ""}`
              : "";
          })
          .join(" | ")} |`,
    ),
    `| Hard cases (${full[0].hardCases.n}) | ${full.map((r) => `${pct(r.hardCases.agree, r.hardCases.n)}${r.hardCases.falseVerified ? `, ${r.hardCases.falseVerified} FV` : ""}`).join(" | ")} |`,
    `| Both label passes agree (${full[0].bothPassesAgree.n}) | ${full.map((r) => `${pct(r.bothPassesAgree.agree, r.bothPassesAgree.n)}${r.bothPassesAgree.falseVerified ? `, ${r.bothPassesAgree.falseVerified} FV` : ""}`).join(" | ")} |`,
    "",
  ];
  // Run-to-run consistency: the same model twice on the same photos.
  const byModel = new Map<string, RunSummary[]>();
  for (const r of full) byModel.set(r.model, [...(byModel.get(r.model) ?? []), r]);
  for (const [model, list] of byModel) {
    if (list.length < 2) continue;
    const [x, y] = list.slice(-2);
    const files = Object.keys(x.verdicts).filter((f) => f in y.verdicts);
    const changed = files.filter((f) => x.verdicts[f] !== y.verdicts[f]);
    lines.push(
      `Consistency, ${model}: the verdict changed on ${changed.length} of ${files.length} photos (${pct(changed.length, files.length)}) between two runs.`,
    );
  }
  console.log(lines.join("\n"));
  return 0;
}

async function main(): Promise<number> {
  const { values, positionals } = parseArgs({
    options: {
      model: { type: "string" },
      "budget-usd": { type: "string", default: "15" },
      concurrency: { type: "string", default: "4" },
      only: { type: "string" },
    },
    allowPositionals: true,
  });
  if (positionals[0] === "summary") return summary();
  if (positionals[0] !== "run" || !values.model) {
    console.error("usage: compare.ts run --model <id> [--budget-usd 15] | compare.ts summary");
    return 2;
  }
  return run({
    model: values.model.trim(),
    budgetUsd: Number(values["budget-usd"]) || 0,
    concurrency: Math.max(1, Number(values.concurrency) || 4),
    only: values.only
      ? new Set(values.only.split(",").map((s) => s.trim().replace(/\.jpe?g$/i, "")))
      : null,
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().then(
    (code) => process.exit(code),
    (err: unknown) => {
      console.error(`compare failed: ${err instanceof Error ? err.message : "unknown error"}`);
      process.exit(1);
    },
  );
}
