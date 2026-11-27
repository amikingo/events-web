import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  // cheche-ui: vendored library code (kept in sync with the library) — the React Compiler lint rules below don't apply to it.
  {
    files: ["**/components/ui/**", "**/lib/use-*.ts"],
    rules: { "react-hooks/refs": "off", "react-hooks/set-state-in-effect": "off", "@next/next/no-img-element": "off" },
  },
  // Bklit UI charts: vendored from the @bklit registry, kept as installed so they can be updated.
  {
    files: ["**/components/bklit/charts/**"],
    rules: { "react-hooks/refs": "off", "react-hooks/set-state-in-effect": "off", "react-hooks/exhaustive-deps": "off", "@typescript-eslint/no-unused-vars": "off" },
  },
]);

export default eslintConfig;
