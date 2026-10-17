// Fixed UI and rule texts in fi, sv and en. Kept short and plain.

import type { Lang, Localized, Owner, Peril, PerilState, Verdict } from "./types";

const t = (fi: string, sv: string, en: string): Localized => ({ fi, sv, en });

export const PERIL_LABELS: Record<Peril, Localized> = {
  leak: t("Vesivuoto", "Läckage", "Leak"),
  fire: t("Tulipalo", "Brand", "Fire"),
  freeze: t("Jäätyminen", "Frysning", "Freezing"),
  storm_water: t("Hulevesi", "Dagvatten", "Storm water"),
};

export const OWNER_LABELS: Record<Owner, Localized> = {
  me: t("Sinä", "Du", "You"),
  property_manager: t("Isännöitsijä", "Disponenten", "The property manager"),
  professional: t("Ammattilainen", "En fackman", "A professional"),
};

export const VERDICT_LABELS: Record<Verdict, Localized> = {
  verified: t("Kunnossa", "I ordning", "Verified"),
  retake: t("Ota uusi kuva", "Ta en ny bild", "Retake"),
  fix_first: t("Korjaa ensin", "Åtgärda först", "Fix first"),
  not_applicable: t("Ei koske kotiani", "Gäller inte mitt hem", "Not applicable"),
};

export const STATE_LABELS: Record<PerilState, Localized> = {
  prepared: t("Valmis", "Redo", "Prepared"),
  in_progress: t("Kesken", "Pågår", "In progress"),
  lapsed: t("Vanhentunut", "Har gått ut", "Lapsed"),
  not_started: t("Ei aloitettu", "Inte påbörjad", "Not started"),
};

/** OMA-6.4.1, shown with the leak status when the customer says a leak alarm is fitted. */
export const ALARM_DEVICE_LINE: Localized = t(
  "Omavastuuta ei vähennetä, jos hälytyslaite esti vahingon tai rajoitti sitä (ehtojen kohta 6.4.1).",
  "Ingen självrisk dras av om en larmanordning förhindrade eller begränsade skadan (villkorens punkt 6.4.1).",
  "No deductible if an alarm device prevented or limited the damage (terms 6.4.1).",
);

/** Shown next to every deductible amount. */
export const DEDUCTIBLE_CONCEPT_LABEL: Localized = t(
  "Konsepti: If päättää summan",
  "Koncept: If bestämmer beloppet",
  "Concept: If decides the amount",
);

export const DISCLAIMER: Localized = t(
  "Muistutus omista tarkistuksista, ei kuntotarkastus.",
  "En påminnelse om att kontrollera, inte en besiktning.",
  "A reminder to check, not an inspection.",
);

export const ADJUSTER_NOTE =
  "Cover is unchanged either way; only the deductible relief depends on the checks. A person decides.";

export const TEXT = {
  couldNotCheck: t(
    "Kuvaa ei voitu tarkistaa. Yritä uudelleen.",
    "Det gick inte att kontrollera bilden. Försök igen.",
    "Could not check the photo. Try again.",
  ),
  retakeVisible: t(
    "Ota uusi kuva. Varmista: {items}.",
    "Ta en ny bild. Kontrollera: {items}.",
    "Take a new photo. Make sure: {items}.",
  ),
  retakeCondition: t(
    "Ota tarkempi kuva lähempää. Emme voineet arvioida: {items}.",
    "Ta en skarpare bild på närmare håll. Vi kunde inte bedöma: {items}.",
    "Take a closer, sharper photo. We could not judge: {items}.",
  ),
  reproduction: t(
    "Kuvaa itse kohde, älä näyttöä tai tulostettua kuvaa.",
    "Fotografera själva föremålet, inte en skärm eller ett utskrivet foto.",
    "Photograph the real item, not a screen or a printed photo.",
  ),
  answerPrompt: t(
    "Vastaa kyllä tai ei: {items}.",
    "Svara ja eller nej: {items}.",
    "Answer yes or no: {items}.",
  ),
  coldSeasonOnly: t(
    "Lasketaan vain kylmänä vuodenaikana, lokakuusta huhtikuuhun.",
    "Räknas bara under den kalla årstiden, från oktober till april.",
    "Counts only in the cold season, from October to April.",
  ),
  shutOffChecked: t(
    "Sulkuventtiili tarkistettu {date}.",
    "Avstängningsventilen kontrollerad {date}.",
    "Shut-off valve verified on {date}.",
  ),
  shutOffFix: t(
    "Sulkuventtiili löytyi {date}, mutta se pitää korjata.",
    "Avstängningsventilen hittades {date}, men den behöver åtgärdas.",
    "Shut-off valve found on {date}, but it needs fixing.",
  ),
  yearlyOne: t("Vuositarkistus: {title}", "Årlig kontroll: {title}", "Yearly re-check: {title}"),
  yearlyMany: t(
    "Vuositarkistus: {n} kohdetta",
    "Årlig kontroll: {n} kontroller",
    "Yearly re-check: {n} checks",
  ),
  seasonalOne: t(
    "Kausitarkistus: {title}",
    "Säsongskontroll: {title}",
    "Seasonal re-check: {title}",
  ),
  seasonalMany: t(
    "Kausitarkistus: {n} kohdetta",
    "Säsongskontroll: {n} kontroller",
    "Seasonal re-check: {n} checks",
  ),
  fixFirst: t(
    "Korjaa ja ota uusi kuva: {title}",
    "Åtgärda och ta en ny bild: {title}",
    "Fix it and take a new photo: {title}",
  ),
  frost: t(
    "Pakkasta luvassa: tarkista ulkohana",
    "Frost väntas: kontrollera utekranen",
    "Frost is coming: check the outdoor tap",
  ),
} satisfies Record<string, Localized>;

const QUOTES: Record<Lang, [string, string]> = { fi: ["”", "”"], sv: ["”", "”"], en: ["“", "”"] };

export function quote(text: string, lang: Lang): string {
  const [open, close] = QUOTES[lang];
  return `${open}${text}${close}`;
}

/** Replaces {name} placeholders. */
export function fill(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in vars ? String(vars[key]) : match,
  );
}

/** Builds a Localized from a template per language. */
export function localize(
  template: Localized,
  vars: (lang: Lang) => Record<string, string | number>,
): Localized {
  return {
    fi: fill(template.fi, vars("fi")),
    sv: fill(template.sv, vars("sv")),
    en: fill(template.en, vars("en")),
  };
}

const EN_MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/** "2026-10-12" -> fi/sv "12.10.2026", en "12 Oct 2026". */
export function formatDay(day: string, lang: Lang): string {
  const [y, m, d] = day.split("-").map(Number) as [number, number, number];
  if (lang === "en") return `${d} ${EN_MONTHS[m - 1]} ${y}`;
  return `${d}.${m}.${y}`;
}
