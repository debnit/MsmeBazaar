import express, { type Request, Response, NextFunction } from 'express';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import { registerRoutes } from './routes';
import { setupVite, serveStatic, log } from './vite';
import { setupModernDocs } from './docs/openapi';
import { startupManager } from './infrastructure/startup-manager';
import {
  instantResponseMiddleware,
  initializeInstantResponses,
  refreshPrecomputedResponses,
  criticalPathOptimization,
} from './infrastructure/instant-response';
import { initializeServerMemoryManagement } from './infrastructure/memory-management';
import { startupOptimizer } from './utils/startup-optimizer';
import { performanceMonitor } from './utils/performance-monitor';
import { memoryManager } from './utils/memory-manager';
import { resourceMonitor } from './utils/resource-monitoring';
import { atomicOperations } from './utils/atomic-operations';
import { lowDependencyManager } from './utils/low-dependency-manager';
import { minimalPolling } from './utils/minimal-polling';
import { hardwareOptimization } from './utils/hardware-optimization';
import { serviceFactory } from './architecture/solid-principles';
import { shardingService } from './architecture/sharding-system';
import { stagedLoader, onDemandLoader } from './architecture/staged-loading';
import { bootManager, resourceManager } from './architecture/boot-optimization';
import { cacheManager, cacheInvalidator, cacheWarmup } from './architecture/advanced-caching';
import { memoryOptimizations } from './architecture/memory-efficient-systems';
import { instantResponseSystem } from './performance/instant-response-system';
import { UltraFastMiddleware, StaticAssetOptimizer } from './performance/ultra-fast-middleware';
import { extremeOptimization, CPUOptimizer, DatabaseOptimizer } from './performance/extreme-optimization';

// Initialize mission-critical mode with extreme optimizations
console.log('⚡ Starting in mission-critical performance mode...');

const app = express();

// Apply ultra-fast middleware BEFORE any other middleware
app.use(UltraFastMiddleware.createInstantMiddleware());
app.use(UltraFastMiddleware.createResponseTimeLogger());
app.use(UltraFastMiddleware.createCacheHeaders());

// Initialize advanced architecture patterns
(async () => {
  try {
    // 0. Initialize extreme performance optimizations
    await extremeOptimization.initializeExtremeMode();

    // 0.1. Initialize instant response system FIRST
    await instantResponseSystem.initialize();

    // 0.2. Initialize CPU and Database optimizations
    await CPUOptimizer.initializeWorkerPool();
    DatabaseOptimizer.initializeConnectionPool();

    // 0.3. Preload critical assets
    StaticAssetOptimizer.preloadCriticalAssets();

    // 1. Initialize boot optimization (warm vs cold boot)
    await bootManager.boot();

    // 2. Initialize hardware optimization
    await hardwareOptimization.optimizeCPUUsage();
    await hardwareOptimization.optimizeMemoryUsage();
    await hardwareOptimization.optimizeIOOperations();

    // 3. Initialize staged loading system
    await stagedLoader.loadAllStages();

    // 4. Initialize advanced caching
    await cacheWarmup.warmupAll();

    // 4.5. Initialize memory-efficient systems
    console.log('🧠 Initializing memory-efficient systems...');
    // Memory optimizations are already initialized as singleton

    // 5. Initialize sharding system
    console.log('🔄 Initializing database sharding...');
    const userRepo = new (await import('./architecture/sharding-system')).ShardedUserRepository(shardingService.userShard);
    const msmeRepo = new (await import('./architecture/sharding-system')).ShardedMSMERepository(shardingService.msmeShard);

    // 6. Initialize low dependency manager
    const moduleOrder = lowDependencyManager.getInitializationOrder();
    console.log(`📦 Module initialization order: ${moduleOrder.join(' → ')}`);

    // 7. Replace aggressive polling with minimal polling
    minimalPolling.startConditionalPolling(
      'health-check',
      async () => ({ status: 'healthy', timestamp: Date.now() }),
      () => process.env.NODE_ENV === 'production',
      120000, // 2 minutes
    );

    // 8. Schedule cache warmup
    await cacheWarmup.scheduleWarmup(300000); // 5 minutes

    console.log('✅ Advanced architecture patterns initialized');
  } catch (error) {
    console.warn('⚠️ Some optimizations failed:', error.message);
  }
})();

// Initialize instant response system
initializeInstantResponses();

// Initialize server memory management
initializeServerMemoryManagement();

// Initialize performance monitoring
performanceMonitor.on('alert', (alert) => {
  console.warn(`🚨 Performance Alert: ${alert.message}`);
});

// Initialize resource monitoring (disabled for better performance)
// resourceMonitor.on('warning', (warning) => {
//   console.warn(`⚠️ Resource Warning: ${warning.message}`);
// });

// resourceMonitor.on('critical', (critical) => {
//   console.error(`🚨 Resource Critical: ${critical.message}`);
// });

// Start resource monitoring (disabled)
// resourceMonitor.start();

// Apply startup optimizations
startupOptimizer.applyRecommendations();

// Enable compression for better performance
app.use(compression({
  level: 6,
  threshold: 1024,
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  },
}));

// Essential middleware
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Trust proxy for proper IP handling
app.set('trust proxy', 1);

// Add instant response middleware for critical paths
app.use(instantResponseMiddleware);
app.use(criticalPathOptimization);

// Performance monitoring middleware
app.use((req, res, next) => {
  performanceMonitor.trackRequest(req, res, next);
});

// Cache static assets
app.use('/static', express.static('dist/static', {
  maxAge: '1y',
  etag: true,
  lastModified: true,
}));

// Performance tracking middleware
app.use((req, res, next) => {
  const start = Date.now();

  // Add cache headers for API responses
  if (req.path.startsWith('/api') && req.method === 'GET') {
    res.setHeader('Cache-Control', 'public, max-age=300');
  }

  res.on('finish', () => {
    const duration = Date.now() - start;
    // Only log slow requests to reduce noise
    if (duration > 1000) {
      log(`SLOW: ${req.method} ${req.path} ${res.statusCode} in ${duration}ms`);
    }
  });

  next();
});

(async () => {
  try {
    // Step 1: Initialize core services only
    await startupManager.initializeCoreServices();

    // Step 2: Setup minimal documentation
    setupModernDocs(app);

    // Step 3: Register core routes only
    const server = await registerRoutes(app);

    // Step 4: Basic error handling
    app.use((err: any, req: Request, res: Response, next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || 'Internal Server Error';

      res.status(status).json({ message });
      if (status >= 500) {
        console.error('Server error:', err);
      }
    });

    // Step 5: Setup minimal Vite/static serving
    if (app.get('env') === 'development') {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    // Step 6: Start server with core services
    const port = 5000;
    server.listen({
      port,
      host: '0.0.0.0',
      reusePort: true,
    }, async () => {
      log(`Server running on port ${port} with core services`);

      // Initialize response refresh system
      refreshPrecomputedResponses();

      // Step 7: Initialize secondary services after server is running
      setTimeout(async () => {
        try {
          await startupManager.initializeSecondaryServices();

          // Now enable advanced monitoring
          const { monitoringService } = await import('./services/monitoring');
          app.use((err: any, req: Request, res: Response, next: NextFunction) => {
            const status = err.status || err.statusCode || 500;
            const message = err.message || 'Internal Server Error';

            // Record error for monitoring (now available)
            monitoringService.recordError({
              route: req.path,
              method: req.method,
              statusCode: status,
              error: message,
              stack: err.stack,
              requestData: req.body,
              userAgent: req.get('User-Agent'),
              ip: req.ip,
              severity: status >= 500 ? 'high' : 'medium',
              responseTime: 0,
            });

            res.status(status).json({ message });
            if (status >= 500) {
              console.error('Server error:', err);
            }
          });

          log('All services initialized - monitoring enabled');
        } catch (error) {
          log('Some secondary services failed to initialize:', error);
        }
      }, 2000); // Wait 2 seconds before starting secondary services
    });
  } catch (error) {
    log('Failed to start server:', error);
    process.exit(1);
  }
})();
