import { performanceCache } from './performance';
import { clientCache } from '../../client/src/utils/cache';

// Cache cleaning utilities
export class CacheManager {
  private cleanupInterval: NodeJS.Timeout | null = null;
  private maxCacheSize = 1000;
  private maxMemoryUsage = 400 * 1024 * 1024; // 400MB - more reasonable for development
  private memoryCache: Map<string, any> = new Map();
  private cacheHits = 0;
  private cacheMisses = 0;

  constructor() {
    this.startCleanupSchedule();
  }

  // Start periodic cache cleanup
  private startCleanupSchedule() {
    this.cleanupInterval = setInterval(async () => {
      this.cleanupExpiredEntries();
      await this.enforceMemoryLimits();
    }, 10 * 60 * 1000); // Every 10 minutes - less aggressive
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
  private async enforceMemoryLimits() {
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
      await this.cleanMemoryCache();
    }
  }

  // Clean in-memory caches
  private async cleanMemoryCache() {
    try {
      // Clear Node.js internal DNS cache safely using dynamic import
      const dns = await import('dns');
      if (dns && 'clearDNSCache' in dns && typeof dns.clearDNSCache === 'function') {
        dns.clearDNSCache();
      }
      
      // Clear module cache for non-critical modules safely
      if (typeof require !== 'undefined' && require.cache) {
        Object.keys(require.cache).forEach(key => {
          if (key.includes('temp') || key.includes('cache')) {
            delete require.cache[key];
          }
        });
      }
    } catch (error) {
      // Fallback: manual cache cleanup
      console.warn('Native cache cleanup failed, using fallback:', error instanceof Error ? error.message : 'Unknown error');
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