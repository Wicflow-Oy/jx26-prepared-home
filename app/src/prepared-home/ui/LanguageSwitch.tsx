import { View } from "react-native";

import { usePreparedHome, useTheme } from "../context";
import { LANGS } from "../i18n";
import { PressableScale } from "./Pressable";
import { Txt } from "./Text";

/** FI · SV · EN. The choice is saved and every screen switches at once. */
export function LanguageSwitch() {
  const theme = useTheme();
  const { lang, setLang, t } = usePreparedHome();
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={t("language")}
      style={{
        flexDirection: "row",
        alignSelf: "flex-start",
        backgroundColor: theme.colors.sand,
        borderRadius: theme.radius.button,
        padding: theme.space.xxs,
      }}
    >
      {LANGS.map((l) => {
        const selected = l.code === lang;
        return (
          <PressableScale
            key={l.code}
            testID={`lang-${l.code}`}
            accessibilityRole="radio"
            accessibilityLabel={l.name}
            accessibilityState={{ selected, checked: selected }}
            onPress={() => setLang(l.code)}
            style={{
              minWidth: 52,
              minHeight: theme.layout.tapTarget,
              paddingHorizontal: theme.space.md,
              borderRadius: theme.radius.button - 2,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: selected ? theme.colors.primary : "transparent",
            }}
          >
            <Txt
              variant="smallStrong"
              color={selected ? theme.colors.primaryText : theme.colors.text}
            >
              {l.code.toUpperCase()}
            </Txt>
          </PressableScale>
        );
      })}
    </View>
  );
}
