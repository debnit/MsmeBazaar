import { defineConfig, mergeConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";
import baseConfig from "../vite.config"; // import root config

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) =>
  mergeConfig(baseConfig, {
    plugins: [react()],
    root: __dirname,
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "src"),
        "@components": path.resolve(__dirname, "src/components"),
        "@pages": path.resolve(__dirname, "src/pages"),
        "@lib": path.resolve(__dirname, "src/lib"),
        "@hooks": path.resolve(__dirname, "src/hooks"),
        "@utils": path.resolve(__dirname, "src/utils"),
      },
    },
    server: {
      port: 5173,
      proxy: {
        "/api": {
          target: "http://localhost:8000",
          changeOrigin: true,
        },
      },
    },
  })
);
