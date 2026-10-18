import type { CheckDefinition, HomeType } from "@prepared-home/engine";
import { View } from "react-native";

import { useT, useTheme } from "../../context";
import { Txt, useFocusOnShow } from "../../ui";
import { checkInstruction } from "./checkInstruction";

/**
 * The check's title and its one-line instruction. For screen readers it is one item that says the whole
 * step ("Check 3 of 11. …"), and focus returns here for each new check and after "Try again".
 */
export function CheckHeading({
  check,
  homeType,
  spoken,
  focusKey,
}: {
  check: CheckDefinition;
  homeType: HomeType;
  spoken: string;
  /** Focus moves here when this changes; null while a result is shown. */
  focusKey: string | null;
}) {
  const { t, lang } = useT();
  const theme = useTheme();
  const ref = useFocusOnShow(focusKey);
  return (
    <View
      ref={ref}
      accessible
      accessibilityRole="header"
      accessibilityLabel={spoken}
      style={{ paddingHorizontal: theme.space.xl, paddingBottom: theme.space.md }}
    >
      <Txt variant="h2" inverse role="none" testID="check-title">
        {check.title[lang]}
      </Txt>
      <Txt inverse muted testID="coach-line">
        {checkInstruction(check.id, homeType, t)}
      </Txt>
    </View>
  );
}
