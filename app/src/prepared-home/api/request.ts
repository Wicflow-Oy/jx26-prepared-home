// One JSON request with a timeout, turning every failure into an ApiError the screens can explain.
import { ApiError } from "./types";

const DEFAULT_TIMEOUT_MS = 15_000;
/** A live check sends a photo to the model, so it may take much longer than other calls. */
export const CHECK_TIMEOUT_MS = 90_000;

export function normalizeBaseUrl(url: string): string {
  return url.trim().replace(/\/+$/, "");
}

/** Turns a sample URL from the server into one the app can load. */
export function resolveAssetUrl(baseUrl: string, url: string): string {
  if (/^(https?:|data:|blob:)/i.test(url)) return url;
  if (url.startsWith("/")) {
    const origin = /^(https?:\/\/[^/]+)/i.exec(baseUrl)?.[1];
    return origin ? origin + url : url; // a relative base on the web means the same origin
  }
  return `${normalizeBaseUrl(baseUrl)}/${url}`;
}

export function query(params: Record<string, string | undefined>): string {
  const parts = Object.entries(params)
    .filter((entry): entry is [string, string] => !!entry[1])
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`);
  return parts.length ? `?${parts.join("&")}` : "";
}

export async function request<T>(
  baseUrl: string,
  method: "GET" | "POST",
  path: string,
  body?: unknown,
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let response: Response;
  try {
    response = await fetch(`${normalizeBaseUrl(baseUrl)}${path}`, {
      method,
      headers:
        body === undefined
          ? { Accept: "application/json" }
          : { Accept: "application/json", "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
  } catch {
    if (controller.signal.aborted) throw new ApiError("timeout", null, "Request timed out");
    throw new ApiError("offline", null, "Server unreachable");
  } finally {
    clearTimeout(timer);
  }
  if (!response.ok) throw new ApiError("http", response.status, `HTTP ${response.status}`);
  try {
    return (await response.json()) as T;
  } catch {
    throw new ApiError("bad_response", response.status, "Response was not JSON");
  }
}
