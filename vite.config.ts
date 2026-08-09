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
    overrides: [
      {
        files: ["packages/db/src/schema/**/*.{ts,tsx}"],
        rules: {
          "sort-keys": "off",
        },
      },
    ],
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
    clearMocks: true,
    env: {
      AWS_ACCESS_KEY_ID: "test-access-key",
      AWS_ENDPOINT_URL_S3: "http://localhost:9000",
      AWS_REGION: "us-east-1",
      AWS_S3_BUCKET: "uploads",
      AWS_SECRET_ACCESS_KEY: "test-secret-key",
      BETTER_AUTH_SECRET: "test-secret-that-is-at-least-32-characters",
      BETTER_AUTH_URL: "http://localhost:3000",
      CORS_ORIGIN: "http://localhost:3001,http://localhost:3002",
      DATABASE_URL: "postgresql://localhost/test",
      GOOGLE_CLIENT_ID: "test-google-client-id",
      GOOGLE_CLIENT_SECRET: "test-google-client-secret",
      MICROSOFT_CLIENT_ID: "test-client-id",
      MICROSOFT_CLIENT_SECRET: "test-client-secret",
      MICROSOFT_TENANT_ID: "organizations",
      NODE_ENV: "test",
      PORT: "3000",
    },
    environment: "node",
    exclude: ["**/node_modules/**", "**/dist/**", "**/.vinxi/**", "**/.tanstack/**"],
    include: [
      "apps/**/__test__/**/*.{test,spec}.{ts,tsx}",
      "packages/**/__test__/**/*.{test,spec}.{ts,tsx}",
    ],
    restoreMocks: true,
  },
});
