import { defineConfig } from "vite-plus/pack";

export default defineConfig({
  clean: true,
  deps: {
    alwaysBundle: [/@bmhk-2026\/.*/u],
  },
  entry: "./src/index.ts",
  format: "esm",
  outDir: "./dist",
});
