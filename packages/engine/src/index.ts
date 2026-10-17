// Prepared Home (Valmis koti) engine: pure TypeScript, no runtime dependencies, no Node APIs.
// Used by the server (Node) and the app (Metro, browser). See docs/CONTRACTS.md §2.

export * from "./types";

export {
  CHECKS,
  checksFor,
  getCheck,
  appliesTo,
  isCheckId,
  ownerFor,
  criterionText,
  fixHintFor,
} from "./checks";
export { CLAUSES, CLAUSE_SOURCES, clauseText, clauseSource, clauseRefs } from "./clauses";
export {
  decideVerdict,
  notApplicableOutcome,
  recordFromOutcome,
  dueDateFor,
  effectiveRecords,
  perilStatuses,
  perilGroup,
  requiredChecks,
  reminders,
  homeCard,
  adjusterView,
  DEFAULT_DEDUCTIBLES,
  PERIL_GROUPS,
  FIX_FIRST_REMINDER_DAYS,
  FROST_WINDOW_DAYS,
  SHA_SHORT_LENGTH,
} from "./rules";
export type { DeductibleConfig, PerilGroup } from "./rules";
export {
  PERIL_LABELS,
  OWNER_LABELS,
  VERDICT_LABELS,
  STATE_LABELS,
  ALARM_DEVICE_LINE,
  DEDUCTIBLE_CONCEPT_LABEL,
  DISCLAIMER,
  ADJUSTER_NOTE,
  formatDay,
} from "./i18n";
export { DEMO, makeDemo, DEMO_CLAIM, DEMO_FLAT_ID, DEMO_FRESH_ID, DEMO_HOUSE_ID } from "./demo";
