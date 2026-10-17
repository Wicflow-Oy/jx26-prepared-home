// What the app sends to and gets from the stateless /api/v1 routes (docs/CONTRACTS.md §9.1).
import type {
  CaptureSource,
  CheckOutcome,
  CheckRecord,
  Home,
  HomeType,
  Lang,
  Peril,
  Verdict,
} from "@prepared-home/engine";

export type CheckSource = "live" | "cached" | "offline";

export interface CheckResponse {
  outcome: CheckOutcome;
  record: CheckRecord;
  source: CheckSource;
  sourceNote?: string;
  model: string;
}

export interface Health {
  ok: boolean;
  provider: string;
  model: string;
  keySet: boolean;
  liveAvailable?: boolean;
}

export interface SamplePhoto {
  id: string;
  checkId: string;
  url: string;
  credit: string;
  author?: string;
  licence?: string;
  /** The file page on Wikimedia Commons. */
  sourceUrl?: string;
  expectedVerdict?: Verdict;
  urgent?: boolean;
  title?: string;
  width?: number;
  height?: number;
  /** Set when the server holds a saved live result for this sample. */
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
  /** The same item from a step to the side, taken right after the first photo. */
  secondImageBase64?: string;
  secondPhotoSha256?: string;
  userAnswers: Record<string, boolean>;
  /** How the photo was taken. Only "camera" counts toward the lower deductible. */
  capture: CaptureSource;
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
