// The result of one check, shown in the check screen's sheet and on the result page.
import {
  clauseRefs,
  fixHintFor,
  ownerFor,
  type CheckDefinition,
  type CheckRecord,
  type CriterionResult,
  type Home,
  type Verdict,
} from "@prepared-home/engine";
import { useEffect, type ReactNode } from "react";
import { View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";

import { shortHash } from "../bytes";
import { usePreparedHome, useTheme } from "../context";
import { fitKey, formatDate, kindKey, type StringKey } from "../i18n";
import { Icon, type IconName } from "../icons";
import { ownerLabel, verdictLabel, verdictTone } from "../model";
import { springs, useMotion } from "../motion";
import type { StoredOutcome } from "../storage";
import { Appear, Banner, Gap, Skeleton, Tag, toneColors, Txt } from "../ui";

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
  fresh,
}: {
  check: CheckDefinition;
  home: Home;
  stored: StoredOutcome | undefined;
  record: CheckRecord | undefined;
  /** True right after a check, so the verdict animates in. */
  fresh?: boolean;
}) {
  const { t, lang } = usePreparedHome();
  const theme = useTheme();
  const motion = useMotion();

  const verdict: Verdict = stored ? stored.outcome.verdict : (record?.verdict ?? "retake");
  const tone = verdictTone(verdict);
  const colors = toneColors(theme, tone);
  const keptEarlier =
    stored && !stored.recordReplaced && stored.previousVerdict ? stored.previousVerdict : null;
  const dueAt =
    record && (record.verdict === "verified" || record.verdict === "not_applicable")
      ? record.dueAt
      : null;
  const fix =
    stored?.outcome.fix ??
    (verdict === "fix_first"
      ? { text: fixHintFor(check, home.homeType)[lang], owner: ownerFor(check, home.homeType) }
      : null);
  const owner = fix?.owner ?? ownerFor(check, home.homeType);
  const clauses = clauseRefs(check, lang);
  const photoHash = stored?.photoSha256 ?? record?.photoSha256 ?? null;

  const explainKey: Record<Verdict, StringKey> = {
    verified: dueAt ? "verdictExplainVerified" : "verdictExplainVerifiedNoDate",
    retake: "verdictExplainRetake",
    fix_first: "verdictExplainFix",
    not_applicable: "verdictExplainNA",
  };

  // The server's own note (e.g. a recorded result and its date) is more specific than the generic label.
  let sourceLine: string | null = null;
  if (stored && verdict !== "not_applicable") {
    sourceLine =
      stored.sourceNote ??
      (stored.source === "live"
        ? t("sourceLive", { model: stored.model })
        : stored.source === "cached"
          ? t("sourceCached")
          : t("sourceOffline"));
  } else if (!stored && record) {
    sourceLine = t("recordedOn", { date: formatDate(record.checkedAt, lang) });
  }

  // Offline results repeat the source note as their hint; show it once.
  const plain = (s: string) => s.replace(/[.\s]+$/, "").toLowerCase();
  const same = (a: string, b: string) => plain(a) === plain(b);
  const rawHint = stored?.outcome.retakeHint ?? null;
  const retakeHint = rawHint && !(sourceLine && same(rawHint, sourceLine)) ? rawHint : null;

  // The badge pops in once when a fresh verdict arrives.
  const pop = useSharedValue(fresh && !motion.reduced ? 0.6 : 1);
  useEffect(() => {
    pop.set(withSpring(1, springs.snappy));
  }, [pop]);
  const badgeStyle = useAnimatedStyle(() => ({ transform: [{ scale: pop.get() }] }));

  return (
    <View testID="result-body">
      {stored?.outcome.urgent ? (
        <Banner tone="danger" icon="alert" testID="urgent-banner">
          {t("urgent")}
        </Banner>
      ) : null}

      <Appear
        testID={`verdict-${verdict}`}
        style={{ flexDirection: "row", alignItems: "center", gap: theme.space.md }}
      >
        <Animated.View
          style={[
            {
              width: 36,
              height: 36,
              borderRadius: 18,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: colors.bg,
            },
            badgeStyle,
          ]}
        >
          <Icon name={VERDICT_ICON[verdict]} size={20} color={colors.fg} strokeWidth={2} />
        </Animated.View>
        <Txt variant="title" testID="verdict-title" style={{ flex: 1 }}>
          {verdictLabel(verdict, lang)}
        </Txt>
        {fresh ? <Txt variant="caption">{t("justNow")}</Txt> : null}
      </Appear>
      <Gap size="xs" />
      <Txt variant="small" muted>
        {t(explainKey[verdict], { date: formatDate(dueAt, lang) })}
      </Txt>
      {sourceLine ? (
        <Txt variant="caption" testID="source-label" style={{ marginTop: theme.space.xs }}>
          {sourceLine}
        </Txt>
      ) : null}
      <Gap size="md" />

      {keptEarlier ? (
        <Banner tone="info" testID="kept-earlier">
          {t("keptPrevious", { verdict: verdictLabel(keptEarlier, lang) })}
        </Banner>
      ) : null}

      {stored && stored.outcome.criteria.length > 0 && verdict !== "not_applicable" ? (
        <View testID="criteria" accessibilityLabel={t("criteriaTitle")}>
          {stored.outcome.criteria.map((c, i) => (
            <CriterionLine key={c.id} c={c} index={fresh ? i + 1 : 0} />
          ))}
        </View>
      ) : !stored ? (
        <Txt variant="small" muted>
          {t("recordOnlyNote")}
        </Txt>
      ) : null}

      {retakeHint ? (
        <Block icon="camera" testID="retake-hint">
          <Txt variant="smallStrong">{t("retakeHintTitle")}</Txt>
          <Txt variant="small">{retakeHint}</Txt>
        </Block>
      ) : null}

      {fix ? (
        <Block icon="tool" tone="warning" testID="fix-hint">
          <Txt variant="smallStrong" color={theme.colors.warning}>
            {t("fixTitle")}
          </Txt>
          <Txt variant="small">{fix.text}</Txt>
        </Block>
      ) : null}

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

      <View testID="terms">
        {clauses.map((c) => (
          <Block key={c.id} icon="doc" testID={`clause-${c.id}`}>
            <Txt variant="small" muted>
              <Txt variant="smallStrong">{c.id}: </Txt>
              {c.text}
            </Txt>
          </Block>
        ))}
        {check.clauseFit === "none" && check.guideNote ? (
          <Block icon="doc" testID="guide-note">
            <Txt variant="small" muted>
              {check.guideNote[lang]}
            </Txt>
          </Block>
        ) : null}
        <View style={{ marginTop: theme.space.sm }}>
          <Tag label={t(fitKey(check.clauseFit))} testID="clause-fit" />
        </View>
      </View>

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
          {photoHash ? ` SHA-256 ${shortHash(photoHash)}` : ""}
        </Txt>
      </View>
    </View>
  );
}

function Block({
  icon,
  tone,
  children,
  testID,
}: {
  icon: IconName;
  tone?: "warning";
  children: ReactNode;
  testID?: string;
}) {
  const theme = useTheme();
  return (
    <View
      testID={testID}
      style={{
        flexDirection: "row",
        gap: theme.space.md,
        marginTop: theme.space.md,
        paddingVertical: theme.space.sm,
        paddingHorizontal: theme.space.md,
        borderRadius: theme.radius.card,
        backgroundColor: tone === "warning" ? theme.colors.warningBg : theme.colors.sand,
      }}
    >
      <Icon
        name={icon}
        size={20}
        color={tone === "warning" ? theme.colors.warning : theme.colors.textMuted}
      />
      <View style={{ flex: 1, gap: theme.space.xxs }}>{children}</View>
    </View>
  );
}

function CriterionLine({ c, index }: { c: CriterionResult; index: number }) {
  const { t } = usePreparedHome();
  const theme = useTheme();
  const status = c.met === true ? t("metYes") : c.met === false ? t("metNo") : t("metUnknown");
  const color =
    c.met === true
      ? theme.colors.success
      : c.met === false
        ? theme.colors.danger
        : theme.colors.textMuted;
  return (
    <Appear index={index} testID={`criterion-${c.id}`}>
      <View
        accessible
        accessibilityLabel={`${status}: ${c.text}`}
        style={{
          flexDirection: "row",
          gap: theme.space.md,
          paddingVertical: theme.space.xs,
          alignItems: "flex-start",
        }}
      >
        <View style={{ width: 20, alignItems: "center", paddingTop: 2 }}>
          {c.met === null ? (
            <Txt variant="bodyStrong" color={color}>
              ?
            </Txt>
          ) : (
            <Icon name={c.met ? "check" : "close"} size={20} color={color} strokeWidth={2} />
          )}
        </View>
        <View style={{ flex: 1 }}>
          <Txt>{c.text}</Txt>
          <Txt variant="caption">
            {t(kindKey(c.kind))} · {status}
            {c.note ? ` · ${c.note}` : ""}
          </Txt>
        </View>
      </View>
    </Appear>
  );
}

/** Placeholder shown the moment the photo is taken, while it is prepared and checked. */
export function ResultSkeleton({ label }: { label: string }) {
  const theme = useTheme();
  return (
    <View testID="result-skeleton" accessibilityLabel={label} accessibilityLiveRegion="polite">
      <View style={{ flexDirection: "row", alignItems: "center", gap: theme.space.md }}>
        <Skeleton width={36} height={36} radius={18} />
        <Skeleton width="45%" height={28} />
      </View>
      <Gap size="sm" />
      <Txt variant="small" muted>
        {label}
      </Txt>
      <Gap size="md" />
      {[0.8, 0.65, 0.72].map((w, i) => (
        <View
          key={i}
          style={{ flexDirection: "row", gap: theme.space.md, paddingVertical: theme.space.xs }}
        >
          <Skeleton width={20} height={20} radius={10} />
          <Skeleton width={`${w * 100}%`} height={20} />
        </View>
      ))}
      <Gap size="md" />
      <Skeleton height={64} radius={theme.radius.card} />
    </View>
  );
}
