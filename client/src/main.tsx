import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient';
import App from './App';
import './index.css';
import { initializeLazyLoading } from './utils/lazy-loading';
import { memoryOptimizer, registerServiceWorker } from './utils/memory-optimizer';
import { initializeCaching } from './utils/enhanced-caching';
import { initializeDemandPaging } from './utils/demand-paging';
import { initializeApp } from './utils/init-handlers';
import { safeRuntime, safeMemoryManager } from './utils/safe-runtime';
import { functionTracer } from './utils/function-tracer';

// Performance optimization: Initialize core systems immediately
initializeLazyLoading();
memoryOptimizer.initialize();
initializeCaching();
initializeDemandPaging();
initializeApp();

// Initialize safe runtime system
safeRuntime.initializeFeature(
  'core-systems',
  ['local-storage', 'session-storage'],
  () => {
    console.log('Safe runtime initialized');
  },
  () => {
    console.log('Safe runtime initialized with limited features');
  }
);

// Initialize function tracing
console.log('Function tracing initialized');

// Add trace monitoring in development
if (process.env.NODE_ENV === 'development') {
  // Log performance stats every 30 seconds
  setInterval(() => {
    const stats = functionTracer.getPerformanceStats('toast');
    if (stats.totalCalls > 0) {
      console.log('Toast Performance Stats:', stats);
    }
    
    const useToastStats = functionTracer.getPerformanceStats('useToast');
    if (useToastStats.totalCalls > 0) {
      console.log('useToast Performance Stats:', useToastStats);
    }
  }, 30000);
}

// Performance optimization: Defer non-critical operations
const deferredInit = () => {
  // Initialize service worker for aggressive caching
  registerServiceWorker();
  
  // Initialize performance monitoring
  if (process.env.NODE_ENV === 'development') {
    console.log('🚀 Advanced performance optimizations active');
  }
};

// Mount the app immediately with QueryClient
const root = createRoot(document.getElementById('root')!);
root.render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>
);

// Run deferred initialization after app mount
setTimeout(deferredInit, 100);