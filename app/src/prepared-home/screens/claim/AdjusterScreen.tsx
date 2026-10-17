// Concept of the claims handler's view of a demo damage report made on this device. Nothing is sent to If.
import { useWindowDimensions } from "react-native";

import { usePreparedHome } from "../../context";
import { ErrorState, Gap, LoadingState, Screen, Txt } from "../../ui";
import { AdjusterBody } from "./AdjusterBody";

/** Wide enough for the records as a table rather than cards. */
const TABLE_WIDTH = 760;

export function AdjusterScreen({ claimId }: { claimId: string }) {
  const { t, ready, claims, homes, paths } = usePreparedHome();
  const { width } = useWindowDimensions();
  const view = claims[claimId]?.view;

  return (
    <Screen testID="adjuster-screen" wide backTo={paths.claim} barSubtitle={t("adjusterTitle")}>
      <Txt variant="display">{t("adjusterTitle")}</Txt>
      <Txt variant="small" muted testID="handler-view-note">
        {t("handlerViewNote")}
      </Txt>
      <Gap size="md" />
      {!ready ? (
        <LoadingState testID="adjuster-loading" />
      ) : view ? (
        <AdjusterBody
          view={view}
          home={homes.find((h) => h.homeId === view.homeId) ?? null}
          table={width >= TABLE_WIDTH}
        />
      ) : (
        <ErrorState message={t("adjusterNotFound")} testID="adjuster-missing" />
      )}
    </Screen>
  );
}
