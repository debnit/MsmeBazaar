// Server-side null-safe utilities for robust error handling

export function safeGet<T>(obj: any, path: string, defaultValue: T): T {
  if (!obj || typeof obj !== 'object') {
    return defaultValue;
  }
  
  try {
    const keys = path.split('.');
    let current = obj;
    
    for (const key of keys) {
      if (current === null || current === undefined || typeof current !== 'object') {
        return defaultValue;
      }
      current = current[key];
    }
    
    return current !== null && current !== undefined ? current : defaultValue;
  } catch (error) {
    console.warn(`Safe get failed for path: ${path}`, error);
    return defaultValue;
  }
}

export function safeExecute<T>(fn: () => T, defaultValue: T): T {
  try {
    if (typeof fn !== 'function') {
      return defaultValue;
    }
    const result = fn();
    return result !== null && result !== undefined ? result : defaultValue;
  } catch (error) {
    console.warn('Safe execute failed:', error);
    return defaultValue;
  }
}

export function safeAsyncExecute<T>(fn: () => Promise<T>, defaultValue: T): Promise<T> {
  try {
    if (typeof fn !== 'function') {
      return Promise.resolve(defaultValue);
    }
    return fn().catch((error) => {
      console.warn('Safe async execute failed:', error);
      return defaultValue;
    });
  } catch (error) {
    console.warn('Safe async execute failed:', error);
    return Promise.resolve(defaultValue);
  }
}

export function safeCall<T extends any[], R>(
  fn: ((...args: T) => R) | null | undefined,
  defaultValue: R,
  ...args: T
): R {
  try {
    if (typeof fn === 'function') {
      const result = fn(...args);
      return result !== null && result !== undefined ? result : defaultValue;
    }
    return defaultValue;
  } catch (error) {
    console.warn('Safe call failed:', error);
    return defaultValue;
  }
}

export function safeArray<T>(value: T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : [];
}

export function safeString(value: string | null | undefined): string {
  return typeof value === 'string' ? value : '';
}

export function safeNumber(value: number | null | undefined): number {
  return typeof value === 'number' && !isNaN(value) ? value : 0;
}

export function safeBoolean(value: boolean | null | undefined): boolean {
  return typeof value === 'boolean' ? value : false;
}

export function safeObject<T>(value: T | null | undefined): T | {} {
  return value !== null && value !== undefined && typeof value === 'object' ? value : {} as T;
}

export function safeObjectMap<T, R>(
  obj: Record<string, T> | null | undefined,
  mapper: (value: T, key: string) => R
): Record<string, R> {
  if (!obj || typeof obj !== 'object') {
    return {};
  }
  
  const result: Record<string, R> = {};
  
  try {
    for (const [key, value] of Object.entries(obj)) {
      if (value !== null && value !== undefined) {
        result[key] = mapper(value, key);
      }
    }
  } catch (error) {
    console.warn('Safe object map failed:', error);
  }
  
  return result;
}

export function safePromise<T>(
  promise: Promise<T> | null | undefined,
  defaultValue: T
): Promise<T> {
  if (!promise || typeof promise.then !== 'function') {
    return Promise.resolve(defaultValue);
  }
  
  return promise.catch((error) => {
    console.warn('Safe promise failed:', error);
    return defaultValue;
  });
}

export function safeJSON<T>(
  jsonString: string | null | undefined,
  defaultValue: T
): T {
  try {
    if (!jsonString || typeof jsonString !== 'string') {
      return defaultValue;
    }
    
    const parsed = JSON.parse(jsonString);
    return parsed !== null && parsed !== undefined ? parsed : defaultValue;
  } catch (error) {
    console.warn('Safe JSON parse failed:', error);
    return defaultValue;
  }
}

export function safeStringify(
  value: any,
  defaultValue: string = '{}'
): string {
  try {
    return JSON.stringify(value);
  } catch (error) {
    console.warn('Safe JSON stringify failed:', error);
    return defaultValue;
  }
}

export function safeEnv(
  key: string,
  defaultValue: string = ''
): string {
  try {
    const value = process.env[key];
    return typeof value === 'string' ? value : defaultValue;
  } catch (error) {
    console.warn(`Safe env get failed for key: ${key}`, error);
    return defaultValue;
  }
}

export function safeFileRead(
  path: string,
  defaultValue: string = ''
): string {
  try {
    const fs = require('fs');
    if (fs.existsSync(path)) {
      return fs.readFileSync(path, 'utf8');
    }
    return defaultValue;
  } catch (error) {
    console.warn(`Safe file read failed for path: ${path}`, error);
    return defaultValue;
  }
}

export function safeFileWrite(
  path: string,
  content: string
): boolean {
  try {
    const fs = require('fs');
    fs.writeFileSync(path, content, 'utf8');
    return true;
  } catch (error) {
    console.warn(`Safe file write failed for path: ${path}`, error);
    return false;
  }
}

export function safeDatabase<T>(
  query: () => Promise<T>,
  defaultValue: T
): Promise<T> {
  return safeAsyncExecute(query, defaultValue);
}

export function safeMiddleware(
  middleware: (req: any, res: any, next: any) => void
) {
  return (req: any, res: any, next: any) => {
    try {
      if (typeof middleware === 'function') {
        middleware(req, res, next);
      } else {
        next();
      }
    } catch (error) {
      console.warn('Safe middleware failed:', error);
      next(error);
    }
  };
}

export function safeRouteHandler(
  handler: (req: any, res: any) => void | Promise<void>
) {
  return async (req: any, res: any) => {
    try {
      if (typeof handler === 'function') {
        await handler(req, res);
      } else {
        res.status(500).json({ error: 'Invalid route handler' });
      }
    } catch (error) {
      console.warn('Safe route handler failed:', error);
      if (res && !res.headersSent) {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  };
}

export function safeAPICall<T>(
  apiCall: () => Promise<T>,
  defaultValue: T
): Promise<T> {
  return safeAsyncExecute(apiCall, defaultValue);
}

export function safeTimeout(
  callback: () => void,
  delay: number
): NodeJS.Timeout | null {
  try {
    if (typeof callback !== 'function') {
      return null;
    }
    
    return setTimeout(() => {
      try {
        callback();
      } catch (error) {
        console.warn('Safe timeout callback failed:', error);
      }
    }, delay);
  } catch (error) {
    console.warn('Safe timeout failed:', error);
    return null;
  }
}

export function safeInterval(
  callback: () => void,
  delay: number
): NodeJS.Timeout | null {
  try {
    if (typeof callback !== 'function') {
      return null;
    }
    
    return setInterval(() => {
      try {
        callback();
      } catch (error) {
        console.warn('Safe interval callback failed:', error);
      }
    }, delay);
  } catch (error) {
    console.warn('Safe interval failed:', error);
    return null;
  }
}

export function safeEventEmitter(
  emitter: any,
  event: string,
  listener: (...args: any[]) => void
): () => void {
  try {
    if (!emitter || typeof emitter.on !== 'function') {
      return () => {};
    }
    
    const safeListener = (...args: any[]) => {
      try {
        listener(...args);
      } catch (error) {
        console.warn('Safe event listener failed:', error);
      }
    };
    
    emitter.on(event, safeListener);
    
    return () => {
      try {
        if (emitter && typeof emitter.off === 'function') {
          emitter.off(event, safeListener);
        }
      } catch (error) {
        console.warn('Safe event emitter cleanup failed:', error);
      }
    };
  } catch (error) {
    console.warn('Safe event emitter failed:', error);
    return () => {};
  }
}