// Answers from the server are checked before the app relies on them.
import type { AdjusterView, Verdict } from "@prepared-home/engine";

import { ApiError, type CheckResponse, type SamplePhoto } from "./types";

const VERDICTS: string[] = [
  "verified",
  "retake",
  "fix_first",
  "not_applicable",
] satisfies Verdict[];

const asString = (v: unknown): string | undefined =>
  typeof v === "string" && v.length > 0 ? v : undefined;

const asNumber = (v: unknown): number | undefined =>
  typeof v === "number" && Number.isFinite(v) ? v : undefined;

/** The samples list, as an array or as { samples: [...] }. Entries without an id, check or URL are skipped. */
export function normalizeSamples(raw: unknown): SamplePhoto[] {
  const list = Array.isArray(raw)
    ? raw
    : raw && typeof raw === "object" && Array.isArray((raw as { samples?: unknown }).samples)
      ? (raw as { samples: unknown[] }).samples
      : null;
  if (!list) throw new ApiError("bad_response", null, "Samples list missing");
  const out: SamplePhoto[] = [];
  for (const item of list) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const id = asString(o.id);
    const checkId = asString(o.checkId);
    const url = asString(o.url);
    if (!id || !checkId || !url) continue;
    const expected = asString(o.expectedVerdict);
    out.push({
      id,
      checkId,
      url,
      credit: asString(o.credit) ?? "",
      author: asString(o.author),
      licence: asString(o.licence),
      sourceUrl: asString(o.sourceUrl),
      expectedVerdict: expected && VERDICTS.includes(expected) ? (expected as Verdict) : undefined,
      urgent: typeof o.urgent === "boolean" ? o.urgent : undefined,
      title: asString(o.caption),
      width: asNumber(o.width),
      height: asNumber(o.height),
      recordedAt: asString(o.recordedAt),
    });
  }
  return out;
}

export function isCheckResponse(v: unknown): v is CheckResponse {
  if (!v || typeof v !== "object") return false;
  const o = v as Partial<CheckResponse>;
  return (
    !!o.outcome &&
    typeof o.outcome.verdict === "string" &&
    !!o.record &&
    typeof o.record.checkId === "string"
  );
}

export function isAdjusterView(v: unknown): v is AdjusterView {
  if (!v || typeof v !== "object") return false;
  const o = v as Partial<AdjusterView>;
  return (
    typeof o.claimId === "string" && typeof o.decision === "string" && Array.isArray(o.records)
  );
}
