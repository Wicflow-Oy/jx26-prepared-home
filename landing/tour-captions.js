// Words for the guided tour. English is the agreed source text; Finnish and Swedish follow it
// without adding claims. Numbers shown big on the stage must match the caption text exactly.

// Fixed order, shared with the app (tour contract v1).
export const STEPS = [
  "start",
  "choose",
  "capture",
  "fix",
  "status",
  "deductible",
  "quick",
  "card",
  "claim",
  "settings",
  "end",
];

// Timeline labels under the stage (page chrome, so English like the other buttons).
export const CHAPTERS = [
  "Start",
  "Choose",
  "Capture",
  "Fix",
  "Status",
  "Deductible",
  "Quick",
  "Card",
  "Claim",
  "Settings",
  "Your turn",
];

export const LABELS = {
  en: { count: (n, total) => `Step ${n} of ${total}`, what: "What it does", why: "Why it matters" },
  fi: {
    count: (n, total) => `Vaihe ${n}/${total}`,
    what: "Mitä se tekee",
    why: "Miksi sillä on väliä",
  },
  sv: {
    count: (n, total) => `Steg ${n} av ${total}`,
    what: "Vad den gör",
    why: "Varför det spelar roll",
  },
};

export const CAPTIONS = {
  en: {
    start: {
      title: "A check-up for your new home",
      what: "A voluntary check-up inside the home insurance app, offered right after you move in.",
      why: "876,003 people moved within Finland in 2025, and leaks are the most common of the main home risks.",
    },
    choose: {
      title: "Two taps to the first photo",
      what: "Pick flat or house: 11 checks for a flat, 14 for a house.",
      why: "Each check is an everyday spot behind water or fire damage.",
    },
    capture: {
      title: "Photograph it, get an answer",
      what: "The photo shrinks into a card and the check runs. On a phone, a second angle is taken by itself.",
      why: "The vision model only reports what it sees. Fixed rules in code make the verdict.",
    },
    fix: {
      title: "A clear tip when something's wrong",
      what: "A red X says what to fix, the cheapest way, and who should do it.",
      why: "Photos of screens or printouts are always Retake. Only the app's own camera counts.",
    },
    status: {
      title: "Status for each risk",
      what: "Every risk shows its checks, what's left and when to check again.",
      why: "While a risk's checks are current, its deductible is lower.",
    },
    deductible: {
      title: "How the lower deductible works",
      what: "Five plain rules, shown in the app.",
      why: "Your cover never changes. At worst, the standard deductible applies.",
    },
    quick: {
      title: "A 2-minute check every 3 months",
      what: "Every three months, a reminder brings a short checklist: under the sink, behind the fridge, the floor drain, the smoke alarm.",
      why: "It keeps If proactive between the yearly photo checks. It's optional; the yearly checks keep the lower deductible.",
    },
    card: {
      title: "The Home Card",
      what: "A one-page summary of the home's checks, their dates and the next reminder.",
      why: "Each record keeps the photo's fingerprint, so it can be matched at a claim.",
    },
    claim: {
      title: "At a claim, a person decides",
      what: "The claims handler sees the dated checks and matches any shared photos to their fingerprints. In this demo, nothing is sent to If.",
      why: "The model never decides. Verdicts, the deductible and the claim decision are code, with 151 tests.",
    },
    settings: {
      title: "Built for every customer",
      what: "Finnish, Swedish and English, voice guidance and full screen-reader support.",
      why: "Voice guidance turns on by itself when a screen reader is on.",
    },
    end: {
      title: "Your turn",
      what: "Tap around the app. Restart demo resets the example home.",
      why: "Each check shows the protective instruction from If's home terms that it relates to.",
    },
  },
  fi: {
    start: {
      title: "Tarkistus uuteen kotiisi",
      what: "Vapaaehtoinen tarkistus kotivakuutuksen sovelluksessa, tarjolla heti muuton jälkeen.",
      why: "Vuonna 2025 Suomen sisällä muutti 876 003 ihmistä, ja vuodot ovat kodin pääriskeistä yleisin.",
    },
    choose: {
      title: "Kaksi napautusta ensimmäiseen kuvaan",
      what: "Valitse asunto tai talo: asunnossa on 11 tarkistusta, talossa 14.",
      why: "Jokainen tarkistus on arkinen kohta vesi- tai palovahinkojen taustalla.",
    },
    capture: {
      title: "Ota kuva, saat vastauksen",
      what: "Kuva pienenee kortiksi ja tarkistus käynnistyy. Puhelimessa toinen kuvakulma otetaan itsestään.",
      why: "Kuvamalli kertoo vain, mitä se näkee. Ratkaisun tekevät koodin kiinteät säännöt.",
    },
    fix: {
      title: "Selkeä vinkki, kun jokin on vialla",
      what: "Punainen rasti kertoo, mitä korjata, halvimman tavan ja kuka korjauksen tekee.",
      why: "Näytöstä tai tulosteesta otettu kuva on aina otettava uudelleen. Vain sovelluksen oma kamera kelpaa.",
    },
    status: {
      title: "Tila jokaiselle riskille",
      what: "Jokaisen riskin kohdalla näkyvät sen tarkistukset, mitä on jäljellä ja milloin tarkistetaan uudelleen.",
      why: "Kun riskin tarkistukset ovat ajan tasalla, sen omavastuu on pienempi.",
    },
    deductible: {
      title: "Näin pienempi omavastuu toimii",
      what: "Viisi selkeää sääntöä, jotka näkyvät sovelluksessa.",
      why: "Vakuutusturvasi ei koskaan muutu. Pahimmassa tapauksessa sovelletaan tavallista omavastuuta.",
    },
    quick: {
      title: "2 minuutin tarkistus 3 kuukauden välein",
      what: "Kolmen kuukauden välein muistutus tuo lyhyen tarkistuslistan: tiskipöydän alla, jääkaapin takana, lattiakaivo, palovaroitin.",
      why: "Se pitää Ifin ennakoivana vuosittaisten kuvatarkistusten välillä. Se on vapaaehtoinen; pienempi omavastuu säilyy vuosittaisilla tarkistuksilla.",
    },
    card: {
      title: "Kotikortti",
      what: "Yhden sivun yhteenveto kodin tarkistuksista, niiden päivämääristä ja seuraavasta muistutuksesta.",
      why: "Jokainen merkintä säilyttää kuvan sormenjäljen, jotta kuvan voi täsmätä vahinkotilanteessa.",
    },
    claim: {
      title: "Vahinkotilanteessa päättää ihminen",
      what: "Korvauskäsittelijä näkee päivätyt tarkistukset ja täsmää mahdolliset jaetut kuvat niiden sormenjälkiin. Tässä demossa Ifille ei lähetetä mitään.",
      why: "Malli ei koskaan päätä. Ratkaisut, omavastuu ja korvauspäätös ovat koodia, ja niillä on 151 testiä.",
    },
    settings: {
      title: "Tehty jokaiselle asiakkaalle",
      what: "Suomi, ruotsi ja englanti, puheopastus ja täysi ruudunlukijatuki.",
      why: "Puheopastus käynnistyy itsestään, kun ruudunlukija on päällä.",
    },
    end: {
      title: "Sinun vuorosi",
      what: "Kokeile sovellusta vapaasti. Restart demo palauttaa esimerkkikodin.",
      why: "Jokainen tarkistus näyttää, mihin Ifin kotivakuutusehtojen suojeluohjeeseen se liittyy.",
    },
  },
  sv: {
    start: {
      title: "En koll av ditt nya hem",
      what: "En frivillig koll i hemförsäkringsappen, som erbjuds direkt efter flytten.",
      why: "876 003 personer flyttade inom Finland 2025, och läckor är den vanligaste av de största riskerna i hemmet.",
    },
    choose: {
      title: "Två tryck till första fotot",
      what: "Välj lägenhet eller hus: 11 kontroller för en lägenhet, 14 för ett hus.",
      why: "Varje kontroll är en vardaglig plats bakom vatten- eller brandskador.",
    },
    capture: {
      title: "Fotografera och få svar",
      what: "Fotot krymper till ett kort och kontrollen körs. På en telefon tas en andra vinkel av sig själv.",
      why: "Bildmodellen rapporterar bara vad den ser. Fasta regler i koden ger utlåtandet.",
    },
    fix: {
      title: "Ett tydligt tips när något är fel",
      what: "Ett rött kryss visar vad som ska åtgärdas, det billigaste sättet och vem som ska göra det.",
      why: "Foton av skärmar eller utskrifter måste alltid tas om. Bara appens egen kamera räknas.",
    },
    status: {
      title: "Status för varje risk",
      what: "Varje risk visar sina kontroller, vad som återstår och när det är dags att kontrollera igen.",
      why: "Så länge en risks kontroller är aktuella är dess självrisk lägre.",
    },
    deductible: {
      title: "Så fungerar den lägre självrisken",
      what: "Fem enkla regler som visas i appen.",
      why: "Ditt försäkringsskydd ändras aldrig. I värsta fall gäller den vanliga självrisken.",
    },
    quick: {
      title: "En 2-minuterskoll var tredje månad",
      what: "Var tredje månad kommer en påminnelse med en kort checklista: under diskbänken, bakom kylen, golvbrunnen, brandvarnaren.",
      why: "Den håller If proaktivt mellan de årliga fotokontrollerna. Den är frivillig; den lägre självrisken behålls med de årliga kontrollerna.",
    },
    card: {
      title: "Hemkortet",
      what: "En sammanfattning på en sida av hemmets kontroller, deras datum och nästa påminnelse.",
      why: "Varje post sparar fotots fingeravtryck, så att det kan matchas vid en skada.",
    },
    claim: {
      title: "Vid en skada avgör en människa",
      what: "Skadehandläggaren ser de daterade kontrollerna och matchar eventuella delade foton mot deras fingeravtryck. I den här demon skickas inget till If.",
      why: "Modellen avgör aldrig. Utlåtanden, självrisken och skadebeslutet är kod, med 151 tester.",
    },
    settings: {
      title: "Byggd för alla kunder",
      what: "Finska, svenska och engelska, röstguidning och fullt stöd för skärmläsare.",
      why: "Röstguidningen slås på av sig själv när en skärmläsare är på.",
    },
    end: {
      title: "Din tur",
      what: "Tryck runt i appen. Restart demo återställer exempelhemmet.",
      why: "Varje kontroll visar vilken säkerhetsföreskrift i Ifs hemförsäkringsvillkor den hör till.",
    },
  },
};

// Big figures on the stage. Values repeat numbers already in the caption, never new ones.
export const FIGURES = {
  start: {
    values: [876003],
    label: {
      en: "people moved within Finland in 2025",
      fi: "ihmistä muutti Suomen sisällä vuonna 2025",
      sv: "personer flyttade inom Finland 2025",
    },
  },
  choose: {
    values: [11, 14],
    label: {
      en: "checks for a flat / a house",
      fi: "tarkistusta asunnossa / talossa",
      sv: "kontroller för lägenhet / hus",
    },
  },
  capture: {
    values: [3.4],
    decimals: 1,
    suffix: "\u00a0s",
    label: { en: "median check", fi: "tarkistuksen mediaaniaika", sv: "mediantid per kontroll" },
  },
  status: {
    pill: {
      en: "Lower deductible",
      fi: "Pienempi omavastuu",
      sv: "Lägre självrisk",
    },
  },
  quick: {
    values: [3],
    label: { en: "months", fi: "kuukautta", sv: "månader" },
  },
  claim: {
    values: [151],
    label: { en: "tests", fi: "testiä", sv: "tester" },
  },
};

// One annotation chip per step, pointing at a spot on the phone screen (x, y in % of the screen).
export const CHIPS = {
  choose: { text: "Flat or house", x: 72, y: 34 },
  capture: { text: "Recorded demo photo", x: 66, y: 40 },
  fix: { text: "Fix first", x: 80, y: 47 },
  status: { text: "Deductible", x: 70, y: 9 },
  deductible: { text: "Five plain rules", x: 70, y: 46 },
  quick: { text: "Reminder", x: 82, y: 9 },
  card: { text: "Home Card", x: 70, y: 30 },
  claim: { text: "Dated checks", x: 70, y: 40 },
  settings: { text: "FI · SV · EN", x: 78, y: 24 },
};

// The quick step opens with a simulated phone notification that drops out of the Dynamic Island.
export const NOTICE = {
  en: {
    time: "now",
    title: "Time for your 2-minute home check",
    body: "5 quick things: under the sink, behind the fridge, the drain…",
  },
  fi: {
    time: "nyt",
    title: "Aika 2 minuutin kotitarkistukselle",
    body: "5 nopeaa asiaa: tiskipöydän alla, jääkaapin takana, lattiakaivo…",
  },
  sv: {
    time: "nu",
    title: "Dags för din 2-minuters hemkoll",
    body: "5 snabba saker: under diskbänken, bakom kylen, golvbrunnen…",
  },
};

// Settings step: what voice guidance says for one check (the fuse box, F2), word for word from the
// app: sayCheck, sayShutter, sayChecking, sayMoveAside and sayDone in app/src/prepared-home/i18n/voice.ts,
// the F2 title from packages/engine/src/checks.ts and its instruction "short.F2" from i18n/check.ts.
export const VOICE = {
  en: [
    "Check 8 of 11. Fuse box. Show the fuse box with its cover on.",
    "Tap the big button at the bottom to take the photo.",
    "Hold still… checking your photo.",
    "Now move a step to the side and hold still.",
    "Done. Fuse box looks good.",
  ],
  fi: [
    "Tarkistus 8, kaikkiaan 11. Sähkökeskus. Kuvaa sähkökeskus kansi paikallaan.",
    "Ota kuva napauttamalla isoa painiketta alhaalla.",
    "Pidä paikallaan… kuvaa tarkistetaan.",
    "Siirry nyt askel sivulle ja pidä puhelin paikallaan.",
    "Valmis. Sähkökeskus näyttää hyvältä.",
  ],
  sv: [
    "Kontroll 8 av 11. Elcentral. Visa elcentralen med locket på.",
    "Tryck på den stora knappen längst ned för att ta bilden.",
    "Håll stilla… bilden kontrolleras.",
    "Ta nu ett steg åt sidan och håll stilla.",
    "Klart. Elcentral ser bra ut.",
  ],
};

export const VOICE_CARD = {
  en: {
    head: "What a blind user hears",
    note: "Turns on by itself when a screen reader is on. Every control has a screen-reader label.",
  },
  fi: {
    head: "Mitä sokea käyttäjä kuulee",
    note: "Käynnistyy itsestään, kun ruudunlukija on päällä. Jokaisella painikkeella on ruudunlukijan nimi.",
  },
  sv: {
    head: "Vad en blind användare hör",
    note: "Slås på av sig själv när en skärmläsare är på. Varje kontroll har en etikett för skärmläsare.",
  },
};
