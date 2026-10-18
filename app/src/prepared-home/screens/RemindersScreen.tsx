import { useRouter } from "expo-router";

import { FROST_PLACE } from "../config";
import { usePreparedHome } from "../context";
import { formatDate, formatDecimal, localizeDates, reminderKey } from "../i18n";
import { useHomeModel } from "../model";
import {
  Banner,
  Button,
  EmptyState,
  Gap,
  ListGroup,
  ListRow,
  LoadingState,
  NoHome,
  Screen,
  Txt,
} from "../ui";

export function RemindersScreen() {
  const { t, lang, ready, frost, refreshFrost, paths } = usePreparedHome();
  const router = useRouter();
  const model = useHomeModel();

  if (!ready || !model) {
    return <Screen testID="reminders-screen">{!ready ? <LoadingState /> : <NoHome />}</Screen>;
  }

  let frostLine: string | null = null;
  if (frost.status === "ok") {
    const f = frost.value;
    const place = f.place || FROST_PLACE;
    frostLine =
      (f.firstFrostDate
        ? t("frostInfo", {
            place,
            date: formatDate(f.firstFrostDate, lang),
            temp: f.minTempC == null ? "–" : formatDecimal(f.minTempC, lang),
          })
        : t("frostNone", { place })) + (f.source === "fixture" ? t("frostSample") : "");
  }

  return (
    <Screen testID="reminders-screen">
      <Txt variant="display">{t("remindersTitle")}</Txt>
      <Gap size="xs" />
      <Txt muted>{t("remindersIntro")}</Txt>
      <Gap size="lg" />

      {frost.status === "loading" ? <LoadingState testID="frost-loading" /> : null}
      {frostLine ? (
        <Banner tone="info" icon="snow" testID="frost-info">
          {frostLine}
        </Banner>
      ) : null}
      {frost.status === "error" ? (
        <Banner tone="neutral" icon="snow" testID="frost-unavailable">
          <Txt variant="small">{t("frostUnavailable")}</Txt>
          <Button label={t("retry")} onPress={refreshFrost} variant="ghost" testID="frost-retry" />
        </Banner>
      ) : null}

      {model.reminders.length === 0 ? (
        <EmptyState message={t("remindersEmpty")} testID="reminders-empty" />
      ) : (
        <ListGroup>
          {model.reminders.map((r, i) => (
            <ListRow
              key={r.id}
              last={i === model.reminders.length - 1}
              icon={r.kind === "frost" ? "snow" : r.kind === "fix_first" ? "tool" : "calendar"}
              testID={`reminder-${r.kind}-${r.checkIds.join("-")}`}
              title={localizeDates(r.title[lang], lang)}
              subtitle={[
                t("due", { date: formatDate(r.dueAt, lang) }),
                // Long groups are already counted in the title.
                ...(r.checkIds.length <= 2
                  ? r.checkIds.map((id) => model.checkById.get(id)?.title[lang] ?? id)
                  : []),
              ].join(" · ")}
              tag={{
                label: t(reminderKey(r.kind)),
                tone: r.kind === "frost" || r.kind === "fix_first" ? "warning" : "neutral",
              }}
              onPress={r.checkIds[0] ? () => router.push(paths.check(r.checkIds[0])) : undefined}
            />
          ))}
        </ListGroup>
      )}
    </Screen>
  );
}
