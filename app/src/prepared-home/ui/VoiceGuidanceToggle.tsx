import { usePreparedHome } from "../context";
import { ToggleRow } from "./ToggleRow";

/** The one accessibility setting: on by itself while a screen reader runs, until the customer chooses. */
export function VoiceGuidanceToggle() {
  const { t, voiceGuidance, setVoiceGuidance } = usePreparedHome();
  return (
    <ToggleRow
      label={t("voiceGuidance")}
      hint={t("voiceGuidanceHint")}
      value={voiceGuidance}
      onChange={setVoiceGuidance}
      testID="voice-guidance"
    />
  );
}
