import { Request, Response, NextFunction } from 'express';
import { promisify } from 'util';
import { gzip } from 'zlib';
import { createHash } from 'crypto';
import memoize from 'memoizee';

const gzipAsync = promisify(gzip);

// In-memory cache for fast responses
class PerformanceCache {
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  private compressionCache = new Map<string, Buffer>();
  
  set(key: string, data: any, ttl: number = 300000) { // 5 minutes default
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }
  
  get(key: string): any | null {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return item.data;
  }
  
  async getCompressed(key: string): Promise<Buffer | null> {
    return this.compressionCache.get(key) || null;
  }
  
  async setCompressed(key: string, data: any): Promise<void> {
    const jsonData = JSON.stringify(data);
    const compressed = await gzipAsync(jsonData);
    this.compressionCache.set(key, compressed);
  }
  
  clear() {
    this.cache.clear();
    this.compressionCache.clear();
  }
  
  size() {
    return this.cache.size;
  }
}

export const performanceCache = new PerformanceCache();

// Response caching middleware
export const cacheResponse = (ttl: number = 300000) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const cacheKey = `${req.method}:${req.path}:${JSON.stringify(req.query)}`;
    
    // Skip caching for POST/PUT/DELETE and authenticated requests
    if (req.method !== 'GET' || req.headers.authorization) {
      return next();
    }
    
    const cachedData = performanceCache.get(cacheKey);
    if (cachedData) {
      res.set('X-Cache', 'HIT');
      res.set('Cache-Control', `max-age=${Math.floor(ttl / 1000)}`);
      return res.json(cachedData);
    }
    
    // Override res.json to cache the response
    const originalJson = res.json;
    res.json = function(data: any) {
      if (res.statusCode === 200) {
        performanceCache.set(cacheKey, data, ttl);
      }
      res.set('X-Cache', 'MISS');
      return originalJson.call(this, data);
    };
    
    next();
  };
};

// Compression middleware
export const compressionMiddleware = () => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const acceptEncoding = req.headers['accept-encoding'] || '';
    
    if (!acceptEncoding.includes('gzip')) {
      return next();
    }
    
    const originalJson = res.json;
    res.json = async function(data: any) {
      const size = JSON.stringify(data).length;
      
      // Only compress responses larger than 1KB
      if (size > 1024) {
        const compressed = await gzipAsync(JSON.stringify(data));
        res.set('Content-Encoding', 'gzip');
        res.set('Content-Length', compressed.length.toString());
        res.set('Content-Type', 'application/json');
        return res.end(compressed);
      }
      
      return originalJson.call(this, data);
    };
    
    next();
  };
};

// Connection pooling for database
export class ConnectionPool {
  private pool: any[] = [];
  private activeConnections = 0;
  private maxConnections: number;
  
  constructor(maxConnections: number = 10) {
    this.maxConnections = maxConnections;
  }
  
  async getConnection(): Promise<any> {
    if (this.pool.length > 0) {
      return this.pool.pop();
    }
    
    if (this.activeConnections < this.maxConnections) {
      this.activeConnections++;
      // In production, create actual database connection
      return { id: Date.now(), active: true };
    }
    
    // Wait for connection to be available
    return new Promise((resolve) => {
      const checkPool = () => {
        if (this.pool.length > 0) {
          resolve(this.pool.pop());
        } else {
          setTimeout(checkPool, 10);
        }
      };
      checkPool();
    });
  }
  
  releaseConnection(connection: any) {
    this.pool.push(connection);
  }
}

// Memoization for expensive operations
export const memoizedValuation = memoize(
  async (msmeData: any) => {
    // Simulate expensive valuation calculation
    await new Promise(resolve => setTimeout(resolve, 100));
    return {
      value: msmeData.revenue * 3.5,
      confidence: 0.85,
      timestamp: Date.now()
    };
  },
  { 
    maxAge: 300000, // 5 minutes
    max: 1000, // Maximum 1000 cached results
    normalizer: (args) => JSON.stringify(args[0])
  }
);

export const memoizedMatchmaking = memoize(
  async (buyerProfile: any, filters: any) => {
    // Simulate expensive matchmaking calculation
    await new Promise(resolve => setTimeout(resolve, 200));
    return {
      matches: [],
      score: 0.92,
      timestamp: Date.now()
    };
  },
  { 
    maxAge: 180000, // 3 minutes
    max: 500,
    normalizer: (args) => JSON.stringify(args)
  }
);

// Request deduplication for identical requests
class RequestDeduplicator {
  private pending = new Map<string, Promise<any>>();
  
  async deduplicate<T>(key: string, fn: () => Promise<T>): Promise<T> {
    if (this.pending.has(key)) {
      return this.pending.get(key)!;
    }
    
    const promise = fn().finally(() => {
      this.pending.delete(key);
    });
    
    this.pending.set(key, promise);
    return promise;
  }
}

export const requestDeduplicator = new RequestDeduplicator();

// Lazy loading utilities
export const lazyLoad = {
  // Lazy load heavy services
  valuation: null as any,
  matchmaking: null as any,
  
  async getValuationService() {
    if (!this.valuation) {
      const { calculateValuation } = await import('../services/valuation');
      this.valuation = calculateValuation;
    }
    return this.valuation;
  },
  
  async getMatchmakingService() {
    if (!this.matchmaking) {
      const { findMatches } = await import('../services/matchmaking');
      this.matchmaking = findMatches;
    }
    return this.matchmaking;
  }
};

// Response streaming for large datasets
export const streamResponse = (data: any[], chunkSize: number = 100) => {
  return (req: Request, res: Response) => {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Transfer-Encoding', 'chunked');
    
    res.write('{"data":[');
    
    let isFirst = true;
    const processChunk = (index: number) => {
      if (index >= data.length) {
        res.write(']}');
        return res.end();
      }
      
      const chunk = data.slice(index, index + chunkSize);
      const chunkData = chunk.map(item => JSON.stringify(item)).join(',');
      
      if (!isFirst) {
        res.write(',');
      }
      res.write(chunkData);
      isFirst = false;
      
      // Process next chunk asynchronously
      setImmediate(() => processChunk(index + chunkSize));
    };
    
    processChunk(0);
  };
};

// Precompute expensive operations
export class PrecomputeService {
  private schedulePrecompute() {
    // Precompute common queries every 5 minutes
    setInterval(async () => {
      await this.precomputePopularData();
    }, 300000);
  }
  
  private async precomputePopularData() {
    try {
      // Precompute popular MSME listings
      const popularListings = await this.getPopularListings();
      performanceCache.set('popular:listings', popularListings, 600000);
      
      // Precompute industry analytics
      const industryAnalytics = await this.getIndustryAnalytics();
      performanceCache.set('analytics:industry', industryAnalytics, 600000);
      
      // Precompute dashboard stats
      const dashboardStats = await this.getDashboardStats();
      performanceCache.set('dashboard:stats', dashboardStats, 300000);
      
      console.log('✅ Precomputed popular data');
    } catch (error) {
      console.error('❌ Precompute failed:', error);
    }
  }
  
  private async getPopularListings() {
    // Simulate fetching popular listings
    return Array.from({ length: 10 }, (_, i) => ({
      id: i + 1,
      businessName: `Business ${i + 1}`,
      industry: 'Technology',
      revenue: 1000000 + i * 100000,
      precomputed: true
    }));
  }
  
  private async getIndustryAnalytics() {
    return {
      technology: { count: 45, avgRevenue: 2500000 },
      manufacturing: { count: 32, avgRevenue: 1800000 },
      retail: { count: 28, avgRevenue: 1200000 },
      precomputed: true
    };
  }
  
  private async getDashboardStats() {
    return {
      totalListings: 105,
      totalApplications: 67,
      totalRevenue: 2450000,
      precomputed: true
    };
  }
  
  start() {
    this.schedulePrecompute();
    // Initial precompute
    this.precomputePopularData();
  }
}

// CDN simulation for static assets
export class CDNService {
  private static assets = new Map<string, { data: Buffer; contentType: string; etag: string }>();
  
  static async serveAsset(path: string, res: Response) {
    const asset = this.assets.get(path);
    if (!asset) {
      return res.status(404).json({ error: 'Asset not found' });
    }
    
    const ifNoneMatch = res.req.headers['if-none-match'];
    if (ifNoneMatch === asset.etag) {
      return res.status(304).end();
    }
    
    res.set('Content-Type', asset.contentType);
    res.set('ETag', asset.etag);
    res.set('Cache-Control', 'public, max-age=31536000'); // 1 year
    res.send(asset.data);
  }
  
  static registerAsset(path: string, data: Buffer, contentType: string) {
    const etag = createHash('md5').update(data).digest('hex');
    this.assets.set(path, { data, contentType, etag });
  }
}

// Performance monitoring
export const performanceMonitor = {
  startTiming(name: string) {
    return {
      name,
      start: process.hrtime.bigint(),
      end() {
        const duration = Number(process.hrtime.bigint() - this.start) / 1000000; // Convert to ms
        console.log(`⏱️ ${name}: ${duration.toFixed(2)}ms`);
        return duration;
      }
    };
  },
  
  async measureAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const timer = this.startTiming(name);
    try {
      const result = await fn();
      timer.end();
      return result;
    } catch (error) {
      timer.end();
      throw error;
    }
  }
};

// Initialize precompute service
export const precomputeService = new PrecomputeService();

// Export all performance utilities
export const performanceUtils = {
  cache: performanceCache,
  memoizedValuation,
  memoizedMatchmaking,
  requestDeduplicator,
  lazyLoad,
  streamResponse,
  performanceMonitor,
  CDNService
};