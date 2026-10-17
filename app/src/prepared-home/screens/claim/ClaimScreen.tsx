import type { AdjusterView, Peril } from "@prepared-home/engine";
import { useRouter, type Href } from "expo-router";
import { useState } from "react";
import { View } from "react-native";

import type { SharedPhoto } from "../../api";
import { usePreparedHome, useTheme } from "../../context";
import { errorMessage } from "../../errors";
import { formatDate, todayIso } from "../../i18n";
import { Icon } from "../../icons";
import { perilLabel, useHomeModel } from "../../model";
import { hasPhoto, loadPhotoBase64 } from "../../photoStore";
import {
  Appear,
  Button,
  Card,
  ErrorState,
  Gap,
  ListGroup,
  ListRow,
  LoadingState,
  NoHome,
  PressableScale,
  Screen,
  Section,
  Segmented,
  Txt,
} from "../../ui";
import { DateStepper } from "../../ui/DateStepper";

/** Reporting damage. With the customer's consent the dated checks and photos go with the report. */
export function ClaimScreen() {
  const { t, lang, ready, api, paths, claims, saveClaim } = usePreparedHome();
  const theme = useTheme();
  const router = useRouter();
  const model = useHomeModel();
  const [peril, setPeril] = useState<Peril>("leak");
  const [lossDate, setLossDate] = useState(todayIso());
  const [share, setShare] = useState<"yes" | "no">("yes");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<AdjusterView | null>(null);

  if (!ready || !model) {
    return <Screen testID="claim-screen">{!ready ? <LoadingState /> : <NoHome />}</Screen>;
  }

  const home = model.home;
  const reports = Object.values(claims)
    .filter((c) => c.homeId === home.homeId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const send = async () => {
    setError(null);
    setSending(true);
    try {
      const shared: SharedPhoto[] = [];
      if (share === "yes") {
        const ids = model.perils.find((p) => p.peril === peril)?.required ?? [];
        for (const id of ids) {
          const record = model.effective.get(id);
          // Both angles go; either may match. Only photos on this device can go: examples were checked elsewhere.
          for (const sha of [record?.photoSha256, record?.secondPhotoSha256]) {
            if (!sha || !(await hasPhoto(sha))) continue;
            const imageBase64 = await loadPhotoBase64(sha);
            if (imageBase64) shared.push({ checkId: id, imageBase64 });
          }
        }
      }
      const view = await api.claim({
        home,
        records: share === "yes" ? model.records : [],
        peril,
        lossDate,
        shared,
      });
      saveClaim(home.homeId, view);
      setSent(view);
    } catch (err) {
      setError(errorMessage(err, t));
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <Screen testID="claim-screen" backTo={paths.home}>
        <Appear>
          <View
            style={{
              width: 56,
              height: 56,
              borderRadius: 28,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: theme.colors.primaryTint,
            }}
          >
            <Icon name="check" color={theme.colors.primary} strokeWidth={2} />
          </View>
          <Gap size="lg" />
          <Txt variant="display" testID="report-sent">
            {t("reportSent")}
          </Txt>
          <Gap size="sm" />
          <Txt muted>{t("reportSentBody", { id: sent.claimId })}</Txt>
        </Appear>
        <Gap size="xl" />
        <Button
          label={t("backHome")}
          onPress={() => router.replace(paths.home as Href)}
          testID="result-home"
        />
        <Gap size="xl" />
        <PressableScale
          testID="open-handler-view"
          accessibilityRole="link"
          accessibilityLabel={`${t("openHandlerView")}, ${t("handlerViewNote")}`}
          onPress={() => router.push(paths.adjuster(sent.claimId) as Href)}
          style={{
            alignSelf: "flex-start",
            minHeight: theme.layout.tapTarget,
            justifyContent: "center",
          }}
        >
          <Txt variant="small" color={theme.colors.primary}>
            {t("openHandlerView")}
          </Txt>
          <Txt variant="caption">{t("handlerViewNote")}</Txt>
        </PressableScale>
      </Screen>
    );
  }

  return (
    <Screen testID="claim-screen">
      <Txt variant="display">{t("claimTitle")}</Txt>

      <Section title={t("reportWhat")}>
        <Segmented
          testIDPrefix="report-peril"
          value={peril}
          onChange={setPeril}
          options={model.perils.map((p) => ({ value: p.peril, label: perilLabel(p.peril, lang) }))}
        />
      </Section>

      <Section title={t("reportWhen")}>
        <DateStepper value={lossDate} onChange={setLossDate} max={todayIso()} testID="loss-date" />
      </Section>

      <Card testID="share-card" style={{ marginTop: theme.space.lg }}>
        <Txt variant="bodyStrong">{t("shareTitle")}</Txt>
        <Gap size="xs" />
        <Txt variant="small" muted>
          {t("shareBody")}
        </Txt>
        <Gap size="md" />
        <Segmented
          testIDPrefix="share-photos"
          value={share}
          onChange={setShare}
          options={[
            { value: "yes", label: t("yes") },
            { value: "no", label: t("no") },
          ]}
        />
      </Card>

      {error ? (
        <ErrorState message={error} onRetry={() => void send()} testID="claim-error" />
      ) : null}

      <Button
        label={sending ? t("sending") : t("sendReport")}
        onPress={() => void send()}
        testID="send-report"
        icon="claim"
        loading={sending}
      />

      {reports.length > 0 ? (
        <Section title={t("yourReports")}>
          <ListGroup>
            {reports.map((c, i) => (
              <ListRow
                key={c.view.claimId}
                last={i === reports.length - 1}
                testID={`claim-row-${c.view.claimId}`}
                title={`${perilLabel(c.view.peril, lang)} · ${formatDate(c.view.lossDate, lang)}`}
                subtitle={t("claimId", { id: c.view.claimId })}
                onPress={() => router.push(paths.adjuster(c.view.claimId) as Href)}
              />
            ))}
          </ListGroup>
        </Section>
      ) : null}
    </Screen>
  );
}
