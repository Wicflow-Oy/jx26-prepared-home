// A check's route: waits for the device store, then opens the check flow for a check this home has.
import { isCheckId } from "@prepared-home/engine";
import { useRouter } from "expo-router";

import { usePreparedHome } from "../../context";
import { useHomeModel } from "../../model";
import { Button, ErrorState, LoadingState, NoHome, Screen } from "../../ui";
import { CheckFlow } from "./CheckFlow";

export function CheckScreen({ checkId }: { checkId: string }) {
  const { t, paths, ready } = usePreparedHome();
  const router = useRouter();
  const model = useHomeModel();

  if (!ready || !model) {
    return <Screen testID="check-screen">{!ready ? <LoadingState /> : <NoHome />}</Screen>;
  }
  if (!isCheckId(checkId) || !model.checkById.has(checkId)) {
    return (
      <Screen testID="check-screen">
        <ErrorState message={t("checkNotFound")} testID="check-missing" />
        <Button
          label={t("backHome")}
          onPress={() => router.replace(paths.home)}
          testID="result-home"
        />
      </Screen>
    );
  }
  return <CheckFlow model={model} initialId={checkId} />;
}
