import { useRouter } from "expo-router";
import { useState } from "react";
import { TextInput } from "react-native";

import type { Health } from "../api";
import { IF_BRANDED } from "../brand";
import { usePreparedHome, useTheme } from "../context";
import { errorMessage } from "../errors";
import { EXAMPLES, type ExampleKey } from "../examples";
import {
  Banner,
  Button,
  Card,
  ErrorState,
  Gap,
  ListGroup,
  ListRow,
  LoadingState,
  Screen,
  Section,
  LanguageSwitch,
  Txt,
  VoiceGuidanceToggle,
} from "../ui";
import { DeductibleSheet } from "./status/DeductibleSheet";

type HealthState =
  | { status: "idle" | "loading" }
  | { status: "ok"; value: Health }
  | { status: "error"; message: string };

export function SettingsScreen() {
  const {
    t,
    ready,
    api,
    paths,
    defaultApiBaseUrl,
    customApiBaseUrl,
    setApiBaseUrl,
    clearDeviceData,
    openDemo,
  } = usePreparedHome();
  const router = useRouter();
  const theme = useTheme();
  const [draft, setDraft] = useState<string | null>(null);
  const [savedNote, setSavedNote] = useState(false);
  const [health, setHealth] = useState<HealthState>({ status: "idle" });
  const [confirmClear, setConfirmClear] = useState(false);
  const [cleared, setCleared] = useState(false);
  const [explainOpen, setExplainOpen] = useState(false);

  const value = draft ?? customApiBaseUrl ?? "";

  const save = () => {
    setApiBaseUrl(value);
    setDraft(null);
    setSavedNote(true);
    setHealth({ status: "idle" });
  };

  const test = () => {
    setHealth({ status: "loading" });
    api
      .health()
      .then((h) => setHealth({ status: "ok", value: h }))
      .catch((err) => setHealth({ status: "error", message: errorMessage(err, t) }));
  };

  const openExample = (key: ExampleKey) => {
    if (openDemo(EXAMPLES[key].homeId)) router.replace(paths.home);
  };

  const clear = async () => {
    if (!confirmClear) {
      setConfirmClear(true);
      return;
    }
    await clearDeviceData();
    setConfirmClear(false);
    setCleared(true);
  };

  return (
    <Screen
      testID="settings-screen"
      backTo={paths.home}
      overlay={<DeductibleSheet open={explainOpen} onClose={() => setExplainOpen(false)} />}
    >
      <Txt variant="display">{t("settings")}</Txt>
      {!ready ? (
        <LoadingState />
      ) : (
        <>
          <Section title={t("language")}>
            <LanguageSwitch />
            <Gap size="sm" />
            <VoiceGuidanceToggle />
          </Section>

          <Section title={t("exampleHomesTitle")} testID="example-homes">
            <ListGroup>
              {(Object.keys(EXAMPLES) as ExampleKey[]).map((key, i, all) => (
                <ListRow
                  key={key}
                  icon="home"
                  title={t(EXAMPLES[key].label)}
                  onPress={() => openExample(key)}
                  testID={`example-${key}`}
                  last={i === all.length - 1}
                />
              ))}
            </ListGroup>
            <Txt variant="caption">{t("exampleNote")}</Txt>
          </Section>

          <Section title={t("serverUrl")}>
            <TextInput
              testID="server-url-input"
              value={value}
              onChangeText={(v) => {
                setDraft(v);
                setSavedNote(false);
              }}
              placeholder={defaultApiBaseUrl}
              placeholderTextColor={theme.colors.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              accessibilityLabel={t("serverUrl")}
              style={{
                minHeight: theme.layout.button,
                borderWidth: 1,
                borderColor: theme.colors.border,
                borderRadius: theme.radius.button,
                paddingHorizontal: theme.space.md,
                backgroundColor: theme.colors.surface,
                color: theme.colors.text,
                fontSize: theme.font.size.body,
                fontFamily: theme.font.family,
              }}
            />
            <Gap size="xs" />
            <Txt variant="caption">{t("serverUrlHelp", { url: defaultApiBaseUrl })}</Txt>
            <Gap size="sm" />
            <Button label={t("save")} onPress={save} testID="server-url-save" variant="secondary" />
            {savedNote ? <Txt variant="caption">{t("saved")}</Txt> : null}
            <Gap size="sm" />
            <Button
              label={t("testConnection")}
              onPress={test}
              testID="server-test"
              variant="secondary"
            />
            {health.status === "loading" ? <LoadingState label={t("testing")} /> : null}
            {health.status === "ok" ? (
              <>
                <Gap size="sm" />
                <Banner tone="success" icon="check" testID="server-ok">
                  {t("connectionOk", {
                    live:
                      health.value.liveAvailable === false || !health.value.keySet
                        ? t("liveUnavailable")
                        : t("liveAvailable"),
                  })}
                </Banner>
              </>
            ) : null}
            {health.status === "error" ? (
              <>
                <Gap size="sm" />
                <ErrorState message={health.message} onRetry={test} testID="server-error" />
              </>
            ) : null}
          </Section>

          <Card testID="offline-note">
            <Txt variant="small" muted>
              {t("offlineNote")}
            </Txt>
          </Card>

          <Section title={t("dataTitle")}>
            <Button
              label={confirmClear ? t("clearConfirm") : t("clearData")}
              onPress={() => void clear()}
              variant="danger"
              testID="clear-data"
            />
            {cleared ? <Txt variant="caption">{t("cleared")}</Txt> : null}
          </Section>

          <Section title={t("aboutTitle")} testID="about">
            <ListGroup>
              <ListRow
                icon="doc"
                title={t("ddTitle")}
                onPress={() => setExplainOpen(true)}
                testID="open-deductible-info"
                last
              />
            </ListGroup>
            <Txt variant="small" muted testID="about-camera">
              {t("aboutCamera")}
            </Txt>
            <Gap size="sm" />
            <Txt variant="small" muted>
              {t("privacyLine")}
            </Txt>
            <Gap size="sm" />
            <Txt variant="small" muted>
              {t(IF_BRANDED ? "aboutIf" : "aboutNeutral")}
            </Txt>
          </Section>
        </>
      )}
    </Screen>
  );
}
