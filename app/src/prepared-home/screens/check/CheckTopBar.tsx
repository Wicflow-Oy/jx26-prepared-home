import { View } from "react-native";

import { useT, useTheme } from "../../context";
import { isDoneRow, type HomeModel } from "../../model";
import { IconButton, Txt } from "../../ui";

/** Close, "3 of 11" with a dot per check, and the torch. */
export function CheckTopBar({
  model,
  currentId,
  onClose,
  torch,
}: {
  model: HomeModel;
  currentId: string;
  onClose: () => void;
  /** Absent where there is no in-app camera. */
  torch?: { on: boolean; toggle: () => void };
}) {
  const { t } = useT();
  const theme = useTheme();
  const position = model.checks.findIndex((c) => c.id === currentId) + 1;
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: theme.space.md,
        minHeight: 56,
      }}
    >
      <IconButton icon="close" label={t("close")} onPress={onClose} inverse testID="back-button" />
      <View
        accessible
        accessibilityLabel={t("checkPosition", { n: position, total: model.checks.length })}
        style={{ flex: 1, alignItems: "center", gap: theme.space.xs }}
      >
        <Txt variant="smallStrong" inverse testID="check-count">
          {t("checkCount", { n: position, total: model.checks.length })}
        </Txt>
        <ProgressDots model={model} currentId={currentId} />
      </View>
      {torch ? (
        <IconButton
          icon="flash"
          label={t("light")}
          onPress={torch.toggle}
          inverse={!torch.on}
          checked={torch.on}
          hint={t("hintTorch")}
          testID="torch"
        />
      ) : (
        <View style={{ width: theme.layout.tapTarget }} />
      )}
    </View>
  );
}

/** One dot per check: done in white, fix first in amber, the current one wider. */
function ProgressDots({ model, currentId }: { model: HomeModel; currentId: string }) {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: "row", gap: 4 }} aria-hidden>
      {model.checks.map((c) => {
        const state = model.rowState(c.id);
        return (
          <View
            key={c.id}
            style={{
              width: c.id === currentId ? 14 : 6,
              height: 6,
              borderRadius: 3,
              backgroundColor: isDoneRow(state)
                ? theme.colors.textInverse
                : state === "fix_first"
                  ? theme.colors.warningMark
                  : "rgba(250, 249, 247, 0.32)",
            }}
          />
        );
      })}
    </View>
  );
}
