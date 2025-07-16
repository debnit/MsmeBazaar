// Startup optimization and resource management
import { memoryManager } from './memory-manager';
import { resourceOptimizer } from './resource-optimizer';
import { performanceMonitor } from './performance-monitor';

class StartupOptimizer {
  private static instance: StartupOptimizer;
  private optimizationLevel: 'minimal' | 'standard' | 'aggressive' = 'standard';
  private startupTime: number = Date.now();
  private optimizations: Map<string, boolean> = new Map();

  private constructor() {
    this.detectOptimizationLevel();
    this.applyOptimizations();
  }

  static getInstance(): StartupOptimizer {
    if (!StartupOptimizer.instance) {
      StartupOptimizer.instance = new StartupOptimizer();
    }
    return StartupOptimizer.instance;
  }

  private detectOptimizationLevel(): void {
    const memUsage = process.memoryUsage();
    const availableMemory = memUsage.heapTotal;
    
    // Determine optimization level based on available resources
    if (availableMemory < 100 * 1024 * 1024) { // Less than 100MB
      this.optimizationLevel = 'aggressive';
    } else if (availableMemory < 200 * 1024 * 1024) { // Less than 200MB
      this.optimizationLevel = 'standard';
    } else {
      this.optimizationLevel = 'minimal';
    }

    console.log(`🔧 Optimization level: ${this.optimizationLevel}`);
  }

  private applyOptimizations(): void {
    switch (this.optimizationLevel) {
      case 'aggressive':
        this.applyAggressiveOptimizations();
        break;
      case 'standard':
        this.applyStandardOptimizations();
        break;
      case 'minimal':
        this.applyMinimalOptimizations();
        break;
    }
  }

  private applyAggressiveOptimizations(): void {
    // Aggressive memory management
    memoryManager.clearCache();
    
    // Reduce monitoring frequency
    this.optimizations.set('reducedMonitoring', true);
    
    // Disable non-essential features
    this.optimizations.set('disableNonEssential', true);
    
    // Force garbage collection more frequently
    if (global.gc) {
      setInterval(() => {
        global.gc();
      }, 30000); // Every 30 seconds
    }
    
    // Limit concurrent requests
    process.env.MAX_CONCURRENT_REQUESTS = '10';
    
    console.log('✅ Aggressive optimizations applied');
  }

  private applyStandardOptimizations(): void {
    // Standard memory management
    this.optimizations.set('standardMemory', true);
    
    // Regular garbage collection
    if (global.gc) {
      setInterval(() => {
        global.gc();
      }, 60000); // Every minute
    }
    
    // Moderate monitoring
    this.optimizations.set('moderateMonitoring', true);
    
    console.log('✅ Standard optimizations applied');
  }

  private applyMinimalOptimizations(): void {
    // Light optimizations
    this.optimizations.set('lightOptimizations', true);
    
    // Occasional garbage collection
    if (global.gc) {
      setInterval(() => {
        global.gc();
      }, 120000); // Every 2 minutes
    }
    
    console.log('✅ Minimal optimizations applied');
  }

  public getOptimizationStatus(): any {
    return {
      level: this.optimizationLevel,
      startupTime: Date.now() - this.startupTime,
      optimizations: Object.fromEntries(this.optimizations),
      memoryUsage: process.memoryUsage(),
      uptime: process.uptime(),
    };
  }

  public enableOptimization(name: string): void {
    this.optimizations.set(name, true);
    
    switch (name) {
      case 'aggressiveMemory':
        this.applyAggressiveOptimizations();
        break;
      case 'reducedFeatures':
        this.optimizations.set('disableNonEssential', true);
        break;
      case 'fastGC':
        if (global.gc) {
          setInterval(() => {
            global.gc();
          }, 15000); // Every 15 seconds
        }
        break;
    }
  }

  public disableOptimization(name: string): void {
    this.optimizations.set(name, false);
  }

  public isOptimizationEnabled(name: string): boolean {
    return this.optimizations.get(name) || false;
  }

  public optimizeForMemory(): void {
    console.log('🔧 Optimizing for memory...');
    
    // Clear all caches
    memoryManager.clearCache();
    
    // Force garbage collection
    if (global.gc) {
      global.gc();
    }
    
    // Reduce monitoring frequency
    performanceMonitor.optimizePerformance();
    
    // Set memory optimization flags
    this.optimizations.set('memoryOptimized', true);
    
    console.log('✅ Memory optimization completed');
  }

  public optimizeForSpeed(): void {
    console.log('🔧 Optimizing for speed...');
    
    // Preload critical modules
    this.preloadCriticalModules();
    
    // Increase monitoring frequency for faster response
    this.optimizations.set('speedOptimized', true);
    
    console.log('✅ Speed optimization completed');
  }

  private preloadCriticalModules(): void {
    // Preload commonly used modules
    const criticalModules = [
      './storage',
      './middleware/auth',
      './services/valuation',
      './services/matchmaking',
    ];
    
    criticalModules.forEach(module => {
      try {
        require(module);
      } catch (error) {
        console.warn(`Could not preload module: ${module}`);
      }
    });
  }

  public getRecommendations(): string[] {
    const recommendations = [];
    const memUsage = process.memoryUsage();
    const perfMetrics = performanceMonitor.getCurrentMetrics();
    
    // Memory recommendations
    if (memUsage.heapUsed > 100 * 1024 * 1024) {
      recommendations.push('Consider enabling aggressive memory optimization');
    }
    
    // Performance recommendations
    if (perfMetrics && perfMetrics.responseTime > 1000) {
      recommendations.push('Enable speed optimization to reduce response times');
    }
    
    // Error rate recommendations
    if (perfMetrics && perfMetrics.errorRate > 0.02) {
      recommendations.push('Enable error handling optimization');
    }
    
    return recommendations;
  }

  public applyRecommendations(): void {
    const recommendations = this.getRecommendations();
    
    recommendations.forEach(recommendation => {
      if (recommendation.includes('memory')) {
        this.optimizeForMemory();
      } else if (recommendation.includes('speed')) {
        this.optimizeForSpeed();
      } else if (recommendation.includes('error')) {
        this.enableOptimization('errorHandling');
      }
    });
  }
}

export const startupOptimizer = StartupOptimizer.getInstance();