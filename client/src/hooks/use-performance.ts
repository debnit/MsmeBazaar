import { useEffect, useState } from 'react';

// Hook to measure and optimize performance
export const usePerformance = () => {
  const [metrics, setMetrics] = useState({
    loadTime: 0,
    renderTime: 0,
    memoryUsage: 0
  });

  useEffect(() => {
    const startTime = performance.now();
    
    // Measure load time
    const loadTime = performance.timing.loadEventEnd - performance.timing.navigationStart;
    
    // Measure render time
    const renderTime = performance.now() - startTime;
    
    // Measure memory usage (if available)
    const memoryUsage = (performance as any).memory?.usedJSHeapSize || 0;
    
    setMetrics({
      loadTime,
      renderTime,
      memoryUsage
    });
    
    // Log performance metrics in development
    if (process.env.NODE_ENV === 'development') {
      console.log('Performance metrics:', {
        loadTime: `${loadTime}ms`,
        renderTime: `${renderTime.toFixed(2)}ms`,
        memoryUsage: `${(memoryUsage / 1024 / 1024).toFixed(2)}MB`
      });
    }
  }, []);

  return metrics;
};

// Hook for lazy loading components
export const useLazyLoad = (ref: React.RefObject<HTMLElement>) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!ref.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(ref.current);

    return () => observer.disconnect();
  }, [ref]);

  return isVisible;
};

// Hook for prefetching data
export const usePrefetch = (url: string, condition: boolean = true) => {
  useEffect(() => {
    if (!condition) return;

    const prefetch = async () => {
      try {
        const response = await fetch(url);
        if (response.ok) {
          // Store in cache for later use
          const data = await response.json();
          sessionStorage.setItem(`prefetch_${url}`, JSON.stringify(data));
        }
      } catch (error) {
        console.warn('Prefetch failed:', error);
      }
    };

    // Prefetch after a short delay to avoid blocking main thread
    const timer = setTimeout(prefetch, 100);
    return () => clearTimeout(timer);
  }, [url, condition]);
};

// Hook for managing loading states
export const useLoadingState = (initialState: boolean = false) => {
  const [isLoading, setIsLoading] = useState(initialState);
  const [error, setError] = useState<string | null>(null);

  const startLoading = () => {
    setIsLoading(true);
    setError(null);
  };

  const stopLoading = () => {
    setIsLoading(false);
  };

  const setLoadingError = (err: string) => {
    setError(err);
    setIsLoading(false);
  };

  return {
    isLoading,
    error,
    startLoading,
    stopLoading,
    setLoadingError
  };
};