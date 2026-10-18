// The web demo camera: a licensed photo of the spot to aim at, for visitors without a phone camera.
import type { Area } from "./types";

const en = {
  demoCamera: "Demo camera · sample scene",
  demoHint: "Drag to aim, scroll or pinch to zoom, then take the photo.",
  nextScene: "Next scene",
  demoNote:
    "Demo shots show a recorded check of this example photo and don't count toward the lower deductible.",
};

export const demo: Area<typeof en> = {
  en,
  fi: {
    demoCamera: "Demokamera · esimerkkinäkymä",
    demoHint: "Rajaa vetämällä, zoomaa vierittämällä tai nipistämällä ja ota sitten kuva.",
    nextScene: "Seuraava näkymä",
    demoNote:
      "Demokuvissa näkyy tämän esimerkkikuvan tallennettu tarkistus, eivätkä ne laske pienempään omavastuuseen.",
  },
  sv: {
    demoCamera: "Demokamera · exempelvy",
    demoHint: "Dra för att sikta, scrolla eller nyp för att zooma och ta sedan bilden.",
    nextScene: "Nästa vy",
    demoNote:
      "Demobilder visar en sparad kontroll av den här exempelbilden och räknas inte för den lägre självrisken.",
  },
};
