// Eval runner (CONTRACTS §7): photos → vision provider → engine verdict. CLI in run.ts, scoring in report.ts.

import { promises as fs } from "node:fs";
import path from "node:path";
import {
  decideVerdict,
  getCheck,
  type HomeType,
  type Verdict,
  type VisionAssessment,
} from "@prepared-home/engine";
import { sha256Hex } from "../src/hash";
import { isJpeg, jpegSize, MAX_LONG_EDGE } from "../src/jpeg";
import { errorTag } from "../src/log";
import { VERDICTS } from "../src/validate";
import type { VisionProvider } from "../src/vision/types";
import { summarize, type EvalReport, type EvalRow } from "./report";

export interface ManifestRow {
  file: string;
  checkId: string;
  expectedVerdict: Verdict;
  note: string;
  alsoAcceptable?: Verdict[];
  expectedUrgent?: boolean;
  homeType?: HomeType;
}

export interface EvalImage {
  base64: string;
  width: number;
  height: number;
  sha256: string;
  resized: boolean;
}

export async function loadManifest(file: string): Promise<ManifestRow[]> {
  const raw = JSON.parse(await fs.readFile(file, "utf8")) as unknown;
  if (!Array.isArray(raw)) throw new Error("manifest must be an array");
  return raw.map((r, i) => {
    const row = r as ManifestRow;
    if (
      typeof row.file !== "string" ||
      typeof row.checkId !== "string" ||
      !VERDICTS.includes(row.expectedVerdict)
    ) {
      throw new Error(`manifest row ${i} is invalid`);
    }
    getCheck(row.checkId); // throws on an unknown check id
    return row;
  });
}

/** Prepares a photo as the app would: JPEG, at most 2576 px on the long edge, EXIF dropped when re-encoded. */
export async function loadEvalImage(file: string): Promise<EvalImage> {
  const bytes = await fs.readFile(file);
  const size = jpegSize(bytes);
  if (isJpeg(bytes) && size && Math.max(size.width, size.height) <= MAX_LONG_EDGE) {
    return {
      base64: bytes.toString("base64"),
      width: size.width,
      height: size.height,
      sha256: sha256Hex(bytes),
      resized: false,
    };
  }
  // Larger or non-JPEG photos (the team's own phone shots): resize and re-encode with sharp, like the app does.
  const sharp = (await import("sharp")).default;
  const out = await sharp(bytes)
    .rotate()
    .resize({
      width: MAX_LONG_EDGE,
      height: MAX_LONG_EDGE,
      fit: "inside",
      withoutEnlargement: true,
    })
    .jpeg({ quality: 85 })
    .toBuffer({ resolveWithObject: true });
  return {
    base64: out.data.toString("base64"),
    width: out.info.width,
    height: out.info.height,
    sha256: sha256Hex(out.data),
    resized: true,
  };
}

function defaultHomeType(checkId: string): HomeType {
  const types = getCheck(checkId).homeTypes;
  return types.includes("flat") ? "flat" : types[0];
}

async function mapLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i]);
    }
  });
  await Promise.all(workers);
  return out;
}

export interface RunOptions {
  rows: ManifestRow[];
  photosDir: string;
  provider: VisionProvider;
  concurrency?: number;
  loadImage?: (file: string) => Promise<EvalImage>;
  clock?: () => Date;
  onRow?: (row: EvalRow) => void;
}

export async function runEval(opts: RunOptions): Promise<EvalReport> {
  const clock = opts.clock ?? (() => new Date());
  const load = opts.loadImage ?? loadEvalImage;
  const startedAt = clock().toISOString();

  const rows = await mapLimit(opts.rows, opts.concurrency ?? 3, async (m): Promise<EvalRow> => {
    const homeType = m.homeType ?? defaultHomeType(m.checkId);
    const check = getCheck(m.checkId, homeType); // the home type's wording, as the app sends it
    // User criteria are the customer's answers; for the eval they are all "yes".
    const userAnswers = Object.fromEntries(
      check.criteria.filter((c) => c.kind === "user").map((c) => [c.id, true]),
    );
    const image = await load(path.join(opts.photosDir, m.file));
    const t0 = Date.now();
    let assessment: VisionAssessment | null = null;
    let error: string | undefined;
    try {
      assessment = await opts.provider.assess({
        check,
        lang: "en",
        image: {
          base64: image.base64,
          mediaType: "image/jpeg",
          width: image.width,
          height: image.height,
        },
      });
    } catch (err) {
      error = errorTag(err);
    }
    const ms = Date.now() - t0;
    const outcome = decideVerdict(check, assessment, userAnswers, "en", homeType);
    const accepted = [m.expectedVerdict, ...(m.alsoAcceptable ?? [])];
    const row: EvalRow = {
      file: m.file,
      checkId: m.checkId,
      expected: m.expectedVerdict,
      actual: outcome.verdict,
      correct: outcome.verdict === m.expectedVerdict,
      lenientCorrect: accepted.includes(outcome.verdict),
      urgent: outcome.urgent,
      expectedUrgent: m.expectedUrgent === true,
      criteria: outcome.criteria.map((c) => ({
        id: c.id,
        kind: c.kind,
        met: c.met,
        ...(c.note ? { note: c.note } : {}),
      })),
      retakeHint: outcome.retakeHint,
      fix: outcome.fix ? outcome.fix.text : null,
      sha256: image.sha256,
      resized: image.resized,
      ms,
      note: m.note,
    };
    if (error) row.error = error;
    opts.onRow?.(row);
    return row;
  });

  return summarize(rows, {
    model: opts.provider.model,
    provider: opts.provider.name,
    startedAt,
    finishedAt: clock().toISOString(),
    accepted: new Map(
      opts.rows.map((m) => [m.file, [m.expectedVerdict, ...(m.alsoAcceptable ?? [])]]),
    ),
  });
}
