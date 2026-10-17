import { ALARM_DEVICE_LINE, type PerilStatus } from "@prepared-home/engine";
import { useRouter, type Href } from "expo-router";
import { View } from "react-native";

import { usePreparedHome, useTheme } from "../context";
import { formatDate, formatMonth } from "../i18n";
import { Icon, PERIL_ICON, type IconName } from "../icons";
import { perilLabel, useHomeModel, type HomeModel } from "../model";
import { roomName, roomProgress } from "../rooms";
import {
  Appear,
  Card,
  ConceptTag,
  Fact,
  Gap,
  LoadingState,
  NoHome,
  PressableScale,
  Screen,
  SegmentBar,
  Txt,
  type SegmentState,
} from "../ui";

export function StatusScreen() {
  const { t, lang, ready, paths } = usePreparedHome();
  const theme = useTheme();
  const router = useRouter();
  const model = useHomeModel();

  if (!ready || !model) {
    return (
      <Screen testID="status-screen" tone="sandAlt">
        {!ready ? <LoadingState /> : <NoHome />}
      </Screen>
    );
  }

  const leak = model.perils.find((p) => p.peril === "leak");

  return (
    <Screen testID="status-screen" tone="sandAlt">
      <View style={{ flexDirection: "row", alignItems: "center", gap: theme.space.xs }}>
        <Icon name="home" size={16} color={theme.colors.textMuted} />
        <Txt variant="small" muted>
          {t("locLine", { label: model.home.label, done: model.done, total: model.total })}
        </Txt>
      </View>
      <Txt variant="display" style={{ marginTop: theme.space.xs, marginBottom: theme.space.lg }}>
        {t("readinessTitle")}
      </Txt>

      {model.perils.map((p, i) => (
        <Appear key={p.peril} index={i}>
          <RiskCard
            status={p}
            model={model}
            onOpen={(id) => router.push(paths.check(id) as Href)}
          />
        </Appear>
      ))}

      <View style={{ marginTop: theme.space.sm }}>
        {leak?.alarmDeviceLine ? (
          <Fact icon="bell" testID="alarm-line">
            <Txt variant="small">{ALARM_DEVICE_LINE[lang]}</Txt>
          </Fact>
        ) : null}
        <Fact icon="calendar" testID="next-recheck">
          {model.nextRecheck ? (
            <>
              <Txt variant="smallStrong">
                {t("recheckTitle", { date: formatMonth(model.nextRecheck.date, lang) })}
              </Txt>
              <Txt variant="caption">
                {formatDate(model.nextRecheck.date, lang)} · {model.nextRecheck.checkIds.join(", ")}
                . {t("recheckSub")}
              </Txt>
            </>
          ) : (
            <Txt variant="small">{t("noRecheck")}</Txt>
          )}
        </Fact>
      </View>
    </Screen>
  );
}

function RiskCard({
  status: p,
  model,
  onOpen,
}: {
  status: PerilStatus;
  model: HomeModel;
  onOpen: (checkId: string) => void;
}) {
  const { t, lang } = usePreparedHome();
  const theme = useTheme();
  const title = (id: string) => model.checkById.get(id)?.title[lang] ?? id;
  const done = p.verified.length + p.notApplicable.length;
  const isDone = (id: string) => p.verified.includes(id) || p.notApplicable.includes(id);
  const segments: SegmentState[] = p.required.map((id) =>
    isDone(id) ? "done" : p.fixFirst.includes(id) ? "fix" : "open",
  );
  const rooms = roomProgress(p.required, isDone);
  const name = perilLabel(p.peril, lang);
  const todo = [...p.missing, ...p.overdue];

  return (
    <Card testID={`peril-status-${p.peril}`}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: theme.space.md }}>
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: theme.colors.backgroundAlt,
          }}
        >
          <Icon name={PERIL_ICON[p.peril]} size={20} color={theme.colors.text} />
        </View>
        <Txt variant="h2" style={{ flex: 1 }}>
          {name}
        </Txt>
        <Txt variant="h2" testID={`peril-count-${p.peril}`}>
          {t("countOf", { done, total: p.required.length })}
        </Txt>
      </View>
      <Gap size="md" />
      <SegmentBar segments={segments} testID={`segments-${p.peril}`} />

      {rooms.length > 0 ? (
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            gap: theme.space.sm,
            marginTop: theme.space.md,
          }}
        >
          {rooms.map((r) => (
            <View
              key={r.room}
              testID={`room-${p.peril}-${r.room}`}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: theme.space.xs,
                borderWidth: 1,
                borderColor: theme.colors.line,
                borderRadius: theme.radius.pill,
                paddingHorizontal: theme.space.sm,
                minHeight: 28,
              }}
            >
              <View
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor:
                    r.done === r.total
                      ? theme.colors.success
                      : r.done > 0
                        ? theme.colors.warningMark
                        : theme.colors.line,
                }}
              />
              <Txt variant="caption" color={theme.colors.text}>
                {roomName(r.room, lang)} {r.done}/{r.total}
              </Txt>
            </View>
          ))}
        </View>
      ) : null}

      {p.verified.length > 0 ? (
        <Txt variant="small" muted style={{ marginTop: theme.space.sm }}>
          {t("checkedItems", { items: p.verified.map((id) => title(id).toLowerCase()).join(", ") })}
        </Txt>
      ) : null}

      {p.fixFirst.map((id) => (
        <ActionRow
          key={id}
          icon="tool"
          tone="fix"
          testID={`fix-row-${id}`}
          text={`${t("weekFix", { title: title(id) })}. ${model.checkById.get(id)?.fixHint[lang] ?? ""}`}
          onPress={() => onOpen(id)}
        />
      ))}
      {todo.length > 0 ? (
        <ActionRow
          icon="camera"
          tone="todo"
          testID={`todo-row-${p.peril}`}
          text={
            p.overdue.length
              ? t("dueAgainItems", { items: todo.map(title).join(", ") })
              : t("notStartedItems", { items: todo.map(title).join(", ") })
          }
          onPress={() => onOpen(todo[0])}
        />
      ) : null}

      <View
        testID={`deductible-${p.peril}`}
        style={{
          marginTop: theme.space.md,
          paddingTop: theme.space.sm,
          borderTopWidth: 1,
          borderTopColor: theme.colors.line,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            gap: theme.space.sm,
            flexWrap: "wrap",
          }}
        >
          <Txt variant="caption">{t("deductiblePreview")}</Txt>
          <ConceptTag testID={`status-concept-label-${p.peril}`} />
        </View>
        <Txt style={{ marginTop: theme.space.xs }}>
          {p.state === "prepared" && p.preparedUntil
            ? t("deductibleNowPrepared", {
                peril: name,
                prepared: p.deductible.prepared,
                date: formatDate(p.preparedUntil, lang),
              })
            : t("deductibleWhen", {
                peril: name,
                standard: p.deductible.standard,
                prepared: p.deductible.prepared,
              })}
        </Txt>
        <Txt variant="caption">{t("deductibleNow", { current: p.deductible.current })}</Txt>
      </View>
    </Card>
  );
}

function ActionRow({
  icon,
  tone,
  text,
  onPress,
  testID,
}: {
  icon: IconName;
  tone: "fix" | "todo";
  text: string;
  onPress: () => void;
  testID?: string;
}) {
  const theme = useTheme();
  const fix = tone === "fix";
  return (
    <PressableScale
      testID={testID}
      onPress={onPress}
      accessibilityLabel={text}
      style={{
        marginTop: theme.space.md,
        flexDirection: "row",
        alignItems: "center",
        gap: theme.space.md,
        minHeight: theme.layout.tapTarget,
        paddingHorizontal: theme.space.md,
        paddingVertical: theme.space.sm,
        borderRadius: theme.radius.button,
        backgroundColor: fix ? theme.colors.warningBg : theme.colors.backgroundAlt,
      }}
    >
      <Icon name={icon} size={20} color={fix ? theme.colors.warning : theme.colors.textMuted} />
      <Txt variant="small" style={{ flex: 1 }}>
        {text}
      </Txt>
      <Icon name="chevronRight" size={20} color={theme.colors.textMuted} />
    </PressableScale>
  );
}
