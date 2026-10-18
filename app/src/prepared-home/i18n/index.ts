// UI strings in English, Finnish and Swedish, kept by area in small typed dictionaries.
// Check titles, coach lines, criteria and clause texts come from the engine or the server, not from here.
import type { ClauseFit, CriterionKind, Lang, ReminderKind } from "@prepared-home/engine";

import { check } from "./check";
import { claim } from "./claim";
import { common } from "./common";
import { demo } from "./demo";
import { home } from "./home";
import { quick } from "./quick";
import { records } from "./records";
import { result } from "./result";
import { settings } from "./settings";
import { start } from "./start";
import { status } from "./status";
import { voice } from "./voice";

export {
  addDaysIso,
  formatDate,
  formatDecimal,
  formatMoney,
  localizeDates,
  todayIso,
} from "./format";

const AREAS = [
  common,
  start,
  home,
  check,
  demo,
  result,
  status,
  quick,
  records,
  claim,
  settings,
  voice,
];

const en = {
  ...common.en,
  ...start.en,
  ...home.en,
  ...check.en,
  ...demo.en,
  ...result.en,
  ...status.en,
  ...quick.en,
  ...records.en,
  ...claim.en,
  ...settings.en,
  ...voice.en,
};

export type StringKey = keyof typeof en;
export type Params = Record<string, string | number>;
export type Translate = (key: StringKey, params?: Params) => string;

const merge = (lang: "fi" | "sv") =>
  Object.assign({}, ...AREAS.map((a) => a[lang])) as Record<StringKey, string>;

const STRINGS: Record<Lang, Record<StringKey, string>> = { en, fi: merge("fi"), sv: merge("sv") };

export const LANGS: { code: Lang; name: string }[] = [
  { code: "fi", name: "Suomi" },
  { code: "sv", name: "Svenska" },
  { code: "en", name: "English" },
];

export function translate(lang: Lang, key: StringKey, params?: Params): string {
  const template = STRINGS[lang]?.[key] ?? en[key];
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match,
  );
}

/** A string in every language, e.g. to recognise a label saved in another language. */
export const allTranslations = (key: StringKey): string[] =>
  LANGS.map((l) => translate(l.code, key));

export const kindKey = (k: CriterionKind) => `kind.${k}` as StringKey;
export const fitKey = (f: ClauseFit) => `fit.${f}` as StringKey;
export const reminderKey = (k: ReminderKind) => `reminder.${k}` as StringKey;
