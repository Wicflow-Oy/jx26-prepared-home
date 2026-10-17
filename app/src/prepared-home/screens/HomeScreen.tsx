import { useRouter, type Href } from "expo-router";
import { View } from "react-native";

import { usePreparedHome, useTheme } from "../context";
import { formatDate, formatMonth, type StringKey } from "../i18n";
import { Icon, PERIL_ICON } from "../icons";
import {
  perilLabel,
  rowTone,
  useHomeModel,
  verdictLabel,
  type NextStep,
  type RowState,
} from "../model";
import {
  Appear,
  Button,
  Card,
  ConceptTag,
  Gap,
  IconButton,
  ListGroup,
  ListRow,
  LoadingState,
  NoHome,
  ProgressRing,
  Screen,
  Section,
  Tag,
  Txt,
} from "../ui";

const NEXT_BUTTON: Record<NextStep["kind"], StringKey> = {
  fix: "nextButtonFix",
  retake: "nextButtonRetake",
  missing: "nextButtonMissing",
  overdue: "nextButtonOverdue",
};

export function HomeScreen() {
  const { t, lang, paths, ready } = usePreparedHome();
  const theme = useTheme();
  const router = useRouter();
  const model = useHomeModel();

  const settingsButton = (
    <IconButton
      icon="sliders"
      label={t("settings")}
      onPress={() => router.push(paths.settings as Href)}
      testID="nav-settings"
    />
  );

  if (!ready || !model) {
    return (
      <Screen testID="home-screen" backTo={paths.start} right={settingsButton}>
        {!ready ? <LoadingState /> : <NoHome />}
      </Screen>
    );
  }

  const rowLabel = (s: RowState) =>
    s === "not_checked"
      ? t("row.notChecked")
      : s === "overdue"
        ? t("row.overdue")
        : verdictLabel(s, lang);
  const titleOf = (id: string) => model.checkById.get(id)?.title[lang] ?? id;

  const fixCount = model.perils.reduce((n, p) => n + p.fixFirst.length, 0);
  const remaining = model.checks.filter((c) => {
    const s = model.rowState(c.id);
    return s !== "verified" && s !== "not_applicable";
  });
  const next = model.nextStep;
  const nextBody = next
    ? next.kind === "fix"
      ? next.check.fixHint[lang]
      : next.check.coach[lang]
    : "";
  const fixReminder = model.reminders.find((r) => r.kind === "fix_first");
  const deductible = model.perils[0]?.deductible;

  return (
    <Screen testID="home-screen" backTo={paths.start} right={settingsButton}>
      <Txt variant="display">{t("homeTitle")}</Txt>
      <Gap size="xs" />
      <Txt variant="small" muted>
        {model.home.label}
      </Txt>
      <Gap size="xs" />
      <Txt muted>{t("homeLede")}</Txt>

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: theme.space.xl,
          marginTop: theme.space.xl,
          flexWrap: "wrap",
        }}
      >
        <ProgressRing
          testID="home-progress"
          done={model.done}
          fixFirst={fixCount}
          total={model.total}
          label={t("countOf", { done: model.done, total: model.total })}
          sublabel={t("ringChecked")}
          gapColor={theme.colors.background}
        />
        <View style={{ flex: 1, minWidth: 160 }}>
          {model.perils.map((p) => (
            <View
              key={p.peril}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: theme.space.sm,
                minHeight: 32,
              }}
            >
              <Icon name={PERIL_ICON[p.peril]} size={20} color={theme.colors.textMuted} />
              <Txt style={{ flex: 1 }}>{perilLabel(p.peril, lang)}</Txt>
              <Txt testID={`home-peril-count-${p.peril}`}>
                {t("countOf", {
                  done: p.verified.length + p.notApplicable.length,
                  total: p.required.length,
                })}
              </Txt>
            </View>
          ))}
          {remaining.length > 0 ? (
            <View
              style={{
                marginTop: theme.space.sm,
                paddingTop: theme.space.sm,
                borderTopWidth: 1,
                borderTopColor: theme.colors.line,
              }}
            >
              <Txt variant="small" muted>
                {t("toGo", {
                  count: remaining.length,
                  items: remaining
                    .slice(0, 3)
                    .map((c) => c.title[lang].toLowerCase())
                    .join(", "),
                })}
              </Txt>
            </View>
          ) : null}
        </View>
      </View>

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
          {next ? (
            <Tag
              label={rowLabel(model.rowState(next.check.id))}
              tone={rowTone(model.rowState(next.check.id))}
            />
          ) : null}
        </View>
        {next ? (
          <>
            <Txt variant="title" style={{ marginTop: theme.space.sm }}>
              {next.check.title[lang]}
            </Txt>
            {nextBody ? (
              <Txt variant="small" muted style={{ marginTop: theme.space.xs }}>
                {nextBody}
              </Txt>
            ) : null}
            <Button
              label={t(NEXT_BUTTON[next.kind])}
              icon="camera"
              onPress={() => router.push(paths.check(next.check.id) as Href)}
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

      <Section title={t("weekTitle")} testID="week">
        <WeekItem
          state={model.done > 0 ? "done" : "now"}
          when={t("weekToday")}
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
            when={formatMonth(model.nextRecheck.date, lang)}
            text={t("weekRecheck")}
          />
        ) : null}
      </Section>

      {deductible ? (
        <View
          testID="reward-card"
          style={{
            paddingTop: theme.space.sm,
            borderTopWidth: 1,
            borderTopColor: theme.colors.line,
          }}
        >
          <Txt variant="small">{t("rewardLine")}</Txt>
          <Txt variant="caption">
            {t("rewardBody", { standard: deductible.standard, prepared: deductible.prepared })}
          </Txt>
          <Gap size="xs" />
          <ConceptTag testID="reward-concept-label" />
        </View>
      ) : null}

      <Section title={t("allChecksTitle")} testID="all-checks">
        {model.perils.map((p, gi) => (
          <Appear key={p.peril} index={gi} testID={`peril-group-${p.peril}`}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: theme.space.sm,
                marginBottom: theme.space.sm,
                marginTop: gi ? theme.space.sm : 0,
              }}
            >
              <Icon name={PERIL_ICON[p.peril]} size={20} color={theme.colors.textMuted} />
              <Txt variant="bodyStrong" style={{ flex: 1 }}>
                {perilLabel(p.peril, lang)}
              </Txt>
              <Txt variant="small" muted>
                {t("countOf", {
                  done: p.verified.length + p.notApplicable.length,
                  total: p.required.length,
                })}
              </Txt>
            </View>
            <ListGroup>
              {p.required.map((id, i) => {
                const state = model.rowState(id);
                return (
                  <ListRow
                    key={id}
                    index={i}
                    last={i === p.required.length - 1}
                    testID={`check-row-${id}`}
                    title={titleOf(id)}
                    tag={{
                      label: rowLabel(state),
                      tone: rowTone(state),
                      testID: `check-state-${id}`,
                    }}
                    onPress={() => router.push(paths.check(id) as Href)}
                  />
                );
              })}
            </ListGroup>
          </Appear>
        ))}
      </Section>

      <Section title={t("moreTitle")}>
        <ListGroup>
          <ListRow
            icon="drop"
            title={t("navStatus")}
            onPress={() => router.push(paths.status as Href)}
            testID="nav-status"
          />
          <ListRow
            icon="card"
            title={t("navCard")}
            onPress={() => router.push(paths.card as Href)}
            testID="nav-card"
            index={1}
          />
          <ListRow
            icon="bell"
            title={t("navReminders")}
            onPress={() => router.push(paths.reminders as Href)}
            testID="nav-reminders"
            index={2}
          />
          <ListRow
            icon="claim"
            title={t("navClaim")}
            onPress={() => router.push(paths.claim as Href)}
            testID="nav-claim"
            index={3}
          />
          <ListRow
            icon="home"
            title={t("switchHome")}
            onPress={() => router.push(paths.start as Href)}
            testID="nav-start"
            index={4}
            last
          />
        </ListGroup>
      </Section>
    </Screen>
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
      style={{ flexDirection: "row", alignItems: "center", gap: theme.space.md, minHeight: 32 }}
    >
      <View
        style={{
          width: 16,
          height: 16,
          borderRadius: 8,
          borderWidth: 1.5,
          alignItems: "center",
          justifyContent: "center",
          borderColor: state === "done" ? c.text : state === "now" ? c.warningMark : c.line,
          backgroundColor: state === "done" ? c.text : c.background,
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
