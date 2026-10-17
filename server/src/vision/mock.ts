import type { Lang, VisionAssessment } from "@prepared-home/engine";
import { allNull } from "./prompt";
import type { VisionInput, VisionProvider } from "./types";

export const OFFLINE_HINT: Record<Lang, string> = {
  en: "Offline demo: no live check",
  fi: "Offline-demo: kuvaa ei tarkistettu",
  sv: "Offlinedemo: fotot kontrollerades inte",
};

/** No model at all: every criterion is "can't tell", which the engine turns into a retake. */
export class MockVisionProvider implements VisionProvider {
  readonly name = "mock";
  readonly model = "mock";

  async assess(input: VisionInput): Promise<VisionAssessment> {
    return allNull(input.check, this.model, OFFLINE_HINT[input.lang] ?? OFFLINE_HINT.en);
  }
}
