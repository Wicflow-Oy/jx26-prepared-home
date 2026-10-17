// The 14 fixed checks (docs/CONTRACTS.md §4). Criteria are judged by the vision model (visibility, condition)
// or answered by the customer (user). Verdicts are decided in code (rules.ts), never by the model.

import type { CheckDefinition, ClauseFit, HomeType, Localized, Owner } from "./types";

const t = (fi: string, sv: string, en: string): Localized => ({ fi, sv, en });

export const CHECKS: CheckDefinition[] = [
  // ---------------------------------------------------------------- leak
  {
    id: "L1",
    peril: "leak",
    homeTypes: ["flat", "house", "cottage"],
    title: t("Mistä vesi suljetaan", "Var vattnet stängs av", "Where the water shuts off"),
    coach: t(
      "Etsi veden sulkuventtiili ja kuvaa se niin, että kahva näkyy.",
      "Leta upp avstängningsventilen för vattnet. Ta en bild där handtaget syns.",
      "Find the water shut-off valve. Take a photo with the handle in view.",
    ),
    criteria: [
      {
        id: "L1.valve_visible",
        kind: "visibility",
        text: t(
          "Veden sulkuventtiili näkyy",
          "En avstängningsventil för vattnet syns",
          "A water shut-off valve is visible",
        ),
      },
      {
        id: "L1.handle_visible",
        kind: "visibility",
        text: t(
          "Venttiilin kahva tai vipu näkyy",
          "Ventilens handtag eller spak syns",
          "The valve's handle or lever is visible",
        ),
      },
      {
        id: "L1.no_leak",
        kind: "condition",
        text: t(
          "Venttiilissä ei ole vuotoa, tippumista, ruostetta eikä vesijälkiä",
          "Inget läckage, dropp, korrosion eller vattenfläckar vid ventilen",
          "No leaks, drips, corrosion or water stains at the valve",
        ),
      },
      {
        id: "L1.know_how",
        kind: "user",
        text: t("Osaan sulkea sen", "Jag vet hur man stänger den", "I know how to close it"),
      },
    ],
    clauseIds: ["OMA-5.5.3"],
    clauseFit: "direct",
    notApplicableAllowed: false,
    defaultOwner: { default: "me", flat: "property_manager" },
    fixHint: t(
      "Jos venttiili vuotaa tai on jumissa, ota yhteys putkimieheen tai taloyhtiössä isännöitsijään. Opettele sulkemaan se, ennen kuin tarvitset sitä.",
      "Om ventilen droppar eller sitter fast, kontakta en rörmokare eller, i ett husbolag, disponenten. Lär dig stänga den innan det behövs.",
      "If the valve drips or is stuck, call a plumber or, in a flat, the property manager. Learn how to close it before you need to.",
    ),
    recheck: { kind: "yearly" },
  },
  {
    id: "L2",
    peril: "leak",
    homeTypes: ["flat", "house", "cottage"],
    title: t(
      "Pesukoneen letku ja sulkuventtiili",
      "Tvättmaskinens slang och avstängningsventil",
      "Washing machine hose and valve",
    ),
    coach: t(
      "Vedä konetta tarvittaessa hieman esiin. Kuvaa sulkuventtiili ja letku venttiilistä koneeseen asti.",
      "Dra vid behov ut maskinen lite. Ta en bild där ventilen och hela slangen fram till maskinen syns.",
      "Pull the machine out a little if needed. Take a photo of the valve and the hose all the way to the machine.",
    ),
    criteria: [
      {
        id: "L2.hose_visible",
        kind: "visibility",
        text: t(
          "Täyttöletku näkyy venttiilistä koneeseen asti",
          "Påfyllningsslangen syns från ventilen till maskinen",
          "The inlet hose is visible from the valve to the machine",
        ),
      },
      {
        id: "L2.tap_visible",
        kind: "visibility",
        text: t(
          "Koneen oma sulkuventtiili näkyy",
          "Maskinens egen avstängningsventil syns",
          "The machine's own shut-off valve is visible",
        ),
      },
      {
        id: "L2.hose_ok",
        kind: "condition",
        text: t(
          "Letkussa tai liitoksissa ei ole tippumista, taitteita, pullistumia, halkeamia eikä ruostetta",
          "Inga droppar, veck, bulor, sprickor eller rost på slangen eller kopplingarna",
          "No drips, kinks, bulges, cracks or rust on the hose or its connections",
        ),
      },
    ],
    clauseIds: ["OMA-5.5.6"],
    clauseFit: "direct",
    notApplicableAllowed: true,
    defaultOwner: { default: "me" },
    fixHint: t(
      "Vaihda kulunut letku uuteen paineenkestävään letkuun. Sulje venttiili, kun kone ei ole käytössä.",
      "Byt ut en sliten slang mot en ny, trycktålig slang. Stäng ventilen när maskinen inte används.",
      "Replace a worn hose with a new pressure-proof one. Close the valve when the machine is not in use.",
    ),
    recheck: { kind: "yearly" },
  },
  {
    id: "L3",
    peril: "leak",
    homeTypes: ["flat", "house", "cottage"],
    title: t(
      "Astianpesukoneen letku ja sulkuventtiili",
      "Diskmaskinens slang och avstängningsventil",
      "Dishwasher hose and valve",
    ),
    coach: t(
      "Avaa tiskialtaan alakaappi tai irrota astianpesukoneen vieressä oleva sokkelilista. Kuvaa vesiliitäntä.",
      "Öppna skåpet under diskbänken eller ta loss sockeln bredvid diskmaskinen. Ta en bild av vattenanslutningen.",
      "Open the cabinet under the sink, or take off the kickboard next to the dishwasher. Take a photo of the water connection.",
    ),
    criteria: [
      {
        id: "L3.connection_visible",
        kind: "visibility",
        text: t(
          "Astianpesukoneen vesiliitäntä näkyy",
          "Diskmaskinens vattenanslutning syns",
          "The dishwasher's water connection is visible",
        ),
      },
      {
        id: "L3.tap_present",
        kind: "condition",
        text: t(
          "Astianpesukoneen sulkuventtiili näkyy",
          "En avstängningsventil för diskmaskinen syns",
          "A shut-off valve for the dishwasher is visible",
        ),
      },
      {
        id: "L3.no_leak",
        kind: "condition",
        text: t(
          "Ei tippumista, taitteita, pullistumia eikä vesijälkiä",
          "Inga droppar, veck, bulor eller vattenfläckar",
          "No drips, kinks, bulges or water stains",
        ),
      },
    ],
    clauseIds: [],
    clauseFit: "none",
    guideNote: t(
      "Ifin kotioppaan vinkki: asenna astianpesukoneelle oma sulkuventtiili ja turvakaukalo samaan tapaan kuin pesukoneelle (ehtojen kohta 5.5.6).",
      "Tips ur Ifs hemguide: ge diskmaskinen en egen avstängningsventil och ett tråg, på samma sätt som tvättmaskinen (villkorens punkt 5.5.6).",
      "Tip from If's home guide: give the dishwasher its own shut-off valve and a drip tray, as for a washing machine (terms 5.5.6).",
    ),
    notApplicableAllowed: true,
    defaultOwner: { default: "me" },
    fixHint: t(
      "Pyydä putkimiestä asentamaan astianpesukoneelle oma sulkuventtiili. Vaihda kulunut letku.",
      "Låt en rörmokare montera en egen avstängningsventil för diskmaskinen. Byt ut en sliten slang.",
      "Have a plumber fit a shut-off valve for the dishwasher. Replace a worn hose.",
    ),
    recheck: { kind: "yearly" },
  },
  {
    id: "L4",
    peril: "leak",
    homeTypes: ["flat", "house", "cottage"],
    title: t(
      "Turvakaukalot pesukoneen ja jääkaapin alla",
      "Tråg under tvättmaskinen och kylskåpet",
      "Drip trays under the washing machine and fridge",
    ),
    coach: t(
      "Kuvaa lattia pesukoneen tai jääkaapin alta ja edestä niin, että turvakaukalon reuna tai lähin lattiakaivo näkyy.",
      "Ta en bild av golvet under och framför tvättmaskinen eller kylskåpet. Visa trågets kant eller närmaste golvbrunn.",
      "Take a photo of the floor under and in front of the washing machine or fridge. Show the edge of the drip tray or the nearest floor drain.",
    ),
    criteria: [
      {
        id: "L4.floor_visible",
        kind: "visibility",
        text: t(
          "Laitteen alla oleva lattia näkyy",
          "Golvet under apparaten syns",
          "The floor under the appliance is visible",
        ),
      },
      {
        id: "L4.tray_or_drain",
        kind: "condition",
        text: t(
          "Laitteen alla on turvakaukalo tai aivan vieressä lattiakaivo",
          "Det finns ett tråg under apparaten eller en golvbrunn alldeles intill",
          "There is a drip tray under the appliance, or a floor drain right next to it",
        ),
      },
      {
        id: "L4.dry",
        kind: "condition",
        text: t(
          "Lattialla tai turvakaukalossa ei ole vettä eikä vesijälkiä",
          "Inget vatten och inga fläckar på golvet eller i tråget",
          "No water or stains on the floor or in the tray",
        ),
      },
    ],
    clauseIds: ["OMA-5.5.8"],
    clauseFit: "direct",
    notApplicableAllowed: false,
    defaultOwner: { default: "me" },
    fixHint: t(
      "Laita laitteen alle turvakaukalo. Niitä saa edullisesti rautakaupasta.",
      "Ställ ett tråg under apparaten. Sådana får du billigt i järnhandeln.",
      "Put a drip tray under the appliance. Hardware stores sell them cheaply.",
    ),
    recheck: { kind: "yearly" },
  },
  {
    id: "L5",
    peril: "leak",
    homeTypes: ["flat", "house", "cottage"],
    title: t("Lattiakaivo ja hajulukko", "Golvbrunn och vattenlås", "Floor drain and sink trap"),
    coach: t(
      "Kuvaa kylpyhuoneen lattiakaivo ylhäältä tai pesualtaan alla oleva hajulukko.",
      "Ta en bild av golvbrunnen i badrummet uppifrån, eller av vattenlåset under ett handfat.",
      "Take a photo of the bathroom floor drain from above, or of the trap under a sink.",
    ),
    criteria: [
      {
        id: "L5.drain_visible",
        kind: "visibility",
        text: t(
          "Lattiakaivo tai hajulukko näkyy",
          "En golvbrunn eller ett vattenlås syns",
          "A floor drain or a sink trap is visible",
        ),
      },
      {
        id: "L5.clear",
        kind: "condition",
        text: t(
          "Kaivossa tai hajulukossa ei ole tukosta, seisovaa vettä eikä vuotoa",
          "Inget stopp, stående vatten eller läckage vid brunnen eller vattenlåset",
          "No blockage, standing water or leaks at the drain or trap",
        ),
      },
    ],
    clauseIds: ["OMA-5.5.7", "OMA-5.5.9"],
    clauseFit: "direct",
    notApplicableAllowed: false,
    defaultOwner: { default: "me" },
    fixHint: t(
      "Puhdista kaivo tai hajulukko: nosta kansi pois, poista hiukset ja lika ja huuhtele. Kiristä vuotava mutteri.",
      "Rengör brunnen eller vattenlåset: lyft av locket, ta bort hår och smuts och spola. Dra åt muttern om den läcker.",
      "Clean the drain or trap: lift off the cover, remove hair and dirt, and rinse. If a nut leaks, tighten it.",
    ),
    recheck: { kind: "yearly" },
  },
  {
    id: "L6",
    peril: "leak",
    homeTypes: ["flat", "house", "cottage"],
    title: t("Kylpyhuoneen silikonisaumat", "Badrummets silikonfogar", "Bathroom silicone seams"),
    coach: t(
      "Kuvaa läheltä saumat lattian ja seinän rajassa sekä suihkun tai ammeen ympärillä. Varmista, että valoa on riittävästi.",
      "Ta en närbild av fogarna där golvet möter väggen och runt duschen eller badkaret. Se till att det är ljust.",
      "Take close-ups of the seams where the floor meets the wall and around the shower or bath. Use good light.",
    ),
    criteria: [
      {
        id: "L6.seams_visible",
        kind: "visibility",
        text: t(
          "Lattian ja seinän sekä suihkun tai ammeen saumat näkyvät läheltä",
          "Fogarna mellan golv och vägg och vid dusch eller badkar syns på nära håll",
          "The seams where the floor meets the wall and around the shower or bath are visible up close",
        ),
      },
      {
        id: "L6.seams_intact",
        kind: "condition",
        text: t(
          "Saumat ovat ehjät: ei halkeamia, rakoja, irtoamista eikä mustaa hometta",
          "Fogarna är hela: inga sprickor, glipor, lösa kanter eller svart mögel",
          "The seams are intact: no cracks, gaps, peeling or black mould",
        ),
      },
    ],
    clauseIds: ["OMA-4.1-vesieriste"],
    clauseFit: "exclusion",
    notApplicableAllowed: false,
    defaultOwner: { default: "me" },
    fixHint: t(
      "Leikkaa vaurioitunut sauma pois ja tee tilalle uusi saniteettisilikonilla. Anna sauman kuivua vuorokausi, ennen kuin käytät suihkua.",
      "Skär bort den skadade fogen och foga om med sanitetssilikon. Låt fogen torka ett dygn innan du duschar.",
      "Cut out the damaged seam and apply new sanitary silicone. Let it dry for a day before you shower.",
    ),
    recheck: { kind: "yearly" },
  },

  // ---------------------------------------------------------------- fire
  {
    id: "F1",
    peril: "fire",
    homeTypes: ["flat", "house", "cottage"],
    title: t("Toimiva palovaroitin", "Fungerande brandvarnare", "Working smoke alarm"),
    coach: t(
      "Kuvaa katossa oleva palovaroitin. Paina sitten sen testinappia.",
      "Ta en bild av brandvarnaren i taket. Tryck sedan på testknappen.",
      "Take a photo of the smoke alarm on the ceiling. Then press its test button.",
    ),
    criteria: [
      {
        id: "F1.alarm_visible",
        kind: "visibility",
        text: t("Palovaroitin näkyy", "En brandvarnare syns", "A smoke alarm is visible"),
      },
      {
        id: "F1.mounted",
        kind: "condition",
        text: t(
          "Se on paikallaan, ei irrotettu eikä peitetty",
          "Den sitter på plats, inte nedtagen eller övertäckt",
          "It is in place, not taken down or covered",
        ),
      },
      {
        id: "F1.beeped",
        kind: "user",
        text: t(
          "Painoin testinappia ja se piippasi",
          "Jag tryckte på testknappen och den pep",
          "I pressed the test button and it beeped",
        ),
      },
    ],
    clauseIds: ["OMA-5.2.6"],
    clauseFit: "direct",
    notApplicableAllowed: false,
    defaultOwner: { default: "me" },
    fixHint: t(
      "Jos palovaroitin ei piippaa, vaihda paristo tai osta uusi. Asenna vähintään yksi palovaroitin jokaisen kerroksen kattoon.",
      "Om den inte piper, byt batteri eller köp en ny brandvarnare. Sätt upp minst en i taket på varje våning.",
      "If it does not beep, change the battery or buy a new alarm. Fit at least one alarm on the ceiling of every floor.",
    ),
    recheck: { kind: "yearly" },
  },
  {
    id: "F2",
    peril: "fire",
    homeTypes: ["flat", "house", "cottage"],
    title: t("Sähkökeskus", "Elcentral", "Fuse box"),
    coach: t(
      "Avaa kaapin ovi ja kuvaa koko sähkökeskus edestä. Älä koske mihinkään keskuksen sisällä.",
      "Öppna skåpluckan och ta en bild av hela elcentralen framifrån. Rör ingenting inuti.",
      "Open the cabinet door and take a photo of the whole fuse box from the front. Do not touch anything inside.",
    ),
    criteria: [
      {
        id: "F2.board_visible",
        kind: "visibility",
        text: t(
          "Sähkökeskus tai ryhmäkeskus näkyy",
          "Elcentralen eller gruppcentralen syns",
          "The fuse box or distribution board is visible",
        ),
      },
      {
        id: "F2.no_damage",
        kind: "condition",
        text: t(
          "Ei vaurioita, kärventymisjälkiä, puuttuvaa kantta eikä paljaita jännitteisiä osia",
          "Inga skador, brännmärken, saknade lock eller blottade strömförande delar",
          "No damage, scorch marks, missing cover or exposed live parts",
        ),
      },
      {
        id: "F2.rcd_visible",
        kind: "condition",
        text: t(
          "Vikavirtasuoja, jossa on TEST-painike, näkyy",
          "En jordfelsbrytare med TEST-knapp syns",
          "A residual-current device (RCD) with a TEST button is visible",
        ),
      },
      {
        id: "F2.clear_front",
        kind: "condition",
        text: t(
          "Keskuksen edessä tai sitä vasten ei ole tavaroita",
          "Inget förvaras framför eller mot centralen",
          "Nothing is stored in front of it or against it",
        ),
      },
    ],
    clauseIds: ["OMA-5.2.7", "OMA-5.2.8"],
    clauseFit: "section",
    notApplicableAllowed: false,
    defaultOwner: { default: "professional" },
    fixHint: t(
      "Raivaa tavarat keskuksen edestä. Jos näet vaurioita tai kärventymisjälkiä tai vikavirtasuoja puuttuu, tilaa sähköasentaja. Älä korjaa itse.",
      "Flytta bort saker framför centralen. Om du ser skador eller brännmärken, eller om jordfelsbrytare saknas, anlita en behörig elektriker. Laga inget själv.",
      "Clear the space in front of the fuse box. If you see damage or scorch marks, or there is no RCD, call an authorised electrician. Do not fix it yourself.",
    ),
    recheck: { kind: "yearly" },
  },
  {
    id: "F3",
    peril: "fire",
    homeTypes: ["flat", "house", "cottage"],
    title: t("Jääkaapin takana", "Bakom kylskåpet", "Behind the fridge"),
    coach: t(
      "Vedä jääkaappia hieman esiin tai käytä puhelimen valoa. Kuvaa takana oleva lauhdutin ja johdot.",
      "Dra ut kylskåpet lite eller använd mobilens ficklampa. Ta en bild av kondensorn på baksidan och sladdarna.",
      "Pull the fridge out a little, or use your phone's light. Take a photo of the coil at the back and the cords.",
    ),
    criteria: [
      {
        id: "F3.back_visible",
        kind: "visibility",
        text: t(
          "Jääkaapin tai pakastimen takaosa (lauhdutin, johdot) näkyy",
          "Baksidan av kylskåpet eller frysen (kondensor, sladdar) syns",
          "The back of the fridge or freezer (coil, cords) is visible",
        ),
      },
      {
        id: "F3.no_dust",
        kind: "condition",
        text: t(
          "Lauhduttimessa tai kompressorissa ei ole paksua pölykerrosta",
          "Inget tjockt damm på kondensorn eller kompressorn",
          "No thick dust on the coil or compressor",
        ),
      },
      {
        id: "F3.cords_ok",
        kind: "condition",
        text: t(
          "Johdot ja pistokkeet ovat ehjät",
          "Sladdar och stickproppar är hela",
          "The cords and plugs are undamaged",
        ),
      },
    ],
    clauseIds: ["OMA-5.2.7"],
    clauseFit: "section",
    notApplicableAllowed: false,
    defaultOwner: { default: "me" },
    fixHint: t(
      "Irrota pistoke ja imuroi pölyt laitteen takaa. Vaihdata vaurioitunut johto tai korjauta laite.",
      "Dra ur kontakten och dammsug baksidan. Låt en fackman byta en skadad sladd eller reparera apparaten.",
      "Unplug the fridge and vacuum the dust off the back. Have a damaged cord replaced or the appliance repaired.",
    ),
    recheck: { kind: "yearly" },
  },
  {
    id: "F4",
    peril: "fire",
    homeTypes: ["flat", "house", "cottage"],
    title: t("Liesitaso tyhjänä", "Tom spishäll", "Clear stove top"),
    coach: t(
      "Kuvaa koko liesitaso ylhäältä sellaisena kuin se yleensä on.",
      "Ta en bild av hela spishällen uppifrån, så som den brukar se ut.",
      "Take a photo of the whole stove top from above, as it usually looks.",
    ),
    criteria: [
      {
        id: "F4.stove_visible",
        kind: "visibility",
        text: t("Liesitaso näkyy", "Spishällen syns", "The stove top is visible"),
      },
      {
        id: "F4.nothing_stored",
        kind: "condition",
        text: t(
          "Sen päällä ei säilytetä mitään (ei papereita, laatikoita, pyyhkeitä eikä kattiloita)",
          "Inget förvaras på den (inga papper, lådor, handdukar eller kastruller)",
          "Nothing is stored on it (no paper, boxes, towels or pans)",
        ),
      },
    ],
    clauseIds: [],
    clauseFit: "none",
    guideNote: t(
      "Liedellä tai sen lähellä olevat tavarat ovat keittiöpalojen yleisin syy (SPEK).",
      "Föremål på eller nära spisen är den vanligaste orsaken till köksbränder (SPEK).",
      "Things left on or near the stove are the most common cause of kitchen fires (SPEK).",
    ),
    notApplicableAllowed: false,
    defaultOwner: { default: "me" },
    fixHint: t(
      "Pidä liesitaso tyhjänä ja säilytä tavarat muualla. Liesivahti lisää turvallisuutta.",
      "Håll spishällen tom och förvara saker någon annanstans. En spisvakt ger extra säkerhet.",
      "Keep the stove top empty and store things elsewhere. A stove guard adds safety.",
    ),
    recheck: { kind: "yearly" },
  },
  {
    id: "F5",
    peril: "fire",
    homeTypes: ["flat", "house", "cottage"],
    title: t("Missä lataat laitteita", "Var du laddar apparater", "Where you charge devices"),
    coach: t(
      "Kuvaa paikka, jossa yleensä lataat puhelinta, kannettavaa tai sähköpyörän akkua, ja sen ympäristö.",
      "Ta en bild av platsen där du brukar ladda telefonen, datorn eller elcykelns batteri, och det som finns runt omkring.",
      "Take a photo of where you usually charge your phone, laptop or e-bike battery, and what is around it.",
    ),
    criteria: [
      {
        id: "F5.spot_visible",
        kind: "visibility",
        text: t(
          "Puhelinten, kannettavien tai sähköpyörän akkujen latauspaikka näkyy",
          "Laddplatsen för telefoner, datorer eller elcykelbatterier syns",
          "The charging spot for phones, laptops or e-bike batteries is visible",
        ),
      },
      {
        id: "F5.safe_surface",
        kind: "condition",
        text: t(
          "Lataus tapahtuu kovalla alustalla, kaukana sängyistä, sohvista, verhoista ja muista tekstiileistä",
          "Laddningen sker på ett hårt underlag, långt från sängar, soffor, gardiner och andra textilier",
          "Charging happens on a hard surface, away from beds, sofas, curtains and other textiles",
        ),
      },
    ],
    clauseIds: ["OMA-5.2.17"],
    clauseFit: "direct",
    notApplicableAllowed: false,
    defaultOwner: { default: "me" },
    fixHint: t(
      "Siirrä lataus kovalle alustalle, kuten pöydälle tai laattalattialle, kauas tekstiileistä. Älä jätä latausta valvomatta.",
      "Ladda på ett hårt underlag, som ett bord eller ett klinkergolv, långt från textilier. Lämna inget på laddning utan uppsikt.",
      "Charge on a hard surface, such as a table or a tiled floor, away from textiles. Do not leave anything charging unattended.",
    ),
    recheck: { kind: "yearly" },
  },

  // ---------------------------------------------------------------- freeze
  {
    id: "Z1",
    peril: "freeze",
    homeTypes: ["house", "cottage"],
    title: t(
      "Lämmitys kylmänä vuodenaikana",
      "Uppvärmning under den kalla årstiden",
      "Heating for the cold season",
    ),
    coach: t(
      "Kuvaa termostaatti, lämmityksen säädin tai patterin asetus.",
      "Ta en bild av termostaten, värmeregleringen eller inställningen på ett element.",
      "Take a photo of the thermostat, the heating control or a radiator setting.",
    ),
    criteria: [
      {
        id: "Z1.control_visible",
        kind: "visibility",
        text: t(
          "Termostaatti, lämmityksen säädin tai patterin säätö näkyy",
          "En termostat, värmereglering eller inställningen på ett element syns",
          "A thermostat, heating control or radiator setting is visible",
        ),
      },
      {
        id: "Z1.heating_on",
        kind: "user",
        text: t(
          "Lämmitys on päällä kaikissa tiloissa, joissa on vesiputkia",
          "Värmen är på i alla rum med vattenrör",
          "The heating is on in every room with water pipes",
        ),
      },
    ],
    clauseIds: ["OMA-5.5.1", "OMA-5.5.2"],
    clauseFit: "direct",
    notApplicableAllowed: false,
    defaultOwner: { default: "me" },
    fixHint: t(
      "Laita lämmitys päälle kaikkiin tiloihin, joissa on vesiputkia, ennen kylmää vuodenaikaa.",
      "Sätt på värmen i alla rum med vattenrör före den kalla årstiden.",
      "Turn the heating on in every room with water pipes before the cold season.",
    ),
    recheck: { kind: "seasonal", months: [9] },
  },
  {
    id: "Z2",
    peril: "freeze",
    homeTypes: ["house", "cottage"],
    title: t("Ulkohana ennen pakkasia", "Utekranen före frosten", "Outdoor tap before frost"),
    coach: t(
      "Kuvaa ulkohana niin, että näkyy, onko siinä letku kiinni.",
      "Ta en bild av utekranen så att det syns om en slang är ansluten.",
      "Take a photo of the outdoor tap that shows whether a hose is attached.",
    ),
    criteria: [
      {
        id: "Z2.tap_visible",
        kind: "visibility",
        text: t("Ulkohana näkyy", "Utekranen syns", "The outdoor tap is visible"),
      },
      {
        id: "Z2.no_hose",
        kind: "condition",
        text: t(
          "Hanaan ei ole kiinnitetty letkua",
          "Ingen slang är ansluten",
          "No hose is attached",
        ),
      },
      {
        id: "Z2.indoor_valve_closed",
        kind: "user",
        text: t(
          "Suljin ulkohanan sisäpuolisen sulkuventtiilin",
          "Jag stängde utekranens avstängningsventil inomhus",
          "I closed the indoor shut-off valve for the outdoor tap",
        ),
      },
    ],
    clauseIds: ["OMA-5.5.4"],
    clauseFit: "direct",
    notApplicableAllowed: true,
    defaultOwner: { default: "me" },
    fixHint: t(
      "Irrota letku, sulje sisäpuolinen sulkuventtiili ja avaa ulkohana, jotta vesi pääsee valumaan pois.",
      "Ta bort slangen, stäng avstängningsventilen inomhus och öppna utekranen så att vattnet rinner ut.",
      "Remove the hose, close the indoor shut-off valve and open the outdoor tap to let the water drain out.",
    ),
    recheck: { kind: "frost" },
  },

  // ---------------------------------------------------------------- storm water (counts toward leak)
  {
    id: "S1",
    peril: "storm_water",
    homeTypes: ["house"],
    title: t("Räystäskourut ja syöksytorvet", "Hängrännor och stuprör", "Gutters and downpipes"),
    coach: t(
      "Kuvaa maasta käsin räystäskouru ja syöksytorvi aina sinne asti, minne vesi ohjautuu.",
      "Ta en bild från marken av en hängränna och stupröret ända ner till där vattnet leds bort.",
      "From the ground, take a photo of a gutter and its downpipe, all the way down to where the water goes.",
    ),
    criteria: [
      {
        id: "S1.gutter_visible",
        kind: "visibility",
        text: t(
          "Räystäskouru tai syöksytorvi näkyy",
          "En hängränna eller ett stuprör syns",
          "A gutter or downpipe is visible",
        ),
      },
      {
        id: "S1.clear_and_away",
        kind: "condition",
        text: t(
          "Ei lehtiä, roskia eikä ylivuotoa, ja syöksytorvi ohjaa veden poispäin seinästä",
          "Inga löv, inget skräp och ingen överrinning, och stupröret leder bort vattnet från väggen",
          "No leaves, debris or overflow, and the downpipe leads water away from the wall",
        ),
      },
    ],
    clauseIds: ["OMA-5.4.1", "OMA-5.4.2"],
    clauseFit: "section",
    notApplicableAllowed: false,
    defaultOwner: { default: "me" },
    fixHint: t(
      "Puhdista kourut lehdistä. Lisää syöksytorveen jatke tai roiskekouru, jotta vesi valuu poispäin seinästä.",
      "Rensa hängrännorna från löv. Sätt en förlängning eller en utkastare på stupröret så att vattnet rinner bort från väggen.",
      "Clear the leaves from the gutters. Add an extension or a splash block to the downpipe so water runs away from the wall.",
    ),
    recheck: { kind: "seasonal", months: [4, 10] },
  },
];

/** Home-type wording and clause fit. checksFor(homeType) and getCheck(id, homeType) apply these. */
interface HomeVariant {
  coach?: Localized;
  criteria?: Record<string, Localized>;
  clauseIds?: string[];
  clauseFit?: ClauseFit;
  fixHint?: Localized;
}

const MAIN_VALVE: HomeVariant = {
  coach: t(
    "Etsi veden pääsulkuventtiili. Se on yleensä vesimittarin vieressä, siellä missä vesijohto tulee taloon. Kuvaa se niin, että kahva näkyy.",
    "Leta upp huvudavstängningsventilen. Den sitter oftast vid vattenmätaren, där vattenledningen kommer in i huset. Ta en bild där handtaget syns.",
    "Find the main water shut-off valve. It is usually by the water meter, where the water pipe comes in. Take a photo with the handle in view.",
  ),
  criteria: {
    "L1.valve_visible": t(
      "Veden pääsulkuventtiili näkyy",
      "Huvudavstängningsventilen för vattnet syns",
      "The main water shut-off valve is visible",
    ),
  },
  clauseFit: "direct",
  fixHint: t(
    "Jos pääsulkuventtiili vuotaa tai on jumissa, tilaa putkimies. Opettele sulkemaan se, ennen kuin tarvitset sitä.",
    "Om huvudventilen droppar eller sitter fast, anlita en rörmokare. Lär dig stänga den innan det behövs.",
    "If the main valve drips or is stuck, call a plumber. Learn how to close it before you need to.",
  ),
};

const VARIANTS: Record<string, Partial<Record<HomeType, HomeVariant>>> = {
  L1: {
    house: MAIN_VALVE,
    cottage: MAIN_VALVE,
    flat: {
      coach: t(
        "Katso keittiön tiskialtaan alta, pesukoneen takaa tai kylpyhuoneesta. Kuvaa sulkuventtiili niin, että kahva näkyy.",
        "Titta under diskbänken, bakom tvättmaskinen eller i badrummet. Ta en bild av en avstängningsventil där handtaget syns.",
        "Look under the kitchen sink, behind the washing machine or in the bathroom. Take a photo of a shut-off valve with the handle in view.",
      ),
      criteria: {
        "L1.valve_visible": t(
          "Asunnon tai kodinkoneen sulkuventtiili näkyy",
          "Lägenhetens avstängningsventil eller en maskins egen ventil syns",
          "The flat's own shut-off valve or an appliance's shut-off valve is visible",
        ),
      },
      clauseFit: "section",
      fixHint: t(
        "Jos venttiili vuotaa tai on jumissa, ilmoita isännöitsijälle tai huoltoyhtiölle. Opettele sulkemaan se, ennen kuin tarvitset sitä.",
        "Om ventilen droppar eller sitter fast, meddela disponenten eller servicebolaget. Lär dig stänga den innan det behövs.",
        "If the valve drips or is stuck, tell the property manager or the maintenance company. Learn how to close it before you need to.",
      ),
    },
  },
  Z1: {
    house: { clauseIds: ["OMA-5.5.1"] },
    cottage: {
      criteria: {
        "Z1.heating_on": t(
          "Lämmitys on päällä kaikissa tiloissa, joissa on vesiputkia, tai vesijärjestelmä on tyhjennetty",
          "Värmen är på i alla rum med vattenrör, eller vattensystemet är tömt",
          "The heating is on in every room with water pipes, or the water system is drained",
        ),
      },
      clauseIds: ["OMA-5.5.1", "OMA-5.5.2"],
      fixHint: t(
        "Laita lämmitys päälle tiloihin, joissa on vesiputkia. Jos jätät mökin kylmäksi, tyhjennä vesijärjestelmä.",
        "Sätt på värmen i rum med vattenrör. Lämnar du stugan kall, töm vattensystemet.",
        "Turn the heating on in rooms with water pipes. If you leave the cottage cold, drain the water system.",
      ),
    },
  },
};

const CHECK_INDEX = new Map(CHECKS.map((c) => [c.id, c]));

export function appliesTo(check: CheckDefinition, homeType: HomeType): boolean {
  return check.homeTypes.includes(homeType);
}

function specialize(check: CheckDefinition, homeType: HomeType): CheckDefinition {
  const v = VARIANTS[check.id]?.[homeType];
  return {
    ...check,
    homeTypes: [...check.homeTypes],
    title: { ...check.title },
    coach: { ...(v?.coach ?? check.coach) },
    criteria: check.criteria.map((c) => ({ ...c, text: { ...(v?.criteria?.[c.id] ?? c.text) } })),
    clauseIds: [...(v?.clauseIds ?? check.clauseIds)],
    clauseFit: v?.clauseFit ?? check.clauseFit,
    ...(check.guideNote ? { guideNote: { ...check.guideNote } } : {}),
    defaultOwner: { ...check.defaultOwner },
    fixHint: { ...(v?.fixHint ?? check.fixHint) },
    recheck:
      check.recheck.kind === "seasonal"
        ? { kind: "seasonal", months: [...check.recheck.months] }
        : { ...check.recheck },
  };
}

/** Checks for a home type, in display order, with home-type wording applied.
 *  flat: L1-L6, F1-F5 (11); house: all 14; cottage: L1-L6, F1-F5, Z1, Z2 (13). */
export function checksFor(homeType: HomeType): CheckDefinition[] {
  return CHECKS.filter((c) => appliesTo(c, homeType)).map((c) => specialize(c, homeType));
}

/** A check by id. With a home type, returns that home type's wording (L1 and Z1 differ). Throws for an unknown id. */
export function getCheck(id: string, homeType?: HomeType): CheckDefinition {
  const check = CHECK_INDEX.get(id);
  if (!check) throw new Error(`Unknown check id: ${id}`);
  return homeType ? specialize(check, homeType) : check;
}

export function isCheckId(id: string): boolean {
  return CHECK_INDEX.has(id);
}

/** Who usually fixes a failed check for this home type. */
export function ownerFor(check: CheckDefinition, homeType: HomeType): Owner {
  return check.defaultOwner[homeType] ?? check.defaultOwner.default;
}

/** Criterion text in a language for a home type (falls back to the check's own text). */
export function criterionText(
  check: CheckDefinition,
  criterionId: string,
  homeType: HomeType,
): Localized | undefined {
  const variant = VARIANTS[check.id]?.[homeType]?.criteria?.[criterionId];
  return variant ?? check.criteria.find((c) => c.id === criterionId)?.text;
}

/** The fix hint for a home type (L1 and Z1 differ). */
export function fixHintFor(check: CheckDefinition, homeType: HomeType): Localized {
  return VARIANTS[check.id]?.[homeType]?.fixHint ?? check.fixHint;
}
