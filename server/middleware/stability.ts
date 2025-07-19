// Stability middleware for request optimization
import { Request, Response, NextFunction } from 'express';
import { memoryManager } from '../utils/memory-manager';
import { resourceOptimizer } from '../utils/resource-optimizer';

export const stabilityMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  // Add request optimization
  await resourceOptimizer.optimizeRequest(req, res, next);
};

export const memoryMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Check memory usage before processing
  const memStats = memoryManager.getMemoryStats();

  if (memStats.heapUsed > 200 * 1024 * 1024) { // 200MB threshold - increased to reduce constant cleanup
    // Force cleanup
    memoryManager.clearCache();

    if (global.gc) {
      global.gc();
    }
  }

  next();
};

export const cacheMiddleware = (cacheDuration: number = 300000) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    const cacheKey = `${req.method}:${req.url}`;
    const cachedData = memoryManager.getCache(cacheKey);

    if (cachedData) {
      return res.json(cachedData);
    }

    // Override res.json to cache the response
    const originalJson = res.json;
    res.json = function(data: any) {
      memoryManager.setCache(cacheKey, data, cacheDuration);
      return originalJson.call(this, data);
    };

    next();
  };
};

export const healthCheckMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Add health check headers
  res.setHeader('X-Health-Check', 'OK');
  res.setHeader('X-Memory-Usage', process.memoryUsage().heapUsed);
  res.setHeader('X-Uptime', process.uptime());

  next();
};
