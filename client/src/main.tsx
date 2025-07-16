import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import { initializeLazyLoading } from './utils/lazy-loading';

// Performance optimization: Initialize lazy loading
initializeLazyLoading();

// Performance optimization: Defer non-critical operations
const deferredInit = () => {
  // Initialize service worker for caching
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js')
      .then(() => console.log('Service Worker registered'))
      .catch(err => console.log('Service Worker registration failed'));
  }
  
  // Initialize performance monitoring
  if (process.env.NODE_ENV === 'development') {
    console.log('🚀 Client-side performance optimizations active');
  }
};

// Mount the app immediately
const root = createRoot(document.getElementById('root')!);
root.render(
  <StrictMode>
    <App />
  </StrictMode>
);

// Run deferred initialization after app mount
setTimeout(deferredInit, 100);