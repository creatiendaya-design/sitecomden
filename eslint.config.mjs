import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next. When we replace the
  // built-in list we must also re-include `.next/**`, `out/**`, `build/**`,
  // and `next-env.d.ts`, otherwise eslint walks generated Next.js output.
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "dist/**",
    "coverage/**",
    "node_modules/**",
    "next-env.d.ts",
    // Git worktrees siblings live under .worktrees/ and .claude/worktrees/.
    // Linting them duplicates every error and pulls in their .next/ output.
    ".worktrees/**",
    ".claude/worktrees/**",
    // Generated Prisma artifacts.
    "prisma/generated/**",
  ]),
  {
    // Pre-existing technical debt: the codebase has hundreds of these from
    // before strict linting was on the radar. Downgrade to warn so CI stays
    // green and the team can clean them up incrementally instead of in one
    // hostile PR. Errors are still listed in `npm run lint` output.
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "react/no-unescaped-entities": "warn",
      "@next/next/no-html-link-for-pages": "warn",
      // react-hooks v6 (React 19) ships several new checks that fire on
      // legacy but functioning patterns. Downgrade until the codebase is
      // migrated to the new idioms.
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/refs": "warn",
      "react-hooks/immutability": "warn",
      "react-hooks/static-components": "warn",
    },
  },
]);

export default eslintConfig;
