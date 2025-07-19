// Frontend performance optimizations
import { lazy, Suspense } from 'react';

// Lazy load components
export const LazyDashboard = lazy(() => import('../pages/dashboard'));
export const LazyMSMEListings = lazy(() => import('../pages/msme-listings'));
export const LazyLoanApplications = lazy(() => import('../pages/loan-applications'));
export const LazyAnalytics = lazy(() => import('../pages/analytics'));

// Code splitting wrapper
export const LazyWrapper = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
    </div>
  }>
    {children}
  </Suspense>
);

// Performance monitoring
export class PerformanceMonitor {
  private metrics: Record<string, number> = {};

  startTiming(label: string): void {
    this.metrics[label] = performance.now();
  }

  endTiming(label: string): number {
    const start = this.metrics[label];
    if (!start) {return 0;}

    const duration = performance.now() - start;
    console.log(`Performance: ${label} took ${duration.toFixed(2)}ms`);
    return duration;
  }

  measureComponent<T extends {}>(Component: React.ComponentType<T>, name: string) {
    return (props: T) => {
      this.startTiming(name);

      // Use useEffect to measure render time
      React.useEffect(() => {
        this.endTiming(name);
      });

      return <Component {...props} />;
    };
  }
}

// Global performance monitor instance
export const performanceMonitor = new PerformanceMonitor();

// Image optimization
export const optimizeImage = (src: string, width?: number, height?: number) => {
  const params = new URLSearchParams();
  if (width) {params.append('w', width.toString());}
  if (height) {params.append('h', height.toString());}

  // Add format optimization
  params.append('f', 'webp');
  params.append('q', '85'); // Quality

  return `${src}?${params.toString()}`;
};

// Debounce utility
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  delay: number,
): ((...args: Parameters<T>) => void) => {
  let timeoutId: NodeJS.Timeout;

  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};

// Throttle utility
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  delay: number,
): ((...args: Parameters<T>) => void) => {
  let lastCall = 0;

  return (...args: Parameters<T>) => {
    const now = Date.now();
    if (now - lastCall >= delay) {
      lastCall = now;
      func(...args);
    }
  };
};

// Memoization utility
export const memoize = <T extends (...args: any[]) => any>(func: T): T => {
  const cache = new Map();

  return ((...args: Parameters<T>) => {
    const key = JSON.stringify(args);

    if (cache.has(key)) {
      return cache.get(key);
    }

    const result = func(...args);
    cache.set(key, result);
    return result;
  }) as T;
};

// Virtual scrolling helper
export const useVirtualScroll = (
  items: any[],
  itemHeight: number,
  containerHeight: number,
) => {
  const [scrollTop, setScrollTop] = React.useState(0);

  const startIndex = Math.floor(scrollTop / itemHeight);
  const endIndex = Math.min(
    startIndex + Math.ceil(containerHeight / itemHeight) + 1,
    items.length,
  );

  const visibleItems = items.slice(startIndex, endIndex);

  return {
    visibleItems,
    startIndex,
    endIndex,
    setScrollTop,
    totalHeight: items.length * itemHeight,
    offsetY: startIndex * itemHeight,
  };
};

// Web Worker utility
export const createWebWorker = (workerFunction: Function) => {
  const blob = new Blob(
    [`(${workerFunction.toString()})()`],
    { type: 'application/javascript' },
  );

  return new Worker(URL.createObjectURL(blob));
};

// Critical resource preloader
export const preloadCriticalResources = () => {
  // Preload critical CSS
  const criticalCSS = document.createElement('link');
  criticalCSS.rel = 'preload';
  criticalCSS.as = 'style';
  criticalCSS.href = '/critical.css';
  document.head.appendChild(criticalCSS);

  // Preload critical fonts
  const font = document.createElement('link');
  font.rel = 'preload';
  font.as = 'font';
  font.type = 'font/woff2';
  font.crossOrigin = 'anonymous';
  font.href = '/fonts/inter-var.woff2';
  document.head.appendChild(font);

  // Preload critical images
  const heroImage = new Image();
  heroImage.src = '/images/hero-banner.webp';

  console.log('Critical resources preloaded');
};

// Service Worker registration
export const registerServiceWorker = async () => {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('Service Worker registered:', registration);
      return registration;
    } catch (error) {
      console.error('Service Worker registration failed:', error);
    }
  }
};

// Bundle analyzer helper
export const analyzeBundleSize = () => {
  if (process.env.NODE_ENV === 'development') {
    import('webpack-bundle-analyzer').then(({ BundleAnalyzerPlugin }) => {
      console.log('Bundle analyzer available');
    });
  }
};

// Resource hints
export const addResourceHints = () => {
  // DNS prefetch for external domains
  const dnsPrefetch = document.createElement('link');
  dnsPrefetch.rel = 'dns-prefetch';
  dnsPrefetch.href = '//fonts.googleapis.com';
  document.head.appendChild(dnsPrefetch);

  // Preconnect to critical origins
  const preconnect = document.createElement('link');
  preconnect.rel = 'preconnect';
  preconnect.href = 'https://api.msmebazaar.com';
  document.head.appendChild(preconnect);

  console.log('Resource hints added');
};

// Performance observer
export const initPerformanceObserver = () => {
  if ('PerformanceObserver' in window) {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        console.log(`Performance: ${entry.name} - ${entry.duration}ms`);
      }
    });

    observer.observe({ entryTypes: ['measure', 'navigation', 'paint'] });
    return observer;
  }
};

// Initialize all performance optimizations
export const initializePerformance = () => {
  preloadCriticalResources();
  registerServiceWorker();
  addResourceHints();
  initPerformanceObserver();

  console.log('Performance optimizations initialized');
};
