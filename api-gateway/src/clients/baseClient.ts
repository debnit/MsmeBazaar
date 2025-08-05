import axios from "axios";
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
