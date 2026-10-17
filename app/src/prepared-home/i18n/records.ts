// Reminders and the Home Card.
import type { Area } from "./types";

const en = {
  cardTitle: "Home Card",
  cardIntro: "A summary of your checks to keep, or to show if something happens.",
  shutOff: "Where the water shuts off",
  cardRecords: "Checks",
  checkedOn: "Checked {date}",
  photoHash: "Photo fingerprint {hash}",
  noPhoto: "No photo",
  cardEmpty: "No checks yet. Your Home Card fills in as you go.",
  generatedOn: "Created {date}",
  nextReminder: "Next reminder",
  remindersTitle: "Reminders",
  remindersIntro:
    "Reminders come from your checks and the weather forecast. They are prompts, not alarms.",
  due: "Due {date}",
  remindersEmpty: "No reminders yet. Each verified check adds its re-check here.",
  frostInfo:
    "Finnish Meteorological Institute open data, forecast for {place}: first frost {date}, lowest {temp} °C (CC BY 4.0).",
  frostNone:
    "Finnish Meteorological Institute open data, forecast for {place}: no frost expected (CC BY 4.0).",
  frostSample: " (sample forecast)",
  frostUnavailable:
    "The frost forecast is not available right now, so frost reminders use the usual date.",
  "reminder.yearly": "Yearly",
  "reminder.seasonal": "Seasonal",
  "reminder.frost": "Before frost",
  "reminder.fix_first": "Fix first",
};

export const records: Area<typeof en> = {
  en,
  fi: {
    cardTitle: "Kotikortti",
    cardIntro: "Yhteenveto tarkistuksistasi talteen tai näytettäväksi, jos jotain sattuu.",
    shutOff: "Mistä vesi suljetaan",
    cardRecords: "Tarkistukset",
    checkedOn: "Tarkistettu {date}",
    photoHash: "Kuvan sormenjälki {hash}",
    noPhoto: "Ei kuvaa",
    cardEmpty: "Ei vielä tarkistuksia. Kotikortti täyttyy edetessäsi.",
    generatedOn: "Luotu {date}",
    nextReminder: "Seuraava muistutus",
    remindersTitle: "Muistutukset",
    remindersIntro:
      "Muistutukset perustuvat tarkistuksiisi ja sääennusteeseen. Ne eivät ole hälytyksiä.",
    due: "Viimeistään {date}",
    remindersEmpty:
      "Ei vielä muistutuksia. Kunnossa olevien kohtien uusintatarkistukset näkyvät täällä.",
    frostInfo:
      "Ilmatieteen laitoksen avoin data, ennuste, {place}: ensimmäinen pakkanen {date}, alin {temp} °C (CC BY 4.0).",
    frostNone:
      "Ilmatieteen laitoksen avoin data, ennuste, {place}: pakkasta ei ole ennustettu (CC BY 4.0).",
    frostSample: " (esimerkkiennuste)",
    frostUnavailable:
      "Pakkasennuste ei ole nyt saatavilla, joten pakkasmuistutus tulee tavalliseen aikaan.",
    "reminder.yearly": "Vuosittain",
    "reminder.seasonal": "Kausittain",
    "reminder.frost": "Ennen pakkasia",
    "reminder.fix_first": "Korjaa ensin",
  },
  sv: {
    cardTitle: "Hemkort",
    cardIntro:
      "En sammanfattning av dina kontroller som du kan spara eller visa upp om något händer.",
    shutOff: "Var vattnet stängs av",
    cardRecords: "Kontroller",
    checkedOn: "Kontrollerad {date}",
    photoHash: "Bildens fingeravtryck {hash}",
    noPhoto: "Ingen bild",
    cardEmpty: "Inga kontroller ännu. Hemkortet fylls i efter hand.",
    generatedOn: "Skapat {date}",
    nextReminder: "Nästa påminnelse",
    remindersTitle: "Påminnelser",
    remindersIntro: "Påminnelserna bygger på dina kontroller och väderprognosen. De är inga larm.",
    due: "Senast {date}",
    remindersEmpty: "Inga påminnelser ännu. Omkontrollerna för punkter som är i ordning visas här.",
    frostInfo:
      "Meteorologiska institutets öppna data, prognos för {place}: första frost {date}, lägst {temp} °C (CC BY 4.0).",
    frostNone:
      "Meteorologiska institutets öppna data, prognos för {place}: ingen frost väntas (CC BY 4.0).",
    frostSample: " (exempelprognos)",
    frostUnavailable:
      "Frostprognosen är inte tillgänglig just nu, så frostpåminnelsen kommer vid den vanliga tiden.",
    "reminder.yearly": "Årligen",
    "reminder.seasonal": "Säsongsvis",
    "reminder.frost": "Före frosten",
    "reminder.fix_first": "Åtgärda först",
  },
};
