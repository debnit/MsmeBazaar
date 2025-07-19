// Client-side lazy loading with demand paging for optimal memory management
import { lazy } from 'react';
import { loadComponentWithPaging } from './demand-paging';

// Lazy load non-critical components with demand paging
export const LazyAdminDashboard = lazy(() => loadComponentWithPaging('../pages/admin/dashboard', 'medium'));
export const LazyAnalytics = lazy(() => loadComponentWithPaging('../pages/analytics', 'medium'));

// Enhanced component preloading with memory management
export const preloadComponents = () => {
  // Use requestIdleCallback for better performance
  if ('requestIdleCallback' in window) {
    requestIdleCallback(async () => {
      try {
        // Preload components during idle time with proper error handling
        await Promise.allSettled([
          loadComponentWithPaging('../pages/admin/dashboard', 'low'),
          loadComponentWithPaging('../pages/analytics', 'low'),
        ]);
      } catch (error) {
        console.warn('Component preloading failed:', error);
      }
    });
  } else {
    // Fallback for browsers without requestIdleCallback
    setTimeout(async () => {
      try {
        await Promise.allSettled([
          loadComponentWithPaging('../pages/admin/dashboard', 'low'),
          loadComponentWithPaging('../pages/analytics', 'low'),
        ]);
      } catch (error) {
        console.warn('Component preloading failed:', error);
      }
    }, 2000);
  }
};

// Initialize lazy loading with demand paging
export const initializeLazyLoading = () => {
  // Preload critical components after initial render
  setTimeout(preloadComponents, 1000);

  console.log('Lazy loading initialized with demand paging - optimal memory management active');
};
