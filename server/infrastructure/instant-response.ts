import { Request, Response, NextFunction } from 'express';
import { performance } from 'perf_hooks';

// Response cache with TTL
const responseCache = new Map<string, { data: any; timestamp: number; ttl: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Critical endpoints that should respond instantly
const CRITICAL_ENDPOINTS = [
  '/api/health',
  '/api/auth/me',
  '/api/msme-listings',
  '/api/dashboard-stats'
];

// Precomputed responses for instant delivery
const precomputedResponses = new Map<string, any>();

// Initialize precomputed responses
export const initializeInstantResponses = () => {
  // Precompute health check
  precomputedResponses.set('/api/health', {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '1.0.0'
  });

  // Precompute dashboard stats
  precomputedResponses.set('/api/dashboard-stats', {
    totalUsers: 0,
    activeListings: 0,
    totalTransactions: 0,
    lastUpdated: new Date().toISOString()
  });

  console.log('✅ Instant response system initialized');
};

// Cache middleware for instant responses
export const instantResponseMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const start = performance.now();
  const cacheKey = `${req.method}:${req.path}`;
  
  // Check if this is a critical endpoint
  const isCritical = CRITICAL_ENDPOINTS.some(endpoint => req.path.startsWith(endpoint));
  
  if (isCritical && req.method === 'GET') {
    // Check precomputed responses first
    const precomputed = precomputedResponses.get(req.path);
    if (precomputed) {
      return res.json(precomputed);
    }
    
    // Check cache
    const cached = responseCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      res.setHeader('X-Cache', 'HIT');
      res.setHeader('X-Response-Time', `${performance.now() - start}ms`);
      return res.json(cached.data);
    }
  }
  
  // Override res.json to cache the response
  const originalJson = res.json;
  res.json = function(data: any) {
    if (isCritical && req.method === 'GET' && res.statusCode === 200) {
      responseCache.set(cacheKey, {
        data,
        timestamp: Date.now(),
        ttl: CACHE_TTL
      });
    }
    
    res.setHeader('X-Cache', 'MISS');
    res.setHeader('X-Response-Time', `${performance.now() - start}ms`);
    return originalJson.call(this, data);
  };
  
  next();
};

// Refresh precomputed responses periodically
export const refreshPrecomputedResponses = () => {
  setInterval(() => {
    // Update health check timestamp
    const healthData = precomputedResponses.get('/api/health');
    if (healthData) {
      healthData.timestamp = new Date().toISOString();
      healthData.uptime = process.uptime();
    }
    
    // Clear old cache entries
    const now = Date.now();
    for (const [key, entry] of responseCache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        responseCache.delete(key);
      }
    }
  }, 30000); // Every 30 seconds
};

// Critical path optimization
export const criticalPathOptimization = (req: Request, res: Response, next: NextFunction) => {
  // Set aggressive cache headers for static assets
  if (req.path.includes('/static/') || req.path.includes('/assets/')) {
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('Expires', new Date(Date.now() + 31536000000).toUTCString());
  }
  
  // Optimize critical API responses
  if (req.path.startsWith('/api/')) {
    res.setHeader('Cache-Control', 'public, max-age=300'); // 5 minutes
    res.setHeader('ETag', `"${Date.now()}"`);
  }
  
  next();
};