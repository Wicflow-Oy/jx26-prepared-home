// The quick check: every three months, a two-minute look at the spots behind most damage.
// No photos and no effect on the lower deductible; the yearly photo checks keep that.

import type { HomeType, Localized, Peril } from "./types";
import { checksFor } from "./checks";
import { addMonths } from "./dates";

/** A quick check is due this many months after moving in, or after the last one. */
export const QUICK_CHECK_MONTHS = 3;

export interface QuickCheckItem {
  id: string;
  peril: Peril;
  /** The photo check this item relates to; an item shows only when that check applies to the home. */
  checkId: string;
  text: Localized;
}

const t = (fi: string, sv: string, en: string): Localized => ({ fi, sv, en });

const EVERY_TIME: QuickCheckItem[] = [
  {
    id: "under-sink",
    peril: "leak",
    checkId: "L5",
    text: t(
      "Tiskipöydän alla: onko kaapin pohja kuiva, eikä vesilukko tiputa?",
      "Under diskbänken: är skåpets botten torr, utan droppar från vattenlåset?",
      "Under the kitchen sink: is the cabinet floor dry, with no drips from the trap?",
    ),
  },
  {
    id: "washer",
    peril: "leak",
    checkId: "L2",
    text: t(
      "Pesukone: letku ja hana eivät tiputa, ja lattia on kuiva.",
      "Tvättmaskinen: slangen och kranen droppar inte, och golvet är torrt.",
      "Washing machine: no drips at the hose or the tap, and the floor is dry.",
    ),
  },
  {
    id: "floor-drain",
    peril: "leak",
    checkId: "L5",
    text: t(
      "Lattiakaivo: nosta kansi, poista hiukset ja valuta vettä, että se vetää.",
      "Golvbrunnen: lyft locket, ta bort hår och spola vatten för att se att den drar.",
      "Floor drain: lift the cover, clear out the hair and run water to see it drains.",
    ),
  },
  {
    id: "smoke-alarm",
    peril: "fire",
    checkId: "F1",
    text: t(
      "Palovaroitin: paina testinappia ja kuuntele piippaus.",
      "Brandvarnaren: tryck på testknappen och lyssna efter pipet.",
      "Smoke alarm: press the test button and listen for the beep.",
    ),
  },
  {
    id: "fridge-dust",
    peril: "fire",
    checkId: "F3",
    text: t(
      "Jääkaapin takana: imuroi pölyt takaosasta ja lattialta.",
      "Bakom kylen: dammsug bort dammet från baksidan och golvet.",
      "Behind the fridge: vacuum the dust off the back and the floor.",
    ),
  },
];

// Seasonal items by month (1–12), for homes that have the related check.
const SPRING = [3, 4, 5];
const AUTUMN = [9, 10, 11];
const WINTER = [12, 1, 2];

const SEASONAL: { months: number[]; item: QuickCheckItem }[] = [
  {
    months: AUTUMN,
    item: {
      id: "gutters-autumn",
      peril: "storm_water",
      checkId: "S1",
      text: t(
        "Rännit: poista lehdet ennen sateita ja pakkasia.",
        "Takrännorna: rensa bort löven före regnen och frosten.",
        "Gutters: clear out the leaves before the rains and the frost.",
      ),
    },
  },
  {
    months: AUTUMN,
    item: {
      id: "outdoor-tap",
      peril: "freeze",
      checkId: "Z2",
      text: t(
        "Ulkohana: sulje sen sisäventtiili ja tyhjennä hana ennen pakkasia.",
        "Utekranen: stäng dess innerventil och töm kranen före frosten.",
        "Outdoor tap: close its indoor valve and drain the tap before the frost.",
      ),
    },
  },
  {
    months: WINTER,
    item: {
      id: "heating",
      peril: "freeze",
      checkId: "Z1",
      text: t(
        "Lämmitys: pidä kaikki huoneet lämpiminä, myös ne, joita et käytä.",
        "Värmen: håll alla rum varma, även de du inte använder.",
        "Heating: keep every room warm, including the ones you don't use.",
      ),
    },
  },
  {
    months: SPRING,
    item: {
      id: "gutters-spring",
      peril: "storm_water",
      checkId: "S1",
      text: t(
        "Rännit ja syöksytorvet: puhdista ne lumien sulettua ja katso, että vesi ohjautuu pois talosta.",
        "Takrännor och stuprör: rensa dem när snön har smält och se att vattnet leds bort från huset.",
        "Gutters and downpipes: clear them after the snow melts, and see that the water runs away from the house.",
      ),
    },
  },
];

/** When the next quick check is due: three months after moving in, or after the last one done. */
export function quickCheckDue(moveInDate: string, lastDone: string | null): string {
  return addMonths(lastDone ?? moveInDate, QUICK_CHECK_MONTHS);
}

/** The checklist for a home on a given day (YYYY-MM-DD): the core items plus the season's. */
export function quickCheckItems(homeType: HomeType, day: string): QuickCheckItem[] {
  const month = Number(day.slice(5, 7));
  const applies = new Set(checksFor(homeType).map((c) => c.id));
  const seasonal = SEASONAL.filter((s) => s.months.includes(month)).map((s) => s.item);
  return [...EVERY_TIME, ...seasonal].filter((item) => applies.has(item.checkId));
}
