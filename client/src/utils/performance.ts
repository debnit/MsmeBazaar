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

// Image optimization
export const OptimizedImage = ({ 
  src, 
  alt, 
  className = '', 
  width, 
  height,
  loading = 'lazy' 
}: {
  src: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  loading?: 'lazy' | 'eager';
}) => (
  <img
    src={src}
    alt={alt}
    className={className}
    width={width}
    height={height}
    loading={loading}
    decoding="async"
  />
);

import { useState, useEffect } from 'react';

// Debounce hook for search inputs
export const useDebounce = (value: string, delay: number) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

// Virtual scrolling for large lists
export const VirtualList = ({ 
  items, 
  itemHeight = 60, 
  containerHeight = 400,
  renderItem 
}: {
  items: any[];
  itemHeight?: number;
  containerHeight?: number;
  renderItem: (item: any, index: number) => React.ReactNode;
}) => {
  const [scrollTop, setScrollTop] = useState(0);
  const [containerRef, setContainerRef] = useState<HTMLDivElement | null>(null);

  const visibleStart = Math.floor(scrollTop / itemHeight);
  const visibleEnd = Math.min(
    visibleStart + Math.ceil(containerHeight / itemHeight) + 1,
    items.length
  );

  const visibleItems = items.slice(visibleStart, visibleEnd);

  return (
    <div
      ref={setContainerRef}
      style={{ height: containerHeight, overflow: 'auto' }}
      onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
    >
      <div style={{ height: items.length * itemHeight, position: 'relative' }}>
        {visibleItems.map((item, index) => (
          <div
            key={visibleStart + index}
            style={{
              position: 'absolute',
              top: (visibleStart + index) * itemHeight,
              left: 0,
              right: 0,
              height: itemHeight,
            }}
          >
            {renderItem(item, visibleStart + index)}
          </div>
        ))}
      </div>
    </div>
  );
};

// Prefetch utility
export const prefetchData = async (url: string) => {
  try {
    const response = await fetch(url);
    if (response.ok) {
      return response.json();
    }
  } catch (error) {
    console.warn('Prefetch failed:', error);
  }
};

// Service worker registration
export const registerServiceWorker = () => {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          console.log('SW registered: ', registration);
        })
        .catch((registrationError) => {
          console.log('SW registration failed: ', registrationError);
        });
    });
  }
};

// Performance observer
export const observePerformance = () => {
  if ('PerformanceObserver' in window) {
    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        if (entry.entryType === 'navigation') {
          console.log('Navigation timing:', entry);
        }
        if (entry.entryType === 'paint') {
          console.log('Paint timing:', entry);
        }
      });
    });
    
    observer.observe({ entryTypes: ['navigation', 'paint'] });
  }
};

// Web vitals monitoring
export const trackWebVitals = () => {
  if ('PerformanceObserver' in window) {
    // Largest Contentful Paint
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      console.log('LCP:', lastEntry.startTime);
    });
    lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

    // Cumulative Layout Shift
    const clsObserver = new PerformanceObserver((list) => {
      let clsValue = 0;
      list.getEntries().forEach((entry) => {
        if (!entry.hadRecentInput) {
          clsValue += entry.value;
        }
      });
      console.log('CLS:', clsValue);
    });
    clsObserver.observe({ entryTypes: ['layout-shift'] });
  }
};

// Bundle size analyzer
export const analyzeBundleSize = () => {
  if (process.env.NODE_ENV === 'development') {
    console.log('Bundle analysis available at: /analyze');
  }
};

// Critical resource hints
export const addResourceHints = () => {
  // Preload critical assets
  const preloadLink = document.createElement('link');
  preloadLink.rel = 'preload';
  preloadLink.href = '/fonts/main.woff2';
  preloadLink.as = 'font';
  preloadLink.type = 'font/woff2';
  preloadLink.crossOrigin = '';
  document.head.appendChild(preloadLink);

  // Prefetch likely next pages
  const prefetchLink = document.createElement('link');
  prefetchLink.rel = 'prefetch';
  prefetchLink.href = '/dashboard';
  document.head.appendChild(prefetchLink);
};

// Initialize performance optimizations
export const initializePerformance = () => {
  registerServiceWorker();
  observePerformance();
  trackWebVitals();
  addResourceHints();
  analyzeBundleSize();
};