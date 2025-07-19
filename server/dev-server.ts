import express, { type Request, Response, NextFunction } from 'express';
import cookieParser from 'cookie-parser';
import { registerRoutes } from './routes';
import { setupVite, serveStatic, log } from './vite';
import { setupModernDocs } from './docs/openapi';
import { monitoringService, monitoringMiddleware } from './services/monitoring';

// Development server with full monitoring and security features
export async function startDevServer() {
  const app = express();

  // Basic middleware for development
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  // Trust proxy for rate limiting and security
  app.set('trust proxy', 1);

  // Development monitoring
  app.use(monitoringMiddleware());

  // Performance tracking for development
  app.use((req, res, next) => {
    const start = Date.now();
    const path = req.path;
    let capturedJsonResponse: Record<string, any> | undefined = undefined;

    const originalResJson = res.json;
    res.json = function (bodyJson, ...args) {
      capturedJsonResponse = bodyJson;
      return originalResJson.apply(res, [bodyJson, ...args]);
    };

    res.on('finish', () => {
      const duration = Date.now() - start;
      if (path.startsWith('/api')) {
        let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
        if (capturedJsonResponse) {
          logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
        }

        if (logLine.length > 80) {
          logLine = logLine.slice(0, 79) + '…';
        }

        log(logLine);
      }
    });

    next();
  });

  // Setup documentation
  setupModernDocs(app);

  // Register routes
  const server = await registerRoutes(app);

  // Error handling
  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    console.error(err);
    const status = err.status || err.statusCode || 500;
    const message = err.message || 'Internal Server Error';
    res.status(status).json({ message });
  });

  // Setup Vite
  await setupVite(app, server);

  const PORT = process.env.PORT || 5000;
  server.listen(PORT, '0.0.0.0', () => {
    log(`Server running at http://0.0.0.0:${PORT}`);
    console.log(`📚 API Documentation: http://localhost:${PORT}/api-docs`);
  });

  return server;
}
