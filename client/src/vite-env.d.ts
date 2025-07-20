/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_APP_TITLE: string;
  readonly VITE_RAZORPAY_KEY_ID: string;
  readonly VITE_GOOGLE_MAPS_API_KEY: string;
  readonly VITE_SENTRY_DSN: string;
  readonly VITE_ENVIRONMENT: 'development' | 'staging' | 'production';
  readonly VITE_ENABLE_ANALYTICS: string;
  readonly VITE_WEBSOCKET_URL: string;
  // Add other environment variables as needed
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Global type augmentations
declare global {
  interface Window {
    // Add any global window properties here
    gtag?: (...args: any[]) => void;
    Razorpay?: any;
  }
}

export {};