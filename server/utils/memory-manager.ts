// Advanced memory management and garbage collection
class MemoryManager {
  private static instance: MemoryManager;
  private memoryThreshold = 100 * 1024 * 1024; // 100MB threshold
  private gcInterval: NodeJS.Timeout | null = null;
  private memoryCache = new Map<string, any>();
  private cacheSize = 0;
  private maxCacheSize = 50 * 1024 * 1024; // 50MB cache limit

  private constructor() {
    this.startMemoryMonitoring();
  }

  static getInstance(): MemoryManager {
    if (!MemoryManager.instance) {
      MemoryManager.instance = new MemoryManager();
    }
    return MemoryManager.instance;
  }

  private startMemoryMonitoring(): void {
    this.gcInterval = setInterval(() => {
      this.checkMemoryUsage();
    }, 10000); // Check every 10 seconds
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
    // Clear temporary variables
    if (global.tempStorage) {
      global.tempStorage.clear();
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
      size: JSON.stringify(value).length
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