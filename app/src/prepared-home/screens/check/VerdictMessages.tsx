// What to do after a verdict: move on (check), take a better photo (unclear photo) or fix something first.
import type { Peril } from "@prepared-home/engine";
import { useState } from "react";
import { View } from "react-native";

import { useT, useTheme } from "../../context";
import { addDaysIso, formatDate, todayIso } from "../../i18n";
import { ownerLabel, perilLabel, PHOTO_COUNT_NOTE, type PhotoCount } from "../../model";
import { Appear, Button, TextLink, Txt } from "../../ui";
import { AutoNextButton } from "./AutoNextButton";
import { ResultSummary } from "./ResultSummary";
import type { Guidance } from "./guidance";

/** A fix-first check shows in Reminders a week later, as in the engine's reminders. */
const REMINDER_DAYS = 7;
const center = { textAlign: "center" } as const;

export function OkMessage({
  spoken,
  title,
  count,
  newlyPrepared,
  onNext,
  onDetails,
  onTakeSecond,
  autoAdvance,
}: {
  spoken: string;
  title: string;
  count: PhotoCount;
  newlyPrepared: Peril[];
  onNext: () => void;
  onDetails: () => void;
  /** Takes only the second angle again, for a camera check that has just one. */
  onTakeSecond: () => void;
  autoAdvance: boolean;
}) {
  const { t, lang } = useT();
  const theme = useTheme();
  const counts = count === "counts";
  return (
    <Appear index={1}>
      <ResultSummary spoken={spoken}>
        <Txt variant="h2" inverse style={center}>
          {title}
        </Txt>
        <Txt inverse muted style={center} testID="looks-good">
          {t("looksGood")}
        </Txt>
        {count === "counts" ? null : (
          <Txt
            variant="small"
            inverse
            style={[center, { marginTop: theme.space.sm }]}
            testID="not-counted"
          >
            {t(PHOTO_COUNT_NOTE[count])}
          </Txt>
        )}
        {newlyPrepared.map((p) => (
          <Txt key={p} variant="small" inverse style={[center, { marginTop: theme.space.xs }]}>
            {t("preparedNow", { peril: perilLabel(p, lang) })}
          </Txt>
        ))}
      </ResultSummary>
      {count === "oneAngle" ? (
        <Button
          label={t("takeSecond")}
          onPress={onTakeSecond}
          variant="light"
          icon="camera"
          style={{ marginTop: theme.space.lg }}
          testID="take-second-again"
        />
      ) : null}
      {/* A line about the photo not counting needs time to read, so the flow then waits for a tap. */}
      <AutoNextButton label={t("nextButton")} onPress={onNext} auto={autoAdvance && counts} />
      <TextLink label={t("details")} onPress={onDetails} inverse center testID="details" />
    </Appear>
  );
}

export function RetakeMessage({
  spoken,
  guidance,
  onRetry,
  onLater,
}: {
  spoken: string;
  guidance: Extract<Guidance, { kind: "retake" }>;
  onRetry: () => void;
  onLater: () => void;
}) {
  const { t } = useT();
  const theme = useTheme();
  return (
    <Appear index={1}>
      <ResultSummary spoken={spoken}>
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
      </ResultSummary>
      <Button
        label={t("retry")}
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
  spoken,
  guidance,
  urgent,
  onRetry,
  onNext,
  onDetails,
}: {
  spoken: string;
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
      <ResultSummary spoken={spoken}>
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
      </ResultSummary>
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
