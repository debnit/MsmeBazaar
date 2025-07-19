// Client-side lazy loading for deferred components
import { lazy, Suspense, ReactNode } from 'react';

// Lazy load non-critical components
export const LazyAdminDashboard = lazy(() => import('../pages/admin/dashboard'));
export const LazyAnalytics = lazy(() => import('../pages/analytics'));

// Loading component for better UX
export const LoadingSpinner = (): JSX.Element => {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      <span className="ml-3 text-gray-600">Loading...</span>
    </div>
  );
};

// Lazy wrapper component
export const LazyComponent = ({ children }: { children: ReactNode }): JSX.Element => {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      {children}
    </Suspense>
  );
};

// Preload components when system is idle
export const preloadComponents = (): void => {
  // Use requestIdleCallback for better performance
  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(() => {
      // Preload components during idle time - these return promises
      LazyAdminDashboard();
      LazyAnalytics();
    });
  } else {
    // Fallback for browsers without requestIdleCallback
    setTimeout(() => {
      LazyAdminDashboard();
      LazyAnalytics();
    }, 2000);
  }
};

// Initialize lazy loading
export const initializeLazyLoading = (): void => {
  // Preload critical components after initial render
  setTimeout(preloadComponents, 1000);
  
  console.log('Lazy loading initialized - non-critical components deferred');
};