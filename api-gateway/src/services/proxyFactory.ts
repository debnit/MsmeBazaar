// src/services/proxyFactory.ts
import { createProxyMiddleware } from "http-proxy-middleware";
import { createCircuitBreaker } from "./circuitBreaker";

export function createServiceProxy(serviceName: string, target: string) {
  const proxy = createProxyMiddleware({
    target,
    changeOrigin: true,
    pathRewrite: path => path.replace(new RegExp(`^/api/${serviceName}`), ""),
  });

  return createCircuitBreaker(
    (req: any, res: any) =>
      new Promise((resolve, reject) => proxy(req, res, err => (err ? reject(err) : resolve(null))))
  );
}
