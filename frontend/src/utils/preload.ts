// Preloading utilities for better performance
export const preloadCriticalResources = () => {
  // Preload authentication check
  const authLink = document.createElement('link');
  authLink.rel = 'preload';
  authLink.href = '/api/auth/me';
  authLink.as = 'fetch';
  authLink.crossOrigin = 'anonymous';
  document.head.appendChild(authLink);

  // Preload dashboard data for authenticated users
  const dashboardLink = document.createElement('link');
  dashboardLink.rel = 'prefetch';
  dashboardLink.href = '/api/dashboard/stats';
  dashboardLink.as = 'fetch';
  dashboardLink.crossOrigin = 'anonymous';
  document.head.appendChild(dashboardLink);
};

// Preload route components
export const preloadRouteComponents = () => {
  // Preload common routes
  const routes = ['/dashboard', '/seller/dashboard', '/buyer/dashboard'];
  
  routes.forEach(route => {
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = route;
    document.head.appendChild(link);
  });
};

// Initialize all preloading
export const initializePreloading = () => {
  if (typeof window !== 'undefined') {
    preloadCriticalResources();
    
    // Preload route components after initial load
    setTimeout(preloadRouteComponents, 1000);
  }
};