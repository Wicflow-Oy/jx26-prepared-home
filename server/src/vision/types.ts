import type { CheckDefinition, Lang, VisionAssessment } from "@prepared-home/engine";

export const VISION_EFFORTS = ["low", "medium", "high", "xhigh", "max"] as const;
export type VisionEffort = (typeof VISION_EFFORTS)[number];

export interface VisionImage {
  base64: string;
  mediaType: "image/jpeg";
  width: number;
  height: number;
}

export interface VisionInput {
  check: CheckDefinition;
  lang: Lang;
  image: VisionImage;
}

/** CONTRACTS §3. */
export interface VisionProvider {
  readonly name: string; // "anthropic" | "cached" | "mock"
  readonly model: string;
  assess(input: VisionInput): Promise<VisionAssessment>;
}

export interface UsageInfo {
  inputTokens: number;
  outputTokens: number;
}

/** What the live provider returns: the contract's assessment plus token usage for the spend guard. */
export type LiveAssessment = VisionAssessment & { usage?: UsageInfo };

export type Source = "cached" | "live" | "offline";
