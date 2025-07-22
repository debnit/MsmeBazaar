// Null-safe utility functions for robust error handling

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
    const result = fn();
    return result !== null && result !== undefined ? result : defaultValue;
  } catch (error) {
    console.warn('Safe execute failed:', error);
    return defaultValue;
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

export function safeLocalStorage(key: string, defaultValue: any): any {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return defaultValue;
    }
    
    const item = window.localStorage.getItem(key);
    if (item === null) {
      return defaultValue;
    }
    
    return JSON.parse(item);
  } catch (error) {
    console.warn(`Safe localStorage get failed for key: ${key}`, error);
    return defaultValue;
  }
}

export function safeLocalStorageSet(key: string, value: any): boolean {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return false;
    }
    
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.warn(`Safe localStorage set failed for key: ${key}`, error);
    return false;
  }
}

export function safeSessionStorage(key: string, defaultValue: any): any {
  try {
    if (typeof window === 'undefined' || !window.sessionStorage) {
      return defaultValue;
    }
    
    const item = window.sessionStorage.getItem(key);
    if (item === null) {
      return defaultValue;
    }
    
    return JSON.parse(item);
  } catch (error) {
    console.warn(`Safe sessionStorage get failed for key: ${key}`, error);
    return defaultValue;
  }
}

export function safeElement<T extends HTMLElement>(
  selector: string,
  defaultValue: T | null = null
): T | null {
  try {
    if (typeof document === 'undefined') {
      return defaultValue;
    }
    
    const element = document.querySelector(selector) as T;
    return element || defaultValue;
  } catch (error) {
    console.warn(`Safe element query failed for selector: ${selector}`, error);
    return defaultValue;
  }
}

export function safeEventListener(
  element: EventTarget | null | undefined,
  event: string,
  handler: EventListener,
  options?: boolean | AddEventListenerOptions
): () => void {
  try {
    if (!element || typeof element.addEventListener !== 'function') {
      return () => {};
    }
    
    element.addEventListener(event, handler, options);
    
    return () => {
      try {
        if (element && typeof element.removeEventListener === 'function') {
          element.removeEventListener(event, handler, options);
        }
      } catch (error) {
        console.warn('Safe event listener removal failed:', error);
      }
    };
  } catch (error) {
    console.warn('Safe event listener failed:', error);
    return () => {};
  }
}

export function safeTimeout(
  callback: () => void,
  delay: number,
  defaultValue: any = null
): number {
  try {
    if (typeof callback !== 'function') {
      return 0;
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
    return 0;
  }
}

export function safeInterval(
  callback: () => void,
  delay: number
): number {
  try {
    if (typeof callback !== 'function') {
      return 0;
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
    return 0;
  }
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