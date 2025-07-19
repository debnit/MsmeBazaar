// Enhanced caching system for improved performance
export interface CacheEntry {
  data: any;
  timestamp: number;
  expiresAt: number;
  hits: number;
}

export class EnhancedCache {
  private cache: Map<string, CacheEntry> = new Map();
  private maxSize: number = 100;
  private defaultTTL: number = 5 * 60 * 1000; // 5 minutes

  set(key: string, data: any, ttl?: number): void {
    const now = Date.now();
    const expiresAt = now + (ttl || this.defaultTTL);

    this.cache.set(key, {
      data,
      timestamp: now,
      expiresAt,
      hits: 0,
    });

    // Cleanup if cache is too large
    if (this.cache.size > this.maxSize) {
      this.cleanup();
    }
  }

  get(key: string): any | null {
    const entry = this.cache.get(key);

    if (!entry) {return null;}

    const now = Date.now();
    if (now > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    entry.hits++;
    return entry.data;
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) {return false;}

    const now = Date.now();
    if (now > entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  private cleanup(): void {
    const now = Date.now();
    const entries = Array.from(this.cache.entries());

    // Remove expired entries
    entries.forEach(([key, entry]) => {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    });

    // If still too large, remove least recently used
    if (this.cache.size > this.maxSize) {
      const sortedEntries = entries
        .filter(([key]) => this.cache.has(key))
        .sort(([, a], [, b]) => a.hits - b.hits);

      const toRemove = sortedEntries.slice(0, this.cache.size - this.maxSize + 10);
      toRemove.forEach(([key]) => this.cache.delete(key));
    }
  }

  getStats(): { size: number; hitRate: number } {
    const entries = Array.from(this.cache.values());
    const totalHits = entries.reduce((sum, entry) => sum + entry.hits, 0);
    const hitRate = entries.length > 0 ? totalHits / entries.length : 0;

    return {
      size: this.cache.size,
      hitRate,
    };
  }
}

export const enhancedCache = new EnhancedCache();

// Initialize enhanced caching system
export function initializeCaching(): void {
  console.log('Enhanced caching initialized with aggressive preloading');

  // Set up cache warming for critical resources
  const criticalResources = [
    '/api/dashboard/stats',
    '/api/buyer/matches',
    '/api/msme-listings',
  ];

  criticalResources.forEach(resource => {
    if (!enhancedCache.has(resource)) {
      // Preload critical resources
      fetch(resource).then(response => {
        if (response.ok) {
          return response.json();
        }
      }).then(data => {
        if (data) {
          enhancedCache.set(resource, data, 10 * 60 * 1000); // 10 minutes for critical resources
        }
      }).catch(() => {
        // Silently fail for preloading
      });
    }
  });
}

// Cache-aware fetch function
export async function cachedFetch(url: string, options?: RequestInit): Promise<Response> {
  const cacheKey = `${url}:${JSON.stringify(options)}`;

  if (enhancedCache.has(cacheKey)) {
    const cachedData = enhancedCache.get(cacheKey);
    return new Response(JSON.stringify(cachedData), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const response = await fetch(url, options);

  if (response.ok && response.headers.get('content-type')?.includes('application/json')) {
    const data = await response.clone().json();
    enhancedCache.set(cacheKey, data);
  }

  return response;
}
