// Route debugging and diagnostics system
interface RouteInfo {
  path: string;
  component: string;
  loadTime: number;
  errors: string[];
  timestamp: number;
}

class RouteDebugger {
  private routeHistory: RouteInfo[] = [];
  private currentRoute: string = '';
  private isProduction = process.env.NODE_ENV === 'production';
  
  constructor() {
    this.initializeRouteTracking();
  }
  
  private initializeRouteTracking() {
    // Track initial route
    this.trackRoute(window.location.pathname, 'Initial Load');
    
    // Track route changes
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;
    
    history.pushState = (...args) => {
      originalPushState.apply(history, args);
      this.trackRoute(window.location.pathname, 'Push State');
    };
    
    history.replaceState = (...args) => {
      originalReplaceState.apply(history, args);
      this.trackRoute(window.location.pathname, 'Replace State');
    };
    
    // Track back/forward navigation
    window.addEventListener('popstate', () => {
      this.trackRoute(window.location.pathname, 'Pop State');
    });
  }
  
  private trackRoute(path: string, component: string) {
    const startTime = performance.now();
    
    // Clean up old entries (keep last 50)
    if (this.routeHistory.length > 50) {
      this.routeHistory = this.routeHistory.slice(-25);
    }
    
    const routeInfo: RouteInfo = {
      path,
      component,
      loadTime: 0,
      errors: [],
      timestamp: Date.now()
    };
    
    this.routeHistory.push(routeInfo);
    this.currentRoute = path;
    
    // Measure load time
    requestAnimationFrame(() => {
      routeInfo.loadTime = performance.now() - startTime;
    });
    
    // Log in development
    if (!this.isProduction) {
      console.log(`🛣️ Route changed: ${path} (${component})`);
    }
  }
  
  trackError(error: string) {
    const currentRouteInfo = this.routeHistory[this.routeHistory.length - 1];
    if (currentRouteInfo) {
      currentRouteInfo.errors.push(error);
    }
    
    console.error(`❌ Route error on ${this.currentRoute}:`, error);
  }
  
  getRouteHistory() {
    return [...this.routeHistory];
  }
  
  getCurrentRoute() {
    return this.currentRoute;
  }
  
  getRouteStats() {
    const stats = {
      totalRoutes: this.routeHistory.length,
      averageLoadTime: 0,
      errorCount: 0,
      mostVisited: {} as Record<string, number>,
      recentErrors: [] as string[]
    };
    
    let totalLoadTime = 0;
    
    this.routeHistory.forEach(route => {
      totalLoadTime += route.loadTime;
      stats.errorCount += route.errors.length;
      stats.mostVisited[route.path] = (stats.mostVisited[route.path] || 0) + 1;
      stats.recentErrors.push(...route.errors);
    });
    
    stats.averageLoadTime = totalLoadTime / this.routeHistory.length;
    stats.recentErrors = stats.recentErrors.slice(-10); // Last 10 errors
    
    return stats;
  }
  
  // Check if current route should be accessible
  validateCurrentRoute() {
    const path = window.location.pathname;
    const validRoutes = [
      '/',
      '/landing',
      '/auth',
      '/login',
      '/register',
      '/dashboard',
      '/admin',
      '/seller/dashboard',
      '/seller/listing-form',
      '/buyer/dashboard',
      '/buyer/browse',
      '/agent/dashboard',
      '/nbfc/dashboard',
      '/nbfc/loan-applications',
      '/vaas-demo'
    ];
    
    const isValidRoute = validRoutes.some(route => 
      path === route || path.startsWith(route + '/')
    );
    
    if (!isValidRoute) {
      console.warn(`⚠️ Potentially invalid route: ${path}`);
      this.trackError(`Invalid route: ${path}`);
    }
    
    return isValidRoute;
  }
  
  // Diagnose routing issues
  diagnoseRoutingIssues() {
    const diagnosis = {
      currentRoute: this.currentRoute,
      isValidRoute: this.validateCurrentRoute(),
      recentErrors: this.getRouteStats().recentErrors,
      recommendations: [] as string[]
    };
    
    // Check for common issues
    if (this.currentRoute === '/' && this.routeHistory.length > 1) {
      const lastRoute = this.routeHistory[this.routeHistory.length - 2];
      if (lastRoute.path !== '/') {
        diagnosis.recommendations.push('User was redirected to homepage - check authentication');
      }
    }
    
    if (diagnosis.recentErrors.length > 0) {
      diagnosis.recommendations.push('Recent errors detected - check console for details');
    }
    
    const stats = this.getRouteStats();
    if (stats.averageLoadTime > 2000) {
      diagnosis.recommendations.push('Slow route loading detected - optimize lazy loading');
    }
    
    return diagnosis;
  }
  
  // Export debugging data for support
  exportDebugData() {
    return {
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      routeHistory: this.routeHistory,
      stats: this.getRouteStats(),
      diagnosis: this.diagnoseRoutingIssues()
    };
  }
}

export const routeDebugger = new RouteDebugger();

// Global error handler for routing issues
window.addEventListener('error', (event) => {
  if (event.filename?.includes('chunk') || event.message?.includes('Loading')) {
    routeDebugger.trackError(`Chunk loading error: ${event.message}`);
  }
});

// Unhandled promise rejections (often from lazy loading)
window.addEventListener('unhandledrejection', (event) => {
  if (event.reason?.message?.includes('Loading')) {
    routeDebugger.trackError(`Promise rejection: ${event.reason.message}`);
  }
});

// Make debugger available globally in development
if (process.env.NODE_ENV !== 'production') {
  (window as any).routeDebugger = routeDebugger;
}

// Initialize route validation
export function initializeRouteDebugging() {
  console.log('🔍 Route debugging system initialized');
  
  // Validate current route on load
  routeDebugger.validateCurrentRoute();
  
  // Periodic health check
  setInterval(() => {
    const diagnosis = routeDebugger.diagnoseRoutingIssues();
    if (diagnosis.recommendations.length > 0) {
      console.warn('🚨 Route health check:', diagnosis);
    }
  }, 30000); // Every 30 seconds
}

// Export debug data for support
export function getRouteDebugInfo() {
  return routeDebugger.exportDebugData();
}