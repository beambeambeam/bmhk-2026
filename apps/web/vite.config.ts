import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite-plus";
import { execSync } from "node:child_process";

const buildDate = (() => {
  try {
    const dateStr = execSync("git show -s --format=%cd --date=short HEAD").toString().trim();
    return dateStr.replaceAll("-", "");
  } catch {
    const today = new Date();
    return `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, "0")}${String(today.getDate()).padStart(2, "0")}`;
  }
})();

export default defineConfig({
  define: {
    __BUILD_DATE__: JSON.stringify(buildDate),
  },
  plugins: [tailwindcss(), tanstackStart(), viteReact()],
  resolve: {
    tsconfigPaths: true,
  },
  server: {
    port: 3001,
  },
});
