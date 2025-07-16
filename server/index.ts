import express, { type Request, Response, NextFunction } from "express";
import cookieParser from "cookie-parser";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { setupModernDocs } from "./docs/openapi";
import { monitoringService, monitoringMiddleware } from "./services/monitoring";

// Infrastructure imports
import { initializeSentry, setupMonitoring } from "./infrastructure/monitoring";
import { queueManager } from "./infrastructure/queue";
import { mlScheduler } from "./infrastructure/scheduler";
import { 
  securityHeaders, 
  subscriptionBasedRateLimit, 
  abuseDetection, 
  ipProtection, 
  auditLogger 
} from "./middleware/security";
import { circuitBreakers } from "./infrastructure/scaling";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// Performance monitoring middleware
app.use(monitoringMiddleware());

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Setup modern OpenAPI 3.0 documentation
  setupModernDocs(app);
  
  const server = await registerRoutes(app);

  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    // Record error for monitoring
    monitoringService.recordError({
      route: req.path,
      method: req.method,
      statusCode: status,
      error: message,
      stack: err.stack,
      requestData: req.body,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      severity: status >= 500 ? 'high' : 'medium',
      responseTime: 0
    });

    res.status(status).json({ message });
    // Don't re-throw error as it will crash the server
    if (status >= 500) {
      console.error('Server error:', err);
    }
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
    log(`monitoring enabled - crash detection active`);
  });
})();
