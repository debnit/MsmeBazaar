import { Router } from 'express';
import { startupManager } from '../infrastructure/startup-manager';

const router = Router();

// Essential health check endpoint
router.get('/health', (req, res) => {
  res.setHeader('Cache-Control', 'public, max-age=60');
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '1.0.0',
    services: startupManager.getStatus(),
  });
});

// Service status endpoint
router.get('/services/status', (req, res) => {
  res.json(startupManager.getStatus());
});

// Basic auth endpoints (simplified)
router.post('/auth/login', (req, res) => {
  // Simplified login for startup - full auth loads later
  res.json({
    message: 'Authentication service loading...',
    initialized: startupManager.isServiceInitialized('authentication'),
  });
});

router.get('/auth/me', (req, res) => {
  res.json({
    message: 'User service loading...',
    initialized: startupManager.isServiceInitialized('authentication'),
  });
});

export default router;
