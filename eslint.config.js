// Lint rules: ESLint's recommended set, typescript-eslint's, and the React hooks rules
// (hooks called in a fixed order; effects that miss a dependency and read stale state). Accessibility is checked on the rendered
// screens by axe (docs/audits/axe-run.cjs), not here.
import js from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist", "dev-dist", "docs/audits", ".checks", "storybook-static"] },
  {
    files: ["src/**/*.{ts,tsx}", "tests/**/*.ts"],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    plugins: { "react-hooks": reactHooks },
    languageOptions: { globals: globals.browser },
    // The two long-standing hooks rules. The plugin's newer React Compiler rules are left off:
    // they flag 70+ working patterns in src/ui and would mean a UI rewrite, not a lint fix.
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      // `const { id: _drop, ...rest } = c` is how the code leaves a field out of a copy.
      "@typescript-eslint/no-unused-vars": ["error", { ignoreRestSiblings: true }],
    },
  },
  {
    files: ["**/*.{js,mjs,cjs}"],
    extends: [js.configs.recommended],
    languageOptions: { globals: globals.node },
  },
  // Browser checks run in Node but pass functions into the page (page.evaluate), which use browser globals.
  {
    files: ["e2e/**/*.cjs", "docs/audits/axe-run.cjs"],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
  },
);
