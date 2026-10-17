import {
  type CaptureSource,
  CHECKS,
  checksFor,
  clauseRefs,
  decideVerdict,
  getCheck,
  isCheckId,
  recordFromOutcome,
  type CheckDefinition,
  type CheckOutcome,
  type CheckRecord,
  type HomeType,
  type Lang,
} from "@prepared-home/engine";
import type { Request } from "express";
import type { AppDeps } from "../deps";
import type { Source } from "../vision/types";
import { HttpError, type ReceivedImage } from "../validate";

/** The check with this home type's wording (L1 and Z1 differ by home type). 404 for an unknown id, 400 if it doesn't apply. */
export function checkForHome(checkId: unknown, homeType: HomeType): CheckDefinition {
  if (typeof checkId !== "string" || !isCheckId(checkId))
    throw new HttpError(404, "unknown_check", "Unknown check id");
  const check = getCheck(checkId, homeType);
  if (!check.homeTypes.includes(homeType)) {
    throw new HttpError(
      400,
      "check_not_for_home_type",
      `Check ${check.id} does not apply to a ${homeType}`,
    );
  }
  return check;
}

export function checksView(homeType: HomeType | null, lang: Lang) {
  const list = homeType ? checksFor(homeType) : CHECKS;
  return list.map((check) => ({ ...check, clause: clauseRefs(check, lang) }));
}

export function clientKey(deps: AppDeps, req: Request): string {
  return deps.ipHash(req.ip ?? req.socket.remoteAddress ?? "unknown");
}

export interface CheckResponse {
  outcome: CheckOutcome;
  record: CheckRecord;
  source: Source;
  sourceNote?: string;
  model: string;
  clause: { id: string; text: string }[];
}

/** One photo check: vision chain → engine verdict → record. Logs only check id, verdict, source and duration. */
export async function runCheck(
  deps: AppDeps,
  args: {
    check: CheckDefinition;
    homeId: string;
    homeType: HomeType;
    lang: Lang;
    image: ReceivedImage;
    secondImage?: ReceivedImage;
    userAnswers: Record<string, boolean>;
    clientKey: string;
    capture?: CaptureSource;
  },
): Promise<CheckResponse> {
  const started = Date.now();
  const { check, homeId, homeType, lang, image, userAnswers } = args;
  const result = await deps.chain.assess({
    check,
    lang,
    image: {
      base64: image.base64,
      mediaType: "image/jpeg",
      width: image.width,
      height: image.height,
    },
    ...(args.secondImage
      ? {
          secondImage: {
            base64: args.secondImage.base64,
            mediaType: "image/jpeg" as const,
            width: args.secondImage.width,
            height: args.secondImage.height,
          },
        }
      : {}),
    sha256: image.sha256,
    clientKey: args.clientKey,
  });
  // Only the check's own user criteria are passed on; the model never answers them.
  const userIds = new Set(check.criteria.filter((c) => c.kind === "user").map((c) => c.id));
  const answers = Object.fromEntries(Object.entries(userAnswers).filter(([k]) => userIds.has(k)));
  const outcome = decideVerdict(check, result.assessment, answers, lang, homeType);
  const record = recordFromOutcome(
    homeId,
    outcome,
    deps.clock(),
    image.sha256,
    homeType,
    args.capture,
  );
  if (args.secondImage) record.secondPhotoSha256 = args.secondImage.sha256;
  deps.logger.check({
    checkId: check.id,
    verdict: outcome.verdict,
    source: result.source,
    ms: Date.now() - started,
  });
  const response: CheckResponse = {
    outcome,
    record,
    source: result.source,
    model: result.model,
    clause: clauseRefs(check, lang),
  };
  if (result.sourceNote) response.sourceNote = result.sourceNote;
  return response;
}

export async function healthBase(deps: AppDeps) {
  const keySet = deps.chain.live !== null;
  const cached = keySet ? 0 : await deps.chain.cache.count();
  const provider = keySet ? "anthropic" : cached > 0 ? "cached" : "mock";
  const model = keySet ? deps.chain.live!.model : provider === "cached" ? "cached" : "mock";
  return { ok: true, provider, model, keySet };
}
