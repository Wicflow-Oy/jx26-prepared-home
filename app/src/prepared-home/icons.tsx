// Simple 24 px line icons, drawn for this app.
import type { Peril } from "@prepared-home/engine";
import Svg, { Circle, Path, Rect } from "react-native-svg";

const PATHS = {
  chevronLeft: <Path d="M14.5 18l-6-6 6-6" />,
  chevronRight: <Path d="M9.5 6l6 6-6 6" />,
  close: <Path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />,
  flash: <Path d="M13.6 2.5L5 13.6h5.9L9.8 21.5l9.2-11.6h-6z" />,
  check: <Path d="M5 12.5l4.5 4.5L19 7.5" />,
  drop: <Path d="M12 3.5c2.9 3.5 6 6.8 6 10.4a6 6 0 0 1-12 0c0-3.6 3.1-6.9 6-10.4z" />,
  flame: (
    <>
      <Path d="M12 21a6 6 0 0 0 6-6c0-4.2-3.2-6.6-4.6-10-.6 2.6-2 4.2-3.4 5.2-.9-.8-1.4-1.9-1.5-3C6.8 9.3 6 11.9 6 15a6 6 0 0 0 6 6z" />
      <Path d="M12 21a2.5 2.5 0 0 0 2.5-2.5c0-1.7-1.3-2.6-2.5-4-1.2 1.4-2.5 2.3-2.5 4A2.5 2.5 0 0 0 12 21z" />
    </>
  ),
  snow: (
    <Path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9M9.5 4.5L12 7l2.5-2.5M9.5 19.5L12 17l2.5 2.5" />
  ),
  rain: (
    <>
      <Path d="M7 15.5a4 4 0 0 1-.4-8 5.5 5.5 0 0 1 10.6 1.5 3.3 3.3 0 0 1-.2 6.5z" />
      <Path d="M9 18.5l-1 2M13 18.5l-1 2M17 18.5l-1 2" />
    </>
  ),
  clock: (
    <>
      <Circle cx="12" cy="12" r="8.5" />
      <Path d="M12 7.5V12l3 2" />
    </>
  ),
  lock: (
    <>
      <Rect x="5" y="10.5" width="14" height="10" rx="2" />
      <Path d="M8 10.5V8a4 4 0 0 1 8 0v2.5M12 14.5v2" />
    </>
  ),
  doc: <Path d="M7 3.5h6.5l4 4v13H7zM13.5 3.5v4h4M9.8 12.5h5M9.8 16h5" />,
  bell: <Path d="M6.5 16v-5a5.5 5.5 0 0 1 11 0v5l1.5 2h-14zM10 20.5a2 2 0 0 0 4 0" />,
  calendar: (
    <>
      <Rect x="4" y="5.5" width="16" height="15" rx="2" />
      <Path d="M4 10h16M8.5 3.5v4M15.5 3.5v4" />
    </>
  ),
  tool: (
    <Path d="M14.7 6.3a4 4 0 0 0 5 5l-8.4 8.4a2.1 2.1 0 0 1-3-3L16.7 8.3a4 4 0 0 1-2-2zM14.7 6.3l2.6-2.6a4 4 0 0 1 2.4 7.6" />
  ),
  home: <Path d="M4 11l8-6.5 8 6.5v9H4zM10 20v-5h4v5" />,
  building: <Path d="M5 20.5V4.5h10v16M15 9.5h4v11M3.5 20.5h17M8 8h4M8 11.5h4M8 15h4" />,
  cabin: <Path d="M3.5 11.5L12 4l8.5 7.5M6 10v10.5h12V10M10 20.5v-5h4v5M16 6.3V4.5h2v3.6" />,
  camera: (
    <>
      <Rect x="3" y="7" width="18" height="13" rx="2" />
      <Path d="M8.5 7L10 4.5h4L15.5 7" />
      <Circle cx="12" cy="13.5" r="3.5" />
    </>
  ),
  image: (
    <>
      <Rect x="3.5" y="4.5" width="17" height="15" rx="2" />
      <Circle cx="9" cy="10" r="1.8" />
      <Path d="M20.5 16l-5-5-8.5 8.5" />
    </>
  ),
  sliders: <Path d="M4 7h9M17 7h3M4 17h3M11 17h9M15 5v4M9 15v4" />,
  alert: <Path d="M12 4l9 16H3zM12 10v4.5M12 17.3v.2" />,
  card: (
    <>
      <Rect x="3.5" y="5.5" width="17" height="13" rx="2" />
      <Path d="M7 10h6M7 14h10" />
    </>
  ),
  claim: <Path d="M6 3.5h12v17l-3-2-3 2-3-2-3 2zM9 8.5h6M9 12h6" />,
};

export type IconName = keyof typeof PATHS;

export function Icon({
  name,
  size = 24,
  color,
  strokeWidth = 1.5,
}: {
  name: IconName;
  size?: number;
  color: string;
  strokeWidth?: number;
}) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {PATHS[name]}
    </Svg>
  );
}

export const PERIL_ICON: Record<Peril, IconName> = {
  leak: "drop",
  fire: "flame",
  freeze: "snow",
  storm_water: "rain",
};
