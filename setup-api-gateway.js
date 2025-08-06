/**
 * API Gateway scaffolding script for MSMEBazaar
 * Creates full production-ready folder & file structure
 * Fixes TS/env issues for seamless `ts-node` usage
 */

import fs from "fs";
import path from "path";

// ====== Paths ======
const baseDir = path.resolve("api-gateway");
const srcDir = path.join(baseDir, "src");
const typesDir = path.join(srcDir, "types");

// ====== Ensure folder structure ======
[
  "src/routes",
  "src/middlewares",
  "src/clients",
  "src/utils",
  "src/config",
  "src/services",
  "tests/integration",
  "tests/unit",
  "src/types"
].forEach(folder => fs.mkdirSync(path.join(baseDir, folder), { recursive: true }));

// ====== 1. Shim for opossum ======
fs.writeFileSync(
  path.join(typesDir, "opossum.d.ts"),
  `declare module "opossum";\n`
);

// ====== 2. Services config ======
const services = {
  auth: "AUTH_SERVICE_URL",
  msme: "MSME_SERVICE_URL",
  valuation: "VALUATION_SERVICE_URL",
  matchmaking: "MATCHMAKING_SERVICE_URL",
  notification: "NOTIFICATION_SERVICE_URL",
  admin: "ADMIN_SERVICE_URL",
  compliance: "COMPLIANCE_SERVICE_URL",
  eaasservice: "EAAS_SERVICE_URL",
  gamificationservice: "GAMIFICATION_SERVICE_URL",
  loanservice: "LOAN_SERVICE_URL",
  mlmonitoringservice: "ML_MONITORING_SERVICE_URL",
  msmelistingservice: "MSME_LISTING_SERVICE_URL",
  nbfcservice: "NBFC_SERVICE_URL",
  paymentservice: "PAYMENT_SERVICE_URL",
  recommendationservice: "RECOMMENDATION_SERVICE_URL",
  searchmatchmakingservice: "SEARCH_MATCHMAKING_SERVICE_URL",
  sellerservice: "SELLER_SERVICE_URL",
  transactionmatchingservice: "TRANSACTION_MATCHING_SERVICE_URL",
  userprofileservice: "USER_PROFILE_SERVICE_URL"
};

fs.writeFileSync(
  path.join(srcDir, "config/services.ts"),
  `export const servicesConfig = {
${Object.entries(services)
  .map(([name, env]) => `  ${name}: process.env.${env} || "http://localhost:6000"`)
  .join(",\n")}
} as const;

export type ServiceName = keyof typeof servicesConfig;
`
);

// ====== 3. Base HTTP client ======
fs.writeFileSync(
  path.join(srcDir, "clients/baseClient.ts"),
  `import axios from "axios";
import CircuitBreaker from "opossum";
import { v4 as uuidv4 } from "uuid";

export function createBaseClient(baseURL: string) {
  const instance = axios.create({
    baseURL,
    timeout: 8000,
    headers: { "Content-Type": "application/json" }
  });

  instance.interceptors.request.use(config => {
    config.headers["X-Request-ID"] = uuidv4();
    return config;
  });

  const breaker = new CircuitBreaker(
    (requestConfig: any) => instance(requestConfig),
    { timeout: 10000, errorThresholdPercentage: 50, resetTimeout: 30000 }
  );

  return {
    request: (config: any) => breaker.fire(config),
    axiosInstance: instance
  };
}
`
);

// ====== 4. Individual service clients ======
Object.keys(services).forEach(serviceName => {
  const content = `import { createBaseClient } from "./baseClient";
import { servicesConfig } from "../config/services";

export const ${serviceName}Client = createBaseClient(servicesConfig.${serviceName});
`;
  fs.writeFileSync(path.join(srcDir, `clients/${serviceName}Client.ts`), content);
});

// ====== 5. Logger util ======
fs.writeFileSync(
  path.join(srcDir, "utils/logger.ts"),
  `import pino from "pino";

export const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  base: null,
  timestamp: () => \`, "time":"\${new Date().toISOString()}"\`
});
`
);

// ====== 6. Circuit breaker util ======
fs.writeFileSync(
  path.join(srcDir, "services/circuitBreaker.ts"),
  `import CircuitBreaker from "opossum";

export function createCircuitBreaker(fn: (...args: any[]) => Promise<any>) {
  return new CircuitBreaker(fn, {
    timeout: 8000,
    errorThresholdPercentage: 50,
    resetTimeout: 30000
  });
}
`
);

// ====== 7. Middlewares ======
fs.writeFileSync(
  path.join(srcDir, "middlewares/auth.ts"),
  `import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config/env";

export interface AuthenticatedRequest extends Request {
  user?: any;
}

export function verifyJwt(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const token = req.headers["authorization"]?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Missing token" });

  try {
    const payload = jwt.verify(token, config.jwtSecret);
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}
`
);

fs.writeFileSync(
  path.join(srcDir, "middlewares/rateLimiter.ts"),
  `import rateLimit from "express-rate-limit";

export const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: "Too many requests from this IP"
});
`
);

fs.writeFileSync(
  path.join(srcDir, "middlewares/correlationId.ts"),
  `import { Request, Response, NextFunction } from "express";
import { v4 as uuidv4 } from "uuid";

export function correlationId(req: Request, res: Response, next: NextFunction) {
  const requestId = req.header("X-Request-ID") || uuidv4();
  req.headers["X-Request-ID"] = requestId;
  res.setHeader("X-Request-ID", requestId);
  next();
}
`
);

fs.writeFileSync(
  path.join(srcDir, "middlewares/errorHandler.ts"),
  `import { Request, Response, NextFunction } from "express";
import { logger } from "../utils/logger";

export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction) {
  logger.error({ msg: "API Gateway error", error: err.message, stack: err.stack });
  res.status(err.status || 500).json({ error: err.message || "Internal Server Error" });
}
`
);

// ====== 8. Env config ======
fs.writeFileSync( 
  path.join(srcDir, "config/env.ts"),
  `import dotenv from "dotenv";
dotenv.config();

export const config = {
  gatewayPort: Number(process.env.GATEWAY_PORT) || 3000,
  jwtSecret: process.env.JWT_SECRET || "changeme"
};
`
);

// ====== 9. Service routes ======
fs.writeFileSync(
  path.join(srcDir, "routes/serviceRoutes.ts"),
  `import { Router } from "express";
import { createProxyMiddleware } from "http-proxy-middleware";
import { verifyJwt } from "../middlewares/auth";
import { createCircuitBreaker } from "../services/circuitBreaker";
import { servicesConfig } from "../config/services";

const router = Router();

function createServiceProxy(serviceName: string, serviceUrl: string, requireAuth = true) {
  const proxy = createProxyMiddleware({
    target: serviceUrl,
    changeOrigin: true,
    pathRewrite: path => path.replace(new RegExp(\`^/api/\${serviceName}\`), "")
  });

  const breaker = createCircuitBreaker((req: any, res: any) =>
    new Promise((resolve, reject) => proxy(req, res, err => err ? reject(err) : resolve(null)))
  );

  const chain = requireAuth
    ? [verifyJwt, (req: any, res: any, next: any) => breaker.fire(req, res).catch(next)]
    : [(req: any, res: any, next: any) => breaker.fire(req, res).catch(next)];

  router.use(\`/\${serviceName}\`, ...chain);
}

createServiceProxy("auth", servicesConfig.auth, false);
(Object.keys(servicesConfig) as (keyof typeof servicesConfig)[])
  .filter(s => s !== "auth")
  .forEach(serviceName => createServiceProxy(serviceName, servicesConfig[serviceName], true));

export default router;
`
);

// ====== 10. Index ======
fs.writeFileSync(
  path.join(srcDir, "index.ts"),
  `import express from "express";
import helmet from "helmet";
import cors from "cors";
import { limiter } from "./middlewares/rateLimiter";
import { correlationId } from "./middlewares/correlationId";
import { errorHandler } from "./middlewares/errorHandler";
import { config } from "./config/env";
import serviceRoutes from "./routes/serviceRoutes";
import { logger } from "./utils/logger";

const app = express();
app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || "*", credentials: true }));
app.use(express.json());
app.use(limiter);
app.use(correlationId);
app.use("/api", serviceRoutes);
app.get("/health", (_, res) => res.json({ status: "ok" }));
app.use(errorHandler);

app.listen(config.gatewayPort, () => {
  logger.info(\`API Gateway running on port \${config.gatewayPort}\`);
});
`
);

console.log("✅ API Gateway scaffolded with all 19 services (fixed env + TS ready)!");
