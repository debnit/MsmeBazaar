import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";

// Polyfill __dirname for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  // Root is the frontend folder
  root: path.resolve(__dirname, "client"),

  // React plugin for JSX + Fast Refresh
  plugins: [react()],

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "client", "src"),
      "@components": path.resolve(__dirname, "client", "src", "components"),
      "@pages": path.resolve(__dirname, "client", "src", "pages"),
      "@hooks": path.resolve(__dirname, "client", "src", "hooks"),
      "@utils": path.resolve(__dirname, "client", "src", "utils"),
      "@shared": path.resolve(__dirname, "libs", "shared", "src")
    }
  },

  define: {
    "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV || "development"),
    "import.meta.env.VITE_API_URL": JSON.stringify(process.env.VITE_API_URL || "")
  },

  build: {
    outDir: path.resolve(__dirname, "dist"),
    emptyOutDir: true,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          "react-vendor": ["react", "react-dom"],
          "data-vendor": ["@tanstack/react-query", "axios"],
          "form-vendor": ["react-hook-form", "@hookform/resolvers", "zod"]
        }
      }
    }
  },

  server: {
    port: 5173,
    open: true,
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true
      }
    }
  }
});
