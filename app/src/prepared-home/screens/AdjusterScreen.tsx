import type { AdjusterView } from "@prepared-home/engine";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { View, useWindowDimensions } from "react-native";

import { ApiError } from "../api";
import { usePreparedHome, useTheme } from "../context";
import { errorMessage } from "../errors";
import { formatDate, type StringKey } from "../i18n";
import { Icon } from "../icons";
import { perilLabel, stateLabel, stateTone, verdictLabel, verdictTone } from "../model";
import {
  Appear,
  Banner,
  Card,
  ConceptTag,
  ErrorState,
  Gap,
  KeyValue,
  LoadingState,
  Screen,
  Section,
  Tag,
  Txt,
} from "../ui";

type Load =
  | { status: "loading" }
  | { status: "ok"; view: AdjusterView }
  | { status: "missing" }
  | { status: "error"; message: string };

export function AdjusterScreen({ claimId }: { claimId: string }) {
  const { t, ready, claims, api, paths } = usePreparedHome();
  const { width } = useWindowDimensions();
  const local = claims[claimId]?.view;
  const [remote, setRemote] = useState<Load>({ status: "loading" });

  // Claims made on this device are kept here; otherwise ask a server that keeps claims (STORE_MODE=file).
  const fetchRemote = useCallback(
    () =>
      api.legacy
        .getClaim(claimId)
        .then((view) => setRemote({ status: "ok", view }))
        .catch((err) =>
          setRemote(
            err instanceof ApiError &&
              err.kind === "http" &&
              (err.status === 404 || err.status === 400)
              ? { status: "missing" }
              : { status: "error", message: errorMessage(err, t) },
          ),
        ),
    [api, claimId, t],
  );

  const retry = () => {
    setRemote({ status: "loading" });
    void fetchRemote();
  };

  useEffect(() => {
    if (ready && !local) void fetchRemote();
  }, [ready, local, fetchRemote]);

  const state: Load = !ready
    ? { status: "loading" }
    : local
      ? { status: "ok", view: local }
      : remote;

  return (
    <Screen testID="adjuster-screen" wide backTo={paths.claim} barSubtitle={t("adjusterTitle")}>
      <Txt variant="display">{t("adjusterTitle")}</Txt>
      <Gap size="md" />
      {state.status === "loading" ? <LoadingState testID="adjuster-loading" /> : null}
      {state.status === "missing" ? (
        <ErrorState message={t("adjusterNotFound")} testID="adjuster-missing" />
      ) : null}
      {state.status === "error" ? (
        <ErrorState message={state.message} onRetry={retry} testID="adjuster-error" />
      ) : null}
      {state.status === "ok" ? <AdjusterBody view={state.view} table={width >= 760} /> : null}
    </Screen>
  );
}

function AdjusterBody({ view, table }: { view: AdjusterView; table: boolean }) {
  const { t, lang } = usePreparedHome();
  const theme = useTheme();
  const relief = view.decision === "relief_applies";
  const yesNo = (v: boolean | null) => (v === null ? t("dash") : v ? t("yes") : t("no"));

  return (
    <View>
      <Txt variant="small" muted>
        {t("claimId", { id: view.claimId })}
      </Txt>
      <Gap size="md" />

      <View style={{ flexDirection: table ? "row" : "column", gap: theme.space.md }}>
        <Card
          raised
          tone={relief ? "success" : "warning"}
          testID="adjuster-decision"
          style={{ flex: table ? 1 : undefined, marginBottom: 0 }}
        >
          <Txt variant="title" testID="adjuster-decision-text">
            {t(`decision.${view.decision}` as StringKey)}
          </Txt>
          <Gap size="sm" />
          <Txt variant="small">
            {t("deductibleInClaim", {
              current: view.deductible.current,
              standard: view.deductible.standard,
              prepared: view.deductible.prepared,
            })}
          </Txt>
          <Gap size="sm" />
          <ConceptTag testID="adjuster-concept-label" />
        </Card>
        <Card style={{ flex: table ? 1 : undefined, marginBottom: 0 }} testID="adjuster-facts">
          <KeyValue label={t("riskLabel")} value={perilLabel(view.peril, lang)} />
          <KeyValue label={t("lossDate")} value={formatDate(view.lossDate, lang)} />
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              gap: theme.space.sm,
              alignItems: "center",
            }}
          >
            <Txt variant="label">{t("stateAtLoss")}</Txt>
            <Tag
              label={stateLabel(view.perilStateAtLoss, lang)}
              tone={stateTone(view.perilStateAtLoss)}
            />
          </View>
        </Card>
      </View>
      <Gap size="md" />

      <Banner tone="neutral" icon="doc" testID="adjuster-note">
        <Txt variant="bodyStrong">{t("coverNote")}</Txt>
      </Banner>

      {view.reasons.length > 0 ? (
        <Section title={t("reasons")} testID="adjuster-reasons">
          {view.reasons.map((r, i) => (
            <Appear key={i} index={i}>
              <Txt variant="small" style={{ marginBottom: theme.space.xs }}>
                • {r}
              </Txt>
            </Appear>
          ))}
        </Section>
      ) : null}

      <Section title={t("datedChecks")} testID="adjuster-records">
        {table ? (
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
              {(
                [
                  "colCheck",
                  "colVerdict",
                  "colChecked",
                  "colValid",
                  "colShared",
                  "colHash",
                ] as StringKey[]
              ).map((k) => (
                <Txt key={k} variant="smallStrong" style={{ flex: 1 }}>
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
                <Txt style={{ flex: 1 }}>{r.checkId}</Txt>
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
        ) : (
          view.records.map((r, i) => (
            <Appear key={r.checkId} index={i}>
              <Card testID={`adjuster-record-${r.checkId}`}>
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <Txt variant="bodyStrong">{r.checkId}</Txt>
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
          ))
        )}
      </Section>
      <Txt variant="caption">{t("claimNote")}</Txt>
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
