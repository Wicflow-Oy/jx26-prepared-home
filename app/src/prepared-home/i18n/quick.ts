// The quick check every three months: a short checklist without photos.
import type { Area } from "./types";

const en = {
  quickTitle: "Quick home check",
  quickIntro: "Two minutes, every three months. No photos: look, tick and you're done.",
  quickNoEffect:
    "Optional. It doesn't change the lower deductible; the yearly photo checks keep that.",
  quickProgress: "{done} of {total} done",
  quickDue: "Next quick check: {date}",
  quickFinish: "Done",
  quickDoneBanner: "Done. Next quick check: {date}",
  quickCardTitle: "Quick home check, every 3 months",
  quickCardBody:
    "A two-minute checklist: under the sink, behind the fridge, the floor drain, the smoke alarm.",
  quickStart: "Start the quick check",
};

export const quick: Area<typeof en> = {
  en,
  fi: {
    quickTitle: "Pikatarkistus",
    quickIntro: "Kaksi minuuttia kolmen kuukauden välein. Ei kuvia: katso, rastita ja valmista.",
    quickNoEffect:
      "Vapaaehtoinen. Se ei muuta alempaa omavastuuta; sen pitävät voimassa vuosittaiset kuvatarkistukset.",
    quickProgress: "{done}/{total} tehty",
    quickDue: "Seuraava pikatarkistus: {date}",
    quickFinish: "Valmis",
    quickDoneBanner: "Valmis. Seuraava pikatarkistus: {date}",
    quickCardTitle: "Pikatarkistus 3 kuukauden välein",
    quickCardBody:
      "Kahden minuutin tarkistuslista: tiskipöydän alla, jääkaapin takana, lattiakaivo, palovaroitin.",
    quickStart: "Aloita pikatarkistus",
  },
  sv: {
    quickTitle: "Snabbkoll",
    quickIntro: "Två minuter var tredje månad. Inga bilder: titta, bocka av och klart.",
    quickNoEffect:
      "Frivillig. Den ändrar inte den lägre självrisken; den hålls av de årliga fotokontrollerna.",
    quickProgress: "{done} av {total} klara",
    quickDue: "Nästa snabbkoll: {date}",
    quickFinish: "Klar",
    quickDoneBanner: "Klart. Nästa snabbkoll: {date}",
    quickCardTitle: "Snabbkoll var tredje månad",
    quickCardBody:
      "En checklista på två minuter: under diskbänken, bakom kylen, golvbrunnen, brandvarnaren.",
    quickStart: "Starta snabbkollen",
  },
};
