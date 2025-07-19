// Advanced memory management and garbage collection
class MemoryManager {
  private static instance: MemoryManager;
  private memoryThreshold = 100 * 1024 * 1024; // 100MB threshold - memory-efficient
  private gcInterval: NodeJS.Timeout | null = null;
  private memoryCache = new Map<string, any>();
  private cacheSize = 0;
  private maxCacheSize = 20 * 1024 * 1024; // 20MB cache limit - memory-efficient

  private constructor() {
    this.startMemoryMonitoring();
  }

  static getInstance(): MemoryManager {
    if (!MemoryManager.instance) {
      MemoryManager.instance = new MemoryManager();
    }
    return MemoryManager.instance;
  }

  private async startMemoryMonitoring(): Promise<void> {
    // Use event-driven memory management instead of polling
    try {
      const { minimalPolling } = await import('./minimal-polling');

      minimalPolling.startEventDrivenPolling(
        'memory-management',
        async () => this.checkMemoryUsage(),
        ['SIGTERM', 'SIGINT', 'uncaughtException'],
        180000, // 3 minutes when no events
      );
    } catch (error) {
      console.warn('Memory monitoring fallback to simple interval');
      setInterval(() => {
        this.checkMemoryUsage();
      }, 300000); // 5 minutes fallback
    }
  }

  private checkMemoryUsage(): void {
    const memUsage = process.memoryUsage();

    if (memUsage.heapUsed > this.memoryThreshold) {
      this.performGarbageCollection();
    }

    if (this.cacheSize > this.maxCacheSize) {
      this.cleanupCache();
    }
  }

  private performGarbageCollection(): void {
    if (global.gc) {
      global.gc();
    }

    // Clear large objects
    this.cleanupLargeObjects();

    console.log('Memory cleanup performed');
  }

  private cleanupLargeObjects(): void {
    // Memory-efficient cleanup
    if (global.tempStorage) {
      global.tempStorage.clear();
    }

    // Clear only non-essential modules from cache
    const nonEssentialModules = Object.keys(require.cache).filter(key =>
      key.includes('node_modules') && !key.includes('express') && !key.includes('drizzle'),
    );

    // Clear only if memory pressure is high
    if (this.getMemoryStats().heapUsed > this.memoryThreshold * 0.8) {
      nonEssentialModules.slice(0, 10).forEach(key => {
        delete require.cache[key];
      });
    }

    // Clear cache if too large
    if (this.cacheSize > this.maxCacheSize * 0.8) {
      this.memoryCache.clear();
      this.cacheSize = 0;
    }
  }

  private cleanupCache(): void {
    // Remove oldest cache entries
    const entries = Array.from(this.memoryCache.entries());
    const toDelete = Math.floor(entries.length * 0.3); // Delete 30% of entries

    for (let i = 0; i < toDelete; i++) {
      this.memoryCache.delete(entries[i][0]);
    }

    this.recalculateCacheSize();
  }

  private recalculateCacheSize(): void {
    this.cacheSize = 0;
    for (const [key, value] of this.memoryCache) {
      this.cacheSize += JSON.stringify(value).length;
    }
  }

  public setCache(key: string, value: any, ttl: number = 300000): void {
    const item = {
      value,
      expiry: Date.now() + ttl,
      size: JSON.stringify(value).length,
    };

    this.memoryCache.set(key, item);
    this.cacheSize += item.size;
  }

  public getCache(key: string): any {
    const item = this.memoryCache.get(key);

    if (!item) {
      return null;
    }

    if (Date.now() > item.expiry) {
      this.memoryCache.delete(key);
      this.cacheSize -= item.size;
      return null;
    }

    return item.value;
  }

  public clearCache(): void {
    this.memoryCache.clear();
    this.cacheSize = 0;
  }

  public getMemoryStats(): any {
    return {
      ...process.memoryUsage(),
      cacheSize: this.cacheSize,
      cacheEntries: this.memoryCache.size,
      threshold: this.memoryThreshold,
    };
  }

  public getCacheStats(): any {
    return {
      ...process.memoryUsage(),
      cacheSize: this.cacheSize,
      cacheEntries: this.memoryCache.size,
      threshold: this.memoryThreshold,
      entries: this.memoryCache.size,
      size: this.cacheSize,
      maxSize: this.maxCacheSize,
      utilization: this.maxCacheSize > 0 ? (this.cacheSize / this.maxCacheSize) * 100 : 0,
      loading: 0,
    };
  }

  public destroy(): void {
    if (this.gcInterval) {
      clearInterval(this.gcInterval);
    }
    this.clearCache();
  }
}

export const memoryManager = MemoryManager.getInstance();
