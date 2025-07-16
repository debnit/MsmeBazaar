import { EventEmitter } from 'events';

// Monitoring interfaces
export interface HealthMetrics {
  crashRate: number;
  errorRate: number;
  totalErrors: number;
  totalCrashes: number;
  totalRequests: number;
  averageResponseTime: number;
  criticalErrors: number;
  highSeverityErrors: number;
  uptime: number;
  memoryUsage: {
    rss: number;
    heapTotal: number;
    heapUsed: number;
    external: number;
  };
  timestamp: string;
}

export interface ErrorLog {
  id: string;
  timestamp: Date;
  route: string;
  method: string;
  statusCode: number;
  error: string;
  stack?: string;
  requestData?: any;
  userAgent?: string;
  ip?: string;
  userId?: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  responseTime: number;
  resolved: boolean;
}

export interface PerformanceMetric {
  id: string;
  timestamp: Date;
  route: string;
  method: string;
  responseTime: number;
  statusCode: number;
  memoryUsage: number;
  cpuUsage: number;
  activeConnections: number;
}

export interface CrashEvent {
  id: string;
  timestamp: Date;
  error: string;
  stack: string;
  processId: number;
  memoryUsage: any;
  uptime: number;
  restartCount: number;
  severity: 'critical' | 'fatal';
}

// Monitoring service class
class MonitoringService extends EventEmitter {
  private errors: ErrorLog[] = [];
  private crashes: CrashEvent[] = [];
  private performanceMetrics: PerformanceMetric[] = [];
  private startTime: Date = new Date();
  private restartCount: number = 0;
  private nextId: number = 1;
  private requestCount: number = 0;
  private responseTimes: number[] = [];
  private readonly MAX_LOGS = 10000; // Maximum number of logs to keep in memory
  private readonly CLEANUP_INTERVAL = 60000; // 1 minute

  constructor() {
    super();
    this.setupProcessListeners();
    this.startCleanupTimer();
  }

  // Setup process event listeners for crash detection
  private setupProcessListeners() {
    // Uncaught exceptions
    process.on('uncaughtException', (error) => {
      this.recordCrash({
        error: error.message,
        stack: error.stack || '',
        severity: 'fatal'
      });
    });

    // Unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      this.recordCrash({
        error: `Unhandled Rejection: ${reason}`,
        stack: reason instanceof Error ? reason.stack || '' : '',
        severity: 'critical'
      });
    });

    // Process warnings
    process.on('warning', (warning) => {
      this.recordError({
        route: 'system',
        method: 'WARNING',
        statusCode: 0,
        error: warning.message,
        stack: warning.stack,
        severity: 'medium',
        responseTime: 0
      });
    });

    // Memory warnings
    process.on('exit', (code) => {
      if (code !== 0) {
        this.recordCrash({
          error: `Process exited with code ${code}`,
          stack: '',
          severity: 'critical'
        });
      }
    });
  }

  // Start cleanup timer to prevent memory leaks
  private startCleanupTimer() {
    setInterval(() => {
      this.cleanupOldLogs();
    }, this.CLEANUP_INTERVAL);
  }

  // Clean up old logs to prevent memory leaks
  private cleanupOldLogs() {
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    const cutoffTime = new Date(Date.now() - maxAge);

    this.errors = this.errors.filter(log => log.timestamp > cutoffTime);
    this.crashes = this.crashes.filter(log => log.timestamp > cutoffTime);
    this.performanceMetrics = this.performanceMetrics.filter(log => log.timestamp > cutoffTime);

    // Keep only recent response times
    if (this.responseTimes.length > 1000) {
      this.responseTimes = this.responseTimes.slice(-1000);
    }
  }

  // Record an error
  recordError(errorData: Partial<ErrorLog>): void {
    const errorLog: ErrorLog = {
      id: `error_${this.nextId++}`,
      timestamp: new Date(),
      route: errorData.route || 'unknown',
      method: errorData.method || 'unknown',
      statusCode: errorData.statusCode || 500,
      error: errorData.error || 'Unknown error',
      stack: errorData.stack,
      requestData: errorData.requestData,
      userAgent: errorData.userAgent,
      ip: errorData.ip,
      userId: errorData.userId,
      severity: errorData.severity || 'medium',
      responseTime: errorData.responseTime || 0,
      resolved: false
    };

    this.errors.push(errorLog);
    this.emit('error', errorLog);

    // Auto-increment restart count for critical errors
    if (errorLog.severity === 'critical') {
      this.restartCount++;
    }

    // Keep only recent errors
    if (this.errors.length > this.MAX_LOGS) {
      this.errors = this.errors.slice(-this.MAX_LOGS);
    }
  }

  // Record a crash event
  recordCrash(crashData: Partial<CrashEvent>): void {
    const crash: CrashEvent = {
      id: `crash_${this.nextId++}`,
      timestamp: new Date(),
      error: crashData.error || 'Unknown crash',
      stack: crashData.stack || '',
      processId: process.pid,
      memoryUsage: process.memoryUsage(),
      uptime: process.uptime(),
      restartCount: this.restartCount,
      severity: crashData.severity || 'critical'
    };

    this.crashes.push(crash);
    this.emit('crash', crash);
    this.restartCount++;

    // Keep only recent crashes
    if (this.crashes.length > this.MAX_LOGS) {
      this.crashes = this.crashes.slice(-this.MAX_LOGS);
    }
  }

  // Record performance metrics
  recordPerformance(metricData: Partial<PerformanceMetric>): void {
    const metric: PerformanceMetric = {
      id: `perf_${this.nextId++}`,
      timestamp: new Date(),
      route: metricData.route || 'unknown',
      method: metricData.method || 'unknown',
      responseTime: metricData.responseTime || 0,
      statusCode: metricData.statusCode || 200,
      memoryUsage: process.memoryUsage().heapUsed,
      cpuUsage: process.cpuUsage().system,
      activeConnections: metricData.activeConnections || 0
    };

    this.performanceMetrics.push(metric);
    this.responseTimes.push(metric.responseTime);
    this.requestCount++;

    // Keep only recent metrics
    if (this.performanceMetrics.length > this.MAX_LOGS) {
      this.performanceMetrics = this.performanceMetrics.slice(-this.MAX_LOGS);
    }
  }

  // Get comprehensive health metrics
  getHealthMetrics(): HealthMetrics {
    const now = new Date();
    const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    
    // Filter recent data
    const recentErrors = this.errors.filter(e => e.timestamp > hourAgo);
    const recentCrashes = this.crashes.filter(c => c.timestamp > hourAgo);
    const recentPerformance = this.performanceMetrics.filter(p => p.timestamp > hourAgo);
    
    // Calculate error rate
    const totalRequests = recentPerformance.length;
    const totalErrors = recentErrors.length;
    const errorRate = totalRequests > 0 ? (totalErrors / totalRequests) * 100 : 0;
    
    // Calculate crash rate
    const totalCrashes = recentCrashes.length;
    const crashRate = totalRequests > 0 ? (totalCrashes / totalRequests) * 100 : 0;
    
    // Calculate average response time
    const recentResponseTimes = this.responseTimes.slice(-100); // Last 100 requests
    const averageResponseTime = recentResponseTimes.length > 0 
      ? recentResponseTimes.reduce((a, b) => a + b, 0) / recentResponseTimes.length 
      : 0;
    
    // Count critical and high severity errors
    const criticalErrors = recentErrors.filter(e => e.severity === 'critical').length;
    const highSeverityErrors = recentErrors.filter(e => e.severity === 'high').length;
    
    return {
      crashRate,
      errorRate,
      totalErrors,
      totalCrashes,
      totalRequests,
      averageResponseTime,
      criticalErrors,
      highSeverityErrors,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      timestamp: now.toISOString()
    };
  }

  // Get crash rate for specific time period
  getCrashRate(hours: number = 24): number {
    const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);
    const recentCrashes = this.crashes.filter(c => c.timestamp > cutoffTime);
    const recentRequests = this.performanceMetrics.filter(p => p.timestamp > cutoffTime);
    
    return recentRequests.length > 0 ? (recentCrashes.length / recentRequests.length) * 100 : 0;
  }

  // Get errors by route
  getErrorsByRoute(): [string, number][] {
    const errorCounts: { [route: string]: number } = {};
    
    this.errors.forEach(error => {
      errorCounts[error.route] = (errorCounts[error.route] || 0) + 1;
    });
    
    return Object.entries(errorCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
  }

  // Get slow routes
  getSlowRoutes(): { route: string; averageTime: number; requestCount: number }[] {
    const routeStats: { [route: string]: { total: number; count: number } } = {};
    
    this.performanceMetrics.forEach(metric => {
      if (!routeStats[metric.route]) {
        routeStats[metric.route] = { total: 0, count: 0 };
      }
      routeStats[metric.route].total += metric.responseTime;
      routeStats[metric.route].count++;
    });
    
    return Object.entries(routeStats)
      .map(([route, stats]) => ({
        route,
        averageTime: Math.round(stats.total / stats.count),
        requestCount: stats.count
      }))
      .sort((a, b) => b.averageTime - a.averageTime)
      .slice(0, 10);
  }

  // Get recent errors
  getRecentErrors(limit: number = 50): ErrorLog[] {
    return this.errors
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  // Get recent crashes
  getRecentCrashes(limit: number = 20): CrashEvent[] {
    return this.crashes
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  // Get performance trends
  getPerformanceTrends(hours: number = 24): {
    averageResponseTime: number[];
    errorRate: number[];
    memoryUsage: number[];
    timestamps: string[];
  } {
    const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);
    const recentMetrics = this.performanceMetrics.filter(m => m.timestamp > cutoffTime);
    
    // Group by hour
    const hourlyData: { [hour: string]: { responseTime: number[]; errors: number; memory: number[] } } = {};
    
    recentMetrics.forEach(metric => {
      const hour = new Date(metric.timestamp).toISOString().slice(0, 13);
      if (!hourlyData[hour]) {
        hourlyData[hour] = { responseTime: [], errors: 0, memory: [] };
      }
      hourlyData[hour].responseTime.push(metric.responseTime);
      hourlyData[hour].memory.push(metric.memoryUsage);
    });
    
    // Count errors by hour
    this.errors.forEach(error => {
      const hour = new Date(error.timestamp).toISOString().slice(0, 13);
      if (hourlyData[hour]) {
        hourlyData[hour].errors++;
      }
    });
    
    const sortedHours = Object.keys(hourlyData).sort();
    
    return {
      averageResponseTime: sortedHours.map(hour => {
        const times = hourlyData[hour].responseTime;
        return times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0;
      }),
      errorRate: sortedHours.map(hour => {
        const totalRequests = hourlyData[hour].responseTime.length;
        const errors = hourlyData[hour].errors;
        return totalRequests > 0 ? (errors / totalRequests) * 100 : 0;
      }),
      memoryUsage: sortedHours.map(hour => {
        const memory = hourlyData[hour].memory;
        return memory.length > 0 ? memory.reduce((a, b) => a + b, 0) / memory.length : 0;
      }),
      timestamps: sortedHours
    };
  }

  // Mark error as resolved
  resolveError(errorId: string): boolean {
    const error = this.errors.find(e => e.id === errorId);
    if (error) {
      error.resolved = true;
      return true;
    }
    return false;
  }

  // Get system alerts
  getSystemAlerts(): {
    criticalErrors: ErrorLog[];
    highMemoryUsage: boolean;
    slowResponseTimes: boolean;
    highErrorRate: boolean;
    recentCrashes: CrashEvent[];
  } {
    const recentErrors = this.getRecentErrors(100);
    const criticalErrors = recentErrors.filter(e => e.severity === 'critical' && !e.resolved);
    const recentCrashes = this.getRecentCrashes(5);
    const metrics = this.getHealthMetrics();
    
    return {
      criticalErrors,
      highMemoryUsage: metrics.memoryUsage.heapUsed > 500 * 1024 * 1024, // 500MB
      slowResponseTimes: metrics.averageResponseTime > 5000, // 5 seconds
      highErrorRate: metrics.errorRate > 10, // 10%
      recentCrashes
    };
  }

  // Export logs for analysis
  exportLogs(format: 'json' | 'csv' = 'json'): string {
    const data = {
      errors: this.errors,
      crashes: this.crashes,
      performanceMetrics: this.performanceMetrics,
      healthMetrics: this.getHealthMetrics(),
      exportTimestamp: new Date().toISOString()
    };
    
    if (format === 'json') {
      return JSON.stringify(data, null, 2);
    } else {
      // Convert to CSV format (simplified)
      const csvLines = ['timestamp,type,route,error,responseTime,severity'];
      
      this.errors.forEach(error => {
        csvLines.push(`${error.timestamp.toISOString()},error,${error.route},"${error.error}",${error.responseTime},${error.severity}`);
      });
      
      this.crashes.forEach(crash => {
        csvLines.push(`${crash.timestamp.toISOString()},crash,system,"${crash.error}",0,${crash.severity}`);
      });
      
      return csvLines.join('\n');
    }
  }

  // Reset monitoring data
  reset(): void {
    this.errors = [];
    this.crashes = [];
    this.performanceMetrics = [];
    this.responseTimes = [];
    this.requestCount = 0;
    this.restartCount = 0;
    this.startTime = new Date();
  }
}

// Create singleton instance
export const monitoringService = new MonitoringService();

// Express middleware for automatic monitoring
export function monitoringMiddleware() {
  return (req: any, res: any, next: any) => {
    const startTime = Date.now();
    
    // Override res.end to capture response time
    const originalEnd = res.end;
    res.end = function(chunk: any, encoding: any) {
      const responseTime = Date.now() - startTime;
      
      // Record performance metric
      monitoringService.recordPerformance({
        route: req.path,
        method: req.method,
        responseTime,
        statusCode: res.statusCode,
        activeConnections: req.socket?.server?.connections || 0
      });
      
      // Record error if status code indicates error
      if (res.statusCode >= 400) {
        monitoringService.recordError({
          route: req.path,
          method: req.method,
          statusCode: res.statusCode,
          error: `HTTP ${res.statusCode} error`,
          requestData: req.body,
          userAgent: req.get('User-Agent'),
          ip: req.ip,
          userId: req.user?.id,
          severity: res.statusCode >= 500 ? 'high' : 'medium',
          responseTime
        });
      }
      
      originalEnd.call(this, chunk, encoding);
    };
    
    next();
  };
}