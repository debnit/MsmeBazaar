// Ultra-Fast Middleware - Sub-millisecond Response Times
// Bypass heavy middleware for static/cached responses

import { Request, Response, NextFunction } from 'express';
import { instantResponseSystem } from './instant-response-system';

export class UltraFastMiddleware {
  private static bypasableRoutes = new Set([
    '/',
    '/api/health',
    '/api/user-roles',
    '/api/industries',
    '/api/regions',
    '/api/dashboard/stats'
  ]);

  static createInstantMiddleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      const startTime = process.hrtime.bigint();
      
      // Check if route can be served instantly
      if (UltraFastMiddleware.bypasableRoutes.has(req.path)) {
        const instantResponse = instantResponseSystem.getInstantResponse(req.path);
        
        if (instantResponse) {
          const endTime = process.hrtime.bigint();
          const responseTime = Number(endTime - startTime) / 1000000; // Convert to ms
          
          // Set ultra-fast headers
          res.set({
            'X-Response-Time': `${responseTime.toFixed(3)}ms`,
            'X-Cache-Status': 'HIT-INSTANT',
            'Cache-Control': 'public, max-age=30',
            'Content-Type': 'application/json'
          });
          
          return res.json({
            success: true,
            data: instantResponse,
            responseTime: `${responseTime.toFixed(3)}ms`,
            cached: true
          });
        }
      }
      
      // Continue to normal middleware chain
      next();
    };
  }

  static createCompressionBypass() {
    return (req: Request, res: Response, next: NextFunction) => {
      // Skip compression for instant responses
      if (UltraFastMiddleware.bypasableRoutes.has(req.path)) {
        return next();
      }
      
      // Apply compression for other routes
      const compression = require('compression');
      return compression()(req, res, next);
    };
  }

  static createCacheHeaders() {
    return (req: Request, res: Response, next: NextFunction) => {
      // Set aggressive caching headers for static content
      if (req.path.endsWith('.js') || req.path.endsWith('.css') || req.path.endsWith('.png')) {
        res.set({
          'Cache-Control': 'public, max-age=31536000, immutable',
          'ETag': `"${Date.now()}"`,
          'Last-Modified': new Date().toUTCString()
        });
      }
      
      // Set short cache for API responses
      if (req.path.startsWith('/api/')) {
        res.set({
          'Cache-Control': 'public, max-age=30',
          'X-Cache-Strategy': 'api-short'
        });
      }
      
      next();
    };
  }

  static createResponseTimeLogger() {
    return (req: Request, res: Response, next: NextFunction) => {
      const startTime = process.hrtime.bigint();
      
      res.on('finish', () => {
        const endTime = process.hrtime.bigint();
        const responseTime = Number(endTime - startTime) / 1000000;
        
        // Log slow requests only
        if (responseTime > 10) {
          console.log(`SLOW: ${req.method} ${req.path} ${res.statusCode} in ${responseTime.toFixed(3)}ms`);
        }
      });
      
      next();
    };
  }
}

// Memory-efficient request handling
export class MemoryEfficientHandler {
  private static requestPool = new Map<string, any>();
  private static responsePool = new Map<string, any>();

  static getPooledRequest(path: string): any {
    return MemoryEfficientHandler.requestPool.get(path);
  }

  static setPooledRequest(path: string, data: any): void {
    // Limit pool size to prevent memory leaks
    if (MemoryEfficientHandler.requestPool.size > 100) {
      const firstKey = MemoryEfficientHandler.requestPool.keys().next().value;
      MemoryEfficientHandler.requestPool.delete(firstKey);
    }
    
    MemoryEfficientHandler.requestPool.set(path, data);
  }

  static clearPools(): void {
    MemoryEfficientHandler.requestPool.clear();
    MemoryEfficientHandler.responsePool.clear();
  }

  static getPoolStats(): any {
    return {
      requestPool: MemoryEfficientHandler.requestPool.size,
      responsePool: MemoryEfficientHandler.responsePool.size
    };
  }
}

// Static asset optimization
export class StaticAssetOptimizer {
  private static assetCache = new Map<string, Buffer>();
  private static compressionCache = new Map<string, Buffer>();

  static cacheStaticAsset(path: string, content: Buffer): void {
    StaticAssetOptimizer.assetCache.set(path, content);
    
    // Pre-compress for faster serving
    const zlib = require('zlib');
    const compressed = zlib.gzipSync(content);
    StaticAssetOptimizer.compressionCache.set(path, compressed);
  }

  static getCachedAsset(path: string, compressed: boolean = false): Buffer | null {
    if (compressed) {
      return StaticAssetOptimizer.compressionCache.get(path) || null;
    }
    return StaticAssetOptimizer.assetCache.get(path) || null;
  }

  static preloadCriticalAssets(): void {
    // Preload critical assets
    const criticalAssets = [
      '/index.html',
      '/src/main.tsx',
      '/src/index.css'
    ];
    
    const fs = require('fs');
    const path = require('path');
    
    for (const asset of criticalAssets) {
      try {
        const fullPath = path.join(process.cwd(), asset);
        if (fs.existsSync(fullPath)) {
          const content = fs.readFileSync(fullPath);
          StaticAssetOptimizer.cacheStaticAsset(asset, content);
        }
      } catch (error) {
        console.warn(`Failed to preload asset: ${asset}`);
      }
    }
  }

  static getStats(): any {
    return {
      cachedAssets: StaticAssetOptimizer.assetCache.size,
      compressedAssets: StaticAssetOptimizer.compressionCache.size,
      totalSize: Array.from(StaticAssetOptimizer.assetCache.values())
        .reduce((sum, buffer) => sum + buffer.length, 0)
    };
  }
}