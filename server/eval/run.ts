// npm run eval -- --model <id> [--concurrency 3] [--only A01,B03]
// Calls the live Anthropic provider (never the cache) on every manifest photo and writes reports/<timestamp>-<model>.{json,md}.

import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { DEFAULT_VISION_MODEL } from "../src/config";
import { AnthropicVisionProvider } from "../src/vision/anthropic";
import { loadManifest, runEval, writeReport } from "./runner";

const here = path.dirname(fileURLToPath(import.meta.url));

async function main(): Promise<number> {
  const { values } = parseArgs({
    options: {
      model: { type: "string" },
      concurrency: { type: "string", default: "3" },
      only: { type: "string" },
      manifest: { type: "string", default: path.join(here, "manifest.json") },
      photos: { type: "string", default: path.join(here, "photos") },
      out: { type: "string", default: path.join(here, "reports") },
    },
    allowPositionals: false,
  });

  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) {
    console.error(
      "ANTHROPIC_API_KEY not set. The eval calls the live model; set the key and run again.",
    );
    return 2;
  }

  const model = values.model?.trim() || process.env.VISION_MODEL?.trim() || DEFAULT_VISION_MODEL;
  const effort = process.env.VISION_EFFORT?.trim() as
    "low" | "medium" | "high" | "xhigh" | "max" | undefined;
  let rows = await loadManifest(values.manifest!);
  if (values.only) {
    const only = new Set(values.only.split(",").map((s) => s.trim().replace(/\.jpe?g$/i, "")));
    rows = rows.filter((r) => only.has(r.file.replace(/\.jpe?g$/i, "")));
  }
  const provider = new AnthropicVisionProvider({ apiKey, model, effort: effort || null });
  console.log(
    `Eval: ${rows.length} photos, model ${model}${effort ? `, effort ${effort}` : ""}. This makes ${rows.length} paid API calls.`,
  );

  const report = await runEval({
    rows,
    photosDir: values.photos!,
    provider,
    concurrency: Math.max(1, Number(values.concurrency) || 3),
    onRow: (r) =>
      console.log(
        `${r.correct ? "ok " : r.lenientCorrect ? "ok*" : "NO "} ${r.file} ${r.checkId} expected=${r.expected} actual=${r.actual}${r.error ? ` error=${r.error}` : ""} ${r.ms}ms`,
      ),
  });
  const files = await writeReport(report, values.out!, new Date());
  console.log(
    `Accuracy ${(report.accuracy * 100).toFixed(1)}% (${report.correct}/${report.total}), lenient ${(report.lenientAccuracy * 100).toFixed(1)}%, false verified ${report.falseVerified}, errors ${report.errors}`,
  );
  console.log(`Reports: ${files.json}\n         ${files.md}`);
  return 0;
}

main().then(
  (code) => process.exit(code),
  (err: unknown) => {
    console.error(`Eval failed: ${err instanceof Error ? err.message : "unknown error"}`);
    process.exit(1);
  },
);
