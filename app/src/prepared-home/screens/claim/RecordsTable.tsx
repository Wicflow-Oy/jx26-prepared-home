import type { AdjusterView, Home } from "@prepared-home/engine";
import type { ReactNode } from "react";
import { View } from "react-native";

import { useT, useTheme } from "../../context";
import { formatDate, type StringKey } from "../../i18n";
import { Icon } from "../../icons";
import { verdictLabel, verdictTone } from "../../model";
import { Appear, Card, Gap, KeyValue, Tag, Txt } from "../../ui";
import { checkName } from "./adjusterReasons";

const COLUMNS: StringKey[] = [
  "colCheck",
  "colVerdict",
  "colChecked",
  "colValid",
  "colShared",
  "colHash",
];

/** The dated checks behind a claim: a table on wide screens, one card per check on a phone. */
export function RecordsTable({
  view,
  home,
  table,
}: {
  view: AdjusterView;
  home: Home | null;
  table: boolean;
}) {
  const { t, lang } = useT();
  const theme = useTheme();
  const yesNo = (v: boolean | null) => (v === null ? t("dash") : v ? t("yes") : t("no"));

  if (!table) {
    return view.records.map((r, i) => (
      <Appear key={r.checkId} index={i}>
        <Card testID={`adjuster-record-${r.checkId}`}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              gap: theme.space.sm,
            }}
          >
            <Txt variant="bodyStrong" style={{ flex: 1 }}>
              {checkName(r.checkId, home, lang)}
            </Txt>
            <Tag label={verdictLabel(r.verdict, lang)} tone={verdictTone(r.verdict)} />
          </View>
          <Gap size="xs" />
          <KeyValue label={t("colChecked")} value={formatDate(r.checkedAt, lang)} />
          <KeyValue label={t("colValid")} value={yesNo(r.validAtLoss)} />
          <KeyValue label={t("colShared")} value={yesNo(r.photoShared)} />
          <KeyValue
            label={t("colHash")}
            value={yesNo(r.hashMatches)}
            testID={`adjuster-hash-${r.checkId}`}
          />
        </Card>
      </Appear>
    ));
  }

  return (
    <View
      style={{
        backgroundColor: theme.colors.surface,
        borderRadius: theme.radius.card,
        overflow: "hidden",
      }}
    >
      <View
        style={{
          flexDirection: "row",
          backgroundColor: theme.colors.backgroundAlt,
          paddingVertical: theme.space.sm,
          paddingHorizontal: theme.space.lg,
        }}
      >
        {COLUMNS.map((k) => (
          <Txt key={k} variant="smallStrong" style={{ flex: k === "colCheck" ? 2 : 1 }}>
            {t(k)}
          </Txt>
        ))}
      </View>
      {view.records.map((r, i) => (
        <Appear
          key={r.checkId}
          index={i}
          testID={`adjuster-record-${r.checkId}`}
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingVertical: theme.space.sm,
            paddingHorizontal: theme.space.lg,
            minHeight: theme.layout.button,
            borderTopWidth: 1,
            borderTopColor: theme.colors.line,
          }}
        >
          <Txt variant="small" style={{ flex: 2, paddingRight: theme.space.sm }}>
            {checkName(r.checkId, home, lang)}
          </Txt>
          <View style={{ flex: 1 }}>
            <Tag label={verdictLabel(r.verdict, lang)} tone={verdictTone(r.verdict)} />
          </View>
          <Txt variant="small" style={{ flex: 1 }}>
            {formatDate(r.checkedAt, lang)}
          </Txt>
          <Cell>
            <Mark v={r.validAtLoss} />
            <Txt variant="small">{yesNo(r.validAtLoss)}</Txt>
          </Cell>
          <Txt variant="small" style={{ flex: 1 }}>
            {yesNo(r.photoShared)}
          </Txt>
          <Cell testID={`adjuster-hash-${r.checkId}`}>
            <Mark v={r.hashMatches} />
            <Txt variant="small">{yesNo(r.hashMatches)}</Txt>
          </Cell>
        </Appear>
      ))}
    </View>
  );
}

function Mark({ v }: { v: boolean | null }) {
  const theme = useTheme();
  if (v === null) return null;
  return (
    <Icon
      name={v ? "check" : "close"}
      size={16}
      color={v ? theme.colors.success : theme.colors.danger}
      strokeWidth={2}
    />
  );
}

function Cell({ children, testID }: { children: ReactNode; testID?: string }) {
  const theme = useTheme();
  return (
    <View
      testID={testID}
      style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: theme.space.xs }}
    >
      {children}
    </View>
  );
}
