import { Router } from "express";
import { createProxyMiddleware } from "http-proxy-middleware";
import { verifyJwt } from "../middlewares/auth";
import { createCircuitBreaker } from "../services/circuitBreaker";
import { servicesConfig } from "../config/services";

const router = Router();

function createServiceProxy(serviceName: string, serviceUrl: string, requireAuth = true) {
  const proxy = createProxyMiddleware({
    target: serviceUrl,
    changeOrigin: true,
    pathRewrite: path => path.replace(new RegExp(`^/api/${serviceName}`), "")
  });

  const breaker = createCircuitBreaker((req: any, res: any) =>
    new Promise((resolve, reject) => proxy(req, res, err => err ? reject(err) : resolve(null)))
  );

  const chain = requireAuth
    ? [verifyJwt, (req: any, res: any, next: any) => breaker.fire(req, res).catch(next)]
    : [(req: any, res: any, next: any) => breaker.fire(req, res).catch(next)];

  router.use(`/${serviceName}`, ...chain);
}

createServiceProxy("auth", servicesConfig.auth, false);
(Object.keys(servicesConfig) as (keyof typeof servicesConfig)[])
  .filter(s => s !== "auth")
  .forEach(serviceName => createServiceProxy(serviceName, servicesConfig[serviceName], true));

export default router;
