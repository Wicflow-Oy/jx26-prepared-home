import { promises as fs } from "node:fs";
import path from "node:path";
import type { VisionAssessment } from "@prepared-home/engine";
import { decodeBase64, isSha256Hex, sha256Hex } from "../hash";
import type { VisionInput, VisionProvider } from "./types";

/** One recorded live assessment, stored as <cacheDir>/assessments/<sha256>.json. Never holds image bytes. */
export interface CacheEntry {
  version: 1;
  sha256: string;
  checkId: string;
  model: string;
  recordedAt: string; // ISO datetime of the live call
  assessment: VisionAssessment;
}

export class CacheMissError extends Error {
  constructor() {
    super("No recorded assessment for this photo");
  }
}

function isEntry(v: unknown): v is CacheEntry {
  if (typeof v !== "object" || v === null) return false;
  const e = v as Record<string, unknown>;
  const a = e.assessment as Record<string, unknown> | undefined;
  return (
    typeof e.sha256 === "string" &&
    typeof e.checkId === "string" &&
    typeof e.model === "string" &&
    typeof e.recordedAt === "string" &&
    typeof a === "object" &&
    a !== null &&
    Array.isArray(a.criteria) &&
    Array.isArray(a.boxes)
  );
}

export class CachedVisionProvider implements VisionProvider {
  readonly name = "cached";
  readonly model = "cached";
  readonly dir: string;

  constructor(
    cacheDir: string,
    private readonly writable: boolean,
  ) {
    this.dir = path.join(cacheDir, "assessments");
  }

  get canWrite(): boolean {
    return this.writable;
  }

  private file(sha: string): string {
    return path.join(this.dir, `${sha.toLowerCase()}.json`);
  }

  /** The recorded entry for this photo and check, or null on a miss (also when the photo was recorded for another check). */
  async lookup(sha: string, checkId: string): Promise<CacheEntry | null> {
    if (!isSha256Hex(sha)) return null;
    let raw: string;
    try {
      raw = await fs.readFile(this.file(sha), "utf8");
    } catch {
      return null;
    }
    try {
      const parsed: unknown = JSON.parse(raw);
      if (
        !isEntry(parsed) ||
        parsed.checkId !== checkId ||
        parsed.sha256.toLowerCase() !== sha.toLowerCase()
      )
        return null;
      return parsed;
    } catch {
      return null;
    }
  }

  async assess(input: VisionInput): Promise<VisionAssessment> {
    const bytes = decodeBase64(input.image.base64);
    if (!bytes) throw new CacheMissError();
    const hit = await this.lookup(sha256Hex(bytes), input.check.id);
    if (!hit) throw new CacheMissError();
    return hit.assessment;
  }

  /** Records a live result. A no-op unless CACHE_WRITE=1. */
  async store(
    sha: string,
    checkId: string,
    assessment: VisionAssessment,
    recordedAt: Date,
  ): Promise<boolean> {
    if (!this.writable || !isSha256Hex(sha)) return false;
    const { criteria, boxes, retakeHint, fixSuggestion, urgent, model } = assessment;
    const entry: CacheEntry = {
      version: 1,
      sha256: sha.toLowerCase(),
      checkId,
      model,
      recordedAt: recordedAt.toISOString(),
      assessment: {
        criteria,
        boxes,
        retakeHint: retakeHint ?? null,
        fixSuggestion: fixSuggestion ?? null,
        urgent: urgent ?? false,
        model,
      },
    };
    await fs.mkdir(this.dir, { recursive: true });
    const target = this.file(sha);
    const tmp = `${target}.${process.pid}.tmp`;
    await fs.writeFile(tmp, `${JSON.stringify(entry, null, 2)}\n`, "utf8");
    await fs.rename(tmp, target);
    return true;
  }

  async count(): Promise<number> {
    try {
      const names = await fs.readdir(this.dir);
      return names.filter((n) => /^[0-9a-f]{64}\.json$/.test(n)).length;
    } catch {
      return 0;
    }
  }
}
