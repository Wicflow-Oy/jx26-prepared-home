import path from "node:path";
import { fileURLToPath } from "node:url";

// Set to true by scripts/bundle.mjs (esbuild define). Undefined when run from source with tsx.
declare const __PH_BUNDLED__: boolean | undefined;

export const IS_BUNDLED = typeof __PH_BUNDLED__ !== "undefined" && __PH_BUNDLED__ === true;

/**
 * Base directory that relative paths resolve against.
 * - Bundled: the folder that holds server.mjs (e.g. /app in the container).
 * - From source: the server/ folder.
 */
export function baseDir(): string {
  const here = path.dirname(fileURLToPath(import.meta.url));
  return IS_BUNDLED ? here : path.resolve(here, "..");
}

export type StoreMode = "stateless" | "file";

export interface ServerConfig {
  port: number;
  storeMode: StoreMode;
  storePath: string;
  cacheDir: string; // assessments live in <cacheDir>/assessments/<sha>.json
  cacheWrite: boolean;
  samplesDir: string;
  webDist: string;
  apiKey: string | null;
  visionModel: string;
  visionEffort: "low" | "medium" | "high" | "xhigh" | "max" | null;
  trustProxy: number | false;
  ratePerIp10Min: number;
  dailyLiveLimit: number;
  dailySpendCapUsd: number;
  estCostPerCallUsd: number;
  corsOrigin: string;
  logSalt: string | null;
  production: boolean;
}

export const DEFAULT_VISION_MODEL = "claude-sonnet-5-5";

function num(env: NodeJS.ProcessEnv, key: string, fallback: number): number {
  const raw = env[key];
  if (raw === undefined || raw.trim() === "") return fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

function resolvePath(
  env: NodeJS.ProcessEnv,
  key: string,
  devDefault: string,
  bundledDefault: string,
): string {
  const base = baseDir();
  const raw = env[key];
  const value = raw && raw.trim() !== "" ? raw.trim() : IS_BUNDLED ? bundledDefault : devDefault;
  return path.resolve(base, value);
}

const EFFORTS = new Set(["low", "medium", "high", "xhigh", "max"]);

export function loadConfig(env: NodeJS.ProcessEnv = process.env): ServerConfig {
  const key = env.ANTHROPIC_API_KEY?.trim();
  const effort = env.VISION_EFFORT?.trim();
  const trust = env.TRUST_PROXY?.trim();
  let trustProxy: number | false = false;
  if (trust && trust !== "0" && trust.toLowerCase() !== "false") {
    const hops = Number(trust);
    trustProxy = Number.isInteger(hops) && hops > 0 ? hops : 1;
  }
  return {
    port: num(env, "PORT", 8787),
    storeMode: env.STORE_MODE?.trim() === "file" ? "file" : "stateless",
    storePath: resolvePath(env, "STORE_PATH", "data/store.json", "./data/store.json"),
    cacheDir: resolvePath(env, "CACHE_DIR", "cache", "./cache"),
    cacheWrite: env.CACHE_WRITE?.trim() === "1",
    samplesDir: resolvePath(env, "SAMPLES_DIR", "eval/photos", "./samples"),
    webDist: resolvePath(env, "WEB_DIST", "../app/dist", "./web"),
    apiKey: key ? key : null,
    visionModel: env.VISION_MODEL?.trim() || DEFAULT_VISION_MODEL,
    visionEffort: effort && EFFORTS.has(effort) ? (effort as ServerConfig["visionEffort"]) : null,
    trustProxy,
    ratePerIp10Min: num(env, "RATE_PER_IP_10MIN", 12),
    dailyLiveLimit: num(env, "DAILY_LIVE_LIMIT", 400),
    dailySpendCapUsd: num(env, "DAILY_SPEND_CAP_USD", 40),
    estCostPerCallUsd: num(env, "EST_COST_PER_CALL_USD", 0.05),
    corsOrigin: env.CORS_ORIGIN?.trim() || "*",
    logSalt: env.LOG_SALT?.trim() || null,
    production: env.NODE_ENV === "production",
  };
}
