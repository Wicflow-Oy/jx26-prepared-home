import type { CheckRecord, Home, HomeType, Lang, Peril, Verdict } from "@prepared-home/engine";
import { decodeBase64, isSha256Hex, sha256Hex } from "./hash";
import { isJpeg, jpegSize, MAX_LONG_EDGE } from "./jpeg";

export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export const bad = (message: string) => new HttpError(400, "bad_request", message);

const LANGS: Lang[] = ["fi", "sv", "en"];
const HOME_TYPES: HomeType[] = ["flat", "house", "cottage"];
const PERILS: Peril[] = ["leak", "fire", "freeze", "storm_water"];
export const VERDICTS: Verdict[] = ["verified", "retake", "fix_first", "not_applicable"];

export function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export function parseLang(v: unknown, fallback: Lang = "en"): Lang {
  return typeof v === "string" && (LANGS as string[]).includes(v) ? (v as Lang) : fallback;
}

export function parseHomeType(v: unknown): HomeType {
  if (typeof v === "string" && (HOME_TYPES as string[]).includes(v)) return v as HomeType;
  throw bad("homeType must be flat, house or cottage");
}

export function parseOptionalHomeType(v: unknown): HomeType | null {
  if (v === undefined || v === null || v === "") return null;
  return parseHomeType(v);
}

export function parsePeril(v: unknown): Peril {
  if (typeof v === "string" && (PERILS as string[]).includes(v)) return v as Peril;
  throw bad("peril must be leak, fire, freeze or storm_water");
}

const ID_RE = /^[A-Za-z0-9_-]{1,80}$/;

export function parseId(v: unknown, name: string): string {
  if (typeof v === "string" && ID_RE.test(v)) return v;
  throw bad(`${name} must be 1-80 letters, digits, '-' or '_'`);
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function parseIsoDate(v: unknown, name: string): string {
  if (typeof v === "string" && DATE_RE.test(v) && !Number.isNaN(Date.parse(`${v}T00:00:00Z`)))
    return v;
  throw bad(`${name} must be an ISO date (YYYY-MM-DD)`);
}

function parseIsoDateTime(v: unknown, name: string): string {
  if (typeof v === "string" && v.length <= 40 && !Number.isNaN(Date.parse(v))) return v;
  throw bad(`${name} must be an ISO date or datetime`);
}

export function parseUserAnswers(v: unknown): Record<string, boolean> {
  if (v === undefined || v === null) return {};
  if (!isPlainObject(v)) throw bad("userAnswers must be an object of booleans");
  const out: Record<string, boolean> = {};
  for (const [k, val] of Object.entries(v).slice(0, 50)) {
    if (typeof val === "boolean" && k.length <= 80) out[k] = val;
  }
  return out;
}

export function parseHome(v: unknown): Home {
  if (!isPlainObject(v)) throw bad("home must be an object");
  const label = typeof v.label === "string" ? v.label.slice(0, 120) : "Home";
  if (typeof v.hasLeakAlarm !== "boolean") throw bad("home.hasLeakAlarm must be a boolean");
  const home: Home = {
    homeId: parseId(v.homeId, "home.homeId"),
    homeType: parseHomeType(v.homeType),
    label,
    moveInDate: parseIsoDate(v.moveInDate, "home.moveInDate"),
    hasLeakAlarm: v.hasLeakAlarm,
  };
  if (v.demo === true) home.demo = true;
  return home;
}

export function parseRecord(v: unknown, homeId: string): CheckRecord {
  if (!isPlainObject(v)) throw bad("each record must be an object");
  if (typeof v.verdict !== "string" || !(VERDICTS as string[]).includes(v.verdict))
    throw bad("record.verdict is invalid");
  const sha = v.photoSha256;
  if (sha !== null && sha !== undefined && !isSha256Hex(sha))
    throw bad("record.photoSha256 must be a SHA-256 hex string or null");
  const dueAt =
    v.dueAt === null || v.dueAt === undefined ? null : parseIsoDateTime(v.dueAt, "record.dueAt");
  const record: CheckRecord = {
    homeId,
    checkId: parseId(v.checkId, "record.checkId"),
    verdict: v.verdict as Verdict,
    checkedAt: parseIsoDateTime(v.checkedAt, "record.checkedAt"),
    dueAt,
    photoSha256: typeof sha === "string" ? sha.toLowerCase() : null,
  };
  if (v.userAnswers !== undefined) record.userAnswers = parseUserAnswers(v.userAnswers);
  return record;
}

export interface ReceivedImage {
  base64: string; // normalised standard base64 of the exact bytes
  sha256: string;
  width: number;
  height: number;
}

/**
 * Decodes the photo in memory, checks it is a JPEG within the size limit and that its SHA-256 matches the client's.
 * The bytes are never written anywhere.
 */
export function receiveImage(imageBase64: unknown, photoSha256: unknown): ReceivedImage {
  const bytes = decodeBase64(imageBase64);
  if (!bytes) throw bad("imageBase64 must be a base64-encoded JPEG");
  if (!isJpeg(bytes))
    throw new HttpError(415, "unsupported_media_type", "Only image/jpeg is accepted");
  const size = jpegSize(bytes);
  if (!size) throw new HttpError(415, "unsupported_media_type", "Could not read the JPEG header");
  if (Math.max(size.width, size.height) > MAX_LONG_EDGE) {
    throw new HttpError(
      413,
      "image_too_large",
      `Resize the photo to at most ${MAX_LONG_EDGE} px on the long edge`,
    );
  }
  const sha256 = sha256Hex(bytes);
  if (photoSha256 !== undefined) {
    if (!isSha256Hex(photoSha256)) throw bad("photoSha256 must be a SHA-256 hex string");
    if (photoSha256.toLowerCase() !== sha256) {
      throw new HttpError(
        409,
        "hash_mismatch",
        "photoSha256 does not match the received image bytes",
      );
    }
  }
  return { base64: bytes.toString("base64"), sha256, width: size.width, height: size.height };
}

export function hashShared(shared: unknown, max = 20): { checkId: string; sha256: string }[] {
  if (shared === undefined || shared === null) return [];
  if (!Array.isArray(shared)) throw bad("shared must be an array");
  if (shared.length > max) throw bad(`shared may hold at most ${max} photos`);
  return shared.map((item) => {
    if (!isPlainObject(item)) throw bad("each shared item must be an object");
    const checkId = parseId(item.checkId, "shared.checkId");
    const bytes = decodeBase64(item.imageBase64);
    if (!bytes) throw bad("shared.imageBase64 must be base64");
    return { checkId, sha256: sha256Hex(bytes) };
  });
}
