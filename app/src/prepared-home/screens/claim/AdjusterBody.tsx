import type { AdjusterView, Home } from "@prepared-home/engine";
import { View } from "react-native";

import { usePreparedHome, useTheme } from "../../context";
import { formatDate, formatMoney, type StringKey } from "../../i18n";
import { perilLabel, stateLabel, stateTone } from "../../model";
import { AmountsTag, Appear, Banner, Card, Gap, KeyValue, Section, Tag, Txt } from "../../ui";
import { adjusterReasons } from "./adjusterReasons";
import { RecordsTable } from "./RecordsTable";

/** The decision, the facts of the claim, the reasons and the dated checks behind them. */
export function AdjusterBody({
  view,
  home,
  table,
}: {
  view: AdjusterView;
  home: Home | null;
  table: boolean;
}) {
  const { t, lang, recordsFor } = usePreparedHome();
  const theme = useTheme();
  const reasons = adjusterReasons(view, home, home ? recordsFor(home.homeId) : [], t, lang);
  const relief = view.decision === "relief_applies";
  const money = (amount: number) => formatMoney(amount, lang);
  const side = { flex: table ? 1 : undefined, marginBottom: 0 };

  return (
    <View>
      <Txt variant="small" muted>
        {t("claimId", { id: view.claimId })}
      </Txt>
      <Gap size="md" />

      <View style={{ flexDirection: table ? "row" : "column", gap: theme.space.md }}>
        <Card raised tone={relief ? "success" : "warning"} testID="adjuster-decision" style={side}>
          <Txt variant="title" testID="adjuster-decision-text">
            {t(`decision.${view.decision}` as StringKey)}
          </Txt>
          <Gap size="sm" />
          <Txt variant="small">
            {t("deductibleInClaim", {
              current: money(view.deductible.current),
              standard: money(view.deductible.standard),
              prepared: money(view.deductible.prepared),
            })}
          </Txt>
          <Gap size="sm" />
          <AmountsTag testID="adjuster-amounts-tag" />
        </Card>
        <Card style={side} testID="adjuster-facts">
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

      <Section title={t("reasons")} testID="adjuster-reasons">
        {reasons.map((r, i) => (
          <Appear key={i} index={i}>
            <Txt variant="small" style={{ marginBottom: theme.space.xs }}>
              • {r}
            </Txt>
          </Appear>
        ))}
      </Section>

      <Section title={t("datedChecks")} testID="adjuster-records">
        <RecordsTable view={view} home={home} table={table} />
      </Section>
    </View>
  );
}
