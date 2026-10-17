// Visual tokens for Prepared Home, taken from If's public design tokens: sand pages, brown text,
// blue for actions, progress and the camera screen.
// Screens read tokens only through useTheme(), so the look can be swapped without touching them.
import { Platform } from "react-native";

export interface Theme {
  colors: {
    background: string; // page sand
    backgroundAlt: string; // section sand
    sand: string; // deeper sand for chips and inset blocks
    surface: string; // cards
    dark: string; // the camera screen and other dark surfaces
    viewfinder: string;
    text: string;
    textMuted: string;
    textInverse: string;
    textInverseMuted: string;
    primary: string;
    primaryPressed: string;
    primaryTint: string;
    primaryTintStrong: string;
    primaryText: string;
    success: string;
    successBg: string;
    warning: string;
    warningBg: string;
    warningMark: string;
    danger: string;
    dangerBg: string;
    info: string;
    infoBg: string;
    line: string; // soft dividers
    border: string;
    borderStrong: string;
    scrim: string;
  };
  space: { xxs: number; xs: number; sm: number; md: number; lg: number; xl: number; xxl: number };
  radius: { sm: number; button: number; card: number; sheet: number; pill: number };
  font: {
    family: string | undefined;
    size: {
      caption: number;
      small: number;
      body: number;
      lead: number;
      h2: number;
      title: number;
      display: number;
    };
    lineHeight: {
      caption: number;
      small: number;
      body: number;
      lead: number;
      h2: number;
      title: number;
      display: number;
    };
    weight: { light: "300"; regular: "400"; bold: "600" };
  };
  shadow: { card: string };
  layout: { maxContentWidth: number; maxWideWidth: number; tapTarget: number; button: number };
}

export const ifTheme: Theme = {
  colors: {
    background: "#FAF9F7",
    backgroundAlt: "#F6F3F0",
    sand: "#F1ECE8",
    surface: "#FFFFFF",
    dark: "#1241A2",
    viewfinder: "rgba(225, 233, 246, 0.14)",
    text: "#331E11",
    textMuted: "#6E625E",
    textInverse: "#FAF9F7",
    textInverseMuted: "#A8C2F0",
    primary: "#0054F0",
    primaryPressed: "#1241A2",
    primaryTint: "#E1E9F6",
    primaryTintStrong: "#A8C2F0",
    primaryText: "#FAF9F7",
    success: "#217331",
    successBg: "#E0F0DB",
    warning: "#6B4600",
    warningBg: "#F9EBC7",
    warningMark: "#B9821F",
    danger: "#BB320C",
    dangerBg: "#F9E3D4",
    info: "#1241A2",
    infoBg: "#E1E9F6",
    line: "#E8E0D9",
    border: "#6E625E",
    borderStrong: "#331E11",
    scrim: "rgba(18, 65, 162, 0.32)",
  },
  space: { xxs: 2, xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 },
  radius: { sm: 4, button: 6, card: 12, sheet: 24, pill: 999 },
  font: {
    // If's own typeface is proprietary and not loaded; the web falls back like if.fi does.
    family: Platform.OS === "web" ? '"If Sans Variable", "Segoe UI", Arial, sans-serif' : undefined,
    size: { caption: 12, small: 14, body: 16, lead: 20, h2: 24, title: 28, display: 32 },
    lineHeight: { caption: 16, small: 20, body: 24, lead: 28, h2: 32, title: 36, display: 40 },
    weight: { light: "300", regular: "400", bold: "600" },
  },
  shadow: {
    card: "0px 1px 2px rgba(51, 30, 17, 0.05), 0px 12px 32px -12px rgba(51, 30, 17, 0.16)",
  },
  layout: { maxContentWidth: 560, maxWideWidth: 1040, tapTarget: 44, button: 48 },
};
