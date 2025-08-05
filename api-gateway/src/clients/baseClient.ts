import axios from "axios";
import axiosRetry from "axios-retry";
import { createCircuitBreaker } from "../services/circuitBreaker";
import { logger } from "../utils/logger";

export function createHttpClient(baseURL: string, timeout = 5000) {
  const client = axios.create({ baseURL, timeout });

  // Retry failed requests (network or 5xx)
  axiosRetry(client, {
    retries: 3,
    retryDelay: axiosRetry.exponentialDelay,
    retryCondition: err =>
      axiosRetry.isNetworkOrIdempotentRequestError(err) || err.response?.status >= 500
  });

  // Wrap with circuit breaker
  const breaker = createCircuitBreaker(async (config: any) => {
    const res = await client.request(config);
    return res.data;
  });

  return {
    request: (config: any) => breaker.fire(config).catch(err => {
      logger.error(`[HTTP Client Error] ${err.message}`);
      throw err;
    })
  };
}
