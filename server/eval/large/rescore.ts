// Re-scores the saved model runs against a (reviewed) manifest without calling any model.
// After the team reviews the labels in review.html and exports manifest.reviewed.json:
//   npx tsx eval/large/rescore.ts --manifest eval/large/manifest.reviewed.json        (from server/)
// Rows marked "Skip (bad item)" are left out. With every row reviewed, the numbers are accuracy on a reviewed set.

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

type Verdict = "verified" | "retake" | "fix_first" | "not_applicable";

interface Row {
  file: string;
  checkId: string;
  expectedVerdict: Verdict;
  labelSource?: string;
  excluded?: boolean;
}

interface Run {
  model: string;
  effort: string | null;
  startedAt: string;
  budgetStopped: number;
  total: number;
  medianMs: number;
  verdicts: Record<string, Verdict>;
}

const here = path.dirname(fileURLToPath(import.meta.url));
const pct = (n: number, d: number) => (d ? `${((100 * n) / d).toFixed(1)}%` : "-");

async function main(): Promise<number> {
  const { values } = parseArgs({
    options: { manifest: { type: "string", default: path.join(here, "manifest.json") } },
  });
  const rows = (JSON.parse(await readFile(values.manifest!, "utf8")) as Row[]).filter(
    (r) => !r.excluded,
  );
  const { runs } = JSON.parse(await readFile(path.join(here, "results.json"), "utf8")) as {
    runs: Run[];
  };
  const full = runs.filter((r) => r.budgetStopped === 0 && r.total > 50);
  if (!full.length) {
    console.log("No full runs in results.json yet.");
    return 0;
  }

  const reviewed = rows.filter((r) => r.labelSource === "reviewed").length;
  const labels =
    reviewed === rows.length
      ? `team-reviewed labels (${rows.length} photos): accuracy on a reviewed set`
      : `${reviewed} reviewed and ${rows.length - reviewed} draft labels: agreement, not accuracy`;
  console.log(`Scored against ${labels}.\n`);
  console.log("| Model | Run | Photos | Agreement | False Verified | Median time |");
  console.log("|---|---|---|---|---|---|");
  for (const run of full) {
    const scored = rows.filter((r) => r.file in run.verdicts);
    const agree = scored.filter((r) => run.verdicts[r.file] === r.expectedVerdict).length;
    const falseVerified = scored.filter(
      (r) => run.verdicts[r.file] === "verified" && r.expectedVerdict !== "verified",
    ).length;
    console.log(
      `| ${run.model}${run.effort ? ` (${run.effort})` : ""} | ${run.startedAt.slice(0, 16)} | ${scored.length} | ${pct(agree, scored.length)} | ${falseVerified} | ${(run.medianMs / 1000).toFixed(1)} s |`,
    );
  }
  return 0;
}

main().then(
  (code) => process.exit(code),
  (err: unknown) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  },
);
