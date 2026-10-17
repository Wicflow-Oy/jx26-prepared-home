import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  // server/ and app/ join at integration.
  { ignores: ["**/node_modules/**", "**/dist/**", "release/**", "server/**", "app/**"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  { languageOptions: { globals: { ...globals.node } } },
);
