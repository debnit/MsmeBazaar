// Resource optimization and performance monitoring
import { memoryManager } from './memory-manager';

class ResourceOptimizer {
  private static instance: ResourceOptimizer;
  private resourceMonitor: NodeJS.Timeout | null = null;
  private performanceMetrics = {
    cpuUsage: 0,
    memoryUsage: 0,
    requestCount: 0,
    errorCount: 0,
    avgResponseTime: 0,
  };

  private constructor() {
    this.initializeOptimization();
  }

  static getInstance(): ResourceOptimizer {
    if (!ResourceOptimizer.instance) {
      ResourceOptimizer.instance = new ResourceOptimizer();
    }
    return ResourceOptimizer.instance;
  }

  private initializeOptimization(): void {
    // Set process priority if possible
    try {
      process.setMaxListeners(50);

      // Optimize garbage collection
      if (process.env.NODE_ENV === 'production') {
        process.on('warning', (warning) => {
          console.warn('Performance warning:', warning.message);
        });
      }
    } catch (error) {
      console.warn('Could not set process optimizations:', error.message);
    }

    this.startResourceMonitoring();
  }

  private startResourceMonitoring(): void {
    this.resourceMonitor = setInterval(() => {
      this.updateMetrics();
      this.optimizeResources();
    }, 5000); // Check every 5 seconds
  }

  private updateMetrics(): void {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    this.performanceMetrics.memoryUsage = memUsage.heapUsed;
    this.performanceMetrics.cpuUsage = (cpuUsage.user + cpuUsage.system) / 1000000; // Convert to seconds
  }

  private optimizeResources(): void {
    // Memory optimization - increased threshold
    if (this.performanceMetrics.memoryUsage > 400 * 1024 * 1024) { // 400MB threshold
      this.optimizeMemory();
    }

    // CPU optimization
    if (this.performanceMetrics.cpuUsage > 80) { // 80% CPU usage
      this.optimizeCPU();
    }
  }

  private optimizeMemory(): void {
    // Force garbage collection
    memoryManager.clearCache();

    // Clear require cache for development (skip if not available)
    if (process.env.NODE_ENV === 'development') {
      try {
        this.clearRequireCache();
      } catch (error) {
        // Silently continue if require cache clearing fails
      }
    }

    // Optimize event listeners
    this.optimizeEventListeners();
  }

  private optimizeCPU(): void {
    // Reduce polling frequency
    if (this.resourceMonitor) {
      clearInterval(this.resourceMonitor);
      this.resourceMonitor = setInterval(() => {
        this.updateMetrics();
        this.optimizeResources();
      }, 10000); // Increase interval to 10 seconds
    }
  }

  private clearRequireCache(): void {
    // Skip require cache clearing in ES modules environment
    try {
      if (typeof require !== 'undefined' && require.cache) {
        // Clear non-essential modules from require cache
        const excludePatterns = [
          /node_modules/,
          /\.json$/,
          /server\/db/,
          /server\/auth/,
        ];

        Object.keys(require.cache).forEach(key => {
          if (!excludePatterns.some(pattern => pattern.test(key))) {
            delete require.cache[key];
          }
        });
      }
    } catch (error) {
      // Silently skip if require is not available (ES modules)
      console.debug('Require cache clearing not available in ES modules');
    }
  }

  private optimizeEventListeners(): void {
    // Remove excessive event listeners
    const eventEmitters = [process];

    eventEmitters.forEach(emitter => {
      const listenerCount = emitter.listenerCount('error');
      if (listenerCount > 10) {
        emitter.removeAllListeners('error');
        emitter.on('error', (error) => {
          console.error('Optimized error handler:', error);
        });
      }
    });
  }

  public async optimizeRequest(req: any, res: any, next: any): Promise<void> {
    const start = Date.now();

    // Add request tracking
    this.performanceMetrics.requestCount++;

    // Optimize request handling
    req.startTime = start;

    // Add response optimization
    res.on('finish', () => {
      const duration = Date.now() - start;
      this.performanceMetrics.avgResponseTime =
        (this.performanceMetrics.avgResponseTime + duration) / 2;
    });

    next();
  }

  public getPerformanceMetrics(): any {
    return {
      ...this.performanceMetrics,
      memoryStats: memoryManager.getMemoryStats(),
      uptime: process.uptime(),
    };
  }

  public destroy(): void {
    if (this.resourceMonitor) {
      clearInterval(this.resourceMonitor);
    }
  }
}

export const resourceOptimizer = ResourceOptimizer.getInstance();
