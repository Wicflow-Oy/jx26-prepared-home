// Public surface of the Prepared Home feature. Another app can mount the provider and these screens.
export { PreparedHomeProvider, usePreparedHome, useTheme, makePaths } from "./context";
export type { PreparedHomeProviderProps, Paths } from "./context";
export { ifTheme } from "./theme";
export type { Theme } from "./theme";
export { createApi } from "./api";
export { defaultApiBaseUrl } from "./config";

export { StartScreen } from "./screens/StartScreen";
export { NewHomeScreen } from "./screens/NewHomeScreen";
export { HomeScreen } from "./screens/HomeScreen";
export { CheckScreen } from "./screens/CheckScreen";
export { ResultScreen } from "./screens/ResultScreen";
export { StatusScreen } from "./screens/StatusScreen";
export { HomeCardScreen } from "./screens/HomeCardScreen";
export { RemindersScreen } from "./screens/RemindersScreen";
export { ClaimScreen } from "./screens/ClaimScreen";
export { AdjusterScreen } from "./screens/AdjusterScreen";
export { SettingsScreen } from "./screens/SettingsScreen";
export { NotFoundScreen } from "./screens/NotFoundScreen";
