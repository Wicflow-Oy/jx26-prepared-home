import type { ReactNode } from "react";
import { View } from "react-native";

import { useFocusOnShow } from "../../ui";

/**
 * The words of a result, read by a screen reader as one sentence with what to do next. Focus moves here
 * when the result appears; the buttons after it stay separate, so they can be reached one by one.
 */
export function ResultSummary({ spoken, children }: { spoken: string; children: ReactNode }) {
  const ref = useFocusOnShow(spoken);
  return (
    <View ref={ref} accessible accessibilityLabel={spoken} testID="result-summary">
      {children}
    </View>
  );
}
