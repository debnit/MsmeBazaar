// Memory optimization utilities
class MemoryOptimizer {
  private memoryCache = new Map<string, any>();
  private readonly MAX_MEMORY = 50 * 1024 * 1024; // 50MB limit

  // Monitor memory usage
  monitorMemory() {
    if ('memory' in performance) {
      const memInfo = (performance as any).memory;
      const usage = memInfo.usedJSHeapSize / 1024 / 1024;

      if (usage > this.MAX_MEMORY) {
        this.clearOldCaches();
      }
    }
  }

  // Clear old cache entries
  private clearOldCaches() {
    const entriesToClear = Math.floor(this.memoryCache.size * 0.3); // Clear 30%
    let cleared = 0;

    for (const [key] of this.memoryCache.entries()) {
      if (cleared >= entriesToClear) {break;}
      this.memoryCache.delete(key);
      cleared++;
    }

    // Force garbage collection if available
    if ('gc' in window) {
      (window as any).gc();
    }
  }

  // Optimize images for faster loading
  optimizeImage(src: string, maxWidth: number = 800): Promise<string> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d')!;

        // Calculate optimal dimensions
        const ratio = Math.min(maxWidth / img.width, maxWidth / img.height);
        canvas.width = img.width * ratio;
        canvas.height = img.height * ratio;

        // Draw optimized image
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        // Convert to optimized format
        const optimized = canvas.toDataURL('image/webp', 0.8);
        resolve(optimized);
      };
      img.src = src;
    });
  }

  // Preload critical resources
  preloadCriticalResources() {
    const criticalResources = [
      '/api/health',
      '/api/auth/me',
      '/static/css/main.css',
      '/static/js/main.js',
    ];

    criticalResources.forEach(resource => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.href = resource;
      link.as = resource.includes('.css') ? 'style' :
        resource.includes('.js') ? 'script' : 'fetch';
      document.head.appendChild(link);
    });
  }

  // Initialize memory optimization
  initialize() {
    this.preloadCriticalResources();

    // Monitor memory every 30 seconds
    setInterval(() => {
      this.monitorMemory();
    }, 30000);

    // Clean up on page unload
    window.addEventListener('beforeunload', () => {
      this.memoryCache.clear();
    });
  }
}

export const memoryOptimizer = new MemoryOptimizer();

// Service worker for aggressive caching
export const registerServiceWorker = () => {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js')
      .then(registration => {
        console.log('Service Worker registered for aggressive caching');
      })
      .catch(error => {
        console.log('Service Worker registration failed:', error);
      });
  }
};
