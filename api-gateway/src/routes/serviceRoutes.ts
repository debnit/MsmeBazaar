import { Router } from "express";
import { createProxyMiddleware } from "http-proxy-middleware";
import { verifyJwt } from "../middlewares/auth";
import { config } from "../config/env";
import { createCircuitBreaker } from "../services/circuitBreaker";
import { logger } from "../utils/logger";

const router = Router();

const services = {
  auth: config.AUTH_SERVICE_URL,
  msme: config.MSME_SERVICE_URL,
  valuation: config.VALUATION_SERVICE_URL,
  matchmaking: config.MATCHMAKING_SERVICE_URL,
  notification: config.NOTIFICATION_SERVICE_URL
};

function createServiceProxy(serviceName: string, serviceUrl: string) {
  const proxy = createProxyMiddleware({
    target: serviceUrl,
    changeOrigin: true,
    pathRewrite: path => path.replace(new RegExp(`^/api/v1/${serviceName}`), ""),
    onError: (err, req, res) => {
      logger.error(`[Proxy Error] ${serviceName}: ${err.message}`);
      res.status(503).json({ error: `Service ${serviceName} unavailable` });
    }
  });

  const breaker = createCircuitBreaker((req, res) =>
    new Promise((resolve, reject) => {
      proxy(req, res, err => (err ? reject(err) : resolve(null)));
    })
  );

  return (req, res, next) => breaker.fire(req, res).catch(next);
}

// Public
router.use("/auth", createServiceProxy("auth", services.auth));

// Protected
router.use("/msme", verifyJwt, createServiceProxy("msme", services.msme));
router.use("/valuation", verifyJwt, createServiceProxy("valuation", services.valuation));
router.use("/matchmaking", verifyJwt, createServiceProxy("matchmaking", services.matchmaking));
router.use("/notification", verifyJwt, createServiceProxy("notification", services.notification));

export default router;
