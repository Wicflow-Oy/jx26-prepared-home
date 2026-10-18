import { View } from "react-native";

import { useT, useTheme } from "../../context";
import { formatDate } from "../../i18n";
import { Icon } from "../../icons";
import type { HomeModel } from "../../model";
import { Section, Txt } from "../../ui";

/** This week at a glance: today's progress, a fix that is due, and the next re-check. */
export function WeekSection({ model }: { model: HomeModel }) {
  const { t, lang } = useT();
  const titleOf = (id: string) => model.checkById.get(id)?.title[lang] ?? id;
  const fixReminder = model.reminders.find((r) => r.kind === "fix_first");
  return (
    <Section title={t("weekTitle")} testID="week">
      <WeekItem
        state={model.done > 0 ? "done" : "now"}
        when={t("today")}
        text={model.done > 0 ? t("weekDone", { count: model.done }) : t("weekStart")}
      />
      {fixReminder ? (
        <WeekItem
          state="now"
          when={formatDate(fixReminder.dueAt, lang)}
          text={t("weekFix", { title: fixReminder.checkIds.map(titleOf).join(", ") })}
        />
      ) : null}
      {model.nextRecheck ? (
        <WeekItem
          state="later"
          when={formatDate(model.nextRecheck.date, lang)}
          text={t("weekRecheck")}
        />
      ) : null}
    </Section>
  );
}

function WeekItem({
  state,
  when,
  text,
}: {
  state: "done" | "now" | "later";
  when: string;
  text: string;
}) {
  const theme = useTheme();
  const c = theme.colors;
  return (
    <View
      accessible
      accessibilityLabel={`${when}: ${text}`}
      style={{ flexDirection: "row", alignItems: "center", gap: theme.space.md, minHeight: 32 }}
    >
      <View
        aria-hidden
        style={{
          width: 16,
          height: 16,
          borderRadius: 8,
          borderWidth: 1.5,
          alignItems: "center",
          justifyContent: "center",
          borderColor: state === "done" ? c.primary : state === "now" ? c.warningMark : c.line,
          backgroundColor: state === "done" ? c.primary : c.background,
        }}
      >
        {state === "done" ? (
          <Icon name="check" size={10} color={c.textInverse} strokeWidth={2.5} />
        ) : null}
        {state === "now" ? (
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: c.warningMark }} />
        ) : null}
      </View>
      <Txt variant="small" muted style={{ width: 96 }}>
        {when}
      </Txt>
      <Txt variant="small" style={{ flex: 1 }}>
        {text}
      </Txt>
    </View>
  );
}
