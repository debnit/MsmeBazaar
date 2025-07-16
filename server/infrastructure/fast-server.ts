// Optimized server setup for reduced latency
import express from 'express';
import compression from 'compression';
import { setupVite } from '../vite';
import { setupModernDocs } from '../docs/openapi';
import { registerRoutes } from '../routes';

// Fast server setup with minimal middleware
export async function createFastServer() {
  const app = express();

  // Enable compression for all responses
  app.use(compression({
    level: 6, // Balanced compression level
    threshold: 1024, // Only compress responses > 1KB
    filter: (req, res) => {
      // Skip compression for real-time endpoints
      if (req.path.includes('/socket') || req.path.includes('/stream')) {
        return false;
      }
      return compression.filter(req, res);
    }
  }));

  // Essential middleware only
  app.use(express.json({ limit: '5mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Trust proxy for proper IP handling
  app.set('trust proxy', 1);

  // Basic security headers
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
  });

  // Cache headers for static assets
  app.use('/static', express.static('dist/static', {
    maxAge: '1y',
    etag: true,
    lastModified: true
  }));

  // Cache headers for API responses
  app.use('/api', (req, res, next) => {
    // Cache GET requests for 5 minutes
    if (req.method === 'GET') {
      res.setHeader('Cache-Control', 'public, max-age=300');
    }
    next();
  });

  // Performance monitoring with minimal overhead
  app.use((req, res, next) => {
    const start = process.hrtime.bigint();
    
    res.on('finish', () => {
      const duration = Number(process.hrtime.bigint() - start) / 1000000;
      if (duration > 1000) { // Log only slow requests
        console.warn(`Slow request: ${req.method} ${req.path} - ${duration.toFixed(2)}ms`);
      }
    });
    
    next();
  });

  // Setup documentation
  setupModernDocs(app);

  // Register API routes
  const server = await registerRoutes(app);

  // Setup Vite in development
  if (process.env.NODE_ENV !== 'production') {
    await setupVite(app, server);
  }

  return server;
}

// Optimized startup sequence
export async function startServer() {
  const startTime = Date.now();
  
  try {
    console.log('🚀 Starting MSMESquare server...');
    
    const server = await createFastServer();
    const PORT = process.env.PORT || 5000;
    
    server.listen(PORT, '0.0.0.0', () => {
      const duration = Date.now() - startTime;
      console.log(`✅ Server running at http://0.0.0.0:${PORT} (startup: ${duration}ms)`);
      console.log(`📚 API Documentation: http://localhost:${PORT}/api-docs`);
    });

    return server;
  } catch (error) {
    console.error('❌ Server startup failed:', error);
    process.exit(1);
  }
}