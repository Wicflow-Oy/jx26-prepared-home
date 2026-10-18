// Small, dependency-free helpers for base64 and hex, identical on Hermes and in browsers.
import * as Crypto from "expo-crypto";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
const LOOKUP = (() => {
  const table = new Int16Array(128).fill(-1);
  for (let i = 0; i < ALPHABET.length; i++) table[ALPHABET.charCodeAt(i)] = i;
  table["-".charCodeAt(0)] = 62; // tolerate base64url
  table["_".charCodeAt(0)] = 63;
  return table;
})();

/** Strips an optional data-URI prefix. */
function stripDataUri(b64: string): string {
  const comma = b64.indexOf(",");
  return b64.startsWith("data:") && comma >= 0 ? b64.slice(comma + 1) : b64;
}

export function base64ToBytes(input: string): Uint8Array {
  const clean = stripDataUri(input).replace(/[\s=]/g, "");
  const out = new Uint8Array(Math.floor((clean.length * 3) / 4));
  let buffer = 0;
  let bits = 0;
  let o = 0;
  for (let i = 0; i < clean.length; i++) {
    const code = clean.charCodeAt(i);
    const v = code < 128 ? LOOKUP[code] : -1;
    if (v < 0) throw new Error("Invalid base64");
    buffer = (buffer << 6) | v;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out[o++] = (buffer >> bits) & 0xff;
    }
  }
  return o === out.length ? out : out.slice(0, o);
}

export function bytesToBase64(bytes: Uint8Array): string {
  let out = "";
  let i = 0;
  for (; i + 2 < bytes.length; i += 3) {
    const n = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];
    out +=
      ALPHABET[(n >> 18) & 63] +
      ALPHABET[(n >> 12) & 63] +
      ALPHABET[(n >> 6) & 63] +
      ALPHABET[n & 63];
  }
  const rest = bytes.length - i;
  if (rest === 1) {
    const n = bytes[i] << 16;
    out += ALPHABET[(n >> 18) & 63] + ALPHABET[(n >> 12) & 63] + "==";
  } else if (rest === 2) {
    const n = (bytes[i] << 16) | (bytes[i + 1] << 8);
    out += ALPHABET[(n >> 18) & 63] + ALPHABET[(n >> 12) & 63] + ALPHABET[(n >> 6) & 63] + "=";
  }
  return out;
}

function bytesToHex(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let hex = "";
  for (let i = 0; i < bytes.length; i++) hex += bytes[i].toString(16).padStart(2, "0");
  return hex;
}

/** SHA-256 (hex) of exactly these bytes. */
export async function sha256Hex(bytes: Uint8Array): Promise<string> {
  // Copy into a fresh ArrayBuffer so the digest sees exactly these bytes, never a larger backing buffer.
  const copy = new Uint8Array(bytes.length);
  copy.set(bytes);
  const digest = await Crypto.digest(Crypto.CryptoDigestAlgorithm.SHA256, copy.buffer);
  return bytesToHex(digest);
}

export function shortHash(hash: string | null | undefined): string {
  return hash ? hash.slice(0, 12) : "–";
}
