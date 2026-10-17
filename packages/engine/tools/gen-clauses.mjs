#!/usr/bin/env node
// Generates src/data/clauses.ts from the verified clause files in
// context/analysis/if/demo-data/synthetic/ (clauses.json, clauses_sv.json, clauses_en_official.json).
// Usage: node tools/gen-clauses.mjs [sourceDir]
// The engine never imports JSON at runtime; it uses the generated TypeScript module.

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const defaultSource = path.resolve(here, "../../../../../context/analysis/if/demo-data/synthetic");
const sourceDir = path.resolve(process.argv[2] ?? defaultSource);
const outFile = path.resolve(here, "../src/data/clauses.ts");

const readJson = (name) => JSON.parse(readFileSync(path.join(sourceDir, name), "utf8"));

const fiFile = readJson("clauses.json");
const svFile = readJson("clauses_sv.json");
const enFile = readJson("clauses_en_official.json");

// Short topic translations. en comes from topic_en in clauses.json.
const TOPICS = {
  "OMA-5-intro-valvonta": {
    fi: "Rakennuksen valvonnan määritelmä",
    sv: "Definition av övervakning av byggnad",
  },
  "OMA-5-intro-laiminlyonti": {
    fi: "Suojeluohjeen laiminlyönnin seuraus",
    sv: "Följd av att försumma en säkerhetsföreskrift",
  },
  "OMA-4.1-vesieriste": {
    fi: "Rajoitus: vesi vesieristeen läpi tai vesieriste puuttuu",
    sv: "Undantag: vatten genom fuktbarriären eller fuktbarriär saknas",
  },
  "OMA-4.25": {
    fi: "Rajoitus: vahinko, jonka aikaa tai paikkaa ei voi määrittää",
    sv: "Undantag: skada som inte kan tids- eller platsbestämmas",
  },
  "OMA-5.2.4": { fi: "Nuohous", sv: "Sotning" },
  "OMA-5.2.6": { fi: "Palovaroittimet", sv: "Brandvarnare" },
  "OMA-5.2.7": { fi: "Vialliset sähkölaitteet", sv: "Trasiga elektriska anordningar" },
  "OMA-5.2.8": {
    fi: "Sähkötyöt vain hyväksytyillä liikkeillä",
    sv: "Elarbeten endast av godkända företag",
  },
  "OMA-5.2.12": {
    fi: "Tavaroiden kuivaus ja säilytys saunassa",
    sv: "Torkning och förvaring av egendom i bastun",
  },
  "OMA-5.2.15": {
    fi: "Liesi ja uuni valvotusti, ei syttyviä esineitä päällä tai lähellä",
    sv: "Spis och ugn under uppsikt, inget brännbart på eller nära",
  },
  "OMA-5.2.17": { fi: "Sähköpyörien ja akkujen lataus", sv: "Laddning av elcyklar och batterier" },
  "OMA-5.2.18": {
    fi: "Sähköauton lataus kiinteistön sähköverkosta",
    sv: "Laddning av elbil från fastighetens elnät",
  },
  "OMA-5.4.1": {
    fi: "Sade- ja sulamisvedet pois rakennuksesta",
    sv: "Regn- och smältvatten bort från byggnaden",
  },
  "OMA-5.4.2": {
    fi: "Ojat, salaojat ja hulevesijärjestelmät",
    sv: "Diken, täckdiken och dagvattensystem",
  },
  "OMA-5.5.1": {
    fi: "Riittävä lämmitys kylmänä vuodenaikana",
    sv: "Tillräcklig uppvärmning under den kalla årstiden",
  },
  "OMA-5.5.2": {
    fi: "Kylmäksi jätetty rakennus: putket tyhjiksi, lämmitys tarkistettava viikoittain",
    sv: "Byggnad som lämnas kall: töm rören, kontrollera värmen varje vecka",
  },
  "OMA-5.5.3": {
    fi: "Yli viikon asumatta: pääsulkuventtiili kiinni ja pumppu pois",
    sv: "Obebodd över en vecka: stäng huvudventilen och koppla från pumpen",
  },
  "OMA-5.5.4": { fi: "Ulkohanojen letkut", sv: "Slangar på utekranar" },
  "OMA-5.5.5": { fi: "Pumppaamon hälytin", sv: "Larm för pumpverk" },
  "OMA-5.5.6": {
    fi: "Pesukone: oma sulkuventtiili, hyväksytty letku, valvonta",
    sv: "Tvättmaskin: egen ventil, godkänd slang, övervakning",
  },
  "OMA-5.5.7": { fi: "Lattiakaivot ja hajulukot", sv: "Golvbrunnar och vattenlås" },
  "OMA-5.5.8": {
    fi: "Turvakaukalo pesukoneen ja kylmälaitteiden alle ilman lattiakaivoa",
    sv: "Tråg under tvättmaskin och kylanordningar utan golvbrunn",
  },
  "OMA-5.5.9": { fi: "Viemärijärjestelmä ja viemäripumput", sv: "Avloppssystem och avloppspumpar" },
  "OMA-5.5.10": { fi: "Öljysäiliöt ja niiden putkistot", sv: "Oljecisterner och deras rör" },
  "OMA-6.2.1.3": {
    fi: "Putkiston iän mukainen vähennys rakennuksen vuotovahingoissa",
    sv: "Avdrag enligt rörnätets ålder vid läckageskador på byggnaden",
  },
  "OMA-6.2.1.4": {
    fi: "Vuotuiset ikävähennykset LVIS- ja sähkölaitteista",
    sv: "Årliga åldersavdrag för VVSE- och elanordningar",
  },
  "OMA-6.4.1": {
    fi: "Ei omavastuuta, jos hälytinlaite esti tai rajoitti vahinkoa",
    sv: "Ingen självrisk om en larmanordning förhindrade eller begränsade skadan",
  },
  "YLE-5.1.1": {
    fi: "Yleinen velvollisuus noudattaa suojeluohjeita (vahinkovakuutus)",
    sv: "Allmän skyldighet att följa säkerhetsföreskrifter (skadeförsäkring)",
  },
};

// Document names per language, keyed by the Finnish version string in clauses.json.
const DOCUMENTS = {
  "Ehto OMA 200.27": {
    fi: "Kodin omaisuusvakuutusehdot, Ehto OMA 200.27 (voimassa 1.1.2026 alkaen)",
    sv: "Hemmets egendomsförsäkringsvillkor, Villkor OMA 200.27 (gäller från 1.1.2026)",
    en: "Home property insurance Terms and Conditions, Condition OMA 200.27, valid as of 1 January 2026",
  },
  "Ehto YLE 900.14": {
    fi: "Yleiset sopimusehdot, Ehto YLE 900.14 (voimassa 1.7.2025 alkaen)",
    sv: "Allmänna avtalsvillkor, Villkor YLE 900.14 (gäller från 1.7.2025)",
    en: "General terms and conditions, Condition YLE 900.14, valid as of 1 July 2025",
  },
};

// PDF extraction left list markers such as "6) " or "- " at the start of some sv/en strings.
const clean = (s) =>
  typeof s === "string"
    ? s
        .replace(/^\s*(?:\d+\)\s+|-\s+)/, "")
        .replace(/\s+/g, " ")
        .trim()
    : "";

const byId = (rows, field) => {
  const map = new Map();
  for (const row of rows) {
    if (row && row.found !== false && clean(row[field])) map.set(row.id, clean(row[field]));
  }
  return map;
};

const svById = byId(svFile, "sv");
const enById = byId(enFile, "en_official");

const clauses = {};
const sources = {};
for (const c of fiFile.clauses) {
  const topic = TOPICS[c.id];
  if (!topic)
    throw new Error(
      `Missing topic translation for ${c.id}; add it to TOPICS in tools/gen-clauses.mjs`,
    );
  const doc = DOCUMENTS[c.source?.version];
  if (!doc) throw new Error(`Unknown source version for ${c.id}: ${c.source?.version}`);

  const text = { fi: clean(c.fi) };
  const sv = svById.get(c.id);
  if (sv) text.sv = sv;
  const enOfficial = enById.get(c.id);
  const en = enOfficial ?? clean(c.en);
  if (en) text.en = en;

  clauses[c.id] = {
    id: c.id,
    section: c.section,
    topic: { fi: topic.fi, sv: topic.sv, en: c.topic_en },
    text,
    source: doc.fi,
  };
  sources[c.id] = {
    fi: doc.fi,
    ...(sv ? { sv: doc.sv } : {}),
    ...(en ? { en: enOfficial ? doc.en : `Team translation (not official) of ${doc.fi}` } : {}),
  };
}

const header = `// GENERATED by tools/gen-clauses.mjs. Do not edit by hand; re-run \`npm run gen:clauses\`.
// Source: context/analysis/if/demo-data/synthetic/clauses.json (fi, verbatim If terms),
// clauses_sv.json (sv, verbatim) and clauses_en_official.json (en, If's official English translation;
// the Finnish wording prevails). Leading list markers from PDF extraction are removed.
`;

const body = `${header}
import type { Clause, Lang } from "../types";

export const CLAUSES: Record<string, Clause> = ${JSON.stringify(clauses, null, 2)};

/** The document each language's text comes from. */
export const CLAUSE_SOURCES: Record<string, Partial<Record<Lang, string>>> = ${JSON.stringify(sources, null, 2)};
`;

writeFileSync(outFile, body, "utf8");
console.log(
  `Wrote ${Object.keys(clauses).length} clauses to ${path.relative(process.cwd(), outFile)}`,
);
