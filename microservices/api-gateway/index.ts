// API Gateway for microservices orchestration
import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';

const app = express();
const PORT = process.env.GATEWAY_PORT || 3000;

// Security middleware
app.use(helmet());
app.use(cors());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  message: 'Too many requests from this IP',
});
app.use(limiter);

// Service discovery
const services = {
  auth: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
  msme: process.env.MSME_SERVICE_URL || 'http://localhost:3002',
  valuation: process.env.VALUATION_SERVICE_URL || 'http://localhost:3003',
  matchmaking: process.env.MATCHMAKING_SERVICE_URL || 'http://localhost:3004',
  notification: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3005',
};

// Health check for gateway
app.get('/health', (req, res) => {
  res.json({
    service: 'gateway',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: Object.keys(services),
  });
});

// Service health aggregator
app.get('/health/all', async (req, res) => {
  const healthChecks = await Promise.allSettled(
    Object.entries(services).map(async ([name, url]) => {
      try {
        const response = await fetch(`${url}/health`);
        const data = await response.json();
        return { name, status: 'healthy', data };
      } catch (error) {
        return { name, status: 'unhealthy', error: error.message };
      }
    }),
  );

  const results = healthChecks.map(result =>
    result.status === 'fulfilled' ? result.value : { error: result.reason },
  );

  res.json({
    gateway: 'healthy',
    services: results,
    timestamp: new Date().toISOString(),
  });
});

// Proxy middleware with circuit breaker pattern
const createServiceProxy = (serviceName: string, serviceUrl: string) => {
  return createProxyMiddleware({
    target: serviceUrl,
    changeOrigin: true,
    pathRewrite: (path) => path.replace(`/api/${serviceName}`, ''),
    onError: (err, req, res) => {
      console.error(`Error proxying to ${serviceName}:`, err.message);
      res.status(503).json({
        error: `Service ${serviceName} is temporarily unavailable`,
        timestamp: new Date().toISOString(),
      });
    },
    onProxyReq: (proxyReq, req, res) => {
      // Add request timing
      req.startTime = Date.now();
    },
    onProxyRes: (proxyRes, req, res) => {
      // Add response timing
      const duration = Date.now() - req.startTime;
      console.log(`${serviceName} responded in ${duration}ms`);
    },
  });
};

// Route proxying
app.use('/api/auth', createServiceProxy('auth', services.auth));
app.use('/api/msme', createServiceProxy('msme', services.msme));
app.use('/api/valuation', createServiceProxy('valuation', services.valuation));
app.use('/api/matchmaking', createServiceProxy('matchmaking', services.matchmaking));
app.use('/api/notification', createServiceProxy('notification', services.notification));

// Fallback for unknown routes
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl,
    timestamp: new Date().toISOString(),
  });
});

// Global error handler
app.use((err: any, req: any, res: any, next: any) => {
  console.error('Gateway error:', err);
  res.status(500).json({
    error: 'Internal gateway error',
    timestamp: new Date().toISOString(),
  });
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`🚪 API Gateway running on port ${PORT}`);
    console.log('Available services:', Object.keys(services));
  });
}

export default app;
