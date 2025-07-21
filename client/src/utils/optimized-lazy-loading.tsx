// Optimized lazy loading system with intelligent preloading
import React, { lazy, Suspense, ComponentType, Component, ErrorInfo, ReactNode } from 'react';

// Simple Error Boundary implementation
interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class SimpleErrorBoundary extends Component<
  { children: ReactNode; componentName?: string; onError?: (error: Error) => void },
  ErrorBoundaryState
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`Error loading ${this.props.componentName}:`, error, errorInfo);
    this.props.onError?.(error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[200px] flex flex-col items-center justify-center space-y-4 p-6">
          <div className="text-red-600 text-center">
            <h3 className="text-lg font-semibold mb-2">Failed to load {this.props.componentName || 'Component'}</h3>
            <p className="text-sm text-gray-600 mb-4">{this.state.error?.message}</p>
            <button
              onClick={() => this.setState({ hasError: false, error: undefined })}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Loading component with better UX
const LoadingFallback = ({ componentName = "Component" }: { componentName?: string }) => (
  <div className="min-h-[200px] flex flex-col items-center justify-center space-y-4">
    <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent"></div>
    <p className="text-sm text-gray-600">Loading {componentName}...</p>
  </div>
);

// Enhanced lazy loading wrapper with error boundaries
export function createLazyComponent<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  componentName: string,
  preload: boolean = false
) {
  const LazyComponent = lazy(importFn);
  
  // Preload if requested
  if (preload) {
    setTimeout(() => {
      importFn().catch(() => {
        // Silently handle preload failures
      });
    }, 100);
  }
  
  return function LazyWrapper(props: any) {
    return (
      <SimpleErrorBoundary 
        componentName={componentName}
        onError={(error) => console.error(`Error loading ${componentName}:`, error)}
      >
        <Suspense fallback={<LoadingFallback componentName={componentName} />}>
          <LazyComponent {...props} />
        </Suspense>
      </SimpleErrorBoundary>
    );
  };
}

// Optimized component imports with intelligent preloading
export const LazyDashboard = createLazyComponent(
  () => import('../pages/dashboard'),
  'Dashboard',
  true // Preload dashboard as it's commonly accessed
);

export const LazyAdminDashboard = createLazyComponent(
  () => import('../pages/admin/dashboard'),
  'Admin Dashboard'
);

export const LazySellerDashboard = createLazyComponent(
  () => import('../pages/seller/dashboard'),
  'Seller Dashboard'
);

export const LazyBuyerDashboard = createLazyComponent(
  () => import('../pages/buyer/dashboard'),
  'Buyer Dashboard'
);

export const LazyAgentDashboard = createLazyComponent(
  () => import('../pages/agent/dashboard'),
  'Agent Dashboard'
);

export const LazyNbfcDashboard = createLazyComponent(
  () => import('../pages/nbfc/dashboard'),
  'NBFC Dashboard'
);

export const LazyValuationPage = createLazyComponent(
  () => import('../pages/vaas-demo'),
  'Valuation Service'
);

// Intelligent preloading based on user behavior
class IntelligentPreloader {
  private preloadedComponents = new Set<string>();
  private userInteractions = new Map<string, number>();
  
  trackInteraction(componentName: string) {
    const current = this.userInteractions.get(componentName) || 0;
    this.userInteractions.set(componentName, current + 1);
    
    // Preload frequently accessed components
    if (current >= 2 && !this.preloadedComponents.has(componentName)) {
      this.preloadComponent(componentName);
    }
  }
  
  private async preloadComponent(componentName: string) {
    if (this.preloadedComponents.has(componentName)) return;
    
    try {
      switch (componentName) {
        case 'dashboard':
          await import('../pages/dashboard');
          break;
        case 'admin-dashboard':
          await import('../pages/admin/dashboard');
          break;
        case 'seller-dashboard':
          await import('../pages/seller/dashboard');
          break;
        case 'buyer-dashboard':
          await import('../pages/buyer/dashboard');
          break;
        case 'agent-dashboard':
          await import('../pages/agent/dashboard');
          break;
        case 'nbfc-dashboard':
          await import('../pages/nbfc/dashboard');
          break;
      }
      
      this.preloadedComponents.add(componentName);
      console.log(`✅ Preloaded ${componentName}`);
    } catch (error) {
      console.warn(`⚠️ Failed to preload ${componentName}:`, error);
    }
  }
  
  // Preload based on user role
  preloadForUserRole(role: string) {
    const rolePreloads = {
      admin: ['dashboard', 'admin-dashboard'],
      seller: ['dashboard', 'seller-dashboard'],
      buyer: ['dashboard', 'buyer-dashboard'],
      agent: ['dashboard', 'agent-dashboard'],
      nbfc: ['dashboard', 'nbfc-dashboard']
    };
    
    const componentsToPreload = rolePreloads[role as keyof typeof rolePreloads] || ['dashboard'];
    
    // Stagger preloading to avoid blocking
    componentsToPreload.forEach((component, index) => {
      setTimeout(() => {
        this.preloadComponent(component);
      }, index * 500);
    });
  }
  
  // Preload based on route patterns
  preloadForRoute(currentRoute: string) {
    if (currentRoute.includes('/admin')) {
      this.preloadComponent('admin-dashboard');
    } else if (currentRoute.includes('/seller')) {
      this.preloadComponent('seller-dashboard');
    } else if (currentRoute.includes('/buyer')) {
      this.preloadComponent('buyer-dashboard');
    } else if (currentRoute.includes('/agent')) {
      this.preloadComponent('agent-dashboard');
    } else if (currentRoute.includes('/nbfc')) {
      this.preloadComponent('nbfc-dashboard');
    }
  }
}

export const intelligentPreloader = new IntelligentPreloader();

// Initialize optimized lazy loading
export function initializeOptimizedLazyLoading() {
  console.log('🚀 Optimized lazy loading system initialized');
  
  // Preload critical components after initial load
  if ('requestIdleCallback' in window) {
    requestIdleCallback(() => {
      intelligentPreloader.preloadComponent('dashboard');
    });
  } else {
    setTimeout(() => {
      intelligentPreloader.preloadComponent('dashboard');
    }, 1000);
  }
  
  // Track route changes for intelligent preloading
  let currentRoute = window.location.pathname;
  const observer = new MutationObserver(() => {
    if (window.location.pathname !== currentRoute) {
      currentRoute = window.location.pathname;
      intelligentPreloader.preloadForRoute(currentRoute);
    }
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
  
  // Cleanup on page unload
  window.addEventListener('beforeunload', () => {
    observer.disconnect();
  });
}

// Performance monitoring for lazy loading
export function monitorLazyLoadingPerformance() {
  if ('PerformanceObserver' in window) {
    const performanceObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'navigation') {
          const navEntry = entry as PerformanceNavigationTiming;
          console.log('📊 Page load performance:', {
            domContentLoaded: navEntry.domContentLoadedEventEnd - navEntry.domContentLoadedEventStart,
            loadComplete: navEntry.loadEventEnd - navEntry.loadEventStart,
            totalTime: navEntry.loadEventEnd - navEntry.fetchStart
          });
        }
      }
    });
    
    try {
      performanceObserver.observe({ entryTypes: ['navigation'] });
    } catch (error) {
      console.warn('Performance monitoring not available:', error);
    }
  }
}