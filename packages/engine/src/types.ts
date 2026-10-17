// Shared contract for Prepared Home (Valmis koti). Engine, server and app all import these types.
// Change only additively; breaking changes need a joint decision (see docs/CONTRACTS.md).

export type Lang = "fi" | "sv" | "en";
export type HomeType = "flat" | "house" | "cottage";
export type Peril = "leak" | "fire" | "freeze" | "storm_water";

export type Localized = Record<Lang, string>;

/** visibility: the item must be in frame (false/null -> retake).
 *  condition: judged from the photo (false -> fix_first, null -> retake).
 *  user: answered by the customer in the app, never by the model (false -> fix_first). */
export type CriterionKind = "visibility" | "condition" | "user";

export interface Criterion {
  id: string; // e.g. "L2.hose_visible"
  kind: CriterionKind;
  text: Localized;
  /** Counts toward the verdict only in the cold season (October to April, see COLD_SEASON_MONTHS).
   *  Outside it the criterion is still judged and shown, with a note, but never gives retake or fix_first. */
  coldSeasonOnly?: boolean;
}

export type ClauseFit = "direct" | "section" | "exclusion" | "none";
export type Owner = "me" | "property_manager" | "professional";
export type Recheck =
  | { kind: "yearly" }
  | { kind: "seasonal"; months: number[] } // 1-12; due at the next listed month start
  | { kind: "frost" }; // before the first forecast frost (FMI), then yearly

export interface CheckDefinition {
  id: string; // "L1".."L6", "F1".."F5", "Z1", "Z2", "S1"
  peril: Peril;
  homeTypes: HomeType[];
  title: Localized;
  coach: Localized; // framing tip shown before the photo
  criteria: Criterion[];
  clauseIds: string[]; // must exist in the engine's clause data, e.g. "OMA-5.5.6"
  clauseFit: ClauseFit;
  guideNote?: Localized; // a tip or source note outside the terms (If's home guide, SPEK, Tukes); required when clauseFit is "none"
  relationNote?: Localized; // one line on how the check relates to its clause (e.g. L1 house: when 5.5.3 applies)
  notApplicableAllowed: boolean;
  defaultOwner: Partial<Record<HomeType, Owner>> & { default: Owner };
  fixHint: Localized; // cheapest typical fix if the check fails
  recheck: Recheck;
}

export interface Clause {
  id: string;
  section: string;
  topic: Localized;
  text: Partial<Localized>; // fi from the policy terms, sv from If's Swedish terms, en from If's official English translation
  source: string;
}

export type Verdict = "verified" | "retake" | "fix_first" | "not_applicable";

export interface Box {
  label: string;
  bbox_px: [number, number, number, number]; // x0, y0, x1, y1 in the image as sent
}

/** What the vision model returns (via the VisionProvider). Only visibility and condition criteria. */
export interface VisionAssessment {
  criteria: { id: string; met: boolean | null; note?: string }[];
  boxes: Box[];
  retakeHint?: string | null;
  fixSuggestion?: string | null;
  urgent?: boolean; // e.g. an active drip or exposed live parts
  reproduction?: boolean; // the photo shows a screen, a printout or another photo, not the real item
  model: string;
}

export interface CriterionResult {
  id: string;
  kind: CriterionKind;
  text: string; // in the requested language
  met: boolean | null;
  note?: string;
}

export interface CheckOutcome {
  checkId: string;
  verdict: Verdict;
  criteria: CriterionResult[];
  retakeHint: string | null;
  fix: { text: string; owner: Owner } | null;
  urgent: boolean;
  boxes: Box[];
}

/** How the photo was taken. Only in-app camera photos count toward the lower deductible. */
export type CaptureSource = "camera" | "library" | "sample";

/** What is kept per check (on the device, or by the server in file mode). Never image bytes. */
export interface CheckRecord {
  homeId: string;
  checkId: string;
  verdict: Verdict;
  checkedAt: string; // ISO datetime
  dueAt: string | null; // ISO date; null unless verified or not_applicable
  photoSha256: string | null; // hex of the exact JPEG bytes sent; null for not_applicable
  userAnswers?: Record<string, boolean>;
  capture?: CaptureSource; // absent on older records and seeded examples, which count as camera
}

export type PerilState = "prepared" | "in_progress" | "lapsed" | "not_started";

export interface DeductiblePreview {
  standard: number; // EUR
  prepared: number; // EUR
  current: number; // EUR
  label: "concept"; // always shown as "Concept: If decides the amount"
}

export interface PerilStatus {
  peril: Peril;
  state: PerilState;
  required: string[]; // check ids for this home type
  verified: string[];
  notApplicable: string[];
  fixFirst: string[];
  missing: string[];
  overdue: string[];
  notCounted: string[]; // verified from a gallery or example photo: shown, but not counted toward the relief
  preparedUntil: string | null; // ISO date: earliest dueAt among required checks, when prepared
  deductible: DeductiblePreview;
  alarmDeviceLine: boolean; // show OMA-6.4.1 when the customer says a leak alarm is fitted (leak only)
}

export type ReminderKind = "yearly" | "seasonal" | "frost" | "fix_first";

export interface Reminder {
  id: string;
  kind: ReminderKind;
  checkIds: string[];
  dueAt: string; // ISO date
  title: Localized;
  trigger?: string; // e.g. "FMI forecast minimum -1.2 °C on 2026-10-20"
}

export interface FrostForecast {
  place: string;
  fetchedAt: string;
  firstFrostDate: string | null; // first forecast day with minimum <= 0 °C, within the horizon
  minTempC: number | null;
  source: "fmi_live" | "fixture";
}

export interface Home {
  homeId: string;
  homeType: HomeType;
  label: string; // e.g. "Demo flat, Turku"
  moveInDate: string; // ISO date
  hasLeakAlarm: boolean;
  demo?: boolean;
}

export interface HomeCard {
  homeId: string;
  label: string;
  homeType: HomeType;
  generatedAt: string;
  perils: { peril: Peril; state: PerilState; preparedUntil: string | null }[];
  records: {
    checkId: string;
    verdict: Verdict;
    checkedAt: string;
    photoSha256Short: string | null;
  }[];
  shutOffNote: string | null; // where the water shuts off, from L1
  nextReminder: Reminder | null;
  disclaimer: string; // "A prompt to check, not an inspection."
}

export interface HomeStatus {
  home: Home;
  perils: PerilStatus[];
  reminders: Reminder[];
  homeCard: HomeCard;
}

export type ClaimDecision = "relief_applies" | "bonus_not_applied";

export interface AdjusterView {
  claimId: string;
  homeId: string;
  peril: Peril;
  lossDate: string;
  perilStateAtLoss: PerilState;
  records: {
    checkId: string;
    verdict: Verdict;
    checkedAt: string;
    validAtLoss: boolean;
    photoShared: boolean;
    hashMatches: boolean | null; // null if no photo shared
  }[];
  decision: ClaimDecision;
  deductible: DeductiblePreview;
  reasons: string[]; // human-readable, e.g. "L4 was fix_first and never re-taken"
  note: string; // "Cover is unchanged either way; only the deductible relief depends on the checks. A person decides."
}
