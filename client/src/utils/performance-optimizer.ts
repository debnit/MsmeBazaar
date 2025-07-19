// Client-Side Performance Optimization
// 1ms homepage loading target

export class ClientPerformanceOptimizer {
  private static instance: ClientPerformanceOptimizer;
  private initialized = false;
  private preloadedData = new Map<string, any>();
  private criticalResourcesLoaded = false;

  static getInstance(): ClientPerformanceOptimizer {
    if (!ClientPerformanceOptimizer.instance) {
      ClientPerformanceOptimizer.instance = new ClientPerformanceOptimizer();
    }
    return ClientPerformanceOptimizer.instance;
  }

  async initialize(): Promise<void> {
    if (this.initialized) {return;}

    console.log('⚡ Initializing client performance optimizer...');

    // 1. Preload critical data
    await this.preloadCriticalData();

    // 2. Initialize instant cache
    this.initializeInstantCache();

    // 3. Optimize DOM operations
    this.optimizeDOMOperations();

    // 4. Setup resource prefetching
    this.setupResourcePrefetching();

    this.initialized = true;
    console.log('✅ Client performance optimizer initialized');
  }

  private async preloadCriticalData(): Promise<void> {
    // Preload homepage data instantly
    const homepageData = {
      hero: {
        title: "MSMESquare - India's Leading MSME Marketplace",
        subtitle: 'Connect, Transact, Grow - Your One-Stop MSME Solution',
        stats: {
          totalMSMEs: 1250,
          successfulDeals: 89,
          registeredAgents: 156,
          totalFunding: '₹12.5 Cr',
        },
      },
      features: [
        {
          icon: '🏢',
          title: 'MSME Marketplace',
          description: 'Buy and sell businesses with confidence',
        },
        {
          icon: '💰',
          title: 'Instant Financing',
          description: 'Get quick loans from trusted NBFCs',
        },
        {
          icon: '📊',
          title: 'AI Valuation',
          description: 'Get accurate business valuations',
        },
        {
          icon: '👥',
          title: 'Expert Agents',
          description: 'Connect with verified business agents',
        },
      ],
    };

    this.preloadedData.set('homepage', homepageData);
    this.preloadedData.set('user-roles', ['admin', 'seller', 'buyer', 'agent', 'nbfc']);
    this.preloadedData.set('industries', ['Manufacturing', 'Services', 'Retail', 'Technology']);
    this.preloadedData.set('regions', ['Odisha', 'Mumbai', 'Delhi', 'Bangalore']);
  }

  private initializeInstantCache(): void {
    // Initialize localStorage cache for instant access
    const cacheKeys = ['homepage', 'user-roles', 'industries', 'regions'];

    cacheKeys.forEach(key => {
      const data = this.preloadedData.get(key);
      if (data) {
        localStorage.setItem(`cache:${key}`, JSON.stringify({
          data,
          timestamp: Date.now(),
          ttl: 300000, // 5 minutes
        }));
      }
    });
  }

  private optimizeDOMOperations(): void {
    // Optimize DOM operations with requestAnimationFrame
    const originalSetTimeout = window.setTimeout;
    window.setTimeout = (callback, delay) => {
      if (delay === 0) {
        return originalSetTimeout(() => {
          requestAnimationFrame(callback);
        }, 0);
      }
      return originalSetTimeout(callback, delay);
    };
  }

  private setupResourcePrefetching(): void {
    // Prefetch critical resources
    const criticalResources = [
      '/api/health',
      '/api/user-roles',
      '/api/industries',
    ];

    criticalResources.forEach(resource => {
      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.href = resource;
      document.head.appendChild(link);
    });
  }

  getCachedData(key: string): any {
    // Check memory cache first
    const memoryData = this.preloadedData.get(key);
    if (memoryData) {
      return memoryData;
    }

    // Check localStorage cache
    const cachedItem = localStorage.getItem(`cache:${key}`);
    if (cachedItem) {
      try {
        const parsed = JSON.parse(cachedItem);
        if (Date.now() - parsed.timestamp < parsed.ttl) {
          return parsed.data;
        }
      } catch (error) {
        console.warn('Failed to parse cached data:', error);
      }
    }

    return null;
  }

  setCachedData(key: string, data: any, ttl: number = 300000): void {
    // Set in memory cache
    this.preloadedData.set(key, data);

    // Set in localStorage cache
    localStorage.setItem(`cache:${key}`, JSON.stringify({
      data,
      timestamp: Date.now(),
      ttl,
    }));
  }

  async fetchWithCache(url: string, options?: RequestInit): Promise<any> {
    const cacheKey = `api:${url}`;

    // Check cache first
    const cachedData = this.getCachedData(cacheKey);
    if (cachedData) {
      return Promise.resolve(cachedData);
    }

    // Fetch from server
    const response = await fetch(url, options);
    const data = await response.json();

    // Cache the response
    this.setCachedData(cacheKey, data, 60000); // 1 minute cache

    return data;
  }

  measurePerformance(label: string): () => void {
    const start = performance.now();

    return () => {
      const end = performance.now();
      const duration = end - start;

      console.log(`⚡ ${label}: ${duration.toFixed(3)}ms`);

      // Track slow operations
      if (duration > 10) {
        console.warn(`SLOW OPERATION: ${label} took ${duration.toFixed(3)}ms`);
      }
    };
  }

  getPerformanceStats(): any {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;

    return {
      domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
      loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
      firstPaint: performance.getEntriesByType('paint').find(entry => entry.name === 'first-paint')?.startTime || 0,
      firstContentfulPaint: performance.getEntriesByType('paint').find(entry => entry.name === 'first-contentful-paint')?.startTime || 0,
      cacheSize: this.preloadedData.size,
      criticalResourcesLoaded: this.criticalResourcesLoaded,
    };
  }
}

// React Performance Hooks
export function useInstantData(key: string) {
  const optimizer = ClientPerformanceOptimizer.getInstance();
  return optimizer.getCachedData(key);
}

export function usePerformanceTracker(label: string) {
  const optimizer = ClientPerformanceOptimizer.getInstance();
  return optimizer.measurePerformance(label);
}

export function useCachedFetch(url: string, options?: RequestInit) {
  const optimizer = ClientPerformanceOptimizer.getInstance();
  return optimizer.fetchWithCache(url, options);
}

// Initialize on module load
if (typeof window !== 'undefined') {
  const optimizer = ClientPerformanceOptimizer.getInstance();
  optimizer.initialize();
}

export default ClientPerformanceOptimizer;
