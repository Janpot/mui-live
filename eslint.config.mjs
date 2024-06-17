import eslintPluginReactHooks from "eslint-plugin-react-hooks";
import { fixupPluginRules } from "@eslint/compat";
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactRefresh from "eslint-plugin-react-refresh";

export default /**  @type {import('eslint').Linter.FlatConfig} */ ([
  {
    ignores: ["**/dist/*"],
  },
  js.configs.recommended,
  // ...tseslint.configs.eslintRecommended,
  ...tseslint.configs.recommended,
  // ...tseslint.configs.stylistic,
  {
    files: ["**/*.ts", "**/*.tsx"],
    plugins: {
      "react-hooks": fixupPluginRules(eslintPluginReactHooks),
    },
    rules: {
      ...eslintPluginReactHooks.configs.recommended.rules,
    },
  },
  {
    files: ["./packages/playground-vite/**/*"],
    plugins: {
      "react-refresh": reactRefresh,
    },
    rules: {
      "react-refresh/only-export-components": "warn",
    },
  },
]);
