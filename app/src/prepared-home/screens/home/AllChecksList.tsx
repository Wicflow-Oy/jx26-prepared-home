import { View } from "react-native";

import { useT, useTheme } from "../../context";
import { Icon, PERIL_ICON } from "../../icons";
import { doneCount, perilLabel, rowLabel, rowTone, type HomeModel } from "../../model";
import { ListGroup, ListRow, Section, Txt } from "../../ui";

/** Every check, grouped by risk, with its current state. */
export function AllChecksList({
  model,
  onOpen,
}: {
  model: HomeModel;
  onOpen: (checkId: string) => void;
}) {
  const { t, lang } = useT();
  const theme = useTheme();
  return (
    <Section title={t("allChecksTitle")} testID="all-checks">
      {model.perils.map((p, gi) => (
        <View key={p.peril} testID={`peril-group-${p.peril}`}>
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
              {t("countOf", { done: doneCount(p), total: p.required.length })}
            </Txt>
          </View>
          <ListGroup index={gi}>
            {p.required.map((id, i) => {
              const state = model.rowState(id);
              return (
                <ListRow
                  key={id}
                  last={i === p.required.length - 1}
                  testID={`check-row-${id}`}
                  title={model.checkById.get(id)?.title[lang] ?? id}
                  tag={{
                    label: rowLabel(state, t, lang),
                    tone: rowTone(state),
                    testID: `check-state-${id}`,
                  }}
                  onPress={() => onOpen(id)}
                />
              );
            })}
          </ListGroup>
        </View>
      ))}
    </Section>
  );
}
