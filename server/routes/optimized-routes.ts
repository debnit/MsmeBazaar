// Optimized routes using atomic operations and minimal dependencies
import { Router } from 'express';
import { atomicOperations } from '../utils/atomic-operations';
import { minimalPolling } from '../utils/minimal-polling';
import { hardwareOptimization } from '../utils/hardware-optimization';

const router = Router();

// Atomic user operations
router.post('/api/users/atomic-create', async (req, res) => {
  try {
    const { userData, profileData } = req.body;

    // Use atomic operation instead of separate queries
    const result = await atomicOperations.createUserWithProfile(userData, profileData);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Atomic MSME operations
router.post('/api/msme/atomic-create', async (req, res) => {
  try {
    const { msmeData, valuationData } = req.body;

    // Use atomic operation for MSME + valuation
    const result = await atomicOperations.createMSMEWithValuation(msmeData, valuationData);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Cached data with minimal polling
router.get('/api/cached-data/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const maxAge = parseInt(req.query.maxAge as string) || 300000; // 5 minutes default

    // Try to get cached data first
    const cachedData = minimalPolling.getCachedData(key, maxAge);

    if (cachedData) {
      res.json({
        success: true,
        data: cachedData,
        cached: true,
      });
    } else {
      res.json({
        success: false,
        message: 'Data not available or expired',
        cached: false,
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Hardware-optimized processing
router.post('/api/process-heavy-task', async (req, res) => {
  try {
    const { taskType, data } = req.body;

    // Use hardware optimization for CPU-intensive tasks
    const result = await hardwareOptimization.executeInWorker(taskType, data);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Batch operations for better performance
router.post('/api/batch-update', async (req, res) => {
  try {
    const { updates } = req.body;

    // Use atomic batch operations
    const results = await atomicOperations.batchUpdateListings(updates);

    res.json({
      success: true,
      data: results,
      count: results.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// System optimization status
router.get('/api/optimization-status', async (req, res) => {
  try {
    const status = {
      hardware: hardwareOptimization.getHardwareStatus(),
      polling: minimalPolling.getPollingStatus(),
      timestamp: Date.now(),
    };

    res.json({
      success: true,
      data: status,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export { router as optimizedRoutes };
