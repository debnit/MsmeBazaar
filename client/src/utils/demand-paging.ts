// Client-side demand paging system for optimized resource loading
import React from 'react';

interface CacheEntry {
  data: any;
  timestamp: number;
  expiry: number;
  priority: number;
}

interface PageConfig {
  size: number;
  ttl: number;
  priority: number;
}

class DemandPagingManager {
  private static instance: DemandPagingManager;
  private cache = new Map<string, CacheEntry>();
  private loadingPromises = new Map<string, Promise<any>>();
  private maxCacheSize = 50 * 1024 * 1024; // 50MB
  private currentCacheSize = 0;
  private pageConfigs = new Map<string, PageConfig>();

  private constructor() {
    this.setupDefaultConfigs();
    this.startCleanupProcess();
  }

  static getInstance(): DemandPagingManager {
    if (!DemandPagingManager.instance) {
      DemandPagingManager.instance = new DemandPagingManager();
    }
    return DemandPagingManager.instance;
  }

  private setupDefaultConfigs(): void {
    // High priority pages
    this.pageConfigs.set('dashboard', { size: 10, ttl: 300000, priority: 10 });
    this.pageConfigs.set('listings', { size: 20, ttl: 180000, priority: 9 });
    this.pageConfigs.set('user-profile', { size: 5, ttl: 600000, priority: 8 });

    // Medium priority pages
    this.pageConfigs.set('notifications', { size: 15, ttl: 120000, priority: 5 });
    this.pageConfigs.set('analytics', { size: 8, ttl: 240000, priority: 4 });

    // Low priority pages
    this.pageConfigs.set('documentation', { size: 50, ttl: 3600000, priority: 1 });
    this.pageConfigs.set('settings', { size: 3, ttl: 900000, priority: 2 });
  }

  private startCleanupProcess(): void {
    setInterval(() => {
      this.cleanupExpiredEntries();
      this.enforceMemoryLimit();
    }, 30000); // Cleanup every 30 seconds
  }

  private cleanupExpiredEntries(): void {
    const now = Date.now();

    for (const [key, entry] of this.cache) {
      if (now > entry.expiry) {
        this.removeFromCache(key);
      }
    }
  }

  private enforceMemoryLimit(): void {
    if (this.currentCacheSize <= this.maxCacheSize) {
      return;
    }

    // Sort by priority and age
    const entries = Array.from(this.cache.entries())
      .sort((a, b) => {
        const priorityDiff = a[1].priority - b[1].priority;
        if (priorityDiff !== 0) {return priorityDiff;}
        return a[1].timestamp - b[1].timestamp;
      });

    // Remove lower priority entries
    const targetSize = this.maxCacheSize * 0.8;
    while (this.currentCacheSize > targetSize && entries.length > 0) {
      const [key] = entries.shift()!;
      this.removeFromCache(key);
    }
  }

  private removeFromCache(key: string): void {
    const entry = this.cache.get(key);
    if (entry) {
      const size = this.calculateSize(entry.data);
      this.currentCacheSize -= size;
      this.cache.delete(key);
    }
  }

  private calculateSize(data: any): number {
    return JSON.stringify(data).length * 2; // Approximate size in bytes
  }

  public async loadPage(
    key: string,
    loader: () => Promise<any>,
    config?: Partial<PageConfig>,
  ): Promise<any> {
    // Check cache first
    const cached = this.cache.get(key);
    if (cached && Date.now() < cached.expiry) {
      return cached.data;
    }

    // Check if already loading
    if (this.loadingPromises.has(key)) {
      return this.loadingPromises.get(key);
    }

    // Start loading
    const loadingPromise = this.executeLoad(key, loader, config);
    this.loadingPromises.set(key, loadingPromise);

    try {
      return await loadingPromise;
    } finally {
      this.loadingPromises.delete(key);
    }
  }

  private async executeLoad(
    key: string,
    loader: () => Promise<any>,
    config?: Partial<PageConfig>,
  ): Promise<any> {
    try {
      const data = await loader();

      // Get configuration
      const pageConfig = this.pageConfigs.get(key.split(':')[0]) ||
        { size: 10, ttl: 300000, priority: 5 };
      const finalConfig = { ...pageConfig, ...config };

      // Store in cache
      const entry: CacheEntry = {
        data,
        timestamp: Date.now(),
        expiry: Date.now() + finalConfig.ttl,
        priority: finalConfig.priority,
      };

      const size = this.calculateSize(data);
      this.currentCacheSize += size;
      this.cache.set(key, entry);

      // Ensure memory limit
      this.enforceMemoryLimit();

      return data;
    } catch (error) {
      console.error(`Failed to load page ${key}:`, error);
      throw error;
    }
  }

  public preloadPages(keys: string[]): void {
    keys.forEach(key => {
      if (!this.cache.has(key) && !this.loadingPromises.has(key)) {
        // Preload with lower priority
        this.loadPage(key, () => this.fetchFromAPI(key), { priority: 1 });
      }
    });
  }

  private async fetchFromAPI(key: string): Promise<any> {
    const response = await fetch(`/api/page-data/${key}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch ${key}: ${response.statusText}`);
    }
    return response.json();
  }

  public invalidateCache(pattern?: string): void {
    if (!pattern) {
      this.cache.clear();
      this.currentCacheSize = 0;
      return;
    }

    const regex = new RegExp(pattern);
    for (const [key, entry] of this.cache) {
      if (regex.test(key)) {
        this.removeFromCache(key);
      }
    }
  }

  public getCacheStats(): any {
    return {
      entries: this.cache.size,
      size: this.currentCacheSize,
      maxSize: this.maxCacheSize,
      utilization: (this.currentCacheSize / this.maxCacheSize) * 100,
      loading: this.loadingPromises.size,
    };
  }

  public optimizeForMemory(): void {
    // Reduce cache size temporarily
    const originalMaxSize = this.maxCacheSize;
    this.maxCacheSize = originalMaxSize * 0.5;

    this.enforceMemoryLimit();

    // Restore original size after 5 minutes
    setTimeout(() => {
      this.maxCacheSize = originalMaxSize;
    }, 300000);
  }

  public prefetchUserFlow(userType: string): void {
    const flows = {
      buyer: ['dashboard', 'listings', 'favorites', 'notifications'],
      seller: ['dashboard', 'my-listings', 'analytics', 'messages'],
      agent: ['dashboard', 'clients', 'commissions', 'leaderboard'],
      nbfc: ['dashboard', 'applications', 'portfolio', 'compliance'],
    };

    const flow = flows[userType as keyof typeof flows] || [];
    this.preloadPages(flow);
  }
}

export const demandPagingManager = DemandPagingManager.getInstance();

// React hook for demand paging
export function useDemandPaging<T>(
  key: string,
  loader: () => Promise<T>,
  config?: Partial<PageConfig>,
) {
  const [data, setData] = React.useState<T | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      if (loading) {return;}

      setLoading(true);
      setError(null);

      try {
        const result = await demandPagingManager.loadPage(key, loader, config);
        if (mounted) {
          setData(result);
        }
      } catch (err) {
        if (mounted) {
          setError(err as Error);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      mounted = false;
    };
  }, [key]);

  return { data, loading, error };
}

// Export for global use
(window as any).demandPagingManager = demandPagingManager;

// Export the missing loadComponentWithPaging function
export async function loadComponentWithPaging<T>(
  componentName: string,
  loader: () => Promise<T>,
  config?: Partial<PageConfig>,
): Promise<T> {
  return demandPagingManager.loadPage(componentName, loader, config);
}

// Export the missing initializeDemandPaging function
export function initializeDemandPaging(): void {
  // Initialize demand paging system
  console.log('📄 Demand paging system initialized');

  // Pre-configure for common user flows
  demandPagingManager.prefetchUserFlow('buyer');

  // Set up global error handling
  window.addEventListener('error', (event) => {
    console.warn('Demand paging error:', event.error);
  });
}
