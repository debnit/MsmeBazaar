// Resource monitoring and automatic optimization
import { EventEmitter } from 'events';
import { memoryManager } from './memory-manager';
import { performanceMonitor } from './performance-monitor';

interface ResourceThresholds {
  memory: {
    warning: number;
    critical: number;
    max: number;
  };
  cpu: {
    warning: number;
    critical: number;
  };
  responseTime: {
    warning: number;
    critical: number;
  };
}

class ResourceMonitor extends EventEmitter {
  private static instance: ResourceMonitor;
  private thresholds: ResourceThresholds;
  private monitoring = false;
  private interval: NodeJS.Timeout | null = null;

  private constructor() {
    super();
    this.thresholds = {
      memory: {
        warning: 200 * 1024 * 1024, // 200MB - increased to reduce warnings
        critical: 300 * 1024 * 1024, // 300MB
        max: 400 * 1024 * 1024, // 400MB
      },
      cpu: {
        warning: 80, // 80%
        critical: 90, // 90%
      },
      responseTime: {
        warning: 2000, // 2s
        critical: 5000, // 5s
      },
    };
  }

  static getInstance(): ResourceMonitor {
    if (!ResourceMonitor.instance) {
      ResourceMonitor.instance = new ResourceMonitor();
    }
    return ResourceMonitor.instance;
  }

  start(): void {
    if (this.monitoring) return;
    
    this.monitoring = true;
    this.interval = setInterval(() => {
      this.checkResources();
    }, 30000); // Check every 30 seconds to reduce overhead
    
    console.log('🔍 Resource monitoring started');
  }

  stop(): void {
    if (!this.monitoring) return;
    
    this.monitoring = false;
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    
    console.log('🛑 Resource monitoring stopped');
  }

  private checkResources(): void {
    const memoryUsage = process.memoryUsage();
    const perfMetrics = performanceMonitor.getCurrentMetrics();
    
    // Check memory
    this.checkMemory(memoryUsage);
    
    // Check performance metrics
    if (perfMetrics) {
      this.checkPerformance(perfMetrics);
    }
  }

  private checkMemory(memoryUsage: NodeJS.MemoryUsage): void {
    const used = memoryUsage.heapUsed;
    
    if (used > this.thresholds.memory.critical) {
      this.emit('critical', {
        type: 'memory',
        message: `Critical memory usage: ${Math.round(used / 1024 / 1024)}MB`,
        value: used,
        threshold: this.thresholds.memory.critical,
      });
      
      // Trigger immediate cleanup
      this.emergencyCleanup();
    } else if (used > this.thresholds.memory.warning) {
      this.emit('warning', {
        type: 'memory',
        message: `High memory usage: ${Math.round(used / 1024 / 1024)}MB`,
        value: used,
        threshold: this.thresholds.memory.warning,
      });
      
      // Trigger gentle cleanup
      this.gentleCleanup();
    }
  }

  private checkPerformance(metrics: any): void {
    // Check response time
    if (metrics.responseTime > this.thresholds.responseTime.critical) {
      this.emit('critical', {
        type: 'responseTime',
        message: `Critical response time: ${metrics.responseTime}ms`,
        value: metrics.responseTime,
        threshold: this.thresholds.responseTime.critical,
      });
    } else if (metrics.responseTime > this.thresholds.responseTime.warning) {
      this.emit('warning', {
        type: 'responseTime',
        message: `Slow response time: ${metrics.responseTime}ms`,
        value: metrics.responseTime,
        threshold: this.thresholds.responseTime.warning,
      });
    }
    
    // Check error rate
    if (metrics.errorRate > 0.1) { // 10%
      this.emit('critical', {
        type: 'errorRate',
        message: `High error rate: ${Math.round(metrics.errorRate * 100)}%`,
        value: metrics.errorRate,
        threshold: 0.1,
      });
    } else if (metrics.errorRate > 0.05) { // 5%
      this.emit('warning', {
        type: 'errorRate',
        message: `Elevated error rate: ${Math.round(metrics.errorRate * 100)}%`,
        value: metrics.errorRate,
        threshold: 0.05,
      });
    }
  }

  private emergencyCleanup(): void {
    // Silent emergency cleanup - removed console.log to reduce noise
    
    // Clear all caches
    memoryManager.clearCache();
    
    // Force garbage collection
    if (global.gc) {
      global.gc();
    }
    
    // Reduce monitoring frequency temporarily
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = setInterval(() => {
        this.checkResources();
      }, 10000); // Reduce to every 10 seconds
      
      // Restore normal frequency after 2 minutes
      setTimeout(() => {
        if (this.interval) {
          clearInterval(this.interval);
          this.interval = setInterval(() => {
            this.checkResources();
          }, 5000);
        }
      }, 120000);
    }
  }

  private gentleCleanup(): void {
    // Silent cleanup - removed console.log to reduce noise
    
    // Clear expired cache entries
    const cacheStats = this.getCacheStats();
    if (cacheStats.utilization > 70) {
      memoryManager.clearCache();
    }
    
    // Optional garbage collection
    if (global.gc && Math.random() < 0.3) { // 30% chance
      global.gc();
    }
  }

  getStatus(): any {
    const memoryUsage = process.memoryUsage();
    const perfMetrics = performanceMonitor.getCurrentMetrics();
    
    return {
      monitoring: this.monitoring,
      memory: {
        used: Math.round(memoryUsage.heapUsed / 1024 / 1024),
        total: Math.round(memoryUsage.heapTotal / 1024 / 1024),
        percentage: Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100),
        status: this.getMemoryStatus(memoryUsage.heapUsed),
      },
      performance: perfMetrics ? {
        responseTime: Math.round(perfMetrics.responseTime),
        errorRate: Math.round(perfMetrics.errorRate * 100),
        activeRequests: perfMetrics.activeRequests,
        status: this.getPerformanceStatus(perfMetrics),
      } : null,
      uptime: Math.round(process.uptime()),
    };
  }

  private getMemoryStatus(used: number): string {
    if (used > this.thresholds.memory.critical) return 'critical';
    if (used > this.thresholds.memory.warning) return 'warning';
    return 'healthy';
  }

  private getPerformanceStatus(metrics: any): string {
    if (metrics.responseTime > this.thresholds.responseTime.critical || 
        metrics.errorRate > 0.1) return 'critical';
    if (metrics.responseTime > this.thresholds.responseTime.warning ||
        metrics.errorRate > 0.05) return 'warning';
    return 'healthy';
  }

  updateThresholds(newThresholds: Partial<ResourceThresholds>): void {
    this.thresholds = { ...this.thresholds, ...newThresholds };
    console.log('📊 Resource thresholds updated');
  }

  // Add method to get cache stats safely
  getCacheStats(): any {
    try {
      return memoryManager.getCacheStats();
    } catch (error) {
      console.warn('Failed to get cache stats:', error.message);
      return {
        entries: 0,
        size: 0,
        maxSize: 0,
        utilization: 0,
        loading: 0,
      };
    }
  }
}

export const resourceMonitor = ResourceMonitor.getInstance();