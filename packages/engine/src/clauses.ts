import type { CheckDefinition, Lang } from "./types";
import { CLAUSES, CLAUSE_SOURCES } from "./data/clauses";

export { CLAUSES, CLAUSE_SOURCES };

const FALLBACK: Lang[] = ["fi", "en"];

function pickLang(id: string, lang: Lang): Lang {
  const clause = CLAUSES[id];
  if (!clause) throw new Error(`Unknown clause id: ${id}`);
  for (const l of [lang, ...FALLBACK]) {
    if (clause.text[l]) return l;
  }
  throw new Error(`Clause ${id} has no text`);
}

/** Clause text in the requested language; falls back to fi, then en. Throws for an unknown id. */
export function clauseText(id: string, lang: Lang): string {
  return CLAUSES[id]!.text[pickLang(id, lang)]!;
}

/** The terms document the text returned by clauseText(id, lang) comes from. */
export function clauseSource(id: string, lang: Lang): string {
  const used = pickLang(id, lang);
  return CLAUSE_SOURCES[id]?.[used] ?? CLAUSES[id]!.source;
}

/** `{ id, text }` for each clause of a check, as the server returns it. */
export function clauseRefs(check: CheckDefinition, lang: Lang): { id: string; text: string }[] {
  return check.clauseIds.map((id) => ({ id, text: clauseText(id, lang) }));
}
