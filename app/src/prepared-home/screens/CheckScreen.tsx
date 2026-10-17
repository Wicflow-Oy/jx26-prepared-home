import { getCheck, isCheckId, type CheckDefinition, type Peril } from "@prepared-home/engine";
import { Image } from "expo-image";
import { useRouter, type Href } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Platform, View, useWindowDimensions } from "react-native";

import type { SamplePhoto } from "../api";
import { usePreparedHome, useTheme } from "../context";
import { errorMessage } from "../errors";
import { haptics } from "../haptics";
import { formatDate } from "../i18n";
import { Icon, type IconName } from "../icons";
import { perilLabel, useHomeModel, verdictLabel } from "../model";
import { pickImage, prepareImage, prepareSample, type PreparedPhoto } from "../photoPipeline";
import type { StoredOutcome } from "../storage";
import {
  Appear,
  Banner,
  BottomSheet,
  Button,
  EmptyState,
  ErrorState,
  Gap,
  LoadingState,
  NoHome,
  PressableScale,
  Screen,
  Segmented,
  Txt,
} from "../ui";
import { ResultBody, ResultSkeleton } from "./ResultBody";

type SamplesState =
  { status: "idle" | "loading" | "error" } | { status: "ok"; list: SamplePhoto[] };

type Run =
  | { status: "idle" }
  | { status: "preparing" | "checking" }
  | { status: "done"; stored: StoredOutcome; newlyPrepared: Peril[] }
  | { status: "error"; message: string; retry?: () => void };

export function CheckScreen({ checkId }: { checkId: string }) {
  const { t, lang, paths, ready, api, saveCheckResult, markNotApplicable } = usePreparedHome();
  const theme = useTheme();
  const router = useRouter();
  const model = useHomeModel();
  const { width } = useWindowDimensions();
  const desktopWeb = Platform.OS === "web" && width >= 768;

  const [photo, setPhoto] = useState<PreparedPhoto | null>(null);
  const [answers, setAnswers] = useState<Record<string, boolean>>({});
  const [run, setRun] = useState<Run>({ status: "idle" });
  const [sheet, setSheet] = useState<"none" | "result" | "samples">("none");
  const [notice, setNotice] = useState<string | null>(null);
  const [samples, setSamples] = useState<SamplesState>({ status: "idle" });

  const samplesRequested = useRef(false);

  const fetchSamples = useCallback(
    () =>
      api
        .samples(lang)
        .then((list) => setSamples({ status: "ok", list }))
        .catch(() => setSamples({ status: "error" })),
    [api, lang],
  );

  const retrySamples = () => {
    setSamples({ status: "loading" });
    void fetchSamples();
  };

  // Desktop judges have no camera, so their samples load straight away; on phones, when asked for.
  const wantSamples = desktopWeb || sheet === "samples";
  useEffect(() => {
    if (!wantSamples || samplesRequested.current) return;
    samplesRequested.current = true;
    void fetchSamples();
  }, [wantSamples, fetchSamples]);

  const known = isCheckId(checkId);
  const check: CheckDefinition | null =
    known && model ? getCheck(checkId, model.home.homeType) : null;

  if (!ready || !model) {
    return (
      <Screen testID="check-screen" tone="dark">
        {!ready ? <LoadingState inverse /> : <NoHome />}
      </Screen>
    );
  }
  if (!check || !model.checkById.has(checkId)) {
    return (
      <Screen testID="check-screen">
        <ErrorState message={known ? t("notForHome") : t("checkNotFound")} testID="check-missing" />
        <Button
          label={t("backHome")}
          onPress={() => router.replace(paths.home as Href)}
          testID="result-home"
        />
      </Screen>
    );
  }

  const home = model.home;
  const previous = model.effective.get(check.id);
  const peril = model.perils.find((p) => p.required.includes(check.id));
  const position = peril ? peril.required.indexOf(check.id) + 1 : 0;
  const photoCriteria = check.criteria.filter((c) => c.kind !== "user");
  const userCriteria = check.criteria.filter((c) => c.kind === "user");
  const answered = userCriteria.every((c) => typeof answers[c.id] === "boolean");
  const busy = run.status === "preparing" || run.status === "checking";

  const submit = async (prepared: PreparedPhoto) => {
    setRun({ status: "checking" });
    try {
      const response = await api.check({
        homeId: home.homeId,
        homeType: home.homeType,
        checkId: check.id,
        lang,
        imageBase64: prepared.base64,
        width: prepared.width,
        height: prepared.height,
        photoSha256: prepared.sha256,
        userAnswers: answers,
      });
      const saved = await saveCheckResult({
        home,
        response,
        photo: prepared,
        previousVerdict: previous?.verdict,
      });
      const verdict = saved.stored.outcome.verdict;
      if (saved.newlyPrepared.length > 0 || verdict === "verified") haptics.verified();
      else if (verdict === "fix_first") haptics.fixFirst();
      setRun({ status: "done", ...saved });
    } catch (err) {
      setRun({
        status: "error",
        message: errorMessage(err, t),
        retry: () => void submit(prepared),
      });
    }
  };

  // The sheet rises the moment a photo is chosen; the photo is prepared and checked behind the skeleton.
  const begin = async (source: () => Promise<PreparedPhoto | null>) => {
    if (!answered) {
      setSheet("none");
      setNotice(t("answerNeeded"));
      return;
    }
    setNotice(null);
    let prepared: PreparedPhoto | null;
    try {
      prepared = await source();
    } catch (err) {
      setSheet("result");
      setRun({ status: "error", message: errorMessage(err, t) });
      return;
    }
    if (!prepared) return;
    setPhoto(prepared);
    await submit(prepared);
  };

  const fromDevice = (from: "camera" | "library") =>
    begin(async () => {
      const picked = await pickImage(from);
      if (picked.kind === "denied") {
        setNotice(t("cameraDenied"));
        return null;
      }
      if (picked.kind === "cancelled") return null;
      setSheet("result");
      setRun({ status: "preparing" });
      try {
        return await prepareImage(picked.uri, from);
      } catch {
        setRun({ status: "error", message: t("photoFailed") });
        return null;
      }
    });

  const fromSample = (sample: SamplePhoto) =>
    begin(async () => {
      setSheet("result");
      setRun({ status: "preparing" });
      return prepareSample(api.resolveAssetUrl(sample.url), sample.id, sample);
    });

  const closeSheet = () => {
    setSheet("none");
    if (run.status !== "checking" && run.status !== "preparing") setRun({ status: "idle" });
  };

  const retakeFromSheet = () => {
    setSheet("none");
    setRun({ status: "idle" });
    setPhoto(null);
  };

  const markNA = () => {
    const saved = markNotApplicable(home, check.id);
    if (saved.newlyPrepared.length > 0) haptics.prepared();
    setSheet("result");
    setRun({ status: "done", ...saved });
  };

  const nextStep = model.nextStep && model.nextStep.check.id !== check.id ? model.nextStep : null;
  const doneVerdict = run.status === "done" ? run.stored.outcome.verdict : null;

  const sampleList = (
    <SampleList
      state={samples}
      checkId={check.id}
      onPick={(s) => void fromSample(s)}
      onRetry={retrySamples}
      disabled={busy}
      resolve={api.resolveAssetUrl}
      inverse={sheet !== "samples"}
    />
  );

  return (
    <Screen
      testID="check-screen"
      tone="dark"
      backIcon="close"
      barTitle={check.title[lang]}
      barSubtitle={
        peril
          ? t("checkPosition", {
              peril: perilLabel(peril.peril, lang),
              index: position,
              count: peril.required.length,
            })
          : t("appName")
      }
      overlay={
        <>
          <BottomSheet
            open={sheet === "result"}
            onClose={closeSheet}
            label={t("resultTitle")}
            testID="result-sheet"
          >
            {run.status === "preparing" || run.status === "checking" ? (
              <ResultSkeleton label={run.status === "preparing" ? t("preparing") : t("checking")} />
            ) : run.status === "error" ? (
              <View testID="check-error">
                <ErrorState message={run.message} onRetry={run.retry} />
                <Button
                  label={t("changePhoto")}
                  onPress={retakeFromSheet}
                  variant="secondary"
                  testID="sheet-retake"
                />
              </View>
            ) : run.status === "done" ? (
              <View>
                {run.newlyPrepared.map((p) => (
                  <Banner key={p} tone="success" icon="check" testID={`prepared-${p}`}>
                    {t("preparedNow", { peril: perilLabel(p, lang) })}
                  </Banner>
                ))}
                <ResultBody
                  check={check}
                  home={home}
                  stored={run.stored}
                  record={model.effective.get(check.id)}
                  fresh
                />
                <Gap size="lg" />
                {doneVerdict !== "verified" && doneVerdict !== "not_applicable" ? (
                  <Button
                    label={t("retakeButton")}
                    onPress={retakeFromSheet}
                    testID="retake-button"
                    icon="camera"
                  />
                ) : null}
                {nextStep ? (
                  <Button
                    label={t("nextCheck", { title: nextStep.check.title[lang] })}
                    onPress={() => router.replace(paths.check(nextStep.check.id) as Href)}
                    variant={
                      doneVerdict === "verified" || doneVerdict === "not_applicable"
                        ? "primary"
                        : "secondary"
                    }
                    testID="next-check"
                    style={{ marginTop: theme.space.sm }}
                  />
                ) : null}
                {check.notApplicableAllowed && doneVerdict !== "not_applicable" ? (
                  <Button
                    label={t("markNA")}
                    onPress={markNA}
                    variant="ghost"
                    testID="sheet-mark-na"
                  />
                ) : null}
                <Button
                  label={t("backHome")}
                  onPress={() => router.replace(paths.home as Href)}
                  variant="ghost"
                  testID="result-home"
                />
              </View>
            ) : null}
          </BottomSheet>
          <BottomSheet
            open={sheet === "samples"}
            onClose={() => setSheet("none")}
            label={t("samplesTitle")}
            testID="samples-sheet"
          >
            <Txt variant="h2">{t("samplesTitle")}</Txt>
            <Gap size="sm" />
            {sampleList}
          </BottomSheet>
        </>
      }
    >
      <Txt variant="lead" inverse testID="coach-line">
        {check.coach[lang]}
      </Txt>
      <Gap size="lg" />

      <Viewfinder photo={photo} wide={desktopWeb} />
      <Gap size="md" />

      {photoCriteria.length > 0 ? (
        <View accessibilityLabel={t("lookFor")}>
          {photoCriteria.map((c) => (
            <View
              key={c.id}
              style={{
                flexDirection: "row",
                gap: theme.space.sm,
                paddingVertical: theme.space.xxs,
              }}
            >
              <Icon name="check" size={16} color={theme.colors.textInverseMuted} />
              <Txt variant="small" inverse muted style={{ flex: 1 }}>
                {c.text[lang]}
              </Txt>
            </View>
          ))}
        </View>
      ) : null}

      {userCriteria.length > 0 ? (
        <View
          testID="questions"
          style={{
            marginTop: theme.space.lg,
            padding: theme.space.lg,
            borderRadius: theme.radius.card,
            backgroundColor: "rgba(250, 249, 247, 0.08)",
          }}
        >
          {userCriteria.map((c) => (
            <View key={c.id} style={{ marginBottom: theme.space.sm }}>
              <Txt inverse style={{ marginBottom: theme.space.sm }}>
                {c.text[lang]}
              </Txt>
              <Segmented
                testIDPrefix={`answer-${c.id}`}
                inverse
                value={typeof answers[c.id] === "boolean" ? (answers[c.id] ? "yes" : "no") : null}
                onChange={(v) => {
                  setAnswers((a) => ({ ...a, [c.id]: v === "yes" }));
                  setNotice(null);
                }}
                options={[
                  { value: "yes", label: t("yes") },
                  { value: "no", label: t("no") },
                ]}
              />
            </View>
          ))}
        </View>
      ) : null}

      {notice ? (
        <View style={{ marginTop: theme.space.md }}>
          <Banner tone="warning" testID="photo-notice">
            {notice}
          </Banner>
        </View>
      ) : null}

      <Gap size="lg" />
      {desktopWeb ? (
        <View>
          <Txt variant="small" inverse muted>
            {t("noCameraHere")}
          </Txt>
          <Gap size="md" />
          {sampleList}
          <Gap size="sm" />
          <Button
            label={t("uploadPhoto")}
            onPress={() => void fromDevice("library")}
            variant="inverse"
            icon="image"
            testID="pick-photo"
            disabled={busy}
          />
        </View>
      ) : (
        <View
          style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-around" }}
        >
          <RoundAction
            icon="image"
            label={t("yourPhotos")}
            onPress={() => void fromDevice("library")}
            testID="pick-photo"
            disabled={busy}
          />
          <Shutter
            label={t("takePhoto")}
            onPress={() => void fromDevice("camera")}
            disabled={busy}
          />
          <RoundAction
            icon="card"
            label={t("samplesShort")}
            onPress={() => setSheet("samples")}
            testID="use-sample"
            disabled={busy}
          />
        </View>
      )}

      <View
        style={{
          flexDirection: "row",
          gap: theme.space.sm,
          marginTop: theme.space.xl,
          alignItems: "flex-start",
        }}
      >
        <Icon name="lock" size={16} color={theme.colors.textInverseMuted} />
        <Txt variant="caption" inverse muted testID="privacy-line" style={{ flex: 1 }}>
          {t("privacyLine")}
        </Txt>
      </View>

      {previous ? (
        <View testID="last-result" style={{ marginTop: theme.space.lg }}>
          <Txt variant="small" inverse muted>
            {t("lastResult", {
              verdict: verdictLabel(previous.verdict, lang),
              date: formatDate(previous.checkedAt, lang),
            })}
          </Txt>
          <Button
            label={t("viewResult")}
            onPress={() => router.push(paths.result(check.id) as Href)}
            variant="inverse"
            testID="view-result"
            style={{ marginTop: theme.space.sm }}
          />
        </View>
      ) : null}

      {check.notApplicableAllowed ? (
        <View style={{ marginTop: theme.space.lg }}>
          <Button
            label={t("markNA")}
            onPress={markNA}
            variant="inverse"
            testID="mark-na"
            disabled={busy}
          />
          <Txt variant="caption" inverse muted>
            {t("naHelp")}
          </Txt>
        </View>
      ) : null}
    </Screen>
  );
}

/** The framed photo area. It keeps its size before and after a photo, so nothing below it jumps. */
function Viewfinder({ photo, wide }: { photo: PreparedPhoto | null; wide: boolean }) {
  const theme = useTheme();
  const { t } = usePreparedHome();
  const corner = {
    position: "absolute" as const,
    width: 26,
    height: 26,
    borderColor: theme.colors.textInverse,
  };
  return (
    <View
      testID="viewfinder"
      style={{
        width: "100%",
        aspectRatio: wide ? 16 / 9 : 4 / 3,
        borderRadius: theme.radius.sheet,
        overflow: "hidden",
        backgroundColor: theme.colors.viewfinder,
      }}
    >
      {photo ? (
        <Image
          testID="photo-preview"
          source={{ uri: photo.previewUri }}
          style={{ width: "100%", height: "100%" }}
          contentFit="cover"
          transition={200}
          accessibilityLabel={t("photoStaysOnDevice")}
        />
      ) : (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <Icon name="camera" size={40} color={theme.colors.textInverseMuted} strokeWidth={1.2} />
        </View>
      )}
      <View
        style={[
          corner,
          { top: 16, left: 16, borderTopWidth: 2.5, borderLeftWidth: 2.5, borderTopLeftRadius: 4 },
        ]}
      />
      <View
        style={[
          corner,
          {
            top: 16,
            right: 16,
            borderTopWidth: 2.5,
            borderRightWidth: 2.5,
            borderTopRightRadius: 4,
          },
        ]}
      />
      <View
        style={[
          corner,
          {
            bottom: 16,
            left: 16,
            borderBottomWidth: 2.5,
            borderLeftWidth: 2.5,
            borderBottomLeftRadius: 4,
          },
        ]}
      />
      <View
        style={[
          corner,
          {
            bottom: 16,
            right: 16,
            borderBottomWidth: 2.5,
            borderRightWidth: 2.5,
            borderBottomRightRadius: 4,
          },
        ]}
      />
    </View>
  );
}

function Shutter({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled: boolean;
}) {
  const theme = useTheme();
  return (
    <View style={{ alignItems: "center", gap: theme.space.sm }}>
      <PressableScale
        testID="take-photo"
        accessibilityLabel={label}
        onPress={onPress}
        disabled={disabled}
        style={{
          width: 76,
          height: 76,
          borderRadius: 38,
          borderWidth: 4,
          borderColor: theme.colors.textInverse,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <View
          style={{
            width: 60,
            height: 60,
            borderRadius: 30,
            backgroundColor: theme.colors.textInverse,
          }}
        />
      </PressableScale>
      <Txt variant="caption" inverse>
        {label}
      </Txt>
    </View>
  );
}

function RoundAction({
  icon,
  label,
  onPress,
  testID,
  disabled,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  testID: string;
  disabled: boolean;
}) {
  const theme = useTheme();
  return (
    <View style={{ alignItems: "center", gap: theme.space.sm, width: 96, paddingTop: 10 }}>
      <PressableScale
        testID={testID}
        accessibilityLabel={label}
        onPress={onPress}
        disabled={disabled}
        style={{
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: "rgba(250, 249, 247, 0.12)",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon name={icon} color={theme.colors.textInverse} />
      </PressableScale>
      <Txt variant="caption" inverse style={{ textAlign: "center" }}>
        {label}
      </Txt>
    </View>
  );
}

function SampleList({
  state,
  checkId,
  onPick,
  onRetry,
  disabled,
  resolve,
  inverse,
}: {
  state: SamplesState;
  checkId: string;
  onPick: (s: SamplePhoto) => void;
  onRetry: () => void;
  disabled: boolean;
  resolve: (url: string) => string;
  inverse: boolean;
}) {
  const { t, lang } = usePreparedHome();
  const theme = useTheme();
  if (state.status !== "ok") {
    return state.status === "error" ? (
      <ErrorState
        message={`${t("samplesError")} ${t("errOffline")}`}
        onRetry={onRetry}
        testID="samples-error"
        retryTestID="samples-retry"
      />
    ) : (
      <LoadingState label={t("samplesLoading")} testID="samples-loading" inverse={inverse} />
    );
  }
  const list = state.list;
  if (list.length === 0) return <EmptyState message={t("samplesEmpty")} testID="samples-empty" />;

  const matching = list.filter((s) => s.checkId === checkId);
  const shown = matching.length > 0 ? matching : list;
  return (
    <View testID="samples-list">
      {matching.length === 0 ? (
        <Txt variant="small" muted inverse={inverse} style={{ marginBottom: theme.space.sm }}>
          {t("samplesOtherCheck")}
        </Txt>
      ) : null}
      {shown.map((s, i) => (
        <Appear key={s.id} index={i}>
          <PressableScale
            testID={`sample-${s.id}`}
            accessibilityLabel={`${t("useSample")}: ${s.title ?? t("sampleFor", { id: s.checkId })}`}
            disabled={disabled}
            onPress={() => onPick(s)}
            style={{
              flexDirection: "row",
              gap: theme.space.md,
              padding: theme.space.sm,
              borderRadius: theme.radius.card,
              backgroundColor: inverse ? "rgba(250, 249, 247, 0.08)" : theme.colors.surface,
              marginBottom: theme.space.sm,
            }}
          >
            <Image
              source={{ uri: resolve(s.url) }}
              style={{
                width: 72,
                height: 72,
                borderRadius: theme.radius.button,
                backgroundColor: theme.colors.viewfinder,
              }}
              contentFit="cover"
              transition={200}
              accessibilityIgnoresInvertColors
            />
            <View style={{ flex: 1, justifyContent: "center", gap: theme.space.xxs }}>
              <Txt variant="small" inverse={inverse}>
                {s.title ?? t("sampleFor", { id: s.checkId })}
              </Txt>
              <Txt variant="caption" inverse={inverse} muted>
                {t("sampleFor", { id: s.checkId })}
                {s.expectedVerdict
                  ? ` · ${t("sampleShows", { verdict: verdictLabel(s.expectedVerdict, lang) })}`
                  : ""}
                {s.recordedAt ? ` · ${t("sourceCached")} (${formatDate(s.recordedAt, lang)})` : ""}
              </Txt>
              {s.credit ? (
                <Txt variant="caption" inverse={inverse} muted testID={`sample-credit-${s.id}`}>
                  {s.credit}
                </Txt>
              ) : null}
            </View>
          </PressableScale>
        </Appear>
      ))}
    </View>
  );
}
