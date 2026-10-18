// npm run record:scenes [-- --force]
// Records one live assessment per web demo-camera scene (app/public/demo-scenes/scenes.json) into
// <CACHE_DIR>/assessments/<sha256>.json. The demo camera sends the scene photo as it is, so the public
// demo answers every scene instantly, free and the same for everyone, even without an API key.
// Makes one paid API call per scene that isn't recorded yet. Reads the key only from ANTHROPIC_API_KEY.

import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { decideVerdict, getCheck } from "@prepared-home/engine";
import { loadConfig } from "../src/config";
import { sha256Hex } from "../src/hash";
import { jpegSize } from "../src/jpeg";
import { AnthropicVisionProvider } from "../src/vision/anthropic";
import { CachedVisionProvider } from "../src/vision/cached";

const SCENES_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../app/public/demo-scenes",
);

async function main(): Promise<number> {
  const { values } = parseArgs({ options: { force: { type: "boolean", default: false } } });
  const config = loadConfig();
  if (!config.apiKey) {
    console.error("ANTHROPIC_API_KEY not set. Put it in builds/prepared-home/.env.local.");
    return 2;
  }
  const cache = new CachedVisionProvider(config.cacheDir, true);
  const provider = new AnthropicVisionProvider({
    apiKey: config.apiKey,
    model: config.visionModel,
    effort: config.visionEffort,
  });
  const scenes = JSON.parse(
    await fs.readFile(path.join(SCENES_DIR, "scenes.json"), "utf8"),
  ) as Record<string, { file: string }[]>;
  console.log(`Recording demo scenes with ${provider.model} into ${cache.dir}`);

  for (const [checkId, list] of Object.entries(scenes)) {
    // Freezing and storm-water checks exist only for houses; the rest are recorded with the flat's wording.
    const homeType = /^[ZS]/.test(checkId) ? "house" : "flat";
    const check = getCheck(checkId, homeType);
    for (const { file } of list) {
      const bytes = await fs.readFile(path.join(SCENES_DIR, file));
      const sha = sha256Hex(bytes);
      let entry = values.force ? null : await cache.lookup(sha, checkId);
      if (!entry) {
        const size = jpegSize(bytes);
        if (!size) throw new Error(`${file} is not a JPEG`);
        const assessment = await provider.assess({
          check,
          lang: "en",
          image: { base64: bytes.toString("base64"), mediaType: "image/jpeg", ...size },
        });
        await cache.store(sha, checkId, assessment, new Date());
        entry = await cache.lookup(sha, checkId);
      }
      const answers = Object.fromEntries(
        check.criteria.filter((c) => c.kind === "user").map((c) => [c.id, true]),
      );
      const verdict = entry
        ? decideVerdict(check, entry.assessment, answers, "en", homeType).verdict
        : "missing";
      console.log(`${checkId} ${file}: ${verdict}`);
    }
  }
  return 0;
}

main().then(
  (code) => process.exit(code),
  (err: unknown) => {
    console.error(`Recording failed: ${err instanceof Error ? err.message : "unknown error"}`);
    process.exit(1);
  },
);
