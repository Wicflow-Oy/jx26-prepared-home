// Re-downloads the large eval set from Wikimedia Commons and verifies every photo's SHA-256.
//   cd server/eval/large && node fetch.mjs            # downloads missing or changed photos into photos/
//   node fetch.mjs --check                            # only verifies what is already in photos/
// Read-only, at most one request per second, generic User-Agent (see commons.mjs). Synthetic photos are rebuilt
// from their source thumbnail with the recorded recipe; the source hash is checked first.

import { existsSync, promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { degrade, download, sha256Hex } from "./commons.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const { values } = parseArgs({
    options: {
      manifest: { type: "string", default: path.join(here, "manifest.json") },
      photos: { type: "string", default: path.join(here, "photos") },
      check: { type: "boolean", default: false },
    },
  });
  const rows = JSON.parse(await fs.readFile(values.manifest, "utf8"));
  await fs.mkdir(values.photos, { recursive: true });
  const cache = new Map(); // thumbUrl -> bytes, so an original and its synthetic copy cost one request
  let ok = 0;
  let fetched = 0;
  const problems = [];
  for (const row of rows) {
    const target = path.join(values.photos, row.file);
    if (existsSync(target) && sha256Hex(await fs.readFile(target)) === row.sha256) {
      ok++;
      continue;
    }
    if (values.check) {
      problems.push(`${row.file}: ${existsSync(target) ? "hash differs" : "missing"}`);
      continue;
    }
    try {
      let bytes = cache.get(row.thumbUrl);
      if (!bytes) {
        bytes = await download(row.thumbUrl);
        cache.set(row.thumbUrl, bytes);
      }
      if (row.synthetic) {
        if (sha256Hex(bytes) !== row.sourceSha256) {
          problems.push(`${row.file}: the source thumbnail changed on Commons; not rebuilt`);
          continue;
        }
        bytes = await degrade(bytes, row.synthetic);
        if (sha256Hex(bytes) !== row.sha256) {
          // Same recipe, different JPEG encoder build: the image is equivalent but not byte-identical.
          problems.push(
            `${row.file}: rebuilt ${row.synthetic} copy differs from the recorded hash (sharp/libvips version?); kept`,
          );
        }
      } else if (sha256Hex(bytes) !== row.sha256) {
        problems.push(`${row.file}: the thumbnail on Commons changed (hash differs); not saved`);
        continue;
      }
      await fs.writeFile(target, bytes);
      fetched++;
      if (fetched % 25 === 0) console.log(`fetched ${fetched}`);
    } catch (err) {
      problems.push(`${row.file}: ${err?.message ?? err}`);
    }
  }
  console.log(
    `${rows.length} photos: ${ok} already verified, ${fetched} downloaded, ${problems.length} problems.`,
  );
  for (const p of problems) console.log(`  ${p}`);
  return problems.some((p) => !p.endsWith("; kept")) ? 1 : 0;
}

main().then(
  (code) => process.exit(code),
  (err) => {
    console.error(err?.message ?? err);
    process.exit(1);
  },
);
