import { useState } from "react";
import { TextInput } from "react-native";

import type { Health } from "../api";
import { usePreparedHome, useTheme } from "../context";
import { errorMessage } from "../errors";
import { LANGS } from "../i18n";
import {
  Banner,
  Button,
  Card,
  ErrorState,
  Gap,
  LoadingState,
  Screen,
  Section,
  Segmented,
  Txt,
} from "../ui";

type HealthState =
  | { status: "idle" | "loading" }
  | { status: "ok"; value: Health }
  | { status: "error"; message: string };

export function SettingsScreen() {
  const {
    t,
    lang,
    setLang,
    ready,
    api,
    paths,
    defaultApiBaseUrl,
    customApiBaseUrl,
    setApiBaseUrl,
    clearDeviceData,
  } = usePreparedHome();
  const theme = useTheme();
  const [draft, setDraft] = useState<string | null>(null);
  const [savedNote, setSavedNote] = useState(false);
  const [health, setHealth] = useState<HealthState>({ status: "idle" });
  const [confirmClear, setConfirmClear] = useState(false);
  const [cleared, setCleared] = useState(false);

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
    <Screen testID="settings-screen" backTo={paths.start}>
      <Txt variant="display">{t("settingsTitle")}</Txt>
      {!ready ? (
        <LoadingState />
      ) : (
        <>
          <Section title={t("language")}>
            <Segmented
              testIDPrefix="lang"
              value={lang}
              onChange={setLang}
              options={LANGS.map((l) => ({ value: l.code, label: l.name }))}
            />
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

          <Card testID="prototype-note">
            <Txt variant="smallStrong">{t("prototypeTitle")}</Txt>
            <Gap size="xs" />
            <Txt variant="small" muted>
              {t("prototypeNote")}
            </Txt>
          </Card>
        </>
      )}
    </Screen>
  );
}
