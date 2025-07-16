import { Router } from 'express';
import { cacheManager } from '../infrastructure/cache-management';
import { cpuOptimizer } from '../infrastructure/cpu-optimization';
import { processPriorityManager } from '../infrastructure/process-priority';
import { startupManager } from '../infrastructure/startup-manager';

const router = Router();

// Comprehensive performance monitoring endpoint
router.get('/performance', async (req, res) => {
  try {
    const performanceData = {
      system: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        cpu: cpuOptimizer.getCPUStats(),
        resources: processPriorityManager.monitorResourceUsage()
      },
      cache: cacheManager.getCacheStats(),
      services: startupManager.getStatus(),
      threads: startupManager.getThreadInfo(),
      optimizations: {
        missionCriticalMode: true,
        processId: process.pid,
        priority: process.getpriority(process.pid),
        cpuCores: require('os').cpus().length,
        advancedOptimizations: 'enabled'
      },
      timestamp: new Date().toISOString()
    };

    res.json(performanceData);
  } catch (error) {
    res.status(500).json({ error: 'Performance monitoring error' });
  }
});

// Advanced performance stats endpoint
router.get('/performance/advanced', async (req, res) => {
  try {
    // Try to get advanced performance stats
    const { advancedPerformanceOptimizer } = await import('../infrastructure/advanced-performance');
    const advancedStats = advancedPerformanceOptimizer.getPerformanceStats();
    
    res.json({
      ...advancedStats,
      timestamp: new Date().toISOString(),
      mode: 'mission-critical'
    });
  } catch (error) {
    res.json({
      message: 'Advanced performance monitoring not available',
      basicStats: {
        memory: process.memoryUsage(),
        uptime: process.uptime(),
        pid: process.pid
      }
    });
  }
});

// Cache management endpoints
router.post('/cache/clear', (req, res) => {
  cacheManager.clearAllCaches();
  res.json({ 
    success: true, 
    message: 'All caches cleared successfully' 
  });
});

router.get('/cache/stats', (req, res) => {
  const stats = cacheManager.getCacheStats();
  res.json(stats);
});

// CPU optimization endpoints
router.get('/cpu/stats', (req, res) => {
  const stats = cpuOptimizer.getCPUStats();
  res.json(stats);
});

// Process priority optimization
router.post('/process/optimize/:workload', (req, res) => {
  const { workload } = req.params;
  
  if (!['cpu-intensive', 'io-intensive', 'balanced'].includes(workload)) {
    return res.status(400).json({ 
      error: 'Invalid workload type' 
    });
  }
  
  processPriorityManager.optimizeForWorkload(workload as any);
  res.json({ 
    success: true, 
    message: `Optimized for ${workload} workload` 
  });
});

export default router;