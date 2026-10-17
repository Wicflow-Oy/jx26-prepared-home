import { View } from "react-native";

import { useT, useTheme } from "../../context";
import { formatDate, type StringKey } from "../../i18n";
import { rowLabel, rowTone, type HomeModel, type NextStep } from "../../model";
import { Button, Card, Tag, Txt } from "../../ui";

const BUTTON: Record<NextStep["kind"], StringKey> = {
  fix: "nextButtonFix",
  retake: "nextButtonRetake",
  missing: "nextButtonMissing",
  overdue: "nextButtonOverdue",
  camera: "nextButtonCamera",
};

/** The one thing to do now, or "All done" with the next re-check. */
export function NextStepCard({
  model,
  onOpen,
}: {
  model: HomeModel;
  onOpen: (checkId: string) => void;
}) {
  const { t, lang } = useT();
  const theme = useTheme();
  const next = model.nextStep;
  const state = next ? model.rowState(next.check.id) : null;
  const title = next?.check.title[lang] ?? "";
  return (
    <Card raised testID="next-step" style={{ marginTop: theme.space.xl }}>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          minHeight: 24,
        }}
      >
        <Txt variant="label">{t("nextStep")}</Txt>
        {state ? <Tag label={rowLabel(state, t, lang)} tone={rowTone(state)} /> : null}
      </View>
      {next ? (
        <>
          {/* Long check names step down a size so the card stays calm on a phone. */}
          <Txt variant={title.length > 28 ? "h2" : "title"} style={{ marginTop: theme.space.sm }}>
            {title}
          </Txt>
          <Txt variant="small" muted style={{ marginTop: theme.space.xs }}>
            {next.kind === "fix" ? next.check.fixHint[lang] : next.check.coach[lang]}
          </Txt>
          <Button
            label={t(BUTTON[next.kind])}
            icon="camera"
            onPress={() => onOpen(next.check.id)}
            accessibilityHint={title}
            testID="next-step-open"
            style={{ marginTop: theme.space.lg }}
          />
        </>
      ) : (
        <Txt variant="title" style={{ marginTop: theme.space.sm }}>
          {model.nextRecheck
            ? t("allDone", { date: formatDate(model.nextRecheck.date, lang) })
            : t("allDoneNoDate")}
        </Txt>
      )}
    </Card>
  );
}
