import { useRouter } from "expo-router";

import { usePreparedHome } from "../context";
import { Button, Gap, Screen, Txt } from "../ui";

export function NotFoundScreen() {
  const { t, paths } = usePreparedHome();
  const router = useRouter();
  return (
    <Screen testID="not-found-screen" back={false}>
      <Txt variant="display">{t("notFoundTitle")}</Txt>
      <Gap size="lg" />
      <Button
        label={t("goToStart")}
        onPress={() => router.replace(paths.start)}
        testID="go-start"
      />
    </Screen>
  );
}
