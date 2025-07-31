// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

// Resolve __dirname in ESM
const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(async () => {
  const plugins = [react(), runtimeErrorOverlay()];

  // Optional: load cartographer only in Replit dev mode
  if (process.env.NODE_ENV !== "production" && process.env.REPL_ID) {
    const { cartographer } = await import("@replit/vite-plugin-cartographer");
    plugins.push(cartographer());
  }

  return {
    plugins,
    define: {
      "import.meta.env.VITE_API_URL": JSON.stringify(process.env.VITE_API_URL || ""),
      "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV || "development"),
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "client", "src"),
        "@components": path.resolve(__dirname, "client", "src", "components"),
        "@pages": path.resolve(__dirname, "client", "src", "pages"),
        "@lib": path.resolve(__dirname, "client", "src", "lib"),
        "@hooks": path.resolve(__dirname, "client", "src", "hooks"),
        "@utils": path.resolve(__dirname, "client", "src", "utils"),
        "@shared": path.resolve(__dirname, "shared"),
        "@assets": path.resolve(__dirname, "attached_assets"),
      },
    },
    root: path.resolve(__dirname, "client"),
    build: {
      outDir: path.resolve(__dirname, "dist"),
      emptyOutDir: true,
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          manualChunks: {
            "react-vendor": ["react", "react-dom"],
            "radix-vendor": [
              "@radix-ui/react-dialog",
              "@radix-ui/react-dropdown-menu",
              "@radix-ui/react-popover",
              "@radix-ui/react-tooltip",
              "@radix-ui/react-select",
              "@radix-ui/react-tabs",
            ],
            "data-vendor": ["@tanstack/react-query", "axios"],
            "utils-vendor": ["date-fns", "clsx", "class-variance-authority"],
            "form-vendor": [
              "react-hook-form",
              "@hookform/resolvers",
              "zod",
            ],
            "stripe-vendor": [
              "@stripe/react-stripe-js",
              "@stripe/stripe-js",
            ],
          },
          chunkFileNames: `js/[name]-[hash].js`,
          assetFileNames: (assetInfo) => {
            if (/\.(mp4|webm|ogg|mp3|wav|flac|aac)$/i.test(assetInfo.name || "")) {
              return "media/[name]-[hash][extname]";
            }
            if (/\.(png|jpe?g|gif|svg|ico|webp)$/i.test(assetInfo.name || "")) {
              return "img/[name]-[hash][extname]";
            }
            if (/\.(woff2?|eot|ttf|otf)$/i.test(assetInfo.name || "")) {
              return "fonts/[name]-[hash][extname]";
            }
            return "[ext]/[name]-[hash][extname]";
          },
        },
      },
    },
    server: {
      port: 5173,
      open: true,
      fs: {
        strict: true,
        deny: ["**/.*"],
      },
      proxy: {
        "/api": {
          target: "http://localhost:8000", // backend API
          changeOrigin: true,
        },
      },
    },
  };
});
