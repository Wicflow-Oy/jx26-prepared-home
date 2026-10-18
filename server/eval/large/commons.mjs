// Read-only Wikimedia Commons helpers for the large eval set (collect.mjs, fetch.mjs).
// One request per second at most, a fixed generic User-Agent, no login, and a back-off on 429/5xx.

import { createHash } from "node:crypto";

export const USER_AGENT = "Mozilla/5.0 (compatible; prepared-home-eval/1.0; read-only)";
export const API = "https://commons.wikimedia.org/w/api.php";
export const THUMB_WIDTH = 1280;

// At most one request per second overall. Thumbnail downloads (thumb. or upload.wikimedia.org) are spaced 11 s apart:
// at one per 1, 3 or 6 s, Commons answered 429 with a 10-minute Retry-After after 40 to 70 thumbnails, which fits a
// budget that refills at about six thumbnails a minute.
const MIN_GAP_MS = 1100;
const UPLOAD_GAP_MS = 11000;
let lastRequestAt = 0;

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export function sha256Hex(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

/** GET with at most one request per second (across the whole process) and a back-off on 429/502/503/504. */
export async function politeFetch(url, { attempts = 6 } = {}) {
  for (let i = 0; i < attempts; i++) {
    const gap = new URL(url).hostname === "commons.wikimedia.org" ? MIN_GAP_MS : UPLOAD_GAP_MS;
    const wait = lastRequestAt + gap - Date.now();
    if (wait > 0) await sleep(wait);
    lastRequestAt = Date.now();
    let res;
    try {
      res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
    } catch (err) {
      const backoff = Math.min(120_000, 5000 * 2 ** i);
      console.warn(
        `  network error (${err?.cause?.code ?? err?.name}), retrying in ${backoff / 1000} s`,
      );
      await sleep(backoff);
      continue;
    }
    if ([429, 502, 503, 504].includes(res.status)) {
      const retryAfter = Number(res.headers.get("retry-after"));
      const backoff =
        Number.isFinite(retryAfter) && retryAfter > 0
          ? retryAfter * 1000
          : Math.min(300_000, 10_000 * 2 ** i);
      console.warn(`  HTTP ${res.status}, backing off ${Math.round(backoff / 1000)} s`);
      await res.body?.cancel();
      await sleep(backoff);
      continue;
    }
    if (!res.ok) {
      await res.body?.cancel();
      throw new Error(`HTTP ${res.status} for ${url}`);
    }
    return res;
  }
  throw new Error(`gave up after ${attempts} attempts: ${url}`);
}

export async function apiQuery(params) {
  const url = `${API}?${new URLSearchParams({ action: "query", format: "json", formatversion: "2", ...params })}`;
  const res = await politeFetch(url);
  return res.json();
}

/** The thumbnail URL without the utm_* tracking parameters the API appends. */
export function cleanThumbUrl(url) {
  const u = new URL(url);
  for (const key of [...u.searchParams.keys()])
    if (key.startsWith("utm_")) u.searchParams.delete(key);
  return u.toString();
}

export async function download(url) {
  const res = await politeFetch(url);
  return Buffer.from(await res.arrayBuffer());
}

const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

/** Commons extmetadata values are HTML; this returns plain text. */
export function plainText(html) {
  if (typeof html !== "string") return "";
  return html
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]*>/g, "")
    .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
      if (e[0] === "#") {
        const code =
          e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
        return Number.isFinite(code) ? String.fromCodePoint(code) : m;
      }
      return ENTITIES[e.toLowerCase()] ?? m;
    })
    .replace(/\s+/g, " ")
    .trim();
}

/** Accepts CC0, public domain, CC BY and CC BY-SA (any version); returns null for anything else. */
export function acceptedLicence(meta) {
  const code = String(meta?.License?.value ?? "").toLowerCase();
  const short = plainText(meta?.LicenseShortName?.value ?? "");
  const url = plainText(meta?.LicenseUrl?.value ?? "");
  let family = null;
  if (code === "cc0" || /^cc0\b/i.test(short)) family = "CC0";
  else if (code.startsWith("pd") || /^public domain$/i.test(short)) family = "PD";
  else if (/^cc-by-sa-\d/.test(code)) family = "CC BY-SA";
  else if (/^cc-by-\d/.test(code)) family = "CC BY";
  if (!family) return null;
  const name = family === "PD" ? "Public domain" : short || family;
  // A licence name that says NC or ND is never accepted, whatever the code says.
  if (/\b(NC|ND)\b/.test(name)) return null;
  return { family, name, url: url || null, code };
}

/** Tidies a Commons author string for a credit line ("User:" prefixes, "(talk)", Commons' "assumed" wording). */
export function cleanAuthor(author) {
  let a = String(author ?? "").trim();
  const assumed = a.match(
    /^No machine-readable author provided\.\s*(.+?) assumed \(based on copyright claims\)\.?$/i,
  );
  if (assumed) a = `${assumed[1]} (author assumed by Commons from the copyright claim)`;
  a = a
    .replace(/\s*\(talk\)/gi, "")
    .replace(/^user:/i, "")
    .trim();
  return a;
}

export function hasPersonalityRestriction(meta) {
  return /personality/i.test(String(meta?.Restrictions?.value ?? ""));
}

/** The deterministic degradations used for synthetic hard cases (sharp, from the 1280 px thumbnail). */
export const SYNTHETIC_RECIPES = {
  blur: "Gaussian blur, sigma 28 (sharp 0.35), JPEG quality 85",
  dark: "Brightness multiplied by 0.04 (sharp linear), JPEG quality 85",
};

export async function degrade(bytes, kind) {
  const sharp = (await import("sharp")).default;
  const img = sharp(bytes).rotate();
  if (kind === "blur") img.blur(28);
  else if (kind === "dark") img.linear(0.04, 0);
  else throw new Error(`unknown synthetic kind: ${kind}`);
  return img.jpeg({ quality: 85 }).toBuffer();
}
