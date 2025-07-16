// Client-side caching utilities for performance optimization

interface CacheItem {
  data: any;
  timestamp: number;
  ttl: number;
}

class ClientCache {
  private cache = new Map<string, CacheItem>();
  private maxSize = 100;

  set(key: string, data: any, ttl: number = 300000) { // 5 minutes default
    // Remove oldest items if cache is full
    if (this.cache.size >= this.maxSize) {
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
    const item = this.cache.get(key);
    if (!item) return null;

    // Check if item has expired
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return null;
    }

    return item.data;
  }

  clear() {
    this.cache.clear();
  }

  size() {
    return this.cache.size;
  }
}

export const clientCache = new ClientCache();

// Cache wrapper for API calls
export const cacheApiCall = async <T>(
  key: string,
  apiCall: () => Promise<T>,
  ttl: number = 300000
): Promise<T> => {
  // Check cache first
  const cached = clientCache.get(key);
  if (cached) {
    return cached;
  }

  // Make API call and cache result
  const result = await apiCall();
  clientCache.set(key, result, ttl);
  return result;
};

// Local storage cache with expiration
export const localStorageCache = {
  set(key: string, data: any, ttl: number = 300000) {
    const item = {
      data,
      timestamp: Date.now(),
      ttl
    };
    localStorage.setItem(key, JSON.stringify(item));
  },

  get(key: string): any | null {
    try {
      const item = localStorage.getItem(key);
      if (!item) return null;

      const parsed = JSON.parse(item);
      if (Date.now() - parsed.timestamp > parsed.ttl) {
        localStorage.removeItem(key);
        return null;
      }

      return parsed.data;
    } catch (error) {
      localStorage.removeItem(key);
      return null;
    }
  },

  clear() {
    localStorage.clear();
  }
};

// Session storage cache
export const sessionStorageCache = {
  set(key: string, data: any) {
    sessionStorage.setItem(key, JSON.stringify(data));
  },

  get(key: string): any | null {
    try {
      const item = sessionStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      sessionStorage.removeItem(key);
      return null;
    }
  },

  clear() {
    sessionStorage.clear();
  }
};