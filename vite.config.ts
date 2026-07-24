import ultraciteOxfmt from "ultracite/oxfmt";
import ultraciteCore from "ultracite/oxlint/core";
import ultraciteReact from "ultracite/oxlint/react";
import ultraciteTanstack from "ultracite/oxlint/tanstack";
import ultraciteVitest from "ultracite/oxlint/vitest";

import { defineConfig } from "vite-plus";

export default defineConfig({
  fmt: {
    extends: [ultraciteOxfmt],
    ignorePatterns: [
      "node_modules/**",
      "**/node_modules/**",
      "**/dist/**",
      "**/.vinxi/**",
      "**/.tanstack/**",
      "**/src/routeTree.gen.ts",
      "packages/db/src/schema/auth.ts",
      "packages/db/src/migrations",
    ],
  },
  lint: {
    extends: [ultraciteCore, ultraciteReact, ultraciteTanstack, ultraciteVitest],
    ignorePatterns: [
      ...(ultraciteCore.ignorePatterns ?? []),
      "node_modules/**",
      "**/node_modules/**",
      "**/dist/**",
      "**/.vinxi/**",
      "**/.tanstack/**",
      "**/src/routeTree.gen.ts",
      "packages/db/src/schema/auth.ts",
      "packages/db/src/migrations",
    ],
    options: {
      typeAware: true,
      typeCheck: false,
    },
    rules: {
      "func-style": ["error", "declaration"],
      "no-use-before-define": [
        "error",
        {
          functions: false,
        },
      ],
    },
  },
  staged: {
    "*.{js,ts,jsx,tsx,vue,svelte,json,jsonc,css,md}": "vp check --fix",
  },
  test: {
    environment: "node",
    exclude: ["**/node_modules/**", "**/dist/**", "**/.vinxi/**", "**/.tanstack/**"],
    include: [
      "apps/**/__test__/**/*.{test,spec}.{ts,tsx}",
      "packages/**/__test__/**/*.{test,spec}.{ts,tsx}",
    ],
  },
});
