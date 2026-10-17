import { ApiError } from "./api";
import type { Translate } from "./i18n";

/** A friendly, honest message for a failed request. Never a fake result. */
export function errorMessage(err: unknown, t: Translate): string {
  if (err instanceof ApiError) {
    switch (err.kind) {
      case "offline":
        return t("errOffline");
      case "timeout":
        return t("errTimeout");
      case "bad_response":
        return t("errBadResponse");
      case "http":
        if (err.status === 409) return t("errHashMismatch");
        if (err.status === 413) return t("errTooLarge");
        return t("errHttp", { status: err.status ?? "?" });
    }
  }
  // Sample downloads run outside the API client.
  const status = err instanceof Error ? /^HTTP (\d{3})/.exec(err.message)?.[1] : undefined;
  if (status) return t("errHttp", { status });
  return t("errOffline");
}
