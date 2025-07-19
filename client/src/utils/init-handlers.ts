// Global initialization handlers for preventing runtime errors

import { safeExecute, safeCall } from './null-safe';

// Initialize global error handlers
export function initializeGlobalErrorHandlers() {
  if (typeof window === 'undefined') {return;}

  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    console.warn('Unhandled promise rejection:', event.reason);

    // Log to monitoring service if available
    if ((window as any).monitoringService) {
      safeCall((window as any).monitoringService.recordError, undefined, {
        type: 'unhandledRejection',
        reason: event.reason,
        promise: event.promise,
      });
    }

    // Prevent default browser behavior
    event.preventDefault();
  });

  // Handle uncaught errors
  window.addEventListener('error', (event) => {
    console.warn('Uncaught error:', event.error);

    // Log to monitoring service if available
    if ((window as any).monitoringService) {
      safeCall((window as any).monitoringService.recordError, undefined, {
        type: 'uncaughtError',
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error,
      });
    }
  });

  // Handle React errors (if React DevTools is available)
  if ((window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__) {
    try {
      const hook = (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__;
      if (hook.onCommitFiberRoot) {
        const originalOnCommitFiberRoot = hook.onCommitFiberRoot;
        hook.onCommitFiberRoot = function(...args: any[]) {
          try {
            return originalOnCommitFiberRoot.apply(this, args);
          } catch (error) {
            console.warn('React DevTools error:', error);
          }
        };
      }
    } catch (error) {
      console.warn('Failed to patch React DevTools:', error);
    }
  }
}

// Initialize performance monitoring
export function initializePerformanceMonitoring() {
  if (typeof window === 'undefined') {return;}

  // Monitor long tasks
  if ('PerformanceObserver' in window) {
    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (entry.duration > 50) { // Tasks longer than 50ms
            console.warn(`Long task detected: ${entry.duration}ms`);
          }
        });
      });
      observer.observe({ entryTypes: ['longtask'] });
    } catch (error) {
      console.warn('Performance monitoring failed:', error);
    }
  }

  // Monitor memory usage
  if ('memory' in performance) {
    setInterval(() => {
      const memory = (performance as any).memory;
      if (memory.usedJSHeapSize > memory.jsHeapSizeLimit * 0.9) {
        console.warn('High memory usage detected');
      }
    }, 30000); // Check every 30 seconds
  }
}

// Initialize state cleanup
export function initializeStateCleanup() {
  if (typeof window === 'undefined') {return;}

  // Clean up state on page unload
  window.addEventListener('beforeunload', () => {
    try {
      // Clear any temporary state
      if (window.localStorage) {
        const keys = Object.keys(window.localStorage);
        keys.forEach(key => {
          if (key.startsWith('temp_') || key.startsWith('cache_')) {
            window.localStorage.removeItem(key);
          }
        });
      }

      // Clear session storage
      if (window.sessionStorage) {
        window.sessionStorage.clear();
      }
    } catch (error) {
      console.warn('State cleanup failed:', error);
    }
  });

  // Periodic cleanup
  setInterval(() => {
    try {
      // Clean up expired cache entries
      if (window.localStorage) {
        const keys = Object.keys(window.localStorage);
        keys.forEach(key => {
          if (key.startsWith('cache_')) {
            try {
              const item = JSON.parse(window.localStorage.getItem(key) || '{}');
              if (item.expires && Date.now() > item.expires) {
                window.localStorage.removeItem(key);
              }
            } catch (error) {
              // Remove corrupted cache entries
              window.localStorage.removeItem(key);
            }
          }
        });
      }
    } catch (error) {
      console.warn('Periodic cleanup failed:', error);
    }
  }, 60000); // Clean every minute
}

// Initialize all handlers
export function initializeApp() {
  safeExecute(() => {
    initializeGlobalErrorHandlers();
    initializePerformanceMonitoring();
    initializeStateCleanup();
    console.log('✅ Application initialization complete');
  }, undefined);
}

// Auto-initialize if in browser
if (typeof window !== 'undefined') {
  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
  } else {
    initializeApp();
  }
}
