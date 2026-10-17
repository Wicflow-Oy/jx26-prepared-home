import { DEMO_CLAIM } from "@prepared-home/engine";
import { useRouter, type Href } from "expo-router";
import { useEffect, useState } from "react";

import type { SharedPhoto } from "../api";
import { usePreparedHome } from "../context";
import { errorMessage } from "../errors";
import { formatDate, type StringKey } from "../i18n";
import { useHomeModel, verdictLabel } from "../model";
import { hasPhoto, loadPhotoBase64 } from "../photoStore";
import {
  Button,
  Card,
  ErrorState,
  Gap,
  ListGroup,
  ListRow,
  LoadingState,
  NoHome,
  Screen,
  Section,
  Segmented,
  Txt,
} from "../ui";

type PhotoRef = { checkId: string; sha256: string };

export function ClaimScreen() {
  const { t, lang, ready, api, paths, claims, saveClaim } = usePreparedHome();
  const router = useRouter();
  const model = useHomeModel();
  const [photos, setPhotos] = useState<PhotoRef[] | null>(null);
  const [share, setShare] = useState<"yes" | "no">("yes");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { peril, lossDate } = DEMO_CLAIM;
  const leakIds = model?.perils.find((p) => p.peril === peril)?.required ?? [];
  const candidates: PhotoRef[] = model
    ? leakIds.flatMap((id) => {
        const sha256 = model.effective.get(id)?.photoSha256;
        return sha256 ? [{ checkId: id, sha256 }] : [];
      })
    : [];
  const candidateKey = candidates.map((c) => `${c.checkId}:${c.sha256}`).join("|");

  // Only photos that are really on this device can be shared; demo records were made elsewhere.
  useEffect(() => {
    let alive = true;
    const list: PhotoRef[] = candidateKey
      ? candidateKey.split("|").map((s) => {
          const [checkId, sha256] = s.split(":");
          return { checkId, sha256 };
        })
      : [];
    Promise.all(list.map(async (c) => ((await hasPhoto(c.sha256)) ? c : null)))
      .then((found) => {
        if (alive) setPhotos(found.filter((c): c is PhotoRef => c !== null));
      })
      .catch(() => {
        if (alive) setPhotos([]);
      });
    return () => {
      alive = false;
    };
  }, [candidateKey]);

  if (!ready || !model) {
    return <Screen testID="claim-screen">{!ready ? <LoadingState /> : <NoHome />}</Screen>;
  }

  const home = model.home;
  const earlier = Object.values(claims)
    .filter((c) => c.homeId === home.homeId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const simulate = async () => {
    setError(null);
    setSending(true);
    try {
      const shared: SharedPhoto[] = [];
      if (share === "yes" && photos) {
        for (const p of photos) {
          const imageBase64 = await loadPhotoBase64(p.sha256);
          if (imageBase64) shared.push({ checkId: p.checkId, imageBase64 });
        }
      }
      const view = await api.claim({ home, records: model.records, peril, lossDate, shared });
      saveClaim(home.homeId, view);
      router.push(paths.adjuster(view.claimId) as Href);
    } catch (err) {
      setError(errorMessage(err, t));
    } finally {
      setSending(false);
    }
  };

  return (
    <Screen testID="claim-screen">
      <Txt variant="display">{t("claimTitle")}</Txt>
      <Gap size="xs" />
      <Txt muted>{t("claimIntro", { date: formatDate(lossDate, lang) })}</Txt>
      <Gap size="lg" />

      <Card raised testID="share-card">
        <Txt variant="bodyStrong">{t("shareTitle")}</Txt>
        <Gap size="xs" />
        <Txt variant="small" muted>
          {t("shareBody")}
        </Txt>
        <Gap size="md" />
        {photos === null ? (
          <LoadingState />
        ) : photos.length === 0 ? (
          <Txt variant="caption" testID="no-photos">
            {t("noPhotosOnDevice")}
          </Txt>
        ) : (
          <>
            <Txt variant="caption" testID="photos-count">
              {t("photosOnDevice", { ids: photos.map((p) => p.checkId).join(", ") })}
            </Txt>
            <Gap size="sm" />
            <Segmented
              testIDPrefix="share-photos"
              value={share}
              onChange={setShare}
              options={[
                { value: "yes", label: t("yes") },
                { value: "no", label: t("no") },
              ]}
            />
          </>
        )}
        <Gap size="sm" />
        <Txt variant="caption">
          {leakIds
            .map((id) => {
              const r = model.effective.get(id);
              return `${id} ${r ? verdictLabel(r.verdict, lang) : t("row.notChecked")}`;
            })
            .join(" · ")}
        </Txt>
      </Card>

      {error ? (
        <ErrorState message={error} onRetry={() => void simulate()} testID="claim-error" />
      ) : null}

      <Button
        label={sending ? t("sending") : t("simulate")}
        onPress={() => void simulate()}
        testID="simulate-claim"
        icon="claim"
        loading={sending}
        disabled={photos === null}
      />
      <Gap size="xs" />
      <Txt variant="caption">{t("claimNote")}</Txt>

      {earlier.length > 0 ? (
        <Section title={t("earlierClaims")}>
          <ListGroup>
            {earlier.map((c, i) => (
              <ListRow
                key={c.view.claimId}
                index={i}
                last={i === earlier.length - 1}
                testID={`claim-row-${c.view.claimId}`}
                title={t("claimId", { id: c.view.claimId })}
                subtitle={formatDate(c.createdAt, lang)}
                tag={{
                  label: t(`decision.${c.view.decision}` as StringKey),
                  tone: c.view.decision === "relief_applies" ? "success" : "warning",
                }}
                onPress={() => router.push(paths.adjuster(c.view.claimId) as Href)}
              />
            ))}
          </ListGroup>
        </Section>
      ) : null}
    </Screen>
  );
}
