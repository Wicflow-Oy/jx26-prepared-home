import type { PerilStatus } from "@prepared-home/engine";
import { View } from "react-native";

import { useT, useTheme } from "../../context";
import { Icon, PERIL_ICON } from "../../icons";
import { doneCount, perilLabel, type HomeModel } from "../../model";
import { Card, Gap, SegmentBar, Txt, type SegmentState } from "../../ui";
import { ActionRow } from "./ActionRow";
import { DeductibleLine } from "./DeductibleLine";
import { RoomChips } from "./RoomChips";

/** One risk: how many checks are done, by room, what is left to do, and its deductible. */
export function RiskCard({
  status: p,
  model,
  onOpen,
  onExplain,
}: {
  status: PerilStatus;
  model: HomeModel;
  onOpen: (checkId: string) => void;
  onExplain: () => void;
}) {
  const { t, lang } = useT();
  const theme = useTheme();
  const title = (id: string) => model.checkById.get(id)?.title[lang] ?? id;
  const isDone = (id: string) =>
    p.verified.includes(id) || p.notCounted.includes(id) || p.notApplicable.includes(id);
  const segments: SegmentState[] = p.required.map((id) =>
    isDone(id) ? "done" : p.fixFirst.includes(id) ? "fix" : "open",
  );
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
            backgroundColor: theme.colors.primaryTint,
          }}
        >
          <Icon name={PERIL_ICON[p.peril]} size={20} color={theme.colors.primary} />
        </View>
        <Txt variant="h2" style={{ flex: 1 }}>
          {perilLabel(p.peril, lang)}
        </Txt>
        <Txt variant="h2" testID={`peril-count-${p.peril}`}>
          {t("countOf", { done: doneCount(p), total: p.required.length })}
        </Txt>
      </View>
      <Gap size="md" />
      <SegmentBar segments={segments} testID={`segments-${p.peril}`} />
      <RoomChips peril={p.peril} required={p.required} isDone={isDone} />

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
      {p.notCounted.length > 0 ? (
        <ActionRow
          icon="camera"
          tone="todo"
          testID={`camera-row-${p.peril}`}
          text={t("needsCamera", { items: p.notCounted.map(title).join(", ") })}
          onPress={() => onOpen(p.notCounted[0])}
        />
      ) : null}
      {todo.length > 0 ? (
        <ActionRow
          icon="camera"
          tone="todo"
          testID={`todo-row-${p.peril}`}
          text={t(p.overdue.length ? "dueAgainItems" : "notStartedItems", {
            items: todo.map(title).join(", "),
          })}
          onPress={() => onOpen(todo[0])}
        />
      ) : null}

      <DeductibleLine status={p} onExplain={onExplain} />
    </Card>
  );
}
