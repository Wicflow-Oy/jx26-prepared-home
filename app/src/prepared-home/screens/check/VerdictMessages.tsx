// What to do after a verdict: move on (check), take a better photo (unclear photo) or fix something first.
import type { CaptureSource, Peril } from "@prepared-home/engine";
import { useState } from "react";
import { View } from "react-native";

import { useT, useTheme } from "../../context";
import { formatDate, todayIso } from "../../i18n";
import { ownerLabel, perilLabel } from "../../model";
import { Appear, Button, TextLink, Txt } from "../../ui";
import { addDaysIso } from "../../ui/DateStepper";
import { AutoNextButton } from "./AutoNextButton";
import type { Guidance } from "./guidance";

/** A fix-first check shows in Reminders a week later, as in the engine's reminders. */
const REMINDER_DAYS = 7;
const center = { textAlign: "center" } as const;

export function OkMessage({
  title,
  capture,
  newlyPrepared,
  onNext,
  onDetails,
  autoAdvance,
}: {
  title: string;
  capture: CaptureSource;
  newlyPrepared: Peril[];
  onNext: () => void;
  onDetails: () => void;
  autoAdvance: boolean;
}) {
  const { t, lang } = useT();
  const theme = useTheme();
  const counts = capture === "camera";
  return (
    <Appear index={1}>
      <Txt variant="h2" inverse style={center} numberOfLines={2}>
        {title}
      </Txt>
      <Txt inverse muted style={center} testID="looks-good">
        {t("looksGood")}
      </Txt>
      {counts ? null : (
        <Txt
          variant="small"
          inverse
          style={[center, { marginTop: theme.space.sm }]}
          testID="not-counted"
        >
          {t(capture === "sample" ? "countSample" : "countLibrary")}
        </Txt>
      )}
      {newlyPrepared.map((p) => (
        <Txt key={p} variant="small" inverse style={[center, { marginTop: theme.space.xs }]}>
          {t("preparedNow", { peril: perilLabel(p, lang) })}
        </Txt>
      ))}
      {/* A line about the photo not counting needs time to read, so the flow then waits for a tap. */}
      <AutoNextButton label={t("nextButton")} onPress={onNext} auto={autoAdvance && counts} />
      <TextLink label={t("details")} onPress={onDetails} inverse center testID="details" />
    </Appear>
  );
}

export function RetakeMessage({
  guidance,
  onRetry,
  onLater,
}: {
  guidance: Extract<Guidance, { kind: "retake" }>;
  onRetry: () => void;
  onLater: () => void;
}) {
  const { t } = useT();
  const theme = useTheme();
  return (
    <Appear index={1}>
      <Txt variant="h2" inverse style={center} testID="problem">
        {guidance.problem}
      </Txt>
      <View style={{ marginTop: theme.space.md, gap: theme.space.xs }} testID="tips">
        {guidance.tips.map((tip) => (
          <Txt key={tip} inverse muted>
            {`•  ${tip}`}
          </Txt>
        ))}
      </View>
      <Button
        label={t("tryAgain")}
        onPress={onRetry}
        variant="light"
        style={{ marginTop: theme.space.lg }}
        testID="try-again"
      />
      <TextLink label={t("doLater")} onPress={onLater} inverse center testID="review-do-later" />
    </Appear>
  );
}

/** Fix first: a real problem in the home, not a bad photo. */
export function FixMessage({
  guidance,
  urgent,
  onRetry,
  onNext,
  onDetails,
}: {
  guidance: Extract<Guidance, { kind: "fix" }>;
  urgent: boolean;
  onRetry: () => void;
  onNext: () => void;
  onDetails: () => void;
}) {
  const { t, lang } = useT();
  const theme = useTheme();
  const [reminded, setReminded] = useState<string | null>(null);
  const remind = () => {
    setReminded(t("remindedOn", { date: formatDate(addDaysIso(todayIso(), REMINDER_DAYS), lang) }));
    setTimeout(onNext, 900);
  };
  return (
    <Appear index={1}>
      {urgent ? (
        <Txt
          variant="smallStrong"
          inverse
          style={[center, { marginBottom: theme.space.xs }]}
          testID="urgent"
        >
          {t("urgent")}
        </Txt>
      ) : null}
      <Txt variant="h2" inverse style={center} testID="problem">
        {guidance.problem}
      </Txt>
      <Txt inverse style={[center, { marginTop: theme.space.xs }]} testID="fix-hint">
        {guidance.fix}
      </Txt>
      <Txt variant="small" inverse muted style={center}>
        {t("whoFixes", { owner: ownerLabel(guidance.owner, lang) })}
      </Txt>
      {reminded ? (
        <Txt
          variant="smallStrong"
          inverse
          style={[center, { marginTop: theme.space.lg }]}
          testID="reminded"
        >
          {reminded}
        </Txt>
      ) : (
        <>
          <Button
            label={t("remindMe")}
            onPress={remind}
            variant="light"
            style={{ marginTop: theme.space.lg }}
            testID="remind-me"
          />
          <Button
            label={t("tryAfterFix")}
            onPress={onRetry}
            variant="inverse"
            style={{ marginTop: theme.space.sm }}
            testID="try-again"
          />
          <View style={{ flexDirection: "row", justifyContent: "center", gap: theme.space.lg }}>
            <TextLink
              label={t("nextButton")}
              onPress={onNext}
              inverse
              center
              testID="review-next"
            />
            <TextLink label={t("details")} onPress={onDetails} inverse center testID="details" />
          </View>
        </>
      )}
    </Appear>
  );
}
