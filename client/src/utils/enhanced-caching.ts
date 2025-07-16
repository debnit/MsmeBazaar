// Enhanced caching system for maximum performance
interface CacheEntry {
  data: any;
  timestamp: number;
  ttl: number;
}

class EnhancedCache {
  private cache = new Map<string, CacheEntry>();
  private readonly MAX_CACHE_SIZE = 100;
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

  set(key: string, data: any, ttl: number = this.DEFAULT_TTL) {
    // Remove oldest entries if cache is full
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  get(key: string): any | null {
    const entry = this.cache.get(key);
    
    if (!entry) return null;
    
    // Check if entry has expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data;
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  clear() {
    this.cache.clear();
  }

  // Preload critical data
  preloadCriticalData() {
    const criticalEndpoints = [
      '/api/auth/me',
      '/api/health',
      '/api/msme-listings?limit=10'
    ];

    criticalEndpoints.forEach(endpoint => {
      if (!this.has(endpoint)) {
        fetch(endpoint)
          .then(res => res.json())
          .then(data => this.set(endpoint, data, 10 * 60 * 1000)) // 10 min cache
          .catch(() => {}); // Silent fail for preloading
      }
    });
  }
}

export const enhancedCache = new EnhancedCache();

// Enhanced fetch with caching
export const cachedFetch = async (url: string, options: RequestInit = {}): Promise<Response> => {
  const cacheKey = `${url}:${JSON.stringify(options)}`;
  
  // Return cached response for GET requests
  if (!options.method || options.method === 'GET') {
    const cached = enhancedCache.get(cacheKey);
    if (cached) {
      return new Response(JSON.stringify(cached), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  const response = await fetch(url, options);
  
  // Cache successful GET responses
  if (response.ok && (!options.method || options.method === 'GET')) {
    const data = await response.clone().json();
    enhancedCache.set(cacheKey, data);
  }
  
  return response;
};

// Initialize cache preloading
export const initializeCaching = () => {
  enhancedCache.preloadCriticalData();
  
  // Preload data when browser is idle
  if ('requestIdleCallback' in window) {
    requestIdleCallback(() => {
      enhancedCache.preloadCriticalData();
    });
  }
  
  console.log('Enhanced caching initialized with aggressive preloading');
};