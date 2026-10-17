import type { Lang } from "@prepared-home/engine";

// User-facing notes that say where a result came from (CONTRACTS §9.2, §9.3).
type NoteKey = "recorded" | "perIp" | "daily" | "offline" | "error";

const NOTES: Record<NoteKey, Record<Lang, string>> = {
  recorded: {
    en: "Recorded live result ({date})",
    fi: "Tallennettu tulos oikeasta tarkistuksesta ({date})",
    sv: "Sparat resultat från en riktig kontroll ({date})",
  },
  perIp: {
    en: "Live check limit reached; try a sample photo.",
    fi: "Tarkistusten raja tuli täyteen; kokeile esimerkkikuvaa.",
    sv: "Gränsen för kontroller är nådd; prova ett exempelfoto.",
  },
  daily: {
    en: "Live checks are paused for today; try a sample photo.",
    fi: "Tarkistukset on keskeytetty tältä päivältä; kokeile esimerkkikuvaa.",
    sv: "Kontrollerna är pausade för i dag; prova ett exempelfoto.",
  },
  offline: {
    en: "Offline demo: no live check.",
    fi: "Offline-demo: kuvaa ei tarkistettu.",
    sv: "Offlinedemo: fotot kontrollerades inte.",
  },
  error: {
    en: "Couldn't reach the photo check. Try again.",
    fi: "Kuvan tarkistus ei onnistunut. Yritä uudelleen.",
    sv: "Fotokontrollen gick inte att nå. Försök igen.",
  },
};

export function note(key: NoteKey, lang: Lang, vars: { date?: string } = {}): string {
  const text = NOTES[key][lang] ?? NOTES[key].en;
  return text.replace("{date}", vars.date ?? "");
}
