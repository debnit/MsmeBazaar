import { performanceCache } from './performance';
import { clientCache } from '../../client/src/utils/cache';

// Cache cleaning utilities
export class CacheManager {
  private cleanupInterval: NodeJS.Timeout | null = null;
  private maxCacheSize = 1000;
  private maxMemoryUsage = 100 * 1024 * 1024; // 100MB

  constructor() {
    this.startCleanupSchedule();
  }

  // Start periodic cache cleanup
  private startCleanupSchedule() {
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredEntries();
      this.enforceMemoryLimits();
    }, 5 * 60 * 1000); // Every 5 minutes
  }

  // Clean expired cache entries
  private cleanupExpiredEntries() {
    const now = Date.now();
    let cleanedCount = 0;
    
    // Clean performance cache
    if (performanceCache.size() > this.maxCacheSize) {
      console.log(`🧹 Cleaning cache: ${performanceCache.size()} entries`);
      performanceCache.clear();
      cleanedCount++;
    }
    
    // Clean memory-based caches
    this.cleanMemoryCache();
    
    if (cleanedCount > 0) {
      console.log(`✅ Cache cleanup completed: ${cleanedCount} caches cleaned`);
    }
  }

  // Enforce memory usage limits
  private enforceMemoryLimits() {
    const memUsage = process.memoryUsage();
    const totalMemory = memUsage.heapUsed + memUsage.external;
    
    if (totalMemory > this.maxMemoryUsage) {
      console.log(`⚠️ Memory usage high: ${(totalMemory / 1024 / 1024).toFixed(2)}MB`);
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
        console.log('🗑️ Forced garbage collection');
      }
      
      // Clear caches to free memory
      performanceCache.clear();
      this.cleanMemoryCache();
    }
  }

  // Clean in-memory caches
  private cleanMemoryCache() {
    try {
      // Clear Node.js internal DNS cache safely
      const dns = eval('require')('dns');
      if (dns && dns.clearDNSCache) {
        dns.clearDNSCache();
      }
      
      // Clear module cache for non-critical modules safely
      const moduleCache = eval('require').cache;
      if (moduleCache && typeof moduleCache === 'object') {
        Object.keys(moduleCache).forEach(key => {
          if (key.includes('temp') || key.includes('cache')) {
            delete moduleCache[key];
          }
        });
      }
    } catch (error) {
      // Fallback: manual cache cleanup
      console.warn('Native cache cleanup failed, using fallback:', error.message);
      this.memoryCache.clear();
      this.cacheHits = 0;
      this.cacheMisses = 0;
    }
  }

  // Manual cache cleanup
  clearAllCaches() {
    performanceCache.clear();
    this.cleanMemoryCache();
    
    // Force garbage collection
    if (global.gc) {
      global.gc();
    }
    
    console.log('🧹 All caches cleared manually');
  }

  // Get cache statistics
  getCacheStats() {
    const memUsage = process.memoryUsage();
    
    return {
      performanceCache: performanceCache.size(),
      memoryUsage: {
        heapUsed: (memUsage.heapUsed / 1024 / 1024).toFixed(2) + 'MB',
        heapTotal: (memUsage.heapTotal / 1024 / 1024).toFixed(2) + 'MB',
        external: (memUsage.external / 1024 / 1024).toFixed(2) + 'MB'
      },
      uptime: process.uptime()
    };
  }

  // Stop cleanup schedule
  stop() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}

export const cacheManager = new CacheManager();