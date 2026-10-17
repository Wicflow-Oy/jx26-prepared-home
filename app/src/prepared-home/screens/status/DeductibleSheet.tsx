// "How the lower deductible works": five plain points, and the proposed terms text one tap further.
import { useState } from "react";
import { View } from "react-native";

import { usePreparedHome, useTheme } from "../../context";
import type { StringKey } from "../../i18n";
import { Icon } from "../../icons";
import { PROPOSED_TERMS } from "../../terms";
import { AmountsTag, BottomSheet, Gap, PressableScale, TextLink, Txt } from "../../ui";

const POINTS: StringKey[] = ["dd1", "dd2", "dd3", "dd4", "dd5"];

export function DeductibleSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = usePreparedHome();
  const [page, setPage] = useState<"points" | "terms">("points");
  const close = () => {
    onClose();
    setPage("points");
  };

  return (
    <BottomSheet open={open} onClose={close} label={t("ddTitle")} testID="deductible-sheet">
      {page === "points" ? (
        <Points onTerms={() => setPage("terms")} />
      ) : (
        <Terms onBack={() => setPage("points")} />
      )}
    </BottomSheet>
  );
}

function Points({ onTerms }: { onTerms: () => void }) {
  const { t } = usePreparedHome();
  const theme = useTheme();
  return (
    <View testID="deductible-points">
      <Txt variant="h2">{t("ddTitle")}</Txt>
      <Gap size="sm" />
      <AmountsTag />
      <Gap size="md" />
      {POINTS.map((key, i) => (
        <View
          key={key}
          style={{ flexDirection: "row", gap: theme.space.md, marginBottom: theme.space.md }}
        >
          <View
            style={{
              width: 24,
              height: 24,
              borderRadius: 12,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: theme.colors.primaryTint,
            }}
          >
            <Txt variant="caption" color={theme.colors.primary}>
              {i + 1}
            </Txt>
          </View>
          <Txt style={{ flex: 1 }}>{t(key)}</Txt>
        </View>
      ))}
      <TextLink
        label={t("ddTermsLink")}
        onPress={onTerms}
        tone="primary"
        icon="doc"
        testID="open-terms"
      />
    </View>
  );
}

function Terms({ onBack }: { onBack: () => void }) {
  const { t, lang } = usePreparedHome();
  const theme = useTheme();
  return (
    <View testID="terms-text">
      <PressableScale
        onPress={onBack}
        accessibilityRole="button"
        accessibilityLabel={t("back")}
        style={{
          flexDirection: "row",
          alignItems: "center",
          alignSelf: "flex-start",
          minHeight: theme.layout.tapTarget,
          marginLeft: -theme.space.xs,
        }}
      >
        <Icon name="chevronLeft" size={20} color={theme.colors.primary} />
        <Txt variant="smallStrong" color={theme.colors.primary}>
          {t("back")}
        </Txt>
      </PressableScale>
      <Txt variant="h2">{t("termsTitle")}</Txt>
      {lang !== "en" ? (
        <Txt variant="small" muted style={{ marginTop: theme.space.xs }}>
          {t("termsEnglishNote")}
        </Txt>
      ) : null}
      <View
        style={{
          marginTop: theme.space.md,
          padding: theme.space.lg,
          borderRadius: theme.radius.card,
          backgroundColor: theme.colors.backgroundAlt,
        }}
      >
        <Txt selectable>
          <Txt variant="bodyStrong">{PROPOSED_TERMS.title} </Txt>
          {PROPOSED_TERMS.body}
        </Txt>
      </View>
    </View>
  );
}
