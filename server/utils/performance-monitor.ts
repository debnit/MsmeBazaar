// Performance monitoring and optimization
import { EventEmitter } from 'events';
import { memoryManager } from './memory-manager';
import { resourceOptimizer } from './resource-optimizer';

interface PerformanceMetrics {
  timestamp: number;
  memoryUsage: NodeJS.MemoryUsage;
  cpuUsage: NodeJS.CpuUsage;
  activeRequests: number;
  responseTime: number;
  errorRate: number;
}

class PerformanceMonitor extends EventEmitter {
  private static instance: PerformanceMonitor;
  private metrics: PerformanceMetrics[] = [];
  private activeRequests = 0;
  private totalRequests = 0;
  private totalErrors = 0;
  private responseTimes: number[] = [];
  private monitoringInterval: NodeJS.Timeout | null = null;
  private alertThresholds = {
    memory: 800 * 1024 * 1024, // 800MB - much higher to reduce warnings
    cpu: 95, // 95%
    errorRate: 0.15, // 15%
    responseTime: 10000, // 10 seconds
  };

  private constructor() {
    super();
    this.startMonitoring();
  }

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  private startMonitoring(): void {
    this.monitoringInterval = setInterval(() => {
      this.collectMetrics();
      this.checkAlerts();
    }, 60000); // Monitor every minute - much less aggressive
  }

  private collectMetrics(): void {
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    const metrics: PerformanceMetrics = {
      timestamp: Date.now(),
      memoryUsage,
      cpuUsage,
      activeRequests: this.activeRequests,
      responseTime: this.getAverageResponseTime(),
      errorRate: this.totalRequests > 0 ? this.totalErrors / this.totalRequests : 0,
    };

    this.metrics.push(metrics);
    
    // Keep only last 100 metrics
    if (this.metrics.length > 100) {
      this.metrics.shift();
    }

    // Emit metrics event
    this.emit('metrics', metrics);
  }

  private checkAlerts(): void {
    const currentMetrics = this.metrics[this.metrics.length - 1];
    if (!currentMetrics) return;

    // Memory alert
    if (currentMetrics.memoryUsage.heapUsed > this.alertThresholds.memory) {
      this.emit('alert', {
        type: 'memory',
        message: `High memory usage: ${Math.round(currentMetrics.memoryUsage.heapUsed / 1024 / 1024)}MB`,
        severity: 'high',
        value: currentMetrics.memoryUsage.heapUsed,
        threshold: this.alertThresholds.memory,
      });
    }

    // Error rate alert
    if (currentMetrics.errorRate > this.alertThresholds.errorRate) {
      this.emit('alert', {
        type: 'errorRate',
        message: `High error rate: ${Math.round(currentMetrics.errorRate * 100)}%`,
        severity: 'high',
        value: currentMetrics.errorRate,
        threshold: this.alertThresholds.errorRate,
      });
    }

    // Response time alert
    if (currentMetrics.responseTime > this.alertThresholds.responseTime) {
      this.emit('alert', {
        type: 'responseTime',
        message: `Slow response time: ${currentMetrics.responseTime}ms`,
        severity: 'medium',
        value: currentMetrics.responseTime,
        threshold: this.alertThresholds.responseTime,
      });
    }
  }

  private getAverageResponseTime(): number {
    if (this.responseTimes.length === 0) return 0;
    
    const sum = this.responseTimes.reduce((a, b) => a + b, 0);
    return sum / this.responseTimes.length;
  }

  public trackRequest(req: any, res: any, next: any): void {
    const startTime = Date.now();
    this.activeRequests++;
    this.totalRequests++;

    res.on('finish', () => {
      const duration = Date.now() - startTime;
      this.activeRequests--;
      
      this.responseTimes.push(duration);
      
      // Keep only last 100 response times
      if (this.responseTimes.length > 100) {
        this.responseTimes.shift();
      }

      // Track errors
      if (res.statusCode >= 400) {
        this.totalErrors++;
      }
    });

    next();
  }

  public getMetrics(): PerformanceMetrics[] {
    return [...this.metrics];
  }

  public getCurrentMetrics(): PerformanceMetrics | null {
    return this.metrics[this.metrics.length - 1] || null;
  }

  public getHealthStatus(): any {
    const current = this.getCurrentMetrics();
    if (!current) return { status: 'unknown' };

    const memoryPercent = (current.memoryUsage.heapUsed / current.memoryUsage.heapTotal) * 100;
    const isHealthy = 
      current.memoryUsage.heapUsed < this.alertThresholds.memory &&
      current.errorRate < this.alertThresholds.errorRate &&
      current.responseTime < this.alertThresholds.responseTime;

    return {
      status: isHealthy ? 'healthy' : 'degraded',
      metrics: {
        memory: {
          used: Math.round(current.memoryUsage.heapUsed / 1024 / 1024),
          total: Math.round(current.memoryUsage.heapTotal / 1024 / 1024),
          percent: Math.round(memoryPercent),
        },
        cpu: {
          usage: Math.round(current.cpuUsage.user / 1000000), // Convert to seconds
        },
        requests: {
          active: current.activeRequests,
          total: this.totalRequests,
          errorRate: Math.round(current.errorRate * 100),
        },
        performance: {
          avgResponseTime: Math.round(current.responseTime),
          uptime: Math.round(process.uptime()),
        },
      },
      alerts: this.getActiveAlerts(),
    };
  }

  private getActiveAlerts(): any[] {
    const current = this.getCurrentMetrics();
    if (!current) return [];

    const alerts = [];

    if (current.memoryUsage.heapUsed > this.alertThresholds.memory) {
      alerts.push({
        type: 'memory',
        severity: 'high',
        message: 'High memory usage detected',
      });
    }

    if (current.errorRate > this.alertThresholds.errorRate) {
      alerts.push({
        type: 'errorRate',
        severity: 'high',
        message: 'High error rate detected',
      });
    }

    if (current.responseTime > this.alertThresholds.responseTime) {
      alerts.push({
        type: 'responseTime',
        severity: 'medium',
        message: 'Slow response time detected',
      });
    }

    return alerts;
  }

  public optimizePerformance(): void {
    const current = this.getCurrentMetrics();
    if (!current) return;

    // Trigger memory cleanup if needed
    if (current.memoryUsage.heapUsed > this.alertThresholds.memory * 0.8) {
      memoryManager.clearCache();
      
      if (global.gc) {
        global.gc();
      }
    }

    // Trigger resource optimization
    const perfMetrics = resourceOptimizer.getPerformanceMetrics();
    if (perfMetrics.memoryUsage > this.alertThresholds.memory * 0.8) {
      // Reduce monitoring frequency temporarily
      if (this.monitoringInterval) {
        clearInterval(this.monitoringInterval);
        this.monitoringInterval = setInterval(() => {
          this.collectMetrics();
          this.checkAlerts();
        }, 10000); // Reduce to every 10 seconds
      }
    }
  }

  public destroy(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
    this.removeAllListeners();
  }
}

export const performanceMonitor = PerformanceMonitor.getInstance();