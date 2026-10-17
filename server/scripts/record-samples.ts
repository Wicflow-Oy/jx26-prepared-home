// npm run record:samples [-- --force] [-- --only A07,B03]
// Records one live assessment per sample photo into <CACHE_DIR>/assessments/<sha256>.json, so the
// public demo serves samples instantly, free and deterministically ("Recorded live result (<date>)").
// Makes one paid API call per sample that isn't recorded yet. Reads the key only from ANTHROPIC_API_KEY.

import { promises as fs } from "node:fs";
import { parseArgs } from "node:util";
import { decideVerdict, getCheck } from "@prepared-home/engine";
import { loadConfig } from "../src/config";
import { SampleCatalog } from "../src/samples";
import { AnthropicVisionProvider } from "../src/vision/anthropic";
import { CachedVisionProvider } from "../src/vision/cached";

async function main(): Promise<number> {
  const { values } = parseArgs({
    options: { force: { type: "boolean", default: false }, only: { type: "string" } },
  });
  const config = loadConfig();
  if (!config.apiKey) {
    console.error(
      "ANTHROPIC_API_KEY not set. Put it in builds/prepared-home/.env.local or the environment, then run again.",
    );
    return 2;
  }
  const only = values.only ? new Set(values.only.split(",").map((s) => s.trim())) : null;
  const cache = new CachedVisionProvider(config.cacheDir, true);
  const provider = new AnthropicVisionProvider({
    apiKey: config.apiKey,
    model: config.visionModel,
    effort: config.visionEffort,
  });
  const samples = (await new SampleCatalog(config.samplesDir).all()).filter(
    (s) => !only || only.has(s.def.id),
  );
  console.log(`Recording ${samples.length} samples with ${provider.model} into ${cache.dir}`);

  let recorded = 0;
  for (const s of samples) {
    if (!values.force && (await cache.lookup(s.sha256, s.def.checkId))) {
      console.log(`skip ${s.def.id}: already recorded (use --force to re-record)`);
      continue;
    }
    const check = getCheck(s.def.checkId, "flat");
    const bytes = await fs.readFile(s.path);
    const started = Date.now();
    const result = await provider.assess({
      check,
      lang: "en",
      image: {
        base64: bytes.toString("base64"),
        mediaType: "image/jpeg",
        width: s.width,
        height: s.height,
      },
    });
    const assessment = result; // store() keeps only the assessment fields, never usage
    await cache.store(s.sha256, s.def.checkId, assessment, new Date());
    recorded += 1;
    const answers = Object.fromEntries(
      check.criteria.filter((c) => c.kind === "user").map((c) => [c.id, true]),
    );
    const verdict = decideVerdict(check, assessment, answers, "en", "flat").verdict;
    const mark = verdict === s.def.expectedVerdict ? "ok " : "DIFF";
    console.log(
      `${mark} ${s.def.id} ${s.def.checkId}: ${verdict} (expected ${s.def.expectedVerdict}) ${Date.now() - started}ms`,
    );
  }
  console.log(
    `Done: ${recorded} recorded. Review any DIFF before the demo; delete its cache file to re-record.`,
  );
  return 0;
}

main().then(
  (code) => process.exit(code),
  (err: unknown) => {
    console.error(`Recording failed: ${err instanceof Error ? err.name : "unknown error"}`);
    process.exit(1);
  },
);
