// Fixed UI and rule texts in fi, sv and en. Kept short and plain.

import type { Lang, Localized, Owner, Peril, PerilState, Verdict } from "./types";

const t = (fi: string, sv: string, en: string): Localized => ({ fi, sv, en });

export const PERIL_LABELS: Record<Peril, Localized> = {
  leak: t("Vuodot", "Läckage", "Leak"),
  fire: t("Tulipalo", "Brand", "Fire"),
  freeze: t("Jäätyminen", "Frysning", "Freeze"),
  storm_water: t("Hulevesi", "Dagvatten", "Storm water"),
};

export const OWNER_LABELS: Record<Owner, Localized> = {
  me: t("Sinä", "Du", "You"),
  property_manager: t("Isännöitsijä", "Disponenten", "Property manager"),
  professional: t("Ammattilainen", "En fackman", "A professional"),
};

export const VERDICT_LABELS: Record<Verdict, Localized> = {
  verified: t("Tarkistettu", "Kontrollerad", "Verified"),
  retake: t("Ota uusi kuva", "Ta en ny bild", "Retake"),
  fix_first: t("Korjaa ensin", "Åtgärda först", "Fix first"),
  not_applicable: t("Ei koske minua", "Gäller inte mig", "Not applicable"),
};

export const STATE_LABELS: Record<PerilState, Localized> = {
  prepared: t("Valmis", "Klar", "Prepared"),
  in_progress: t("Kesken", "Pågår", "In progress"),
  lapsed: t("Vanhentunut", "Har gått ut", "Lapsed"),
  not_started: t("Ei aloitettu", "Inte påbörjad", "Not started"),
};

/** OMA-6.4.1, shown with the leak status when the customer says a leak alarm is fitted. */
export const ALARM_DEVICE_LINE: Localized = t(
  "Omavastuuta ei vähennetä, jos hälytinlaite esti vahingon tai rajoitti sitä (ehdot 6.4.1).",
  "Ingen självrisk dras av om en larmanordning förhindrade eller begränsade skadan (villkor 6.4.1).",
  "No deductible if an alarm device prevented or limited the damage (terms 6.4.1).",
);

/** Shown next to every deductible amount. */
export const DEDUCTIBLE_CONCEPT_LABEL: Localized = t(
  "Konsepti: If päättää summan",
  "Koncept: If bestämmer beloppet",
  "Concept: If decides the amount",
);

export const DISCLAIMER: Localized = t(
  "Muistutus tarkistaa, ei tarkastus.",
  "En påminnelse att kontrollera, inte en besiktning.",
  "A prompt to check, not an inspection.",
);

export const ADJUSTER_NOTE =
  "Cover is unchanged either way; only the deductible relief depends on the checks. A person decides.";

export const TEXT = {
  couldNotCheck: t("Kuvaa ei voitu tarkistaa. Yritä uudelleen.", "Bilden kunde inte kontrolleras. Försök igen.", "Couldn't check the photo. Try again."),
  retakeVisible: t("Ota uusi kuva. Varmista: {items}.", "Ta en ny bild. Se till att: {items}.", "Take a new photo. Make sure: {items}."),
  retakeCondition: t(
    "Ota lähempää ja tarkempi kuva. Emme voineet arvioida: {items}.",
    "Ta en närmare och skarpare bild. Vi kunde inte bedöma: {items}.",
    "Take a closer, sharper photo. We couldn't judge: {items}.",
  ),
  answerPrompt: t("Vastaa kyllä tai ei: {items}.", "Svara ja eller nej: {items}.", "Please answer yes or no: {items}."),
  shutOffChecked: t("Veden sulku tarkistettu {date}.", "Vattenavstängningen kontrollerad {date}.", "Water shut-off checked on {date}."),
  shutOffFix: t(
    "Veden sulku löydetty {date}, mutta se vaatii korjausta.",
    "Vattenavstängningen hittad {date}, men den behöver åtgärdas.",
    "Water shut-off found on {date}, but it needs a fix.",
  ),
  yearlyOne: t("Vuositarkistus: {title}", "Årlig kontroll: {title}", "Yearly re-check: {title}"),
  yearlyMany: t("Vuositarkistus: {n} kohdetta", "Årlig kontroll: {n} kontroller", "Yearly re-check: {n} checks"),
  seasonalOne: t("Kauden tarkistus: {title}", "Säsongskontroll: {title}", "Seasonal check: {title}"),
  seasonalMany: t("Kauden tarkistus: {n} kohdetta", "Säsongskontroll: {n} kontroller", "Seasonal check: {n} checks"),
  fixFirst: t("Korjaa ja ota uusi kuva: {title}", "Åtgärda och ta en ny bild: {title}", "Fix it and take a new photo: {title}"),
  frost: t("Pakkasta luvassa: tarkista ulkohana", "Frost väntas: kontrollera utekranen", "Frost is coming: check the outdoor tap"),
} satisfies Record<string, Localized>;

const QUOTES: Record<Lang, [string, string]> = { fi: ["”", "”"], sv: ["”", "”"], en: ["“", "”"] };

export function quote(text: string, lang: Lang): string {
  const [open, close] = QUOTES[lang];
  return `${open}${text}${close}`;
}

/** Replaces {name} placeholders. */
export function fill(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => (key in vars ? String(vars[key]) : match));
}

/** Builds a Localized from a template per language. */
export function localize(template: Localized, vars: (lang: Lang) => Record<string, string | number>): Localized {
  return {
    fi: fill(template.fi, vars("fi")),
    sv: fill(template.sv, vars("sv")),
    en: fill(template.en, vars("en")),
  };
}

const EN_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2026-10-12" -> fi/sv "12.10.2026", en "12 Oct 2026". */
export function formatDay(day: string, lang: Lang): string {
  const [y, m, d] = day.split("-").map(Number) as [number, number, number];
  if (lang === "en") return `${d} ${EN_MONTHS[m - 1]} ${y}`;
  return `${d}.${m}.${y}`;
}
