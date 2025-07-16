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
import { markSweepManager } from './utils/mark-sweep-memory';
import MemoryManager from './utils/memory-manager';

// Performance optimization: Initialize core systems immediately
initializeLazyLoading();
memoryOptimizer.initialize();
initializeCaching();
initializeDemandPaging();
initializeApp();

// Initialize memory management systems
MemoryManager.initialize();
markSweepManager.performMarkAndSweep();

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