import CircuitBreaker from "opossum";

export function createCircuitBreaker(fn: (...args: any[]) => Promise<any>) {
  return new CircuitBreaker(fn, {
    timeout: 8000,
    errorThresholdPercentage: 50,
    resetTimeout: 30000
  });
}
