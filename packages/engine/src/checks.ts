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
      "Leta upp vattnets avstängningsventil och fotografera den så att handtaget syns.",
      "Find the water shut-off valve and photograph it so the handle shows.",
    ),
    criteria: [
      {
        id: "L1.valve_visible",
        kind: "visibility",
        text: t("Veden sulkuventtiili näkyy", "En avstängningsventil för vattnet syns", "A water shut-off valve is visible"),
      },
      {
        id: "L1.handle_visible",
        kind: "visibility",
        text: t("Sen kahva tai vipu näkyy", "Dess handtag eller spak syns", "Its handle or lever is visible"),
      },
      {
        id: "L1.no_leak",
        kind: "condition",
        text: t(
          "Venttiilissä ei ole vuotoa, tippumista, ruostetta eikä vesijälkiä",
          "Inget läckage, dropp, korrosion eller vattenfläckar vid ventilen",
          "No leak, drip, corrosion or water stains at the valve",
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
      "Jos venttiili vuotaa tai on jumissa, ota yhteys putkimieheen tai taloyhtiössä isännöitsijään. Opettele sulkemaan se ennen kuin tarvitset sitä.",
      "Om ventilen droppar eller sitter fast, kontakta en rörmokare eller disponenten i ett bostadsbolag. Lär dig stänga den innan du behöver det.",
      "If the valve drips or is stuck, call a plumber or, in a flat, the property manager. Learn how to close it before you need to.",
    ),
    recheck: { kind: "yearly" },
  },
  {
    id: "L2",
    peril: "leak",
    homeTypes: ["flat", "house", "cottage"],
    title: t("Pesukoneen letku ja oma hana", "Tvättmaskinens slang och egen kran", "Washing-machine hose and its own tap"),
    coach: t(
      "Vedä konetta tarvittaessa hieman esiin. Kuvaa letku hanasta koneeseen sekä hana.",
      "Dra vid behov ut maskinen lite. Fotografera slangen från kranen till maskinen, och kranen.",
      "Pull the machine out a little if needed. Show the hose from the tap to the machine, and the tap.",
    ),
    criteria: [
      {
        id: "L2.hose_visible",
        kind: "visibility",
        text: t(
          "Täyttöletku näkyy hanasta koneeseen asti",
          "Påfyllningsslangen syns från kranen till maskinen",
          "The fill hose is visible from the tap to the machine",
        ),
      },
      {
        id: "L2.tap_visible",
        kind: "visibility",
        text: t("Koneen oma sulkuhana näkyy", "Maskinens egen avstängningskran syns", "The machine's own shut-off tap is visible"),
      },
      {
        id: "L2.hose_ok",
        kind: "condition",
        text: t(
          "Letkussa ja liitoksissa ei ole tippumista, taitetta, pullistumaa, halkeamaa eikä ruostetta",
          "Inget dropp, veck, bula, spricka eller rost på slangen eller kopplingarna",
          "No drip, kink, bulge, crack or rust on the hose or its connections",
        ),
      },
    ],
    clauseIds: ["OMA-5.5.6"],
    clauseFit: "direct",
    notApplicableAllowed: true,
    defaultOwner: { default: "me" },
    fixHint: t(
      "Vaihda kulunut letku uuteen paineenkestävään letkuun. Sulje hana, kun kone ei ole käytössä.",
      "Byt en sliten slang mot en ny trycktålig slang. Stäng kranen när maskinen inte används.",
      "Replace a worn hose with a new pressure-proof hose. Close the tap when the machine is not in use.",
    ),
    recheck: { kind: "yearly" },
  },
  {
    id: "L3",
    peril: "leak",
    homeTypes: ["flat", "house", "cottage"],
    title: t("Astianpesukoneen letku ja hana", "Diskmaskinens slang och kran", "Dishwasher hose and tap"),
    coach: t(
      "Avaa altaan alakaappi tai astianpesukoneen vieressä oleva sokkeli. Kuvaa vesiliitäntä.",
      "Öppna skåpet under diskbänken eller sockeln bredvid diskmaskinen. Fotografera vattenanslutningen.",
      "Open the cabinet under the sink, or the plinth next to the dishwasher. Show the water connection.",
    ),
    criteria: [
      {
        id: "L3.connection_visible",
        kind: "visibility",
        text: t("Astianpesukoneen vesiliitäntä näkyy", "Diskmaskinens vattenanslutning syns", "The dishwasher's water connection is visible"),
      },
      {
        id: "L3.tap_present",
        kind: "condition",
        text: t(
          "Astianpesukoneen sulkuhana näkyy",
          "En avstängningskran för diskmaskinen syns",
          "A shut-off tap for the dishwasher is visible",
        ),
      },
      {
        id: "L3.no_leak",
        kind: "condition",
        text: t(
          "Ei tippumista, taitetta, pullistumaa eikä vesijälkiä",
          "Inget dropp, veck, bula eller vattenfläckar",
          "No drip, kink, bulge or water stains",
        ),
      },
    ],
    clauseIds: [],
    clauseFit: "none",
    guideNote: t(
      "Ifin kotiopas: astianpesukoneelle oma sulkuhana ja kaukalo. Ehtojen kohta 5.5.6 soveltuvin osin.",
      "Ifs hemguide: en egen avstängningskran och ett tråg för diskmaskinen. Villkorens punkt 5.5.6 i tillämpliga delar.",
      "If's home guide: a shut-off tap and a drip tray for the dishwasher. Terms 5.5.6 by analogy.",
    ),
    notApplicableAllowed: true,
    defaultOwner: { default: "me" },
    fixHint: t(
      "Pyydä putkimiestä asentamaan astianpesukoneelle oma sulkuhana. Vaihda kulunut letku.",
      "Låt en rörmokare montera en egen avstängningskran för diskmaskinen. Byt en sliten slang.",
      "Have a plumber fit a shut-off tap for the dishwasher. Replace a worn hose.",
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
      "Kuvaa lattia pesukoneen tai jääkaapin alta ja edestä. Näytä kaukalon reuna tai lähin lattiakaivo.",
      "Fotografera golvet under och framför tvättmaskinen eller kylskåpet. Visa trågets kant eller närmaste golvbrunn.",
      "Photograph the floor under and in front of the washing machine or fridge. Show the tray edge or the nearest floor drain.",
    ),
    criteria: [
      {
        id: "L4.floor_visible",
        kind: "visibility",
        text: t("Lattia laitteen alla näkyy", "Golvet under apparaten syns", "The floor under the appliance is visible"),
      },
      {
        id: "L4.tray_or_drain",
        kind: "condition",
        text: t(
          "Laitteen alla on kaukalo tai aivan vieressä on lattiakaivo",
          "Det finns ett tråg under apparaten eller en golvbrunn alldeles intill",
          "A drip tray is under it, or a floor drain is right next to it",
        ),
      },
      {
        id: "L4.dry",
        kind: "condition",
        text: t(
          "Lattialla tai kaukalossa ei ole vettä eikä jälkiä",
          "Inget vatten eller fläckar på golvet eller i tråget",
          "No water or stains on the floor or tray",
        ),
      },
    ],
    clauseIds: ["OMA-5.5.8"],
    clauseFit: "direct",
    notApplicableAllowed: false,
    defaultOwner: { default: "me" },
    fixHint: t(
      "Laita laitteen alle turvakaukalo. Niitä saa edullisesti rautakaupasta.",
      "Ställ ett tråg under apparaten. Det finns billigt i järnhandeln.",
      "Put a drip tray under the appliance. Hardware stores sell them cheaply.",
    ),
    recheck: { kind: "yearly" },
  },
  {
    id: "L5",
    peril: "leak",
    homeTypes: ["flat", "house", "cottage"],
    title: t("Lattiakaivo ja vesilukko", "Golvbrunn och vattenlås", "Floor drain and sink trap"),
    coach: t(
      "Kuvaa kylpyhuoneen lattiakaivo ylhäältä tai altaan alla oleva vesilukko.",
      "Fotografera badrummets golvbrunn uppifrån eller vattenlåset under ett handfat.",
      "Photograph the bathroom floor drain from above, or the trap under a sink.",
    ),
    criteria: [
      {
        id: "L5.drain_visible",
        kind: "visibility",
        text: t("Lattiakaivo tai vesilukko näkyy", "En golvbrunn eller ett vattenlås syns", "A floor drain or a sink trap is visible"),
      },
      {
        id: "L5.clear",
        kind: "condition",
        text: t(
          "Kaivossa tai vesilukossa ei ole tukosta, seisovaa vettä eikä vuotoa",
          "Inget stopp, stående vatten eller läckage vid brunnen eller vattenlåset",
          "No blockage, standing water or leak at the drain or trap",
        ),
      },
    ],
    clauseIds: ["OMA-5.5.7", "OMA-5.5.9"],
    clauseFit: "direct",
    notApplicableAllowed: false,
    defaultOwner: { default: "me" },
    fixHint: t(
      "Puhdista kaivo tai vesilukko: nosta kansi, poista hiukset ja lika ja huuhtele. Kiristä vuotava mutteri.",
      "Rengör brunnen eller vattenlåset: lyft locket, ta bort hår och smuts och spola. Dra åt en läckande mutter.",
      "Clean the drain or trap: lift the cover, remove hair and dirt, and rinse. Tighten a leaking nut.",
    ),
    recheck: { kind: "yearly" },
  },
  {
    id: "L6",
    peril: "leak",
    homeTypes: ["flat", "house", "cottage"],
    title: t("Kylpyhuoneen silikonisaumat", "Badrummets silikonfogar", "Bathroom silicone seams"),
    coach: t(
      "Kuvaa läheltä lattian ja seinän liitosta sekä suihkun tai ammeen reunoja. Käytä hyvää valoa.",
      "Fotografera nära där golvet möter väggen och vid duschens eller badkarets kanter. Använd bra ljus.",
      "Get close to where the floor meets the wall, and to the shower or bath edges. Use good light.",
    ),
    criteria: [
      {
        id: "L6.seams_visible",
        kind: "visibility",
        text: t(
          "Lattian ja seinän sekä suihkun tai ammeen saumat näkyvät läheltä",
          "Fogarna mellan golv och vägg och vid dusch eller badkar syns på nära håll",
          "The seams at floor-wall joints and shower or bath edges are visible up close",
        ),
      },
      {
        id: "L6.seams_intact",
        kind: "condition",
        text: t(
          "Saumat ovat ehjät: ei halkeamia, rakoja, irtoamista eikä mustaa hometta",
          "Fogarna är hela: inga sprickor, glipor, lossnade fogar eller svart mögel",
          "Seams intact, with no cracks, gaps, peeling or black mould",
        ),
      },
    ],
    clauseIds: ["OMA-4.1-vesieriste"],
    clauseFit: "exclusion",
    notApplicableAllowed: false,
    defaultOwner: { default: "me" },
    fixHint: t(
      "Leikkaa vaurioitunut sauma pois ja tee uusi saniteettisilikonilla. Anna kuivua vuorokausi ennen suihkua.",
      "Skär bort den skadade fogen och foga om med sanitetssilikon. Låt torka ett dygn innan du duschar.",
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
      "Fotografera brandvarnaren i taket. Tryck sedan på testknappen.",
      "Photograph the smoke alarm on the ceiling. Then press its test button.",
    ),
    criteria: [
      { id: "F1.alarm_visible", kind: "visibility", text: t("Palovaroitin näkyy", "En brandvarnare syns", "A smoke alarm is visible") },
      {
        id: "F1.mounted",
        kind: "condition",
        text: t(
          "Se on kiinni paikallaan, ei irrotettu eikä peitetty",
          "Den sitter på plats, inte nedtagen eller övertäckt",
          "It is mounted, not removed or covered",
        ),
      },
      {
        id: "F1.beeped",
        kind: "user",
        text: t("Painoin testinappia ja se piippasi", "Jag tryckte på testknappen och den pep", "I pressed the test button and it beeped"),
      },
    ],
    clauseIds: ["OMA-5.2.6"],
    clauseFit: "direct",
    notApplicableAllowed: false,
    defaultOwner: { default: "me" },
    fixHint: t(
      "Vaihda paristo tai osta uusi varoitin, jos se ei piippaa. Asenna vähintään yksi jokaisen kerroksen kattoon.",
      "Byt batteri eller köp en ny varnare om den inte piper. Sätt minst en i taket på varje våning.",
      "Change the battery, or buy a new alarm if it does not beep. Fit at least one on the ceiling of every floor.",
    ),
    recheck: { kind: "yearly" },
  },
  {
    id: "F2",
    peril: "fire",
    homeTypes: ["flat", "house", "cottage"],
    title: t("Sähkökeskus", "Elcentral", "Fuse box"),
    coach: t(
      "Avaa kaapin ovi ja kuvaa koko sähkökeskus edestä. Älä koske mihinkään sisällä.",
      "Öppna skåpluckan och fotografera hela elcentralen framifrån. Rör inget inuti.",
      "Open the cabinet door and photograph the whole fuse box from the front. Don't touch anything inside.",
    ),
    criteria: [
      {
        id: "F2.board_visible",
        kind: "visibility",
        text: t("Sähkökeskus tai ryhmäkeskus näkyy", "Elcentralen eller gruppcentralen syns", "The fuse box or distribution board is visible"),
      },
      {
        id: "F2.no_damage",
        kind: "condition",
        text: t(
          "Ei vaurioita, kärventymisjälkiä, puuttuvaa kantta eikä paljaita jännitteisiä osia",
          "Inga skador, brännmärken, saknat lock eller blottade strömförande delar",
          "No damage, scorch marks, missing cover or exposed live parts",
        ),
      },
      {
        id: "F2.rcd_visible",
        kind: "condition",
        text: t(
          "Vikavirtasuojakytkin (jossa TEST-painike) näkyy",
          "En jordfelsbrytare (med TEST-knapp) syns",
          "A residual-current device (RCD, with a TEST button) is visible",
        ),
      },
      {
        id: "F2.clear_front",
        kind: "condition",
        text: t(
          "Keskuksen edessä tai sitä vasten ei ole tavaraa",
          "Inget förvaras framför eller mot centralen",
          "Nothing stored against or in front of it",
        ),
      },
    ],
    clauseIds: ["OMA-5.2.7", "OMA-5.2.8"],
    clauseFit: "section",
    notApplicableAllowed: false,
    defaultOwner: { default: "professional" },
    fixHint: t(
      "Raivaa tila keskuksen edestä. Jos näet vaurioita tai kärventymistä tai vikavirtasuoja puuttuu, tilaa sähköasentaja. Älä korjaa itse.",
      "Röj undan framför centralen. Ser du skador eller brännmärken, eller saknas jordfelsbrytare, anlita en behörig elinstallatör. Laga inte själv.",
      "Clear the space in front. For damage, scorch marks or a missing RCD, call an authorised electrician. Don't fix it yourself.",
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
      "Dra ut kylskåpet lite eller använd mobilens lampa. Fotografera kondensorn på baksidan och sladdarna.",
      "Pull the fridge out a little, or use your phone's light. Show the coil at the back and the cords.",
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
          "Lauhduttimessa tai kompressorissa ei ole paksua pölyä",
          "Inget tjockt damm på kondensorn eller kompressorn",
          "No thick dust on the coil or compressor",
        ),
      },
      {
        id: "F3.cords_ok",
        kind: "condition",
        text: t("Johdot ja pistokkeet ovat ehjät", "Sladdar och stickproppar är hela", "Cords and plugs undamaged"),
      },
    ],
    clauseIds: ["OMA-5.2.7"],
    clauseFit: "section",
    notApplicableAllowed: false,
    defaultOwner: { default: "me" },
    fixHint: t(
      "Irrota pistoke ja imuroi pölyt takaa. Vaihdata vaurioitunut johto tai korjauta laite.",
      "Dra ur kontakten och dammsug baksidan. Låt byta en skadad sladd eller reparera apparaten.",
      "Unplug the fridge and vacuum the dust off the back. Have a damaged cord replaced or the appliance repaired.",
    ),
    recheck: { kind: "yearly" },
  },
  {
    id: "F4",
    peril: "fire",
    homeTypes: ["flat", "house", "cottage"],
    title: t("Liesitaso tyhjänä", "Spishällen tom", "Stove top clear"),
    coach: t(
      "Kuvaa koko liesitaso ylhäältä sellaisena kuin se yleensä on.",
      "Fotografera hela spishällen uppifrån, så som den brukar se ut.",
      "Photograph the whole stove top from above, as it usually is.",
    ),
    criteria: [
      { id: "F4.stove_visible", kind: "visibility", text: t("Liesitaso näkyy", "Spishällen syns", "The stove top is visible") },
      {
        id: "F4.nothing_stored",
        kind: "condition",
        text: t(
          "Sen päällä ei säilytetä mitään (ei papereita, laatikoita, pyyhkeitä eikä kattiloita)",
          "Inget förvaras på den (inga papper, lådor, handdukar eller kastruller)",
          "Nothing stored on it (no paper, boxes, towels or pans left on)",
        ),
      },
    ],
    clauseIds: [],
    clauseFit: "none",
    guideNote: t(
      "Liedellä tai sen lähellä olevat tavarat ovat keittiöpalojen yleisin syy (SPEK).",
      "Föremål på eller nära spisen är den vanligaste orsaken till köksbränder (SPEK).",
      "Items on or near the stove are the top cause of kitchen fires (SPEK).",
    ),
    notApplicableAllowed: false,
    defaultOwner: { default: "me" },
    fixHint: t(
      "Pidä liesitaso tyhjänä ja säilytä tavarat muualla. Liesivahti lisää turvaa.",
      "Håll spishällen tom och förvara saker någon annanstans. En spisvakt ger extra säkerhet.",
      "Keep the stove top empty and store things elsewhere. A stove guard adds safety.",
    ),
    recheck: { kind: "yearly" },
  },
  {
    id: "F5",
    peril: "fire",
    homeTypes: ["flat", "house", "cottage"],
    title: t("Missä lataat laitteita", "Där du laddar apparater", "Where you charge devices"),
    coach: t(
      "Kuvaa paikka, jossa yleensä lataat puhelinta, läppäriä tai sähköpyörän akkua, ja sen ympäristö.",
      "Fotografera platsen där du brukar ladda telefon, dator eller elcykelbatteri, och det som finns runt omkring.",
      "Photograph the spot where you usually charge phones, laptops or e-bike batteries, and what is around it.",
    ),
    criteria: [
      {
        id: "F5.spot_visible",
        kind: "visibility",
        text: t(
          "Puhelinten, läppärien tai sähköpyörän akkujen latauspaikka näkyy",
          "Laddplatsen för telefoner, datorer eller elcykelbatterier syns",
          "The charging spot for phones, laptops or e-bike batteries is visible",
        ),
      },
      {
        id: "F5.safe_surface",
        kind: "condition",
        text: t(
          "Lataus tapahtuu kovalla alustalla, kaukana sängyistä, sohvista, verhoista ja tekstiileistä",
          "Laddningen sker på ett hårt underlag, långt från sängar, soffor, gardiner och textilier",
          "Charging on a hard surface, away from beds, sofas, curtains and textiles",
        ),
      },
    ],
    clauseIds: ["OMA-5.2.17"],
    clauseFit: "direct",
    notApplicableAllowed: false,
    defaultOwner: { default: "me" },
    fixHint: t(
      "Siirrä lataus kovalle alustalle, kuten pöydälle tai laattalattialle, kauas tekstiileistä. Älä jätä latausta valvomatta.",
      "Flytta laddningen till ett hårt underlag, som ett bord eller klinkergolv, bort från textilier. Lämna inte laddningen utan uppsikt.",
      "Move charging to a hard surface, such as a table or tiled floor, away from textiles. Don't leave it charging unattended.",
    ),
    recheck: { kind: "yearly" },
  },

  // ---------------------------------------------------------------- freeze
  {
    id: "Z1",
    peril: "freeze",
    homeTypes: ["house", "cottage"],
    title: t("Lämmitys kylmänä vuodenaikana", "Uppvärmning under den kalla årstiden", "Heating for the cold season"),
    coach: t(
      "Kuvaa termostaatti, lämmityksen säädin tai patterin asetus.",
      "Fotografera termostaten, värmeregleringen eller ett elements inställning.",
      "Photograph the thermostat, the heating controller or a radiator setting.",
    ),
    criteria: [
      {
        id: "Z1.control_visible",
        kind: "visibility",
        text: t(
          "Termostaatti, lämmityksen säädin tai patterin säätö näkyy",
          "En termostat, värmereglering eller elementinställning syns",
          "A thermostat, heating controller or radiator setting is visible",
        ),
      },
      {
        id: "Z1.heating_on",
        kind: "user",
        text: t(
          "Lämmitys on päällä kaikissa tiloissa, joissa on vesiputkia",
          "Värmen är på i alla rum med vattenrör",
          "Heating is on in every room with water pipes",
        ),
      },
    ],
    clauseIds: ["OMA-5.5.1", "OMA-5.5.2"],
    clauseFit: "direct",
    notApplicableAllowed: false,
    defaultOwner: { default: "me" },
    fixHint: t(
      "Laita lämmitys päälle kaikkiin tiloihin, joissa on vesiputkia, ennen kylmää kautta.",
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
      "Fotografera utekranen så att det syns om en slang är ansluten.",
      "Photograph the outdoor tap so it shows whether a hose is attached.",
    ),
    criteria: [
      { id: "Z2.tap_visible", kind: "visibility", text: t("Ulkohana näkyy", "Utekranen syns", "The outdoor tap is visible") },
      { id: "Z2.no_hose", kind: "condition", text: t("Hanaan ei ole kiinnitetty letkua", "Ingen slang är ansluten", "No hose attached") },
      {
        id: "Z2.indoor_valve_closed",
        kind: "user",
        text: t(
          "Suljin ulkohanan sisäpuolisen sulkuventtiilin",
          "Jag stängde inomhusventilen för utekranen",
          "I closed the indoor valve for the outdoor tap",
        ),
      },
    ],
    clauseIds: ["OMA-5.5.4"],
    clauseFit: "direct",
    notApplicableAllowed: true,
    defaultOwner: { default: "me" },
    fixHint: t(
      "Irrota letku, sulje sisäpuolinen venttiili ja avaa ulkohana, jotta vesi valuu pois.",
      "Ta bort slangen, stäng inomhusventilen och öppna utekranen så att vattnet rinner ut.",
      "Remove the hose, close the indoor valve and open the outdoor tap to let the water out.",
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
      "Kuvaa maasta käsin räystäskouru ja syöksytorvi aina sinne asti, minne vesi menee.",
      "Fotografera från marken en hängränna och stupröret ända ner till där vattnet leds.",
      "From the ground, photograph a gutter and the downpipe down to where the water goes.",
    ),
    criteria: [
      {
        id: "S1.gutter_visible",
        kind: "visibility",
        text: t("Räystäskouru tai syöksytorvi näkyy", "En hängränna eller ett stuprör syns", "A gutter or downpipe is visible"),
      },
      {
        id: "S1.clear_and_away",
        kind: "condition",
        text: t(
          "Ei lehtiä, roskia eikä ylivuotoa, ja syöksytorvi ohjaa veden pois seinän vierestä",
          "Inga löv, skräp eller överrinning, och stupröret leder vattnet bort från väggen",
          "No leaves, debris or overflow; the downpipe leads water away from the wall",
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
      "Clear the leaves from the gutters. Add an extension or a splash block so water runs away from the wall.",
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
    "Etsi veden pääsulkuventtiili. Se on yleensä vesimittarin vieressä, missä vesiputki tulee sisään. Näytä kahva kuvassa.",
    "Leta upp huvudavstängningsventilen. Den sitter oftast vid vattenmätaren, där vattenröret kommer in. Visa handtaget.",
    "Find the main water valve. It is usually by the water meter, where the pipe comes in. Show the handle.",
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
    "Jos pääsulkuventtiili vuotaa tai on jumissa, tilaa putkimies. Opettele sulkemaan se ennen kuin tarvitset sitä.",
    "Om huvudventilen droppar eller sitter fast, anlita en rörmokare. Lär dig stänga den innan du behöver det.",
    "If the main valve drips or is stuck, call a plumber. Learn how to close it before you need to.",
  ),
};

const VARIANTS: Record<string, Partial<Record<HomeType, HomeVariant>>> = {
  L1: {
    house: MAIN_VALVE,
    cottage: MAIN_VALVE,
    flat: {
      coach: t(
        "Katso keittiön altaan alta, pesukoneen takaa tai kylpyhuoneesta. Kuvaa sulkuventtiili niin, että kahva näkyy.",
        "Titta under diskbänken, bakom tvättmaskinen eller i badrummet. Fotografera en avstängningsventil så att handtaget syns.",
        "Look under the kitchen sink, behind the washing machine or in the bathroom. Photograph a shut-off valve so the handle shows.",
      ),
      criteria: {
        "L1.valve_visible": t(
          "Asunnon tai kodinkoneen vesisulku näkyy",
          "Lägenhetens avstängningsventil eller en maskins egen ventil syns",
          "The flat's water shut-off or an appliance shut-off valve is visible",
        ),
      },
      clauseFit: "section",
      fixHint: t(
        "Jos venttiili vuotaa tai on jumissa, kerro isännöitsijälle tai huoltoyhtiölle. Opettele sulkemaan se ennen kuin tarvitset sitä.",
        "Om ventilen droppar eller sitter fast, meddela disponenten eller fastighetsservicen. Lär dig stänga den innan du behöver det.",
        "If the valve drips or is stuck, tell the property manager or maintenance company. Learn how to close it before you need to.",
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
          "Heating is on in every room with water pipes, or the water system is drained",
        ),
      },
      clauseIds: ["OMA-5.5.1", "OMA-5.5.2"],
      fixHint: t(
        "Laita lämmitys päälle tiloihin, joissa on vesiputkia. Jos jätät mökin kylmäksi, tyhjennä vesijärjestelmä.",
        "Sätt på värmen i rum med vattenrör. Om du lämnar stugan kall, töm vattensystemet.",
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
    recheck: check.recheck.kind === "seasonal" ? { kind: "seasonal", months: [...check.recheck.months] } : { ...check.recheck },
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
export function criterionText(check: CheckDefinition, criterionId: string, homeType: HomeType): Localized | undefined {
  const variant = VARIANTS[check.id]?.[homeType]?.criteria?.[criterionId];
  return variant ?? check.criteria.find((c) => c.id === criterionId)?.text;
}

/** The fix hint for a home type (L1 and Z1 differ). */
export function fixHintFor(check: CheckDefinition, homeType: HomeType): Localized {
  return VARIANTS[check.id]?.[homeType]?.fixHint ?? check.fixHint;
}
