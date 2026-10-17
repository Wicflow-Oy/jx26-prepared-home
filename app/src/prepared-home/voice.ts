// Voice guidance: says each step and result aloud in the app's language. With a screen reader on, the same
// words go to the screen reader instead, so the app never talks over TalkBack or VoiceOver.
import type { Lang } from "@prepared-home/engine";
import * as Speech from "expo-speech";
import { useCallback } from "react";
import { AccessibilityInfo } from "react-native";

import { usePreparedHome } from "./context";

const LOCALE: Record<Lang, string> = { en: "en-GB", fi: "fi-FI", sv: "sv-SE" };

/** The installed voice for each language, looked up once; the system default is used when none matches. */
const chosenVoice: Partial<Record<Lang, string | null>> = {};

async function voiceFor(lang: Lang): Promise<string | undefined> {
  if (chosenVoice[lang] === undefined) {
    try {
      const voices = await Speech.getAvailableVoicesAsync();
      // Voices on the phone only: a network voice would need a download before it can speak.
      const own = voices.filter(
        (v) => v.language.toLowerCase().startsWith(lang) && !/network/i.test(v.identifier),
      );
      const best = own.find((v) => v.quality === Speech.VoiceQuality.Enhanced) ?? own[0];
      chosenVoice[lang] = best?.identifier ?? null;
    } catch {
      chosenVoice[lang] = null;
    }
  }
  return chosenVoice[lang] ?? undefined;
}

export function useVoice() {
  const { voiceGuidance, screenReader, lang } = usePreparedHome();

  /** Says a step or a result. Each new message replaces the one still being spoken. */
  const say = useCallback(
    (text: string) => {
      if (!voiceGuidance || !text) return;
      if (screenReader) {
        AccessibilityInfo.announceForAccessibility(text);
        return;
      }
      void Speech.stop()
        .then(() => voiceFor(lang))
        .then((voice) => Speech.speak(text, { language: LOCALE[lang], voice }));
    },
    [voiceGuidance, screenReader, lang],
  );

  const quiet = useCallback(() => {
    void Speech.stop().catch(() => undefined);
  }, []);

  return { say, quiet, enabled: voiceGuidance, screenReader };
}
