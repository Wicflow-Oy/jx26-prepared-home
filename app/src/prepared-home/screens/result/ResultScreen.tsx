import { getCheck, isCheckId } from "@prepared-home/engine";
import { useRouter, type Href } from "expo-router";

import { usePreparedHome } from "../../context";
import { haptics } from "../../haptics";
import { useHomeModel } from "../../model";
import { Button, Card, EmptyState, ErrorState, Gap, LoadingState, NoHome, Screen } from "../../ui";
import { ResultBody } from "./ResultBody";

/** A saved result, opened from the check screen, the home list or a reminder. */
export function ResultScreen({ checkId }: { checkId: string }) {
  const { t, lang, paths, ready, outcomeFor, markNotApplicable } = usePreparedHome();
  const router = useRouter();
  const model = useHomeModel();

  if (!ready || !model) {
    return <Screen testID="result-screen">{!ready ? <LoadingState /> : <NoHome />}</Screen>;
  }
  if (!isCheckId(checkId) || !model.checkById.has(checkId)) {
    return (
      <Screen testID="result-screen">
        <ErrorState message={t("checkNotFound")} testID="result-missing" />
      </Screen>
    );
  }

  const home = model.home;
  const check = getCheck(checkId, home.homeType);
  const stored = outcomeFor(home.homeId, checkId);
  const record = model.effective.get(checkId);
  const verdict = stored?.outcome.verdict ?? record?.verdict;
  const retake = () => router.replace(paths.check(checkId) as Href);

  return (
    <Screen
      testID="result-screen"
      barTitle={check.title[lang]}
      barSubtitle={t("resultTitle")}
      backTo={paths.home}
    >
      {!stored && !record ? (
        <>
          <EmptyState message={t("noResult")} testID="result-empty" />
          <Button label={t("takePhoto")} onPress={retake} testID="retake-button" icon="camera" />
        </>
      ) : (
        <>
          <Card>
            <ResultBody check={check} home={home} stored={stored} record={record} />
          </Card>
          <Gap size="sm" />
          <Button
            label={t("retakeButton")}
            onPress={retake}
            testID="retake-button"
            icon="camera"
            variant={
              verdict === "verified" || verdict === "not_applicable" ? "secondary" : "primary"
            }
          />
          {check.notApplicableAllowed && verdict !== "not_applicable" ? (
            <Button
              label={t("markNA")}
              onPress={() => {
                if (markNotApplicable(home, checkId).newlyPrepared.length > 0) haptics.prepared();
              }}
              testID="mark-na"
              variant="ghost"
              style={{ marginTop: 8 }}
            />
          ) : null}
          <Button
            label={t("backHome")}
            onPress={() => router.replace(paths.home as Href)}
            testID="result-home"
            variant="ghost"
          />
        </>
      )}
    </Screen>
  );
}
