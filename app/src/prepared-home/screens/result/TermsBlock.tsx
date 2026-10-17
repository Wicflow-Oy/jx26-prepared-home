import type { CheckDefinition } from "@prepared-home/engine";
import { clauseRefs } from "@prepared-home/engine";
import { View } from "react-native";

import { useT, useTheme } from "../../context";
import { fitKey } from "../../i18n";
import { clauseBody, clauseLabel } from "../../terms";
import { Tag, Txt } from "../../ui";
import { InfoBlock } from "./InfoBlock";

/**
 * What If's terms say about this check, cited by document and section, with how the check relates to
 * them. Safety tips from outside the terms (If's home guide, SPEK, Tukes) follow as a quieter line.
 */
export function TermsBlock({ check }: { check: CheckDefinition }) {
  const { t, lang } = useT();
  const theme = useTheme();
  return (
    <View testID="terms">
      {clauseRefs(check, lang).map((c) => (
        <InfoBlock key={c.id} icon="doc" testID={`clause-${c.id}`}>
          <Txt variant="caption">{clauseLabel(c.id, t)}</Txt>
          <Txt variant="small" muted>
            {clauseBody(c.id, c.text, lang)}
          </Txt>
        </InfoBlock>
      ))}
      {check.relationNote ? (
        <Txt variant="small" style={{ marginTop: theme.space.sm }} testID="relation-note">
          {check.relationNote[lang]}
        </Txt>
      ) : null}
      {check.guideNote ? (
        <Txt variant="caption" style={{ marginTop: theme.space.sm }} testID="guide-note">
          {check.guideNote[lang]}
        </Txt>
      ) : null}
      <View style={{ marginTop: theme.space.sm }}>
        <Tag label={t(fitKey(check.clauseFit))} testID="clause-fit" />
      </View>
    </View>
  );
}
