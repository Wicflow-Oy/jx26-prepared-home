// Bundles the server (engine and every npm dependency included) into one ESM file:
//   release/artifact/server.mjs (committed; the production box builds the copy-only Dockerfile from it)
// Usage: npm run bundle

import { build } from "esbuild";
import { mkdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const serverDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outfile = path.resolve(serverDir, "..", "release", "artifact", "server.mjs");

await mkdir(path.dirname(outfile), { recursive: true });

// CommonJS dependencies (Express and friends) call require() and read __dirname; ESM output has neither.
const banner = [
  "import { createRequire as __phCreateRequire } from 'node:module';",
  "import { fileURLToPath as __phFileURLToPath } from 'node:url';",
  "import { dirname as __phDirname } from 'node:path';",
  "const require = __phCreateRequire(import.meta.url);",
  "const __filename = __phFileURLToPath(import.meta.url);",
  "const __dirname = __phDirname(__filename);",
].join(" ");

const result = await build({
  entryPoints: [path.join(serverDir, "src", "index.ts")],
  outfile,
  bundle: true,
  platform: "node",
  target: "node24",
  format: "esm",
  sourcemap: false,
  minify: false,
  legalComments: "eof",
  define: { __PH_BUNDLED__: "true" },
  banner: { js: banner },
  logLevel: "warning",
  metafile: true,
});

const { size } = await stat(outfile);
const inputs = Object.keys(result.metafile.inputs).length;
console.log(
  `Bundled ${inputs} modules into ${path.relative(path.resolve(serverDir, ".."), outfile)} (${(size / 1024).toFixed(0)} KB)`,
);
