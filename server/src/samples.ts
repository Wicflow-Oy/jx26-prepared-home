// Licensed sample photos for judges without a camera (CONTRACTS §9.3). Files come from SAMPLES_DIR.

import { promises as fs } from "node:fs";
import path from "node:path";
import type { Lang, Localized, Verdict } from "@prepared-home/engine";
import { sha256Hex } from "./hash";
import { jpegSize } from "./jpeg";

export interface SampleDef {
  id: string;
  file: string;
  checkId: string;
  expectedVerdict: Verdict;
  urgent: boolean;
  caption: Localized;
  author: string;
  licence: string;
  sourceUrl: string; // Wikimedia Commons file page
}

export const SAMPLE_DEFS: SampleDef[] = [
  {
    id: "A07",
    file: "A07.jpg",
    checkId: "L1",
    expectedVerdict: "verified",
    urgent: false,
    caption: {
      en: "Ball valve on a copper pipe",
      fi: "Palloventtiili kupariputkessa",
      sv: "Kulventil på ett kopparrör",
    },
    author: "Tony Webster",
    licence: "CC BY 2.0",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Water_Pipe_Shutoff_Valve_(54273678839).jpg",
  },
  {
    id: "C01",
    file: "C01.jpg",
    checkId: "F2",
    expectedVerdict: "verified",
    urgent: false,
    caption: {
      en: "Fuse board with residual-current devices",
      fi: "Sähkökeskus, jossa on vikavirtasuojat",
      sv: "Elcentral med jordfelsbrytare",
    },
    author: "Pittigrilli",
    licence: "CC0",
    sourceUrl:
      "https://commons.wikimedia.org/wiki/File:ABB_230V_16A_fuses_in_fuse_box_in_German_shop,_2024.jpg",
  },
  {
    id: "B03",
    file: "B03.jpg",
    checkId: "L5",
    expectedVerdict: "fix_first",
    urgent: true,
    caption: {
      en: "Sink trap with water dripping from it",
      fi: "Vesilukko, josta tippuu vettä",
      sv: "Vattenlås som droppar",
    },
    author: "Tony Webster",
    licence: "CC BY 2.0",
    sourceUrl:
      "https://commons.wikimedia.org/wiki/File:Leaking_PVC_Pipe_Under_Sink_-_P_Trap_(52842956605).jpg",
  },
  {
    id: "C04",
    file: "C04.jpg",
    checkId: "F2",
    expectedVerdict: "fix_first",
    urgent: true,
    caption: {
      en: "Fuse board with its front cover removed",
      fi: "Sähkökeskus ilman etukantta",
      sv: "Elcentral utan frontkåpa",
    },
    author: "Dmitry G",
    licence: "CC BY-SA 3.0",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Fuse_box_hager.JPG",
  },
  {
    id: "B07",
    file: "B07.jpg",
    checkId: "L5",
    expectedVerdict: "retake",
    urgent: false,
    caption: {
      en: "Kitchen with the sink cupboard closed",
      fi: "Keittiö, jossa tiskipöydän kaappi on kiinni",
      sv: "Kök med diskbänksskåpet stängt",
    },
    author: "Kotivalo",
    licence: "CC BY-SA 3.0",
    sourceUrl:
      "https://commons.wikimedia.org/wiki/File:Integrated_kitchen_with_lower_cabinets_closed.jpg",
  },
  {
    id: "A05",
    file: "A05.jpg",
    checkId: "L1",
    expectedVerdict: "retake",
    urgent: false,
    caption: {
      en: "Water meter close-up with no valve in frame",
      fi: "Vesimittari lähikuvassa, venttiili ei näy",
      sv: "Vattenmätare på nära håll, ingen ventil i bild",
    },
    author: "JULIANISME",
    licence: "CC BY-SA 4.0",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:A_Water_Meter_Type_LXSC-15E.jpg",
  },
];

export interface SampleFile {
  def: SampleDef;
  path: string;
  sha256: string;
  width: number;
  height: number;
  bytes: number;
}

export function creditLine(def: SampleDef): string {
  return `Photo: ${def.author}, ${def.licence}, Wikimedia Commons`;
}

/** Reads the sample files once (hash and size), skipping any that are missing. Only listed files are ever served. */
export class SampleCatalog {
  private loaded: Promise<SampleFile[]> | null = null;

  constructor(readonly dir: string) {}

  all(): Promise<SampleFile[]> {
    this.loaded ??= this.load();
    return this.loaded;
  }

  private async load(): Promise<SampleFile[]> {
    const out: SampleFile[] = [];
    for (const def of SAMPLE_DEFS) {
      const file = path.join(this.dir, def.file);
      try {
        const buf = await fs.readFile(file);
        const size = jpegSize(buf);
        if (!size) continue;
        out.push({
          def,
          path: file,
          sha256: sha256Hex(buf),
          width: size.width,
          height: size.height,
          bytes: buf.length,
        });
      } catch {
        // missing sample: not listed
      }
    }
    return out;
  }

  async byFile(name: string): Promise<SampleFile | null> {
    return (await this.all()).find((s) => s.def.file === name) ?? null;
  }
}

export function sampleView(s: SampleFile, lang: Lang, recordedAt: string | null) {
  return {
    id: s.def.id,
    file: s.def.file,
    url: `/samples/${s.def.file}`,
    checkId: s.def.checkId,
    expectedVerdict: s.def.expectedVerdict,
    urgent: s.def.urgent,
    caption: s.def.caption[lang] ?? s.def.caption.en,
    credit: creditLine(s.def),
    author: s.def.author,
    licence: s.def.licence,
    sourceUrl: s.def.sourceUrl,
    sha256: s.sha256,
    width: s.width,
    height: s.height,
    recorded: recordedAt !== null,
    recordedAt,
  };
}
