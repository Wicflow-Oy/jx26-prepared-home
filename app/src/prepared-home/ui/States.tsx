import { useRouter, type Href } from "expo-router";
import { ActivityIndicator, View } from "react-native";

import { usePreparedHome, useTheme } from "../context";
import { Card, Gap } from "./Layout";
import { Button } from "./Pressable";
import { Txt } from "./Text";

export function LoadingState({
  label,
  testID,
  inverse,
}: {
  label?: string;
  testID?: string;
  inverse?: boolean;
}) {
  const theme = useTheme();
  const { t } = usePreparedHome();
  return (
    <View
      testID={testID}
      accessibilityLiveRegion="polite"
      style={{ paddingVertical: theme.space.xl, alignItems: "center", gap: theme.space.md }}
    >
      <ActivityIndicator color={inverse ? theme.colors.textInverse : theme.colors.primary} />
      <Txt variant="small" muted inverse={inverse}>
        {label ?? t("loading")}
      </Txt>
    </View>
  );
}

export function ErrorState({
  message,
  onRetry,
  testID,
  retryTestID = "retry",
}: {
  message: string;
  onRetry?: () => void;
  testID?: string;
  retryTestID?: string;
}) {
  const { t } = usePreparedHome();
  return (
    <Card tone="danger" testID={testID}>
      <Txt variant="small" role="alert">
        {message}
      </Txt>
      {onRetry ? (
        <>
          <Gap size="md" />
          <Button label={t("retry")} onPress={onRetry} variant="secondary" testID={retryTestID} />
        </>
      ) : null}
    </Card>
  );
}

export function EmptyState({ message, testID }: { message: string; testID?: string }) {
  const theme = useTheme();
  return (
    <View testID={testID} style={{ paddingVertical: theme.space.xl, alignItems: "center" }}>
      <Txt variant="small" muted style={{ textAlign: "center" }}>
        {message}
      </Txt>
    </View>
  );
}

/** Shown when a screen needs a home but none is open. */
export function NoHome() {
  const { t, paths } = usePreparedHome();
  const router = useRouter();
  return (
    <Card testID="no-home">
      <Txt>{t("noHome")}</Txt>
      <Gap />
      <Button
        label={t("chooseHome")}
        onPress={() => router.replace(paths.start as Href)}
        testID="choose-home"
      />
    </Card>
  );
}
