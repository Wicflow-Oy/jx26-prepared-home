// Writes JSON and HTML in the repo's Prettier style, so `npm run format:check` stays green after a rerun.

import { promises as fs } from "node:fs";

export async function writeFormatted(
  file: string,
  text: string,
  parser: "json" | "html",
): Promise<void> {
  let out = text;
  try {
    const prettier = await import("prettier");
    const options = (await prettier.resolveConfig(file)) ?? {};
    out = await prettier.format(text, { ...options, parser, filepath: file });
  } catch {
    // Prettier lives in the repo root's devDependencies; without it the file is written as it is.
  }
  await fs.writeFile(file, out, "utf8");
}
