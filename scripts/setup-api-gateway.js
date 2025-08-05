import fs from "fs";
import path from "path";

const baseDir = path.resolve("api-gateway");
const srcDir = path.join(baseDir, "src");

const folders = [
  "src/routes",
  "src/middlewares",
  "src/clients",
  "src/utils",
  "src/config",
  "src/services",
  "tests/integration",
  "tests/unit"
];

// Create directories
folders.forEach(folder => {
  const dirPath = path.join(baseDir, folder);
  fs.mkdirSync(dirPath, { recursive: true });
  console.log(`📁 Created folder: ${dirPath}`);
});

// ===== src/index.ts =====
const indexContent = `import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import dotenv from 'dotenv';
import { limiter } from './middlewares/rateLimiter';
import { correlationId } from './middlewares/correlationId';
import { errorHandler } from './middlewares/errorHandler';
import { config } from './config/env';
import serviceRoutes from './routes/serviceRoutes';
import { logger } from './utils/logger';

dotenv.config();

const app = express();

app.use(helmet());

// Restrictive CORS for your frontend domains, set allowed origins accordingly
const allowedOrigins = [process.env.FRONTEND_URL || 'http://localhost:3000'];
app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));

app.use(express.json());

app.use(limiter);

app.use(correlationId);

app.use('/api', serviceRoutes);

app.get('/health', (req, res) => {
  res.json({
    service: 'gateway',
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

app.use(errorHandler);

app.listen(config.gatewayPort, () => {
  logger.info(\`🚪 API Gateway running on port \${config.gatewayPort}\`);
});

export default app;
`;

// ===== src/config/env.ts =====
const envContent = `import dotenv from 'dotenv-safe';
dotenv.config();

export const config = {
  gatewayPort: Number(process.env.GATEWAY_PORT) || 3000,
  jwtSecret: process.env.JWT_SECRET || 'changeme',
  requestTimeoutMs: Number(process.env.REQUEST_TIMEOUT_MS) || 8000,
};
`;

// ===== src/middlewares/auth.ts =====
const authContent = `import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';

export interface AuthenticatedRequest extends Request {
  user?: any;
}

export function verifyJwt(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Missing token' });
  }

  try {
    const payload = jwt.verify(token, config.jwtSecret);
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}
`;

// ===== src/middlewares/rateLimiter.ts =====
const rateLimiterContent = `import rateLimit from 'express-rate-limit';

export const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000,
  message: 'Too many requests from this IP, please try again later.'
});
`;

// ===== src/middlewares/correlationId.ts =====
const correlationIdContent = `import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

export function correlationId(req: Request, res: Response, next: NextFunction) {
  const requestId = req.header('X-Request-ID') || uuidv4();
  req.headers['X-Request-ID'] = requestId;
  res.setHeader('X-Request-ID', requestId);
  next();
}
`;

// ===== src/middlewares/errorHandler.ts =====
const errorHandlerContent = `import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  logger.error({
    msg: 'API Gateway error',
    error: err.message,
    stack: err.stack,
    path: req.originalUrl,
    requestId: req.headers['X-Request-ID']
  });

  res.status(err.status || 500).json({
    error: err.message || 'Internal gateway error',
    requestId: req.headers['X-Request-ID'],
    timestamp: new Date().toISOString()
  });
}
`;

// ===== src/services/circuitBreaker.ts =====
const circuitBreakerContent = `import CircuitBreaker from 'opossum';

export function createCircuitBreaker(fn: (...args: any[]) => Promise<any>) {
  return new CircuitBreaker(fn, {
    timeout: 8000,
    errorThresholdPercentage: 50,
    resetTimeout: 30000,
  });
}
`;

// ===== src/routes/serviceRoutes.ts =====
const serviceRoutesContent = `import { Router } from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { verifyJwt } from '../middlewares/auth';
import { createCircuitBreaker } from '../services/circuitBreaker';
import { logger } from '../utils/logger';

const router = Router();

const services: Record<string, string> = {
  auth: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
  msme: process.env.MSME_SERVICE_URL || 'http://localhost:3002',
  valuation: process.env.VALUATION_SERVICE_URL || 'http://localhost:3003',
  matchmaking: process.env.MATCHMAKING_SERVICE_URL || 'http://localhost:3004',
  notification: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3005',
};

// Helper to wrap proxy with circuit breaker
function createServiceProxy(serviceName: string, serviceUrl: string) {
  const proxy = createProxyMiddleware({
    target: serviceUrl,
    changeOrigin: true,
    pathRewrite: (path) => path.replace(new RegExp(\`^/api/\${serviceName}\`), ''),
    timeout: 7000,
    onError: (err, req, res) => {
      logger.error(\`[Proxy Error] \${serviceName}: \${err.message}\`);
      if (!res.headersSent) {
        res.status(503).json({
          error: \`Service \${serviceName} temporarily unavailable\`,
          requestId: req.headers['X-Request-ID'],
          timestamp: new Date().toISOString()
        });
      }
    },
    onProxyReq: (proxyReq, req: any) => {
      req.startTime = Date.now();
    },
    onProxyRes: (proxyRes, req: any) => {
      const duration = Date.now() - req.startTime;
      logger.info(\`\${serviceName} responded in \${duration}ms\`, {
        requestId: req.headers['X-Request-ID']
      });
    },
  });

  const breaker = createCircuitBreaker((req: any, res: any) => {
    return new Promise((resolve, reject) => {
      proxy(req, res, (err) => {
        if (err) reject(err);
        else resolve(null);
      });
    });
  });

  return (req: any, res: any, next: any) => {
    breaker.fire(req, res).catch(next);
  };
}

// Public routes (auth)
router.use('/auth', createServiceProxy('auth', services.auth));

// Protected routes require JWT auth
router.use('/msme', verifyJwt, createServiceProxy('msme', services.msme));
router.use('/valuation', verifyJwt, createServiceProxy('valuation', services.valuation));
router.use('/matchmaking', verifyJwt, createServiceProxy('matchmaking', services.matchmaking));
router.use('/notification', verifyJwt, createServiceProxy('notification', services.notification));

export default router;
`;

// ===== src/utils/logger.ts =====
const loggerContent = `import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  base: null, // remove pid, hostname from logs
  timestamp: () => \`, "time":"\${new Date().toISOString()}"\`
});
`;

// ===== src/clients/authClient.ts =====
const authClientContent = `import axios from 'axios';
const baseURL = process.env.AUTH_SERVICE_URL || 'http://localhost:3001';
export const authClient = axios.create({ baseURL, timeout: 5000 });
`;

// ===== src/clients/msmeClient.ts =====
const msmeClientContent = `import axios from 'axios';
const baseURL = process.env.MSME_SERVICE_URL || 'http://localhost:3002';
export const msmeClient = axios.create({ baseURL, timeout: 5000 });
`;

// Write all files
fs.writeFileSync(path.join(srcDir, "index.ts"), indexContent);
fs.writeFileSync(path.join(srcDir, "config/env.ts"), envContent);
fs.writeFileSync(path.join(srcDir, "middlewares/auth.ts"), authContent);
fs.writeFileSync(path.join(srcDir, "middlewares/rateLimiter.ts"), rateLimiterContent);
fs.writeFileSync(path.join(srcDir, "middlewares/correlationId.ts"), correlationIdContent);
fs.writeFileSync(path.join(srcDir, "middlewares/errorHandler.ts"), errorHandlerContent);
fs.writeFileSync(path.join(srcDir, "services/circuitBreaker.ts"), circuitBreakerContent);
fs.writeFileSync(path.join(srcDir, "routes/serviceRoutes.ts"), serviceRoutesContent);
fs.writeFileSync(path.join(srcDir, "utils/logger.ts"), loggerContent);
fs.writeFileSync(path.join(srcDir, "clients/authClient.ts"), authClientContent);
fs.writeFileSync(path.join(srcDir, "clients/msmeClient.ts"), msmeClientContent);

console.log("✅ API Gateway scaffolding complete with production-grade code!");
