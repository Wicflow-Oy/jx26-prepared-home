// The full result of one check: the verdict, each judged point, what to do next and the related terms.
import {
  criterionText,
  fixHintFor,
  isColdSeason,
  ownerFor,
  type CheckDefinition,
  type CheckRecord,
  type CriterionResult,
  type Home,
  type Verdict,
} from "@prepared-home/engine";
import { View } from "react-native";

import { shortHash } from "../../bytes";
import { useT, useTheme } from "../../context";
import { formatDate } from "../../i18n";
import { Icon, type IconName } from "../../icons";
import { ownerLabel, photoCount, PHOTO_COUNT_NOTE, verdictLabel, verdictTone } from "../../model";
import type { StoredOutcome } from "../../storage";
import { Banner, Gap, Tag, toneColors, Txt } from "../../ui";
import { CriterionLine } from "./CriterionLine";
import { InfoBlock } from "./InfoBlock";
import { explainKey, serverTextFits, sourceLine } from "./resultText";
import { TermsBlock } from "./TermsBlock";

const VERDICT_ICON: Record<Verdict, IconName> = {
  verified: "check",
  fix_first: "tool",
  retake: "camera",
  not_applicable: "check",
};

export function ResultBody({
  check,
  home,
  stored,
  record,
}: {
  check: CheckDefinition;
  home: Home;
  stored: StoredOutcome | undefined;
  record: CheckRecord | undefined;
}) {
  const { t, lang } = useT();
  const theme = useTheme();
  const verdict: Verdict = stored?.outcome.verdict ?? record?.verdict ?? "retake";
  const colors = toneColors(theme, verdictTone(verdict));
  const current = record?.verdict === "verified" || record?.verdict === "not_applicable";
  const dueAt = current ? (record?.dueAt ?? null) : null;
  const count = photoCount(
    stored?.capture ?? record?.capture,
    stored?.secondPhotoSha256 ?? record?.secondPhotoSha256,
  );
  const keptEarlier = stored && !stored.recordReplaced ? stored.previousVerdict : undefined;
  const serverText = serverTextFits(stored, lang);
  // One fingerprint per photo; a camera check has two, from two angles.
  const hashes = [
    stored?.photoSha256 ?? record?.photoSha256,
    stored?.secondPhotoSha256 ?? record?.secondPhotoSha256,
  ].filter((h): h is string => !!h);
  // Fixed texts come from the engine in the current language, so a language switch applies to them.
  const textOf = (c: CriterionResult) =>
    criterionText(check, c.id, home.homeType)?.[lang] ?? c.text;
  const offSeason = (c: CriterionResult) =>
    !!stored &&
    !isColdSeason(stored.checkedAt) &&
    !!check.criteria.find((d) => d.id === c.id)?.coldSeasonOnly;

  let retakeHint: string | null = null;
  if (stored && verdict === "retake" && stored.source !== "offline") {
    const unclear = stored.outcome.criteria.filter((c) => c.kind !== "user" && c.met !== true);
    if (serverText && stored.outcome.retakeHint) retakeHint = stored.outcome.retakeHint;
    else if (unclear.length)
      retakeHint = t("retakeShow", { items: unclear.map(textOf).join("; ") });
  }
  const owner = stored?.outcome.fix?.owner ?? ownerFor(check, home.homeType);
  const source = sourceLine(stored, record, lang, t);

  return (
    <View testID="result-body">
      {stored?.outcome.urgent ? (
        <Banner tone="danger" icon="alert" testID="urgent-banner">
          {t("urgent")}
        </Banner>
      ) : null}

      <View
        testID={`verdict-${verdict}`}
        style={{ flexDirection: "row", alignItems: "center", gap: theme.space.md }}
      >
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: colors.bg,
          }}
        >
          <Icon name={VERDICT_ICON[verdict]} size={20} color={colors.fg} strokeWidth={2} />
        </View>
        <Txt variant="title" testID="verdict-title" style={{ flex: 1 }}>
          {verdictLabel(verdict, lang)}
        </Txt>
      </View>
      <Gap size="xs" />
      <Txt variant="small" muted>
        {t(explainKey(verdict, !!dueAt), { date: formatDate(dueAt, lang) })}
      </Txt>
      {verdict === "verified" && count !== "counts" ? (
        <Txt variant="small" testID="not-counted" style={{ marginTop: theme.space.xs }}>
          {t(PHOTO_COUNT_NOTE[count])}
        </Txt>
      ) : null}
      {source ? (
        <Txt variant="caption" testID="source-label" style={{ marginTop: theme.space.xs }}>
          {source}
        </Txt>
      ) : null}
      <Gap size="md" />

      {keptEarlier ? (
        <Banner tone="info" testID="kept-earlier">
          {t("keptPrevious", { verdict: verdictLabel(keptEarlier, lang) })}
        </Banner>
      ) : null}

      {!stored ? (
        <Txt variant="small" muted>
          {t("recordOnlyNote")}
        </Txt>
      ) : verdict !== "not_applicable" ? (
        <View testID="criteria" accessibilityLabel={t("criteriaTitle")}>
          {stored.outcome.criteria.map((c) => (
            <CriterionLine
              key={c.id}
              c={c}
              text={textOf(c)}
              note={serverText ? c.note : undefined}
              offSeason={offSeason(c)}
            />
          ))}
        </View>
      ) : null}

      {retakeHint ? (
        <InfoBlock icon="camera" testID="retake-hint">
          <Txt variant="smallStrong">{t("retakeHintTitle")}</Txt>
          <Txt variant="small">{retakeHint}</Txt>
        </InfoBlock>
      ) : null}

      {verdict === "fix_first" ? (
        <>
          <InfoBlock icon="tool" tone="warning" testID="fix-hint">
            <Txt variant="smallStrong" color={theme.colors.warning}>
              {t("fixTitle")}
            </Txt>
            <Txt variant="small">{fixHintFor(check, home.homeType)[lang]}</Txt>
          </InfoBlock>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: theme.space.sm,
              marginTop: theme.space.md,
              flexWrap: "wrap",
            }}
          >
            <Txt variant="label">{t("ownerTitle")}</Txt>
            <Tag label={ownerLabel(owner, lang)} tone="info" testID="owner-chip" />
          </View>
        </>
      ) : null}

      <TermsBlock check={check} />

      <View
        style={{
          flexDirection: "row",
          gap: theme.space.sm,
          marginTop: theme.space.md,
          alignItems: "flex-start",
        }}
      >
        <Icon name="lock" size={16} color={theme.colors.textMuted} />
        <Txt variant="caption" style={{ flex: 1 }}>
          {t("privacyResult")}
          {hashes.length
            ? ` ${t("fingerprintShort", { hash: hashes.map(shortHash).join(" · ") })}`
            : ""}
        </Txt>
      </View>
    </View>
  );
}
