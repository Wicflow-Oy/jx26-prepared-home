import { Fragment, type ReactNode } from "react";
import { Linking } from "react-native";

import type { SamplePhoto } from "../../api";
import { useT, useTheme } from "../../context";
import { Txt } from "../../ui";

/** The deed page of a Creative Commons licence named like "CC BY-SA 4.0" or "CC0". */
function licenceUrl(licence: string): string | null {
  if (/^CC0\b/i.test(licence)) return "https://creativecommons.org/publicdomain/zero/1.0/";
  const m = licence.match(/^CC (BY(?:-(?:SA|ND|NC))*) (\d\.\d)$/i);
  return m ? `https://creativecommons.org/licenses/${m[1].toLowerCase()}/${m[2]}/` : null;
}

/**
 * "Photo: author, licence, Wikimedia Commons", with the author linked to the file page and the licence to
 * its deed. 4.0 licences ask for changes to be marked, so the resized photos say so.
 */
export function SampleCredit({ sample, inverse }: { sample: SamplePhoto; inverse?: boolean }) {
  const { t } = useT();
  const theme = useTheme();
  if (!sample.author || !sample.licence) {
    return sample.credit ? (
      <Txt variant="caption" testID={`sample-credit-${sample.id}`}>
        {sample.credit}
      </Txt>
    ) : null;
  }
  const link = (label: string, url: string | null | undefined): ReactNode =>
    url ? (
      <Txt
        variant="caption"
        color={inverse ? theme.colors.textInverse : theme.colors.primary}
        style={{ textDecorationLine: "underline" }}
        onPress={() => void Linking.openURL(url).catch(() => undefined)}
      >
        {label}
      </Txt>
    ) : (
      label
    );
  const licence = sample.licence;
  const parts: Record<string, ReactNode> = {
    author: link(sample.author, sample.sourceUrl),
    licence: (
      <>
        {link(licence, licenceUrl(licence))}
        {licence.includes("4.0") ? ` (${t("resized")})` : ""}
      </>
    ),
  };
  const pieces = t("sampleCredit").split(/\{(\w+)\}/);
  return (
    <Txt variant="caption" inverse={inverse} muted testID={`sample-credit-${sample.id}`}>
      {pieces.map((piece, i) => (
        <Fragment key={i}>{i % 2 === 1 ? (parts[piece] ?? piece) : piece}</Fragment>
      ))}
    </Txt>
  );
}
