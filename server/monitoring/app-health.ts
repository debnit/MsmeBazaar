// Application health monitoring and crash detection
import { performanceMonitor } from '../utils/performance-monitor';
import { memoryManager } from '../utils/memory-manager';
import { resourceOptimizer } from '../utils/resource-optimizer';
import { errorHandler } from '../utils/error-handler';

interface HealthReport {
  timestamp: string;
  status: 'healthy' | 'degraded' | 'critical';
  services: {
    name: string;
    status: 'up' | 'down' | 'degraded';
    lastCheck: string;
    responseTime?: number;
    errorRate?: number;
  }[];
  metrics: {
    memory: {
      used: number;
      total: number;
      percentage: number;
    };
    cpu: {
      usage: number;
      cores: number;
    };
    requests: {
      total: number;
      active: number;
      errorRate: number;
    };
    uptime: number;
  };
  alerts: {
    level: 'info' | 'warning' | 'error' | 'critical';
    message: string;
    timestamp: string;
  }[];
}

class AppHealthMonitor {
  private static instance: AppHealthMonitor;
  private healthChecks: Map<string, () => Promise<boolean>> = new Map();
  private lastHealthReport: HealthReport | null = null;
  private healthCheckInterval: NodeJS.Timeout | null = null;

  private constructor() {
    this.setupHealthChecks();
    this.startHealthMonitoring();
  }

  static getInstance(): AppHealthMonitor {
    if (!AppHealthMonitor.instance) {
      AppHealthMonitor.instance = new AppHealthMonitor();
    }
    return AppHealthMonitor.instance;
  }

  private setupHealthChecks(): void {
    // Database health check
    this.healthChecks.set('database', async () => {
      try {
        const { db } = await import('../db');
        await db.execute('SELECT 1');
        return true;
      } catch (error) {
        console.error('Database health check failed:', error);
        return false;
      }
    });

    // Memory health check
    this.healthChecks.set('memory', async () => {
      const memStats = memoryManager.getMemoryStats();
      const threshold = 200 * 1024 * 1024; // 200MB
      return memStats.heapUsed < threshold;
    });

    // Performance health check
    this.healthChecks.set('performance', async () => {
      const metrics = performanceMonitor.getCurrentMetrics();
      if (!metrics) return true;
      
      return metrics.responseTime < 2000 && metrics.errorRate < 0.05;
    });

    // Service health check
    this.healthChecks.set('services', async () => {
      try {
        const { startupManager } = await import('../infrastructure/startup-manager');
        const status = startupManager.getStatus();
        return status.coreInitialized && status.totalInitialized >= 4;
      } catch (error) {
        return false;
      }
    });
  }

  private startHealthMonitoring(): void {
    this.healthCheckInterval = setInterval(async () => {
      const report = await this.generateHealthReport();
      this.lastHealthReport = report;
      
      // Handle critical issues
      if (report.status === 'critical') {
        this.handleCriticalIssues(report);
      }
    }, 30000); // Check every 30 seconds
  }

  private async generateHealthReport(): Promise<HealthReport> {
    const timestamp = new Date().toISOString();
    const services = [];
    const alerts = [];

    // Run all health checks
    for (const [name, check] of this.healthChecks) {
      const startTime = Date.now();
      try {
        const isHealthy = await check();
        const responseTime = Date.now() - startTime;
        
        services.push({
          name,
          status: isHealthy ? 'up' : 'down',
          lastCheck: timestamp,
          responseTime,
        });

        if (!isHealthy) {
          alerts.push({
            level: 'error' as const,
            message: `Service ${name} is down`,
            timestamp,
          });
        }
      } catch (error) {
        services.push({
          name,
          status: 'down',
          lastCheck: timestamp,
        });

        alerts.push({
          level: 'critical' as const,
          message: `Health check failed for ${name}: ${error.message}`,
          timestamp,
        });
      }
    }

    // Get system metrics
    const memoryUsage = process.memoryUsage();
    const perfMetrics = performanceMonitor.getCurrentMetrics();
    
    const metrics = {
      memory: {
        used: Math.round(memoryUsage.heapUsed / 1024 / 1024),
        total: Math.round(memoryUsage.heapTotal / 1024 / 1024),
        percentage: Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100),
      },
      cpu: {
        usage: perfMetrics ? Math.round(perfMetrics.cpuUsage.user / 1000000) : 0,
        cores: require('os').cpus().length,
      },
      requests: {
        total: perfMetrics ? 1000 : 0, // Placeholder
        active: perfMetrics ? perfMetrics.activeRequests : 0,
        errorRate: perfMetrics ? Math.round(perfMetrics.errorRate * 100) : 0,
      },
      uptime: Math.round(process.uptime()),
    };

    // Add memory alerts
    if (metrics.memory.percentage > 80) {
      alerts.push({
        level: 'warning',
        message: `High memory usage: ${metrics.memory.percentage}%`,
        timestamp,
      });
    }

    if (metrics.memory.percentage > 90) {
      alerts.push({
        level: 'critical',
        message: `Critical memory usage: ${metrics.memory.percentage}%`,
        timestamp,
      });
    }

    // Determine overall status
    const criticalAlerts = alerts.filter(a => a.level === 'critical');
    const downServices = services.filter(s => s.status === 'down');
    
    let status: 'healthy' | 'degraded' | 'critical' = 'healthy';
    
    if (criticalAlerts.length > 0 || downServices.length > 2) {
      status = 'critical';
    } else if (downServices.length > 0 || alerts.length > 0) {
      status = 'degraded';
    }

    return {
      timestamp,
      status,
      services,
      metrics,
      alerts,
    };
  }

  private handleCriticalIssues(report: HealthReport): void {
    console.error('🚨 Critical health issues detected:', report.alerts);
    
    // Trigger emergency optimization
    try {
      memoryManager.clearCache();
      resourceOptimizer.optimizePerformance();
      
      if (global.gc) {
        global.gc();
      }
    } catch (error) {
      console.error('Emergency optimization failed:', error);
    }

    // If too many critical issues, trigger graceful restart
    const criticalCount = report.alerts.filter(a => a.level === 'critical').length;
    if (criticalCount >= 3) {
      console.error('Too many critical issues, initiating graceful restart...');
      this.initiateGracefulRestart();
    }
  }

  private initiateGracefulRestart(): void {
    // Give current requests time to complete
    setTimeout(() => {
      process.exit(1);
    }, 5000);
  }

  public getHealthReport(): HealthReport | null {
    return this.lastHealthReport;
  }

  public async forceHealthCheck(): Promise<HealthReport> {
    const report = await this.generateHealthReport();
    this.lastHealthReport = report;
    return report;
  }

  public addHealthCheck(name: string, check: () => Promise<boolean>): void {
    this.healthChecks.set(name, check);
  }

  public removeHealthCheck(name: string): void {
    this.healthChecks.delete(name);
  }

  public destroy(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
  }
}

export const appHealthMonitor = AppHealthMonitor.getInstance();
export { HealthReport };