// The welcome screen and setting up a home.
import type { Area } from "./types";

const en = {
  tagline: "Your new home, checked",
  homeTypeQuestion: "What kind of home is it?",
  leakAlarmQuestion: "Do you have a water leak alarm?",
  welcomeBody:
    "Photograph the spots that matter for water and fire damage. You get an answer for each one straight away.",
  getStarted: "Get started",
  moveInToday: "Moving in: today",
  moveInOn: "Moving in: {date}",
};

export const start: Area<typeof en> = {
  en,
  fi: {
    tagline: "Uusi kotisi, tarkistettu",
    homeTypeQuestion: "Millainen kotisi on?",
    leakAlarmQuestion: "Onko kodissasi vuotovahti?",
    welcomeBody:
      "Kuvaa kohdat, joilla on merkitystä vesi- ja palovahinkojen kannalta. Saat vastauksen jokaisesta heti.",
    getStarted: "Aloita",
    moveInToday: "Muuttopäivä: tänään",
    moveInOn: "Muuttopäivä: {date}",
  },
  sv: {
    tagline: "Ditt nya hem, kontrollerat",
    homeTypeQuestion: "Vilken typ av hem har du?",
    leakAlarmQuestion: "Har du en läckagevakt?",
    welcomeBody:
      "Fotografera de ställen som spelar roll för vatten- och brandskador. Du får svar på varje bild direkt.",
    getStarted: "Kom igång",
    moveInToday: "Inflyttning: i dag",
    moveInOn: "Inflyttning: {date}",
  },
};
