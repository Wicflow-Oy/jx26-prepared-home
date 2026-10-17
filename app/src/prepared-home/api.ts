// Typed client for the Prepared Home server (docs/CONTRACTS.md §5 and §9.1).
// The app uses the stateless /v1 routes; the §5 home-based routes are typed under `legacy` for STORE_MODE=file.
import type {
  AdjusterView,
  CheckDefinition,
  CheckOutcome,
  CheckRecord,
  FrostForecast,
  Home,
  HomeStatus,
  HomeType,
  Lang,
  Peril,
  Verdict,
} from "@prepared-home/engine";

export interface ClauseRef {
  id: string;
  text: string;
}

export type CheckWithClauses = CheckDefinition & { clause: ClauseRef[] };

export type CheckSource = "live" | "cached" | "offline";

export interface CheckResponse {
  outcome: CheckOutcome;
  record: CheckRecord;
  source: CheckSource;
  sourceNote?: string;
  model: string;
  clause: ClauseRef[];
}

export interface Health {
  ok: boolean;
  provider: "anthropic" | "cached" | "mock" | string;
  model: string;
  keySet: boolean;
  liveAvailable?: boolean;
  limits?: { perIpPer10Min: number; dailyLive: number; usedToday: number };
}

export interface SamplePhoto {
  id: string;
  checkId: string;
  url: string;
  credit: string;
  expectedVerdict?: Verdict;
  urgent?: boolean;
  title?: string;
  width?: number;
  height?: number;
  /** set when the server holds a recorded live result for this sample */
  recordedAt?: string;
}

export interface CheckRequest {
  homeId: string;
  homeType: HomeType;
  checkId: string;
  lang: Lang;
  imageBase64: string;
  width: number;
  height: number;
  photoSha256: string;
  userAnswers: Record<string, boolean>;
}

export interface SharedPhoto {
  checkId: string;
  imageBase64: string;
}

export interface ClaimRequest {
  home: Home;
  records: CheckRecord[];
  peril: Peril;
  lossDate: string;
  shared: SharedPhoto[];
}

export type ApiErrorKind = "offline" | "timeout" | "http" | "bad_response";

export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly status: number | null;
  constructor(kind: ApiErrorKind, status: number | null, message: string) {
    super(message);
    this.name = "ApiError";
    this.kind = kind;
    this.status = status;
  }
}

const DEFAULT_TIMEOUT_MS = 15_000;
const CHECK_TIMEOUT_MS = 90_000;

export function normalizeBaseUrl(url: string): string {
  return url.trim().replace(/\/+$/, "");
}

/** Turns a sample URL from the server into one the app can load. */
export function resolveAssetUrl(baseUrl: string, url: string): string {
  if (/^(https?:|data:|blob:)/i.test(url)) return url;
  if (url.startsWith("/")) {
    const origin = /^(https?:\/\/[^/]+)/i.exec(baseUrl)?.[1];
    return origin ? origin + url : url; // relative base on web: same origin
  }
  return `${normalizeBaseUrl(baseUrl)}/${url}`;
}

async function request<T>(
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
    clearTimeout(timer);
    if (controller.signal.aborted) throw new ApiError("timeout", null, "Request timed out");
    throw new ApiError("offline", null, "Server unreachable");
  }
  clearTimeout(timer);
  if (!response.ok) {
    throw new ApiError("http", response.status, `HTTP ${response.status}`);
  }
  try {
    return (await response.json()) as T;
  } catch {
    throw new ApiError("bad_response", response.status, "Response was not JSON");
  }
}

function query(params: Record<string, string | undefined>): string {
  const parts = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== "")
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v as string)}`);
  return parts.length ? `?${parts.join("&")}` : "";
}

function asString(v: unknown): string | undefined {
  return typeof v === "string" && v.length > 0 ? v : undefined;
}

function asNumber(v: unknown): number | undefined {
  return typeof v === "number" && Number.isFinite(v) ? v : undefined;
}

const VERDICTS: Verdict[] = ["verified", "retake", "fix_first", "not_applicable"];

/** Accepts the samples list as an array or as { samples: [...] }, with a few field-name variants. */
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
    const id = asString(o.id) ?? asString(o.sampleId) ?? asString(o.file) ?? asString(o.name);
    const checkId = asString(o.checkId);
    const url = asString(o.url) ?? asString(o.imageUrl) ?? asString(o.src);
    if (!id || !checkId || !url) continue;
    const expected = asString(o.expectedVerdict) ?? asString(o.expected);
    out.push({
      id,
      checkId,
      url,
      credit: asString(o.credit) ?? asString(o.attribution) ?? "",
      expectedVerdict:
        expected && (VERDICTS as string[]).includes(expected) ? (expected as Verdict) : undefined,
      urgent: typeof o.urgent === "boolean" ? o.urgent : undefined,
      title: asString(o.caption) ?? asString(o.title) ?? asString(o.note),
      width: asNumber(o.width),
      height: asNumber(o.height),
      recordedAt: asString(o.recordedAt),
    });
  }
  return out;
}

function isCheckResponse(v: unknown): v is CheckResponse {
  if (!v || typeof v !== "object") return false;
  const o = v as Partial<CheckResponse>;
  return (
    !!o.outcome &&
    typeof o.outcome.verdict === "string" &&
    !!o.record &&
    typeof o.record.checkId === "string"
  );
}

function isAdjusterView(v: unknown): v is AdjusterView {
  if (!v || typeof v !== "object") return false;
  const o = v as Partial<AdjusterView>;
  return (
    typeof o.claimId === "string" && typeof o.decision === "string" && Array.isArray(o.records)
  );
}

export function createApi(baseUrl: string) {
  const base = normalizeBaseUrl(baseUrl);
  return {
    baseUrl: base,

    // Stateless routes (§9.1). The app uses only these.
    health: () => request<Health>(base, "GET", "/v1/health"),
    checks: (homeType: HomeType, lang: Lang) =>
      request<CheckWithClauses[]>(base, "GET", `/v1/checks${query({ homeType, lang })}`),
    check: async (body: CheckRequest) => {
      const res = await request<unknown>(base, "POST", "/v1/check", body, CHECK_TIMEOUT_MS);
      if (!isCheckResponse(res))
        throw new ApiError("bad_response", null, "Unexpected check response");
      return res;
    },
    claim: async (body: ClaimRequest) => {
      const res = await request<unknown>(base, "POST", "/v1/claims", body, CHECK_TIMEOUT_MS);
      if (!isAdjusterView(res))
        throw new ApiError("bad_response", null, "Unexpected claim response");
      return res;
    },
    frost: (place: string) => request<FrostForecast>(base, "GET", `/v1/frost${query({ place })}`),
    samples: async (lang: Lang) =>
      normalizeSamples(await request<unknown>(base, "GET", `/v1/samples${query({ lang })}`)),
    resolveAssetUrl: (url: string) => resolveAssetUrl(base, url),

    // Home-based routes (§5), served only when the server runs with STORE_MODE=file.
    legacy: {
      health: () => request<Health>(base, "GET", "/health"),
      checks: (homeType: HomeType, lang: Lang) =>
        request<CheckWithClauses[]>(base, "GET", `/checks${query({ homeType, lang })}`),
      createHome: (body: {
        homeType: HomeType;
        label?: string;
        moveInDate: string;
        hasLeakAlarm: boolean;
      }) => request<Home>(base, "POST", "/homes", body),
      status: (homeId: string, lang: Lang) =>
        request<HomeStatus>(
          base,
          "GET",
          `/homes/${encodeURIComponent(homeId)}/status${query({ lang })}`,
        ),
      check: (
        homeId: string,
        checkId: string,
        body: Omit<CheckRequest, "homeId" | "homeType" | "checkId">,
      ) =>
        request<CheckResponse>(
          base,
          "POST",
          `/homes/${encodeURIComponent(homeId)}/checks/${encodeURIComponent(checkId)}`,
          body,
          CHECK_TIMEOUT_MS,
        ),
      notApplicable: (homeId: string, checkId: string) =>
        request<{ record: CheckRecord }>(
          base,
          "POST",
          `/homes/${encodeURIComponent(homeId)}/checks/${encodeURIComponent(checkId)}/not-applicable`,
          {},
        ),
      reset: (homeId: string) =>
        request<{ ok: boolean }>(base, "POST", `/homes/${encodeURIComponent(homeId)}/reset`, {}),
      demoHomes: () => request<Home[]>(base, "GET", "/demo/homes"),
      claim: (body: { homeId: string; peril: Peril; lossDate: string; shared: SharedPhoto[] }) =>
        request<AdjusterView>(base, "POST", "/claims", body, CHECK_TIMEOUT_MS),
      getClaim: (claimId: string) =>
        request<AdjusterView>(base, "GET", `/claims/${encodeURIComponent(claimId)}`),
      frost: (place: string) => request<FrostForecast>(base, "GET", `/frost${query({ place })}`),
    },
  };
}

export type Api = ReturnType<typeof createApi>;
