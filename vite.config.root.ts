import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "client/src"),
      "@components": path.resolve(__dirname, "client/src/components"),
      "@pages": path.resolve(__dirname, "client/src/pages"),
      "@hooks": path.resolve(__dirname, "client/src/hooks"),
      "@lib": path.resolve(__dirname, "client/src/lib"),
      "@utils": path.resolve(__dirname, "client/src/utils"),
      "@shared": path.resolve(__dirname, "libs/shared/src")
    },
    extensions: [".js", ".ts", ".jsx", ".tsx", ".json"] // <— THIS FIXES .tsx RESOLUTION
  },
  root: path.resolve(__dirname, "client"),
  server: {
    port: 5173
  }
});
