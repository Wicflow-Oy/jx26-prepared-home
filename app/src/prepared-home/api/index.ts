// Typed client for the stateless /api/v1 routes. The server keeps nothing; the app keeps the records.
import type { FrostForecast, Lang } from "@prepared-home/engine";

import { CHECK_TIMEOUT_MS, normalizeBaseUrl, query, request, resolveAssetUrl } from "./request";
import { ApiError, type CheckRequest, type ClaimRequest, type Health } from "./types";
import { isAdjusterView, isCheckResponse, normalizeSamples } from "./validate";

export * from "./types";

export function createApi(baseUrl: string) {
  const base = normalizeBaseUrl(baseUrl);
  return {
    baseUrl: base,
    health: () => request<Health>(base, "GET", "/v1/health"),
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
  };
}

export type Api = ReturnType<typeof createApi>;
