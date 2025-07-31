import { defineConfig } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@shared": path.resolve(__dirname, "libs/shared"),
      "@ui": path.resolve(__dirname, "libs/shared/ui"), // design system ready
      "@assets": path.resolve(__dirname, "attached_assets"),
    },
  },
});
