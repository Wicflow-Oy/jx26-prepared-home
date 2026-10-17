// npm run eval:gate -- --candidate <report.json> --baseline <report.json>
// Exit 0: the candidate may replace the default model. Exit 1: it may not. Exit 2: bad input.

import { promises as fs } from "node:fs";
import { parseArgs } from "node:util";
import { gate, isReport, type EvalReport } from "./runner";

async function read(file: string): Promise<EvalReport> {
  const parsed: unknown = JSON.parse(await fs.readFile(file, "utf8"));
  if (!isReport(parsed)) throw new Error(`${file} is not an eval report`);
  return parsed;
}

async function main(): Promise<number> {
  const { values } = parseArgs({
    options: { candidate: { type: "string" }, baseline: { type: "string" } },
  });
  if (!values.candidate || !values.baseline) {
    console.error("Usage: npm run eval:gate -- --candidate <report.json> --baseline <report.json>");
    return 2;
  }
  let candidate: EvalReport;
  let baseline: EvalReport;
  try {
    [candidate, baseline] = await Promise.all([read(values.candidate), read(values.baseline)]);
  } catch (err) {
    console.error(err instanceof Error ? err.message : "Could not read the reports");
    return 2;
  }
  const result = gate(candidate, baseline);
  const line = (r: EvalReport) =>
    `${r.model}: accuracy ${(r.accuracy * 100).toFixed(1)}%, false verified ${r.falseVerified}`;
  console.log(`Candidate ${line(candidate)}`);
  console.log(`Baseline  ${line(baseline)}`);
  if (result.pass) {
    console.log("GATE PASS: the candidate may replace the baseline model.");
    return 0;
  }
  console.log("GATE FAIL:");
  for (const reason of result.reasons) console.log(`- ${reason}`);
  return 1;
}

main().then((code) => process.exit(code));
