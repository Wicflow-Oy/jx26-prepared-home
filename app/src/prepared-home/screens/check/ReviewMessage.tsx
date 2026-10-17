// The words under the photo card for each moment of a check: checking, the quick question, the verdict,
// an error, or all checks done.
import type { CheckDefinition, Home } from "@prepared-home/engine";
import { View } from "react-native";

import { useT, useTheme } from "../../context";
import { guidanceFor } from "./guidance";
import { Appear, Button, Segmented, TextLink, Txt } from "../../ui";
import type { useCheckRun } from "./useCheckRun";
import { FixMessage, OkMessage, RetakeMessage } from "./VerdictMessages";

export function ReviewMessage({
  flow,
  check,
  home,
  onRetry,
  onNext,
  onDetails,
  onHome,
  autoAdvance,
  secondAngle,
}: {
  flow: ReturnType<typeof useCheckRun>;
  check: CheckDefinition;
  home: Home;
  onRetry: () => void;
  onNext: () => void;
  onDetails: () => void;
  onHome: () => void;
  autoAdvance: boolean;
  secondAngle: { showButton: boolean; onTake: () => void };
}) {
  const { t, lang } = useT();
  const theme = useTheme();
  const { run } = flow;

  switch (run.status) {
    case "idle":
      return null;
    case "preparing":
    case "checking":
      return (
        <Appear>
          <Txt inverse style={{ textAlign: "center" }} testID="checking">
            {t("checkingPhoto")}
          </Txt>
        </Appear>
      );
    case "secondAngle":
      return (
        <Appear>
          <Txt variant="h2" inverse style={{ textAlign: "center" }} testID="move-aside">
            {t("moveAside")}
          </Txt>
          <Txt inverse muted style={{ textAlign: "center", marginTop: theme.space.xs }}>
            {t("moveAsideHint")}
          </Txt>
          {secondAngle.showButton ? (
            <Button
              label={t("takeSecond")}
              onPress={secondAngle.onTake}
              variant="light"
              icon="camera"
              style={{ marginTop: theme.space.lg }}
              testID="take-second"
            />
          ) : null}
        </Appear>
      );
    case "question":
      return (
        <Appear>
          <Txt variant="smallStrong" inverse>
            {t("quickQuestion")}
          </Txt>
          {flow.questions.map((c) => (
            <View key={c.id} style={{ marginTop: theme.space.md, gap: theme.space.sm }}>
              <Txt inverse>{c.text[lang]}</Txt>
              <Segmented
                testIDPrefix={`answer-${c.id}`}
                inverse
                value={c.id in flow.answers ? (flow.answers[c.id] ? "yes" : "no") : null}
                onChange={(v) => flow.answer(c.id, v === "yes")}
                options={[
                  { value: "yes", label: t("yes") },
                  { value: "no", label: t("no") },
                ]}
              />
            </View>
          ))}
        </Appear>
      );
    case "allDone":
      return (
        <Appear>
          <Txt variant="title" inverse style={{ textAlign: "center" }} testID="all-done">
            {t("allChecksDone")}
          </Txt>
          <Txt inverse muted style={{ textAlign: "center", marginTop: theme.space.sm }}>
            {t("allChecksDoneBody")}
          </Txt>
          <Button
            label={t("toHome")}
            onPress={onHome}
            variant="light"
            style={{ marginTop: theme.space.xl }}
          />
        </Appear>
      );
    case "error":
      return (
        <Appear>
          <Txt variant="h2" inverse style={{ textAlign: "center" }}>
            {run.message}
          </Txt>
          <Button
            label={t("tryAgain")}
            onPress={onRetry}
            variant="light"
            style={{ marginTop: theme.space.xl }}
            testID="try-again"
          />
          <TextLink label={t("doLater")} onPress={onNext} inverse center testID="review-do-later" />
        </Appear>
      );
    case "done": {
      const { stored } = run;
      const { outcome, source } = stored;
      const guidance = guidanceFor({ check, home, outcome, source, lang, t });
      if (guidance.kind === "ok")
        return (
          <OkMessage
            title={check.title[lang]}
            capture={stored.capture ?? "camera"}
            newlyPrepared={run.newlyPrepared}
            onNext={onNext}
            onDetails={onDetails}
            autoAdvance={autoAdvance}
          />
        );
      if (guidance.kind === "retake")
        return <RetakeMessage guidance={guidance} onRetry={onRetry} onLater={onNext} />;
      return (
        <FixMessage
          guidance={guidance}
          urgent={stored.outcome.urgent}
          onRetry={onRetry}
          onNext={onNext}
          onDetails={onDetails}
        />
      );
    }
  }
}
