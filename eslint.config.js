import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  // app/ uses Expo's own lint config (npx expo lint).
  { ignores: ["**/node_modules/**", "**/dist/**", "release/**", "landing/.screens/**", "app/**"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  { languageOptions: { globals: { ...globals.node } } },
  { files: ["landing/**/*.js"], languageOptions: { globals: { ...globals.browser } } },
);
