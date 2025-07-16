import { Router } from 'express';
import { cacheManager } from '../infrastructure/cache-management';
import { cpuOptimizer } from '../infrastructure/cpu-optimization';
import { processPriorityManager } from '../infrastructure/process-priority';

const router = Router();

// Performance monitoring endpoint
router.get('/performance', (req, res) => {
  const performanceData = {
    system: {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: cpuOptimizer.getCPUStats(),
      resources: processPriorityManager.monitorResourceUsage()
    },
    cache: cacheManager.getCacheStats(),
    timestamp: new Date().toISOString()
  };

  res.json(performanceData);
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