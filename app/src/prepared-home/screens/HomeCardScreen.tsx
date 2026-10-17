import { DISCLAIMER } from "@prepared-home/engine";
import { View } from "react-native";

import { usePreparedHome, useTheme } from "../context";
import { formatDate, localizeDates, type StringKey } from "../i18n";
import { Icon, PERIL_ICON } from "../icons";
import {
  homeLabel,
  perilLabel,
  stateLabel,
  stateTone,
  useHomeModel,
  verdictLabel,
  verdictTone,
} from "../model";
import {
  Banner,
  Card,
  EmptyState,
  Fact,
  Gap,
  ListGroup,
  ListRow,
  LoadingState,
  NoHome,
  Screen,
  Section,
  Tag,
  Txt,
} from "../ui";

export function HomeCardScreen() {
  const { t, lang, ready } = usePreparedHome();
  const theme = useTheme();
  const model = useHomeModel();

  if (!ready || !model) {
    return <Screen testID="card-screen">{!ready ? <LoadingState /> : <NoHome />}</Screen>;
  }

  const card = model.card;
  const title = (checkId: string) => model.checkById.get(checkId)?.title[lang] ?? checkId;

  return (
    <Screen testID="card-screen">
      <Txt variant="display">{t("cardTitle")}</Txt>
      <Gap size="xs" />
      <Txt muted>{t("cardIntro")}</Txt>
      <Gap size="lg" />

      <Card raised testID="card-header">
        <Txt variant="h2">{homeLabel(model.home, t)}</Txt>
        <Txt variant="caption">
          {t(`homeType.${card.homeType}` as StringKey)} ·{" "}
          {t("generatedOn", { date: formatDate(card.generatedAt, lang) })}
        </Txt>
        <Gap size="md" />
        {card.perils.map((p) => (
          <View
            key={p.peril}
            testID={`card-peril-${p.peril}`}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: theme.space.sm,
              minHeight: 36,
            }}
          >
            <Icon name={PERIL_ICON[p.peril]} size={20} color={theme.colors.textMuted} />
            <Txt style={{ flex: 1 }}>{perilLabel(p.peril, lang)}</Txt>
            {p.preparedUntil ? (
              <Txt variant="caption">
                {t("currentUntil", { date: formatDate(p.preparedUntil, lang) })}
              </Txt>
            ) : null}
            <Tag label={stateLabel(p.state, lang)} tone={stateTone(p.state)} />
          </View>
        ))}
        {card.shutOffNote ? (
          <View
            testID="card-shutoff"
            style={{
              marginTop: theme.space.md,
              paddingTop: theme.space.sm,
              borderTopWidth: 1,
              borderTopColor: theme.colors.line,
            }}
          >
            <Txt variant="label">{t("shutOff")}</Txt>
            <Txt variant="small">{localizeDates(card.shutOffNote, lang)}</Txt>
          </View>
        ) : null}
      </Card>

      <Section title={t("cardRecords")}>
        {card.records.length === 0 ? (
          <EmptyState message={t("cardEmpty")} testID="card-empty" />
        ) : (
          <ListGroup>
            {card.records.map((r, i) => (
              <ListRow
                key={r.checkId}
                last={i === card.records.length - 1}
                testID={`card-record-${r.checkId}`}
                title={title(r.checkId)}
                subtitle={`${t("checkedOn", { date: formatDate(r.checkedAt, lang) })} · ${
                  r.photoSha256Short ? t("photoHash", { hash: r.photoSha256Short }) : t("noPhoto")
                }`}
                tag={{ label: verdictLabel(r.verdict, lang), tone: verdictTone(r.verdict) }}
              />
            ))}
          </ListGroup>
        )}
      </Section>

      {card.nextReminder ? (
        <Fact icon="bell" testID="card-next-reminder">
          <Txt variant="smallStrong">{t("nextReminder")}</Txt>
          <Txt variant="small">{localizeDates(card.nextReminder.title[lang], lang)}</Txt>
          <Txt variant="caption">
            {t("due", { date: formatDate(card.nextReminder.dueAt, lang) })}
          </Txt>
        </Fact>
      ) : null}

      <Gap size="md" />
      <Banner tone="neutral" icon="doc" testID="card-disclaimer">
        {DISCLAIMER[lang]}
      </Banner>
    </Screen>
  );
}
