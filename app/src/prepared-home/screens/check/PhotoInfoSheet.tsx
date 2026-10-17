import { useT } from "../../context";
import { BottomSheet, Gap, Txt } from "../../ui";

/** Why camera photos count, and where each photo goes for the check. */
export function PhotoInfoSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useT();
  return (
    <BottomSheet open={open} onClose={onClose} label={t("yourPhotos")} testID="privacy-sheet">
      <Txt variant="h2">{t("yourPhotos")}</Txt>
      <Gap size="sm" />
      <Txt>{t("aboutCamera")}</Txt>
      <Gap size="md" />
      <Txt muted testID="privacy-line">
        {t("privacyLine")}
      </Txt>
    </BottomSheet>
  );
}
