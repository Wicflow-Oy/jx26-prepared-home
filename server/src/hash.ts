import { createHash, randomBytes } from "node:crypto";

export function sha256Hex(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

const SHA_RE = /^[0-9a-f]{64}$/;

export function isSha256Hex(value: unknown): value is string {
  return typeof value === "string" && SHA_RE.test(value.toLowerCase());
}

const BASE64_RE = /^[A-Za-z0-9+/_-]*={0,2}$/;

/** Decodes standard or URL-safe base64, tolerating a `data:image/jpeg;base64,` prefix and whitespace. Returns null if it isn't base64. */
export function decodeBase64(input: unknown): Buffer | null {
  if (typeof input !== "string" || input.length === 0) return null;
  let s = input;
  const comma = s.indexOf(",");
  if (s.startsWith("data:") && comma > 0) s = s.slice(comma + 1);
  s = s.replace(/\s+/g, "");
  if (s.length === 0 || !BASE64_RE.test(s)) return null;
  const buf = Buffer.from(s, "base64");
  return buf.length > 0 ? buf : null;
}

/** A short, salted, one-way tag for a client IP: lets logs and limits group requests without storing the address. */
export function makeIpHasher(salt: string | null): (ip: string) => string {
  const secret = salt ?? randomBytes(16).toString("hex");
  return (ip: string) =>
    createHash("sha256").update(secret).update("|").update(ip).digest("hex").slice(0, 10);
}
