// Client-side performance monitoring and optimization
class ClientPerformanceMonitor {
  private static instance: ClientPerformanceMonitor;
  private metrics: Map<string, number> = new Map();
  private observers: PerformanceObserver[] = [];

  private constructor() {
    this.initializeMonitoring();
  }

  static getInstance(): ClientPerformanceMonitor {
    if (!ClientPerformanceMonitor.instance) {
      ClientPerformanceMonitor.instance = new ClientPerformanceMonitor();
    }
    return ClientPerformanceMonitor.instance;
  }

  private initializeMonitoring(): void {
    if (typeof window === 'undefined') {return;}

    // Monitor navigation timing
    if (window.performance && window.performance.timing) {
      const timing = window.performance.timing;
      this.metrics.set('pageLoadTime', timing.loadEventEnd - timing.navigationStart);
      this.metrics.set('domContentLoaded', timing.domContentLoadedEventEnd - timing.navigationStart);
      this.metrics.set('firstPaint', timing.responseStart - timing.navigationStart);
    }

    // Monitor resource loading
    if (window.PerformanceObserver) {
      try {
        const resourceObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry) => {
            if (entry.duration > 1000) { // Resources taking more than 1 second
              console.warn(`Slow resource: ${entry.name} took ${entry.duration}ms`);
            }
          });
        });
        resourceObserver.observe({ entryTypes: ['resource'] });
        this.observers.push(resourceObserver);
      } catch (error) {
        console.debug('Resource observer not supported');
      }
    }

    // Monitor layout shifts
    if (window.PerformanceObserver) {
      try {
        const clsObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry: any) => {
            if (entry.value > 0.1) { // CLS threshold
              console.warn(`Layout shift detected: ${entry.value}`);
            }
          });
        });
        clsObserver.observe({ entryTypes: ['layout-shift'] });
        this.observers.push(clsObserver);
      } catch (error) {
        console.debug('Layout shift observer not supported');
      }
    }
  }

  public trackUserAction(action: string, duration?: number): void {
    const timestamp = Date.now();
    const key = `action_${action}_${timestamp}`;
    this.metrics.set(key, duration || 0);
  }

  public getMetrics(): Record<string, number> {
    return Object.fromEntries(this.metrics);
  }

  public optimizeImages(): void {
    // Lazy load images
    const images = document.querySelectorAll('img[data-src]');
    if (window.IntersectionObserver) {
      const imageObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const img = entry.target as HTMLImageElement;
            img.src = img.dataset.src || '';
            img.removeAttribute('data-src');
            imageObserver.unobserve(img);
          }
        });
      });

      images.forEach((img) => imageObserver.observe(img));
    }
  }

  public prefetchCriticalResources(): void {
    // Prefetch critical resources
    const criticalResources = [
      '/api/auth/me',
      '/api/dashboard/stats',
      '/api/notifications',
    ];

    criticalResources.forEach((url) => {
      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.href = url;
      document.head.appendChild(link);
    });
  }

  public destroy(): void {
    this.observers.forEach((observer) => observer.disconnect());
    this.observers = [];
    this.metrics.clear();
  }
}

export const clientPerformanceMonitor = ClientPerformanceMonitor.getInstance();

// Initialize performance monitoring when imported
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    clientPerformanceMonitor.optimizeImages();
    clientPerformanceMonitor.prefetchCriticalResources();
  });
}
