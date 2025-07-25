import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

export default defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer(),
          ),
        ]
      : []),
  ],
  define: {
    // Ensure environment variables are available in production
    'import.meta.env.VITE_API_URL': JSON.stringify(process.env.VITE_API_URL || ''),
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
  },
  resolve: {
    alias: {
      // Root alias for current context
      "@": path.resolve(__dirname, "client", "src"),
      
      // Shared libraries with full monorepo support
      "@msmebazaar/ui": path.resolve(__dirname, "libs/ui/src"),
      "@msmebazaar/auth": path.resolve(__dirname, "libs/auth/src"),
      "@msmebazaar/api": path.resolve(__dirname, "libs/api/src"),
      "@msmebazaar/core": path.resolve(__dirname, "libs/core/src"),
      "@msmebazaar/hooks": path.resolve(__dirname, "libs/hooks/src"),
      "@msmebazaar/utils": path.resolve(__dirname, "libs/utils/src"),
      "@msmebazaar/db": path.resolve(__dirname, "libs/db/src"),
      "@msmebazaar/shared": path.resolve(__dirname, "libs/shared/src"),
      "@msmebazaar/analytics-engine": path.resolve(__dirname, "libs/analytics-engine/src"),
      
      // App-specific aliases
      "@msmebazaar/web": path.resolve(__dirname, "apps/web/src"),
      "@msmebazaar/mobile": path.resolve(__dirname, "apps/mobile/src"),
      
      // Legacy aliases for backward compatibility
      "@components": path.resolve(__dirname, "client", "src", "components"),
      "@pages": path.resolve(__dirname, "client", "src", "pages"),
      "@lib": path.resolve(__dirname, "client", "src", "lib"),
      "@hooks": path.resolve(__dirname, "client", "src", "hooks"),
      "@utils": path.resolve(__dirname, "client", "src", "utils"),
      "@shared": path.resolve(__dirname, "shared"),
      "@assets": path.resolve(__dirname, "attached_assets"),
      "@types": path.resolve(__dirname, "client", "src", "types"),
      "@styles": path.resolve(__dirname, "client", "src", "styles"),
      "@public": path.resolve(__dirname, "public")
    }
  },

  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    // Optimize chunk splitting for better performance
    chunkSizeWarningLimit: 1000, // 1MB limit for chunks
    rollupOptions: {
      output: {
        // Manual chunk splitting for optimal loading
        manualChunks: {
          // React ecosystem
          'react-vendor': ['react', 'react-dom'],
          
          // Radix UI components (large library)
          'radix-vendor': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-popover',
            '@radix-ui/react-tooltip',
            '@radix-ui/react-select',
            '@radix-ui/react-tabs'
          ],
          
          // Data fetching and state management
          'data-vendor': [
            '@tanstack/react-query',
            'axios'
          ],
          
          // Utility libraries
          'utils-vendor': [
            'date-fns',
            'clsx',
            'class-variance-authority'
          ],
          
          // Form and validation
          'form-vendor': [
            'react-hook-form',
            '@hookform/resolvers',
            'zod'
          ],
          
          // Stripe integration
          'stripe-vendor': [
            '@stripe/react-stripe-js',
            '@stripe/stripe-js'
          ],
          
          // MSMEBazaar shared libraries
          'msmebazaar-libs': [
            '@msmebazaar/ui',
            '@msmebazaar/auth',
            '@msmebazaar/api',
            '@msmebazaar/core',
            '@msmebazaar/hooks',
            '@msmebazaar/utils'
          ]
        },
        
        // Dynamic chunk naming for cache busting
        chunkFileNames: (chunkInfo) => {
          const facadeModuleId = chunkInfo.facadeModuleId 
            ? chunkInfo.facadeModuleId.split('/').pop()?.replace(/\.(tsx?|jsx?)$/, '') 
            : 'chunk';
          return `js/${facadeModuleId}-[hash].js`;
        },
        
        // Asset naming
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name?.split('.') || [];
          let extType = info[info.length - 1];
          
          if (/\.(mp4|webm|ogg|mp3|wav|flac|aac)(\?.*)?$/i.test(assetInfo.name || '')) {
            extType = 'media';
          } else if (/\.(png|jpe?g|gif|svg|ico|webp)(\?.*)?$/i.test(assetInfo.name || '')) {
            extType = 'img';
          } else if (/\.(woff2?|eot|ttf|otf)(\?.*)?$/i.test(assetInfo.name || '')) {
            extType = 'fonts';
          }
          
          return `${extType}/[name]-[hash][extname]`;
        }
      }
    }
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"],
      // Allow serving files from the monorepo
      allow: [
        // Allow serving from workspace root
        path.resolve(__dirname),
        // Allow serving from libs
        path.resolve(__dirname, "libs"),
        // Allow serving from apps
        path.resolve(__dirname, "apps"),
        // Allow serving from shared
        path.resolve(__dirname, "shared")
      ]
    },
  },
  // Optimize dependencies for monorepo
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      '@msmebazaar/ui',
      '@msmebazaar/auth',
      '@msmebazaar/api',
      '@msmebazaar/core',
      '@msmebazaar/hooks',
      '@msmebazaar/utils'
    ]
  }
});
